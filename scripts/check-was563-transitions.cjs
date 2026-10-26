const { getWsUrl, evaluateInBrowser } = require('./jira-client.cjs');

async function main() {
  const wsUrl = await getWsUrl();
  const res = await evaluateInBrowser(wsUrl, `
    (async () => {
      const r = await fetch('/rest/api/3/issue/WAS-563/transitions');
      return await r.json();
    })()
  `);
  console.log('Transitions for WAS-563:', JSON.stringify(res, null, 2));
}

main().catch(console.error);
