---
name: wasla-mobile-experience
description: Use for Wasla mobile-first UX, touch workflows, tablet/desktop adaptation, responsive information architecture, forms, tables, and mobile navigation.
---

# Mobile UX is a distinct product experience
## Breakpoint discovery
- Inspect existing breakpoints and UI library behavior before choosing new ones. Verify narrow phone ~320–390px, large phone ~430px, tablet ~768–1024px, laptop/desktop ~1280px+, adjusting to content not arbitrary device names.
- Do not design only a 375px mockup; account for landscape, browser zoom, notches/safe areas, long Arabic strings and reduced viewport due to mobile keyboard.
## Per-screen UX strategy
1. Map desktop primary tasks and actions to the mobile priority order; remove secondary chrome, not critical functionality.
2. Switch dense desktop tables to mobile task rows or compact structured lists with detail drawer/sheet, unless true table comparison is essential. Preserve sorting/filter/selection in touch-appropriate controls.
3. Use bottom navigation **only** for a small, stable set of top-level destinations for that role. Otherwise use contextual nav, compact sidebar sheet, tabs or native-feeling headers.
4. Keep critical actions reachable and obvious; avoid stacked sticky controls that consume viewport. Bottom action bars must account for safe-area and keyboard.
5. Touch targets aim at least 44×44 CSS px where practical; don't rely on hover, double-click or tiny icons for primary actions.
6. Forms: single-column, correct input types/auto-complete, inline errors, minimal steps, preserve draft on accidental navigation where appropriate; prevent duplicate submissions.
7. Avoid body horizontal overflow; use responsive dialogs/fullscreen sheets as appropriate with focus control and close affordance.
8. Design online/offline/loading/retry, empty and error behavior for limited connectivity.
## Verification matrix
- Phone 320/375/430 CSS px, tablet 768/1024, desktop 1280+; RTL and LTR; zoom 200%; keyboard and touch; critical flows with real-ish long test strings.
- Be explicit about UX divergence from desktop, e.g. table → mobile list, not “responsive CSS done.”
See `../../templates/responsive-matrix.md`.
