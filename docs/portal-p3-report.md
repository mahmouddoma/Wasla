# P3 — Finance / Payments Implementation & Verification Report

Implementation date: 7 October 2026.
Baseline commit: `828f491097eb7ea5bcb8282907143c52db16c881` (P1/P2 final polish).
Target scope: `/reception/finance`, `/doctor/finance`, `/doctor/revenue`, with regression coverage for `/patient/finance`.
Governed by: `AGENTS.md`, `DESIGN.md`, `PRODUCT.md`, P0/P1/P2 architecture and design guidelines.

---

## 1. Executive Summary & Goal Realization

P3 transforms Finance / Payments from a raw backend ledger into a task-first, clinic-centric operational surface designed specifically for doctors and clinic receptionists.

### Receptionist Mental Model Delivered
- **Review Payment:** `المريض دفع → أراجع العملية → أطبع الإيصال` (View payment row → inspect summary & ticket in slide-over drawer → view/print receipt voucher).
- **Cancelled Ticket / Refund:** `التذكرة اتلغت → أفتح الدفع → أرجع المبلغ → تم` (Deep-link from P2 queue or direct search → inspect non-editable full refundable amount → choose method and reason → execute refund → review Done state → print refund receipt).
- **Payment Correction (Exception):** `اتسجلت طريقة الدفع غلط → أصحح بيانات الدفع → تم` (Under More → correct method/reference/notes with mandatory reason → server reload with preserved draft on 409).

Receptionists are completely shielded from internal database jargon (`rowVersion`, `FinancialTransactions`, `AuditLog`, `PaymentDetailEntity`). All operations are presented in natural Arabic and English.

---

## 2. Delivered Workflows & UX Decisions

| Workflow / Area | Implementation & Design Decisions |
| --- | --- |
| **Reception Clinic Context** | Strictly uses `ReceptionPracticeContext.currentPracticeId()` as the single global source of truth. Removed the redundant local Reception clinic selector. Opening Finance never silently switches or falls back to another clinic. If no clinic is selected, a polite prompt instructs the user to choose one from the top header. If the selected clinic lacks `PracticePayments.View`, specific permission guidance is rendered without fallback. |
| **Daily-Payment-First Reception UX** | Default view for Reception is set to **Today (`اليوم`)**, matching day-to-day operations. Quick filter tabs allow instant switching between **Today**, **This Month**, and **Custom Range**. |
| **Common Search & Advanced Filters** | Immediate search prioritizes identifiers clinic staff actually use: **Ticket Number (`رقم التذكرة`)** or **Transaction Number (`رقم العملية`)**. Optional patient search (name/phone) is available if `Patients.SearchBasic` is granted. Secondary filters (Transaction Type, Payment Method, Custom Dates) are progressively disclosed under **Additional Filters (`فلاتر إضافية`)**. |
| **Transaction Information Hierarchy** | Unified, clean directory list replacing nested cards ("carditis"). Priority order: Patient Name, Signed Amount (`+300 ج.م` for Payment, `-300 ج.م` for Refund), Type & Method badges (`دفع · نقدي`), Ticket Number (`تذكرة #12`), and Business Timestamp. The row provides an explicit **View (`عرض`)** button for accessibility rather than depending solely on clickable table rows. |
| **Focused Slide-Over SideDrawer** | All details, receipts, refunds, and corrections open inside a focused, non-disruptive `SideDrawer` (`dir="rtl"`-aware, Escape-key dismiss, focus trap/return). Users never lose their table position or scroll context. |
| **Authoritative Full Refund Flow** | Click **Refund Amount (`استرجاع المبلغ`)** opens a focused refund state. Clearly displays: *"المريض [اسم المريض] سيتم استرجاع كامل المبلغ [المبلغ] جنيه"*. Refund amount is strictly non-editable and dictated by the server (`refundableAmount`). Requires refund method and reason code (text description required only if reason is `Other`). Explicit CTA: *"استرجاع 300 جنيه"*. Before submission, a clear consequence notice explains that an independent refund transaction will be recorded without altering queue or ticket state. |
| **Refund Done State** | Displays returned refund transaction ID, patient name, and refunded amount. Immediate action shortcuts: **View Refund Receipt (`عرض إيصال الاسترداد`)** and **Done (`تم`)**. Success state remains isolated to the clinic scope and auto-clears on clinic switch. |
| **Payment Correction (Under More)** | Hidden under secondary menu to prevent accidental tampering. Clear guidance: *"يمكنك تصحيح طريقة الدفع أو المرجع أو الملاحظات. المبلغ والمريض والتذكرة لن يتغيروا."* Amount, patient, and ticket number are strictly immutable. Correction reason is mandatory. On failure or 409 conflict, user draft is preserved. |
| **Refund Correction** | Accessible under More only after a refund transaction exists and server confirms `canCorrect = true`. Allows updating refund method, reason, reference, and notes without altering refund amounts. |
| **Audit History & Human-Readable Diff** | Located in a dedicated disclosure under More (`سجل التصحيحات`). Transforms backend `oldValues` and `newValues` into clean human-readable diffs (e.g., `طريقة الدفع: نقدي → بطاقة`, `رقم المرجع: — → POS-1029`). Never dumps raw JSON. If old/new values are omitted by the backend, displays available corrector name, timestamp, and reason. |
| **Receipt Vouchers & Printing** | Clean visual vouchers for both Payment and Refund transactions. Shows patient name, clinic name, doctor name, ticket number, amount, payment method, reference, transaction number, and cashier. Internal correction notes and audit details are excluded. Full native `@media print` support hides drawer chrome and buttons. |
| **Doctor Finance & Revenue Routes** | Strictly route-driven (`/doctor/finance` vs `/doctor/revenue`). Avoided in-page tab switches that keep the URL ambiguous. Doctor keeps local clinic selection where appropriate. Doctor Revenue preserves existing backend aggregates: gross revenue, refunds, net revenue, trend, payment methods, and visit types without decorative card clutter. |
| **Patient Boundary Preservation** | `/patient/finance` preserves patient privacy: patient views only their own transactions, receives payment/refund vouchers, and has zero visibility into staff-only audit notes, corrections, or doctor-wide ledgers. |

