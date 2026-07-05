-- =====================================================================
--  Jalankan SQL ini di Supabase: menu SQL Editor -> New query -> Run
-- =====================================================================

-- Tabel penyimpanan konfigurasi email per akun.
-- App Password disimpan dalam bentuk TERENKRIPSI (kolom email_pass_encrypted).
create table if not exists public.email_configs (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  email_user           text not null,
  email_pass_encrypted text,
  from_name            text,
  updated_at           timestamptz default now()
);

-- Aktifkan Row Level Security. Semua akses berjalan lewat serverless function
-- (service role) yang sudah membatasi berdasarkan user, jadi tabel ini tertutup
-- dari akses anon/publik secara default.
alter table public.email_configs enable row level security;

-- (Opsional) Kebijakan agar tiap user hanya bisa mengakses barisnya sendiri,
-- seandainya nanti diakses langsung dari client.
drop policy if exists "own config" on public.email_configs;
create policy "own config"
  on public.email_configs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
