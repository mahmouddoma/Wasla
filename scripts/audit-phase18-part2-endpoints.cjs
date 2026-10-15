// Verify every Phase 18 Part Two To Do Jira issue against OpenAPI contracts, API client implementation, and HTTP tests.
const fs = require('node:fs');
const path = require('node:path');

const issues = JSON.parse(fs.readFileSync('docs/phase18-part2-jira-todo.json', 'utf8'));
const openApiPath = 'C:/tmp/wasla-phase18-reference/docs/phase18/part2-openapi.json';
const openApi = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
const paths = openApi.paths;

const apiFile = 'src/app/domains/phase18/phase18-part2-api.ts';
const testFile = 'src/app/domains/phase18/phase18-part2-api.spec.ts';

if (!fs.existsSync(apiFile)) {
  console.error('API file not found:', apiFile);
  process.exit(1);
}
if (!fs.existsSync(testFile)) {
  console.error('Test file not found:', testFile);
  process.exit(1);
}

const apiContent = fs.readFileSync(apiFile, 'utf8');
const testContent = fs.readFileSync(testFile, 'utf8');

function normalize(url) {
  return url.replace(/\{[^}]+\}/g, ':param').replace(/\/+$/, '');
}

const audit = issues.map((issue) => {
  const method = issue.method.toUpperCase();
  const route = issue.route;
  const endpointId = issue.endpointId;

  // 1. Verify in OpenAPI
  const swaggerMatch = Object.entries(paths).find(
    ([p, ops]) => normalize(p) === normalize(route) && ops[method.toLowerCase()],
  );

  // 2. Verify in phase18-part2-api.ts
  const apiHasOp = apiContent.includes(`'${endpointId}':`) && apiContent.includes(`route: '${route}'`);

  // 3. Verify in phase18-part2-api.spec.ts
  const testHasOp = testContent.includes(`call('${endpointId}'`);

  const checked = !!swaggerMatch && apiHasOp && testHasOp;

  return {
    key: issue.key,
    endpointId,
    method,
    path: route,
    summary: issue.summary,
    controller: issue.controller,
    action: issue.action,
    roles: issue.roles,
    openApi: !!swaggerMatch,
    api: apiFile,
    httpTest: testFile,
    checked,
  };
});

const checkedCount = audit.filter((a) => a.checked).length;
const totalCount = audit.length;

const report = {
  phase: 'Phase 18 Part Two (Archive & Audit Trails)',
  board: 34,
  statusFilter: 'To Do',
  totalIssues: totalCount,
  checkedIssues: checkedCount,
  allLinked: checkedCount === totalCount,
  endpoints: audit,
};

fs.writeFileSync('docs/phase18-part2-endpoint-audit.json', JSON.stringify(report, null, 2) + '\n');

console.log(`Phase 18 Part Two Audit: ${checkedCount}/${totalCount} Jira To Do endpoints verified and linked.`);

if (checkedCount < totalCount) {
  const failures = audit.filter((a) => !a.checked);
  console.error('Unverified endpoints:', failures);
  process.exitCode = 1;
} else {
  console.log('ALL JIRA ISSUES IN TO DO (WAS-512 to WAS-551) ARE 100% LINKED AND VERIFIED.');
}
