/* SimEnergy site script — no dependencies. Config arrives in window.SE from the page. */
(function () {
  "use strict";
  var SE = window.SE || {};
  var T = SE.t || {};
  var doc = document;
  // Illustrative price curve, $/MWh by hour. It is not live market data or a claim about a fixed in-game price.
  var PRICES = [52, 48, 45, 44, 46, 55, 62, 58, 47, 41, 38, 33, 30, 31, 34, 40, 54, 71, 84, 92, 86, 74, 64, 57];
  var SUN_FROM = 7, SUN_TO = 18; // hours with solar output in the example
  var BATT_KWH = 40;

  function track(name, props) {
    try {
      if (!SE.endpoint) return;
      var body = JSON.stringify(Object.assign({ e: name, locale: SE.lang, v: SE.gameVersion || "", t: Date.now() }, props || {}));
      if (navigator.sendBeacon) navigator.sendBeacon(SE.endpoint, new Blob([body], { type: "application/json" }));
    } catch (e) {}
  }
  window.seTrack = track;

  function fmt(n, d) {
    try { return new Intl.NumberFormat(SE.numLocale || SE.lang, { minimumFractionDigits: d, maximumFractionDigits: d }).format(n); }
    catch (e) { return n.toFixed(d); }
  }
  function svgEl(tag, attrs) {
    var el = doc.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function pathFor(xs, ys) {
    var d = "M" + xs[0] + " " + ys[0];
    for (var i = 1; i < xs.length; i++) {
      var cx = (xs[i - 1] + xs[i]) / 2;
      d += " C" + cx + " " + ys[i - 1] + " " + cx + " " + ys[i] + " " + xs[i] + " " + ys[i];
    }
    return d;
  }

  /* Price strip */
  function strip() {
    var host = doc.getElementById("strip-svg"); if (!host) return;
    var W = 1000, H = 56, max = 100, min = 20;
    var xs = PRICES.map(function (_, i) { return (i / 23) * W; });
    var ys = PRICES.map(function (p) { return H - ((p - min) / (max - min)) * H; });
    var svg = svgEl("svg", { viewBox: "0 -4 " + W + " " + (H + 8), preserveAspectRatio: "none", "aria-hidden": "true" });
    var defs = svgEl("defs", {}); var g = svgEl("linearGradient", { id: "stripfill", x1: 0, y1: 0, x2: 0, y2: 1 });
    g.appendChild(svgEl("stop", { offset: "0", "stop-color": "#39C6E8", "stop-opacity": ".28" }));
    g.appendChild(svgEl("stop", { offset: "1", "stop-color": "#39C6E8", "stop-opacity": "0" }));
    defs.appendChild(g); svg.appendChild(defs);
    svg.appendChild(svgEl("rect", { class: "sun", x: (SUN_FROM / 23) * W, y: -4, width: ((SUN_TO - SUN_FROM) / 23) * W, height: H + 4 }));
    var d = pathFor(xs, ys);
    svg.appendChild(svgEl("path", { class: "area", d: d + " L" + W + " " + H + " L0 " + H + " Z" }));
    svg.appendChild(svgEl("path", { class: "curve", d: d }));
    var hr = new Date().getHours();
    svg.appendChild(svgEl("line", { class: "marker", x1: xs[hr], x2: xs[hr], y1: -4, y2: H }));
    svg.appendChild(svgEl("circle", { class: "dot", cx: xs[hr], cy: ys[hr], r: 4 }));
    host.appendChild(svg);
    var now = doc.getElementById("strip-now");
    if (now) now.innerHTML = '<span class="num">' + PRICES[hr] + '</span> <small>' + (T.unit || "$/MWh") + " · " + (T.now || "Now") + " " + (hr < 10 ? "0" : "") + hr + ":00</small>";
  }

  /* Decision widget */
  function decide() {
    var box = doc.getElementById("decide-chart"); if (!box) return;
    var W = 380, H = 220, P = { l: 30, r: 8, t: 12, b: 24 };
    var max = 100, min = 20;
    var X = function (h) { return P.l + (h / 23) * (W - P.l - P.r); };
    var Y = function (p) { return P.t + (1 - (p - min) / (max - min)) * (H - P.t - P.b); };
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": T.chartLabel || "" });
    svg.appendChild(svgEl("rect", { class: "night", x: X(0), y: P.t, width: X(SUN_FROM) - X(0), height: H - P.t - P.b }));
    svg.appendChild(svgEl("rect", { class: "night", x: X(SUN_TO), y: P.t, width: X(23) - X(SUN_TO), height: H - P.t - P.b }));
    [20, 60, 100].forEach(function (v) {
      svg.appendChild(svgEl("line", { class: "ax", x1: P.l, x2: W - P.r, y1: Y(v), y2: Y(v) }));
      var t = svgEl("text", { class: "lbl", x: P.l - 6, y: Y(v) + 4, "text-anchor": "end" }); t.textContent = v; svg.appendChild(t);
    });
    [0, 6, 12, 18, 23].forEach(function (h) {
      var t = svgEl("text", { class: "lbl", x: X(h), y: H - 6, "text-anchor": h === 0 ? "start" : h === 23 ? "end" : "middle" });
      t.textContent = (h < 10 ? "0" : "") + h + ":00"; svg.appendChild(t);
    });
    var xs = PRICES.map(function (_, i) { return X(i); }), ys = PRICES.map(Y);
    svg.appendChild(svgEl("path", { class: "curve", d: pathFor(xs, ys) }));
    var best = PRICES.indexOf(Math.max.apply(null, PRICES));
    svg.appendChild(svgEl("circle", { class: "best", cx: X(best), cy: Y(PRICES[best]), r: 5 }));
    var cur = svgEl("line", { class: "cur", y1: P.t, y2: H - P.b }); svg.appendChild(cur);
    var dot = svgEl("circle", { class: "curdot", r: 6 }); svg.appendChild(dot);
    box.appendChild(svg);
    var range = doc.getElementById("decide-hour");
    var oH = doc.getElementById("o-hour"), oP = doc.getElementById("o-price"), oV = doc.getElementById("o-value"), oS = doc.getElementById("o-sun"), oB = doc.getElementById("o-vs");
    var worst = Math.min.apply(null, PRICES);
    function upd() {
      var h = +range.value, p = PRICES[h];
      cur.setAttribute("x1", X(h)); cur.setAttribute("x2", X(h));
      dot.setAttribute("cx", X(h)); dot.setAttribute("cy", Y(p));
      var hh = (h < 10 ? "0" : "") + h + ":00";
      oH.textContent = hh; oP.textContent = p + " $/MWh";
      oV.textContent = "$" + fmt(p * BATT_KWH / 1000, 2);
      oB.textContent = "×" + fmt(p / worst, 1);
      var sun = h >= SUN_FROM && h < SUN_TO;
      oS.textContent = sun ? T.sunOn : T.sunOff; oS.className = "sunstate" + (sun ? "" : " off");
      range.setAttribute("aria-valuetext", hh + ", " + p + " $/MWh");
    }
    range.addEventListener("input", upd); upd();
  }

  /* Sticky play dock: hide while a main play button is on screen */
  function dock() {
    var d = doc.getElementById("dock"); if (!d || !("IntersectionObserver" in window)) return;
    var seen = new Set();
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? seen.add(e.target) : seen.delete(e.target); });
      d.classList.toggle("away", seen.size > 0);
    });
    doc.querySelectorAll("[data-main-play]").forEach(function (el) { io.observe(el); });
  }

  function toast(msg) {
    var t = doc.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    doc.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200);
  }
  function copy(text, done) {
    var ok = function () { toast(done); };
    try { navigator.clipboard.writeText(text).then(ok, function () { fallback(); }); } catch (e) { fallback(); }
    function fallback() {
      var ta = doc.createElement("textarea"); ta.value = text; doc.body.appendChild(ta); ta.select();
      try { doc.execCommand("copy"); ok(); } catch (e) {} ta.remove();
    }
  }

  function share() {
    doc.querySelectorAll("[data-share]").forEach(function (b) {
      b.addEventListener("click", function () {
        var url = SE.shareUrl || location.href.split("#")[0];
        track("share", {});
        if (navigator.share) { navigator.share({ title: "SimEnergy", text: T.shareText || "", url: url }).catch(function () {}); }
        else copy(url, T.copied || "OK");
      });
    });
    doc.querySelectorAll("[data-copy]").forEach(function (b) {
      b.addEventListener("click", function () { copy(b.getAttribute("data-copy"), b.getAttribute("data-done") || "OK"); });
    });
  }

  function events() {
    doc.querySelectorAll("[data-ev]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = {}; var pl = el.getAttribute("data-platform"); if (pl) p.platform = pl;
        track(el.getAttribute("data-ev"), p);
      });
    });
    doc.querySelectorAll(".faq details").forEach(function (d, i) {
      d.addEventListener("toggle", function () { if (d.open) track("faq_open", { q: i + 1 }); });
    });
    var v = doc.getElementById("gp-video");
    if (v) {
      v.addEventListener("play", function () { track("gameplay_open", { src: "video" }); }, { once: true });
      v.addEventListener("ended", function () { track("gameplay_complete", {}); });
      v.addEventListener("error", function () { var e = doc.getElementById("gp-video-err"); if (e) e.hidden = false; }, true);
    }
  }

  /* Add to home screen */
  function install() {
    var btn = doc.getElementById("install-btn"), ios = doc.getElementById("install-ios"); if (!btn) return;
    var ev = null;
    window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); ev = e; btn.hidden = false; });
    btn.addEventListener("click", function () { if (ev) { ev.prompt(); ev = null; btn.hidden = true; track("install_prompt", {}); } });
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS && ios) ios.hidden = false;
  }

  /* QR for desktop visitors (loads a small library only on wide screens) */
  function qr() {
    var box = doc.getElementById("qr-box"); if (!box || !window.matchMedia("(min-width: 900px) and (hover: hover)").matches) return;
    var url = SE.playUrlAbs || new URL(SE.playHref, location.href).href;
    var s = doc.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
    s.onload = function () {
      try {
        var q = window.qrcode(0, "M"); q.addData(url); q.make();
        var img = doc.createElement("img"); img.src = q.createDataURL(6, 2); img.alt = url; img.width = 150; img.height = 150;
        doc.getElementById("qr-img").appendChild(img); box.hidden = false;
      } catch (e) {}
    };
    doc.head.appendChild(s);
  }

  function sw() {
    if (!SE.sw || !("serviceWorker" in navigator)) return;
    try { navigator.serviceWorker.register(SE.sw).catch(function () {}); } catch (e) {}
  }

  strip(); decide(); dock(); share(); events(); install(); qr(); sw();
})();
