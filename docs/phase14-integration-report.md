# Phase 14 frontend integration

Jira source: [WAS board 34](https://loaisabir.atlassian.net/jira/software/projects/WAS/boards/34). Scope: 56 To Do issues observed on 6 October 2026: WAS-1, WAS-2, WAS-25–29, WAS-170, WAS-177, WAS-180, WAS-196–197 and WAS-213–256.

## Delivered behavior

- Drug catalog manager login, first-login routing and permission-driven catalog/import/review navigation. Managers cannot enter clinical, patient or admin areas.
- SuperAdmin manager account directory, creation, contact editing and activation controls. The DrugCatalogManager role accepts only its documented permission allowlist; existing admin landing priorities are preserved.
- Catalog server search, filtering and pagination; drawer editing, activation/deactivation, merge into an active target, source/history inspection and stable merge intents.
- Import preview, staged change review, explicit apply, server paging and history. Source fields use bilingual labels; original JSON remains in a secondary disclosure. Applying a preview is never automatic.
- Doctor missing-medication requests and manager review. Requests contain medication metadata only. Clinical doses and patient/encounter context do not enter the manager review UI.
- Prescription drafts embedded in the encounter, active medication search, atomic missing-medication item creation, clinical editing, last-item removal, correction recovery/finalization/discard, voiding and read-only version history.
- Ticket, encounter and prescription concurrency tokens remain independent. Completion reloads current ticket and encounter state, displays all draft blockers and sends the current prescription token only when a draft exists. Parent and prescription mutations cannot run concurrently.
- Own patient prescriptions use the patient endpoints and render a clinical whitelist. Drafts, internal IDs, review metadata, reference prices and internal reasons are not displayed.

## Validation and evidence

- Production Angular build passes. Existing public-doctors CSS budget warning remains (37.24 kB against a 35 kB warning threshold).
- Full Vitest suite passes: **659 tests across 118 files**. Final focused prescription/encounter regression passes: **54 tests**. Results are recorded in `phase14-test-output.txt` and `phase14-final-prescription-tests.txt`.
- Browser checks cover seven surfaces × Arabic/English × 390/1440 px, including shared drawers, visible close controls, viewport containment, forms/search, RTL/LTR and runtime errors. Synthetic responses intercept all API traffic; no live medication/patient records are changed. Results and screenshots: `browser-verification/phase14/`.
- Read-only HTTP/call-site audit finds all 256 board endpoints wired, including the 56 reopened/new issues. This audits verb/path and typed callers; it does not prove live server acceptance. See `jira-board34-endpoint-audit.json` and `jira-phase14-todo.json`.
- Fresh Impeccable finish review after recaptures: **ship**. Initial mobile screenshots had captured the drawer during its entrance animation; final checks wait for a settled panel and verify both panel and close-button bounds.

## Verification boundary

The published Swagger at `http://192.168.1.8:8085` does not list the new drug-catalog or prescription paths. The user confirmed that no newer Swagger is available. Frontend contracts follow Jira descriptions; response DTO structures and optional capability names need authenticated confirmation against the deployed Phase 14 backend. Unit/browser evidence uses synthetic responses, not live end-to-end acceptance.

Repository-wide architecture/i18n checks still report pre-existing private imports, Shared business dependencies, `!important` rules and untranslated text in unrelated features. New feature files have complete component resources and bilingual labels; no new architecture/i18n violations remain. The architecture checker now recognizes a feature-root `index.ts` as a stable public API while continuing to reject cross-feature private imports.

Existing user changes to application headers, navigation and responsive scripts were preserved. No commit, deployment or real medication import was performed.

## Jira result

All **56** scoped issues were transitioned to **Done** using their available workflow transitions. Jira confirmed the resulting status for every issue. A final read of board 34 found **zero To Do issues**. Transition evidence: `jira-phase14-completion.json`.
