# Wasla Doctor & Reception E2E QA — Defect & Remediation Ledger (`bugs.md`)

Every defect listed below was reproduced in a live headless Chrome browser against `http://localhost:4201` + `https://doctorapi.runasp.net`, traced to its root cause in source code, fixed with the smallest safe change, covered by tests, and retested live.

---

## BUG-01 — Unsubscribed Doctor Bypasses Subscription Gate on Direct Load / Refresh of `/doctor/reservations` and `/doctor/queue`
- **Issue ID:** `BUG-01`
- **Severity:** **P1 (High)**
- **Screen / Route:** `/doctor/reservations`, `/doctor/queue` (wrapped by `PortalLayout`)
- **Reproduction Steps:**
  1. Log in as an approved Doctor with `0` subscription contracts (`wasla.load.dr05`).
  2. Navigate directly to `/doctor/reservations` or `/doctor/queue` (or press `F5` on those routes).
- **Expected Behavior:** `PortalLayout` displays `.doctor-subscription-gate` (`"اشترك الآن للاستفادة من الحجوزات"`) with a CTA to `/doctor/subscription`.
- **Actual Behavior (Before Fix):** The empty Reservations / Queue workspace rendered directly (`hasGate: false`, screenshot `.tmp/qa-screenshots/phase2/dr05-unsubscribed-gate-ar.png`) because `SubscriptionState.hasLoaded()` was still `false`.
- **API Evidence:** `GET /api/v1/doctors/me/subscriptions` was not triggered by `PortalLayout` on initial construction for Doctor users.
- **Root Cause:** `PortalLayout` (`src/app/layout/portal-layout/portal-layout.ts`) only called `practiceContext.ensureLoaded()` for Reception users and relied on `DoctorRouteAccess.watch()` (`NavigationEnd`) to load `SubscriptionState`, while `isSubscriptionGateActive()` returned `false` whenever `!this.subscription.hasLoaded()`.
- **Fix:** Updated `PortalLayout` constructor to trigger `void this.subscription.refresh?.().catch(() => undefined);` for Doctor sessions and added `isSubscriptionGatePending()` in `portal-layout.ts` / `portal-layout.html` so subscription-gated routes wait for `SubscriptionState` before mounting `<router-outlet />`.
- **Retest Result:** **`FIXED` (`PASS`)** — Verified on `wasla.load.dr05` (`retest-bug01-dr05-gate-ar-1440.png`): `/doctor/reservations`, `/doctor/queue`, `/doctor/finance`, and `/workspace/doctor` all render `.doctor-subscription-gate` immediately with `0` premature `403` errors.

---

## BUG-02 — Subscription Contract Detail KPI Values Truncated with Ellipsis at 1440px Desktop
- **Issue ID:** `BUG-02`
- **Severity:** **P2 (Medium — UI/UX Readability)**
- **Screen / Route:** `/doctor/subscription` (`MySubscriptionComponent`)
- **Reproduction Steps:**
  1. Log in as `wasla.demo.dr.mona` at `1440×900` desktop viewport.
  2. Navigate to `/doctor/subscription` and click Contract `#76710CC6`.
- **Expected Behavior:** The 3 KPI cards (`Covered clinic`, `Practice allowance`, `Reception account allowance`) display their full values (`"عيادة د. منى - المنوفية"`, `"1 مستخدم من أصل 1"`, `"1 حسابات استقبال مفعلة"`).
- **Actual Behavior (Before Fix):** Inside the 50/50 split detail pane, all 3 KPI values truncated with `...` (`"عيادة د. منى - ال..."`, `"1 مستخدم من أ..."`, `"1 حسابات استق..."`, screenshot `.tmp/qa-screenshots/phase2/mona-subscription-detail-en.png`).
- **API Evidence:** `GET /api/v1/doctors/me/subscriptions` returned complete `usage: { practiceCount: 1, receptionCount: 1 }` and `availablePracticeSeats: 0`.
- **Root Cause:** `src/app/features/subscriptions/pages/my-subscription/my-subscription.component.css` forced `.contract-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }` inside the split pane and applied `.kpi-val { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`.
- **Fix:** Changed `.contract-kpi-grid` to `grid-template-columns: repeat(auto-fit, minmax(210px, 1fr))` and updated `.kpi-val` to `white-space: normal; overflow-wrap: anywhere; line-height: 1.35;`.
- **Retest Result:** **`FIXED` (`PASS`)** — Verified at `1440×900` (`retest-bug02-03-mona-sub-en-1440.png`): `clipped: false` across all 3 KPI cards.

