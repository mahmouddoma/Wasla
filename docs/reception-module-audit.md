# Reception module audit and remediation

Date: 31 October 2026. Local application: `http://localhost:4201`.

Frontend fixes are implemented and verified. Follow-up on 2026-10-31 traced the worklist/handover HTTP 404 to missing delegated practice permissions, rather than missing routes. No backend code or contracts were changed. Remote mutations and permission grants were not executed.

## Follow-up: verified integration and permission cause (2026-10-31)

The frontend routes match `ReceptionReportingController.cs` and `HandoversControllers.cs` in the supplied backend repository. Live calls return structured `Report.NotFound`, not a missing HTTP route. `ReportingAccessGuard.AuthorizeAsync` filters reception practice assignments by the requested delegated permission, and returns `Report.NotFound` when no eligible practice remains.

The supplied reception account has the global dashboard and handover permissions, but neither assigned practice lists `Dashboards.Reception.ViewAssigned` or `Handovers.ViewAssigned` in its `permissionCodes`. Both routes return 404 on both practices. The Doctor's `GET /api/v1/doctors/me/receptions/assignable-permissions` returns HTTP 200 and includes these permissions, plus separate handover create/acknowledge/close permissions. The existing Doctor reception-team editor consumes that endpoint and can manage assignments.

The reception pages now check delegated practice access before fetching and show bilingual instructions to ask the Doctor to enable the relevant permission. Handover creation and actions additionally require their separate delegated permissions. Revoking permission clears visible rows/drawers; absent permissions no longer produce repeated requests or misleading service-failure states. Backend authorization remains authoritative. No permissions were granted automatically.

To enable the features, the clinic owner must update the reception employee's assignment permissions for each intended practice from Doctor → Reception Team. Viewing the worklist requires `Dashboards.Reception.ViewAssigned`; viewing handovers requires `Handovers.ViewAssigned`. Grant creation/acknowledgement/closure only as intended. Refresh the reception session afterwards, then repeat the live workflow checks. Earlier observations below describe the original audit and are superseded by this diagnosis where they attributed the issue to missing routes.

## A. Confirmed issues

| Severity | Location | Root cause and impact | Resolution |
| --- | --- | --- | --- |
| P0 | `reception-handovers.component.ts` | Failed creates, acknowledgements and closures were converted into local changes and success toasts. Staff could believe an unsaved handover was recorded. | Removed fallback mutations; failures retain input/record and show a translated error toast. |
| P0 | `reception-worklist.component.ts` | Check-in only changed local display state; no server request or payment workflow occurred. | Removed false check-in. Explicit links open existing appointment, queue or handover workflows. |
| P1 | Worklist and handover pages | Missing practice selection was replaced by `practice-1`; pages neither awaited practice context nor followed clinic changes. Browser requests confirmed 404s against that fabricated identifier. | Reused the shared practice context, blocked unselected requests and reloaded on practice changes. Late responses cannot overwrite another clinic's list. |
| P1 | Worklist and handover pages | Empty responses produced invented patients/handovers; fallback names, times, row versions and attention counts disguised missing data. | Removed fabricated records and fields. Empty, loading and failed requests are distinct states. Removed the additional misleading attention counter/request. |
| P1 | Handover mutations | Required idempotency keys were missing, causing the existing API adapter to throw. Repeated actions were not protected. | Added keys, retained retry identity for identical failed requests, and disabled duplicate submissions. |
| P1 | Worklist and handover mapping | Guessed response properties differed from generated contracts: worklist uses `reference`, localized patient names and categories; handovers use `createdOnUtc`, actor identifiers and `Acknowledged`. | Used generated domain types; removed `any` and invented actor names; corrected status rendering and respected allowed server actions and row versions. |
| P1 | Patient directory and patient picker | Initial directory load issued an empty search; name-only queries also passed frontend validation. Both were rejected with HTTP 400. | Feature-local shared criteria now require a phone with at least seven digits or a name with at least three characters plus birth date. Initial empty search is suppressed. |
| P1 | Assisted family details | Hand-built overlay lacked the shared drawer's focus handling; delayed responses could reopen or replace closed details. | Reused `SideDrawer`, including its busy/Escape/focus behavior, and added request sequencing. |
| P2 | Assisted family mutations | Failed submission/resubmission lacked mutation error toasts; repeated submissions were not consistently guarded. | Added translated ToastService error feedback and pending guards. |
| P2 | Patient directory | Call tooltip and age suffix were Arabic-only; clipboard failure could still claim success. | Centralized bilingual strings and truthful clipboard error feedback. |
| P2 | Family view controls | English controls were clipped at 375px; tab semantics did not implement a tab keyboard pattern. | Wrapped controls, increased target height and used pressed button-group semantics. |
| P2 | Worklist, handover, family and picker empty states | Small icons or text-only output provided weak guidance. | Reused SVG-AVATAR illustrations with explanatory text and recovery actions. |
| P1, unresolved | Deployed API | Both generated-contract routes still return 404 with a valid assigned practice identifier. | Show an honest translated failure/retry state. Backend deployment/routing needs verification. |

