// Read-only, synthetic browser checks for the Doctor's daily workspace.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const origin = 'http://localhost:4201';
const output = '.tmp/daily-responsive';
const widths = [
  320, 360, 390, 430, 576, 768, 820, 911, 1024, 1093, 1280, 1366, 1440, 1536, 1600, 1920, 2560,
];
if (process.argv.includes('--smoke')) widths.splice(0, widths.length, 320, 820, 1366);
const names = {
  nameAr: 'محمود عبد الرحمن محمد عبد الله',
  nameEn: 'Mahmoud Abdelrahman Mohamed Abdallah',
};
const practice = {
  id: 'p1',
  nameAr: 'عيادة د. سارة للأمراض الباطنة — القاهرة',
  nameEn: 'Dr Sara Internal Medicine Practice — Cairo',
  isActive: true,
};
const permissions = [
  ...fs.readFileSync('src/app/core/auth/permissions.ts', 'utf8').matchAll(/:\s*'([^']+)'/g),
].map((match) => match[1]);
permissions.push(
  'Dashboards.Doctor.ViewOwn',
  'DoctorPracticeReservations.ViewOwn',
  'Reports.Doctor.ViewOwn',
);
const user = {
  applicationUserId: 'synthetic',
  userName: 'Synthetic doctor',
  userType: 'Doctor',
  roles: ['Doctor'],
  permissions,
  isFirstLogin: false,
  doctorId: 'd1',
  patientId: null,
};
const patient = {
  patientId: 'patient-0',
  ...names,
  age: 43,
  gender: 'Female',
  phoneNumber: '01000000000',
  email: 'long.patient.email@example.invalid',
  dateOfBirth: '1983-07-16',
  firstAttendanceAtUtc: '2026-10-01T14:30:00Z',
  lastAttendanceAtUtc: '2026-10-27T14:30:00Z',
  lastAttendanceBusinessDate: '2026-10-27',
  attendanceCount: 3,
  completedEncounterCount: 2,
  practiceCount: 1,
  lastPractice: practice,
  historicalOnly: false,
  hasUpcomingAppointment: true,
  capabilities: {
    canViewAttendances: true,
    canViewEncounters: true,
    canViewDiagnoses: true,
    canViewPrescriptions: true,
    canViewAppointments: true,
    canViewFollowUps: true,
    canViewLabRequests: true,
    canViewRadiologyRequests: true,
  },
};
const reservation = {
  reservationId: 'r1',
  reference: 'SYNTHETIC-R-100',
  status: 'Confirmed',
  patient: { id: 'patient-0', ...names },
  doctor: { id: 'd1', nameAr: 'د. سارة أحمد', nameEn: 'Dr Sara Ahmed' },
  practice,
  doctorPracticeId: 'p1',
  appointment: { businessDate: '2026-10-29', slotStartTime: '17:00', durationMinutes: 15 },
  visitType: { nameAr: 'كشف جديد', nameEn: 'New consultation' },
  price: 300,
  currency: 'EGP',
  rowVersion: 'v1',
  capabilities: { canCancel: true, canReschedule: true },
  timeline: [],
  bookingSource: 'Online',
};
const ticket = {
  ticketId: 't1',
  ticketNumber: '42',
  status: 'Waiting',
  source: 'Reservation',
  practice,
  doctor: reservation.doctor,
  patient: reservation.patient,
  businessDate: '2026-10-29',
  lastUpdatedOnUtc: '2026-10-29T10:00:00Z',
  checkedInOnUtc: '2026-10-29T09:50:00Z',
  patientsAheadNow: 2,
  fastTrack: false,
  rowVersion: 'v1',
  callAttempts: [],
  timeline: [],
  operationalCapabilities: {
    canCancel: true,
    canRestore: true,
    canQueueMutate: true,
    canMutateOperationalRecord: true,
  },
};
const encounter = {
  encounterId: 'e1',
  ticketId: 't1',
  patient: reservation.patient,
  doctor: reservation.doctor,
  practice,
  status: 'InProgress',
  startedAtUtc: '2026-10-29T10:00:00Z',
  completedAtUtc: null,
  clinicalNotes: '',
  hasDiagnosis: false,
  hasFollowUpEligibility: false,
  diagnoses: [],
  rowVersion: 'v1',
  capabilities: {
    canEditClinicalNotes: true,
    canManageDiagnoses: true,
    canComplete: true,
    canCreateFollowUpEligibility: true,
    canManagePrescription: false,
    canManageLabRequest: false,
    canManageRadiologyRequest: false,
  },
};
const page = (items) => ({ items, totalCount: items.length, pageNumber: 1, pageSize: 20 });
const metrics = [
  ['AppointmentsScheduled', 'المواعيد المجدولة', 'Scheduled appointments', 264],
  ['CheckIns', 'الحضور', 'Check-ins', 137],
  ['ClinicalWorkflowCompleted', 'الكشوفات المكتملة', 'Completed consultations', 116],
  ['NetCollected', 'صافي التحصيل', 'Net collections', 69521],
  ['Waiting', 'المنتظرون', 'Waiting', 12],
  ['ServiceDuration', 'مدة الكشف', 'Consultation duration', 20],
  ['OpenHandovers', 'تسليمات مفتوحة', 'Open handovers', 3],
].map(([metricCode, nameAr, nameEn, value]) => ({
  metricCode,
  nameAr,
  nameEn,
  value,
  unit: metricCode === 'NetCollected' ? 'EGP' : 'count',
  availableActions: [
    {
      code: 'Drilldown',
      allowed: true,
      route: `/api/v1/doctors/me/reports/overview/drilldown?metricCode=${metricCode}&practiceId=p1&fromDate=2026-10-01&toDate=2026-10-29`,
    },
  ],
}));
function response(path) {
  if (path.endsWith('/auth/me')) return user;
  if (path.endsWith('/me/onboarding')) return { doctorId: 'd1', approvalStatus: 'Approved' };
  if (path.endsWith('/me/practices')) return [practice];
  if (path.endsWith('/dashboard/filter-options'))
    return { practices: [practice], defaultReportTimeZoneId: 'Africa/Cairo' };
  if (path.endsWith('/dashboard/overview'))
    return {
      reportCode: 'overview',
      metrics,
      window: { fromDate: '2026-10-01', toDate: '2026-10-29' },
      dataFreshnessUtc: '2026-10-29T10:00:00Z',
      warnings: [],
      series: Array.from({ length: 29 }, (_, index) => ({
        key: `2026-10-${String(index + 1).padStart(2, '0')}`,
        metrics: [{ metricCode: 'CheckIns', value: index % 8 }],
      })),
    };
  if (path.endsWith('/drilldown'))
    return page([{ reference: 'QA-42', businessDate: '2026-10-27', metricValue: 1 }]);
  if (path.endsWith('/me/patients'))
    return {
      ...page([patient, { ...patient, patientId: 'patient-1', phoneNumber: null }]),
      summary: { allTimeUniquePatients: 277, attendedLast30Days: 32, returningPatients: 48 },
    };
  if (path.endsWith('/patients/patient-0'))
    return {
      patient,
      practices: [practice],
      lastAttendance: null,
      lastDiagnosis: null,
      lastPrescription: null,
      labRequestCount: 2,
      radiologyRequestCount: 0,
      nextAppointment: null,
      currentFollowUp: null,
    };
  if (path.endsWith('/reservations/metadata'))
    return {
      statuses: [{ code: 'Confirmed', nameAr: 'مؤكد', nameEn: 'Confirmed' }],
      bookingSources: [],
      patientCancellationReasons: [],
      providerCancellationReasons: [],
      maximumAdvanceBookingDays: 30,
      maxPatientReschedulesPerReservation: 2,
    };
  if (path.endsWith('/reservations/filter-options'))
    return { statuses: [], bookingSources: [], segments: [] };
  if (path.endsWith('/reservations/r1')) return reservation;
  if (path.endsWith('/reservations')) return page([reservation]);
  if (path.endsWith('/queue'))
    return {
      inProgress: null,
      called: null,
      waiting: [ticket, { ...ticket, ticketId: 't2', ticketNumber: '43' }],
      noShow: [],
    };
  if (path.endsWith('/tickets/t1')) return ticket;
  if (path.endsWith('/encounters/e1')) return encounter;
  if (path.endsWith('/encounters')) return page([encounter]);
  if (path.endsWith('/amendments')) return [];
  return page([]);
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const version = await fetch('http://127.0.0.1:9223/json/version').then((r) => r.json());
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let next = 0;
  const pending = new Map();
  const errors = [];
  const results = [];
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
    if (m.method === 'Runtime.exceptionThrown')
      errors.push(
        m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text,
      );
    if (m.method !== 'Fetch.requestPaused') return;
    const url = new URL(m.params.request.url);
    // Never allow a state-changing API call during layout checks.
    assert.ok(
      ['GET', 'OPTIONS'].includes(m.params.request.method),
      'unexpected mutation ' + url.pathname,
    );
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
        body: Buffer.from(JSON.stringify(response(url.pathname))).toString('base64'),
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
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails)
      throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const wait = async (expression) => {
    for (let index = 0; index < 100; index++) {
      if (await evaluate(expression)) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw Error('Timeout ' + expression);
  };
  const cases = [
    ['dashboard', '/workspace/doctor', '.metric-row'],
    ['patients', '/doctor/patients', '.patient-row'],
    ['reservations', '/doctor/reservations?practiceId=p1', '.table-row'],
    ['queue', '/doctor/queue?practiceId=p1', '.ticket-cell-main'],
    ['encounters', '/doctor/encounters?practiceId=p1', '.table-data-row'],
  ];
  const inspect = async (name, lang, width) => {
    await new Promise((r) => setTimeout(r, 100));
    const layout = await evaluate(
      `(()=>{const panel=document.querySelector('.side-drawer-panel');const scope=panel||document.querySelector('.portal-content-body');const visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0;const overflows=[...scope.querySelectorAll('table,.filters-form,.options-row,.queue-actions,.practice-selector-row,.encounter-tabs-bar,.drawer-tabs')].filter(visible).filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.className);const actions=[...scope.querySelectorAll('.action-buttons button,.td-actions button,.ticket-cell-actions button,.metric-link')].filter(visible).filter(e=>{const r=e.getBoundingClientRect();const s=scope.getBoundingClientRect();return r.left<s.left-1||r.right>s.right+1}).map(e=>e.className);return {pageOverflow:document.documentElement.scrollWidth>innerWidth+1,drawerOverflow:!!panel&&panel.scrollWidth>panel.clientWidth+1,overflows,actions,dir:document.documentElement.dir}})()`,
    );
    results.push({ name, lang, width, ...layout });
    if (
      layout.overflows.length ||
      layout.actions.length ||
      layout.pageOverflow ||
      layout.drawerOverflow
    ) {
      const shot = await call('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      fs.writeFileSync(output + '/failure.png', Buffer.from(shot.data, 'base64'));
      console.log(
        await evaluate(
          `(()=>{const t=document.querySelector('.directory-table');if(!t)return '';return [...t.querySelectorAll('th,td')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>({text:e.innerText,width:e.clientWidth,scroll:e.scrollWidth,children:[...e.querySelectorAll('*')].filter(x=>x.scrollWidth>x.clientWidth+2).map(x=>({class:x.className,width:x.clientWidth,scroll:x.scrollWidth}))}))})()`,
        ),
      );
    }
    assert.ok(
      !layout.pageOverflow && !layout.drawerOverflow,
      `${name} ${lang} ${width}: page/drawer overflow`,
    );
    assert.deepEqual(layout.overflows, [], `${name} ${lang} ${width}: internal overflow`);
    assert.deepEqual(layout.actions, [], `${name} ${lang} ${width}: action outside content`);
    if ([320, 820, 1093, 1366, 1920].includes(width)) {
      const shot = await call('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      fs.writeFileSync(`${output}/${name}-${lang}-${width}.png`, Buffer.from(shot.data, 'base64'));
    }
  };
  try {
    await call('Page.enable');
    await call('Runtime.enable');
    await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
    for (const lang of ['ar', 'en']) {
      const { identifier } = await call('Page.addScriptToEvaluateOnNewDocument', {
        source: `sessionStorage.setItem('wasla.auth.session',${JSON.stringify(JSON.stringify({ accessToken: 'synthetic', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});localStorage.setItem('wasla_lang','${lang}');localStorage.removeItem('wasla_portal_sidebar_collapsed');`,
      });
      for (const width of widths) {
        await call('Emulation.setDeviceMetricsOverride', {
          width,
          height:
            width === 911
              ? 512
              : width === 1093
                ? 614
                : width < 768
                  ? 900
                  : width <= 1440
                    ? 720
                    : 1080,
          deviceScaleFactor: 1,
          mobile: width < 576,
        });
        for (const [name, path, ready] of cases) {
          await call('Page.navigate', { url: origin + path });
          await wait(`!!document.querySelector('${ready}')`);
          await evaluate("window.scrollTo({top:0,behavior:'instant'})");
          await inspect(name, lang, width);
          if (name === 'patients' && [320, 820, 1366].includes(width)) {
            await evaluate("document.querySelector('.advanced-filters summary').click()");
            await inspect(name + '-filters', lang, width);
          }
          if ([320, 820, 1366, 1920].includes(width)) {
            const opener = {
              dashboard: '.metric-link',
              patients: '.action-buttons button',
              reservations: '.btn-inspect-action',
              queue: '.ticket-cell-main',
              encounters: '.btn-inspect-action',
            }[name];
            await evaluate(`document.querySelector('${opener}').click()`);
            await wait("!!document.querySelector('.side-drawer-panel')");
            await new Promise((r) => setTimeout(r, 200));
            await inspect(name + '-drawer', lang, width);
          }
          if (width === 1366) {
            // Expanded and collapsed laptop sidebar must both preserve the page's actions.
            await evaluate(
              "document.querySelector('.drawer-close-btn')?.click();document.querySelector('.btn-sidebar-collapse')?.click()",
            );
            await new Promise((r) => setTimeout(r, 300));
            await inspect(name + '-compact-sidebar', lang, width);
          }
        }
      }
      await call('Page.removeScriptToEvaluateOnNewDocument', { identifier });
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ checks: results.length, errors, output }));
  } finally {
    fs.writeFileSync(
      output + '/checks.json',
      JSON.stringify({ synthetic: true, results, errors }, null, 2),
    );
    await send('Target.disposeBrowserContext', { browserContextId });
    ws.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
