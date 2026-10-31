# Doctor lab results and operating finance — implementation and validation

Date: 2026-10-31. Status: implementation validated locally; live mutation acceptance remains open.

## Scope and implementation

Existing diagnostics and finance features were extended rather than replaced. Existing Doctor navigation and feature boundaries remain in place. No backend code was changed.

- Lab uploads validate nonempty files, PDF/JPEG/PNG extensions, 20-file limit, 10 MiB per file and 100 MiB combined. Draft requests and invalid covered items are blocked. Corrections may cover the current result's completed items. Current result may be null after voiding without breaking lists or patient diagnostics.
- Patient reports have a separate PendingReview inbox. The query uses `SubmissionStatus`: sending `status=PendingReview` returned HTTP 400 on the live backend because its shared filter also binds a request-status enum. The dedicated field returned HTTP 200.
- Result inspection shows version, uploader, review date, covered test names and attachment metadata. Mutation refreshes version history. Unsupported result-status filtering is hidden.
- Salary and expense settlements use their distinct endpoints, permissions and obligation IDs. Salary receipt, history and reversal use salary settlement endpoints. Salary plans cannot pause/resume or confirm variable actual amounts.
- Allocation editing supports multiple practices, preserves existing allocations, rejects duplicates/foreign practices and requires positive percentages totaling exactly 100% to two decimal places.
- Full settlements require explicit confirmation, a supported payment method, a nonfuture business date and a reason for backdating. PaidNow is submitted as one expense creation request with nested payment, never as a second settlement.
- Options failures are recoverable in the page and drawer. Validation feedback is visible in the drawer. Mutations retain toast feedback and concurrency/idempotency protections.
- Expense overview and transaction views consume backend reports; no accounting totals are reconstructed in the browser. History supports pagination.

## Changed boundaries

Diagnostics: domain contracts/API and API tests; result-upload component; diagnostic-workspace page; diagnostic test fixtures; nullable result handling in patient-diagnostics-tab.

Operating finance: existing operating-finance page and its tests; new presentational `allocation-editor` with complete TS/HTML/CSS/spec files. Allocation editor emits immutable draft values and owns no API workflow.

Localization: bilingual entries in the existing central translations dictionary. No new routes, dependencies or global state were required. Preexisting Doctor Reports and Reception changes in this workspace were preserved.

## API integration matrix

All paths below have prefix `/api/v1/doctors/me/`. `{id}` identifies the resource shown in that row, not its parent plan.

| Screen/action | Method | Endpoint |
| --- | --- | --- |
| Lab orders/list/detail | GET | `lab-requests`, `lab-requests/{id}` |
| Official upload | POST multipart | `lab-requests/{id}/results` |
| Official results/detail | GET | `lab-results`, `lab-results/{id}` |
| Version history/detail | GET | `lab-results/{id}/versions`, `lab-results/{id}/versions/{number}` |
| Correct/void | POST | `lab-results/{id}/corrections`, `lab-results/{id}/void` |
| Patient report inbox/detail | GET | `lab-result-submissions?SubmissionStatus=PendingReview`, `lab-result-submissions/{id}` |
| Accept/reject | POST | `lab-result-submissions/{id}/accept`, `lab-result-submissions/{id}/reject` |
| Authorized attachment | GET blob | `lab-results/{id}/versions/{number}/attachments/{attachmentId}/content`, `lab-result-submissions/{id}/attachments/{attachmentId}/content` |
| Finance form options | GET | `finance/filter-options` |
| Salary plans/create/detail/history | GET/POST | `reception-salary-plans`, `reception-salary-plans/{id}`, `reception-salary-plans/{id}/history` |
| Salary revise/end | PUT/POST | `reception-salary-plans/{id}`, `reception-salary-plans/{id}/end` |
| Salary obligations/detail/history | GET | `salary-obligations`, `salary-obligations/{id}`, `salary-obligations/{id}/history` |
| Correct/cancel salary obligation | PATCH/POST | `salary-obligations/{id}`, `salary-obligations/{id}/cancel` |
| Pay salary | POST | `salary-obligations/{id}/settle` |
| Salary settlement/receipt/history/reverse | GET/POST reverse | `salary-settlements/{id}`, suffixes `/receipt`, `/history`, `/reverse` |
| One-time expense/create/detail/history | GET/POST | `expenses`, `expenses/{id}`, `expenses/{id}/history` |
| Expense overview/movements | GET | `expenses/dashboard`, `expenses/transactions` |
| Recurring plans/create/detail/history | GET/POST | `recurring-expense-plans`, `recurring-expense-plans/{id}`, `recurring-expense-plans/{id}/history` |
| Recurring plan revision | PUT | `recurring-expense-plans/{id}` |
| Recurring plan state changes | POST | `recurring-expense-plans/{id}/end`, `/pause`, `/resume` |
| Expense obligations/detail/history | GET | `expenses/obligations`, `expenses/obligations/{id}`, `expenses/obligations/{id}/history` |
| Correct/cancel/actual/pay expense | PATCH/POST | `expenses/obligations/{id}`, suffixes `/cancel`, `/confirm-actual`, `/settle` |
| Expense settlement/receipt/history/reverse | GET/POST reverse | `expense-settlements/{id}`, suffixes `/receipt`, `/history`, `/reverse` |

