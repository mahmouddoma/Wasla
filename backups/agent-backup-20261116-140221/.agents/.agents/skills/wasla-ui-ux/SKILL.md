---
name: wasla-ui-ux
description: Use to design or refactor Wasla Angular UI, visual hierarchy, design tokens, accessible forms, tables, dashboards, translation and enterprise healthcare UX.
---

# Senior Wasla UI/UX design practice
## Analyze first
- Who uses this screen? Their job, proficiency, device, urgency and top 1–2 tasks.
- Capture current information architecture, primary vs secondary actions, failure recovery, interaction friction and real data density.
- Inspect existing Wasla logo, colors, tokens and components; avoid inventing an inconsistent design system.
## Design decisions
- Clear page title, concise task-focused copy, low-friction search/filter, discoverable primary action, meaningful grouping, informative status.
- Reuse tokens for semantic surfaces, text, status, borders, spacing, typography, radius and motion; no gratuitous animated gradients, cards nested in cards or badge overload.
- Choose layout by content: dense data → table/list with filter and progressive details; workflow → form/step flow; analytics → charts only for actual decisions.
- Add real states: default, skeleton/loading, empty, no-results, validation, server failure, permissions-denied, success and long content.
- Accessibility: visible focus, labels, correct form error association, contrast, target size, reduced motion, keyboard and screen reader semantics.
- Arabic/English: semantic translations, `dir` per context, CSS logical properties, dates/numbers and reversible chevrons; test both directions, not just text alignment.
## Execution
For major redesign, propose 2–4 decisions in plain language before code; then implement clean HTML/CSS/TS separated per existing conventions. Keep domain logic unchanged unless ticket explicitly changes it. Compare actual screenshots if visual tools exist; otherwise report limitations.
See `../../knowledge/brand-and-ux.md` and `../../templates/ui-review.md`.
