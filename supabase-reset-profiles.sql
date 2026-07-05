-- =====================================================================
--  RESET / PERBAIKAN tabel profiles
--  Jalankan di Supabase: SQL Editor -> New query -> tempel semua -> Run
--
--  Pakai ini jika muncul error seperti:
--    "Could not find the 'updated_at' column of 'profiles' in the schema cache"
--    atau gagal daftar ("Gagal membuat akun di database").
--
--  CATATAN: ini MENGHAPUS tabel profiles lama (isinya cuma username).
--  Setelah reset, sebaiknya hapus juga user uji lama di
--  Authentication -> Users, lalu daftar akun baru dari awal.
-- =====================================================================

-- 1) Hapus trigger auto-create profile bila ada (sering bentrok & bikin daftar gagal).
--    Aman kalau memang tidak ada — perintah ini akan diabaikan.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

-- 2) Buat ulang tabel profiles dengan skema yang benar.
drop table if exists public.profiles cascade;

create table public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  username       text not null,
  username_lower text generated always as (lower(username)) stored,
  email          text,
  updated_at     timestamptz default now(),
  unique (username_lower)
);

alter table public.profiles enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile"
  on public.profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3) Paksa PostgREST memuat ulang skema (agar kolom baru langsung dikenali).
notify pgrst, 'reload schema';

-- =====================================================================
--  (Opsional) Cek apakah ada trigger tersembunyi di auth.users:
--  select tgname, proname from pg_trigger t
--  join pg_proc p on p.oid = t.tgfoid
--  where tgrelid = 'auth.users'::regclass and not tgisinternal;
-- =====================================================================
