# Wasla — Workspace Agent Configuration

The authoritative agent architecture, role definitions, operating agreements, and task routing are defined in:
👉 [`.agents/AGENTS.md`](file:///.agents/AGENTS.md)

- **11 Workspace Skills:** [`.agents/skills/`](file:///.agents/skills/)
- **6 Antigravity Rules:** [`.agents/rules/`](file:///.agents/rules/)
- **Domain & Architecture Knowledge:** [`.agents/knowledge/`](file:///.agents/knowledge/)
- **Standardized Review Templates:** [`.agents/templates/`](file:///.agents/templates/)
- **Legacy Reference Archive:** [`.agents/reference-library/`](file:///.agents/reference-library/)

---

## Non-Negotiable Wasla UI/UX & Product Invariants

These rules capture essential user preferences and strict aesthetic/functional standards across Wasla:

1. **Strictly NO Colored Borders:** Never use colored or saturated borders (teal, blue, cyan, red) around cards, panels, or inputs by default. Default borders must ALWAYS be neutral and subtle: `var(--wasla-border-subtle)` / `var(--wasla-border)` (`#e2e8f0` / `#f1f5f9`). Primary/accent teal is strictly for focus rings, active tab pills, status badges, and primary buttons.
2. **Eliminate Carditis (No Card Overuse):** Stop wrapping every small item, form section, list item, or toggle in isolated cards with heavy shadows. Integrate form sections directly onto the main surface with clean spacing and subtle dividers (`border-bottom: 1px solid var(--wasla-border-subtle)`). Use unified directory lists/tables instead of repeated card blocks.
3. **Slide-Over Drawers for Details & Reviews:** When inspecting items, reviewing applications, or doing quick edits, do NOT navigate away to a separate full page. Use sleek slide-over drawers/sidebars to preserve the user's working context and table scroll position.
4. **Mandatory ToastService Feedback:** Every user mutation (add, edit, save, delete) MUST trigger clear toast notification feedback using `ToastService` (`success` or `error`). Never perform silent data mutations.
5. **Polished Form Controls:**
   - Never leave native browser `<select>` elements unstyled. Apply custom styling (`height: 42px`, `background: #fcfdfe`, `border: 1px solid var(--wasla-border)`) with custom SVG chevron positioned via logical CSS properties (`padding-inline-end: 38px`, `inset-inline-end: 14px`).
   - Hide native checkboxes completely via `.sr-only-chk` next to custom toggles.
   - Always apply `dir="ltr"` and `.ltr-text` to numeric, phone, and national ID inputs.
6. **Bilingual Completeness (Arabic & English):** Every UI string, button, placeholder, title, and toast message MUST have dual Arabic (`ar`) and English (`en`) entries in `src/app/core/i18n/translations.ts` consumed via `TranslatePipe` or `LanguageService`. Never hardcode static untranslated strings.
7. **Target Persona — Doctors & Clinic Assistants:** Wasla is built specifically for healthcare doctors and clinic assistants/secretaries. Clinic assistants often have limited educational backgrounds and low computer literacy. Keep interfaces radically simple, clear, intuitive, free of tech jargon, with high-contrast Arabic labels, obvious action buttons, and NO confusing blinking/pulsing indicator dots.
8. **Global Full-Width Pinned Footer:** The platform footer is shared globally at the root shell (`App`), spans 100% edge-to-edge (never boxed into an 80% card), stays pinned to the bottom of the viewport, and contains NO blinking indicators.
9. **Mandatory `<app-page-header>`:** All portal and management pages must use the shared `<app-page-header>` component with carousel background, standard icon glyphs, and action slots.
10. **SVG-AVATAR Empty States:** Empty states must never be blank tables or raw text. Always use themed SVG illustrations from `public/SVG-AVATAR/` with a high-contrast title, helpful subtitle, and primary action button.
11. **Frictionless Patient Booking:** Maintain the 3-click booking rule (Slot → Summary → Confirmation) with instant on-screen receipt and confirmation code.
