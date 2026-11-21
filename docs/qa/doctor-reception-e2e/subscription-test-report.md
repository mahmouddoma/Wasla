# Wasla Doctor Subscription & 20-Day Free Trial — Live QA Report

Executed against the live staging environment (`https://doctorapi.runasp.net`) through the real Angular UI (`http://localhost:4201`) in headless Chrome via CDP.

---

## 1. Scenario A — Unsubscribed Eligible Doctor Self-Activates 20-Day Free Trial (`wasla.demo.dr.khaled`)

### Pre-Activation State (Verified via API & UI)
- **Account:** `wasla.demo.dr.khaled` (`Approved`, 128 Doctor permissions including `Subscriptions.ViewOwn` and `Subscriptions.ActivateTrialOwn`)
- **`GET /api/v1/doctors/me/subscriptions`:** `[]` (0 contracts)
- **`GET /api/v1/doctors/me/subscriptions/trial/eligibility`:**
  ```json
  {
    "status": "TrialAvailable",
    "canActivate": true,
    "durationDays": 20,
    "trial": null
  }
  ```
- **UI Verification (`/doctor/subscription`):**
  - Screenshot: `docs/qa/doctor-reception-e2e/screenshots/` / `.tmp/qa-screenshots/phase2/khaled-before-trial-ar.png`
  - Trial banner displayed: `"تجربة مجانية · 20 يوم · التجربة متاحة للبدء"` with active primary button `"بدء التجربة المجانية"`.
  - Empty contracts banner displayed: `"لا توجد اشتراكات — كل عقد يغطي عياداته فقط."`
  - Commercial catalog plans rendered below: `STARTER` (EGP 499/mo, 1 Practice, 1 Reception), `PROFESSIONAL` (EGP 999/mo, 3 Practices, 5 Receptions), `PREMIUM` (EGP 1,799/mo, 5 Practices, 10 Receptions), and `ONLINE_BOOKING_ONLY` (EGP 50/practice/mo).

### Live UI Activation Execution
1. Clicked `"بدء التجربة المجانية"` (`.trial-line button`) in `/doctor/subscription`.
2. Confirmation modal opened (`.confirm-modal-dialog`): `"تأكيد — تبدأ التجربة عند التأكيد. عقودك الحالية تظل كما هي."`
3. Clicked `"تأكيد"` (`.confirm-modal-footer .btn-primary`).
4. **Captured Network Request:**
   - **Endpoint:** `POST /api/v1/doctors/me/subscriptions/trial/activate`
   - **Headers:** `Idempotency-Key` present (`true`), `Accept-Language: ar`, `Authorization: Bearer <redacted>`
   - **HTTP Response Status:** `200 OK`
5. **Toast Feedback:** `"تمت العملية بنجاح — تم بدء التجربة بنجاح"`
6. **Automatic State Refresh:** Frontend immediately re-fetched:
   - `GET /api/v1/doctors/me/subscriptions` → `200 OK`
   - `GET /api/v1/public/commercial/catalog` → `200 OK`
   - `GET /api/v1/doctors/me/subscriptions/trial/eligibility` → `200 OK`

### Post-Activation Timestamp & Entitlement Verification
- **Created Contract Reference:** `#79394AA6`
- **Plan & Kind:** `planCode: "STARTER"`, `kind: "Trial"`, `status: "Active"`
- **Capacities:** `practiceLimit: 1`, `receptionLimit: 1`, `availablePracticeSeats: 1`
- **Server Timestamps:**
  - `startsAtUtc`: `"2026-11-21T13:45:23.938467Z"`
  - `endsAtUtc`: `"2026-12-11T13:45:23.938467Z"`
  - **Exact Duration:** `480.00 hours` = **`20.0000 days`** (Matches Commercial Addendum v1.2 rule 05)
- **Repeat Activation Prevention (After `Page.reload()`):**
  - `GET /api/v1/doctors/me/subscriptions/trial/eligibility` returned `{ "status": "TrialActive", "canActivate": false }`.
  - Trial banner updated to `"تجربة مجانية · 20 يوم · التجربة سارية"`.
  - `"بدء التجربة المجانية"` button is completely removed (`hasStartTrialBtn: false`).
- **Practice Allocation to Trial Contract (Phase 5 E2E-1):**
  - Opened `/doctor/practices/61c8abc7-...#operations` → clicked `"تخصيص أو نقل العيادة"` → selected `#79394AA6` (`الباقة الأساسية · 1 أماكن عيادات متاحة`) → selected reception staff (`wasla.demo.rec.hassan`) → confirmed.
  - `POST /api/v1/doctors/me/practices/61c8abc7-.../subscription-allocation/move` (`Idempotency-Key: true`) → **`200 OK`**.
  - Operational routes (`/workspace/doctor`, `/doctor/reservations`, `/doctor/queue`) immediately unlocked with **`0` API errors (`200 OK`)**.

