const fs = require('fs');
const path = require('path');

const jiraIssues = JSON.parse(fs.readFileSync('docs/jira-board34-live.json', 'utf8'));

// Filter for To Do issues starting with [FE API
const todoApiIssues = jiraIssues.filter(i => 
  i.status !== 'Done' && 
  i.summary?.startsWith('[FE API')
);

console.log(`Total [FE API] issues currently in To Do: ${todoApiIssues.length}`);

// Let's inspect the distribution of keys
const keyNumbers = todoApiIssues.map(i => parseInt(i.key.replace('WAS-', ''), 10)).sort((a,b) => a-b);
console.log(`Min key: WAS-${keyNumbers[0]}, Max key: WAS-${keyNumbers[keyNumbers.length - 1]}`);

// Check which categories exist in summary
const categories = {};
for (const issue of todoApiIssues) {
  const match = issue.summary.match(/\[FE API\s+([^\]]+)\]/);
  const cat = match ? match[1] : 'Unknown';
  categories[cat] = (categories[cat] || 0) + 1;
}

console.log('Categories breakdown:');
for (const [cat, count] of Object.entries(categories).sort((a,b) => b[1] - a[1])) {
  console.log(`  - ${cat}: ${count}`);
}
