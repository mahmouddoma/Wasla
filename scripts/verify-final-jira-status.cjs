const { getWsUrl, evaluateInBrowser } = require('./jira-client.cjs');

async function verifyFinalJiraStatus() {
  const wsUrl = await getWsUrl();
  const expr = `
    (async () => {
      let allIssues = [];
      let startAt = 0;
      const maxResults = 100;
      let total = 1;

      while (startAt < total) {
        const res = await fetch('/rest/api/3/search?jql=project=WAS&startAt=' + startAt + '&maxResults=' + maxResults + '&fields=summary,status,issuetype');
        const data = await res.json();
        total = data.total;
        allIssues.push(...data.issues);
        startAt += data.issues.length;
        if (data.issues.length === 0) break;
      }

      const byStatus = {};
      const todoIssues = [];

      for (const issue of allIssues) {
        const s = issue.fields?.status?.name || 'Unknown';
        byStatus[s] = (byStatus[s] || 0) + 1;
        if (s !== 'Done') {
          todoIssues.push({
            key: issue.key,
            summary: issue.fields?.summary,
            status: s,
            type: issue.fields?.issuetype?.name
          });
        }
      }

      return {
        total: allIssues.length,
        byStatus,
        todoCount: todoIssues.length,
        todoIssues
      };
    })()
  `;

  const result = await evaluateInBrowser(wsUrl, expr);
  console.log('Final Board Status:');
  console.log('Total issues:', result.total);
  console.log('By status:', JSON.stringify(result.byStatus, null, 2));
  console.log('Remaining non-Done issues (' + result.todoCount + '):');
  for (const item of result.todoIssues) {
    console.log(`  - [${item.key}] (${item.status}) ${item.summary}`);
  }
}

verifyFinalJiraStatus().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
