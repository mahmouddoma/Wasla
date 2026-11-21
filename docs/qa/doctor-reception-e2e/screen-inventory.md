# Wasla Doctor & Reception E2E QA — Complete Screen & Route Inventory

Inspected from `src/app/app.routes.ts`, all 15 feature route configurations (`*.routes.ts`), `PortalNavigation` (`src/app/layout/navigation/portal-navigation.ts`), and `SubscriptionState` (`src/app/domains/subscriptions/subscription-state.ts`).

---

## 1. Doctor Module Screens & Nested Views (27 Discovered Views)

| # | Route Pattern | Component | Required Actor & Permission Guard | Commercial Subscription Entitlement Gate | Nested Tabs / Drawers / Modals Discovered | QA Status |
| ---: | --- | --- | --- | --- | --- | --- |
| D-01 | `/workspace/doctor` | `DoctorDashboardComponent` | `Doctor` (`authenticatedGuard`, `accountActorGuard`) | Gated (`isDoctorSubscriptionGatedRoute = true`) | Clinic filter, Period presets (`today`/`last7`/`month`/`custom`), 5-KPI strip, Metric drilldown `<app-side-drawer>`, Pattern tabs (`weekday`/`hour`), Group tabs | `PASS` |
| D-02 | `/doctor/subscription` | `MySubscriptionComponent` | `Doctor` + `Subscriptions.ViewOwn` | Exempt (always accessible to manage subscriptions) | Free Trial activation banner, Master-detail contract split pane, `<app-plan-selector>`, Confirmation modal (`trial`/`selection`/`change`/`cancel`/`renewal`), Retention staff selector | `FIXED` |
| D-03 | `/doctor/onboarding` | `DoctorOnboarding` | `Doctor` + `doctorOnboardingGuard` | Exempt | Redirects approved Doctors to `/workspace/doctor` (or `/doctor/subscription` if unsubscribed); multi-step onboarding wizard for unapproved Doctors | `FIXED` |
| D-04 | `/doctor/profile` | `DoctorProfile` | `Doctor` + `doctorProfileGuard` | Exempt | 3 section tabs (`Specializations`, `Practice Location`, `Bio & Qualifications`), specialization search & request form | `FIXED` |
| D-05 | `/doctor/practices` | `DoctorPractices` (List) | `Doctor` + `DoctorPractices.ViewOwn` | Exempt from hard route overlay; creation gated by `canCreatePractice()` | Stats deck, clinic cards, Create Clinic `<app-side-drawer>` (`PracticeEditor`) | `PASS` |
| D-06 | `/doctor/practices/new` | `DoctorPractices` (Create Drawer) | `Doctor` + `DoctorPractices.ManageOwn` | Requires available seat (`PRACTICE_MANAGEMENT` Full) | `<app-practice-editor>` inside `<app-side-drawer>` with `<app-location-map-picker>` | `PASS` |
| D-07 | `/doctor/practices/:practiceId` | `DoctorPractices` (Detail) | `Doctor` + `DoctorPractices.ViewOwn` | Allocation card & per-practice coverage | 4 tabs: `overview` (Basic Data + Map), `operations` (`PracticeOperations` + `PracticeAllocationComponent` drawer + `BookingPriceComponent`), `schedule` (`PracticeSchedule`), `segments` (`PracticeSegments`) | `FIXED` |
| D-08 | `/doctor/receptions` | `DoctorReceptions` (List) | `Doctor` + `ReceptionUsers.ViewOwn` | `RECEPTION_MANAGEMENT` | Staff summary deck, staff directory, Create Reception `<app-side-drawer>` | `PASS` |
| D-09 | `/doctor/receptions/new` | `DoctorReceptions` (Create) | `Doctor` + `ReceptionUsers.ManageOwn` | `RECEPTION_MANAGEMENT` (Full) | Create Reception `<app-side-drawer>` form | `PASS` |
| D-10 | `/doctor/receptions/:receptionId` | `DoctorReceptions` (Detail) | `Doctor` + `ReceptionUsers.ViewOwn` | `RECEPTION_MANAGEMENT` | Account state toggle confirmation, Practice assignment selector, 36 assignable permission checkboxes (`Select All` / `Clear All`), active/deactivate assignment | `PASS` |
| D-11 | `/doctor/reservations` | `ReservationWorkspaceComponent` | `Doctor` + `DoctorPracticeReservations.ViewOwn` | `RESERVATION_MANAGEMENT` | Practice selector, Search, Collapsible `details.advanced-filters`, Reservations table/list, `<app-reservation-details>` drawer, Cancel/Reschedule `<app-reservation-editor>` drawer | `FIXED` |
| D-12 | `/doctor/queue` | `QueueWorkspace` | `Doctor` + `hasDoctorOperationalAccess` | `TICKET_QUEUE` | Practice selector, Queue KPIs, Active consultation workstation (`Current Visit` / `Waiting Queue` tabs), Call Next / Recall / No-Response / Start / Complete visit, inline Prescription & Diagnostics drafts, Patient detail drawer, Archive drawer | `FIXED` |
| D-13 | `/doctor/patients` | `DoctorPatientsDirectoryComponent` | `Doctor` + `DoctorPatients.ViewOwn` | `PATIENT_MANAGEMENT` | Search/filter bar, Patient directory table/cards | `PASS` |
| D-14 | `/doctor/patients/:patientId` | `DoctorPatientsDirectoryComponent` (Detail Drawer) | `Doctor` + `DoctorPatients.ViewOwn` | `PATIENT_MANAGEMENT` | `<app-patient-detail-drawer>` with medical overview, timeline, encounters, prescriptions, diagnostics | `PASS` |
| D-15 | `/doctor/encounters` | `EncounterWorkspaceComponent` | `Doctor` + `MedicalEncounters.ViewOwn` | `MEDICAL_ENCOUNTER` | Practice & date filters, Encounter list, Encounter clinical detail & amendment drawer | `PASS` |
| D-16 | `/doctor/prescriptions` | `PrescriptionsComponent` | `Doctor` + `Prescriptions.ViewOwn` | `PRESCRIPTION` | Prescriptions list, detail drawer, PDF print/export | `PASS` |
| D-17 | `/diagnostics/doctor/lab` | `DiagnosticWorkspaceComponent` (`kind: 'lab'`) | `Doctor` + `LabRequests.ViewOwn` / `LabResults.ViewOwn` | `LAB_RADIOLOGY` | Orders/Results/Submissions tabs, detail & review drawers | `PASS` |
| D-18 | `/diagnostics/doctor/radiology` | `DiagnosticWorkspaceComponent` (`kind: 'radiology'`) | `Doctor` + `RadiologyRequests.ViewOwn` / `RadiologyResults.ViewOwn` | `LAB_RADIOLOGY` | Orders/Results/Submissions tabs, detail & review drawers | `PASS` |
| D-19 | `/doctor/catalog-requests/lab` | `CatalogRequestsComponent` (`kind: 'lab'`) | `Doctor` + `LabCatalogRequests.ViewOwn` / `CreateOwn` | Gated | Requests list + New Lab Catalog Request drawer | `PASS` |
| D-20 | `/doctor/catalog-requests/radiology` | `CatalogRequestsComponent` (`kind: 'radiology'`) | `Doctor` + `RadiologyCatalogRequests.ViewOwn` / `CreateOwn` | Gated | Requests list + New Radiology Catalog Request drawer | `PASS` |
| D-21 | `/doctor/medication-requests` | `MedicationRequestsComponent` | `Doctor` + `DrugCatalogRequests.ViewOwn` / `CreateOwn` | Gated | Medication catalog requests list + New Request drawer | `PASS` |
| D-22 | `/doctor/medical-sharing` | `MedicalSharingComponent` | `Doctor` + `HiddenEncounterAccessRequests.ViewIncoming` | `MEDICAL_RECORD_ACCESS` | Incoming hidden encounter access requests inbox, Approve/Reject/Revoke drawer | `PASS` |
| D-23 | `/doctor/finance` | `FinanceWorkspace` (`view: 'transactions'`) | `Doctor` + `DoctorPracticePayments.ViewOwn` | `PAYMENT_COLLECTION` | Quick periods (`Today`/`Month`/`Custom`), Ticket/Tx search, Advanced filters, Transactions ledger, Payment detail slip drawer | `FIXED` |
| D-24 | `/doctor/revenue` | `FinanceWorkspace` (`view: 'revenue'`) | `Doctor` + `DoctorRevenue.ViewOwn` | `DOCTOR_REVENUE_DASHBOARD` | Date range filter, Revenue KPIs, Breakdown tables | `PASS` |
| D-25 | `/doctor/expenses` | `OperatingFinanceComponent` (`view: 'expenses'`) | `Doctor` + `FinancialExpenses.ViewOwn` | `OPERATING_EXPENSES` (Professional/Premium only) | Upgrade Subscription Gate on `STARTER`; Expenses & Recurring Plans tabs when entitled | `FIXED` |
| D-26 | `/doctor/salaries` | `OperatingFinanceComponent` (`view: 'salaries'`) | `Doctor` + `SalaryPlans.ViewOwn` / `SalaryObligations.ViewOwn` | `SALARY_MANAGEMENT` (Professional/Premium only) | Upgrade Subscription Gate on `STARTER`; Salary Plans & Obligations tabs when entitled | `FIXED` |
| D-27 | `/doctor/reports` & `/doctor/reports/:reportCode` & `/doctor/insights` | `DoctorReportsComponent` / `DoctorReportViewerComponent` | `Doctor` + `Reports.Doctor.ViewOwn` / `Insights.Doctor.ViewOwn` | `OPERATIONAL_REPORTS` (Pro/Premium) & `ADVANCED_RULE_BASED_INSIGHTS` (Premium) | Upgrade Subscription Gate on `STARTER`; Reports catalog, viewer, and Insights list when entitled | `FIXED` |

