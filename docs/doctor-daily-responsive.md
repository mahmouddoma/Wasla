# Doctor daily workspace: responsive behavior

Scope: `/workspace/doctor`, `/doctor/reservations`, `/doctor/queue`, `/doctor/encounters`, `/doctor/patients`, and their inspection drawers. Existing authorization, API workflows, and routing are preserved.

## Layout rules

- Bootstrap supplies full-width page containers and the patient filter grid (`row`, `g-3`, responsive columns).
- Named CSS containers adapt each workspace to the space left by the portal sidebar. Viewport width alone does not determine table density.
- Patient directories retain identity and the inspection action at every size. At intermediate widths, practice information and completed-encounter counts remain available in the patient record drawer. Compact screens show a continuous two-column directory, with phone and last attendance under the identity.
- Reservation rows become a labeled grid below a 1200px workspace width. Encounter rows become a labeled grid below 1000px. These remain unified lists rather than detached cards.
- Queue actions wrap into their own row in narrow workspaces. Clinic selectors shrink safely, long names wrap, and ticket tokens retain their intrinsic width.
- Reservation details/editors and prescription/diagnostic editors adapt to their own container, including when rendered inside a drawer on a large monitor.
- The dashboard uses its workspace width for its action grid, filters, and summary strip. The drilldown table retains its drawer-local container rules.
- The shared page header can shrink its action area. The shell constrains routed content to its available width. Mobile navigation wraps at word boundaries instead of breaking labels into letters.

## Verification

`node scripts/browser-daily-responsive.cjs` uses an isolated browser context and synthetic read-only API responses. Run Chrome headlessly with a dedicated profile and debugging port 9223; the application is expected at `http://localhost:4201`.

The full matrix covers 17 CSS viewport widths: 320, 360, 390, 430, 576, 768, 820, 911, 1024, 1093, 1280, 1366, 1440, 1536, 1600, 1920, and 2560. Both Arabic and English are checked. A 1366px laptop at 125% and 150% scaling is represented by 1093px and 911px CSS viewports with reduced heights; this is viewport equivalence, not an OS scaling test.

226 full-matrix checks cover the five populated directories, inspection drawers at representative widths, expanded/collapsed laptop sidebar states, and expanded patient filters. Assertions inspect page overflow, drawer overflow, key table/control overflow, and actions extending outside their workspace. Runtime exceptions fail verification. Screenshots and JSON evidence are written under `.tmp/daily-responsive/`.

`--smoke` repeats the representative 320, 820 and 1366px cases. No backend records are created or updated. These checks validate frontend layout with synthetic long Arabic/English names; they do not establish live backend integration.

Existing component suites cover the five features and the affected shared components. Existing global architecture/i18n findings and bundle-budget warnings are outside this responsive change.
