// Bespoke hero animation: a slow-drifting field of fine pale-blue nodes + lines
// over the sapphire-navy hero. Calm, uncluttered, brand-aligned.
//   - Respects prefers-reduced-motion (does nothing; CSS shows a static gradient).
//   - Reduces node count on small screens.
//   - Initialised after load so it never blocks first paint.
(function () {
  'use strict';
  var canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ctx = canvas.getContext('2d');
  var nodes = [];
  var w = 0,
    h = 0,
    dpr = Math.min(window.devicePixelRatio || 1, 2);
  var raf = null;

  function size() {
    var rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function build() {
    var mobile = w < 640;
    var density = mobile ? 14000 : 9000; // px² per node — fewer on mobile
    var count = Math.max(12, Math.min(70, Math.round((w * h) / density)));
    nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.4 + 0.6,
      });
    }
  }

  var LINK = 130; // link distance
  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
      // links
      for (var j = i + 1; j < nodes.length; j++) {
        var m = nodes[j];
        var dx = n.x - m.x,
          dy = n.y - m.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < LINK) {
          ctx.globalAlpha = (1 - d / LINK) * 0.18;
          ctx.strokeStyle = '#8FB8F0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        }
      }
    }
    // nodes
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#AFCBF5';
    for (var k = 0; k < nodes.length; k++) {
      var p = nodes[k];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function start() {
    size();
    build();
    cancelAnimationFrame(raf);
    frame();
  }

  // Pause when offscreen to save battery.
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        if (!raf) frame();
      } else {
        cancelAnimationFrame(raf);
        raf = null;
      }
    });
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(start, 200);
  });

  window.addEventListener('load', function () {
    start();
    io.observe(canvas);
  });
})();
