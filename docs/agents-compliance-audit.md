# مراجعة الالتزام بقواعد AGENTS.md

## تصحيح عناوين التاب — 16 سبتمبر 2026

كشف اختبار المستخدم ظهور `common.brand` في التاب: المفتاح الافتراضي كان ناقصًا، ومسارات login والتسجيل وتغيير كلمة المرور ومساحة العمل لم تحدد عناوين. الفحص السابق شمل القوالب واستدعاءات `t` الثابتة، لكنه لم يشمل مفاتيح عناوين المسارات، ولذلك كان الإعلان السابق عن اكتمال الترجمة أوسع من نطاق التحقق الفعلي.

أُضيف المفتاح والعناوين العربية والإنجليزية، ووُسع `check:i18n` للتحقق من مفاتيح عناوين المسارات وإلزام الشاشات النهائية ذات `loadComponent` بعنوان مترجم. أُضيف اختبار للعنوان الافتراضي واختبار تنقل يستخدم عنوان login من ملف routes الفعلي ويتحقق من تبديل اللغة. تحقق المتصفح الآن يفحص `document.title` صراحة: «تسجيل الدخول | وصلة» و`Sign in | Wasla` على عرضي 1440 و390.

آخر تحقق: **1645 مفتاحًا مترجمًا، 336 اختبارًا ناجحًا في 76 ملفًا**، وفحوص المعمارية والترجمة والمتصفح ناجحة. بناء الإنتاج ناجح مع استمرار تحذير initial bundle **781.66 kB** مقابل 600 kB. لم تتغير guards أو عقود API أو منطق تسجيل الدخول.

## أحدث تحقق — اكتمال ترجمة واجهة المشروع، 16 سبتمبر 2026

اكتملت مراجعة النصوص الثابتة لجميع قوالب المكونات وTypeScript: **1639 مفتاحًا** بقيم عربية وإنجليزية غير فارغة في `src/app/core/i18n/translations.ts`، ولا تحتوي القيم الإنجليزية على نص عربي. نُقلت عناوين الإدارة والنماذج والمواعيد والأسعار والاستقبال والمرضى ورسائل الحفظ والتأكيد والتحقق إلى القاموس. صُححت تسميات أسماء المؤهلات، واختيار الأسماء والمواقع حسب اللغة، وتنسيقات التاريخ والاتجاه. القوائم المترجمة ورسائل التحقق تتبع تبديل اللغة بدل الاحتفاظ بترجمة التهيئة الأولى.

أُضيف `npm run check:i18n` وأُدرج في فحص المعمارية؛ يتحقق من اكتمال القاموس وصحة مفاتيح القوالب واستدعاءات `t` الثابتة، ويمنع النصوص الثابتة العربية والإنجليزية في القوالب وتسميات TypeScript، ويشمل التعابير داخل bindings ورسائل template literals. لا يعد هذا الفحص ضمانًا لترجمة بيانات السيرفر أو كل استدعاء بمفتاح ديناميكي. الجرد المتبقي يحوي ثلاثة حروف فقط لتطبيع أسماء المواقع الواردة من السيرفر؛ ليست نصوص واجهة، ويستثني الفحص هذه الاستبدالات المحددة فقط. الأسماء والعناوين الحرة وملاحظات السيرفر تبقى بيانات ولا تُستبدل بترجمات مخترعة. حُفظ توافق استجابات الموقع القديمة مع معالجة not-found مستقلًا عن لغة الواجهة.

التحقق: **334 اختبارًا ناجحًا في 76 ملفًا**، وفحوص المعمارية والترجمة وTypeScript ناجحة. اختبارات المتصفح لشاشتي حجز الطبيب وتسجيل الدخول نجحت باللغتين على عرضي 1440 و390، بما فيها رسائل الحقول المطلوبة واختيار المواعيد والاتجاه وعدم تجاوز عرض الشاشة. ملفات النتائج والصور في `docs/browser-verification`. استخدمت بيانات API معزولة؛ لم تُختبر جميع شاشات الحسابات المصادق عليها في المتصفح ولا التكامل الحقيقي مع السيرفر.

بناء الإنتاج ناجح، لكن initial bundle أصبح **780.83 kB** مقابل حد تحذير **600 kB** بعد اكتمال القاموس. التحذير قائم ولم تُرفع الميزانية أو تُخفى الرسائل. تحسين تحميل الترجمات يحتاج معالجة منفصلة تحافظ على تبديل اللغة المتزامن؛ هذه الدفعة تغلق بند النصوص الثابتة والترجمة ولا تعلن اكتمال جميع بنود AGENTS. مصدر صلاحيات الاستقبال ما زال مؤجلًا للـphase الجديدة حسب قرار المستخدم. الأرقام والعوائق المسجلة في الأقسام التالية تاريخية.

## أحدث دفعة — الحجم والتصميم والمراجعات والتحقق في المتصفح

آخر تحقق: **326 اختبارًا ناجحًا في 75 ملفًا**، وفحص المعمارية ناجح. بناء الإنتاج اكتمل **بلا تحذير حجم**: initial bundle **592.77 kB** مقابل ميزانية 600 kB. الأرقام السابقة أدناه تاريخية.

