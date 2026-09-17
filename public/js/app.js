(() => {
  const DATA = window.ISU_DATA;
  if (!DATA || !Array.isArray(DATA.isu)) {
    document.getElementById("stats").textContent =
      "Data belum dibangun. Jalankan node scripts/build.mjs.";
    return;
  }

  const ISU = DATA.isu;
  const KECAMATAN = DATA.kecamatan || [];
  const LAPORAN = DATA.laporan || [];
  const CONFIG = DATA.config || {};
  const META = DATA.meta || {};

  const VERIF_LABEL = {
    belum: "Belum dicek",
    tautan_ok: "Tautan valid",
    sumber_kedua: "Sumber kedua",
    iklan_ditolak: "Ditolak (iklan)",
    terbit: "Terbit",
  };
  const SUMBER_LABEL = {
    resmi: "Resmi",
    media: "Media",
    generik: "Generik",
    sosial: "Sosial",
    pengamplifikasi: "Pengamplifikasi",
  };
  const TABS = ["peta", "daftar", "kecamatan", "docs", "lapor"];
  const BELUM_DIPETAKAN = "__belum__";

  const QK = {
    tab: "tab",
    q: "q",
    kat: "kat",
    kec: "kec",
    ver: "ver",
    sent: "sent",
    sort: "sort",
    id: "id",
    matrix: "matrix",
  };

  const params = new URLSearchParams(location.search);
  const state = {
    tab: TABS.includes(params.get(QK.tab)) ? params.get(QK.tab) : "peta",
    q: params.get(QK.q) || "",
    kat: params.get(QK.kat) || "",
    kec: params.get(QK.kec) || "",
    ver: params.get(QK.ver) || "",
    sent: params.get(QK.sent) || "",
    sort: params.get(QK.sort) || "prioritas",
    id: params.get(QK.id) ? Number(params.get(QK.id)) : null,
    matrix: params.get(QK.matrix) === "1",
    kecQ: "",
  };

  const el = {
    stats: document.getElementById("stats"),
    toolbar: document.getElementById("toolbar"),
    matrix: document.getElementById("matrix"),
    hasil: document.getElementById("hasil-meta"),
    table: document.getElementById("table-wrap"),
    drawerRoot: document.getElementById("drawer-root"),
    drawer: document.getElementById("drawer"),
    theme: document.getElementById("theme-btn"),
    nav: document.getElementById("site-nav"),
    navToggle: document.getElementById("nav-toggle"),
    navScrim: document.getElementById("nav-scrim"),
    utilities: document.querySelector(".topbar .utilities"),
    mapSide: document.getElementById("map-side"),
    legend: document.getElementById("map-legend"),
    kecBody: document.getElementById("kec-body"),
    kecMeta: document.getElementById("kec-meta"),
    kecQ: document.getElementById("kec-q"),
    laporanDesk: document.getElementById("laporan-desk"),
    form: document.getElementById("form-lapor"),
    laporError: document.getElementById("lapor-error"),
    laporOk: document.getElementById("lapor-ok"),
    laporSubmit: document.getElementById("lapor-submit"),
    laporUraian: document.getElementById("lapor-uraian"),
    laporUrl: document.getElementById("lapor-url"),
    laporWebsite: document.getElementById("lapor-website"),
    laporKec: document.getElementById("lapor-kec"),
    laporKat: document.getElementById("lapor-kat"),
    laporKecErr: document.getElementById("lapor-kec-err"),
    laporKatErr: document.getElementById("lapor-kat-err"),
    laporUraianErr: document.getElementById("lapor-uraian-err"),
    laporUrlErr: document.getElementById("lapor-url-err"),
  };

  const kategori =
    Array.isArray(CONFIG.kategori) && CONFIG.kategori.length
      ? CONFIG.kategori
      : [...new Set(ISU.map((i) => i.kategori))].sort();
  let map = null;
  let geoLayer = null;
  let tileLayer = null;
  let geojson = null;
  let mapReady = false;
  let activeBasemap = "light";
  let laporKecamatan = "";
  let laporKategori = "";
  let laporAbort = null;
  let navHideTimer = 0;
  let drawerHideTimer = 0;

  const BASEMAPS = {
    light: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri · batas: BIG",
      maxZoom: 16,
      satellite: false,
    },
    streets: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; OpenStreetMap · batas: BIG",
      maxZoom: 18,
      satellite: false,
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri · batas: BIG",
      maxZoom: 19,
      satellite: true,
    },
  };

  function reduceMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function themeNow() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function setTheme(next) {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("bs-theme", next);
    } catch (e) {}
    el.theme.setAttribute("aria-label", next === "dark" ? "Ganti ke tema terang" : "Ganti ke tema gelap");
    if (mapReady) restyleMap();
  }

  function writeUrl() {
    const p = new URLSearchParams();
    if (state.tab !== "peta") p.set(QK.tab, state.tab);
    if (state.q) p.set(QK.q, state.q);
    if (state.kat) p.set(QK.kat, state.kat);
    if (state.kec) p.set(QK.kec, state.kec);
    if (state.ver) p.set(QK.ver, state.ver);
    if (state.sent) p.set(QK.sent, state.sent);
    if (state.sort !== "prioritas") p.set(QK.sort, state.sort);
    if (state.id) p.set(QK.id, String(state.id));
    if (state.matrix) p.set(QK.matrix, "1");
    const qs = p.toString();
    history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  }

  function isuDiKecamatan(item, nama) {
    return (item.kecamatan || []).includes(nama);
  }

  function isuBelumDipetakan(item) {
    return !item.kecamatan || item.kecamatan.length === 0;
  }

  function terbit(item) {
    return item.verifikasi_status === "terbit";
  }

  function tertunda(item) {
    return item.verifikasi_status === "belum" || item.verifikasi_status === "tautan_ok" || item.verifikasi_status === "sumber_kedua";
  }

  function countFor(nama) {
    return ISU.filter((i) => i.verifikasi_status !== "iklan_ditolak" && isuDiKecamatan(i, nama)).length;
  }

  function ringkasanKecamatan(nama) {
    const items = ISU.filter((i) => isuDiKecamatan(i, nama));
    return {
      nama,
      n: items.length,
      p1: items.filter((i) => i.tier === "P1").length,
      tuduhan: items.filter((i) => i.tipe === "Tuduhan").length,
      tertunda: items.filter(tertunda).length,
    };
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    let rows = ISU.filter((i) => {
      if (state.kat && i.kategori !== state.kat) return false;
      if (state.ver && i.verifikasi_status !== state.ver) return false;
      if (state.sent && i.sentimen !== state.sent) return false;
      if (state.kec === BELUM_DIPETAKAN && !isuBelumDipetakan(i)) return false;
      if (state.kec && state.kec !== BELUM_DIPETAKAN && !isuDiKecamatan(i, state.kec)) return false;
      if (!q) return true;
      const hay = [i.judul, i.aktor, i.status, i.sumber, i.catatan, (i.kecamatan || []).join(" ")]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    rows = [...rows].sort((a, b) => {
      if (state.sort === "tanggal") {
        const da = a.tanggal || "";
        const db = b.tanggal || "";
        return db.localeCompare(da) || b.prioritas - a.prioritas || a.id - b.id;
      }
      if (state.sort === "nilai") {
        return (b.nilai_rp || 0) - (a.nilai_rp || 0) || b.prioritas - a.prioritas;
      }
      return b.prioritas - a.prioritas || b.dampak - a.dampak || a.id - b.id;
    });
    return rows;
  }

  function uang(n) {
    if (n == null) return "—";
    return "Rp" + Number(n).toLocaleString("id-ID");
  }

  function tanggal(s) {
    if (!s) return "Tanpa tanggal";
    const [y, m, d] = s.split("-");
    const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return `${Number(d)} ${bulan[Number(m) - 1]} ${y}`;
  }

  function badgeVer(status) {
    const label = VERIF_LABEL[status] || status;
    if (status === "iklan_ditolak") return `<span class="badge badge-neg">${esc(label)}</span>`;
    if (status === "terbit") return `<span class="badge badge-pos">${esc(label)}</span>`;
    if (status === "belum") return `<span class="badge badge-warn">${esc(label)}</span>`;
    return `<span class="badge">${esc(label)}</span>`;
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cssVarColor(name) {
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;left:-9999px;top:0;width:1px;height:1px;pointer-events:none;background:var(" + name + ")";
    document.body.appendChild(probe);
    const raw = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return raw;
    ctx.fillStyle = "#000";
    ctx.fillStyle = raw;
    const parsed = ctx.fillStyle;
    if (parsed.startsWith("#") || parsed.startsWith("rgb")) return parsed;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = raw;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return "rgb(" + r + ", " + g + ", " + b + ")";
  }

  function fillColor(n) {
    if (!n) return cssVarColor("--map-0");
    if (n === 1) return cssVarColor("--map-1");
    if (n <= 3) return cssVarColor("--map-2");
    if (n <= 6) return cssVarColor("--map-3");
    return cssVarColor("--map-4");
  }

  function polyStyle(feature) {
    const nama = feature.properties.nama;
    const n = countFor(nama);
    const selected = state.kec === nama;
    const css = getComputedStyle(document.documentElement);
    const fg = css.getPropertyValue("--fg").trim();
    const bg = css.getPropertyValue("--bg").trim();
    const sat = BASEMAPS[activeBasemap]?.satellite;
    return {
      color: sat ? "#ffffff" : fg,
      weight: 1.15,
      opacity: selected ? 0.9 : sat ? 0.85 : 0.65,
      fillColor: selected ? bg : fillColor(n),
      fillOpacity: selected ? 0.35 : 0.82,
      lineJoin: "round",
      lineCap: "round",
    };
  }

  function restyleMap() {
    if (!geoLayer) return;
    geoLayer.setStyle((f) => polyStyle(f));
  }

  function syncBasemapUi() {
    document.querySelectorAll("[data-basemap]").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-basemap") === activeBasemap ? "true" : "false");
    });
  }

  function applyTilePaneMode() {
    if (!map) return;
    const pane = map.getPane("tilePane");
    if (!pane) return;
    pane.classList.toggle("is-satellite", !!BASEMAPS[activeBasemap]?.satellite);
  }

  function setBasemap(key) {
    const conf = BASEMAPS[key] || BASEMAPS.light;
    activeBasemap = BASEMAPS[key] ? key : "light";
    try {
      localStorage.setItem("bs-basemap", activeBasemap);
    } catch (e) {}
    if (!map) {
      syncBasemapUi();
      return;
    }
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(conf.url, {
      attribution: conf.attribution,
      maxZoom: conf.maxZoom,
    }).addTo(map);
    applyTilePaneMode();
    syncBasemapUi();
    restyleMap();
  }

  function renderLegend() {
    const sw = (v) => `<span><i style="background:${fillColor(v)}"></i>${v === 0 ? "0" : v === 1 ? "1" : v === 3 ? "2–3" : v === 6 ? "4–6" : "7+"} isu</span>`;
    el.legend.innerHTML = [sw(0), sw(1), sw(3), sw(6), sw(7)].join("");
  }

  function renderMapSide() {
    if (!state.kec || state.kec === BELUM_DIPETAKAN) {
      el.mapSide.innerHTML = `
        <h2>Pilih kecamatan</h2>
        <p>Klik wilayah di peta. Warna menunjukkan jumlah isu di kecamatan itu.</p>`;
      return;
    }
    const rows = ISU.filter((i) => isuDiKecamatan(i, state.kec));
    const list = rows
      .slice()
      .sort((a, b) => b.prioritas - a.prioritas)
      .slice(0, 12)
      .map(
        (i) => `<div class="issue-mini">
          <button type="button" data-open="${i.id}">${esc(i.judul)}</button>
          <small>${esc(i.tier)} · ${esc(i.kategori)} · ${VERIF_LABEL[i.verifikasi_status] || i.verifikasi_status}</small>
        </div>`
      )
      .join("");
    el.mapSide.innerHTML = `
      <h2>${esc(state.kec)}</h2>
      <p>${rows.length} isu di wilayah ini.</p>
      ${list || `<p class="muted">Belum ada isu.</p>`}
      <div class="map-side-actions">
        <button class="btn btn-primary" type="button" data-to-daftar="1">Lihat di Daftar</button>
        <button class="btn" type="button" data-clear-kec="1">Lepas saringan</button>
      </div>`;
  }

  async function initMap() {
    if (mapReady) {
      map.invalidateSize();
      restyleMap();
      renderMapSide();
      return;
    }
    if (typeof L === "undefined") {
      document.getElementById("map").innerHTML = `<p class="error" style="margin:1rem">Leaflet gagal dimuat.</p>`;
      return;
    }
    try {
      const res = await fetch("/data/geo/bojonegoro-kecamatan.geojson");
      if (!res.ok) throw new Error("GeoJSON tidak ditemukan");
      geojson = await res.json();
    } catch (err) {
      document.getElementById("map").innerHTML = `<p class="error" style="margin:1rem">Peta perlu dijalankan lewat server lokal (bukan file://). ${esc(err.message)}</p>`;
      return;
    }
    map = L.map("map", { scrollWheelZoom: true, attributionControl: true });
    try {
      const saved = localStorage.getItem("bs-basemap");
      if (saved && BASEMAPS[saved]) activeBasemap = saved;
    } catch (e) {}
    setBasemap(activeBasemap);
    geoLayer = L.geoJSON(geojson, {
      style: (f) => polyStyle(f),
      onEachFeature(feature, layer) {
        const nama = feature.properties.nama;
        layer.bindTooltip(nama);
        layer.on("click", () => {
          state.kec = nama;
          writeUrl();
          restyleMap();
          renderMapSide();
          renderToolbar();
          const path = layer.getElement();
          if (path && typeof path.blur === "function") path.blur();
        });
        layer.on("keydown", (ev) => {
          if (ev.originalEvent.key === "Enter" || ev.originalEvent.key === " ") {
            state.kec = nama;
            writeUrl();
            restyleMap();
            renderMapSide();
          }
        });
      },
    }).addTo(map);
    map.fitBounds(geoLayer.getBounds(), { padding: [12, 12] });
    mapReady = true;
    renderLegend();
    renderMapSide();
    requestAnimationFrame(() => map.invalidateSize());
  }

  function customSelect(id, label, value, options, onChange) {
    const selected = options.find((o) => o.value === value) || options[0];
    return `<div class="field select-field">
      <span>${esc(label)}</span>
      <div class="select" data-select="${esc(id)}">
        <button type="button" class="select-btn" aria-haspopup="listbox" aria-expanded="false"><span class="select-btn-label">${esc(selected.label)}</span></button>
        <div class="select-list" role="listbox" hidden>
          ${options
            .map(
              (o) =>
                `<button type="button" role="option" aria-selected="${o.value === value}" data-value="${esc(o.value)}">${esc(o.label)}</button>`
            )
            .join("")}
        </div>
      </div>
    </div>`;
  }

  function placeSelectList(btn, list) {
    const gap = 8;
    list.style.top = `${Math.round(btn.offsetHeight) + gap}px`;
  }

  function bindSelects(root, handlers) {
    root.querySelectorAll("[data-select]").forEach((box) => {
      const key = box.getAttribute("data-select");
      const btn = box.querySelector(".select-btn");
      const list = box.querySelector(".select-list");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = list.hidden;
        document.querySelectorAll(".select-list").forEach((n) => {
          n.hidden = true;
          n.previousElementSibling?.setAttribute("aria-expanded", "false");
        });
        list.hidden = !open;
        btn.setAttribute("aria-expanded", String(open));
        if (open) placeSelectList(btn, list);
      });
      list.querySelectorAll("button").forEach((opt) => {
        opt.addEventListener("click", (e) => {
          e.stopPropagation();
          handlers[key](opt.getAttribute("data-value"));
          list.hidden = true;
          btn.setAttribute("aria-expanded", "false");
        });
      });
    });
  }

  document.addEventListener("click", () => closeSelectLists());

  function renderBrand() {
    const name = META.judul || "Atlas Bojonegoro";
    const h1 = document.querySelector(".brand h1");
    if (h1) h1.textContent = name;
  }

  const SITE_ORIGIN = "https://atlas.nusaiba.dev";
  const TAB_SEO = {
    peta: {
      title: "Atlas Bojonegoro — Peta isu publik",
      description:
        "Peta 28 kecamatan Kabupaten Bojonegoro: warna mengikuti jumlah isu terpetakan, ringkasan inventaris, dan tautan ke daftar tersaring.",
      path: "/",
    },
    daftar: {
      title: "Atlas Bojonegoro — Daftar isu",
      description:
        "Inventaris isu urusan publik Bojonegoro: saring kategori, kecamatan, verifikasi, sentimen, dan buka detail entri.",
      path: "/?tab=daftar",
    },
    kecamatan: {
      title: "Atlas Bojonegoro — Ringkasan kecamatan",
      description:
        "Hitungan isu per 28 kecamatan Kabupaten Bojonegoro. Klik baris untuk membuka daftar tersaring ke wilayah itu.",
      path: "/?tab=kecamatan",
    },
    docs: {
      title: "Atlas Bojonegoro — Panduan membaca atlas",
      description:
        "Penjelasan prioritas P1–P5, tipe Tuduhan/Fakta, sentimen, verifikasi, warna peta, dan cara lapor warga.",
      path: "/?tab=docs",
    },
    lapor: {
      title: "Atlas Bojonegoro — Lapor isu",
      description:
        "Kirim laporan warga ke antrian redaksi Atlas Bojonegoro. Bukan kanal darurat atau polisi; jangan tulis data pribadi.",
      path: "/?tab=lapor",
    },
  };

  function setMetaContent(selector, content) {
    const node = document.querySelector(selector);
    if (node) node.setAttribute("content", content);
  }

  function syncDocumentSeo(tab) {
    const site = META.judul || "Atlas Bojonegoro";
    const seo = TAB_SEO[tab] || TAB_SEO.peta;
    const title = seo.title.replace(/^Atlas Bojonegoro/, site);
    const url = SITE_ORIGIN + seo.path;
    document.title = title;
    setMetaContent('meta[name="description"]', seo.description);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', seo.description);
    setMetaContent('meta[property="og:url"]', url);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', seo.description);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", url);
  }

  function renderStats() {
    const terbitN = ISU.filter(terbit).length;
    const pendingN = ISU.filter(tertunda).length;
    const p1 = ISU.filter((i) => i.tier === "P1").length;
    const tuduhan = ISU.filter((i) => i.tipe === "Tuduhan").length;
    const dipetakan = ISU.filter((i) => !isuBelumDipetakan(i)).length;
    const laporBaru = LAPORAN.filter((l) => l.status === "baru").length;
    const items = [
      [ISU.length, "Isu"],
      [terbitN, "Terbit"],
      [pendingN, "Verifikasi tertunda"],
      [p1, "P1"],
      [tuduhan, "Tuduhan"],
      [dipetakan, "Sudah dipetakan"],
      [KECAMATAN.length, "Kecamatan"],
      [laporBaru, "Laporan baru"],
    ];
    el.stats.innerHTML = items.map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
    requestAnimationFrame(syncStatsAsideHeight);
  }

  function renderToolbar() {
    const kecOpts = [
      { value: "", label: "Semua wilayah" },
      { value: BELUM_DIPETAKAN, label: "Belum dipetakan" },
      ...KECAMATAN.map((k) => ({ value: k, label: k })),
    ];
    const verOpts = [
      { value: "", label: "Semua status" },
      ...Object.entries(VERIF_LABEL).map(([value, label]) => ({ value, label })),
    ];
    el.toolbar.innerHTML = `
      <label class="field search"><span>Cari</span><input id="q" type="search" value="${esc(state.q)}" placeholder="Judul, aktor, sumber"></label>
      ${customSelect("kat", "Kategori", state.kat, [{ value: "", label: "Semua" }, ...kategori.map((k) => ({ value: k, label: k }))])}
      ${customSelect("kec", "Kecamatan", state.kec, kecOpts)}
      ${customSelect("ver", "Verifikasi", state.ver, verOpts)}
      ${customSelect("sent", "Sentimen", state.sent, [
        { value: "", label: "Semua" },
        { value: "Negatif", label: "Negatif" },
        { value: "Positif", label: "Positif" },
        { value: "Netral", label: "Netral" },
        { value: "Kontroversi", label: "Kontroversi" },
      ])}
      ${customSelect("sort", "Urutan", state.sort, [
        { value: "prioritas", label: "Prioritas" },
        { value: "tanggal", label: "Tanggal" },
        { value: "nilai", label: "Nilai" },
      ])}
      <div class="actions">
        <button class="btn" type="button" id="toggle-matrix">${state.matrix ? "Sembunyikan matriks" : "Matriks prioritas"}</button>
        <button class="btn btn-primary" type="button" id="reset">Reset</button>
      </div>`;
    bindSelects(el.toolbar, {
      kat: (v) => {
        state.kat = v;
        refreshDaftar(true);
      },
      kec: (v) => {
        state.kec = v;
        refreshDaftar(true);
        if (mapReady) {
          restyleMap();
          renderMapSide();
        }
      },
      ver: (v) => {
        state.ver = v;
        refreshDaftar(true);
      },
      sent: (v) => {
        state.sent = v;
        refreshDaftar(true);
      },
      sort: (v) => {
        state.sort = v;
        refreshDaftar(true);
      },
    });
    const q = document.getElementById("q");
    let t;
    q.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        state.q = q.value;
        refreshDaftar(false);
      }, 120);
    });
    document.getElementById("toggle-matrix").addEventListener("click", () => {
      state.matrix = !state.matrix;
      refreshDaftar(true);
    });
    document.getElementById("reset").addEventListener("click", () => {
      state.q = "";
      state.kat = "";
      state.kec = "";
      state.ver = "";
      state.sent = "";
      state.sort = "prioritas";
      state.matrix = false;
      refreshDaftar(true);
      if (mapReady) {
        restyleMap();
        renderMapSide();
      }
    });
  }

  function renderLaporanDesk() {
    const baru = LAPORAN.filter((l) => l.status === "baru");
    if (!LAPORAN.length) {
      el.laporanDesk.innerHTML = "";
      return;
    }
    const rows = LAPORAN.map(
      (l) => `<tr>
        <td>${esc(l.kecamatan || "—")}</td>
        <td>${esc(l.uraian || "").slice(0, 140)}</td>
        <td>${esc(l.status || "baru")}</td>
        <td class="muted">${esc(l.waktu || "—")}</td>
      </tr>`
    ).join("");
    el.laporanDesk.innerHTML = `
      <h2 style="font-size:1rem;margin:1rem 0 0.4rem">Laporan warga (${baru.length} baru)</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Kecamatan</th><th>Uraian</th><th>Status</th><th>Waktu</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function heatBg(n) {
    const t = Math.max(0, Math.min(1, (n - 1) / 4));
    return `color-mix(in srgb, var(--neg) ${Math.round(10 + t * 52)}%, var(--bg))`;
  }

  function renderMatrix(rows) {
    if (!state.matrix) {
      el.matrix.hidden = true;
      el.matrix.innerHTML = "";
      return;
    }
    el.matrix.hidden = false;
    const head = `<div class="h">Tier</div><div class="h">Skor</div><div class="h">Dampak</div><div class="h">Urgensi</div><div class="h">Tipe</div><div class="h">Judul</div>`;
    const body = rows
      .slice(0, 24)
      .map(
        (i) => `<div class="cell-p">${esc(i.tier)}</div>
        <div class="cell-p">${i.prioritas}</div>
        <div style="background:${heatBg(i.dampak)}">${i.dampak}</div>
        <div style="background:${heatBg(i.urgensi)}">${i.urgensi}</div>
        <div>${esc(i.tipe)}</div>
        <div>${esc(i.judul)}</div>`
      )
      .join("");
    el.matrix.innerHTML = `<div class="heat">${head}${body}</div>`;
  }

  function renderTable(rows) {
    if (!rows.length) {
      el.table.classList.remove("is-empty");
      el.table.classList.add("table-cards");
      el.table.innerHTML = `<table>
      <thead><tr><th>Prioritas</th><th>Isu</th><th>Kategori</th><th>Tipe</th><th>Verifikasi</th><th>Tanggal</th></tr></thead>
      <tbody><tr class="empty-row"><td colspan="6">Tidak ada isu untuk saringan ini. Longgarkan filter atau pilih kecamatan lain.</td></tr></tbody>
    </table>`;
      el.hasil.textContent = "0 isu";
      return;
    }
    el.table.classList.remove("is-empty");
    el.hasil.textContent = `${rows.length} isu`;
    const body = rows
      .map(
        (i) => `        <tr tabindex="0" data-id="${i.id}">
        <td class="num" data-th="Prioritas">${esc(i.tier)}/${i.prioritas}</td>
        <td data-th="Isu"><div class="judul">${esc(i.judul)}</div><div class="muted">${esc((i.kecamatan || []).join(", ") || "Belum dipetakan")}</div></td>
        <td data-th="Kategori">${esc(i.kategori)}</td>
        <td data-th="Tipe">${esc(i.tipe)}</td>
        <td data-th="Verifikasi">${badgeVer(i.verifikasi_status)}</td>
        <td class="muted" data-th="Tanggal">${esc(tanggal(i.tanggal))}</td>
      </tr>`
      )
      .join("");
    el.table.innerHTML = `<table>
      <thead><tr><th>Prioritas</th><th>Isu</th><th>Kategori</th><th>Tipe</th><th>Verifikasi</th><th>Tanggal</th></tr></thead>
      <tbody>${body}</tbody>
    </table>`;
    el.table.classList.add("table-cards");
    el.table.querySelectorAll("tr[data-id]").forEach((tr) => {
      const open = () => openDrawer(Number(tr.getAttribute("data-id")));
      tr.addEventListener("click", open);
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });
  }

  function openDrawer(id) {
    const i = ISU.find((x) => x.id === id);
    if (!i) return;
    state.id = id;
    writeUrl();
    window.clearTimeout(drawerHideTimer);
    el.drawerRoot.hidden = false;
    el.drawerRoot.classList.remove("is-open");
    el.drawer.innerHTML = `
      <header>
        <h2 id="drawer-title">${esc(i.judul)}</h2>
        <button class="close" type="button" aria-label="Tutup"><span aria-hidden="true">×</span></button>
      </header>
      <dl>
        <dt>Prioritas</dt><dd>${esc(i.tier)} · skor ${i.prioritas} (dampak ${i.dampak} × urgensi ${i.urgensi})</dd>
        <dt>Verifikasi</dt><dd>${badgeVer(i.verifikasi_status)} · sumber ${esc(SUMBER_LABEL[i.sumber_jenis] || i.sumber_jenis)}</dd>
        <dt>Wilayah</dt><dd>${esc((i.kecamatan || []).join(", ") || "Belum dipetakan")}</dd>
        <dt>Kategori / tipe</dt><dd>${esc(i.kategori)} · ${esc(i.tipe)} · ${esc(i.sentimen)}</dd>
        <dt>Status</dt><dd>${esc(i.status)} (${esc(i.status_enum)})</dd>
        <dt>Aktor</dt><dd>${esc(i.aktor)}</dd>
        <dt>Nilai</dt><dd>${uang(i.nilai_rp)}${i.jenis_nilai ? " · " + esc(i.jenis_nilai) : ""}</dd>
        <dt>Tanggal</dt><dd>${esc(tanggal(i.tanggal))}${i.tanggal_jenis ? " · " + esc(i.tanggal_jenis) : ""}</dd>
        <dt>Sumber</dt><dd>${i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.sumber)}</a>` : esc(i.sumber)}</dd>
        <dt>Catatan</dt><dd>${esc(i.catatan || "—")}</dd>
      </dl>`;
    el.drawer.querySelector(".close").addEventListener("click", closeDrawer);
    el.drawer.querySelector(".close").focus();
    void el.drawerRoot.offsetWidth;
    el.drawerRoot.classList.add("is-open");
  }

  function closeDrawer() {
    state.id = null;
    writeUrl();
    const finish = () => {
      el.drawer.innerHTML = "";
      el.drawerRoot.classList.remove("is-open");
      el.drawerRoot.hidden = true;
    };
    if (reduceMotion() || el.drawerRoot.hidden) {
      finish();
      return;
    }
    el.drawerRoot.classList.remove("is-open");
    window.clearTimeout(drawerHideTimer);
    drawerHideTimer = window.setTimeout(finish, 320);
  }

  el.drawerRoot.addEventListener("click", (e) => {
    if (e.target === el.drawerRoot) closeDrawer();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (navIsOpen()) {
      closeNav();
      return;
    }
    if (!el.drawerRoot.hidden) closeDrawer();
  });

  function refreshDaftar(rebuildToolbar) {
    writeUrl();
    if (rebuildToolbar) renderToolbar();
    else {
      const matrixBtn = document.getElementById("toggle-matrix");
      if (matrixBtn) matrixBtn.textContent = state.matrix ? "Sembunyikan matriks" : "Matriks prioritas";
    }
    const rows = filtered();
    renderLaporanDesk();
    renderMatrix(rows);
    renderTable(rows);
  }

  function renderKecamatanTable() {
    const wrap = document.querySelector("#view-kecamatan .table-kec");
    const q = state.kecQ.trim().toLowerCase();
    const rows = KECAMATAN.map(ringkasanKecamatan).filter((r) =>
      !q ? true : r.nama.toLowerCase().includes(q)
    );
    if (el.kecMeta) {
      el.kecMeta.textContent = q
        ? `${rows.length} dari ${KECAMATAN.length} kecamatan`
        : `${KECAMATAN.length} kecamatan`;
    }
    if (!wrap) return;
    wrap.classList.remove("is-empty");
    if (!document.getElementById("kec-body")) {
      wrap.innerHTML = `<table>
              <thead>
                <tr>
                  <th>Kecamatan</th>
                  <th>Isu</th>
                  <th>P1</th>
                  <th>Tuduhan</th>
                  <th>Verifikasi tertunda</th>
                </tr>
              </thead>
              <tbody id="kec-body"></tbody>
            </table>`;
    }
    el.kecBody = document.getElementById("kec-body");
    if (!rows.length) {
      el.kecBody.innerHTML = `<tr class="empty-row"><td colspan="5">Tidak ada kecamatan yang cocok. Coba nama lain.</td></tr>`;
      return;
    }
    el.kecBody.innerHTML = rows
      .map(
        (r) => `<tr tabindex="0" data-kec="${esc(r.nama)}">
        <td class="judul">${esc(r.nama)}</td>
        <td class="num" data-th="Isu">${r.n}</td>
        <td class="num" data-th="P1">${r.p1}</td>
        <td class="num" data-th="Tuduhan">${r.tuduhan}</td>
        <td class="num" data-th="Verifikasi tertunda">${r.tertunda}</td>
      </tr>`
      )
      .join("");
    el.kecBody.querySelectorAll("tr[data-kec]").forEach((tr) => {
      const go = () => {
        state.kec = tr.getAttribute("data-kec");
        setTab("daftar");
      };
      tr.addEventListener("click", go);
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
    });
  }

  function bindKecamatanSearch() {
    if (!el.kecQ) return;
    let t;
    el.kecQ.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        state.kecQ = el.kecQ.value;
        renderKecamatanTable();
      }, 120);
    });
  }

  function closeSelectLists() {
    document.querySelectorAll(".select-list").forEach((n) => {
      n.hidden = true;
      const btn = n.previousElementSibling;
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function bindLaporSelect(host, labelledBy, placeholder, options, getValue, setValue) {
    const value = getValue();
    const opts = [{ value: "", label: placeholder }, ...options];
    const current = opts.find((o) => o.value === value) || opts[0];
    const valueId = `${host.id}-value`;
    const errId = `${host.id}-err`;
    host.innerHTML = `<button type="button" class="select-btn" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${esc(
      labelledBy
    )} ${esc(valueId)}" aria-describedby="${esc(errId)}"><span class="select-btn-label" id="${esc(valueId)}">${esc(current.label)}</span></button>
      <div class="select-list" role="listbox" hidden>
        ${opts
          .map(
            (o) =>
              `<button type="button" role="option" data-value="${esc(o.value)}" aria-selected="${o.value === value}">${esc(o.label)}</button>`
          )
          .join("")}
      </div>`;
    const btn = host.querySelector(".select-btn");
    const list = host.querySelector(".select-list");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = list.hidden;
      closeSelectLists();
      list.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (open) placeSelectList(btn, list);
    });
    list.querySelectorAll("button").forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        setValue(opt.getAttribute("data-value") || "");
        bindLaporSelect(host, labelledBy, placeholder, options, getValue, setValue);
      });
    });
  }

  function renderLaporSelects() {
    bindLaporSelect(
      el.laporKec,
      "lapor-kec-label",
      "Pilih kecamatan",
      KECAMATAN.map((k) => ({ value: k, label: k })),
      () => laporKecamatan,
      (v) => {
        laporKecamatan = v;
      }
    );
    bindLaporSelect(
      el.laporKat,
      "lapor-kat-label",
      "Pilih kategori",
      kategori.map((k) => ({ value: k, label: k })),
      () => laporKategori,
      (v) => {
        laporKategori = v;
      }
    );
  }

  function setFieldError(errEl, control, message) {
    if (!errEl) return;
    if (message) {
      errEl.hidden = false;
      errEl.textContent = message;
      if (control) control.setAttribute("aria-invalid", "true");
    } else {
      errEl.hidden = true;
      errEl.textContent = "";
      if (control) control.removeAttribute("aria-invalid");
    }
  }

  function laporSelectBtn(host) {
    return host ? host.querySelector(".select-btn") : null;
  }

  function clearLaporMessages() {
    el.laporError.hidden = true;
    el.laporError.textContent = "";
    el.laporOk.hidden = true;
    el.laporOk.replaceChildren();
    setFieldError(el.laporKecErr, laporSelectBtn(el.laporKec), "");
    setFieldError(el.laporKatErr, laporSelectBtn(el.laporKat), "");
    setFieldError(el.laporUraianErr, el.laporUraian, "");
    setFieldError(el.laporUrlErr, el.laporUrl, "");
  }

  function laporanPayload() {
    return {
      kecamatan: laporKecamatan,
      kategori: laporKategori,
      uraian: el.laporUraian.value.trim(),
      url_bukti: el.laporUrl.value.trim() || null,
      website: el.laporWebsite ? el.laporWebsite.value.trim() : "",
    };
  }

  function validHttpUrl(value) {
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  function validateLaporan(payload) {
    const errors = [];
    if (!payload.kecamatan) {
      errors.push({ field: "kecamatan", message: "Kecamatan wajib dipilih." });
    }
    if (!payload.kategori) {
      errors.push({ field: "kategori", message: "Kategori wajib dipilih." });
    }
    if (payload.uraian.length < 20) {
      errors.push({ field: "uraian", message: "Uraian minimal 20 karakter." });
    }
    if (payload.url_bukti && !validHttpUrl(payload.url_bukti)) {
      errors.push({ field: "url", message: "Tautan bukti harus URL http(s) yang valid." });
    }
    return errors;
  }

  function showLaporFieldErrors(errors) {
    for (const err of errors) {
      if (err.field === "kecamatan") setFieldError(el.laporKecErr, laporSelectBtn(el.laporKec), err.message);
      if (err.field === "kategori") setFieldError(el.laporKatErr, laporSelectBtn(el.laporKat), err.message);
      if (err.field === "uraian") setFieldError(el.laporUraianErr, el.laporUraian, err.message);
      if (err.field === "url") setFieldError(el.laporUrlErr, el.laporUrl, err.message);
    }
    const first = errors[0];
    if (!first) return;
    if (first.field === "kecamatan") laporSelectBtn(el.laporKec)?.focus();
    else if (first.field === "kategori") laporSelectBtn(el.laporKat)?.focus();
    else if (first.field === "uraian") el.laporUraian.focus();
    else if (first.field === "url") el.laporUrl.focus();
  }

  function setLaporPending(pending) {
    const btn = el.laporSubmit;
    if (!btn) return;
    btn.disabled = pending;
    btn.setAttribute("aria-busy", pending ? "true" : "false");
    btn.textContent = pending ? "Mengirim…" : "Kirim laporan";
  }

  function showLaporOk(issueUrl) {
    el.laporOk.hidden = false;
    el.laporOk.replaceChildren();
    el.laporOk.append("Laporan terkirim. Redaksi akan memeriksanya.");
    if (issueUrl) {
      el.laporOk.append(" ");
      const a = document.createElement("a");
      a.href = issueUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Lihat antrian";
      el.laporOk.append(a);
      el.laporOk.append(".");
    }
  }

  function laporFailCopy(status, serverError) {
    if (serverError && (status === 400 || status === 401 || status === 403 || status === 502 || status === 503)) {
      return serverError;
    }
    if (status === 404) return "Layanan kirim belum terpasang di alamat ini.";
    if (status === 429) return "Terlalu banyak kiriman. Coba lagi nanti. Isian Anda masih ada.";
    if (status === 503) return "Layanan kirim belum disetel di Worker.";
    if (status >= 500) return "Laporan belum masuk antrian. Kirim ulang beberapa saat lagi. Isian Anda masih ada.";
    return "Tidak bisa mengirim. Coba lagi. Isian Anda masih ada.";
  }

  async function kirimLaporan(payload) {
    const endpoint = CONFIG.laporEndpoint;
    if (!endpoint) {
      return { ok: false, message: "Layanan kirim belum disetel." };
    }
    if (laporAbort) laporAbort.abort();
    laporAbort = new AbortController();
    let res;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: laporAbort.signal,
      });
    } catch (err) {
      if (err && err.name === "AbortError") return { ok: false, aborted: true };
      return { ok: false, message: "Tidak terhubung. Periksa jaringan, lalu kirim ulang. Isian Anda masih ada." };
    }
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (res.ok && data && data.ok) {
      return { ok: true, issueUrl: data.issueUrl || "" };
    }
    const serverError = data && typeof data.error === "string" ? data.error : "";
    return { ok: false, message: laporFailCopy(res.status, serverError) };
  }

  function resetLaporForm() {
    laporKecamatan = "";
    laporKategori = "";
    el.laporUraian.value = "";
    el.laporUrl.value = "";
    if (el.laporWebsite) el.laporWebsite.value = "";
    renderLaporSelects();
  }

  el.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (el.laporSubmit && el.laporSubmit.disabled) return;
    clearLaporMessages();
    const payload = laporanPayload();
    const errors = validateLaporan(payload);
    if (errors.length) {
      showLaporFieldErrors(errors);
      return;
    }
    setLaporPending(true);
    const result = await kirimLaporan(payload);
    setLaporPending(false);
    if (result.aborted) return;
    if (!result.ok) {
      el.laporError.hidden = false;
      el.laporError.textContent = result.message;
      el.laporSubmit?.focus();
      return;
    }
    resetLaporForm();
    showLaporOk(result.issueUrl);
  });

  function navIsOpen() {
    return el.nav.classList.contains("is-open");
  }

  const navSlot = document.getElementById("nav-slot");
  const mobileNav = window.matchMedia("(max-width: 767px)");

  function syncNavTop() {
    const header = document.querySelector(".topbar");
    if (!header) return;
    const top = Math.round(header.getBoundingClientRect().bottom);
    document.documentElement.style.setProperty("--mobile-nav-top", `${Math.max(top, 0)}px`);
  }

  function parkNav() {
    if (navSlot && el.nav.parentElement !== navSlot) navSlot.appendChild(el.nav);
    document.documentElement.style.removeProperty("--mobile-nav-top");
  }

  function placeNav() {
    if (mobileNav.matches) {
      if (el.nav.parentElement !== document.body) document.body.appendChild(el.nav);
      syncNavTop();
      return;
    }
    parkNav();
  }

  function syncStatsAsideHeight() {
    const stats = el.stats;
    const card = document.querySelector('.aside-panel[data-aside="peta"] .map-side-card');
    if (!stats || !card || stats.hidden) {
      document.documentElement.style.removeProperty("--stats-h");
      return;
    }
    requestAnimationFrame(() => {
      const h = Math.round(stats.getBoundingClientRect().height);
      if (h > 0) document.documentElement.style.setProperty("--stats-h", `${h}px`);
    });
  }

  function syncAside(tab) {
    document.querySelectorAll(".aside-panel").forEach((panel) => {
      const on = panel.getAttribute("data-aside") === tab;
      panel.hidden = !on;
    });
    const railLeft = document.getElementById("rail-left");
    if (railLeft) {
      const showLeft = tab === "docs" || tab === "lapor";
      railLeft.hidden = !showLeft;
      document.querySelector(".app-frame")?.classList.toggle("has-rail-left", showLeft);
    }
    document.querySelector(".app-frame")?.classList.toggle("docs-shell", tab === "docs");
    const railAside = document.getElementById("rail-aside");
    if (railAside) {
      const showAside = tab === "peta" || tab === "docs" || tab === "lapor";
      railAside.hidden = !showAside;
      document.querySelector(".app-frame")?.classList.toggle("has-rail-aside", showAside);
      document.querySelector(".app-frame")?.classList.toggle("aside-first", tab === "lapor");
      if (showAside && tab === "peta") syncStatsAsideHeight();
    }
    const laporCta = document.querySelector(".utilities .tab-cta[data-go-tab='lapor']");
    if (laporCta) laporCta.setAttribute("aria-current", tab === "lapor" ? "page" : "false");
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest(".rail-link[href^='?tab=']");
    if (!link) return;
    e.preventDefault();
    const url = new URL(link.href, location.href);
    const tab = url.searchParams.get("tab");
    if (tab) setTab(tab);
    const hash = url.hash;
    if (hash) {
      requestAnimationFrame(() => {
        const target = document.querySelector(hash);
        if (target) target.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
      });
    }
  });

  function navFocusables() {
    return [el.navToggle, ...el.nav.querySelectorAll("[role=tab]")];
  }

  function openNav() {
    window.clearTimeout(navHideTimer);
    placeNav();
    el.navScrim.hidden = false;
    el.nav.classList.remove("is-open");
    el.navScrim.classList.remove("is-open");
    el.navToggle.setAttribute("aria-expanded", "true");
    el.navToggle.setAttribute("aria-label", "Tutup menu");
    document.body.classList.add("nav-open");
    void el.nav.offsetWidth;
    el.nav.classList.add("is-open");
    el.navScrim.classList.add("is-open");
    requestAnimationFrame(syncNavTop);
    const current = el.nav.querySelector('[aria-selected="true"]');
    (current || el.nav.querySelector("[role=tab]")).focus();
  }

  function closeNav() {
    el.nav.classList.remove("is-open");
    el.navScrim.classList.remove("is-open");
    el.navToggle.setAttribute("aria-expanded", "false");
    el.navToggle.setAttribute("aria-label", "Buka menu");
    document.body.classList.remove("nav-open");
    window.clearTimeout(navHideTimer);
    const instant = reduceMotion() || !mobileNav.matches;
    if (instant) {
      el.navScrim.hidden = true;
      if (!mobileNav.matches) parkNav();
      return;
    }
    navHideTimer = window.setTimeout(() => {
      if (!navIsOpen()) {
        el.navScrim.hidden = true;
        if (!mobileNav.matches) parkNav();
      }
    }, 320);
  }

  function setTab(tab) {
    const next = TABS.includes(tab) ? tab : "peta";
    const changed = next !== state.tab;
    state.tab = next;
    writeUrl();
    TABS.forEach((t) => {
      const panel = document.getElementById("view-" + t);
      const btn = document.getElementById("tab-" + t);
      const on = t === state.tab;
      panel.hidden = !on;
      panel.classList.remove("is-enter");
      if (on) {
        panel.removeAttribute("inert");
        if (changed && !reduceMotion()) {
          void panel.offsetWidth;
          panel.classList.add("is-enter");
        }
      } else {
        panel.setAttribute("inert", "");
      }
      btn.setAttribute("aria-selected", String(on));
      btn.tabIndex = on ? 0 : -1;
    });
    closeNav();
    syncAside(state.tab);
    syncDocumentSeo(state.tab);
    const hideOverview = state.tab !== "peta";
    el.stats.hidden = hideOverview;
    if (changed) {
      window.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" });
    }
    if (state.tab === "peta") {
      initMap();
      if (changed && mapReady) {
        window.setTimeout(() => {
          if (map) map.invalidateSize();
        }, reduceMotion() ? 0 : 300);
      }
    }
    if (state.tab === "daftar") refreshDaftar(true);
  }

  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go-tab]");
    if (!go) return;
    e.preventDefault();
    setTab(go.getAttribute("data-go-tab"));
  });

  document.querySelectorAll(".view").forEach((panel) => {
    panel.addEventListener("animationend", (e) => {
      if (e.animationName === "fade-up") panel.classList.remove("is-enter");
    });
  });

  document.querySelectorAll("[role=tab]").forEach((btn, idx, all) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
    btn.addEventListener("keydown", (e) => {
      const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      const next = (idx + dir + all.length) % all.length;
      all[next].focus();
      setTab(all[next].dataset.tab);
    });
  });

  el.navToggle.addEventListener("click", () => {
    if (navIsOpen()) closeNav();
    else openNav();
  });
  el.navScrim.addEventListener("click", closeNav);
  placeNav();
  if (typeof mobileNav.addEventListener === "function") {
    mobileNav.addEventListener("change", () => {
      if (!mobileNav.matches) closeNav();
      else placeNav();
    });
  }
  window.addEventListener("resize", () => {
    syncStatsAsideHeight();
    if (!mobileNav.matches) {
      if (navIsOpen()) closeNav();
      else parkNav();
      return;
    }
    placeNav();
    if (navIsOpen()) syncNavTop();
  }, { passive: true });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || !navIsOpen() || window.matchMedia("(min-width: 768px)").matches) return;
    const nodes = navFocusables();
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  el.mapSide.addEventListener("click", (e) => {
    const open = e.target.closest("[data-open]");
    if (open) {
      openDrawer(Number(open.getAttribute("data-open")));
      return;
    }
    if (e.target.closest("[data-to-daftar]")) {
      setTab("daftar");
      return;
    }
    if (e.target.closest("[data-clear-kec]")) {
      state.kec = "";
      writeUrl();
      restyleMap();
      renderMapSide();
      renderToolbar();
      return;
    }
    const pick = e.target.closest("[data-pick-kec]");
    if (pick) {
      state.kec = pick.getAttribute("data-pick-kec");
      writeUrl();
      restyleMap();
      renderMapSide();
      renderToolbar();
    }
  });

  document.getElementById("map-basemap")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-basemap]");
    if (!btn) return;
    setBasemap(btn.getAttribute("data-basemap"));
  });
  try {
    const saved = localStorage.getItem("bs-basemap");
    if (saved && BASEMAPS[saved]) activeBasemap = saved;
  } catch (e) {}
  syncBasemapUi();

  el.theme.addEventListener("click", () => setTheme(themeNow() === "dark" ? "light" : "dark"));

  setTheme(themeNow());
  renderBrand();
  renderStats();
  renderToolbar();

  (function loadGithubStars() {
    const buttons = document.querySelectorAll("[data-gh-btn]");
    if (!buttons.length) return;
    const repo = (DATA && DATA.config && DATA.config.githubRepo) || "sukirman1901/atlas-bojonegoro";
    const href = `https://github.com/${repo}`;
    buttons.forEach((btn) => { btn.href = href; });
    fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const n = Number(data.stargazers_count);
        if (!Number.isFinite(n)) return;
        buttons.forEach((btn) => {
          const countEl = btn.querySelector(".gh-btn-count");
          if (countEl) countEl.textContent = String(n);
        });
      })
      .catch(() => {});
  })();
  renderKecamatanTable();
  bindKecamatanSearch();
  renderLaporSelects();
  setTab(state.tab);
  if (state.id) openDrawer(state.id);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
})();
