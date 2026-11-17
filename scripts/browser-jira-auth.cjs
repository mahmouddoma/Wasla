const assert = require('node:assert/strict');
const fs = require('node:fs');

async function main() {
  const origin = process.env.WASLA_ORIGIN || 'http://localhost:4200';
  const debug = process.env.WASLA_DEBUG_ORIGIN || 'http://127.0.0.1:9247';
  const version = await fetch(debug + '/json/version').then(r => r.json());
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const pending = new Map();
  let id = 0;
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const task = pending.get(message.id);
    pending.delete(message.id);
    message.error ? task.reject(message.error) : task.resolve(message.result);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 150; attempt++) {
      if (await evaluate(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw Error('Browser condition failed: ' + expression);
  };
  const results = [];
  try {
    await call('Page.enable');
    for (const language of ['ar', 'en']) {
      const { identifier } = await call('Page.addScriptToEvaluateOnNewDocument', {
        source: `sessionStorage.clear();localStorage.setItem('wasla_lang','${language}');`,
      });
      for (const width of [390, 1440]) {
        await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
        await call('Page.navigate', { url: origin + '/login?returnUrl=%2Fdoctors&identifier=synthetic' });
        await waitFor("!!document.querySelector('#login-submit-btn')");
        if (width < 768) {
          await evaluate("document.querySelector('.btn-mobile-open-sheet').click()");
          await evaluate("document.querySelector('.patient-option').click()");
        } else await evaluate("document.querySelector('#mode-tab-patient').click()");
        await waitFor("location.pathname === '/register/patient' && !!document.querySelector('app-patient-registration')");
        assert.equal(await evaluate("new URLSearchParams(location.search).get('returnUrl')"), '/doctors');
        await evaluate("document.querySelector('app-patient-registration .back-link').click()");
        await waitFor("location.pathname === '/login' && !!document.querySelector('#login-submit-btn')");
        assert.equal(await evaluate("new URLSearchParams(location.search).get('returnUrl')"), '/doctors');
        await evaluate('history.back()');
        await waitFor("location.pathname === '/register/patient' && !!document.querySelector('app-patient-registration')");
        await evaluate('history.forward()');
        await waitFor("location.pathname === '/login' && !!document.querySelector('#login-submit-btn')");
        if (width < 768) {
          await evaluate("document.querySelector('.btn-mobile-open-sheet').click()");
          await evaluate("document.querySelector('.doctor-option').click()");
        } else await evaluate("document.querySelector('#mode-tab-doctor').click()");
        await waitFor("location.pathname === '/register/doctor' && !!document.querySelector('app-doctor-registration')");
        await call('Page.reload');
        await waitFor("performance.getEntriesByType('navigation')[0]?.type === 'reload' && !!document.querySelector('app-doctor-registration') && !!document.querySelector('.auth-right-container')");
        assert.equal(await evaluate("document.querySelector('.auth-right-container').getAttribute('dir')"), language === 'ar' ? 'rtl' : 'ltr');
        assert.equal(await evaluate("new URLSearchParams(location.search).get('identifier')"), 'synthetic');
        results.push({ language, width, tabs: 'pass', backForward: 'pass', reload: 'pass', query: 'pass' });
      }
      await call('Page.removeScriptToEvaluateOnNewDocument', { identifier });
    }
    fs.mkdirSync('.tmp/jira-fixes-evidence', { recursive: true });
    fs.writeFileSync('.tmp/jira-fixes-evidence/auth-browser.json', JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
  } finally {
    await send('Target.closeTarget', { targetId });
    socket.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
