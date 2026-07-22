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

// Optional GDPR marketing opt-in checkbox. Unticked by default, independent of
// the Terms checkbox, and NEVER required to buy. js/buy-button.js reads
// [data-optin-check] and writes its state into the LemonSqueezy checkout URL as
// custom data (marketing_optin). Reused by paid cards and the free kit.
function optinCheckbox(id) {
  return `
          <label class="mt-3 flex items-start gap-2.5 text-sm text-navy/90" for="${id}">
            <input type="checkbox" id="${id}" data-optin-check
                   class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-navy/30 text-azure accent-[#2F80ED] focus-visible:ring-2 focus-visible:ring-azure" />
            <span>Yes, email me occasional S/4HANA readiness tips and Tavren product updates. You can unsubscribe at any time. See our <a href="https://tavrensolutions.com/legal/privacy-policy" target="_blank" rel="noopener" class="link whitespace-nowrap">Privacy Policy<svg class="ml-0.5 inline h-3 w-3 align-[-0.1em]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="sr-only"> (opens in new tab)</span></a>.</span>
          </label>`;
}

// A paid, Terms-gated buy button. The <a> starts disabled: no live href and no
// `lemonsqueezy-button` class, so the overlay cannot fire. js/buy-button.js
// enables it (adds class + href) once the adjacent checkbox is ticked.
function gatedBuy(url, label, idx) {
  const id = `terms-${idx}`;
  return `
        <div class="buy-gate mt-6" data-buy-gate>
          <label class="flex items-center gap-2.5 text-sm text-navy/90" for="${id}">
            <input type="checkbox" id="${id}" data-terms-check
                   class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-navy/30 text-azure accent-[#2F80ED] focus-visible:ring-2 focus-visible:ring-azure" />
            <span>I have read and accept the <a href="/legal/terms-of-sale" target="_blank" rel="noopener" class="link whitespace-nowrap">Terms of Sale<svg class="ml-0.5 inline h-3 w-3 align-[-0.1em]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="sr-only"> (opens in new tab)</span></a>.</span>
          </label>
          ${optinCheckbox(`optin-${idx}`)}
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
        <p class="text-xs text-slate">Less than a single consultant day (typically $800–$1,200).</p>
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
    .map((s) => `<a href="#${s.id}" class="series-nav-link whitespace-nowrap" data-series-link="${s.id}">${esc(s.audience)}</a>`)
    .join('\n          ');
  const freeLink = `<a href="#free" class="series-nav-link whitespace-nowrap" data-series-link="free">Free</a>`;
  return `
    <div class="sticky top-16 z-30 mb-10 mt-10 rounded-2xl border border-navy/10 bg-white/95 px-5 py-3 shadow-sm backdrop-blur">
      <nav class="flex items-center justify-center gap-3 overflow-x-auto" aria-label="Jump to a toolkit series">
        <span class="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate" aria-hidden="true">Jump to</span>
        <span class="hidden h-5 w-px shrink-0 bg-navy/10 sm:block" aria-hidden="true"></span>
        ${freeLink}
        ${links}
      </nav>
    </div>`;
}

export function renderToolkitSections(data) {
  counter = 0;
  const freeSection = `
    <section id="free" class="scroll-mt-32 pt-16 pb-10" aria-labelledby="free-h">
      <div class="max-w-2xl reveal">
        <span class="eyebrow">Free · $0</span>
        <h2 id="free-h" class="mt-2 text-2xl font-bold sm:text-3xl">Start with the free starter kit</h2>
        <p class="mt-3 text-navy/80">A real, professionally built toolkit, built to the same standard of craft as the paid packs — the simplest way to judge the quality for yourself before you buy.</p>
      </div>
      <div class="mt-8" data-stagger>
        ${renderFreeKitCard(data)}
      </div>
    </section>`;
  const seriesSections = data.series
    .map((s) => {
      const packs = s.packs.map((p) => packCard(p, counter++)).join('\n');
      const bundle = bundleCard(s, data.packPrice, data.bundlePrice, counter++);
      return `
    <section id="${s.id}" class="scroll-mt-32 pt-16 pb-10" aria-labelledby="${s.id}-h">
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
  return freeSection + '\n' + seriesSections;
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
        <div class="mt-5 sm:mt-0 sm:w-72 sm:shrink-0" data-optin-wrap>
          <a class="btn btn-primary lemonsqueezy-button whitespace-nowrap" data-buy-url="${esc(k.url)}" href="${esc(k.url)}" target="_blank" rel="noopener">Download the free starter toolkit</a>
          ${optinCheckbox('optin-free')}
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
      image: `${BASE}/assets/og.png`,
      brand: { '@type': 'Brand', name: 'Tavren' },
      category: 'SAP S/4HANA readiness toolkit',
      url,
      offers: {
        '@type': 'Offer',
        price: price.toFixed(2),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url,
        // Digital downloads: no physical shipping; all sales final (see /legal/terms-of-sale).
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'USD' },
          shippingDestination: { '@type': 'DefinedRegion', addressCountry: ['GB', 'US'] },
          // Digital download: instant delivery, no handling or transit time.
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
            transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
          },
        },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: ['GB', 'US'],
          returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
        },
      },
    };
  }
}
