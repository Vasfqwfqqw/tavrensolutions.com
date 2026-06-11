# Tavren Solutions Website — Design / Spec

Date: 2026-06-10 · Status: approved, built

## Goal
A fast, premium, conversion-focused static marketing site selling Tavren's AI toolkits to in-house SAP teams preparing for the ECC-to-S/4HANA upgrade. Primary goal: route buyers to the Lemon Squeezy checkout overlay. Secondary: capture emails via the free starter kit.

## Key decisions (owner-approved)
- **Build:** static site, `.nojekyll`; one Node build script injects shared partials and renders markdown blog posts; Tailwind compiled locally and committed. (Q1)
- **Toolkits page:** single `/toolkits` page, four anchored series sections + sticky in-page series nav. (Q2)
- **Operating entity:** "VBCJ Solutions Ltd" appears only in footer fine-print + legal pages, never in branding. (Q3)
- **Terms gate:** per-button Terms-of-Sale checkbox; the buy button (and Lemon Squeezy overlay) is inert until ticked; free kit ungated. Implemented as lightly as possible. (Q4)
- **Accepted improvements:** `products.json` as single source of truth; quiet enterprise/PO path under each bundle; auto-generated favicons + OG; reusable buy-button + trust-strip components.

## Architecture
`src/` (edited) → `build/build.mjs` → repo-root HTML (served by Pages). Catalogue server-rendered from `products.json` for SEO/no-JS; gating wired client-side. See `CLAUDE.md` for the full map, commands, and maintenance.

## Pages
Home, Toolkits, How it works (incl. live podcast player), About, Free starter kit, Blog (index + 5 cornerstone posts), Contact (Web3Forms AJAX), 5 legal documents, 404.

## Brand & accessibility
Locked palette/fonts from the `tavren-brand` skill. The bright accent `#2F80ED` fails WCAG AA for small text / CTA fills on light, so the functional `azure` token is a darker shade `#2068C9` (passes AA), with the bright hue kept for large/decorative/on-navy use. Lighthouse mobile = 100/100/100/100 across page types.

## Content integrity
- Blog post #1 states the SAP maintenance timeline accurately (ECC EHP 6–8 mainstream maintenance ends 31 Dec 2027; extended maintenance to 31 Dec 2030; older EHPs ended 2025; successor maintained to 2040) — not a single cliff. Primary source: SAP.
- The unverifiable Horváth "~30% longer" statistic was **dropped** (could not substantiate a citable primary).
- McKinsey/Gartner pages block automated requests; verified via live search index, owner to eyeball before publish.

## Outstanding before launch
Web3Forms access key; enable Plausible; solicitor review of legal placeholders (esp. withdrawal-waiver + liability); confirm `lemon.js` sets no first-party cookies on the live domain.
