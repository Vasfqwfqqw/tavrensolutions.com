// /tcodes/ hub: fetch the generated data.json and wire up search + filters.
// The "Browse by module" section below is static HTML and works with this
// script disabled or failing to load.
(function () {
  'use strict';
  var searchInput = document.getElementById('tcode-search');
  var moduleFilter = document.getElementById('tcode-module-filter');
  var statusFilter = document.getElementById('tcode-status-filter');
  var resultsBody = document.getElementById('tcode-results');
  var countEl = document.getElementById('tcode-result-count');
  if (!searchInput || !resultsBody) return;

  var rows = [];

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function render() {
    var q = searchInput.value.trim().toLowerCase();
    var mod = moduleFilter.value;
    var status = statusFilter.value;
    var matches = rows.filter(function (r) {
      if (mod && r.module !== mod) return false;
      if (status && r.status !== status) return false;
      if (q && r.tcode.toLowerCase().indexOf(q) === -1 && r.successor.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var shown = matches.slice(0, 200);
    resultsBody.innerHTML = shown
      .map(function (r) {
        return (
          '<tr class="border-b border-navy/10">' +
          '<td class="py-2 pr-4 font-mono"><a href="' + r.url + '" class="text-azure hover:underline">' + escapeHtml(r.tcode) + '</a></td>' +
          '<td class="py-2 pr-4">' + escapeHtml(r.moduleLabel) + '</td>' +
          '<td class="py-2 pr-4">' + escapeHtml(r.status) + '</td>' +
          '<td class="py-2 pr-4">' + escapeHtml(r.successor) + '</td>' +
          '</tr>'
        );
      })
      .join('');
    countEl.textContent =
      matches.length === rows.length
        ? matches.length + ' t-codes'
        : matches.length + ' of ' + rows.length + ' t-codes' + (matches.length > shown.length ? ' (showing first ' + shown.length + ')' : '');
  }

  fetch('/tcodes/data.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      rows = data;
      render();
      searchInput.addEventListener('input', render);
      moduleFilter.addEventListener('change', render);
      statusFilter.addEventListener('change', render);
    })
    .catch(function () {
      countEl.textContent = 'Search is unavailable right now — use "Browse by module" below.';
    });
})();
