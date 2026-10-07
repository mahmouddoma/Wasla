// Synthetic responses only. No requests reach the live API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.WASLA_ORIGIN || 'http://127.0.0.1:4201';
const debug = process.env.WASLA_DEBUG_ORIGIN || 'http://127.0.0.1:9244';
const output = process.env.WASLA_OUTPUT || 'docs/browser-verification/responsive/portal';
const widths = [320, 390, 576, 768, 820, 1024, 1280, 1440];
const permissions = [
  ...fs.readFileSync('src/app/core/auth/permissions.ts', 'utf8').matchAll(/:\s*'([^']+)'/g),
].map((m) => m[1]);
permissions.push('DoctorPracticeReservations.ViewOwn');
const label = {
  nameAr: 'بيانات اختبار باسم طويل للتأكد من عرض المعلومات كاملة',
  nameEn: 'Synthetic record with a long name for responsive verification',
};
const practice = {
  id: 'p1',
  ...label,
  isActive: true,
  hasLogo: false,
  rowVersion: 'v1',
  governorate: { id: 1, ...label },
  city: { id: 1, ...label },
  area: null,
  detailedAddress: 'Synthetic address',
  latitude: null,
  longitude: null,
};
const profile = {
  patientId: 'u1',
  ...label,
  phoneNumber: '01012345678',
  email: 'synthetic.long.address@example.invalid',
  gender: 'Male',
  dateOfBirth: '1995-03-10',
  hasProfileImage: false,
  rowVersion: 'v1',
};
const reception = {
  id: 'r1',
  applicationUserId: 'r1',
  userName: 'synthetic.reception',
  ...label,
  email: profile.email,
  phoneNumber: profile.phoneNumber,
  rowVersion: 'v1',
  assignments: [],
};
const page = (items) => ({ items, totalCount: items.length, pageNumber: 1, pageSize: 20 });
const doctor = {
  doctorId: 'd1',
  ...label,
  profileImageUrl: null,
  specializations: [],
  practices: [{ ...practice, publicSearchPrice: 300, isBookable: true, isToday: false }],
  bio: 'Synthetic biography',
  qualifications: [],
};
const cases = [
  ['Reception', 'workspace/reception', 'app-workspace'],
  ['Doctor', 'workspace/doctor', 'app-workspace'],
  ['Doctor', 'doctor/practices', 'app-doctor-practices'],
  ['Doctor', 'doctor/practices/p1', 'app-doctor-practices'],
  ['Doctor', 'doctor/practices/p1#schedule', 'app-doctor-practices'],
  ['Doctor', 'doctor/practices/p1#operations', 'app-doctor-practices'],
  ['Doctor', 'doctor/practices/p1#segments', 'app-doctor-practices'],
  ['Doctor', 'doctor/profile', 'app-doctor-profile'],
  ['Doctor', 'doctor/receptions', 'app-doctor-receptions'],
  ['Doctor', 'doctor/onboarding', 'app-doctor-onboarding'],
  ['Patient', 'workspace/patient', 'app-workspace'],
  ['Patient', 'patient/profile', 'app-patient-profile'],
  ['Patient', 'patient/family', 'app-patient-family'],
  ['Patient', 'patient/tickets', 'app-patient-tickets'],
  ['Patient', 'patient/follow-ups', 'app-follow-up-list'],
  ['Doctor', 'doctor/reservations', 'app-reservation-workspace'],
  ['Patient', 'patient/reservations', 'app-reservation-workspace'],
  ['Doctor', 'doctor/queue', 'app-queue-workspace'],
  ['Doctor', 'doctor/finance', 'app-finance-workspace'],
  ['Doctor', 'doctor/revenue', 'app-finance-workspace'],
  ['Patient', 'patient/finance', 'app-finance-workspace'],
  ['Anonymous', 'doctors', 'app-public-doctors'],
  ['Patient', 'doctors', 'app-public-doctors'],
  ['Anonymous', 'doctors/d1', 'app-public-doctor-details'],
  ['Patient', 'doctors/d1', 'app-public-doctor-details'],
  ['Anonymous', 'register/patient', 'app-patient-registration'],
  ['Anonymous', 'register/doctor', 'app-doctor-registration'],
  ['Anonymous', 'forgot-password', 'app-forgot-password'],
  ['Anonymous', 'privacy', 'app-privacy-policy'],
  ['Anonymous', 'terms', 'app-terms-of-service'],
  ['Anonymous', 'help', 'app-help-support'],
];

