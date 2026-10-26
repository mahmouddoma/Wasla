const { getWsUrl, evaluateInBrowser } = require('./jira-client.cjs');

async function main() {
  const wsUrl = await getWsUrl();
  const expression = `(async () => {
    const resp = await fetch('/rest/api/3/issue/WAS-1/transitions');
    return await resp.json();
  })()`;
  const transitions = await evaluateInBrowser(wsUrl, expression);
  console.log('Available transitions for WAS-1:');
  console.log(JSON.stringify(transitions, null, 2));
}

main().catch(console.error);