- استُبدل استيراد Bootstrap الكامل بـ`src/bootstrap.scss` الذي يحتفظ بالـgrid والحقول والأزرار والـutilities والقطع المستخدمة، ويستبعد القطع التفاعلية غير المستخدمة. لم تُرفع الميزانية. تحذيرات Sass المعروفة المرتبطة بمصدر Bootstrap القديم مستثناة من الإخراج؛ أخطاء البناء وفحوص المصدر لم تُعطل.
- عُدلت 79 قاعدة حدود في 27 ملف CSS للحقول والأسطح والرسائل إلى التوكن المحايد، دون إضافة overrides أو تغيير قواعد البيزنس. ألوان الأزرار والـbadges والأيقونات ومؤشرات التحميل محفوظة.
- رُحلت 120 رسالة إضافية لمراجعات الإدارة وضوابط الصلاحيات إلى القاموس العربي والإنجليزي. رسائل التحقق المحلية المترجمة تُعرض بمفاتيحها لتتبع تغيير اللغة.
- قائمة الأطباء تفتح DoctorDetails داخل drawer بدل التنقل من القائمة، مع الحفاظ على رابط التفاصيل المباشر. يبقى البحث عند الإغلاق، ويُمنع الإغلاق أثناء تنفيذ القرار. ردود التفاصيل والمستندات المتأخرة لا تحتفظ بموارد بعد تدمير المكون. أُضيفت أربعة اختبارات لهذه الحالات.
- أُصلح تجميع اسم action لصلاحية متداخلة ليحتفظ بالفاصل `.` بدل إدخال `/`، باختبار انحدار.
- اختبار تكامل في Chrome للبحث عن إتاحة الطبيب واختيار العيادة واليوم والموعد ثم عرض السعر نجح بالعربي والإنجليزي عند عرض 1440 و390 بكسل. فُحص منع اليوم غير المتاح وعدم overflow والاتجاه. الردود API fixtures معزولة، وليست تحققًا من قبول السيرفر الحقيقي أو جميع ميزات المشروع. نتائج وصور الاختبار في [browser-verification](browser-verification/results.json)، وأداة التشغيل `scripts/browser-public-discovery.cjs`.

**لا تزال المطابقة الشاملة مفتوحة:** الجرد الحالي يحتوي 770 نصًا عربيًا مختلفًا خارج القاموس، تشمل UI وبيانات تحتاج تصنيفًا. لم تُراجع كل mutations والنوافذ وكل شاشات المشروع في المتصفح؛ إزالة carditis والتغطية السلوكية تحتاج استكمالًا. اختبارات المعمارية تثبت قواعد محددة وليست برهانًا على الأمن والأداء الكاملين. مصدر صلاحيات الاستقبال مؤجل حسب الاتفاق.

## آخر تحقق وإصلاحات الالتزام — 16 سبتمبر 2026

**الالتزام الكامل لم يتحقق بعد.** آخر تحقق: 321 اختبارًا ناجحًا في 75 ملفًا، وفحص المعمارية ناجح، وبناء الإنتاج ناجح مع تحذير initial bundle بحجم 632.64 kB مقابل 600 kB. الأرقام والفقرات القديمة أدناه سجل تاريخي وليست قائمة النواقص الحالية.

- أُضيفت 53 ترجمة مركزية عربية وإنجليزية لضوابط الحجز والعيادات والإدارة. صفحة تفاصيل الطبيب تستخدم اتجاه اللغة الحالي، وأسماء العيادات والتخصصات وأنواع الزيارة بالإنجليزية عند توفرها.
- لا تظهر رسائل خلو الإتاحة أثناء انتظار الطلب، والأيام التي يرجعها السيرفر كغير متاحة لا يمكن اختيارها من الواجهة. أُضيفت ثلاثة اختبارات انحدار للغة والاتجاه والتحميل وعدم الإتاحة.
- أُزيل الحد الملون للاختيار في صفحة الإتاحة، وأضيف focus-visible، واستُبدلت كروت أنواع الزيارة بصفوف ذات فواصل محايدة.
- أُضيف فحص لمفاتيح الترجمة المكررة، ووجود ar/en غير فارغين، والمفاتيح الثابتة المستخدمة في القوالب. أداة ترحيل الترجمة ترفض إعادة استعمال مفتاح بنص مختلف بدل إنشاء مفتاح مكرر.
- أُصلحت 14 رسالة تحقق إضافية لتُترجم عند العرض، فتتبع تبديل اللغة دون إعادة إنشاء النموذج.

المتبقي المثبت: جرد الترجمة الحالي يحتوي 890 نصًا عربيًا مختلفًا خارج القاموس، تشمل نصوص UI وبيانات تحتاج تصنيفًا؛ ليس هذا عدد مخالفات مؤكدًا. يلزم استكمال الترجمة ومراجعة CSS والتوستات والـdrawers والتغطية السلوكية، ومعالجة تحذير الحجم والتحقق المرئي وE2E. مصدر صلاحيات الاستقبال مؤجل حسب الاتفاق.

فاحص Impeccable أبلغ عن صورتين بلا src لأنه لا يقرأ Angular `[src]`؛ الصور مشروطة بوجود URLs ولها fallback عند الفشل. هذا الفحص لا يعوض تحقق المتصفح الذي لم يُجر لهذه الدفعة.

## خطة فصل مجلدات المكونات

نُفذت [خطة فصل المكونات](component-folder-migration-plan.md): نُقلت 48 ملفًا للمكونات الاثني عشر الموجودة في جذور الميزات إلى مجلدات مستقلة تحت `pages` و`components`، وحُدثت imports وroutes والاختبارات. أضيفت قواعد الملكية إلى AGENTS.md وفحوص آلية للمجلدات والموارد وSPEC ومنع اعتماد المكونات الداخلية على الصفحات.

التحقق: **318 اختبارًا ناجحًا في 75 ملفًا**، وفحص المعمارية ناجح، وبناء الإنتاج اكتمل. يوجد تحذير حجم initial bundle **624.29 kB** مقابل ميزانية تحذير **600 kB**؛ لم يجر تحقق مرئي أو E2E. إغلاق بند فصل المجلدات لا يعني إغلاق بقية بنود المراجعة.

