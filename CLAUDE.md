# Tavren Solutions — Website (tavrensolutions.com)

A fast, static marketing site that sells Tavren's AI **toolkits** (structured prompt packs) to in‑house SAP teams preparing for the ECC‑to‑S/4HANA upgrade. Payment and fulfilment are handled entirely by **Lemon Squeezy** (USD, Merchant of Record) via a checkout overlay. The site's job is positioning, trust, and routing buyers to checkout with minimum friction.

> **Never `git push` without the owner's explicit instruction.** Review happens before every push.

---

## 1. Stack

- **Hosting:** GitHub Pages, public repo, served from the **repo root**, custom domain via `CNAME`. `.nojekyll` is present so Pages serves files as‑is (no Jekyll processing).
- **CSS:** Tailwind CSS, compiled **locally** with the Tailwind CLI to a committed `css/styles.css`. No CDN.
- **JS:** vanilla, no frameworks.
- **Build:** a small Node script (`build/build.mjs`) injects shared partials and renders the blog. One toolchain (Node), same as the Tailwind CLI.
- **Fonts:** self‑hosted Red Hat (Display/Text variable, Mono static), Latin‑subset woff2.
- **Analytics:** Plausible (cookieless) — **enabled** (live script in `src/partials/layout.html`; sets no cookies).
- **Checkout:** Lemon Squeezy overlay via `lemon.js` + `lemonsqueezy-button` links (see §7).

---

## 2. Architecture

You **edit `src/`**; the build regenerates the files Pages serves at the repo root. This keeps the shared `<head>`, header, footer and catalogue in one place instead of copy‑pasted across ~17 pages.

```
src/
  pages/*.html        Page content + YAML front-matter (index, toolkits, how-it-works,
                      about, faq, free-kit, contact, 404)
  legal/*.html        The 5 legal documents
  data/faq.json       SINGLE SOURCE OF TRUTH for the FAQ (drives the page + FAQPage JSON-LD)
  blog/posts/*.md     Blog posts (markdown + front-matter)
  blog/index.html     Blog listing template ({{{postList}}} token)
  partials/           layout.html (full <head>+skeleton), header.html, footer.html, trust-strip.html
  css/tailwind.css    Tailwind source (@font-face, @layer base/components)
build/
  build.mjs           Main build: partials + blog + sitemap + llms.txt + FAQPage JSON-LD. Output → repo root.
  render-products.mjs Server-renders the catalogue from products.json.
  fonts.mjs           Subsets the supplied .ttf to Latin woff2 (needs Python fonttools+brotli).
  images.mjs          Generates favicon set + og.png from the brand logos (sharp).
  serve.mjs           Local preview server (clean URLs, 404 fallback).
  check.mjs           Dev QA: overflow audit + screenshots (puppeteer-core, system Chrome).
  test-gating.mjs     Dev QA: verifies the Terms-of-Sale buy-button gating.

  ── generated + committed (served by Pages) ──
index.html, toolkits.html, how-it-works.html, about.html, faq.html, free-kit.html, contact.html, 404.html
blog/index.html + blog/<slug>.html
legal/*.html
css/styles.css        compiled Tailwind (committed)
js/                   main.js, hero-canvas.js, buy-button.js, contact-form.js
assets/               logos, fonts/, favicons/, audio/, og.png
products.json         SINGLE SOURCE OF TRUTH for the catalogue
sitemap.xml (generated), llms.txt (generated — curated site map for AI assistants), robots.txt, CNAME, .nojekyll, favicon.ico
```

**Front-matter** (top of each `src/pages` + `src/legal` + blog post): `title`, `description`, `canonical` (path), optional `ogType`, `ogImage`, `bodyClass`, `extraScripts`. Blog posts also take `date`, `category`, `readingTime`, and a `sources:` list of `{title, url}`.

**Template tokens:** `{{> name }}` includes a partial; `{{ key }}` inserts an HTML‑escaped value; `{{{ key }}}` inserts raw HTML. Catalogue tokens available in any page: `{{{seriesNav}}}`, `{{{toolkitSections}}}`, `{{{seriesOverview}}}`, `{{{freeKitCard}}}`.

---

## 3. Build & preview

Prerequisites: Node 18+ and (only for regenerating fonts) Python with `fonttools` + `brotli`.

```bash
npm install                # one-time
npm run build              # compile Tailwind (minified) + build the site → repo root
npm run dev                # build once, then serve at http://localhost:4321

# run separately while editing (two terminals):
npm run watch:css          # Tailwind --watch
npm run serve              # preview server

# regenerate assets (rarely needed — outputs are committed):
npm run fonts              # .ttf in assets/<family>/  →  Latin woff2 in assets/fonts/
npm run images             # logos  →  favicon set + assets/og.png
```

**Always run `npm run build` before committing** so `css/styles.css` and the root HTML reflect your `src/` edits.

---

## 4. Brand system (source of truth: the `tavren-brand` skill)

- **Palette:** Navy `#0F3D73` (primary + body text), Azure `#2F80ED` (accent), Slate `#606F7B` (UI chrome/labels — never body text), Cool gray `#F1F5F8` (background).
- **Accessibility note (important):** the bright brand azure `#2F80ED` fails WCAG AA contrast for small text and as a white‑on‑azure CTA fill on light backgrounds (~3.86:1). To meet the AA requirement, the functional `azure` token in `tailwind.config.js` is a marginally darker shade **`#2068C9`** (passes ~5.4:1), with `azure.bright` (`#2F80ED`) reserved for large/decorative/on‑navy accents and `azure.soft` (`#9CC2F2`) for small text on the navy hero. All pages currently score Lighthouse Accessibility 100.
- **Fonts:** Red Hat Display (headings), Red Hat Text (body), Red Hat Mono (code).
- **Logos** (in `assets/Tavern Logos …/`): horizontal‑navy in the header/footer, horizontal‑white on navy, stacked‑white for the OG image, navy mark for the favicon.

