# P2 — Queue / Check-in implementation and verification

Implementation date: 7 October 2026. Baseline: `c65dfdd`, following P1 hardening (`1f63709`), P1 (`e571861`) and P0 (`36efaca`). This implements the approved [P2 audit](portal-p2-audit.md) and the supplied implementation brief. The audit itself is preserved as the historical decision record.

## Delivered workflows

| Journey | Result |
| --- | --- |
| Scheduled arrival | An eligible Active appointment has **Patient arrived**, alongside the existing Open action. Clicking it fetches fresh details and opens a focused drawer; it does not mutate data. |
| Exact payment | The drawer shows patient, appointment, visit and the backend price. The amount is fixed; zero says **No payment due**. Cash, Card and Wallet are explicit choices. Reference and notes are inside Additional details. |
| Exceptional arrival | Additional options is closed initially. Exceptional arrival requires an explicit choice and a nonblank reason. Force-only access explains the available path. A failed normal arrival never automatically invokes Force Check-in. |
| Arrival Done | Shows the returned Queue number and `patientsAheadNow` snapshot, patient name and the accepted submission's payment method. Open Queue appears only with scoped View. Done closes the drawer; success does not automatically navigate. |
| Walk-in | A secondary **Patient without appointment** action opens a drawer. Structured name/phone/date-of-birth search selects a named patient. Server segment/visit/price combinations appear in one select. The amount remains fixed; optional payment details are disclosed. **Add to waiting** submits the existing contract. |
| Walk-in failure / Done | Ordinary failure retains patient, compatible choice, method, reference and notes. A 409 refreshes server choices and requires a new valid selection. Successful creation resets the draft and shows scoped Done. |
| Queue | A compact Now area identifies current/called patients, followed by the ordered Waiting list and Call Next. Occupied Queue shows context and appropriate actions. No-show patients remain a secondary disclosure. |
| Ticket actions | Manual call and cancellation expose a reason only after choosing the action, with a consequence explanation. Existing no-response, recall and no-show restoration remain. Cancellation remains separate from the existing Finance refund link. |
| Operational states | No clinic, no scoped View, loading, load failure with Retry and genuinely empty Waiting are distinct. Empty/error guidance uses the existing themed SVG assets. Copy describes manual updates rather than realtime delivery. |

## Ownership and changed files

- `src/app/features/tickets/pages/queue-workspace/queue-workspace.{ts,html,css,spec.ts}` owns Queue reads, scoped mutations and walk-in orchestration. Its old decorative layout, custom detail panel/cancel dialog, raw-ID common path and obsolete styles were replaced.
- `src/app/features/tickets/components/walk-in-patient-search/walk-in-patient-search.component.{ts,html,css,spec.ts}` is a complete, Tickets-local presentational component. It accepts results/state and emits search/selection; it owns no API orchestration and imports no Reservations private implementation.
- `src/app/features/reservations/components/reservation-check-in/reservation-check-in.component.{ts,html,css,spec.ts}` renders fixed-price arrival and emits a typed submission.
- `src/app/features/reservations/pages/reservation-workspace/reservation-workspace.component.{ts,html,css}` adds the row action, focused arrival and Done branches while retaining P1 booking/details behavior. Its existing spec remains in the verification set.
- `src/app/features/reservations/state/reservation-workspace.store.{ts,spec.ts}` owns arrival requests, accepted submission context, conflict refresh and outcome invalidation.
- `src/app/core/i18n/translations.ts` contains the new semantic AR/EN labels and updated Queue description.
- `scripts/browser-reception-responsive.cjs` now uses the real `PracticeTickets.Call` code and exercises P1/P2 journeys, synthetic failures and delayed responses. It handles CORS preflights separately from mutations, bounds CDP requests and cleans up its own targets.

Shared PageHeader, SideDrawer, ToastService and the existing Wasla tokens/Bootstrap controls are reused. No shared component, shell, route, API client, domain model, permission code, PortalNavigation or ReceptionPracticeContext was changed. All state added for these workflows stays within Tickets or Reservations.

Queue CSS lost 1,026 lines and Queue HTML lost 171 lines relative to baseline; the container gained explicit workflow and request-safety code. Production Queue lazy chunk decreased from 66.16 kB to approximately 58 kB. This is a replacement of the old surface rather than a stack of CSS fixes. Default control/container borders are neutral; logical layout and existing typography remain.

