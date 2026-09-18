# Atlas Bojonegoro

Situs publik untuk melihat isu urusan publik di Kabupaten Bojonegoro — di peta, di daftar, dan per kecamatan.

Fokus inventaris: **isu satu bulan terakhir**. Isinya disusun manusia dari sumber terbuka, lalu ditata agar mudah disaring dan dicek ulang. Bukan umpan berita otomatis, bukan kanal darurat atau laporan polisi.

**Situs:** [atlas.nusaiba.dev](https://atlas.nusaiba.dev/)  
**Repo:** [sukirman1901/atlas-bojonegoro](https://github.com/sukirman1901/atlas-bojonegoro)

## Untuk siapa

Warga yang ingin memahami isu di wilayahnya, dan redaksi yang menata serta memverifikasi entri. Siapa pun boleh membaca. Mengirim laporan tidak wajib menulis nama.

## Apa yang ada di situs

- **Peta** — 28 kecamatan; warna mengikuti jumlah isu yang sudah dipetakan.
- **Daftar** — inventaris isu dengan saringan dan skor prioritas (P1–P5).
- **Kecamatan** — ringkasan hitungan per wilayah.
- **Docs** — arti prioritas, tuduhan, verifikasi, matriks, dan cara lapor.
- **Petisi** — max 3 petisi aktif dari isu prioritas; tanda tangan diverifikasi email.
- **Lapor** — kirim kejadian ke antrian redaksi (bukan kanal darurat).

Iklan portal yang ditolak redaksi tidak dihitung di warna peta.

Penjelasan lengkap ada di tab **Docs** di situs.

## Menjalankan lokal

Perlu Node.js 18+. Jangan buka lewat `file://` — batas peta gagal dimuat.

```bash
git clone https://github.com/sukirman1901/atlas-bojonegoro.git
cd atlas-bojonegoro
node scripts/build.mjs
node scripts/dev.mjs
```

Buka [http://127.0.0.1:4173/](http://127.0.0.1:4173/).

## Data & kontribusi

Sunting [`data/isu.mjs`](data/isu.mjs) atau [`data/laporan.json`](data/laporan.json), lalu `node scripts/build.mjs`. Jangan sunting `public/data/isu.js` langsung.

Alur verifikasi, laporan warga, petisi, dan aturan kode: [CONTRIBUTING.md](CONTRIBUTING.md). Setup backend petisi: [`supabase/README.md`](supabase/README.md).

## Lisensi

MIT. [LICENSE](LICENSE).
