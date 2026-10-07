// Rebuild the domain contracts from the deployed Phase 15 OpenAPI snapshot.
const fs = require('node:fs');
const snapshot = JSON.parse(fs.readFileSync('docs/phase15-openapi-contracts.json', 'utf8'));
const schemas = snapshot.schemas;
// Jira documents these optional object branches; Swashbuckle omits nullable on $ref.
for (const [name, keys] of Object.entries({ LabAddItemRequest: ['newLabTest'], RadiologyAddItemRequest: ['newRadiologyProcedure'], LabOrderItemRequest: ['newLabTest'], RadiologyOrderItemRequest: ['newRadiologyProcedure'], DiagnosticResultMutationResponse: ['request', 'result', 'submission'] })) {
  for (const key of keys) schemas[name].properties[key].nullable = true;
}
const catalogNames = new Set();
function dependencies(name, names, exclude = new Set()) {
  if (names.has(name) || exclude.has(name)) return;
  if (!schemas[name]) throw Error(`Missing schema ${name}`);
  names.add(name);
  for (const match of JSON.stringify(schemas[name]).matchAll(/#\/components\/schemas\/([^" ]+)/g)) dependencies(match[1], names, exclude);
}
function type(schema) {
  let result;
  if (schema.$ref) result = schema.$ref.split('/').at(-1);
  else if (schema.enum) result = schema.enum.map(v => JSON.stringify(v)).join(' | ');
  else if (schema.type === 'array') result = `readonly (${type(schema.items)})[]`;
  else if (schema.properties) result = '{ ' + Object.entries(schema.properties).map(([key, value]) => `readonly ${key}: ${type(value)};`).join(' ') + ' }';
  else if (schema.type === 'boolean') result = 'boolean';
  else if (['integer', 'number'].includes(schema.type)) result = 'number';
  else if (schema.type === 'string') result = 'string';
  else result = 'unknown';
  return result + (schema.nullable ? ' | null' : '');
}
function write(folder, names, prefix = '') {
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(`${folder}/contracts.ts`, '// Generated from the deployed Phase 15 OpenAPI schema.\n' + prefix + [...names].map(name => `export type ${name} = ${type(schemas[name])};`).join('\n') + '\n');
}
for (const name of Object.keys(schemas)) if (/^(MedicalCatalog|CatalogPresentation|MedicalRequestReview|DiagnosticImport|LabMissing|RadiologyMissing|LabCatalogRequestUpdate|RadiologyCatalogRequestUpdate|CreateMedicalCatalogManager|ManagerContact)/.test(name)) dependencies(name, catalogNames);
dependencies('DiagnosticActionRequest', catalogNames);
write('src/app/domains/medical-catalog', catalogNames);
const clinicalNames = new Set();
for (const name of ['DiagnosticRequestStateResponse','DiagnosticRequestSummaryClinicalPage','DiagnosticResultMutationResponse','DiagnosticResultResponseClinicalPage','DiagnosticSubmissionSummaryClinicalPage','LabAddItemRequest','RadiologyAddItemRequest','LabPostVisitRequest','RadiologyPostVisitRequest','LabAcceptSubmissionRequest','RadiologyAcceptSubmissionRequest','DiagnosticRejectSubmissionRequest']) dependencies(name, clinicalNames, catalogNames);
const imported = [...catalogNames].filter(name => [...clinicalNames].some(n => JSON.stringify(schemas[n]).includes('/' + name + '"')));
write('src/app/domains/diagnostics', clinicalNames, `import type { ${imported.join(', ')} } from '../medical-catalog';\n`);
console.log(`Generated ${catalogNames.size} catalog and ${clinicalNames.size} clinical contracts.`);