- **Scenario A Final Status:** **`PASS`**

---

## 2. Scenario B — Multi-Contract Active Doctor (`wasla.demo.dr.mona`)

- **Account:** `wasla.demo.dr.mona`
- **Contracts Verified on `/doctor/subscription`:**
  1. **Contract `#76710CC6` (Paid `STARTER`):**
     - Status: `Active`, Price: `EGP 499.00`
     - Period: `2026-11-09T16:18:57Z` → `2026-12-09T16:18:57Z` (1 month)
     - Covered Clinic: `عيادة د. منى - المنوفية` (`9ddc315f`)
     - Usage: `1 used of 1` practice seat (`0` available), `1 Active reception accounts` (`wasla.demo.rec.nada`)
  2. **Contract `#3A3797DE` (Trial `STARTER`):**
     - Status: `Active`, Kind: `Trial` (`فترة تجريبية مجانية`)
     - Period: `2026-11-07T13:30:26Z` → `2026-11-27T13:30:26Z` (20 days)
     - Covered Clinic: `غير مخصصة لعيادة بعد` (`0 used of 1`, `1 available practice seats`)
- **Multi-Contract Independence:**
  - Verified that both contracts appear independently in the master list (`2` contracts).
  - Clicking Contract 1 vs Contract 2 loads each contract's distinct periods, usage, and covered clinic without auto-selecting or merging capacities.
  - Trial eligibility banner shows `TrialActive` (`canActivate: false`) with no activation button.
- **Defects Found & Fixed During Scenario B:**
  - **BUG-07 (P1 — Fixed):** `SubscriptionState.needsReview` previously evaluated `this.terms()?.status` (which was `null` when no contract row was clicked), causing `dr.mona` to land on `/doctor/subscription` instead of `/workspace/doctor` after login. Fixed and verified (`landing: "/workspace/doctor"`).
  - **BUG-02 & BUG-03 (P2 — Fixed):** KPI cards in the split detail pane previously truncated values with ellipsis at 1440px (`"1 مستخدم من أ..."`) and ignored English clinic names. Fixed and verified (`clipped: false` on all 3 KPI cards in `retest-bug02-03-mona-sub-en-1440.png`).

- **Scenario B Final Status:** **`FIXED` → `PASS`**

---

## 3. Scenario C — Unsubscribed / Entitlement-Restricted Doctor (`wasla.load.dr05` & Starter-Restricted Routes on `wasla.demo.dr.mona`)

- **Unsubscribed Account Tested:** `wasla.load.dr05` (`0` contracts, kept unsubscribed throughout QA)
- **Entitlement-Restricted Routes Tested on `STARTER` (`wasla.demo.dr.mona`):**
  - `/doctor/expenses` (`OPERATING_EXPENSES` — Professional/Premium only)
  - `/doctor/salaries` (`SALARY_MANAGEMENT` — Professional/Premium only)
  - `/doctor/reports` (`OPERATIONAL_REPORTS` — Professional/Premium only)
  - `/doctor/insights` (`ADVANCED_RULE_BASED_INSIGHTS` — Premium only)
- **Defect Found & Fixed During Scenario C:**
  - **BUG-01 & BUG-06 (P1 — Fixed):** On direct navigation or page reload to `/doctor/reservations` or `/doctor/queue` as unsubscribed `dr05` (or to `/doctor/expenses`, `/doctor/salaries`, `/doctor/reports`, `/doctor/insights` as `STARTER` `dr.mona`), `PortalLayout` previously mounted `<router-outlet />` before `SubscriptionState` finished loading, allowing unsubscribed `dr05` to bypass the Subscription Gate on `/doctor/reservations` and `/doctor/queue` and causing premature `403` API calls on `STARTER`-restricted routes.
  - **Fix & Retest Verification:** Updated `PortalLayout` to trigger `this.subscription.refresh()` immediately for Doctor sessions and hold `<router-outlet />` via `isSubscriptionGatePending()` until subscription state resolves. Retested in live Chrome (`retest-bug01-dr05-gate-ar-1440.png`): all 4 gated routes on `dr05` and all 4 upgrade-gated routes on `dr.mona` now render `.doctor-subscription-gate` immediately with **`0` premature `403` API errors** and no redirect loops.

- **Scenario C Final Status:** **`FIXED` → `PASS`**
