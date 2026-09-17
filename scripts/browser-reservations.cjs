const fs = require('fs'),
  assert = require('node:assert/strict');
const origin = 'http://localhost:4201';
const clinic = {
  id: 'clinic',
  nameAr: 'عيادة اختبار',
  nameEn: 'Synthetic test clinic',
  isActive: true,
  permissionCodes: [
    'PracticeReservations.View',
    'PracticeReservations.Create',
    'PracticeReservations.Cancel',
    'PracticeReservations.Reschedule',
    'PracticeReservations.RestoreNoShow',
    'Patients.SearchBasic',
    'Patients.Register',
  ],
};
const patient = {
  patientId: 'p1',
  nameAr: 'مريض اختبار',
  nameEn: 'Synthetic patient',
  dateOfBirth: '1990-01-01',
  gender: 'Male',
  isSelf: true,
  relationshipType: null,
};
const reservation = {
  reservationId: 'r1',
  reference: 'SYNTHETIC-R-100',
  status: 'Confirmed',
  isLate: true,
  patient: { id: 'p1', nameAr: patient.nameAr, nameEn: patient.nameEn },
  doctor: { id: 'd1', nameAr: 'طبيب اختبار', nameEn: 'Synthetic doctor' },
  practice: clinic,
  doctorPracticeId: 'clinic',
  appointment: { businessDate: '2026-09-20', slotStartTime: '17:00', durationMinutes: 15 },
  price: 300,
  currency: 'EGP',
  bookingNote: 'PRIVATE NOTE',
  capabilities: { canCancel: true, canReschedule: true, canRestoreFromNoShow: true },
  timeline: [
    { occurredOnUtc: '2026-09-17T09:00:00Z', nameAr: 'تم الحجز', nameEn: 'Reservation created' },
  ],
  rowVersion: 'v1',
};
const metadata = {
  statuses: [
    { code: 'Confirmed', nameAr: 'مؤكد', nameEn: 'Confirmed' },
    { code: 'Cancelled', nameAr: 'ملغي', nameEn: 'Cancelled' },
  ],
  bookingSources: [{ code: 'Online', nameAr: 'إلكتروني', nameEn: 'Online' }],
  patientCancellationReasons: [
    { code: 'Other', nameAr: 'أخرى', nameEn: 'Other', requiresComment: true },
  ],
  providerCancellationReasons: [
    { code: 'Other', nameAr: 'أخرى', nameEn: 'Other', requiresComment: true },
  ],
  maximumAdvanceBookingDays: 30,
  maxPatientReschedulesPerReservation: 2,
};
async function main() {
  const v = await fetch('http://127.0.0.1:9240/json/version').then((r) => r.json());
  const socket = new WebSocket(v.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  const pending = new Map();
  let seq = 0;
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  const users = new Map();
  const requests = [];
  socket.onmessage = async (e) => {
    const m = JSON.parse(e.data);
    if (m.id) {
      const c = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) c.reject(new Error(JSON.stringify(m.error)));
      else c.resolve(m.result);
    }
    if (m.method === 'Fetch.requestPaused') {
      const r = m.params,
        u = new URL(r.request.url),
        p = u.pathname;
      let data = [];
      requests.push({ method: r.request.method, path: p });
      if (p.endsWith('/auth/me')) data = users.get(m.sessionId);
      else if (p.endsWith('/metadata')) data = metadata;
      else if (p.endsWith('/bookable-patients')) data = [patient];
      else if (p.endsWith('/filter-options'))
        data = {
          statuses: metadata.statuses,
          bookingSources: metadata.bookingSources,
          segments: [{ id: 's1', nameAr: 'عادي', nameEn: 'Standard' }],
        };
      else if (p.endsWith('/reception/practices') || p.endsWith('/doctors/me/practices'))
        data = [clinic];
      else if (p.endsWith('/available-dates')) data = [{ date: '2026-09-20', isAvailable: true }];
      else if (p.endsWith('/available-slots'))
        data = [{ date: '2026-09-20', time: '17:00', slotDurationMinutes: 15 }];
      else if (p.endsWith('/booking-options') || p.endsWith('/booking/options'))
        data = {
          practiceId: 'clinic',
          date: '2026-09-20',
          time: '17:00',
          visitTypes: [
            {
              visitTypeId: 'v1',
              type: 'NewConsultation',
              nameAr: 'كشف جديد',
              nameEn: 'New consultation',
              segments: [
                {
                  segmentId: 's1',
                  nameAr: 'عادي',
                  nameEn: 'Standard',
                  price: 300,
                  isDefault: true,
                },
              ],
            },
          ],
        };
      else if (p.endsWith('/r1')) data = reservation;
      else if (/\/(cancel|reschedule|restore-no-show)$/.test(p) && r.request.method === 'POST')
        data = { ...reservation, rowVersion: 'v2' };
      else if (p.endsWith('/reservations') && r.request.method === 'POST') data = reservation;
      else if (p.endsWith('/mine') || p.endsWith('/reservations'))
        data = {
          items: [reservation],
          totalCount: 1,
          pageNumber: 1,
          pageSize: 20,
          summary: { Confirmed: 1 },
        };
      else if (p.endsWith('/patients/search'))
        data = { items: [patient], totalCount: 1, pageNumber: 1, pageSize: 20 };
      await send(
        'Fetch.fulfillRequest',
        {
          requestId: r.requestId,
          responseCode: 200,
          responseHeaders: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Access-Control-Allow-Origin', value: origin },
            { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
            {
              name: 'Access-Control-Allow-Headers',
              value: 'authorization,content-type,idempotency-key,accept-language',
            },
          ],
          body: Buffer.from(JSON.stringify(data)).toString('base64'),
        },
        m.sessionId,
      );
    }
  };
  const results = [];
  fs.mkdirSync('docs/browser-verification/reservations', { recursive: true });
  try {
    for (const actor of ['Patient', 'Reception', 'Doctor', 'Admin'])
      for (const lang of ['ar', 'en'])
        for (const width of [1440, 390]) {
          const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
          const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
          const call = (m, p) => send(m, p, sessionId);
          const evaluate = async (expression) =>
            (
              await call('Runtime.evaluate', {
                expression,
                returnByValue: true,
                awaitPromise: true,
              })
            ).result.value;
          async function wait(expression) {
            for (let i = 0; i < 100; i++) {
              if (await evaluate(expression)) return;
              await new Promise((r) => setTimeout(r, 100));
            }
            throw Error('Timeout ' + actor + ' ' + expression);
          }
          const user = {
            applicationUserId: 'synthetic-user',
            userName: 'Synthetic test user',
            email: 'test@example.invalid',
            phoneNumber: null,
            userType: actor === 'Admin' ? 'SuperAdmin' : actor,
            roles: [actor],
            permissions:
              actor === 'Admin'
                ? ['Reservations.ViewAdministrative']
                : actor === 'Doctor'
                  ? [
                      'DoctorPracticeReservations.ViewOwn',
                      'DoctorPracticeReservations.CancelOwn',
                      'DoctorPracticeReservations.RescheduleOwn',
                    ]
                  : clinic.permissionCodes,
            isFirstLogin: false,
            doctorId: null,
            patientId: actor === 'Patient' ? 'p1' : null,
          };
          users.set(sessionId, user);
          await call('Page.enable');
          await call('Emulation.setDeviceMetricsOverride', {
            width,
            height: 900,
            deviceScaleFactor: 1,
            mobile: width < 500,
          });
          await call('Page.addScriptToEvaluateOnNewDocument', {
            source: `sessionStorage.setItem('wasla.auth.session',${JSON.stringify(JSON.stringify({ accessToken: 'synthetic-not-a-real-token', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user }))});localStorage.setItem('wasla_lang','${lang}');`,
          });
          await call('Fetch.enable', {
            patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }],
          });
          await call('Page.navigate', {
            url: origin + '/' + actor.toLowerCase() + '/reservations?practiceId=clinic',
          });
          await wait(
            "document.querySelectorAll('tbody tr').length===1 && document.body.innerText.includes('SYNTHETIC-R-100')",
          );
          assert.equal(
            await evaluate('document.documentElement.dir'),
            lang === 'ar' ? 'rtl' : 'ltr',
          );
          assert.equal(
            await evaluate('document.documentElement.scrollWidth<=innerWidth'),
            true,
            'list overflow',
          );
          await evaluate("document.querySelector('tbody button').click()");
          await wait("!!document.querySelector('app-reservation-details')");
          assert.equal(await evaluate("document.querySelector('dialog').open"), true);
          if (actor === 'Admin') {
            assert.equal(
              await evaluate("document.querySelector('dialog').innerText.includes('PRIVATE NOTE')"),
              false,
            );
            assert.equal(
              await evaluate("document.querySelectorAll('app-reservation-details button').length"),
              0,
            );
          } else {
            assert.ok(
              await evaluate(
                "document.querySelectorAll('app-reservation-details button').length>0",
              ),
            );
            await evaluate("document.querySelector('app-reservation-details button').click()");
            await wait("!!document.querySelector('app-reservation-editor')");
            assert.equal(
              await evaluate(
                "document.querySelector('app-reservation-editor button[type=submit]').disabled",
              ),
              true,
            );
          }
          assert.equal(
            await evaluate('document.documentElement.scrollWidth<=innerWidth'),
            true,
            'drawer overflow',
          );
          const shot = await call('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: true,
          });
          fs.writeFileSync(
            'docs/browser-verification/reservations/' +
              actor.toLowerCase() +
              '-' +
              lang +
              '-' +
              width +
              '.png',
            Buffer.from(shot.data, 'base64'),
          );
          results.push({
            actor,
            lang,
            width,
            checks: [
              'server list',
              'direction',
              'drawer dialog',
              'capability actions',
              'invalid cancellation blocked',
              'no overflow',
              ...(actor === 'Admin' ? ['booking note hidden', 'read-only'] : []),
            ],
          });
          await send('Target.closeTarget', { targetId });
        }
    fs.writeFileSync(
      'docs/browser-verification/reservations/results.json',
      JSON.stringify({ fixtures: true, synthetic: true, origin, results, requests }, null, 2),
    );
    console.log(JSON.stringify(results));
  } finally {
    socket.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
