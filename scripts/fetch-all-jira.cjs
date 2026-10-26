const fs = require('fs');
const path = require('path');
const { getWsUrl, evaluateInBrowser } = require('./jira-client.cjs');

async function main() {
  console.log('Connecting to Chrome Jira tab...');
  const wsUrl = await getWsUrl();
  console.log('Connected! Fetching issues from Board 34...');

  // First fetch page 0 to get total count
  const expression = `(async () => {
    const results = [];
    let startAt = 0;
    const maxResults = 100;
    let total = Infinity;

    while (startAt < total) {
      console.log('Fetching batch startAt=' + startAt);
      const url = '/rest/agile/1.0/board/34/issue?maxResults=' + maxResults + '&startAt=' + startAt;
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error('Failed to fetch ' + url + ': ' + resp.status + ' ' + resp.statusText);
      }
      const data = await resp.json();
      total = data.total;
      for (const issue of data.issues) {
        results.push({
          id: issue.id,
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          statusId: issue.fields.status.id,
          issueType: issue.fields.issuetype?.name,
          priority: issue.fields.priority?.name,
          description: issue.fields.description
        });
      }
      startAt += data.issues.length;
      if (data.issues.length === 0) break;
    }
    return { total, count: results.length, issues: results };
  })()`;

  console.log('Executing paginated fetch inside Jira page context...');
  const data = await evaluateInBrowser(wsUrl, expression);
  console.log(`Successfully fetched ${data.count} issues (Jira total: ${data.total})!`);

  const outputPath = path.resolve(__dirname, '../docs/jira-board34-live.json');
  fs.writeFileSync(outputPath, JSON.stringify(data.issues, null, 2), 'utf8');
  console.log(`Saved all ${data.count} issues to ${outputPath}`);

  // Summary by status
  const byStatus = {};
  for (const issue of data.issues) {
    byStatus[issue.status] = (byStatus[issue.status] || 0) + 1;
  }
  console.log('\nBreakdown by status:');
  console.table(byStatus);

  // Issues by type
  const byType = {};
  for (const issue of data.issues) {
    byType[issue.issueType] = (byType[issue.issueType] || 0) + 1;
  }
  console.log('\nBreakdown by issue type:');
  console.table(byType);
}

main().catch(err => {
  console.error('Error fetching Jira issues:', err);
  process.exit(1);
});
