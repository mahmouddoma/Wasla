import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { parseTemplate, TmplAstText, TmplAstBoundText, TmplAstTextAttribute } from '@angular/compiler';
const dictionaryFile='src/app/core/i18n/translations.ts';
const additions=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
let dictionary=fs.readFileSync(dictionaryFile,'utf8');
const dictionaryAst=ts.createSourceFile(dictionaryFile,dictionary,ts.ScriptTarget.Latest,true);
const keys=new Map();
const existingKeys=new Set();
function discover(node){
 if(ts.isPropertyAssignment(node)&&ts.isStringLiteral(node.name)&&ts.isObjectLiteralExpression(node.initializer)){
  existingKeys.add(node.name.text);
  const ar=node.initializer.properties.find(p=>p.name?.getText(dictionaryAst)==='ar');
  if(ar&&ts.isStringLiteral(ar.initializer))keys.set(ar.initializer.text.trim(),node.name.text);
 }
 ts.forEachChild(node,discover);
}discover(dictionaryAst);
const newEntries=[];
for(const [key,ar,en]of additions){if(!keys.has(ar.trim())){if(existingKeys.has(key))throw new Error('Translation key already exists with different Arabic text: '+key);keys.set(ar.trim(),key);existingKeys.add(key);newEntries.push('  '+JSON.stringify(key)+': { ar: '+JSON.stringify(ar)+', en: '+JSON.stringify(en)+' },');}}
dictionary=dictionary.replace('export const TRANSLATIONS: TranslationDictionary = {','export const TRANSLATIONS: TranslationDictionary = {\n'+newEntries.join('\n'));
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of files('src/app').filter(f=>f.endsWith('.ts')&&!f.endsWith('.spec.ts')&&!f.endsWith('.routes.ts'))){
 let text=fs.readFileSync(file,'utf8');const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 let component,klass,language;
 function inspect(node){
  if(ts.isClassDeclaration(node)){
   const decorator=ts.getDecorators(node)?.find(d=>ts.isCallExpression(d.expression)&&d.expression.expression.getText(ast)==='Component');
   if(decorator){component=decorator.expression.arguments[0];klass=node;language=node.members.find(m=>ts.isPropertyDeclaration(m)&&m.initializer?.getText(ast)==='inject(LanguageService)')?.name.getText(ast);}
  }
  ts.forEachChild(node,inspect);
 }inspect(ast);if(!klass||!component)continue;
 const template=component.properties.find(p=>p.name?.getText(ast)==='templateUrl')?.initializer.text;
 if(!template)continue;
 const htmlFile=path.resolve(path.dirname(file),template);let html=fs.readFileSync(htmlFile,'utf8');const parsed=parseTemplate(html,htmlFile),seen=new Set(),edits=[];
 function visit(node){
  if(!node||typeof node!=='object'||seen.has(node))return;seen.add(node);
  if(node instanceof TmplAstText){const key=keys.get(node.value.trim());if(key){const raw=html.slice(node.sourceSpan.start.offset,node.sourceSpan.end.offset);const content=raw.trim();edits.push([node.sourceSpan.start.offset,node.sourceSpan.end.offset,raw.replace(content,"{{ '"+key+"' | t }}")]);}}
  if(node instanceof TmplAstBoundText){const raw=html.slice(node.sourceSpan.start.offset,node.sourceSpan.end.offset);const next=raw.split(/(\{\{[\s\S]*?\}\})/).map(segment=>{if(segment.startsWith('{{'))return segment;const key=keys.get(segment.trim());return key?segment.replace(segment.trim(),"{{ '"+key+"' | t }}"):segment;}).join('');if(next!==raw)edits.push([node.sourceSpan.start.offset,node.sourceSpan.end.offset,next]);}
  if(node instanceof TmplAstTextAttribute){const key=keys.get(node.value.trim());if(key){const name=node.name==='aria-label'?'attr.aria-label':node.name;edits.push([node.sourceSpan.start.offset,node.sourceSpan.end.offset,'['+name+']="\''+key+'\' | t"']);}}
  for(const [key,next] of Object.entries(node)){if(key.endsWith('Span')||key==='source'||key==='value')continue;if(Array.isArray(next))next.forEach(visit);else if(next&&typeof next==='object')visit(next);}
 }parsed.nodes.forEach(visit);
 for(const [a,b,next]of edits.sort((a,b)=>b[0]-a[0]))html=html.slice(0,a)+next+html.slice(b);
 // Literal UI expressions inside Angular bindings are translated by the same existing language service.
 const languageName=language??'uiLanguage';
 html=html.replace(/'([^'\n]*[\u0600-\u06ff][^'\n]*)'/g,(original,ar)=>{const key=keys.get(ar.trim());if(!key)return original;const leading=ar.match(/^\s*/)[0],trailing=ar.match(/\s*$/)[0];return (leading?"'"+leading+"' + ":'')+languageName+".t('"+key+"')"+(trailing?" + '"+trailing+"'":'');});
 const tsEdits=[];
 function literals(node){if(ts.isStringLiteral(node)&&keys.has(node.text.trim())&&/[\u0600-\u06ff]/.test(node.text))tsEdits.push([node.getStart(ast),node.end,`this.${languageName}.t('${keys.get(node.text.trim())}')`]);ts.forEachChild(node,literals);}klass.members.forEach(literals);
 const htmlChanged=html!==fs.readFileSync(htmlFile,'utf8');if(!htmlChanged&&!tsEdits.length)continue;
 const imports=component.properties.find(p=>p.name?.getText(ast)==='imports');
 const translated=html.includes('| t');
 if(translated&&!text.includes('import { TranslatePipe }')){
  const relative=path.relative(path.dirname(path.resolve(file)),path.resolve('src/app/core/i18n/translate.pipe')).replaceAll(path.sep,'/');
  tsEdits.push([0,0,`import { TranslatePipe } from '${relative}';\n`]);
  if(imports){const end=imports.initializer.end-1;const prefix=imports.initializer.elements.length&&!imports.initializer.elements.hasTrailingComma?', ':'';tsEdits.push([end,end,prefix+'TranslatePipe']);}
  else tsEdits.push([component.getStart(ast)+1,component.getStart(ast)+1,'\n  imports: [TranslatePipe],']);
 }
 if(!language){
  const relative=path.relative(path.dirname(path.resolve(file)),path.resolve('src/app/core/i18n/language.service')).replaceAll(path.sep,'/');
  tsEdits.push([0,0,`import { LanguageService } from '${relative}';\n`]);
  if(!ast.statements.some(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='@angular/core'&&n.importClause?.namedBindings?.elements?.some(e=>e.name.text==='inject'))){const core=ast.statements.find(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='@angular/core');tsEdits.push([core.importClause.namedBindings.end-1,core.importClause.namedBindings.end-1,(core.importClause.namedBindings.elements.hasTrailingComma?'':', ')+'inject']);}
  const opening=text.indexOf('{',klass.members.pos-1);const classBody=klass.members.pos;
  tsEdits.push([classBody,classBody,`\n  protected readonly ${languageName} = inject(LanguageService);\n`]);
 }
 for(const [a,b,next]of tsEdits.sort((a,b)=>b[0]-a[0]))text=text.slice(0,a)+next+text.slice(b);
 fs.writeFileSync(file,text);if(htmlChanged)fs.writeFileSync(htmlFile,html);
}
fs.writeFileSync(dictionaryFile,dictionary);
console.log(`Added ${newEntries.length} bilingual keys and reused existing dictionary entries across components.`);
