const fs = require('fs');
const path = require('path');

const issues = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/jira-board34-live.json'), 'utf8'));
const todoIssues = issues.filter(i => i.status === 'To Do');
const apiIssues = todoIssues.filter(i => i.summary.includes('[FE API'));

console.log(`Auditing ${apiIssues.length} [FE API ...] issues in To Do against Wasla codebase...\n`);

// Regex to extract HTTP verb and path from summary: e.g. "Login — POST /api/v1/auth/login" or "GET /api/v1/..."
function extractEndpoint(summary, description) {
  // Try matching from summary
  const summaryMatch = summary.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/v1\/[^\s\?]+)/i);
  if (summaryMatch) {
    return { method: summaryMatch[1].toUpperCase(), path: summaryMatch[2] };
  }
  // Try matching from description
  if (description) {
    const descMatch = description.match(/\{\{(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/v1\/[^\s\?\}]+)\}\}/i)
      || description.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/v1\/[^\s\?]+)/i);
    if (descMatch) {
      return { method: descMatch[1].toUpperCase(), path: descMatch[2] };
    }
  }
  return null;
}

// Load all TS files in src/app
function getAllTsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllTsFiles(filePath));
    } else if (file.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const allTsFiles = getAllTsFiles(path.resolve(__dirname, '../src/app'));
const tsContents = allTsFiles.map(f => ({
  file: f,
  relFile: path.relative(path.resolve(__dirname, '..'), f).replace(/\\/g, '/'),
  content: fs.readFileSync(f, 'utf8')
}));

function normalizeEndpoint(ep) {
  return ep.replace(/\{[^}]+\}/g, '').replace(/\/+/g, '/').toLowerCase();
}

const audited = [];
let matchedCount = 0;
let unmatchedCount = 0;

for (const issue of apiIssues) {
  const ep = extractEndpoint(issue.summary, issue.description);
  if (!ep) {
    audited.push({
      key: issue.key,
      summary: issue.summary,
      endpoint: null,
      status: 'NO_ENDPOINT_IN_TEXT'
    });
    unmatchedCount++;
    continue;
  }

  // Look for path in tsContents
  // Exact path or normalized path matching
  // In TS files, endpoints are written like '/api/v1/auth/login' or `/api/v1/doctors/${id}/...` or `practices/${practiceId}/...`
  // We can search for the core static segment of the path, e.g. "auth/login" or "patient-claims"
  const pathParts = ep.path.replace(/^\/api\/v1\//, '').split('/').filter(p => !p.startsWith('{'));
  const staticSegment = pathParts.join('/');

  const matchingFiles = [];
  for (const item of tsContents) {
    if (item.content.includes(staticSegment) || (pathParts.length > 0 && item.content.includes(pathParts[pathParts.length - 1]))) {
      // Check if file has method or mentions this endpoint
      if (item.content.includes(staticSegment)) {
        matchingFiles.push(item.relFile);
      }
    }
  }

  if (matchingFiles.length > 0) {
    matchedCount++;
    audited.push({
      key: issue.key,
      summary: issue.summary,
      method: ep.method,
      path: ep.path,
      matchingFiles,
      status: 'MATCHED'
    });
  } else {
    unmatchedCount++;
    audited.push({
      key: issue.key,
      summary: issue.summary,
      method: ep.method,
      path: ep.path,
      matchingFiles: [],
      status: 'NOT_FOUND'
    });
  }
}

console.log(`Audit Results:`);
console.log(`Total [FE API ...] issues in To Do: ${apiIssues.length}`);
console.log(`Matched in codebase: ${matchedCount}`);
console.log(`Not found / Need implementation: ${unmatchedCount}\n`);

const notFound = audited.filter(a => a.status !== 'MATCHED');
if (notFound.length > 0) {
  console.log(`=== Unmatched Issues (${notFound.length}) ===`);
  notFound.forEach(n => console.log(`- ${n.key}: ${n.summary} [${n.method} ${n.path || 'N/A'}]`));
}

// Write report to json
fs.writeFileSync(
  path.resolve(__dirname, '../docs/todo-audit-report.json'),
  JSON.stringify(audited, null, 2),
  'utf8'
);
console.log(`\nDetailed report saved to docs/todo-audit-report.json`);
