# P2 — Queue / Check-in: repository-verified UX and technical audit

Audit date: 7 October 2026. Baseline: clean `master`, commit `1f63709` — P1 Hardening, following `e571861` — P1 and `36efaca` — P0.

**Status: audit and proposed implementation plan; awaiting approval.** The supplied P2 brief explicitly says, “Do not implement until these UX decisions are approved.” No application code, permission contract, route, API or browser script was changed during this audit. `portal-p2-report.md` belongs to the subsequent implementation/verification phase.

## 1. Verdict and scope

The existing frontend contracts support the primary proposed workflow: arrival plus exact payment produces a ticket; walk-in plus exact payment produces a ticket; Queue operations preserve server ordering and concurrency. P2 should refactor workflow and hierarchy while retaining these contracts.

Implementation integrity currently fails the intended Reception experience: two clinic controls coexist, internal patient identifiers dominate walk-in, realtime copy overstates the update mechanism, and check-in success data is not rendered. Additionally, asynchronous failure handling and input retention need correction before exposing new success states.

This audit covers Reception Queue, scheduled check-in inside Reservations, walk-in, ticket details and compatible Doctor Queue operations. Patient Tickets, Finance refund redesign, clinical Encounter redesign and new realtime infrastructure are excluded.

### Audit health score

These are engineering review scores, not WCAG certification or measured performance benchmarks.

| Dimension | Score / 4 | Evidence |
| --- | --- | --- |
| Accessibility | 2 | Semantic buttons, labels and native modal exist; some targets are 34–36px and the check-in select misses the established styling classes |
| Performance | 3 | OnPush/signals, lazy routes and bounded requests; large blurred decoration and repeated surfaces add avoidable rendering work |
| Responsive design | 3 | Existing bilingual viewport checks pass; operational drawers/mutations are not covered by those passes |
| Theming | 2 | Tokens and logical layout exist, alongside gradients, colored alert borders, inconsistent small type/radii and nested panels |
| Implementation integrity | 1 | Context duplication, misleading update claims, ID-first walk-in and stale async error paths |
| **Total** | **11 / 20** | **Acceptable foundation; significant workflow and safety work required** |

Seventeen findings are listed below: nine major and eight minor; no separate blocking/polish findings. Severity labels refer to audit urgency, not Wasla rollout phase names. Server authorization remains authoritative; this review does not establish a backend security exploit.

## 2. Existing flows and ownership

| Journey | Current implementation and result |
| --- | --- |
| Scheduled arrival | `/reception/reservations` → Open → Reservation detail drawer → inline check-in/payment form → POST → drawer closes → toast → appointment list reload |
| Early arrival | Same form, normal/early modes at equal weight when both permissions exist; force requires a reason |
| Walk-in | `/reception/queue` → permanent form below the board → patient record ID → segment → visit type → server price → payment method → POST → ticket details |
| Daily Queue | Initial GET, manual Refresh, refresh after mutation; four server groups: in-progress, called, waiting, no-show |
| Ticket exception | Open ticket → generic reason field already visible → manual call/cancel or another permitted status-specific action |
| Doctor | Same Queue component, own clinic catalog/selector, Start Visit and existing Encounter link under their current permissions |
| Patient | Separate `/patient/tickets` component; outside P2 |

`QueueWorkspace` owns Queue/API orchestration and local state; its current files are 517 TS, 921 HTML and 1,353 CSS lines. `ReservationWorkspaceStore` owns scheduled check-in orchestration. The check-in component is presentational and should remain so. Tickets/Finance/Patients/Follow-ups expose public domain APIs. `ReceptionPracticeContext` owns Reception clinic selection; `PortalNavigation` owns navigation.

## 3. Verified API contracts

