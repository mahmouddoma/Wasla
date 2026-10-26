const fs = require('fs');

async function getWsUrl() {
  const tabs = await fetch('http://127.0.0.1:9222/json').then(r => r.json());
  const tab = tabs.find(t => t.url.includes('atlassian.net'));
  if (!tab) throw new Error('No Atlassian tab found in Chrome on port 9222');
  return tab.webSocketDebuggerUrl;
}

function evaluateInBrowser(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression,
          awaitPromise: true,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      ws.close();
      if (msg.error) {
        reject(msg.error);
      } else if (msg.result?.exceptionDetails) {
        reject(new Error(JSON.stringify(msg.result.exceptionDetails)));
      } else {
        resolve(msg.result?.result?.value);
      }
    };
    ws.onerror = (err) => {
      reject(err);
    };
  });
}

module.exports = {
  getWsUrl,
  evaluateInBrowser
};
