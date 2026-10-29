---
version: 1
slug: "s-doctor-dashboard-doctor-dashboard-component-html"
primary_target: "src/app/features/doctor-dashboard/pages/doctor-dashboard/doctor-dashboard.component.html"
related_targets: ["src/app/features/doctor-patients/pages/doctor-patients-directory/doctor-patients-directory.component.html","src/app/features/doctor-patients/components/patient-detail-drawer/patient-detail-drawer.component.html"]
---

# Doctor workspace and patient records

Mode: Operate. Scope: `/workspace/doctor`, `/doctor/patients`, and its query-driven patient inspection drawer.

Doctors and clinic assistants need to enter the queue, begin consultations, find a patient, and inspect their clinical history with minimal navigation. The user explicitly prioritizes the queue and consultations.

Preserve Wasla's navy/teal palette, Cairo/Manrope typography, shared page header, bilingual direction switching, backend permissions, existing filters, and URL-driven drawer state.

The dashboard begins with a continuous action surface emphasizing queue and consultations. Its bounded overview surface shows the actual reporting window and four meaningful summary measures. Daily activity comes from API series, with a readable data-table alternative. Six sections organize all operational, patient, capacity, financial and handover metrics; unknown future measures remain visible in an additional section. Authorized metric actions open a paginated record drawer using the server's exact reporting snapshot. API action paths are validated and never used as browser destinations. Source records map only to supported, permission-gated application routes. Patient search stays visible, while native expandable filters reveal the advanced options. The patient directory stays continuous; mobile rows retain identity, contact, last attendance, and an accessible inspection button without horizontal scrolling.

The patient drawer opts into a wider shared drawer layout without affecting existing consumers. Desktop uses a sticky section navigation rail beside a divided clinical summary. Narrow containers use wrapped section buttons and a single-column record. No nested cards, colored container borders, or blinking decorations.

Validation uses component tests and synthetic browser records in Arabic and English at desktop and mobile widths. Screenshots are local evidence, not live-backend verification.
