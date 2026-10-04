# Reception authorization and Walk-In integration

Branch: `fix/reception-scoped-authorization`

## Root causes addressed

- Reception Walk-In no longer loads Doctor segment, visit-type, or pricing catalogs.
- Queue view and actions use individual current backend permissions rather than legacy queue management permissions.
- Reception financial transactions are requested only for assignments with `PracticePayments.View`. Detail inspection and mutation handlers are guarded too.
- Correction and refund controls distinguish assignment permissions from backend business eligibility.
- Reservation initialization suppresses its practice-selection effect while initializing. Concurrent selections of the same practice share their pending selection; explicit list refresh remains available.
- The portal initializes the cached Reception context. Navigation and workspace module links respect assignment permissions; patient search/registration continue using account permissions.
- Practice changes clear catalog, payment amount, patient ID, queue/details and finance details. Late queue, catalog and transaction responses cannot populate another practice.
- Unexpected Reception 403 responses refresh the assignment context and show a bilingual access message, without treating the error as an ordinary empty result or continuously retrying it.

## Permission mappings

| Operation | Reception assignment permission |
| --- | --- |
| Queue / ticket details | `PracticeTickets.View` |
| Call next, recall, confirm no response | `PracticeTickets.Call` |
| Manual call | `PracticeTickets.ManualCall` |
| Restore NoShow ticket | `PracticeTickets.RestoreNoShow` |
| Cancel ticket | `PracticeTickets.Cancel` |
| Walk-In | `PracticeTickets.CreateWalkIn` + `PracticeTickets.RecordPayment` |
| Check-In | `PracticeTickets.CheckIn` + `PracticeTickets.RecordPayment` |
| Force Check-In | `PracticeTickets.ForceCheckIn` + `PracticeTickets.RecordPayment` |
| Finance list/details/receipts | `PracticePayments.View` |
| Payment/refund correction | `PracticePayments.Correct`; payment must also be unrefunded |
| Refund | `PracticePayments.Refund` + backend `canRefund`; finance workspace also requires View |
| Reservation filter options/list | `PracticeReservations.View` |
| Reservation mutations | `PracticeReservations.Create`, `.Cancel`, `.Reschedule`, `.RestoreNoShow`, as appropriate |

Start and Complete remain Doctor-only. No Doctor permissions are granted to Reception. Patient search uses account-level `Patients.SearchBasic`; registration uses `Patients.Register`.

## Doctor API removal and Walk-In contract

Removed Reception requests to:

- `/api/v1/doctors/me/practices/{id}/segments`
- `/api/v1/doctors/me/practices/{id}/visit-types`
- `/api/v1/doctors/me/practices/{id}/prices`

`DoctorPracticesApi.list()` remains behind the Doctor actor branch for Doctor practice selection.

`TicketsApi.walkInOptions()` now calls `GET /api/v1/reception/practices/{id}/walk-in/options`. Typed `WalkInOptions`, `WalkInSegmentOption`, and `WalkInVisitTypeOption` represent the supplied proposed backend contract. Visit types come directly from the selected segment, and the readonly payment amount and submission amount use its server price. Changing segment clears the visit type and amount. No date, time, reservation slot or client catalog join is involved.

Existing Walk-In and Check-In payment payloads, Cash/Card/Wallet methods, force reason, and idempotency headers remain intact. Financial eligibility is still determined by the backend.

**BLOCKED: Walk-In catalog requires the backend walk-in/options endpoint.** No backend checkout was available in this workspace; the GitHub reference could not be fetched. Backend implementation and deployed endpoint availability have not been verified. The frontend integration is ready for that contract, with no Doctor or reservation-booking fallback.

The backend must authorize `PracticeTickets.CreateWalkIn` against an active assignment and enforce the active user/reception/approved doctor/practice requirements, first-login restriction, `AllowWalkIn`, and valid active NewConsultation combinations with a price. No backend changes were made.

