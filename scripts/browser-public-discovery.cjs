// Browser integration smoke test against local Angular with isolated API fixtures.
// Start a headless Chromium instance with remote debugging on port 9238 first.
const fs = require('fs');
const assert = require('node:assert/strict');
const origin = process.env.WASLA_BROWSER_ORIGIN || 'http://localhost:4201';
const clinic = { id:'clinic-1',nameAr:'عيادة الاختبار',nameEn:'Test clinic',logoUrl:null,
 governorate:null,city:null,area:null,detailedAddress:null,latitude:null,longitude:null,
 publicSearchPrice:300,nextAvailableSlotDate:null,nextAvailableSlotTime:null,isToday:false,isBookable:true };
const doctor = {doctorId:'doctor-1',nameAr:'دكتور الاختبار',nameEn:'Test doctor',profileImageUrl:null,
 specializations:[],practices:[clinic],bio:null,qualifications:[]};
async function main() {
 const version = await fetch('http://127.0.0.1:9238/json/version').then(r=>r.json());
 const socket = new WebSocket(version.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 const pending=new Map();let sequence=0;
 function send(method,params={},sessionId) {
  return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
 }
 socket.onmessage = async event => {
  const message=JSON.parse(event.data);
  if(message.id){const callback=pending.get(message.id);pending.delete(message.id);if(message.error)callback.reject(new Error(JSON.stringify(message.error)));else callback.resolve(message.result);}
  if(message.method==='Fetch.requestPaused') {
   const request=message.params, url=new URL(request.request.url);let data=[];
   if(url.pathname.endsWith('/public/doctors/doctor-1'))data=doctor;
   else if(url.pathname.endsWith('/public/doctors'))data={items:[doctor],totalCount:1,pageNumber:1,pageSize:20};
   else if(url.pathname.endsWith('/available-dates'))data=[{date:'2026-09-20',isAvailable:true},{date:'2026-09-21',isAvailable:false}];
   else if(url.pathname.endsWith('/available-slots'))data=[{date:'2026-09-20',time:'17:00'}];
   else if(url.pathname.endsWith('/booking-options'))data={practiceId:clinic.id,date:'2026-09-20',time:'17:00',visitTypes:[{visitTypeId:'visit-1',nameAr:'كشف',nameEn:'Consultation',segments:[{segmentId:'normal',nameAr:'عادي',nameEn:'Normal',price:300,isDefault:true}]}]};
   await send('Fetch.fulfillRequest',{requestId:request.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:origin}],body:Buffer.from(JSON.stringify(data)).toString('base64')},message.sessionId);
  }
 };
 const results=[];
 fs.mkdirSync('docs/browser-verification',{recursive:true});
 try {
  for(const lang of ['ar','en'])for(const width of [1440,390]) {
   const {targetId}=await send('Target.createTarget',{url:'about:blank'});
   const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
   const call=(method,params)=>send(method,params,sessionId);
   const evaluate=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
   async function waitFor(expression){for(let i=0;i<80;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw new Error('Timed out: '+expression);}
   await call('Page.enable');
   await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
   await call('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('wasla_lang','${lang}');`});
   await call('Fetch.enable',{patterns:[{urlPattern:'*/api/*',requestStage:'Request'}]});
   await call('Page.navigate',{url:origin+'/doctors/doctor-1'});
   await waitFor("!!document.querySelector('.practice-list button')");
   assert.equal(await evaluate("document.querySelector('main').dir"),lang==='ar'?'rtl':'ltr');
   await evaluate("document.querySelector('.practice-list button').click()");
   await waitFor("document.querySelectorAll('.choice-grid button').length===2");
   assert.equal(await evaluate("document.querySelectorAll('.choice-grid button')[1].disabled"),true);
   await evaluate("document.querySelector('.choice-grid button').click()");
   await waitFor("document.querySelectorAll('.choice-grid').length===2 && !!document.querySelectorAll('.choice-grid')[1].querySelector('button')");
   await evaluate("document.querySelectorAll('.choice-grid')[1].querySelector('button').click()");
   await waitFor("!!document.querySelector('.booking-options')");
   const text=await evaluate("document.querySelector('.booking-options').textContent");
   assert.ok(text.includes(lang==='ar'?'كشف':'Consultation'));
   assert.ok(text.includes('300'));
   assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"),true,'Horizontal overflow');
   const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
   fs.writeFileSync(`docs/browser-verification/public-details-${lang}-${width}.png`,Buffer.from(screenshot.data,'base64'));
   results.push({lang,width,checks:['direction','unavailable date disabled','clinic/date/slot selection','price response','no horizontal overflow']});
   await call('Page.navigate',{url:origin+'/login'});
   await waitFor("!!document.querySelector('#login-identifier')");
   await waitFor(`document.title === ${JSON.stringify(lang==='ar'?'تسجيل الدخول | وصلة':'Sign in | Wasla')}`);
   assert.equal(await evaluate("document.documentElement.dir"),lang==='ar'?'rtl':'ltr');
   if(lang==='en')assert.equal(await evaluate("/[\\u0600-\\u06ff]/.test(document.body.innerText)"),false,'Arabic UI text on English sign-in screen');
   await evaluate("document.querySelector('.auth-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");
   await waitFor("document.querySelectorAll('.field-error').length===2");
   const errors=await evaluate("Array.from(document.querySelectorAll('.field-error')).map(e=>e.textContent).join(' ')");
   assert.equal(/[\u0600-\u06ff]/.test(errors),lang==='ar','Validation error language');
   assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"),true,'Sign-in horizontal overflow');
   const loginScreenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
   fs.writeFileSync(`docs/browser-verification/login-${lang}-${width}.png`,Buffer.from(loginScreenshot.data,'base64'));
   results.push({page:'login',lang,width,checks:['translated browser title','direction','bilingual UI','required field validation','no horizontal overflow']});
   await send('Target.closeTarget',{targetId});
  }
  fs.writeFileSync('docs/browser-verification/results.json',JSON.stringify({origin,fixtures:true,results},null,2));
  console.log(JSON.stringify(results,null,2));
 } finally {socket.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
