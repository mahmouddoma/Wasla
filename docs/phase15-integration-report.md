# Phase 15 frontend integration

Source: WAS Jira board 34 To Do snapshot and deployed Swagger at `http://192.168.1.8:8085/swagger/v1/swagger.json`, retrieved October 7, 2026.

## Coverage

The captured backlog contains 123 endpoint tasks: 118 new endpoints and five changes to login/current-user and encounter/ticket completion. The machine-readable [endpoint audit](phase15-endpoint-audit.json) records every Jira key, HTTP method, path, OpenAPI match, API implementation and test evidence. Run `node scripts/audit-phase15-endpoints.cjs` to reproduce the audit. Contracts can be regenerated from the committed schema snapshot using `node scripts/generate-phase15-contracts.cjs`.

Implemented surfaces:

- Root administration: medical catalog manager account lifecycle through the existing manager directory.
- Medical catalog manager: independent lab and radiology directories, presentation editing, activation/deactivation, merge, import preview/history/changes/apply/discard, and missing-name request review.
- Doctor: catalog search and missing-name requests; independent lab/radiology encounter drafts and post-visit orders; order/history/cancellation, official result upload, correction/version/void, patient report review and authenticated downloads.
- Patient: own issued orders, current official results, report submission/list/details/withdrawal and authenticated downloads.
- Encounter completion: recover latest encounter-by-ticket and ticket state, submit independent existing draft tokens, block completion on server blockers, and retain retry identity until conflict rebasing.

## Authorization and contracts

`MedicalCatalogManager` has its own session destination and first-login password gate. It is isolated from clinical, finance and administrative workspaces. Permissions and returned capabilities drive actions. Shared HTTP authentication/session handling remains authoritative.

Lab/radiology domains expose public typed APIs. Multipart requests keep file/kind ordering, actor-specific coverage fields and independent concurrency tokens. Patient views omit doctor instructions, internal post-visit/correction/void reasons and doctor version history. Mutation failures show localized API field errors and toast feedback; 409 refreshes authorized server state and 403 refreshes permissions.

The deployed encounter timestamp names are `startedAtUtc` and `completedAtUtc`. Completion blockers may contain codes without messages; those remain visible through a translated actionable fallback. Import-change DTOs expose an official English name and raw source JSON: an Arabic `nameAr` is used when actually present in that source, otherwise the official name is retained.

## Verification

- Production build passed. Existing budget warnings remain: initial bundle approximately 1.05 MB; finance workspace CSS 44.42 KB; public doctors CSS 37.02 KB.
- Full Angular suite passed: **948 tests in 128 files**.
- HTTP matrices exercise all 118 new paths, including query parameters, method/path matching, retry headers, multipart field names and authenticated Blob downloads. Existing contract and workflow tests cover the five changed tasks.
- Browser verification uses synthetic intercepted API responses, Arabic/English and 390/1440 px layouts. It checks runtime exceptions, viewport/drawer bounds, manager navigation isolation, patient privacy, two encounter drafts and visible form validation/coverage selection. Script: `scripts/browser-phase15.cjs`; evidence: `docs/browser-verification/phase15/`.
- Architecture and i18n scans were run. Their remaining failures belong to existing reservations/admin/public-doctors/reception/doctor-practices/global styles, outside this integration. No new feature paths remain in those findings.
- Impeccable detector was run once. Static Angular template palette advisories do not establish a rendered issue. Independent review requested drawer error visibility, readable record references, visible selection and language-aware import source names; those were addressed and recaptured.

Final independent visual review disposition: **ship**.

| Review finding | Final verdict |
| --- | --- |
| Drawer errors and recovery | Resolved |
| Distinguishable request/report references | Resolved |
| Visible selected views and coverage | Resolved |
| Arabic import-source names with official fallback | Resolved |

No material regression was observed in the bounded recaptures.

No authenticated live clinical writes, real report uploads, deployment or real-account end-to-end verification were performed. Swagger was inspected read-only. The browser fixtures are explicitly synthetic. User's existing finance workspace work was preserved.

Jira completion: all **123** captured tasks were transitioned to **Done**, with each transition response confirming the actual resulting status. [Transition evidence](phase15-jira-done.json) lists every completed key. Final Jira queries returned no remaining project To Do issues and no captured task outside Done.
