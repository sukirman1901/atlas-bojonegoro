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

1. Di dashboard Cloudflare, buka Worker yang sudah ada (atau `npx wrangler deploy` dari folder `worker/`).
2. Tempel isi [`worker/index.js`](worker/index.js) ke Worker, atau deploy lewat Wrangler.
3. **Settings → Variables:** `GITHUB_REPO` = `sukirman1901/atlas-bojonegoro`, `ALLOWED_ORIGINS` = origin situs (contoh `https://domain-anda` plus `http://127.0.0.1:8765` untuk uji lokal).
4. **Secret:** `GITHUB_TOKEN` — token GitHub dengan izin tulis isu di repo itu saja (`wrangler secret put GITHUB_TOKEN` atau Encrypt di dashboard).
5. Pasang **Custom Domain** atau **Route** `domain-anda/api/lapor*` ke Worker ini. Form mengirim ke `/api/lapor`.
6. Kalau Worker masih di `*.workers.dev`, ubah `laporEndpoint` di [`data/config.mjs`](data/config.mjs) ke URL penuh itu, lalu `node scripts/build.mjs`.

Tanpa token, tombol Kirim laporan tetap ada; server menolak dengan pesan yang bisa dibaca.

Field, status verifikasi, dan alur masuk data: komentar di kepala `data/isu.mjs` dan [CONTRIBUTING.md](CONTRIBUTING.md).

## Lisensi

MIT. [LICENSE](LICENSE).
