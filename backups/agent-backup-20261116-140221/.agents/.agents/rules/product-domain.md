---
trigger: model_decision
description: "Apply when implementing appointment scheduling, queues, doctors, reception, patients, clinic administration, and cross-role Wasla flows."
---

# Wasla domain truth
- Treat roles/modules described in `knowledge/wasla-domain.md` as a discovery map, NOT proof of endpoints or permissions.
- Any appointment transition or queue update must verify allowed prior states, actor role, timing, concurrency and backend source of truth.
- Patient booking UX guideline is a product ambition; its three-click and under-60-second goals are not substitutes for mandatory safety/consent, payment or regulatory needs.
- When ticket, code and domain guideline disagree: surface ambiguity; do not invent automatic booking confirmation or fee selection.
