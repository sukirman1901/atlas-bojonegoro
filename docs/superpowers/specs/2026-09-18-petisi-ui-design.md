# Spec: UI Petisi (konsisten dengan atlas utama)

Tanggal: 2026-09-18  
Status: approved — siap diimplementasi lewat plan `docs/superpowers/plans/2026-09-18-petisi.md`  
Produk: Atlas Bojonegoro

## Tujuan

Menambah alur **Petisi** (max 3 aktif dari P1, verifikasi email) tanpa membuat permukaan visual baru. UI harus terasa satu produk dengan Peta / Daftar / Lapor / Docs.

## Keputusan nama & navigasi

- Label tab: **Petisi** (bukan Kampanye).
- Masuk lewat tab baru di `site-nav`, pola sama tab lain (`role="tab"`, `data-tab="petisi"`, `view-petisi`).
- Deep link: `?tab=petisi` (daftar) dan `?tab=petisi&petisi=<id>` (detail).
- CTA header **Lapor** tetap; jangan diganti atau digandakan jadi “Petisi”.
- Dari detail isu P1 yang punya petisi: link teks/chip netral ke petisi terkait (bukan modal di atas peta).

## Prinsip konsistensi (wajib)

| Aspek | Pakai yang sudah ada | Jangan |
|---|---|---|
| Warna | Token `:root` (`--fg`, `--bg`, `--line`, `--muted`, `--neg`, `--surface`) | Hex baru, ungu/indigo, glow |
| Tipografi | IBM Plex Sans / scale yang dipakai Docs & Lapor | Font display baru, multi-h1 |
| Tombol | `.btn`, `.btn-primary`, pill `--radius-pill` | CTA gradient, rounded-2xl card stack |
| Form | `.form-grid`, `.field`, `.field-label`, `.field-error`, `.form-msg` seperti Lapor | Form library / floating labels |
| Select | Custom `.select` atlas | `<select>` native penuh / combobox asing |
| Shell | Topbar sticky, tab bar, `app-frame` rails bila perlu | Sidebar petisi khusus, drawer kedua |
| Tabel/daftar | `.table-wrap` / baris daftar ala Daftar bila mode list | Dashboard card grid berbayang tebal |
| Motion | Token `--dur-*` / `--ease-out` ringan | Confetti, progress dramatis, marquee |
| Mobile | CTA primer full-width &lt;768 | Tombol kecil bertumpuk di pojok |

## Struktur layar

### A. Daftar petisi (`view-petisi`, tanpa `petisi` id)

Satu kolom, mirip kepadatan **Daftar** / **Lapor**, bukan marketplace.

1. Judul halaman singkat (satu `h1` di dalam view, atau heading section — konsisten dengan Lapor yang memakai form langsung; prefer **satu heading** “Petisi” + satu kalimat pendukung muted).
2. Meta: “Maksimal 3 petisi aktif. Tanda tangan diverifikasi email.”
3. Daftar item aktif (0–3):
   - Judul tuntutan (link ke detail)
   - Baris meta muted: isu terkait · status · **N** terverifikasi
   - Tombol `.btn.btn-primary` **Tanda tangani** (full-width di mobile)
4. Bagian opsional “Ditutup” di bawah, tipografi muted, tanpa CTA primer.
5. Empty: satu paragraf muted + link ke Docs/periode isu bila relevan.

**Pilihan list:** **baris/stack vertikal** (bukan 3 kartu berbayang). Dekat dengan mini-issue list di map side, bukan logo-cloud.

### B. Detail petisi (`?petisi=<id>`)

Urutan fokus tunggal (satu job per blok):

1. **Back** teks/button sekunder ke daftar petisi (`?tab=petisi`).
2. Judul tuntutan (`h1` satu-satunya di view).
3. Satu paragraf “mengapa” (Docs-length, bukan essay).
4. Angka besar: `N` + label “tanda tangan terverifikasi” — tipografi kuat, **bukan** gauge/chart.
5. Form tanda tangan — **copy struktur Lapor**:
   - Nama tampil
   - Email
   - Kecamatan opsional (custom select atlas; daftar 28 kecamatan yang sama)
   - Submit: **Kirim tautan verifikasi**
6. State sukses/error: `.form-msg` / `.form-msg-ok` sama Lapor (“Cek email untuk mengonfirmasi”).
7. Blok sekunder: tautan ke isu di Daftar; target pejabat (teks biasa).
8. Daftar nama publik: **off by default**; jika redaksi aktifkan, list sederhana tanpa email.

Halaman post-verify (dari magic link): pesan sukses singkat dalam shell atlas yang sama (bukan landing marketing terpisah).

## States

- Loading daftar/detail: skeleton atau teks muted “Memuat…” — pola sama async lain di app bila ada; jangan spinner ungu.
- Error jaringan: `.form-msg` / `.error` existing.
- Petisi ditutup: form disembunyikan; tampilkan hitungan final + “Petisi ditutup”.
- Sudah menandatangani (email sama): pesan status, bukan form ulang.

## Docs

Tambah section pendek di tab Docs (Pengantar atau Ikut serta): apa itu Petisi, verifikasi email, beda dengan Lapor. Gaya kalimat sama Docs linear (bukan FAQ accordion).

## Di luar scope UI v1

- Komentar / feed sosial
- Share wall, badge, leaderboard
- SSO Google sebagai syarat UI
- Progress bar target “1 juta”
- Admin UI penuh (v1 boleh Supabase dashboard)

## Stack UI (ingat, bukan implementasi sekarang)

- Surface: `public/` atlas (HTML/CSS/JS) + tab baru
- Data petisi/tanda tangan: Supabase (terpisah dari `data/isu.mjs` statis)
- Auth email: Supabase magic link / OTP

## Acceptance (konsistensi)

- [ ] Tab Petisi memakai kelas tab/shell yang sama
- [ ] Form memakai kelas Lapor (field/error/msg/btn)
- [ ] Tidak ada token warna/radius/font baru
- [ ] Mobile: CTA primer full-width
- [ ] Tidak ada kartu berbayang di hero/daftar petisi
- [ ] Copy tidak mengklaim “terverifikasi KTP”

## Open point (sudah diputuskan di chat)

- Nama modul: **Petisi**
- List style: stack vertikal konsisten atlas (bukan kartu marketplace)
