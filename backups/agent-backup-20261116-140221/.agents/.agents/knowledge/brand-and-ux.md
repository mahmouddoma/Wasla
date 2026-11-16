# Wasla Design System — brand policy and discoverable tokens

## Approved identity context
- Product: **وصلة / Wasla**; healthcare-connected platform.
- Visual concept from user's approved identity: deep navy Arabic wordmark, teal/blue flowing human motifs, heart-like negative space and teal ECG line; tagline **منصة الرعاية الصحية المتصلة**.
- Do **not** recreate or replace official logo assets; use existing approved assets and brand guidelines found in repo.
- Do not borrow Niletronix cyan palette or gradients from old `craft-ui-design` skill; legacy-specific hex codes are not Wasla token authority.
- Exact HEX / typography tokens must be **discovered from current code or provided by product owner**. No unverified official palette is asserted here.

## Experience principles
1. Clear and calm healthcare SaaS, minimal premium style, legible Arabic/English typography, purposeful whitespace, restrained surface borders/shadows and motion.
2. Plain language. Doctor/reception/patient calls-to-action must describe outcomes. Avoid backend vocabulary in customer-facing text.
3. Screen-specific density: receptionist can need dense actionable lists; patient should see clear decisions and reassurance; admin needs scalable filtering.
4. Stop carditis: no nested identical cards, decorative stat rows, overdone capsules, forced gradients or animated green pulse for decorative chrome.
5. Accessible errors, loading, emptiness, success; show status with text and not solely color; consistent semantic status styling.
6. RTL/LTR and bidirectional form inputs, meaningful mirror behavior and icons; support Egyptian Arabic labels naturally.
7. Evaluate mobile as an independent UX variant, not a squeezed desktop sidebar.

## Design token procedure
- First read project CSS custom properties/SCSS and Angular Material theme settings plus official logo. Reuse approved tokens.
- If tokens are incomplete: propose neutrally named semantic tokens; mark values as proposals, not official Wasla colors, and ask for approval for brand-changing choices.
- Prefer semantic tokens `--wasla-bg`, `--wasla-surface`, `--wasla-text`, `--wasla-muted`, `--wasla-primary`, `--wasla-border`, status variants and spacing scale; map to existing names instead of duplicating.