---

## 3. Architecture & Code Ownership

```text
src/app/features/finance/
└── pages/
    └── finance-workspace/
        ├── finance-workspace.ts       # Smart container: race safety, idempotency, 409 handling, state signals
        ├── finance-workspace.html     # Semantic template: SideDrawer, quick filters, vouchers, refund flows
        ├── finance-workspace.css      # Design token styles: 0 colored borders, no carditis, responsive layout
        └── finance-workspace.spec.ts  # 40 comprehensive unit & integration tests
```

### Key Modules Touched & Reused:
- `src/app/core/i18n/translations.ts`: Added semantic bilingual translation keys for P3.
- `src/app/domains/reception-practices/reception-practice-context.ts`: Authoritative Reception clinic selection and delegated permission checks.
- `src/app/shared/components/side-drawer/`: Reused for slide-over drawer UX.
- `src/app/core/notifications/toast.service.ts`: Mandatory user feedback on all mutations (`success`, `error`).
- `src/app/layout/portal-layout/`: Fixed select change typing for seamless header clinic switching.

---

## 4. Context & Race Hardening

| Scenario | Mechanism | Result |
| --- | --- | --- |
| **Clinic Switch (A → B)** | `scopeGeneration` counter incremented on every practice change. | Pending Clinic A list, detail, receipt, and mutation responses carry an old generation ID and are discarded immediately. |
| **A → B → A Return** | Returning to Clinic A creates a brand new generation ID. | Responses from the previous Clinic A session cannot contaminate the new session. |
| **Same-Clinic Read Ordering** | Scoped sequence counters: `listSequence`, `detailSequence`, `receiptSequence`. | If Payment 1 is clicked then Payment 2 is clicked, and Payment 2 returns before Payment 1, the newer Payment 2 remains displayed; late Payment 1 response is dropped. |
| **Stale 403 vs Current 403** | `responseScope === currentScope`. | A stale 403 from an abandoned clinic never clears the active clinic, never closes current drawers, and never triggers global re-authorization. Only a 403 in the current scope invokes `ReceptionPracticeContext.refresh()`. |
| **Mutation Invalidation** | Pending mutation scoped to current clinic. | Switching clinics while a refund or correction is in-flight suppresses the success/error toast and outcome banner in the new clinic. |

