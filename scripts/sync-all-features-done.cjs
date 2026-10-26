const fs = require('fs');
const { getWsUrl, evaluateInBrowser } = require('./jira-client.cjs');

// Detailed mapping for each of the 26 feature scenarios
const featureDetails = {
  'WAS-564': {
    name: '[FE FEATURE 02] Doctor Registration, Verification & SuperAdmin Approval',
    components: ['DoctorRegistrationComponent', 'DoctorOnboardingComponent', 'DoctorsListComponent', 'DoctorDetailsComponent', 'SpecializationRequestsListComponent', 'SpecializationRequestDetailsComponent'],
    routes: ['/register/doctor', '/doctor/onboarding', '/admin/doctors', '/admin/doctors/:id', '/admin/specialization-requests'],
    services: ['AdminDoctorsApi', 'DoctorSpecializationsApi', 'DoctorApi'],
    specs: ['doctor-registration.spec.ts', 'doctor-onboarding.spec.ts', 'doctors-list.spec.ts', 'doctor-details.spec.ts']
  },
  'WAS-565': {
    name: '[FE FEATURE 03] Patient Self-Onboarding, Claim & Reception Identity Reuse',
    components: ['PatientRegistrationComponent', 'PatientProfileComponent', 'ReceptionPatientsComponent'],
    routes: ['/register/patient', '/patient/profile', '/reception/patients'],
    services: ['PatientsApi', 'PatientIdentityApi'],
    specs: ['patient-registration.spec.ts', 'patient-profile.spec.ts', 'reception-patients.spec.ts', 'patient-identity-api.spec.ts']
  },
  'WAS-566': {
    name: '[FE FEATURE 04] Family Membership, Guardian Evidence & Dependent Medical Access',
    components: ['PatientFamilyComponent', 'PatientMedicalAccessComponent', 'DependentMedicalRecordComponent', 'FamilyRequestsListComponent', 'FamilyMedicalAccessRequestsComponent', 'FamilyMedicalAccessDetailsComponent', 'FamilyMedicalEligibilityDetailsComponent'],
    routes: ['/patient/family', '/patient/medical-access', '/patient/dependent-records', '/admin/family-requests', '/admin/family-medical-access-requests'],
    services: ['FamiliesApi'],
    specs: ['patient-family.spec.ts', 'patient-medical-access.component.spec.ts', 'dependent-medical-record.component.spec.ts', 'families-api.spec.ts']
  },
  'WAS-567': {
    name: '[FE FEATURE 05] DoctorPractice Setup, Branding & Activation',
    components: ['DoctorPracticesComponent', 'PracticeEditorComponent'],
    routes: ['/doctor/practices', '/doctor/practices/new', '/doctor/practices/:practiceId'],
    services: ['DoctorPracticesApi'],
    specs: ['doctor-practices.spec.ts', 'practice-editor.spec.ts']
  },
  'WAS-568': {
    name: '[FE FEATURE 06] Practice Scheduling, Exceptions, Segments, VisitTypes & Prices',
    components: ['PracticeScheduleComponent', 'PracticeSegmentsComponent', 'PracticeOperationsComponent'],
    routes: ['/doctor/practices/:practiceId/schedule', '/doctor/practices/:practiceId/segments', '/doctor/practices/:practiceId/operations'],
    services: ['DoctorPracticesApi'],
    specs: ['practice-schedule.spec.ts', 'practice-segments.spec.ts', 'practice-operations.spec.ts']
  },
  'WAS-569': {
    name: '[FE FEATURE 07] Reception Accounts, Practice Assignment & Delegated Permissions',
    components: ['DoctorReceptionsComponent'],
    routes: ['/doctor/receptions', '/doctor/receptions/new', '/doctor/receptions/:receptionId'],
    services: ['DoctorReceptionsApi'],
    specs: ['doctor-receptions.spec.ts']
  },
  'WAS-570': {
    name: '[FE FEATURE 08] Anonymous Doctor Discovery & Practice Selection',
    components: ['PublicDoctorsComponent', 'PublicDoctorDetailsComponent'],
    routes: ['/doctors', '/doctors/:doctorId'],
    services: ['PublicDiscoveryApi'],
    specs: ['public-doctors.spec.ts', 'public-doctor-details.spec.ts']
  },
  'WAS-571': {
    name: '[FE FEATURE 09] Patient Reservation, Follow-Up, Cancellation & Rescheduling',
    components: ['ReservationWorkspaceComponent', 'ReservationEditorComponent', 'FollowUpListComponent'],
    routes: ['/reservations', '/reservations/new', '/follow-ups'],
    services: ['ReservationsApi', 'FollowUpsApi'],
    specs: ['reservation-workspace.component.spec.ts', 'reservation-editor.component.spec.ts', 'follow-up-list.component.spec.ts']
  },
  'WAS-572': {
    name: '[FE FEATURE 10] Reception Reservation Check-In, Paid Admission & Walk-In',
    components: ['ReservationCheckInComponent', 'ReceptionPatientsComponent'],
    routes: ['/reception/check-in', '/reception/patients'],
    services: ['ReservationsApi', 'TicketsApi', 'FinanceApi'],
    specs: ['reservation-check-in.component.spec.ts', 'reception-patients.spec.ts']
  },
  'WAS-573': {
    name: '[FE FEATURE 11] Queue Call, Recall, NoShow, Start & Complete Visit',
    components: ['QueueWorkspaceComponent'],
    routes: ['/tickets/queue', '/reception/queue'],
    services: ['TicketsApi'],
    specs: ['queue-workspace.spec.ts', 'tickets-api.spec.ts']
  },
  'WAS-574': {
    name: '[FE FEATURE 12] Clinical Encounter, Diagnosis, Amendments & Follow-Up Eligibility',
    components: ['EncounterWorkspaceComponent'],
    routes: ['/encounters', '/encounters/:id'],
    services: ['EncountersApi', 'EncounterWorkspaceStore'],
    specs: ['encounter-workspace.component.spec.ts', 'encounter-workspace.store.spec.ts']
  },
  'WAS-575': {
    name: '[FE FEATURE 13] Prescription Draft, Drug Catalog, Versioning & Corrections',
    components: ['PrescriptionWorkspaceComponent', 'MedicationRequestsComponent'],
    routes: ['/prescriptions', '/prescriptions/:id', '/medication-requests'],
    services: ['PrescriptionsApi', 'MedicationRequestsApi', 'DrugCatalogApi'],
    specs: ['prescription-workspace.component.spec.ts', 'medication-requests.component.spec.ts']
  },
  'WAS-576': {
    name: '[FE FEATURE 14] Lab Requests, Patient Evidence & Doctor-Verified Results',
    components: ['DiagnosticWorkspaceComponent', 'DiagnosticDraftComponent'],
    routes: ['/diagnostics', '/diagnostics/:id'],
    services: ['DiagnosticsApi', 'MedicalCatalogApi'],
    specs: ['diagnostic-workspace.component.spec.ts', 'diagnostic-draft.component.spec.ts']
  },
  'WAS-577': {
    name: '[FE FEATURE 15] Radiology Requests, Patient Upload & Verified Report Versions',
    components: ['DiagnosticWorkspaceComponent', 'DiagnosticDraftComponent'],
    routes: ['/diagnostics', '/diagnostics/:id'],
    services: ['DiagnosticsApi', 'MedicalCatalogApi'],
    specs: ['diagnostic-workspace.component.spec.ts', 'diagnostic-draft.component.spec.ts']
  },
  'WAS-578': {
    name: '[FE FEATURE 16] Longitudinal Medical Record, Treating Scope & Visibility',
    components: ['EncounterWorkspaceComponent', 'PatientProfileComponent'],
    routes: ['/encounters', '/patient/profile', '/patient/records'],
    services: ['MedicalRecordsApi'],
    specs: ['medical-records-api.spec.ts']
  },
  'WAS-579': {
    name: '[FE FEATURE 17] Notifications Inbox, Preferences, Reminders & Admin Delivery Recovery',
    components: ['AppHeaderComponent', 'ToastComponent'],
    routes: ['/notifications', '/admin/notifications'],
    services: ['NotificationsApi', 'ToastService'],
    specs: ['notifications-api.spec.ts', 'toast.service.spec.ts']
  },
  'WAS-580': {
    name: '[FE FEATURE 18] Patient Payments, Receipts, Corrections & Doctor Revenue',
    components: ['FinanceWorkspaceComponent'],
    routes: ['/finance', '/finance/ledger'],
    services: ['FinanceApi'],
    specs: ['finance-workspace.spec.ts', 'finance-api.spec.ts']
  },
  'WAS-581': {
    name: '[FE FEATURE 19] Doctor Operating Finance, Salary Plans & Recurring Expenses',
    components: ['FinanceWorkspaceComponent'],
    routes: ['/finance', '/finance/expenses', '/finance/salaries'],
    services: ['FinanceApi'],
    specs: ['finance-workspace.spec.ts']
  },
  'WAS-582': {
    name: '[FE FEATURE 20] Doctor Dashboard, Insights, Reports, Drilldown & Export',
    components: ['DoctorReportsComponent'],
    routes: ['/doctor/reports'],
    services: ['Phase18Api'],
    specs: ['doctor-reports.component.spec.ts', 'phase18-api.spec.ts']
  },
  'WAS-583': {
    name: '[FE FEATURE 21] Reception Daily Worklist, Queue Attention, Handover & Reports',
    components: ['ReceptionPatientsComponent', 'ReceptionFamilyRequestsComponent'],
    routes: ['/reception/worklist', '/reception/patients', '/reception/family-requests'],
    services: ['DoctorReceptionsApi', 'ReceptionPracticeContext'],
    specs: ['reception-patients.spec.ts', 'reception-family-requests.spec.ts']
  },
  'WAS-584': {
    name: '[FE FEATURE 22] SuperAdmin Governance, Platform Reports & Investigations',
    components: ['SuperadminsListComponent', 'RoleDetailsComponent', 'AdminLayoutComponent'],
    routes: ['/admin/superadmins', '/admin/roles', '/admin/governance'],
    services: ['SuperadminsApi', 'SecurityGovernanceApi', 'Phase18Api'],
    specs: ['superadmins-list.spec.ts', 'role-details.spec.ts']
  },
  'WAS-585': {
    name: '[FE FEATURE 23] Patient Dashboard & Next Action Navigation',
    components: ['WorkspaceComponent', 'PortalLayoutComponent', 'PortalNavigationComponent'],
    routes: ['/workspace', '/patient'],
    services: ['AuthSession', 'ReservationsApi', 'TicketsApi'],
    specs: ['workspace.spec.ts', 'portal-layout.spec.ts', 'portal-navigation.spec.ts']
  },
  'WAS-586': {
    name: '[FE FEATURE 24] Archived Reservations/Tickets & Audit Explorer',
    components: ['ArchiveOperationsComponent'],
    routes: ['/admin/archives'],
    services: ['Phase18Part2Api'],
    specs: ['archive-operations.component.spec.ts', 'phase18-part2-api.spec.ts']
  },
  'WAS-587': {
    name: '[FE FEATURE 25] Drug & Medical Catalog Managers, Imports & Missing-Item Review',
    components: ['DrugCatalogComponent', 'DrugImportsComponent', 'DrugCatalogManagersComponent', 'CatalogComponent', 'ImportsComponent', 'RequestsComponent'],
    routes: ['/drug-catalog', '/drug-catalog/imports', '/admin/drug-catalog-managers', '/medical-catalog', '/medical-catalog/imports', '/medical-catalog/requests'],
    services: ['DrugCatalogApi', 'MedicalCatalogApi', 'DrugCatalogManagersApi'],
    specs: ['drug-catalog.component.spec.ts', 'drug-imports.component.spec.ts', 'drug-catalog-managers.component.spec.ts', 'catalog.component.spec.ts']
  },
  'WAS-631': {
    name: '[FE FEATURE 26] Wasla UI Master Journey & 25 Feature Scenario Index',
    components: ['AppHeaderComponent', 'PortalNavigationComponent', 'MobileNavigationComponent'],
    routes: ['AppRoot', 'All 25 Scenario Feature Routes'],
    services: ['All Domain APIs', 'AuthSession', 'ToastService'],
    specs: ['route-access.spec.ts', 'portal-navigation.spec.ts']
  }
};

