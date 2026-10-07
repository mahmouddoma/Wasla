const assert = require('node:assert/strict');
const fs = require('node:fs');

const origin = process.env.WASLA_ORIGIN || 'http://localhost:4201';
const debug = process.env.WASLA_DEBUG_ORIGIN || 'http://127.0.0.1:9244';

const today = [
  new Date().getFullYear(),
  String(new Date().getMonth() + 1).padStart(2, '0'),
  String(new Date().getDate()).padStart(2, '0'),
].join('-');

const grants = [
  'PracticePayments.View',
  'PracticePayments.Refund',
  'PracticePayments.Correct',
  'Patients.SearchBasic',
];

const practiceA = {
  id: 'c1',
  nameAr: 'عيادة الأمل التخصصية',
  nameEn: 'Hope Specialized Clinic',
  isActive: true,
  permissionCodes: grants,
};

const practiceB = {
  id: 'c2',
  nameAr: 'عيادة النور',
  nameEn: 'Al-Noor Clinic',
  isActive: true,
  permissionCodes: ['PracticePayments.View'],
};

const practiceNoView = {
  id: 'c3',
  nameAr: 'عيادة بلا صلاحية',
  nameEn: 'No View Clinic',
  isActive: true,
  permissionCodes: [],
};

const user = {
  applicationUserId: 'receptionist-1',
  userName: 'Reception Staff',
  email: 'reception@example.com',
  phoneNumber: '01012345678',
  userType: 'Reception',
  roles: ['Reception'],
  permissions: grants,
  isFirstLogin: false,
  doctorId: null,
  patientId: null,
};

const doctorUser = {
  applicationUserId: 'doctor-1',
  userName: 'Dr. Samir',
  email: 'samir@example.com',
  phoneNumber: '01012345679',
  userType: 'Doctor',
  roles: ['Doctor'],
  permissions: ['DoctorPayments.View', 'DoctorRevenue.View'],
  isFirstLogin: false,
  doctorId: 'd1',
  patientId: null,
};

const paymentDetailA = {
  practice: { id: 'c1', nameAr: 'عيادة الأمل التخصصية', nameEn: 'Hope Specialized Clinic' },
  patient: { id: 'p1', nameAr: 'أحمد محمد', nameEn: 'Ahmed Mohamed' },
  doctor: { id: 'd1', nameAr: 'د. سمير علي', nameEn: 'Dr. Samir Ali' },
  payment: {
    id: 'pay1',
    transactionNumber: 'PAY-1001',
    ticketId: 't1',
    amount: 300,
    currencyCode: 'EGP',
    status: 'Paid',
    paymentMethod: 'Cash',
    businessDate: today,
    collectedOnUtc: '2026-10-07T09:00:00Z',
    collectedByDisplayName: 'موظف الاستقبال',
    rowVersion: 'v1',
  },
  refund: null,
  ticketNumber: 12,
  isRefunded: false,
  canRefund: true,
  refundableAmount: 300,
  paymentCorrections: [],
  refundCorrections: [],
};

const refundedPaymentDetail = {
  practice: { id: 'c1', nameAr: 'عيادة الأمل التخصصية', nameEn: 'Hope Specialized Clinic' },
  patient: { id: 'p1', nameAr: 'أحمد محمد', nameEn: 'Ahmed Mohamed' },
  doctor: { id: 'd1', nameAr: 'د. سمير علي', nameEn: 'Dr. Samir Ali' },
  payment: {
    id: 'pay1',
    transactionNumber: 'PAY-1001',
    ticketId: 't1',
    amount: 300,
    currencyCode: 'EGP',
    status: 'Paid',
    paymentMethod: 'Cash',
    businessDate: today,
    collectedOnUtc: '2026-10-07T09:00:00Z',
    collectedByDisplayName: 'موظف الاستقبال',
    rowVersion: 'v1',
  },
  refund: {
    id: 'ref1',
    transactionNumber: 'REF-2001',
    originalPaymentTransactionNumber: 'PAY-1001',
    amount: 300,
    currencyCode: 'EGP',
    refundMethod: 'Cash',
    refundReasonCode: 'PatientRequestedCancellation',
    refundReason: null,
    referenceNumber: null,
    refundedOnUtc: '2026-10-07T11:00:00Z',
    businessDate: today,
    recordedByDisplayName: 'موظف الاستقبال',
    rowVersion: 'rv-ref-1',
  },
  ticketNumber: 12,
  isRefunded: true,
  canRefund: false,
  refundableAmount: 0,
  paymentCorrections: [],
  refundCorrections: [],
};

const transactionRowA = {
  transactionId: 'pay1',
  transactionNumber: 'PAY-1001',
  practiceId: 'c1',
  practiceNameAr: 'عيادة الأمل التخصصية',
  practiceNameEn: 'Hope Specialized Clinic',
  patientId: 'p1',
  patientNameAr: 'أحمد محمد',
  patientNameEn: 'Ahmed Mohamed',
  doctorId: 'd1',
  doctorNameAr: 'د. سمير علي',
  doctorNameEn: 'Dr. Samir Ali',
  ticketNumber: 12,
  transactionType: 'Payment',
  amount: 300,
  currencyCode: 'EGP',
  paymentMethod: 'Cash',
  collectedOnUtc: '2026-10-07T09:00:00Z',
  businessDate: today,
};

