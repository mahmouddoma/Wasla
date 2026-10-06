// All API traffic is intercepted with synthetic responses; no live records are changed.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const origin = process.env.WASLA_ORIGIN || 'http://127.0.0.1:4204';
const out = process.env.WASLA_OUTPUT || 'docs/browser-verification/phase14';
const widths = process.env.WASLA_WIDTHS ? process.env.WASLA_WIDTHS.split(',').map(Number) : [390, 1440];
const drug = { drugCatalogId: 'd1', commercialNameEn: 'Synthetic medication', commercialNameAr: 'دواء اختباري',
 scientificName: 'Synthetic ingredient', manufacturer: 'Synthetic manufacturer', drugClass: null, route: 'Oral',
 strengthText: '10 mg', dosageForm: 'Tablet', priceEgp: 0, status: 'Active', rowVersion: 'dv1',
 source: null, history: [{ action: 'Created', reason: 'Synthetic verification', createdOnUtc: '2026-10-06T09:00:00Z' }] };
const account = { id: 'm1', userName: 'Synthetic manager', email: 'test@example.invalid', phoneNumber: null, isActive: true, isFirstLogin: true };
const identity = (id, ar, en) => ({ id, nameAr: ar, nameEn: en });
const encounter = { encounterId: 'e1', ticketId: 't1', status: 'InProgress', rowVersion: 'ev1',
 patient: identity('u1', 'مريض اختباري', 'Synthetic patient'), doctor: identity('doctor1', 'طبيب اختباري', 'Synthetic doctor'),
 practice: identity('p1', 'عيادة اختبارية', 'Synthetic clinic'), clinicalNotes: 'Synthetic findings', diagnoses: [],
 startedOnUtc: '2026-10-06T09:00:00Z', completedOnUtc: null, hasDiagnosis: false, hasFollowUpEligibility: false,
 capabilities: { canEditClinicalNotes: true, canManageDiagnoses: true, canComplete: true, canAmend: false,
 canCreateFollowUpEligibility: false, canManagePrescription: true, canRequestNewMedication: true },
 prescription: { prescriptionId: 'rx1', practiceId: 'p1', medicalEncounterId: 'e1', current: null, capabilities: {canManageDraft:true}, rowVersion: 'rx2', completionBlockers: [{ code: 'DoseRequired', message: 'Synthetic dose required', itemId: 'i1', field: 'dose' }], draft: { versionNumber:1,status:'Draft',items: [{ itemId: 'i1', dose:null,frequency:null,duration:null,isPrn:false,quantity:null,instructions:null,strength:null,route:null,dosageForm:null, commercialNameEn: 'Synthetic medication', commercialNameAr: 'دواء اختباري' }] } } };
