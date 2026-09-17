# Phase 10 frontend implementation

## FE API 10.01–10.31 recheck — 2026-09-17

All 31 requested endpoint integrations are present: 30 reservation endpoints in `src/app/domains/reservations/reservations-api.ts`, plus suspension impact in `src/app/features/admin/services/admin-doctors/admin-doctors-api.ts`. The four reservation routes consume these through the feature store; doctor suspension consumes impact before confirmation.

This recheck fixed two gaps: failure to load Create-authorized booking subjects no longer prevents loading View-authorized patient reservations, and booking options retain only `NewConsultation`. Patient Create remains unavailable without API-provided booking subjects. Regression tests cover both behaviors.

Validation after these changes: production build passed, architecture/bilingual checks passed, and 64 relevant tests across 7 files passed. The unchanged initial bundle warning is 802.93 kB against 600 kB. Before these changes, the full suite passed 409 tests across 84 files.

Fresh read-only checks against `http://192.168.1.6:8085`: Swagger returned 200 but contained no reservation or suspension-impact paths; metadata, bookable-patients and mine returned 404. These anonymous checks do not establish authenticated acceptance. End-to-end validation and confirmation of rich response schemas remain pending a Phase 10 backend deployment. No live mutations or Jira updates were performed in this recheck.

Implemented all 49 gaps recorded in the Jira audit. Changes remain uncommitted in the existing local working tree.

## Reservations

Routes: /patient/reservations, /reception/reservations, /doctor/reservations and /admin/reservations. Authenticated booking deep links survive sign-in through a restricted local return URL. Workspace/admin navigation exposes reservations according to actor and effective permissions.

The reservations domain owns typed endpoint contracts. Route-scoped state orchestrates server-backed filters, pagination, metadata, booking subjects, availability and mutations. Details and editor components render inputs and emit events. Existing reception practice APIs/context moved to a shared domain public API so independent features do not import each other's internals.

Patient creation uses bookable subjects, independently of reservation viewing. View filters use patient identities observed in authorized list responses, rather than inferring View authority from Create authority. Reception bookings use internal availability and selected practice grants, with existing patient search/registration workflows. Doctors have operational cancellation/rescheduling only. Administration is explicitly permission-gated and read-only; booking notes and clinical records are not displayed.

Creation sends patient/practice/date/time/segment/visit IDs and an optional note, with no authoritative price, duration or booking-source values. Cancellation uses server reason metadata and required comments. Provider rescheduling requires patient consent and a reason. Restore no-show is reception-only and capability-gated. Every mutation uses an idempotency key and the latest rowVersion. Identical failed intents reuse their key; a changed payload/version obtains a new key. Concurrent-change responses refresh reservation/availability projections. Fresh reception 403 responses clear protected state and refresh practice grants. Stale list, detail, availability and patient-search responses are discarded.

## Existing feature updates

Safe assignable-permission catalog replaces historical assignment inference; legacy Manage grants are excluded. Configuration includes noShowAfterPassedPatientsCount. Public practice projections support onlineBookingEnabled and bookingDisabledReason. Booking previews link into the patient booking flow and exclude FollowUp creation options. Structured schedule/deactivation conflicts show affected reservations with operational inspection links. Doctor suspension loads the impact projection before confirmation and displays cancelledReservationCount from the result.

Duplicate obsolete onboarding test removed only after confirming it was identical to the migrated page test.

## Verification and limits

379 tests across 84 files pass. Build, architecture and bilingual checks pass. Dictionary: 1744 keys. Sixteen synthetic browser combinations verify server-list rendering, direction, drawers, action availability, validation, administrative privacy and horizontal overflow. Native dialogs provide modal focus behavior; operation headings label drawers and pending requests disable editable fields. Reviewer: ship; all three material fixes resolved. Detector's six image warnings are existing Angular dynamic-src false positives, not empty image URLs.

The supplied backend http://192.168.1.6:8085 exposes an older 94-path Swagger and returns 404 for five Phase 10 read-only probes. No authenticated live booking or other live mutations were performed. Jira specifies request and endpoint semantics but not a complete rich-response schema: reservation/impact projection fields must be checked against the deployed Phase 10 contract before production acceptance. The frontend does not implement server capacity, late calculations, family authority, cutoff rules, outbox delivery or suspension-side cancellation. No backend repository/deployment configuration is available here.

Existing initial bundle warning: 802.93 kB against a 600 kB warning budget. No deployment or push was performed.

Reception can create for a known patient ID with its Create grant independently of Search/View grants. Patient existence and booking authority remain server-validated. Random intent keys work on HTTP intranet origins through getRandomValues. Login regression checks preserve local booking return URLs and reject external destinations. The onboarding test explicitly selects Arabic rather than relying on another test's stored language.

Phase 10 Jira synchronization is blocked by connector HTTP 504. Original audit links/comments remain confirmed; the new WAS-135 transition outcome is unconfirmed. Pending per-issue updates are preserved in jira-phase10-sync-results.json.