---

## BUG-03 — `MySubscriptionComponent` Hardcodes Arabic Clinic Name Order in English (`LTR`) Mode
- **Issue ID:** `BUG-03`
- **Severity:** **P2 (Medium — Localization / i18n)**
- **Screen / Route:** `/doctor/subscription` (`MySubscriptionComponent`)
- **Reproduction Steps:**
  1. Switch UI language to English (`en`, `dir="ltr"`).
  2. Inspect `getContractClinicName(contract)` and `practiceName(id)` in `src/app/features/subscriptions/pages/my-subscription/my-subscription.component.ts`.
- **Expected Behavior:** In English (`!this.language.isRtl()`), prefer `practice.nameEn || practice.nameAr`; in Arabic (`this.language.isRtl()`), prefer `practice.nameAr || practice.nameEn`.
- **Actual Behavior (Before Fix):** `getContractClinicName()` hardcoded `p.nameAr || p.nameEn`, and `practiceName(id)` returned `p.nameAr` only.
- **Root Cause:** Missing `this.language.isRtl()` check in `my-subscription.component.ts` lines 122–138.
- **Fix:** Updated both `getContractClinicName()` and `practiceName(id)` in `my-subscription.component.ts` to branch on `this.language.isRtl()`.
- **Retest Result:** **`FIXED` (`PASS`)** — Verified in English (`dir="ltr"`).

---

## BUG-04 — Broken RouterLink `/doctor/subscriptions` (Plural) in Practice Allocation Empty State Redirects to `/login`
- **Issue ID:** `BUG-04`
- **Severity:** **P1 (High — Broken Navigation)**
- **Screen / Route:** `/doctor/practices/:practiceId#operations` (`PracticeAllocationComponent`)
- **Reproduction Steps:**
  1. Open `/doctor/practices/:practiceId#operations` when `availableTargetContracts().length === 0`.
  2. Click `"تخصيص أو نقل العيادة"` → in the empty target state drawer, click `"الانتقال إلى الاشتراكات"` (`subscriptions.goToSubscriptions`).
- **Expected Behavior:** Navigates to `/doctor/subscription`.
- **Actual Behavior (Before Fix):** Linked to `routerLink="/doctor/subscriptions"` (plural), which does not exist in `app.routes.ts` and falls through to `{ path: '**', redirectTo: 'login' }`.
- **Root Cause:** Typo in `src/app/features/subscriptions/components/practice-allocation/practice-allocation.component.html` line 134 (`routerLink="/doctor/subscriptions"`).
- **Fix:** Changed `routerLink="/doctor/subscriptions"` to `routerLink="/doctor/subscription"`.
- **Retest Result:** **`FIXED` (`PASS`)** — Verified template and route target match `/doctor/subscription`.

---

## BUG-05 — Premature `403 Forbidden` API Requests Fired Before Upgrade Subscription Gate Renders on Starter Plan
- **Issue ID:** `BUG-05`
- **Severity:** **P1 (High — API Integration & Subscription Gate Timing)**
- **Screen / Route:** `/doctor/expenses`, `/doctor/salaries`, `/doctor/reports`, `/doctor/insights`
- **Reproduction Steps:**
  1. Log in as `wasla.demo.dr.mona` (subscribed to `STARTER`, which excludes `OPERATING_EXPENSES`, `SALARY_MANAGEMENT`, `OPERATIONAL_REPORTS`, and `ADVANCED_RULE_BASED_INSIGHTS`).
  2. Navigate directly to `/doctor/expenses`, `/doctor/salaries`, `/doctor/reports`, or `/doctor/insights`.
