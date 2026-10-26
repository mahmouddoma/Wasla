const fs = require('fs');
const path = require('path');

const issues = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/jira-board34-live.json'), 'utf8'));
const todoApiIssues = issues.filter(i => i.status === 'To Do' && i.summary.includes('[FE API'));

console.log(`Total FE API issues in To Do: ${todoApiIssues.length}`);

const groups = {
  'Board 34 Core (WAS-1..256)': [],
  'Phase 15 Medical Catalog & Diagnostics (WAS-257..402)': [],
  'Phase 18 Part 1 Reporting & Analytics (WAS-403..511)': [],
  'Phase 18 Part 2 Archives & Audit Trails (WAS-512..551)': [],
  'Phase 16 Medical Records & Visibility (WAS-588..610)': [],
  'Patient Onboarding, Claims & Duplicates (WAS-611..630)': [],
  'Other / Uncategorized': []
};

for (const issue of todoApiIssues) {
  const num = parseInt(issue.key.replace('WAS-', ''), 10);
  if (num <= 256) {
    groups['Board 34 Core (WAS-1..256)'].push(issue);
  } else if (num >= 257 && num <= 402) {
    groups['Phase 15 Medical Catalog & Diagnostics (WAS-257..402)'].push(issue);
  } else if (num >= 403 && num <= 511) {
    groups['Phase 18 Part 1 Reporting & Analytics (WAS-403..511)'].push(issue);
  } else if (num >= 512 && num <= 551) {
    groups['Phase 18 Part 2 Archives & Audit Trails (WAS-512..551)'].push(issue);
  } else if (num >= 588 && num <= 610) {
    groups['Phase 16 Medical Records & Visibility (WAS-588..610)'].push(issue);
  } else if (num >= 611 && num <= 630) {
    groups['Patient Onboarding, Claims & Duplicates (WAS-611..630)'].push(issue);
  } else {
    groups['Other / Uncategorized'].push(issue);
  }
}

for (const [name, list] of Object.entries(groups)) {
  console.log(`\n${name}: ${list.length} issues`);
  if (list.length > 0) {
    console.log(`  Keys: ${list[0].key} .. ${list[list.length - 1].key}`);
  }
}
