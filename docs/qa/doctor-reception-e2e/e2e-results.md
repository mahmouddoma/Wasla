# Wasla Doctor–Reception Cross-Role End-to-End (E2E) QA Results

All cross-role scenarios were executed in headless Google Chrome against the live Angular frontend (`http://localhost:4201`) and live staging backend (`https://doctorapi.runasp.net`).

---

## 1. Admin Intervention & Dependency Assessment

- **Credential Spreadsheet Inspection:** The provided spreadsheet contains 15 Doctor accounts, 27 Reception accounts, and 34 Patient accounts (`0` SuperAdmin accounts).
- **Live Approval Verification:** All 15 Doctor test accounts (`wasla.demo.dr.sara`, `wasla.demo.dr.khaled`, `wasla.demo.dr.mona`, and `wasla.load.dr04`..`dr15`) were queried via `GET /api/v1/doctors/me/onboarding` and `GET /api/v1/doctors/me/subscriptions/trial/eligibility`.
- **Outcome:** All 15 Doctor accounts are **already `Approved` and `Active`** on the backend, and per Commercial Addendum v1.2 section 05, Doctor self-activation of the 20-day free trial (`POST /api/v1/doctors/me/subscriptions/trial/activate`) requires **no SuperAdmin intervention**. Therefore, zero scenarios were blocked by missing Admin approvals.

---

## 2. E2E Scenario Execution Summary

| Scenario ID | Scenario Title | Roles & Accounts Involved | Key API Calls & Statuses | Final Status |
| --- | --- | --- | --- | --- |
| **E2E-1** | Doctor Trial Activation → Practice Allocation → Operational Unlock | `Doctor` (`wasla.demo.dr.khaled`) | `POST /doctors/me/subscriptions/trial/activate` (`200`), `POST /doctors/me/practices/61c8abc7.../subscription-allocation/move` (`200`), `GET /doctors/me/dashboard/filter-options` (`200`), `GET /practices/61c8abc7.../queue` (`200`) | **`PASS`** |
| **E2E-2** | Doctor Delegates Practice Permissions → Reception Accesses Worklist & Handovers | `Doctor` (`wasla.demo.dr.mona`) → `Reception` (`wasla.demo.rec.nada`) | `GET /doctors/me/receptions/assignable-permissions` (`200`), `PUT /doctors/me/receptions/:id/assignments/:aid` (`200`), `GET /reception/practices/9ddc315f.../worklist` (`403` before → `200` after grant) | **`FIXED` → `PASS`** |
| **E2E-3 & E2E-4** | Reception Patient Search → Booking & Duplicate Conflict Check → Doctor Visibility | `Reception` (`wasla.demo.rec.nada`) ↔ `Doctor` (`wasla.demo.dr.mona`) + `Patient` (`wasla.demo.patient01`) | `GET /patients/search` (`200`), `GET /reception/practices/9ddc315f.../booking/available-dates` (`200`), `POST /reception/practices/9ddc315f.../reservations` (`409 Conflict` duplicate protection on existing same-day booking `لؤى صابر` + `200` on Doctor & Reception reservation list/detail sync) | **`PASS`** |
| **E2E-5** | Doctor Revokes Delegated Permissions → Reception Loses Access Immediately | `Doctor` (`wasla.demo.dr.mona`) → `Reception` (`wasla.demo.rec.nada`) | `PUT /doctors/me/receptions/:id/assignments/:aid` (`200` restoring original 16 permissions), `GET /reception/practices/9ddc315f.../worklist` (`403`), `GET /reception/practices/9ddc315f.../handovers` (`403`) | **`PASS`** |
| **E2E-6** | Cross-Account & Cross-Practice Data Isolation | `dr.sara` → `dr05`; `rec.amal` → `rec.nada` | Verified zero contract leakage (`dr05ContractsAfterSwitch: 0`), zero practice leakage across Reception sessions (`amal` 2 practices → `nada` 1 practice), and practice switcher isolation on `rec.amal` (`Cairo` ↔ `Giza`) | **`PASS`** |
| **E2E-7** | Failure, Conflict, Commercial Entitlement & Recovery Flows | `dr.mona`, `dr.khaled`, `dr05`, `rec.nada` | Verified `403` commercial entitlement enforcement on `POST /reception/practices/:id/handovers` under `STARTER` plan, `409 Conflict` on duplicate same-day booking, `Idempotency-Key` header on all mutations, and clean retry/error toasts | **`PASS`** |

---

## 3. Step-by-Step Evidence per Scenario

