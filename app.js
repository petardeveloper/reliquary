"use strict";

const $ = (sel) => document.querySelector(sel);

const DB_KEY = "reliquary_showcase_db";
const ME_KEY = "reliquary_showcase_me";

function readSession(key) {
  try { return sessionStorage.getItem(key); } catch (e) { return null; }
}
function writeSession(key, val) {
  try {
    if (val === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, val);
  } catch (e) {}
}

let db = null;
try { db = JSON.parse(readSession(DB_KEY)); } catch (e) { db = null; }
if (!db || !Array.isArray(db.posts)) db = buildSeed();

function persist() { writeSession(DB_KEY, JSON.stringify(db)); }

let idCounter = 0;
const newId = (prefix) => prefix + Date.now().toString(36) + (++idCounter);
const nowIso = () => new Date().toISOString();
const byDate = (a, b) => new Date(a.created_at) - new Date(b.created_at);

const store = {
  fetchPosts() { return [...db.posts].sort(byDate); },
  fetchNotes() { return [...db.notes].sort(byDate); },
  addPost(post) {
    const p = { ...post, id: newId("p"), created_at: nowIso() };
    db.posts.push(p); persist(); return p;
  },
  addNote(note) {
    const n = { ...note, id: newId("n"), created_at: nowIso() };
    db.notes.push(n); persist(); return n;
  },
  uploadImage(file) { return resizeToDataUrl(file, 900, 0.8); },

  fetchPins() { return [...db.pins].sort(byDate); },
  addPin(pin) {
    const p = { ...pin, id: newId("pin"), visited: false, is_home: false, created_at: nowIso() };
    db.pins.push(p); persist(); return p;
  },
  setPinVisited(id, visited) {
    db.pins.forEach((p) => { if (p.id === id) p.visited = visited; }); persist();
  },
  setPinHome(id) {
    db.pins.forEach((p) => { p.is_home = p.id === id; }); persist();
  },
  deletePin(id) { db.pins = db.pins.filter((p) => p.id !== id); persist(); },

  fetchHexes() { return [...db.hexes]; },
  addHex(h, author) {
    if (!db.hexes.some((r) => r.h3 === h && r.author === author)) db.hexes.push({ h3: h, author });
    persist();
  },
  removeHex(h, author) {
    db.hexes = db.hexes.filter((r) => !(r.h3 === h && r.author === author)); persist();
  },

  fetchNeeds() { return Object.entries(db.needs).map(([author, v]) => ({ author, ...v })); },
  saveNeeds(author, data) { db.needs[author] = { ...data, parts: [...data.parts] }; persist(); },

  fetchTrips() { return [...db.trips].sort((a, b) => byDate(b, a)); },
  addTrip(trip) {
    const t = { ...trip, id: newId("t"), created_at: nowIso() };
    db.trips.push(t); persist(); return t;
  },
  deleteTrip(id) {
    db.trips = db.trips.filter((t) => t.id !== id);
    db.mementos = db.mementos.filter((m) => m.trip_id !== id);
    persist();
  },
  fetchMementos() { return [...db.mementos].sort(byDate); },
  addMemento(m) {
    const x = { thumb: null, ...m, id: newId("m"), created_at: nowIso() };
    db.mementos.push(x); persist(); return x;
  },
  deleteMemento(id) { db.mementos = db.mementos.filter((m) => m.id !== id); persist(); },
  uploadTripImage(file) { return resizeToDataUrl(file, 900, 0.78); },
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function linkify(escaped) {
  return escaped.replace(/(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function userName(id) {
  return (USERS.find((u) => u.id === id) || { name: id }).name;
}

let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 2600);
}

function openLightbox(src) {
  $("#lightbox-img").src = src;
  $("#lightbox").classList.remove("hidden");
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(img.src); resolve(img); };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function resizeToDataUrl(file, maxSide, quality) {
  const img = await loadImageFromFile(file);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

let me = null;
let selectedTag = null;
let attachedFile = null;
let currentFilter = "ALL";
let settling = true;
const seenIds = new Set();
const seenNoteIds = new Set();
const pendingNotes = [];

let pickedUser = null;

function buildLogin() {
  const box = $("#user-select");
  USERS.forEach((u) => {
    const b = document.createElement("button");
    b.className = "user-btn";
    b.textContent = u.name;
    b.onclick = () => {
      pickedUser = u;
      document.querySelectorAll(".user-btn").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
      $("#login-error").classList.add("hidden");
    };
    box.appendChild(b);
  });
  $("#login-btn").onclick = tryLogin;
  $("#passphrase").addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryLogin();
  });
}

function tryLogin() {
  if (!pickedUser) { $("#login-error").classList.remove("hidden"); return; }
  writeSession(ME_KEY, pickedUser.id);
  enterApp(pickedUser);
}

function buildHalves() {
  const halves = $("#halves");
  halves.innerHTML = "";
  USERS.forEach((u) => {
    const half = document.createElement("section");
    half.className = "half" + (u.id === me.id ? " mine" : "");
    half.innerHTML = `
      <div class="half-head"><span class="sigil">†</span> ${escapeHtml(u.name)}${u.id === me.id ? " (YOU)" : ""} <span class="sigil">†</span></div>
      <div class="feed" data-author="${u.id}">
        <p class="feed-empty">· nothing offered yet ·</p>
      </div>`;
    halves.appendChild(half);
  });
}

function scrollFeedsToEnd() {
  document.querySelectorAll(".feed").forEach((f) => { f.scrollTop = f.scrollHeight; });
}

function buildFilterBar() {
  const bar = $("#filter-bar");
  bar.innerHTML = "";
  ["ALL", ...TAGS].forEach((t) => {
    const b = document.createElement("button");
    b.className = "filter-tab tag-" + t + (t === currentFilter ? " selected" : "");
    b.dataset.tag = t;
    b.textContent = t === "ALL" ? "✦ ALL" : t;
    b.onclick = () => applyFilter(t);
    bar.appendChild(b);
  });
}

function applyFilter(tag) {
  currentFilter = tag;
  document.querySelectorAll(".filter-tab").forEach((b) => {
    b.classList.toggle("selected", b.dataset.tag === tag);
  });
  document.querySelectorAll(".post").forEach((p) => {
    p.classList.toggle("filtered", tag !== "ALL" && p.dataset.tag !== tag);
  });
  updateEmptyStates();
}

function updateEmptyStates() {
  document.querySelectorAll(".feed").forEach((feed) => {
    const visible = feed.querySelectorAll(".post:not(.filtered)").length;
    const empty = feed.querySelector(".feed-empty");
    empty.classList.toggle("hidden", visible > 0);
    empty.textContent = currentFilter === "ALL"
      ? "· nothing offered yet ·"
      : `· no ${currentFilter.toLowerCase()} offered yet ·`;
  });
}

function renderPost(post) {
  if (seenIds.has(post.id)) return null;
  seenIds.add(post.id);

  const feed = document.querySelector(`.feed[data-author="${post.author}"]`);
  if (!feed) return null;

  const node = $("#post-template").content.cloneNode(true);
  const article = node.querySelector(".post");
  article.dataset.tag = post.tag;
  article.dataset.postId = post.id;
  if (currentFilter !== "ALL" && post.tag !== currentFilter) article.classList.add("filtered");

  const tagEl = node.querySelector(".post-tag");
  tagEl.textContent = post.tag;
  tagEl.classList.add("tag-" + post.tag);
  node.querySelector(".post-date").textContent = fmtDate(post.created_at);

  if (post.image_url) {
    const img = node.querySelector(".post-img");
    img.src = post.image_url;
    img.classList.remove("hidden");
    img.onclick = () => openLightbox(post.image_url);
    img.onload = () => { if (settling) feed.scrollTop = feed.scrollHeight; };
  }
  const bodyEl = node.querySelector(".post-body");
  if (post.body) bodyEl.innerHTML = linkify(escapeHtml(post.body));
  else bodyEl.remove();

  const toggle = node.querySelector(".note-toggle");
  const wrap = node.querySelector(".note-wrap");
  toggle.onclick = () => wrap.classList.toggle("hidden");
  const input = node.querySelector(".note-input");
  const sendNoteNow = () => sendNote(post.id, article);
  node.querySelector(".note-send").onclick = sendNoteNow;
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") sendNoteNow(); });

  feed.appendChild(node);
  updateEmptyStates();

  for (let i = pendingNotes.length - 1; i >= 0; i--) {
    if (pendingNotes[i].post_id === post.id) renderNote(pendingNotes.splice(i, 1)[0]);
  }
  return article;
}

function renderNote(note) {
  if (seenNoteIds.has(note.id)) return;

  const article = document.querySelector(`.post[data-post-id="${note.post_id}"]`);
  if (!article) { pendingNotes.push(note); return; }
  seenNoteIds.add(note.id);

  const div = document.createElement("div");
  div.className = "note";
  const mine = note.author === me.id;
  div.innerHTML =
    `<span class="note-author${mine ? " mine" : ""}">${escapeHtml(userName(note.author))}:</span> ` +
    `<span class="note-body-text">${linkify(escapeHtml(note.body))}</span>` +
    `<span class="note-date">${fmtDate(note.created_at)}</span>`;
  article.querySelector(".note-list").appendChild(div);

  const count = article.querySelectorAll(".note").length;
  const toggle = article.querySelector(".note-toggle");
  toggle.textContent = `✎ NOTES (${count})`;
  toggle.classList.add("has-notes");
}

function sendNote(postId, article) {
  const input = article.querySelector(".note-input");
  const body = input.value.trim();
  if (!body) return;
  renderNote(store.addNote({ post_id: postId, author: me.id, body }));
  input.value = "";
}

function buildComposer() {
  const row = $("#tag-row");
  row.innerHTML = "";
  TAGS.forEach((t) => {
    const b = document.createElement("button");
    b.className = "tag-btn tag-" + t;
    b.textContent = t;
    b.onclick = () => {
      selectedTag = t;
      document.querySelectorAll(".tag-btn").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
    };
    row.appendChild(b);
  });

  $("#post-image").addEventListener("change", (e) => {
    attachedFile = e.target.files[0] || null;
    if (attachedFile) {
      $("#image-preview").src = URL.createObjectURL(attachedFile);
      $("#image-preview-row").classList.remove("hidden");
    }
  });
  $("#remove-image").onclick = clearImage;

  $("#send-btn").onclick = sendPost;
  $("#post-text").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendPost();
  });
}

