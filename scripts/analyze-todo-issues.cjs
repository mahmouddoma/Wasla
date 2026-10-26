const fs = require('fs');
const path = require('path');

const issues = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/jira-board34-live.json'), 'utf8'));
const todoIssues = issues.filter(i => i.status === 'To Do');
const doneIssues = issues.filter(i => i.status === 'Done');

console.log('=== Jira Board 34 Status Analysis ===');
console.log(`Total Issues: ${issues.length}`);
console.log(`To Do: ${todoIssues.length}`);
console.log(`Done: ${doneIssues.length}\n`);

// Categories among To Do
const feApiTodo = todoIssues.filter(i => i.summary.includes('[FE API'));
const feFeatureTodo = todoIssues.filter(i => i.summary.includes('[FE FEATURE'));
const otherTodo = todoIssues.filter(i => !i.summary.includes('[FE API') && !i.summary.includes('[FE FEATURE'));

console.log(`To Do - [FE API ...] Endpoints: ${feApiTodo.length}`);
console.log(`To Do - [FE FEATURE ...] Scenarios: ${feFeatureTodo.length}`);
console.log(`To Do - Other: ${otherTodo.length}`);

if (otherTodo.length > 0) {
  console.log('\nOther To Do Issues:');
  otherTodo.forEach(i => console.log(`- ${i.key}: ${i.summary}`));
}

// Done breakdown
const feApiDone = doneIssues.filter(i => i.summary.includes('[FE API'));
const feFeatureDone = doneIssues.filter(i => i.summary.includes('[FE FEATURE'));
const otherDone = doneIssues.filter(i => !i.summary.includes('[FE API') && !i.summary.includes('[FE FEATURE'));
console.log(`\nDone - [FE API ...]: ${feApiDone.length}`);
console.log(`Done - [FE FEATURE ...]: ${feFeatureDone.length}`);
console.log(`Done - Other: ${otherDone.length}`);
if (feApiDone.length > 0) {
  console.log('Sample Done issues:', feApiDone.slice(0, 5).map(i => i.key + ': ' + i.summary));
}

// Group FE API issues by Phase or Range
console.log('\nSample FE API in To Do:');
feApiTodo.slice(0, 10).forEach(i => console.log(`- ${i.key}: ${i.summary}`));
console.log('...');
feApiTodo.slice(-10).forEach(i => console.log(`- ${i.key}: ${i.summary}`));
