# Antigravity Mobile & Tablet UX Agent

الملفات الموجودة هنا مجهزة للاستخدام في أي مشروع Angular أو Web Frontend.

## المحتوى

- `.agents/agents/mobile-tablet-ux-specialist.md` — Custom Agent كامل لتنفيذ وتحسين Responsive UX، خصوصاً على الموبايل والتابلت.
- `.agents/rules/mobile-tablet-ux-guardrails.md` — Rule خفيفة تُطبَّق تلقائياً أثناء مهام الواجهة، وتوجه Antigravity للـAgent عند الحاجة.

## التثبيت

1. فك ضغط الحزمة.
2. انقل فولدر `.agents` إلى **جذر مشروعك المفتوح في Antigravity** (جنب `package.json`) مع الدمج وليس استبدال الفولدر القديم.
3. إذا كان عندك Rule موجودة بنفس الاسم، راجعها قبل الاستبدال. الملفات الأخرى الموجودة داخل `.agents` تظل كما هي.
4. افتح Antigravity وابدأ محادثة جديدة إذا لم يظهر الـAgent، أو راجع Settings → Project → Customizations.

## طريقة الاستخدام

في Antigravity اكتب:

> Use the `mobile-tablet-ux-specialist` agent to audit and implement responsive mobile/tablet UX for the current page and its interactive states. Preserve all existing APIs, business logic, desktop functionality, routes and translations. Verify 320px, 390px, 768px, 1024px and 1440px. Implement fixes directly and report the files changed, screenshots taken and tests actually run.

أو لنطاق أكبر:

> Use the mobile-tablet-ux-specialist agent to audit all reachable frontend routes. Prioritize critical pages by severity, implement responsive fixes in batches, and verify each batch without changing backend integrations or auth/permission behavior. Do not claim unperformed testing.

## ملاحظات

- الصور والاختبارات العملية تحتاج تشغيل المشروع وأدوات Browser/DevTools متاحة لـAntigravity.
- الـRule دورها ضمان أسلوب عمل ثابت، والـAgent دوره الفحص والتنفيذ التفصيلي.
- لو هدفك تطبيق القاعدة على كل مشاريعك، ممكن وضع الـAgent في `~/.gemini/config/agents/` والـRule في `~/.gemini/config/rules/` مع الاحتفاظ بالـfrontmatter.

مصادر بنية الملفات: https://antigravity.google/docs/customization-discovery/ و https://antigravity.google/docs/rules/ و https://antigravity.google/docs/subagents/
