/* The Organic Certification Churn Explorer — client-side aggregation of data/spells.json */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const sfmt = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n));
  const r1 = (x) => Math.round(x * 1000) / 1000;   // rate rounded to 0.1 percentage point
  const pct = (x) => (isFinite(x) ? (r1(x) * 100).toFixed(1) + "%" : "–");
  const spct = (x) => (isFinite(x) ? (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(1) + " pts" : "–");
  const NS = "http://www.w3.org/2000/svg";
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  // tile-grid positions [row, col]
  const TILE = {
    AK: [0, 0], ME: [0, 11], WI: [1, 6], VT: [1, 10], NH: [1, 11],
    WA: [2, 1], ID: [2, 2], MT: [2, 3], ND: [2, 4], MN: [2, 5], IL: [2, 6], MI: [2, 7], NY: [2, 9], MA: [2, 10],
    OR: [3, 1], NV: [3, 2], WY: [3, 3], SD: [3, 4], IA: [3, 5], IN: [3, 6], OH: [3, 7], PA: [3, 8], NJ: [3, 9], CT: [3, 10], RI: [3, 11],
    CA: [4, 1], UT: [4, 2], CO: [4, 3], NE: [4, 4], MO: [4, 5], KY: [4, 6], WV: [4, 7], VA: [4, 8], MD: [4, 9], DE: [4, 10],
    AZ: [5, 2], NM: [5, 3], KS: [5, 4], AR: [5, 5], TN: [5, 6], NC: [5, 7], SC: [5, 8], DC: [5, 9],
    OK: [6, 4], LA: [6, 5], MS: [6, 6], AL: [6, 7], GA: [6, 8],
    HI: [7, 0], TX: [7, 4], FL: [7, 9], PR: [7, 10], VI: [7, 11]
  };
  const XT_LABEL = { 1: "Surrendered", 2: "Suspended", 3: "Revoked", 4: "Dropped from listing" };

  let M, D, N;                // meta, data columns, n rows
  const S = { from: 2018, to: 2025, st: -1, sc: -1, gr: -1, ce: -1, dim: "state", sortKey: "stock", sortDir: -1, showAll: false };
  let lastTable = { head: [], rows: [] };

  // ---------- aggregation ----------
  function emptyAgg(years) {
    const a = {};
    years.forEach((y) => (a[y] = { stock: 0, en: 0, ex: 0, x1: 0, x2: 0, x3: 0, x4: 0, tin: 0, tout: 0 }));
    return a;
  }
  // keyFn(i) -> key or array of keys or null; filters skip the dimension being grouped
  function aggregate(skip, keyFn) {
    const years = M.years, y0 = years[0], y1 = years[years.length - 1];
    const out = new Map();
    const { st, ce, sy, en, ti, xy, xt, sc, gr } = D;
    const scBit = S.sc >= 0 ? 1 << S.sc : 0, grBit = S.gr >= 0 ? 1 << S.gr : 0;
    for (let i = 0; i < N; i++) {
      if (S.st >= 0 && skip !== "state" && st[i] !== S.st) continue;
      if (S.ce >= 0 && skip !== "cert" && ce[i] !== S.ce) continue;
      if (scBit && skip !== "scope" && !(sc[i] & scBit)) continue;
      if (grBit && skip !== "group" && !(gr[i] & grBit)) continue;
      let keys = keyFn ? keyFn(i) : 0;
      if (keys === null) continue;
      if (!Array.isArray(keys)) keys = [keys];
      for (const k of keys) {
        let a = out.get(k);
        if (!a) { a = emptyAgg(years); out.set(k, a); }
        const s = sy[i], x = xy[i], t = xt[i];
        for (let y = y0; y <= y1; y++) {
          const r = a[y];
          if (s >= 0 && s < y && (x < 0 || x >= y)) r.stock++;
        }
        if (s >= y0 && s <= y1) { if (en[i]) a[s].en++; else if (ti[i]) a[s].tin++; }
        if (x >= y0 && x <= y1) {
          if (t >= 1 && t <= 4) { a[x].ex++; a[x]["x" + t]++; } else if (t === 5) a[x].tout++;
        }
      }
    }
    return out;
  }
  function pool(a) {
    const p = { stock: 0, en: 0, ex: 0, x1: 0, x2: 0, x3: 0, x4: 0, tin: 0, tout: 0 };
    for (let y = S.from; y <= S.to; y++) for (const k in p) p[k] += a[y][k];
    p.stock0 = a[S.from].stock;
    p.net = p.en - p.ex;
    p.er = p.en / p.stock; p.xr = p.ex / p.stock;
    // net rate = rounded entry rate − rounded exit rate, so the displayed figures add up
    p.nr = isFinite(p.er) && isFinite(p.xr) ? (Math.round(p.er * 1000) - Math.round(p.xr * 1000)) / 1000 : NaN;
    p.few = p.stock < 30;
    return p;
  }
  const bitsOf = (v, n) => { const r = []; for (let b = 0; b < n; b++) if (v & (1 << b)) r.push(b); return r; };

  // ---------- tooltip ----------
  const tip = $("tip");
  function showTip(ev, html) {
    tip.replaceChildren();
    html.forEach(([cls, a, b, color]) => {
      const d = document.createElement("div"); d.className = cls;
      if (cls === "h") d.textContent = a;
      else {
        const l = document.createElement("span");
        if (color) { const i = document.createElement("i"); i.style.background = color; l.appendChild(i); }
        l.appendChild(document.createTextNode(a));
        const v = document.createElement("b"); v.textContent = b;
        d.append(l, v);
      }
      tip.appendChild(d);
    });
    tip.style.display = "block";
    const r = tip.getBoundingClientRect();
    let x = ev.clientX + 14, y = ev.clientY + 14;
    if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - 14;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  const hideTip = () => (tip.style.display = "none");

  // ---------- svg helpers ----------
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function niceTicks(lo, hi, n) {
    const span = hi - lo || 1, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || 10 * mag;
    const t = []; for (let v = Math.floor(lo / step) * step; v <= hi + 1e-9; v += step) t.push(Math.round(v * 1e6) / 1e6);
    return t;
  }
  const yLabel = (v) => (Math.abs(v) >= 1000 ? (v / 1000).toFixed(Math.abs(v) % 1000 ? 1 : 0) + "k" : String(v));

  // ---------- time series ----------
  function drawTS(a) {
    const box = $("ts"); box.replaceChildren();
    const W = Math.max(300, box.clientWidth || 560), H = 280, m = { l: 44, r: 10, t: 12, b: 26 };
    const years = M.years;
    const rows = years.map((y) => ({ y, en: a[y].en, ex: a[y].ex, net: a[y].en - a[y].ex }));
    const hi = Math.max(1, ...rows.map((r) => r.en)), lo = -Math.max(1, ...rows.map((r) => r.ex));
    const ticks = niceTicks(lo, hi, 5);
    const ymin = Math.min(lo, ticks[0]), ymax = Math.max(hi, ticks[ticks.length - 1]);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", role: "img", "aria-label": "Entries and exits by year" }, box);
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const Y = (v) => m.t + ((ymax - v) / (ymax - ymin)) * ih;
    const bw = iw / years.length, X = (i) => m.l + i * bw;
    ticks.forEach((t) => {
      el("line", { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: t === 0 ? "ax" : "gl" }, svg);
      el("text", { x: m.l - 6, y: Y(t) + 4, "text-anchor": "end" }, svg).textContent = yLabel(Math.abs(t));
    });
    const barW = Math.min(34, bw * 0.55);
    const entry = css("--entry"), exit = css("--exit"), ink = css("--ink");
    rows.forEach((r, i) => {
      const cx = X(i) + bw / 2, inRange = r.y >= S.from && r.y <= S.to, op = inRange ? 1 : 0.28;
      const part = r.y === M.partial_year;
      const g = el("g", { opacity: op }, svg);
      const h1 = Y(0) - Y(r.en), h2 = Y(-r.ex) - Y(0);
      if (h1 > 0) el("path", { d: roundTop(cx - barW / 2, Y(r.en), barW, h1 - 1, 4), fill: entry, "fill-opacity": part ? 0.55 : 1 }, g);
      if (h2 > 0) el("path", { d: roundBottom(cx - barW / 2, Y(0) + 1, barW, h2 - 1, 4), fill: exit, "fill-opacity": part ? 0.55 : 1 }, g);
      el("text", { x: cx, y: H - 8, "text-anchor": "middle" }, svg).textContent = part ? r.y + "*" : r.y;
      const hit = el("rect", { x: X(i), y: m.t, width: bw, height: ih, fill: "transparent", tabindex: 0 }, svg);
      const show = (ev) => showTip(ev, [["h", part ? r.y + " (Jan–Sep)" : String(r.y)], ["r", "Entries", fmt(r.en), entry], ["r", "Exits", fmt(r.ex), exit], ["r", "Net change", sfmt(r.net), ink], ["r", "Stock 1 Jan", fmt(a[r.y].stock)]]);
      hit.addEventListener("pointermove", show);
      hit.addEventListener("focus", (e) => { const b = hit.getBoundingClientRect(); show({ clientX: b.left + b.width / 2, clientY: b.top + 40 }); });
      hit.addEventListener("pointerleave", hideTip); hit.addEventListener("blur", hideTip);
    });
    // net line
    const pts = rows.map((r, i) => [X(i) + bw / 2, Y(r.net)]);
    el("path", { d: "M" + pts.map((p) => p.join(",")).join("L"), fill: "none", stroke: ink, "stroke-width": 2, "pointer-events": "none" }, svg);
    pts.forEach((p, i) => el("circle", { cx: p[0], cy: p[1], r: 4, fill: ink, stroke: css("--surface"), "stroke-width": 2, "pointer-events": "none", opacity: rows[i].y >= S.from && rows[i].y <= S.to ? 1 : 0.3 }, svg));
  }
  function roundTop(x, y, w, h, r) { r = Math.min(r, h, w / 2); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; }
  function roundBottom(x, y, w, h, r) { r = Math.min(r, h, w / 2); return `M${x},${y}H${x + w}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x + r}Q${x},${y + h} ${x},${y + h - r}Z`; }

  // ---------- stock line ----------
  function drawStock(a, octStock) {
    const box = $("stock"); box.replaceChildren();
    const W = Math.max(300, box.clientWidth || 440), H = 200, m = { l: 48, r: 14, t: 12, b: 26 };
    const pts = M.years.map((y) => ({ lab: String(y), v: a[y].stock }));
    pts.push({ lab: "Oct 26", v: octStock });
    const vals = pts.map((p) => p.v), hi = Math.max(...vals), lo = Math.min(...vals);
    const pad = Math.max(1, (hi - lo) * 0.25);
    const ticks = niceTicks(Math.max(0, lo - pad), hi + pad, 4);
    const ymin = ticks[0], ymax = ticks[ticks.length - 1];
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", role: "img", "aria-label": "Certified operations over time" }, box);
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const X = (i) => m.l + (i / (pts.length - 1)) * iw, Y = (v) => m.t + ((ymax - v) / (ymax - ymin || 1)) * ih;
    ticks.forEach((t) => {
      el("line", { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: "gl" }, svg);
      el("text", { x: m.l - 6, y: Y(t) + 4, "text-anchor": "end" }, svg).textContent = yLabel(t);
    });
    const color = css("--entry");
    el("path", { d: "M" + pts.map((p, i) => X(i) + "," + Y(p.v)).join("L"), fill: "none", stroke: color, "stroke-width": 2 }, svg);
    pts.forEach((p, i) => {
      if ((i % 2 === 0 && i < pts.length - 2) || i === pts.length - 1) el("text", { x: X(i), y: H - 8, "text-anchor": i === pts.length - 1 ? "end" : "middle" }, svg).textContent = p.lab;
    });
    // crosshair
    const cross = el("line", { y1: m.t, y2: m.t + ih, stroke: css("--axis"), "stroke-width": 1, visibility: "hidden" }, svg);
    const dot = el("circle", { r: 4, fill: color, stroke: css("--surface"), "stroke-width": 2, visibility: "hidden" }, svg);
    const hit = el("rect", { x: m.l, y: m.t, width: iw, height: ih, fill: "transparent" }, svg);
    hit.addEventListener("pointermove", (ev) => {
      const b = svg.getBoundingClientRect(), sx = ((ev.clientX - b.left) / b.width) * W;
      const i = Math.max(0, Math.min(pts.length - 1, Math.round(((sx - m.l) / iw) * (pts.length - 1))));
      cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i)); cross.setAttribute("visibility", "visible");
      dot.setAttribute("cx", X(i)); dot.setAttribute("cy", Y(pts[i].v)); dot.setAttribute("visibility", "visible");
      showTip(ev, [["h", i === pts.length - 1 ? "1 Oct 2026" : "1 Jan " + pts[i].lab], ["r", "Certified operations", fmt(pts[i].v), color]]);
    });
    hit.addEventListener("pointerleave", () => { hideTip(); cross.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); });
  }

  // ---------- exit types ----------
  function drawXTypes(p) {
    const box = $("xtypes"); box.replaceChildren();
    const items = [["Surrendered", p.x1], ["Suspended", p.x2], ["Dropped from listing", p.x4], ["Revoked", p.x3]];
    const max = Math.max(1, ...items.map((d) => d[1]), p.tout);
    const add = (lab, v, share, muted) => {
      const l = document.createElement("div"); l.textContent = lab; if (muted) l.style.color = "var(--muted)";
      const bwrap = document.createElement("div");
      const b = document.createElement("div"); b.className = "b"; b.style.width = (v / max) * 100 + "%";
      if (muted) { b.style.background = "transparent"; b.style.border = "1.5px dashed var(--axis)"; }
      bwrap.appendChild(b);
      const n = document.createElement("div"); n.className = "n"; n.textContent = fmt(v) + (share !== null ? " · " + pct(share) : "");
      box.append(l, bwrap, n);
    };
    items.forEach(([lab, v]) => add(lab, v, p.ex ? v / p.ex : 0, false));
    add("Moved to another certifier", p.tout, null, true);
  }

  // ---------- map ----------
  function mapValue(p, measure) {
    return { netrate: p.nr, entryrate: p.er, exitrate: p.xr, net: p.net }[measure];
  }
  function mix(c1, c2, t) {
    const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const a = h(c1), b = h(c2);
    return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }
  function drawMap() {
    const box = $("map"); box.replaceChildren();
    const measure = $("mapMeasure").value;
    const agg = aggregate("state", (i) => D.st[i]);
    const vals = {}; let ext = 0;
    M.states.forEach((s, k) => {
      const a = agg.get(k); if (!a) return;
      const p = pool(a); vals[s.abbr] = { p, v: mapValue(p, measure), few: p.stock < 30, name: s.name };
    });
    // colour extent: 90th percentile of |value| among states with enough operations, so one small state cannot wash out the rest
    const absv = Object.values(vals).filter((d) => !d.few).map((d) => Math.abs(d.v)).sort((x, y) => x - y);
    ext = absv.length ? absv[Math.min(absv.length - 1, Math.floor(absv.length * 0.9))] : 1;
    const diverging = measure === "netrate" || measure === "net";
    const mid = css("--mid"), pos = css("--div-pos"), neg = css("--div-neg"), seqHi = measure === "exitrate" ? css("--exit") : css("--entry");
    let lo = 0, hi = ext || 1;
    if (!diverging) { const vs = Object.values(vals).filter((d) => !d.few).map((d) => d.v).sort((x, y) => x - y); lo = vs[Math.floor(vs.length * 0.05)] || 0; hi = vs[Math.min(vs.length - 1, Math.floor(vs.length * 0.95))] || 1; }
    const colorOf = (v) => {
      if (diverging) { const t = Math.min(1, Math.abs(v) / (ext || 1)); return mix(mid, v >= 0 ? pos : neg, Math.sqrt(t)); }
      return mix(mid, seqHi, Math.min(1, Math.max(0, (v - lo) / ((hi - lo) || 1))));
    };
    const isRate = measure !== "net";
    Object.entries(TILE).forEach(([ab, [r, c]]) => {
      const d = vals[ab]; const k = M.states.findIndex((s) => s.abbr === ab);
      const t = document.createElement("div"); t.className = "t"; t.textContent = ab;
      t.style.gridRow = r + 1; t.style.gridColumn = c + 1; t.tabIndex = 0; t.setAttribute("role", "button");
      if (!d) { t.style.background = "transparent"; t.style.color = "var(--muted)"; t.style.border = "1px dashed var(--border)"; }
      else if (d.few) { t.classList.add("few"); t.style.background = mid; t.style.color = "var(--ink-2)"; }
      else {
        const bg = colorOf(d.v); t.style.background = bg;
        const lum = (() => { const h = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16) / 255); return 0.2126 * h[0] + 0.7152 * h[1] + 0.0722 * h[2]; })();
        t.style.color = lum > 0.45 ? "#0b0b0b" : "#ffffff";
      }
      if (k === S.st) t.classList.add("sel");
      t.setAttribute("aria-label", d ? `${d.name}: ${isRate ? spct(d.v) : sfmt(d.v)}` : ab);
      const show = (ev) => {
        if (!d) return showTip(ev, [["h", ab], ["r", "No operations", ""]]);
        const p = d.p;
        showTip(ev, [["h", d.name + (d.few ? " (few operations)" : "")], ["r", "Entries", fmt(p.en), css("--entry")], ["r", "Exits", fmt(p.ex), css("--exit")], ["r", "Net change", sfmt(p.net)], ["r", "Entry rate", pct(p.er)], ["r", "Exit rate", pct(p.xr)], ["r", "Stock 1 Jan " + S.from, fmt(p.stock0)]]);
      };
      t.addEventListener("pointermove", show); t.addEventListener("pointerleave", hideTip);
      t.addEventListener("focus", (e) => { const b = t.getBoundingClientRect(); show({ clientX: b.right, clientY: b.bottom }); });
      t.addEventListener("blur", hideTip);
      const pick = () => { if (k < 0) return; S.st = S.st === k ? -1 : k; $("fState").value = S.st; hideTip(); render(); };
      t.addEventListener("click", pick);
      t.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      box.appendChild(t);
    });
    // scale
    const sc = $("mapScale"); sc.replaceChildren();
    const f = isRate ? (v) => Math.abs(v * 100).toFixed(1) + (diverging ? " pts" : "%") : (v) => fmt(Math.abs(v));
    const left = document.createElement("span"), right = document.createElement("span"), bar = document.createElement("div");
    bar.className = "bar";
    if (diverging) { left.textContent = "Shrinking ≤ −" + f(ext); right.textContent = "≥ +" + f(ext) + " Growing"; bar.style.background = `linear-gradient(90deg, ${neg}, ${mid}, ${pos})`; }
    else { left.textContent = "≤ " + f(lo); right.textContent = "≥ " + f(hi); bar.style.background = `linear-gradient(90deg, ${mid}, ${seqHi})`; }
    const note = document.createElement("span"); note.className = "note"; note.textContent = (isRate ? "Per year, pooled over the selected years." : "Selected years.") + " Hatched: fewer than 30 stock-years, too few to colour.";
    sc.append(left, bar, right, note);
  }

  // ---------- tiles ----------
  function drawTiles(p, octStock) {
    const box = $("tiles"); box.replaceChildren();
    const yrs = S.from === S.to ? String(S.from) : `${S.from}–${S.to}`;
    const mk = (k, v, s, key) => {
      const d = document.createElement("div"); d.className = "tile";
      const a = document.createElement("div"); a.className = "k";
      if (key) { const i = document.createElement("span"); i.className = "key"; i.style.background = key; a.appendChild(i); }
      a.appendChild(document.createTextNode(k));
      const b = document.createElement("div"); b.className = "v"; b.textContent = v;
      const c = document.createElement("div"); c.className = "s"; c.textContent = s;
      d.append(a, b, c); box.appendChild(d);
    };
    mk("Entries, " + yrs, fmt(p.en), "Entry rate " + pct(p.er) + " a year", css("--entry"));
    mk("Exits, " + yrs, fmt(p.ex), "Exit rate " + pct(p.xr) + " a year · excludes " + fmt(p.tout) + " moves to another certifier", css("--exit"));
    mk("Net change, " + yrs, sfmt(p.net), "Net rate " + spct(p.nr) + " a year");
    mk("Certified 1 Jan " + S.from, fmt(p.stock0), "Start of the selected years");
    mk("Certified 1 Oct 2026", fmt(octStock), "Latest snapshot");
  }

  // ---------- table ----------
  function tableData() {
    const dim = S.dim;
    let keyFn, names;
    if (dim === "state") { keyFn = (i) => D.st[i]; names = M.states.map((s) => s.name); }
    else if (dim === "cert") { keyFn = (i) => D.ce[i]; names = M.certifiers.map((c) => c.label); }
    else if (dim === "scope") { keyFn = (i) => bitsOf(D.sc[i], M.scopes.length); names = M.scopes.map((s) => s.label); }
    else { keyFn = (i) => { const b = bitsOf(D.gr[i], M.groups.length); return b.length ? b : null; }; names = M.groups.map((g) => g.label); }
    const agg = aggregate(dim, keyFn);
    const rows = [];
    agg.forEach((a, k) => {
      const p = pool(a);
      if (p.stock + p.en + p.ex + p.tin + p.tout === 0) return;
      rows.push({ k, name: names[k], ...p, netT: p.net + p.tin - p.tout });
    });
    return rows;
  }
  function drawTable() {
    const rows = tableData();
    const cert = S.dim === "cert";
    const cols = [
      ["name", { state: "State", group: "Commodity group", scope: "Scope", cert: "Certifier" }[S.dim], (r) => r.name],
      ["stock0", "Stock 1 Jan " + S.from, (r) => fmt(r.stock0)],
      ["en", "Entries", (r) => fmt(r.en)],
      ["ex", "Exits", (r) => fmt(r.ex)],
      ["net", "Net change", (r) => sfmt(r.net)],
      ["er", "Entry rate", (r) => pct(r.er)],
      ["xr", "Exit rate", (r) => pct(r.xr)],
      ["nr", "Net rate", (r) => spct(r.nr)]
    ];
    if (cert) cols.push(["tin", "Transfers in", (r) => fmt(r.tin)], ["tout", "Transfers out", (r) => fmt(r.tout)], ["netT", "Net incl. transfers", (r) => sfmt(r.netT)]);
    if (!cols.some((c) => c[0] === S.sortKey)) S.sortKey = "stock0";
    const key = S.sortKey === "stock" ? "stock0" : S.sortKey;
    const num = (v) => (isFinite(v) ? v : -1e9);
    rows.sort((a, b) => S.sortDir * (typeof a[key] === "string" ? a[key].localeCompare(b[key]) : num(a[key]) - num(b[key])));
    const tab = $("tab"); tab.replaceChildren();
    const thead = document.createElement("thead"), tr = document.createElement("tr");
    cols.forEach(([k, lab]) => {
      const th = document.createElement("th"); th.textContent = lab; th.scope = "col"; th.tabIndex = 0;
      if (k === key) th.setAttribute("aria-sort", S.sortDir === -1 ? "descending" : "ascending");
      const go = () => { if (S.sortKey === k) S.sortDir *= -1; else { S.sortKey = k; S.sortDir = k === "name" ? 1 : -1; } drawTable(); };
      th.addEventListener("click", go); th.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      tr.appendChild(th);
    });
    thead.appendChild(tr); tab.appendChild(thead);
    const tb = document.createElement("tbody");
    const limit = S.showAll ? rows.length : 15;
    const maxNet = Math.max(1, ...rows.map((r) => Math.abs(r.net)));
    rows.slice(0, limit).forEach((r) => {
      const tr = document.createElement("tr");
      tr.className = "clickable";
      cols.forEach(([k, , f], j) => {
        const td = document.createElement("td");
        if (k === "net") {
          const bar = document.createElement("span"); bar.className = "netbar";
          bar.style.width = Math.max(1, (Math.abs(r.net) / maxNet) * 40) + "px";
          bar.style.background = r.net >= 0 ? "var(--div-pos)" : "var(--div-neg)"; bar.style.marginRight = "6px";
          td.append(bar, document.createTextNode(f(r)));
        } else td.textContent = f(r);
        if (r.few && (k === "er" || k === "xr" || k === "nr")) { td.classList.add("few"); td.title = "Fewer than 30 stock-years: treat this rate with caution"; }
        if (r.few && k === "name") td.textContent = f(r) + " †";
        tr.appendChild(td);
      });
      tr.addEventListener("click", () => {
        const sel = { state: "fState", cert: "fCert", scope: "fScope", group: "fGroup" }[S.dim];
        const prop = { state: "st", cert: "ce", scope: "sc", group: "gr" }[S.dim];
        S[prop] = S[prop] === r.k ? -1 : r.k; $(sel).value = S[prop]; render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      tb.appendChild(tr);
    });
    tab.appendChild(tb);
    const more = $("more");
    more.style.display = rows.length > 15 ? "" : "none";
    more.textContent = S.showAll ? "Show top 15" : `Show all ${rows.length}`;
    $("tabNote").textContent =
      (S.dim === "group" ? "Groups overlap: an operation is counted in every group it lists. " : S.dim === "scope" ? "Scopes overlap: an operation can hold several. " : "") +
      "Rates are per year, pooled over " + (S.from === S.to ? S.from : S.from + "–" + S.to) + "." + (rows.some((r) => r.few) ? " † Fewer than 30 stock-years: rates are greyed and unreliable." : "") + " Click a row to filter.";
    lastTable = { head: cols.map((c) => c[1]), keys: cols.map((c) => c[0]), rows };
  }
  function downloadCSV(e) {
    e.preventDefault();
    const q = (v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
    const keys = lastTable.keys.map((k) => (k === "stock0" ? "stock0" : k));
    const head = ["dimension", "years", "state_filter", "scope_filter", "group_filter", "certifier_filter"].concat(lastTable.head);
    const ctx = [S.dim, S.from + "-" + S.to, S.st >= 0 ? M.states[S.st].name : "All", S.sc >= 0 ? M.scopes[S.sc].label : "All", S.gr >= 0 ? M.groups[S.gr].label : "All", S.ce >= 0 ? M.certifiers[S.ce].label : "All"];
    const lines = [head.map(q).join(",")];
    lastTable.rows.forEach((r) => lines.push(ctx.concat(keys.map((k) => (typeof r[k] === "number" && !Number.isInteger(r[k]) ? (isFinite(r[k]) ? r[k].toFixed(4) : "") : r[k]))).map(q).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `organic_churn_${S.dim}_${S.from}-${S.to}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- render ----------
  function render() {
    const all = aggregate(null, null).get(0) || emptyAgg(M.years);
    const p = pool(all);
    // stock on 1 Oct 2026 = open spells under current filters
    let oct = 0;
    const scBit = S.sc >= 0 ? 1 << S.sc : 0, grBit = S.gr >= 0 ? 1 << S.gr : 0;
    for (let i = 0; i < N; i++) {
      if (D.xt[i] !== 0 || D.sy[i] < 0) continue;
      if (S.st >= 0 && D.st[i] !== S.st) continue;
      if (S.ce >= 0 && D.ce[i] !== S.ce) continue;
      if (scBit && !(D.sc[i] & scBit)) continue;
      if (grBit && !(D.gr[i] & grBit)) continue;
      oct++;
    }
    drawTiles(p, oct);
    drawTS(all);
    drawStock(all, oct);
    drawXTypes(p);
    drawMap();
    drawTable();
    const parts = [];
    if (S.st >= 0) parts.push(M.states[S.st].name);
    if (S.sc >= 0) parts.push(M.scopes[S.sc].label + " scope");
    if (S.gr >= 0) parts.push(M.groups[S.gr].label);
    if (S.ce >= 0) parts.push(M.certifiers[S.ce].label.replace(/^\d+ · /, ""));
    $("scopeNote").textContent = "Showing: " + (parts.length ? parts.join(" · ") : "all U.S. organic operations") + (S.to === M.partial_year ? ". 2026 covers January–September only." : ".");
    try { history.replaceState(null, "", "#" + new URLSearchParams({ y: S.from + "-" + S.to, s: S.st, sc: S.sc, g: S.gr, c: S.ce, d: S.dim }).toString()); } catch (e) {}
  }

  function fillSelect(id, items, allLabel) {
    const s = $(id); s.replaceChildren();
    const o = document.createElement("option"); o.value = -1; o.textContent = allLabel; s.appendChild(o);
    items.forEach(([v, lab]) => { const o = document.createElement("option"); o.value = v; o.textContent = lab; s.appendChild(o); });
  }

  function init(meta, data) {
    M = meta; D = data; N = D.st.length;
    const yrs = M.years.map((y) => [y, y === M.partial_year ? y + " (Jan–Sep)" : String(y)]);
    ["fFrom", "fTo"].forEach((id) => { const s = $(id); yrs.forEach(([v, l]) => { const o = document.createElement("option"); o.value = v; o.textContent = l; s.appendChild(o); }); });
    fillSelect("fState", M.states.map((s, i) => [i, s.name]), "All states");
    fillSelect("fScope", M.scopes.map((s, i) => [i, s.label]), "All scopes");
    fillSelect("fGroup", M.groups.map((g, i) => [i, g.label]), "All commodities");
    fillSelect("fCert", M.certifiers.map((c, i) => [i, c.label]).sort((a, b) => a[1].replace(/^\d+ · /, "").localeCompare(b[1].replace(/^\d+ · /, ""))), "All certifiers");
    // restore from URL hash
    try {
      const h = new URLSearchParams(location.hash.slice(1));
      if (h.get("y")) { const [a, b] = h.get("y").split("-").map(Number); if (M.years.includes(a) && M.years.includes(b) && a <= b) { S.from = a; S.to = b; } }
      [["s", "st", M.states], ["sc", "sc", M.scopes], ["g", "gr", M.groups], ["c", "ce", M.certifiers]].forEach(([q, k, arr]) => { const v = Number(h.get(q)); if (h.has(q) && v >= -1 && v < arr.length) S[k] = v; });
      if (["state", "group", "scope", "cert"].includes(h.get("d"))) S.dim = h.get("d");
    } catch (e) {}
    const sync = () => { $("fFrom").value = S.from; $("fTo").value = S.to; $("fState").value = S.st; $("fScope").value = S.sc; $("fGroup").value = S.gr; $("fCert").value = S.ce; document.querySelectorAll(".seg button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.dim === S.dim)); };
    sync();
    $("fFrom").addEventListener("change", (e) => { S.from = +e.target.value; if (S.to < S.from) S.to = S.from; sync(); render(); });
    $("fTo").addEventListener("change", (e) => { S.to = +e.target.value; if (S.from > S.to) S.from = S.to; sync(); render(); });
    [["fState", "st"], ["fScope", "sc"], ["fGroup", "gr"], ["fCert", "ce"]].forEach(([id, k]) => $(id).addEventListener("change", (e) => { S[k] = +e.target.value; render(); }));
    $("reset").addEventListener("click", () => { Object.assign(S, { from: 2018, to: 2025, st: -1, sc: -1, gr: -1, ce: -1 }); sync(); render(); });
    $("mapMeasure").addEventListener("change", drawMap);
    document.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => { S.dim = b.dataset.dim; S.showAll = false; sync(); drawTable(); render(); }));
    $("more").addEventListener("click", () => { S.showAll = !S.showAll; drawTable(); });
    $("dlTable").addEventListener("click", downloadCSV);
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(render, 150); });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    render();
  }

  document.body.classList.add("loading");
  Promise.all([fetch("data/meta.json").then((r) => r.json()), fetch("data/spells.json").then((r) => r.json())])
    .then(([m, d]) => { document.body.classList.remove("loading"); init(m, d); })
    .catch((e) => { document.body.classList.remove("loading"); $("tiles").textContent = "Could not load data: " + e.message; });
})();
