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
})();
