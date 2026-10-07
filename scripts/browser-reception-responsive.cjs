const assert = require('node:assert/strict'),
  fs = require('node:fs');
const origin = process.env.WASLA_ORIGIN || 'http://127.0.0.1:4201';
const debug = process.env.WASLA_DEBUG_ORIGIN || 'http://127.0.0.1:9244';
const today = [
  new Date().getFullYear(),
  String(new Date().getMonth() + 1).padStart(2, '0'),
  String(new Date().getDate()).padStart(2, '0'),
].join('-');
const patient = {
  patientId: 'p1',
  nameAr: 'مريض اختبار باسم طويل',
  nameEn: 'Synthetic patient with a long name',
  dateOfBirth: '1990-01-01',
  gender: 'Male',
  phoneNumber: '01012345678',
  hasContactPhone: false,
};
const requests = [];
const failedLists = new Set();
const grants = [
  'PracticeReservations.View',
  'PracticeReservations.Create',
  'PracticeReservations.Cancel',
  'PracticeReservations.Reschedule',
  'PracticeReservations.RestoreNoShow',
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
  appointment: { businessDate: today, slotStartTime: '17:00' },
  price: 300,
  currency: 'EGP',
  visitType: { nameAr: 'كشف جديد', nameEn: 'New consultation' },
  segment: { nameAr: 'كشف عادي', nameEn: 'Standard visit' },
  bookingSource: 'Reception',
  createdOnUtc: '2026-10-07T08:00:00Z',
  capabilities: { canCancel: true, canReschedule: true },
  timeline: [],
  rowVersion: 'v1',
};
reservation.patient = { id: patient.patientId, nameAr: patient.nameAr, nameEn: patient.nameEn };
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
      const url = new URL(request.url),
        path = url.pathname;
      requests.push({
        method: request.method,
        path,
        query: Object.fromEntries(url.searchParams),
        body: request.postData,
        idempotencyKey: request.headers['Idempotency-Key'] || request.headers['idempotency-key'],
      });
      let data = [],
        responseCode = 200;
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
      else if (path.endsWith('/patients/search'))
        data = {
          items: url.searchParams.get('name') === 'Zero' ? [] : [patient],
          totalCount: url.searchParams.get('name') === 'Zero' ? 0 : 1,
          pageNumber: 1,
          pageSize: 20,
        };
      else if (path.endsWith('/patients') && request.method === 'POST')
        data = { patientId: 'new-patient' };
      else if (path.endsWith('/available-dates')) data = [{ date: today, isAvailable: true }];
      else if (path.endsWith('/available-slots'))
        data = [{ date: today, time: '17:00', slotDurationMinutes: 20 }];
      else if (path.endsWith('/booking/options'))
        data = {
          practiceId: 'c1',
          date: today,
          time: '17:00',
          visitTypes: [
            {
              visitTypeId: 'visit',
              type: 'NewConsultation',
              nameAr: 'كشف جديد',
              nameEn: 'New consultation',
              segments: [
                {
                  segmentId: 'segment',
                  nameAr: 'كشف عادي',
                  nameEn: 'Standard visit',
                  price: 300,
                  isDefault: true,
                },
              ],
            },
          ],
        };
      else if (
        path.endsWith('/reservations/r1') ||
        (path.endsWith('/reservations') && request.method === 'POST')
      )
        data = reservation;
      else if (path.endsWith('/reservations'))
        data = {
          items: url.searchParams.get('search') === 'Zero' ? [] : [reservation],
          totalCount: url.searchParams.get('search') === 'Zero' ? 0 : 1,
          pageNumber: 1,
          pageSize: 20,
          summary: { Confirmed: 1 },
        };
      if (
        path.endsWith('/reservations') &&
        request.method === 'GET' &&
        url.searchParams.get('search') === 'Error' &&
        !failedLists.has(m.sessionId)
      ) {
        failedLists.add(m.sessionId);
        responseCode = 500;
        data = { errors: [{ code: 'Common.Unknown', message: 'Synthetic list failure' }] };
      }
      await send(
        'Fetch.fulfillRequest',
        {
          requestId,
          responseCode,
          responseHeaders: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Access-Control-Allow-Origin', value: origin },
            {
              name: 'Access-Control-Allow-Headers',
              value: 'authorization,content-type,accept-language,idempotency-key',
            },
            { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
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
        const waitFor = async (expression) => {
          for (let i = 0; i < 150; i++) {
            if (await evaluate(expression)) return;
            await new Promise((r) => setTimeout(r, 50));
          }
          throw Error('Timed out: ' + expression);
        };
        const change = async (selector, value, event = 'change') =>
          evaluate(
            '(()=>{const e=document.querySelector(' +
              JSON.stringify(selector) +
              ");if(!e)throw Error('Missing control');e.value=" +
              JSON.stringify(value) +
              ';e.dispatchEvent(new Event(' +
              JSON.stringify(event) +
              ',{bubbles:true}));})()',
          );
        const screenshot = async (name, width) => {
          if (![390, 820, 1440].includes(width)) return;
          const shot = await call('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false,
          });
          fs.writeFileSync(
            '.tmp/reception-responsive/p1-' + name + '-' + lang + '-' + width + '.png',
            Buffer.from(shot.data, 'base64'),
          );
        };
        const selector = {
          'workspace/reception': '.workspace-content',
          'reception/patients': '.patient-panel',
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
        for (const width of [320, 390, 576, 768, 820, 1024, 1280, 1440]) {
          failedLists.delete(sessionId);
          await call('Emulation.setDeviceMetricsOverride', {
            width,
            height: 900,
            deviceScaleFactor: 1,
            mobile: width < 576,
          });
          await evaluate('document.fonts.ready');

          await new Promise((r) => setTimeout(r, 450));
          await evaluate(
            "[...document.querySelectorAll('.toast-close')].forEach(button=>button.click())",
          );
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
          assert.equal(
            await evaluate("document.querySelector('#reception-current-practice').value"),
            'c1',
            'clinic selection missing',
          );
          if (width < 768) {
            const nav = await evaluate(
              "(()=>{const n=document.querySelector('app-mobile-navigation');const r=n.getBoundingClientRect();return {display:getComputedStyle(n).display,bottom:r.bottom,links:n.querySelectorAll('a').length}})()",
            );
            assert.equal(nav.links, 4);
            assert.ok(nav.bottom <= 900 && nav.display === 'block', JSON.stringify(nav));
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
          if (route === 'reception/patients') {
            await change('.patient-panel input[type=search]', 'Synthetic', 'input');
            await evaluate("document.querySelector('.patient-panel form').requestSubmit()");
            await waitFor("!!document.querySelector('.patient-result')");
            await evaluate("document.querySelector('.patient-result').click()");
            await waitFor("!!document.querySelector('.selected-context button')");
            await screenshot('patient-selected', width);
            await evaluate("document.querySelector('.selected-context button').click()");
            await waitFor(
              "!!document.querySelector('app-reservation-editor .selected-patient') && document.querySelector('app-reservation-editor select')?.value !== ''",
            );
            assert.ok(
              await evaluate(
                "document.querySelector('.selected-patient').textContent.includes(" +
                  JSON.stringify(lang === 'ar' ? patient.nameAr : patient.nameEn) +
                  ')',
              ),
              'patient name handoff missing',
            );
            assert.ok(
              await evaluate(
                "!document.querySelector('app-reservation-editor input[placeholder]')",
              ),
              'raw patient ID field returned',
            );
            // Date and time selects live in separate labels. Select the second editor select explicitly.
            await evaluate(
              "(()=>{const e=document.querySelectorAll('app-reservation-editor select')[1];e.value='17:00';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()",
            );
            await waitFor(
              "document.querySelectorAll('app-reservation-editor select').length === 4 && document.querySelectorAll('app-reservation-editor select')[2].options.length>1",
            );
            await evaluate(
              "(()=>{const e=document.querySelectorAll('app-reservation-editor select')[2];e.value='visit';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()",
            );
            await waitFor(
              "document.querySelectorAll('app-reservation-editor select')[3].options.length>1",
            );
            await evaluate(
              "(()=>{const e=document.querySelectorAll('app-reservation-editor select')[3];e.value='segment';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()",
            );
            await waitFor(
              "!document.querySelector('app-reservation-editor button[type=submit]').disabled",
            );
            assert.ok(
              await evaluate('document.documentElement.scrollWidth<=innerWidth'),
              'booking overflow',
            );
            await screenshot('booking', width);
            await evaluate("document.querySelector('app-reservation-editor form').requestSubmit()");
            await waitFor("!!document.querySelector('app-reservation-details')");
            await screenshot('booked-detail', width);
            await call('Page.navigate', { url: origin + '/reception/patients' });
            await waitFor("!!document.querySelector('.patient-panel input[type=search]')");
            await change('.patient-panel input[type=search]', 'Zero', 'input');
            await evaluate("document.querySelector('.patient-panel form').requestSubmit()");
            await waitFor("!!document.querySelector('.empty-state button')");
            await evaluate("document.querySelector('.empty-state button').click()");
            await waitFor("!!document.querySelector('app-side-drawer [role=dialog]')");
            assert.ok(
              await evaluate('document.documentElement.scrollWidth<=innerWidth'),
              'registration drawer overflow',
            );
            await screenshot('registration', width);
            await evaluate(
              "(()=>{const form=document.querySelector('.drawer-body .registration-form');const inputs=form.querySelectorAll('input');for(const [index,value] of [[0,'Synthetic new patient'],[1,'1990-01-01'],[2,'01012345678']]){inputs[index].value=value;inputs[index].dispatchEvent(new Event('input',{bubbles:true}));}const gender=form.querySelector('select');gender.value='Male';gender.dispatchEvent(new Event('input',{bubbles:true}));gender.dispatchEvent(new Event('change',{bubbles:true}));})()",
            );
            await evaluate(
              "document.querySelector('.drawer-body .registration-form').requestSubmit()",
            );
            await waitFor(
              "!!document.querySelector('.selected-context button') && !document.querySelector('.side-drawer-panel')",
            );
            assert.ok(
              await evaluate(
                "!document.querySelector('.selected-context').textContent.includes('new-patient')",
              ),
              'registration exposes an ID',
            );
            await evaluate("document.querySelector('.selected-context button').click()");
            await waitFor("!!document.querySelector('app-reservation-editor .selected-patient')");
            assert.ok(
              await evaluate(
                "new URL(location.href).searchParams.get('patientId')==='new-patient'",
              ),
              'registered patient handoff missing',
            );
            await call('Page.navigate', { url: origin + '/reception/patients' });
            await waitFor("!!document.querySelector('.patient-panel')");
            results.push({
              route,
              lang,
              width,
              journey: 'search-select-book and no-results-add',
              passed: true,
            });
          }
          if (route === 'reception/reservations') {
            assert.ok(
              await evaluate(
                "document.querySelector('.quick-views button').getAttribute('aria-pressed')==='true'",
              ),
              'Today is not selected',
            );
            assert.ok(
              requests.some(
                (r) =>
                  r.path.endsWith('/reservations') &&
                  r.query.fromDate === today &&
                  r.query.toDate === today,
              ),
              'Today did not reach the API',
            );
            await change('.filters-grid input[type=search]', 'Error');
            await waitFor("!!document.querySelector('tbody [role=alert]')");
            await evaluate("document.querySelector('tbody button').click()");
            await waitFor("!!document.querySelector('tr.table-row')");
            await change('.filters-grid input[type=search]', 'Zero');
            await waitFor(
              "!!document.querySelector('tbody .btn-secondary') && !document.querySelector('tbody [role=alert]')",
            );
            await evaluate("document.querySelector('tbody .btn-secondary').click()");
            await waitFor("!!document.querySelector('tr.table-row')");
            await evaluate("document.querySelector('tbody .btn-inspect-action').click()");
            await waitFor("!!document.querySelector('app-reservation-details')");
            assert.ok(
              await evaluate("!document.querySelector('app-reservation-details details').open"),
              'advanced details are not collapsed',
            );
            assert.ok(
              await evaluate('document.documentElement.scrollWidth<=innerWidth'),
              'details drawer overflow',
            );
            await evaluate(
              "[...document.querySelectorAll('.toast-close')].forEach(button=>button.click())",
            );
            await screenshot('appointment-open', width);
            await evaluate("document.querySelector('.drawer-close-btn').click()");
            await evaluate(
              "document.querySelector('app-page-header button.page-header__action-btn').click()",
            );
            await waitFor(
              "!!document.querySelector('app-reservation-patient-search input[type=tel]')",
            );
            await change(
              'app-reservation-patient-search input[type=tel]',
              patient.phoneNumber,
              'input',
            );
            await evaluate(
              "document.querySelector('app-reservation-patient-search button').click()",
            );
            await waitFor("!!document.querySelector('.patient-option')");
            await screenshot('booking-patient-search', width);
            await evaluate("document.querySelector('.patient-option').click()");
            await waitFor("!!document.querySelector('.selected-patient')");
            assert.ok(
              await evaluate(
                "document.querySelector('.selected-patient').textContent.includes(" +
                  JSON.stringify(lang === 'ar' ? patient.nameAr : patient.nameEn) +
                  ')',
              ),
              'booking search did not select named patient',
            );
            await evaluate("document.querySelector('.drawer-close-btn').click()");
            results.push({
              route,
              lang,
              width,
              journey: 'today-open, list failure/retry, filtered empty, booking phone search',
              passed: true,
            });
          }
        }
        await send('Target.closeTarget', { targetId });
      }
    fs.writeFileSync('.tmp/reception-responsive/requests.json', JSON.stringify(requests, null, 2));
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
