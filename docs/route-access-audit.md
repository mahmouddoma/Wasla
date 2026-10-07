# Route access audit — 2026-10-07

Reviewed the complete lazy route tree, sidebar/mobile links and landing redirects against the current WAS Jira specifications. Authorization uses `/auth/me.userType` **and** effective permissions, independently of custom role names. Reception operational access uses active practice assignments and their delegated permission codes.

## Corrections

- All administrative routes require the actual `SuperAdmin` account type, including child navigation. Administrative reservation API scope remains `Admin`; authentication scope is `SuperAdmin`.
- Doctor, Patient and Reception feature boundaries reject other account types even when they carry matching permission codes.
- Finance routes now require the relevant view permission. Reception queue, reservations and finance require delegated access in at least one active assigned practice before the screen opens; the screen still enforces the selected practice.
- Authentication and first-login checks run again when navigating within either shell. Session expiry is evaluated at each check, rather than cached in a computed signal that cannot observe time.
- `/admin` resolves to an available destination for limited administrators, including revenue-only accounts. Doctors without onboarding permission receive a reachable workspace instead of a redirect loop.
- Doctor public-profile permissions open the profile route and its menu link. The doctor prescription route now has a corresponding menu link. Onboarding-only doctors cannot enter the operational queue.
- SuperAdmin fallback workspaces no longer display Patient navigation. Removed the unused administrative finance route with an incorrect actor.

## Route policy

Multiple permissions separated by “or” are alternatives for entering a composite screen. Actions and data sections remain subject to their individual API permissions.

| Account type | Routes | Required access |
|---|---|---|
| SuperAdmin | `/admin/doctors`, `/admin/doctors/:doctorId` | `Doctors.ViewAll`, `Doctors.ViewDetails`, respectively |
| SuperAdmin | `/admin/superadmins`, `/admin/superadmins/create`, `/admin/superadmins/:superAdminId` | `SuperAdmins.ViewAll`, `SuperAdmins.Create`, `SuperAdmins.ViewDetails`, respectively |
| SuperAdmin | `/admin/roles`, `/admin/roles/:roleId` | `Roles.View` |
| SuperAdmin | `/admin/medical-specializations`, `/admin/medical-specializations/create`, `/admin/medical-specializations/:id` | `Specializations.View`, `Specializations.Create`, `Specializations.View`, respectively |
| SuperAdmin | Doctor specialization request list/details | `DoctorSpecializationRequests.ViewAll` / `DoctorSpecializationRequests.ViewDetails` |
| SuperAdmin | Family relationship request list/details | `FamilyRelationshipRequests.ViewAll` / `FamilyRelationshipRequests.ViewDetails` |
| SuperAdmin | `/admin/drug-catalog-managers`, `/admin/medical-catalog-managers` | `DrugCatalogManagers.ViewAll` / `MedicalCatalogManagers.ViewAll` |
| SuperAdmin | `/admin/reservations` | `Reservations.ViewAdministrative`; administrative data only |
| SuperAdmin | `/admin/revenue` | `PlatformRevenue.ViewAggregates`; aggregate financial data only |
| Doctor | `/doctor/onboarding` | `DoctorOnboarding.ViewOwn` |
| Doctor | `/doctor/profile` | `DoctorProfile.ViewOwn` or `DoctorProfile.UpdateOwn` or `DoctorSpecializations.ViewOwn` or `DoctorPracticeLocation.ViewOwn` or `DoctorPracticeLocation.ManageOwn` |
| Doctor | `/doctor/practices`, practice details, `/doctor/practices/new` | `DoctorPractices.ViewOwn`; creation uses `DoctorPractices.ManageOwn` |
| Doctor | `/doctor/receptions`, reception details, `/doctor/receptions/new` | `ReceptionUsers.ViewOwn`; creation uses `ReceptionUsers.ManageOwn` |
| Doctor | `/doctor/reservations` | `DoctorPracticeReservations.ViewOwn` |
| Doctor | `/doctor/queue` | Doctor operational access; onboarding-only permission sets are denied. Jira does not specify a separate Doctor queue-view permission |
| Doctor | `/doctor/finance`, `/doctor/revenue` | `DoctorPracticePayments.ViewOwn` / `DoctorRevenue.ViewOwn` |
| Doctor | `/doctor/encounters` | `MedicalEncounters.ViewOwn` |
| Doctor | `/doctor/prescriptions` | `Prescriptions.ViewOwn` |
| Doctor | `/doctor/medication-requests` | `DrugCatalogRequests.ViewOwn` or `DrugCatalogRequests.CreateOwn` |
| Doctor | `/doctor/catalog-requests/lab`, `/doctor/catalog-requests/radiology` | Corresponding `LabCatalogRequests` / `RadiologyCatalogRequests`: `ViewOwn` or `CreateOwn` |
| Doctor | `/diagnostics/doctor/lab`, `/diagnostics/doctor/radiology` | Corresponding requests `ViewOwn`, results `ViewOwn`, or result submissions `ViewOwn` |
| Reception | `/reception/patients` | `Patients.SearchBasic` or `Patients.Register` |
| Reception | `/reception/family-requests` | `FamilyRelationshipRequests.CreateAssisted` or `ViewAssisted` or `ResubmitAssisted` |
| Reception | `/reception/reservations` | Active practice delegation: `PracticeReservations.View` or `PracticeReservations.Create` |
| Reception | `/reception/queue` | Active practice delegation: `PracticeTickets.View` |
| Reception | `/reception/finance` | Active practice delegation: `PracticePayments.View` |
| Patient | `/patient/profile` | `PatientProfile.ViewOwn` or `UpdateOwn`, or `PatientContacts.ViewOwn` or `ManageOwn` |
| Patient | `/patient/family` | `Families.ViewOwn` or `FamilyRelationshipRequests.Create`, `ViewOwn`, or `ResubmitOwn` |
| Patient | `/patient/reservations` | Patient account; self/dependent scope enforced by the API |
| Patient | `/patient/tickets`, `/patient/finance` | `Tickets.ViewOwn` / `Payments.ViewOwn` |
| Patient | `/patient/encounters`, `/patient/prescriptions`, `/patient/follow-ups` | `MedicalEncounters.ViewOwnCompleted`, `Prescriptions.ViewOwnCompleted`, `FollowUpEligibility.ViewOwn`, respectively |
| Patient | `/diagnostics/patient/lab`, `/diagnostics/patient/radiology` | Corresponding requests `ViewOwnIssued` or results `ViewOwnCurrent` |
| DrugCatalogManager | `/drug-catalog`, `/drug-catalog/imports`, `/drug-catalog-requests` | `DrugCatalog.View`; imports use `Import` or `ImportHistory`; requests use `DrugCatalogRequests.View` |
| MedicalCatalogManager | `/medical-catalog/lab` and `/medical-catalog/radiology`, including `/imports` and `/requests` | Corresponding `LabCatalog` / `RadiologyCatalog`: `View`, `Import` or `ImportHistory`; corresponding catalog requests: `View` |
| All authenticated account types | `/workspace/:area` | Must match the current account's reachable workspace destination |
| Public | Doctor discovery/details, privacy, terms, help, login, registration, password recovery | Discovery/legal pages are public; authenticated users leave anonymous authentication screens for their own destination; first login goes to password change |

