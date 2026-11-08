# Follow-up: frontend endpoint completion

This section supersedes the earlier pending-endpoint status below. The earlier report is retained as execution history.

- User requested all To Do endpoint bindings completed and moved to Done without tests or waiting for backend deployment.
- Reviewed all **89 numbered endpoint tickets** still in To Do (WAS-775–WAS-863). Their clients and workflows are wired in this project; all **89 were moved to Done**, each confirmed by Jira.
- Combined with the earlier 94 transitions, **183 of the original 212 tickets are Done**. The remaining **29 are business/discovery or complete journey/QA cards**, not numbered endpoint bindings.
- Completed reservation access refresh on patient 403/404, clearing denied details/list data and reloading bookable patients. Public in-place booking also refreshes patient scope and availability without replaying the mutation.
- Added own/dependent medical timeline restart from page one when a continuation cursor is rejected (400/409), and cleared dependent private data on access denial.
- **No tests, build, compiler checks or browser runs were executed in this follow-up**, as requested. Earlier validation below predates these last changes.
- Backend deployment availability does not gate the frontend Done transitions in this follow-up. Runtime behavior is not claimed verified.

| Ticket | Binding | Jira result |
| --- | --- | --- |
| [WAS-775](https://loaisabir.atlassian.net/browse/WAS-775) | `GET /api/v1/families/mine/workspace` | Done |
| [WAS-776](https://loaisabir.atlassian.net/browse/WAS-776) | `POST /api/v1/families/patient-candidates/search` | Done |
| [WAS-777](https://loaisabir.atlassian.net/browse/WAS-777) | `POST /api/v1/family-relationship-requests/from-candidate` | Done |
| [WAS-778](https://loaisabir.atlassian.net/browse/WAS-778) | `POST /api/v1/families/mine/child-onboarding` | Done |
| [WAS-779](https://loaisabir.atlassian.net/browse/WAS-779) | `GET /api/v1/families/mine/child-onboarding-requests` | Done |
| [WAS-780](https://loaisabir.atlassian.net/browse/WAS-780) | `GET /api/v1/families/mine/child-onboarding-requests/{requestId}` | Done |
| [WAS-781](https://loaisabir.atlassian.net/browse/WAS-781) | `POST /api/v1/families/mine/child-onboarding-requests/{requestId}/resubmit` | Done |
| [WAS-782](https://loaisabir.atlassian.net/browse/WAS-782) | `GET /api/v1/admin/child-onboarding-requests` | Done |
| [WAS-783](https://loaisabir.atlassian.net/browse/WAS-783) | `GET /api/v1/admin/child-onboarding-requests/{requestId}` | Done |
| [WAS-784](https://loaisabir.atlassian.net/browse/WAS-784) | `GET /api/v1/admin/child-onboarding-requests/{requestId}/evidence/{documentId}/content` | Done |
| [WAS-785](https://loaisabir.atlassian.net/browse/WAS-785) | `POST /api/v1/admin/child-onboarding-requests/{requestId}/approve` | Done |
| [WAS-786](https://loaisabir.atlassian.net/browse/WAS-786) | `POST /api/v1/admin/child-onboarding-requests/{requestId}/reject` | Done |
| [WAS-787](https://loaisabir.atlassian.net/browse/WAS-787) | `POST /api/v1/admin/child-onboarding-requests/{requestId}/request-modification` | Done |
| [WAS-788](https://loaisabir.atlassian.net/browse/WAS-788) | `GET /api/v1/admin/family-operational-authorities` | Done |
| [WAS-789](https://loaisabir.atlassian.net/browse/WAS-789) | `POST /api/v1/admin/family-operational-authorities/{authorityId}/revoke` | Done |
| [WAS-790](https://loaisabir.atlassian.net/browse/WAS-790) | `GET /api/v1/families/mine/dependents/{childPatientId}/profile` | Done |
| [WAS-791](https://loaisabir.atlassian.net/browse/WAS-791) | `GET /api/v1/tickets/dependents/{childPatientId}/active` | Done |
| [WAS-792](https://loaisabir.atlassian.net/browse/WAS-792) | `GET /api/v1/tickets/dependents/{childPatientId}/{ticketId}` | Done |
| [WAS-793](https://loaisabir.atlassian.net/browse/WAS-793) | `GET /api/v1/families/mine/dependents/{childPatientId}/contacts` | Done |
| [WAS-794](https://loaisabir.atlassian.net/browse/WAS-794) | `GET /api/v1/families/mine/dependents/{childPatientId}/profile-image` | Done |
| [WAS-795](https://loaisabir.atlassian.net/browse/WAS-795) | `POST /api/v1/families/mine/dependents/{childPatientId}/contacts` | Done |
| [WAS-796](https://loaisabir.atlassian.net/browse/WAS-796) | `PATCH /api/v1/families/mine/dependents/{childPatientId}/phone` | Done |
| [WAS-797](https://loaisabir.atlassian.net/browse/WAS-797) | `PUT /api/v1/families/mine/dependents/{childPatientId}/contacts/{contactId}` | Done |
| [WAS-798](https://loaisabir.atlassian.net/browse/WAS-798) | `DELETE /api/v1/families/mine/dependents/{childPatientId}/contacts/{contactId}` | Done |
| [WAS-799](https://loaisabir.atlassian.net/browse/WAS-799) | `PATCH /api/v1/families/mine/dependents/{childPatientId}/profile` | Done |
| [WAS-800](https://loaisabir.atlassian.net/browse/WAS-800) | `POST /api/v1/families/mine/dependents/{childPatientId}/identity-corrections` | Done |
| [WAS-801](https://loaisabir.atlassian.net/browse/WAS-801) | `POST /api/v1/families/mine/governance-cases/{caseId}/resubmit-conflict` | Done |
| [WAS-802](https://loaisabir.atlassian.net/browse/WAS-802) | `GET /api/v1/families/mine/governance-cases` | Done |
| [WAS-803](https://loaisabir.atlassian.net/browse/WAS-803) | `GET /api/v1/families/mine/governance-cases/{caseId}` | Done |
| [WAS-804](https://loaisabir.atlassian.net/browse/WAS-804) | `GET /api/v1/admin/family-governance-cases` | Done |
| [WAS-805](https://loaisabir.atlassian.net/browse/WAS-805) | `GET /api/v1/admin/family-governance-cases/{caseId}` | Done |
| [WAS-806](https://loaisabir.atlassian.net/browse/WAS-806) | `GET /api/v1/admin/family-governance-cases/{caseId}/evidence/{evidenceId}/content` | Done |
| [WAS-807](https://loaisabir.atlassian.net/browse/WAS-807) | `POST /api/v1/admin/family-governance-cases/{caseId}/approve` | Done |
| [WAS-808](https://loaisabir.atlassian.net/browse/WAS-808) | `POST /api/v1/admin/family-governance-cases/{caseId}/reject` | Done |
| [WAS-809](https://loaisabir.atlassian.net/browse/WAS-809) | `POST /api/v1/admin/family-governance-cases/{caseId}/request-modification` | Done |
| [WAS-810](https://loaisabir.atlassian.net/browse/WAS-810) | `POST /api/v1/admin/family-governance-cases/{caseId}/refer-governance` | Done |
| [WAS-811](https://loaisabir.atlassian.net/browse/WAS-811) | `POST /api/v1/families/mine/join-invitations` | Done |
| [WAS-812](https://loaisabir.atlassian.net/browse/WAS-812) | `POST /api/v1/families/mine/join-invitations/revoke` | Done |
| [WAS-813](https://loaisabir.atlassian.net/browse/WAS-813) | `POST /api/v1/families/mine/join-requests` | Done |
| [WAS-814](https://loaisabir.atlassian.net/browse/WAS-814) | `POST /api/v1/families/mine/dependents/{childPatientId}/lab-requests/{requestId}/submissions` | Done |
| [WAS-815](https://loaisabir.atlassian.net/browse/WAS-815) | `POST /api/v1/families/mine/dependents/{childPatientId}/radiology-requests/{requestId}/submissions` | Done |
| [WAS-816](https://loaisabir.atlassian.net/browse/WAS-816) | `GET /api/v1/families/mine/dependents/{childPatientId}/lab-requests/{requestId}/submissions` | Done |
| [WAS-817](https://loaisabir.atlassian.net/browse/WAS-817) | `GET /api/v1/families/mine/dependents/{childPatientId}/radiology-requests/{requestId}/submissions` | Done |
| [WAS-818](https://loaisabir.atlassian.net/browse/WAS-818) | `POST /api/v1/families/mine/dependents/{childPatientId}/lab-requests/{requestId}/submissions/{submissionId}/withdraw` | Done |
| [WAS-819](https://loaisabir.atlassian.net/browse/WAS-819) | `POST /api/v1/families/mine/dependents/{childPatientId}/radiology-requests/{requestId}/submissions/{submissionId}/withdraw` | Done |
| [WAS-820](https://loaisabir.atlassian.net/browse/WAS-820) | `GET /api/v1/families/mine/dependents/{childPatientId}/financial-transactions` | Done |
| [WAS-821](https://loaisabir.atlassian.net/browse/WAS-821) | `GET /api/v1/families/mine/dependents/{childPatientId}/payments/{paymentId}/receipt` | Done |
| [WAS-822](https://loaisabir.atlassian.net/browse/WAS-822) | `GET /api/v1/families/mine/dependents/{childPatientId}/refunds/{refundId}/receipt` | Done |
| [WAS-823](https://loaisabir.atlassian.net/browse/WAS-823) | `GET /api/v1/patients/me/historical-documents` | Done |
| [WAS-824](https://loaisabir.atlassian.net/browse/WAS-824) | `GET /api/v1/patients/me/historical-documents/{documentId}` | Done |
| [WAS-825](https://loaisabir.atlassian.net/browse/WAS-825) | `GET /api/v1/patients/me/historical-documents/{documentId}/versions` | Done |
| [WAS-826](https://loaisabir.atlassian.net/browse/WAS-826) | `POST /api/v1/patients/me/historical-documents` | Done |
| [WAS-827](https://loaisabir.atlassian.net/browse/WAS-827) | `POST /api/v1/patients/me/historical-documents/{documentId}/versions` | Done |
| [WAS-828](https://loaisabir.atlassian.net/browse/WAS-828) | `POST /api/v1/patients/me/historical-documents/{documentId}/withdraw` | Done |
| [WAS-829](https://loaisabir.atlassian.net/browse/WAS-829) | `GET /api/v1/patients/me/historical-documents/{documentId}/attachments/{attachmentId}/content` | Done |
| [WAS-830](https://loaisabir.atlassian.net/browse/WAS-830) | `GET /api/v1/families/mine/dependents/{childPatientId}/historical-documents` | Done |
| [WAS-831](https://loaisabir.atlassian.net/browse/WAS-831) | `GET /api/v1/families/mine/dependents/{childPatientId}/historical-documents/{documentId}` | Done |
| [WAS-832](https://loaisabir.atlassian.net/browse/WAS-832) | `POST /api/v1/families/mine/dependents/{childPatientId}/historical-documents` | Done |
| [WAS-833](https://loaisabir.atlassian.net/browse/WAS-833) | `POST /api/v1/families/mine/dependents/{childPatientId}/historical-documents/{documentId}/versions` | Done |
| [WAS-834](https://loaisabir.atlassian.net/browse/WAS-834) | `POST /api/v1/families/mine/dependents/{childPatientId}/historical-documents/{documentId}/withdraw` | Done |
| [WAS-835](https://loaisabir.atlassian.net/browse/WAS-835) | `GET /api/v1/families/mine/dependents/{childPatientId}/historical-documents/{documentId}/attachments/{attachmentId}/content` | Done |
| [WAS-836](https://loaisabir.atlassian.net/browse/WAS-836) | `POST /api/v1/family-relationship-requests` | Done |
| [WAS-837](https://loaisabir.atlassian.net/browse/WAS-837) | `GET /api/v1/family-relationship-requests/mine` | Done |
| [WAS-838](https://loaisabir.atlassian.net/browse/WAS-838) | `GET /api/v1/family-relationship-requests/{requestId}` | Done |
| [WAS-839](https://loaisabir.atlassian.net/browse/WAS-839) | `GET /api/v1/family-relationship-requests/{requestId}/documents/{documentId}` | Done |
| [WAS-840](https://loaisabir.atlassian.net/browse/WAS-840) | `POST /api/v1/family-relationship-requests/{requestId}/resubmit` | Done |
| [WAS-841](https://loaisabir.atlassian.net/browse/WAS-841) | `POST /api/v1/family-relationship-requests/assisted` | Done |
| [WAS-842](https://loaisabir.atlassian.net/browse/WAS-842) | `GET /api/v1/family-relationship-requests/assisted` | Done |
| [WAS-843](https://loaisabir.atlassian.net/browse/WAS-843) | `GET /api/v1/family-relationship-requests/assisted/{requestId}` | Done |
| [WAS-844](https://loaisabir.atlassian.net/browse/WAS-844) | `GET /api/v1/family-relationship-requests/assisted/{requestId}/documents/{documentId}` | Done |
| [WAS-845](https://loaisabir.atlassian.net/browse/WAS-845) | `POST /api/v1/family-relationship-requests/assisted/{requestId}/resubmit` | Done |
| [WAS-846](https://loaisabir.atlassian.net/browse/WAS-846) | `GET /api/v1/admin/family-relationship-requests` | Done |
| [WAS-847](https://loaisabir.atlassian.net/browse/WAS-847) | `GET /api/v1/admin/family-relationship-requests/{requestId}` | Done |
| [WAS-848](https://loaisabir.atlassian.net/browse/WAS-848) | `GET /api/v1/admin/family-relationship-requests/{requestId}/documents/{documentId}` | Done |
| [WAS-849](https://loaisabir.atlassian.net/browse/WAS-849) | `POST /api/v1/admin/family-relationship-requests/{requestId}/approve` | Done |
| [WAS-850](https://loaisabir.atlassian.net/browse/WAS-850) | `GET /api/v1/reservations/bookable-patients` | Done |
| [WAS-851](https://loaisabir.atlassian.net/browse/WAS-851) | `POST /api/v1/reservations` | Done |
| [WAS-852](https://loaisabir.atlassian.net/browse/WAS-852) | `GET /api/v1/reservations/mine` | Done |
| [WAS-853](https://loaisabir.atlassian.net/browse/WAS-853) | `GET /api/v1/reservations/mine/{reservationId}` | Done |
| [WAS-854](https://loaisabir.atlassian.net/browse/WAS-854) | `POST /api/v1/reservations/mine/{reservationId}/cancel` | Done |
| [WAS-855](https://loaisabir.atlassian.net/browse/WAS-855) | `GET /api/v1/reservations/mine/{reservationId}/reschedule/available-dates` | Done |
| [WAS-856](https://loaisabir.atlassian.net/browse/WAS-856) | `GET /api/v1/reservations/mine/{reservationId}/reschedule/available-slots` | Done |
| [WAS-857](https://loaisabir.atlassian.net/browse/WAS-857) | `POST /api/v1/reservations/mine/{reservationId}/reschedule` | Done |
| [WAS-858](https://loaisabir.atlassian.net/browse/WAS-858) | `GET /api/v1/reservations/mine/archived` | Done |
| [WAS-859](https://loaisabir.atlassian.net/browse/WAS-859) | `GET /api/v1/reservations/mine/archived/patients/options` | Done |
| [WAS-860](https://loaisabir.atlassian.net/browse/WAS-860) | `GET /api/v1/patients/me/medical-record/overview` | Done |
| [WAS-861](https://loaisabir.atlassian.net/browse/WAS-861) | `GET /api/v1/patients/me/medical-record/timeline` | Done |
| [WAS-862](https://loaisabir.atlassian.net/browse/WAS-862) | `GET /api/v1/families/mine/dependents/{dependentPatientId}/medical-record/overview` | Done |
| [WAS-863](https://loaisabir.atlassian.net/browse/WAS-863) | `GET /api/v1/families/mine/dependents/{dependentPatientId}/medical-record/timeline` | Done |

Remaining non-endpoint tickets: [WAS-632](https://loaisabir.atlassian.net/browse/WAS-632), [WAS-641](https://loaisabir.atlassian.net/browse/WAS-641), [WAS-642](https://loaisabir.atlassian.net/browse/WAS-642), [WAS-643](https://loaisabir.atlassian.net/browse/WAS-643), [WAS-644](https://loaisabir.atlassian.net/browse/WAS-644), [WAS-645](https://loaisabir.atlassian.net/browse/WAS-645), [WAS-646](https://loaisabir.atlassian.net/browse/WAS-646), [WAS-647](https://loaisabir.atlassian.net/browse/WAS-647), [WAS-648](https://loaisabir.atlassian.net/browse/WAS-648), [WAS-649](https://loaisabir.atlassian.net/browse/WAS-649), [WAS-650](https://loaisabir.atlassian.net/browse/WAS-650), [WAS-651](https://loaisabir.atlassian.net/browse/WAS-651), [WAS-652](https://loaisabir.atlassian.net/browse/WAS-652), [WAS-653](https://loaisabir.atlassian.net/browse/WAS-653), [WAS-654](https://loaisabir.atlassian.net/browse/WAS-654), [WAS-655](https://loaisabir.atlassian.net/browse/WAS-655), [WAS-656](https://loaisabir.atlassian.net/browse/WAS-656), [WAS-657](https://loaisabir.atlassian.net/browse/WAS-657), [WAS-658](https://loaisabir.atlassian.net/browse/WAS-658), [WAS-659](https://loaisabir.atlassian.net/browse/WAS-659), [WAS-660](https://loaisabir.atlassian.net/browse/WAS-660), [WAS-661](https://loaisabir.atlassian.net/browse/WAS-661), [WAS-662](https://loaisabir.atlassian.net/browse/WAS-662), [WAS-663](https://loaisabir.atlassian.net/browse/WAS-663), [WAS-664](https://loaisabir.atlassian.net/browse/WAS-664), [WAS-665](https://loaisabir.atlassian.net/browse/WAS-665), [WAS-681](https://loaisabir.atlassian.net/browse/WAS-681), [WAS-773](https://loaisabir.atlassian.net/browse/WAS-773), [WAS-774](https://loaisabir.atlassian.net/browse/WAS-774).

---
# Wasla API integration delivery — 2026-11-08

## Result

- Original board 34 To Do snapshot: **212 tickets**.
- **94 tickets moved to Done**. Each transition returned `statusName: Done`; timestamps and route evidence are retained in [the delivery status JSON](api-integration-status-2026-11-08.json).
- **118 original tickets remain open**, grouped below. This delivery does not claim all To Do work is complete.
- API base URL remains `https://doctorapi.runasp.net`; environment configuration was preserved.

## Implementation

- Reviewed existing endpoint clients and consumers against Jira requirements and backend source; retained working bindings and corrected mismatches.
- Added typed family workspace, candidate/intake, identity correction, governance, invitation, operational authority, dependent profile/contact/ticket/finance and diagnostic submission contracts. Multipart names, opaque references, row versions and idempotency keys follow the source handoff.
- Replaced the old family page with workspace-driven drawers and independently gated capabilities. Added child details, family intake, admin review, own medical-record timeline and historical-document workflows with Arabic/English copy, mutation toasts and private download handling.
- Historical documents distinguish pending/quarantined/rejected uploads from usable documents, keep own-only version reads scoped correctly and prevent stale scope responses from replacing the active child.
- Corrected subscription contract selection/revalidation and server-owned plan descriptions, reception account-state permission/capacity handling, selected-patient booking/list context, and anonymous practice logo rendering with fallback.
- Removed obsolete family markup/styles/translations and obsolete subscription marketing models instead of stacking replacements.

## Deployment and acceptance limits

- Backend reference commit: `c04403a1d5cbefeb99d5f595a4317a05de40541d` in [the backend repository](https://github.com/LoaiSaberC4r/Wasla). PR37 subscription and PR38 family/document handoffs were inspected.
- The deployed OpenAPI document exposed 568 paths during inspection. It does not expose the 61 new WAS-775–WAS-835 operations; for example `/api/v1/families/mine/workspace` and the new historical-document routes are absent. These features need the matching backend deployment.
- WAS-836–WAS-863 concern changes to existing routes. Old route availability does not establish deployment of the revised PR38 behavior.
- Diagnostic submission summaries do not provide the rowVersion required to withdraw an older submission. The UI only withdraws a submission for which the create receipt supplied the version; it does not invent one.
- No production patient, billing, subscription or document mutations were performed. Browser acceptance used intercepted synthetic responses. Authenticated role, storage, antivirus/quarantine, payment and full journey acceptance remains required.
- The static contract audit is supporting route evidence only: it does not prove payload, authorization or runtime correctness. Dynamic-helper scanner omissions for WAS-826/832/852/854/857 are covered by HTTP contract tests, rather than treated as missing clients.

## Validation

- Production build passed after the final code changes; existing initial bundle and finance/queue CSS budget warnings remain. Budgets were not relaxed.
- `npx tsc --noEmit -p tsconfig.spec.json` passed.
- HTTP contract suite: 65 tests passed across 3 files. Workflow suite: 197 tests passed across 29 files. Later regression suite: 180 tests passed across 18 files. These runs overlap and must not be added as a unique total.
- The broader 60-file run had 546 passing tests and one newly exposed duplicate reservation list request. That request was fixed and the affected regression suite passed. The complete repository suite is not claimed green; baseline route/access/navigation failures were observed separately.
- Final public discovery suite: 15 tests passed, including logo fallback. Final family/diagnostic checks after the last state-reset changes: 10 tests passed across 2 files.
- Browser checks covered family, own medical record and admin family review in English at 1440px and Arabic at 390px: six combinations passed, including drawer behavior and horizontal overflow checks. No application runtime errors were captured; extension-origin errors were recorded separately.
- Repository-wide architecture/i18n checks still report pre-existing violations. New component strings were checked in both languages; global cleanliness is not claimed.
- Local verification artifacts are in ignored `.tmp/jira-*.log` and `.tmp/jira-browser-evidence/`; they are not committed deliverables. `git diff --check` passed.

## Confirmed Done tickets

| Ticket | Method and route | Frontend binding | Jira confirmation |
| --- | --- | --- | --- |
| [WAS-635](https://loaisabir.atlassian.net/browse/WAS-635) | `GET /api/v1/doctors/me/patients/{patientId}/attendances` | [src/app/domains/doctor-patients/doctor-patients-api.ts:68](../src/app/domains/doctor-patients/doctor-patients-api.ts#L68) | Done — 2026-11-08T18:45:27.675+0200 |
| [WAS-637](https://loaisabir.atlassian.net/browse/WAS-637) | `GET /api/v1/doctors/me/patients/{patientId}/prescriptions` | [src/app/domains/doctor-patients/doctor-patients-api.ts:88](../src/app/domains/doctor-patients/doctor-patients-api.ts#L88) | Done — 2026-11-08T18:45:49.981+0200 |
| [WAS-638](https://loaisabir.atlassian.net/browse/WAS-638) | `GET /api/v1/doctors/me/patients/{patientId}/appointments` | [src/app/domains/doctor-patients/doctor-patients-api.ts:98](../src/app/domains/doctor-patients/doctor-patients-api.ts#L98) | Done — 2026-11-08T18:45:52.479+0200 |
| [WAS-639](https://loaisabir.atlassian.net/browse/WAS-639) | `GET /api/v1/doctors/me/patients/{patientId}/follow-ups` | [src/app/domains/doctor-patients/doctor-patients-api.ts:108](../src/app/domains/doctor-patients/doctor-patients-api.ts#L108), [src/app/domains/diagnostics/diagnostics-api.ts:99](../src/app/domains/diagnostics/diagnostics-api.ts#L99), [src/app/domains/diagnostics/diagnostics-api.ts:127](../src/app/domains/diagnostics/diagnostics-api.ts#L127), [src/app/domains/diagnostics/diagnostics-api.ts:148](../src/app/domains/diagnostics/diagnostics-api.ts#L148) | Done — 2026-11-08T18:45:55.104+0200 |
| [WAS-640](https://loaisabir.atlassian.net/browse/WAS-640) | `GET /api/v1/doctors/me/prescriptions/{prescriptionId}/versions/{versionNumber}/pdf` | [src/app/domains/prescriptions/prescriptions-api.ts:66](../src/app/domains/prescriptions/prescriptions-api.ts#L66) | Done — 2026-11-08T18:45:57.522+0200 |
| [WAS-682](https://loaisabir.atlassian.net/browse/WAS-682) | `POST /api/v1/auth/doctors/register` | [src/app/core/auth/auth-api.ts:56](../src/app/core/auth/auth-api.ts#L56) | Done — 2026-11-08T18:46:01.267+0200 |
| [WAS-683](https://loaisabir.atlassian.net/browse/WAS-683) | `GET /api/v1/public/commercial/catalog` | [src/app/domains/subscriptions/subscriptions-api.ts:174](../src/app/domains/subscriptions/subscriptions-api.ts#L174) | Done — 2026-11-08T18:46:04.500+0200 |
| [WAS-684](https://loaisabir.atlassian.net/browse/WAS-684) | `GET /api/v1/doctors/me/subscription` | [src/app/domains/subscriptions/subscriptions-api.ts:179](../src/app/domains/subscriptions/subscriptions-api.ts#L179) | Done — 2026-11-08T18:46:07.275+0200 |
| [WAS-685](https://loaisabir.atlassian.net/browse/WAS-685) | `GET /api/v1/doctors/me/subscriptions` | [src/app/domains/subscriptions/subscriptions-api.ts:39](../src/app/domains/subscriptions/subscriptions-api.ts#L39) | Done — 2026-11-08T18:46:10.049+0200 |
| [WAS-686](https://loaisabir.atlassian.net/browse/WAS-686) | `GET /api/v1/doctors/me/subscriptions/{contractId}` | [src/app/domains/subscriptions/subscriptions-api.ts:39](../src/app/domains/subscriptions/subscriptions-api.ts#L39) | Done — 2026-11-08T18:46:12.524+0200 |
| [WAS-687](https://loaisabir.atlassian.net/browse/WAS-687) | `GET /api/v1/doctors/me/subscriptions/trial/eligibility` | [src/app/domains/subscriptions/subscriptions-api.ts:49](../src/app/domains/subscriptions/subscriptions-api.ts#L49) | Done — 2026-11-08T18:46:15.068+0200 |
| [WAS-688](https://loaisabir.atlassian.net/browse/WAS-688) | `POST /api/v1/doctors/me/subscriptions/trial/activate` | [src/app/domains/subscriptions/subscriptions-api.ts:56](../src/app/domains/subscriptions/subscriptions-api.ts#L56) | Done — 2026-11-08T18:46:17.655+0200 |
| [WAS-689](https://loaisabir.atlassian.net/browse/WAS-689) | `POST /api/v1/doctors/me/subscriptions/selection` | [src/app/domains/subscriptions/subscriptions-api.ts:61](../src/app/domains/subscriptions/subscriptions-api.ts#L61) | Done — 2026-11-08T18:46:20.295+0200 |
| [WAS-690](https://loaisabir.atlassian.net/browse/WAS-690) | `POST /api/v1/doctors/me/subscription/selection` | [src/app/domains/subscriptions/subscriptions-api.ts:182](../src/app/domains/subscriptions/subscriptions-api.ts#L182) | Done — 2026-11-08T18:46:22.905+0200 |
| [WAS-691](https://loaisabir.atlassian.net/browse/WAS-691) | `POST /api/v1/doctors/me/subscriptions/{contractId}/change-requests` | [src/app/domains/subscriptions/subscriptions-api.ts:70](../src/app/domains/subscriptions/subscriptions-api.ts#L70) | Done — 2026-11-08T18:46:25.335+0200 |
| [WAS-692](https://loaisabir.atlassian.net/browse/WAS-692) | `POST /api/v1/doctors/me/subscription/change-requests` | [src/app/domains/subscriptions/subscriptions-api.ts:187](../src/app/domains/subscriptions/subscriptions-api.ts#L187) | Done — 2026-11-08T18:46:27.865+0200 |
| [WAS-693](https://loaisabir.atlassian.net/browse/WAS-693) | `POST /api/v1/doctors/me/subscriptions/{contractId}/cancel-at-period-end` | [src/app/domains/subscriptions/subscriptions-api.ts:84](../src/app/domains/subscriptions/subscriptions-api.ts#L84) | Done — 2026-11-08T18:46:30.287+0200 |
| [WAS-694](https://loaisabir.atlassian.net/browse/WAS-694) | `POST /api/v1/doctors/me/subscription/cancel-at-period-end` | [src/app/domains/subscriptions/subscriptions-api.ts:195](../src/app/domains/subscriptions/subscriptions-api.ts#L195) | Done — 2026-11-08T18:46:32.848+0200 |
| [WAS-695](https://loaisabir.atlassian.net/browse/WAS-695) | `GET /api/v1/doctors/me/subscriptions/{contractId}/renewal-preview` | [src/app/domains/subscriptions/subscriptions-api.ts:141](../src/app/domains/subscriptions/subscriptions-api.ts#L141), [src/app/domains/diagnostics/diagnostics-api.ts:99](../src/app/domains/diagnostics/diagnostics-api.ts#L99), [src/app/domains/diagnostics/diagnostics-api.ts:127](../src/app/domains/diagnostics/diagnostics-api.ts#L127), [src/app/domains/diagnostics/diagnostics-api.ts:148](../src/app/domains/diagnostics/diagnostics-api.ts#L148) | Done — 2026-11-08T18:46:35.188+0200 |
| [WAS-696](https://loaisabir.atlassian.net/browse/WAS-696) | `POST /api/v1/doctors/me/subscriptions/{contractId}/renewal-selection` | [src/app/domains/subscriptions/subscriptions-api.ts:157](../src/app/domains/subscriptions/subscriptions-api.ts#L157) | Done — 2026-11-08T18:46:37.707+0200 |
| [WAS-697](https://loaisabir.atlassian.net/browse/WAS-697) | `PUT /api/v1/doctors/me/practices/{practiceId}/booking-presentation/price` | [src/app/domains/doctor-practices/doctor-practices-api.ts:245](../src/app/domains/doctor-practices/doctor-practices-api.ts#L245) | Done — 2026-11-08T18:46:40.152+0200 |
| [WAS-698](https://loaisabir.atlassian.net/browse/WAS-698) | `PUT /api/v1/doctors/me/receptions/{receptionId}/account-state` | [src/app/features/doctor-receptions/services/doctor-receptions-api.ts:33](../src/app/features/doctor-receptions/services/doctor-receptions-api.ts#L33) | Done — 2026-11-08T18:46:42.544+0200 |
| [WAS-699](https://loaisabir.atlassian.net/browse/WAS-699) | `POST /api/v1/doctors/me/receptions` | [src/app/features/doctor-receptions/services/doctor-receptions-api.ts:30](../src/app/features/doctor-receptions/services/doctor-receptions-api.ts#L30) | Done — 2026-11-08T18:46:44.916+0200 |
| [WAS-700](https://loaisabir.atlassian.net/browse/WAS-700) | `POST /api/v1/doctors/me/receptions/{receptionId}/assignments` | [src/app/features/doctor-receptions/services/doctor-receptions-api.ts:39](../src/app/features/doctor-receptions/services/doctor-receptions-api.ts#L39) | Done — 2026-11-08T18:46:47.333+0200 |
| [WAS-701](https://loaisabir.atlassian.net/browse/WAS-701) | `PUT /api/v1/doctors/me/receptions/{receptionId}/assignments/{assignmentId}` | [src/app/features/doctor-receptions/services/doctor-receptions-api.ts:49](../src/app/features/doctor-receptions/services/doctor-receptions-api.ts#L49) | Done — 2026-11-08T18:46:49.733+0200 |
| [WAS-702](https://loaisabir.atlassian.net/browse/WAS-702) | `POST /api/v1/doctors/me/receptions/{receptionId}/assignments/{assignmentId}/activate` | [src/app/features/doctor-receptions/services/doctor-receptions-api.ts:59](../src/app/features/doctor-receptions/services/doctor-receptions-api.ts#L59) | Done — 2026-11-08T18:46:52.159+0200 |
| [WAS-703](https://loaisabir.atlassian.net/browse/WAS-703) | `POST /api/v1/doctors/me/receptions/{receptionId}/assignments/{assignmentId}/deactivate` | [src/app/features/doctor-receptions/services/doctor-receptions-api.ts:69](../src/app/features/doctor-receptions/services/doctor-receptions-api.ts#L69) | Done — 2026-11-08T18:46:54.732+0200 |
| [WAS-704](https://loaisabir.atlassian.net/browse/WAS-704) | `GET /api/v1/doctors/me/receptions` | [src/app/domains/subscriptions/subscriptions-api.ts:170](../src/app/domains/subscriptions/subscriptions-api.ts#L170), [src/app/features/doctor-receptions/services/doctor-receptions-api.ts:21](../src/app/features/doctor-receptions/services/doctor-receptions-api.ts#L21) | Done — 2026-11-08T18:46:57.261+0200 |
| [WAS-705](https://loaisabir.atlassian.net/browse/WAS-705) | `GET /api/v1/doctors/me/receptions/{receptionId}` | [src/app/features/doctor-receptions/services/doctor-receptions-api.ts:27](../src/app/features/doctor-receptions/services/doctor-receptions-api.ts#L27) | Done — 2026-11-08T18:46:59.734+0200 |
| [WAS-706](https://loaisabir.atlassian.net/browse/WAS-706) | `GET /api/v1/reception/practices` | [src/app/domains/reception-practices/reception-practices-api.ts:17](../src/app/domains/reception-practices/reception-practices-api.ts#L17) | Done — 2026-11-08T18:47:03.749+0200 |
| [WAS-707](https://loaisabir.atlassian.net/browse/WAS-707) | `POST /api/v1/doctors/me/practices` | [src/app/domains/doctor-practices/doctor-practices-api.ts:55](../src/app/domains/doctor-practices/doctor-practices-api.ts#L55) | Done — 2026-11-08T18:47:06.189+0200 |
| [WAS-708](https://loaisabir.atlassian.net/browse/WAS-708) | `GET /api/v1/doctors/me/practices` | [src/app/domains/doctor-practices/doctor-practices-api.ts:43](../src/app/domains/doctor-practices/doctor-practices-api.ts#L43) | Done — 2026-11-08T18:47:21.539+0200 |
| [WAS-709](https://loaisabir.atlassian.net/browse/WAS-709) | `GET /api/v1/doctors/me/practices/{practiceId}` | [src/app/domains/doctor-practices/doctor-practices-api.ts:49](../src/app/domains/doctor-practices/doctor-practices-api.ts#L49) | Done — 2026-11-08T18:47:24.015+0200 |
| [WAS-710](https://loaisabir.atlassian.net/browse/WAS-710) | `GET /api/v1/doctors/me/practices/{practiceId}/subscription-allocation` | [src/app/domains/subscriptions/subscriptions-api.ts:93](../src/app/domains/subscriptions/subscriptions-api.ts#L93), [src/app/domains/diagnostics/diagnostics-api.ts:99](../src/app/domains/diagnostics/diagnostics-api.ts#L99), [src/app/domains/diagnostics/diagnostics-api.ts:127](../src/app/domains/diagnostics/diagnostics-api.ts#L127), [src/app/domains/diagnostics/diagnostics-api.ts:148](../src/app/domains/diagnostics/diagnostics-api.ts#L148) | Done — 2026-11-08T18:47:26.444+0200 |
| [WAS-711](https://loaisabir.atlassian.net/browse/WAS-711) | `POST /api/v1/doctors/me/practices/{practiceId}/subscription-allocation/move` | [src/app/domains/subscriptions/subscriptions-api.ts:112](../src/app/domains/subscriptions/subscriptions-api.ts#L112) | Done — 2026-11-08T18:47:29.801+0200 |
| [WAS-713](https://loaisabir.atlassian.net/browse/WAS-713) | `GET /api/v1/admin/subscriptions` | [src/app/domains/subscriptions/subscriptions-api.ts:204](../src/app/domains/subscriptions/subscriptions-api.ts#L204) | Done — 2026-11-08T18:47:32.328+0200 |
| [WAS-714](https://loaisabir.atlassian.net/browse/WAS-714) | `GET /api/v1/admin/subscriptions/{subscriptionId}` | [src/app/domains/subscriptions/subscriptions-api.ts:209](../src/app/domains/subscriptions/subscriptions-api.ts#L209) | Done — 2026-11-08T18:47:34.729+0200 |
| [WAS-715](https://loaisabir.atlassian.net/browse/WAS-715) | `POST /api/v1/admin/subscriptions/{subscriptionId}/activate` | [src/app/domains/subscriptions/subscriptions-api.ts:216](../src/app/domains/subscriptions/subscriptions-api.ts#L216) | Done — 2026-11-08T18:47:37.139+0200 |
| [WAS-716](https://loaisabir.atlassian.net/browse/WAS-716) | `POST /api/v1/admin/subscriptions/{subscriptionId}/trial-extend` | [src/app/domains/subscriptions/subscriptions-api.ts:228](../src/app/domains/subscriptions/subscriptions-api.ts#L228) | Done — 2026-11-08T18:47:39.760+0200 |
| [WAS-717](https://loaisabir.atlassian.net/browse/WAS-717) | `POST /api/v1/admin/subscriptions/{subscriptionId}/change-requests/{requestId}/approve` | [src/app/domains/subscriptions/subscriptions-api.ts:238](../src/app/domains/subscriptions/subscriptions-api.ts#L238), [src/app/domains/diagnostics/diagnostics-api.ts:121](../src/app/domains/diagnostics/diagnostics-api.ts#L121) | Done — 2026-11-08T18:47:42.484+0200 |
| [WAS-718](https://loaisabir.atlassian.net/browse/WAS-718) | `POST /api/v1/admin/subscriptions/{subscriptionId}/change-requests/{requestId}/reject` | [src/app/domains/subscriptions/subscriptions-api.ts:251](../src/app/domains/subscriptions/subscriptions-api.ts#L251), [src/app/domains/diagnostics/diagnostics-api.ts:121](../src/app/domains/diagnostics/diagnostics-api.ts#L121), [src/app/domains/diagnostics/diagnostics-api.ts:185](../src/app/domains/diagnostics/diagnostics-api.ts#L185) | Done — 2026-11-08T18:47:45.313+0200 |
| [WAS-719](https://loaisabir.atlassian.net/browse/WAS-719) | `POST /api/v1/admin/subscriptions/{subscriptionId}/renew` | [src/app/domains/subscriptions/subscriptions-api.ts:260](../src/app/domains/subscriptions/subscriptions-api.ts#L260) | Done — 2026-11-08T18:47:47.690+0200 |
| [WAS-720](https://loaisabir.atlassian.net/browse/WAS-720) | `POST /api/v1/admin/subscriptions/legacy-transition/enroll` | [src/app/domains/subscriptions/subscriptions-api.ts:269](../src/app/domains/subscriptions/subscriptions-api.ts#L269) | Done — 2026-11-08T18:47:50.501+0200 |
| [WAS-721](https://loaisabir.atlassian.net/browse/WAS-721) | `GET /api/v1/public/doctors` | [src/app/domains/public-discovery/public-discovery-api.ts:38](../src/app/domains/public-discovery/public-discovery-api.ts#L38) | Done — 2026-11-08T18:47:52.944+0200 |
| [WAS-722](https://loaisabir.atlassian.net/browse/WAS-722) | `GET /api/v1/public/doctors/{doctorId}` | [src/app/domains/public-discovery/public-discovery-api.ts:49](../src/app/domains/public-discovery/public-discovery-api.ts#L49) | Done — 2026-11-08T18:47:55.746+0200 |
| [WAS-723](https://loaisabir.atlassian.net/browse/WAS-723) | `GET /api/v1/public/practices/{practiceId}/available-dates` | [src/app/domains/public-discovery/public-discovery-api.ts:59](../src/app/domains/public-discovery/public-discovery-api.ts#L59), [src/app/domains/diagnostics/diagnostics-api.ts:99](../src/app/domains/diagnostics/diagnostics-api.ts#L99), [src/app/domains/diagnostics/diagnostics-api.ts:127](../src/app/domains/diagnostics/diagnostics-api.ts#L127), [src/app/domains/diagnostics/diagnostics-api.ts:148](../src/app/domains/diagnostics/diagnostics-api.ts#L148) | Done — 2026-11-08T18:47:58.837+0200 |
| [WAS-724](https://loaisabir.atlassian.net/browse/WAS-724) | `GET /api/v1/public/practices/{practiceId}/available-slots` | [src/app/domains/public-discovery/public-discovery-api.ts:62](../src/app/domains/public-discovery/public-discovery-api.ts#L62), [src/app/domains/diagnostics/diagnostics-api.ts:99](../src/app/domains/diagnostics/diagnostics-api.ts#L99), [src/app/domains/diagnostics/diagnostics-api.ts:127](../src/app/domains/diagnostics/diagnostics-api.ts#L127), [src/app/domains/diagnostics/diagnostics-api.ts:148](../src/app/domains/diagnostics/diagnostics-api.ts#L148) | Done — 2026-11-08T18:48:01.668+0200 |
| [WAS-725](https://loaisabir.atlassian.net/browse/WAS-725) | `GET /api/v1/public/practices/{practiceId}/booking-options` | [src/app/domains/public-discovery/public-discovery-api.ts:67](../src/app/domains/public-discovery/public-discovery-api.ts#L67), [src/app/domains/diagnostics/diagnostics-api.ts:99](../src/app/domains/diagnostics/diagnostics-api.ts#L99), [src/app/domains/diagnostics/diagnostics-api.ts:127](../src/app/domains/diagnostics/diagnostics-api.ts#L127), [src/app/domains/diagnostics/diagnostics-api.ts:148](../src/app/domains/diagnostics/diagnostics-api.ts#L148) | Done — 2026-11-08T18:48:04.183+0200 |
| [WAS-726](https://loaisabir.atlassian.net/browse/WAS-726) | `GET /api/v1/public/practices/{practiceId}/logo` | [src/app/domains/public-discovery/public-discovery-api.ts:28](../src/app/domains/public-discovery/public-discovery-api.ts#L28) | Done — 2026-11-08T18:48:06.785+0200 |
| [WAS-728](https://loaisabir.atlassian.net/browse/WAS-728) | `GET /api/v1/reception/practices/{practiceId}/booking/available-dates` | [src/app/domains/reservations/reservations-api.ts:97](../src/app/domains/reservations/reservations-api.ts#L97), [src/app/domains/diagnostics/diagnostics-api.ts:99](../src/app/domains/diagnostics/diagnostics-api.ts#L99), [src/app/domains/diagnostics/diagnostics-api.ts:127](../src/app/domains/diagnostics/diagnostics-api.ts#L127), [src/app/domains/diagnostics/diagnostics-api.ts:148](../src/app/domains/diagnostics/diagnostics-api.ts#L148) | Done — 2026-11-08T18:48:09.193+0200 |
| [WAS-729](https://loaisabir.atlassian.net/browse/WAS-729) | `GET /api/v1/reception/practices/{practiceId}/booking/available-slots` | [src/app/domains/reservations/reservations-api.ts:107](../src/app/domains/reservations/reservations-api.ts#L107), [src/app/domains/diagnostics/diagnostics-api.ts:99](../src/app/domains/diagnostics/diagnostics-api.ts#L99), [src/app/domains/diagnostics/diagnostics-api.ts:127](../src/app/domains/diagnostics/diagnostics-api.ts#L127), [src/app/domains/diagnostics/diagnostics-api.ts:148](../src/app/domains/diagnostics/diagnostics-api.ts#L148) | Done — 2026-11-08T18:48:11.693+0200 |
| [WAS-730](https://loaisabir.atlassian.net/browse/WAS-730) | `GET /api/v1/reception/practices/{practiceId}/booking/options` | [src/app/domains/reservations/reservations-api.ts:118](../src/app/domains/reservations/reservations-api.ts#L118) | Done — 2026-11-08T18:48:14.112+0200 |
| [WAS-731](https://loaisabir.atlassian.net/browse/WAS-731) | `POST /api/v1/reception/practices/{practiceId}/reservations` | [src/app/domains/reservations/reservations-api.ts:85](../src/app/domains/reservations/reservations-api.ts#L85) | Done — 2026-11-08T18:48:16.666+0200 |
| [WAS-732](https://loaisabir.atlassian.net/browse/WAS-732) | `GET /api/v1/doctors/me/practices/{practiceId}/reservations` | [src/app/domains/reservations/reservations-api.ts:43](../src/app/domains/reservations/reservations-api.ts#L43) | Done — 2026-11-08T18:48:19.149+0200 |
| [WAS-733](https://loaisabir.atlassian.net/browse/WAS-733) | `GET /api/v1/reception/practices/{practiceId}/reservations` | [src/app/domains/reservations/reservations-api.ts:43](../src/app/domains/reservations/reservations-api.ts#L43) | Done — 2026-11-08T18:48:21.721+0200 |
| [WAS-734](https://loaisabir.atlassian.net/browse/WAS-734) | `POST /api/v1/practices/{practiceId}/reservations/{reservationId}/check-in` | [src/app/domains/tickets/tickets-api.ts:31](../src/app/domains/tickets/tickets-api.ts#L31) | Done — 2026-11-08T18:48:24.144+0200 |
| [WAS-735](https://loaisabir.atlassian.net/browse/WAS-735) | `POST /api/v1/practices/{practiceId}/reservations/{reservationId}/force-check-in` | [src/app/domains/tickets/tickets-api.ts:46](../src/app/domains/tickets/tickets-api.ts#L46) | Done — 2026-11-08T18:48:26.596+0200 |
| [WAS-736](https://loaisabir.atlassian.net/browse/WAS-736) | `POST /api/v1/practices/{practiceId}/tickets/walk-in` | [src/app/domains/tickets/tickets-api.ts:60](../src/app/domains/tickets/tickets-api.ts#L60) | Done — 2026-11-08T18:48:29.051+0200 |
| [WAS-737](https://loaisabir.atlassian.net/browse/WAS-737) | `GET /api/v1/practices/{practiceId}/queue` | [src/app/domains/tickets/tickets-api.ts:77](../src/app/domains/tickets/tickets-api.ts#L77) | Done — 2026-11-08T18:48:31.761+0200 |
| [WAS-738](https://loaisabir.atlassian.net/browse/WAS-738) | `PUT /api/v1/doctors/me/practices/{practiceId}` | [src/app/domains/doctor-practices/doctor-practices-api.ts:59](../src/app/domains/doctor-practices/doctor-practices-api.ts#L59) | Done — 2026-11-08T18:48:34.515+0200 |
| [WAS-739](https://loaisabir.atlassian.net/browse/WAS-739) | `POST /api/v1/doctors/me/practices/{practiceId}/activate` | [src/app/domains/doctor-practices/doctor-practices-api.ts:65](../src/app/domains/doctor-practices/doctor-practices-api.ts#L65) | Done — 2026-11-08T18:48:37.350+0200 |
| [WAS-740](https://loaisabir.atlassian.net/browse/WAS-740) | `POST /api/v1/doctors/me/practices/{practiceId}/deactivate` | [src/app/domains/doctor-practices/doctor-practices-api.ts:71](../src/app/domains/doctor-practices/doctor-practices-api.ts#L71) | Done — 2026-11-08T18:49:19.064+0200 |
| [WAS-741](https://loaisabir.atlassian.net/browse/WAS-741) | `GET /api/v1/doctors/me/practices/{practiceId}/configuration` | [src/app/domains/doctor-practices/doctor-practices-api.ts:77](../src/app/domains/doctor-practices/doctor-practices-api.ts#L77) | Done — 2026-11-08T18:49:21.596+0200 |
| [WAS-742](https://loaisabir.atlassian.net/browse/WAS-742) | `PUT /api/v1/doctors/me/practices/{practiceId}/configuration` | [src/app/domains/doctor-practices/doctor-practices-api.ts:86](../src/app/domains/doctor-practices/doctor-practices-api.ts#L86) | Done — 2026-11-08T18:49:24.206+0200 |
| [WAS-743](https://loaisabir.atlassian.net/browse/WAS-743) | `GET /api/v1/doctors/me/practices/{practiceId}/branding` | [src/app/domains/doctor-practices/doctor-practices-api.ts:93](../src/app/domains/doctor-practices/doctor-practices-api.ts#L93) | Done — 2026-11-08T18:49:26.665+0200 |
| [WAS-744](https://loaisabir.atlassian.net/browse/WAS-744) | `PUT /api/v1/doctors/me/practices/{practiceId}/branding` | [src/app/domains/doctor-practices/doctor-practices-api.ts:110](../src/app/domains/doctor-practices/doctor-practices-api.ts#L110) | Done — 2026-11-08T18:49:29.363+0200 |
| [WAS-745](https://loaisabir.atlassian.net/browse/WAS-745) | `GET /api/v1/doctors/me/practices/{practiceId}/branding/logo` | [src/app/domains/doctor-practices/doctor-practices-api.ts:97](../src/app/domains/doctor-practices/doctor-practices-api.ts#L97) | Done — 2026-11-08T18:49:32.018+0200 |
| [WAS-746](https://loaisabir.atlassian.net/browse/WAS-746) | `POST /api/v1/doctors/me/practices/{practiceId}/branding/logo` | [src/app/domains/doctor-practices/doctor-practices-api.ts:120](../src/app/domains/doctor-practices/doctor-practices-api.ts#L120) | Done — 2026-11-08T18:49:34.514+0200 |
| [WAS-747](https://loaisabir.atlassian.net/browse/WAS-747) | `DELETE /api/v1/doctors/me/practices/{practiceId}/branding/logo` | [src/app/domains/doctor-practices/doctor-practices-api.ts:124](../src/app/domains/doctor-practices/doctor-practices-api.ts#L124) | Done — 2026-11-08T18:49:37.031+0200 |
| [WAS-748](https://loaisabir.atlassian.net/browse/WAS-748) | `GET /api/v1/doctors/me/practices/{practiceId}/schedule` | [src/app/domains/doctor-practices/doctor-practices-api.ts:130](../src/app/domains/doctor-practices/doctor-practices-api.ts#L130) | Done — 2026-11-08T18:49:40.896+0200 |
| [WAS-749](https://loaisabir.atlassian.net/browse/WAS-749) | `GET /api/v1/doctors/me/practices/{practiceId}/schedule/effective` | [src/app/domains/doctor-practices/doctor-practices-api.ts:134](../src/app/domains/doctor-practices/doctor-practices-api.ts#L134) | Done — 2026-11-08T18:49:43.429+0200 |
| [WAS-750](https://loaisabir.atlassian.net/browse/WAS-750) | `POST /api/v1/doctors/me/practices/{practiceId}/schedule/periods` | [src/app/domains/doctor-practices/doctor-practices-api.ts:144](../src/app/domains/doctor-practices/doctor-practices-api.ts#L144) | Done — 2026-11-08T18:49:46.494+0200 |
| [WAS-751](https://loaisabir.atlassian.net/browse/WAS-751) | `PUT /api/v1/doctors/me/practices/{practiceId}/schedule/periods/{periodId}` | [src/app/domains/doctor-practices/doctor-practices-api.ts:155](../src/app/domains/doctor-practices/doctor-practices-api.ts#L155) | Done — 2026-11-08T18:49:49.567+0200 |
| [WAS-752](https://loaisabir.atlassian.net/browse/WAS-752) | `DELETE /api/v1/doctors/me/practices/{practiceId}/schedule/periods/{periodId}` | [src/app/domains/doctor-practices/doctor-practices-api.ts:162](../src/app/domains/doctor-practices/doctor-practices-api.ts#L162) | Done — 2026-11-08T18:49:52.629+0200 |
| [WAS-753](https://loaisabir.atlassian.net/browse/WAS-753) | `POST /api/v1/doctors/me/practices/{practiceId}/schedule/exceptions` | [src/app/domains/doctor-practices/doctor-practices-api.ts:172](../src/app/domains/doctor-practices/doctor-practices-api.ts#L172) | Done — 2026-11-08T18:49:55.216+0200 |
| [WAS-754](https://loaisabir.atlassian.net/browse/WAS-754) | `PUT /api/v1/doctors/me/practices/{practiceId}/schedule/exceptions/{exceptionId}` | [src/app/domains/doctor-practices/doctor-practices-api.ts:183](../src/app/domains/doctor-practices/doctor-practices-api.ts#L183) | Done — 2026-11-08T18:49:58.025+0200 |
| [WAS-755](https://loaisabir.atlassian.net/browse/WAS-755) | `DELETE /api/v1/doctors/me/practices/{practiceId}/schedule/exceptions/{exceptionId}` | [src/app/domains/doctor-practices/doctor-practices-api.ts:194](../src/app/domains/doctor-practices/doctor-practices-api.ts#L194) | Done — 2026-11-08T18:50:00.821+0200 |
| [WAS-756](https://loaisabir.atlassian.net/browse/WAS-756) | `GET /api/v1/doctors/me/practices/{practiceId}/segments` | [src/app/domains/doctor-practices/doctor-practices-api.ts:201](../src/app/domains/doctor-practices/doctor-practices-api.ts#L201) | Done — 2026-11-08T18:50:03.795+0200 |
| [WAS-757](https://loaisabir.atlassian.net/browse/WAS-757) | `POST /api/v1/doctors/me/practices/{practiceId}/segments` | [src/app/domains/doctor-practices/doctor-practices-api.ts:208](../src/app/domains/doctor-practices/doctor-practices-api.ts#L208) | Done — 2026-11-08T18:50:06.139+0200 |
| [WAS-758](https://loaisabir.atlassian.net/browse/WAS-758) | `PUT /api/v1/doctors/me/practices/{practiceId}/segments/{segmentId}` | [src/app/domains/doctor-practices/doctor-practices-api.ts:219](../src/app/domains/doctor-practices/doctor-practices-api.ts#L219) | Done — 2026-11-08T18:50:10.811+0200 |
| [WAS-759](https://loaisabir.atlassian.net/browse/WAS-759) | `GET /api/v1/doctors/me/practices/{practiceId}/visit-types` | [src/app/domains/doctor-practices/doctor-practices-api.ts:226](../src/app/domains/doctor-practices/doctor-practices-api.ts#L226), [src/app/domains/diagnostics/diagnostics-api.ts:99](../src/app/domains/diagnostics/diagnostics-api.ts#L99), [src/app/domains/diagnostics/diagnostics-api.ts:127](../src/app/domains/diagnostics/diagnostics-api.ts#L127), [src/app/domains/diagnostics/diagnostics-api.ts:148](../src/app/domains/diagnostics/diagnostics-api.ts#L148) | Done — 2026-11-08T18:50:13.528+0200 |
| [WAS-760](https://loaisabir.atlassian.net/browse/WAS-760) | `PUT /api/v1/doctors/me/practices/{practiceId}/visit-types/{visitTypeId}` | [src/app/domains/doctor-practices/doctor-practices-api.ts:234](../src/app/domains/doctor-practices/doctor-practices-api.ts#L234) | Done — 2026-11-08T18:50:16.079+0200 |
| [WAS-761](https://loaisabir.atlassian.net/browse/WAS-761) | `GET /api/v1/doctors/me/practices/{practiceId}/prices` | [src/app/domains/doctor-practices/doctor-practices-api.ts:241](../src/app/domains/doctor-practices/doctor-practices-api.ts#L241) | Done — 2026-11-08T18:50:18.513+0200 |
| [WAS-762](https://loaisabir.atlassian.net/browse/WAS-762) | `POST /api/v1/doctors/me/practices/{practiceId}/prices` | [src/app/domains/doctor-practices/doctor-practices-api.ts:252](../src/app/domains/doctor-practices/doctor-practices-api.ts#L252) | Done — 2026-11-08T18:50:21.226+0200 |
| [WAS-763](https://loaisabir.atlassian.net/browse/WAS-763) | `PUT /api/v1/doctors/me/practices/{practiceId}/prices/{priceId}` | [src/app/domains/doctor-practices/doctor-practices-api.ts:260](../src/app/domains/doctor-practices/doctor-practices-api.ts#L260) | Done — 2026-11-08T18:50:24.034+0200 |
| [WAS-764](https://loaisabir.atlassian.net/browse/WAS-764) | `DELETE /api/v1/doctors/me/practices/{practiceId}/prices/{priceId}` | [src/app/domains/doctor-practices/doctor-practices-api.ts:267](../src/app/domains/doctor-practices/doctor-practices-api.ts#L267) | Done — 2026-11-08T18:50:26.637+0200 |
| [WAS-765](https://loaisabir.atlassian.net/browse/WAS-765) | `POST /api/v1/admin/doctors/{doctorId}/approve` | [src/app/features/admin/services/admin-doctors/admin-doctors-api.ts:44](../src/app/features/admin/services/admin-doctors/admin-doctors-api.ts#L44) | Done — 2026-11-08T18:50:30.087+0200 |
| [WAS-766](https://loaisabir.atlassian.net/browse/WAS-766) | `GET /api/v1/doctors/me/onboarding` | [src/app/domains/doctors/doctor-api.ts:13](../src/app/domains/doctors/doctor-api.ts#L13) | Done — 2026-11-08T18:50:32.670+0200 |
| [WAS-767](https://loaisabir.atlassian.net/browse/WAS-767) | `GET /api/v1/doctors/me/practice-location` | [src/app/domains/doctor-profile/doctor-profile-api.ts:88](../src/app/domains/doctor-profile/doctor-profile-api.ts#L88), [src/app/domains/diagnostics/diagnostics-api.ts:99](../src/app/domains/diagnostics/diagnostics-api.ts#L99), [src/app/domains/diagnostics/diagnostics-api.ts:127](../src/app/domains/diagnostics/diagnostics-api.ts#L127), [src/app/domains/diagnostics/diagnostics-api.ts:148](../src/app/domains/diagnostics/diagnostics-api.ts#L148) | Done — 2026-11-08T18:50:35.464+0200 |
| [WAS-768](https://loaisabir.atlassian.net/browse/WAS-768) | `PUT /api/v1/doctors/me/practice-location` | [src/app/domains/doctor-profile/doctor-profile-api.ts:96](../src/app/domains/doctor-profile/doctor-profile-api.ts#L96) | Done — 2026-11-08T18:50:37.975+0200 |
| [WAS-769](https://loaisabir.atlassian.net/browse/WAS-769) | `GET /api/v1/public/doctors/{doctorId}/profile-image` | [src/app/domains/diagnostics/diagnostics-api.ts:99](../src/app/domains/diagnostics/diagnostics-api.ts#L99), [src/app/domains/diagnostics/diagnostics-api.ts:127](../src/app/domains/diagnostics/diagnostics-api.ts#L127), [src/app/domains/diagnostics/diagnostics-api.ts:148](../src/app/domains/diagnostics/diagnostics-api.ts#L148) | Done — 2026-11-08T18:50:40.437+0200 |
| [WAS-770](https://loaisabir.atlassian.net/browse/WAS-770) | `GET /api/v1/practices/{practiceId}/tickets/{ticketId}` | [src/app/domains/phase18/phase18-part2-api.ts:19](../src/app/domains/phase18/phase18-part2-api.ts#L19), [src/app/domains/tickets/tickets-api.ts:83](../src/app/domains/tickets/tickets-api.ts#L83), [src/app/domains/tickets/tickets-api.ts:181](../src/app/domains/tickets/tickets-api.ts#L181) | Done — 2026-11-08T18:50:42.885+0200 |
| [WAS-771](https://loaisabir.atlassian.net/browse/WAS-771) | `GET /api/v1/doctors/me/revenue/dashboard` | [src/app/domains/finance/finance-api.ts:145](../src/app/domains/finance/finance-api.ts#L145) | Done — 2026-11-08T18:50:45.473+0200 |
| [WAS-772](https://loaisabir.atlassian.net/browse/WAS-772) | `GET /api/v1/doctors/me/reports/{reportCode}/export` | [src/app/domains/phase18/phase18-api.ts:462](../src/app/domains/phase18/phase18-api.ts#L462) | Done — 2026-11-08T18:50:47.888+0200 |

## Pending: New PR38 routes absent from the deployed API (61)

Frontend contracts/workflows prepared from backend source. Publish PR38 and run authenticated acceptance before Done.

| Ticket | Scope |
| --- | --- |
| [WAS-775](https://loaisabir.atlassian.net/browse/WAS-775) | `GET /api/v1/families/mine/workspace` |
| [WAS-776](https://loaisabir.atlassian.net/browse/WAS-776) | `POST /api/v1/families/patient-candidates/search` |
| [WAS-777](https://loaisabir.atlassian.net/browse/WAS-777) | `POST /api/v1/family-relationship-requests/from-candidate` |
| [WAS-778](https://loaisabir.atlassian.net/browse/WAS-778) | `POST /api/v1/families/mine/child-onboarding` |
| [WAS-779](https://loaisabir.atlassian.net/browse/WAS-779) | `GET /api/v1/families/mine/child-onboarding-requests` |
| [WAS-780](https://loaisabir.atlassian.net/browse/WAS-780) | `GET /api/v1/families/mine/child-onboarding-requests/{requestId}` |
| [WAS-781](https://loaisabir.atlassian.net/browse/WAS-781) | `POST /api/v1/families/mine/child-onboarding-requests/{requestId}/resubmit` |
| [WAS-782](https://loaisabir.atlassian.net/browse/WAS-782) | `GET /api/v1/admin/child-onboarding-requests` |
| [WAS-783](https://loaisabir.atlassian.net/browse/WAS-783) | `GET /api/v1/admin/child-onboarding-requests/{requestId}` |
| [WAS-784](https://loaisabir.atlassian.net/browse/WAS-784) | `GET /api/v1/admin/child-onboarding-requests/{requestId}/evidence/{documentId}/content` |
| [WAS-785](https://loaisabir.atlassian.net/browse/WAS-785) | `POST /api/v1/admin/child-onboarding-requests/{requestId}/approve` |
| [WAS-786](https://loaisabir.atlassian.net/browse/WAS-786) | `POST /api/v1/admin/child-onboarding-requests/{requestId}/reject` |
| [WAS-787](https://loaisabir.atlassian.net/browse/WAS-787) | `POST /api/v1/admin/child-onboarding-requests/{requestId}/request-modification` |
| [WAS-788](https://loaisabir.atlassian.net/browse/WAS-788) | `GET /api/v1/admin/family-operational-authorities` |
| [WAS-789](https://loaisabir.atlassian.net/browse/WAS-789) | `POST /api/v1/admin/family-operational-authorities/{authorityId}/revoke` |
| [WAS-790](https://loaisabir.atlassian.net/browse/WAS-790) | `GET /api/v1/families/mine/dependents/{childPatientId}/profile` |
| [WAS-791](https://loaisabir.atlassian.net/browse/WAS-791) | `GET /api/v1/tickets/dependents/{childPatientId}/active` |
| [WAS-792](https://loaisabir.atlassian.net/browse/WAS-792) | `GET /api/v1/tickets/dependents/{childPatientId}/{ticketId}` |
| [WAS-793](https://loaisabir.atlassian.net/browse/WAS-793) | `GET /api/v1/families/mine/dependents/{childPatientId}/contacts` |
| [WAS-794](https://loaisabir.atlassian.net/browse/WAS-794) | `GET /api/v1/families/mine/dependents/{childPatientId}/profile-image` |
| [WAS-795](https://loaisabir.atlassian.net/browse/WAS-795) | `POST /api/v1/families/mine/dependents/{childPatientId}/contacts` |
| [WAS-796](https://loaisabir.atlassian.net/browse/WAS-796) | `PATCH /api/v1/families/mine/dependents/{childPatientId}/phone` |
| [WAS-797](https://loaisabir.atlassian.net/browse/WAS-797) | `PUT /api/v1/families/mine/dependents/{childPatientId}/contacts/{contactId}` |
| [WAS-798](https://loaisabir.atlassian.net/browse/WAS-798) | `DELETE /api/v1/families/mine/dependents/{childPatientId}/contacts/{contactId}` |
| [WAS-799](https://loaisabir.atlassian.net/browse/WAS-799) | `PATCH /api/v1/families/mine/dependents/{childPatientId}/profile` |
| [WAS-800](https://loaisabir.atlassian.net/browse/WAS-800) | `POST /api/v1/families/mine/dependents/{childPatientId}/identity-corrections` |
| [WAS-801](https://loaisabir.atlassian.net/browse/WAS-801) | `POST /api/v1/families/mine/governance-cases/{caseId}/resubmit-conflict` |
| [WAS-802](https://loaisabir.atlassian.net/browse/WAS-802) | `GET /api/v1/families/mine/governance-cases` |
| [WAS-803](https://loaisabir.atlassian.net/browse/WAS-803) | `GET /api/v1/families/mine/governance-cases/{caseId}` |
| [WAS-804](https://loaisabir.atlassian.net/browse/WAS-804) | `GET /api/v1/admin/family-governance-cases` |
| [WAS-805](https://loaisabir.atlassian.net/browse/WAS-805) | `GET /api/v1/admin/family-governance-cases/{caseId}` |
| [WAS-806](https://loaisabir.atlassian.net/browse/WAS-806) | `GET /api/v1/admin/family-governance-cases/{caseId}/evidence/{evidenceId}/content` |
| [WAS-807](https://loaisabir.atlassian.net/browse/WAS-807) | `POST /api/v1/admin/family-governance-cases/{caseId}/approve` |
| [WAS-808](https://loaisabir.atlassian.net/browse/WAS-808) | `POST /api/v1/admin/family-governance-cases/{caseId}/reject` |
| [WAS-809](https://loaisabir.atlassian.net/browse/WAS-809) | `POST /api/v1/admin/family-governance-cases/{caseId}/request-modification` |
| [WAS-810](https://loaisabir.atlassian.net/browse/WAS-810) | `POST /api/v1/admin/family-governance-cases/{caseId}/refer-governance` |
| [WAS-811](https://loaisabir.atlassian.net/browse/WAS-811) | `POST /api/v1/families/mine/join-invitations` |
| [WAS-812](https://loaisabir.atlassian.net/browse/WAS-812) | `POST /api/v1/families/mine/join-invitations/revoke` |
| [WAS-813](https://loaisabir.atlassian.net/browse/WAS-813) | `POST /api/v1/families/mine/join-requests` |
| [WAS-814](https://loaisabir.atlassian.net/browse/WAS-814) | `POST /api/v1/families/mine/dependents/{childPatientId}/lab-requests/{requestId}/submissions` |
| [WAS-815](https://loaisabir.atlassian.net/browse/WAS-815) | `POST /api/v1/families/mine/dependents/{childPatientId}/radiology-requests/{requestId}/submissions` |
| [WAS-816](https://loaisabir.atlassian.net/browse/WAS-816) | `GET /api/v1/families/mine/dependents/{childPatientId}/lab-requests/{requestId}/submissions` |
| [WAS-817](https://loaisabir.atlassian.net/browse/WAS-817) | `GET /api/v1/families/mine/dependents/{childPatientId}/radiology-requests/{requestId}/submissions` |
| [WAS-818](https://loaisabir.atlassian.net/browse/WAS-818) | `POST /api/v1/families/mine/dependents/{childPatientId}/lab-requests/{requestId}/submissions/{submissionId}/withdraw` |
| [WAS-819](https://loaisabir.atlassian.net/browse/WAS-819) | `POST /api/v1/families/mine/dependents/{childPatientId}/radiology-requests/{requestId}/submissions/{submissionId}/withdraw` |
| [WAS-820](https://loaisabir.atlassian.net/browse/WAS-820) | `GET /api/v1/families/mine/dependents/{childPatientId}/financial-transactions` |
| [WAS-821](https://loaisabir.atlassian.net/browse/WAS-821) | `GET /api/v1/families/mine/dependents/{childPatientId}/payments/{paymentId}/receipt` |
| [WAS-822](https://loaisabir.atlassian.net/browse/WAS-822) | `GET /api/v1/families/mine/dependents/{childPatientId}/refunds/{refundId}/receipt` |
| [WAS-823](https://loaisabir.atlassian.net/browse/WAS-823) | `GET /api/v1/patients/me/historical-documents` |
| [WAS-824](https://loaisabir.atlassian.net/browse/WAS-824) | `GET /api/v1/patients/me/historical-documents/{documentId}` |
| [WAS-825](https://loaisabir.atlassian.net/browse/WAS-825) | `GET /api/v1/patients/me/historical-documents/{documentId}/versions` |
| [WAS-826](https://loaisabir.atlassian.net/browse/WAS-826) | `POST /api/v1/patients/me/historical-documents` |
| [WAS-827](https://loaisabir.atlassian.net/browse/WAS-827) | `POST /api/v1/patients/me/historical-documents/{documentId}/versions` |
| [WAS-828](https://loaisabir.atlassian.net/browse/WAS-828) | `POST /api/v1/patients/me/historical-documents/{documentId}/withdraw` |
| [WAS-829](https://loaisabir.atlassian.net/browse/WAS-829) | `GET /api/v1/patients/me/historical-documents/{documentId}/attachments/{attachmentId}/content` |
| [WAS-830](https://loaisabir.atlassian.net/browse/WAS-830) | `GET /api/v1/families/mine/dependents/{childPatientId}/historical-documents` |
| [WAS-831](https://loaisabir.atlassian.net/browse/WAS-831) | `GET /api/v1/families/mine/dependents/{childPatientId}/historical-documents/{documentId}` |
| [WAS-832](https://loaisabir.atlassian.net/browse/WAS-832) | `POST /api/v1/families/mine/dependents/{childPatientId}/historical-documents` |
| [WAS-833](https://loaisabir.atlassian.net/browse/WAS-833) | `POST /api/v1/families/mine/dependents/{childPatientId}/historical-documents/{documentId}/versions` |
| [WAS-834](https://loaisabir.atlassian.net/browse/WAS-834) | `POST /api/v1/families/mine/dependents/{childPatientId}/historical-documents/{documentId}/withdraw` |
| [WAS-835](https://loaisabir.atlassian.net/browse/WAS-835) | `GET /api/v1/families/mine/dependents/{childPatientId}/historical-documents/{documentId}/attachments/{attachmentId}/content` |

## Pending: Existing routes with PR38 contract/permission changes (28)

Old routes exist, but live route presence does not verify the new DTO, permissions, nullable targets or independent capabilities. Await matching deployment and authenticated acceptance.

| Ticket | Scope |
| --- | --- |
| [WAS-836](https://loaisabir.atlassian.net/browse/WAS-836) | `POST /api/v1/family-relationship-requests` |
| [WAS-837](https://loaisabir.atlassian.net/browse/WAS-837) | `GET /api/v1/family-relationship-requests/mine` |
| [WAS-838](https://loaisabir.atlassian.net/browse/WAS-838) | `GET /api/v1/family-relationship-requests/{requestId}` |
| [WAS-839](https://loaisabir.atlassian.net/browse/WAS-839) | `GET /api/v1/family-relationship-requests/{requestId}/documents/{documentId}` |
| [WAS-840](https://loaisabir.atlassian.net/browse/WAS-840) | `POST /api/v1/family-relationship-requests/{requestId}/resubmit` |
| [WAS-841](https://loaisabir.atlassian.net/browse/WAS-841) | `POST /api/v1/family-relationship-requests/assisted` |
| [WAS-842](https://loaisabir.atlassian.net/browse/WAS-842) | `GET /api/v1/family-relationship-requests/assisted` |
| [WAS-843](https://loaisabir.atlassian.net/browse/WAS-843) | `GET /api/v1/family-relationship-requests/assisted/{requestId}` |
| [WAS-844](https://loaisabir.atlassian.net/browse/WAS-844) | `GET /api/v1/family-relationship-requests/assisted/{requestId}/documents/{documentId}` |
| [WAS-845](https://loaisabir.atlassian.net/browse/WAS-845) | `POST /api/v1/family-relationship-requests/assisted/{requestId}/resubmit` |
| [WAS-846](https://loaisabir.atlassian.net/browse/WAS-846) | `GET /api/v1/admin/family-relationship-requests` |
| [WAS-847](https://loaisabir.atlassian.net/browse/WAS-847) | `GET /api/v1/admin/family-relationship-requests/{requestId}` |
| [WAS-848](https://loaisabir.atlassian.net/browse/WAS-848) | `GET /api/v1/admin/family-relationship-requests/{requestId}/documents/{documentId}` |
| [WAS-849](https://loaisabir.atlassian.net/browse/WAS-849) | `POST /api/v1/admin/family-relationship-requests/{requestId}/approve` |
| [WAS-850](https://loaisabir.atlassian.net/browse/WAS-850) | `GET /api/v1/reservations/bookable-patients` |
| [WAS-851](https://loaisabir.atlassian.net/browse/WAS-851) | `POST /api/v1/reservations` |
| [WAS-852](https://loaisabir.atlassian.net/browse/WAS-852) | `GET /api/v1/reservations/mine` |
| [WAS-853](https://loaisabir.atlassian.net/browse/WAS-853) | `GET /api/v1/reservations/mine/{reservationId}` |
| [WAS-854](https://loaisabir.atlassian.net/browse/WAS-854) | `POST /api/v1/reservations/mine/{reservationId}/cancel` |
| [WAS-855](https://loaisabir.atlassian.net/browse/WAS-855) | `GET /api/v1/reservations/mine/{reservationId}/reschedule/available-dates` |
| [WAS-856](https://loaisabir.atlassian.net/browse/WAS-856) | `GET /api/v1/reservations/mine/{reservationId}/reschedule/available-slots` |
| [WAS-857](https://loaisabir.atlassian.net/browse/WAS-857) | `POST /api/v1/reservations/mine/{reservationId}/reschedule` |
| [WAS-858](https://loaisabir.atlassian.net/browse/WAS-858) | `GET /api/v1/reservations/mine/archived` |
| [WAS-859](https://loaisabir.atlassian.net/browse/WAS-859) | `GET /api/v1/reservations/mine/archived/patients/options` |
| [WAS-860](https://loaisabir.atlassian.net/browse/WAS-860) | `GET /api/v1/patients/me/medical-record/overview` |
| [WAS-861](https://loaisabir.atlassian.net/browse/WAS-861) | `GET /api/v1/patients/me/medical-record/timeline` |
| [WAS-862](https://loaisabir.atlassian.net/browse/WAS-862) | `GET /api/v1/families/mine/dependents/{dependentPatientId}/medical-record/overview` |
| [WAS-863](https://loaisabir.atlassian.net/browse/WAS-863) | `GET /api/v1/families/mine/dependents/{dependentPatientId}/medical-record/timeline` |

## Pending: Business and discovery decisions (24)

Product/business acceptance or a decision is required; endpoint wiring alone cannot close these tickets.

| Ticket | Scope |
| --- | --- |
| [WAS-644](https://loaisabir.atlassian.net/browse/WAS-644) | [COM-S01] Feature Inventory & Package Catalog — Business Definition |
| [WAS-645](https://loaisabir.atlassian.net/browse/WAS-645) | [COM-S02] Package Entitlements & Commercial Limits — Business Backlog |
| [WAS-646](https://loaisabir.atlassian.net/browse/WAS-646) | [COM-S03] 30-Day Free Trial Journey — Business Backlog |
| [WAS-647](https://loaisabir.atlassian.net/browse/WAS-647) | [COM-S04] Paid Setup & Onboarding Services — Business Backlog |
| [WAS-648](https://loaisabir.atlassian.net/browse/WAS-648) | [COM-S05] Paid Subscriptions & Commercial Billing — Business Backlog |
| [WAS-649](https://loaisabir.atlassian.net/browse/WAS-649) | [COM-S06] Renewals, Upgrades, Downgrades & Expiry — Business Backlog |
| [WAS-650](https://loaisabir.atlassian.net/browse/WAS-650) | [COM-S07] Commercial Add-ons — Business Backlog |
| [WAS-651](https://loaisabir.atlassian.net/browse/WAS-651) | [COM-S08] Offers, Bundles & Promotions — Business Backlog |
| [WAS-652](https://loaisabir.atlassian.net/browse/WAS-652) | [COM-S09] Future Feature Business Discovery — Business Backlog |
| [WAS-653](https://loaisabir.atlassian.net/browse/WAS-653) | [COM-S01-US01] Unified Feature Inventory & Readiness Classification |
| [WAS-654](https://loaisabir.atlassian.net/browse/WAS-654) | [COM-S01-US02] Package Positioning & Doctor Customer Value |
| [WAS-655](https://loaisabir.atlassian.net/browse/WAS-655) | [COM-S01-US03] Feature Comparison Matrix — Trial / Starter / Pro / Premium |
| [WAS-656](https://loaisabir.atlassian.net/browse/WAS-656) | [COM-S01-US04] DoctorPractice Capacity Across Packages |
| [WAS-657](https://loaisabir.atlassian.net/browse/WAS-657) | [COM-S01-US05] Reception Seat Counting & Practice Assignments |
| [WAS-658](https://loaisabir.atlassian.net/browse/WAS-658) | [COM-S01-US06] Monthly vs Annual Pricing Transparency |
| [WAS-659](https://loaisabir.atlassian.net/browse/WAS-659) | [COM-S01-US07] Free Trial Offer Communication — 30 Days |
| [WAS-660](https://loaisabir.atlassian.net/browse/WAS-660) | [COM-S01-US08] Setup Fee Disclosure vs Free Self-Onboarding |
| [WAS-661](https://loaisabir.atlassian.net/browse/WAS-661) | [COM-S01-US09] Universal Clinical Privacy, Patient Rights & Governance |
| [WAS-662](https://loaisabir.atlassian.net/browse/WAS-662) | [COM-S01-US10] Existing Doctor Commercial Transition Inventory |
| [WAS-663](https://loaisabir.atlassian.net/browse/WAS-663) | [COM-S01-US11] Commercial Catalog Governance, Versioning & Publication |
| [WAS-664](https://loaisabir.atlassian.net/browse/WAS-664) | [COM-S01-US12] Feature Release Evidence & Saleable Claims Gate |
| [WAS-665](https://loaisabir.atlassian.net/browse/WAS-665) | [COM-S01-DEC] Product Owner Approval & Open Decisions Register |
| [WAS-773](https://loaisabir.atlassian.net/browse/WAS-773) | [Patient Medical Record] Missing general upload for historical medical documents without Doctor Request |
| [WAS-774](https://loaisabir.atlassian.net/browse/WAS-774) | [Patient / My Family] Missing parent self-service Create Child Patient Profile without child account |

## Pending: Complete journey and QA acceptance (5)

Requires full authenticated journey/role acceptance, including real permissions and document access.

| Ticket | Scope |
| --- | --- |
| [WAS-632](https://loaisabir.atlassian.net/browse/WAS-632) | [FE FEATURE 20.1] Doctor My Patients — Full UI Journey, Screens & Actions |
| [WAS-641](https://loaisabir.atlassian.net/browse/WAS-641) | [FE 20.1.09] Lab & Radiology Requests, Results & Patient Submissions — reuse existing APIs |
| [WAS-642](https://loaisabir.atlassian.net/browse/WAS-642) | [FE 20.1.10] Historical Closed-Practice / Archive / Medical Sharing UX Rules |
| [WAS-643](https://loaisabir.atlassian.net/browse/WAS-643) | [FE 20.1.11] Doctor My Patients End-to-End QA & Frontend Handoff |
| [WAS-681](https://loaisabir.atlassian.net/browse/WAS-681) | [FE FEATURE COM-S05.16 v1.2] Practice-Scoped Commercial Entitlement UX / Existing API Regression Matrix |

## Next external steps

1. Publish the backend revision matching the PR38 handoff to the configured API host.
2. Run authenticated patient/dependent/admin acceptance, including permission combinations, stale row versions, idempotent retries, private files and diagnostic withdrawal receipts.
3. Resolve the listed product decisions and full-journey acceptance tickets, then transition only the tickets whose acceptance criteria pass.
