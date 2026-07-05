# Auto Lamaran · C3B1xHUB

Tools kirim email lamaran kerja versi **web** dengan **akun login/daftar** dan
**konfigurasi tersimpan per-akun**. Config email (Gmail + App Password) disimpan
di database (App Password dienkripsi), jadi kamu bisa pakai dari HP/laptop mana
saja tanpa file `.env` di komputer. Siap di-hosting **Vercel**.

Fitur: template lamaran tetap, pilih posisi & deskripsi keahlian (Bartender /
Software-Hardware Engineer / custom), banyak lampiran (file upload + link), dan
lampiran dikirim sebagai **file asli**.

---

## Arsitektur singkat

- **Frontend**: satu file `index.html` (HTML/CSS/JS) — halaman login/daftar + aplikasi.
- **Backend**: Vercel Serverless Functions di folder `api/`.
- **Auth + Database**: **Supabase** (login/daftar & penyimpanan config).
- **Kirim email**: `nodemailer` via SMTP Gmail (App Password).

---

## Langkah 1 — Buat project Supabase

1. Daftar/masuk di https://supabase.com → **New project**.
2. Setelah jadi, buka **SQL Editor → New query**, tempel isi file
   `supabase-schema.sql`, lalu **Run**. Ini membuat tabel `email_configs`.
3. (Opsional, agar login instan tanpa konfirmasi email) buka
   **Authentication → Providers/Settings → Email** dan matikan
   **Confirm email**. Kalau dibiarkan aktif, setiap akun baru harus klik link
   konfirmasi di email dulu.
4. (Opsional, agar privat) di **Authentication → Settings**, matikan
   **Allow new users to sign up** setelah kamu selesai mendaftar, supaya orang
   lain tidak bisa bikin akun.
5. Catat kredensial di **Project Settings → API**:
   - `Project URL`
   - `anon public` key
   - `service_role` key (RAHASIA)

---

## Langkah 2 — Siapkan kunci enkripsi

App Password disimpan terenkripsi. Buat kunci 32-byte (64 hex):

```bash
openssl rand -hex 32
```

Simpan hasilnya untuk `ENCRYPTION_KEY`. **Jangan ganti** kunci ini setelah ada
data tersimpan (data lama jadi tidak bisa didekripsi).

---

## Langkah 3 — Deploy ke Vercel

### Cara A: lewat GitHub (disarankan)
1. Upload folder ini ke sebuah repo GitHub.
2. Di https://vercel.com → **Add New → Project → Import** repo tersebut.
3. Framework Preset: **Other** (biarkan default). Klik **Deploy**.
4. Setelah deploy, buka **Project → Settings → Environment Variables**, isi
   variabel di bawah, lalu **Redeploy**.

### Cara B: lewat Vercel CLI
```bash
npm i -g vercel
vercel            # ikuti prompt, deploy
vercel env add SUPABASE_URL
# ...tambahkan semua env di bawah, lalu:
vercel --prod
```

### Environment Variables (wajib)
| Nama | Isi |
|------|-----|
| `SUPABASE_URL` | Project URL Supabase |
| `SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (rahasia) |
| `ENCRYPTION_KEY` | hasil `openssl rand -hex 32` (64 hex) |

Set untuk environment **Production** (dan Preview/Development bila perlu).

---

## Langkah 4 — Pakai

1. Buka URL Vercel-mu (mis. `https://auto-lamaran.vercel.app`).
2. **Daftar** akun (email + password), lalu **Masuk**.
3. Buka tab **Pengaturan**:
   - Isi **Email Gmail pengirim** + **App Password Gmail** + nama tampilan.
   - Klik **Simpan konfigurasi**, lalu **Tes koneksi** (harus hijau).
4. Buka tab **Kirim Lamaran**:
   - Isi email tujuan, subject, posisi.
   - Pilih deskripsi keahlian (Bartender / Engineer / custom).
   - Tambahkan lampiran (upload file dan/atау link), cek preview, **Kirim email**.

### Membuat App Password Gmail
1. Aktifkan **Verifikasi 2 Langkah**: https://myaccount.google.com/security
2. Buka https://myaccount.google.com/apppasswords → beri nama → **Create**.
3. Salin 16 huruf tanpa spasi, tempel ke kolom App Password di Pengaturan.

---

## Menjalankan lokal (opsional)

```bash
npm i -g vercel
npm install
cp .env.example .env     # isi semua nilainya
vercel dev               # buka http://localhost:3000
```

---

## Catatan & batasan

- **Batas upload ~4 MB**: Vercel membatasi body request 4,5 MB. File yang
  di-upload langsung harus kecil (CV PDF biasanya aman). Untuk file besar,
  gunakan **link** — server yang mengunduhnya, jadi tidak kena batas ini.
- **Link Google Drive** otomatis diubah jadi unduhan; set akses **"Siapa saja
  dengan link"**. File Drive yang besar bisa memunculkan halaman konfirmasi virus.
- **Keamanan**: App Password dienkripsi (AES-256-GCM) sebelum disimpan; tabel
  config tertutup oleh RLS dan hanya diakses lewat serverless function.
- Batas kirim Gmail: ~500 email/hari untuk akun biasa.

---

## Kalau error

| Gejala | Solusi |
|--------|--------|
| Halaman login "Supabase belum dikonfigurasi" | Env `SUPABASE_URL`/`SUPABASE_ANON_KEY` belum diisi → isi lalu Redeploy. |
| Simpan config error `ENCRYPTION_KEY harus 64 karakter` | Isi `ENCRYPTION_KEY` dengan hasil `openssl rand -hex 32`. |
| Tes koneksi gagal `Invalid login` | App Password salah / pakai password biasa. Buat ulang App Password. |
| Daftar tapi tak bisa masuk | "Confirm email" masih aktif → cek email, atau matikan di Supabase. |
| `FUNCTION_PAYLOAD_TOO_LARGE` | Total upload > 4 MB → pakai opsi link untuk file besar. |

---

Dibuat oleh **C3B1xHUB** · https://guns.lol/c3b1xhub
