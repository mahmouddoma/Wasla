const assert = require('node:assert/strict'),
  fs = require('node:fs');
const origin = process.env.WASLA_ORIGIN || 'http://127.0.0.1:4201';
const debug = process.env.WASLA_DEBUG_ORIGIN || 'http://127.0.0.1:9244';
const grants = [
  'PracticeReservations.View',
  'PracticeReservations.Create',
  'PracticeTickets.View',
  'PracticeTickets.CallNext',
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
const user = {
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
const metadata = {
  statuses: [{ code: 'Confirmed', nameAr: 'مؤكد', nameEn: 'Confirmed' }],
  bookingSources: [],
  patientCancellationReasons: [],
  providerCancellationReasons: [],
  maximumAdvanceBookingDays: 30,
  maxPatientReschedulesPerReservation: 2,
};
const reservation = {
  reservationId: 'r1',
  reference: 'SYNTHETIC-R-100',
  status: 'Confirmed',
  isLate: false,
  patient: { id: 'p1', nameAr: 'مريض اختبار', nameEn: 'Synthetic patient' },
  practice,
  doctor: { id: 'd1', nameAr: 'طبيب اختبار', nameEn: 'Synthetic doctor' },
  doctorPracticeId: 'c1',
  appointment: { businessDate: '2026-10-06', slotStartTime: '17:00' },
  capabilities: {},
  timeline: [],
  rowVersion: 'v1',
};
const ticket = {
  ticketId: 't1',
  ticketNumber: '001',
  status: 'Waiting',
  source: 'WalkIn',
  practice,
  doctor: reservation.doctor,
  patient: reservation.patient,
  businessDate: '2026-10-06',
  lastUpdatedOnUtc: '2026-10-06T09:00:00Z',
  patientsAheadNow: 0,
  fastTrack: false,
  callAttempts: [],
  rowVersion: 'v1',
};
const transaction = {
  transactionId: 'tx1',
  transactionNumber: 'SYNTHETIC-TX-100',
  transactionType: 'Payment',
  patientId: 'p1',
  patientNameAr: 'مريض اختبار',
  patientNameEn: 'Synthetic patient',
  doctorPracticeId: 'c1',
  practiceNameAr: practice.nameAr,
  practiceNameEn: practice.nameEn,
  amount: 300,
  currencyCode: 'EGP',
  method: 'Cash',
  businessDate: '2026-10-06',
  occurredOnUtc: '2026-10-06T09:00:00Z',
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
      else if (path.endsWith('/reception/practices')) data = [practice];
      else if (path.endsWith('/queue'))
        data = { inProgress: null, called: null, waiting: [ticket], noShow: [] };
      else if (path.endsWith('/financial-transactions'))
        data = { items: [transaction], totalCount: 1, pageNumber: 1, pageSize: 20 };
      else if (path.endsWith('/assisted'))
        data = { items: [], totalCount: 0, pageNumber: 1, pageSize: 20 };
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
  fs.mkdirSync('.tmp/reception-responsive', { recursive: true });
  try {
    for (const route of [
      'workspace/reception',
      'reception/patients',
      'reception/family-requests',
      'reception/reservations',
      'reception/queue',
      'reception/finance',
    ])
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
          'workspace/reception': '.workspace-content',
          'reception/patients': '.patients-workspace-grid',
          'reception/family-requests': '.requests-workspace-grid',
          'reception/reservations': 'tr.table-row',
          'reception/queue': '.queue-shell',
          'reception/finance': '.clickable-table-row',
        }[route];
        await call('Page.enable');
        await call('Fetch.enable', {
          patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }],
        });
        await call('Page.addScriptToEvaluateOnNewDocument', {
          source: `sessionStorage.setItem('wasla.auth.session',${JSON.stringify(JSON.stringify({ accessToken: 'synthetic-not-a-real-token', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});localStorage.setItem('wasla_lang','${lang}');`,
        });
        await call('Page.navigate', { url: origin + '/' + route });
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
            mobile: width < 600,
          });
          await evaluate('document.fonts.ready');
          if (route === 'reception/patients' && width < 1200) {
            await evaluate(
              "document.querySelectorAll('.patient-panel-switcher button')[1].click()",
            );
          }
          await new Promise((r) => setTimeout(r, 450));
          const metrics = await evaluate(
            `(()=>{const row=document.querySelector('${selector}'),r=row.getBoundingClientRect();const clipped=[...row.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect();return s.display!=='none'&&b.width>0&&(b.left<r.left-1||b.right>r.right+1)}).map(e=>e.className);return {width:innerWidth,scroll:document.documentElement.scrollWidth,rowLeft:r.left,rowRight:r.right,clipped,columns:getComputedStyle(row).gridTemplateColumns,filterColumns:getComputedStyle(document.querySelector('.filters-grid')||row).gridTemplateColumns,labels:[...row.querySelectorAll('.mobile-cell-label')].map(e=>({text:e.textContent.trim(),visible:getComputedStyle(e).display!=='none'})),phone:document.querySelector('.contact-phone-text')?.getBoundingClientRect().width}})()`,
          );
          assert.ok(metrics.scroll <= width, JSON.stringify({ route, lang, ...metrics }));
          assert.ok(
            metrics.rowLeft >= -1 && metrics.rowRight <= width + 1,
            JSON.stringify({ route, lang, ...metrics }),
          );
          if (route === 'reception/finance' || route === 'reception/reservations')
            assert.deepEqual(metrics.clipped, [], JSON.stringify({ route, lang, ...metrics }));
          assert.equal(await evaluate("document.querySelector('#reception-current-practice').value"), 'c1', 'clinic selection missing');
          if (width < 768) {
            const nav = await evaluate(
              "(()=>{const n=document.querySelector('.reception-mobile-nav');const r=n.getBoundingClientRect();return {display:getComputedStyle(n).display,bottom:r.bottom,links:n.querySelectorAll('a').length}})()",
            );
            assert.equal(nav.links, 4);
            assert.ok(nav.bottom <= 900 && nav.display === 'flex', JSON.stringify(nav));
          }

          if (route === 'reception/reservations' && width <= 1024)
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
              `.tmp/reception-responsive/${route.replaceAll('/', '-')}-${lang}-${width}.png`,
              Buffer.from(shot.data, 'base64'),
            );
          }
        }
        await send('Target.closeTarget', { targetId });
      }
    fs.writeFileSync('.tmp/reception-responsive/results.json', JSON.stringify(results, null, 2));
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
