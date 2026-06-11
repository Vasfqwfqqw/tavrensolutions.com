// Global UI behaviour: mobile menu, active nav, scroll-reveal, series scrollspy.
(function () {
  'use strict';

  // --- Mobile menu ---------------------------------------------------------
  var toggle = document.getElementById('menu-toggle');
  var menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('hidden') === false;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // --- Active nav link -----------------------------------------------------
  var path = location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-link').forEach(function (a) {
    var href = a.getAttribute('href');
    var match = href === '/' ? path === '/' : path === href || path.indexOf(href + '/') === 0;
    if (match) {
      a.setAttribute('aria-current', 'page');
      a.classList.add('text-azure');
      a.classList.remove('text-navy/80');
    }
  });

  // --- Scroll & entrance reveal -------------------------------------------
  var reveals = document.querySelectorAll('.reveal');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Stagger: within any [data-stagger] group, give each .reveal a small
  // incremental delay so the eye is led down the group. Capped so later items
  // never feel slow.
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    var items = group.querySelectorAll('.reveal');
    items.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i, 7) * 110 + 'ms';
    });
  });

  if (reveals.length && 'IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  // --- Toolkit series scrollspy -------------------------------------------
  var seriesLinks = document.querySelectorAll('[data-series-link]');
  if (seriesLinks.length && 'IntersectionObserver' in window) {
    var setActive = function (id) {
      seriesLinks.forEach(function (l) {
        var on = l.getAttribute('data-series-link') === id;
        l.classList.toggle('bg-white', on);
        l.classList.toggle('text-azure', on);
      });
    };
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    document.querySelectorAll('section[id]').forEach(function (sec) {
      if (document.querySelector('[data-series-link="' + sec.id + '"]')) spy.observe(sec);
    });
  }
})();