Authoritative route mappings remain in `src/app/domains/phase18/phase18-api.ts` and `src/app/domains/diagnostics/diagnostics-api.ts`.

## Executed checks

```powershell
npx ng test --watch=false --include='src/app/features/operating-finance/**/*.spec.ts' --include='src/app/features/diagnostics/**/*.spec.ts' --include='src/app/domains/diagnostics/diagnostics-api.spec.ts' --include='src/app/features/doctor-patients/components/patient-diagnostics-tab/*.spec.ts'
npm run build
npm run check:architecture
npm run check:i18n
```

- Focused tests: **124 passed, 7 files passed**. Tests use synthetic fixtures only inside the test runner. Coverage includes multipart contracts, upload validation, permissions/capabilities, retries, full salary payment routing, atomic PaidNow, allocation validation/preservation, receipt/reversal, payment validation and history pagination.
- Production build: passed. Existing budget warnings concern the initial bundle, finance-workspace CSS and queue-workspace CSS.
- Repository architecture and i18n checks: fail on existing findings elsewhere (including medication-requests `any`, phase18 API test `any`, global CSS `!important`, and hardcoded text in unrelated features). No diagnostics/operating-finance/allocation-editor findings were reported by these checks.
- The scoped Impeccable detector reports advisory design-scale mismatches and black-text defaults from standalone Angular-template analysis. Existing Wasla control/panel token fallbacks and established compact typography take precedence over changing the visual system to satisfy those advisories. See `.playwright-mcp/lab-finance-design-scan.json`; this is not a claim of a zero-finding design scan.
- Live demo Doctor login succeeded. Lab request/result/submission, salary plan/obligation and recurring plan lists returned HTTP 200 with zero records. Finance filter options returned HTTP 200 with practices, reception employee and payment options.
- Browser checks: lab, salary and expense routes rendered in English desktop and Arabic mobile; no horizontal overflow at 375px. Salary plan form opened with live options and no horizontal overflow. No real clinical or financial records were created or modified.

Logs: `.playwright-mcp/lab-finance-implementation-tests.txt`, `lab-finance-build.txt`, `lab-finance-architecture.txt`, `lab-finance-i18n.txt`.

## Screenshot evidence

| Screen | Desktop English | Mobile Arabic |
| --- | --- | --- |
| Lab orders | [Desktop](../.playwright-mcp/lab-live-en.png) | [Mobile](../.playwright-mcp/lab-live-ar.png) |
| Reception salaries | [Desktop](../.playwright-mcp/salaries-live-en.png) | [Mobile](../.playwright-mcp/salaries-live-ar.png) |
| Operating expenses | [Desktop](../.playwright-mcp/expenses-live-en.png) | [Mobile](../.playwright-mcp/expenses-live-ar.png) |

Additional evidence: [Salary form desktop](../.playwright-mcp/salary-plan-form-desktop-en.png), [salary form mobile](../.playwright-mcp/salary-plan-form-mobile-en.png), [review inbox](../.playwright-mcp/doctor-lab-review-live-en.png).

## Instruction compliance

Applied root AGENTS.md, `.agents/skills/AGENTS.md`, `.agents/Agent_UI/UX.md`, `.agents/PATIENT_UX_GUIDELINES.md`, `.agents/tokns.md`, and relevant angular-developer, angular-component and impeccable instructions. Existing tokens, neutral container borders, shared page header/drawer, bilingual labels, styled controls and toast feedback were preserved. No patient booking flow was changed. No new visual system was introduced.

## Remaining acceptance gates

The user confirmed that no issued lab request/report or generated salary obligation is available. Therefore real upload, patient acceptance/rejection, correction/void, settlement/receipt/reversal and complete plan-to-payment demos **have not been signed off**. Tests do not replace these real-backend acceptance gates. Do not mark the complete task Done or infer successful authorization isolation from empty lists.

Required next evidence: approved clinical test records/files, backend-generated obligations, a second authorized test identity for cross-doctor access checks, and explicit execution of the complete workflows against those records. No fake clinical or financial records were inserted to bypass these requirements.

PR publication remains outstanding. The workspace includes unrelated preexisting changes and no GitHub CLI is installed; this report is a reviewable local delivery, not a published PR.
