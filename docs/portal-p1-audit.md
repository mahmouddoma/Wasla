# P1 Reception patients and appointments audit

Audited against clean `master` at `36efaca` (P0), before implementation.

## Current journey and problems

Patients presents search and registration as Steps 01/02 and competing desktop panels. Search returns useful names, phone/contact-phone indication and DOB, but selection stores only an ID and offers no booking handoff. Registration exposes the new ID and gives optional fields/contact linking the same prominence as required fields. Clinic changes clear results but stale failures and registration completion can reintroduce context.

Reservations opens the shared operational list with all filters at equal weight. Reception rows emphasize reference and clinic, although the clinic is already selected globally. Details emphasize reference/source and repeated metrics. Booking searches name only and falls back to an editable raw patient ID. Initialization handles eligibility+patient and Home date links, but ignores an ordinary patient link. Decorative meshes and animated surfaces compete with working content.

## Confirmed contracts and authority

`PatientsApi.search` supports name, phoneNumber, dateOfBirth, doctorPracticeId and paging. Search items provide bilingual names, DOB, gender, phone and hasContactPhone. Create supports all current registration/contact fields and multipart image upload, returning patientId only. Without a patient phone, contact name/phone remain required. Linked contact ID remains an advanced editable field; no lookup is available.

ReservationQuery and Reception list parameter serialization support fromDate/toDate. Today and Upcoming can therefore use server filtering. Reception booking dates/slots/options accept the selected patient internally. Existing create/cancel/reschedule/restore APIs, row versions, idempotency intent keys, capabilities, follow-up eligibility and check-in APIs remain authoritative.

Account permissions and delegated selected-practice permissions must both govern patient search and booking actions. ReceptionPracticeContext owns clinic selection; route-local store owns appointment state. P0 PortalNavigation, shell selector, mobile navigation, routes and guards remain intact.

## Unsupported functionality

There is no Reception patient-by-ID profile/details/history endpoint. There is no new contact-patient lookup. A handoff carries existing names through router history state, paired with patientId and practiceId; these names are presentation hints only. An external patientId-only link uses a translated selected-patient description with its ID hidden, and server availability/booking still validates it. No medical history, dashboard, automatic booking, or automatic check-in will be invented.

## Proposed journey and hierarchy

Search-first single working surface; secondary Add new patient opens existing SideDrawer. Register-only accounts see registration directly. Required name/DOB/gender/phone precede Additional details. Required contact fields remain visible when no phone is supplied; optional contact details use disclosure. Search results form one directory; selection shows a named context with Book appointment where allowed. Successful registration uses the submitted name and exposes the same explicit booking action.

Reception appointments defaults Today; Today/Upcoming/All and search precede More filters. Rows prioritize patient, appointment time, visit/price, status and Open. Details preserve actions/capabilities, moving reference, source, timestamps and timeline into Additional details. Booking uses a Reservations-local presentation component for name/phone/DOB search, with orchestration in the store. The editor proceeds patient → date → time → visit/price → optional note → action-specific submit. Other actors retain their existing controls/defaults. Clinic changes invalidate selections, searches, lists and drawers, including in-flight responses/errors.

## Expected files

- `src/app/features/reception/reception-patients/reception-patients.{ts,html,css,spec.ts}`
- `src/app/features/reservations/pages/reservation-workspace/reservation-workspace.component.{ts,html,css,spec.ts}`
- `src/app/features/reservations/components/reservation-editor/reservation-editor.component.{ts,html,css,spec.ts}`
- `src/app/features/reservations/components/reservation-details/reservation-details.component.{ts,html,css,spec.ts}`
- New `src/app/features/reservations/components/reservation-patient-search/reservation-patient-search.component.{ts,html,css,spec.ts}`
- `src/app/features/reservations/state/reservation-workspace.store.{ts,spec.ts}`
- `src/app/core/i18n/translations.ts`
- `scripts/browser-reception-responsive.cjs`
- `docs/portal-p1-audit.md`, `docs/portal-p1-report.md`

No domain API changes or global patient state are planned. Styling will replace affected rules rather than add specificity overrides; Reception-only surface variants preserve other actors.

## Exclusions and baseline

P2 queue/check-in/payment/force-check-in redesign, finance, encounters, prescriptions, family requests, Doctor/Patient/Admin redesign, auth/guards and P0 navigation changes are excluded. Existing check-in component and store behavior remain intact.

Fresh baseline logs: `.tmp/p1-baseline-i18n.log` (11 hardcoded findings, three in planned files) and `.tmp/p1-baseline-architecture.log` (pre-existing imports/type bypass/important findings outside P1). Planned files' violations will be fixed; unrelated findings will be reported. Validation will include production build, affected/full unit tests, both checks, diff checks and synthetic bilingual browser journeys at 320/390/576/768/820/1024/1280/1440, with screenshots inspected at 390/820/1440.
