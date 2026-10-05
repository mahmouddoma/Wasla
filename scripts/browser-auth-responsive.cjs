const assert = require('node:assert/strict');
const fs = require('node:fs');

async function main() {
  const origin = process.env.WASLA_ORIGIN || 'http://127.0.0.1:4201';
  const debugOrigin = process.env.WASLA_DEBUG_ORIGIN || 'http://127.0.0.1:9244';
  const output = '.tmp/auth-responsive';
  fs.mkdirSync(output, { recursive: true });
  const browser = await fetch(debugOrigin + '/json/version').then((r) => r.json());
  const socket = new WebSocket(browser.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let sequence = 0;
  const pending = new Map();
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const task = pending.get(message.id);
      pending.delete(message.id);
      message.error ? task.reject(message.error) : task.resolve(message.result);
    }
  };
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  const evaluate = async (expression) => {
    const result = await call('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const results = [];
  try {
    await call('Page.enable');
    for (const lang of ['ar', 'en']) {
      const { identifier } = await call('Page.addScriptToEvaluateOnNewDocument', {
        source: `sessionStorage.clear();localStorage.setItem('wasla_lang','${lang}');`,
      });
      for (const width of [320, 390, 768, 820, 1024, 1440]) {
        await call('Emulation.setDeviceMetricsOverride', {
          width,
          height: 900,
          deviceScaleFactor: 1,
          mobile: false,
        });
        await call('Page.navigate', { url: origin + '/login' });
        for (let i = 0; i < 100; i++) {
          if (await evaluate("!!document.querySelector('#login-submit-btn')")) break;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        await evaluate('document.fonts.ready');
        const layout = await evaluate(`(() => {
          const visible = e => e.getBoundingClientRect().width > 0;
          const button = document.querySelector('#login-submit-btn');
          const controls = [...document.querySelectorAll('input,.btn-toggle-pwd,.btn-login-submit,.role-card')];
          return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
            direction: document.documentElement.dir, submitHeight: button.getBoundingClientRect().height,
            smallestControl: Math.min(...controls.map(e => e.getBoundingClientRect().height)),
            switchers: [...document.querySelectorAll('app-language-switcher')].filter(visible).length,
            formWidth: document.querySelector('.auth-form-wrap').getBoundingClientRect().width,
            illustration: visible(document.querySelector('.login-illustration')),
            overflow: [...document.querySelectorAll('body *')].filter(e => { const r=e.getBoundingClientRect(); return r.width && (r.right>innerWidth+1 || r.left < -1); }).slice(0,8).map(e=>e.className)
          };
        })()`);
        assert.ok(layout.scrollWidth <= width, JSON.stringify(layout));
        assert.equal(layout.switchers, 1);
        assert.equal(layout.direction, lang === 'ar' ? 'rtl' : 'ltr');
        assert.ok(layout.smallestControl >= 44);
        assert.equal(layout.illustration, width < 1200);
        await evaluate("document.querySelector('.btn-toggle-pwd').click()");
        assert.equal(await evaluate("document.querySelector('#login-password').type"), 'text');
        await evaluate("document.querySelector('.btn-toggle-pwd').click()");
        assert.equal(await evaluate("document.querySelector('#login-password').type"), 'password');
        results.push({ lang, ...layout });
        console.log(JSON.stringify({ lang, ...layout }));
        const screenshot = await call('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });
        fs.writeFileSync(
          `${output}/login-${lang}-${width}.png`,
          Buffer.from(screenshot.data, 'base64'),
        );
      }
      await call('Page.removeScriptToEvaluateOnNewDocument', { identifier });
    }
    fs.writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
  } finally {
    await send('Target.closeTarget', { targetId });
    socket.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