## الإصلاح الشامل قيد التنفيذ — 16 سبتمبر 2026

الطلب الحالي هو إكمال جميع إصلاحات الفرونت تدريجيًا دون تغيير البيزنس. مصدر صلاحيات الاستقبال مؤجل للـphase الجديدة بقرار المستخدم. البنود التالية أُنجزت في نسخة العمل، لكن لا تعتبر جميع بنود التقرير مغلقة:

- نُقلت خدمات الأعمال وعقودها واختباراتها من Core إلى مالكها: الخدمات الخاصة بميزة واحدة في `features/*/services`، والقدرات المشتركة بين ميزات مستقلة في `domains/*` بواجهات `index.ts` عامة. احتفظ النقل بالخدمات والـendpoints والعقود نفسها.
- نُقل PatientPicker من Shared إلى مكونات Reception، وSpecializationSelector إلى مكونات دومين DoctorProfile. لا يوجد orchestration خاص بالمرضى داخل Shared الآن.
- امتلكت Auth وPractices وReceptions وDoctorProfile وOnboarding وPatient وReception ملفات routes مستقلة. حُفظت URLs وguards والصلاحيات وترتيب recovery routes. حُدث كشف وضع الإنشاء ليتوافق مع المسار الفرعي `new`.
- أُزيلت تصريحات `!important` المتبقية، وقواعد إخفاء أزرار البحث المكررة في CSS الإدارة. أُزيلت جميع مواضع `$any` وexplicit `any` الموجودة في الاختبارات.
- أُضيف `npm run check:architecture` لفحص حدود الميزات والدومينات وShared، وصحة imports المحلية والدوائر والأنواع وCSS. الفحص ناجح بعد النقل.
- وقت المواعيد له مصدر واحد الآن في `periodModel`؛ قيم الساعة والدقيقة وAM/PM مشتقة عبر computed، وحُذفت حالات المزامنة المكررة. اختبارات المواعيد التسعة نجحت بعد التغيير.
- اكتمل ترجمة البحث العام والاتجاه وأسماء الخيارات المرجعية. أُضيفت ستة اختبارات لسلوكه. رُحلت نصوص مشتركة ونصوص مراجعة الدومينات إلى القاموس؛ الترجمة العامة للمشروع ما زالت قيد الاستكمال.
- أُضيف LocalizedTitleStrategy وترجمة مركزية لكل عنوان route معرف، مع متابعة تغيير اللغة دون إعادة التنقل.
- أُضيف feedback لمسارات نجاح كانت صامتة في طلبات العائلة والإدارة والتسجيل واسترجاع الحساب. الأخطاء التقنية تستخدم interceptor الموجود لتجنب تكرار إشعار الخطأ.
- أُضيفت اختبارات سلوك لـSpecializationSelector وToastContainer وFileUpload وForgotPassword وOtpHandoff وResetPassword ولعقود التوجيه. أُضيف stylesheet الموجود إلى ForgotPassword.

آخر تحقق كامل قبل تعديلات عناوين المسارات والتوستر الأخيرة: **187 اختبارًا في 43 ملفًا نجحوا**. بناء الإنتاج نجح بعد ترحيل النصوص المشتركة. الاختبارات والبناء النهائيان سيعادان بعد اكتمال العمل. ما زال مطلوبًا استكمال specs المكونات، بقية النصوص والترجمات والتوستات، توحيد CSS والأسطح، وتحويل تفاصيل المراجعات المتبقية إلى drawers والتحقق البصري.

## تقدم الإصلاح — الدفعة الثانية، 16 سبتمبر 2026

التحقق النهائي: **157 اختبارًا نجحوا في 35 ملفًا** عبر `npm test -- --watch=false`، وبناء الإنتاج نجح. لم يُجر اختبار E2E أو تحقق بصري في المتصفح لهذه الدفعة.

**صلاحيات الاستقبال مؤجلة للـphase الجديدة بقرار المستخدم.** ربط مصدرها من السيرفر خارج نطاق الدفعات الحالية، مع الحفاظ على السلوك التشخيصي المتاح لفحص Payload.

- **تغيير كلمة المرور:** أُضيف ToastService للنجاح والفشل. جميع النصوص الثابتة والتسميات وplaceholders ورسائل التحقق أصبحت مفاتيح مركزية عربية وإنجليزية، باستخدام TranslatePipe الموجود باسم `t`. رسائل التحقق المحلية تُترجم وقت العرض حتى تتغير فور تبديل اللغة. رسائل السيرفر تبقى معروضة كما وردت، دون تغيير تحليل الأخطاء.
- **طلب تخصصات الدكتور:** أُضيفت إشعارات مترجمة للتحقق المحلي والإرسال وإعادة الإرسال والفشل. لم تتغير صلاحيات الإرسال، اختيار التخصص الأساسي، التفريق بين الإرسال وإعادة الإرسال، `rowVersion`، أو إعادة تحميل البيانات عند تعارض 409.
- **اختبارات سلوك جديدة:** خمسة اختبارات لتغيير كلمة المرور تغطي الترجمة وإظهار كلمة المرور والنجاح ورفض عدم التطابق والفشل ومنع تكرار الطلب أثناء الحفظ؛ وأربعة لطلب التخصصات تغطي التحقق والإرسال وإعادة الإرسال مع concurrency واحتفاظ الاختيارات عند رفض الخادم. نجحت مجموعتا الاختبارات المستهدفة.
- **اكتمال ملفات المكونات:** أُضيف SPEC إلى ChangePassword وDoctorProfile؛ نقص ملفات SPEC انخفض إلى 38 من أصل 49 مكوّنًا، مقارنة بـ41 في المراجعة الأصلية.
- **بناء الإنتاج:** نجح `npm run build` بعد هذه الدفعة، مع initial bundle بحجم 542.09 kB خام، داخل ميزانيات المشروع.