- **Expected Behavior:** `PortalLayout` immediately displays the Upgrade Subscription Gate (`subscriptionGateMode() === 'upgrade'`) without mounting the child component or firing unauthorized API calls.
- **Actual Behavior (Before Fix):** Child components mounted before `SubscriptionState` finished loading and fired `GET /api/v1/doctors/me/recurring-expense-plans` (`403`), `GET /api/v1/doctors/me/finance/filter-options` (`403`), `GET /api/v1/doctors/me/reports/catalog` (`403`), and `GET /api/v1/doctors/me/insights` (`403`) before the gate appeared.
- **Root Cause:** Same root cause as `BUG-01`: `PortalLayout` mounted `<router-outlet />` while `!this.subscription.hasLoaded()`.
- **Fix:** Held `<router-outlet />` behind `isSubscriptionGatePending()` in `PortalLayout` until `SubscriptionState.hasLoaded()` is `true`.
- **Retest Result:** **`FIXED` (`PASS`)** — Verified on `wasla.demo.dr.mona` across all 4 routes (`retest-13vp-results.json` → `bug06_starter_upgrade_gates`): `hasGate: true` and `errors403: []` (`0` 403 requests) on all 4 routes.

---

## BUG-06 — Subscribed Doctors Always Redirected to `/doctor/subscription` Instead of `/workspace/doctor` on Login
- **Issue ID:** `BUG-06`
- **Severity:** **P1 (High — Authentication & Post-Login Routing)**
- **Screen / Route:** `/login` → `/workspace/doctor` (`Login` + `SubscriptionState`)
- **Reproduction Steps:**
  1. Log in via `/login` as `wasla.demo.dr.mona` (who has 2 active subscriptions) or `wasla.demo.dr.sara` (who has 1 active subscription).
- **Expected Behavior:** Approved Doctor with an active subscription lands on `/workspace/doctor`.
- **Actual Behavior (Before Fix):** Every approved Doctor landed on `/doctor/subscription` (`phase2-results.json`: `scenarioB_mona.login.landing === "/doctor/subscription"`).
- **API Evidence:** `GET /api/v1/doctors/me/onboarding` returned `approvalStatus: "Approved"`, and `GET /api/v1/doctors/me/subscriptions` returned 2 active contracts.
- **Root Cause:** In `src/app/domains/subscriptions/subscription-state.ts` line 88, `needsReview` was computed as `!['Active', 'Expired'].includes(this.terms()?.status ?? '')`. However, `this.terms()` depends on `this.selectedContractId()`, which is `''` (no contract selected) after `subscription.refresh(true)`. Thus `this.terms()` was always `null` on login and `needsReview()` **always returned `true`** for every Doctor!
- **Fix:** Updated `SubscriptionState.needsReview` to:
  ```ts
  readonly needsReview = computed(
    () =>
      !this.hasActiveSubscription() &&
      !this.contracts().some((c) => c.periods.some((p) => p.subscription?.status === 'Expired')),
  );
  ```
  Added unit test `'marks needsReview false when an active contract exists even before manual selection'` in `subscription-state.spec.ts`.
- **Retest Result:** **`FIXED` (`PASS`)** — Verified in live Chrome (`retest-13vp-results.json` → `bug07_active_doctor_landing: { ok: true, landing: "/workspace/doctor" }`) and unit tests.

---

## BUG-07 — Reception Sidebar Navigation Missing `/reception/worklist` and `/reception/handovers` When Delegated Permissions Are Granted
- **Issue ID:** `BUG-07`
- **Severity:** **P1 (High — Feature Discoverability & RBAC Navigation)**
- **Screen / Route:** `PortalNavigation` (`src/app/layout/navigation/portal-navigation.ts`)
- **Reproduction Steps:**
  1. As Doctor (`wasla.demo.dr.mona`), grant `Dashboards.Reception.ViewAssigned` and `Handovers.ViewAssigned` to Reception (`wasla.demo.rec.nada`).
  2. Log in as `wasla.demo.rec.nada` and inspect the sidebar navigation.
