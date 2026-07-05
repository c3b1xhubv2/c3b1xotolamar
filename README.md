# Auto Lamaran · C3B1xHUB

Tools kirim email lamaran kerja versi **web** dengan **akun login/daftar** dan
**konfigurasi tersimpan per-akun**. Config email (Gmail + App Password) disimpan
di database (App Password dienkripsi), jadi kamu bisa pakai dari HP/laptop mana
saja tanpa file `.env` di komputer. Siap di-hosting **Vercel**.

Fitur: daftar/login dengan **username atau email**, **reveal password**, tab
**Profil** (ganti username/email/password), **lupa password** via email reset,
template lamaran tetap, pilih posisi & deskripsi keahlian (Bartender /
Software-Hardware Engineer / custom), banyak lampiran (file upload + link), dan
lampiran dikirim sebagai **file asli**.

Catatan penting: **pendaftaran tidak mengirim email** (langsung aktif, biar
cepat). Email hanya dipakai untuk **lupa password** — itulah kenapa perlu SMTP
di Langkah 3.5.

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
   `supabase-schema.sql`, lalu **Run**. Ini membuat tabel `email_configs` dan
   `profiles` (untuk username).
3. Pendaftaran di aplikasi ini **tidak mengirim email** (akun langsung aktif),
   jadi kamu tidak perlu mengutak-atik pengaturan "Confirm email".
4. Tambahkan URL situs ke daftar redirect (dipakai link reset password): buka
   **Authentication → URL Configuration → Redirect URLs**, tambahkan URL Vercel
   kamu (mis. `https://auto-lamaran.vercel.app`).
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

## Langkah 3.5 — Email reset password (SMTP)

Fitur **lupa password** butuh Supabase bisa mengirim email. Email bawaan
Supabase sangat dibatasi (beberapa email/jam, sering masuk spam), jadi pasang
**SMTP sendiri** yang gratis & cepat. Rekomendasi: **Resend** (gratis 3.000
email/bulan, 100/hari — lebih dari cukup untuk reset password).

**Pakai Resend:**
1. Daftar di https://resend.com → verifikasi sebuah domain milikmu (mis.
   `c3b1.web.id`) dengan menambahkan DNS record yang mereka berikan.
2. Buat **API Key** di Resend.
3. Di **Supabase → Authentication → Emails → SMTP Settings**, aktifkan
   **Custom SMTP** dan isi:
   - Host: `smtp.resend.com`
   - Port: `465` (atau `587`)
   - Username: `resend`
   - Password: `API Key Resend`
   - Sender email: alamat di domain yang kamu verifikasi (mis. `no-reply@c3b1.web.id`)
   - Sender name: bebas (mis. `C3B1xHUB`)
4. Simpan. Selesai — email reset password akan dikirim lewat Resend.

Alternatif SMTP gratis: **Brevo** (smtp-relay.brevo.com, 300 email/hari).
Isian Supabase-nya sama polanya (host/port/user/pass dari akun Brevo).

> Tanpa Custom SMTP, tombol "Kirim link reset" tetap jalan tapi email bisa lambat
> atau tidak terkirim. Pendaftaran tidak terpengaruh (memang tanpa email).

---

## Langkah 4 — Pakai

1. Buka URL Vercel-mu (mis. `https://auto-lamaran.vercel.app`).
2. **Daftar** akun (username + email + password) — langsung aktif tanpa
   konfirmasi email. **Masuk** bisa pakai **email atau username**. Ikon mata di
   kolom password untuk memperlihatkan/menyembunyikan.
3. (Opsional) tab **Profil** untuk mengganti username, email, atau password.
   Lupa password? klik **"Lupa password?"** di halaman Masuk (butuh SMTP di
   Langkah 3.5).
4. Buka tab **Pengaturan**:
   - Isi **Email Gmail pengirim** + **App Password Gmail** + nama tampilan.
   - Klik **Simpan konfigurasi**, lalu **Tes koneksi** (harus hijau).
5. Buka tab **Kirim Lamaran**:
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
| Daftar gagal "Username sudah dipakai" | Ganti username lain (huruf/angka/_ , 3-20 karakter). |
| Daftar gagal / error `updated_at ... schema cache` | Skema tabel `profiles` salah. Jalankan `supabase-reset-profiles.sql` di SQL Editor, hapus user uji lama di Authentication → Users, lalu daftar ulang. |
| Email reset tidak datang | SMTP di Supabase belum diatur (Langkah 3.5), atau URL belum ada di Redirect URLs. Cek folder spam. |
| `FUNCTION_PAYLOAD_TOO_LARGE` | Total upload > 4 MB → pakai opsi link untuk file besar. |

---

Dibuat oleh **C3B1xHUB** · https://guns.lol/c3b1xhub
