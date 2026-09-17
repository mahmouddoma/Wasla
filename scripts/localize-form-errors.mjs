import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
let count = 0;
for (const file of files('src/app').filter(file => file.endsWith('.ts') && !file.endsWith('.spec.ts'))) {
  let text = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const edits = [];
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'message'
      && ts.isCallExpression(node.initializer) && ts.isPropertyAccessExpression(node.initializer.expression)
      && node.initializer.expression.name.text === 't' && node.initializer.arguments.length === 1
      && ts.isStringLiteral(node.initializer.arguments[0])) {
      edits.push([node.initializer.getStart(ast), node.initializer.end, node.initializer.arguments[0].getText(ast)]);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!edits.length) continue;
  const template = text.match(/templateUrl:\s*'([^']+)'/);
  if (!template) continue;
  const htmlFile = path.resolve(path.dirname(file), template[1]);
  let html = fs.readFileSync(htmlFile, 'utf8');
  // Translate at rendering time so an existing validation error follows language changes.
  // TranslatePipe passes server messages through when they are not dictionary keys.
  html = html.replace(/\{\{\s*([^{}]*\.message)\s*\}\}/g,
    (_, expression) => `{{ (${expression.trim()} ?? '') | t }}`);
  for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0])) {
    text = text.slice(0, start) + replacement + text.slice(end);
  }
  fs.writeFileSync(file, text);
  fs.writeFileSync(htmlFile, html);
  count += edits.length;
}
console.log(`Moved ${count} localized validation messages to rendering-time translation.`);