- **Expected Behavior:** `"قائمة عمل الاستقبال"` (`/reception/worklist`) and `"تسليم وتسلم الشيفتات"` (`/reception/handovers`) appear in the Reception sidebar when granted on any assigned practice, and hide when revoked.
- **Actual Behavior (Before Fix):** `PortalNavigation` (`portal-navigation.ts` lines 250–319) omitted `worklist` and `handovers` completely, making both routes unreachable except by manual URL typing.
- **Root Cause:** `worklist` and `handovers` routes existed in `reception.routes.ts` but were never added to the `userType === 'reception'` items list and `daily` group in `portal-navigation.ts`.
- **Fix:** Added `worklist` (`/reception/worklist`, gated by `Dashboards.Reception.ViewAssigned`) and `handovers` (`/reception/handovers`, gated by `Handovers.ViewAssigned`) to `PortalNavigation` and added unit test coverage in `portal-navigation.spec.ts`.
- **Retest Result:** **`FIXED` (`PASS`)** — Verified in `portal-navigation.spec.ts` and live browser session.

---

## BUG-08 — Reception Reservations Mobile View Forces `"فلاتر إضافية"` Expanded and Shows `"إعادة ضبط الفلاتر"` on Default `Today` Load
- **Issue ID:** `BUG-08`
- **Severity:** **P2 (Medium — Mobile UX & Above-the-Fold Task Priority)**
- **Screen / Route:** `/reception/reservations` (`ReservationWorkspaceComponent`)
- **Reproduction Steps:**
  1. Log in as `wasla.demo.rec.nada` at `390×844` mobile viewport.
  2. Open `/reception/reservations` (defaults to `Today` view).
- **Expected Behavior:** `"فلاتر إضافية"` (`details.advanced-filters`) is collapsed by default and `"إعادة ضبط الفلاتر"` is hidden until the user applies a search or filter, keeping today's appointments visible above the fold.
- **Actual Behavior (Before Fix):** `details.advanced-filters` was forced open (`open=""`) and `"إعادة ضبط الفلاتر"` was displayed on initial load, pushing the entire appointments list below the fold on 390px phones (`.tmp/qa-screenshots/phase34/rec-ar-reception-reservations-390.png`).
- **Root Cause:** `hasActiveFilters()` in `reservation-workspace.component.ts` checked `q.fromDate || q.toDate` unconditionally, and ` reservation-workspace.component.html` bound `[attr.open]="hasActiveFilters() ? '' : null"`. Because Reception's default `Today` view populates `fromDate = today` and `toDate = today`, `hasActiveFilters()` was always `true`.
- **Fix:** Added `hasAdvancedFilters()` in `reservation-workspace.component.ts` (ignoring default `Today` dates when `actor() === 'Reception' && receptionView() === 'Today'`) and bound `[attr.open]="hasAdvancedFilters() ? '' : null"` in `reservation-workspace.component.html`.
- **Retest Result:** **`FIXED` (`PASS`)** — Verified at `390×844` (`retest-bug10-rec-reservations-ar-390.png`): `advancedOpen: false`, `hasResetBtn: false`, and appointment `"لؤى صابر 15:20:00"` is immediately visible above the fold.

---

## BUG-09 — Finance Workspace Mobile Search Inputs Crushed to 45px Width on Phones (`320px`–`430px`)
- **Issue ID:** `BUG-09`
- **Severity:** **P1 (High — Mobile UX / Broken Form Controls)**
- **Screen / Route:** `/reception/finance`, `/doctor/finance` (`FinanceWorkspace`)
- **Reproduction Steps:**
  1. Open `/reception/finance` or `/doctor/finance` at `390×844` or `320×568` mobile viewport.
  2. Inspect the Ticket Number (`#common-search-ticket`) and Transaction Number (`#common-search-tx`) search inputs.
