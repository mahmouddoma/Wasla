# Migration decisions from user-provided `.agents.rar`

The original archive's 13 skills were inventoried and intentionally **not activated together**. Active capabilities are restructured as 11 Wasla skills; no third-party scripts were executed while packaging.

| Original skill | New routing / decision |
| --- | --- |
| `angular-component` | Subsumed into `wasla-angular-engineering`, Angular 20 compatibility first |
| `angular-developer` | Subsumed into `wasla-angular-engineering`, `wasla-api-contracts`; v21/22-only advice rejected for Angular 20 |
| `typescript-advanced-types` | Typed contracts covered in `wasla-angular-engineering` and `wasla-api-contracts`; no generic type gymnastics by default |
| `codebase-design` | Deep module ideas used in `wasla-angular-engineering`; do not over-abstract |
| `craft-ui-design` | Anti-carditis ideas incorporated in `wasla-ui-ux`; **Niletronix brand colors explicitly removed** |
| `frontend-design` | Intentional bespoke design incorporated in `wasla-ui-ux` |
| `impeccable` | Practical accessibility/quality ideas incorporated in `wasla-ui-ux` + `wasla-quality-gates`; large scripts kept inactive |
| `ui-ux-pro-max` | Design discovery principles incorporated in `wasla-ui-ux`; optional data/scripts not auto-run |
| `web-design-guidelines` | UI auditing principles incorporated in `wasla-quality-gates`; no mandatory network fetch per ticket |
| `canvas-design` | Not relevant to routine Angular app tasks; omitted from active skills |
| `algorithmic-art` | Not relevant to routine Angular app tasks; omitted from active skills |
| `find-skills` | Agent skill discovery handled natively; omitted |
| `skill-creator` | Not needed on each product task; omitted |

Other source rules:
- `skills/AGENTS.md` (1059 lines) condensed into focused architecture, security and domain rules. Intentionally not retained as always-on root skill.
- `tokns.md` + `rules/efficient-ui-workflow.md` reconciled as **verification-efficiency**: risk-based build/test; no blanket build or screenshot requirement.
- `Agent_UI/UX.md` adapted to responsive and visual guidance, but version is detected from project.
- `PATIENT_UX_GUIDELINES.md` is retained as legacy reference and reconciled into `knowledge/patient-booking-policy.md`. Its 3-click promise is an aspiration, never overrides needed consent/safety/contract reality.

### Why not ship all the old scripts?
The task is an optimized Wasla **working agent**, not an archive clone. Generic tools can create overlapping triggers, unnecessary startup metadata and dependence on external runtimes. The original `.agents.rar` remains the intact backup to restore any library when truly required.