## B. Implementation and ownership

Changes stay in `src/app/features/reception`, with bilingual entries added to the existing `src/app/core/i18n/translations.ts`. Existing user edits to doctor reports, operating finance and other files were preserved.

All affected Angular components retain their TypeScript, HTML, CSS and meaningful specs. No new component, global state abstraction, dependency or shared/core business service was introduced. Patient search validation is shared only by its two Reception consumers. Existing public domain APIs and the application practice context remain the data boundaries.

Worklist and handover paging uses the existing API's page number, size and total count. Worklist category filters operate on the loaded page; they are not claimed to be server-wide filtering. Worklist links are explicitly named by destination and do not claim to perform check-in. Record inspection remains in drawers.

## C. Live API and network results

Authentication succeeded using the supplied local-test account. All seven Reception URLs loaded after refresh. Response bodies were checked by shape and item count without persisting patient response bodies or authentication tokens.

| Request | Observed result |
| --- | --- |
| `GET /api/v1/reception/practices` | 200; two assigned practices. |
| `GET /api/v1/reception/practices/{practiceId}/worklist` | 404 for a valid selected practice, after removing the fake identifier. |
| `GET /api/v1/reception/practices/{practiceId}/handovers` | 404 for a valid selected practice. |
| `GET /api/v1/reception/attention` | 200 with `asOfUtc`, `metrics`, `worklist`, `warnings`; previously the UI invented a count from empty warnings. The redundant request was removed from worklist. |
| `GET /api/v1/patients/search` | Before: empty and name-only requests returned 400 with `Validation.PredicateValidator`. After: insufficient criteria send no request; synthetic name plus birth date returned 200 with an empty paginated response, correctly shown as empty. |
| `GET /api/v1/family-relationship-requests/assisted` | 200; empty paginated response correctly rendered. |
| `GET /api/v1/reservations/metadata` | 200; status, source, cancellation and booking-limit metadata. |
| `GET /api/v1/reception/practices/{practiceId}/reservations/filter-options` | 200; statuses, booking sources and segments. |
| `GET /api/v1/reception/practices/{practiceId}/reservations` | 200; empty paginated response plus summary. |
| `GET /api/v1/practices/{practiceId}/queue` | 200; practice/date and `inProgress`, `called`, `waiting`, `noShow` groups. |
| `GET /api/v1/reception/practices/{practiceId}/walk-in/options` | 200; practice, currency and segments. |
| `GET /api/v1/practices/{practiceId}/financial-transactions` | 200; empty paginated response correctly rendered. |

Actual remote create/edit/delete, payment, check-in, acknowledgement and closure success were not asserted. Their relevant existing and new automated tests use controlled API responses. Populated live details, real-record sorting/pagination and successful handover actions cannot be fully validated with the observed empty responses and missing endpoints.

## D. UI/UX and icons

Worklist and handover layouts use continuous tables, neutral token-based boundaries, legible labels, restrained elevation and clear recovery states. Removed unused/conflicting CSS in those pages rather than appending overrides. Buttons have visible focus, adequate targets and disabled states; handover summary remains intact after failed saving.