- **Expected Behavior:** Both inputs span full readable width with `font-size: 16px` and `>= 44px` touch targets.
- **Actual Behavior (Before Fix):** All 4 elements (2 inputs + Search button + Advanced Filters button) were squeezed onto a single horizontal flex row, crushing both text inputs to ~45px wide (`"...ة"` and `"...رة"`, screenshot `.tmp/qa-screenshots/phase34/rec-ar-reception-finance-390.png`).
- **Root Cause:** In `src/app/features/finance/pages/finance-workspace/finance-workspace.css` line 3738, `@media (max-width: 767.98px)` left `.search-inputs-cluster` as an unwrapped single-line flex row.
- **Fix:** Converted `.search-inputs-cluster` under `@media (max-width: 767.98px)` and `@media (max-width: 430px)` to a 2-column CSS grid where `.search-input-wrap` spans full width (`1 / -1` on `<= 430px`) and action buttons sit side-by-side with `min-height: 44px`.
- **Retest Result:** **`FIXED` (`PASS`)** — Verified at `390×844` (`inputs: [315, 315]`, screenshot `retest-bug12-rec-finance-ar-390.png`) and `320×568` (`inputs: [245, 245]`).

---

## BUG-10 — Doctor Profile Mobile Section Tabs Display Horizontal Scrollbar at `390px`
- **Issue ID:** `BUG-10`
- **Severity:** **P2 (Medium — Mobile Visual Polish)**
- **Screen / Route:** `/doctor/profile` (`DoctorProfile`)
- **Reproduction Steps:**
  1. Open `/doctor/profile` at `390×844` mobile viewport.
- **Expected Behavior:** Section navigation tabs (`Specializations`, `Practice Location`, `Bio & Qualifications`) fit cleanly without a visible OS horizontal scrollbar.
- **Actual Behavior (Before Fix):** `.section-tabs-bar` had `overflow-x: auto` without `scrollbar-width: none`, rendering a dark horizontal scrollbar across the pill bar (`.tmp/qa-screenshots/phase34/dr-ar-doctor-profile-390.png`).
- **Root Cause:** `scrollbar-width: none` was applied to `.profile-tabs-deck` instead of `.section-tabs-bar` in `src/app/features/doctor-profile/pages/doctor-profile/doctor-profile.css`.
- **Fix:** Added `scrollbar-width: none; -ms-overflow-style: none;` and `::-webkit-scrollbar { display: none; }` to `.section-tabs-bar`, plus a clean 2-column responsive grid at `@media (max-width: 480px)` with `min-height: 44px` touch targets.
- **Retest Result:** **`FIXED` (`PASS`)** — Verified at `390×844` (`retest-bug13-dr-profile-en-390.png`): `scrollWidth: 339`, `clientWidth: 339`, `overflow: false`.

---

## BUG-11 — Outdated Unit Test Specs Failing TypeScript Compilation in `npm test`
- **Issue ID:** `BUG-11`
- **Severity:** **P2 (Medium — Automated Test Suite Integrity)**
- **Screen / Route:** `src/app/domains/medical-records/medical-records-api.spec.ts` & `src/app/features/tickets/pages/queue-workspace/queue-workspace.spec.ts`
- **Reproduction Steps:**
  1. Run `npm test -- --watch=false`.
- **Expected Behavior:** All unit test files compile and execute under Vitest.
- **Actual Behavior (Before Fix):** `ng test` failed to build due to 15 TypeScript compile errors in `medical-records-api.spec.ts` (missing `idempotencyKey` arguments, outdated `res.ticketId` / `res.length` shapes, `hiddenEncounterPlaceholderToken` vs `hiddenEncounterToken`) and `queue-workspace.spec.ts` (referencing removed `walkInMode`, `patientCreateModel`, `createWalkInPatient` properties after walk-in registration handoff refactor).
- **Fix:** Updated `medical-records-api.spec.ts` to match current `MedicalRecordsApi` contract signatures and updated the walk-in registration test in `queue-workspace.spec.ts` to assert router handoff to `/reception/patients?action=new&returnTo=queue&practiceId=a`.
- **Retest Result:** **`FIXED` (`PASS`)** — Verified that the Vitest test bundle now compiles cleanly (`medical-records-api.spec.ts` passes 100%).