---

## 5. Add or change a product

Edit **`products.json`** only, then `npm run build`. Structure: top‑level `packPrice`, `bundlePrice`, `freeKit`, and `series[]` (each with `packs[]` of `{name, url, blurb}` and a `bundle` `{name, url}`). Prices are computed from `packPrice`/`bundlePrice`; the bundle saving (`5 × pack − bundle`) is calculated automatically. Buy buttons, Product JSON‑LD, and the home overview all regenerate from this file. Never hand‑edit prices in markup.

---

## 6. Add a blog post

Create `src/blog/posts/<slug>.md`:

```markdown
---
title: "…"
description: "…"
date: "2026-06-10"
category: "…"
readingTime: "6 min read"
sources:
  - title: "Source name"
    url: "https://…"
---

Markdown body…
```

Then `npm run build`. The post renders with `Article` JSON‑LD, a Sources section, a free‑kit CTA, and is added to the blog index and sitemap automatically. **Verify outbound links resolve before publishing.**

---

## 7. Checkout & the Terms-of-Sale gate

- `lemon.js` is loaded once in `layout.html`. Any `<a class="lemonsqueezy-button" href="<checkout URL>">` opens the overlay.
- **Free kit** is ungated — its link has `lemonsqueezy-button` from the start.
- **Paid buttons are gated** (`js/buy-button.js`): server‑rendered **disabled** (no `lemonsqueezy-button` class, `aria-disabled="true"`, `tabindex="-1"`). Ticking the per‑button "I accept the Terms of Sale" checkbox adds the class and makes it focusable, so the overlay cannot fire until Terms are accepted. The `href` is always present, so if `lemon.js` fails to load the link still opens the hosted checkout in a new tab. `build/test-gating.mjs` verifies all of this.

---

## 8. Integrations (configured)

- **Web3Forms:** **live** — the real `access_key` is set in `src/pages/contact.html` (hidden input). Submissions are forwarded to **contact@tavrensolutions.com**, which is a **Zoho Mail** mailbox. To change the key, edit that input and rebuild.
- **Plausible:** **enabled** — the live analytics snippet is in `src/partials/layout.html` (cookieless; sets no first-party cookies, so no consent banner is required).

---

## 9. Deployment (GitHub Pages + Namecheap)

1. Run `npm run build`, review the diff, commit.
2. Push to the public repo (only on the owner's instruction).
3. **GitHub:** repo → Settings → Pages → deploy from the `main` branch, `/ (root)`. The committed `CNAME` (`tavrensolutions.com`) sets the custom domain.
4. **Namecheap DNS:** add four `A` records for the apex pointing at GitHub Pages (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`) and a `CNAME` for `www` → `<user>.github.io`. Enable "Enforce HTTPS" in GitHub Pages once the certificate is issued.
5. `.nojekyll` is committed so Pages serves the files unprocessed.

---

## 10. Launch checklist

Run `npm run build`, start `npm run serve`, then:

- [ ] `node build/check.mjs` — no horizontal overflow, mobile + desktop.
- [ ] `node build/test-gating.mjs` — buy-button gating passes (overlay blocked until Terms ticked; fallback href present).
- [ ] Lighthouse mobile baseline (median of 3): **Performance ≥98, Accessibility 100, Best‑Practices 100, SEO 100, CLS 0** across all page types. Home is 98 (Plausible's third‑party origin adds simulated‑Slow‑4G LCP cost); toolkits/free‑kit 99; the rest 100. `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node node_modules/lighthouse/cli/index.js http://localhost:4321/ --form-factor=mobile --screenEmulation.mobile`
- [ ] All outbound blog links resolve (no 404s).
- [ ] No first‑party tracking cookies set on browse (verified — the no‑banner claim holds). Re‑confirm on the live domain that `lemon.js` sets nothing first‑party before checkout.
- [x] Web3Forms key set and Plausible enabled (§8).
- [ ] Favicon + OG render; reduced‑motion fallback (hero shows static gradient); keyboard/focus pass.
- [ ] 5 legal pages present with "pending legal review" banners; solicitor has reviewed the Terms of Sale withdrawal‑waiver and liability clauses.

---

## 11. Notes

- Legal pages: **Terms of Sale** and **Terms & Conditions** are approved (no draft banner). **Privacy Policy, Cookie Policy, and Disclaimer** still carry the "pending legal review" banner. Operating entity: **VBCJ Solutions Ltd** (trading as Tavren), registered in England & Wales, **Company No. 07598797** — shown in the footer statutory line and legal pages, never in branding. (Registered-office address is intentionally omitted from the site.)
- Catalogue: **24 buy buttons** (20 packs @ $779 + 4 series bundles @ $3,099) plus the free starter kit, all sourced from `products.json`. Integrity is verifiable with `node build/verify-catalogue.mjs`.
- `puppeteer-core` and `lighthouse` are dev‑only dependencies for QA; they drive the system Chrome and ship nothing to the site.
- Fonts/favicons/OG are committed; only regenerate them (`npm run fonts` / `npm run images`) if the source logos or font files change.
