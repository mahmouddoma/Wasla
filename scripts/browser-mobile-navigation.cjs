const assert = require('node:assert/strict'),
  fs = require('node:fs');
const origin = process.env.WASLA_ORIGIN || 'http://127.0.0.1:4201';
const debug = process.env.WASLA_DEBUG_ORIGIN || 'http://127.0.0.1:9244';
const grants = [
  'PracticeReservations.View',
  'PracticeReservations.Create',
  'PracticeTickets.View',
  'PracticePayments.View',
  'Patients.SearchBasic',
  'Patients.Register',
  'FamilyRelationshipRequests.CreateAssisted',
  'FamilyRelationshipRequests.ViewAssisted',
  'FamilyRelationshipRequests.ResubmitAssisted',
];
const practice = {
  id: 'c1',
  nameAr: 'عيادة اختبار باسم طويل',
  nameEn: 'Synthetic clinic with a long name',
  isActive: true,
  permissionCodes: grants,
};
let user = {
  applicationUserId: 'synthetic-user',
  userName: 'Synthetic receptionist',
  email: 'reception.with.a.long.email@example.invalid',
  phoneNumber: '01012345678',
  userType: 'Reception',
  roles: ['Reception'],
  permissions: grants,
  isFirstLogin: false,
  doctorId: null,
  patientId: null,
};
async function main() {
  const version = await fetch(debug + '/json/version').then((r) => r.json());
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let sequence = 0;
  const pending = new Map();
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  socket.onmessage = async (event) => {
    const m = JSON.parse(event.data);
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(m.error) : p.resolve(m.result);
    }
    if (m.method === 'Fetch.requestPaused') {
      const { requestId, request } = m.params;
      const path = new URL(request.url).pathname;
      let data = [];
      if (path.endsWith('/auth/me')) data = user;
      else if (path.endsWith('/reception/practices')) data = [practice];
      else if (path.endsWith('/doctors'))
        data = { items: [], totalCount: 0, pageNumber: 1, pageSize: 20 };
      await send(
        'Fetch.fulfillRequest',
        {
          requestId,
          responseCode: 200,
          responseHeaders: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Access-Control-Allow-Origin', value: origin },
            {
              name: 'Access-Control-Allow-Headers',
              value: 'authorization,content-type,accept-language',
            },
            { name: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
          ],
          body: Buffer.from(JSON.stringify(data)).toString('base64'),
        },
        m.sessionId,
      );
    }
  };
  const results = [];
  fs.mkdirSync('.tmp/mobile-navigation', { recursive: true });
  const permissions = [
    'DoctorPracticeReservations.ViewOwn',
    'MedicalEncounters.ViewOwn',
    'MedicalEncounters.ViewOwnCompleted',
    'Tickets.ViewOwn',
    'Doctors.ViewAll',
    'Roles.View',
    'DoctorSpecializationRequests.ViewAll',
    'PlatformRevenue.ViewAggregates',
    'Reservations.ViewAdministrative',
    ...grants,
  ];
  const cases = [
    {
      role: 'Doctor',
      route: 'workspace/doctor',
      expected: [
        '/workspace/doctor',
        '/doctor/reservations',
        '/doctor/queue',
        '/doctor/encounters',
      ],
    },
    {
      role: 'Patient',
      route: 'workspace/patient',
      expected: ['/workspace/patient', '/patient/reservations', '/doctors', '/patient/tickets'],
    },
    {
      role: 'Reception',
      route: 'workspace/reception',
      expected: [
        '/workspace/reception',
        '/reception/reservations',
        '/reception/queue',
        '/reception/patients',
      ],
    },
    {
      role: 'SuperAdmin',
      route: 'admin/doctors',
      expected: [
        '/admin/doctors',
        '/admin/reservations',
        '/admin/doctor-specialization-requests',
        '/admin/revenue',
      ],
    },
  ];
  try {
    for (const scenario of cases)
      for (const lang of ['ar', 'en']) {
        user = {
          ...user,
          userType: scenario.role,
          roles: [scenario.role],
          permissions,
          doctorId: scenario.role === 'Doctor' ? 'doc-1' : null,
          patientId: scenario.role === 'Patient' ? 'patient-1' : null,
        };
        const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
        const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
        const call = (method, params) => send(method, params, sessionId);
        const evaluate = async (expression) => {
          const r = await call('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true,
          });
          if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
          return r.result.value;
        };
        await call('Page.enable');
        await call('Fetch.enable', {
          patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }],
        });
        await call('Page.addScriptToEvaluateOnNewDocument', {
          source:
            'sessionStorage.setItem("wasla.auth.session",' +
            JSON.stringify(
              JSON.stringify({
                accessToken: 'synthetic-not-a-real-token',
                expiresOnUtc: '2099-01-01T00:00:00Z',
                passwordChangeRequired: false,
                user,
              }),
            ) +
            ');localStorage.setItem("wasla_lang",' +
            JSON.stringify(lang) +
            ');localStorage.setItem("wasla_sidebar_collapsed","true");localStorage.setItem("wasla_portal_sidebar_collapsed","true");',
        });
        await call('Emulation.setDeviceMetricsOverride', {
          width: 390,
          height: 900,
          deviceScaleFactor: 1,
          mobile: true,
        });
        await call('Page.navigate', { url: origin + '/' + scenario.route });
        for (let i = 0; i < 150; i++) {
          if (await evaluate('!!document.querySelector("app-mobile-navigation a")')) break;
          await new Promise((r) => setTimeout(r, 100));
        }
        const routes = await evaluate(
          '[...document.querySelectorAll("app-mobile-navigation a")].map(a=>a.getAttribute("href"))',
        );
        assert.deepEqual(routes, scenario.expected, scenario.role + ' routes');
        for (const width of [320, 390, 600, 820, 1280]) {
          await call('Emulation.setDeviceMetricsOverride', {
            width,
            height: 900,
            deviceScaleFactor: 1,
            mobile: width < 600,
          });
          await evaluate('document.fonts.ready');
          await new Promise((r) => setTimeout(r, 200));
          const metrics = await evaluate(
            '(()=>{const host=document.querySelector("app-mobile-navigation"),nav=host.querySelector("nav"),r=host.getBoundingClientRect();return {display:getComputedStyle(host).display,left:r.left,right:r.right,bottom:r.bottom,items:[...nav.children].map(e=>{const b=e.getBoundingClientRect();return {height:b.height,left:b.left,right:b.right,text:e.textContent.trim(),scroll:e.scrollWidth,width:e.clientWidth}})}})()',
          );
          const header = await evaluate(
            '(()=>{const h=document.querySelector("app-header"),row=h.querySelector(".header-row"),r=row.getBoundingClientRect(),b=h.querySelector(".header-brand").getBoundingClientRect(),a=h.querySelector(".header-actions").getBoundingClientRect();return {count:document.querySelectorAll("app-header").length,height:r.height,scroll:row.scrollWidth,width:row.clientWidth,brandCenter:b.left+b.width/2,actionsCenter:a.left+a.width/2,menu:getComputedStyle(h.querySelector(".btn-mobile-menu")).display,logout:getComputedStyle(h.querySelector(".btn-topbar-logout")).display}})()',
          );
          assert.equal(header.count, 1);
          assert.notEqual(
            await evaluate(
              'getComputedStyle(document.querySelector("app-header .avatar-ring")).backgroundImage',
            ),
            'none',
            'account avatar must retain its theme background',
          );
          assert.ok(header.scroll <= header.width, JSON.stringify(header));
          assert.equal(header.height, width < 992 ? 60 : 64);
          assert.equal(header.logout, 'flex');
          assert.ok(
            lang === 'ar'
              ? header.brandCenter > header.actionsCenter
              : header.brandCenter < header.actionsCenter,
          );
          if (width < 992) assert.equal(header.menu, 'flex');
          await evaluate('document.querySelector("app-header .btn-user-avatar-trigger").click()');
          await new Promise((r) => setTimeout(r, 100));
          const popover = await evaluate(
            '(()=>{const r=document.querySelector("app-header [role=dialog]").getBoundingClientRect();return {left:r.left,right:r.right}})()',
          );
          assert.ok(popover.left >= -1 && popover.right <= width + 1, JSON.stringify(popover));
          await call('Input.dispatchKeyEvent', {
            type: 'keyDown',
            key: 'Escape',
            code: 'Escape',
            windowsVirtualKeyCode: 27,
          });
          await new Promise((r) => setTimeout(r, 100));
          assert.equal(
            await evaluate('!!document.querySelector("app-header [role=dialog]")'),
            false,
          );
          if (width < 768) {
            assert.equal(metrics.display, 'block');
            assert.ok(
              metrics.left >= -1 && metrics.right <= width + 1 && metrics.bottom <= 901,
              JSON.stringify(metrics),
            );
            assert.ok(
              metrics.items.every(
                (i) =>
                  i.height >= 44 &&
                  i.left >= -1 &&
                  i.right <= width + 1 &&
                  i.scroll <= i.width &&
                  i.text.length &&
                  !i.text.includes('navigation.'),
              ),
              JSON.stringify(metrics),
            );
            await evaluate('document.querySelector("app-mobile-navigation button").click()');
            await new Promise((r) => setTimeout(r, 300));
            const drawer = await evaluate(
              '(()=>{const button=document.querySelector("app-mobile-navigation button"),aside=document.getElementById(button.getAttribute("aria-controls"));return {expanded:button.getAttribute("aria-expanded"),open:aside.classList.contains("open"),collapsed:aside.classList.contains("collapsed")}})()',
            );
            assert.deepEqual(drawer, { expanded: 'true', open: true, collapsed: false });
            await call('Input.dispatchKeyEvent', {
              type: 'keyDown',
              key: 'Escape',
              code: 'Escape',
              windowsVirtualKeyCode: 27,
            });
            await new Promise((r) => setTimeout(r, 150));
            assert.equal(
              await evaluate(
                'document.querySelector("app-mobile-navigation button").getAttribute("aria-expanded")',
              ),
              'false',
            );
          } else assert.equal(metrics.display, 'none');
          if (width === 390) {
            const shot = await call('Page.captureScreenshot', {
              format: 'png',
              captureBeyondViewport: false,
            });
            fs.writeFileSync(
              '.tmp/mobile-navigation/' + scenario.role + '-' + lang + '.png',
              Buffer.from(shot.data, 'base64'),
            );
          }
          results.push({ role: scenario.role, lang, width, ...metrics });
        }
        await send('Target.closeTarget', { targetId });
      }
    fs.writeFileSync('.tmp/mobile-navigation/results.json', JSON.stringify(results, null, 2));
    console.log(
      'PASS: ' +
        results.length +
        ' role/language/viewport cases, permitted shortcuts, shared header, drawer, account popover and Escape verified.',
    );
  } finally {
    socket.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