function clearImage() {
  attachedFile = null;
  $("#post-image").value = "";
  $("#image-preview-row").classList.add("hidden");
}

async function sendPost() {
  const body = $("#post-text").value.trim();
  if (!selectedTag) { flashSend("PICK A TAG"); return; }
  if (!body && !attachedFile) { flashSend("EMPTY..."); return; }

  const btn = $("#send-btn");
  btn.disabled = true;
  btn.textContent = "...";
  try {
    const image_url = attachedFile ? await store.uploadImage(attachedFile) : null;
    const post = store.addPost({ author: me.id, tag: selectedTag, body, image_url });
    const article = renderPost(post);
    if (article) article.scrollIntoView({ block: "nearest" });
    $("#post-text").value = "";
    clearImage();
  } catch (e) {
    toast("That image could not be read.");
  } finally {
    btn.disabled = false;
    btn.textContent = "► SEND";
  }
}

function flashSend(msg) {
  const btn = $("#send-btn");
  btn.textContent = msg;
  setTimeout(() => (btn.textContent = "► SEND"), 1200);
}

const AUTHOR_COLORS = { user1: "#a83f3f", user2: "#3f6ab8" };
const BOTH_COLOR = "#b8963f";
const H3_RES = 3;
const HEX_GRID_MIN_ZOOM = 5;
const HEX_GRID_MAX_CELLS = 2000;

