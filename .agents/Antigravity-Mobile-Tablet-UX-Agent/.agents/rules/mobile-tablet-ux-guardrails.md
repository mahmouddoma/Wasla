---
trigger: always_on
description: Lightweight responsive, mobile/tablet UX and RTL guardrails for frontend interface changes. Coordinates with the mobile-tablet-ux-specialist custom agent.
---

# Mobile & Tablet UI/UX Guardrails

For every frontend UI or layout change:

1. Preserve existing application logic, API integration, form validation, permissions, routing, data, translations and desktop behavior unless explicitly asked otherwise.
2. Design mobile views around the user's primary task rather than only stacking desktop columns. Keep content and actions accessible with good visual hierarchy.
3. Validate mobile widths 320, 375, 390, 430px; tablet 768, 820, 1024px; at least one desktop width. Test visually in a browser when possible; never claim visual verification without running it.
4. Prefer flexible CSS grid/flex, intrinsic sizing, logical RTL-safe properties, accessible tap targets and 16px+ mobile input fonts. Fix overflow at source rather than hiding it globally.
5. Avoid excessive cards, long scrolling caused by decorative elements, unnecessary gradients/animations, tiny text and redundant headings.
6. Forms, tables, drawers, dialogs, empty/loading/error states, zoom, keyboard-open state, touch navigation and RTL/LTR should be considered when affected.
7. When a task's main purpose is mobile/tablet responsiveness or UX, use or delegate to the `mobile-tablet-ux-specialist` custom agent when available. Follow its full checklist.
8. Report exactly what was changed, what was verified and what could not be tested.