---

## 5. State Separation & Failure Handling

State is cleanly split into discrete, granular signals:
- `listLoading`: Controls list skeleton; does NOT blank the whole workspace.
- `listFailed`: Renders explicit error banner with **Retry (`إعادة المحاولة`)**; never masquerades as empty data.
- `detailLoading`: Renders drawer skeleton while preserving the underlying table list.
- `receiptLoading`: Indicates voucher loading in drawer.
- `busy`: Disables mutation buttons and prevents duplicate submissions.

### Distinguishable Operational States:
1. **No Clinic Selected:** Guidance prompting clinic selection in the header.
2. **No View Permission:** Permission-specific alert with role guidance.
3. **List Loading:** Targeted spinner / loading indicator.
4. **List Load Failed:** Clear failure alert with a one-click Retry button that re-executes the current query.
5. **Genuinely Empty Today:** *"لا توجد مدفوعات أو استردادات اليوم"* (No bogus filter advice).
6. **Filtered Empty:** *"لا توجد عمليات مطابقة"* with a **Reset Filters (`إعادة ضبط الفلاتر`)** button.
7. **Populated Results:** Structured table with informative rows.

---

## 6. Mutation Idempotency & 409 Concurrency

### Retained Idempotency Key Map
- A client-side intent map caches generated `Idempotency-Key` headers keyed by `operation:targetId:rowVersion:normalizedPayload:practiceId`.
- **Network Failure / Retry:** If a user retries a failed refund or correction with identical parameters, the exact same idempotency key is reused to guarantee backend deduplication.
- **Payload / Scope Modification:** Any change to fields, row version, or target invalidates the cache and generates a fresh key.
- **Success:** The key is cleared upon verified server confirmation.
- **Rapid Double-Click:** Guarded by `busy()` signal; subsequent clicks are blocked synchronously.

### Concurrency & 409 Conflict Handling
- Payments and refunds are protected by server `rowVersion`.
- On receiving HTTP 409:
  1. Automatic submission is strictly halted (no blind retry).
  2. Fresh server details are re-fetched immediately to retrieve the latest `rowVersion` and state.
  3. The user's input draft is preserved in place (`preserveDraft`).
  4. An alert banner explains: *"تغيرت بيانات العملية منذ فتحها. راجع البيانات الحالية ثم احفظ التصحيح مرة أخرى."*
  5. The user reviews current server values and manually re-submits.

---

## 7. Reused Backend API Contracts & Explicit Limitations

All backend endpoints were reused without modifying API contracts:
- `FinanceApi.practiceTransactions(practiceId, query)`
- `FinanceApi.doctorTransactions(doctorId, query)`
- `FinanceApi.patientTransactions(patientId, query)`
- `FinanceApi.paymentDetails(paymentId)`
- `FinanceApi.refundPayment(paymentId, request, idempotencyKey)`
- `FinanceApi.correctPayment(paymentId, request, idempotencyKey)`
- `FinanceApi.correctRefund(refundId, request, idempotencyKey)`
- `FinanceApi.paymentReceipt(paymentId)`
- `FinanceApi.refundReceipt(refundId)`
- `FinanceApi.doctorRevenue(doctorId, from, to, practiceId)`
- `PatientsApi.search(query)` (used conditionally when `Patients.SearchBasic` is granted)