هذه الدفعة لا تحل جميع توستات وترجمات DoctorProfile أو بقية الشاشات. نقل خدمات الدومين من Core وتنقية Shared وبقية فجوات الاختبارات والتصميم والتوجيه ما زالت مفتوحة، وتحتاج دفعات مستقلة تحافظ على سلوك المستهلكين.

## تقدم الإصلاح — الدفعة الأولى، 16 سبتمبر 2026

بناء الإنتاج `npm run build` نجح بعد هذه الدفعة: initial bundle **542.09 kB** خام و**107.23 kB** نقل تقديري، داخل ميزانيات المشروع.

الأرقام والمخالفات أدناه تمثل لقطة المراجعة الأصلية قبل الإصلاح. ملف `agents-compliance-findings.json` محفوظ كلقطة أصلية أيضًا، وليس قياسًا محدثًا بعد التعديلات.

- **LanguageSwitcher:** أصبح له HTML وSPEC مستقلان، مع OnPush وترجمة مركزية لتسميات التحكم واختبار التبديل في الاتجاهين. نقص ملفات SPEC انخفض من 41 إلى 40 مكوّنًا.
- **Strong typing:** استُبدل `any[]` في `PageHeader.actionRouterLink` بـ`readonly unknown[]`، دون تغيير مسارات التنقل.
- **النوافذ والتركيز:** أُضيفت آلية مشتركة لحصر تنقل Tab وإعادة التركيز بعد الإغلاق، واستخدمت في SideDrawer ونوافذ المواعيد. نوافذ المواعيد المغلقة لا تبقى داخل DOM، مع دعم Escape ومنع الإغلاق أثناء حفظ الفترة أو الاستثناء.
- **مصدر حقيقة المواعيد:** حُذفت حقول الوقت المخفية المخصصة للاختبارات، وأصبحت اختبارات الإضافة تستخدم أدوات اختيار الوقت الفعلية، مع الحفاظ على شكل طلب الإضافة وقواعد التحقق الحالية.
- **CSS:** أُزيلت أربعة استخدامات `!important` وقواعد padding واتجاه متكررة في حقول الاستقبال. أُزيل `!important` الخاص بعرض SideDrawer على الهاتف باستخدام متغير CSS للعرض المطلوب. إجمالي الاستخدامات في اللقطة انخفض من 33 إلى 28.
- **التحقق:** نجحت الاختبارات المستهدفة (18 اختبارًا)، ثم اختبارات المشروع كاملة (148 اختبارًا في 33 ملفًا). فحص Impeccable للملفات المعدلة لم يُصدر ملاحظات آلية. هذا لا يعادل اختبارًا بصريًا أو E2E في المتصفح.

لم تتغير عقود API أو معرفات الصلاحيات أو التسعير أو الحجز. استثناء إرسال صلاحيات فارغة لفحص Payload في الاستقبال محفوظ بطلب المستخدم. ما زال توفير catalog صلاحيات قابل للقراءة للدكتور مطلوبًا من الخادم، ولم يُعتبر الربط محلولًا.

المخالفات الأخرى ما زالت مفتوحة: ملكية خدمات الدومين داخل Core، تبعيات Shared الخاصة بالمرضى، بقية الترجمات والتوستات، اختبارات المكونات الناقصة، وبقية مشاكل التصميم والتوجيه. تُعالج تدريجيًا مع اختبار المستهلكين قبل كل نقل أو تغيير.

التاريخ: 16 سبتمبر 2026. المرجع: [.agents/skills/AGENTS.md](../.agents/skills/AGENTS.md)، مع تعليمات المشروع التي قدمها المستخدم في المحادثة.

**النتيجة: التطبيق يطبق أجزاء مهمة من معايير Angular، لكنه لا يحقق بوابة اكتمال AGENTS.md. نجاح البناء والاختبارات لا يكفي لإثبات المطابقة.**

المراجعة تخص نسخة العمل الحالية، بما فيها التعديلات غير الملتزمة في Git. شملت قراءة المعمارية والملفات المهمة، تحليل TypeScript وAngular templates وCSS، وتشغيل اختبارات المشروع وبناء الإنتاج. لم تُعدَّل ملفات التطبيق خلال هذه المراجعة.

## نتائج قابلة للقياس

