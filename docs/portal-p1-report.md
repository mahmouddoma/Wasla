# P1 — Reception patients and appointments report

Implemented on `master` from P0 commit `36efaca`. The pre-change findings and proposed boundaries are recorded in [portal-p1-audit.md](portal-p1-audit.md). Verification used synthetic data; no live patient, clinic or appointment data was mutated. Changes remain local and uncommitted.

## 1. Current-state issues found

Patients incorrectly presented search and registration as sequential Steps 01/02, with two competing desktop panels. Selection and registration success exposed identifiers without connecting the next booking action. Optional registration/contact fields competed with required information.

Reception reservations emphasized references, repeated clinic names, decorative surfaces and equally prominent advanced filters. Booking searched only by name and could require a raw patient ID. Ordinary patient query links did not initialize booking. Clinic changes needed stronger protection against stale requests and editor context.

## 2. Final UX decisions

- Patients is one search-first directory with name, phone and DOB search. Selection shows a named patient and a permission-dependent **Book appointment** action. The current clinic remains in P0's single global selector.
- **Add new patient** opens the existing SideDrawer. Register-only users receive the registration form directly. Required information comes first; English name, email, image and contact linking use Additional details. Contact name/phone remain required and visible when the patient has no phone.
- Registration retains every supported request field and validation, preserves values on failure, shows toast feedback and creates named context on success. Booking remains an explicit action.
- Reception appointments defaults to server-filtered Today. Upcoming and All are quick alternatives. Search is visible; status, custom dates, source, visit/price and late filters remain under More filters.
- Rows prioritize patient, date/time, visit/price, status and Open. The details drawer prioritizes the same information and supported actions. Reference, source, timestamps and history remain under Additional details.
- Reception booking proceeds patient → date → time → visit/price → optional note → Book appointment. Cancel, reschedule and restore have explicit submit labels. Patient selection searches name/phone, with DOB disclosed separately; it has no manual patient-ID input.
- Reception's ambient decoration, competing statistics and decorative surface animation are removed from the touched workspace. Actor-specific presentation preserves other roles. Existing shared PageHeader styling is retained.

The Patients template decreased from 519 to 296 lines and its stylesheet from 722 to 193 lines. CSS rules decreased from 97 to 35. Source opening-tag counts decreased from 165 to 97; these are structural source counts, not runtime DOM measurements. Store/container additions implement the required handoff and stale-request protection rather than duplicating APIs or global state.

## 3. Files changed

| Files | Responsibility |
| --- | --- |
| `src/app/features/reception/reception-patients/reception-patients.{ts,html,css,spec.ts}` | Search-first directory, registration disclosure/drawer, selected context, booking handoff and regression tests |
| `src/app/features/reservations/pages/reservation-workspace/reservation-workspace.component.{ts,html,css,spec.ts}` | Reception views/filter/list hierarchy, route initialization and Home/patient handoff tests |
| `src/app/features/reservations/components/reservation-editor/reservation-editor.component.{ts,html,css,spec.ts}` | Named selection, progressive booking, translated action labels and preserved form behavior |
| `src/app/features/reservations/components/reservation-details/reservation-details.component.{ts,html,css,spec.ts}` | Reception detail hierarchy, secondary metadata disclosure and capability tests |
| New `src/app/features/reservations/components/reservation-patient-search/reservation-patient-search.component.{ts,html,css,spec.ts}` | Complete presentational structured search component; no business API orchestration |
| `src/app/features/reservations/state/reservation-workspace.store.{ts,spec.ts}` | Scoped search, backend date queries, permission checks, stale-context invalidation and workflow tests |
| `src/app/core/i18n/translations.ts` | Semantic bilingual P1 copy and translation of existing touched-file literals |
| `scripts/browser-reception-responsive.cjs` | Synthetic P1 journeys, request assertions, screenshots and 576px replacement for 600px |
| `docs/portal-p1-audit.md`, `docs/portal-p1-report.md` | Pre-change audit and final evidence/limitations |

No changes were made to domain API contracts, auth/guards, application routes, PortalNavigation, portal shell, mobile navigation, Home, global footer or check-in components. Some shared reservation presentation rules received neutral-border/focus cleanup; existing role workflows remain covered by tests and browser regression.

## 4. Existing functionality reused

Reused PatientsApi, ReservationsApi and their public domain boundaries; ReceptionPracticeContext; the route-provided ReservationWorkspaceStore; LanguageService/TranslatePipe; ToastService; PageHeader; SideDrawer and its modal-focus infrastructure; existing Bootstrap layout utilities and design tokens; themed SVG empty illustrations; API error parsing; multipart registration; server capabilities, row versions, intent/idempotency keys and follow-up eligibility.

