const { getWsUrl, evaluateInBrowser } = require('./jira-client.cjs');

async function checkTransition() {
  const wsUrl = await getWsUrl();
  const testIssueKey = 'WAS-552';
  const expr = `
    (async () => {
      const res = await fetch('/rest/api/3/issue/${testIssueKey}/transitions');
      const data = await res.json();
      return data;
    })()
  `;
  const result = await evaluateInBrowser(wsUrl, expr);
  console.log('Transitions for ' + testIssueKey + ':', JSON.stringify(result, null, 2));
}

checkTransition().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