## Existing API contracts reused

| Client | Calls used |
| --- | --- |
| ReservationsApi | Existing scoped list and fresh reservation details; P1 booking/edit contracts unchanged |
| TicketsApi | `checkIn`, `forceCheckIn`, `walkInOptions`, `createWalkIn`, `queue`, `details`, `callNext`, `manualCall`, `recall`, `confirmNoResponse`, `restoreNoShow`, `start`, `cancel` |
| PatientsApi | Existing structured `search`, scoped by `doctorPracticeId`, page 1 / size 20 |
| FollowUpsApi | Existing Reception eligibility read; patient/practice identity, `canBook`, eligibility ID and row version retained |
| ReceptionPracticeContext | Existing global clinic selection, delegated permission checks and refresh after current-scope 403 |

Server-provided ordering, patient-ahead counts, prices, valid visit combinations, follow-up eligibility and row versions remain authoritative. Ticket actions submit the existing row version/reason payloads. Payment requests use the unchanged exact-payment contract and existing idempotency keys. Identical failed submissions retain their intent key; successful or incompatible/scope-changed workflows clear local intent/context. No partial/split payment, refund mutation, invented eligibility, automatic force, ETA, polling or push infrastructure was added.

## Permissions and discoverability

| Capability | Existing rule retained |
| --- | --- |
| Reception Queue | Matching shared practice and delegated `PracticeTickets.View` |
| Arrival | Active reservation, defined price, current practice, RecordPayment and normal CheckIn or ForceCheckIn |
| Walk-in | Matching practice, CreateWalkIn and RecordPayment; options are independent of scoped Queue View |
| Patient search | Walk-in authority plus existing account and delegated Patients.SearchBasic checks |
| No SearchBasic | Closed advanced **Patient record number** fallback; no search request is sent |
| Calling / manual / cancel / restore | Existing Call, ManualCall, Cancel and RestoreNoShow checks, status guards, busy guards and current scope |
| Recall / restore | Recall requires the known NoResponse outcome; refunded no-shows cannot be restored |
| Doctor | Existing local practice selector and Doctor Queue behavior retained. Start and Encounter links retain their existing clinical permission gates. |
| Refund link | Existing Finance View/Refund gates and returned payment/refund capability; Queue performs no refund request |

The P0 Queue navigation rule remains **View-only**. CreateWalkIn + RecordPayment without Queue View does not gain a new navigation entry or route grant. The component can load creation options without scoped View when mounted under existing route authorization, but create-only discoverability remains limited by the existing navigation/route contract. This is deliberately documented rather than changing authorization in P2. Backend authorization remains authoritative.

## Context and concurrency safety

Queue reads/details, patient searches, walk-in options and eligibility reads capture the clinic generation and their own read sequence. A later request in the same clinic wins over an older success/error. Global clinic or relevant delegated-permission changes invalidate drawers, choices, searches, Done and pending reads. A → B → A is treated as a new generation, not the original request context.

Queue mutations capture clinic/generation. Late success, error, 403 and conflict cannot replace the current clinic's data, publish old Done, refresh its access or display an old failure. The latest selected clinic is loaded after a pending mutation settles. Current-scope 403 refreshes delegated access, removes unsafe state and uses a retry/error state if View remains available, rather than presenting a false empty Queue.

Arrival captures its submitted payment method and patient name because the ticket response does not carry the payment method. Clinic changes while Check-in is busy invalidate its outcome immediately and defer loading the new clinic until the mutation settles. Same-clinic arrival permission removal clears unsafe context. Closing or starting an incompatible operation clears Done. A current 409 refreshes the reservation in place, preserving the mounted form/draft while it remains eligible; if it is no longer eligible, arrival closes back to details.

Tests cover scoped success and 403/409/500 failures, A → B → A, same-clinic read ordering, permission removal, busy/duplicate prevention, retry intent retention, exact/free payment, all three methods, follow-up ID/version, fallback permissions and contextual action reasons. Browser delayed-response cases cover pending details (200/403/409), an old Queue error, an open walk-in drawer and a pending scheduled Check-in during clinic changes.

## Responsive and accessibility evidence