The new patient-search component is Reservations-local. Reception does not import its private implementation. There is no duplicate clinic service, navigation configuration, API client or application-wide patient store.

## 5. Backend limitations discovered

- Reception has no complete patient-by-ID profile/history endpoint. Search result data and submitted registration names provide the displayed context. No medical history or unsupported patient dashboard was added.
- Registration returns an ID, not a complete profile. Its success context uses the submitted name and supported form values.
- There is no contact-patient lookup. The existing linked-contact field remains editable under Additional details with a human label and explanatory guidance; an existing record identifier is still needed for this advanced operation.
- External patient-ID-only booking links lack a name hint. They show translated selected-patient context, hide the ID and continue through server availability/booking validation. P1 links carry names in router history state rather than duplicating personal data in URL parameters.
- Upcoming uses the supported `fromDate=today` query and includes today's calendar date. It does not invent an elapsed-time filter. Today follows the browser's local calendar, consistent with P0; no clinic timezone contract was discovered.
- Booking search retains the existing first-page limit of 20 results; users can refine name/phone/DOB. The main Patients directory retains pagination.

## 6. Patient → Reservation integration details

Patients navigates to `/reception/reservations?practiceId=<current>&patientId=<selected>&date=<local-today>`. Router history state carries names with matching patient and practice IDs as display hints only. The reservation container accepts those hints only when their scope and types match the route; authorization and identity remain server-owned.

Initialization rejects an explicitly mismatched clinic rather than silently opening under another clinic. Creation must be allowed. Selecting the patient refreshes patient-specific follow-up/availability data; requested date/time still passes existing availability validation. The P0 `practiceId + date` shortcut remains usable and retains the requested date after a subsequent patient selection. Eligibility-plus-patient links retain their original priority. Ordinary patient-ID-only initialization is Reception-specific; a regression test preserves Patient portal behavior.

Clinic changes invalidate patient results/selection, appointment list scope, search generations and editor options. Late success/error responses cannot restore old clinic context, including switching A → B → A. If a mutation is already submitted, its captured scope stays fixed; switching clinic clears visible old context and completion does not reopen old details or revoke the new clinic on a stale 403.

## 7. Permission behavior

| Variation | Result |
| --- | --- |
| Search + Register | Search first; Add opens registration |
| Search only | Search available; no Add action, including empty results |
| Register only | Direct registration; no broken search surface |
| Multiple clinics, none selected | Clear guidance to the existing global selector; no duplicate selector |
| Single eligible clinic | Existing context auto-selection preserved |
| Reservation View only | Operational list/details; no booking CTA |
| Reservation Create only | Booking remains accessible without pretending list access exists |
| Missing delegated search/create access | Patient search/booking disabled by account and selected-clinic authorization checks |
| Cancel/reschedule/restore | Require account permission, selected-clinic permission and server capability; existing validation/row versions retained |

Registration uses the existing account-level `Patients.Register` contract; its API has no practice parameter, so no invented delegated registration rule was introduced. Existing 403 access refresh, 409 concurrency handling, mutation feedback, idempotency and check-in authorization remain in place. UI visibility is not treated as backend authorization.

## 8. Responsive verification

The maintained Reception browser harness passed **128 cases** across 320, 390, 576, 768, 820, 1024, 1280 and 1440px in Arabic RTL and English LTR: 96 baseline route cases plus 32 P1 journey cases. The harness intercepts API traffic with synthetic fixtures and records query/payload evidence in `.tmp/reception-responsive/requests.json` and results in `results.json`.

Journeys include patient search → selection → named booking → date/time/visit → submit → details; no result → registration drawer → successful registration → booking handoff; appointments Today query → failure/retry → filtered-empty/reset → details → booking phone search. Assertions cover page overflow, clipped rows, numeric fields, single clinic context, drawer usability and absence of manual patient-ID controls. Long Arabic/English patient and clinic names are included.

Screenshots at 390, 820 and 1440px in both languages were visually inspected in `.tmp/reception-responsive/`, including selected context, registration, booking and appointment details. Review caught split narrow-screen date/time text and a repeated desktop visit label; both were corrected and the harness rerun. The 390px booking action remains reachable above the mobile navigation clearance.

P0/other-role regression also passed: **80 viewport cases** across Reception/Doctor/Patient Home and Doctor/Patient reservations, plus **48 empty-Home cases**. Evidence is in `.tmp/p1-portal-regression/` and `.tmp/p1-portal-empty/`. Browser checks use fixtures and do not constitute live backend integration or usability research with clinic staff.

## 9. Accessibility verification

Primary actions and result selection use semantic buttons/links. Search controls have labels; phone/date values use LTR presentation. Selection and result feedback use live regions, failures use alerts, and quick views expose pressed state. Status text accompanies color. Native details/summary provides keyboard-accessible optional fields and filters. Focus rings use restrained shadows and neutral default borders.

