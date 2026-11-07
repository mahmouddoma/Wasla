// Read-only source audit. This establishes route coverage, not live workflow correctness.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ts = require('typescript');
const backend = process.argv[2];
if (!backend) throw new Error('Usage: node scripts/audit-backend-contracts.cjs <backend-checkout>');
function files(root, extension) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? files(file, extension) : file.endsWith(extension) ? [file] : [];
  });
}
function normalize(route) {
  return ('/' + route)
    .replace(/\/+/g, '/')
    .replace(/\{version:apiVersion\}/g, '1')
    .replace(/\{[^}]+\}/g, '{id}')
    .replace(/\/$/, '')
    .toLowerCase();
}
const endpoints = [];
for (const file of files(path.join(backend, 'src/Wasla/Wasla.Api/Controllers'), '.cs')) {
  const source = fs.readFileSync(file, 'utf8');
  // Some source files contain several controller classes, each with its own route.
  const routes = [...source.matchAll(/\bRoute\("([^"]+)"\)/g)];
  routes.forEach((route, i) => {
    const section = source.slice(route.index, routes[i + 1]?.index ?? source.length);
    for (const match of section.matchAll(/\bHttp(Get|Post|Put|Patch|Delete)(?:\("([^"]*)"\))?/g)) {
      const suffix = match[2] ?? '';
      const url =
        suffix.startsWith('/') || suffix.startsWith('~/')
          ? suffix.replace(/^~/, '')
          : route[1] + '/' + suffix;
      endpoints.push({
        method: match[1].toUpperCase(),
        route: normalize(url),
        file: path.relative(backend, file).replaceAll('\\', '/'),
      });
    }
  });
}
const calls = [],
  unresolved = [];
for (const file of files('src/app', '.ts').filter(
  (file) => !/\.spec\.ts$|\.types\.ts$/.test(file),
)) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const members = new Map();
  function collect(node) {
    if ((ts.isPropertyDeclaration(node) || ts.isMethodDeclaration(node)) && node.name)
      members.set(node.name.getText(source), node);
    ts.forEachChild(node, collect);
  }
  collect(source);
  function evaluate(node, depth = 0) {
    if (!node || depth > 12) return '{id}';
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isTemplateExpression(node))
      return (
        node.head.text +
        node.templateSpans
          .map((span) => evaluate(span.expression, depth + 1) + span.literal.text)
          .join('')
      );
    if (ts.isPropertyAccessExpression(node)) {
      if (node.getText(source) === 'environment.apiBaseUrl') return '';
      const member = members.get(node.name.text);
      if (member?.initializer) return evaluate(member.initializer, depth + 1);
    }
    if (ts.isCallExpression(node)) {
      if (ts.isPropertyAccessExpression(node.expression)) {
        const member = members.get(node.expression.name.text);
        const ret = member?.body?.statements.find(ts.isReturnStatement);
        if (ret) return evaluate(ret.expression, depth + 1);
      }
      return '{id}';
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken)
      return evaluate(node.left, depth + 1) + evaluate(node.right, depth + 1);
    return '{id}';
  }
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      if (
        ['get', 'post', 'put', 'patch', 'delete'].includes(method) &&
        /this\.http$/.test(node.expression.expression.getText(source))
      ) {
        const route = evaluate(node.arguments[0]);
        const call = {
          method: method.toUpperCase(),
          route: normalize(route),
          file: file.replaceAll('\\', '/'),
          line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        };
        if (route.includes('/api/')) calls.push(call);
        else unresolved.push(call);
      }
    }
    // Generated operation registries use a generic HTTP dispatcher.
    if (ts.isObjectLiteralExpression(node)) {
      const properties = new Map(
        node.properties
          .filter(ts.isPropertyAssignment)
          .map((p) => [p.name.getText(source), p.initializer]),
      );
      if (properties.has('route') && properties.has('method'))
        calls.push({
          method: evaluate(properties.get('method')),
          route: normalize(evaluate(properties.get('route'))),
          file: file.replaceAll('\\', '/'),
          line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const key = (item) => `${item.method} ${item.route}`;
const backendKeys = new Set(endpoints.map(key));
const frontendKeys = new Set(calls.map(key));
function candidates(call) {
  const pattern = new RegExp(
    '^' +
      call.route
        .split('{id}')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*') +
      '$',
  );
  return endpoints.filter(
    (endpoint) => endpoint.method === call.method && pattern.test(endpoint.route),
  );
}
const dynamicCandidates = calls
  .filter((call) => !backendKeys.has(key(call)) && candidates(call).length)
  .map((call) => ({ ...call, candidates: candidates(call).map(key) }));
const report = {
  backendCommit: cp
    .execFileSync('git', ['-C', backend, 'rev-parse', 'HEAD'], { encoding: 'utf8' })
    .trim(),
  scope:
    'Static controller routes and frontend HTTP calls. Dynamic expressions require manual review; matching routes do not prove DTO, authorization, UI usage or runtime correctness.',
  summary: {
    backendRoutes: backendKeys.size,
    frontendCalls: calls.length,
    matchedCalls: calls.filter((call) => backendKeys.has(key(call))).length,
    dynamicCandidateCalls: dynamicCandidates.length,
    unresolvedCalls: unresolved.length,
  },
  unmatchedFrontend: calls.filter(
    (call) => !backendKeys.has(key(call)) && !candidates(call).length,
  ),
  dynamicCandidates,
  backendWithoutDirectClient: endpoints.filter((endpoint) => !frontendKeys.has(key(endpoint))),
  unresolved,
  matched: calls.filter((call) => backendKeys.has(key(call))),
};
// Same-name contracts are useful review leads only: UI models may intentionally map wire DTOs.
const records = new Map();
for (const file of files(path.join(backend, 'src/Wasla'), '.cs')) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\brecord\s+(\w+)(?:<[^>]+>)?\s*\(/g)) {
    let depth = 1,
      end = match.index + match[0].length;
    const start = end;
    while (end < text.length && depth) {
      if (text[end] === '(') depth++;
      if (text[end] === ')') depth--;
      end++;
    }
    const fields = [
      ...text.slice(start, end - 1).matchAll(/\b([A-Z]\w*)\s*(?:=\s*[^,]+)?(?=,|$)/g),
    ].map((m) => m[1][0].toLowerCase() + m[1].slice(1));
    records.set(match[1], { fields, file: path.relative(backend, file).replaceAll('\\', '/') });
  }
}
report.contractReviewLeads = [];
for (const file of files('src/app', '.ts').filter((file) => !file.endsWith('.spec.ts'))) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  function visit(node) {
    if (
      ts.isInterfaceDeclaration(node) &&
      (records.has(node.name.text) || records.has(node.name.text + 'Response'))
    ) {
      const record = records.get(node.name.text) ?? records.get(node.name.text + 'Response');
      const fields = node.members
        .filter(ts.isPropertySignature)
        .filter((m) => !m.questionToken)
        .map((m) => m.name.getText(source));
      const missingOnBackend = fields.filter((field) => !record.fields.includes(field));
      if (missingOnBackend.length)
        report.contractReviewLeads.push({
          name: node.name.text,
          frontend: file.replaceAll('\\', '/'),
          backend: record.file,
          missingOnBackend,
        });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
fs.writeFileSync('docs/backend-contract-audit.json', JSON.stringify(report, null, 2) + '\n');
if (report.unmatchedFrontend.length) process.exitCode = 1;
console.log(
  JSON.stringify(
    {
      ...report.summary,
      unmatchedFrontend: report.unmatchedFrontend,
      contractReviewLeads: report.contractReviewLeads,
    },
    null,
    2,
  ),
);