| الفحص                                    |  النتيجة | تفسير النتيجة                                                                                                                |
| ---------------------------------------- | -------: | ---------------------------------------------------------------------------------------------------------------------------- |
| ملفات المصدر التي جرى مسحها              |      230 | تحت `src/`                                                                                                                   |
| المكونات                                 |       49 | اكتشاف `@Component` باستخدام TypeScript AST                                                                                  |
| مكونات بدون ملف spec مقابل               |       41 | وجود tests لخدمة أو للـrouting لا يعوض spec المكون                                                                           |
| مكونات تستخدم OnPush                     | 48 من 49 | اختيار جيد؛ OnPush تفضيل وليس شرط اكتمال مستقل                                                                               |
| explicit `any` في كود الإنتاج            |        1 | لا يشمل assertions غير الآمنة الأخرى                                                                                         |
| explicit `any` في الاختبارات             |       31 | الاختبارات أيضًا جزء من جودة الكود                                                                                           |
| مواضع `$any()` في القوالب                |        7 | تجاوز للتحقق من الأنواع                                                                                                      |
| تصريحات `!important`                     |       33 | تشمل CSS العام وCSS المكونات                                                                                                 |
| إعادة ظهور selector داخل نفس الأب في CSS |       56 | بعد فك قوائم selectors؛ يشمل تقسيم قاعدة مشتركة ثم تخصيصها، وليس 56 تعارضًا وظيفيًا مثبتًا                                   |
| مقاطع نصية ثابتة في قوالب HTML           |     1019 | مقاطع وليست نصوصًا فريدة؛ علامة على عدم استكمال الترجمة المركزية، والعدد لا يشمل كل literals داخل interpolations وTS والسمات |
| مفاتيح قاموس الترجمة                     |      126 | كل المفاتيح الحالية تحتوي `ar` و`en` غير فارغين                                                                              |
| مفاتيح ترجمة ثابتة مستخدمة وغير معرفة    |        0 | لا يشمل توليد المفاتيح ديناميكيًا                                                                                            |
| imports مباشرة بين features مختلفة       |        0 | التحليل للـimports المحلية في ملفات الإنتاج                                                                                  |
| دوائر في graph الملفات المحلية           |        0 | يشمل imports ثابتة وديناميكية قابلة للحل؛ ليس إثباتًا لغياب كل coupling وقت التشغيل                                          |

التحقق التنفيذي: **31 ملف اختبار نجحوا، بإجمالي 141 اختبارًا** عبر `npm test -- --watch=false`. بناء الإنتاج `npm run build` نجح، بحجم initial bundle يقارب **542.07 kB** خام و**107.32 kB** تقديري بعد النقل، داخل ميزانيات Angular الحالية.

## المخالفات والأولويات

### 1. مصدر صلاحيات الاستقبال لا يسمح بإتمام أول ربط — أولوية مرتفعة

في [doctor-receptions.ts](../src/app/features/doctor-receptions/pages/doctor-receptions/doctor-receptions.ts)، `permissionOptions` مشتقة من `reception.assignments[].permissions`. الموظف الجديد الذي لا يملك assignments لا يجد أي خيارات؛ والروابط القديمة لا تمثل قائمة كاملة بكل الصلاحيات التي يجوز منحها. هذا قصور في عقد البيانات ومصدر الحقيقة، وليس مشكلة زر فقط. ظهر رفض السيرفر الفعلي لغياب `PermissionIds` أثناء اختبار المستخدم.

الإرسال بصلاحيات فاضية متاح حاليًا **بطلب صريح من المستخدم لفحص Payload**. هذا استثناء تشخيصي مقصود وليس حلًا مكتملًا للربط. لا يجب اعتباره سلوك إصدار مكتمل.

الإصلاح المطلوب: توفير catalog لصلاحيات الاستقبال يمكن للدكتور المصرح له قراءته، وتحميله مستقلًا عن روابط الموظف، ثم اختيار المعرفات وتغطية أول ربط باختبار integration مع التحقق الحقيقي في السيرفر. لا يكفي استنتاج قبول `null` من schema في Swagger، أو اختلاق GUIDs، أو إعادة استخدام صلاحيات مرتبطة فقط.

### 2. ملفات اختبارات المكونات غير مكتملة — القواعد 6 و7.4 و29 و30

**41 من 49 مكونًا** لا يمتلكون spec مقابلًا، منهم `public-doctors` و`public-doctor-details` و`practice-segments` و`patient-profile` ومعظم مكونات Admin وAuth. الملحق يذكر القائمة كاملة.

وجود spec لا يثبت استيفاء كل حالات loading/empty/error/input/output: مثل [page-header.spec.ts](../src/app/shared/components/page-header/page-header.spec.ts) يغطي الإنشاء والضغط على الإجراء لكنه لا يغطي كل حالات الإجراء والحالة. المطلوب tests للسلوك الفعلي وفق مسؤولية كل مكون، لا إنشاء ملفات اختبار شكلية.

[forgot-password.ts](../src/app/features/auth/forgot-password/forgot-password.ts:9) لا يعلن ملف styles، مع غياب spec. يجب تقييم ما إذا كان styleless فعلًا قبل إضافة styles؛ استثناء styleless منصوص عليه. [language-switcher.ts](../src/app/shared/components/language-switcher/language-switcher.ts) يستخدم template inline وليس ملف HTML مستقل، خلاف معيار الملفات الأربعة الصريح، رغم أن Angular يدعم inline templates.

### 3. خدمات الدومينات وموديلاتها متجمعة داخل Core — القواعد 11 و16 و17

أمثلة مؤكدة: `core/doctor-practices` و`core/doctor-receptions` و`core/patients` و`core/families` و`core/public-discovery`. هذه مسؤوليات بيانات تخص أعمال التطبيق وليست HTTP infrastructure عامة. المسح وجد 13 خدمة injectable مرشحة خارج Auth/I18n/Notifications/Media؛ الرقم يشمل `security-governance` الذي يحتاج قرار ملكية منفصل باعتباره متعلقًا بالأمن، ولا ينبغي نقله آليًا مع خدمات الأعمال.

الإصلاح: نقل خدمات وموديلات كل capability إلى مالكها مع تحديث المستهلكين واختباراتهم تدريجيًا. عندما تتشارك عدة features نفس دومين، نحدد واجهة عامة مستقرة للدومين بدل imports من implementation خاص أو وضع كل شيء في Shared. يبقى Auth وHTTP وI18n والتوستر وإدارة الوسائط التقنية في infrastructure المناسبة.

### 4. Shared يحتوي بحث مرضى وتبعيات خاصة بالدومين — القواعد 1.3 و1.4 و16

