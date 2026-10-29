// Isolated browser verification with synthetic medical records; no backend mutations.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const origin = 'http://localhost:4201';
const out = '.tmp/doctor-ui';
// Optional captured aggregate response; source data is never copied into the repository.
const reportFixture = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : null;
const clinic = {
  id: 'practice-qa',
  nameAr: 'عيادة الاختبار',
  nameEn: 'Test clinic',
  isActive: true,
};
const capabilities = Object.fromEntries(
  [
    'Attendances',
    'Encounters',
    'Diagnoses',
    'Prescriptions',
    'Appointments',
    'FollowUps',
    'LabRequests',
    'LabResults',
    'LabSubmissions',
    'RadiologyRequests',
    'RadiologyResults',
    'RadiologySubmissions',
  ].map((k) => ['canView' + k, true]),
);
const patients = ['ياسمين حسن', 'خالد حمدي', 'هبة عادل', 'أحمد محمود'].map((nameAr, i) => ({
  patientId: 'patient-' + i,
  nameAr,
  nameEn: ['Yasmin Hassan', 'Khaled Hamdy', 'Heba Adel', 'Ahmed Mahmoud'][i],
  phoneNumber: '01000000000',
  email: null,
  age: 30 + i,
  gender: i % 2 ? 'Male' : 'Female',
  dateOfBirth: '1990-01-01',
  firstAttendanceAtUtc: '2026-06-01T10:00:00Z',
  lastAttendanceAtUtc: '2026-10-27T14:30:00Z',
  lastAttendanceBusinessDate: '2026-10-27',
  attendanceCount: 3 + i,
  completedEncounterCount: 2,
  practiceCount: 1,
  lastPractice: clinic,
  hasUpcomingAppointment: i === 0,
  historicalOnly: false,
  capabilities,
}));
const metrics = [
  'الحجوزات المنشأة',
  'المواعيد المجدولة',
  'أحداث الإلغاء',
  'نسبة إلغاء المواعيد',
  'نسبة عدم الحضور',
  'متوسط الانتظار',
  'الكشوفات المكتملة',
  'إعادة الجدولة',
].map((nameAr, i) => ({
  metricCode: 'metric-' + i,
  nameAr,
  nameEn: [
    'Bookings created',
    'Scheduled appointments',
    'Cancellations',
    'Cancellation rate',
    'No-show rate',
    'Average wait',
    'Completed consultations',
    'Rescheduled',
  ][i],
  value: [276, 264, 36, 14.39, 16.81, 23, 120, 8][i],
  unit: i === 3 || i === 4 ? 'percent' : i === 5 ? 'minutes' : 'count',
}));
const user = {
  applicationUserId: 'qa',
  userName: 'Doctor QA',
  userType: 'Doctor',
  roles: ['Doctor'],
  isFirstLogin: false,
  doctorId: 'qa',
  patientId: null,
  permissions: [
    'Dashboards.Doctor.ViewOwn',
    'DoctorPatients.ViewOwn',
    'DoctorPatients.ViewHistoricalOwn',
    'DoctorPractices.ViewOwn',
    'DoctorProfile.ViewOwn',
    'PracticeTickets.View',
    'MedicalEncounters.ViewOwn',
    'DoctorPracticeReservations.ViewOwn',
    'Reports.Doctor.ViewOwn',
    'DoctorRevenue.ViewOwn',
    'Insights.Doctor.ViewOwn',
  ],
};
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const version = await fetch('http://127.0.0.1:9223/json/version').then((r) => r.json());
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let next = 0;
  const pending = new Map();
  const errors = [];
  const checks = [];
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++next;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  ws.onmessage = async ({ data }) => {
    const m = JSON.parse(data);
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(m.error) : p.resolve(m.result);
      return;
    }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    if (m.method !== 'Fetch.requestPaused') return;
    const path = new URL(m.params.request.url).pathname;
    let body = { items: [], totalCount: 0, pageNumber: 1, pageSize: 20 };
    if (path.endsWith('/auth/me')) body = user;
    else if (path.endsWith('/me/onboarding')) body = { doctorId: 'qa', approvalStatus: 'Approved' };
    else if (path.endsWith('/me/practices')) body = [clinic];
    else if (path.endsWith('/dashboard/filter-options'))
      body = { practices: [clinic], defaultReportTimeZoneId: 'Africa/Cairo' };
    else if (path.endsWith('/dashboard/overview'))
      body = reportFixture ?? { metrics, dataFreshnessUtc: '2026-10-29T09:00:00Z', warnings: [] };
    else if (path.endsWith('/reports/overview/drilldown'))
      body = {
        items: Array.from({ length: 20 }, (_, index) => ({
          reference: 'QA-' + (42 + index),
          businessDate: index < 10 ? '2026-10-27' : '2026-10-26',
          metricValue: 1,
          detailRoute: index % 3 === 0 ? '/api/v1/doctors/me/patients/patient-0' : null,
          availableActions: [{ code: 'View', allowed: index % 3 === 0 }],
        })),
        totalCount: 20,
        pageNumber: 1,
        pageSize: 20,
      };
    else if (path.endsWith('/me/patients'))
      body = {
        items: patients,
        totalCount: 4,
        pageNumber: 1,
        pageSize: 20,
        summary: { allTimeUniquePatients: 126, attendedLast30Days: 32, returningPatients: 48 },
        asOfUtc: '2026-10-29T09:00:00Z',
      };
    else if (path.endsWith('/patients/patient-0'))
      body = {
        patient: patients[0],
        practices: [clinic],
        lastAttendance: {
          ticketNumber: 42,
          ticketStatus: 'Completed',
          businessDate: '2026-10-27',
          practiceName: clinic.nameAr,
        },
        lastDiagnosis: null,
        lastPrescription: null,
        labRequestCount: 2,
        radiologyRequestCount: 0,
        nextAppointment: null,
        currentFollowUp: null,
      };
    await send(
      'Fetch.fulfillRequest',
      {
        requestId: m.params.requestId,
        responseCode: 200,
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Access-Control-Allow-Origin', value: origin },
          {
            name: 'Access-Control-Allow-Headers',
            value: 'authorization,content-type,accept-language',
          },
        ],
        body: Buffer.from(JSON.stringify(body)).toString('base64'),
      },
      m.sessionId,
    );
  };
  const { browserContextId } = await send('Target.createBrowserContext');
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (m, p) => send(m, p, sessionId);
  const evaluate = async (expression) => {
    const r = await call('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.text);
    return r.result.value;
  };
  const wait = async (expression) => {
    for (let i = 0; i < 120; i++) {
      if (await evaluate(expression)) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw Error('Timed out: ' + expression);
  };
  try {
    await call('Page.enable');
    await call('Runtime.enable');
    await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
    for (const lang of ['ar', 'en']) {
      const { identifier } = await call('Page.addScriptToEvaluateOnNewDocument', {
        source: `sessionStorage.setItem('wasla.auth.session',${JSON.stringify(JSON.stringify({ accessToken: 'synthetic', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});localStorage.setItem('wasla_lang','${lang}');`,
      });
      for (const width of [1440, 390]) {
        await call('Emulation.setDeviceMetricsOverride', {
          width,
          height: 1000,
          deviceScaleFactor: 1,
          mobile: width === 390,
        });
        for (const [name, route, ready] of [
          ['dashboard', '/workspace/doctor', '.metric-strip .metric-item'],
          ['patients', '/doctor/patients', '.patient-row'],
          ['record', '/doctor/patients?patientId=patient-0&tab=overview', '.clinical-entry'],
        ]) {
          await call('Page.navigate', { url: origin + route });
          await wait(`!!document.querySelector('${ready}')`);
          await evaluate('window.scrollTo(0,0)');
          await new Promise((r) => setTimeout(r, 300));
          const state = await evaluate(
            `(()=>{const p=document.querySelector('.side-drawer-panel');return {width:innerWidth,scroll:document.documentElement.scrollWidth,dir:document.documentElement.dir,drawerWidth:p?.getBoundingClientRect().width,drawerOverflow:p? p.scrollWidth>p.clientWidth:false,navOverflow:!!document.querySelector('.drawer-tabs')&&document.querySelector('.drawer-tabs').scrollWidth>document.querySelector('.drawer-tabs').clientWidth,text:document.body.innerText}})()`,
          );
          assert.ok(
            state.scroll <= width + 1,
            `${name} ${lang} ${width}: page overflow ${state.scroll}`,
          );
          assert.ok(!state.drawerOverflow, 'drawer overflow');
          assert.ok(!state.navOverflow, 'record navigation overflow');
          assert.ok(
            !/doctorWorkspace\.[a-zA-Z]|doctorDashboard\.[a-zA-Z]|doctorRemediation\.[a-zA-Z]/.test(
              state.text,
            ),
            'untranslated label',
          );
          if (name === 'dashboard') {
            assert.equal(
              await evaluate("document.querySelectorAll('.metric-strip .metric-item').length"),
              4,
            );
            assert.equal(
              await evaluate(
                "[...document.querySelectorAll('.quick-action--primary')].map(a=>a.getAttribute('href')).join(',')",
              ),
              '/doctor/queue,/doctor/encounters',
            );
          }
          const shot = await call('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false,
          });
          fs.writeFileSync(`${out}/${name}-${lang}-${width}.png`, Buffer.from(shot.data, 'base64'));
          if (name === 'dashboard' && reportFixture) {
            assert.equal(
              await evaluate("document.querySelectorAll('.performance-nav button').length"),
              6,
            );
            assert.equal(
              await evaluate("document.querySelectorAll('.activity-column').length"),
              reportFixture.series.length,
            );
            await evaluate(
              "window.scrollTo({top:document.querySelector('.overview-section').getBoundingClientRect().top+scrollY-75,behavior:'instant'})",
            );
            await new Promise((r) => setTimeout(r, 350));
            const overview = await call('Page.captureScreenshot', {
              format: 'png',
              captureBeyondViewport: false,
            });
            fs.writeFileSync(
              `${out}/dashboard-overview-${lang}-${width}.png`,
              Buffer.from(overview.data, 'base64'),
            );
            let metricCount = 0;
            for (let index = 0; index < 6; index++) {
              await evaluate(
                `document.querySelectorAll('.performance-nav button')[${index}].click()`,
              );
              await new Promise((r) => setTimeout(r, 50));
              metricCount += await evaluate("document.querySelectorAll('.metric-row').length");
            }
            assert.equal(
              metricCount,
              reportFixture.metrics.length,
              'all 52 metrics remain accessible',
            );
            await evaluate(
              "document.querySelectorAll('.performance-nav button')[0].click();window.scrollTo({top:document.querySelector('.performance-workspace').getBoundingClientRect().top+scrollY-75,behavior:'instant'})",
            );
            await new Promise((r) => setTimeout(r, 350));
            const metricsShot = await call('Page.captureScreenshot', {
              format: 'png',
              captureBeyondViewport: false,
            });
            fs.writeFileSync(
              `${out}/dashboard-metrics-${lang}-${width}.png`,
              Buffer.from(metricsShot.data, 'base64'),
            );
            await evaluate("document.querySelector('.metric-link').click()");
            await wait("!!document.querySelector('.drill-record')");
            assert.ok(
              await evaluate("document.querySelector('.drill-record').innerText.includes('QA-42')"),
            );
            assert.ok(
              await evaluate(
                "document.querySelector('.drill-record a').getAttribute('href').includes('/doctor/patients?patientId=patient-0')",
              ),
            );
            const detail = await call('Page.captureScreenshot', {
              format: 'png',
              captureBeyondViewport: false,
            });
            fs.writeFileSync(
              `${out}/dashboard-drilldown-${lang}-${width}.png`,
              Buffer.from(detail.data, 'base64'),
            );
            await evaluate("document.querySelector('.drawer-close-btn').click()");
            checks.push({ name: 'dashboard drilldown and source route', lang, width });
          }
          checks.push({ name, lang, width, drawerWidth: state.drawerWidth, overflow: false });
        }
      }
      await call('Page.removeScriptToEvaluateOnNewDocument', { identifier });
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      out + '/checks.json',
      JSON.stringify({ synthetic: true, checks, errors }, null, 2),
    );
    console.log(JSON.stringify({ checks: checks.length, errors, screenshots: out }));
  } finally {
    await send('Target.disposeBrowserContext', { browserContextId });
    ws.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
