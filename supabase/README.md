# Supabase — Petisi

Backend untuk tab **Petisi**: campaign + tanda tangan terverifikasi email.

## Setup (CLI)

```bash
supabase link --project-ref wvavxkdjzkdbrfgudfhl
# saat diminta: isi Database password dari Dashboard → Settings → Database

supabase db push
```

Atau tanpa CLI: **SQL Editor** di dashboard → tempel & Run isi `migrations/20260918130800_petisi.sql`.

## Setup (Auth URL)

Di dashboard **Authentication → URL configuration**:

- Site URL: `https://atlas.nusaiba.dev`
- Redirect URLs:  
  `https://atlas.nusaiba.dev/**`  
  `http://127.0.0.1:4173/**`  
  `http://localhost:4173/**`

Aktifkan **Email** (magic link / OTP).

## Config situs

`public/js/petisi-config.js` memakai Project URL + `anon` key (publik, dilindungi RLS). Jangan commit `service_role`.

## Seed (max 3 open)

Contoh — ganti `isu_id` ke id P1 nyata dari atlas:

```sql
insert into public.campaigns (slug, title, summary, demand, target_label, isu_id, status)
values
  (
    'karangi-nongko',
    'Percepat penyelesaian Bendungan Karangnongko',
    'Proyek strategis terancam mangkrak; warga butuh kepastian jadwal dan anggaran.',
    'Kami menuntut pemerintah daerah dan pihak terkait mempublikasikan jadwal penyelesaian Bendungan Karangnongko dan menuntaskannya sesuai komitmen.',
    'Bupati Bojonegoro & DPRD',
    10,
    'open'
  );
```

Ulangi maksimal total **3** baris `status = 'open'`.

## Alur verify

1. Pengunjung submit nama + email → insert `signatures` (`verified_at` null).
2. Supabase Auth kirim magic link ke email.
3. Setelah login, klien memanggil RPC `verify_my_signature(campaign_id)`.
4. Counter hanya menghitung baris dengan `verified_at` terisi.

## Catatan

- Atlas situs tetap di Cloudflare; Supabase hanya Petisi.
- Kirim email v1: provider bawaan Supabase. Custom domain: pasang SMTP di Auth settings.
- Admin v1: edit tabel di dashboard Supabase (belum ada UI admin di atlas).