[patient-picker.ts](../src/app/shared/patient-picker/patient-picker.ts:19) يحقن `PatientsApi` مباشرة ويدير طلب البحث والنتائج. المسؤولية ليست primitive عامة، وتشمل workflow خاصًا بالمرضى. [specialization-selector.ts](../src/app/shared/specialization-selector/specialization-selector.ts:2) مرتبط بنوع من `doctor-profile`؛ هذه تبعية تحتاج فصل reference-data عن implementation الخاص بالملف الشخصي.

الإصلاح: تقديم picker عرضي يتلقى النتائج والحالة ويطلق أحداث البحث والاختيار، مع orchestration لدى مالك الدومين/الصفحة. لا نضيف facade أو repository شكليًا؛ الفصل مطلوب لتوضيح الملكية والاستعمال الفعلي.

### 5. الترجمة AR/EN غير مكتملة — القواعد 31.21 و32.6

قاموس الترجمة الحالي مكتمل داخليًا، لكن معظم الواجهة لا يستهلكه بالكامل. أمثلة: [public-doctors.html](../src/app/features/public-doctors/pages/public-doctors/public-doctors.html) يحتوي عناوين بحث وحقول وحالات ثابتة بالعربية؛ [doctor-receptions.html](../src/app/features/doctor-receptions/pages/doctor-receptions/doctor-receptions.html:135) يحتوي عنوانًا ووصفًا ونصوص أزرار ثابتة؛ [side-drawer.html](../src/app/shared/components/side-drawer/side-drawer.html) يحتوي aria labels ثابتة؛ وهناك validation messages وtoasts ثابتة في TS.

الإصلاح: تسجيل النصوص تحت مفاتيح دومين واضحة في `TRANSLATIONS` ثم استخدام `TranslatePipe`/`LanguageService`، بما يشمل placeholder وtooltip وaria label وtoast والـroute titles. يلزم اختبار تبديل اللغة الفعلي مع RTL/LTR؛ المسح النصي لا يثبت الانتقال البصري الصحيح.

### 6. CSS يستخدم overrides وimportant ويقسم نفس selectors — القواعد 7.3 و18 وتعليمات Refactor

يوجد **33 تصريح `!important`**. مثال واضح على override متكرر: [doctor-receptions.css](../src/app/features/doctor-receptions/pages/doctor-receptions/doctor-receptions.css:1223) يفرض padding جانبيًا على input باستخدام important، ثم يعيد نفس المسافات في قواعد اتجاه LTR.

إعادة ظهور selectors داخل نفس السياق وصلت 56 موضعًا. مثال [practice-schedule.css](../src/app/features/doctor-practices/components/practice-schedule/practice-schedule.css:475): `.field-select` مشارك في قاعدة input/select ثم يظهر منفصلًا عند السطر 503. تقسيم base styles وspecific properties قد يكون صالحًا وظيفيًا، لكنه يحتاج توحيدًا وفق تفضيل المستخدم الصريح بعدم تكرار selector. لا نحذف تمييز media/state rules الطبيعي أو نعتبره تعارضًا بلا دليل.

الإصلاح: تعديل القاعدة المالكة بدل append، واستخدام logical padding، وإزالة obsolete rules بعد ترحيل المستهلكين. لا تستخدم specificity أو important للتغلب على Bootstrap.

### 7. حدود مدخلات وأسطح ملوّنة، وضوابط غير متسقة — القواعد 32.1 و32.5

أمثلة واضحة للـinputs: [practice-schedule.css](../src/app/features/doctor-practices/components/practice-schedule/practice-schedule.css:494) يغير لون border عند التركيز إلى teal؛ و[doctor-receptions.css](../src/app/features/doctor-receptions/pages/doctor-receptions/doctor-receptions.css:913) يفعل ذلك أيضًا. المعيار المطلوب neutral border مع focus ring. في نفس تصميم schedule، `.field-select` و`.field-input` بارتفاع 38px، بينما معيار الحقول المحدد هو 42px؛ compact controls تحتاج token واستثناء مقصودًا بدل قيمة جديدة بلا اتساق.

توجد حدود ملوّنة كثيرة في CSS، لكن **لم نحسب كل badge/status/button كخرق**؛ لهذه العناصر استعمالات accent مسموحة. يلزم تقييم كل container/input بحسب selector والسياق.

### 8. النوافذ والـdrawers لا تحقق إدارة التركيز — القواعد 7.2 و19

[side-drawer.ts](../src/app/shared/components/side-drawer/side-drawer.ts) يعالج Escape، لكنه لا ينقل التركيز إلى النافذة ولا يحصر Tab بداخلها ولا يعيد التركيز إلى العنصر الذي فتحها. `aria-modal` وحده لا يحقق هذه السلوكيات. نافذتا schedule موجودتان في DOM حتى الإغلاق ومخفّيتان بواسطة opacity/pointer-events، بدون hidden/inert أو فصل rendering، فيظل احتمال الوصول إلى عناصر مغلقة بالكيبورد قائمًا.

الإصلاح: نافذة واحدة موثوقة ذات إدارة focus/lifecycle، مع return focus واسم accessible وربط حالات busy وإغلاق آمن. اختبار Tab/Escape واسترجاع التركيز في المتصفح ضروري.

### 9. ToastService لا يغطي كل mutations — القاعدة 32.4

[doctor-profile.ts](../src/app/features/doctor-profile/pages/doctor-profile/doctor-profile.ts:122)، `saveSpecializations` يرسل/يعيد إرسال طلب تخصص ويحدث الحالة والتاريخ بدون success toast. [change-password.ts](../src/app/features/auth/change-password/change-password.ts:53) يغير كلمة المرور ويحول إلى login بدون ToastService، مع اعتماد رسالة صفحة الوجهة.

