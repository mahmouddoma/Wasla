---
name: craft-ui-design
description: Guidelines for bespoke, high-end, human-crafted Enterprise UI design. Strictly eliminates AI tropes (borderitis, excessive pill containers, generic cards) in favor of fluid typography hierarchy, living pulse indicators, and seamless borderless layout aesthetics.
---

# Craft UI Design Philosophy (Anti-AI UI Guidelines)

This skill provides architectural and aesthetic principles to prevent generic AI-generated design patterns and achieve bespoke, human-crafted, premium enterprise software interfaces (inspired by Linear, Apple macOS, Raycast, and Vercel).

---

## 1. The Core Law: Eliminate "Borderitis" & "Box-Mania"

AI-generated code routinely falls into the trap of wrapping every single widget, link, badge, or text block inside an artificial box:

- ❌ **Anti-Pattern (AI Generic)**: `border: 1px solid #e2e8f0; border-radius: 999px; background: #ffffff; box-shadow: 0 1px 3px...` wrapped around every piece of text or icon.
- ✅ **Craft Principle (Bespoke)**: Use **Whitespace, Typography Weight, and Color Contrast** as the primary separators. Reserve boundaries/borders only for macroscopic structural sections (e.g., major sidebars, modal windows, table frames).

---

## 2. Navigation & Breadcrumbs (Fluid Living Breadcrumbs)

- **No Individual Boxes**: Breadcrumb links must flow naturally without being enclosed in rounded card capsules.
- **Visual Weight**:
  - Inactive/Parent steps: Subtle, elegant slate (`color: #64748b` or `#94a3b8`), clean icon glyphs.
  - Hover state: Smooth color transition to deep text (`#0f172a`) or an ultra-soft borderless background wash (`background: #f1f5f9; border-radius: 6px;`), never a hard pop-in border.
- **Active Destination**:
  - Not a heavy blue capsule.
  - Render as high-contrast, confident typography (`font-weight: 750 / 800; color: #0f172a;`).
  - Pair with a **Living Pulse Indicator** (`status-dot`) or soft brand tint.
- **Separators**:
  - Delicate, lightweight geometric glyphs (thin `/` with opacity 0.5, or razor-thin `›` / `·`), never bold text symbols with harsh contrast.

---

## 3. Executive Identity & User Lockups (Seamless Profile)

- **Unboxed Trigger**: The user profile widget in topbars should sit natively on the surface without an enclosing capsule card.
- **Squircle Avatar**: Use modern squircle/rounded rectangle geometry (`border-radius: 8px`), Niletronix brand gradient (`#0284c7 ➔ #0369a1`), and subtle online activity dot (`#22c55e`).
- **Typography**:
  - Strong, legible username (`font-size: 12.5px; font-weight: 800; color: #0f172a;`).
  - Quiet, concise role label (`font-size: 10px; font-weight: 600; color: #64748b;`).
  - Avoid redundant boilerplate text like "المستخدم الحالي" (Current User).
- **Hover Transitions**: Soft, borderless glow/wash on hover that feels like a natural part of the topbar surface.

---

## 4. Palette & Aesthetic Identity (Niletronix Cyan/Navy Theme)

- Primary Blue/Cyan: `#0284c7` (Sky 600), `#0369a1` (Sky 700), `#0ea5e9` (Sky 500)
- Deep Slate (Ink): `#0f172a` (Slate 900), `#1e293b` (Slate 800)
- Muted Slate: `#64748b` (Slate 500), `#94a3b8` (Slate 400)
- Clean Backgrounds: `#ffffff`, `#f8fafc`, `#f1f5f9`
- Living Active Accents: `#10b981` (Emerald online pulse), `#38bdf8` (Cyan subtle glow)

---

## 5. Micro-Interactions & Motion

- Use `cubic-bezier(0.4, 0, 0.2, 1)` for snappy, natural 150ms-200ms transitions.
- Prefer subtle scale shifts (`transform: translateY(-1px)`) or ambient opacity shifts over jarring border changes.