| Operation | Existing endpoint / request |
| --- | --- |
| Normal arrival | `POST /api/v1/practices/{practiceId}/reservations/{reservationId}/check-in`; exact `paidAmount`, `paymentMethod`, nullable `referenceNumber` and `notes` |
| Exceptional arrival | Same base with `/force-check-in`; additionally requires `reason` |
| Walk-in | `POST /api/v1/practices/{practiceId}/tickets/walk-in`; `patientId`, `segmentId`, `visitTypeId`, exact payment fields; optional follow-up eligibility ID and row version |
| Valid walk-in combinations | `GET /api/v1/reception/practices/{practiceId}/walk-in/options`; existing patient/eligibility context parameters |
| Queue/details | `GET /api/v1/practices/{practiceId}/queue`; `GET .../tickets/{ticketId}` |
| Call next | `POST .../queue/call-next` |
| Ticket operations | `POST .../tickets/{ticketId}/manual-call`, `/recall`, `/confirm-no-response`, `/restore-no-show`, `/start`, `/cancel`; versions, and reason where required |
| Completion | Existing `/complete` API takes ticket and Encounter row versions. Queue itself has no standalone Complete button; preserve its clinical integration rather than introducing another completion workflow |
| Patient selection | Existing Patients search supports name, phone, DOB, `doctorPracticeId` and pagination |
| Follow-up | Existing Reception patient/practice eligibility lookup; validity and bookability remain server-owned |

TicketsApi mutations send `Idempotency-Key`. Versioned ticket actions send the existing row version. Arrival is already a single payment/ticket operation; do not split it into separate module steps. Cash, Card and Wallet are supported. Exact-price validation exists in component/store; price zero is explicitly tested. No partial, split or excess payment should be designed.

`PracticeTicket` returns ticket number, optional patient identity, status, patients ahead, price snapshot, payment references and operational timestamps. It does **not** return payment method or a general server action-capability object. A payment-method success label must use the accepted submission context, scoped to the returned ticket, rather than pretending the response contains it. Show free visits as no amount due; do not imply cash was collected for a zero-price visit.

The checked-in ticket currently has only two production references: its declaration and assignment in the reservation store. No template consumes it, and no reset path clears it.

The checked-in ticket must be treated as a scoped, point-in-time result. `patientsAheadNow` is a server snapshot, not a promise that the count stays live. Missing patient identity must use captured display context or translated fallback, never a patient-profile lookup invented for P2.

The local Swagger snapshot confirms normal/force check-in, walk-in creation and Call Next paths. It does not contain the walk-in-options/follow-up paths present in current domain clients and tests. Those existing frontend contracts can be reused, but live deployment compatibility has not been verified. The audit did not call the real backend.

## 4. Permissions and clinic context

| Capability | Current requirement / boundary |
| --- | --- |
| Reception Queue View | Selected assignment grants `PracticeTickets.View` |
| Call / recall / no response | Current code uses **`PracticeTickets.Call`**, not `PracticeTickets.CallNext` |
| Manual call / restore / cancel | Corresponding selected-assignment permission; known status checks and server rejection remain authoritative |
| Normal check-in | Selected practice matches store; reservation is `Active`, price is defined; CheckIn plus RecordPayment |
| Force check-in | Same scope/status/price conditions; ForceCheckIn plus RecordPayment and reason |
| Walk-in | CreateWalkIn plus RecordPayment on current selected practice; does not currently require SearchBasic |
| Search during walk-in | Must use existing account SearchBasic and appropriate selected-clinic authorization; keep it independent of walk-in creation |
| Refund link | Existing ticket refund eligibility/payment ID and Finance permissions; no refund operation inside Queue |
| Doctor Start Visit | DoctorPracticeTickets.StartOwn plus MedicalEncounters.StartOwn |
| Doctor clinical link | MedicalEncounters.ViewOwn plus Diagnoses.ViewOwn |

Queue/check-in currently rely on delegated Reception grants rather than explicit session-level checks for each ticket action. Queue's actor guard checks actor/authentication but has no Reception ticket permission configured. Queue unit tests deliberately supply `hasPermission: false` with valid delegated grants and expect operations to remain available. Do not silently impose a new global ticket permission or SearchBasic requirement; reconcile any proposed account cross-check with the existing permission contract first. Server permission checks remain the final authority.

