const fs = require('fs');

const issues = JSON.parse(fs.readFileSync('docs/jira-board34-live.json', 'utf8'));
const featureIssues = issues.filter(i => i.status !== 'Done');

const result = featureIssues.map(f => ({
  key: f.key,
  summary: f.summary,
  description: f.description
}));

fs.writeFileSync('docs/feature-scenarios.json', JSON.stringify(result, null, 2), 'utf8');
console.log(`Extracted ${result.length} feature scenarios into docs/feature-scenarios.json`);
