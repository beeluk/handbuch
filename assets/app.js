(function () {
  "use strict";

  /* ---------- Mobile Navigation ---------- */
  var body = document.body;
  var btn = document.getElementById("menuBtn");
  var scrim = document.getElementById("scrim");
  function setNav(open) {
    body.classList.toggle("nav-open", open);
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (scrim) scrim.hidden = !open;
  }
  if (btn) btn.addEventListener("click", function () { setNav(!body.classList.contains("nav-open")); });
  if (scrim) scrim.addEventListener("click", function () { setNav(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setNav(false); });

  /* ---------- Suche ---------- */
  var input = document.getElementById("q");
  var box = document.getElementById("results");
  var data = window.SEARCH_INDEX || [];

  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");
  }
  data.forEach(function (e) { e._t = norm(e.t); e._x = norm(e.x); e._g = norm(e.g); });

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function snippet(text, terms) {
    var n = norm(text), pos = -1, i;
    for (i = 0; i < terms.length; i++) { pos = n.indexOf(terms[i]); if (pos >= 0) break; }
    if (pos < 0) return esc(text.slice(0, 110)) + (text.length > 110 ? "…" : "");
    var start = Math.max(0, pos - 45), out = text.slice(start, start + 130);
    out = esc(out);
    return (start > 0 ? "…" : "") + out + (start + 130 < text.length ? "…" : "");
  }

  function run(q) {
    var terms = norm(q).split(/\s+/).filter(Boolean);
    if (!terms.length) { box.hidden = true; return; }
    var res = [];
    data.forEach(function (e) {
      var score = 0, ok = true;
      terms.forEach(function (t) {
        var inT = e._t.indexOf(t) >= 0, inX = e._x.indexOf(t) >= 0, inG = e._g.indexOf(t) >= 0;
        if (!inT && !inX && !inG) ok = false;
        score += (inT ? 10 : 0) + (inG ? 2 : 0) + (inX ? Math.min(e._x.split(t).length - 1, 12) : 0);
      });
      if (ok) res.push({ e: e, s: score + (e.k === "page" ? 3 : 0) });
    });
    res.sort(function (a, b) { return b.s - a.s; });
    var pages = res.filter(function (r) { return r.e.k === "page"; }).slice(0, 6);
    var docs = res.filter(function (r) { return r.e.k === "doc"; }).slice(0, 8);
    var h = "";
    if (pages.length) {
      h += '<div class="r-h">Themen</div>';
      pages.forEach(function (r) { h += '<a href="' + r.e.u + '"><div class="r-t">' + esc(r.e.t) + '</div><div class="r-s">' + snippet(r.e.x, terms) + "</div></a>"; });
    }
    if (docs.length) {
      h += '<div class="r-h">Dokumente</div>';
      docs.forEach(function (r) {
        var href = r.e.p || r.e.u;
        h += '<a href="' + href + '"><div class="r-t">' + esc(r.e.t) + '</div><div class="r-s">' + esc(r.e.g ? "Auf der Seite «" + r.e.g + "»" : "") + "</div></a>";
      });
    }
    if (!h) h = '<div class="none">Nichts gefunden. Versuche ein anderes Stichwort.</div>';
    box.innerHTML = h;
    box.hidden = false;
  }

  if (input && box) {
    input.addEventListener("input", function () { run(input.value); });
    input.addEventListener("focus", function () { if (input.value) run(input.value); });
    document.addEventListener("click", function (e) { if (!box.contains(e.target) && e.target !== input) box.hidden = true; });
    document.addEventListener("keydown", function (e) {
      var tag = (document.activeElement || {}).tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") { e.preventDefault(); input.focus(); input.select(); }
      if (document.activeElement === input && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        var links = box.querySelectorAll("a"); if (!links.length) return;
        e.preventDefault();
        var cur = box.querySelector("a.sel"), idx = cur ? Array.prototype.indexOf.call(links, cur) : -1;
        if (cur) cur.classList.remove("sel");
        idx = e.key === "ArrowDown" ? Math.min(links.length - 1, idx + 1) : Math.max(0, idx - 1);
        links[idx].classList.add("sel"); links[idx].scrollIntoView({ block: "nearest" });
      }
      if (document.activeElement === input && e.key === "Enter") {
        var s = box.querySelector("a.sel") || box.querySelector("a");
        if (s) window.location.href = s.getAttribute("href");
      }
      if (e.key === "Escape") { box.hidden = true; }
    });
  }

  /* ---------- Dokumentenfilter (Seite «Alle Dokumente») ---------- */
  var docq = document.getElementById("docq");
  if (docq) {
    var chips = document.querySelectorAll("#chips .chip");
    var rows = document.querySelectorAll("#docwrap .doc");
    var topics = document.querySelectorAll("#docwrap .doc-topic");
    var typeSel = "all";
    var count = document.getElementById("doccount");
    var empty = document.getElementById("docempty");
    var apply = function () {
      var terms = norm(docq.value).split(/\s+/).filter(Boolean), n = 0;
      rows.forEach(function (r) {
        var hay = norm(r.getAttribute("data-search"));
        var t = r.getAttribute("data-type");
        var typeOk = typeSel === "all" || t === typeSel || (typeSel === "docx" && t === "doc");
        var ok = typeOk && terms.every(function (x) { return hay.indexOf(x) >= 0; });
        r.hidden = !ok; if (ok) n++;
      });
      topics.forEach(function (tp) { tp.hidden = !tp.querySelector(".doc:not([hidden])"); });
      count.textContent = n + " von " + rows.length + " Dokumenten";
      empty.hidden = n > 0;
    };
    docq.addEventListener("input", apply);
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        chips.forEach(function (x) { x.classList.remove("on"); });
        c.classList.add("on"); typeSel = c.getAttribute("data-type"); apply();
      });
    });
    apply();
  }

  /* ---------- Arbeitszeit-Rechner (Seite «Pensum») ---------- */
  var calc = document.getElementById("azcalc");
  if (calc) {
    var selL = document.getElementById("az-l"), selF = document.getElementById("az-f");
    var f1 = function (x) { return (Math.round(x * 10) / 10).toLocaleString("de-CH", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); };
    var f0 = function (x) { return Math.round(x).toLocaleString("de-CH"); };
    for (var l = 28; l >= 1; l--) { var o = document.createElement("option"); o.value = l; o.textContent = l + (l === 1 ? " Lektion" : " Lektionen"); selL.appendChild(o); }
    [6, 7, 8, 9, 10].forEach(function (w) { var o = document.createElement("option"); o.value = w; o.textContent = w + " Wochen"; selF.appendChild(o); });
    selF.value = "8";
    var upd = function () {
      var L = +selL.value, W = +selF.value;
      var pct = L * 3.5714, ja = 1930 * L / 28;
      document.getElementById("az-pct").textContent = f1(pct) + " %";
      document.getElementById("az-ja").textContent = f0(ja) + " h";
      document.getElementById("az-u").textContent = f0(ja * 0.85) + " h";
      document.getElementById("az-z").textContent = f1(ja * 0.12) + " h";
      document.getElementById("az-w").textContent = f1(ja * 0.03) + " h";
      document.getElementById("az-wo").textContent = f1(ja / (52 - W)) + " h";
    };
    selL.addEventListener("change", upd); selF.addEventListener("change", upd); upd();
  }

  /* ---------- Verschlüsselte Dokumente ----------
     Jede Datei liegt als AES-256-GCM-Datei in Blöcken zu 4 MiB (je: 12 Byte IV + Chiffrat + 16 Byte Tag; AAD = Blocknummer, Blockzahl).
     Der Schlüssel steckt in der (selbst passwortgeschützten) Seite: window.DOC_KEY. */
  if (window.DOC_KEY && window.crypto && crypto.subtle) {
    var CH = 4194304, FULL = CH + 28, keyPromise = null;
    var getKey = function () {
      if (!keyPromise) {
        var raw = Uint8Array.from(atob(window.DOC_KEY), function (c) { return c.charCodeAt(0); });
        keyPromise = crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
      }
      return keyPromise;
    };
    var PART = 10 * FULL;   // Dateien sind in Teile zu 10 Blöcken zerlegt (name.bin, name.bin.1, …), siehe build.py
    var getBuf = async function (href, p) {
      var resp = await fetch(p ? href + "." + p : href);
      if (!resp.ok) throw new Error("Datei nicht gefunden (" + resp.status + ")");
      return new Uint8Array(await resp.arrayBuffer());
    };
    var fetchPlain = async function (href, mime, parts, progress) {
      var key = await getKey();
      parts = parts || 1;
      var last = await getBuf(href, parts - 1);                 // der letzte Teil verrät die Gesamtgrösse und damit die Blockzahl
      var n = Math.max(1, Math.ceil(((parts - 1) * PART + last.length) / FULL)), out = [];
      for (var p = 0; p < parts; p++) {
        var buf = p === parts - 1 ? last : await getBuf(href, p);
        for (var k = 0; k * FULL < buf.length; k++) {
          var i = p * 10 + k, start = k * FULL, end = Math.min(start + FULL, buf.length);
          var aad = new Uint8Array(8), dv = new DataView(aad.buffer);
          dv.setUint32(0, i); dv.setUint32(4, n);
          out.push(await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.subarray(start, start + 12), additionalData: aad }, key, buf.subarray(start + 12, end)));
          if (progress) progress(Math.round(((i + 1) / n) * 100));
        }
      }
      return new Blob(out, { type: mime });
    };
    var busy = function (el, on, text) {
      if (on) { el._label = el.textContent; el.setAttribute("aria-busy", "true"); el.style.pointerEvents = "none"; }
      else { el.removeAttribute("aria-busy"); el.style.pointerEvents = ""; el.textContent = el._label; return; }
      el.textContent = text;
    };
    document.addEventListener("click", async function (e) {
      var a = e.target.closest && e.target.closest("a[data-enc]");
      var v = e.target.closest && e.target.closest("button[data-enc-video]");
      if (!a && !v) return;
      e.preventDefault();
      var el = a || v;
      if (el.getAttribute("aria-busy")) return;
      var href = a ? a.getAttribute("href") : v.getAttribute("data-src");
      var mime = el.getAttribute("data-mime");
      var win = null;
      if (a && a.hasAttribute("data-open")) win = window.open("", "_blank");   // synchron öffnen, sonst blockt der Browser
      try {
        busy(el, true, "Entschlüssele …");
        var blob = await fetchPlain(href, mime, +el.getAttribute("data-parts") || 1, function (p) { el.textContent = "Entschlüssele … " + p + " %"; });
        var url = URL.createObjectURL(blob);
        if (v) {
          var vid = document.createElement("video");
          vid.controls = true; vid.src = url; vid.style.width = "100%";
          v.parentNode.replaceChild(vid, v); vid.play().catch(function () {});
          return;
        }
        if (win) { win.location = url; }
        else {
          var dl = document.createElement("a");
          dl.href = url; dl.download = a.getAttribute("data-name") || "dokument";
          document.body.appendChild(dl); dl.click(); dl.remove();
        }
        setTimeout(function () { URL.revokeObjectURL(url); }, 10 * 60 * 1000);
      } catch (err) {
        if (win) win.close();
        alert("Die Datei konnte nicht entschlüsselt werden: " + err.message + "\n\nWenn du die Seite direkt aus dem Ordner geöffnet hast, funktionieren Downloads nur über einen Webserver.");
      } finally {
        if (document.body.contains(el)) busy(el, false);
      }
    });
  }
})();