let map = null;
let hexGridLayer = null, visitedHexLayer = null, pinLayer = null;
let mapTool = "browse";
let pins = [];
let hexes = new Map();
let pendingLatLng = null;

const TOOL_HINTS = {
  browse: "ROAM: drag to wander. pins & charted hexes are shown.",
  pin: "PIN: click the map to mark a place of pilgrimage.",
  hex: "CHART: click a hexagon you have set foot in.",
};

function mapHint(msg) { $("#map-hint").textContent = msg; }

function distKm(a, b) {
  const R = 6371, toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function initMap() {
  map = L.map("map", { worldCopyJump: true }).setView([50, 14], 4);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  visitedHexLayer = L.layerGroup().addTo(map);
  hexGridLayer = L.layerGroup().addTo(map);
  pinLayer = L.layerGroup().addTo(map);

  map.on("click", (e) => {
    if (mapTool === "pin") {
      pendingLatLng = e.latlng;
      $("#pin-name").value = "";
      $("#pin-dialog").classList.remove("hidden");
      $("#pin-name").focus();
    }
  });
  map.on("moveend zoomend", redrawHexGrid);

  document.querySelectorAll(".tool-btn").forEach((b) => {
    b.onclick = () => {
      mapTool = b.dataset.tool;
      document.querySelectorAll(".tool-btn").forEach((x) =>
        x.classList.toggle("selected", x === b));
      $("#map").style.cursor = mapTool === "pin" ? "crosshair" : "";
      mapHint(TOOL_HINTS[mapTool]);
      redrawHexGrid();
    };
  });

  $("#pin-save").onclick = savePinFromDialog;
  $("#pin-cancel").onclick = () => $("#pin-dialog").classList.add("hidden");
  $("#pin-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") savePinFromDialog();
    if (e.key === "Escape") $("#pin-dialog").classList.add("hidden");
  });

  mapHint(TOOL_HINTS.browse);
}