Reception's global selector must become the only visible selector. Keep Doctor's local selector. Initial route scope and subsequent global switches must use validated current assignments; a mismatched/stale query must not silently move an operation to another clinic. Preserve P0 navigation, Home links and P1 patient/date/eligibility initialization.

## 5. Prioritized findings

### Major findings — address before P2 release

| ID | Finding, evidence and impact | Proposed correction |
| --- | --- | --- |
| F01 | **Duplicate clinic context.** Queue HTML:23 renders `queue-practice-select` for both actors alongside the global Reception selector. All six inspected Reception screenshots show the extra control; it displays Choose clinic while the global header already identifies the selected clinic. This creates uncertainty about which clinic is active. | Remove the Reception control and its exclusive markup/styles; retain Doctor selection and context-driven scope invalidation |
| F02 | **Arrival action is buried.** Reservation workspace HTML:811–815 renders check-in after opening the general detail drawer. Reception must discover and scroll to the form instead of acting on an arrival. | Add a non-mutating Patient arrived entry point on eligible Reception appointment rows and in details; load fresh details before presenting the focused arrival form |
| F04 | **Missing Done context.** Reservation store:170,626–675 retains `checkedInTicket` after closing the drawer, but production templates never render it. Reception cannot see ticket number or next queue action. | Keep a scoped completed outcome with ticket number, patient, count-at-arrival, accepted payment information, permitted Open Queue and Done |
| F06 | **Walk-in is technical and permanently exposed.** Queue HTML:451–644 puts the full form on the page; HTML:491 asks for patient ID before segment/visit fields. Staff must understand internal records while Queue work competes with form work. | Secondary Patient without appointment action → drawer → scoped named search → one server-backed visit/price choice → payment → Add to waiting. Advanced record-number fallback only when search is unavailable |
| F07 | **Failed walk-in loses input.** Queue TS:283–291 awaits `runMutation`, which catches failure internally, then unconditionally resets the form. Retry loses patient, visit and payment/reference/note values. | Return an explicit mutation outcome; reset only on same-context success. Preserve values and intent on failure; refresh stale options without silently discarding compatible choices |
| F08 | **Stale Queue errors cross clinic boundaries.** Queue TS:383–419 guards mutation success by generation, but not mutation catch or post-mutation GET catch. `failure` at :492 can refresh access and clear the new clinic after an old 403. Follow-up catch at :451 also lacks scope protection. Switching during busy work can leave the new Queue unloaded because `loadQueue` returns while busy. | Capture scope/generation for success, failure, permission refresh and cleanup. Ignore stale UI effects, clear obsolete context, and load the latest clinic after the old mutation finishes |
| F09 | **Check-in completion is not scoped.** Reservation store:626–675 captures neither scope generation nor the original clinic for completion/failure; clinic switching clears the visible drawer while busy, yet late success sets an old ticket and late 403/409 can affect current state. `checkedInTicket` has no clinic reset. | Capture clinic/reservation/generation and accepted draft before the request; reject stale completion/error UI effects and clear the outcome on scope change, including A → B → A |
| F11 | **Walk-in without Queue View cannot initially obtain options.** Queue TS:220–222 loads walk-in options only inside `canViewQueue`, although `canWalkIn` does not require View. Valid CreateWalkIn + RecordPayment users see a form that lacks options until another path happens to refresh them. | Separate Queue read permission from walk-in option loading/creation. Verify View-only, Create-only, no SearchBasic, missing RecordPayment and revoked-assignment variants |
| F17 | **Passing browser checks do not verify P2 operations.** The Reception harness covers a static Queue projection; its fixture grants `PracticeTickets.CallNext` at script:28 while the app checks `.Call`. It grants neither walk-in nor check-in/payment access. Existing queue component tests do not interact through the proposed arrival/walk-in/call/restore/cancel journeys. | Correct synthetic permissions and add actual mutations, errors, concurrency and switching cases before calling P2 verified |

