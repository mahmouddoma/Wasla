# Wasla Doctor & Reception E2E QA — Authorized Test Account Inventory

> **Credential Security Compliance:** All passwords, access tokens, refresh tokens, cookies, and session identifiers have been strictly excluded and redacted. Only authorized synthetic test account usernames, roles, live subscription states, practice counts, and delegated permission summaries discovered from the live staging API (`https://doctorapi.runasp.net`) are recorded below.

---

## 1. Summary of Assessed Accounts

| Category | Total in Spreadsheet | Authenticated via API/UI (`200 OK`) | Active Subscription | Eligible for 20-Day Free Trial | Assigned Practices |
| --- | ---: | ---: | ---: | ---: | ---: |
| **Demo Doctors** | 3 | 3 | 3 (after `dr.khaled` trial activation) | 1 (`dr.khaled` — activated during QA) | 4 total |
| **Demo Receptions** | 3 | 3 | Inherited per assigned practice | N/A | 4 assignments |
| **Load Test Doctors** | 12 | 12 | 0 | 12 (`TrialAvailable`, `canActivate: true`) | 24 total (2 each) |
| **Load Test Receptions** | 24 | 24 | Inherited per assigned practice | N/A | 48 assignments (2 each) |
| **Synthetic Patients** | 34 |Verified (`wasla.demo.patient01`) | N/A | N/A | N/A |
| **SuperAdmin** | 0 in spreadsheet | — | N/A | N/A | N/A |

---

## 2. Primary Demo Test Accounts (Detailed Live State)

| Redacted Account ID | Role | Auth Status | Approval Status | Live Subscription Contracts | Trial Eligibility (`/trial/eligibility`) | Owned / Assigned Practices | Reception / Permission Scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `wasla.demo.dr.mona` | `Doctor` | `PASS` (`200`) | `Approved` | **2 Active Contracts:**<br>1. `#76710CC6` (`STARTER` Paid, `2026-11-09` → `2026-12-09`, 1/1 practice used, 1/1 reception used)<br>2. `#3A3797DE` (`STARTER` Trial, `2026-11-07` → `2026-11-27`, 0/1 practice used, 1 seat free) | `TrialActive` (`canActivate: false`, `durationDays: 20`) | 1 Practice: `9ddc315f` (*Dr. Mona - Menoufia* / *عيادة د. منى - المنوفية*, Active & Covered) | 128 Doctor permissions; owns 1 Reception (`wasla.demo.rec.nada`) |
| `wasla.demo.dr.sara` | `Doctor` | `PASS` (`200`) | `Approved` | **1 Active Contract:**<br>`#29040F46` (`STARTER` Trial, `2026-11-14` → `2026-12-04`, 0/1 practice allocated, 1 seat available) | `TrialActive` (`canActivate: false`, `durationDays: 20`) | 2 Practices:<br>- `f6bac501` (*Dr. Sara - Giza*)<br>- `d7489457` (*Dr. Sara - Cairo*) | 128 Doctor permissions; owns 1 Reception (`wasla.demo.rec.amal`) |
| `wasla.demo.dr.khaled` | `Doctor` | `PASS` (`200`) | `Approved` | **Before QA:** `0` contracts<br>**After Phase 2 QA:** **1 Active Trial Contract** `#79394AA6` (`STARTER` Trial, `2026-11-21T13:45:23.938467Z` → `2026-12-11T13:45:23.938467Z`, 1/1 practice allocated) | **Before:** `TrialAvailable` (`canActivate: true`, `20` days)<br>**After:** `TrialActive` (`canActivate: false`) | 1 Practice: `61c8abc7` (*Dr. Khaled - Giza* / *عيادة د. خالد - الجيزة*, allocated to `#79394AA6` in Phase 5 E2E-1) | 128 Doctor permissions; owns 1 Reception (`wasla.demo.rec.hassan`) |
| `wasla.demo.rec.nada` | `Reception` | `PASS` (`200`) | Active | Covered via `Dr. Mona - Menoufia` (`#76710CC6` Paid `STARTER`) | N/A | 1 Assigned Practice: `9ddc315f` (*Dr. Mona - Menoufia*) | 44 user permissions; 16 practice-scoped permissions (temporarily granted +5 Worklist/Handover permissions in E2E-2 and restored to 16 in E2E-5) |
| `wasla.demo.rec.amal` | `Reception` | `PASS` (`200`) | Active | Linked to Dr. Sara's 2 practices | N/A | 2 Assigned Practices:<br>- `d7489457` (*Dr. Sara - Cairo*)<br>- `f6bac501` (*Dr. Sara - Giza*) | 44 user permissions; 16 practice-scoped permissions on each practice |
| `wasla.demo.rec.hassan` | `Reception` | `PASS` (`200`) | Active | Covered via `Dr. Khaled - Giza` (`#79394AA6` Trial `STARTER`) | N/A | 1 Assigned Practice: `61c8abc7` (*Dr. Khaled - Giza*) | 44 user permissions; 16 practice-scoped permissions |
| `wasla.demo.patient01` | `Patient` | `PASS` (`200`) | Active | N/A | N/A | N/A | Synthetic test patient used for E2E booking & conflict verification |

---

## 3. Load & Negative-Scenario Test Accounts (`wasla.load.*`)

| Redacted Account Range | Role | Count | Auth Status | Subscription & Trial State | Practices & Assignments | QA Usage |
| --- | --- | ---: | --- | --- | --- | --- |
| `wasla.load.dr05` | `Doctor` | 1 | `PASS` (`200`) | **0 Contracts** (`TrialAvailable`, `canActivate: true`, intentionally kept unsubscribed) | 2 Practices (`9b31244c` *Wasla DEMO 2026 05-1*, `8d2c932e` *Wasla DEMO 2026 05-2*) | **Scenario C (Unsubscribed Doctor Gate & Restriction Verification)** & **E2E-6 (Cross-Account Session Isolation)** |
| `wasla.load.dr04`, `dr06`..`dr15` | `Doctor` | 11 | `PASS` (`200`) | **0 Contracts** (`TrialAvailable`, `canActivate: true`, `durationDays: 20`, 128 permissions) | 2 Practices each (`Wasla DEMO 2026 XX-1`, `Wasla DEMO 2026 XX-2`) | Verified in Phase 1 live account discovery matrix |
| `wasla.load.rec041`..`rec152` | `Reception` | 24 | `PASS` (`200`) | Inherited from respective `wasla.load.dr04`..`dr15` | 2 Assigned Practices each, 44 user permissions, 18 practice permission codes each | Verified in Phase 1 live account discovery matrix |