الـerror interceptor المركزي موجود ومركّب، وهذه نقطة جيدة، لكنه لا يوفر success feedback لكل mutation. الإصلاح يجب أن يكون في مسار النجاح الحقيقي برسائل مترجمة، وألا يكرر إشعار الخطأ الذي يعرضه interceptor بلا حاجة.

### 10. تجاوز typing وكود داخل DOM مخصص للاختبارات — القواعد 1.6 و7.1 و7.4

[page-header.ts](../src/app/shared/components/page-header/page-header.ts:34) يحتوي `string | any[] | null` بدون تبرير تقني في الكود. وهناك 31 explicit any في specs و7 `$any` في templates.

[practice-schedule.html](../src/app/features/doctor-practices/components/practice-schedule/practice-schedule.html:611) يحتوي inputين time مخفيين بعنوان صريح يوضح أنهما للاختبارات، مع CSS خاص بهما. الاختبارات يجب أن تستخدم الـpicker الذي يستخدمه الشخص، لا أن تفرض controls زائدة داخل المنتج. كذلك يتم تمثيل الوقت في `periodModel` وفي عدة signals مستقلة للساعة والدقيقة والفترة، مع helpers للمزامنة؛ الأخطاء التي ظهرت في الاختيار تؤكد ضرورة مراجعة مصدر الحقيقة.

الإصلاح: typing للـrouter commands والأحداث، tests عبر controls الحقيقية، وإزالة مدخلات وCSS الاختبار بعد ترحيل specs. تمثيل الوقت يجب أن يُشتق قدر الإمكان من مصدر واحد مع تحويل واضح عند حدود العرض/طلب API.

### 11. تنظيم routes والتفاصيل والمسؤوليات يحتاج استكمالًا — القواعد 9 و10 و15 و32.3

[app.routes.ts](../src/app/app.routes.ts) يحمل تفاصيل routes للدكتور والمريض والاستقبال؛ وحدها Admin تمتلك `admin.routes.ts` منفصلًا. الـlazy loading مطبق، لكن ملكية feature routes جزئية. عدة routes مثل `doctor/receptions/:receptionId` وAdmin request details تعرض صفحات تفاصيل مستقلة، بينما تفضيل المستخدم الحالي يطلب drawers للتفاصيل والمراجعات. يجب مراعاة أي استثناءات صريحة سابقة للمستخدم قبل تحويل صفحة كاملة.

`doctor-profile.ts` بطول 672 سطرًا و`practice-schedule.ts` بطول 516 سطرًا؛ وreceptions يجمع 994 سطر HTML مع 1509 سطر CSS. **عدد الأسطر مؤشر مراجعة، وليس حدًا مصطنعًا أو إثباتًا بمفرده**. الفصل المناسب يكون حسب المسؤولية: جدول، استثناءات، محرر، تفاصيل، وليس إنشاء abstraction لكل عنصر.

يوجد استخدام واسع لبطاقات داخل بطاقات وصفوف ذات أسطح مستقلة في receptions/segments. هذا مرشح لتبسيط DOM وفق قواعد card-minimalist، لكن تقييم spacing وcarditis بصريًا يحتاج مرور متصفح على الشاشات.

## ما يطبّقه المشروع بالفعل

- Angular 21 ومكونات standalone؛ لم يظهر NgModule في مسح التطبيق.
- استخدام واسع لـ`inject()` وsignals وcomputed وAngular control flow.
- TypeScript strict وstrictTemplates وstrict DI مفعلة.
- lazy routes وpermission/auth guards على المسارات المقيدة.
- فصل AuthSession وHTTP auth/error interceptors وToastService في Core.
- ToastContainer مركب في App، فلا تتطلب كل صفحة حاوية توستر خاصة بها.
- source graph لا يحتوي cross-feature imports مباشرة أو دوائر محلية مكتشفة.
- subscriptions المهمة التي جرى فحصها تستخدم cleanup، مثل reset-password عبر `takeUntilDestroyed()` وPageHeader عبر `DestroyRef`.
- tokens عامة وBootstrap CSS مركبان، مع دعم اتجاه اللغة في LanguageService.
- tests الموجودة وproduction build ناجحان.

## ترتيب الإصلاح المقترح

1. إكمال contract صلاحيات الاستقبال وأول ربط فعلي، ثم إزالة الاستثناء التشخيصي للصلاحيات الفاضية.
2. tests لسلوك المكونات ومسارات العمل الأكثر استخدامًا: discovery، patients، practices، receptions، auth.
3. استكمال AR/EN مع accessible strings وtoasts.
4. توحيد إدارة النوافذ/الـdrawers وإزالة controls الاختبار من DOM.
5. إزالة important والـoverrides والحدود الملوّنة للـinputs والأسطح، feature واحدة كل مرة.
6. ترحيل ملكية خدمات الدومينات وroutes بحدود عامة مستقرة، مع اختبار المستهلكين بعد كل انتقال.

لا يجب كتابة tests لمجرد إكمال الأرقام، أو ترحيل كل Core آليًا، أو إعادة كتابة التطبيق دفعة واحدة. بوابة الجودة المطلوبة هي behavior وownership وmaintainability، مع حذف القديم بعد كل ترحيل.

## حدود التحقق

لم تُنفّذ خلال هذه المراجعة اختبارات متصفح E2E أو تدقيق بصري لكل viewport، ولا مراجعة backend authorization أو database أو تشفير النقل في بيئة النشر. لا يمكن إثبات غياب dead CSS أو تحقيق pixel-perfect/responsiveness أو أمان كامل من AST/build وحدهما. غياب circular imports المكتشفة لا يثبت خلو التطبيق من state أو runtime coupling. سجل Git وتعديلاته السابقة ليسا دليلًا على أن workflow التفتيش قبل كل تعديل قد اتُّبع تاريخيًا.