F08/F09 are source-traced race risks. The audit does not claim dedicated browser reproductions of those races; implementation must add controlled late-response regression tests.

### Minor findings — include in the planned refactor

| ID | Finding, evidence and impact | Proposed correction |
| --- | --- | --- |
| F03 | **Unnecessary amount entry.** Check-in component HTML:26 accepts an editable amount and offers Use reservation price although only equality is accepted. | Fixed amount from current authoritative price, including zero; keep independent store validation |
| F05 | **Exception competes with normal arrival.** Check-in HTML:61 displays equal normal/early mode buttons. | Put early/exceptional arrival under additional options with required reason; force-only operators still receive an explicit usable exception flow |
| F10 | **Request ordering within one clinic is incomplete.** Queue `inspect` and GET use clinic generation but no per-request sequence; options success checks a sequence while options failure checks only generation. Slow older responses/errors can overwrite a newer selection. | Separate sequence/epoch guards for Queue reads, ticket detail, patient search, eligibility and options; also invalidate when closing/changing the chosen patient |
| F12 | **Load error can look like an empty Queue.** Queue GET failure sets messages but has no separate failed branch; the board can render empty/stale groups below an error. Waiting/no-show empty states use small inline icons and text without useful next actions. | Distinguish initial loading, failure with Retry, no clinic, no View and genuine empty Queue; use existing themed SVG illustrations for full empty states |
| F13 | **Realtime claim is inaccurate.** `tickets.queue.subtitle` in translations:1133 promises realtime. Queue code has initial/manual/post-mutation GET only. | Accurate operational copy; keep Refresh. No automatic polling or new transport in this phase |
| F14 | **Metadata, reason and exceptions obscure common work.** Queue HTML:705–830 foregrounds audit fields, raw source/outcome strings and generic reason before an action. Waiting/no-show have competing surfaces. | Now → Waiting → Exceptions; called context explains occupied state. Move metadata/history to Additional details; ask for reason only after choosing manual call/cancel; translate known source/outcome codes |
| F15 | **Decorative drift and motion.** Queue CSS:27–49 uses fixed 500px blurred shapes; :182 gradients; :234 colored alert border; :309 pulses; repeated card/panel surfaces. These are verified design-rule conflicts, not measured frame-rate failures. | Replace touched rules and obsolete DOM with neutral surfaces/dividers; remove decoration/pulse rather than stacking overrides. Preserve useful pending feedback |
| F16 | **Controls need accessibility/responsive completion.** Queue detail/open controls have 34/36px dimensions (CSS:414,939). Check-in's `.field` select has no matching component style and misses global `.form-field`/`.form-control` select rules. Native Queue dialog already supplies modal semantics/Escape, so it is not automatically inaccessible. | Approximately 44px practical targets, styled logical-arrow select or labeled payment choices, live result feedback, visible focus, shared SideDrawer with tested trap/Escape/restore. Audit contrast and text zoom in actual operational states |

Global reduced-motion rules use a `0.01ms` duration shortcut (`src/styles.css:165`). This is existing infrastructure, not proof that P2 is inaccessible; keep it recorded as a baseline limitation and verify intentional state feedback in touched components rather than expanding P2 into global motion cleanup.

## 6. Proposed UX decisions for approval

