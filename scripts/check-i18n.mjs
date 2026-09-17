import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  parseTemplate,
  TmplAstText,
  TmplAstBoundText,
  TmplAstTextAttribute,
} from '@angular/compiler';

const root = 'src/app';
const errors = [];
const arabic = /[\u0600-\u06ff]/;
const keys = new Set();
const dictionaryFile = `${root}/core/i18n/translations.ts`;
const dictionary = ts.createSourceFile(
  dictionaryFile,
  fs.readFileSync(dictionaryFile, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);
function readDictionary(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(dictionary) === 'TRANSLATIONS' &&
    ts.isObjectLiteralExpression(node.initializer)
  ) {
    for (const entry of node.initializer.properties) {
      if (!ts.isPropertyAssignment(entry) || !ts.isStringLiteral(entry.name)) continue;
      const key = entry.name.text;
      if (keys.has(key)) errors.push(`Duplicate translation key: ${key}`);
      keys.add(key);
      for (const lang of ['ar', 'en']) {
        const value =
          ts.isObjectLiteralExpression(entry.initializer) &&
          entry.initializer.properties.find(
            (p) => p.name?.getText(dictionary).replace(/['"]/g, '') === lang,
          )?.initializer;
        if (!value || !ts.isStringLiteral(value) || !value.text.trim())
          errors.push(`${key}: missing ${lang}`);
        else if (lang === 'en' && arabic.test(value.text))
          errors.push(`${key}: Arabic text in English translation`);
      }
    }
  }
  ts.forEachChild(node, readDictionary);
}
readDictionary(dictionary);
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}
function checkKey(key, file) {
  if (key && !keys.has(key)) errors.push(`${file}: undefined translation key ${key}`);
}
for (const file of files(root)) {
  if (file === path.normalize(dictionaryFile) || file.endsWith('.spec.ts')) continue;
  const source = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.html')) {
    const template = parseTemplate(source, file);
    for (const error of template.errors ?? []) errors.push(`${file}: ${error.msg}`);
    const seen = new Set();
    function visit(node) {
      if (ts.isObjectLiteralExpression(node) && file.endsWith('.routes.ts')) {
        const properties = new Map(
          node.properties
            .filter(ts.isPropertyAssignment)
            .map((p) => [p.name.getText(ast), p.initializer]),
        );
        if (properties.has('path')) {
          const title = properties.get('title');
          if (title && ts.isStringLiteral(title)) checkKey(title.text, file);
          if (
            properties.has('loadComponent') &&
            !properties.has('children') &&
            !properties.has('loadChildren') &&
            !title
          )
            errors.push(
              `${file}: route ${properties.get('path').getText(ast)} is missing a translated title`,
            );
        }
      }
      if (!node || typeof node !== 'object' || seen.has(node)) return;
      seen.add(node);
      const values = [];
      if (node instanceof TmplAstText) values.push(node.value);
      if (node instanceof TmplAstBoundText) values.push(...(node.value.ast.strings ?? []));
      if (
        node instanceof TmplAstTextAttribute &&
        ['title', 'placeholder', 'aria-label', 'alt'].includes(node.name)
      )
        values.push(node.value);
      for (const value of values)
        if (arabic.test(value) || /[A-Za-z]{2}/.test(value))
          errors.push(`${file}: hardcoded UI text ${JSON.stringify(value.trim())}`);
      if (
        node.constructor?.name === 'LiteralPrimitive' &&
        typeof node.value === 'string' &&
        arabic.test(node.value)
      )
        errors.push(`${file}: hardcoded Arabic expression ${node.value}`);
      for (const [key, value] of Object.entries(node)) {
        if (key.endsWith('Span') || key === 'source') continue;
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      }
    }
    template.nodes.forEach(visit);
    for (const match of source.matchAll(/['"]([\w.-]+)['"]\s*\|\s*t\b/g)) checkKey(match[1], file);
    for (const match of source.matchAll(/\b\w+\.t\('([^']+)'\)/g)) checkKey(match[1], file);
  } else if (file.endsWith('.ts')) {
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (
        (ts.isStringLiteralLike(node) ||
          ts.isTemplateHead(node) ||
          ts.isTemplateMiddle(node) ||
          ts.isTemplateTail(node)) &&
        arabic.test(node.text)
      ) {
        // These three replacement letters normalize incoming Egyptian location data;
        // they are never rendered and must remain independent of the UI language.
        let method = node.parent;
        while (method && !ts.isMethodDeclaration(method)) method = method.parent;
        const locationNormalization =
          method?.name.getText(ast) === 'cleanLocationText' &&
          /^[\u0627\u0647\u064a]$/.test(node.text);
        if (!locationNormalization)
          errors.push(`${file}: hardcoded Arabic literal ${JSON.stringify(node.text)}`);
      }
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 't' &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        checkKey(node.arguments[0].text, file);
      if (
        ts.isStringLiteral(node) &&
        /[A-Za-z]{2}/.test(node.text) &&
        ts.isPropertyAssignment(node.parent) &&
        /^(label|title|description|message|placeholder|imageAlt)$/.test(
          node.parent.name.getText(ast),
        ) &&
        !/^[\w-]+(?:\.[\w-]+)+$/.test(node.text)
      )
        errors.push(`${file}: hardcoded UI label ${JSON.stringify(node.text)}`);
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
}
if (errors.length) {
  console.error([...new Set(errors)].join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Bilingual checks passed: ${keys.size} keys, complete Arabic/English values, no hardcoded UI text or Arabic UI expressions/literals.`,
  );