---

## 2. Reception Module Screens & Nested Views (10 Discovered Views)

| # | Route Pattern | Component | Required Actor & Practice Permission Guard | Commercial Subscription Dependency | Nested Tabs / Drawers / Modals Discovered | QA Status |
| ---: | --- | --- | --- | --- | --- | --- |
| R-01 | `/workspace/reception` | `Workspace` (`area: 'reception'`) | `Reception` (`authenticatedGuard`, `accountAreaGuard`) | Practice covered by Doctor's active Full Platform contract | Current Practice Context selector/switcher, Hero Primary Task CTA, Secondary task cards, 3-step guided workflow | `PASS` |
| R-02 | `/reception/patients` | `ReceptionPatients` | `Reception` + (`Patients.SearchBasic` or `Patients.Register`) | `PATIENT_MANAGEMENT` on practice contract | Search form (Name + DOB or Phone >= 7 digits), Results list, Selected Patient Hero with Book Appointment handoff, New Patient Registration `<app-side-drawer>`, In-person Identity Verification drawer | `PASS` |
| R-03 | `/reception/family-requests` | `ReceptionFamilyRequests` | `Reception` + `FamilyRelationshipRequests.*Assisted` | Practice assignment | Assisted family relationship requests list, Create/Resubmit assisted request drawer | `PASS` |
| R-04 | `/reception/reservations` | `ReservationWorkspaceComponent` | `Reception` + `receptionPracticeGuard` (`PracticeReservations.View` or `Create`) | `RESERVATION_MANAGEMENT` on practice contract | Quick views (`Today`/`Upcoming`/`All`/`Archive`), Date stepper, Search, Collapsible `details.advanced-filters`, Appointments table/cards, `<app-reservation-details>` drawer, New Booking (`<app-reservation-patient-search>` + `<app-reservation-editor>`) drawer, Arrival Check-In (`<app-reservation-check-in>`) drawer | `FIXED` |
| R-05 | `/reception/queue` | `QueueWorkspace` | `Reception` + `receptionPracticeGuard` (`PracticeTickets.View`) | `TICKET_QUEUE` & `CHECKIN_WALKIN` on practice contract | Day progress & 4 queue status cards, Waiting/No-Show tabs, Walk-In ticket creation drawer (`<app-walk-in-patient-search>`), Call / Manual Call / No-Response / Recall / Restore / Cancel ticket drawers, Archive drawer | `PASS` |
| R-06 | `/reception/finance` | `FinanceWorkspace` (`view: 'transactions'`) | `Reception` + `receptionPracticeGuard` (`PracticePayments.View`) | `PAYMENT_COLLECTION` on practice contract | Quick periods (`Today`/`Month`/`Custom`), Ticket & Transaction search bar, Advanced filters, Payment ledger rows, Transaction receipt & refund drawer | `FIXED` |
| R-07 | `/reception/worklist` | `ReceptionWorklistComponent` | `Reception` + Practice permission `Dashboards.Reception.ViewAssigned` | Practice assignment + delegated permission | Filter pills (`all`/`waiting`/`attention`), Worklist items table/cards, permission-denied empty state when not delegated | `FIXED` |
| R-08 | `/reception/handovers` | `ReceptionHandoversComponent` | `Reception` + Practice permission `Handovers.ViewAssigned` (+ `CreateAssigned`, `AcknowledgeAssigned`, `CloseAssigned`) | `RECEPTION_HANDOVER` (Professional/Premium only on backend) | Shift handovers list, Create Handover `<app-side-drawer>`, View/Acknowledge/Close Handover `<app-side-drawer>`, permission-denied state when not delegated | `FIXED` |

---

## 3. Shared Authentication & Shell Views Exercised

| # | Route Pattern | Component | Purpose in Doctor/Reception QA | QA Status |
| ---: | --- | --- | --- | --- |
| S-01 | `/login` | `Login` | Role authentication, post-login destination routing (`/workspace/doctor`, `/doctor/subscription`, `/doctor/onboarding`, `/workspace/reception`), AR/EN language toggle | `FIXED` |
| S-02 | `PortalLayout` Shell | `PortalLayout` + `AppHeader` + `MobileNavigation` | Collapsible desktop sidebar, mobile slide-over drawer, mobile bottom 4-tab bar + More button, Reception practice selector in topbar & sidebar, Doctor contextual Subscription Gate | `FIXED` |
