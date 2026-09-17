---
name: Wasla
description: Bilingual clinical operations with restrained enterprise surfaces.
colors:
  teal-700: "#047c79"
  teal-600: "#078c88"
  teal-500: "#0ba5a0"
  teal-100: "#ddf7f5"
  teal-50: "#f0fbfa"
  navy-800: "#123451"
  text-secondary: "#66788a"
  text-muted: "#91a0ae"
  background: "#f5f8fa"
  surface: "#ffffff"
  border: "#e3eaf0"
  border-soft: "#edf1f5"
  success: "#20865a"
  warning: "#d99b25"
  danger: "#d95057"
typography:
  body-ar:
    fontFamily: "Cairo, Tahoma, sans-serif"
    fontSize: "0.9375rem"
    lineHeight: 1.65
  body-en:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    lineHeight: 1.65
  title:
    fontSize: "1.25rem"
  section:
    fontSize: "1rem"
  label:
    fontSize: "0.875rem"
rounded:
  control: "10px"
  panel: "14px"
  major: "18px"
components:
  reservation-primary:
    backgroundColor: "{colors.teal-700}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  reservation-secondary:
    textColor: "{colors.navy-800}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  reservation-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.navy-800}"
    rounded: "{rounded.control}"
    height: "42px"
---

# Design System: Wasla

## Overview

**Creative North Star: "Wasla Clinical Operations"**

The incumbent Wasla dashboard is a restrained clinical enterprise interface. Pale neutral backgrounds, white working surfaces, navy text and small teal action accents support operational reading. The reservation extension keeps this existing world rather than introducing a separate visual identity.

Arabic and English are equal parts of the system. Cairo serves Arabic; Manrope serves English. Logical alignment and spacing preserve the same hierarchy across RTL and LTR. PRODUCT.md's durable commitments are neutral borders, restrained surfaces, drawer inspection and visible mutation feedback.

**Key Characteristics:**
- Neutral surfaces and dividers.
- Compact, legible operational hierarchy.
- Unified tables and lists rather than repeated cards.
- Context-preserving detail drawers.
- Bilingual, direction-aware controls.

## Colors

Teal is the action accent; navy and cool neutrals carry most of the interface.

### Primary

- **Clinical Teal:** Reservation primary actions use teal-700; domain conflict links use teal-600. The lighter teal family belongs to existing subtle accent treatments.

### Neutral

- **Navy Ink:** Main text and headings use navy-800 in this extension.
- **Quiet Slate:** Secondary and muted tokens support labels and supporting information; muted text is not a substitute for required readable content.
- **Clinical Canvas:** The background token surrounds white surface content.
- **Neutral Dividers:** Border and border-soft separate rows and surfaces without accent-colored outlines.

Semantic success, warning and danger tokens communicate outcomes, not container identity. The extension uses danger for error text.

**The Neutral Boundary Rule.** Container and field borders remain neutral. Accent belongs to actions, small indicators and focus feedback.

## Typography

**Arabic Font:** Cairo with Tahoma and sans-serif fallback.
**English Font:** Manrope with Segoe UI and sans-serif fallback.

The type hierarchy is compact and practical. Body metrics come from src/styles.css; language selection changes the family without changing the underlying hierarchy.

### Hierarchy

- **Page heading:** The reservation workspace uses a desktop heading (2rem), reduced on small screens (1.6rem).
- **Title:** Editor and detail headings use the title role.
- **Section:** Detail and conflict subheadings use the section role.
- **Body:** Global body roles establish the shared baseline.
- **Label:** Workspace labels and table headings use the label role. Detail timestamps are smaller supporting text (0.8rem).

The workspace heading and timestamp sizes are observed component treatments, not new global tokens. No display face or decorative kicker is introduced.

**The Language Parity Rule.** Every label, placeholder, validation message and toast has Arabic and English translations; layout follows the active direction.

## Layout

Bootstrap is the incumbent layout foundation. The reservation workspace uses a local maximum width (1440px) with desktop padding (32px), an action header and a unified table. Filters use an auto-fit grid with a minimum track (180px), separated from results by a neutral divider. The small-screen breakpoint (768px) stacks the header, changes filters to two columns and reduces outer padding (20px 16px).

Recurring local gaps and row padding use an 8/12/16/20/24/32px rhythm. These are observed component measurements, not a declared global spacing-token scale. Tables scroll horizontally rather than compressing operational columns; action groups wrap. Detail values wrap long content.

Drawers anchor to the logical inline end, occupy the viewport height and use a bounded width (min(560px, 100vw)). Their content scrolls independently. Inspection preserves the user's results context.

## Elevation & Depth

Working surfaces are mostly flat; backgrounds and neutral dividers establish hierarchy. Global subtle, card and raised shadows exist in src/styles.css, but their availability is not permission to wrap every item in an elevated panel. The reservation drawer uses a soft surrounding shadow and a dimmed backdrop to distinguish the active layer.

**The Context Layer Rule.** Reserve overlay depth for active inspection or editing; keep the directory itself visually continuous.

Drawer entry is brief and gated by reduced-motion preference. Global reduced-motion treatment also suppresses transitions and animations.

## Shapes

Controls use the incumbent control radius. Panel and major radii are available global tokens for legitimate larger surfaces. Reservation table rows and detail history remain continuous, with neutral dividers rather than isolated rounded containers. Selects remove the browser arrow and provide a compact SVG chevron with direction-aware placement.

## Components

### Buttons

Reservation primary buttons use teal, white text and the control radius; secondary actions use neutral borders and transparent or white backgrounds. Disabled buttons reduce opacity and show an unavailable cursor. Keyboard focus has an offset teal outline. These are local variants: the global Bootstrap primary button remains navy and must not be silently redefined.

### Inputs / Fields

Reservation fields use white surfaces, neutral borders and the control radius. Workspace inputs and selects establish the shared control height (42px). Select text reserves trailing space (38px) for its SVG arrow; RTL moves the arrow to the opposite physical edge. Phone, numeric identity and timestamp content use LTR direction where appropriate.

### Tables / Lists

The reservation directory is a single white table with start-aligned text, compact headings and neutral row separators. Detail history uses a single list; conflict inspection uses divided rows with wrapping actions. Do not turn these into individual cards.

### Detail / Editor Drawer

The workspace hosts detail and editor content in a dialog drawer. Use clear headings, a visible close action and grouped fields without nested cards. Operational actions reflect server capabilities; pending and failed states remain visible. Mutation outcomes use ToastService with translated messages.

### Navigation

Workspace navigation is a simple translated back link. Domain conflict links use a restrained teal text treatment with an offset underline. This sample does not establish a new application navigation component.

## Do's and Don'ts

### Do:

- **Do** reuse src/styles.css tokens and existing Bootstrap conventions before introducing local variants.
- **Do** keep result directories continuous with neutral row dividers.
- **Do** preserve keyboard focus, accessible labels and bilingual RTL/LTR behavior.
- **Do** inspect and edit details in context-preserving drawers.
- **Do** provide translated ToastService feedback for mutations.

### Don't:

- **Don't** use colored container or field borders, nested cards or stacked CSS overrides.
- **Don't** promote a component measurement into a global token without repeated evidence and an architectural need.
- **Don't** treat muted text, disabled styling or hidden actions as authorization.
- **Don't** replace incumbent typography with a decorative display face or add decorative kickers.