Booking search handles Enter without submitting its enclosing appointment form; a component test verifies this behavior. The existing SideDrawer provides its heading, focus trapping, Escape/close and focus restoration; its existing tests pass in the full suite. Reduced-motion handling remains supported and Reception decoration is disabled. No separate mobile form or viewport-specific state was introduced.

This verification combines source/component checks, existing drawer tests and browser visual/layout checks. It is not a formal WCAG or screen-reader certification.

## 10. Test/build/check results

| Gate | Result / evidence |
| --- | --- |
| `npm run build` | Passed. `.tmp/p1-build.log`; budget warnings below |
| Affected unit tests | **9 files, 65 tests passed**; `.tmp/p1-tests.log` |
| `npm test -- --watch=false` | **119 files, 708 tests passed**; `.tmp/p1-full-tests.log` |
| Reception browser regression | **128 cases passed**; `.tmp/p1-browser.log` |
| P0/other-role browser regression | **80 + 48 cases passed**; `.tmp/p1-portal-browser.log`, `.tmp/p1-portal-empty.log` |
| `npm run check:i18n` | Still fails: **11 baseline findings → 8 unrelated findings**; no remaining finding in P1-touched UI files |
| `npm run check:architecture` | Still fails on unchanged unrelated baseline findings; no new P1 finding |
| `git diff --check` | Passed; line-ending warnings are not whitespace errors |

Meaningful affected tests cover search/register permission variations, no-clinic/single-clinic behavior, named existing/new patient handoff, no-phone contact validation, registration failure retention/toast, empty versus error states, scoped search and stale responses, clinic switching during pending mutations, server date queries, Home/patient deep links, other-role initialization, filter disclosure, capability-denied actions, reschedule consent/reason/row-version payload and restore permission/capability/row-version behavior. Existing cancel, create, concurrency and check-in tests also pass.

## 11. Known unrelated repository failures

`check:i18n` still reports the doctor-practices Arabic separator, four Public Doctors time/date literals, a Reception patient-picker phone placeholder and two Family Requests technical placeholders. Three baseline findings in P1 files were fixed: the upload hint and two drawer strings. Baseline/final logs are `.tmp/p1-baseline-i18n.log` and `.tmp/p1-i18n.log`.

Architecture failures remain the Admin private Reservations-route import, Public Doctors private domain imports/template typing bypass, and existing `!important` declarations in Admin revenue, healthcare workspace and global styles. These files are outside P1. Logs are `.tmp/p1-baseline-architecture.log` and `.tmp/p1-architecture.log`. The combined architecture command stops at this scanner, so the i18n check was also run separately.

The successful production build warns that the initial bundle is **1.01 MB**, exceeding its 1.00 MB warning budget by **8.00 kB**. P1 now crosses that warning threshold; it is reported rather than hidden by raising budgets. The unchanged Public Doctors stylesheet also exceeds its 35.00 kB budget by **2.02 kB**. No unrelated cleanup or budget changes were made. There are no remaining unit-test failures.

## 12. Deferred P2 items

Queue movement, check-in redesign, force check-in and payment collection remain P2. Existing reservation check-in stays integrated with its current APIs/capabilities. Finance, encounters, prescriptions, Family Requests and unrelated actor redesigns were excluded.

## 13. Important UX decisions later phases must preserve

- PortalNavigation and ReceptionPracticeContext remain the navigation and clinic sources of truth. Keep one clinic selector across desktop/mobile/Home.
- Continue patient → named context → explicit booking. Keep internal IDs out of common Reception tasks and retain compatible Home/patient/follow-up links.
- Keep advanced filters/metadata optional, common actions clear and forms progressive. Preserve API fields rather than deleting low-frequency functionality.
- Clinic switching must invalidate stale results, editors and asynchronous completions. Never silently transfer a mutation into another clinic.
- Server capabilities, permissions, availability, concurrency and idempotency stay authoritative. Every mutation needs translated toast feedback.
- Preserve bilingual RTL/LTR behavior, responsive action clearance, neutral surfaces, shared drawers and accessible controls. P2 should build on this workflow without adding automatic check-in to registration or booking.

## 14. P1 Hardening Review

### 14.1 Clinic-Context Leakage Discovery
During post-implementation review, a clinic-context leakage risk was identified in `src/app/features/reservations/state/reservation-workspace.store.ts` around Reception practice switching. While `loadPractice()` invalidated request sequences and closed drawers, a completed patient search in Clinic A left search context (`patientResults`, `patientSearched`, `patientSearchLoading`, `patientSearchFailed`, `bookingPatient`, `bookingPatientId`) in memory. If the receptionist subsequently switched to Clinic B and opened "Book appointment", stale patient search results from Clinic A remained visible. Even though backend authorization remained authoritative, this violated ReceptionPracticeContext scope isolation.

