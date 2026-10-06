const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.WASLA_ORIGIN || 'http://127.0.0.1:4201';
const debug = process.env.WASLA_DEBUG_ORIGIN || 'http://127.0.0.1:9244';
const doctor = {
  doctorId: 'd1',
  nameAr: 'طبيب اختبار باسم طويل',
  nameEn: 'Synthetic doctor with a long name',
  email: 'doctor.with.a.long.email.address@example.invalid',
  phone: '01012345678',
  age: 40,
  gender: 'Male',
  approvalStatus: 'Approved',
  hasProfileImage: true,
  hasPersonalIdFront: true,
  hasPersonalIdBack: true,
  hasSyndicateFront: true,
  hasSyndicateBack: true,
  createdOnUtc: '2026-10-01T09:00:00Z',
};
const admin = {
  superAdminId: 's1',
  applicationUserId: 'u1',
  userName: 'synthetic.admin',
  email: 'admin.with.a.long.email.address@example.invalid',
  phoneNumber: '01012345678',
  nameAr: 'مشرف اختبار باسم طويل',
  nameEn: 'Synthetic administrator with a long name',
  isRootSuperAdmin: false,
  isActive: true,
  isDeleted: false,
  createdOnUtc: '2026-10-01T09:00:00Z',
};
const reservation = {
  reservationId: 'r1',
  reference: 'SYNTHETIC-R-100',
  status: 'Confirmed',
  isLate: false,
  patient: { id: 'p1', nameAr: 'مريض اختبار', nameEn: 'Synthetic patient' },
  practice: { id: 'c1', nameAr: 'عيادة اختبار', nameEn: 'Synthetic clinic' },
  doctor: { id: 'd1', nameAr: doctor.nameAr, nameEn: doctor.nameEn },
  doctorPracticeId: 'c1',
  appointment: { businessDate: '2026-10-06', slotStartTime: '17:00' },
  capabilities: {},
  timeline: [],
  rowVersion: 'v1',
};
const metadata = {
  statuses: [{ code: 'Confirmed', nameAr: 'مؤكد', nameEn: 'Confirmed' }],
  bookingSources: [],
  patientCancellationReasons: [],
  providerCancellationReasons: [],
  maximumAdvanceBookingDays: 30,
  maxPatientReschedulesPerReservation: 2,
};
const user = {
  applicationUserId: 'synthetic-user',
  userName: 'Synthetic admin',
  email: 'synthetic@example.invalid',
  phoneNumber: null,
  userType: 'SuperAdmin',
  roles: ['SuperAdmin'],
  permissions: [
    'Doctors.ViewAll',
    'Doctors.ViewDetails',
    'SuperAdmins.ViewAll',
    'SuperAdmins.ViewDetails',
    'Reservations.ViewAdministrative',
  ],
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
      else if (path.endsWith('/metadata')) data = metadata;
      else if (path.endsWith('/filter-options'))
        data = { statuses: metadata.statuses, bookingSources: [], segments: [] };
      else if (path.endsWith('/admin/doctors'))
        data = { items: [doctor], totalCount: 1, pageNumber: 1, pageSize: 10 };
      else if (path.endsWith('/admin/superadmins'))
        data = { items: [admin], totalCount: 1, pageNumber: 1, pageSize: 10 };
      else if (path.endsWith('/reservations'))
        data = {
          items: [reservation],
          totalCount: 1,
          pageNumber: 1,
          pageSize: 20,
          summary: { Confirmed: 1 },
        };
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
  fs.mkdirSync('.tmp/responsive', { recursive: true });
  try {
    for (const route of ['doctors', 'superadmins', 'reservations'].filter(
      (route) => !process.env.WASLA_ROUTES || process.env.WASLA_ROUTES.split(',').includes(route),
    ))
      for (const lang of ['ar', 'en']) {
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
        const selector = {
          doctors: '.doctor-row-enterprise',
          superadmins: '.admin-data-row',
          reservations: 'tr.table-row',
        }[route];
        await call('Page.enable');
        await call('Fetch.enable', {
          patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }],
        });
        await call('Page.addScriptToEvaluateOnNewDocument', {
          source: `sessionStorage.setItem('wasla.auth.session',${JSON.stringify(JSON.stringify({ accessToken: 'synthetic-not-a-real-token', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});localStorage.setItem('wasla_lang','${lang}');`,
        });
        await call('Page.navigate', { url: origin + '/admin/' + route });
        for (let i = 0; i < 150; i++) {
          if (await evaluate(`!!document.querySelector('${selector}')`)) break;
          await new Promise((r) => setTimeout(r, 100));
        }
        assert.ok(
          await evaluate(`!!document.querySelector('${selector}')`),
          route + ' did not load',
        );
        for (const width of [320, 390, 600, 768, 820, 1024, 1280, 1440]) {
          await call('Emulation.setDeviceMetricsOverride', {
            width,
            height: 900,
            deviceScaleFactor: 1,
            mobile: false,
          });
          await evaluate('document.fonts.ready');
          await new Promise((r) => setTimeout(r, 450));
          const metrics = await evaluate(
            `(()=>{const row=document.querySelector('${selector}'),r=row.getBoundingClientRect();const clipped=[...row.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect();return s.display!=='none'&&b.width>0&&(b.left<r.left-1||b.right>r.right+1)}).map(e=>e.className);return {width:innerWidth,scroll:document.documentElement.scrollWidth,rowLeft:r.left,rowRight:r.right,clipped,columns:getComputedStyle(row).gridTemplateColumns,filterColumns:getComputedStyle(document.querySelector('.filters-grid')||row).gridTemplateColumns,labels:[...row.querySelectorAll('.mobile-cell-label')].map(e=>({text:e.textContent.trim(),visible:getComputedStyle(e).display!=='none'})),phone:document.querySelector('.contact-phone-text')?.getBoundingClientRect().width}})()`,
          );
          assert.ok(metrics.scroll <= width, JSON.stringify({ route, lang, ...metrics }));
          assert.ok(
            metrics.rowLeft >= -1 && metrics.rowRight <= width + 1,
            JSON.stringify({ route, lang, ...metrics }),
          );
          assert.deepEqual(metrics.clipped, [], JSON.stringify({ route, lang, ...metrics }));
          if (route === 'doctors') assert.ok(metrics.phone > 0, 'phone number hidden');
          if (route === 'reservations' && width <= 1024)
            assert.ok(
              metrics.labels.every((l) => l.visible && l.text.length),
              'mobile labels hidden',
            );
          results.push({ route, lang, ...metrics });
          if ([390, 820, 1440].includes(width)) {
            const shot = await call('Page.captureScreenshot', {
              format: 'png',
              captureBeyondViewport: false,
            });
            fs.writeFileSync(
              `.tmp/responsive/${route}-${lang}-${width}.png`,
              Buffer.from(shot.data, 'base64'),
            );
          }
        }
        await send('Target.closeTarget', { targetId });
      }
    fs.writeFileSync('.tmp/responsive/results.json', JSON.stringify(results, null, 2));
    console.log(
      `PASS: ${results.length} responsive cases; no page overflow, row clipping, or hidden phone numbers.`,
    );
  } finally {
    socket.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
