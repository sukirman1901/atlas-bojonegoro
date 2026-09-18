-- Seed max 3 open petisi (P1). Jalankan di SQL Editor atau: supabase db execute -f supabase/seed.sql
insert into public.campaigns (slug, title, summary, demand, target_label, isu_id, status)
values
  (
    'klino-jalan',
    'Tuntaskan dugaan korupsi jalan Desa Klino',
    'Dugaan penyimpangan proyek jalan desa senilai miliaran rupiah di Sekar. Warga butuh kejelasan proses dan hasil penanganan.',
    'Kami menuntut penuntasan proses hukum dan audit terbuka atas dugaan korupsi jalan Desa Klino, serta publikasi perkembangan secara berkala.',
    'Pemkab Bojonegoro & aparat penegak hukum',
    1,
    'open'
  ),
  (
    'bkkd-2025',
    'Buka hasil audit dugaan korupsi BKKD 2025',
    'Dugaan korupsi BKKD 2025 menyentuh banyak desa. Transparansi hasil pemeriksaan penting bagi warga Kanor, Trucuk, dan wilayah terkait.',
    'Kami menuntut publikasi ringkasan hasil audit/pemeriksaan BKKD 2025 dan komitmen tindak lanjut yang dapat dipantau publik.',
    'Pemkab Bojonegoro & DPRD',
    2,
    'open'
  ),
  (
    'karangnongko',
    'Percepat penyelesaian Bendungan Karangnongko',
    'Proyek strategis di Margomulyo terancam mangkrak. Jadwal dan kepastian anggaran perlu diumumkan.',
    'Kami menuntut pemerintah daerah dan pihak terkait mempublikasikan jadwal penyelesaian Bendungan Karangnongko dan menuntaskannya sesuai komitmen.',
    'Bupati Bojonegoro & DPRD',
    10,
    'open'
  )
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  demand = excluded.demand,
  target_label = excluded.target_label,
  isu_id = excluded.isu_id,
  status = excluded.status;
