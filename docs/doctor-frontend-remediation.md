# Doctor frontend remediation — implementation and verification

Date: 2026-10-29. Scope: the supplied Doctor remediation V1 document and Doctor modification brief. No Jira states, external messages, deployment or production sharing flags were changed.

## Result and release conditions

The Doctor frontend changes are implemented with the existing Wasla theme, Arabic/English translations, RTL/LTR layouts, shared page headers and inspection drawers. Financial mutations use real backend commands; failed requests do not manufacture rows, IDs, statuses or success feedback.

Authenticated testing used the account supplied by the user against the project's configured test API. Credentials, tokens and medical response bodies are not included in this report or the QA scripts. Browser sessions are isolated from the user's normal browser.

**Acceptance is not fully signed off:** the real issued-prescription PDF endpoint returns **503**. Successful PDF rendering/printing/watermark verification therefore remains blocked by that service. The supplied account also has one practice, no pending insight, no salary obligation and no due recurring-plan obligation. The corresponding multi-practice, historical, review and recurrence journeys need their specified backend fixtures; they are not represented as completed live tests.

## Changes and ownership

| Area | Final behavior |
|---|---|
| D01 authentication/approval | Removed synthetic demo login after failed authentication. Doctor operational routes require authoritative Approved onboarding status. Pending, Rejected, Suspended and unavailable approval states cannot open operational pages. |
| D02 dashboard | Dedicated lazy Doctor page reads Phase18 filter options/overview. Uses actual metrics, missing-data states, source time window and independent permitted navigation. `Dashboards.Doctor.ViewOwn` matches the actual backend permission. |
| D03 navigation | Expenses, salary plans/obligations, reports, insights and My Patients have independent guards/menu permissions. Analytics has its own group. Removed the unsupported standalone Doctor prescription-list menu. Existing prescription deep links remain available. |
| D04 profile/location | Professional profile and clinic location are clearly distinguished. Geocoding edits are presented as an unsaved draft until the real save succeeds. |
| D05 practice configuration | Preserved the existing correct configuration/branding workflow and permissions. Inactive practice setup is not treated as historical closed-practice mutation access. |
| D06 schedules | Candidate/effective slots are distinguished from actual bookable availability. Existing schedule/exception APIs remain authoritative. |
| D07 prices | Segments, visit types and a segment-by-visit-type price matrix replace the bulky setup interface. Missing prices are not zero. Inline price edits use the real source rowVersion. |
| D08 reception team | Preserved the existing team/assignment workflow. Finance employee selectors use the real permitted reception options, without invented employees. |
| D09 reservations | Historical source practice IDs survive active-practice selection. Booking-only patients cannot be presented as Doctor My Patients. Existing source cancel/reschedule commands remain the single workflow. |
| D10 queue | Start, notes, diagnoses, completion, refund and follow-up actions require their exact permissions and explicit source state/capabilities. Missing capabilities do not mean allowed. |
| D11 encounters | Historical reads retain the owned closed source. Historical notes/diagnoses/amendment/completion/follow-up writes are blocked. Failed follow-up creation after completion is visible. |
| D12 prescriptions | My Patients links to the original prescription workspace/versions. Doctor PDF preview/download use authenticated, issued-version binary requests. Drafts cannot be exported. Blob URLs are revoked on close/change/destroy. Patient print behavior remains available. |
| D13 diagnostics | Patient-scoped, paginated Lab/Radiology histories open the existing source worklist for result details, attachments and review. Pending patient uploads are not official results. |
| D14 My Patients | Directory, overview, attendance, diagnosis, issued prescriptions, appointments, follow-ups and diagnostics use the real sources. Stale requests are cancelled, protected state is cleared and history filters are shared by the active patient context. Practice names replace raw practice UUIDs. |
| D15 reports | Real catalog → filtered preview → metric drilldown → permitted binary export. Server series, warnings, sample counts and time windows are retained. Source links are restricted to permitted owned routes. |
| D16 insights | Real detail/history and acknowledge/dismiss/resolve commands. Source action codes, exact grant, persisted ID and rowVersion are required. Failure/conflict preserves the reason and never fabricates success. |
| D17 operating finance | Dedicated feature separates one-time expenses, recurring plans and obligations, plus salary plans and salary obligations. Real creation/revision/end/pause/resume/correction/cancel/confirmation/settlement/receipt/reversal commands. Plan IDs never substitute for obligation IDs. Expense creation exposes/sends the backend's required reason. |
| D18 archive/audit | Historical records remain read-only through original source IDs. Ticket inspection includes the immutable source timeline. Finance and insight detail surfaces show their real histories. |
| D19 handovers | Deferred exactly as the brief requires: product scope confirmation is required before adding this V1 menu/story. Existing backend operations are acknowledged; no backend gap is invented. |
| D20 sharing | Removed the permanent cross-doctor patient tab and duplicate global follow-up dialog. No sharing flag was enabled; no global patient reader or cross-doctor prefetch was introduced. |