## Files changed by this task

All paths are relative to `src/app/` unless specified:

- `core/auth/permissions.ts`
- `core/i18n/translations.ts` — bilingual access messages and touched UI strings
- `domains/reception-practices/reception-practice-context.ts` and `.spec.ts`
- `domains/tickets/ticket.models.ts`, `tickets-api.ts`, `tickets-api.spec.ts`
- `features/tickets/pages/queue-workspace/queue-workspace.ts`, `.html`, `.spec.ts`
- `features/finance/pages/finance-workspace/finance-workspace.ts`, `.html`, `.spec.ts`
- `features/reservations/state/reservation-workspace.store.ts` and `.spec.ts`
- `features/workspace/pages/workspace/workspace.ts`
- `shared/components/portal-layout/portal-layout.ts` and `.spec.ts`
- `docs/reception-authorization-fix.md`

Pre-existing and concurrent edits to routes, lockfile, global styles, administration screens, reservation presentation, and queue presentation were preserved. The broad queue visual rewrite and stylesheet changes were not authored by this authorization task.

## Focused tests and commands

Six targeted spec files cover queue View/no-View requests, absence of Doctor catalog requests, the dedicated Walk-In HTTP route, exact queue action permissions, server price/reset behavior, practice-switch authority, finance View/no-View requests, correction/refund permissions plus server eligibility, context caching/active assignments, navigation visibility, and reservation request coalescing.

Commands executed:

```powershell
npm run build
npm run build -- --configuration development
npm test -- --watch=false --include='src/app/domains/tickets/tickets-api.spec.ts' --include='src/app/domains/reception-practices/reception-practice-context.spec.ts' --include='src/app/features/tickets/pages/queue-workspace/queue-workspace.spec.ts' --include='src/app/features/finance/pages/finance-workspace/finance-workspace.spec.ts' --include='src/app/features/reservations/state/reservation-workspace.store.spec.ts' --include='src/app/shared/components/portal-layout/portal-layout.spec.ts'
npm run check:architecture
npm run check:i18n
```

Final validation: development build passed; all 56 focused tests passed across the six spec files. Whitespace checks passed for the task's source files.

Production bundle generation hit existing stylesheet budgets: Doctor Reception approximately 30.13 kB and Finance approximately 30.64 kB, both above the 30 kB limit. Initial bundle size also produced a warning. Budgets were not raised.

Architecture checks flag the existing placement of PortalLayout in Shared despite its Reception context dependency (and now the corresponding test dependency), plus existing `!important` rules in styles. The i18n check flags remaining hardcoded text in untouched patient-picker/reception-patients/workspace templates. Undefined Finance reset-filter keys and touched hardcoded finance/queue strings were corrected.

## Live Network verification still required

Not performed: no real Reception credentials or browser session were supplied. Therefore no remaining live 403 endpoint can be confirmed.

With a Reception account whose first-login step is complete, inspect `/api/v1/reception/practices` and its actual `permissionCodes`:

1. With `PracticeTickets.View`, Queue sends `/api/v1/practices/{id}/queue`; without View it sends no queue request.
2. With both Walk-In permissions, it sends `/api/v1/reception/practices/{id}/walk-in/options`. The three Doctor catalog endpoints above must be absent.
3. Finance sends `/api/v1/practices/{id}/financial-transactions` only with `PracticePayments.View`.
4. Reservations sends `/api/v1/reception/practices/{id}/reservations/filter-options` once per overlapping selection/load, only with `PracticeReservations.View`.
5. Switch between assignments with different grants and verify actions disappear immediately, including correction/refund and Walk-In.
6. If an old assignment lacks Finance grants, Doctor/Admin must update the assignment. The frontend does not bypass delegation.

Any 403 from the endpoints above must be investigated against the exact listed assignment permission and backend active-account/assignment requirements. Successful live Walk-In acceptance remains pending backend delivery and this verification.
