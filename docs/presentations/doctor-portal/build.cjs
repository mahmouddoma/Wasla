/* Run from the repository root. Presentation dependencies live in .tmp/presentation-tools. */
const fs = require('node:fs');
const path = require('node:path');
const PptxGenJS = require(path.resolve('.tmp/presentation-tools/node_modules/pptxgenjs'));
const { chromium } = require(path.resolve('.tmp/presentation-tools/node_modules/playwright'));
const OUT = __dirname;
const C = { navy:'123451', teal:'047C79', mint:'EAF6F4', pale:'F5F8FA', line:'E3EAF0', slate:'526779', white:'FFFFFF' };
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Wasla';
pptx.subject = 'عرض تعريفي ببوابة الدكتور';
pptx.title = 'وصلة | بوابة الدكتور';
pptx.company = 'Wasla';
pptx.lang = 'ar-EG';
pptx.rtlMode = true;
pptx.theme = { headFontFace:'Tahoma', bodyFontFace:'Tahoma', lang:'ar-EG' };
const pages = [];
let page, slide;
function esc(s) { return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
function rect(x,y,w,h,fill,round=false) {
  slide.addShape(round ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, { x,y,w,h,rectRadius:0.12,radius:0.12,fill:{color:fill},line:{color:fill,transparency:100} });
  page.items.push({ kind:'rect',x,y,w,h,fill,round });
}
function txt(s,x,y,w,h,size=18,color=C.navy,bold=false,align='right') {
  slide.addText(s,{ x,y,w,h,fontFace:'Tahoma',fontSize:size,color,bold,align,rtlMode:true,lang:'ar-EG',margin:0,breakLine:false,valign:'mid',paraSpaceAfterPt:0,lineSpacingMultiple:1.12 });
  page.items.push({kind:'text',s,x,y,w,h,size,color,bold,align});
}
function rule(x,y,w,color=C.line) { rect(x,y,w,0.012,color); }
function start(title,sub,dark=false) {
  slide = pptx.addSlide(); slide.background={color:dark?C.navy:C.white};
  page={items:[],dark}; pages.push(page);
  const ink=dark?C.white:C.navy;
  txt('وصلة',11.82,.23,.82,.5,24,ink,true);
  txt('بوابة الدكتور',.7,.31,3,.3,11,dark?'B7D1DE':C.slate,false,'left');
  rule(.7,.94,11.93,dark?'35556C':C.line);
  if(title) txt(title,.7,1.24,11.9,.64,30,ink,true);
  if(sub) txt(sub,.7,2.0,11.9,.45,16,dark?'C8DBE5':C.slate);
  rule(.7,6.91,11.93,dark?'35556C':C.line);
  txt('وصلة · رعاية أقرب، وإدارة أوضح',8,7.04,4.6,.22,10,dark?'B7D1DE':C.slate);
  txt(`${String(pages.length).padStart(2,'0')} / 09`,.7,7.04,1,.22,10,dark?'B7D1DE':C.slate,false,'left');
}
function note(s) { slide.addNotes(s); page.notes=s; }
function row(title,body,y) {
  txt(title,7.42,y,5.15,.4,20,C.navy,true);
  txt(body,7.42,y+.52,5.15,.62,16,C.slate);
}
function listVisual(title,rows,caption) {
  rect(.7,2.85,5.9,3.57,C.pale,true);
  txt(title,1.02,3.08,5.24,.42,20,C.navy,true);
  rows.forEach((r,i)=>{
    const y=3.78+i*.73;
    txt(r[0],3.37,y,2.85,.33,16,C.navy,true);
    txt(r[1],1.04,y,2.15,.33,14,C.teal,false,'left');
    if(i<rows.length-1) rule(1.04,y+.51,5.15);
  });
  if(caption) txt(caption,.84,6.52,5.62,.23,10,C.slate,false,'center');
}

// 1: A direct proposition; no unsupported numerical promises.
start(null,null,true);
txt('وقتُك للمريض.',6.22,1.78,6.32,.9,40,C.white,true);
txt('وتنظيم عيادتك على وصلة.',5.8,2.86,6.74,.8,31,C.white,true);
txt('بوابة واحدة للحجوزات، والكشف،\nوفريق العيادة، والمتابعة المالية.',6.3,4.08,6.24,1.0,21,'CEE0E7');
rect(8.24,5.72,4.3,.5,C.teal,true);
txt('تعرّف على بوابة الدكتور',8.4,5.78,3.98,.3,16,C.white,true,'center');
['قبل الكشف','أثناء الكشف','بعد الكشف'].forEach((s,i)=>{
  const y=1.9+i*1.32;
  rect(.86,y,4.54,.93,i===1?C.teal:'24485F',true);
  txt(s,1.1,y+.15,4.06,.55,25,C.white,true,'center');
  if(i<2) rect(3.08,y+.95,.04,.35,'86B7BF');
});
note('المدة: 25 ثانية. افتح بسؤال: هل متابعة الحجز والدور والحسابات بتاخد من وقتك مع المريض؟ قدّم وصلة باعتبارها بوابة تجمع جوانب إدارة العيادة. لا تعد بتوفير نسبة وقت أو زيادة إيرادات محددة.');

// 2: Whole-portal orientation.
start('من أول الحجز… لآخر متابعة.','وصلة تجمع تفاصيل يوم العيادة في مسار واضح للدكتور وفريقه.');
const cols=[
  {x:8.67,title:'قبل الكشف',lines:['مواعيد العيادة والحجوزات','تنظيم فريق الاستقبال','متابعة الوصول وقائمة الانتظار']},
  {x:4.63,title:'أثناء الكشف',lines:['فتح سجل المريض','تسجيل الكشف والتشخيص','إعداد الروشتة']},
  {x:.7,title:'بعد الكشف',lines:['مراجعة الزيارات والمتابعات','الإيرادات والمصروفات والرواتب','التقارير وملاحظات الأداء']},
];
cols.forEach((c,i)=>{
  if(i>0) rect(c.x+3.87,2.98,.012,2.85,C.line);
  txt(c.title,c.x,2.98,3.68,.5,24,C.teal,true);
  c.lines.forEach((l,j)=>txt(l,c.x,3.82+j*.65,3.68,.5,17));
});
txt('كل جزء يخدم خطوة في يومك… بدل متابعة التفاصيل بشكل متفرق.',1.4,6.15,10.5,.43,18,C.slate,false,'center');
note('المدة: 35 ثانية. هذه خريطة البوابة وليست قائمة بكل الأزرار. اربط كل عمود بجزء من يوم الطبيب. المصادر: src/app/app.routes.ts؛ doctor-practices؛ doctor-receptions؛ reservations؛ tickets؛ encounters؛ prescriptions؛ operating-finance؛ doctor-reports.');

// 3: Dashboard, qualitative rather than invented demo numbers.
start('ابدأ يومك بصورة واضحة.','الصفحة الرئيسية تساعدك تراجع ما يحدث في عياداتك قبل الدخول في التفاصيل.');
row('تابع حركة العيادة','الحجوزات، والحضور، والانتظار في نظرة مجمّعة.',2.95);
row('اختَر ما تريد مراجعته','راجع المؤشرات حسب العيادة والفترة المحددة.',4.2);
row('انتقل من الملخص للتفاصيل','افتح تفاصيل المؤشرات المتاحة عند الحاجة.',5.45);
listVisual('نظرة عامة على العيادة',[
  ['الحجوزات والحضور','حركة اليوم'],
  ['الانتظار والخدمة','سير العمل'],
  ['التحصيل والمصروفات','المتابعة المالية'],
],'خريطة مبسطة لمحتوى لوحة المتابعة');
note('المدة: 35 ثانية. لا تقرأ أسماء كل المؤشرات. اعرض أن الطبيب يستطيع اختيار العيادة والفترة ثم فتح التفاصيل المتاحة. المصدر: features/doctor-dashboard/pages/doctor-dashboard/dashboard-presentation.ts وdoctor-dashboard.component.html. الرسومات في العرض توضيحية وليست لقطات فعلية للمنتج.');

// 4: Workflow drawing.
start('الحجز والدور… خطوات واضحة.','تابع المريض من الموعد إلى الدخول للكشف، مع وضوح حالة كل خطوة.');
row('إدارة الحجوزات','إنشاء المواعيد ومراجعتها وتعديلها من البوابة.',2.95);
row('متابعة الدور','معرفة المنتظرين ومتابعة حالات التذاكر والخدمة.',4.2);
row('تنسيق الشغل مع الاستقبال','العمل على حجوزات العيادة بحسب صلاحية كل مستخدم.',5.45);
rect(.7,2.85,5.9,3.57,C.pale,true);
['موعد مسجّل','وصول المريض','انتظار واستدعاء','بدء الكشف'].forEach((label,i)=>{
  const y=3.05+i*.78;
  txt(label,1.07,y,4.85,.42,19,i===3?C.teal:C.navy,i===3);
  rect(6.07,y+.1,.12,.18,C.teal,true);
  if(i<3) rect(6.12,y+.3,.018,.52,C.line);
});
txt('رسم توضيحي لمسار زيارة المريض',.9,6.52,5.5,.23,10,C.slate,false,'center');
note('المدة: 40 ثانية. مثال سردي: المريض له موعد، الاستقبال يتابع وصوله، ويظهر ضمن سير الدور، ثم يبدأ الكشف. لا تقدّم الرسم كشرط تقني ثابت لكل نوع حجز؛ مسار الحضور المباشر قد يختلف. المصادر: features/reservations؛ features/tickets؛ app.routes.ts.');

// 5: Medical work, no diagnosis automation claims.
start('سجل المريض حاضر وقت الكشف.','ارجع للمعلومات المتاحة، وسجّل الزيارة، وجهّز الروشتة من بوابتك.');
row('سجل مرتبط بالمريض','راجع زياراته وتشخيصاته وروشتاته المتاحة لك.',2.95);
row('توثيق الكشف','سجّل بيانات الزيارة والتشخيص ضمن سير العمل.',4.2);
row('روشتة منظّمة','إعداد الوصفة ومراجعتها وطباعتها عند الحاجة.',5.45);
listVisual('ما الذي تراجعه في ملف المريض؟',[
  ['الزيارات والتشخيصات','تاريخ الزيارة'],
  ['الروشتات','الوصفات السابقة'],
  ['التحاليل والأشعة','السجلات المتاحة'],
],'عرض تصوّري لأقسام الملف؛ الإتاحة بحسب الصلاحيات');
note('المدة: 45 ثانية. الرسالة هي استمرارية متابعة المريض، وليست أن المنصة تقرر التشخيص أو تقترح العلاج تلقائيًا. إظهار السجل المشترك والسجلات الأخرى يعتمد على التصاريح والإتاحة. المصادر: doctor-patients/components/patient-detail-drawer؛ encounters؛ prescriptions/components/prescription-workspace.');

// 6: Practices/team and professional profile.
start('عياداتك وفريقك… بتنظيم أوضح.','إعدادات لكل عيادة، وصلاحيات لفريق الاستقبال بحسب مسؤولياته.');
row('نظّم مواعيد العيادة','إدارة بيانات العيادة وجدول العمل وفتراته.',2.95);
row('حدّد دور كل مساعد','إدارة فريق الاستقبال وتعيين صلاحيات العمل.',4.2);
row('حدّث بياناتك المهنية','متابعة ملفك المهني وتخصصك وبيانات عياداتك.',5.45);
rect(.7,2.85,5.9,3.57,C.pale,true);
txt('الدكتور',1.1,3.12,5.1,.55,25,C.teal,true,'center');
rule(1.25,3.94,4.8);
txt('عيادة أو أكثر',1.1,4.18,5.1,.43,21,C.navy,true,'center');
txt('جدول العمل · بيانات العيادة',1.1,4.79,5.1,.35,16,C.slate,false,'center');
txt('فريق استقبال بصلاحيات محددة',1.1,5.62,5.1,.43,19,C.navy,true,'center');
note('المدة: 35 ثانية. ركّز على الفصل بين مسؤولية الطبيب ومهام الاستقبال. لا تعد بأن جميع أعضاء الفريق يطلعون على كل البيانات. المصادر: features/doctor-practices/components/practice-schedule؛ doctor-receptions/pages/doctor-receptions؛ doctor-profile.');

// 7: Financial scope.
start('اعرف ما تم تحصيله… وما عليك.','متابعة مالية تجمع المدفوعات والإيرادات والمصروفات التشغيلية ورواتب الاستقبال.');
row('الحركة المالية والإيرادات','راجع المدفوعات والتحصيل حسب العيادة والفترة.',2.95);
row('المصروفات والمستحقات','سجّل المصروفات وتابع الخطط المتكررة والمبالغ المستحقة.',4.2);
row('رواتب فريق الاستقبال','تابع خطط الرواتب والمبالغ المستحقة وإجراءات السداد.',5.45);
listVisual('صورة مالية مترابطة',[
  ['ما تم تحصيله','المدفوعات والإيرادات'],
  ['ما تم صرفه','مصروفات ورواتب'],
  ['ما لم يُسدّد بعد','المستحقات'],
],'شرح للأقسام المالية؛ لا يتضمن أرقامًا افتراضية');
note('المدة: 40 ثانية. وضّح أن هذا متابعة تشغيلية للعيادة، دون تقديمه كنظام محاسبة ضريبية متكامل. لا تعد بزيادة الأرباح. المصادر: features/finance؛ features/operating-finance/pages/operating-finance؛ المسارات doctor/finance وdoctor/revenue وdoctor/expenses وdoctor/salaries.');

// 8: Reports and insights; cautious operational language.
start('حوّل الأرقام إلى متابعة مفهومة.','تقارير وملاحظات أداء تساعدك تراجع ما تغيّر، وتختار أين تبدأ المتابعة.');
row('تقارير حسب الفترة والعيادة','راجع الحجوزات، والطابور، ونشاط المرضى، والأداء المالي.',2.95);
row('مقارنة أوضح','شاهد القيمة الحالية والسابقة وعدد الحالات المشمولة.',4.2);
row('تفاصيل يمكن الرجوع لها','افتح التفاصيل وصدّر التقارير المتاح تصديرها.',5.45);
rect(.7,2.85,5.9,3.57,C.pale,true);
txt('ملاحظات الأداء',1.07,3.1,5.15,.45,22,C.teal,true);
['ما الذي تغيّر؟','على أي بيانات تعتمد الملاحظة؟','ما الخطوة المقترحة للمراجعة؟'].forEach((s,i)=>{
  txt(s,1.07,3.91+i*.68,5.15,.4,18);
  if(i<2) rule(1.07,4.44+i*.68,5.15);
});
note('المدة: 40 ثانية. ملاحظات الأداء معلومات تشغيلية وليست استشارة طبية أو ضمانًا لنتيجة. وضّح أن اكتمال البيانات يؤثر في دلالة المؤشرات، وأن بعض التقارير لها حدود أو صلاحيات للتصدير. المصادر: features/doctor-reports؛ domains/phase18 ReportCatalogEntry وDoctorInsightResponse؛ reporting.');

// 9: A concrete demo invitation without fictitious pricing/contact info.
start('خلّينا نعرض وصلة على طريقة شغل عيادتك.','عرض عملي قصير يربط إمكانيات البوابة باحتياجك اليومي.',true);
const demo=[['نبدأ بالعيادة','مواعيد العمل وفريق الاستقبال'],['نتابع زيارة مريض','حجز، ودور، وكشف، وروشتة'],['نراجع الصورة كاملة','إيرادات، ومصروفات، وتقارير']];
demo.forEach((d,i)=>{
  const y=2.94+i*.91;
  txt(d[0],8.85,y,3.7,.36,21,C.white,true);
  txt(d[1],1.0,y,7.25,.36,19,'C8DBE5');
  if(i<2) rule(1.0,y+.64,11.55,'35556C');
});
rect(4.47,6.03,4.4,.52,C.teal,true);
txt('نبدأ بتجربة عملية لبوابة الدكتور؟',4.55,6.12,4.24,.28,16,C.white,true,'center');
note('المدة: 25 ثانية. اختم بدعوة لعرض تجريبي مخصص، وليس وعدًا بتجربة مجانية أو سعر غير معتمد. اسأل الطبيب: ما الأكثر احتياجًا للتنظيم في عيادتك الآن؟ ثم اختر جزء العرض العملي بناء على إجابته. لا تستخدم بيانات مرضى حقيقية في العرض. إجمالي المدة المقترحة: نحو خمس دقائق.');

// Keep the deck short while replacing abstract feature panels with actual product captures.
const captures = ['dashboard', 'reservations', 'patients', 'practices', 'finance', 'reports'];
captures.forEach((name, offset) => {
 const p = pages[offset + 2];
 const copy = p.items.filter(o => o.kind === 'text' && o.x === 7.42);
 p.items = p.items.filter(o => o.y < 1.95 || o.y >= 6.9);
 p.items.push({kind:'rect', x:.68,y:2.01,w:8.34,h:4.71,fill:C.line,round:false});
 p.items.push({kind:'image',x:.7,y:2.03,w:8.3,h:4.66875,file:path.join(OUT,'screenshots',name+'.png')});
 copy.forEach((o,i) => p.items.push({...o,x:9.4,y:2.25+Math.floor(i/2)*1.48+(i%2)*.65,w:3.18,h:i%2?.72:.6,size:i%2?14:16.5}));
 p.items.push({kind:'text',s:name==='patients'||name==='reservations'?'لقطة فعلية من الحساب التجريبي · بيانات التعريف محجوبة':'لقطة فعلية من الحساب التجريبي · الأرقام المعروضة للشرح فقط',x:.7,y:6.76,w:8.3,h:.18,size:9,color:C.slate,bold:false,align:'center'});
 p.notes = p.notes.replace('الرسومات في العرض توضيحية وليست لقطات فعلية للمنتج.', 'تحتوي الشريحة على لقطة فعلية من الحساب التجريبي.');
 p.notes += '\nالصورة من الحساب التجريبي للمنصة. الأرقام والبيانات الظاهرة ليست نتائج تجارية أو وعودًا لعيادة العميل. أسماء المرضى وبيانات الاتصال محجوبة في اللقطات التي تحتوي عليها.';
});

function html() {
 const style=`*{box-sizing:border-box}html,body{margin:0;background:#dde5ea;font-family:Tahoma,Arial,sans-serif}body{padding:24px 0}.slide{position:relative;width:1280px;height:720px;margin:0 auto 24px;overflow:hidden;background:#fff;break-after:page;direction:rtl}.slide.dark{background:#${C.navy}}.item{position:absolute}.text{display:flex;align-items:center;white-space:pre-line;line-height:1.12;overflow:visible}.text>span{width:100%;unicode-bidi:plaintext}.controls{position:fixed;bottom:14px;left:14px;z-index:9;background:white;padding:10px 16px;border-radius:8px;color:#123451;font-size:13px;box-shadow:0 3px 15px #12345122}button{font:inherit;margin-inline:5px;cursor:pointer}body.present{padding:0;background:#123451;overflow:hidden}body.present .slide{margin:0;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(var(--scale,1));display:none}body.present .slide.current{display:block}@page{size:1280px 720px;margin:0}@media print{body{padding:0;background:white}.slide{margin:0}.controls{display:none}}`;
 const body=pages.map((p,i)=>`<section class="slide ${p.dark?'dark':''}" aria-label="شريحة ${i+1}">${p.items.map(o=>{
   let st=`left:${o.x*96}px;top:${o.y*96}px;width:${o.w*96}px;height:${o.h*96}px;`;
   if(o.kind==='rect')return `<div class="item" style="${st}background:#${o.fill};${o.round?'border-radius:12px;':''}" aria-hidden="true"></div>`;
   if(o.kind==='image')return `<img class="item" alt="لقطة فعلية من بوابة الدكتور في الحساب التجريبي" style="${st}" src="data:image/png;base64,${fs.readFileSync(o.file).toString('base64')}">`;
   return `<div class="item text" style="${st}font-size:${o.size*96/72}px;color:#${o.color};font-weight:${o.bold?700:400};text-align:${o.align}"><span>${esc(o.s)}</span></div>`;
 }).join('')}</section>`).join('');
 return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>وصلة | بوابة الدكتور</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>${style}</style></head><body>${body}<div class="controls"><button onclick="toggle()">وضع العرض</button><button onclick="prev()" aria-label="الشريحة السابقة">السابق</button><span id="counter">1 / 9</span><button onclick="next()" aria-label="الشريحة التالية">التالي</button></div><script>let index=0;const slides=[...document.querySelectorAll('.slide')];function sync(){document.documentElement.style.setProperty('--scale',Math.min(innerWidth/1280,innerHeight/720));slides.forEach((s,i)=>s.classList.toggle('current',i===index));document.getElementById('counter').textContent=(index+1)+' / '+slides.length}function toggle(){document.body.classList.toggle('present');sync()}function prev(){index=Math.max(0,index-1);sync()}function next(){index=Math.min(slides.length-1,index+1);sync()}addEventListener('resize',sync);addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','PageDown','PageUp',' ','Home','End','Escape'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft'||e.key==='PageDown'||e.key===' ')next();if(e.key==='ArrowRight'||e.key==='PageUp')prev();if(e.key==='Home'){index=0;sync()}if(e.key==='End'){index=slides.length-1;sync()}if(e.key==='Escape')document.body.classList.remove('present')});sync();</script></body></html>`;
}
async function build() {
 const deck = new PptxGenJS();
 deck.layout='LAYOUT_WIDE'; deck.author='Wasla'; deck.title='وصلة | بوابة الدكتور'; deck.company='Wasla'; deck.lang='ar-EG'; deck.rtlMode=true;
 deck.theme={headFontFace:'Tahoma',bodyFontFace:'Tahoma',lang:'ar-EG'};
 for(const p of pages) {
   const s=deck.addSlide();s.background={color:p.dark?C.navy:C.white};
   for(const o of p.items) {
     if(o.kind==='rect')s.addShape(o.round?deck.ShapeType.roundRect:deck.ShapeType.rect,{x:o.x,y:o.y,w:o.w,h:o.h,rectRadius:.12,radius:.12,fill:{color:o.fill},line:{color:o.fill,transparency:100}});
     else if(o.kind==='image')s.addImage({path:o.file,x:o.x,y:o.y,w:o.w,h:o.h});
     else s.addText(o.s,{x:o.x,y:o.y,w:o.w,h:o.h,fontFace:'Tahoma',fontSize:o.size,color:o.color,bold:o.bold,align:o.align,rtlMode:true,lang:'ar-EG',margin:0,valign:'mid',paraSpaceAfterPt:0,lineSpacingMultiple:1.12});
   }
   s.addNotes(p.notes);
 }
 await deck.writeFile({fileName:path.join(OUT,'Wasla-Doctor-Portal.pptx'),compression:true});
 fs.writeFileSync(path.join(OUT,'Wasla-Doctor-Portal.html'),html());
 fs.writeFileSync(path.join(OUT,'presenter-guide.md'),'# وصلة — دليل تقديم بوابة الدكتور\n\nعرض من 9 شرائح، نحو 5 دقائق. الملاحظات التالية للمقدّم ولا تظهر في شرائح البيع.\n\n'+pages.map((p,i)=>`## الشريحة ${i+1}\n\n${p.notes}\n`).join('\n'));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const tab=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 await tab.goto('file:///'+path.join(OUT,'Wasla-Doctor-Portal.html').replaceAll('\\','/'));
 await tab.evaluate(()=>document.fonts.ready);
 await tab.pdf({path:path.join(OUT,'Wasla-Doctor-Portal.pdf'),width:'1280px',height:'720px',printBackground:true,preferCSSPageSize:true,margin:{top:0,bottom:0,left:0,right:0}});
 const overflow=await tab.evaluate(()=>[...document.querySelectorAll('.text')].filter(el=>el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2).map(el=>el.textContent.trim()));
 fs.mkdirSync(path.join(OUT,'preview'),{recursive:true});
 await tab.addStyleTag({content:'body{padding:0}.controls{display:none}.slide{margin:0;display:none}.slide.capture{display:block}'});
 for(let i=0;i<pages.length;i++) {
   await tab.evaluate(index=>{document.querySelectorAll('.slide').forEach((s,j)=>s.classList.toggle('capture',j===index));window.scrollTo(0,0)},i);
   await tab.screenshot({path:path.join(OUT,'preview',`slide-${i+1}.png`)});
 }
 await browser.close();
 fs.writeFileSync(path.join(OUT,'validation.json'),JSON.stringify({slides:pages.length,overflow,generated:new Date().toISOString()},null,2));
 console.log(JSON.stringify({slides:pages.length,overflow,output:OUT}));
}
build().catch(e=>{console.error(e);process.exitCode=1});
