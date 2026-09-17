const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const postcss = require('postcss');
const root = path.resolve(__dirname, '../src/app');
const errors = [];
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
const sourceFiles = files(root);
const dictionaryFile = path.join(root, 'core/i18n/translations.ts');
const dictionaryAst = ts.createSourceFile(dictionaryFile, fs.readFileSync(dictionaryFile, 'utf8'), ts.ScriptTarget.Latest, true);
const translationKeys = new Set();
function checkTranslations(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(dictionaryAst) === 'TRANSLATIONS' && ts.isObjectLiteralExpression(node.initializer)) {
    for (const entry of node.initializer.properties) {
      if (!ts.isPropertyAssignment(entry) || !ts.isStringLiteral(entry.name)) continue;
      const key = entry.name.text;
      if (translationKeys.has(key)) errors.push(`${dictionaryFile}: duplicate translation key ${key}`);
      translationKeys.add(key);
      for (const language of ['ar', 'en']) {
        const value = ts.isObjectLiteralExpression(entry.initializer) && entry.initializer.properties.find(property =>
          ts.isPropertyAssignment(property) && property.name.getText(dictionaryAst).replace(/['"]/g, '') === language)?.initializer;
        if (!value || !ts.isStringLiteral(value) || !value.text.trim()) errors.push(`${dictionaryFile}: missing ${language} translation for ${key}`);
      }
    }
  }
  ts.forEachChild(node, checkTranslations);
}
checkTranslations(dictionaryAst);
const graph = new Map();
const componentFolders = new Map();
for (const file of sourceFiles.filter(file => file.endsWith('.ts'))) {
  const text = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const dependencies = [];
  function visit(node) {
    if (ts.isClassDeclaration(node)) {
      const decorator = ts.getDecorators(node)?.find(decorator =>
        ts.isCallExpression(decorator.expression) && decorator.expression.expression.getText(ast) === 'Component');
      if (decorator) {
        const folder = path.dirname(file);
        componentFolders.set(folder, [...(componentFolders.get(folder) ?? []), file]);
        const relative = path.relative(root, file).replaceAll(path.sep, '/');
        if (/^features\/[^/]+\/[^/]+\.ts$/.test(relative)) errors.push(`${file}: component must own a folder below the feature root`);
        const spec = file.replace(/\.ts$/, '.spec.ts');
        if (!fs.existsSync(spec)) errors.push(`${file}: missing component spec`);
        const metadata = decorator.expression.arguments[0];
        if (metadata && ts.isObjectLiteralExpression(metadata)) {
          for (const property of metadata.properties) {
            if (!ts.isPropertyAssignment(property)) continue;
            const name = property.name.getText(ast);
            const references = name === 'templateUrl' || name === 'styleUrl' ? [property.initializer]
              : name === 'styleUrls' && ts.isArrayLiteralExpression(property.initializer) ? property.initializer.elements : [];
            for (const reference of references) {
              if (!ts.isStringLiteral(reference)) continue;
              const resource = path.resolve(folder, reference.text);
              if (!fs.existsSync(resource)) errors.push(`${file}: missing component resource ${reference.text}`);
              // Feature-wide styles may be reused; templates always belong to their component.
              if (name === 'templateUrl' && path.dirname(resource) !== folder) errors.push(`${file}: template outside component folder`);
            }
          }
        }
      }
    }
    if (node.kind === ts.SyntaxKind.AnyKeyword) errors.push(`${file}: explicit any`);
    const specifier = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
      ? node.moduleSpecifier
      : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
        ? node.arguments[0] : undefined;
    if (specifier && ts.isStringLiteral(specifier) && specifier.text.startsWith('.')) {
      const target = path.resolve(path.dirname(file), specifier.text);
      const resolved = [target + '.ts', path.join(target, 'index.ts')].find(candidate => fs.existsSync(candidate));
      if (!resolved) errors.push(`${file}: unresolved local import ${specifier.text}`);
      if (resolved) dependencies.push(resolved);
      const sourceFeature = path.relative(root, file).replaceAll(path.sep, '/').match(/^features\/([^/]+)/)?.[1];
      const targetFeature = path.relative(root, target).replaceAll(path.sep, '/').match(/^features\/([^/]+)/)?.[1];
      if (sourceFeature && targetFeature && sourceFeature !== targetFeature) errors.push(`${file}: cross-feature import ${specifier.text}`);
      const relativeSource = path.relative(root, file).replaceAll(path.sep, '/');
      const relativeTarget = path.relative(root, target).replaceAll(path.sep, '/');
      if (!file.endsWith('.spec.ts') && /^features\/[^/]+\/components\//.test(relativeSource)
        && /^features\/[^/]+\/pages\//.test(relativeTarget)) errors.push(`${file}: internal component depends on a page ${specifier.text}`);
      const sourceDomain = path.relative(root, file).replaceAll(path.sep, '/').match(/^domains\/([^/]+)/)?.[1];
      const targetDomain = path.relative(root, target).replaceAll(path.sep, '/').match(/^domains\/([^/]+)(.*)/);
      if (targetDomain && sourceDomain !== targetDomain[1] && targetDomain[2] && targetDomain[2] !== '/index') errors.push(`${file}: private domain import ${specifier.text}`);
      if (file.startsWith(path.join(root, 'shared') + path.sep) && (targetDomain || targetFeature)) errors.push(`${file}: Shared depends on a business capability`);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  graph.set(file, dependencies);
}
for (const [folder, components] of componentFolders) {
  if (components.length > 1) errors.push(`${folder}: multiple components share a folder: ${components.map(file => path.basename(file)).join(', ')}`);
}
const visited = new Set(), active = new Set();
function checkCycles(file) {
  if (active.has(file)) { errors.push(`${file}: circular import`); return; }
  if (visited.has(file)) return;
  active.add(file);
  for (const dependency of graph.get(file) ?? []) checkCycles(dependency);
  active.delete(file); visited.add(file);
}
for (const file of graph.keys()) checkCycles(file);
for (const file of sourceFiles.filter(file => file.endsWith('.html'))) {
  const template = fs.readFileSync(file, 'utf8');
  if (template.includes('$any(')) errors.push(`${file}: template typing bypass`);
  for (const match of template.matchAll(/['"]([\w.-]+)['"]\s*\|\s*t\b/g)) {
    if (!translationKeys.has(match[1])) errors.push(`${file}: undefined translation key ${match[1]}`);
  }
}
for (const file of [...sourceFiles.filter(file => file.endsWith('.css')), path.resolve(root, '../styles.css')]) {
  postcss.parse(fs.readFileSync(file, 'utf8')).walkDecls(declaration => {
    if (declaration.important) errors.push(`${file}: !important`);
  });
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('Architecture checks passed: independent component folders and resources/specs, typed source and tests, feature/domain boundaries, acyclic imports, no template bypasses or !important.');