1. **Scheduled arrival:** Patient arrived opens a focused drawer, not an immediate mutation. Show named patient, time, visit and fixed amount; payment method is the main editable choice. Reference/notes are optional disclosure. Confirm arrival and add to waiting uses the existing endpoint.
2. **Early/exceptional arrival:** Additional options when permitted, required clear reason, existing force endpoint. Do not calculate clinic grace windows in Angular or infer eligibility from the clock. Normal timing rejection stays a server error; no automatic force retry.
3. **Arrival Done:** Remain in context and show a named success/ticket result. Open Queue requires current scoped View and uses the existing route; Done closes the outcome. No automatic navigation. No View still permits the confirmation. Scope switches dismiss it.
4. **Walk-in:** Secondary drawer action. Name/phone search plus optional DOB when SearchBasic is allowed. Zero/error/loading are distinct. When search is unavailable, keep a closed Advanced options record-number fallback without making SearchBasic a new creation requirement. No new patient lookup/profile API.
5. **Visit/price:** Flatten server-provided valid segment/visit pairs for presentation, while preserving both identifiers and eligibility row version in requests. Refresh on patient/eligibility/context changes. Do not create follow-up eligibility or queue priority client-side.
6. **Queue:** One Reception clinic context. Current/called patients precede the waiting list and Call Next. Occupied state explains who is already called/in progress; the relevant patient's permitted actions stay discoverable. No-show is a secondary disclosure/list. Keep all four server projections.
7. **Exception actions:** Choosing manual call/cancel opens the action explanation and required reason. No response, recall and restore retain existing known-state/permission checks; backend attempt rules remain authoritative. Refunded no-show cannot restore. Cancellation does not refund.
8. **Boundaries:** Preserve Doctor selector/Start/Encounter integration; no Patient portal redesign. No realtime transport, polling, partial payment, queue reorder, Finance mutation or new capability object.

All changed copy must be semantic AR/EN translation keys, plain clinic language and direction-safe numeric content. Use existing PageHeader, tokens, Bootstrap utilities, SideDrawer and ToastService. No new app-wide state or navigation configuration.

## 7. Component/refactor plan and exact change surface

Before UI implementation, audit selector usage and remove obsolete Queue wrappers/rules together. Repeated base selectors must be distinguished from legitimate grouped state/breakpoint rules; do not treat every repeated string as a conflict or add specificity overrides.

| Expected files | Planned ownership/change |
| --- | --- |
| `src/app/features/tickets/pages/queue-workspace/queue-workspace.{ts,html,css,spec.ts}` | Single Reception context, new hierarchy/drawer modes, scoped API orchestration, input retention, race/error tests; preserve Doctor behavior |
| New Tickets-local `components/walk-in-patient-search/walk-in-patient-search.component.{ts,html,css,spec.ts}` | Presentational typed search/results and selection, no API calls; complete four-file implementation |
| `src/app/features/reservations/components/reservation-check-in/reservation-check-in.component.{ts,html,css,spec.ts}` | Fixed payment, optional fields/exception, explicit action, payment/error/busy behavior |
| `src/app/features/reservations/pages/reservation-workspace/reservation-workspace.component.{ts,html,css,spec.ts}` | Arrival entry/drawer/Done rendering, current-scoped Queue next action |
| `src/app/features/reservations/state/reservation-workspace.store.{ts,spec.ts}` | Arrival drawer state, scoped outcome, request/403/409/idempotency protection |
| `src/app/core/i18n/translations.ts` | Semantic bilingual operational labels, source/outcome mappings and accurate update copy |
| `scripts/browser-reception-responsive.cjs` | Correct permissions; synthetic P2 operational journeys/request assertions and screenshots |
| `src/app/domains/tickets/tickets-api.spec.ts` | Extend only if needed to verify preserved arrival/walk-in/version payloads; API implementation/model changes are not currently needed |
| `docs/portal-p2-audit.md`, later `docs/portal-p2-report.md` | Decisions, baseline and final evidence |

QueueWorkspace may continue coordinating feature-local APIs; no speculative store/facade is required just for the audit. Extract further presentational form/detail components only if the final responsibility/DOM warrants them, with all four files. Do not import Reception or Reservations private patient search into Tickets. Do not place ticket or payment orchestration in Shared.