### Authoritative Backend Limitations Documented:
1. **Full Refund Only:** Backend only supports full transaction refunds (`refundableAmount`). Partial or split refunds are not supported by the contract and were not added.
2. **Immutable Financial Quantities:** Payment amount, patient ID, and ticket ID cannot be corrected.
3. **No Standalone Payments:** Payment creation remains strictly coupled to P2 check-in / walk-in.
4. **Audit Diff Dependency:** Before/after diffs depend on backend-supplied `oldValues` and `newValues`. When absent, fallback displays author, timestamp, and reason.
5. **Patient Search Requirement:** Patient auto-complete requires `Patients.SearchBasic`. Without it, search functions via ticket and transaction numbers without raw patient ID fields.

---

## 8. Verification & Quality Gates

### 8.1 Full Unit Test Suite
- Executed via Angular CLI test runner: `npm test -- --watch=false`
- **Result:** **128 test files passed (100%), 948 tests passed (100%)**.
- Focused `finance-workspace.spec.ts` covers **40 test cases** including:
  - Single Reception clinic context & no local selector.
  - No clinic guidance & permission-denied state.
  - Race protection: A → B, A → B → A, same-clinic read ordering.
  - Stale 403 isolation vs current 403 context refresh.
  - Granular loading vs failure vs empty vs filtered states.
  - Idempotency key reuse on retry & refresh on payload change.
  - 409 conflict handling with draft preservation.
  - Full refund flow, non-editable amount, and Done state.
  - Payment and refund correction validations.
  - Audit history human-readable diff rendering.
  - Doctor Finance & Revenue routing stability.
  - Patient Finance privacy regression.

### 8.2 Browser Journey Automation
- Executed via synthetic CDP browser test harness: `node scripts/browser-finance-journeys.cjs`
- **Result:** **All 10 user journeys passed successfully with exit code 0**:
  - **Journey 1:** Populated Reception finance & no local selector.
  - **Journey 2:** No clinic selected guidance.
  - **Journey 3:** No View permission guidance.
  - **Journey 4:** Payment detail inspection & receipt shortcut.
  - **Journey 5:** Cancelled ticket deep link (`?practiceId=c1&paymentId=pay1`) → Full refund 300 EGP → Refund Done state → Refund receipt voucher.
  - **Journey 6:** Failed refund retry reuses identical idempotency key.
  - **Journey 7:** Payment correction flow (method changed to Card, reason entered, saved).
  - **Journey 8:** 409 concurrency handling (displays conflict guidance banner and preserves draft).
  - **Journey 9:** Refund correction flow after refund.
  - **Journey 10:** Clinic switching isolation (`c1` → `c2` → `c1` cleanly isolates data and auto-closes drawer).

### 8.3 Responsive Verification (8 Viewports in AR & EN)
- Executed via `scripts/browser-reception-responsive.cjs` across:
  - `320px`, `390px`, `576px`, `768px`, `820px`, `1024px`, `1280px`, `1440px` in both Arabic (RTL) and English (LTR).
  - **16/16 viewports verified with zero overflow, zero clipping, and clean drawer positioning.**
  - High-resolution visual screenshots captured in `.tmp/finance-responsive/` for 390px (mobile), 820px (tablet), and 1440px (desktop).

### 8.4 Architecture, I18N, and Build Checks
- `npm run build`: Compiled production bundle successfully (exit code 0).
- `git diff --check`: Passed with 0 whitespace/formatting errors (exit code 0).
- `npm run check:i18n`: 0 violations in `features/finance`.
- `npm run check:architecture`: 0 violations in `features/finance`.

---

## 9. Definition of Done Checklist

- [x] Exactly one Reception clinic selector (shared global header).
- [x] Finance never silently changes the global clinic.
- [x] Old Clinic A data never appears in Clinic B.
- [x] Stale 403 from Clinic A cannot affect Clinic B.
- [x] Failed financial retry reuses the identical intent idempotency key.
- [x] 409 conflict handled safely with draft preservation.
- [x] Load failure clearly distinguishable from empty data.
- [x] Common filters simplified for daily reception operations.
- [x] Correction tools tucked under secondary menu (More).
- [x] Refund flow explicitly displays non-editable full amount.
- [x] Queue cancellation remains strictly decoupled from financial refund.
- [x] Doctor Finance and Revenue routes are stable after refresh.
- [x] All workflows verified and accessible at 390px in Arabic.
