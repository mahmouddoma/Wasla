// Synthetic API interception only. This script never changes live clinical records.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const origin = process.env.WASLA_ORIGIN || 'http://127.0.0.1:4204';
const out = process.env.WASLA_OUTPUT || 'docs/browser-verification/phase15';
const widths = process.env.WASLA_WIDTHS?.split(',').map(Number) || [390, 1440];
const pair = { id: 'practice', nameAr: 'عيادة تجريبية', nameEn: 'Synthetic clinic' };
const presentation = { displayNameAr: 'فحص تجريبي', displayNameEn: 'Synthetic test', aliasesAr: null, aliasesEn: null, internalNote: null };
const catalog = { catalogId: 'catalog', nameAr: presentation.displayNameAr, nameEn: presentation.displayNameEn, source: 'Wasla', status: 'Active', rowVersion: 'catalog-rv', presentation, capabilities: { canEdit: true, canDeactivate: true, canActivate: false, canMerge: true }, history: [], officialNameEn: 'Synthetic official name', loincCode: 'synthetic' };
const catalogRequest = { requestId: 'catalog-request', name: 'Synthetic missing test', specimen: 'Blood', catalogClarificationNote: 'Synthetic catalog note', status: 'Pending', rowVersion: 'review-rv', capabilities: { canEdit: true, canRequestMoreInfo: true, canApprove: true, canReject: true }, history: [] };
const batch = { batchId: 'batch', originalFileName: 'Synthetic catalog.csv', sourceVersion: 'v1', status: 'Staged', rowVersion: 'batch-rv', counts: { New: 1 }, capabilities: { canApply: true, canDiscard: true } };
const account = { id: 'manager', userName: 'Synthetic manager', email: 'test@example.invalid', phoneNumber: null, isActive: true, isFirstLogin: false };
const item = { itemId: 'item', nameArSnapshot: 'فحص تجريبي', nameEnSnapshot: 'Synthetic test', doctorInstructions: 'Internal doctor instructions', status: 'Requested', capabilities: { canEdit: true, canRemove: true, canCancel: true } };
const version = { versionId: 'version', versionNumber: 1, status: 'Finalized', externalProviderName: 'Synthetic laboratory', externalReportDate: '2026-10-07', attachments: [{ attachmentId: 'attachment', originalFileName: 'Synthetic report.pdf', kind: 'Report' }], correctionReason: 'Internal correction reason', voidReason: null };
const result = { resultId: 'result', requestId: 'request', current: version, rowVersion: 'result-rv', currentVersionNumber: 1, capabilities: { canCorrect: true, canVoid: true } };
const submission = { submissionId: 'submission', requestId: 'request', status: 'PendingReview', patientNote: 'Synthetic patient note', rowVersion: 'submission-rv', attachments: version.attachments, capabilities: { canAccept: true, canReject: true, canWithdraw: true } };
const request = { requestId: 'request', medicalEncounterId: 'encounter', doctor: { ...pair, id: 'doctor', nameAr: 'طبيب تجريبي', nameEn: 'Synthetic doctor' }, practice: pair, status: 'Requested', origin: 'DuringEncounter', rowVersion: 'request-rv', requestedAtUtc: '2026-10-07T09:00:00Z', patientInstructions: 'Synthetic patient instructions', items: [item], currentResults: [result], submissions: [submission], capabilities: { canManageDraft: true, canCancelRemaining: true, canUploadResult: true } };
const encounter = { encounterId: 'encounter', ticketId: 'ticket', status: 'InProgress', rowVersion: 'encounter-rv', patient: { ...pair, nameAr: 'مريض تجريبي', nameEn: 'Synthetic patient' }, doctor: request.doctor, practice: pair, clinicalNotes: 'Synthetic clinical notes', diagnoses: [], startedAtUtc: '2026-10-07T09:00:00Z', capabilities: { canComplete: true, canManageLabRequest: true, canManageRadiologyRequest: true }, labRequestDraft: { ...request, status: 'Draft' }, radiologyRequestDraft: { ...request, requestId: 'radiology-request', status: 'Draft' }, labRequestsSummary: [], radiologyRequestsSummary: [] };
const page = (items) => ({ items, totalCount: items.length, pageNumber: 1, pageSize: 20 });
const permissions = JSON.parse(fs.readFileSync('docs/phase15-jira-todo.json','utf8')).flatMap(i => [...(i.fields.description || '').matchAll(/\*\*Permission:\*\*\s*`([^`]+)`/g)].map(m=>m[1]));
async function main() {
 fs.mkdirSync(out,{recursive:true});
 const browser = await fetch('http://127.0.0.1:9244/json/version').then(r=>r.json());
 const socket = new WebSocket(browser.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let seq=0; const pending=new Map(), users=new Map(), traffic=[], errors=[], results=[];
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
 socket.onmessage=async event=>{
   const msg=JSON.parse(event.data);
   if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}
   if(msg.method==='Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
   if(msg.method==='Fetch.requestPaused'){
     const {requestId,request:incoming}=msg.params,path=new URL(incoming.url).pathname;traffic.push({actor:users.get(msg.sessionId)?.userType,method:incoming.method,path});let data=[];
     if(path.endsWith('/auth/me')) data=users.get(msg.sessionId);
     else if(/medical-catalog-managers\/manager$/.test(path))data=account;
     else if(path.endsWith('/medical-catalog-managers'))data=page([account]);
     else if(/-catalog\/imports\/batch\/changes$/.test(path))data=page([{recordId:'change',nameEn:'Synthetic test',sourceDataJson:JSON.stringify({nameAr:'فحص تجريبي'}),disposition:'New'}]);
     else if(/-catalog\/imports\/batch$/.test(path))data=batch;
     else if(path.endsWith('/imports'))data=page([batch]);
     else if(/-catalog-requests\/catalog-request$/.test(path))data=catalogRequest;
     else if(path.endsWith('-catalog-requests'))data=page([catalogRequest]);
     else if(path.endsWith('-catalog/catalog'))data=catalog;
     else if(path.endsWith('-catalog'))data=page([catalog]);
     else if(path.endsWith('/doctors/me/practices'))data=[{...pair,isActive:true}];
     else if(path.endsWith('/encounters/encounter')||path.endsWith('/tickets/ticket/encounter'))data=encounter;
     else if(path.endsWith('/encounters'))data=page([encounter]);
     else if(/\/(lab|radiology)-request$/.test(path))data={...request,status:'Draft'};
     else if(/-results(\/mine)?\/result\/versions\/1$/.test(path))data=version;
     else if(path.endsWith('/versions'))data=[version];
     else if(path.endsWith('/result'))data=result;
     else if(/-results(\/mine)?$/.test(path))data=page([result]);
     else if(path.endsWith('/submission'))data=submission;
     else if(/-result-submissions$/.test(path)||path.endsWith('/submissions'))data=page([submission]);
     else if(path.endsWith('/request'))data=request;
     else if(/-requests(\/mine)?\/ORDER-00[12]-SYNTHETIC$/.test(path))data={...request,requestId:path.split('/').at(-1)};
     else if(/-requests(\/mine)?$/.test(path))data=page([{...request,requestId:'ORDER-001-SYNTHETIC'},{...request,requestId:'ORDER-002-SYNTHETIC'}]);
     await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'content-type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'},{name:'Access-Control-Allow-Headers',value:'*'}],body:Buffer.from(JSON.stringify(data)).toString('base64')},msg.sessionId);
   }
 };
 try {
   const surfaces=['admin/medical-catalog-managers','doctor/encounters',...['lab','radiology'].flatMap(kind=>[`medical-catalog/${kind}`,`medical-catalog/${kind}/imports`,`medical-catalog/${kind}/requests`,`doctor/catalog-requests/${kind}`,`diagnostics/doctor/${kind}`,`diagnostics/patient/${kind}`])];
   for(const surface of surfaces) for(const lang of ['ar','en']) for(const width of widths){
     const actor=surface.startsWith('admin')?'SuperAdmin':surface.startsWith('doctor')||surface.startsWith('diagnostics/doctor')?'Doctor':surface.startsWith('diagnostics/patient')?'Patient':'MedicalCatalogManager';
     const user={applicationUserId:'synthetic-user',userName:'Synthetic user',email:'test@example.invalid',userType:actor,roles:[actor],isFirstLogin:false,doctorId:actor==='Doctor'?'doctor':null,patientId:actor==='Patient'?'patient':null,permissions:actor==='SuperAdmin'?permissions.filter(p=>p.startsWith('MedicalCatalogManagers.')):actor==='MedicalCatalogManager'?permissions.filter(p=>/Catalog\./.test(p)&&!p.endsWith('SearchActive')||/CatalogRequests\.(View|Review)$/.test(p)):actor==='Doctor'?[...permissions.filter(p=>/Own|SearchActive/.test(p)&&!(/Issued|Current/.test(p))), 'MedicalEncounters.ViewOwn','Diagnoses.ViewOwn','DoctorPractices.ViewOwn']:permissions.filter(p=>/Issued|Current|ResultSubmissions\.(ViewOwn|CreateOwn|WithdrawOwn)/.test(p))};
     const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});users.set(sessionId,user);const call=(m,p)=>send(m,p,sessionId);
     const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
     const wait=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error(surface+' timeout '+expression+' '+await evaluate('location.href+" "+document.body.innerText'));};
     await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
     const auth=JSON.stringify({accessToken:'synthetic-not-real',expiresOnUtc:'2099-01-01T00:00:00Z',passwordChangeRequired:false,user});
     await call('Page.addScriptToEvaluateOnNewDocument',{source:'sessionStorage.setItem("wasla.auth.session",'+JSON.stringify(auth)+');localStorage.setItem("wasla_lang",'+JSON.stringify(lang)+');'});
     await call('Fetch.enable',{patterns:[{urlPattern:'*/api/*',requestStage:'Request'}]});await call('Page.navigate',{url:origin+'/'+surface+(surface==='doctor/encounters'?'?practiceId=practice':'')});
     await wait('!!document.querySelector("tbody button")');assert.equal(await evaluate('document.documentElement.dir'),lang==='ar'?'rtl':'ltr');assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'list overflow');
     if(actor==='MedicalCatalogManager')assert.equal(await evaluate('Array.from(document.querySelectorAll(".portal-sidebar a")).some(a=>/patient|finance|doctor\\//.test(a.getAttribute("href")))'),false,'manager navigation isolation');
     const base=surface.replaceAll('/','-')+'-'+lang+'-'+width;const screenshot=async suffix=>{const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(out+'/'+base+'-'+suffix+'.png',Buffer.from(r.data,'base64'));};await screenshot('list');
     await evaluate('document.querySelector("tbody button").click()');await wait('!!document.querySelector("app-side-drawer [role=dialog]")');await new Promise(r=>setTimeout(r,450));
     assert.equal(await evaluate('(()=>{const d=document.querySelector("[role=dialog]").getBoundingClientRect(),c=document.querySelector(".drawer-close-btn").getBoundingClientRect();return d.left>=-1&&d.right<=innerWidth+1&&c.left>=0&&c.right<=innerWidth;})()'),true,'drawer bounds');
     assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'drawer overflow');
     if(actor==='Patient')assert.equal(await evaluate('document.querySelector("app-side-drawer").innerText.includes("Internal doctor instructions")'),false,'patient privacy');
     await screenshot('drawer');
     if(surface.startsWith('medical-catalog/')&&!surface.endsWith('/imports')&&!surface.endsWith('/requests')) {
       const editText=lang==='ar'?'تعديل':'Edit';
       await evaluate('Array.from(document.querySelectorAll("app-side-drawer button")).find(b=>b.textContent.trim()==='+JSON.stringify(editText)+').click()');
       await wait('document.querySelectorAll("app-side-drawer form input").length===5');
       await evaluate('for(const input of Array.from(document.querySelectorAll("app-side-drawer form input")).slice(0,2)){input.value="";input.dispatchEvent(new Event("input",{bubbles:true}));}');
       await evaluate('document.querySelector("app-side-drawer form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))');
       await wait('!!document.querySelector("app-side-drawer [role=alert]")');
       await screenshot('validation');
     }
     if(surface.startsWith('diagnostics/')) {
       const text=actor==='Doctor'?(lang==='ar'?'رفع نتيجة معتمدة':'Upload an official result'):(lang==='ar'?'إرسال تقرير للطبيب':'Send a report to the doctor');
       await evaluate('Array.from(document.querySelectorAll("app-side-drawer button")).find(b=>b.textContent.trim()==='+JSON.stringify(text)+').click()');
       await wait('!!document.querySelector("app-diagnostic-upload form")');
       if(actor==='Doctor') {
         await evaluate('document.querySelector("app-diagnostic-upload [aria-pressed]").click()');
         await wait('!!document.querySelector("app-diagnostic-upload .btn-primary[aria-pressed=true]")');
       }
       await evaluate('document.querySelector("app-diagnostic-upload").scrollIntoView({block:"start"})');
       await new Promise(r=>setTimeout(r,200));
       await screenshot('upload');
     }
     if(surface==='doctor/encounters'){await wait('document.querySelectorAll("app-diagnostic-draft").length===2');}
     await evaluate('document.querySelector(".drawer-close-btn").click()');await wait('!document.querySelector("app-side-drawer [role=dialog]")');
     results.push({surface,lang,width,result:'passed'});await send('Target.closeTarget',{targetId});
   }
   assert.equal(errors.length,0,'runtime exceptions');fs.writeFileSync(out+'/results.json',JSON.stringify({synthetic:true,results,traffic,errors},null,2));console.log(JSON.stringify({combinations:results.length,runtimeErrors:errors.length,result:'passed'}));
 }finally{socket.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