Shared SideDrawer is justified here because materially changing Queue details/walk-in otherwise duplicates heading, RTL placement, mobile sizing, busy close, focus trapping/Escape/restore. Reuse it without altering its public behavior. Replace Queue's custom drawer markup/styles only after migrating all actions. No shared shell/guard/navigation change is planned.

## 8. Async, validation and failure requirements

- Capture scope, generation, target identity and intent before each request; retain them through awaited refresh/error paths. Do not read the newly selected clinic to process an old request.
- Invalidate completed results and pending read sequences on clinic, patient, drawer and permission changes. Include A → B → A tests; equal IDs alone are insufficient.
- A submitted mutation remains tied to its original clinic. Busy controls prevent duplicate submission; stale completion must not reopen old detail or modify the new clinic's grants. After it settles, load current context safely.
- Retry preserves compatible form values and idempotency intent. An explicit changed payload gets the appropriate new intent. Never report payment/ticket success before the accepted response.
- Keep exact-price checks in orchestration as well as presentation. A stale option/error should guide reselection; no fabricated fallback price. Undefined price blocks arrival; zero does not.
- Keep 403 refresh and 409 row-version refresh under the captured current-context guard. API timing/duplicate-ticket/eligibility errors remain errors, never empty results or automatic overrides.
- Permission removal while the clinic ID remains unchanged must remove unsafe actions/context too; do not rely solely on an ID-change effect.

## 9. Verification plan after approval

| Area | Required behavioral coverage |
| --- | --- |
| Clinic | None/single/multiple assignments; open detail/walk-in; late GET/mutation success/error/403; A → B → A; permission removal without ID change |
| Arrival | Normal/early permission, required reason, timing rejection, exact/free price, Cash/Card/Wallet, optional fields, duplicate submission, retained draft, 403/409/already-ticket, scoped Done and Queue View variations |
| Walk-in | Found/empty/error search, no SearchBasic advanced fallback, no Create/RecordPayment, Create without View, server-disabled/empty options, active-ticket conflict, current/expired/used follow-up, stale price, duplicate/pending clinic switches, rejected combination |
| Queue | Empty/one/many/priority, occupied/called/in-progress, Call Next error, manual reason/occupied rejection, no response/recall/max attempts, restore/refunded restriction, cancel and separate Finance link |
| Preservation | P0 one selector/navigation, P1 patient/date/eligibility booking, Doctor selector/Start/Encounter links, Patient Tickets unchanged |
| Accessibility | Keyboard search/selection/payment/reasons, focus trap and restoration, Escape/busy close, alerts/live feedback, status text, visible focus, long names, reduced motion and text zoom |

Synthetic browser journeys must include scheduled appointment → arrived → exact payment → ticket Done; walk-in → structured patient search → server visit/price → payment → Done; Call Next → no response/recall/no-show → restore; cancel → separate Finance link. Include the early/exceptional path and controlled failures. Intercept API traffic; no live patients/payments.

Run 320, 390, 576, 768, 820, 1024, 1280 and 1440px in both languages. Capture and inspect 390/820/1440 operational states, not only page shells. Check reachability above mobile navigation, long names, payment choices, reason disclosures and drawer primary actions. Run affected and full tests, production build, i18n/architecture with baseline comparison, diff checks, Reception browser and Doctor/P0/P1 regressions. Do not claim a layout pass proves a mutation or live backend integration.

## 10. Fresh baseline checks and visual evidence

| Check | Result |
| --- | --- |
| Production build | Passed; `.tmp/p2-baseline-build.log` |
| Full unit suite | **119 files, 714 tests passed**; `.tmp/p2-baseline-tests.log` |
| Existing Reception browser script | **128 cases passed**, including 16 static Reception Queue viewport cases; `.tmp/p2-baseline-browser.log` |
| Doctor Queue baseline | **16 viewport cases, zero failing route/language scenarios**; `.tmp/p2-baseline-doctor-browser.log`, `.tmp/p2-baseline-doctor-queue/` |
| i18n | Fails on **8 existing unrelated findings**; `.tmp/p2-baseline-i18n.log` |
| Architecture | Fails on existing unrelated imports/type bypass/`!important`; `.tmp/p2-baseline-architecture.log` |
| Diff check | Passed; clean starting tree |
| Impeccable detector | `.tmp/p2-baseline-detector.json`: 111 advisory entries (27 radius, 38 font-size, 46 color), no non-advisory finding in emitted JSON; CLI exited 2 |

