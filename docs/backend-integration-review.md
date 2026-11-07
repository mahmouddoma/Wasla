# Backend integration review — 7 November 2026

Backend: https://github.com/LoaiSaberC4r/Wasla

Reviewed backend commit: `feaa8c73f4f2eaed46d38e24e161893fae6909a3`.

Frontend: the current local `mahmouddoma/Wasla` working copy, including existing uncommitted changes. Existing changes were retained. No changes were pushed to either repository.

## What the audit establishes

The source inventory found **633 unique controller method/route combinations**. It inspected **523 frontend HTTP calls and operation-registry entries**: **470** match a backend method and normalized route directly; **53** contain dynamic expressions with possible matching backend routes. There are also **14 dispatcher/helper calls** whose URLs cannot be resolved by the source scanner.

After the fixes below, the scanner finds no additional frontend route with neither an exact backend match nor a dynamic candidate. **This is not proof that every backend endpoint has a working UI**, or that every dynamic URL, request body, permission, response, and error state is correct. Candidate matching is intentionally a review aid, not a correctness assertion.

The machine-readable inventory is [backend-contract-audit.json](backend-contract-audit.json). Its `contractReviewLeads` compare similarly named records and interfaces; mapped view models and unrelated types with the same name can produce intentional differences.

## Corrected integration defects

| Area | Backend contract / defect | Frontend correction |
| --- | --- | --- |
| Previous prescription | No `prescription/copy-previous` route exists. The response nests medication fields under `clinical`. | Removed the speculative request; use supported history/version/item services and preserve structured frequency, duration, PRN and quantity fields. Retain the latest server row version after each successful item, including partial failures. Prevent copying into disabled or correction views. |
| Prescription quantity | `PrescriptionItemRequest` expects `quantityValue` and a corresponding `quantityUnit`. | Add a translated unit selector, require a unit when a quantity is entered, and send both fields. |
| Prescription duration and PRN | Ambiguous duration text was silently converted to one day; ongoing courses and the reason/minimum interval for as-needed medication were not represented correctly. | Reject ambiguous durations, support explicit Arabic/English durations and ongoing courses, and expose the backend's as-needed reason and minimum-interval fields. |
| Prescription corrections | Backend capability is `canStartCorrection`. | Honor this capability in the action, template and editability checks, with compatibility for existing fixtures. |
| Encounter directory | `EncounterSummaryResponse` exposes flat patient/practice/visit-type identities. | Map them into directory view models at the domain API boundary. Doctor identity is optional for summaries because the backend does not supply it. |
| Encounter amendments | Writes require `target`, `changeType` (`Added`, `Updated`, `Removed`) and diagnosis `type`. History returns `sequenceNumber`, `createdAtUtc`, `beforeSnapshot`, `afterSnapshot`. | Map both request and response contracts; suppress missing author text rather than display a fabricated name or internal identifier. |
| Patient follow-ups | Own-account responses contain nested `patient`, `doctor`, `practice` identities; reception responses contain flat IDs. | Normalize own-account list/detail responses while retaining the reception contract. |
| Drug catalog | Details/mutation responses wrap the drug under `drug`; catalog entries use `strength` and `referencePriceEgp`; history uses `occurredAtUtc`. | Unwrap/map catalog reads and mutation responses into existing UI models. |
| Drug imports | Counters are top-level properties, dates use `createdAtUtc`/`appliedAtUtc`, and change records use `id`/`data`/`matchedDrugCatalogId`. | Map preview, list, detail, apply, and changes responses. Add the total counter label in Arabic and English. |
| Patient claim history | The runtime read service returns `{ items: [...] }` with `eventId`, `occurredOnUtc`, `reason`; it does not supply an actor name. | Unwrap/map the history and hide the missing actor separator. Correct the details `historySummary` type. |
| Duplicate patient cases | The backend uses `caseId`, `patientA`/`patientB`, and statuses `NeedsMoreEvidence`, `ConfirmedDuplicate`, `DistinctPatients`. Resolution is a review decision, not a patient merge. | Correct list/detail/decision contracts and attach the caller's idempotency key to decisions. There is currently no feature screen consuming these duplicate-case methods. |

The review used actual controller, application read-service, and domain definitions, including `ClinicalControllers.cs`, `MedicationControllers.cs`, `ClinicalContracts.cs`, `MedicalEncounter.cs`, `MedicationContracts.cs`, `Prescription.cs`, `PatientIdentityReads.cs`, and `PatientDuplicatesAdminController.cs`.

## Dynamic paths and asset endpoints

The scanner's unresolved calls include generic Phase 18 dispatchers, family document/decision helpers, a diagnostic upload helper, and conditional subscription selection. Existing HTTP tests exercise the generated registries and domain service behavior; the scanner itself cannot prove those branches.

`GET /api/v1/public/practices/{id}/logo` is a media URL supplied in discovery responses, rather than a required direct `HttpClient` API method. Conditional subscription and reservation paths also appear in `backendWithoutDirectClient`; that property means “no exact static call detected,” not “missing integration.”

## Validation

- Final production build passed, with existing bundle/style size warnings.
- The first focused regression run passed: 4 files, 35 tests.
- Expanded domain/API, authentication, route-authorization and reception regression run: **36 files, 628 tests passed**. This predates the final quantity/duration/history regression additions; the final focused result is recorded below.
- Final focused regression run: **7 files, 81 tests passed**, covering patient identity/history, encounter requests and workflows, drug catalog mapping, duration parsing, prescription interaction, and the administrative claim drawer. Counts overlap with the expanded run and should not be added together.
- The initial whole-application test run exposed reception fixture drift and route-guard tests using real subscription state. Updated those tests to use the normalized practice fixture and a subscription-state stub. That run was interrupted; it is not a passing full-suite result.
- `npm run check:architecture` fails on existing repository violations, including explicit `any` and `!important` in unrelated files. This review does not claim a clean architecture check.
- `npm run check:i18n` also fails on existing hardcoded labels and undefined keys in other features. Added quantity/unit/duration/PRN labels have both Arabic and English entries; unrelated translation debt was retained.

## Runtime limitations

Both environment files currently target `http://192.168.1.15:8085`. Read-only attempts to fetch its Swagger document failed from the review environment. The commented hosted alternative, `https://doctorapi.runasp.net`, timed out. Environment URLs were preserved; selecting a working production host requires deployment information.

No authenticated live journeys or production mutations were performed. Role-specific runtime authorization, CORS, deployment version, actual persisted data, and successful live workflows remain unverified. A working backend and representative test accounts are needed before claiming complete end-to-end integration.

## Repeat the source comparison

```powershell
npm run check:api-contracts -- C:/path/to/backend-checkout
```

This reads the checkout and regenerates the JSON inventory. It exits nonzero for a frontend route with no backend match/candidate; dynamic candidates and unresolved helpers remain visible for review.