const transactionRowB = {
  transactionId: 'pay2',
  transactionNumber: 'PAY-2002',
  practiceId: 'c2',
  practiceNameAr: 'عيادة النور',
  practiceNameEn: 'Al-Noor Clinic',
  patientId: 'p2',
  patientNameAr: 'محمود علي',
  patientNameEn: 'Mahmoud Ali',
  doctorId: 'd2',
  doctorNameAr: 'د. خالد حسن',
  doctorNameEn: 'Dr. Khaled Hassan',
  ticketNumber: 45,
  transactionType: 'Payment',
  amount: 500,
  currencyCode: 'EGP',
  paymentMethod: 'Card',
  collectedOnUtc: '2026-10-07T10:00:00Z',
  businessDate: today,
};

const paymentReceiptData = {
  paymentTransactionNumber: 'PAY-1001',
  patientId: 'p1',
  patientNameAr: 'أحمد محمد',
  patientNameEn: 'Ahmed Mohamed',
  doctorId: 'd1',
  doctorNameAr: 'د. سمير علي',
  doctorNameEn: 'Dr. Samir Ali',
  doctorPracticeId: 'c1',
  practiceNameAr: 'عيادة الأمل التخصصية',
  practiceNameEn: 'Hope Specialized Clinic',
  ticketNumber: 12,
  amount: 300,
  currencyCode: 'EGP',
  paymentMethod: 'Cash',
  referenceNumber: null,
  paidOnUtc: '2026-10-07T09:00:00Z',
  businessDate: today,
  recordedByDisplayName: 'موظف الاستقبال',
};

const refundReceiptData = {
  refundTransactionNumber: 'REF-2001',
  originalPaymentTransactionNumber: 'PAY-1001',
  patientId: 'p1',
  patientNameAr: 'أحمد محمد',
  patientNameEn: 'Ahmed Mohamed',
  doctorId: 'd1',
  doctorNameAr: 'د. سمير علي',
  doctorNameEn: 'Dr. Samir Ali',
  doctorPracticeId: 'c1',
  practiceNameAr: 'عيادة الأمل التخصصية',
  practiceNameEn: 'Hope Specialized Clinic',
  ticketNumber: 12,
  amount: 300,
  currencyCode: 'EGP',
  refundMethod: 'Cash',
  refundReasonCode: 'PatientRequestedCancellation',
  refundReason: 'إلغاء التذكرة',
  referenceNumber: null,
  refundedOnUtc: '2026-10-07T11:00:00Z',
  businessDate: today,
  recordedByDisplayName: 'موظف الاستقبال',
};

const doctorRevenueData = {
  summary: {
    grossRevenue: 15000,
    totalRefunds: 900,
    netRevenue: 14100,
    paymentCount: 50,
    refundCount: 3,
    currencyCode: 'EGP',
  },
  dailyTrend: [
    { date: today, grossAmount: 3000, refundAmount: 300, netAmount: 2700 },
  ],
  byPractice: [
    { practiceId: 'c1', practiceNameAr: 'عيادة الأمل التخصصية', practiceNameEn: 'Hope Clinic', grossRevenue: 15000, refunds: 900, netRevenue: 14100, paymentCount: 50, refundCount: 3 },
  ],
  paymentMethods: [
    { method: 'Cash', amount: 10000, transactionCount: 35 },
    { method: 'Card', amount: 5000, transactionCount: 15 },
  ],
  refundMethods: [
    { method: 'Cash', amount: 900, transactionCount: 3 },
  ],
  bySegment: [],
  byVisitType: [],
};

