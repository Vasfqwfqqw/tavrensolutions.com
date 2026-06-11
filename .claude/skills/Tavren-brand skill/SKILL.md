---
name: tavren-brand
description: Use this skill whenever working on any Tavren brand asset — the md-to-pdf brand config, PDF branding, logos, colours, or fonts. It is the single source of truth for Tavren's name, palette, logo files, typography, and callout styling. Trigger whenever the user asks to create, rebuild, or reference Tavren branding, set up a Tavren brand folder, update config.yaml, or apply brand colours/fonts/logos to any deliverable.
---

# Tavren — Brand Source of Truth

All Tavren brand decisions are locked here. When any output needs a brand value (colour, font, logo, callout), read it from this file rather than inferring. If a value is missing, add it here first, then proceed.

---

## Identity

- **Brand name:** Tavren
- **Operating company:** VBCJ Solutions Ltd (invisible to customers — never appears on branded assets)
- **Primary domain:** tavrensolutions.com
- **Market:** SAP S/4HANA Sales Directors / enterprise B2B (English-speaking, geography-neutral)

---

## Colour palette

| Role | Name | Hex |
|------|------|-----|
| Primary | Sapphire navy | `#0F3D73` |
| Accent | Azure | `#2F80ED` |
| AA text azure | Azure (accessible) | `#2068C9` |
| On-navy azure | Azure (soft) | `#9CC2F2` |
| Neutral / UI | Slate gray | `#606F7B` |
| Background | Cool light gray | `#F1F5F8` |

Rules:
- Accent (`#2F80ED`) is the brand emphasis hue — use for **large/decorative** elements, borders, callout borders, key highlights, and accents on dark/navy backgrounds. It is the brand's recognisable blue.
- **AA text azure (`#2068C9`)** is the official accessible shade for **small text, hyperlinks, and solid CTA fills on light backgrounds**, where bright `#2F80ED` fails WCAG AA contrast (≈3.86:1 on white; `#2068C9` passes at ≈5.4:1). Use it wherever azure carries body-size text or is a button fill with white text. This is recorded so it does not drift.
- **On-navy azure (`#9CC2F2`)** is the pale tint for small azure text on the sapphire-navy background (e.g. the hero eyebrow), where both other azures fail contrast on dark.
- Slate `#606F7B` is a neutral for UI chrome, borders, and secondary labels — **never body text** (fails WCAG AA on light backgrounds).
- Body text uses primary navy `#0F3D73`.
- All colours are 6-digit hex (pipeline requirement).

---

## Logo

Master mark is an upward double-chevron + arrow. All files are true vector SVG (wordmark text outlined — no font dependency).

| File | Use |
|------|-----|
| `tavren-logo-navy-transparent.svg` | Mark, navy, on light backgrounds |
| `tavren-logo-white-transparent.svg` | Mark, white, on dark/navy backgrounds |
| `tavren-lockup-horizontal-navy.svg` | Mark + wordmark, light backgrounds (web header, footers) |
| `tavren-lockup-horizontal-white.svg` | Mark + wordmark, dark backgrounds |
| `tavren-lockup-stacked-navy.svg` | Square/centred contexts, light backgrounds |
| `tavren-lockup-stacked-white.svg` | Square/centred contexts, dark backgrounds (incl. PDF cover) |
| `tavren-wordmark-navy.svg` / `-white.svg` | Wordmark alone, when the mark appears elsewhere |

**md-to-pdf pipeline:** the cover page sits on the navy `primary_colour`, so the brand-folder `logo.svg` must be the **white** artwork. Use `tavren-logo-white-transparent.svg` (mark only) or `tavren-lockup-stacked-white.svg` (mark + word) renamed to `logo.svg`.

---

## Typography

Type system is the Red Hat family (free, open-source, Google Fonts):

- **Red Hat Display** — cover titles and headings
- **Red Hat Text** — body, TOC, footer, callout labels
- **Red Hat Mono** — code

The logo wordmark is already outlined, so it needs no font installed. The **document body and headings do** — the pipeline needs these `.ttf` files in its `fonts/` folder:

- `RedHatDisplay-Bold.ttf`
- `RedHatDisplay-Medium.ttf`
- `RedHatText-Regular.ttf`
- `RedHatText-Medium.ttf`
- `RedHatMono-Regular.ttf`

---

## config.yaml (canonical)

This is the locked brand config for the md-to-pdf pipeline. Reproduce exactly.

```yaml
brand_name: "Tavren"
primary_colour: "#0F3D73"
accent_colour: "#2F80ED"
footer_text: "tavrensolutions.com"
logo: "logo.svg"

# cover_background_image: "cover-bg.jpeg"     # optional; omit for solid navy cover
# cover_background_overlay: 0.65

heading_colour: "#0F3D73"
subheading_colour: "#185FA5"
body_colour: "#0F3D73"

fonts:
  cover_title: "RedHatDisplay-Bold"
  cover_subtitle: "RedHatText-Regular"
  heading: "RedHatDisplay-Medium"
  heading_bold: "RedHatDisplay-Bold"
  body: "RedHatText-Regular"
  callout: "RedHatText-Medium"
  code: "RedHatMono-Regular"
  footer: "RedHatText-Regular"
  toc: "RedHatText-Regular"

callouts:
  purpose:
    label: "PURPOSE"
    border_colour: "#2F80ED"
    background_colour: "#E8F1FC"
  why-this-matters:
    label: "WHY THIS MATTERS"
    border_colour: "#0F3D73"
    background_colour: "#EEF3F8"
  key-point:
    label: "KEY POINT"
    border_colour: "#2F80ED"
    background_colour: "#E8F1FC"
  warning:
    label: "WARNING"
    border_colour: "#DC2626"
    background_colour: "#FEF2F2"
```

---

## Notes

- The prompt-pack formatting skill (`asymmetric-ai-prompt-pack`) governs document *structure*; this skill governs *brand identity*. The two are complementary. The prompt-pack skill should be renamed/updated to Tavren as a separate task.
- When a brand decision changes, update this file first, then regenerate affected assets.