### 14.2 Exact Fix Implemented
In `ReservationWorkspaceStore`:
1. **Invalidation on Practice Change (`loadPractice`):**
   - Automatically resets `patientResults.set([])`, `patientSearchLoading.set(false)`, `patientSearched.set(false)`, `patientSearchFailed.set(false)`, `bookingPatient.set(null)`, and `bookingPatientId.set('')`.
   - Increments `this.patientSearchSequence++` so in-flight async search requests from the previous clinic are dropped immediately.
   - Retains existing `scopeGeneration` bump, request sequence protections, drawer closing, filter reset, and availability resets (`dates`, `slots`, `options`, `date`, `time`).
2. **Drawer Reset Synchronization (`resetDrawer`):**
   - Ensured `bookingPatient.set(null)` is reset alongside `bookingPatientId.set('')` whenever the drawer is reset.
3. **Access Failure Cleanliness (`failure` on 403):**
   - Added resets for `patientSearched.set(false)` and `patientSearchFailed.set(false)` alongside the existing patient resets on delegated access revocation.

### 14.3 Tests Added
Updated `src/app/features/reservations/state/reservation-workspace.store.spec.ts` and `src/app/features/reservations/pages/reservation-workspace/reservation-workspace.component.spec.ts`:
1. **Completed search cleared on clinic switch:** Verifies that searching in Clinic A produces results, and switching to Clinic B empties `patientResults()`, sets `patientSearched()` to false, and clears booking patient data.
2. **Selected booking patient cleared on clinic switch:** Verifies that selecting a patient in Clinic A sets `bookingPatient` and `bookingPatientId`, and switching to Clinic B clears both, as well as eligibilities, dates, slots, and availability options.
3. **A → B → A does not restore old results:** Verifies that patient search state is not cached per clinic; switching back to Clinic A requires an explicit new search.
4. **Pending Clinic A search cannot populate Clinic B:** Verifies that if a search is pending when switching clinics, both late success and late 403 failure from Clinic A are safely dropped without attaching to Clinic B or causing stale refresh.
5. **Today empty state & filtered state derivation:** Verifies `isReceptionTodayEmpty` and `isReceptionFiltered` across view modes and query filters.
6. **Workspace component Today & Filtered empty state interactions:** Verifies that Today with zero appointments renders "Book appointment" (`reception.appointments.book`) and triggers the create drawer, while filtered zero results renders "Reset filters" (`reception.appointments.resetFilters`) and restores Today view.

### 14.4 Today Empty-State UX Improvement
Differentiated the default untouched Today view from a filtered empty state:
- **Default Today Empty View:**
  - Title: "لا توجد مواعيد اليوم" / "No appointments today" (`reception.appointments.emptyToday`).
  - Subtitle: "لا توجد مواعيد مجدولة لهذا اليوم حتى الآن." (`reception.appointments.emptyTodayHelp`).
  - Action (when `store.canCreate()` is true): Prominent "حجز موعد" / "Book appointment" CTA (`.btn-primary`) opening the existing create drawer.
  - When `canCreate()` is false: Informational empty state only.
- **Filtered Empty State:**
  - Title: "لا توجد مواعيد مطابقة" / "No matching appointments" (`reception.appointments.empty`).
  - Subtitle: "جرّب يومًا آخر أو غيّر فلاتر البحث" (`reception.appointments.emptyHelp`).
  - Action: "إعادة ضبط الفلاتر" / "Reset filters" CTA (`.btn-secondary`) restoring the default Today view.
- **Filter Detection (`isReceptionFiltered`):** Derived from query state (`search`, `status`, `bookingSource`, `segmentId`, `isLate`, custom date deviation from active quick view). Default Today date bounds are treated as the standard schedule view, not an active filter.
- **Responsive & Visuals:** Verified across 320px, 390px, 576px, 768px, 820px, 1024px, 1280px, and 1440px in RTL and LTR with touch-friendly CTA height (min 42px), safe wrapping, and mobile navigation clearance.

### 14.5 Verification & Quality Gates
- `npm test -- --watch=false`: **119 test files, 714 tests passed (100%)**.
- `npm run build`: Succeeded (production bundle complete).
- `git diff --check`: Passed (no whitespace errors or conflict markers).
- `npm run check:i18n` & `npm run check:architecture`: Zero new violations (only pre-existing baseline failures in untouched files).
- **Confirmation:** P2 has **NOT** been started; no changes were made to check-in, queue, payments, routes, or backend contracts.
