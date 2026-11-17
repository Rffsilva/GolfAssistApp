/* Black Mountain Birdie Book — plain JS, no build step. */
(() => {
  "use strict";
  const C = window.COURSE;
  const YD = 0.9144;
  const $ = (id) => document.getElementById(id);

  // ---------- storage ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("bm." + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("bm." + k, JSON.stringify(v)); } catch { /* full/private */ } }
  };
  const S = Object.assign({ route: "east-north", tee: "65", unit: "y", hole: 0, view: "hole" }, store.get("settings", {}));
  const save = () => store.set("settings", S);
  let geo = Object.assign({}, window.GEO || {}, store.get("geo", {}));
  let scores = store.get("scores", {});      // { routeId: [18] }
  let myNotes = store.get("notes", {});      // { "east-1": "..." }

  // ---------- helpers ----------
  const route = () => C.routes.find((r) => r.id === S.route) || C.routes[0];
  function holeInfo(i) {
    const r = route(), n = i < 9 ? 0 : 1, k = i % 9, nineId = r.nines[n], nine = C.nines[nineId];
    return {
      i, k, nineId, nine, key: `${nineId}-${k + 1}`, par: nine.par[k], si: r.si[n][k], siEst: r.est[n],
      yards: (t) => nine.yards[t] ? nine.yards[t][k] : null,
      note: nine.notes[k] || "",
      tip: (nine.tips || [])[k] || null
    };
  }
  const yardsFor = (h) => h.yards(S.tee) ?? h.yards("73");
  const fmtLen = (yards) => yards == null ? "–" : String(Math.round(S.unit === "y" ? yards : yards * YD));
  const fmtM = (m) => m == null || !isFinite(m) ? "–" : String(Math.round(S.unit === "y" ? m / YD : m));
  const unitTxt = () => (S.unit === "y" ? "yd" : "m");

  function distM(a, b) { // haversine, [lat, lon]
    const R = 6371008.8, r = Math.PI / 180;
    const dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  // local planar projection (metres) around a reference point
  function proj(ref) {
    const kx = 111320 * Math.cos(ref[0] * Math.PI / 180), ky = 110540;
    return (p) => [(p[1] - ref[1]) * kx, (p[0] - ref[0]) * ky];
  }
  function pointInPoly(pt, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [yi, xi] = poly[i], [yj, xj] = poly[j];
      if ((xi > pt[1]) !== (xj > pt[1]) && pt[0] < ((yj - yi) * (pt[1] - xi)) / (xj - xi) + yi) inside = !inside;
    }
    return inside;
  }

  // ---------- OSM data (fetched in the browser, cached) ----------
  let osm = store.get("osm", null);
  async function loadOSM(force) {
    if (osm && !force) return osm;
    const [lat, lon] = C.center;
    const q = `[out:json][timeout:25];(way["golf"](around:1600,${lat},${lon});way["natural"="water"](around:1600,${lat},${lon}););out geom;`;
    try {
      setGeoStatus("Loading OpenStreetMap golf data…");
      const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q) });
      if (!res.ok) throw new Error(res.status);
      const j = await res.json();
      osm = j.elements.filter((e) => e.geometry).map((e) => ({
        t: e.tags || {}, g: e.geometry.map((p) => [+p.lat.toFixed(6), +p.lon.toFixed(6)])
      }));
      store.set("osm", osm);
      setGeoStatus(`Loaded ${osm.length} map features (${osm.filter((f) => f.t.golf === "hole").length} hole lines).`);
    } catch (e) {
      setGeoStatus("Couldn't load OSM data (offline?).");
    }
    return osm;
  }
  const greens = () => (osm || []).filter((f) => f.t.golf === "green" && f.g.length > 3);

  function greenPolyFor(center) {
    if (!center) return null;
    let best = null, bestD = 45;
    for (const f of greens()) {
      if (pointInPoly(center, f.g)) return f.g;
      const c = f.g.reduce((a, p) => [a[0] + p[0] / f.g.length, a[1] + p[1] / f.g.length], [0, 0]);
      const d = distM(center, c);
      if (d < bestD) { bestD = d; best = f.g; }
    }
    return best;
  }
  // front / back of green along the line origin -> centre
  function frontBack(origin, center) {
    const poly = greenPolyFor(center);
    if (!poly) return null;
    const P = proj(origin), O = [0, 0], c = P(center);
    const L = Math.hypot(c[0], c[1]); if (L < 1) return null;
    const d = [c[0] / L, c[1] / L];
    const ts = [];
    for (let i = 0; i < poly.length - 1; i++) {
      const a = P(poly[i]), b = P(poly[i + 1]);
      const e = [b[0] - a[0], b[1] - a[1]];
      const den = d[0] * e[1] - d[1] * e[0];
      if (Math.abs(den) < 1e-9) continue;
      const w = [a[0] - O[0], a[1] - O[1]];
      const t = (w[0] * e[1] - w[1] * e[0]) / den;
      const u = (w[0] * d[1] - w[1] * d[0]) / den;
      if (u >= 0 && u <= 1 && t > 0) ts.push(t);
    }
    if (ts.length < 2) return null;
    return { front: Math.min(...ts), back: Math.max(...ts) };
  }

  // ---------- map ----------
  const map = L.map("map", { zoomControl: false, attributionControl: true, tap: true }).setView(C.center, 16);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxNativeZoom: 19, maxZoom: 21, attribution: "Imagery © Esri · Map data © OpenStreetMap"
  }).addTo(map);
  const osmLayer = L.layerGroup().addTo(map);
  const holeLayer = L.layerGroup().addTo(map);
  const tapLayer = L.layerGroup().addTo(map);
  let meMarker = null, meAcc = null, me = null, watchId = null, target = null;

  const styles = {
    green: { color: "#7be08f", weight: 1.5, fillOpacity: 0.15 },
    bunker: { color: "#f3e3b0", weight: 1, fillOpacity: 0.2 },
    water_hazard: { color: "#4aa3ff", weight: 1, fillOpacity: 0.15 },
    lateral_water_hazard: { color: "#ff5a5a", weight: 1, fillOpacity: 0.12 },
    water: { color: "#4aa3ff", weight: 1, fillOpacity: 0.15 }
  };
  function drawOSM() {
    osmLayer.clearLayers();
    if (!osm) return;
    for (const f of osm) {
      const kind = f.t.golf || (f.t.natural === "water" ? "water" : null);
      if (kind === "hole") {
        const line = L.polyline(f.g, { color: "#e58a2b", weight: setupOn ? 4 : 2, dashArray: "6 6", opacity: setupOn ? 0.95 : 0.5 });
        if (f.t.ref && setupOn) line.bindTooltip(String(f.t.ref) + (f.t.name ? " " + f.t.name : ""), { permanent: true, className: "osmLbl", direction: "center" });
        line.on("click", (ev) => { if (setupOn) { L.DomEvent.stop(ev); assignFromOSM(f); } });
        line.addTo(osmLayer);
      } else if (styles[kind]) {
        L.polygon(f.g, Object.assign({ interactive: false }, styles[kind])).addTo(osmLayer);
      }
    }
  }

  const dotIcon = (cls, txt) => L.divIcon({ className: "", html: `<div style="width:18px;height:18px;border-radius:50%;border:3px solid #fff;background:${cls};box-shadow:0 0 4px #000;display:grid;place-items:center;font-size:9px;font-weight:800;color:#000">${txt || ""}</div>`, iconSize: [18, 18], iconAnchor: [9, 9] });

  function cur() { return holeInfo(S.hole); }
  // Flag always sits in the middle of the green: if the green is mapped (OSM polygon),
  // snap to its centre; otherwise use the point you set.
  function greenMid(pt) {
    const poly = greenPolyFor(pt);
    if (!poly) return pt;
    const v = poly.slice(0, -1), n = v.length || 1;
    return [v.reduce((s, q) => s + q[0], 0) / n, v.reduce((s, q) => s + q[1], 0) / n];
  }
  function g() {
    const p = geo[cur().key] || {};
    return p.green ? Object.assign({}, p, { green: greenMid(p.green) }) : p;
  }
  // Position of the tee you chose at the top. Only one tee spot is stored per hole
  // (plus which tee it was); other tees are shifted along the tee->green line by the
  // difference in card yardage.
  function teePos(h = cur(), p = g()) {
    if (!p.tee) return null;
    if (!p.green) return p.tee;
    const refY = h.yards(p.teeId || "76") ?? firstYards(h), selY = yardsFor(h);
    if (refY == null || selY == null) return p.tee;
    const shift = (refY - selY) * YD, L = distM(p.tee, p.green);
    if (L < 1) return p.tee;
    const f = Math.max(-0.5, Math.min(0.95, shift / L));
    return [p.tee[0] + (p.green[0] - p.tee[0]) * f, p.tee[1] + (p.green[1] - p.tee[1]) * f];
  }
  const firstYards = (h) => { for (const t of C.tees) { const y = h.yards(t.id); if (y != null) return y; } return null; };
  const firstTeeId = (h) => (C.tees.find((t) => h.yards(t.id) != null) || C.tees[0]).id;

  function drawHole(fit) {
    holeLayer.clearLayers(); tapLayer.clearLayers(); target = null;
    const p = g(), tp = teePos();
    if (tp && p.green) L.polyline([tp, p.green], { color: "#fff", weight: 2, opacity: 0.55, dashArray: "2 8" }).addTo(holeLayer);
    if (tp) L.marker(tp, { icon: dotIcon("#2f6fdb", S.tee), interactive: false }).addTo(holeLayer);
    (p.pts || []).forEach((lm, idx) => {
      const m = L.marker(lm.p, { icon: dotIcon("#ff9f1c", idx + 1), interactive: setupOn }).addTo(holeLayer);
      const parts = [];
      if (tp) parts.push(fmtM(distM(tp, lm.p)));
      if (p.green) parts.push("→" + fmtM(distM(lm.p, p.green)));
      m.bindTooltip(`${lm.n}: ${parts.join(" ")}`, { permanent: true, direction: "right", offset: [10, 0], className: "lbl" });
      if (setupOn) m.on("click", () => { if (confirm(`Delete landmark "${lm.n}"?`)) { p.pts.splice(idx, 1); persistGeo(); drawHole(false); } });
    });
    renderLandmarks();
    if (p.green) {
      L.marker(p.green, { icon: L.divIcon({ className: "", html: '<div class="flag">🚩</div>', iconSize: [26, 26], iconAnchor: [5, 24] }), interactive: false, zIndexOffset: 500 }).addTo(holeLayer);
      const gp = greenPolyFor(p.green);
      if (gp) L.polygon(gp, { color: "#ffd400", weight: 2, fill: false, interactive: false }).addTo(holeLayer);
    }
    $("mapMsg").classList.toggle("hidden", !!(p.tee && p.green));
    $("mapMsg").textContent = "This hole isn't placed on the map yet — tap ⚙︎ to set the tee and green. Tapping the map still measures from your GPS.";
    if (fit) fitHole();
    updateDistances();
  }
  function fitHole() {
    const p = g();
    if (p.tee && p.green) {
      map.fitBounds(L.latLngBounds([p.tee, p.green, ...(p.pts || []).map((x) => x.p)]).pad(0.15), { maxZoom: 19, animate: false });
    } else if (p.green || p.tee) {
      map.setView(p.green || p.tee, 18, { animate: false });
    } else map.setView(C.center, 16, { animate: false });
  }

  // origin for measurements: you (if near) else the tee
  function origin() {
    const p = g();
    if (me && (!p.green || distM(me, p.green) < 900)) return { pt: me, src: "from you" };
    if (p.tee) return { pt: teePos(), src: "from tee " + S.tee };
    if (me) return { pt: me, src: "from you" };
    return null;
  }

  function updateDistances() {
    const p = g(), o = origin();
    let f = null, m = null, b = null, src = me ? "GPS on" : "GPS off";
    if (o && p.green) {
      m = distM(o.pt, p.green); src = o.src;
      const fb = frontBack(o.pt, p.green);
      if (fb) { f = fb.front; b = fb.back; }
      if (me && distM(me, p.green) >= 900 && o.src.startsWith("from tee")) src = "from tee (you're far)";
    } else if (!p.green) src = me ? "green not set" : "GPS off";
    $("dFront").textContent = fmtM(f); $("dMid").textContent = fmtM(m); $("dBack").textContent = fmtM(b);
    $("dSrc").textContent = src + " · " + unitTxt();
    if (target) drawTarget();
  }

  // tap-to-measure
  function drawTarget() {
    tapLayer.clearLayers();
    const o = origin(), p = g();
    const t = target;
    const mk = L.marker(t, { icon: dotIcon("#ff3b6b", ""), draggable: true }).addTo(tapLayer);
    mk.on("drag", (e) => { target = [e.latlng.lat, e.latlng.lng]; drawTargetLines(); });
    mk.on("click", () => { target = null; tapLayer.clearLayers(); });
    targetMarker = mk;
    drawTargetLines();
  }
  let targetMarker = null, lineGroup = L.layerGroup().addTo(map);
  function drawTargetLines() {
    lineGroup.clearLayers();
    if (!target) return;
    const o = origin(), p = g();
    if (o) {
      L.polyline([o.pt, target], { color: "#fff", weight: 2 }).addTo(lineGroup);
      L.tooltip({ permanent: true, direction: "center", className: "lbl" })
        .setLatLng(mid(o.pt, target)).setContent(fmtM(distM(o.pt, target))).addTo(lineGroup);
    }
    if (p.green) {
      L.polyline([target, p.green], { color: "#ffd400", weight: 2 }).addTo(lineGroup);
      L.tooltip({ permanent: true, direction: "center", className: "lbl" })
        .setLatLng(mid(target, p.green)).setContent(fmtM(distM(target, p.green))).addTo(lineGroup);
    }
    if (targetMarker) targetMarker.setLatLng(target);
  }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  map.on("click", (e) => {
    if (setupOn) return;
    target = [e.latlng.lat, e.latlng.lng];
    drawTarget();
  });
  const clearTarget = () => { target = null; tapLayer.clearLayers(); lineGroup.clearLayers(); };

  // ---------- GPS ----------
  function toggleGPS(force) {
    const on = force ?? watchId == null;
    if (!on) {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      watchId = null; me = null;
      if (meMarker) { map.removeLayer(meMarker); map.removeLayer(meAcc); meMarker = meAcc = null; }
      $("gpsBtn").classList.remove("on"); S.gps = false; save(); updateDistances(); return;
    }
    if (!("geolocation" in navigator)) { alert("GPS not available on this device/browser."); return; }
    $("gpsBtn").classList.add("on"); S.gps = true; save();
    watchId = navigator.geolocation.watchPosition((pos) => {
      me = [pos.coords.latitude, pos.coords.longitude];
      if (!meMarker) {
        meAcc = L.circle(me, { radius: pos.coords.accuracy, color: "#3aa0ff", weight: 1, fillOpacity: 0.1, interactive: false }).addTo(map);
        meMarker = L.circleMarker(me, { radius: 7, color: "#fff", weight: 2, fillColor: "#1e88ff", fillOpacity: 1, interactive: false }).addTo(map);
      } else { meMarker.setLatLng(me); meAcc.setLatLng(me).setRadius(pos.coords.accuracy); }
      updateDistances();
      if (target) drawTargetLines();
    }, (err) => {
      $("dSrc").textContent = "GPS: " + (err.code === 1 ? "permission denied" : "no fix");
    }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
  }

  // ---------- setup mode ----------
  let setupOn = false;
  function toggleSetup() {
    setupOn = !setupOn;
    $("setupPanel").classList.toggle("hidden", !setupOn);
    $("crosshair").classList.toggle("hidden", !setupOn);
    $("setupBtn").classList.toggle("on", setupOn);
    clearTarget(); drawOSM(); renderGeoStatus();
    if (setupOn && !osm) loadOSM().then(() => { drawOSM(); drawHole(false); });
  }
  function setPoint(which, src) {
    let pt;
    if (src === "gps") { if (!me) { alert("Turn on GPS (📍) and wait for a fix first."); return; } pt = me; }
    else { const c = map.getCenter(); pt = [+c.lat.toFixed(6), +c.lng.toFixed(6)]; }
    const h = cur(), k = h.key, upd = { [which]: pt };
    if (which === "tee") upd.teeId = h.yards(S.tee) != null ? S.tee : firstTeeId(h);
    if (which === "pt") {
      const n = prompt("Landmark name (e.g. 'Carry water', 'Bunker L', 'Creek')");
      if (!n) return;
      geo[k] = Object.assign({}, geo[k]);
      geo[k].pts = [...(geo[k].pts || []), { n: n.trim(), p: pt }];
    } else geo[k] = Object.assign({}, geo[k], upd);
    persistGeo(); drawHole(false);
  }
  function renderLandmarks() {
    const p = g(), tp = teePos(), box = $("lmTable");
    if (!p.pts || !p.pts.length) { box.innerHTML = ""; return; }
    let html = `<tr><th></th><th>Landmark</th><th>From tee ${S.tee}</th><th>To green</th></tr>`;
    p.pts.forEach((lm, i) => {
      html += `<tr><td>${i + 1}</td><td style="text-align:left">${lm.n.replace(/</g, "&lt;")}</td><td><b>${tp ? fmtM(distM(tp, lm.p)) : "–"}</b></td><td>${p.green ? fmtM(distM(lm.p, p.green)) : "–"}</td></tr>`;
    });
    box.innerHTML = html;
  }
  function assignFromOSM(f) {
    const k = cur().key;
    if (!confirm(`Use this OSM hole line${f.t.ref ? " (ref " + f.t.ref + ")" : ""} for ${cur().nine.name} ${cur().k + 1}?`)) return;
    geo[k] = Object.assign({}, geo[k], { tee: f.g[0], green: f.g[f.g.length - 1], teeId: firstTeeId(cur()) });
    persistGeo(); drawHole(true);
  }
  function persistGeo() {
    const overrides = {};
    for (const k in geo) if (JSON.stringify(geo[k]) !== JSON.stringify((window.GEO || {})[k])) overrides[k] = geo[k];
    store.set("geo", overrides); renderGeoStatus();
  }
  function renderGeoStatus() {
    const done = Object.keys(geo).filter((k) => geo[k].tee && geo[k].green).length;
    setGeoStatus(`${done} of 27 holes placed. Export and commit data/geo.js so it works on every device.`);
  }
  function setGeoStatus(t) { $("geoStatus").textContent = t; }
  function exportGeo() {
    const sorted = {};
    for (const n of ["east", "north", "west"]) for (let i = 1; i <= 9; i++) if (geo[`${n}-${i}`]) sorted[`${n}-${i}`] = geo[`${n}-${i}`];
    const body = "// Tee and green positions per hole — exported from the app.\nwindow.GEO = " + JSON.stringify(sorted, null, 2) + ";\n";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/javascript" }));
    a.download = "geo.js"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function importGeo(file) {
    const txt = await file.text();
    const m = txt.match(/\{[\s\S]*\}/);
    try { const obj = JSON.parse(m ? m[0] : txt); geo = Object.assign({}, geo, obj); persistGeo(); drawHole(true); }
    catch { alert("Couldn't read that file."); }
  }

  // ---------- render ----------
  function renderSelectors() {
    $("routeSel").innerHTML = C.routes.map((r) => `<option value="${r.id}">${r.label}</option>`).join("");
    $("routeSel").value = S.route;
    renderTeeBtns();
    $("unitBtn").textContent = unitTxt();
    const hs = document.createElement("select"); hs.id = "holeSel";
    hs.innerHTML = Array.from({ length: 18 }, (_, i) => `<option value="${i}">Hole ${i + 1}</option>`).join("");
    hs.onchange = () => goHole(+hs.value);
    $("dots").innerHTML = ""; $("dots").appendChild(hs);
  }

  function renderTeeBtns() {
    const r = route();
    $("teeBtns").innerHTML = C.tees.map((t) => {
      const tot = r.nines.reduce((s, n) => s + C.nines[n].yards[t.id].reduce((a, y, i) => a + (y ?? C.nines[n].yards["73"][i]), 0), 0);
      const name = t.short || t.label.split("·")[1].trim();
      return `<button class="teeBtn ${t.id === S.tee ? "sel" : ""}" data-tee="${t.id}" title="${t.label} · ${tot} yd">${t.id}<small>${name}</small></button>`;
    }).join("");
    $("teeBtns").querySelectorAll(".teeBtn").forEach((b) => b.onclick = () => {
      S.tee = b.dataset.tee; save(); renderTeeBtns();
      S.view === "card" ? renderCard() : renderHole(false);
    });
  }

  function renderHole(fit = true) {
    const h = cur();
    $("hNum").textContent = h.i + 1;
    $("hNine").textContent = `${h.nine.name} ${h.k + 1}`;
    $("hPar").textContent = h.par;
    $("hSi").textContent = h.si + (h.siEst ? "*" : "");
    $("hYds").textContent = fmtLen(yardsFor(h)) + (h.yards(S.tee) == null ? "*" : "");
    document.querySelector(".holeMeta .u").textContent = unitTxt();
    $("teeRow").innerHTML = C.tees.map((t) => {
      const y = h.yards(t.id);
      return `<div class="tee ${t.id === S.tee ? "sel" : ""}">${t.id}<b>${fmtLen(y)}</b></div>`;
    }).join("");
    const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    $("tips").innerHTML = h.tip ? `<div class="tip d"><span class="ic">⚠️</span><span>${esc(h.tip.d)}</span></div><div class="tip a"><span class="ic">🎯</span><span>${esc(h.tip.a)}</span></div>` : "";
    $("hNotes").textContent = h.note || "No notes for this hole yet — add your own below.";
    $("hNotes").classList.toggle("empty", !h.note);
    $("myNotes").value = myNotes[h.key] || "";
    const img = $("bookImg");
    img.classList.add("hidden");
    img.onload = () => img.classList.remove("hidden");
    img.onerror = () => img.classList.add("hidden");
    img.src = `book/${h.key}.jpg`;
    renderScore();
    const hs = $("holeSel"); if (hs) hs.value = S.hole;
    clearTarget();
    drawHole(fit);
  }

  function roundScores() { return scores[S.route] || (scores[S.route] = Array(18).fill(null)); }
  function renderScore() {
    const s = roundScores()[S.hole], par = cur().par, el = $("scoreVal");
    el.textContent = s ?? "–";
    el.className = "scoreVal" + (s == null ? "" : s < par ? " under" : s > par ? " over" : "");
  }
  function bumpScore(d) {
    const arr = roundScores(), par = cur().par;
    let v = arr[S.hole];
    v = v == null ? (d > 0 ? par : par - 1) : v + d;
    arr[S.hole] = v < 1 ? null : v;
    store.set("scores", scores); renderScore();
  }

  function renderCard() {
    const r = route();
    $("cardRoute").textContent = r.label;
    $("cardTee").textContent = "Tee " + S.tee + " · " + unitTxt();
    const sc = roundScores();
    let html = `<tr><th>Hole</th><th></th><th>${unitTxt()}</th><th>Par</th><th>SI</th><th>Score</th></tr>`;
    let tot = { y: 0, p: 0, s: 0, sp: 0 };
    for (let n = 0; n < 2; n++) {
      let sub = { y: 0, p: 0, s: 0, sp: 0 };
      for (let k = 0; k < 9; k++) {
        const h = holeInfo(n * 9 + k), y = yardsFor(h), s = sc[h.i];
        sub.y += y || 0; sub.p += h.par;
        if (s != null) { sub.s += s; sub.sp += h.par; }
        const cls = s == null ? "" : s < h.par ? "under" : s > h.par ? "over" : "";
        html += `<tr class="hole" data-i="${h.i}"><td><b>${h.i + 1}</b></td><td class="nineName">${h.nine.name} ${k + 1}</td><td>${fmtLen(y)}</td><td>${h.par}</td><td>${h.si}${h.siEst ? "*" : ""}</td><td class="${cls}">${s ?? ""}</td></tr>`;
      }
      html += `<tr class="sum"><td>${n ? "In" : "Out"}</td><td></td><td>${fmtLen(sub.y)}</td><td>${sub.p}</td><td></td><td>${sub.sp ? sub.s : ""}</td></tr>`;
      for (const k in tot) tot[k] += sub[k];
    }
    const toPar = tot.sp ? tot.s - tot.sp : null;
    html += `<tr class="sum"><td>Total</td><td></td><td>${fmtLen(tot.y)}</td><td>${tot.p}</td><td></td><td>${tot.sp ? tot.s + ` (${toPar > 0 ? "+" : ""}${toPar === 0 ? "E" : toPar})` : ""}</td></tr>`;
    $("cardTable").innerHTML = html;
    $("cardTable").querySelectorAll("tr.hole").forEach((tr) => tr.onclick = () => { showView("hole"); goHole(+tr.dataset.i); });
  }

  function showView(v) {
    S.view = v; save();
    $("holeView").classList.toggle("hidden", v !== "hole");
    $("cardView").classList.toggle("hidden", v !== "card");
    $("tabHole").classList.toggle("active", v === "hole");
    $("tabCard").classList.toggle("active", v === "card");
    if (v === "card") renderCard(); else setTimeout(() => { map.invalidateSize(); renderHole(true); }, 0);
  }
  function goHole(i) {
    S.hole = (i + 18) % 18; save();
    if (S.view !== "hole") showView("hole"); else renderHole(true);
    window.scrollTo({ top: 0 });
  }

  // ---------- events ----------
  $("routeSel").onchange = (e) => { S.route = e.target.value; save(); renderTeeBtns(); S.view === "card" ? renderCard() : renderHole(true); };
  $("unitBtn").onclick = () => { S.unit = S.unit === "y" ? "m" : "y"; save(); $("unitBtn").textContent = unitTxt(); S.view === "card" ? renderCard() : renderHole(false); };
  $("prevBtn").onclick = () => goHole(S.hole - 1);
  $("nextBtn").onclick = () => goHole(S.hole + 1);
  $("tabHole").onclick = () => showView("hole");
  $("tabCard").onclick = () => showView("card");
  $("scorePlus").onclick = () => bumpScore(1);
  $("scoreMinus").onclick = () => bumpScore(-1);
  $("gpsBtn").onclick = () => toggleGPS();
  $("fitBtn").onclick = () => fitHole();
  $("setupBtn").onclick = toggleSetup;
  $("osmBtn").onclick = () => loadOSM(true).then(() => { drawOSM(); drawHole(false); });
  $("clearHoleBtn").onclick = () => { if (confirm("Clear tee/green for this hole?")) { delete geo[cur().key]; persistGeo(); drawHole(false); } };
  $("exportBtn").onclick = exportGeo;
  $("importFile").onchange = (e) => e.target.files[0] && importGeo(e.target.files[0]);
  document.querySelectorAll("[data-set]").forEach((b) => b.onclick = () => setPoint(b.dataset.set, b.dataset.src));
  $("myNotes").oninput = (e) => { myNotes[cur().key] = e.target.value; store.set("notes", myNotes); };
  $("newRoundBtn").onclick = () => { if (confirm("Clear all scores for this combination?")) { scores[S.route] = Array(18).fill(null); store.set("scores", scores); renderCard(); } };

  // swipe between holes on the header area
  let sx = null;
  document.querySelector(".holeHead").addEventListener("touchstart", (e) => sx = e.touches[0].clientX, { passive: true });
  document.querySelector(".holeHead").addEventListener("touchend", (e) => {
    if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 60) goHole(S.hole + (dx < 0 ? 1 : -1));
  });

  // ---------- boot ----------
  renderSelectors();
  drawOSM();
  showView(S.view);
  if (S.gps) toggleGPS(true);
  if (!osm) loadOSM().then(() => { drawOSM(); drawHole(false); });

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
