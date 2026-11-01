# Doctor Overview redesign — verification

Implemented on 1 November 2026. Scope is the Doctor Overview only. Doctor Reports, shared report sections, generated API contracts and backend calculations remain unchanged.

## Delivered behavior

- Six semantic KPIs use stable metric codes and the authoritative conversion percentage. Net collections require both `DoctorRevenue.ViewOwn` and a returned metric.
- Daily paired SVG bars compare scheduled appointments and check-ins, with count guides, keyboard/touch inspection and a complete daily table. Missing values remain unavailable; measured zero remains zero. Long plots scroll instead of shrinking date labels.
- The booking-created cohort uses its own counts (144 / 63 / 63 in the synthetic fixture), without a newly derived conversion percentage.
- Supporting disclosures cover waiting times, historical ticket outcomes, cancellation/no-show denominators, patients, authorized finances and booking-creation weekday/hour patterns. All official metrics and breakdowns remain accessible in secondary details.
- Reporting presets and instants use the report time zone. Business dates remain independent calendar dates. Late responses cannot overwrite newer filter results; changing filters clears the detail drawer.
- Supported, permission-checked reservation/encounter routes take priority over the patient fallback. Tickets retain the patient fallback because this change does not invent a ticket-detail destination.
- Arabic and English labels are centralized. The feature stylesheet replaces the previous dashboard stylesheet and no longer imports broad directory styles that imposed a two-column grid on every definition list.

## Validation

| Check | Result |
| --- | --- |
| Production build | Passed; existing initial-bundle and finance/queue style-budget warnings remain. |
| Dashboard component and presentation tests | 24 passed across 3 files. Includes permissions, snapshot pagination, automatic practice reload/reset, race fencing, exact cohort values, zero/null statuses, timezone boundaries, keyboard chart inspection, empty/error states and bilingual timing labels. |
| Browser layout | Arabic/English at 360, 390, 768, 1280 and 1440px; six KPIs, 30 daily table rows, no document horizontal overflow, readable timing rows and an uncompressed plot. See `browser-checks.json`. |
| Architecture / i18n checks | Global checks fail on issues outside the changed dashboard. No dashboard or newly added translation-key findings in the final check output. |
| Entire project test suite | Started with `npm test -- --watch=false`; remained at the Vitest run stage without results and was stopped. No full-suite pass is claimed. |

## Independent visual review

Final disposition: **Pass**. The independent reviewer confirmed all original findings resolved, including the final snapshot separator in Arabic mobile and English desktop screenshots.

| Original finding | Resolution |
| --- | --- |
| Indistinguishable supporting labels | Bilingual semantic labels added. |
| Overlapping timing rows | Broad shared definition-list styles removed from this page. |
| Unreadable mobile dates | Plot minimum width follows the logical point spacing. |
| Missing count axis | Count labels and neutral horizontal guides added. |
| Corrupted metadata separators | Replaced with HTML entities; final browser check verifies metadata contains no question-mark separators. |

The screenshots use synthetic aggregates and a mocked session/API, not live backend data. Browser authentication, onboarding and report requests were intercepted locally. No real patient identifiers are included. Before screenshots were not captured; these artifacts document the resulting implementation only.

Representative screenshots: [Arabic desktop](overview-ar-1440.png), [Arabic mobile](overview-ar-360.png), [English desktop](overview-en-1440.png), [English mobile](overview-en-360.png).

## Business choices kept explicit

The requested six-KPI order is used. The proposed 43.75% derived funnel rate is omitted. Finance gating conservatively uses the existing session revenue permission in addition to response presence; confirmation of the backend's dashboard-specific finance policy remains a server/product concern. No new metric definitions, category-to-priority assumptions, previous-period deltas or daily revenue series were introduced.
