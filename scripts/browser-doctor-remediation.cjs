const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = 'http://localhost:4201';
const debug = 'http://127.0.0.1:9223';
const out = '.tmp/doctor-remediation-evidence';
const grants = [
  'DoctorOnboarding.ViewOwn',
  'DoctorPractices.ViewOwn',
  'DoctorProfile.ViewOwn',
  'DoctorPracticeReservations.ViewOwn',
  'PracticeTickets.View',
  'MedicalEncounters.ViewOwn',
  'Diagnoses.ViewOwn',
  'DoctorPatients.ViewOwn',
  'DoctorPatients.ViewHistoricalOwn',
  'Prescriptions.ViewOwn',
  'Prescriptions.ExportOwn',
  'Dashboards.Doctor.ViewOwn',
  'Reports.Doctor.ViewOwn',
  'Insights.Doctor.ViewOwn',
  'FinancialExpenses.ViewOwn',
  'FinancialExpenses.ManageOwn',
  'FinancialExpenses.SettleOwn',
  'SalaryPlans.ViewOwn',
  'SalaryPlans.ManageOwn',
  'SalaryObligations.ViewOwn',
  'DoctorRevenue.ViewOwn',
  'DoctorPracticePayments.ViewOwn',
];
const user = {
  applicationUserId: 'synthetic-doctor',
  userName: 'Doctor QA',
  userType: 'Doctor',
  roles: ['Doctor'],
  permissions: grants,
  isFirstLogin: false,
  doctorId: 'synthetic-doctor',
  patientId: null,
};
const clinic = {
  id: 'practice-qa',
  nameAr: '\u0639\u064a\u0627\u062f\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631',
  nameEn: 'QA clinic',
  isActive: true,
};
const metric = {
  metricCode: 'attendances',
  nameAr: '\u0627\u0644\u062d\u0636\u0648\u0631',
  nameEn: 'Attendance',
  value: 12,
  unit: '',
  eligibleSampleCount: 12,
};
const page = { items: [], totalCount: 0, pageNumber: 1, pageSize: 20 };
const calls = [],
  checks = [],
  errors = [];
