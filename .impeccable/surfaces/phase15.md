# Phase 15 surface brief: medical references and diagnostics

## Authority and scope

This is an integration into the incumbent Wasla visual system. The required durable record remains [DESIGN.md](../../DESIGN.md), with product context in [PRODUCT.md](../../PRODUCT.md). This brief records feature-local application of that system; it introduces no global tokens, identity, component variants or system decisions. Root DESIGN.md and `.impeccable/design.json` remain untouched.

The implemented boundary is `src/app/features/medical-catalog/pages/{catalog,imports,requests}`, `src/app/features/diagnostics/pages/diagnostic-workspace`, and `src/app/features/diagnostics/components/{diagnostic-draft,result-upload}`. The existing shared working-surface vocabulary is consumed from `src/app/shared/styles/directory-workspace.css`.

## Direction and composition

**THESIS:** Manage laboratory and imaging references and patient test workflows within Wasla's existing clinical operations interface.

**OWN-WORLD:** Inherited Cairo/Manrope typography, navy reading text, restrained teal primary actions, neutral unified tables, standard PageHeader imagery and SideDrawer inspection. The principal users are doctors and clinic assistants; patient result and report views retain the same plain-language hierarchy and permission boundaries. Arabic and English receive equivalent controls and RTL/LTR layouts.

**STORY:** Open a directory, filter the available records, inspect a record in its drawer, then use a capability-gated action with localized ToastService feedback. Catalog import preview precedes apply or discard. Laboratory and imaging drafts remain independent. Official result uploads and patient report submissions expose the fields relevant to the current actor.

**FIRST VIEWPORT:** Standard page header with a recognizable refresh action, obvious search/status/date controls as relevant, and one unified table with clear row actions. No decorative blinking or additional card wrappers are introduced.

**FORM:** Established list-to-drawer composition. Detail forms use labeled controls, neutral section dividers and a straightforward action row. Selected views and coverage items use the existing Bootstrap primary treatment and `aria-pressed`; unselected choices use the existing secondary outline treatment.

No concept seed or concept comp was needed: this was a precisely specified extension of the incumbent interface.

## Inherited implementation choices

- **Palette and type:** Consume Wasla tokens and global language fonts; navy carries reading content, teal highlights primary actions, and borders remain neutral. Supporting text must remain readable. No feature-specific palette or display typography is established.
- **Spatial rhythm:** The directory stylesheet supplies a bounded working area, wrapping filter/action rows, consistent table padding and a single working surface. Drawer forms start with one column and use two columns only when their container has room. Tables retain responsive scrolling rather than forcing the viewport wider.
- **Controls:** Fields share the existing 42px control treatment. Selects remove native arrows and use an inline SVG with logical positioning. Dates use LTR direction inside either language layout. Notes resize vertically.
- **State and feedback:** Loading uses status semantics; API errors use alerts and explicit retries, including inside inspection drawers. Empty directories use the existing medical SVG illustrations, a clear title, guidance and an appropriate action. Mutations provide translated toast feedback.
- **Context and privacy:** Drawers preserve the working list context. Server capabilities govern available mutations. Patient views exclude internal doctor instructions, correction/void reasons and doctor version history; this is a feature contract, not a visual-system rule.

## Evidence and disposition

The [integration report](../../docs/phase15-integration-report.md) records contracts, test coverage and verification limits; the committed [OpenAPI contract snapshot](../../docs/phase15-openapi-contracts.json) supports the typed integration boundary. [Browser evidence](../../docs/browser-verification/phase15/results.json) and adjacent screenshots cover synthetic Arabic/English scenarios at 390px and 1440px. These fixtures do not demonstrate authenticated live clinical mutations or real uploads; none were performed live.

Independent reviewer disposition: **ship**, following resolution and recapture of four findings: drawer alerts/retry visibility, readable record references, visible selection through existing Bootstrap states, and Arabic import source-name fallback. Import names use an Arabic source `nameAr` only when present; otherwise the official English name is retained rather than inventing a translation.

## Not canonized

Actor-specific workflow details, reference labels, import-name fallback, coverage selection and local textarea sizing remain feature implementation choices. They are not promoted into new durable system rules. No task-local measurements or audit advisories redefine the inherited visual system.