### E2E-1 — Doctor Free Trial Activation to Full Clinic Operations (`wasla.demo.dr.khaled`)
1. Logged in via `/login` as `wasla.demo.dr.khaled` (`0` contracts, `TrialAvailable`).
2. Activated 20-day free trial on `/doctor/subscription` (`POST /api/v1/doctors/me/subscriptions/trial/activate` with `Idempotency-Key` → `200 OK`, Contract `#79394AA6`, `2026-11-21T13:45:23.938467Z` to `2026-12-11T13:45:23.938467Z`).
3. Observed that before allocating a practice to `#79394AA6`, operational endpoints (`/dashboard/filter-options`, `/reservations/filter-options`, `/queue`) returned `403 Forbidden` because practice `61c8abc7` (*Dr. Khaled - Giza*) was unallocated (`Uncovered`).
4. Navigated to `/doctor/practices/61c8abc7-c14d-5f4a-a6ba-a16e3d69aaa4#operations` → opened `<app-practice-allocation>` drawer → selected `#79394AA6` (`الباقة الأساسية · 1 أماكن عيادات متاحة`) → retained assigned reception `wasla.demo.rec.hassan` → submitted (`POST .../subscription-allocation/move` with `Idempotency-Key` → `200 OK`).
5. Navigated to `/workspace/doctor`, `/doctor/reservations`, and `/doctor/queue`: all three loaded with **`200 OK` and `0` API errors**.

### E2E-2 & E2E-5 — Reception Permission Grant, Worklist/Handover Verification & Revocation (`dr.mona` ↔ `rec.nada`)
1. **Baseline (Before Grant):** Logged in as `wasla.demo.rec.nada` (assigned to `Dr. Mona - Menoufia` `9ddc315f` with 16 permissions, excluding `Dashboards.Reception.ViewAssigned` and `Handovers.*`).
   - Navigated to `/reception/worklist` and `/reception/handovers`: UI rendered clean permission-denied empty states without firing unauthorized network calls; direct API probes confirmed `403 Forbidden`.
2. **Doctor Grants 5 Permissions via UI:** Logged in as `wasla.demo.dr.mona` → opened `/doctor/receptions/:nadaId` → clicked `"تعديل الصلاحيات"` → checked 5 permissions (`Dashboards.Reception.ViewAssigned`, `Handovers.ViewAssigned`, `Handovers.CreateAssigned`, `Handovers.AcknowledgeAssigned`, `Handovers.CloseAssigned`) → clicked `"حفظ"` (`PUT /api/v1/doctors/me/receptions/:id/assignments/:aid` → `200 OK`).
3. **Reception Verifies Granted Access:** Logged in as `wasla.demo.rec.nada`:
   - With **BUG-08 fixed**, `/reception/worklist` and `/reception/handovers` now appear in the Reception sidebar when those permissions are granted.
   - `/reception/worklist` called `GET /api/v1/reception/practices/9ddc315f.../worklist?pageNumber=1&pageSize=50` → **`200 OK`** (`1` active worklist item returned and rendered).
   - `/reception/handovers` enabled the `"إنشاء تسليم جديد"` action button; submitting a synthetic handover sent `POST /api/v1/reception/practices/9ddc315f.../handovers` with `Idempotency-Key` → backend returned **`403 Forbidden`** because `dr.mona`'s practice is covered by a **`STARTER`** contract, and per Commercial Addendum v1.2 section 01 (`RECEPTION_HANDOVER`), shift handovers require **`PROFESSIONAL` or `PREMIUM`**. This confirms defense-in-depth between delegated RBAC permissions and commercial plan entitlements.
4. **Doctor Revokes Permissions & Restores Original State:** `dr.mona` updated `rec.nada`'s assignment back to the exact original 16 permissions (`PUT .../assignments/:aid` → `200 OK`).
5. **Post-Revocation Verification:** `rec.nada` logged in and confirmed `worklist` (`403`) and `handovers` (`403`) access was immediately revoked and sidebar links were hidden.

### E2E-3 & E2E-4 — Reception Patient Search, Booking, Conflict Handling & Doctor Synchronization
1. Logged in as `wasla.demo.rec.nada` on `Dr. Mona - Menoufia` (`9ddc315f`).
2. Verified active appointment for synthetic patient `لؤى صابر` (`wasla.demo.patient01`, phone `01099003001`) at `15:20:00` in both Reception (`/reception/reservations`, screenshot `retest-bug10-rec-reservations-ar-390.png`) and Doctor (`/doctor/reservations` as `wasla.demo.dr.mona`).
3. Opened New Appointment drawer on `/reception/reservations` → searched phone `01099003001` via `<app-reservation-patient-search>` → selected patient → selected date, slot, visit type, and segment in `<app-reservation-editor>` → submitted.
4. Captured `POST /api/v1/reception/practices/9ddc315f.../reservations` with `Idempotency-Key: true` → verified backend duplicate-booking protection (`409 Conflict` when patient already holds an active appointment in the same window) and proper error toast feedback in UI.
