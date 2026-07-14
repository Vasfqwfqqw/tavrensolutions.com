# /tcodes/ section — design spec

Status: draft, awaiting user approval
Owner request: build an 829-page (828 codes + 1 hub) SAP ECC→S/4HANA t-code
reference section, generated from an external open dataset, business-user
framed, British English.

## 1. Source of truth for decisions already made

The user's brief and answers to clarifying questions fixed these:

- **Generator = Node, integrated.** `build/build-tcodes.mjs`, exporting a
  `buildTcodes()` called from `build/build.mjs`'s `main()`, same pattern as
  `buildBlog()`/`buildPages()`. One `npm run build` regenerates the whole
  site including `/tcodes/`, `sitemap.xml`, and `llms.txt` in one pass —
  no standalone Python script, no second toolchain.
- **Dataset is vendored.** Copy
  `s4hana-tcode-dataset.json` (v1.1.0, 828 records) from the external
  TavrenAgents path into this repo at `data/s4hana-tcode-dataset.json`.
  Future dataset releases: drop in a new copy of that file, re-run
  `npm run build`. The build never depends on a sibling checkout existing.
- **Hub table data = separate fetched JSON.** `/tcodes/data.json`
  (generated), fetched by a plain-JS filter script. Keeps the hub page's
  initial HTML light and lets the browser cache the data file once.
- **Dataset credit URL** confirmed as given:
  `github.com/Vasfqwfqqw/s4hana-tcode-dataset` (CC BY 4.0).
- **Mid-turn addition:** the hub must contain **static, crawlable `<a>`
  links to all 828 pages in the raw server-rendered HTML**, not only in
  the JS-fetched filter table. No `display:none`/CSS-hide trick (avoids
  anything that reads as cloaking). Solution: a permanent "Browse by
  module" section, grouped `<h2>`/`<ul><li><a>` per module, rendered at
  build time directly into the hub's HTML, sitting below the interactive
  filter tool. Both are visible in normal page flow; the filter table is
  the enhanced UX, the module lists are the crawlable baseline.

## 2. Architecture

```
data/s4hana-tcode-dataset.json      vendored dataset (source of truth)
build/build-tcodes.mjs              new module: reads dataset, generates:
                                       - /tcodes/{TCODE}/index.html  x828
                                       - /tcodes/index.html          (hub)
                                       - /tcodes/data.json           (hub filter data)
                                     returns { urls, count } to build.mjs
build/build.mjs                     main() calls buildTcodes() after buildBlog(),
                                     merges its urls into the shared sitemap array,
                                     passes its summary into buildLlms()
js/tcodes-filter.js                 new, plain JS: fetch data.json, wire search
                                     box + module/status <select> filters, render
                                     rows into the table body
```

`build-tcodes.mjs` reuses `build.mjs`'s existing template primitives
(`renderDocument`, `includePartials`, `escHtml`, `faqPageLd`,
`breadcrumbLd`) by importing them — these get a small refactor from
private functions to named exports (no behaviour change).

## 3. Per-code page (`/tcodes/{TCODE}/`)

**URL / slug:** the literal `tcode` field, uppercase, e.g. `/tcodes/FBL1N/`.
Dataset has zero duplicate tcodes (verified) and all sampled codes are
`[A-Z0-9_]+` — the generator will assert this pattern per record and fail
the build loudly if a future dataset release introduces anything else,
rather than silently mangling a URL.

**H1** (literal question, per record `status`):
- `status === 'replaced'` → `What replaces {TCODE} in S/4HANA?`
- everything else (`deleted`, `changed`, `available`) → `What happens to
  {TCODE} in SAP S/4HANA?`

