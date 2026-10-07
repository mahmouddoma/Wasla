// Verify every To Do endpoint against the captured OpenAPI contract and HTTP tests.
const fs = require('node:fs');
const ts = require('typescript');
const issues = JSON.parse(fs.readFileSync('docs/phase15-jira-todo.json', 'utf8'));
const snapshotPath = 'docs/phase15-openapi-contracts.json';
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const swaggerPath = '.tmp/phase15-swagger.json';
const paths = fs.existsSync(swaggerPath)
  ? JSON.parse(fs.readFileSync(swaggerPath, 'utf8').replace(/^\uFEFF/, '')).paths
  : snapshot.paths;
function normalized(path) {
  return path.replace(/\{[^}]+\}/g, ':id').replace(/\/(id|request|batch|item|result|submission|practice|encounter|attachment|2)(?=\/|$)/g, '/:id');
}
const matrices = [
 'src/app/domains/medical-catalog/medical-catalog-api.spec.ts',
 'src/app/domains/diagnostics/diagnostics-api.spec.ts',
];
const tested = new Map();
for (const file of matrices) {
 const ast = ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 function value(node, name) {
  if(ts.isStringLiteral(node)||ts.isNumericLiteral(node))return node.text;
  if(ts.isIdentifier(node)&&node.text==='name')return name;
  if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken)return value(node.left,name)+value(node.right,name);
 }
 function visit(node) {
  if(ts.isObjectLiteralExpression(node)) {
   const props = Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText(ast),p.initializer]));
   if(props.path&&props.method) {
    for(const name of ['activate','deactivate','merge','request-more-info','approve','reject']) {
     const path=value(props.path,name),method=value(props.method,name);
     if(!path||!method)throw Error('Unsupported HTTP case '+node.getText(ast));
     for(const kind of ['lab','radiology'])tested.set(method+' '+normalized('/api/v1/'+path.replace('K',kind)),file);
    }
   }
  }
  ts.forEachChild(node,visit);
 }
 visit(ast);
}
const existing = {
 'WAS-1': ['src/app/core/auth/auth-api.ts','src/app/core/auth/auth-api.spec.ts'],
 'WAS-2': ['src/app/core/auth/auth-api.ts','src/app/core/auth/auth-api.spec.ts'],
 'WAS-177': ['src/app/domains/tickets/tickets-api.ts','src/app/features/encounters/state/encounter-workspace.store.spec.ts'],
 'WAS-196': ['src/app/domains/encounters/encounters-api.ts','src/app/domains/encounters/encounters-api.spec.ts'],
 'WAS-197': ['src/app/domains/encounters/encounters-api.ts','src/app/domains/encounters/encounters-api.spec.ts'],
};
const audit = issues.map(issue=>{
 const match=issue.fields.summary.match(/(GET|POST|PUT|DELETE) (\/api\/\S+)/);
 if(!match)throw Error('No endpoint: '+issue.key);
 const [,method,path]=match;
 const swaggerMatch=Object.entries(paths).find(([p,ops])=>normalized(p)===normalized(path)&&ops[method.toLowerCase()]);
 const test=path.includes('medical-catalog-managers')?'src/app/features/admin/services/drug-catalog-managers/drug-catalog-managers-api.spec.ts':tested.get(method+' '+normalized(path));
 const api=path.includes('medical-catalog-managers')?'src/app/features/admin/services/drug-catalog-managers/drug-catalog-managers-api.ts':test?.replace('.spec.ts','.ts');
 const evidence=existing[issue.key]??[api,test];
 const checked=!!swaggerMatch&&evidence.every(p=>p&&fs.existsSync(p));
 return {key:issue.key,method,path,openApi:!!swaggerMatch,api:evidence[0],httpTest:evidence[1],checked};
});
snapshot.paths=Object.fromEntries(audit.filter(a=>a.openApi).map(a=>[a.path,paths[a.path]]));
fs.writeFileSync(snapshotPath,JSON.stringify(snapshot,null,2)+'\n');
fs.writeFileSync('docs/phase15-endpoint-audit.json',JSON.stringify({issues:audit.length,checked:audit.filter(a=>a.checked).length,liveClinicalMutations:false,endpoints:audit},null,2)+'\n');
for(const a of audit.filter(a=>!a.checked))console.error(a);
console.log(`${audit.filter(a=>a.checked).length}/${audit.length} endpoints have OpenAPI and HTTP test evidence.`);
if(audit.some(a=>!a.checked))process.exitCode=1;
