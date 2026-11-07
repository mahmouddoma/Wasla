# Reservation integration — Jira review, 7 November 2026

Scope: reservation API integration and the patient/reception/doctor/admin workflows in the existing Angular application. The linked board searches issue text; it also includes unrelated features that mention reservations. Jira statuses are not proof of frontend delivery.

## Sources read

- [WAS-571 — reservation journey](https://loaisabir.atlassian.net/browse/WAS-571)
- [WAS-572 — reception admission journey](https://loaisabir.atlassian.net/browse/WAS-572)
- WAS-135 through WAS-167: metadata, booking, operational lists/details, cancellation, rescheduling, suspension impact, and paid admission contracts.
- [WAS-728](https://loaisabir.atlassian.net/browse/WAS-728) through [WAS-735](https://loaisabir.atlassian.net/browse/WAS-735): practice-specific commercial coverage and original reservation continuity.
- Backend `ReservationManagement.cs` and `ReservationCapabilities.cs` on the linked backend repository's main branch, checked against the Angular adapter. The local Swagger does not describe the rich reservation response schemas.

## Existing integration map

| Jira | Backend operation | Angular owner |
| --- | --- | --- |
| WAS-135, 136 | Metadata, authorized bookable patients | `domains/reservations/ReservationsApi` |
| WAS-137–143 | Patient create/list/detail/cancel/reschedule | `ReservationsApi`, reservation workspace, public doctor booking drawer |
| WAS-144–147 | Reception dates/slots/options/create | `ReservationsApi`, route-scoped `ReservationWorkspaceStore` |
| WAS-148–155 | Reception list/filter/detail/cancel/reschedule/restore | Reservation workspace |
| WAS-156–162 | Doctor list/filter/detail/cancel/reschedule | Reservation workspace; no Doctor create endpoint |
| WAS-163, 164 | Administrative list/detail | Read-only reservation workspace |
| WAS-166, 167 | Paid check-in and force check-in | Reservation workspace, `domains/tickets/TicketsApi` |

The shared domain adapter serves all actors; it does not import private feature implementations. Rescheduling uses reservation-aware availability, not public discovery. Mutations retain opaque row versions and idempotency keys.

## Changes delivered

- Read detail and mutation price/category/visit type from the server's immutable `snapshot`. Retain support for flat list rows and existing normalized responses. Zero prices remain valid.
- Read `appointment.localTime`, `startUtc`, and `graceEndsAtUtc`; do not calculate lateness or grace locally.
- Map `cancellationAllowedUntilUtc` and `patientReschedulesRemaining` to the existing UI model, preserving zero remaining changes.
- Map segment filter metadata `code` to the existing UI ID without loading a public catalog.
- Require explicit `canViewLinkedTicket`; a linked ticket ID does not grant access.
- Preserve a booking intent's idempotency key after an uncertain network outcome. A changed payload creates a new intent. Prevent concurrent confirmation submissions.
- Refresh slot choices after a booking conflict without automatically replaying the mutation.
- On patient online-booking commercial rejection, remove stale booking choices, preserve patient selection/note, and show a bilingual practice-availability message. Do not tell patients to purchase a subscription.
- Distinguish commercial rejection from revoked Reception assignment. Refresh the original reservation after paid-admission rejection, close rejected admission, and preserve authorized history. Never record a successful ticket/payment locally on rejection.
- Close stale mutation editors after commercial denial and refresh existing reservation capabilities.

## Validation and limits

Targeted tests cover the actual nested backend response, all existing actor endpoint paths, optimistic conflicts, follow-up booking, admission, commercial denial, network retries, duplicate clicks, and patient-facing errors. Run:

```text
npx ng test --watch=false --include="src/app/domains/reservations/**/*.spec.ts" --include="src/app/features/reservations/**/*.spec.ts" --include="src/app/features/public-doctors/**/*.spec.ts" --include="src/app/domains/subscriptions/subscription-error.interceptor.spec.ts"
npm run build
npm run check:architecture
npm run check:i18n
```

Production acceptance remains unverified: authenticated multi-actor journeys, original Full Platform versus Booking Only commitments after transfer/expiry, and revoked assignments require a running backend and suitable accounts/data. No Jira issue was transitioned or commented on.

The checked backend `ReservationCapabilitiesResponse` exposes cancel/reschedule/restore decisions, not check-in commercial provenance. Angular therefore must not invent a `canCheckIn` wire field or infer admission rights from a Doctor-wide plan. Backend admission remains authoritative; the rejection path refreshes the original resource. Full proactive practice-contract UX in WAS-728–735 depends on the separate v1.2 multi-contract/allocation implementation; this change does not claim that migration is delivered.

The global architecture checker currently reports existing `any` and CSS `!important` violations outside these changes. The global i18n checker also reports existing untranslated UI elsewhere. Build size warnings in the application shell, finance and queue styles remain outside this integration.
