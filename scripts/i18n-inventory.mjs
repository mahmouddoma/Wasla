import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { parseTemplate, TmplAstText, TmplAstBoundText, TmplAstTextAttribute } from '@angular/compiler';
const app='src/app';
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const found=new Map();
function add(text,file,kind){text=text.trim();if(!/[\u0600-\u06ff]/.test(text))return;const item=found.get(text)??{text,occurrences:[]};item.occurrences.push({file,kind});found.set(text,item);}
for(const file of files(app)){
 const text=fs.readFileSync(file,'utf8');
 if(file.endsWith('.html')){
  const ast=parseTemplate(text,file);const seen=new Set();
  function visit(node){
   if(!node||typeof node!=='object'||seen.has(node))return;seen.add(node);
   if(node instanceof TmplAstText)add(node.value,file,'text');
   if(node instanceof TmplAstTextAttribute)add(node.value,file,'attribute');
   if(node instanceof TmplAstBoundText)for(const segment of node.value.ast.strings??[])add(segment,file,'boundText');
   if(node.constructor?.name==='LiteralPrimitive'&&typeof node.value==='string')add(node.value,file,'expression');
   for(const [key,next] of Object.entries(node)){if(key.endsWith('Span')||key==='source')continue;if(Array.isArray(next))next.forEach(visit);else if(next&&typeof next==='object')visit(next);}
  }
  ast.nodes.forEach(visit);
 }else if(file.endsWith('.ts')&&!file.endsWith('.spec.ts')&&!file.endsWith('translations.ts')){
  const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
  function visit(node){if(ts.isStringLiteralLike(node))add(node.text,file,'typescript');ts.forEachChild(node,visit);}visit(ast);
 }
}
const result=[...found.values()].sort((a,b)=>b.occurrences.length-a.occurrences.length);
fs.writeFileSync('docs/i18n-migration-inventory.json',JSON.stringify(result,null,2)+'\n');
console.log(`${result.length} distinct Arabic literals outside the dictionary; includes domain/display data that needs review.`);