function frameMap() {
  if (!map) return;
  map.invalidateSize();
  if (pins.length) {
    map.fitBounds(pins.map((p) => [p.lat, p.lng]), { padding: [40, 40], animate: false });
  }
}

function savePinFromDialog() {
  const name = $("#pin-name").value.trim();
  if (!name || !pendingLatLng) return;
  $("#pin-dialog").classList.add("hidden");
  store.addPin({ author: me.id, name, lat: pendingLatLng.lat, lng: pendingLatLng.lng });
  refreshMapData();
}

function renderMapPins() {
  if (!map) return;
  pinLayer.clearLayers();
  pins.forEach((p) => {
    const glyph = p.is_home ? "⌂" : p.visited ? "✔" : "◆";
    const cls = `pin-marker ${p.author}${p.visited ? " visited" : ""}${p.is_home ? " home" : ""}`;
    const icon = L.divIcon({
      className: "",
      html: `<div class="${cls}">${glyph}</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 22],
    });
    L.marker([p.lat, p.lng], { icon, title: p.name })
      .on("click", () => flashWishItem(p.id))
      .addTo(pinLayer);
  });
}

function flashWishItem(id) {
  const el = document.querySelector(`.wish-item[data-id="${id}"]`);
  if (!el) return;
  el.scrollIntoView({ block: "center" });
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 1500);
}

function renderWishlist() {
  const list = $("#wish-list");
  list.innerHTML = "";
  if (!pins.length) {
    list.innerHTML = '<p class="feed-empty">· no places marked yet ·</p>';
  }
  const home = pins.find((p) => p.is_home);
  const sorted = [...pins].sort((a, b) => {
    if (a.is_home) return -1;
    if (b.is_home) return 1;
    if (home) return distKm(home, a) - distKm(home, b);
    return new Date(a.created_at) - new Date(b.created_at);
  });

  sorted.forEach((p) => {
    const item = document.createElement("div");
    item.className = "wish-item" + (p.visited ? " visited" : "") + (p.is_home ? " home" : "");
    item.dataset.id = p.id;
    const distLabel = p.is_home ? "⌂ HOME"
      : home ? Math.round(distKm(home, p)) + " KM" : "";
    item.innerHTML = `
      <div class="wish-main">
        <span class="wish-sigil" style="color:${AUTHOR_COLORS[p.author] || "#fff"}">◆</span>
        <span class="wish-name">${escapeHtml(p.name)}</span>
        <span class="wish-dist">${distLabel}</span>
      </div>
      <div class="wish-actions">
        <button class="btn went${p.visited ? " on" : ""}">${p.visited ? "☑ WENT" : "☐ WENT"}</button>
        <button class="btn home-btn${p.is_home ? " on" : ""}">⌂ HOME</button>
        <button class="btn del">✕</button>
      </div>`;

    item.querySelector(".wish-main").onclick = () => {
      if (map) map.setView([p.lat, p.lng], Math.max(map.getZoom(), 8));
    };
    item.querySelector(".went").onclick = () => { store.setPinVisited(p.id, !p.visited); refreshMapData(); };
    item.querySelector(".home-btn").onclick = () => { store.setPinHome(p.id); refreshMapData(); };
    item.querySelector(".del").onclick = () => {
      if (!confirm(`Unmake "${p.name}"?`)) return;
      store.deletePin(p.id);
      refreshMapData();
    };
    list.appendChild(item);
  });

  const visitedCount = pins.filter((p) => p.visited).length;
  $("#wish-foot").textContent =
    `${visitedCount}/${pins.length} VISITED · ${hexes.size} HEXES CHARTED` +
    (home ? "" : " · SET A ⌂ HOME PIN TO SORT BY DISTANCE");
}

function hexColor(authors) {
  return authors.size >= 2 ? BOTH_COLOR : AUTHOR_COLORS[[...authors][0]] || "#fff";
}

function redrawVisitedHexes() {
  if (!map || typeof h3 === "undefined") return;
  visitedHexLayer.clearLayers();
  hexes.forEach((authors, h) => {
    const c = hexColor(authors);
    L.polygon(h3.cellToBoundary(h), {
      color: c, weight: 1, opacity: 0.7,
      fillColor: c, fillOpacity: 0.28,
      interactive: false,
    }).addTo(visitedHexLayer);
  });
}

function redrawHexGrid() {
  if (!map || typeof h3 === "undefined") return;
  hexGridLayer.clearLayers();
  if (mapTool !== "hex") return;
  if (map.getZoom() < HEX_GRID_MIN_ZOOM) {
    mapHint("CHART: draw nearer (zoom in) to see the hexagons.");
    return;
  }
  const b = map.getBounds();
  const poly = [
    [b.getSouth(), b.getWest()], [b.getSouth(), b.getEast()],
    [b.getNorth(), b.getEast()], [b.getNorth(), b.getWest()],
  ];
  let cells;
  try { cells = h3.polygonToCells(poly, H3_RES); } catch (e) { return; }
  if (cells.length > HEX_GRID_MAX_CELLS) {
    mapHint("CHART: too wide a realm, zoom in further.");
    return;
  }
  mapHint(TOOL_HINTS.hex);
  cells.forEach((h) => {
    L.polygon(h3.cellToBoundary(h), {
      color: "#8b7bb8", weight: 1, opacity: 0.35,
      fillColor: "#8b7bb8", fillOpacity: 0.03,
    }).on("click", () => toggleHex(h)).addTo(hexGridLayer);
  });
}

function toggleHex(h) {
  const set = hexes.get(h) || new Set();
  if (set.has(me.id)) { store.removeHex(h, me.id); set.delete(me.id); }
  else { store.addHex(h, me.id); set.add(me.id); }
  if (set.size) hexes.set(h, set); else hexes.delete(h);
  redrawVisitedHexes();
  renderWishlist();
}

function refreshMapData() {
  pins = store.fetchPins();
  hexes = new Map();
  store.fetchHexes().forEach((r) => {
    if (!hexes.has(r.h3)) hexes.set(r.h3, new Set());
    hexes.get(r.h3).add(r.author);
  });
  renderWishlist();
  renderMapPins();
  redrawVisitedHexes();
}

const VOTIVE_HOURS = 24;
const EFFIGY_SHAPES = {
  head:  "48,6 72,6 76,14 76,30 72,36 48,36 44,30 44,14",
  torso: "46,40 74,40 78,48 76,92 70,98 50,98 44,92 42,48",
  arm_l: "26,42 40,42 38,90 24,88",
  arm_r: "80,42 94,42 96,88 82,90",
  leg_l: "46,102 58,102 57,158 45,158",
  leg_r: "62,102 74,102 75,158 63,158",
};

let needs = null;

function emptyNeeds() {
  return { parts: [], note: "", note_at: null };
}

function votiveState(n) {
  if (!n || !n.note || !n.note_at) return { expired: true };
  const remainMs = VOTIVE_HOURS * 3600 * 1000 - (Date.now() - new Date(n.note_at).getTime());
  if (remainMs <= 0) return { expired: true };
  const h = Math.floor(remainMs / 3600000);
  const m = Math.floor((remainMs % 3600000) / 60000);
  return { expired: false, note: n.note, burn: `burns out in ${h}h ${m}m` };
}

function effigySvg() {
  const polys = PARTS.map((p) =>
    `<polygon class="effigy-part" data-part="${p.key}" points="${EFFIGY_SHAPES[p.key]}">` +
    `<title>${escapeHtml(p.name)}</title></polygon>`).join("");
  return `<svg viewBox="0 0 120 170" class="effigy" shape-rendering="crispEdges" aria-hidden="true">
    ${polys}
    <line x1="60" y1="50" x2="60" y2="86" class="effigy-orn"></line>
    <line x1="52" y1="60" x2="68" y2="60" class="effigy-orn"></line>
  </svg>`;
}

function renderVigil() {
  const box = $("#effigies");
  if (!box || !needs) return;

  const draftEl = box.querySelector(".votive-input");
  const draft = draftEl ? draftEl.value : null;
  const hadFocus = draftEl && document.activeElement === draftEl;

  box.innerHTML = "";
  USERS.forEach((u) => {
    const n = needs[u.id] || emptyNeeds();
    const mine = u.id === me.id;
    const panel = document.createElement("section");
    panel.className = "effigy-panel" + (mine ? " mine" : "");
    panel.style.setProperty("--lit", AUTHOR_COLORS[u.id] || "#a83f3f");

    const vs = votiveState(n);
    const votiveInner = mine
      ? `<textarea class="votive-input" maxlength="600"
           placeholder="speak plainly of what you need...">${escapeHtml(vs.expired ? "" : vs.note)}</textarea>
         <div class="votive-actions"><button class="btn btn-tiny votive-save">► ENGRAVE</button></div>`
      : vs.expired
        ? `<p class="votive-text votive-empty">· the candle has burnt out ·</p>`
        : `<p class="votive-text">${linkify(escapeHtml(vs.note))}</p>`;

    panel.innerHTML = `
      <div class="effigy-head-title"><span class="sigil">♰</span> ${escapeHtml(u.name)}${mine ? " (YOU)" : ""} <span class="sigil">♰</span></div>
      <div class="effigy-body">
        ${effigySvg()}
        <div class="part-legend">
          ${PARTS.map((p) => `
            <button class="part-row${n.parts.includes(p.key) ? " lit" : ""}" data-part="${p.key}">
              <span class="part-name">${escapeHtml(p.name)}</span><br>${escapeHtml(p.plea)}
            </button>`).join("")}
        </div>
      </div>
      <div class="votive">
        <span class="votive-burn">${vs.expired ? "" : vs.burn}</span>
        <div class="votive-title">✦ VOTIVE</div>
        ${votiveInner}
      </div>`;

    n.parts.forEach((key) => {
      const poly = panel.querySelector(`.effigy-part[data-part="${key}"]`);
      if (poly) poly.classList.add("lit");
    });

    if (mine) {
      panel.querySelectorAll("[data-part]").forEach((el) => {
        el.addEventListener("click", () => togglePart(el.dataset.part));
      });
      panel.querySelector(".votive-save").onclick = () => saveVotive(panel);
      if (draft !== null && draft !== "" && draft !== (vs.expired ? "" : vs.note)) {
        panel.querySelector(".votive-input").value = draft;
      }
      if (hadFocus) panel.querySelector(".votive-input").focus();
    }
    box.appendChild(panel);
  });
}

function togglePart(key) {
  const mine = needs[me.id] || emptyNeeds();
  mine.parts = mine.parts.includes(key)
    ? mine.parts.filter((k) => k !== key)
    : [...mine.parts, key];
  needs[me.id] = mine;
  store.saveNeeds(me.id, mine);
  renderVigil();
}

function saveVotive(panel) {
  const mine = needs[me.id] || emptyNeeds();
  mine.note = panel.querySelector(".votive-input").value.trim();
  mine.note_at = mine.note ? nowIso() : null;
  needs[me.id] = mine;
  store.saveNeeds(me.id, mine);
  renderVigil();
  toast(mine.note ? "ENGRAVED. it burns for a day." : "THE VOTIVE IS SNUFFED.");
}

function refreshVigilData() {
  needs = { user1: emptyNeeds(), user2: emptyNeeds() };
  store.fetchNeeds().forEach((r) => {
    needs[r.author] = { parts: [...(r.parts || [])], note: r.note || "", note_at: r.note_at || null };
  });
  renderVigil();
}

setInterval(() => {
  if (me && !$("#vigil-view").classList.contains("hidden")) renderVigil();
}, 60000);

let trips = [];
let mementos = [];
let currentTripId = null;

function ytId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?\S*?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function renderTrips() {
  const list = $("#trip-list");
  list.innerHTML = "";
  if (!trips.length) {
    list.innerHTML = '<p class="feed-empty">· no voyages chronicled yet ·</p>';
  }
  trips.forEach((t) => {
    const count = mementos.filter((m) => m.trip_id === t.id).length;
    const row = document.createElement("button");
    row.className = "trip-row" + (t.id === currentTripId ? " selected" : "");
    row.innerHTML = `
      <span class="trip-title">${escapeHtml(t.title)}</span>
      <span class="trip-season">${escapeHtml(t.season || "")}</span>
      <span class="trip-count">${count} ✧</span>`;
    row.onclick = () => { currentTripId = t.id; renderTrips(); renderGallery(); };
    list.appendChild(row);
  });
}

function renderGallery() {
  const gallery = $("#gallery");
  const head = $("#gallery-head");
  const trip = trips.find((t) => t.id === currentTripId);
  gallery.innerHTML = "";

  if (!trip) {
    currentTripId = null;
    head.classList.add("hidden");
    gallery.innerHTML = '<p class="feed-empty">· choose a voyage ·</p>';
    return;
  }
  head.classList.remove("hidden");
  $("#gallery-title").textContent = "☾ " + trip.title + (trip.season ? " · " + trip.season : "");

  const items = mementos.filter((m) => m.trip_id === trip.id);
  if (!items.length) {
    gallery.innerHTML = '<p class="feed-empty">· nothing kept from this voyage yet ·</p>';
    return;
  }

  items.forEach((m) => {
    let el;
    if (m.kind === "photo") {
      el = document.createElement("figure");
      el.className = `memento photo ${m.author}`;
      el.innerHTML = `<img src="${escapeHtml(m.url)}" loading="lazy" alt="${escapeHtml(m.caption || "")}">` +
        (m.caption ? `<figcaption>${escapeHtml(m.caption)}</figcaption>` : "");
      el.querySelector("img").onclick = () => openLightbox(m.url);
    } else {
      el = document.createElement("a");
      el.className = `memento video ${m.author}`;
      el.href = m.url;
      if (m.url === "#") {
        el.onclick = (e) => { e.preventDefault(); toast("EXAMPLE CLIP. in the real thing this opens the video."); };
      } else {
        el.target = "_blank";
        el.rel = "noopener noreferrer";
      }
      const id = ytId(m.url);
      const thumb = m.thumb || (id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null);
      let host = "";
      try { host = new URL(m.url).hostname.replace("www.", ""); } catch (e) {}
      el.innerHTML =
        (thumb ? `<img src="${escapeHtml(thumb)}" loading="lazy" alt="">` : `<div class="video-blank">▶</div>`) +
        `<span class="video-play">▶</span>` +
        `<span class="mem-caption">${escapeHtml(m.caption || host || "moving picture")}</span>`;
    }
    const del = document.createElement("button");
    del.className = "btn del-mem";
    del.textContent = "✕";
    del.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!confirm("Cast this memento out?")) return;
      store.deleteMemento(m.id);
      refreshChronicleData();
    };
    el.appendChild(del);
    gallery.appendChild(el);
  });
}

function setupChronicleUI() {
  $("#new-trip").onclick = () => {
    $("#trip-title").value = "";
    $("#trip-season").value = "";
    $("#trip-dialog").classList.remove("hidden");
    $("#trip-title").focus();
  };
  $("#trip-cancel").onclick = () => $("#trip-dialog").classList.add("hidden");
  $("#trip-save").onclick = () => {
    const title = $("#trip-title").value.trim();
    if (!title) return;
    $("#trip-dialog").classList.add("hidden");
    const t = store.addTrip({ title, season: $("#trip-season").value.trim(), author: me.id });
    currentTripId = t.id;
    refreshChronicleData();
  };

  $("#del-trip").onclick = () => {
    const trip = trips.find((t) => t.id === currentTripId);
    if (!trip) return;
    if (!confirm(`Unmake the voyage "${trip.title}" and all its mementos?`)) return;
    store.deleteTrip(trip.id);
    currentTripId = null;
    refreshChronicleData();
  };

  $("#trip-photos").addEventListener("change", async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    if (!files.length || !currentTripId) return;
    const label = document.querySelector('label[for="trip-photos"]');
    try {
      for (let i = 0; i < files.length; i++) {
        label.textContent = `${i + 1}/${files.length}...`;
        const url = await store.uploadTripImage(files[i]);
        store.addMemento({ trip_id: currentTripId, author: me.id, kind: "photo", url, caption: "" });
      }
    } catch (err) {
      toast("One of those images could not be read.");
    } finally {
      label.textContent = "✚ PHOTOS";
      refreshChronicleData();
    }
  });

  $("#add-video").onclick = () => {
    if (!currentTripId) return;
    $("#video-url").value = "";
    $("#video-caption").value = "";
    $("#video-dialog").classList.remove("hidden");
    $("#video-url").focus();
  };
  $("#video-cancel").onclick = () => $("#video-dialog").classList.add("hidden");
  $("#video-save").onclick = () => {
    const url = $("#video-url").value.trim();
    if (!url || !/^https?:\/\//i.test(url)) { $("#video-url").focus(); return; }
    $("#video-dialog").classList.add("hidden");
    store.addMemento({
      trip_id: currentTripId, author: me.id, kind: "video",
      url, caption: $("#video-caption").value.trim(),
    });
    refreshChronicleData();
  };

  $("#lightbox").onclick = () => $("#lightbox").classList.add("hidden");
}

function refreshChronicleData() {
  trips = store.fetchTrips();
  mementos = store.fetchMementos();
  if (currentTripId && !trips.some((t) => t.id === currentTripId)) currentTripId = null;
  if (!currentTripId && trips.length) currentTripId = trips[0].id;
  renderTrips();
  renderGallery();
}

function showMode(mode) {
  const isBoard = mode === "board", isMap = mode === "map",
        isVigil = mode === "vigil", isChron = mode === "chron";
  $("#halves").classList.toggle("hidden", !isBoard);
  $("#composer").classList.toggle("hidden", !isBoard);
  $("#filter-bar").classList.toggle("hidden", !isBoard);
  $("#map-view").classList.toggle("hidden", !isMap);
  $("#vigil-view").classList.toggle("hidden", !isVigil);
  $("#chron-view").classList.toggle("hidden", !isChron);
  $("#mode-board").classList.toggle("selected", isBoard);
  $("#mode-map").classList.toggle("selected", isMap);
  $("#mode-vigil").classList.toggle("selected", isVigil);
  $("#mode-chron").classList.toggle("selected", isChron);
  if (isMap) {
    const first = !map;
    if (first) initMap();
    setTimeout(() => {
      if (first) frameMap(); else map.invalidateSize();
      redrawHexGrid(); renderMapPins(); redrawVisitedHexes();
    }, 50);
  }
  if (isVigil) renderVigil();
  if (isChron) { renderTrips(); renderGallery(); }
  setHdrHeight();
}

function setHdrHeight() {
  const hdr = $("#hdr");
  if (hdr) document.documentElement.style.setProperty("--hdr-h", hdr.offsetHeight + "px");
}
window.addEventListener("resize", setHdrHeight);
window.addEventListener("load", setHdrHeight);

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  $("#lightbox").classList.add("hidden");
  document.querySelectorAll(".dialog-overlay").forEach((d) => d.classList.add("hidden"));
});

function enterApp(user) {
  me = user;
  $("#login-screen").classList.add("hidden");
  $("#app").classList.remove("hidden");
  $("#whoami").textContent = "WALKING AS " + me.name;

  buildHalves();
  buildFilterBar();
  buildComposer();
  setupChronicleUI();
  setHdrHeight();

  $("#mode-board").onclick = () => showMode("board");
  $("#mode-map").onclick = () => showMode("map");
  $("#mode-vigil").onclick = () => showMode("vigil");
  $("#mode-chron").onclick = () => showMode("chron");

  $("#logout-btn").onclick = () => {
    writeSession(ME_KEY, null);
    location.reload();
  };
  $("#reset-btn").onclick = () => {
    if (!confirm("Put everything back to the original example data?")) return;
    writeSession(DB_KEY, null);
    location.reload();
  };

  store.fetchPosts().forEach(renderPost);
  store.fetchNotes().forEach(renderNote);
  scrollFeedsToEnd();
  setTimeout(() => { settling = false; }, 2500);

  refreshMapData();
  refreshVigilData();
  refreshChronicleData();
}

buildLogin();
const savedUser = USERS.find((u) => u.id === readSession(ME_KEY));
if (savedUser) enterApp(savedUser);
