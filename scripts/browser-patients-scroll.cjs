const assert = require('node:assert/strict');
const fs = require('node:fs');
async function main() {
  fs.mkdirSync('.tmp', { recursive: true });
  const browser = await fetch('http://127.0.0.1:9222/json/version').then((r) => r.json());
  const ws = new WebSocket(browser.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  const permissions = ['Patients.SearchBasic', 'Patients.Register'];
  const user = {
    applicationUserId: 'test',
    userName: 'Reception',
    userType: 'Reception',
    roles: ['Reception'],
    permissions,
    isFirstLogin: false,
  };
  ws.onmessage = async (e) => {
    const m = JSON.parse(e.data);
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(m.error) : p.resolve(m.result);
    }
    if (m.method === 'Fetch.requestPaused') {
      const path = new URL(m.params.request.url).pathname;
      const data = path.endsWith('/auth/me')
        ? user
        : path.endsWith('/reception/practices')
          ? [
              {
                id: 'p1',
                nameAr: 'عيادة الاختبار',
                nameEn: 'Test clinic',
                isActive: true,
                permissionCodes: permissions,
              },
            ]
          : [];
      await send(
        'Fetch.fulfillRequest',
        {
          requestId: m.params.requestId,
          responseCode: 200,
          responseHeaders: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Access-Control-Allow-Origin', value: 'http://127.0.0.1:4201' },
            { name: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
            {
              name: 'Access-Control-Allow-Headers',
              value: 'authorization,content-type,accept-language',
            },
          ],
          body: Buffer.from(JSON.stringify(data)).toString('base64'),
        },
        m.sessionId,
      );
    }
  };
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (m, p) => send(m, p, sessionId);
  const evaluate = async (expression) =>
    (await call('Runtime.evaluate', { expression, returnByValue: true })).result.value;
  try {
    await call('Page.enable');
    await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
    for (const lang of ['ar', 'en']) {
      await call('Page.addScriptToEvaluateOnNewDocument', {
        source: `sessionStorage.setItem('wasla.auth.session',${JSON.stringify(JSON.stringify({ accessToken: 'synthetic', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});localStorage.setItem('wasla_lang','${lang}');`,
      });
      for (const width of [1920, 1440, 1024, 768, 390]) {
        await call('Emulation.setDeviceMetricsOverride', {
          width,
          height: 1000,
          deviceScaleFactor: 1,
          mobile: false,
        });
        await call('Page.navigate', { url: 'http://127.0.0.1:4201/reception/patients' });
        for (let n = 0; n < 100; n++) {
          if (await evaluate("!!document.querySelector('.patient-register-grid')")) break;
          await new Promise((r) => setTimeout(r, 100));
        }
        const result = await evaluate(
          `(() => ({width:innerWidth, scroll:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,panels:document.querySelectorAll('.patient-panel').length,overflow:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width && (r.right>innerWidth+1 || r.left < -1) && getComputedStyle(e).position!=='fixed'}).slice(0,12).map(e=>e.className)}))()`,
        );
        console.log(lang, width, JSON.stringify(result), await evaluate('location.href'));
        assert.equal(result.panels, 2);
        assert.ok(result.scroll <= width, `${lang} ${width} overflow`);
        if (width === 1440 || width === 390) {
          const shot = await call('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync(`.tmp/patients-${lang}-${width}.png`, Buffer.from(shot.data, 'base64'));
        }
      }
    }
  } finally {
    await send('Target.closeTarget', { targetId });
    ws.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
