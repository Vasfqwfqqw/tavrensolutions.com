// Server-side rendering of the catalogue from products.json.
// Cards are emitted as HTML at build time (crawlable, works without JS); the
// Terms-of-Sale gating and LemonSqueezy overlay are wired up client-side
// (js/buy-button.js) against the data-attributes below.
const BASE = 'https://tavrensolutions.com';

export function money(n) {
  if (n === 0) return 'Free';
  return '$' + n.toLocaleString('en-US');
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// A paid, Terms-gated buy button. The <a> starts disabled: no live href and no
// `lemonsqueezy-button` class, so the overlay cannot fire. js/buy-button.js
// enables it (adds class + href) once the adjacent checkbox is ticked.
function gatedBuy(url, label, idx) {
  const id = `terms-${idx}`;
  return `
        <div class="buy-gate mt-5" data-buy-gate>
          <label class="flex items-start gap-2.5 text-sm text-navy/90" for="${id}">
            <input type="checkbox" id="${id}" data-terms-check
                   class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-navy/30 text-azure accent-[#2F80ED] focus-visible:ring-2 focus-visible:ring-azure" />
            <span>I have read and accept the <a href="/legal/terms-of-sale" class="link">Terms of Sale</a>.</span>
          </label>
          <a class="btn btn-primary btn-block mt-3 buy-btn" data-buy-url="${esc(url)}"
             href="${esc(url)}" target="_blank" rel="noopener"
             role="button" aria-disabled="true" tabindex="-1">${esc(label)}</a>
        </div>`;
}

function packCard(pack, idx) {
  return `
      <article class="card card-hover flex flex-col reveal" data-product>
        <h3 class="text-lg font-bold leading-snug">${esc(pack.name)}</h3>
        <p class="mt-2 flex-grow text-sm leading-relaxed text-navy/80">${esc(pack.blurb)}</p>
        <p class="mt-4 font-display text-2xl font-bold text-navy">$779 <span class="text-sm font-medium text-slate">USD</span></p>
        ${gatedBuy(pack.url, 'Buy now — $779', idx)}
      </article>`;
}

function bundleCard(series, packPrice, bundlePrice, idx) {
  const full = packPrice * series.packs.length;
  const saving = full - bundlePrice;
  return `
      <article class="card card-hover relative flex flex-col border-azure/40 bg-[#F7FAFE] lg:col-span-1 reveal" data-product>
        <span class="eyebrow">Best value</span>
        <h3 class="mt-1 text-lg font-bold leading-snug">${esc(series.bundle.name)}</h3>
        <p class="mt-2 flex-grow text-sm leading-relaxed text-navy/80">All five ${esc(series.audience)} toolkits in one purchase — the complete path from readiness to go-live.</p>
        <p class="mt-4">
          <span class="font-display text-2xl font-bold text-navy">${money(bundlePrice)}</span>
          <span class="ml-2 text-sm text-slate line-through">${money(full)}</span>
          <span class="ml-2 rounded-full bg-azure/10 px-2 py-0.5 text-xs font-semibold text-azure">Save ${money(saving)}</span>
        </p>
        ${gatedBuy(series.bundle.url, `Buy the bundle — ${money(bundlePrice)}`, idx)}
        <p class="mt-4 border-t border-navy/10 pt-3 text-xs text-slate">
          Buying for a team or need an invoice or PO?
          <a href="/contact" class="link">Get in touch</a>. A tax invoice is provided at checkout.
        </p>
      </article>`;
}

let counter = 0;

export function renderSeriesNav(data) {
  const links = data.series
    .map((s) => `<a href="#${s.id}" class="series-nav-link whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-navy/70 transition hover:bg-white hover:text-azure" data-series-link="${s.id}">${esc(s.audience)}</a>`)
    .join('\n        ');
  return `
    <div class="sticky top-16 z-30 -mx-5 mb-10 border-y border-navy/10 bg-cloud/90 px-5 py-2 backdrop-blur sm:-mx-6 sm:px-6">
      <nav class="container-tavren flex gap-2 overflow-x-auto" aria-label="Toolkit series">
        ${links}
      </nav>
    </div>`;
}

export function renderToolkitSections(data) {
  counter = 0;
  return data.series
    .map((s) => {
      const packs = s.packs.map((p) => packCard(p, counter++)).join('\n');
      const bundle = bundleCard(s, data.packPrice, data.bundlePrice, counter++);
      return `
    <section id="${s.id}" class="scroll-mt-32 py-10" aria-labelledby="${s.id}-h">
      <div class="max-w-2xl reveal">
        <span class="eyebrow">${esc(s.audience)}</span>
        <h2 id="${s.id}-h" class="mt-2 text-2xl font-bold sm:text-3xl">${esc(s.name)}</h2>
        <p class="mt-3 text-navy/80">${esc(s.blurb)}</p>
      </div>
      <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-stagger>
        ${packs}
        ${bundle}
      </div>
    </section>`;
    })
    .join('\n');
}

export function renderSeriesOverview(data) {
  return data.series
    .map(
      (s) => `
      <a href="/toolkits#${s.id}" class="card card-hover group flex flex-col reveal">
        <span class="eyebrow">${esc(s.audience)}</span>
        <h3 class="mt-2 text-xl font-bold">${esc(s.name)}</h3>
        <p class="mt-2 flex-grow text-sm leading-relaxed text-navy/80">${esc(s.blurb)}</p>
        <span class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-azure">
          View the series
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="transition group-hover:translate-x-0.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </a>`
    )
    .join('\n');
}

export function renderFreeKitCard(data) {
  const k = data.freeKit;
  return `
      <div class="card flex flex-col border-azure/30 bg-white sm:flex-row sm:items-center sm:gap-8">
        <div class="flex-grow">
          <span class="eyebrow">Free · $0</span>
          <h3 class="mt-2 text-2xl font-bold">${esc(k.name)}</h3>
          <p class="mt-2 max-w-xl text-navy/80">${esc(k.blurb)}</p>
        </div>
        <div class="mt-5 shrink-0 sm:mt-0">
          <a class="btn btn-primary lemonsqueezy-button" href="${esc(k.url)}" target="_blank" rel="noopener">Download the free starter toolkit</a>
        </div>
      </div>`;
}

// Product JSON-LD (@graph of Product+Offer) for the Toolkits page.
export function renderProductJsonLd(data) {
  const items = [];
  data.series.forEach((s) => {
    s.packs.forEach((p) => {
      items.push(product(p.name, p.blurb, data.packPrice, `${BASE}/toolkits#${s.id}`));
    });
    items.push(product(s.bundle.name, `All five ${s.audience} toolkits.`, data.bundlePrice, `${BASE}/toolkits#${s.id}`));
  });
  items.push(product(data.freeKit.name, data.freeKit.blurb, 0, `${BASE}/free-kit`));
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': items })}</script>`;

  function product(name, desc, price, url) {
    return {
      '@type': 'Product',
      name,
      description: desc,
      brand: { '@type': 'Brand', name: 'Tavren' },
      category: 'SAP S/4HANA readiness toolkit',
      url,
      offers: {
        '@type': 'Offer',
        price: price.toFixed(2),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url,
      },
    };
  }
}