async function run() {
  fs.mkdirSync('.tmp/finance-responsive', { recursive: true });
  const version = await fetch(debug + '/json/version').then((r) => r.json());
  const socket = new WebSocket(version.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  let sequence = 0;
  const pending = new Map();
  const createdTargets = new Set();
  const requests = [];

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

  // Session state overrides
  const sessionConfig = new Map();

  socket.onmessage = async (event) => {
    const m = JSON.parse(event.data);
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (p) m.error ? p.reject(m.error) : p.resolve(m.result);
    }
    if (m.method === 'Runtime.consoleAPICalled') {
      const text = (m.params.args || []).map((a) => a.value || a.description || '').join(' ');
      if (text.includes('[PORTAL-LAYOUT]') || text.includes('[RECEPTION-CONTEXT]') || text.includes('[FINANCE-EFFECT]')) {
        console.log('BROWSER LOG:', text);
      }
    }
    if (m.method === 'Fetch.requestPaused') {
      const { requestId, request } = m.params;
      const url = new URL(request.url);
      const path = url.pathname;
      const config = sessionConfig.get(m.sessionId) || {};

      let parsedBody = null;
      try {
        parsedBody = request.postData ? JSON.parse(request.postData) : null;
      } catch {
        parsedBody = request.postData;
      }

      const reqRecord = {
        sessionId: m.sessionId,
        method: request.method,
        path,
        query: Object.fromEntries(url.searchParams),
        body: parsedBody,
        idempotencyKey: request.headers['Idempotency-Key'] || request.headers['idempotency-key'],
      };
      requests.push(reqRecord);

      let data = {};
      let responseCode = 200;

      if (path.endsWith('/auth/me')) {
        data = config.isDoctor ? doctorUser : user;
      } else if (path.endsWith('/reception/practices')) {
        if (config.emptyPractices) {
          data = [];
        } else if (config.noViewPractices) {
          data = [practiceNoView];
        } else if (config.multipleClinics) {
          data = [practiceA, practiceB];
        } else {
          data = [practiceA];
        }
      } else if (path.endsWith('/doctor-practices') || path.includes('/doctors/me/practices')) {
        data = [practiceA];
      } else if (path.includes('/financial-transactions')) {
        if (config.emptyList) {
          data = { items: [], totalCount: 0, pageNumber: 1, pageSize: 20 };
        } else if (config.listFail) {
          responseCode = 500;
          data = { message: 'Server error' };
        } else if (path.includes('/practices/c2/') || url.searchParams.get('practiceId') === 'c2') {
          data = { items: [transactionRowB], totalCount: 1, pageNumber: 1, pageSize: 20 };
        } else {
          data = { items: [transactionRowA], totalCount: 1, pageNumber: 1, pageSize: 20 };
        }
      } else if (path.endsWith('/receipt') && path.includes('/payments/')) {
        data = paymentReceiptData;
      } else if (path.endsWith('/receipt') && path.includes('/refunds/')) {
        data = refundReceiptData;
      } else if (path.includes('/payments/pay1/refund')) {
        if (config.failRefundOnce && !config.refundFailedAlready) {
          config.refundFailedAlready = true;
          responseCode = 503;
          data = { message: 'Network timeout' };
        } else if (config.refundConflict) {
          responseCode = 409;
          data = { code: 'CONCURRENT_UPDATE', message: 'Record changed' };
        } else {
          data = {
            refundId: 'ref1',
            transactionNumber: 'REF-2001',
            originalPaymentTransactionNumber: 'PAY-1001',
            amount: 300,
            currencyCode: 'EGP',
            refundedOnUtc: '2026-10-07T11:00:00Z',
            businessDate: today,
          };
        }
      } else if (path.includes('/payments/pay1/correct')) {
        if (config.correctPaymentConflict && !config.conflictHandled) {
          config.conflictHandled = true;
          responseCode = 409;
          data = { code: 'CONCURRENT_UPDATE', message: 'Record changed' };
        } else {
          data = {
            correctionId: 'cor-1',
            transactionId: 'pay1',
            transactionNumber: 'PAY-1001',
            correctedOnUtc: '2026-10-07T10:00:00Z',
          };
        }
      } else if (path.includes('/refunds/ref1/correct')) {
        data = {
          correctionId: 'cor-2',
          transactionId: 'ref1',
          transactionNumber: 'REF-2001',
          correctedOnUtc: '2026-10-07T12:00:00Z',
        };
      } else if (path.includes('/payments/pay1') || path.includes('/payments/')) {
        data = config.refundedDetail ? refundedPaymentDetail : (config.currentPaymentDetail || paymentDetailA);
      } else if (path.includes('/revenue/dashboard')) {
        data = doctorRevenueData;
      } else {
        data = {};
      }

      await send('Fetch.fulfillRequest', {
        requestId,
        responseCode,
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Access-Control-Allow-Origin', value: origin },
          { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type,accept-language,idempotency-key' },
          { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
        ],
        body: Buffer.from(JSON.stringify(data)).toString('base64'),
      }, m.sessionId).catch(() => {});
    }
  };

  try {
    console.log('--- Starting P3 Synthetic Browser Journeys ---');

    // ─────────────────────────────────────────────────────────────────────────────
    // JOURNEY 1 & RESPONSIVE SCREENSHOTS: Reception Populated, Empty, Detail, Refund, Done, Correct, Receipt
    // ─────────────────────────────────────────────────────────────────────────────
    for (const lang of ['ar', 'en']) {
      for (const width of [390, 820, 1440]) {
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
          const dom = await evaluate("document.querySelector('.side-drawer-panel')?.innerHTML || document.body.innerHTML");
          fs.writeFileSync('.tmp/finance-debug.html', dom);
          throw Error('Timed out waiting for: ' + expression);
        };

        const screenshot = async (name) => {
          await evaluate("[...document.querySelectorAll('.toast-close')].forEach(b=>b.click())");
          const shot = await call('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync(
            `.tmp/finance-responsive/p3-${name}-${lang}-${width}.png`,
            Buffer.from(shot.data, 'base64')
          );
        };

        sessionConfig.set(sessionId, { currentPaymentDetail: paymentDetailA });

        await call('Page.enable');
        await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
        await call('Page.addScriptToEvaluateOnNewDocument', {
          source: `
            sessionStorage.setItem('wasla.auth.session', ${JSON.stringify(JSON.stringify({ accessToken: 'fake-token', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});
            localStorage.setItem('wasla_lang', '${lang}');
          `,
        });

        await call('Emulation.setDeviceMetricsOverride', {
          width,
          height: 900,
          deviceScaleFactor: 1,
          mobile: width < 576,
        });

        // Load /reception/finance
        await call('Page.navigate', { url: origin + '/reception/finance' });
        await waitFor("!!document.querySelector('.modern-finance-table')");

        // Assert J1: No local clinic selector in Reception
        assert.ok(
          await evaluate("!document.querySelector('#doctor-practice-select')"),
          'Reception must not have a local clinic selector'
        );

        // Screenshot: Populated list
        await screenshot('reception-finance-populated');

        // Open Payment Detail (J4)
        await evaluate("document.querySelector('.btn-row-action')?.click()");
        await waitFor("!!document.querySelector('.side-drawer-panel')");
        await screenshot('payment-detail');

        // View Receipt
        await evaluate("document.querySelector('.btn-receipt-shortcut')?.click()");
        await waitFor("!!document.querySelector('.receipt-voucher-sheet')");
        await screenshot('receipt');
        // Close receipt voucher
        await evaluate("document.querySelector('.drawer-close-btn')?.click()");
        await new Promise((r) => setTimeout(r, 200));

        // Open detail for Refund Flow (J5)
        await evaluate("document.querySelector('.btn-row-action')?.click()");
        await waitFor("!!document.querySelector('.btn-refund-launch')");
        await screenshot('payment-detail-for-refund');

        await evaluate("document.querySelector('.btn-refund-launch')?.click()");
        await waitFor("!!document.querySelector('.focused-refund-form')");
        await screenshot('refund-flow');

        // Execute Refund
        await evaluate("document.querySelector('.btn-mutation-submit.btn-danger-action')?.click()");
        await waitFor("!!document.querySelector('.refund-done-sheet')");
        await screenshot('refund-done');

        // Close Done sheet
        await evaluate("document.querySelector('.drawer-close-btn')?.click()");
        for (let i = 0; i < 50; i++) {
          if (await evaluate("!document.querySelector('.side-drawer-panel')")) break;
          await new Promise((r) => setTimeout(r, 50));
        }
        await new Promise((r) => setTimeout(r, 100));

        // Re-open detail and test correction flow (J7)
        await evaluate("document.querySelector('.btn-row-action')?.click()");
        await waitFor("!!document.querySelector('.btn-toggle-more')");
        // Open More options
        await evaluate("document.querySelector('.btn-toggle-more')?.click()");
        await waitFor("!!document.querySelector('.btn-secondary-tool')");
        await evaluate("document.querySelector('.btn-secondary-tool')?.click()");
        await waitFor("!!document.querySelector('.focused-mutation-form')");
        await screenshot('correction-flow');

        // Close drawer
        await evaluate("document.querySelector('.drawer-close-btn')?.click()");
        await new Promise((r) => setTimeout(r, 200));

        // Test Empty state screenshot
        sessionConfig.set(sessionId, { emptyList: true });
        await evaluate("document.querySelector('.btn-deck-submit')?.click()");
        await waitFor("!!document.querySelector('.cell-empty-table')");
        await screenshot('reception-empty');

        // Now test Doctor Revenue view screenshot
        sessionConfig.set(sessionId, { isDoctor: true });
        await call('Page.addScriptToEvaluateOnNewDocument', {
          source: `
            sessionStorage.setItem('wasla.auth.session', ${JSON.stringify(JSON.stringify({ accessToken: 'fake-token', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user: doctorUser }))});
          `,
        });
        await call('Page.navigate', { url: origin + '/doctor/revenue' });
        await waitFor("!!document.querySelector('.revenue-dashboard-view')");
        await screenshot('doctor-revenue');

        await send('Target.closeTarget', { targetId });
        createdTargets.delete(targetId);
        console.log(`PASS: Populated, Detail, Refund, Done, Correction, Receipt, Revenue at ${width}px (${lang})`);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // JOURNEY 2: No Clinic Selected Guidance
    // ─────────────────────────────────────────────────────────────────────────────
    {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      createdTargets.add(targetId);
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const call = (method, params) => send(method, params, sessionId);

      sessionConfig.set(sessionId, { emptyPractices: true });

      await call('Page.enable');
      await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
      await call('Page.addScriptToEvaluateOnNewDocument', {
        source: `
          sessionStorage.setItem('wasla.auth.session', ${JSON.stringify(JSON.stringify({ accessToken: 'fake', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});
          localStorage.setItem('wasla_lang', 'ar');
        `,
      });

      await call('Page.navigate', { url: origin + '/reception/finance' });
      for (let i = 0; i < 60; i++) {
        const text = await call('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true });
        if (text.result.value.includes('اختر العيادة') || text.result.value.includes('Choose a clinic')) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      const domText = (await call('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true })).result.value;
      assert.ok(
        domText.includes('اختر العيادة') || domText.includes('Choose a clinic'),
        'Journey 2: Should show choose clinic guidance when no clinic selected'
      );

      await send('Target.closeTarget', { targetId });
      createdTargets.delete(targetId);
      console.log('PASS: Journey 2 — No clinic selected guidance');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // JOURNEY 3: No View Permission State
    // ─────────────────────────────────────────────────────────────────────────────
    {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      createdTargets.add(targetId);
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const call = (method, params) => send(method, params, sessionId);

      sessionConfig.set(sessionId, { noViewPractices: true });

      await call('Page.enable');
      await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
      await call('Page.addScriptToEvaluateOnNewDocument', {
        source: `
          sessionStorage.setItem('wasla.auth.session', ${JSON.stringify(JSON.stringify({ accessToken: 'fake', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});
          localStorage.setItem('wasla_lang', 'ar');
        `,
      });

      await call('Page.navigate', { url: origin + '/reception/finance' });
      for (let i = 0; i < 60; i++) {
        const text = await call('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true });
        if (text.result.value.includes('غير متاح لك في هذه العيادة') || text.result.value.includes('Viewing payments is not available')) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      const domText = (await call('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true })).result.value;
      assert.ok(
        domText.includes('غير متاح لك في هذه العيادة') || domText.includes('Viewing payments is not available'),
        'Journey 3: Should show permission-specific state'
      );

      await send('Target.closeTarget', { targetId });
      createdTargets.delete(targetId);
      console.log('PASS: Journey 3 — No view permission guidance');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // JOURNEY 5: P2 Cancelled Ticket Deep Link -> Full Refund Flow -> Done State
    // ─────────────────────────────────────────────────────────────────────────────
    {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      createdTargets.add(targetId);
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const call = (method, params) => send(method, params, sessionId);

      await call('Page.enable');
      await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
      await call('Page.addScriptToEvaluateOnNewDocument', {
        source: `
          sessionStorage.setItem('wasla.auth.session', ${JSON.stringify(JSON.stringify({ accessToken: 'fake', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});
          localStorage.setItem('wasla_lang', 'ar');
        `,
      });

      await call('Page.navigate', { url: origin + '/reception/finance?practiceId=c1&paymentId=pay1' });
      // Side drawer opens automatically for deep linked payment
      for (let i = 0; i < 80; i++) {
        const hasDrawer = await call('Runtime.evaluate', { expression: "!!document.querySelector('.side-drawer-panel')", returnByValue: true });
        if (hasDrawer.result.value) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      const hasDrawer = (await call('Runtime.evaluate', { expression: "!!document.querySelector('.side-drawer-panel')", returnByValue: true })).result.value;
      assert.ok(hasDrawer, 'Journey 5: Deep-linked payment opens drawer directly');

      // Click refund button
      await call('Runtime.evaluate', { expression: "document.querySelector('.btn-refund-launch')?.click()" });
      await new Promise((r) => setTimeout(r, 300));

      const refundNotice = await call('Runtime.evaluate', {
        expression: "document.querySelector('.full-refund-callout')?.innerText",
        returnByValue: true,
      });
      assert.ok(refundNotice.result.value.includes('300'), 'Journey 5: Must show non-editable full refund amount 300');

      // Submit refund
      await call('Runtime.evaluate', { expression: "document.querySelector('.btn-mutation-submit.btn-danger-action')?.click()" });
      await new Promise((r) => setTimeout(r, 400));

      const hasDone = await call('Runtime.evaluate', {
        expression: "!!document.querySelector('.refund-done-sheet')",
        returnByValue: true,
      });
      assert.ok(hasDone.result.value, 'Journey 5: Refund Done sheet must be displayed after success');

      // Click view refund receipt
      await call('Runtime.evaluate', { expression: "document.querySelector('.refund-done-actions .btn-deck-submit')?.click()" });
      await new Promise((r) => setTimeout(r, 300));
      const hasReceipt = await call('Runtime.evaluate', {
        expression: "!!document.querySelector('.receipt-voucher-sheet')",
        returnByValue: true,
      });
      assert.ok(hasReceipt.result.value, 'Journey 5: Refund receipt voucher must open from Done state');

      await send('Target.closeTarget', { targetId });
      createdTargets.delete(targetId);
      console.log('PASS: Journey 5 — P2 deep link payment -> Refund flow -> Done state -> Receipt');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // JOURNEY 6: Failed Refund Retry (Idempotency Key Preservation)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      createdTargets.add(targetId);
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const call = (method, params) => send(method, params, sessionId);

      sessionConfig.set(sessionId, { failRefundOnce: true });

      await call('Page.enable');
      await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
      await call('Page.addScriptToEvaluateOnNewDocument', {
        source: `
          sessionStorage.setItem('wasla.auth.session', ${JSON.stringify(JSON.stringify({ accessToken: 'fake', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});
          localStorage.setItem('wasla_lang', 'ar');
        `,
      });

      await call('Page.navigate', { url: origin + '/reception/finance?practiceId=c1&paymentId=pay1' });
      for (let i = 0; i < 80; i++) {
        const hasBtn = await call('Runtime.evaluate', { expression: "!!document.querySelector('.btn-refund-launch')", returnByValue: true });
        if (hasBtn.result.value) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      await call('Runtime.evaluate', { expression: "document.querySelector('.btn-refund-launch')?.click()" });
      for (let i = 0; i < 80; i++) {
        const hasSubmit = await call('Runtime.evaluate', { expression: "!!document.querySelector('.btn-mutation-submit.btn-danger-action')", returnByValue: true });
        if (hasSubmit.result.value) break;
        await new Promise((r) => setTimeout(r, 50));
      }

      // First submit -> fails (503)
      await call('Runtime.evaluate', { expression: "document.querySelector('.btn-mutation-submit.btn-danger-action')?.click()" });
      for (let i = 0; i < 60; i++) {
        const reqs = requests.filter((r) => r.sessionId === sessionId && r.method === 'POST' && r.path.includes('/refund'));
        if (reqs.length >= 1) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      await new Promise((r) => setTimeout(r, 300));

      // Retry -> succeeds
      await call('Runtime.evaluate', { expression: "document.querySelector('.btn-mutation-submit.btn-danger-action')?.click()" });
      for (let i = 0; i < 60; i++) {
        const reqs = requests.filter((r) => r.sessionId === sessionId && r.method === 'POST' && r.path.includes('/refund'));
        if (reqs.length >= 2) break;
        await new Promise((r) => setTimeout(r, 50));
      }

      const refundReqs = requests.filter((r) => r.sessionId === sessionId && r.method === 'POST' && r.path.includes('/refund'));
      assert.ok(refundReqs.length >= 2, 'Journey 6: Must send initial request and retry request');
      assert.equal(refundReqs[0].idempotencyKey, refundReqs[1].idempotencyKey, 'Journey 6: Failed retry must reuse same idempotency key');

      await send('Target.closeTarget', { targetId });
      createdTargets.delete(targetId);
      console.log('PASS: Journey 6 — Failed refund retry reuses identical idempotency key');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // JOURNEY 7: Payment Correction Flow
    // ─────────────────────────────────────────────────────────────────────────────
    {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      createdTargets.add(targetId);
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const call = (method, params) => send(method, params, sessionId);

      await call('Page.enable');
      await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
      await call('Page.addScriptToEvaluateOnNewDocument', {
        source: `
          sessionStorage.setItem('wasla.auth.session', ${JSON.stringify(JSON.stringify({ accessToken: 'fake', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});
          localStorage.setItem('wasla_lang', 'ar');
        `,
      });

      await call('Page.navigate', { url: origin + '/reception/finance?practiceId=c1&paymentId=pay1' });
      await new Promise((r) => setTimeout(r, 600));

      // Open More -> Correct payment details
      await call('Runtime.evaluate', { expression: "document.querySelector('.btn-toggle-more')?.click()" });
      await new Promise((r) => setTimeout(r, 200));
      await call('Runtime.evaluate', { expression: "document.querySelector('.btn-secondary-tool')?.click()" });
      await new Promise((r) => setTimeout(r, 250));

      // Change method to Card and fill reason
      await call('Runtime.evaluate', {
        expression: `
          const sel = document.querySelector('#correct-pay-method');
          if (sel) {
            sel.value = 'Card';
            sel.dispatchEvent(new Event('input', { bubbles: true }));
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
          const reasonInput = document.querySelector('#correct-pay-reason');
          if (reasonInput) {
            reasonInput.value = 'Wrong method recorded';
            reasonInput.dispatchEvent(new Event('input', { bubbles: true }));
            reasonInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        `,
      });
      await new Promise((r) => setTimeout(r, 100));

      // Submit correction
      await call('Runtime.evaluate', { expression: "document.querySelector('.focused-mutation-form button[type=submit]')?.click()" });
      await new Promise((r) => setTimeout(r, 500));

      const correctReqs = requests.filter((r) => r.sessionId === sessionId && r.method === 'POST' && r.path.includes('/payments/pay1/correct'));
      assert.ok(correctReqs.length >= 1, 'Journey 7: Payment correction request must be sent');
      assert.equal(correctReqs[0].body.paymentMethod, 'Card', 'Journey 7: Corrected payment method must be Card');

      await send('Target.closeTarget', { targetId });
      createdTargets.delete(targetId);
      console.log('PASS: Journey 7 — Payment correction flow');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // JOURNEY 8: Concurrency (409 Conflict Handling)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      createdTargets.add(targetId);
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const call = (method, params) => send(method, params, sessionId);

      sessionConfig.set(sessionId, { correctPaymentConflict: true });

      await call('Page.enable');
      await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
      await call('Page.addScriptToEvaluateOnNewDocument', {
        source: `
          sessionStorage.setItem('wasla.auth.session', ${JSON.stringify(JSON.stringify({ accessToken: 'fake', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});
          localStorage.setItem('wasla_lang', 'ar');
        `,
      });

      await call('Page.navigate', { url: origin + '/reception/finance?practiceId=c1&paymentId=pay1' });
      await new Promise((r) => setTimeout(r, 600));
      // Open More -> Correct payment details
      await call('Runtime.evaluate', { expression: "document.querySelector('.btn-toggle-more')?.click()" });
      await new Promise((r) => setTimeout(r, 200));
      await call('Runtime.evaluate', { expression: "document.querySelector('.btn-secondary-tool')?.click()" });
      await new Promise((r) => setTimeout(r, 250));

      // Enter correction reason
      await call('Runtime.evaluate', {
        expression: `
          const input = document.querySelector('#correct-pay-reason');
          if (input) {
            input.value = 'Fix method';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        `,
      });
      await new Promise((r) => setTimeout(r, 100));

      // Submit -> returns 409
      await call('Runtime.evaluate', { expression: "document.querySelector('.focused-mutation-form button[type=submit]')?.click()" });
      await new Promise((r) => setTimeout(r, 500));

      // Verify conflict banner shown and draft reason preserved
      const conflictState = await call('Runtime.evaluate', {
        expression: `
          ({
            hasConflictAlert: !!document.querySelector('.conflict-alert-banner'),
            reasonValue: document.querySelector('#correct-pay-reason')?.value
          })
        `,
        returnByValue: true,
      });

      assert.ok(conflictState.result.value.hasConflictAlert, 'Journey 8: Must show conflict alert on 409');
      assert.equal(conflictState.result.value.reasonValue, 'Fix method', 'Journey 8: Draft must be preserved on 409 conflict');

      await send('Target.closeTarget', { targetId });
      createdTargets.delete(targetId);
      console.log('PASS: Journey 8 — 409 conflict displays guidance and preserves draft');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // JOURNEY 9: Refund Correction Flow
    // ─────────────────────────────────────────────────────────────────────────────
    {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      createdTargets.add(targetId);
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const call = (method, params) => send(method, params, sessionId);

      sessionConfig.set(sessionId, { refundedDetail: true });

      await call('Page.enable');
      await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
      await call('Page.addScriptToEvaluateOnNewDocument', {
        source: `
          sessionStorage.setItem('wasla.auth.session', ${JSON.stringify(JSON.stringify({ accessToken: 'fake', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});
          localStorage.setItem('wasla_lang', 'ar');
        `,
      });

      await call('Page.navigate', { url: origin + '/reception/finance?practiceId=c1&paymentId=pay1' });
      await new Promise((r) => setTimeout(r, 600));

      // Open More -> Correct refund details
      await call('Runtime.evaluate', { expression: "document.querySelector('.btn-toggle-more')?.click()" });
      await new Promise((r) => setTimeout(r, 200));
      // Click second tool (refund correction)
      await call('Runtime.evaluate', { expression: "document.querySelectorAll('.btn-secondary-tool')[0]?.click()" });
      await new Promise((r) => setTimeout(r, 250));

      // Fill reason
      await call('Runtime.evaluate', {
        expression: `
          const reasonInput = document.querySelector('#correct-ref-reason');
          if (reasonInput) {
            reasonInput.value = 'Correcting refund details';
            reasonInput.dispatchEvent(new Event('input', { bubbles: true }));
            reasonInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        `,
      });
      await new Promise((r) => setTimeout(r, 100));

      // Submit refund correction
      await call('Runtime.evaluate', { expression: "document.querySelector('.focused-mutation-form button[type=submit]')?.click()" });
      await new Promise((r) => setTimeout(r, 500));

      const refCorrectReqs = requests.filter((r) => r.sessionId === sessionId && r.method === 'POST' && r.path.includes('/refunds/ref1/correct'));
      assert.ok(refCorrectReqs.length >= 1, 'Journey 9: Refund correction request must be sent');

      await send('Target.closeTarget', { targetId });
      createdTargets.delete(targetId);
      console.log('PASS: Journey 9 — Refund correction flow');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // JOURNEY 10: Clinic Switching Isolation
    // ─────────────────────────────────────────────────────────────────────────────
    {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      createdTargets.add(targetId);
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const call = (method, params) => send(method, params, sessionId);

      sessionConfig.set(sessionId, { multipleClinics: true });

      await call('Page.enable');
      await call('Runtime.enable');
      await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
      await call('Page.addScriptToEvaluateOnNewDocument', {
        source: `
          sessionStorage.setItem('wasla.auth.session', ${JSON.stringify(JSON.stringify({ accessToken: 'fake', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});
          localStorage.setItem('wasla_lang', 'ar');
        `,
      });

      await call('Page.navigate', { url: origin + '/reception/finance' });
      for (let i = 0; i < 60; i++) {
        const text = await call('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true });
        if (text.result.value.includes('اختر العيادة') || text.result.value.includes('Choose a clinic')) break;
        await new Promise((r) => setTimeout(r, 50));
      }

      // With multiple clinics and none selected, guidance is shown
      const initialGuidance = (await call('Runtime.evaluate', {
        expression: "document.body.innerText.includes('اختر العيادة') || document.body.innerText.includes('Choose a clinic')",
        returnByValue: true,
      })).result.value;
      assert.ok(initialGuidance, 'Journey 10: Guidance shown when multiple clinics exist and none selected');

      // Select Clinic A via topbar selector
      await call('Runtime.evaluate', {
        expression: `
          const sel = document.querySelector('#reception-current-practice');
          if (sel) {
            sel.value = 'c1';
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        `,
      });
      for (let i = 0; i < 50; i++) {
        const hasA = await call('Runtime.evaluate', { expression: "document.body.innerText.includes('أحمد محمد')", returnByValue: true });
        if (hasA.result.value) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      const hasA = (await call('Runtime.evaluate', { expression: "document.body.innerText.includes('أحمد محمد')", returnByValue: true })).result.value;
      assert.ok(hasA, 'Journey 10: Clinic A transactions must load');

      // Open detail in Clinic A
      await call('Runtime.evaluate', { expression: "document.querySelector('.btn-row-action')?.click()" });
      await new Promise((r) => setTimeout(r, 300));
      const hasDrawerA = (await call('Runtime.evaluate', { expression: "!!document.querySelector('.side-drawer-panel')", returnByValue: true })).result.value;
      assert.ok(hasDrawerA, 'Journey 10: Drawer open for Clinic A');

      // Switch to Clinic B via topbar selector
      const switchResult = await call('Runtime.evaluate', {
        expression: `
          (() => {
            try {
              const sel = document.querySelector('#reception-current-practice');
              if (!sel) return 'NO_SEL';
              sel.value = 'c2';
              const evt = new Event('change', { bubbles: true, cancelable: true });
              const dispatched = sel.dispatchEvent(evt);
              return { success: true, val: sel.value, dispatched };
            } catch (err) {
              return { error: err.message, stack: err.stack };
            }
          })()
        `,
        returnByValue: true,
      });
      for (let i = 0; i < 50; i++) {
        const hasB = await call('Runtime.evaluate', { expression: "document.body.innerText.includes('محمود علي')", returnByValue: true });
        if (hasB.result.value) break;
        await new Promise((r) => setTimeout(r, 50));
      }

      // Assert Clinic A's detail drawer was closed on clinic switch
      for (let i = 0; i < 50; i++) {
        const hasDrawer = await call('Runtime.evaluate', { expression: "!!document.querySelector('.side-drawer-panel')", returnByValue: true });
        if (!hasDrawer.result.value) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      const hasDrawerAfterSwitch = (await call('Runtime.evaluate', { expression: "!!document.querySelector('.side-drawer-panel')", returnByValue: true })).result.value;
      assert.ok(!hasDrawerAfterSwitch, 'Journey 10: Drawer must close on clinic switch');

      // Assert Clinic B loaded its own data and does not have Clinic A's data
      const domTextB = (await call('Runtime.evaluate', { expression: "document.body.innerText", returnByValue: true })).result.value;
      assert.ok(domTextB.includes('محمود علي'), 'Journey 10: Clinic B data must be displayed');
      assert.ok(!domTextB.includes('أحمد محمد'), 'Journey 10: Clinic A data must NOT appear in Clinic B');

      // Switch back to Clinic A (A -> B -> A test)
      await call('Runtime.evaluate', {
        expression: `
          (() => {
            const sel = document.querySelector('#reception-current-practice');
            if (sel) {
              sel.value = 'c1';
              sel.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            }
          })()
        `,
      });
      for (let i = 0; i < 50; i++) {
        const hasAReloaded = await call('Runtime.evaluate', { expression: "document.body.innerText.includes('أحمد محمد')", returnByValue: true });
        if (hasAReloaded.result.value) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      const domTextAReloaded = (await call('Runtime.evaluate', { expression: "document.body.innerText", returnByValue: true })).result.value;
      assert.ok(domTextAReloaded.includes('أحمد محمد'), 'Journey 10: Clinic A data reloads cleanly upon switching back');
      assert.ok(!domTextAReloaded.includes('محمود علي'), 'Journey 10: Clinic B data does NOT leak back into Clinic A');

      await send('Target.closeTarget', { targetId });
      createdTargets.delete(targetId);
      console.log('PASS: Journey 10 — Clinic switching isolation (A -> B -> A & drawer auto-close)');
    }

    console.log('=== ALL P3 SYNTHETIC BROWSER JOURNEYS COMPLETED SUCCESSFULLY ===');
  } finally {
    for (const targetId of createdTargets) {
      await send('Target.closeTarget', { targetId }).catch(() => {});
    }
    socket.close();
  }
}

run().catch((err) => {
  console.error('Browser journeys failed:', err);
  process.exit(1);
});