تسمية الملفات المختصرة (`public-doctors.ts` بدل `.component.ts`) convention موجودة في المشروع؛ ينبغي حسم توحيدها بشكل مستقل بدل تنفيذ إعادة تسمية واسعة لمجرد المطابقة الشكلية.

## ملحق المكونات بدون spec

- [features/admin/admin-layout/admin-layout.ts](../src/app/features/admin/admin-layout/admin-layout.ts)
- [features/admin/confirmation-dialog/confirmation-dialog.ts](../src/app/features/admin/confirmation-dialog/confirmation-dialog.ts)
- [features/admin/doctor-decision-dialog/doctor-decision-dialog.ts](../src/app/features/admin/doctor-decision-dialog/doctor-decision-dialog.ts)
- [features/admin/doctor-details/doctor-details.ts](../src/app/features/admin/doctor-details/doctor-details.ts)
- [features/admin/doctors-list/doctors-list.ts](../src/app/features/admin/doctors-list/doctors-list.ts)
- [features/admin/family-request-details/family-request-details.ts](../src/app/features/admin/family-request-details/family-request-details.ts)
- [features/admin/family-requests-list/family-requests-list.ts](../src/app/features/admin/family-requests-list/family-requests-list.ts)
- [features/admin/medical-specialization-details/medical-specialization-details.ts](../src/app/features/admin/medical-specialization-details/medical-specialization-details.ts)
- [features/admin/medical-specializations-list/medical-specializations-list.ts](../src/app/features/admin/medical-specializations-list/medical-specializations-list.ts)
- [features/admin/role-details/role-details.ts](../src/app/features/admin/role-details/role-details.ts)
- [features/admin/roles-list/roles-list.ts](../src/app/features/admin/roles-list/roles-list.ts)
- [features/admin/specialization-request-details/specialization-request-details.ts](../src/app/features/admin/specialization-request-details/specialization-request-details.ts)
- [features/admin/specialization-requests-list/specialization-requests-list.ts](../src/app/features/admin/specialization-requests-list/specialization-requests-list.ts)
- [features/admin/superadmin-create/superadmin-create.ts](../src/app/features/admin/superadmin-create/superadmin-create.ts)
- [features/admin/superadmin-details/superadmin-details.ts](../src/app/features/admin/superadmin-details/superadmin-details.ts)
- [features/admin/superadmin-form/superadmin-form.ts](../src/app/features/admin/superadmin-form/superadmin-form.ts)
- [features/admin/superadmins-list/superadmins-list.ts](../src/app/features/admin/superadmins-list/superadmins-list.ts)
- [features/auth/auth-layout/auth-layout.ts](../src/app/features/auth/auth-layout/auth-layout.ts)
- [features/auth/change-password/change-password.ts](../src/app/features/auth/change-password/change-password.ts)
- [features/auth/doctor-registration/doctor-registration.ts](../src/app/features/auth/doctor-registration/doctor-registration.ts)
- [features/auth/file-upload/file-upload.ts](../src/app/features/auth/file-upload/file-upload.ts)
- [features/auth/forgot-password/forgot-password.ts](../src/app/features/auth/forgot-password/forgot-password.ts)
- [features/auth/login/login.ts](../src/app/features/auth/login/login.ts)
- [features/auth/otp-handoff/otp-handoff.ts](../src/app/features/auth/otp-handoff/otp-handoff.ts)
- [features/auth/patient-registration/patient-registration.ts](../src/app/features/auth/patient-registration/patient-registration.ts)
- [features/auth/reset-password/reset-password.ts](../src/app/features/auth/reset-password/reset-password.ts)
- [features/doctor-onboarding/doctor-onboarding.ts](../src/app/features/doctor-onboarding/pages/doctor-onboarding/doctor-onboarding.ts)
- [features/doctor-practices/practice-segments.ts](../src/app/features/doctor-practices/components/practice-segments/practice-segments.ts)
- [features/doctor-profile/doctor-profile.ts](../src/app/features/doctor-profile/pages/doctor-profile/doctor-profile.ts)
- [features/doctor-profile/public-profile-manager.ts](../src/app/features/doctor-profile/components/public-profile-manager/public-profile-manager.ts)
- [features/patient/patient-family/patient-family.ts](../src/app/features/patient/patient-family/patient-family.ts)
- [features/patient/patient-profile/patient-profile.ts](../src/app/features/patient/patient-profile/patient-profile.ts)
- [features/public-doctor-details/public-doctor-details.ts](../src/app/features/public-doctor-details/pages/public-doctor-details/public-doctor-details.ts)
- [features/public-doctors/public-doctors.ts](../src/app/features/public-doctors/pages/public-doctors/public-doctors.ts)
- [features/reception/reception-family-requests/reception-family-requests.ts](../src/app/features/reception/reception-family-requests/reception-family-requests.ts)
- [features/reception/reception-patients/reception-patients.ts](../src/app/features/reception/reception-patients/reception-patients.ts)
- [features/workspace/workspace.ts](../src/app/features/workspace/pages/workspace/workspace.ts)
- [shared/components/language-switcher/language-switcher.ts](../src/app/shared/components/language-switcher/language-switcher.ts)
- [shared/patient-picker/patient-picker.ts](../src/app/shared/patient-picker/patient-picker.ts)
- [shared/specialization-selector/specialization-selector.ts](../src/app/shared/specialization-selector/specialization-selector.ts)
- [shared/toast/toast-container.ts](../src/app/shared/toast/toast-container.ts)