const paged = items => ({ items, totalCount: items.length, pageNumber: 1, pageSize: 20 });
async function main() {
 fs.mkdirSync(out, { recursive: true });
 const version = await fetch('http://127.0.0.1:9244/json/version').then(r => r.json());
 const socket = new WebSocket(version.webSocketDebuggerUrl);
 await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
 let seq = 0;
 const pending = new Map(), users = new Map(), requests = [], errors = [], results = [];
 const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
   const id = ++seq; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
 });
 socket.onmessage = async event => {
   const msg = JSON.parse(event.data);
   if (msg.id) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(Error(JSON.stringify(msg.error))) : p.resolve(msg.result); }
   if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
   if (msg.method === 'Fetch.requestPaused') {
     const { requestId, request } = msg.params, path = new URL(request.url).pathname;
     requests.push({ actor: users.get(msg.sessionId)?.userType, method: request.method, path });
     let data = [];
     const medicationRequest={requestId:'r1',medicationName:drug.commercialNameEn,status:'Pending',rowVersion:'r1',history:[]};
     const batch={batchId:'b1',source:'Synthetic source',sourceVersion:'v1',fileSha256:'synthetic-sha',status:'Staged',counts:{New:1,Unchanged:0},createdOnUtc:'2026-10-06T09:00:00Z',rowVersion:'b1'};
     const patientPrescription={prescriptionId:'rx1',doctor:encounter.doctor,practice:encounter.practice,visitDateUtc:encounter.startedOnUtc,versionNumber:1,status:'Finalized',items:encounter.prescription.draft.items};
     if (path.endsWith('/auth/me')) data = users.get(msg.sessionId);
     else if (path.endsWith('/admin/drug-catalog-managers')) data = paged([account]);
     else if (path.endsWith('/admin/drug-catalog-managers/m1')) data = account;
     else if (path.endsWith('/admin/drug-catalog')) data = request.method === 'POST' ? drug : paged([drug]);
     else if (path.endsWith('/admin/drug-catalog/d1')) data = drug;
     else if (path.endsWith('/doctors/me/drug-catalog')) data = paged([drug]);
     else if (path.endsWith('/drug-catalog/imports')) data=paged([batch]);
     else if (path.endsWith('/drug-catalog/imports/b1')) data=batch;
     else if (path.endsWith('/drug-catalog/imports/b1/changes')) data=paged([{recordId:'c1',changeType:'New',sourceRow:{commercialNameEn:drug.commercialNameEn}}]);
     else if (path.endsWith('/drug-catalog-requests')) data=paged([medicationRequest]);
     else if (path.endsWith('/drug-catalog-requests/r1')) data=medicationRequest;
     else if (path.endsWith('/prescriptions/mine')) data=paged([patientPrescription]);
     else if (path.endsWith('/prescriptions/mine/rx1')) data=patientPrescription;
     else if (path.endsWith('/doctors/me/practices')) data = [{ ...encounter.practice, isActive: true }];
     else if (path.endsWith('/encounters/e1') || path.endsWith('/tickets/t1/encounter')) data = encounter;
     else if (path.endsWith('/encounters')) data = paged([encounter]);
     await send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' }], body: Buffer.from(JSON.stringify(data)).toString('base64') }, msg.sessionId);
   }
 };
 try {
   for (const surface of ['admin/drug-catalog-managers', 'drug-catalog', 'doctor/encounters','drug-catalog/imports','drug-catalog-requests','doctor/medication-requests','patient/prescriptions']) {
     for (const lang of ['ar', 'en']) {
       for (const width of widths) {
         const actor = surface.startsWith('admin') ? 'SuperAdmin' : surface.startsWith('doctor') ? 'Doctor' : surface.startsWith('patient') ? 'Patient' : 'DrugCatalogManager';
         const user = { applicationUserId: 'synthetic-user', userName: 'Synthetic user', email: 'test@example.invalid', phoneNumber: null,
           userType: actor, roles: [actor], doctorId: actor === 'Doctor' ? 'doctor1' : null, patientId: actor === 'Patient' ? 'u1' : null, isFirstLogin: false,
           permissions: actor === 'Patient' ? ['Prescriptions.ViewOwnCompleted'] : actor === 'SuperAdmin' ? ['DrugCatalogManagers.ViewAll', 'DrugCatalogManagers.ViewDetails', 'DrugCatalogManagers.Create', 'DrugCatalogManagers.Update', 'DrugCatalogManagers.Activate', 'DrugCatalogManagers.Deactivate']
           : actor === 'Doctor' ? ['MedicalEncounters.ViewOwn', 'Diagnoses.ViewOwn', 'MedicalEncounters.UpdateOwn', 'Diagnoses.ManageOwn', 'DoctorPracticeTickets.CompleteOwn', 'DoctorPractices.ViewOwn', 'DrugCatalog.SearchActive','Prescriptions.ManageOwnDraft','Prescriptions.ViewOwn','DrugCatalogRequests.ViewOwn','DrugCatalogRequests.CreateOwn','DrugCatalogRequests.UpdateOwn']
           : ['DrugCatalog.View', 'DrugCatalog.Create', 'DrugCatalog.Update', 'DrugCatalog.Activate', 'DrugCatalog.Deactivate', 'DrugCatalog.Merge','DrugCatalog.Import','DrugCatalog.ImportHistory','DrugCatalogRequests.View','DrugCatalogRequests.Review'] };
         const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
         const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }); users.set(sessionId, user);
         const call = (m, p) => send(m, p, sessionId);
         const evaluate = async expression => { const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
         const wait = async expression => { for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 100)); } throw Error('Timeout: ' + surface + ' ' + expression + ' ' + await evaluate('location.href + " " + document.body.innerText')); };
         await call('Runtime.enable'); await call('Page.enable');
         await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 });
         const session = JSON.stringify({ accessToken: 'synthetic-not-real', expiresOnUtc: '2099-01-01T00:00:00Z', passwordChangeRequired: false, user });
         await call('Page.addScriptToEvaluateOnNewDocument', { source: 'sessionStorage.setItem("wasla.auth.session",' + JSON.stringify(session) + ');localStorage.setItem("wasla_lang",' + JSON.stringify(lang) + ');' });
         await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
         await call('Page.navigate', { url: origin + '/' + surface + (actor === 'Doctor' ? '?practiceId=p1' : '') });
         await wait('!!document.querySelector("tbody button")');
         assert.equal(await evaluate('document.documentElement.dir'), lang === 'ar' ? 'rtl' : 'ltr');
         assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'list overflow');
         if (actor === 'DrugCatalogManager') {
           assert.equal(await evaluate('Array.from(document.querySelectorAll(".portal-sidebar a")).some(a => ["patient","finance","doctor/"].some(part => a.getAttribute("href").includes(part)))'), false, 'manager clinical navigation');
         }
         const base = surface.replaceAll('/', '-') + '-' + lang + '-' + width;
         const screenshot = async suffix => { const r = await call('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(out + '/' + base + '-' + suffix + '.png', Buffer.from(r.data, 'base64')); };
         await screenshot('list');
         await evaluate('document.querySelector("tbody button").click()');
         await wait('!!document.querySelector("app-side-drawer [role=dialog]")');
         await wait('document.querySelector("app-side-drawer").innerText.includes(' + JSON.stringify(surface==='drug-catalog/imports' ? 'synthetic-sha' : surface==='doctor/encounters' ? 'Synthetic dose required' : surface==='admin/drug-catalog-managers' ? account.userName : (surface==='drug-catalog' || surface==='patient/prescriptions') && lang==='ar' ? drug.commercialNameAr : drug.commercialNameEn) + ')');
         assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'drawer overflow');
         await new Promise(resolve=>setTimeout(resolve,400));
         assert.equal(await evaluate('(()=>{const r=document.querySelector("[role=dialog]").getBoundingClientRect();const c=document.querySelector(".drawer-close-btn").getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&c.left>=0&&c.right<=innerWidth;})()'),true,'settled drawer bounds and close');
         await screenshot('drawer');
         if (surface==='drug-catalog' || surface==='admin/drug-catalog-managers') {
           await evaluate('document.querySelector("app-side-drawer .actions .btn-primary").click()');
           await wait('!!document.querySelector("app-side-drawer form")');
           assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'form overflow');
           await screenshot('form');
         } else if (surface==='doctor/encounters') {
           await evaluate('Array.from(document.querySelectorAll("app-side-drawer button")).find(b => b.textContent.includes(' + JSON.stringify(lang === 'ar' ? 'إضافة دواء' : 'Add medication') + ')).click()');
           await wait('document.querySelector("app-side-drawer").innerText.includes("Synthetic ingredient")');
           await evaluate('document.querySelector("app-prescription-workspace input[type=search]").scrollIntoView({block:"center"})');
           await new Promise(resolve=>setTimeout(resolve,100));
           await screenshot('drug-search');
         }
         await evaluate('document.querySelector(".drawer-close-btn").click()');
         await wait('!document.querySelector("app-side-drawer [role=dialog]")');
         results.push({ surface, lang, width, result: 'passed', checks: ['direction', 'no-overflow', 'drawer', 'form-or-search', 'close'] });
         await send('Target.closeTarget', { targetId });
       }
     }
   }
   assert.equal(errors.length, 0, 'runtime exceptions');
   fs.writeFileSync(out + '/results.json', JSON.stringify({ synthetic: true, results, requests, errors }, null, 2));
   console.log(JSON.stringify({ combinations: results.length, runtimeErrors: errors.length, result: 'passed' }));
 } finally { socket.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
