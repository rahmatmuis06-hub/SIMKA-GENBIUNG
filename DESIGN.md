# Stripi-Inspired Design System Specification

This document details the design system, color tokens, typography, components, and responsive guidelines for the **SIMKA GenBI UNG** user interface.

---

## Overview

The design language uses a deep navy ink, an electric indigo primary, and an atmospheric gradient mesh that occupies the upper portion of key pages. The system pairs the Inter font family (as the open-source alternative to Sohne) at thin (300) weights with negative letter-spacing for display headlines, and uses tabular-figure body type for numeric and statistical data. Buttons are tight-radius pills, and card components use subtle borders with minimal shadows. The dashboard interface flips to a dark-app shell for a premium, high-tech dashboard track.

---

## Colors

### Brand & Accent
- **Indigo** (`{colors.primary}` — `#533afd`): The signature CTA color, link emphasis, and gradient anchor.
- **Indigo Deep** (`{colors.primary-deep}` — `#4434d4`): Deeper indigo for mid-stops and pressed states.
- **Indigo Press** (`{colors.primary-press}` — `#2e2b8c`): Pressed-state dark variant of primary.
- **Indigo Soft** (`{colors.primary-soft}` — `#665efd`): Lighter indigo for accents and chart highlights.
- **Indigo Subdued** (`{colors.primary-bg-subdued-hover}` — `#b9b9f9`): Pale indigo fill for soft tags.
- **Brand Dark 900** (`{colors.brand-dark-900}` — `#1c1e54`): Deep navy for dashboard chrome and featured cards.
- **Ruby** (`{colors.ruby}` — `#ea2261`): Gradient accent and chart highlight.
- **Magenta** (`{colors.magenta}` — `#f96bee`): Bright pink stop in gradient meshes.
- **Lemon** (`{colors.lemon}` — `#9b6829`): Warm sherbet stop in gradient backdrops.

### Surface
- **Canvas** (`{colors.canvas}` — `#ffffff`): Default background.
- **Canvas Soft** (`{colors.canvas-soft}` — `#f6f9fc`): Cool off-white for feature rows and sub-sections.
- **Canvas Cream** (`{colors.canvas-cream}` — `#f5e9d4`): Warm cream for highlighted feature bands.
- **Hairline** (`{colors.hairline}` — `#e3e8ee`): 1px borders on cards and tables.
- **Hairline Input** (`{colors.hairline-input}` — `#a8c3de`): Input element borders.

### Text
- **Ink** (`{colors.ink}` — `#0d253d`): Default body text. Deep navy, never pure black.
- **Ink Secondary** (`{colors.ink-secondary}` — `#273951`): Secondary content text.
- **Ink Mute** (`{colors.ink-mute}` — `#64748d`): Captions, labels, table headers.
- **Ink Mute 2** (`{colors.ink-mute-2}` — `#61718a`): Nav bar link text.
- **On Primary** (`{colors.on-primary}` — `#ffffff`): Text on dark navy and primary backgrounds.

---

## Typography

### Font Family
We use **Inter** (via Google Fonts) loaded with stylistic alternates (`font-feature-settings: "ss01"`) to achieve the signature geometric look. For numeric tables and statistic counters, the tabular-figure variant is activated (`font-feature-settings: "tnum"`).

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `{typography.display-xxl}` | 56px | 300 | 1.03 | -1.4px | Hero headline |
| `{typography.display-xl}` | 48px | 300 | 1.15 | -0.96px | Section opener |
| `{typography.display-lg}` | 32px | 300 | 1.1 | -0.64px | Sub-section / Card title |
| `{typography.display-md}` | 26px | 300 | 1.12 | -0.26px | Small card title |
| `{typography.heading-lg}` | 22px | 300 | 1.1 | -0.22px | Panel titles |
| `{typography.heading-md}` | 20px | 300 | 1.4 | -0.2px | Sub-headings |
| `{typography.heading-sm}` | 18px | 300 | 1.4 | 0 | Small labels |
| `{typography.body-lg}` | 16px | 300 | 1.4 | 0 | Lead paragraphs |
| `{typography.body-md}` | 15px | 300 | 1.4 | 0 | Default UI text |
| `{typography.body-tabular}` | 14px | 300 | 1.4 | -0.42px | Numeric statistics (`tnum`) |
| `{typography.button-md}` | 16px | 400 | 1.0 | 0 | Button label |
| `{typography.button-sm}` | 14px | 400 | 1.0 | 0 | Small button label |
| `{typography.caption}` | 13px | 400 | 1.4 | -0.39px | Helper text, table headers |
| `{typography.micro}` | 11px | 300 | 1.4 | 0 | Small details |
| `{typography.micro-cap}` | 10px | 400 | 1.15 | 0.1px | All-caps labels |

---

## Layout & Shapes

### Spacing
- `xxs`: 2px | `xs`: 4px | `sm`: 8px | `md`: 12px | `lg`: 16px | `xl`: 24px | `xxl`: 32px | `huge`: 64px.
- Section padding: 64–96px on public/marketing views; 32–48px on internal app views.

### Border Radius
- `{rounded.xs}`: 4px (table headers, small tags)
- `{rounded.sm}`: 6px (inputs, small fields)
- `{rounded.md}`: 8px (compact cards, alert banners)
- `{rounded.lg}`: 12px (dashboard cards, modals)
- `{rounded.xl}`: 16px (large layouts, code shells)
- `{rounded.pill}`: 9999px (buttons, tag pills)

### Elevation & Shadow
- **Level 1**: `box-shadow: rgba(0, 55, 112, 0.08) 0px 1px 3px`
- **Level 2**: `box-shadow: rgba(0, 55, 112, 0.08) 0px 8px 24px, rgba(0, 55, 112, 0.04) 0px 2px 6px`

---

## Components

### Buttons
- **Primary Pill** (`button-primary-pill`): Background `{colors.primary}`, text `{colors.on-primary}`, rounded `{rounded.pill}`, padding `8px 16px`. On press, shifts to `{colors.primary-press}`.
- **Secondary Pill** (`button-secondary`): Outline border `1px solid {colors.primary}`, background transparent, same geometry.
- **On-Dark Pill** (`button-on-dark`): Background `{colors.brand-dark-900}`, text `{colors.on-primary}`, same geometry.

### Cards
- **Feature Light** (`card-feature-light`): Background `{colors.canvas}`, padding `{spacing.xxl}`, border `1px solid {colors.hairline}`, rounded `{rounded.lg}`.
- **Dashboard Mockup** (`card-dashboard-mockup`): Background `{colors.canvas}`, padding `{spacing.xl}`, rounded `{rounded.lg}`, Level 2 shadow. Uses `{typography.body-tabular}` for figures.

---

## Key Styling Principles (Do's & Don'ts)

### Do:
- Set display headers to font-weight 300 with negative tracking.
- Apply `font-feature-settings: "ss01"` globally to `body`.
- Apply `font-feature-settings: "tnum"` to every element containing numeric, NIM, count, or statistical data.
- Keep buttons pill-shaped (`border-radius: 9999px`) with tight padding.
- Embed the pastel gradient mesh as an atmospheric backdrop on the dashboard landing sections.

### Don't:
- Don't use pure black (`#000000`) for text. Use `{colors.ink}` (`#0d253d`).
- Don't use bold weights (500+) for displays; editorial look requires thin/regular weights.
- Don't use rounded-rectangle shapes for primary buttons.
- Don't omit the gradient backdrop on key landing hero layouts.
