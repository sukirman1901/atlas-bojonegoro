# Supabase — Petisi

Backend untuk tab **Petisi**: campaign + tanda tangan terverifikasi email.

## Setup

1. Buat project di [supabase.com](https://supabase.com).
2. **SQL Editor** → jalankan isi `migrations/20260918_petisi.sql`.
3. **Authentication → Providers → Email**: aktifkan Email; magic link / OTP on.
4. **Authentication → URL configuration**
   - Site URL: `https://atlas.nusaiba.dev`
   - Redirect URLs:  
     `https://atlas.nusaiba.dev/**`  
     `http://127.0.0.1:4173/**`  
     `http://localhost:4173/**`
5. **Project Settings → API**: salin Project URL dan `anon` `public` key.
6. Isi `public/js/petisi-config.js`:

```js
window.PETISI_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_KEY",
  enabled: true,
};
```

`anon` key memang publik (dilindungi RLS). Jangan commit `service_role`.

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