New route pages live inside feature-owned `pages/` folders. Each new Angular component has TS, HTML, CSS and meaningful specs. The private PDF viewer is a generic shared primitive accepting an authenticated Blob. Prescription PDF requests have one canonical domain implementation, request `no-store`, and use one local failure toast.

## My Patients traceability

| Existing Jira scope | Implemented surface / evidence |
|---|---|
| WAS-632 | Existing parent scope preserved; no duplicate story created. |
| WAS-633 / MP-01 | Attendance-based directory, search/filter/paging, summary and first/last attendance. Real account returned two patients. |
| WAS-634 / MP-02 | Real overview and server capabilities; permitted tabs only. Both real overviews returned 200. |
| WAS-635 / MP-03 | Real attendance rows and read-only ticket detail/timeline. |
| WAS-636 / MP-04 | Active own diagnosis history with translated types/statuses, actual clinic names and permitted original encounter link. Two real diagnoses verified. |
| WAS-637 / MP-05 | Issued prescription history, source encounter, versions and original detail links. One real finalized version verified. |
| WAS-638 / MP-06 | Read-only appointment history; links to the original reservation workflow with actual source IDs. |
| WAS-639 / MP-07 | Follow-up history and source link. Creation stays in the eligible source encounter, not a Doctor booking form. Live account had no follow-up fixture. |
| WAS-640 / MP-08 | Authenticated private PDF implementation and lifecycle tests. Actual GET returned 503; no PDF/success was fabricated. |
| WAS-641 | Patient-scoped diagnostic sources and existing review integration. Pending-upload acceptance needs a pending fixture. |
| WAS-642 | Historical source handling, write denial and no permanent shared-record tab. A closed-practice live fixture is still required. |
| WAS-643 | Unit/component, responsive fixture browser and authenticated source checks below. Remaining live journeys are explicit. |

## Authenticated acceptance evidence

| Journey | Verification and remaining limits |
|---|---|
| A — pending Doctor | Pending/Rejected/Suspended/unavailable denial covered by guard/login tests. Actual supplied account was Approved and logged in through the real form. |
| B — Doctor day | Real login/dashboard/queue opened. Source capability and completion/follow-up behavior covered by regression tests. New Called-ticket-to-completed-encounter live journey still needs a current operational fixture. |
| C — patient relationship | Real attendance-backed directory, both overviews and histories read successfully. Reception creation leg not executed with a Reception account. |
| D — multiple practices | Scope/ID handling implemented and tested; supplied account has one practice, so the three-attendance multi-practice live fixture remains required. |
| E — historical | Historical reads/write-denial and no active-practice fallback covered by tests. No closed-practice live fixture supplied. |
| F — prescription | Real issued list and versions returned 200. Actual backend version dates render. Private PDF GET returned 503; UI showed one error and zero success notifications. Successful PDF print/download/watermarks remain blocked. |
| G — patient upload | Source worklist integration and capability gating implemented; pending submission review needs a seeded pending upload. |
| H — follow-up | Source eligibility/completion tests pass. No new entitlement was created on an existing clinical fixture; full booking/consumption journey needs dedicated encounter plus Patient/Reception fixtures. |
| I — sharing OFF | No permanent tab or sharing activation. No shared-record prefetch from the patient workspace. |
| J — revocation | Permission, 403/error clearing, cancellation and Blob lifecycle tests cover local behavior. Real administrative grant revocation was not performed. |
| K — reports | Actual catalog (nine entries), overview (52 metrics), metric drilldown and XLSX export returned 200. Real nonempty `overview.xlsx` downloaded into the ignored QA folder. |
| L — insight failure | 409/503 and retained-reason behavior tested. Real insight list was empty. |
| M — expense | Real recurring plan created and ended. No obligation was materialized for that plan. Separately, a new one-pound test expense was created, settled, its receipt loaded, settlement reversed and obligation cancelled. Distinct Plan/Obligation ID and same-idempotency retry are covered by component/isolated-browser tests. |
| N — salary | Real salary plan created for the actual permitted reception identity, then ended through the salary-plan command. Salary-obligation cancellation needs a materialized obligation fixture. |
| O — financial errors | No fake rows/employees/success on failed API calls. Real creation initially returned required-reason validation; the form/payload were fixed and the complete real expense workflow then passed. |
| P — responsive/RTL | Five Doctor screens × two languages × 360/768/1280 tested with isolated source fixtures. Queue additionally checked with the real account at those sizes/languages. No page overflow observed. |

