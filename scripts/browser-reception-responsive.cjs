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
const queueStates = new Map();
const walkInFailures = new Set();
const searchFailures = new Set();
const browserModes = new Map();
const heldRequests = new Map();
const grants = [
  'PracticeReservations.View',
  'PracticeReservations.Create',
  'PracticeReservations.Cancel',
  'PracticeReservations.Reschedule',
  'PracticeReservations.RestoreNoShow',
  'PracticeTickets.View',
  'PracticeTickets.Call',
  'PracticeTickets.CheckIn',
  'PracticeTickets.ForceCheckIn',
  'PracticeTickets.RecordPayment',
  'PracticeTickets.CreateWalkIn',
  'PracticeTickets.ManualCall',
  'PracticeTickets.Cancel',
  'PracticeTickets.RestoreNoShow',
  'PracticePayments.View',
  'PracticePayments.Refund',
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
  statuses: [{ code: 'Active', nameAr: 'محجوز', nameEn: 'Booked' }],
  bookingSources: [],
  patientCancellationReasons: [],
  providerCancellationReasons: [],
  maximumAdvanceBookingDays: 30,
  maxPatientReschedulesPerReservation: 2,
};
const reservation = {
  reservationId: 'r1',
  reference: 'SYNTHETIC-R-100',
  status: 'Active',
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
  const createdTargets = new Set();
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      const timeout = setTimeout(() => {
        if (pending.delete(id)) reject(Error('CDP timeout: ' + method));
      }, 30000);
      timeout.unref();
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  socket.onmessage = async (event) => {
    const m = JSON.parse(event.data);
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (p) m.error ? p.reject(m.error) : p.resolve(m.result);
    }
    if (m.method === 'Fetch.requestPaused') {
      const { requestId, request } = m.params;
      const url = new URL(request.url),
        path = url.pathname;
      const mode = browserModes.get(m.sessionId) || {};
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
      else if (path.endsWith('/reception/practices'))
        data = mode.twoClinics
          ? [
              practice,
              {
                ...practice,
                id: 'c2',
                nameAr: 'عيادة ب',
                nameEn: 'Clinic B',
                permissionCodes: mode.noView
                  ? grants.filter((p) => p !== 'PracticeTickets.View')
                  : grants,
              },
            ]
          : [practice];
      else if (path.endsWith('/queue'))
        data = queueStates.get(m.sessionId) || {
          inProgress: null,
          called: null,
          waiting: [ticket],
          noShow: [],
        };
      else if (path.endsWith('/walk-in/options'))
        data = {
          practiceId: 'c1',
          currencyCode: 'EGP',
          segments: [
            {
              segmentId: 'segment',
              nameAr: 'كشف عادي',
              nameEn: 'Standard visit',
              priority: 1,
              visitTypes: [
                {
                  visitTypeId: 'visit',
                  code: 'NewConsultation',
                  nameAr: 'كشف جديد',
                  nameEn: 'New consultation',
                  price: 300,
                },
                {
                  visitTypeId: 'free',
                  code: 'NewConsultation',
                  nameAr: 'زيارة مجانية',
                  nameEn: 'Free visit',
                  price: 0,
                },
              ],
            },
          ],
        };
      else if (request.method === 'POST' && /\/(check-in|force-check-in|walk-in)$/.test(path)) {
        if (path.endsWith('/walk-in') && !walkInFailures.has(m.sessionId)) {
          walkInFailures.add(m.sessionId);
          responseCode = 500;
          data = { errors: [{ code: 'Common.Unknown', message: 'Synthetic create failure' }] };
        } else
          data = {
            ...ticket,
            ticketNumber: '12',
            patientsAheadNow: 2,
            source: path.endsWith('/walk-in') ? 'WalkIn' : 'Reservation',
          };
      } else if (path.includes('/tickets/t1') || path.endsWith('/call-next')) {
        const state = queueStates.get(m.sessionId) || {
          inProgress: null,
          called: null,
          waiting: [ticket],
          noShow: [],
        };
        const active = state.called || state.waiting[0] || state.noShow[0] || ticket;
        data = active;
        if (request.method === 'POST') {
          if (path.endsWith('/call-next') || path.endsWith('/manual-call'))
            data = { ...active, status: 'Called', rowVersion: 'v2' };
          else if (path.endsWith('/confirm-no-response'))
            data = {
              ...active,
              status: active.callAttempts.length >= 2 ? 'NoShow' : 'Called',
              callAttempts: [
                ...active.callAttempts,
                {
                  attemptNumber: active.callAttempts.length + 1,
                  calledOnUtc: '2026-10-07T10:00:00Z',
                  outcome: 'NoResponse',
                },
              ],
              rowVersion: 'v3',
            };
          else if (path.endsWith('/recall'))
            data = { ...active, status: 'Called', rowVersion: 'v4' };
          else if (path.endsWith('/restore-no-show'))
            data = { ...active, status: 'Waiting', callAttempts: [], rowVersion: 'v5' };
          else if (path.endsWith('/cancel'))
            data = {
              ...active,
              status: 'Cancelled',
              canRefund: true,
              paymentId: 'payment1',
              refundableAmount: 300,
              currencyCode: 'EGP',
              rowVersion: 'v6',
            };
          queueStates.set(m.sessionId, {
            inProgress: null,
            called: data.status === 'Called' ? data : null,
            waiting: data.status === 'Waiting' ? [data] : [],
            noShow: data.status === 'NoShow' ? [data] : [],
          });
        }
      } else if (path.endsWith('/financial-transactions'))
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
          summary: { Active: 1 },
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
      if (
        request.method === 'GET' &&
        path.endsWith('/patients/search') &&
        url.searchParams.get('name') === 'Error' &&
        !searchFailures.has(m.sessionId)
      ) {
        searchFailures.add(m.sessionId);
        responseCode = 500;
        data = { errors: [{ code: 'Common.Unknown', message: 'Synthetic search failure' }] };
      }
      if (path.includes('/practices/c2/') && path.endsWith('/queue'))
        data = {
          inProgress: null,
          called: null,
          waiting: [
            {
              ...ticket,
              practice: { ...practice, id: 'c2' },
              patient: { ...ticket.patient, nameAr: 'مريض العيادة ب', nameEn: 'Clinic B patient' },
            },
          ],
          noShow: [],
        };
      if (mode.queueFailure && request.method === 'GET' && path.endsWith('/queue')) {
        responseCode = 500;
        data = { errors: [{ code: 'Common.Unknown', message: 'Synthetic Queue failure' }] };
      }
      if (mode.hold && mode.hold.method === request.method && path.endsWith(mode.hold.suffix)) {
        mode.hold = null;
        const override = await new Promise((resolve) => heldRequests.set(m.sessionId, resolve));
        heldRequests.delete(m.sessionId);
        if (override?.status) {
          responseCode = override.status;
          data = { errors: [{ code: 'Common.Unknown', message: 'Synthetic stale failure' }] };
        }
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
      ).catch((error) => {
        // Navigation or closing a synthetic target can cancel an intercepted request.
        if (
          !['Session with given id not found.', 'Invalid InterceptionId.'].includes(error.message)
        )
          throw error;
      });
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
    ].filter(
      (route) => !process.env.WASLA_ROUTES || process.env.WASLA_ROUTES.split(',').includes(route),
    ))
      for (const lang of ['ar', 'en']) {
        const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
        createdTargets.add(targetId);
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
          fs.writeFileSync(
            '.tmp/p2-browser-failed-dom.txt',
            await evaluate('document.body.innerText'),
          );
          fs.writeFileSync(
            '.tmp/p2-browser-failed-requests.json',
            JSON.stringify(requests.slice(-30), null, 2),
          );
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
        const click = async (selector) =>
          evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
        const waitHeld = async () => {
          for (let attempt = 0; attempt < 200 && !heldRequests.has(sessionId); attempt++)
            await new Promise((r) => setTimeout(r, 20));
          assert.ok(heldRequests.has(sessionId), 'expected delayed synthetic request');
        };
        const clickText = async (selector, ar, en) =>
          evaluate(
            `(()=>{const b=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.textContent.trim()===${JSON.stringify(lang === 'ar' ? ar : en)});if(!b)throw Error('Missing action');b.click();})()`,
          );
        const assertDrawer = async () => {
          assert.ok(
            await evaluate('document.documentElement.scrollWidth<=innerWidth'),
            'drawer page overflow',
          );
          const bounds = await evaluate(
            "(()=>{const p=document.querySelector('.side-drawer-panel');const r=p.getBoundingClientRect();return {left:r.left,right:r.right,scroll:p.scrollWidth,width:p.clientWidth}})()",
          );
          assert.ok(
            bounds.left >= -1 &&
              bounds.right <= (await evaluate('innerWidth')) + 1 &&
              bounds.scroll <= bounds.width + 1,
            JSON.stringify(bounds),
          );
        };
        const screenshot = async (name, width, phase = 'p1') => {
          if (![390, 820, 1440].includes(width)) return;
          await evaluate(
            "[...document.querySelectorAll('.toast-close')].forEach(button=>button.click())",
          );
          const shot = await call('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false,
          });
          fs.writeFileSync(
            '.tmp/reception-responsive/' + phase + '-' + name + '-' + lang + '-' + width + '.png',
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
          walkInFailures.delete(sessionId);
          searchFailures.delete(sessionId);
          queueStates.delete(sessionId);
          browserModes.delete(sessionId);
          if (route === 'reception/queue') {
            await call('Page.navigate', { url: origin + '/' + route });
            await waitFor("!!document.querySelector('.ticket-rows-list .ticket-row')");
          }
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
              "document.querySelector('app-reservation-editor .selected-patient')?.textContent.includes(" +
                JSON.stringify(lang === 'ar' ? patient.nameAr : patient.nameEn) +
                ") && document.querySelector('app-reservation-editor select')?.value !== ''",
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
            // A row arrival action only opens fresh details; the user explicitly submits payment.
            for (const arrival of ['normal', 'free', 'exceptional']) {
              reservation.price = arrival === 'free' ? 0 : 300;
              const countBefore = requests.filter(
                (r) => /\/(check-in|force-check-in)$/.test(r.path) && r.method === 'POST',
              ).length;
              await click('tbody .btn-arrival-action');
              await waitFor("!!document.querySelector('app-reservation-check-in .amount-due')");
              assert.equal(
                requests.filter(
                  (r) => /\/(check-in|force-check-in)$/.test(r.path) && r.method === 'POST',
                ).length,
                countBefore,
                'row click mutated arrival',
              );
              assert.ok(
                await evaluate(
                  "!document.querySelector('app-reservation-check-in input[type=number]')",
                ),
                'editable amount returned',
              );
              assert.ok(
                await evaluate(
                  "!document.querySelector('app-reservation-check-in .exception-options').open",
                ),
                'exception expanded by default',
              );
              if (arrival === 'exceptional') {
                await click('app-reservation-check-in .exception-options summary');
                await click('app-reservation-check-in .exception-toggle');
                await change(
                  'app-reservation-check-in .exception-options textarea',
                  'Synthetic early arrival reason',
                  'input',
                );
              }
              await assertDrawer();
              await screenshot('arrival-' + arrival, width, 'p2');
              await evaluate(
                "document.querySelector('app-reservation-check-in form').requestSubmit()",
              );
              await waitFor("!!document.querySelector('.arrival-done')");
              await assertDrawer();
              assert.ok(
                await evaluate(
                  "document.querySelector('.arrival-done').textContent.includes('12')",
                ),
                'returned ticket number missing',
              );
              assert.ok(
                await evaluate(
                  "document.querySelector('.arrival-done a').href.includes('/reception/queue')",
                ),
                'scoped Queue link missing',
              );
              assert.ok(
                await evaluate("location.pathname==='/reception/reservations'"),
                'arrival auto-navigated',
              );
              await screenshot('arrival-done-' + arrival, width, 'p2');
              if (arrival === 'normal') {
                await click('.arrival-done a');
                await waitFor("!!document.querySelector('.queue-waiting')");
                await call('Page.navigate', { url: origin + '/reception/reservations' });
                await waitFor("!!document.querySelector('tbody .btn-arrival-action')");
              } else if (arrival === 'free') {
                await click('.arrival-actions button');
                await waitFor("!document.querySelector('.side-drawer-panel')");
              } else {
                await call('Input.dispatchKeyEvent', {
                  type: 'keyDown',
                  key: 'Escape',
                  code: 'Escape',
                });
                await call('Input.dispatchKeyEvent', {
                  type: 'keyUp',
                  key: 'Escape',
                  code: 'Escape',
                });
                await waitFor("!document.querySelector('.side-drawer-panel')");
              }
            }
            reservation.price = 300;
            results.push({
              route,
              lang,
              width,
              journey: 'P2 scheduled fixed-price, free and exceptional arrival, scoped Done',
              passed: true,
            });
          }
          if (route === 'reception/queue') {
            assert.ok(
              await evaluate("!document.querySelector('#queue-practice-select')"),
              'duplicate Reception clinic selector',
            );
            await click('.walk-in-trigger');
            await waitFor("!!document.querySelector('app-walk-in-patient-search')");
            await change('app-walk-in-patient-search input[type=search]', 'Zero', 'input');
            await click('app-walk-in-patient-search button');
            await waitFor("!!document.querySelector('app-walk-in-patient-search .empty-state')");
            await screenshot('walk-in-search-empty', width, 'p2');
            await change('app-walk-in-patient-search input[type=search]', 'Error', 'input');
            await click('app-walk-in-patient-search button');
            await waitFor("!!document.querySelector('app-walk-in-patient-search [role=alert]')");
            assert.ok(
              await evaluate("!document.querySelector('app-walk-in-patient-search .empty-state')"),
              'search error shown as no results',
            );
            await screenshot('walk-in-search-error', width, 'p2');
            await change('app-walk-in-patient-search input[type=search]', '', 'input');
            await change(
              'app-walk-in-patient-search input[type=tel]',
              patient.phoneNumber,
              'input',
            );
            await click('app-walk-in-patient-search button');
            await waitFor("!!document.querySelector('app-walk-in-patient-search .patient-option')");
            await assertDrawer();
            await screenshot('walk-in-search', width, 'p2');
            await click('app-walk-in-patient-search .patient-option');
            await waitFor(
              '!!document.querySelector(\'.visit-choice option[value="segment:visit"]\')',
            );
            await change('.visit-choice', 'segment:visit');
            await clickText('.walk-in-form .payment-methods button', 'بطاقة', 'Card');
            await click('.walk-in-form details summary');
            await change('.walk-in-form details input', 'POS-SYNTHETIC', 'input');
            await change('.walk-in-form details textarea', 'Synthetic retained note', 'input');
            await assertDrawer();
            await screenshot('walk-in-payment', width, 'p2');
            await evaluate("document.querySelector('.walk-in-form').requestSubmit()");
            await waitFor(
              "!!document.querySelector('.drawer-body [role=alert]') && !document.querySelector('.walk-in-form button[type=submit]').disabled",
            );
            assert.equal(
              await evaluate("document.querySelector('.walk-in-form details textarea').value"),
              'Synthetic retained note',
            );
            const attempts = requests.filter(
              (r) => r.path.endsWith('/tickets/walk-in') && r.method === 'POST',
            );
            await screenshot('walk-in-failed', width, 'p2');
            await evaluate("document.querySelector('.walk-in-form').requestSubmit()");
            await waitFor("!!document.querySelector('.ticket-done')");
            const retried = requests.filter(
              (r) => r.path.endsWith('/tickets/walk-in') && r.method === 'POST',
            );
            assert.equal(
              retried.at(-1).idempotencyKey,
              attempts.at(-1).idempotencyKey,
              'retry intent changed',
            );
            assert.equal(JSON.parse(retried.at(-1).body).paidAmount, 300);
            assert.equal(JSON.parse(retried.at(-1).body).paymentMethod, 'Card');
            await assertDrawer();
            await screenshot('walk-in-done', width, 'p2');
            await click('.ticket-done .btn-primary');
            await waitFor(
              "!!document.querySelector('.call-next') && !document.querySelector('.side-drawer-panel')",
            );
            await click('.walk-in-trigger');
            await waitFor("!!document.querySelector('app-walk-in-patient-search')");
            await change(
              'app-walk-in-patient-search input[type=tel]',
              patient.phoneNumber,
              'input',
            );
            await evaluate(
              "document.querySelector('app-walk-in-patient-search input[type=tel]').focus()",
            );
            await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter' });
            await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' });
            await waitFor("!!document.querySelector('app-walk-in-patient-search .patient-option')");
            await click('app-walk-in-patient-search .patient-option');
            await waitFor("!!document.querySelector('.visit-choice')");
            await change('.visit-choice', 'segment:free');
            await clickText('.walk-in-form .payment-methods button', 'محفظة إلكترونية', 'Wallet');
            await screenshot('walk-in-free', width, 'p2');
            await click('.btn-submit-walk-in');
            await waitFor("!!document.querySelector('.ticket-done')");
            assert.equal(
              JSON.parse(
                requests
                  .filter((r) => r.path.endsWith('/tickets/walk-in') && r.method === 'POST')
                  .at(-1).body,
              ).paidAmount,
              0,
            );
            await screenshot('walk-in-free-done', width, 'p2');
            await click('.ticket-done .btn-primary');
            await waitFor(
              "!!document.querySelector('.call-next') && !document.querySelector('.side-drawer-panel')",
            );
            await click('.call-next');
            await waitFor(
              "!!document.querySelector('.current-patient') && !!document.querySelector('.ticket-actions')",
            );
            assert.ok(
              await evaluate("!document.querySelector('.call-next')"),
              'occupied Queue offers Call Next',
            );
            await screenshot('called', width, 'p2');
            await clickText('.ticket-actions button', 'لم يرد', 'No response');
            await waitFor(
              `!![...document.querySelectorAll('.ticket-actions button')].find(b=>b.textContent.trim()===${JSON.stringify(lang === 'ar' ? 'إعادة النداء' : 'Recall')})`,
            );
            await clickText('.ticket-actions button', 'إعادة النداء', 'Recall');
            await waitFor("!document.querySelector('.ticket-actions button:disabled')");
            await clickText('.ticket-actions button', 'لم يرد', 'No response');
            await waitFor("!document.querySelector('.ticket-actions button:disabled')");
            await clickText('.ticket-actions button', 'لم يرد', 'No response');
            await waitFor("!!document.querySelector('.restore-waiting')");
            await screenshot('no-show', width, 'p2');
            await click('.restore-waiting');
            await waitFor("!!document.querySelector('.manual-call')");
            assert.ok(
              await evaluate("!document.querySelector('.reason-form')"),
              'reason appears before choosing action',
            );
            await click('.manual-call');
            await change('#ticket-action-reason', 'Synthetic priority reason', 'input');
            await assertDrawer();
            await screenshot('manual-call-reason', width, 'p2');
            await evaluate("document.querySelector('.reason-form').requestSubmit()");
            await waitFor(
              "!!document.querySelector('.cancel-ticket') && !document.querySelector('.reason-form')",
            );
            await click('.cancel-ticket');
            await change('#ticket-action-reason', 'Synthetic patient left', 'input');
            await screenshot('cancel-reason', width, 'p2');
            await evaluate("document.querySelector('.reason-form').requestSubmit()");
            await waitFor("!!document.querySelector('.refund-action')");
            assert.ok(
              await evaluate(
                "document.querySelector('.refund-action').href.includes('/reception/finance')",
              ),
              'refund boundary changed',
            );
            assert.ok(
              !requests.some((r) => r.method === 'POST' && /refund/.test(r.path)),
              'Queue performed refund',
            );
            await assertDrawer();
            await screenshot('cancelled-finance-link', width, 'p2');
            await click('.drawer-close-btn');
            await screenshot('queue-empty', width, 'p2');
            // Exercise loading/error and no-clinic/no-View states without changing route authorization.
            const mode = { twoClinics: true, noView: true };
            browserModes.set(sessionId, mode);
            await call('Page.navigate', { url: origin + '/reception/queue' });
            await waitFor(
              "document.querySelector('#reception-current-practice')?.options.length===3 && !!document.querySelector('.queue-board .state-block img')",
            );
            await screenshot('queue-no-clinic', width, 'p2');
            await change('#reception-current-practice', 'c2');
            await waitFor(
              "!document.querySelector('.queue-waiting') && !!document.querySelector('.queue-board .state-block img')",
            );
            await screenshot('queue-no-view', width, 'p2');
            await change('#reception-current-practice', 'c1');
            await waitFor("!!document.querySelector('.queue-waiting')");
            mode.queueFailure = true;
            await click('app-page-header .queue-actions button');
            await waitFor("!!document.querySelector('.queue-board [role=alert]')");
            await screenshot('queue-failure', width, 'p2');
            mode.queueFailure = false;
            await click('.queue-board [role=alert] button');
            await waitFor("!!document.querySelector('.queue-waiting')");
            mode.hold = { method: 'GET', suffix: '/queue' };
            await click('app-page-header .queue-actions button');
            await waitFor(
              "document.querySelector('.queue-board')?.getAttribute('aria-busy')==='true'",
            );
            await screenshot('queue-loading', width, 'p2');
            await waitFor('true');
            await waitHeld();
            heldRequests.get(sessionId)();
            await waitFor("!!document.querySelector('.queue-waiting')");
            mode.noView = false;
            queueStates.delete(sessionId);
            await call('Page.navigate', { url: origin + '/reception/queue' });
            await waitFor(
              "document.querySelector('#reception-current-practice')?.options.length===3",
            );
            await change('#reception-current-practice', 'c1');
            await waitFor("!!document.querySelector('.ticket-rows-list .ticket-row')");
            for (const status of [200, 403, 409]) {
              mode.hold = { method: 'GET', suffix: '/tickets/t1' };
              await click('.ticket-rows-list .ticket-row');
              await waitHeld();
              await change('#reception-current-practice', 'c2');
              await waitFor(
                "document.querySelector('.ticket-rows-list')?.textContent.includes(" +
                  JSON.stringify(lang === 'ar' ? 'مريض العيادة ب' : 'Clinic B patient') +
                  ')',
              );
              await change('#reception-current-practice', 'c1');
              await waitFor("!!document.querySelector('.ticket-rows-list .ticket-row')");
              heldRequests.get(sessionId)(status === 200 ? undefined : { status });
              await new Promise((r) => setTimeout(r, 100));
              assert.ok(
                await evaluate(
                  "!document.querySelector('.side-drawer-panel') && !document.querySelector('.queue-alert')",
                ),
                'stale detail/error restored after A-B-A',
              );
            }
            mode.hold = { method: 'GET', suffix: '/queue' };
            await click('app-page-header .queue-actions button');
            await waitHeld();
            await change('#reception-current-practice', 'c2');
            await waitFor(
              "document.querySelector('.ticket-rows-list')?.textContent.includes(" +
                JSON.stringify(lang === 'ar' ? 'مريض العيادة ب' : 'Clinic B patient') +
                ')',
            );
            heldRequests.get(sessionId)({ status: 500 });
            await new Promise((r) => setTimeout(r, 100));
            assert.ok(
              await evaluate("!document.querySelector('.queue-alert')"),
              'stale Queue failure surfaced',
            );
            await screenshot('queue-clinic-b', width, 'p2');
            await change('#reception-current-practice', 'c1');
            await waitFor(
              "!!document.querySelector('.walk-in-trigger') && !!document.querySelector('.ticket-rows-list .ticket-row')",
            );
            await click('.walk-in-trigger');
            await waitFor("!!document.querySelector('app-walk-in-patient-search')");
            await change('#reception-current-practice', 'c2');
            await waitFor(
              "!document.querySelector('.side-drawer-panel') && document.querySelector('.ticket-rows-list')?.textContent.includes(" +
                JSON.stringify(lang === 'ar' ? 'مريض العيادة ب' : 'Clinic B patient') +
                ')',
            );
            // A pending check-in settles after a new clinic has become the shared context.
            await call('Page.navigate', { url: origin + '/reception/reservations' });
            await waitFor(
              "document.querySelector('#reception-current-practice')?.options.length===3",
            );
            await change('#reception-current-practice', 'c1');
            await waitFor("!!document.querySelector('tbody .btn-arrival-action')");
            await click('tbody .btn-arrival-action');
            await waitFor("!!document.querySelector('app-reservation-check-in')");
            mode.hold = { method: 'POST', suffix: '/check-in' };
            await evaluate(
              "document.querySelector('app-reservation-check-in form').requestSubmit()",
            );
            await waitHeld();
            await change('#reception-current-practice', 'c2');
            await waitFor("!document.querySelector('.side-drawer-panel')");
            heldRequests.get(sessionId)();
            await waitFor("!!document.querySelector('tr.table-row')");
            assert.ok(
              await evaluate(
                "!document.querySelector('.arrival-done') && document.querySelector('#reception-current-practice').value==='c2'",
              ),
              'stale arrival Done surfaced',
            );
            results.push({
              route,
              lang,
              width,
              journey:
                'P2 structured walk-in search, failed retry, Done, call/no-response/recall/no-show/restore/manual-call/cancel and separate Finance link',
              passed: true,
            });
            browserModes.delete(sessionId);
          }
          console.log('PASS', route, lang, width);
        }
        await send('Target.closeTarget', { targetId });
        createdTargets.delete(targetId);
      }
    fs.writeFileSync('.tmp/reception-responsive/requests.json', JSON.stringify(requests, null, 2));
    fs.writeFileSync('.tmp/reception-responsive/results.json', JSON.stringify(results, null, 2));
    console.log(
      `PASS: ${results.length} responsive cases; no page overflow, row clipping, or hidden phone numbers.`,
    );
  } finally {
    for (const targetId of createdTargets)
      await send('Target.closeTarget', { targetId }).catch(() => undefined);
    socket.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
