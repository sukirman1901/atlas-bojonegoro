import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../worker/index.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicRoot = join(root, "public");
const port = Number(process.env.PORT || 4173);
const origin = `http://127.0.0.1:${port}`;
const env = {
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
  GITHUB_REPO: process.env.GITHUB_REPO || "sukirman1901/atlas-bojonegoro",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || `${origin},http://localhost:${port}`,
};

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
};

function safeFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const rel = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const full = resolve(publicRoot, rel);
  if (relative(publicRoot, full).startsWith("..")) return null;
  return full;
}

async function toWeb(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
  }
  return new Request(`${origin}${req.url}`, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
  });
}

createServer(async (req, res) => {
  try {
    const path = (req.url || "/").split("?")[0];
    if (path === "/api/lapor") {
      const webRes = await worker.fetch(await toWeb(req), env);
      res.statusCode = webRes.status;
      webRes.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(Buffer.from(await webRes.arrayBuffer()));
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }
    const file = safeFile(path);
    if (!file) {
      res.writeHead(400);
      res.end();
      return;
    }
    let target = file;
    const st = await stat(target).catch(() => null);
    if (st?.isDirectory()) target = join(file, "index.html");
    const data = await readFile(target).catch(() => null);
    if (!data) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[extname(target)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(500);
    res.end();
  }
}).listen(port, "127.0.0.1", () => {
  console.log(origin + "/");
});
