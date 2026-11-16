# Wasla Patient UX & Frictionless Booking Standard

> **Core Platform Mission:** Deliver an ultra-simple, frictionless, intuitive healthcare booking experience for all patients (from tech-savvy individuals to elderly patients and clinic assistants). Every booking must be completed in **under 60 seconds with a maximum of 3 clicks**, eliminating cognitive overload, redundant forms, and disjointed page hops.

---

## 1. Industry Benchmark: Market Leaders (Vezeeta, Doctolib, Zocdoc)

We analyzed the user flows of the most successful medical booking platforms in Egypt, MENA, Europe, and the US: **Vezeeta**, **Doctolib**, **Zocdoc**, and **Practo**.

### Key Takeaways from Market Leaders:

| Metric / Dimension | Vezeeta (Egypt & MENA) | Doctolib (Europe) | Zocdoc (US) | Wasla Target Standard |
| :--- | :--- | :--- | :--- | :--- |
| **Click Budget (The 3-Click Rule)** | Card slot pick → Instant summary → 1-Click Confirm | Pick slot on card → Confirm sheet | Find provider → Choose slot → Confirm | **Maximum 3 clicks to confirmed booking** |
| **Booking Execution Location** | In-place on the doctor listing card | In-place or slide sheet overlay | In-place on doctor card | **100% In-Place (Never leaves the active context)** |
| **Page Navigation During Booking** | Never redirects to another page to book | Never redirects to another page | Never redirects to another page | **STRICTLY FORBIDDEN to navigate away to restart booking** |
| **Role of Doctor Details Page (`/doctors/:id`)** | Purely informative (bio, credentials, map, reviews) | Informative + identical compact booking widget | Informative + reviews & insurance check | **Informational Profile Page only (NOT a redundant wizard)** |
| **Smart Defaults** | Primary branch selected, Self selected, default fee shown | First available day & slot selected | Default appointment reason pre-selected | **Auto-select Clinic, Earliest Day/Slot, Self, & Standard Fee** |

---

## 2. Root Cause Analysis: What Caused Patient Confusion in Wasla?

1. **Dual Duplicate Flows (Fragmented Experience):**
   - The patient searched on `/doctors` and clicked a doctor, opening a **Slide-Over Drawer**.
   - But inside the drawer, there was a confusing "Open full doctor profile" button, and users were also routed to `/doctors/:doctorId`.
   - On the full doctor page, the patient was confronted with the **exact same 5 steps all over again from scratch** (Choose clinic → Choose day → Choose time → Choose price category → Choose patient)!
2. **Step Overload & Cognitive Friction (Over-Engineered Wizard):**
   - Step 1: Manually click a clinic button.
   - Step 2: Manually click a day chip.
   - Step 3: Manually click a time slot chip.
   - Step 4: Manually choose between segments (Regular, Urgent, Senior).
   - Step 5: Manually select patient from dropdown.
   - This caused decision paralysis and extreme confusion for ordinary patients.

---

## 3. The 5 Core Pillars of Wasla Patient UX

### Pillar 1: The 3-Click Booking Rule (قاعدة الـ ٣ نقرات)
A complete booking must require only 3 intuitive actions:
1. **Click 1: Select Time Slot** (from the earliest available day, or switch to tomorrow).
2. **Click 2: Review Ultra-Compact Summary** (Doctor & Clinic + Patient [Me] + Official Fee).
3. **Click 3: Wasla Teal Primary Action Button:** **[ Confirm Booking Now / تأكيد الحجز فوراً ]**.
- *Instant Result:* High-contrast confirmation receipt with the reservation reference `#RES-...` and a direct button to "View My Queue Ticket / عرض تذكرتي".

### Pillar 2: Single Canonical In-Place Booking (الحجز ينتهي في نفس المكان)
- When a patient starts booking on `/doctors`: the booking **must complete in-place** inside the slide drawer.
- **NEVER** navigate the patient away to `/doctors/:doctorId` in the middle of a booking attempt.
- The full doctor profile page (`/doctors/:doctorId`) is dedicated to credentials, biography, certifications, clinic maps, and verified patient reviews. If a patient books from there, it must use the exact same streamlined 3-click sheet.

### Pillar 3: Smart Defaults (القيم الافتراضية الذكية)
Never force the patient to make decisions the system can infer:
- **Primary Clinic:** If the doctor has one or a main clinic, select it automatically.
- **Earliest Day & Slots:** Load and highlight the earliest available day immediately.
- **Default Consultation Fee:** Automatically select the standard consultation price (e.g., `300 EGP`).
- **Active Patient:** If logged in as a Patient, pre-select `Me (Account Holder)`. Provide an inline toggle only if booking for a family member (`Book for a family member`).

### Pillar 4: Radical Simplicity for Egyptian Demographics
- Strictly eliminate backend developer jargon (e.g., `Segment`, `Idempotency`, `BusinessDate`, `SlotStartTime`, `Practice ID`).
- Use natural, friendly, reassuring medical terms:
  - `In-Clinic Consultation` instead of `Segment & Visit Type`.
  - `Sunday, Oct 13 at 6:00 PM` instead of `2026-10-13 18:00:00`.
  - `Payment at clinic upon arrival - No extra fees` to reassure the patient.

### Pillar 5: Reassuring Walk-In Clinic Guidance
- Clinics that do not support online self-booking must never display red/amber warnings or disabled dead-ends ("غير متاحة للحجز").
- Instead, display a clean, reassuring walk-in card:
  - **"Direct Walk-In Clinic (حضور مباشر بالعيادة)"**
  - Clinic address & working hours.
  - Price: `Determined at clinic (يُحدد بالعيادة)`.
  - Instructions: `First-come, first-served registration at the clinic reception desk`.

---

## 4. Patient Module Architecture & Feature Map

To keep the patient experience cohesive and clutter-free, the Patient Module is strictly structured into 4 distinct areas:

```text
Patient Experience (Wasla)
│
├── 1. Discovery & 1-Place Quick Booking (/doctors)
│   └── Browse doctors + Pick time slot + 1-Click Confirmation (In-Place Drawer, 0 redirects).
│
├── 2. Informative Doctor Profile (/doctors/:id)
│   └── Doctor Bio, Qualifications, Clinic Location Map, Verified Reviews + Identical quick booking sheet.
│
├── 3. My Appointments & Queue Tickets (/patient/reservations & /patient/tickets)
│   └── Upcoming & past visits + 1-Click Cancel/Reschedule + Live "My Turn Now" ticket tracker.
│
└── 4. Health Profile & Family Members (/patient/profile & /patient/family)
    └── Personal & insurance info + Dependents (Spouse, Children, Parents) selectable in 1 click during booking.
```

---

## 5. Strict Negative Constraints (STRICT DON'TS IN PATIENT UX)

1. ❌ **NEVER redirect a patient to another page during a booking flow.**
2. ❌ **NEVER exceed 3 clicks to secure a confirmed appointment.**
3. ❌ **NEVER display multi-tiered pricing or complex segment forms unless requested.**
4. ❌ **NEVER duplicate identical booking steps between a drawer and a full page.**
5. ❌ **NEVER show dead-ends or blocker amber/red warnings for walk-in clinics.**
6. ❌ **NEVER force a logged-in patient to re-enter their personal details.**
7. ❌ **NEVER use colored borders or excessive card nesting (Strict adherence to Rules 32.1 & 32.2).**

---

*Updated: October 11, 2026 — Enforced as the mandatory UX standard for all patient-facing development across Wasla.*
