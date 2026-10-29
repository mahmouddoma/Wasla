// Authenticated QA: credentials arrive on stdin and are never written to evidence.
const fs = require('node:fs');
const readline = require('node:readline');
const origin = 'http://localhost:4201';
const backend = 'http://192.168.1.10:8085';
const evidence = '.tmp/doctor-remediation-live';
const input = readline.createInterface({ input: process.stdin });
const lines = input[Symbol.asyncIterator]();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function main() {
  fs.mkdirSync(evidence, { recursive: true });
  const credentials = JSON.parse((await lines.next()).value);
  const version = await fetch('http://127.0.0.1:9223/json/version').then((r) => r.json());
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));
  let next = 0;
  const pending = new Map();
  const calls = [];
  const requests = new Map();
  const errors = [];
  const runId = Date.now();
  const safePath = (value) =>
    new URL(value, backend).pathname.replace(
      /[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}/gi,
      ':id',
    );
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++next;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  ws.onmessage = ({ data }) => {
    const event = JSON.parse(data);
    if (event.id) {
      const entry = pending.get(event.id);
      pending.delete(event.id);
      event.error ? entry.reject(event.error) : entry.resolve(event.result);
    } else if (
      event.method === 'Network.requestWillBeSent' &&
      event.params.request.url.includes('/api/')
    ) {
      const request = event.params.request;
      requests.set(event.params.requestId, {
        method: request.method,
        idempotencyKeyPresent: !!(
          request.headers['Idempotency-Key'] || request.headers['idempotency-key']
        ),
        fields:
          request.postData && !request.url.includes('/auth/')
            ? Object.keys(JSON.parse(request.postData))
            : [],
      });
    } else if (
      event.method === 'Network.responseReceived' &&
      event.params.response.url.includes('/api/')
    ) {
      calls.push({
        ...requests.get(event.params.requestId),
        path: safePath(event.params.response.url),
        status: event.params.response.status,
      });
    } else if (event.method === 'Runtime.exceptionThrown')
      errors.push(event.params.exceptionDetails.text);
  };
  const { browserContextId } = await send('Target.createBrowserContext');
  fs.mkdirSync(evidence + '/downloads', { recursive: true });
  await send('Browser.setDownloadBehavior', {behavior:'allow',downloadPath:require('node:path').resolve(evidence + '/downloads'),browserContextId});
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  const evaluate = async (expression) => {
    const result = await call('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression, seconds = 30) => {
    for (let i = 0; i < seconds * 4; i++) {
      try {
        if (await evaluate(expression)) return;
      } catch {}
      await delay(250);
    }
    throw new Error('Timed out waiting for QA state');
  };
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Network.enable');
  await call('Page.navigate', { url: origin + '/login' });
  await waitFor('!!document.querySelector("#login-identifier")');
  await evaluate(
    `(()=>{const set=(id,value)=>{const el=document.getElementById(id);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};set('login-identifier',${JSON.stringify(credentials.identifier)});set('login-password',${JSON.stringify(credentials.password)});})()`,
  );
  credentials.password = '';
  await delay(500);
  await evaluate('document.querySelector("#login-submit-btn").click()');
  await waitFor(
    'location.pathname === "/workspace/doctor" || location.pathname === "/doctor/onboarding"',
  );
  await delay(1000);
  let session = await evaluate('JSON.parse(sessionStorage.getItem("wasla.auth.session"))');
  if (!session?.accessToken || session.user?.userType !== 'Doctor')
    throw new Error('No authenticated Doctor session');
  const api = async (path, method = 'GET', body, idempotencyKey) => {
    const headers = {
      Authorization: 'Bearer ' + session.accessToken,
      'Accept-Language': 'en',
      'Content-Type': 'application/json',
    };
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const response = await fetch(backend + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('json') ? await response.json() : null;
    const fileBytes = contentType && !contentType.includes('json')
      ? (await response.arrayBuffer()).byteLength
      : undefined;
    const result = {
      path: safePath(path),
      method,
      status: response.status,
      contentType,
      fileBytes,
      schema: data && typeof data === 'object' ? Object.keys(data).slice(0, 30) : [],
      count: Array.isArray(data) ? data.length : data?.totalCount,
      collections:
        data && typeof data === 'object'
          ? Object.fromEntries(
              Object.entries(data)
                .filter(([, value]) => Array.isArray(value))
                .map(([key, value]) => [key, value.length]),
            )
          : undefined,
    };
    result.itemSchema = Object.keys((Array.isArray(data) ? data : data?.items)?.[0] || {});
    calls.push(result);
    return { ...result, data };
  };
  console.log(
    JSON.stringify({
      authenticated: true,
      landing: await evaluate('location.pathname'),
      permissionCount: session.user.permissions.length,
    }),
  );
  const objects = {};
  const resolvePath = (path) =>
    path.replace(/\{(\w+)(?:\.(\w+))?\}/g, (_, key, field) => {
      const object = objects[key];
      if (!object) throw new Error('Required QA source is absent: ' + key);
      return field
        ? object[field]
        : object.id || object.patientId || object.prescriptionId || object.ticketId;
    });
  for await (const line of { [Symbol.asyncIterator]: () => lines }) {
    const command = JSON.parse(line);
    try {
      if (command.action === 'finish') break;
      if (command.action === 'api') {
        const path = resolvePath(command.path);
        const result = await api(path, command.method, command.body, command.idempotencyKey);
        if (command.store)
          objects[command.store] = command.first
            ? (result.data?.items || result.data || [])[command.index || 0]
            : result.data;
        const inspected = command.inspectStored ? objects[command.store] : result.data;
        const extra = command.inspect
          ? command.inspect.reduce((out, key) => ({ ...out, [key]: inspected?.[key] }), {})
          : {};
        console.log(JSON.stringify({ ...result, data: undefined, ...extra }));
      } else if (command.action === 'page') {
        await call('Page.navigate', { url: origin + resolvePath(command.path) });
        await delay(1800);
        console.log(
          JSON.stringify({
            page: command.path.split('?')[0],
            actual: await evaluate('location.pathname'),
            overflow: await evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
          }),
        );
      } else if (command.action === 'viewport') {
        await call('Emulation.setDeviceMetricsOverride', {width:command.width,height:900,deviceScaleFactor:1,mobile:false});
        console.log(JSON.stringify({viewport:command.width}));
      } else if (command.action === 'evaluate') {
        console.log(JSON.stringify({ result: await evaluate(command.expression) }));
      } else if (command.action === 'wait') {
        await waitFor(command.expression, command.seconds || 20);
        console.log(JSON.stringify({ waited: true }));
      } else if (command.action === 'screenshot') {
        const screenshot = await call('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(
          evidence + '/' + command.name + '.png',
          Buffer.from(screenshot.data, 'base64'),
        );
        console.log(JSON.stringify({ screenshot: command.name }));
      }
      fs.writeFileSync(
        evidence + '/calls-' + runId + '.json',
        JSON.stringify({ calls, errors }, null, 2),
      );
    } catch (error) {
      console.log(JSON.stringify({ qaError: error.message }));
    }
  }
  session = null;
  await send('Target.disposeBrowserContext', { browserContextId });
  ws.close();
  input.close();
}
main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
