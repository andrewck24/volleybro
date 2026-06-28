(function () {
  var path = location.pathname;

  // Capture everything before /changes/ as siteRoot (e.g. '/volleybro' or '').
  var m = path.match(/^(.*?)\/changes\/((?:archive\/)?)([^/]+)\//);
  if (!m) return;

  var siteRoot    = m[1];
  var prefix      = m[2];
  var dirName     = m[3];
  var changePath  = siteRoot + '/changes/' + prefix + dirName + '/';
  var changeParam = prefix + dirName;
  var displayName = dirName.replace(/^\d{4}-\d{2}-\d{2}-/, '');

  var segments    = path.split('/');
  var currentFile = segments[segments.length - 1].replace(/\.html$/, '');
  var inSpecs     = path.indexOf(changePath + 'specs/') === 0;
  if (inSpecs) currentFile = '__specs__';

  var DARK  = '--bg:#0c0c10;--surface:#14141c;--border:#22222e;--text:#e2e2f0;--muted:#7878a0;--accent:#818cf8;--ok:#34d399;--warn:#fbbf24;--bad:#f87171;--fg:#e2e2f0;--card:#14141c;--line:#22222e;--mut:#7878a0';
  var LIGHT = '--bg:#f4f4f9;--surface:#ffffff;--border:#dddde8;--text:#1a1a2e;--muted:#6868a0;--accent:#6366f1;--ok:#059669;--warn:#d97706;--bad:#dc2626;--fg:#1a1a2e;--card:#ffffff;--line:#dddde8;--mut:#6868a0';

  function getTheme() { return localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'); }

  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    var vars = t === 'dark' ? DARK : LIGHT;
    vars.split(';').forEach(function (v) {
      var i = v.indexOf(':');
      if (i > 0) document.documentElement.style.setProperty(v.slice(0, i).trim(), v.slice(i + 1).trim());
    });
    var btn = document.getElementById('__sh-theme');
    if (btn) btn.textContent = t === 'dark' ? '☀' : '☾';
  }

  applyTheme(getTheme());

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
    });
  }

  function buildBar(manifest) {
    var a     = manifest && manifest.artifacts || {};
    var specs = manifest && manifest.specs || [];

    function tab(id, label, href) {
      var cur = id === currentFile ? ' aria-current="page"' : '';
      return '<a class="__sh-tab"' + cur + ' href="' + esc(href) + '">' + esc(label) + '</a>';
    }

    var tabs = '';
    if (!manifest || (a.proposal && (a.proposal.html || a.proposal.md)))
      tabs += tab('proposal', 'Proposal', changePath + 'proposal.html');
    if (specs.length === 1)
      tabs += tab('__specs__', 'Spec', changePath + 'specs/' + specs[0].name + '/spec.html');
    else if (specs.length > 1)
      tabs += tab('__specs__', 'Specs (' + specs.length + ')', siteRoot + '/shell.html?change=' + encodeURIComponent(changeParam) + '#specs');
    if (!manifest || (a.design && (a.design.html || a.design.md)))
      tabs += tab('design', 'Design', changePath + 'design.html');
    tabs += tab('tasks', 'Tasks', changePath + 'tasks.html');
    if (manifest && a.review && (a.review.html || a.review.md))
      tabs += tab('review', 'Review', changePath + 'review.html');

    var t = getTheme();
    return '<div id="__sh-in">' +
      '<a class="__sh-a" href="' + esc(siteRoot + '/index.html') + '">← All</a>' +
      '<span class="__sh-sep" aria-hidden="true"></span>' +
      '<a class="__sh-a" id="__sh-name" href="' + esc(siteRoot + '/shell.html?change=' + changeParam) + '">' + esc(displayName) + '</a>' +
      '<nav id="__sh-tabs" aria-label="Artifacts">' + tabs + '</nav>' +
      '<button id="__sh-theme" title="Toggle theme" aria-label="Toggle theme">' + (t === 'dark' ? '☀' : '☾') + '</button>' +
      '</div>';
  }

  function wireTheme() {
    var btn = document.getElementById('__sh-theme');
    if (btn) btn.onclick = function () {
      var n = getTheme() === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', n);
      applyTheme(n);
    };
  }

  function init() {
    var css = document.createElement('style');
    css.textContent =
      '#__sh{position:sticky;top:0;z-index:100;font-family:"Bricolage Grotesque",system-ui,sans-serif;' +
        'background:color-mix(in srgb,var(--bg,#0c0c10) 90%,transparent);backdrop-filter:blur(14px);' +
        'border-bottom:1px solid var(--border,#22222e)}' +
      '#__sh-in{display:flex;align-items:center;gap:4px;max-width:1140px;margin:0 auto;padding:0 16px;min-height:48px}' +
      '.__sh-a{appearance:none;background:none;border:0;cursor:pointer;' +
        'font:14px/1 "Bricolage Grotesque",system-ui,sans-serif;color:var(--muted,#7878a0);' +
        'padding:5px 9px;border-radius:6px;text-decoration:none;white-space:nowrap}' +
      '.__sh-a:hover{color:var(--text,#e2e2f0);background:var(--surface,#14141c)}' +
      '#__sh-name{font-family:"IBM Plex Mono",monospace;font-size:12px;font-weight:500;' +
        'letter-spacing:-.2px;color:var(--text,#e2e2f0)}' +
      '.__sh-sep{width:1px;height:14px;background:var(--border,#22222e);margin:0 2px;flex-shrink:0}' +
      '#__sh-tabs{display:flex;align-items:flex-end;height:48px;margin-left:auto;overflow-x:auto}' +
      '.__sh-tab{appearance:none;background:none;border:0;border-bottom:2px solid transparent;' +
        'color:var(--muted,#7878a0);padding:6px 11px;' +
        'font:13px/1 "Bricolage Grotesque",system-ui,sans-serif;' +
        'cursor:pointer;height:100%;white-space:nowrap;text-decoration:none;' +
        'display:inline-flex;align-items:center;transition:color .12s,border-color .12s}' +
      '.__sh-tab[aria-current]{color:var(--accent,#818cf8);border-bottom-color:var(--accent,#818cf8)}' +
      '.__sh-tab:hover{color:var(--text,#e2e2f0)}' +
      '#__sh-theme{appearance:none;background:var(--surface,#14141c);border:1px solid var(--border,#22222e);' +
        'cursor:pointer;font-size:13px;padding:3px 10px;border-radius:20px;color:var(--muted,#7878a0);' +
        'margin-left:8px;flex-shrink:0;line-height:1.6;transition:border-color .12s}' +
      '#__sh-theme:hover{border-color:var(--accent,#818cf8);color:var(--text,#e2e2f0)}';
    document.head.appendChild(css);

    var bar = document.createElement('header');
    bar.id = '__sh';
    document.body.insertBefore(bar, document.body.firstChild);

    bar.innerHTML = buildBar(null);
    wireTheme();

    fetch(changePath + 'manifest.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (manifest) {
        if (!manifest) return;
        bar.innerHTML = buildBar(manifest);
        wireTheme();
        applyTheme(getTheme());
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