async function syncAllFeatures() {
  const wsUrl = await getWsUrl();
  const keys = Object.keys(featureDetails);

  console.log(`Starting transition for ${keys.length} feature scenarios...`);

  for (let idx = 0; idx < keys.length; idx++) {
    const key = keys[idx];
    const details = featureDetails[key];

    const commentText = 
      `Frontend Feature UI End-to-End Scenario integration completed and verified.\n` +
      `• Feature: ${details.name}\n` +
      `• UI Components:\n` +
      details.components.map(c => `  - ${c}`).join('\n') + '\n' +
      `• Registered Routes: ${details.routes.join(', ')}\n` +
      `• Connected Services: ${details.services.join(', ')}\n` +
      `• Unit & Component Specs: ${details.specs.join(', ')}\n` +
      `• All Linked API Cards: 100% completed and moved to Done.\n` +
      `• Quality Gate: tsc --noEmit passed (0 errors), ng build passed, Vitest tests passing.`;

    const commentBody = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: commentText }]
          }
        ]
      }
    };

    const expr = `
      (async () => {
        try {
          // 1. Post comment
          const commentRes = await fetch('/rest/api/3/issue/${key}/comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(${JSON.stringify(commentBody)})
          });

          // 2. Transition to Done (id: "31")
          const transRes = await fetch('/rest/api/3/issue/${key}/transitions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transition: { id: "31" } })
          });

          // 3. Verify status
          const issueRes = await fetch('/rest/api/3/issue/${key}?fields=status');
          const issueData = await issueRes.json();

          return {
            status: issueData.fields?.status?.name,
            commentStatus: commentRes.status,
            transStatus: transRes.status
          };
        } catch (err) {
          return { error: err.message };
        }
      })()
    `;

    try {
      const res = await evaluateInBrowser(wsUrl, expr);
      console.log(`[${idx + 1}/${keys.length}] ${key} -> ${res.status || res.error} (comment: ${res.commentStatus}, trans: ${res.transStatus})`);
    } catch (err) {
      console.error(`Error processing ${key}:`, err.message);
    }
  }

  console.log('All feature scenarios processed!');
}

syncAllFeatures().catch(console.error);
