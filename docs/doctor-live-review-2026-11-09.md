# Doctor live review — 2026-11-09

## Outcome

Authenticated review against `https://doctorapi.runasp.net` succeeded for the available doctor reads and rendered screens. **No additional Jira tickets were moved to Done**: the remaining journey/QA acceptance criteria require scenarios absent from this account, and the commercial planning cards require product decisions.

This review used actual API responses, without mocking responses or fabricating permissions. Credentials, access tokens, patient names and patient identifiers are not included in this report.

## Verified

- Login and current-user requests returned 200. The user is a Doctor, first login is complete and no password change is required.
- The current production frontend build passed. Existing initial bundle and finance/queue stylesheet budget warnings remain.
- Four focused test files passed: **33 tests**, covering the patient directory, patient detail drawer, diagnostic tabs and subscription page. These are supporting component checks, not replacements for live acceptance.
- The live patient directory returned 182 patients; the first rendered page contained 20 rows. A direct first-page read with pageSize=100 returned 100 entries.
- A real patient overview and the attendance, diagnosis, prescription, appointment and follow-up reads returned 200. The inspected patient had one attendance, one diagnosis and two appointments; prescription and follow-up lists were empty.
- All seven patient drawer tabs opened without alert/error states. All six lab/radiology request/result/submission tabs loaded their empty states successfully.
- Doctor-wide lab requests, lab results, lab submissions, radiology requests, radiology results and radiology submissions each returned 200 with totalCount=0.
- An unavailable patient identifier returned 404 with ProblemDetails rather than a patient record. This checks the missing-subject response only; it does not establish isolation against another doctor's existing patient.
- The subscription screen loaded one contract. Selecting it performed a successful contract-detail request and retained the selected state.
- Desktop Arabic and mobile English views were exercised. The patient drawer also switched back to mobile Arabic with RTL intact. The observed directory, drawer and subscription layouts had no document-level horizontal overflow or alert states.
- No application runtime exceptions were captured during these checks. Browser extension exceptions are excluded from application evidence.

## Acceptance still outstanding

| Ticket | Missing acceptance evidence |
| --- | --- |
| [WAS-641](https://loaisabir.atlassian.net/browse/WAS-641) | Nonempty requests/results and PendingReview submissions, detail/version/private attachments, successful accept/reject with rowVersion and conflict handling. The live lists contain no records. |
| [WAS-642](https://loaisabir.atlassian.net/browse/WAS-642) | Closed-practice/archive read-only behavior and active treating encounter sharing restrictions, including hidden entries and permission revocation. The account has one active practice and no closed-practice fixture was available. |
| [WAS-643](https://loaisabir.atlassian.net/browse/WAS-643) | The full QA matrix includes minors, multi-practice deduplication, issued prescription PDF/version status, archived sources, suspended/revoked accounts, patient/reception follow-up booking and cross-doctor isolation. The verified subset does not close this matrix. |
| [WAS-632](https://loaisabir.atlassian.net/browse/WAS-632) | Parent journey remains open while its diagnostic, historical/privacy and QA children are incomplete. |
| [WAS-681](https://loaisabir.atlassian.net/browse/WAS-681) | Multiple simultaneous contracts, practice allocation/move, expiry/read-only and original-reservation provenance workflows. The account exposes one contract and one active practice; billing/allocation mutations were not performed. |
| [WAS-773](https://loaisabir.atlassian.net/browse/WAS-773), [WAS-774](https://loaisabir.atlassian.net/browse/WAS-774) | Patient-side historical upload and child onboarding require a patient actor and administrative review actor, plus applicable business acceptance. A doctor login cannot validate those permissions or journeys. |
| WAS-644–WAS-665 | Commercial business scope, prices, limits, release claims and publication/governance approvals are product decisions; successful doctor reads do not approve them. |

## Needed to complete acceptance

1. A controlled doctor fixture containing lab/radiology requests, official results, pending patient submissions, issued prescriptions and follow-ups.
2. A closed/archived practice and the required historical permissions; separate doctors and revoked/suspended cases for privacy checks.
3. A controlled commercial fixture with multiple contracts and allocated practices for expiry/move/provenance checks.
4. Patient, reception and admin actors for their respective journeys, followed by the required product-owner approvals for business cards.

No clinical, financial, subscription or account-state mutations were made. Jira statuses were left unchanged. Local sanitized network evidence and screenshots are under ignored `.tmp/doctor-live-evidence/`; build and focused test logs are `.tmp/doctor-live-*-2026-11-09.log`.
