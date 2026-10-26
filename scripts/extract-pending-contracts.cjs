const fs = require('fs');
const path = require('path');

const issues = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/jira-board34-live.json'), 'utf8'));

function getTickets(start, end) {
  return issues.filter(i => {
    const n = parseInt(i.key.replace('WAS-',''), 10);
    return n >= start && n <= end;
  }).map(i => ({
    key: i.key,
    summary: i.summary,
    description: i.description
  }));
}

const p17 = getTickets(552, 562);
const p16 = getTickets(588, 610);
const p05 = getTickets(611, 630);

fs.writeFileSync(path.resolve(__dirname, '../docs/pending-p17-contracts.json'), JSON.stringify(p17, null, 2));
fs.writeFileSync(path.resolve(__dirname, '../docs/pending-p16-contracts.json'), JSON.stringify(p16, null, 2));
fs.writeFileSync(path.resolve(__dirname, '../docs/pending-p05-contracts.json'), JSON.stringify(p05, null, 2));

console.log(`Saved ${p17.length} Phase 17 contracts to docs/pending-p17-contracts.json`);
console.log(`Saved ${p16.length} Phase 16 contracts to docs/pending-p16-contracts.json`);
console.log(`Saved ${p05.length} Phase 05 contracts to docs/pending-p05-contracts.json`);
