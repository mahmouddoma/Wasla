# Patient booking — existing guideline reconciled with real-world safety

The uploaded reference `PATIENT_UX_GUIDELINES.md` proposes a **3-click / under-60-second booking objective**, in-place drawer booking, smart clinic/slot/patient defaults and a walk-in alternative. Those are **user-provided desired UX patterns**, not proof that the current backend/business policy supports all of them.

## Desired UX intent
- Reduce navigation and duplicate multi-step flows; preserve a single coherent booking transaction.
- Search → select available slot → review meaningful details → confirm; aim to minimize avoidable actions.
- Present doctor/clinic/time/patient/official fee clearly; reassure users and display honest confirmation only after server success.
- Default selected patient to self only when identity, consent and correct account scope are confirmed; never silently book for someone else.
- Walk-in clinics should give helpful directions and availability information instead of a confusing disabled CTA, **if** relevant visit policies are confirmed.

## Never let numerical UX goals override correctness
- Do not remove mandatory informed consent, payment/insurance disclosures, necessary identity verification, required accessibility steps or clinical/financial confirmation just to hit 3 clicks.
- Do not invent a fee, slot, booking state, clinic, authorization or cancellation policy. Check live API behavior and Jira criteria.
- Never auto-confirm an appointment purely to satisfy time budget; maintain idempotency/conflict handling and server-authoritative receipt.

## Implementation checks
- Mobile drawer or bottom sheet must fit viewport/keyboard, be accessible, offer back/close and preserve necessary data.
- Error for occupied slot / expired availability / duplicate booking must guide recovery without leaving misleading confirmed state.
- Share booking logic across discovery and doctor profile if the repository supports both entry points; avoid divergent duplicate wizards.
- Test logged-in vs guest, family member, walk-in, unavailable slot, stale availability, RTL/LTR and slow connections.

Original reference is preserved under `.agents/reference-library/PATIENT_UX_GUIDELINES.original.md` for context only, not as a higher-priority rule.