function response(path, state) {
  const list = (items) => (state === 'empty' ? [] : items);
  if (path.endsWith('/reception/practices'))
    return list([{ ...practice, permissionCodes: permissions }]);
  if (path.endsWith('/onboarding'))
    return {
      doctorId: 'd1',
      approvalStatus: 'Pending',
      approvedOnUtc: null,
      hasProfileImage: false,
      rowVersion: 'v1',
    };
  if (path.endsWith('/doctors/me/practices')) return list([practice]);
  if (path.endsWith('/doctors/me/practices/p1')) return practice;
  if (path.endsWith('/receptions/assignable-permissions')) return [];
  if (path.endsWith('/receptions') || path.endsWith('/receptions/r1'))
    return path.endsWith('/r1') ? reception : list([reception]);
  if (path.endsWith('/specializations/options'))
    return [{ medicalSpecializationId: 's1', id: 's1', ...label }];
  if (path.endsWith('/specializations')) return { items: [] };
  if (path.endsWith('/specialization-request')) return null;
  if (path.endsWith('/practice-location')) return { doctorId: 'd1', ...practice, rowVersion: 'v1' };
  if (path.endsWith('/doctors/me/profile'))
    return { doctorId: 'd1', bio: 'Synthetic biography', rowVersion: 'v1' };
  if (path.endsWith('/patients/me')) return profile;
  if (path.endsWith('/patients/me/contacts'))
    return list([
      {
        contactId: 'c1',
        ...label,
        phoneNumber: profile.phoneNumber,
        relationshipType: 'Guardian',
        isPrimary: true,
        linkedPatientId: null,
      },
    ]);
  if (path.endsWith('/families/mine'))
    return { familyId: 'f1', familyName: 'Synthetic family', members: [], rowVersion: 'v1' };
  if (
    path.includes('family-relationship-requests') ||
    path.endsWith('/follow-up-eligibilities') ||
    path.endsWith('/tickets')
  )
    return page([]);
  if (path.endsWith('/governorates') || path.endsWith('/cities') || path.endsWith('/areas'))
    return [{ id: 1, ...label }];
  if (path.endsWith('/schedule')) return { periods: [], exceptions: [] };
  if (path.endsWith('/configuration'))
    return {
      rowVersion: 'v1',
      timeZoneId: 'Africa/Cairo',
      allowOnlineBooking: true,
      allowWalkIn: true,
      defaultSlotDurationMinutes: 20,
      maximumTicketCallAttempts: 3,
      checkInGracePeriodMinutes: 10,
      patientSelfCancellationCutoffMinutes: 60,
      maximumDailyPatients: null,
      noShowAfterPassedPatientsCount: 5,
    };
  if (path.endsWith('/branding'))
    return {
      id: 'b1',
      doctorPracticeId: 'p1',
      hasLogo: false,
      primaryColor: null,
      secondaryColor: null,
      backgroundColor: null,
      textColor: null,
      rowVersion: 'v1',
    };
  if (path.endsWith('/metadata'))
    return {
      statuses: [],
      bookingSources: [],
      patientCancellationReasons: [],
      providerCancellationReasons: [],
      maximumAdvanceBookingDays: 30,
      maxPatientReschedulesPerReservation: 2,
    };
  if (path.endsWith('/filter-options')) return { statuses: [], bookingSources: [], segments: [] };
  if (path.endsWith('/bookable-patients'))
    return [{ patientId: profile.patientId, ...label, relationshipType: 'Self' }];
  if (
    path.endsWith('/reservations') ||
    path.endsWith('/financial-transactions') ||
    path.includes('/follow-up-eligibilities/mine')
  )
    return page([]);
  if (path.endsWith('/queue')) return { inProgress: null, called: null, waiting: [], noShow: [] };
  if (path.endsWith('/revenue/dashboard'))
    return {
      summary: {
        grossRevenue: 0,
        totalRefunds: 0,
        netRevenue: 0,
        paymentCount: 0,
        refundCount: 0,
        currencyCode: 'EGP',
      },
      dailyTrend: [],
      byPractice: [],
      paymentMethods: [],
      refundMethods: [],
      bySegment: [],
      byVisitType: [],
    };
  if (path.endsWith('/public/doctors/d1')) return doctor;
  if (path.endsWith('/public/doctors')) return page(list([doctor]));
  return [];
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const version = await fetch(debug + '/json/version').then((r) => r.json());
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let sequence = 0;
  const pending = new Map(),
    contexts = new Map(),
    results = [],
    failures = [],
    targets = new Set();
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(Error('CDP timeout: ' + method));
      }, 15000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  socket.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const task = pending.get(message.id);
      if (task) {
        clearTimeout(task.timer);
        pending.delete(message.id);
        message.error
          ? task.reject(Error(JSON.stringify(message.error)))
          : task.resolve(message.result);
      }
    }
    const context = contexts.get(message.sessionId);
    if (message.method === 'Runtime.exceptionThrown' && context)
      context.errors.push(message.params.exceptionDetails);
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params;
      const path = new URL(request.url).pathname;
      context.requests.push({ path, method: request.method });
      const periodMutation =
        process.env.WASLA_MUTATIONS === 'schedule' &&
        request.method === 'POST' &&
        path.endsWith('/schedule/periods');
      const mutationFailure = periodMutation && context.failMutation;
      const failure =
        mutationFailure ||
        (context.state === 'error' && !path.endsWith('/auth/me') && !path.includes('/public/'));
      let data = path.endsWith('/auth/me')
        ? context.user
        : failure
          ? { code: 'SYNTHETIC_ERROR' }
          : response(path, context.state);
      if (periodMutation && !mutationFailure) {
        const period = {
          ...JSON.parse(request.postData),
          id: 'period-' + context.periods.length,
          rowVersion: 'v2',
        };
        context.periods.push(period);
        data = period;
      } else if (process.env.WASLA_MUTATIONS === 'schedule' && path.endsWith('/schedule')) {
        data = { periods: context.periods, exceptions: [] };
      }
      if (mutationFailure) data = { detail: 'common.requestFailed' };
      try {
        if (periodMutation) await new Promise((resolve) => setTimeout(resolve, 500));
        await send(
          'Fetch.fulfillRequest',
          {
            requestId,
            responseCode: failure ? 503 : 200,
            responseHeaders: [
              { name: 'content-type', value: 'application/json' },
              { name: 'Access-Control-Allow-Origin', value: '*' },
              { name: 'Access-Control-Allow-Headers', value: '*' },
              { name: 'Access-Control-Allow-Methods', value: '*' },
            ],
            body: Buffer.from(JSON.stringify(data)).toString('base64'),
          },
          message.sessionId,
        );
      } catch (error) {
        context.errors.push({ description: error.message });
      }
    }
  };
  try {
    for (const [actor, route, selector] of cases.filter(
      (c) => !process.env.WASLA_ROUTES || process.env.WASLA_ROUTES.split(',').includes(c[1]),
    ))
      for (const language of ['ar', 'en']) {
        const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
        targets.add(targetId);
        const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
        const user = {
          applicationUserId: 'u1',
          userName: 'Synthetic user',
          email: profile.email,
          phoneNumber: null,
          userType: actor,
          roles: [actor],
          permissions,
          isFirstLogin: false,
          doctorId: actor === 'Doctor' ? 'd1' : null,
          patientId: actor === 'Patient' ? 'u1' : null,
        };
        const context = {
          user,
          state: process.env.WASLA_STATE || 'populated',
          requests: [],
          errors: [],
          periods: [],
          failMutation: false,
        };
        contexts.set(sessionId, context);
        const call = (method, params) => send(method, params, sessionId);
        const evaluate = async (expression) => {
          const result = await call('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true,
          });
          if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
          return result.result.value;
        };
        try {
          await call('Page.enable');
          await call('Runtime.enable');
          await call('Fetch.enable', {
            patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }],
          });
          const storedSession = JSON.stringify({
            accessToken: 'synthetic-not-real',
            expiresOnUtc: '2099-01-01T00:00:00Z',
            passwordChangeRequired: false,
            user,
          });
          await call('Page.addScriptToEvaluateOnNewDocument', {
            source:
              `sessionStorage.clear();localStorage.setItem('wasla_portal_sidebar_collapsed','false');localStorage.setItem('wasla_lang',${JSON.stringify(language)});` +
              (actor === 'Anonymous'
                ? ''
                : `sessionStorage.setItem('wasla.auth.session',${JSON.stringify(storedSession)});`),
          });
          await call('Page.navigate', { url: origin + '/' + route });
          let loaded = false;
          for (let attempt = 0; attempt < 80; attempt++) {
            if (await evaluate(`!!document.querySelector('${selector}')`)) {
              loaded = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          assert.ok(loaded, 'Route did not load: ' + (await evaluate('location.pathname')));
          await evaluate('document.fonts.ready');
          await new Promise((resolve) => setTimeout(resolve, 350));
          for (const width of widths) {
            await call('Emulation.setDeviceMetricsOverride', {
              width,
              height: 900,
              deviceScaleFactor: 1,
              mobile: false,
            });
            await new Promise((resolve) => setTimeout(resolve, 80));
            const metrics = await evaluate(`(() => {
            const host = document.querySelector('${selector}');
            const r = host.getBoundingClientRect();
            const footer = document.querySelector('app-platform-footer').getBoundingClientRect();
            return { viewport: innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, contentWidth: r.width, footerWidth: footer.width, direction: document.documentElement.dir,
              overflowing: [...host.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(), s = getComputedStyle(e); return b.width > 0 && s.position !== 'fixed' && s.position !== 'absolute' && (b.right > innerWidth + 1 || b.left < -1) && !e.closest('.table-responsive'); }).slice(0, 8).map(e => e.className) };
          })()`);
            assert.ok(metrics.scrollWidth <= width, JSON.stringify(metrics));
            assert.equal(metrics.direction, language === 'ar' ? 'rtl' : 'ltr');
            assert.equal(Math.round(metrics.footerWidth), metrics.clientWidth);
            if (route.startsWith('workspace/')) {
              assert.deepEqual(metrics.overflowing, [], 'Workspace content is clipped');
              const workspace = await evaluate(`(() => {
                const primary = document.querySelector('.workspace-primary');
                const tasks = [...document.querySelectorAll('.workspace-primary, .task-link')];
                return { primary: primary?.getAttribute('href'), sizes: tasks.map(a => a.getBoundingClientRect().height),
                  moduleGrid: !!document.querySelector('.modules-grid'), selectors: document.querySelectorAll('#reception-current-practice').length,
                  activeHome: document.querySelector('.sidebar-nav-item[aria-current="page"]')?.getAttribute('href') };
              })()`);
              assert.equal(workspace.moduleGrid, false);
              assert.ok(workspace.sizes.every((height) => height >= 44));
              assert.equal(workspace.activeHome, '/' + route);
              if (actor === 'Reception') assert.equal(workspace.selectors, 1);
              if (context.state === 'populated') {
                assert.ok(
                  workspace.primary?.startsWith(
                    actor === 'Reception'
                      ? '/reception/reservations?'
                      : actor === 'Doctor'
                        ? '/doctor/queue'
                        : '/doctors',
                  ),
                );
              }
              if (width < 768) {
                const uncovered = await evaluate(`(() => {
                  const last = [...document.querySelectorAll('.workspace-primary, .task-link, .workspace-secondary a')].at(-1);
                  if (!last) return true;
                  last.scrollIntoView({ block: 'center', behavior: 'instant' });
                  return last.getBoundingClientRect().bottom <= document.querySelector('app-mobile-navigation nav').getBoundingClientRect().top;
                })()`);
                assert.ok(uncovered, 'Mobile navigation covers a workspace action');
                await evaluate("scrollTo({ top: 0, behavior: 'instant' })");
              }
              if (width === 1440) {
                await evaluate("document.querySelector('.btn-sidebar-collapse').click()");
                await new Promise((resolve) => setTimeout(resolve, 300));
                assert.equal(
                  await evaluate(
                    "document.querySelector('.portal-sidebar').classList.contains('collapsed')",
                  ),
                  true,
                );
                await evaluate("document.querySelector('.btn-sidebar-collapse').click()");
                await new Promise((resolve) => setTimeout(resolve, 300));
              }
            }
            if (['privacy', 'terms', 'help'].includes(route)) {
              const clippedNavigation =
                await evaluate(`Array.from(document.querySelectorAll('.legal-brand, .legal-tabs, .legal-tab, .legal-nav-actions')).filter(element => {
                const bounds = element.getBoundingClientRect();
                return bounds.left < -1 || bounds.right > document.documentElement.clientWidth + 1;
              }).map(element => element.className)`);
              assert.deepEqual(clippedNavigation, [], 'Legal navigation is clipped');
            }
            results.push({ actor, route, language, width, state: context.state, ...metrics });
            if (process.env.WASLA_MUTATIONS === 'schedule' && route.endsWith('#schedule')) {
              const writesBeforeValidation = context.requests.filter(
                (r) => r.method === 'POST' && r.path.endsWith('/schedule/periods'),
              ).length;
              const waitFor = async (expression) => {
                for (let attempt = 0; attempt < 80; attempt++) {
                  if (await evaluate(expression)) return;
                  await new Promise((resolve) => setTimeout(resolve, 50));
                }
                throw Error('Timed out: ' + expression);
              };
              await evaluate(
                "document.querySelector('app-practice-schedule .btn-action-primary').click()",
              );
              await waitFor(
                "!!document.querySelector('app-practice-schedule .schedule-dialog form')",
              );
              const fillDuration = (value) =>
                evaluate(
                  `(() => { const input=document.querySelector('app-practice-schedule .schedule-dialog input[type=number]'); input.value='${value}';input.dispatchEvent(new Event('input',{bubbles:true})); })()`,
                );
              const submitPeriod = () =>
                evaluate(
                  "document.querySelector('app-practice-schedule .schedule-dialog form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))",
                );
              await fillDuration(0);
              await submitPeriod();
              await waitFor("!!document.querySelector('app-practice-schedule form [role=alert]')");
              const countWrites = () =>
                context.requests.filter(
                  (r) => r.method === 'POST' && r.path.endsWith('/schedule/periods'),
                ).length;
              const before = countWrites();
              assert.equal(before, writesBeforeValidation, 'Invalid period reached the API');
              await fillDuration(30);
              context.failMutation = true;
              await submitPeriod();
              await waitFor(
                "document.querySelector('app-practice-schedule .btn-modal-save').disabled",
              );
              await submitPeriod();
              assert.equal(countWrites(), before + 1, 'Duplicate period request');
              await waitFor(
                "!document.querySelector('app-practice-schedule .btn-modal-save').disabled",
              );
              assert.ok(
                await evaluate(
                  "!!document.querySelector('app-practice-schedule .schedule-dialog form')",
                ),
              );
              assert.ok(
                await evaluate(
                  "!!document.querySelector('app-toast-container .toast-message--error')",
                ),
                'Missing error toast',
              );
              context.failMutation = false;
              await submitPeriod();
              await waitFor(
                "!document.querySelector('app-practice-schedule .schedule-dialog form')",
              );
              await waitFor("!!document.querySelector('app-practice-schedule .schedule-record')");
              await waitFor(
                "!!document.querySelector('app-toast-container .toast-message--success')",
              );
              assert.equal(countWrites(), before + 2);
              results.push({
                actor,
                route,
                language,
                width,
                state: 'period-validation-failure-retry-success',
              });
            }
            if ([390, 820, 1440].includes(width)) {
              const screenshot = await call('Page.captureScreenshot', { format: 'png' });
              fs.writeFileSync(
                `${output}/${route.replaceAll('/', '-')}-${language}-${width}.png`,
                Buffer.from(screenshot.data, 'base64'),
              );
            }
          }
          assert.deepEqual(context.errors, [], 'Runtime errors');
          if (
            ['doctor/practices', 'doctor/receptions'].includes(route) &&
            context.state === 'populated'
          ) {
            await evaluate("document.querySelector('.page-header__action-btn').click()");
            for (
              let attempt = 0;
              attempt < 40 && !(await evaluate("!!document.querySelector('app-side-drawer form')"));
              attempt++
            )
              await new Promise((resolve) => setTimeout(resolve, 100));
            assert.ok(
              await evaluate("!!document.querySelector('app-side-drawer form')"),
              'Create form did not open',
            );
            for (const width of widths) {
              await call('Emulation.setDeviceMetricsOverride', {
                width,
                height: 900,
                deviceScaleFactor: 1,
                mobile: false,
              });
              await new Promise((resolve) => setTimeout(resolve, 80));
              const drawer = await evaluate(
                `(() => { const panel=document.querySelector('app-side-drawer [role=dialog]'), close=panel.querySelector('.drawer-close-btn'), bounds=panel.getBoundingClientRect(), c=close.getBoundingClientRect(); return { left:bounds.left, right:bounds.right, height:c.height, locked:document.body.style.overflow, fields:[...panel.querySelectorAll('input,select')].filter(e=>e.type!=='checkbox').map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}}) }; })()`,
              );
              assert.ok(drawer.left >= -1 && drawer.right <= width + 1, JSON.stringify(drawer));
              assert.equal(drawer.height, 44);
              assert.equal(drawer.locked, 'hidden');
              assert.ok(
                drawer.fields.every(
                  (f) => f.width > 0 && f.left >= drawer.left && f.right <= drawer.right,
                ),
                JSON.stringify(drawer),
              );
              results.push({ actor, route, language, width, state: 'create-drawer', ...drawer });
            }
            await call('Page.bringToFront');
            await call('Input.dispatchKeyEvent', {
              type: 'keyDown',
              key: 'Escape',
              code: 'Escape',
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
            assert.equal(
              await evaluate("!!document.querySelector('app-side-drawer [role=dialog]')"),
              false,
            );
            assert.notEqual(await evaluate('document.body.style.overflow'), 'hidden');
          }
        } catch (error) {
          failures.push({
            actor,
            route,
            language,
            error: error.message,
            requests: context.requests,
            runtimeErrors: context.errors,
          });
          console.log('FAIL ' + route + ' ' + language + ': ' + error.message);
        } finally {
          await send('Target.closeTarget', { targetId });
          targets.delete(targetId);
          contexts.delete(sessionId);
        }
      }
    fs.writeFileSync(output + '/results.json', JSON.stringify({ results, failures }, null, 2));
    console.log(
      `${results.length} viewport cases, ${failures.length} failing route/language scenarios.`,
    );
    assert.deepEqual(failures, [], 'Responsive verification failed; see results.json');
  } finally {
    for (const targetId of targets) await send('Target.closeTarget', { targetId });
    socket.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
