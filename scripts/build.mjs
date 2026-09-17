import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { META, ISU, prioritas, tier } from "../data/isu.mjs";
import { config } from "../data/config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "data");

const kecamatanDoc = JSON.parse(readFileSync(join(outDir, "kecamatan.json"), "utf8"));
const laporanDoc = JSON.parse(readFileSync(join(outDir, "laporan.json"), "utf8"));

const VERIFIKASI_STATUS = new Set([
  "belum",
  "tautan_ok",
  "sumber_kedua",
  "iklan_ditolak",
  "terbit",
]);

function turunanVerifikasiStatus(item) {
  if (item.verifikasi_status && VERIFIKASI_STATUS.has(item.verifikasi_status)) {
    return item.verifikasi_status;
  }
  return item.verifikasi === "bertautan" ? "terbit" : "belum";
}

const rows = ISU.map((i) => ({
  ...i,
  prioritas: prioritas(i),
  tier: tier(i),
  verifikasi_status: turunanVerifikasiStatus(i),
}));

const payload = {
  meta: META,
  config,
  kecamatan: kecamatanDoc.kecamatan,
  laporan: laporanDoc.laporan || [],
  isu: rows,
};

writeFileSync(join(outDir, "isu.json"), JSON.stringify(payload, null, 2) + "\n");

const COLS = [
  "id",
  "tanggal",
  "tanggal_jenis",
  "tier",
  "prioritas",
  "judul",
  "kategori",
  "aktor",
  "kecamatan",
  "nilai_rp",
  "jenis_nilai",
  "status",
  "status_enum",
  "sentimen",
  "tipe",
  "grup",
  "sumber",
  "sumber_jenis",
  "verifikasi",
  "verifikasi_status",
  "url",
  "dampak",
  "urgensi",
  "catatan",
];

function cell(v) {
  if (v === null || v === undefined) return "";
  const s = Array.isArray(v) ? v.join("; ") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const csv = [
  COLS.join(","),
  ...rows.map((r) => COLS.map((c) => cell(r[c])).join(",")),
].join("\n");

writeFileSync(join(outDir, "isu.csv"), csv + "\n");

writeFileSync(
  join(outDir, "isu.js"),
  "window.ISU_DATA = " + JSON.stringify(payload) + ";\n"
);

const MCOLS = ["tier", "prioritas", "dampak", "urgensi", "judul", "kategori", "grup", "status_enum", "tipe", "aktor"];
const sorted = [...rows].sort(
  (a, b) => b.prioritas - a.prioritas || b.dampak - a.dampak || a.id - b.id
);
const matrix = [
  MCOLS.join(","),
  ...sorted.map((r) => MCOLS.map((c) => cell(r[c])).join(",")),
].join("\n");
writeFileSync(join(outDir, "matriks-prioritas.csv"), matrix + "\n");

const tiers = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0 };
for (const r of rows) tiers[r.tier]++;
const kat = {};
for (const r of rows) kat[r.kategori] = (kat[r.kategori] || 0) + 1;
const ver = {};
for (const r of rows) ver[r.verifikasi_status] = (ver[r.verifikasi_status] || 0) + 1;
console.log(
  `OK  ${rows.length} isu, ${payload.kecamatan.length} kecamatan, ${payload.laporan.length} laporan`
);
console.log("    -> isu.json, isu.csv, isu.js, matriks-prioritas.csv");
console.log("    tier   :", tiers);
console.log("    verif  :", ver);
console.log("    kategori:", kat);
