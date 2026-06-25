// Terms-of-Sale gating for paid buy buttons.
//
// Each [data-buy-gate] holds a checkbox ([data-terms-check]) and a buy <a>
// (.buy-btn). The <a> is server-rendered DISABLED: aria-disabled="true",
// tabindex="-1", and crucially WITHOUT the `lemonsqueezy-button` class, so
// lemon.js cannot open the overlay. Ticking the checkbox enables it:
//   - adds `lemonsqueezy-button` (lemon.js then handles the click → overlay)
//   - makes it focusable/clickable
// If lemon.js fails to load, the <a href> still opens the hosted checkout in a
// new tab, so a sale is never blocked by a script error.
(function () {
  'use strict';

  function enable(btn, on) {
    if (on) {
      btn.classList.add('lemonsqueezy-button', 'is-enabled');
      // lemon.js binds click handlers only to .lemonsqueezy-button elements that
      // exist when it initialises (on window load). This button gains the class
      // dynamically, so re-run lemon.js's binding pass; createLemonSqueezy() calls
      // its Refresh() (re-scan + bind) when already initialised. Guarded so a
      // failed/blocked lemon.js still leaves the href fallback intact.
      if (typeof window.createLemonSqueezy === 'function') {
        window.createLemonSqueezy();
      }
      btn.setAttribute('aria-disabled', 'false');
      btn.setAttribute('tabindex', '0');
    } else {
      btn.classList.remove('lemonsqueezy-button', 'is-enabled');
      btn.setAttribute('aria-disabled', 'true');
      btn.setAttribute('tabindex', '-1');
    }
  }

  document.querySelectorAll('[data-buy-gate]').forEach(function (gate) {
    var check = gate.querySelector('[data-terms-check]');
    var btn = gate.querySelector('.buy-btn');
    if (!check || !btn) return;

    // Reflect initial state (in case the browser restores a ticked box).
    enable(btn, check.checked);

    check.addEventListener('change', function () {
      enable(btn, check.checked);
    });

    // Hard block: if disabled, swallow the click so neither the overlay nor
    // the fallback href can fire until Terms are accepted.
    btn.addEventListener('click', function (e) {
      if (btn.getAttribute('aria-disabled') === 'true') {
        e.preventDefault();
        e.stopPropagation();
        check.focus();
      }
    });
    // Block keyboard activation while disabled.
    btn.addEventListener('keydown', function (e) {
      if (btn.getAttribute('aria-disabled') === 'true' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        check.focus();
      }
    });
  });

  // --- GDPR marketing opt-in ----------------------------------------------
  // A second, OPTIONAL checkbox ([data-optin-check]) sits next to each buy
  // button (paid cards and the free kit). It is unticked by default, never
  // gates the purchase, and is fully independent of the Terms checkbox.
  //
  // The opt-in state is carried into the LemonSqueezy checkout as custom data —
  // the URL gains checkout[custom][marketing_optin]=true|false, recorded on the
  // order. https://docs.lemonsqueezy.com/help/checkout/passing-custom-data
  //
  // Adding the contact to the email tool is handled SERVER-SIDE by the
  // order_created webhook (see /webhook-worker), which is the authoritative
  // trigger. This client path no longer writes to the email tool — it only
  // logs, so there is a single source of truth and no double sign-up.

  // Opt-in state of the most recently clicked buy button, for the log below.
  var pendingOptin = false;

  // Rewrite the button href so it always reflects the current opt-in state.
  // data-buy-url is kept as the clean base, so toggling never stacks params.
  function setOptin(btn, on) {
    var base = btn.getAttribute('data-buy-url') || btn.getAttribute('href');
    if (!base) return;
    try {
      var u = new URL(base, window.location.href);
      u.searchParams.set('checkout[custom][marketing_optin]', on ? 'true' : 'false');
      btn.setAttribute('href', u.toString());
    } catch (e) {
      /* leave the href untouched if URL parsing is unavailable */
    }
  }

  document.querySelectorAll('[data-optin-check]').forEach(function (box) {
    var scope = box.closest('[data-buy-gate], [data-optin-wrap]');
    if (!scope) return;
    var btn = scope.querySelector('.buy-btn, .lemonsqueezy-button');
    if (!btn) return;

    // Initialise: marketing_optin=false on the href (unticked by default).
    setOptin(btn, box.checked);
    box.addEventListener('change', function () {
      setOptin(btn, box.checked);
    });
    // Remember the consent for this purchase at the moment it's initiated.
    btn.addEventListener('click', function () {
      pendingOptin = box.checked;
    });
  });

  function onCheckoutSuccess() {
    // Authoritative sign-up happens server-side in the order_created webhook
    // (/webhook-worker), keyed off the marketing_optin custom data on the order.
    // This handler deliberately does NOT write to the email tool — it only logs,
    // so opt-in has a single source of truth and buyers can't be added twice.
    if (!pendingOptin) return;
    console.log('[Tavren] marketing opt-in recorded on order; server webhook handles sign-up.');
  }

  // Register the lemon.js event handler once it's available (lemon.js is
  // deferred, so it may load after this script).
  function setupEvents() {
    if (window.LemonSqueezy && typeof window.LemonSqueezy.Setup === 'function') {
      window.LemonSqueezy.Setup({
        eventHandler: function (event) {
          if (event && event.event === 'Checkout.Success') onCheckoutSuccess(event.data);
        },
      });
      return true;
    }
    return false;
  }
  if (!setupEvents()) {
    var tries = 0;
    var poll = setInterval(function () {
      if (setupEvents() || ++tries > 40) clearInterval(poll);
    }, 250);
  }
})();
