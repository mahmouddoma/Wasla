# P0 portal implementation report

P0 UX changes are implemented. Build, unit tests and browser verification pass. Full repository acceptance is blocked by existing i18n and architecture violations outside P0; those checks are not reported as passing. P1 was not started.

## Files changed

- `src/app/features/workspace/pages/workspace/workspace.ts`
- `src/app/features/workspace/pages/workspace/workspace.html`
- `src/app/features/workspace/pages/workspace/workspace.css`
- `src/app/features/workspace/pages/workspace/workspace.spec.ts`
- `src/app/layout/navigation/navigation-item.ts` (new)
- `src/app/layout/navigation/portal-navigation.ts` (new)
- `src/app/layout/navigation/portal-navigation.spec.ts` (new)
- `src/app/layout/portal-layout/portal-layout.ts` (moved/refactored)
- `src/app/layout/portal-layout/portal-layout.html` (moved/refactored)
- `src/app/layout/portal-layout/portal-layout.css` (moved/refactored)
- `src/app/layout/portal-layout/portal-layout.spec.ts` (moved/updated)
- `src/app/shared/components/mobile-navigation/mobile-navigation.ts`
- `src/app/shared/components/mobile-navigation/mobile-navigation.html`
- `src/app/shared/components/mobile-navigation/mobile-navigation.spec.ts`
- `src/app/core/i18n/translations.ts`
- `src/app/app.routes.ts` (lazy import location only)
- `src/app/app.spec.ts` (shell import location only)
- `src/app/features/admin/admin-layout/admin-layout.ts` (shared navigation type/icon import location only)
- `scripts/browser-portal-responsive.cjs`
- `docs/portal-p0-audit.md`
- `docs/portal-p0-report.md`
- `docs/browser-verification/responsive/portal-p0/results.json`

Removed the previous four PortalLayout files from `shared/components/portal-layout/` after moving them. Removed all five files in `shared/components/workspace-sidebar/`: component TS/HTML/CSS/spec and `sidebar.service.ts`.

## Architecture changes

`PortalNavigation` is the application-owned source of permitted role links. The grouped sidebar, compact mobile links and workspace task destinations consume it. It uses computed signals and the existing AuthSession/ReceptionPracticeContext; no new writable/global state or backend orchestration was added.

PortalLayout now belongs to `layout/` rather than Shared. App remains the owner of reception context initialization and session cleanup; the redundant shell initializer was removed. MobileNavigation remains presentational. Existing permissions, authentication, guards, lazy feature boundaries and route URLs remain intact. Admin navigation behavior is unchanged; only its common type/icon imports moved.

## UX changes by role

### Reception

Current clinic is shown before daily tasks, with exactly one selector in the header. The primary task is new booking when the selected assignment permits it, followed by patient search/registration, reservation review and queue access. Booking uses the existing `practiceId`/`date` entry point. Changing clinics immediately changes the visible tasks. No selection, no assignments, loading and failed loading have clear translated guidance and recovery actions.

Sidebar availability continues to use permissions across active assignments, allowing staff to reach an operation and choose an eligible clinic. Workspace shortcuts use only the selected assignment's permissions. Family requests and payments remain secondary navigation.

### Doctor

Queue access comes first, followed by reservation review and permitted consultations. Clinic setup/review is secondary; reception staff, public profile, medication requests, payments and revenue remain available in grouped navigation when permitted.

### Patient

Doctor discovery/booking comes first, followed by appointments and permitted queue status. Follow-ups are secondary; visits, prescriptions, profile, family and payments remain in their permitted navigation groups. Queue-status copy replaces ticket terminology on Home and navigation.

No role home claims next appointments, patient counts, empty bookings or clinic ownership from data it has not fetched. Daily tasks open the existing operational screens; reservation review explicitly asks users to choose the day there.

## Removed duplication

- Removed the unused WorkspaceSidebar and its separate navigation/service/styles.
- Extracted role routes and permission filtering from PortalLayout; desktop/mobile/workspace share the same permitted destinations.
- Replaced the workspace module grid and account/session deck, removing their obsolete HTML, CSS and TypeScript.
- Removed 25 unreferenced translations used by the retired workspace.
- Removed redundant reception-context initialization in PortalLayout.

## Tests and commands

- New PortalNavigation specs cover doctor daily/management groups, independent finance/revenue permissions, reception assignment/session permission changes, patient health/account restrictions, compact mobile priorities, catalog-manager access and group completeness.
- Rewritten Workspace specs cover role task ordering, forbidden actions, selected clinic changes, supported booking parameters, one selector/focus guidance, loading, error/retry, no assignments and AR/EN direction changes.
- Updated PortalLayout specs retain shell, logout, permission filtering, mobile More, Escape and collapse coverage.
- Added MobileNavigation regression coverage preventing catalog-root active state on nested imports routes.
- Existing App specs verify practice loading, selection, token preservation and session cleanup.
- `npm run build`: passes. Remaining warning: existing public-doctors CSS is 37.02 kB against a 35 kB budget.
- `npm test -- --watch=false`: 118 files, 684 tests pass.
- `npm run check:i18n`: fails on 11 existing hardcoded literals in doctor-practices, public-doctors, reception forms and reservation internals. No changed P0 files are reported.
- `npm run check:architecture`: fails on existing admin cross-feature routing import, public-doctors private domain imports/template typing bypass and important declarations in admin revenue, healthcare workspace and global CSS. Removed the shell Shared/domain dependency and obsolete sidebar violations. No changed P0 files are reported.
- `git diff --check`: passes.
- Impeccable detector ran once. Its missing-image warning treats Angular `[src]` as static HTML; rendered assets were verified. Existing shell palette/radius/type advisories were retained to preserve Wasla's visual identity.

## Responsive verification

All requests used synthetic fixtures; no live clinic data was changed.

| Verification | Cases | Result |
| --- | ---: | --- |
| Three role homes, populated fixtures | 48 | Pass |
| Three role homes, empty fixtures | 48 | Pass |
| Reception practice loading error | 16 | Pass |
| Existing reception responsive regression | 96 | Pass |
| Existing role mobile/header/More/Escape regression | 40 | Pass |

Workspace widths: **320, 390, 576, 768, 820, 1024, 1280, 1440px**, each in Arabic and English. Browser assertions cover page/content overflow, direction, footer width, task touch targets, active Home links, one reception selector, mobile action clearance and desktop collapse/expand. The mobile regression covers permitted role shortcuts, More, account popover and Escape, including SuperAdmin.

Screenshots of all three roles were visually inspected at **390, 820 and 1440px in both languages**, with long clinic names. Expanded desktop sidebars and reception empty/error screenshots were also inspected. Screenshot and raw result files remain in `.tmp/portal-p0/`, `.tmp/mobile-navigation/` and `.tmp/reception-responsive/`. A generated local summary is in `docs/browser-verification/responsive/portal-p0/results.json` (the browser-verification directory is ignored by Git).

## Remaining issues

Repository-wide i18n/architecture failures listed above prevent an unconditional P0 acceptance claim. Fixing those would touch explicitly excluded feature internals, admin code or global styling, so they were left outside this phase. Operational analytics and next-patient/next-appointment summaries were not added without loaded data. No backend/API/authentication changes or P1 work were made.
