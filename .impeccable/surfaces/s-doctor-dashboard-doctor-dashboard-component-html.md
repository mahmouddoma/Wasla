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

The dashboard begins with filters, the actual reporting window, snapshot time and six semantic summary measures, with finance requiring revenue permission and returned values. A paired SVG trend compares scheduled appointments with check-in events and retains a readable daily table. Supporting disclosures show the same booking-created cohort, waiting experience, creation patterns, patient mix and authorized finance. A grouped secondary disclosure preserves all official metrics, breakdowns and unknown future measures. Operational shortcuts follow the overview; queue and consultations remain first among them. Authorized metric actions open a paginated record drawer using the server's exact reporting snapshot. API action paths are validated and never used as browser destinations. Source records map only to supported, permission-gated application routes. Patient search stays visible, while native expandable filters reveal the advanced options. The patient directory stays continuous; mobile rows retain identity, contact, last attendance, and an accessible inspection button without horizontal scrolling.

The patient drawer opts into a wider shared drawer layout without affecting existing consumers. Desktop uses a sticky section navigation rail beside a divided clinical summary. Narrow containers use wrapped section buttons and a single-column record. No nested cards, colored container borders, or blinking decorations.

Validation uses component tests and synthetic browser records in Arabic and English at desktop and mobile widths. Screenshots are local evidence, not live-backend verification.