The detector's token fallback parsing includes false positives such as `10px)` reported outside the documented 10px scale. Do not equate its 111 advisories with 111 verified defects. Verified design findings are F15/F16; source and visual evidence take precedence. No ignore/config changes were made to suppress results.

Visually inspected current Queue screenshots at 390, 820 and 1440px in Arabic/English: `.tmp/reception-responsive/reception-queue-{ar,en}-{390,820,1440}.png`. They confirm the second selector, realtime copy, large empty Now cards ahead of the waiting patient, equally weighted no-show surface and technical timestamp in the row. Existing numeric layout checks pass; the images are a static View-only Queue fixture and do not prove arrival, walk-in, Call Next or operational drawer usability. No screenshots of those unimplemented proposed flows are represented as completed work.

Existing component/API tests cover exact payment, force reason, zero price, endpoint/idempotency/version payloads and selected delegated grants. They do not cover the newly identified cross-clinic arrival/Queue failure races. Passing all tests establishes the starting baseline, not P2 completion.

## 11. Existing repository failures and limitations

The build's initial bundle is 1.01 MB, **8.48 kB** above the 1.00 MB warning budget. Public Doctors CSS is 37.02 kB, **2.02 kB** over its warning budget. No budget change is proposed.

The eight i18n findings are doctor-practices' Arabic separator, four Public Doctors time/date literals, a Reception patient-picker phone placeholder and two Family Requests placeholders. Architecture reports Admin's private Reservations route import, Public Doctors private domain imports/template type bypass, and existing `!important` declarations in Admin revenue, healthcare workspace and global styles. The architecture command stops before its chained i18n phase, so i18n was run separately.

No real backend, clinic permission configuration, device, screen-reader assessment, contrast certification or clinical staff usability session was performed. No current Queue push transport/polling was found. The local Swagger snapshot is incomplete relative to existing walk-in option/follow-up clients. Do not invent supported behavior to close these evidence gaps.

## 12. Explicit exclusions and decisions to preserve

P3 owns refund/correction/receipt UX. P2 cancellation can expose the existing authorized Finance link but cannot refund automatically. P4 owns deeper Encounter redesign; keep Doctor Start/clinical navigation and completion integration compatible. P9 owns Patient Tickets/Portal redesign. No queue reorder, partial/split payment, new ticket capability object, patient profile/history endpoint, realtime/polling infrastructure, auth/guard relaxation or P0 navigation duplication.

Preserve server order/pricing/rules, all existing ticket actions, idempotency/version checks, bilingual plain language, ToastService feedback, one Reception clinic selector, local feature state and P1's compatible patient/date/eligibility links.

## 13. Approval decision

Recommended decision: approve the eight UX decisions in section 6 and the bounded implementation/verification plan in sections 7–9, including the advanced record-number fallback for walk-in operators without SearchBasic and accurate manual-refresh copy. Keep polling, payment-contract and unrelated role redesign outside P2.

After approval, implementation should begin with context/failure protection, then scheduled arrival/Done, walk-in selection/price, Queue/detail hierarchy and full synthetic verification. The implementation report should record actual final decisions, files, payloads, permission variations, responsive evidence, all checks and deviations.

For the installed Impeccable workflow, the findings map to `harden` (F07–F12/F17), `distill`/`clarify` (workflow/hierarchy/copy), `adapt` (F16 and operational drawers), then `polish` as a final bounded pass. These are implementation aids within the approved scope, not additional prerequisites for approval.