**First paragraph** — 2–3 sentences, built only from `status` +
`replacement` + `delta_note` (the dataset's `description` field is empty
on all 828 records, confirmed, so it's never a source). Status-specific
sentence templates, e.g.:
- `changed` + delta_note present: opens with "X still runs after go-live"
  framing, states the strategic Fiori successor if `replacement` is set,
  compresses the delta_note's key point.
- `replaced` + `replacement` filled: names the successor directly.
- `replaced`, `replacement` empty (the common case — 320 of 440 `replaced`
  records have no successor named yet): states it's marked replaced per
  the cited Simplification List item, successor not yet confirmed,
  flagged for review — no invented successor name.
- `deleted`: states it's removed at conversion, and what depends on
  `replacement`/`delta_note` being present.
- `available`: states it continues unchanged.

No forced use of "mainstream maintenance" on every page — that phrase
describes the 2027 timeline, not individual t-code fate, so it appears
verbatim only on the hub's framing copy and on `changed`/`available`
records where a delta_note naturally invokes continuity. Never
"post-migration"; "after go-live" throughout.

**Table** — ECC t-code · status · successor (`replacement`, with
`Fiori app: {fiori_app_id}` appended when set) · what changes for you.

**Body section, branched on `review_status`:**
- `reviewed` (197 records): show `delta_note` verbatim as "What changes
  at your desk." This is the human-verified claim — no additional
  citation is forced, though `sap_reference` is still shown as a footer
  line whenever the record happens to have one.
- `pending` (631 records): no delta_note shown (most have none anyway —
  only 26% of records carry one). Show status + a visible note:
  *"Machine-parsed from the SAP Simplification List — under human
  review."* Cite `sap_reference` and `source_item` as the anchor. 14
  records lack even `sap_reference` (2% of the dataset) — for those, the
  note states the record could not be matched to a specific
  Simplification List item and is pending review, no fabricated citation.

**Cross-links:** 4–6 sibling codes from the same `module`, reviewed
records preferred over pending, excluding self, plus a link back to
`/tcodes/`. Modules range from 1 record (e.g. `IND-Banking`, `CS`) to 101
(`EHS`) — where fewer than 4 siblings exist, show however many there are
(down to zero, in which case just the hub link shows).

**Module display:** dataset module codes (`FI-AP`, `CO`, `EHS`,
`IND-Automotive`, `CROSS`, …) get a small friendly-label lookup (e.g.
"Accounts Payable (FI-AP)") for headers/badges/filter options, since the
audience is business end users who won't know SAP module shorthand. Raw
code always kept in parentheses for traceability. Unmapped/future module
codes fall back to showing the raw code alone.

**FAQPage JSON-LD:** one Q/A pair — question = the literal H1, answer =
the first paragraph (tags stripped via the existing `stripTags` helper).

**Free-kit footer CTA:** same navy CTA block pattern as blog posts, link
`href="/free-kit?src=tcodes"` (matches the `src=tcodes` value already
named in `layout.html`'s attribution comment). Not `data-kit-signup`
itself — that attribute lives on the actual signup button on `/free-kit`,
which reads `?src=` from the page's own URL at click time, so the
`?src=tcodes` param just needs to survive the click-through.

**Dataset credit footer line:** "Data: SAP S/4HANA t-code fate dataset
v1.1.0 — github.com/Vasfqwfqqw/s4hana-tcode-dataset (CC BY 4.0)."

## 4. Hub (`/tcodes/`)

- H1: "What happens to your ECC transaction codes in S/4HANA?"
- Direct-answer first paragraph (what the section is, how many codes, how
  it's sourced/reviewed).
- Interactive filter tool: search box + module `<select>` + status
  `<select>`, plain JS (`js/tcodes-filter.js`), fetches `/tcodes/data.json`
  at runtime, renders a table of matching rows linking to each page.
- **Static "Browse by module" section** (new, from the mid-turn note):
  every module as an `<h2>`, every code in it as a plain `<li><a
  href="/tcodes/{code}/">`, generated at build time straight into the
  HTML. All 828 links present with zero JS required. Sits below the
  filter tool in normal document flow.
- `CollectionPage` JSON-LD (same pattern as `/readiness`).

## 5. Plumbing

- Nav (`header.html`) + footer (`footer.html`): add a "T-code reference"
  link to `/tcodes`.
- `llms.txt`: replace the existing placeholder line (`build.mjs:322`,
  currently "SAP t-code reference (/tcodes/): Coming soon…") with the hub
  link + "one page per code, 828 total."
- `robots.txt`: no change needed — already `User-agent: * / Allow: /`,
  which covers GPTBot/ClaudeBot/PerplexityBot by default.
- `sitemap.xml`: `buildTcodes()` pushes 829 entries into the same `urls`
  array `buildBlog()`/`buildPages()` use, so `buildSitemap()` picks them
  up automatically. Priority: hub `0.6` (same tier as blog index), code
  pages `0.4`.

## 6. Verification before push

- Build once, spot-check FBL1N (`changed`, reviewed, exact delta_note
  about saved layouts and the F0712 app), one `pending` record, one
  `deleted` record.
- Confirm generated page count = 828 + 1, sitemap entry count grew by
  829, `llms.txt` placeholder line is gone.
- Run `node build/check.mjs` (overflow audit) against a sample of tcode
  pages plus the hub.
- No `git push` until the user gives final OK (per this repo's standing
  rule).

## 7. Out of scope / explicitly not doing

- Not rewriting `description` — it's empty dataset-wide, not used.
- Not inventing successors for the 320 `replaced`+pending records with no
  named replacement — stated as "not yet confirmed."
- Not hiding the static module link list behind CSS — avoids anything
  that could read as cloaking to a crawler.