let withFinanceData = false;
let rejectSettlement = true;
const plan = {
  id: 'plan-qa',
  kind: 'RecurringExpense',
  status: 'Active',
  effectiveFrom: '2026-10-01',
  rowVersion: 'plan-rv',
  revisions: [
    {
      revisionNumber: 1,
      amount: 100,
      currencyCode: 'EGP',
      descriptionAr: 'QA',
      descriptionEn: 'QA',
      dueDay: 10,
      amountPolicy: 'Fixed',
      category: 'Other',
    },
  ],
  availableActions: [
    { code: 'Revise', allowed: true },
    { code: 'End', allowed: true },
  ],
};
const obligation = {
  id: 'obligation-qa',
  planId: 'plan-qa',
  kind: 'RecurringExpense',
  status: 'Unpaid',
  dueBusinessDate: '2026-10-29',
  amount: 100,
  currencyCode: 'EGP',
  amountPolicy: 'Fixed',
  actualAmountConfirmed: true,
  descriptionAr: 'QA',
  descriptionEn: 'QA',
  rowVersion: 'obligation-rv',
  availableActions: [{ code: 'Settle', allowed: true }],
};
const settlement = {
  id: 'settlement-qa',
  obligationId: 'obligation-qa',
  receiptNumber: 'QA-REC-01',
  amount: 100,
  currencyCode: 'EGP',
  businessDate: '2026-10-29',
  obligationRowVersion: 'settled-rv',
  availableActions: [],
};
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const version = await fetch(debug + '/json/version').then((r) => r.json());
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let next = 0;
  const pending = new Map();
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++next;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  ws.onmessage = async (event) => {
    const m = JSON.parse(event.data);
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(m.error) : p.resolve(m.result);
      return;
    }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    if (m.method === 'Fetch.requestPaused') {
      const request = m.params.request;
      const path = new URL(request.url).pathname;
      let body = page;
      if (path.endsWith('/auth/me')) body = user;
      else if (path.endsWith('/me/onboarding'))
        body = { doctorId: 'synthetic-doctor', approvalStatus: 'Approved' };
      else if (path.endsWith('/me/practices')) body = [clinic];
      else if (path.endsWith('/dashboard/filter-options'))
        body = { practices: [clinic], defaultReportTimeZoneId: 'Africa/Cairo' };
      else if (path.endsWith('/dashboard/overview'))
        body = {
          metrics: [metric],
          dataFreshnessUtc: '2026-10-29T09:00:00Z',
          eligibleSampleCount: 12,
        };
      else if (path.endsWith('/reports/catalog'))
        body = [
          {
            reportCode: 'patients',
            titleAr: '\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0645\u0631\u0636\u0649',
            titleEn: 'Patients report',
            scope: 'Operational',
            canPreview: true,
            canDrillDown: true,
            allowedFilters: ['PracticeId', 'FromDate', 'ToDate'],
          },
        ];
      else if (path.endsWith('/reports/patients'))
        body = { metrics: [metric], eligibleSampleCount: 12 };
      else if (path.endsWith('/me/patients'))
        body = {
          ...page,
          summary: { allTimeUniquePatients: 0, attendedLast30Days: 0, returningPatients: 0 },
          asOfUtc: '2026-10-29T09:00:00Z',
        };
      else if (path.endsWith('/finance/filter-options'))
        body = {
          practices: [clinic],
          receptions: [],
          categories: [{ code: 'Other', nameAr: '\u0623\u062e\u0631\u0649', nameEn: 'Other' }],
          cadences: [{ code: 'Monthly', nameAr: '\u0634\u0647\u0631\u064a', nameEn: 'Monthly' }],
          amountPolicies: [{ code: 'Fixed', nameAr: '\u062b\u0627\u0628\u062a', nameEn: 'Fixed' }],
        };
      let status = 200;
      if (withFinanceData) {
        if (path.endsWith('/recurring-expense-plans'))
          body = { ...page, items: [plan], totalCount: 1 };
        else if (path.endsWith('/recurring-expense-plans/plan-qa')) body = plan;
        else if (path.endsWith('/recurring-expense-plans/plan-qa/obligations'))
          body = { ...page, items: [obligation], totalCount: 1 };
        else if (path.endsWith('/expenses/obligations/obligation-qa')) body = obligation;
        else if (
          path.endsWith('/expenses/obligations/obligation-qa/settle') &&
          request.method === 'POST'
        ) {
          if (rejectSettlement) {
            status = 503;
            body = { title: 'Temporary failure' };
            rejectSettlement = false;
          } else
            body = {
              id: 'write-qa',
              resourceType: 'ExpenseSettlement',
              settlementId: 'settlement-qa',
            };
        } else if (
          path.endsWith('/expense-settlements/settlement-qa') ||
          path.endsWith('/expense-settlements/settlement-qa/receipt')
        )
          body = settlement;
      }
      calls.push({
        method: request.method,
        path,
        status,
        idempotencyKey: request.headers['Idempotency-Key'] || request.headers['idempotency-key'],
      });
      await send(
        'Fetch.fulfillRequest',
        {
          requestId: m.params.requestId,
          responseCode: status,
          responseHeaders: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Access-Control-Allow-Origin', value: origin },
            { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,OPTIONS' },
            {
              name: 'Access-Control-Allow-Headers',
              value: 'authorization,content-type,accept-language,idempotency-key',
            },
          ],
          body: Buffer.from(JSON.stringify(body)).toString('base64'),
        },
        m.sessionId,
      );
    }
  };
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (m, p) => send(m, p, sessionId);
  const evaluate = async (expression) =>
    (await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result
      .value;
  const waitFor = async (expression) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression)) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('Timed out: ' + expression);
  };
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Fetch.enable', {
    patterns: [{ urlPattern: '*192.168.1.10:8085/*', requestStage: 'Request' }],
  });
  for (const lang of ['ar', 'en']) {
    await call('Page.addScriptToEvaluateOnNewDocument', {
      source: `sessionStorage.setItem('wasla.auth.session',${JSON.stringify(JSON.stringify({ accessToken: 'synthetic', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});localStorage.setItem('wasla_lang','${lang}');`,
    });
    for (const width of [360, 768, 1280]) {
      await call('Emulation.setDeviceMetricsOverride', {
        width,
        height: 950,
        deviceScaleFactor: 1,
        mobile: width === 360,
      });
      for (const [name, route, selector] of [
        ['dashboard', '/workspace/doctor', 'app-doctor-dashboard'],
        ['patients', '/doctor/patients', 'app-doctor-patients-directory'],
        ['reports', '/doctor/reports', 'app-doctor-reports'],
        ['expenses', '/doctor/expenses', 'app-operating-finance'],
        ['salaries', '/doctor/salaries', 'app-operating-finance'],
      ]) {
        await call('Page.navigate', { url: origin + route });
        await waitFor(`!!document.querySelector('${selector}')`);
        await new Promise((r) => setTimeout(r, 250));
        const layout = await evaluate(
          `({dir:document.documentElement.dir,width:innerWidth,content:document.documentElement.scrollWidth,text:document.querySelector('${selector}').innerText})`,
        );
        assert.equal(layout.dir, lang === 'ar' ? 'rtl' : 'ltr');
        assert.ok(
          layout.content <= width + 1,
          `${name} ${lang} ${width}: page overflow ${layout.content}`,
        );
        assert.ok(
          !/doctorRemediation\.[A-Za-z]|common\.(search|confirm|refresh|viewDetails)/.test(
            layout.text,
          ),
          `${name}: translation leak`,
        );
        const screenshot = await call('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });
        fs.writeFileSync(
          `${out}/${name}-${lang}-${width}.png`,
          Buffer.from(screenshot.data, 'base64'),
        );
        checks.push({ screen: name, lang, width, dir: layout.dir, overflow: false });
      }
    }
  }
  withFinanceData = true;
  await call('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 950,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await call('Page.navigate', { url: origin + '/doctor/expenses' });
  await waitFor("!!document.querySelector('app-operating-finance tbody button')");
  await evaluate("document.querySelector('app-operating-finance tbody button').click()");
  await waitFor("!!document.querySelector('.side-drawer-panel .actions .btn-primary')");
  await evaluate("document.querySelector('.side-drawer-panel .actions .btn-primary').click()");
  await waitFor(
    "!!document.querySelector('app-operating-finance tbody button') && !document.querySelector('.side-drawer-panel')",
  );
  await evaluate("document.querySelector('app-operating-finance tbody button').click()");
  await waitFor("!!document.querySelector('.side-drawer-panel .actions .btn-primary')");
  await evaluate("document.querySelector('.side-drawer-panel .actions .btn-primary').click()");
  await waitFor("!!document.querySelector('.side-drawer-panel form button.btn-primary')");
  await evaluate("document.querySelector('.side-drawer-panel form button.btn-primary').click()");
  await waitFor(
    "!!document.querySelector('.side-drawer-panel form .error-text') || !!document.querySelector('.side-drawer-panel .error-text')",
  );
  assert.equal(
    await evaluate("!!document.querySelector('.side-drawer-panel form')"),
    true,
    'failed settlement must keep form',
  );
  let screenshot = await call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${out}/settlement-failure.png`, Buffer.from(screenshot.data, 'base64'));
  await evaluate("document.querySelector('.side-drawer-panel form button.btn-primary').click()");
  await waitFor("document.querySelector('.side-drawer-panel')?.innerText.includes('QA-REC-01')");
  screenshot = await call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${out}/settlement-receipt.png`, Buffer.from(screenshot.data, 'base64'));
  const writes = calls.filter((c) => c.method === 'POST' && c.path.endsWith('/settle'));
  assert.equal(writes.length, 2);
  assert.ok(writes.every((c) => c.path.includes('/obligations/obligation-qa/')));
  assert.equal(writes[0].idempotencyKey, writes[1].idempotencyKey);
  checks.push({
    journey: 'Plan -> obligation -> failed settlement -> same-intent retry -> receipt',
    passed: true,
  });
  assert.ok(calls.some((c) => c.path.endsWith('/dashboard/overview')));
  assert.ok(calls.some((c) => c.path.endsWith('/reports/catalog')));
  assert.ok(calls.some((c) => c.path.endsWith('/recurring-expense-plans')));
  assert.ok(calls.some((c) => c.path.endsWith('/reception-salary-plans')));
  fs.writeFileSync(
    `${out}/results.json`,
    JSON.stringify(
      { mode: 'isolated contract fixtures; no production writes', checks, calls, errors },
      null,
      2,
    ),
  );
  await send('Target.closeTarget', { targetId });
  ws.close();
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(
    JSON.stringify({
      checks: checks.length,
      screenshots: checks.length,
      errors: errors.length,
      output: out,
    }),
  );
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
