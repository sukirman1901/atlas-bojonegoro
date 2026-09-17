# Atlas Bojonegoro

Peta dan daftar isu publik Kabupaten Bojonegoro, di 28 kecamatan.

Data dimasukkan orang ke repositori ini. Situsnya tidak menarik berita atau media sosial sendiri, dan bukan kanal darurat atau laporan polisi.

[sukirman1901/atlas-bojonegoro](https://github.com/sukirman1901/atlas-bojonegoro)

## Apa yang bisa dibuka

- **Peta** — warna wilayah mengikuti jumlah isu. Klik kecamatan untuk menyaring daftar.
- **Daftar** — filter, skor prioritas, lalu detail satu isu.
- **Kecamatan** — 28 baris, termasuk yang masih nol isu.
- **Docs** — arti P1, Tuduhan, verifikasi, dan cara lapor.
- **Lapor** — kirim kejadian ke antrian redaksi. Nama tidak diminta.

Iklan portal yang ditolak redaksi tidak dihitung di warna peta.

## Jalankan di komputer

Perlu Node.js 18+. Peta gagal memuat batas wilayah kalau dibuka lewat `file://`.

```bash
git clone https://github.com/sukirman1901/atlas-bojonegoro.git
cd atlas-bojonegoro
node scripts/build.mjs
python3 -m http.server 4173
```

Lalu buka [http://127.0.0.1:4173/](http://127.0.0.1:4173/).

Supaya tombol **Kirim laporan** punya penerima di komputer yang sama:

```bash
node scripts/dev.mjs
```

Tanpa `GITHUB_TOKEN` di lingkungan, kiriman ditolak dengan pesan — bukan unduh JSON.

## Data

Sunting [`data/isu.mjs`](data/isu.mjs), lalu jalankan `node scripts/build.mjs`. Jangan sunting `data/isu.js`: itu hasil generate.

Nama kecamatan harus sama dengan [`data/kecamatan.json`](data/kecamatan.json). Batas peta dari [Badan Informasi Geospasial](https://www.big.go.id/) (`WADMKK=Bojonegoro`). Nama `Sumberejo` diseragamkan ke **Sumberrejo**.

Laporan yang sudah diproses ada di [`data/laporan.json`](data/laporan.json).

## Kirim laporan (Cloudflare Worker)

Deploy Git ke Workers memakai `wrangler.jsonc` di akar repo: situs + `POST /api/lapor` dalam satu Worker (`atlas-bojonegoro`).

1. Di dashboard Worker **atlas-bojonegoro** → **Settings → Variables**:
   - `GITHUB_REPO` = `sukirman1901/atlas-bojonegoro` (sudah di `wrangler.jsonc`)
   - `ALLOWED_ORIGINS` = URL publik situs (contoh `https://atlas-bojonegoro.sukirman1901.workers.dev` dan domain kustom Anda)
2. **Secret:** `GITHUB_TOKEN` — token GitHub dengan izin tulis isu di repo itu saja (Encrypt di dashboard).
3. Domain kustom: pasang di Worker/Pages project yang sama. Jangan unggah ulang dengan `assets.directory = "."` tanpa [`.assetsignore`](.assetsignore) — file `.git` tidak boleh publik.

`.assetsignore` memastikan `.git`, `worker/`, dan sumber `*.mjs` tidak ikut ke CDN.

Field, status verifikasi, dan alur masuk data: komentar di kepala `data/isu.mjs` dan [CONTRIBUTING.md](CONTRIBUTING.md).

## Lisensi

MIT. [LICENSE](LICENSE).