Reused the existing Font Awesome 6.5.2 stylesheet from `src/index.html` for changed worklist/handover actions and loading indicators. Browser inspection confirmed the stylesheet loaded, solid font loaded on a page using it, and icon pseudo-content rendered. No icon dependency was installed. Existing functional SVG controls, custom select chevrons, shared header graphics and mandated illustrations remain.

## E. Localization and directions

Added Arabic/English entries for clinic selection, task categories, recovery guidance, operational navigation, call/age text, clipboard failure and placeholders. Language switching was exercised through the visible language control, verifying actual `lang`/`dir` changes and translated page rendering. Numeric references and timestamps remain directionally isolated.

The repository i18n checker reports no Reception findings after these changes. Its overall exit status remains failing because other modules contain hardcoded strings and missing keys; no global pass is claimed.

## F. Verification

- Production `ng build`: passed after the final template changes. Existing warnings remain for the 1.31 MB initial bundle and finance/queue component stylesheet budgets.
- Focused Angular/Vitest run: **173 tests passed across nine spec files**. Coverage includes all five Reception component suites plus reservation state/workspace, queue workspace and finance workspace suites. The final operational-link text change was subsequently compiled by the production build.
- Regression checks include truthful empty/error states, clinic switching and stale-response rejection, contract mapping, paging, bilingual names/direction, idempotency retry identity, pending submission guards, row-version/action gating, family detail sequencing, mutation error feedback, patient search criteria and clipboard failure.
- Browser: seven pages × two languages × seven widths = **98 viewport/direction checks**, at 1920, 1440, 1366, 1024, 768, 390 and 375px. No document/main overflow detected in those states. Screenshot review identified internal clipping of family view controls; the fix was confirmed with equal scroll/client width at 375px.
- Browser keyboard checks confirmed focus inside the handover drawer and Escape dismissal. Family list/form switches were confirmed after Angular rendering settled. No live mutation was submitted.
- Before/after and responsive images are local artifacts under `.playwright-mcp/reception-*.png`.
- `git diff --check`: passed for modified Reception files and translations.
- `npm run check:architecture`: fails on repository-wide existing issues, including explicit `any` in domain adapters/tests and `!important` rules. These were not concealed or expanded into unrelated refactoring.
- Impeccable detector executed once. It reports advisory token/type/radius drift across incumbent Reception styles, including fallback literals and colors in `styles.css` that are absent from the older `DESIGN.md` palette. These findings do not establish visual/accessibility compliance; no full AXE or screen-reader certification is claimed.

## G. Instruction compliance and remaining work

Read root `AGENTS.md`, `.agents/skills/AGENTS.md`, `.agents/Agent_UI/UX.md`, `.agents/PATIENT_UX_GUIDELINES.md`, `.agents/tokns.md`, relevant Angular/design skill contents and incumbent PRODUCT/DESIGN context before implementation. Applied Angular Developer, Angular Component, Impeccable audit/hardening and UI/UX guidance. The optional Python-backed UI/UX search could not run because Python launchers were unavailable; the local quick-reference rules were used instead.

Preserved existing CSS variables, typography, component dimensions, lazy feature boundaries and bilingual architecture. New worklist/handover surfaces use neutral borders and existing tokens. Details use the shared drawer. Mutation outcomes use ToastService. General skill suggestions for new palettes, pulse indicators, expressive motion or inline component examples were superseded by Wasla's explicit requirements. No patient-facing booking flow was changed; the three-click/in-place patient standard remains applicable to that separate journey.

The global footer and shell remain shared; no page footer was duplicated. Existing shell/design drift and detector advisories are not represented as resolved by this feature change.

Before release, the clinic owner must enable the intended delegated practice permissions, then a disposable environment should be used for successful end-to-end mutations, populated details, conflict recovery and real-data paging. Confirm actual handover `availableActions` codes against the authorized service. Production readiness cannot be certified until those checks pass.
