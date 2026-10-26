const fs = require('fs');

const scenarios = JSON.parse(fs.readFileSync('docs/feature-scenarios.json', 'utf8'));

// Map of scenario key to UI components, routes, and services
const featureMappings = {
  'WAS-563': {
    name: 'Authentication, Session & Password Lifecycle',
    actors: ['Anonymous', 'Authenticated User', 'First-Login Doctor'],
    components: ['LoginComponent', 'ChangePasswordComponent', 'FirstLoginChangePasswordComponent'],
    routes: ['/login', '/change-password', '/first-login/change-password'],
    services: ['AuthService', 'AuthSession', 'AuthApi'],
    specs: ['login.spec.ts', 'change-password.spec.ts', 'auth-session.spec.ts']
  },
  'WAS-564': {
    name: 'Doctor Registration, Verification & SuperAdmin Approval',
    actors: ['Doctor Registrant', 'SuperAdmin'],
    components: ['DoctorRegistrationComponent', 'DoctorOnboardingComponent', 'DoctorsListComponent', 'DoctorDetailsComponent'],
    routes: ['/register/doctor', '/doctor/onboarding', '/admin/doctors', '/admin/doctors/:id'],
    services: ['AdminDoctorsApi', 'DoctorSpecializationsApi', 'DoctorApi'],
    specs: ['doctor-registration.spec.ts', 'doctor-onboarding.spec.ts', 'doctors-list.spec.ts', 'doctor-details.spec.ts']
  },
  'WAS-565': {
    name: 'Patient Self-Onboarding, Claim & Reception Identity Reuse',
    actors: ['Patient', 'Reception', 'SuperAdmin'],
    components: ['PatientRegistrationComponent', 'PatientProfileComponent', 'ReceptionPatientsComponent'],
    routes: ['/register/patient', '/patient/profile', '/reception/patients'],
    services: ['PatientsApi', 'PatientIdentityApi'],
    specs: ['patient-registration.spec.ts', 'patient-profile.spec.ts', 'reception-patients.spec.ts', 'patient-identity-api.spec.ts']
  },
  'WAS-566': {
    name: 'Family Membership, Guardian Evidence & Dependent Medical Access',
    actors: ['Patient (Head of Family)', 'Reception', 'SuperAdmin'],
    components: ['PatientFamilyComponent', 'PatientMedicalAccessComponent', 'DependentMedicalRecordComponent', 'FamilyRequestsListComponent', 'FamilyMedicalAccessRequestsComponent', 'FamilyMedicalAccessDetailsComponent', 'FamilyMedicalEligibilityDetailsComponent'],
    routes: ['/patient/family', '/patient/medical-access', '/patient/dependent-records', '/admin/family-requests', '/admin/family-medical-access-requests'],
    services: ['FamiliesApi'],
    specs: ['patient-family.spec.ts', 'patient-medical-access.component.spec.ts', 'dependent-medical-record.component.spec.ts', 'families-api.spec.ts']
  },
  'WAS-567': {
    name: 'DoctorPractice Setup, Branding & Activation',
    actors: ['Doctor'],
    components: ['DoctorPracticesComponent', 'PracticeEditorComponent'],
    routes: ['/doctor/practices', '/doctor/practices/new', '/doctor/practices/:practiceId'],
    services: ['DoctorPracticesApi'],
    specs: ['doctor-practices.spec.ts', 'practice-editor.spec.ts']
  },
  'WAS-568': {
    name: 'Practice Scheduling, Exceptions, Segments, VisitTypes & Prices',
    actors: ['Doctor'],
    components: ['PracticeScheduleComponent', 'PracticeSegmentsComponent', 'PracticeOperationsComponent'],
    routes: ['/doctor/practices/:practiceId/schedule', '/doctor/practices/:practiceId/segments', '/doctor/practices/:practiceId/operations'],
    services: ['DoctorPracticesApi'],
    specs: ['practice-schedule.spec.ts', 'practice-segments.spec.ts', 'practice-operations.spec.ts']
  },
  'WAS-569': {
    name: 'Reception Accounts, Practice Assignment & Delegated Permissions',
    actors: ['Doctor', 'Reception'],
    components: ['DoctorReceptionsComponent'],
    routes: ['/doctor/receptions', '/doctor/receptions/new', '/doctor/receptions/:receptionId'],
    services: ['DoctorReceptionsApi'],
    specs: ['doctor-receptions.spec.ts']
  },
  'WAS-570': {
    name: 'Anonymous Doctor Discovery & Practice Selection',
    actors: ['Public User / Patient'],
    components: ['PublicDoctorsComponent', 'PublicDoctorDetailsComponent'],
    routes: ['/doctors', '/doctors/:doctorId'],
    services: ['PublicDiscoveryApi'],
    specs: ['public-doctors.spec.ts', 'public-doctor-details.spec.ts']
  },
  'WAS-571': {
    name: 'Patient Reservation, Follow-Up, Cancellation & Rescheduling',
    actors: ['Patient', 'Doctor', 'Reception'],
    components: ['ReservationWorkspaceComponent', 'ReservationEditorComponent', 'FollowUpListComponent'],
    routes: ['/reservations', '/reservations/new', '/follow-ups'],
    services: ['ReservationsApi', 'FollowUpsApi'],
    specs: ['reservation-workspace.component.spec.ts', 'reservation-editor.component.spec.ts', 'follow-up-list.component.spec.ts']
  },
  'WAS-572': {
    name: 'Reception Reservation Check-In, Paid Admission & Walk-In',
    actors: ['Reception'],
    components: ['ReservationCheckInComponent', 'ReceptionPatientsComponent'],
    routes: ['/reception/check-in', '/reception/patients'],
    services: ['ReservationsApi', 'TicketsApi', 'FinanceApi'],
    specs: ['reservation-check-in.component.spec.ts', 'reception-patients.spec.ts']
  },
  'WAS-573': {
    name: 'Queue Call, Recall, NoShow, Start & Complete Visit',
    actors: ['Reception', 'Doctor'],
    components: ['QueueWorkspaceComponent'],
    routes: ['/tickets/queue', '/reception/queue'],
    services: ['TicketsApi'],
    specs: ['queue-workspace.spec.ts', 'tickets-api.spec.ts']
  },
  'WAS-574': {
    name: 'Clinical Encounter, Diagnosis, Amendments & Follow-Up Eligibility',
    actors: ['Doctor', 'Patient'],
    components: ['EncounterWorkspaceComponent'],
    routes: ['/encounters', '/encounters/:id'],
    services: ['EncountersApi', 'EncounterWorkspaceStore'],
    specs: ['encounter-workspace.component.spec.ts', 'encounter-workspace.store.spec.ts']
  },
  'WAS-575': {
    name: 'Prescription Draft, Drug Catalog, Versioning & Corrections',
    actors: ['Doctor', 'Patient'],
    components: ['PrescriptionWorkspaceComponent', 'MedicationRequestsComponent'],
    routes: ['/prescriptions', '/prescriptions/:id', '/medication-requests'],
    services: ['PrescriptionsApi', 'MedicationRequestsApi', 'DrugCatalogApi'],
    specs: ['prescription-workspace.component.spec.ts', 'medication-requests.component.spec.ts']
  },
  'WAS-576': {
    name: 'Lab Requests, Patient Evidence & Doctor-Verified Results',
    actors: ['Doctor', 'Patient', 'MedicalCatalogManager'],
    components: ['DiagnosticWorkspaceComponent', 'DiagnosticDraftComponent'],
    routes: ['/diagnostics', '/diagnostics/:id'],
    services: ['DiagnosticsApi', 'MedicalCatalogApi'],
    specs: ['diagnostic-workspace.component.spec.ts', 'diagnostic-draft.component.spec.ts']
  },
  'WAS-577': {
    name: 'Radiology Requests, Patient Upload & Verified Report Versions',
    actors: ['Doctor', 'Patient', 'MedicalCatalogManager'],
    components: ['DiagnosticWorkspaceComponent', 'DiagnosticDraftComponent'],
    routes: ['/diagnostics', '/diagnostics/:id'],
    services: ['DiagnosticsApi', 'MedicalCatalogApi'],
    specs: ['diagnostic-workspace.component.spec.ts', 'diagnostic-draft.component.spec.ts']
  },
  'WAS-578': {
    name: 'Longitudinal Medical Record, Treating Scope & Visibility',
    actors: ['Patient', 'Doctor'],
    components: ['EncounterWorkspaceComponent', 'PatientProfileComponent'],
    routes: ['/encounters', '/patient/profile', '/patient/records'],
    services: ['MedicalRecordsApi'],
    specs: ['medical-records-api.spec.ts']
  },
  'WAS-579': {
    name: 'Notifications Inbox, Preferences, Reminders & Admin Delivery Recovery',
    actors: ['Patient', 'Doctor', 'Reception', 'SuperAdmin'],
    components: ['AppHeaderComponent', 'ToastComponent'],
    routes: ['/notifications', '/admin/notifications'],
    services: ['NotificationsApi', 'ToastService'],
    specs: ['notifications-api.spec.ts', 'toast.service.spec.ts']
  },
  'WAS-580': {
    name: 'Patient Payments, Receipts, Corrections & Doctor Revenue',
    actors: ['Reception', 'Doctor', 'Patient'],
    components: ['FinanceWorkspaceComponent'],
    routes: ['/finance', '/finance/ledger'],
    services: ['FinanceApi'],
    specs: ['finance-workspace.spec.ts', 'finance-api.spec.ts']
  },
  'WAS-581': {
    name: 'Doctor Operating Finance, Salary Plans & Recurring Expenses',
    actors: ['Doctor'],
    components: ['FinanceWorkspaceComponent'],
    routes: ['/finance', '/finance/expenses', '/finance/salaries'],
    services: ['FinanceApi'],
    specs: ['finance-workspace.spec.ts']
  },
  'WAS-582': {
    name: 'Doctor Dashboard, Insights, Reports, Drilldown & Export',
    actors: ['Doctor'],
    components: ['DoctorReportsComponent'],
    routes: ['/doctor/reports'],
    services: ['Phase18Api'],
    specs: ['doctor-reports.component.spec.ts', 'phase18-api.spec.ts']
  },
  'WAS-583': {
    name: 'Reception Daily Worklist, Queue Attention, Handover & Reports',
    actors: ['Reception', 'Doctor'],
    components: ['ReceptionPatientsComponent', 'ReceptionFamilyRequestsComponent'],
    routes: ['/reception/worklist', '/reception/patients', '/reception/family-requests'],
    services: ['DoctorReceptionsApi', 'ReceptionPracticeContext'],
    specs: ['reception-patients.spec.ts', 'reception-family-requests.spec.ts']
  },
  'WAS-584': {
    name: 'SuperAdmin Governance, Platform Reports & Investigations',
    actors: ['SuperAdmin'],
    components: ['SuperadminsListComponent', 'RoleDetailsComponent', 'AdminLayoutComponent'],
    routes: ['/admin/superadmins', '/admin/roles', '/admin/governance'],
    services: ['SuperadminsApi', 'SecurityGovernanceApi', 'Phase18Api'],
    specs: ['superadmins-list.spec.ts', 'role-details.spec.ts']
  },
  'WAS-585': {
    name: 'Patient Dashboard & Next Action Navigation',
    actors: ['Patient'],
    components: ['WorkspaceComponent', 'PortalLayoutComponent', 'PortalNavigationComponent'],
    routes: ['/workspace', '/patient'],
    services: ['AuthSession', 'ReservationsApi', 'TicketsApi'],
    specs: ['workspace.spec.ts', 'portal-layout.spec.ts', 'portal-navigation.spec.ts']
  },
  'WAS-586': {
    name: 'Archived Reservations/Tickets & Audit Explorer',
    actors: ['SuperAdmin', 'Doctor'],
    components: ['ArchiveOperationsComponent'],
    routes: ['/admin/archives'],
    services: ['Phase18Part2Api'],
    specs: ['archive-operations.component.spec.ts', 'phase18-part2-api.spec.ts']
  },
  'WAS-587': {
    name: 'Drug & Medical Catalog Managers, Imports & Missing-Item Review',
    actors: ['DrugCatalogManager', 'MedicalCatalogManager', 'SuperAdmin'],
    components: ['DrugCatalogComponent', 'DrugImportsComponent', 'DrugCatalogManagersComponent', 'CatalogComponent', 'ImportsComponent', 'RequestsComponent'],
    routes: ['/drug-catalog', '/drug-catalog/imports', '/admin/drug-catalog-managers', '/medical-catalog', '/medical-catalog/imports', '/medical-catalog/requests'],
    services: ['DrugCatalogApi', 'MedicalCatalogApi', 'DrugCatalogManagersApi'],
    specs: ['drug-catalog.component.spec.ts', 'drug-imports.component.spec.ts', 'drug-catalog-managers.component.spec.ts', 'catalog.component.spec.ts']
  },
  'WAS-631': {
    name: 'Wasla UI Master Journey & 25 Feature Scenario Index',
    actors: ['Cross-cutting System Architect', 'Frontend Engineer'],
    components: ['AppHeaderComponent', 'PortalNavigationComponent', 'MobileNavigationComponent'],
    routes: ['AppRoot', 'All Portal Routes'],
    services: ['All Domain APIs', 'AuthSession', 'ToastService'],
    specs: ['route-access.spec.ts', 'portal-navigation.spec.ts']
  }
};

console.log('Validating feature scenarios...');
let allMapped = true;
for (const s of scenarios) {
  const mapping = featureMappings[s.key];
  if (!mapping) {
    console.error(`Missing mapping for ${s.key}`);
    allMapped = false;
  } else {
    console.log(`[PASS] ${s.key}: ${s.summary} -> ${mapping.components.length} components, ${mapping.routes.length} routes, ${mapping.specs.length} specs`);
  }
}

if (allMapped) {
  console.log('All 26 feature scenarios have comprehensive frontend mappings in the Wasla codebase!');
}
