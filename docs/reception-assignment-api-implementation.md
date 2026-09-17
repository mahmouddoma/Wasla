# Reception assignment API integration

The assignment editor now loads GET /api/v1/doctors/me/receptions/assignable-permissions as its sole permission catalog. Localized nameAr/nameEn and grouping replace raw-code labels. Historical assignment grants never expand the catalog, legacy PracticeReservations.Manage is excluded, and create/update send only selected catalog IDs plus required practice/version fields. No admin permission catalog or hardcoded GUIDs are used.

Active reception assignments and current permissionCodes come from GET /api/v1/reception/practices. The public domain at src/app/domains/reception-practices owns the API/context, reused by patient operations and the independent reservations feature. Application composition clears context on logout/account changes. Reservations check granular View/Create/Cancel/Reschedule/RestoreNoShow grants per selected practice and refresh after fresh 403 responses. Scope changes discard stale responses.

Local tests/build/bilingual checks pass. The supplied backend returns 404 for assignable-permissions; live integration awaits the updated deployment. See phase10-implementation.md and jira-implementation-audit.md for full verification evidence and projection limitations.
