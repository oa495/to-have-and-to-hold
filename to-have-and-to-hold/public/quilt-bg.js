/*!
 * quilt-bg.js - random quilted-paper background.
 * Joins pre-quilted paper squares (plain, green-tinted, and crest-embossed) edge to edge with no
 * gaps. Stitching runs continuously across the squares. Every page load can get a new arrangement.
 *
 *   <script src="quilt-bg.js" data-base="/tiles/" defer></script>
 *
 * Options (data- attributes on the script tag, or QuiltBg.init({...})):
 *   target   CSS selector to paint (default "body")
 *   cell     size of one square in CSS px (default 300)
 *   grid     squares per side before the pattern repeats (default 5 -> a 1500px repeat)
 *   seed     a number for a fixed arrangement, or "random" (default: random each load)
 *   emblems  crest-embossed squares per repeat (default 2, never touching)
 *   greens   green squares per repeat (default 8, kept apart where possible)
 *   tint     "false" to turn off the slight shade difference between squares
 *   colors   {paper:'#f4eddb', green:'#...', olive:'#...', forest:'#...'} recolours that kind of square (keeps the grain and stitching)
 *   brightness  0 to 1, how much lighter the paper looks (default 0.45, 0 = as baked)
 */
(function (root) {
  'use strict';
  function seq(prefix, n) { var a = []; for (var i = 1; i <= n; i++) a.push(prefix + i + '.webp'); return a; }
  var D = { base: 'tiles/', target: 'body', cell: 300, grid: 5, seed: 'random', emblems: 2, greens: 5, olives: 4, forests: 3, tint: true, brightness: 0.3, colors: {},
            files: { plain: seq('tile_plain_', 5), green: seq('tile_green_', 6), emblem: seq('tile_emblem_', 2), olive: seq('tile_olive_', 3), forest: seq('tile_forest_', 3) } };

  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function neighbours(idx, n) {
    var x = idx % n, y = (idx / n) | 0;
    return [y * n + (x + 1) % n, y * n + (x + n - 1) % n, ((y + 1) % n) * n + x, ((y + n - 1) % n) * n + x];
  }

  // which kind of square goes where. Every coloured square (olive, forest, green paper) is kept away
  // from every other coloured square, so the colour spreads out; crests only avoid other crests.
  var COLOURED = { olive: 1, forest: 1, green: 1 };
  function layout(o, rnd) {
    var n = o.grid, cells = [], i;
    for (i = 0; i < n * n; i++) cells.push('plain');
    function diag(idx) {
      var x = idx % n, y = (idx / n) | 0, r = [];
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (d) { r.push(((y + d[1] + n) % n) * n + (x + d[0] + n) % n); });
      return r;
    }
    function place(kind, count) {
      for (var placed = 0; placed < count; placed++) {
        var best = Infinity, opts = [];
        for (var idx = 0; idx < n * n; idx++) {
          if (cells[idx] !== 'plain') continue;
          var sc = 0;
          neighbours(idx, n).forEach(function (k) {
            if (kind === 'emblem') { if (cells[k] === 'emblem') sc += 100; }
            else if (COLOURED[cells[k]]) sc += cells[k] === kind ? 40 : 30;
          });
          if (kind !== 'emblem') diag(idx).forEach(function (k) { if (COLOURED[cells[k]]) sc += 3; });
          sc += rnd() * 0.5;
          if (sc < best - 1e-9) { best = sc; opts = [idx]; } else if (Math.abs(sc - best) < 1e-9) opts.push(idx);
        }
        if (!opts.length) return;
        cells[opts[Math.floor(rnd() * opts.length)]] = kind;
      }
    }
    place('emblem', o.emblems); place('forest', o.forests); place('olive', o.olives); place('green', o.greens);
    return cells;
  }

  function hex2rgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  var recolorCache = {};
  // shift a tile so its average colour becomes `hex`, keeping grain, blotches and stitching
  function recolor(img, hex) {
    var key = img.src + '|' + hex; if (recolorCache[key]) return recolorCache[key];
    var w = img.naturalWidth, h = img.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'); g.drawImage(img, 0, 0);
    var d = g.getImageData(0, 0, w, h), p = d.data, i, n = w * h, sr = 0, sg = 0, sb = 0, t = hex2rgb(hex);
    for (i = 0; i < p.length; i += 4 * 7) { sr += p[i]; sg += p[i + 1]; sb += p[i + 2]; }
    var k = n / 7, mr = sr / k, mg = sg / k, mb = sb / k;
    var fr = t[0] / Math.max(mr, 1), fg = t[1] / Math.max(mg, 1), fb = t[2] / Math.max(mb, 1);
    for (i = 0; i < p.length; i += 4) { p[i] = Math.min(255, p[i] * fr); p[i + 1] = Math.min(255, p[i + 1] * fg); p[i + 2] = Math.min(255, p[i + 2] * fb); }
    g.putImageData(d, 0, 0);
    recolorCache[key] = c; return c;
  }
  var COLOR_KEY = { plain: 'paper', emblem: 'paper', green: 'green', olive: 'olive', forest: 'forest' };

  function load(src) { return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('quilt-bg: could not load ' + src)); }; im.src = src; }); }

  function build(o) {
    var dpr = Math.min(root.devicePixelRatio || 1, 2), cs = Math.round(o.cell * dpr), n = o.grid, size = cs * n;
    var seed = o.seed === 'random' ? Math.floor(Math.random() * 1e9) : (parseInt(o.seed, 10) || 1);
    var rnd = mulberry(seed), kinds = ['plain', 'green', 'emblem', 'olive', 'forest'];
    var jobs = kinds.map(function (k) { return Promise.all(o.files[k].map(function (f) { return load(o.base + f); })); });
    return Promise.all(jobs).then(function (sets) {
      var pools = { plain: sets[0], green: sets[1], emblem: sets[2], olive: sets[3], forest: sets[4] };
      var c = document.createElement('canvas'); c.width = c.height = size;
      var g = c.getContext('2d'), kind = layout(o, rnd), chosen = new Array(n * n);
      kind.forEach(function (k, idx) {
        var pool = pools[k], pick = Math.floor(rnd() * pool.length), tries = 0;
        // avoid the same paper sitting next to itself
        while (tries++ < pool.length && neighbours(idx, n).some(function (q) { return chosen[q] === pool[pick]; })) pick = (pick + 1) % pool.length;
        chosen[idx] = pool[pick];
        var x = (idx % n) * cs, y = ((idx / n) | 0) * cs;
        var want = o.colors && o.colors[COLOR_KEY[k]];
        g.drawImage(want ? recolor(pool[pick], want) : pool[pick], x, y, cs, cs);
        if (!want && o.brightness > 0 && (k === 'plain' || k === 'green' || k === 'emblem')) {   // lift the paper only, so fabrics stay rich
          var v = Math.round(255 * Math.min(1, o.brightness) * 0.75);
          g.globalCompositeOperation = 'screen';
          g.fillStyle = 'rgb(' + v + ',' + Math.round(v * 0.97) + ',' + Math.round(v * 0.84) + ')';
          g.fillRect(x, y, cs, cs);
          g.globalCompositeOperation = 'source-over';
        }
        if (o.tint) {                                    // each square is a slightly different cloth
          var r = 250 + rnd() * 5, gg = 249 + rnd() * 6, b = 247 + rnd() * 8;
          g.globalCompositeOperation = 'multiply';
          g.fillStyle = 'rgb(' + (r | 0) + ',' + (gg | 0) + ',' + (b | 0) + ')';
          g.fillRect(x, y, cs, cs);
          g.globalCompositeOperation = 'source-over';
        }
      });
      return new Promise(function (res) { c.toBlob(function (b) { res({ url: URL.createObjectURL(b), px: size / dpr }); }, 'image/png'); });
    });
  }

  var state = {};
  function init(opts) {
    var o = Object.assign({}, D, state.o || {}, opts || {}); state.o = o;
    var id = state.n = (state.n || 0) + 1;
    var go = function () {
      build(o).then(function (r) {
        if (id !== state.n) { URL.revokeObjectURL(r.url); return; }   // a newer render is already on its way
        var el = document.querySelector(o.target) || document.body;
        el.style.backgroundImage = 'url("' + r.url + '")';
        el.style.backgroundSize = r.px + 'px ' + r.px + 'px';
        el.style.backgroundRepeat = 'repeat';
        if (state.url) URL.revokeObjectURL(state.url);
        state.url = r.url;
      }).catch(function (e) { if (root.console) console.error(e); });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    return api;
  }
  var api = { init: init, build: build, layout: layout, shuffle: function () { return init({ seed: 'random' }); }, defaults: D };
  root.QuiltBg = api;

  var me = document.currentScript;
  if (me && (me.dataset.base || me.hasAttribute('data-auto'))) {
    var a = {};
    ['base', 'target', 'seed'].forEach(function (k) { if (me.dataset[k]) a[k] = me.dataset[k]; });
    ['cell', 'grid', 'emblems', 'greens', 'olives', 'forests'].forEach(function (k) { if (me.dataset[k]) a[k] = parseInt(me.dataset[k], 10); });
    if (me.dataset.brightness) a.brightness = parseFloat(me.dataset.brightness);
    var cl = {}; [['paper', 'colorPaper'], ['green', 'colorGreen'], ['olive', 'colorOlive'], ['forest', 'colorForest']].forEach(function (p) { if (me.dataset[p[1]]) cl[p[0]] = me.dataset[p[1]]; });
    if (Object.keys(cl).length) a.colors = cl;
    if (me.dataset.tint) a.tint = me.dataset.tint !== 'false';
    init(a);
  }
})(typeof window !== 'undefined' ? window : this);