Only new clearly marked QA finance records were mutated. Test plans were ended; the one-time test settlement was reversed and its obligation cancelled. Existing patient/clinical records were not edited. Immutable financial audit history remains, with zero net test settlement.

## Verification commands and artifacts

- Full regression: `npm test -- --watch=false` — **160 suites, 1351 tests passed**. Subsequent backend-contract fixes are additionally covered by the focused final regression run.
- Final contract regression: `npm test -- --watch=false --include=src/app/features/doctor-patients/**/*.spec.ts --include=src/app/features/operating-finance/**/*.spec.ts --include=src/app/domains/prescriptions/**/*.spec.ts --include=src/app/features/prescriptions/**/*.spec.ts` — see final result below.
- Template/type check: `node node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js -p tsconfig.spec.json --noEmit`.
- Production build: `npm run build`. Existing initial-bundle and large legacy queue/finance stylesheet budget warnings remain; these are not hidden.
- `node scripts/check-i18n.mjs` and `node scripts/check-architecture.cjs` were run. Whole-project checks still report unrelated legacy hardcoded labels, `any` and `!important`. New feature boundaries/imports and new translation pairs were corrected; a clean whole-project audit is not claimed.
- Impeccable design detector reported legacy/off-ramp findings, including static-render false positives from imported component templates. The new dashboard type-ramp issue was corrected. This check is not claimed as globally clean. One initial target path was invalid (`Warning: cannot access src/app/features/practices/components/practice-segments`); the actual feature is `doctor-practices`.
- Dependencies already existed and no package/lock changes were needed; `npm ci` was not run.
- Isolated browser harness: `scripts/browser-doctor-remediation.cjs` — **31 checks, no JS errors**; real backend writes are intercepted in this harness.
- Authenticated harness: `scripts/browser-doctor-live-qa.cjs` — receives credentials on stdin, uses a fresh browser context, saves only sanitized route/status/schema metadata. It does not contain account credentials.
- Local evidence (ignored): `.tmp/doctor-remediation-evidence/`, `.tmp/doctor-remediation-live/`, `.tmp/doctor-remediation-final-all-tests.log`, `.tmp/doctor-remediation-final-contract-tests.log`, `.tmp/doctor-remediation-final-build.log`, `.tmp/doctor-remediation-architecture.log`, `.tmp/doctor-remediation-i18n.log`.
- Contract evidence: existing generated Phase18 types/operation map, checked backend reference and live OpenAPI. My Patients summary is embedded in its directory response; an exploratory standalone summary probe returned 404 and is not used by the application.

## Review / rollout

Review the working-tree diff and the feature-owned pages, canonical prescription API, approval guard, My Patients components and source workflow changes. No commit, PR, Jira change or deployment was performed. Before release acceptance, restore/configure the PDF renderer and provision the missing dedicated current-ticket, historical/multi-practice, recurring/salary-obligation, pending-upload and insight fixtures. Keep cross-doctor sharing disabled. Confirm handover V1 scope separately, as specified in the brief.

Final contract regression and final diff manifest are appended after verification.
