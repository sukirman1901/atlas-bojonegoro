/**
 * Cloudflare Worker: POST laporan warga → GitHub Issue.
 * Secret: GITHUB_TOKEN (issues:write di repo GITHUB_REPO).
 * Vars: GITHUB_REPO, ALLOWED_ORIGINS (daftar Origin, koma).
 */

const KECAMATAN = [
  "Balen",
  "Baureno",
  "Bojonegoro",
  "Bubulan",
  "Dander",
  "Gayam",
  "Gondang",
  "Kalitidu",
  "Kanor",
  "Kapas",
  "Kasiman",
  "Kedewan",
  "Kedungadem",
  "Kepohbaru",
  "Malo",
  "Margomulyo",
  "Ngambon",
  "Ngasem",
  "Ngraho",
  "Padangan",
  "Purwosari",
  "Sekar",
  "Sugihwaras",
  "Sukosewu",
  "Sumberrejo",
  "Tambakrejo",
  "Temayang",
  "Trucuk",
];

const KATEGORI = [
  "Hukum & Korupsi",
  "Pemerintahan",
  "Infrastruktur & Energi",
  "Sosial & Kesehatan",
  "Ekonomi & Pangan",
  "Bencana & Lingkungan",
  "Kamtibmas & Laka",
  "Agenda & Prestasi",
];

const KEC_SET = new Set(KECAMATAN);
const KAT_SET = new Set(KATEGORI);
const MAX_BODY = 16 * 1024;
const URAIAN_MIN = 20;
const URAIAN_MAX = 4000;
const RATE_MAX = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map();

function json(body, status, extra) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(extra || {}),
    },
  });
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const headers = {
    vary: "Origin",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
  };
  if (!origin) return headers;
  let requestHost = "";
  try {
    requestHost = new URL(request.url).host;
  } catch {
    requestHost = "";
  }
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    return headers;
  }
  const allow =
    originHost === requestHost || allowedOrigins(env).includes(origin);
  if (allow) headers["access-control-allow-origin"] = origin;
  return headers;
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  const extra = corsHeaders(request, env);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

function rateLimited(ip) {
  const now = Date.now();
  const row = hits.get(ip);
  if (!row || now >= row.reset) {
    hits.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  if (row.count >= RATE_MAX) return true;
  row.count += 1;
  return false;
}

function looksLikePath(path) {
  return path === "/" || path === "/api/lapor";
}

function validHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function readPayload(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "Isian tidak terbaca." };
  }
  if (typeof raw.website === "string" && raw.website.trim()) {
    return { honeypot: true };
  }
  const kecamatan = typeof raw.kecamatan === "string" ? raw.kecamatan.trim() : "";
  const kategori = typeof raw.kategori === "string" ? raw.kategori.trim() : "";
  const uraian = typeof raw.uraian === "string" ? raw.uraian.trim() : "";
  const urlRaw = typeof raw.url_bukti === "string" ? raw.url_bukti.trim() : "";
  if (!KEC_SET.has(kecamatan)) return { error: "Kecamatan wajib dipilih." };
  if (!KAT_SET.has(kategori)) return { error: "Kategori wajib dipilih." };
  if (uraian.length < URAIAN_MIN) return { error: "Uraian minimal 20 karakter." };
  if (uraian.length > URAIAN_MAX) return { error: "Uraian terlalu panjang." };
  if (urlRaw && !validHttpUrl(urlRaw)) {
    return { error: "Tautan bukti harus URL http(s) yang valid." };
  }
  return {
    payload: {
      kecamatan,
      kategori,
      uraian,
      url_bukti: urlRaw || null,
    },
  };
}

function issueTitle(payload) {
  const clip = payload.uraian.replace(/\s+/g, " ").slice(0, 70);
  return `[Lapor] ${payload.kecamatan} · ${payload.kategori}: ${clip}`;
}

function issueBody(payload) {
  const bukti = payload.url_bukti || "(tidak ada)";
  return [
    "## Laporan warga",
    "",
    `- Kecamatan: ${payload.kecamatan}`,
    `- Kategori: ${payload.kategori}`,
    `- Waktu (UTC): ${new Date().toISOString()}`,
    "",
    "### Uraian",
    "",
    payload.uraian,
    "",
    "### Tautan bukti",
    "",
    bukti,
    "",
    "_Masuk lewat form Atlas Bojonegoro. Bukan laporan polisi._",
  ].join("\n");
}

async function createIssue(env, payload) {
  const repo = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;
  if (!repo || !token) {
    return { error: "Layanan kirim belum disetel.", status: 503 };
  }
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "atlas-bojonegoro-lapor",
    },
    body: JSON.stringify({
      title: issueTitle(payload),
      body: issueBody(payload),
      labels: ["lapor"],
    }),
  });
  if (!res.ok) {
    return { error: "Laporan belum masuk antrian. Kirim ulang beberapa saat lagi.", status: 502 };
  }
  const data = await res.json();
  return {
    issueUrl: typeof data.html_url === "string" ? data.html_url : null,
    number: typeof data.number === "number" ? data.number : null,
  };
}

async function handlePost(request, env) {
  const length = Number(request.headers.get("content-length") || "0");
  if (length > MAX_BODY) return json({ error: "Isian terlalu besar." }, 413);

  const ip = clientIp(request);
  if (rateLimited(ip)) {
    return json({ error: "Terlalu banyak kiriman dari jaringan ini. Coba lagi nanti." }, 429);
  }

  let raw;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Isian tidak terbaca." }, 400);
  }

  const parsed = readPayload(raw);
  if (parsed.honeypot) {
    return json({ ok: true }, 201);
  }
  if (parsed.error) return json({ error: parsed.error }, 400);

  const created = await createIssue(env, parsed.payload);
  if (created.error) return json({ error: created.error }, created.status);

  return json({ ok: true, issueUrl: created.issueUrl, number: created.number }, 201);
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), request, env);
    }
    if (!looksLikePath(path)) {
      return withCors(json({ error: "Tidak ditemukan." }, 404), request, env);
    }
    if (request.method === "GET") {
      return withCors(json({ ok: true, service: "atlas-lapor" }, 200), request, env);
    }
    if (request.method === "POST") {
      return withCors(await handlePost(request, env), request, env);
    }
    return withCors(json({ error: "Metode tidak diizinkan." }, 405), request, env);
  },
};
