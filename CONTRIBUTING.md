# Kontribusi

Platform ini menampilkan isu dan menampung laporan. Jangan kirim crawler, scraper, atau integrasi yang menarik data dari media sosial / portal secara otomatis.

## Alur singkat

1. Fork dan cabang dari kerja Anda.
2. Ubah data di `data/isu.mjs` atau `data/laporan.json`, bukan di `public/data/isu.js` (berkas itu hasil build).
3. Jalankan `node scripts/build.mjs`.
4. Cek tampilan lewat `node scripts/dev.mjs` — Peta, Daftar, Kecamatan (28 baris), Lapor.
5. Kirim pull request yang menjelaskan sumber dan status verifikasi.

## Memasukkan isu

Ikuti skema di kepala `data/isu.mjs`. Untuk isu yang akan `terbit`, isi `kecamatan` (nama harus sama dengan `data/kecamatan.json`).

Status verifikasi diisi redaksi, bukan mesin:

| Nilai | Artinya |
| --- | --- |
| `belum` | Belum dicek |
| `tautan_ok` | URL sumber bisa dibuka |
| `sumber_kedua` | Ada konfirmasi dari sumber lain |
| `iklan_ditolak` | Konten portal berbayar / iklan, tidak diangkat |
| `terbit` | Layak tampil sebagai isu atlas |

`pengamplifikasi` dipakai untuk akun yang menggaungkan orang, bukan sumber primer.

## Laporan warga

Form publik mengirim ke Cloudflare Worker, yang membuat issue dari [`.github/ISSUE_TEMPLATE/lapor.yml`](.github/ISSUE_TEMPLATE/lapor.yml). Warga tidak perlu akun GitHub. Token hanya di secret Worker.

Maintainer:

1. Tinjau issue.
2. Tambah ke `data/laporan.json` dengan `status` yang sesuai.
3. Bila lolos, buat entri di `data/isu.mjs` dan set laporan ke `jadi_isu`.

## Kode

Tetap vanilla: `public/index.html` + `public/js/app.js` + `public/data/*.js` hasil build. Jangan pindah ke Next/React tanpa diskusi. Warna hanya untuk encoding data; jangan tambah pustaka ikon.