Synthetic browser fixtures intercept API traffic; no live patient records or mutations are used. Eight widths are exercised in each language: **320, 390, 576, 768, 820, 1024, 1280 and 1440 px**. The assertions check page overflow, drawer bounds, appointment-row clipping, visible mobile labels/phone data and the single selected Reception clinic. P1 Patients/booking/registration and Reservations search/error/empty/details journeys run alongside P2.

P2 browser journeys submit scheduled, zero-price and exceptional arrival; inspect Done and follow Open Queue; search empty/error/by phone for walk-in; preserve a failed draft and retry its identical intent; submit a free walk-in; call next, confirm no response, recall, reach no-show, restore, manually call with reason, cancel with reason and inspect the separate Finance link. Queue no-clinic/no-View/loading/failure/empty states are captured. Delayed request scenarios assert old details, failures and arrival outcomes do not appear after context changes.

Controls use semantic buttons, implicit/explicit labels, pressed-state payment choices, disabled/busy states, native disclosures, LTR/bidi handling for numeric data and visible focus rings. Forms prevent accidental nested submission. The shared modal supplies focus trapping/restoration and Escape behavior; browser journeys use Enter for patient search and Escape/Done for arrival closing. Done uses a status region and search results use a polite live region. No screen-reader certification is claimed.

Screenshots at **390, 820 and 1440 px in AR and EN** are in `.tmp/reception-responsive/p2-*.png`; representative arrival, payment, Done, action and state images were visually inspected. The maintained harness reproduces them. Request and case evidence is in `.tmp/reception-responsive/{requests,results}.json`; Doctor Queue evidence is in `.tmp/p2-doctor-queue/`. Logs are under `.tmp/p2-final-*.log`.

## Verification

| Check | Result |
| --- | --- |
| Production build | Pass, with budget warnings described below |
| Full Angular suite | 120 files / 759 tests passed |
| Changed components/store | 5 files / 91 tests passed; four additional Doctor Start/Encounter permission tests passed in the final full suite |
| Affected feature/API subset | 17 files / 187 tests passed |
| Reception/P1/P2 browser matrix | 160 cases passed: 96 page/viewport cases and 64 P1/P2 journey cases |
| Doctor Queue | 16 empty-state viewport cases / 0 failing scenarios; Start and Encounter positive/negative behavior covered by the final unit suite |
| i18n / architecture | No new P2 findings; baseline failures remain |
| `git diff --check` | Pass |
| Targeted Impeccable detector | Six advisory findings, no non-advisory findings |

The detector's remaining advisories concern 1.125rem typography, token fallbacks and isolated-template color inference without the application styles. They are not runtime failures. Existing shared typography/tokens are retained instead of broadening P2 into a design-system rewrite.

## Baseline warnings and limits

- Baseline full suite: 119 files / 714 tests. The final suite adds one complete component and meaningful P2 coverage.
- The initial bundle already exceeded its 1 MB warning budget by 8.48 kB. Final excess is approximately 18.3 kB; centralized bilingual P2 copy contributes to the increase. The build succeeds, but this existing budget warning is larger, not resolved.
- PublicDoctors CSS remains 37.02 kB against its 35 kB warning budget, unchanged by P2.
- The eight existing i18n findings remain in DoctorPractices, PublicDoctors, the old Reception patient-picker and Family Requests. No changed P2 UI is named by the check.
- Architecture failures remain the existing Admin private Reservations route import, PublicDoctors private domain import/template typing bypass and existing `!important` rules in Admin/healthcare/global styles. P2 adds none of these patterns.
- Verification establishes frontend behavior against current typed clients and synthetic API responses. It does not establish live-backend deployment compatibility. The checked-in Swagger snapshot does not document every existing walk-in/follow-up client contract; those clients/models were preserved rather than inventing or altering backend capabilities.
- Backend arrival timing, valid prices/combinations, concurrency and authorization remain authoritative. Done's patients-ahead value is a returned snapshot, not a live estimate.

## Excluded phases

P3 Finance/refund redesign or mutation, P4 clinical workflow/business changes and P9 PatientTickets UI were not implemented. Doctor Start/Encounter links and the existing Finance destination remain compatible. Shared shell/navigation/footer and P0 permission matrices were not redesigned. The installed Impeccable version was retained as requested.