## Jira evidence

- [WAS-2](https://loaisabir.atlassian.net/browse/WAS-2): `/auth/me`, effective permission sets, first login and catalog-manager isolation.
- [WAS-9](https://loaisabir.atlassian.net/browse/WAS-9): onboarding-only doctors must not see operational modules.
- [WAS-25](https://loaisabir.atlassian.net/browse/WAS-25), [WAS-26](https://loaisabir.atlassian.net/browse/WAS-26): role management view permissions.
- [WAS-56](https://loaisabir.atlassian.net/browse/WAS-56), [WAS-57](https://loaisabir.atlassian.net/browse/WAS-57): Reception patient creation/search.
- [WAS-82](https://loaisabir.atlassian.net/browse/WAS-82), [WAS-112](https://loaisabir.atlassian.net/browse/WAS-112): Doctor practices and reception management.
- [WAS-120](https://loaisabir.atlassian.net/browse/WAS-120), [WAS-121](https://loaisabir.atlassian.net/browse/WAS-121): Doctor public profile view/update.
- [WAS-138](https://loaisabir.atlassian.net/browse/WAS-138): Patient reservation actor and authorized dependent scope.
- [WAS-147](https://loaisabir.atlassian.net/browse/WAS-147), [WAS-148](https://loaisabir.atlassian.net/browse/WAS-148): delegated Reception reservation creation/view.
- [WAS-163](https://loaisabir.atlassian.net/browse/WAS-163): SuperAdmin administrative reservations.
- [WAS-169](https://loaisabir.atlassian.net/browse/WAS-169): owning Doctor / authorized Reception queue scope.
- [WAS-184](https://loaisabir.atlassian.net/browse/WAS-184), [WAS-188](https://loaisabir.atlassian.net/browse/WAS-188), [WAS-189](https://loaisabir.atlassian.net/browse/WAS-189), [WAS-190](https://loaisabir.atlassian.net/browse/WAS-190), [WAS-193](https://loaisabir.atlassian.net/browse/WAS-193): per-actor finance permissions and aggregate-only SuperAdmin access.

## Verification

- `npm run test -- --watch=false`: **978 tests passed in 130 files**.
- `route-access.spec.ts` contains 26 tests exercising Angular Router with the complete lazy route tree and production guards. It checks all six account types, wrong-account access with matching permissions, empty permissions, each alternative permission, anonymous access, first login, real clock expiry during sibling navigation, delegated Reception access, landing redirects and every visible portal menu link. Screen rendering is excluded from this matrix to isolate authorization; component tests cover screen behavior.
- Chrome on `localhost:4201`: **30 direct-link scenarios passed**, Arabic and English. Tests used an isolated browser context with synthetic users and intercepted all API requests. Forbidden screens did not request their data. Results: [browser evidence](browser-verification/route-access/results.json).
- `npm run build`: passed. Existing initial-bundle and Finance/Public Doctors stylesheet budget warnings remain.
- `npm run check:architecture`: reports existing private domain imports / template typing bypass in Public Doctors and existing `!important` styles in Revenue Dashboard, healthcare workspace and global styles. None are in the authorization changes. They were not refactored as part of this route audit.
- `npm run check:i18n`: separately reports existing hardcoded text in Doctor Practices, Public Doctors, Reception Patient Picker and assisted family requests. No new translation keys or UI strings were introduced by the route changes; the prescription navigation link reuses its existing bilingual translation.

This verifies frontend route authorization against Jira and synthetic permission sets. Server authorization and real account provisioning were not changed or validated with privileged production accounts.
