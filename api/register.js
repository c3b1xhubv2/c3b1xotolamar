const { serviceClient, anonClient } = require("../lib/supa");
const { readJson, errMsg } = require("../lib/body");

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const b = await readJson(req);
    const username = (b.username || "").trim();
    const email = (b.email || "").trim().toLowerCase();
    const password = b.password || "";

    if (!USERNAME_RE.test(username))
      return res.status(400).json({ ok: false, error: "Username 3-20 karakter, hanya huruf, angka, dan _." });
    if (!email.includes("@"))
      return res.status(400).json({ ok: false, error: "Email tidak valid." });
    if (password.length < 6)
      return res.status(400).json({ ok: false, error: "Password minimal 6 karakter." });

    const admin = serviceClient();

    // Cek username unik (case-insensitive). Kalau tabel belum ada, error-nya ditangani di insert.
    const { data: taken } = await admin
      .from("profiles").select("user_id").eq("username_lower", username.toLowerCase()).maybeSingle();
    if (taken) return res.status(400).json({ ok: false, error: "Username sudah dipakai." });

    // Buat user dengan email langsung terkonfirmasi -> tidak ada email konfirmasi terkirim
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (cErr) {
      console.error("createUser error:", cErr);
      const em = errMsg(cErr);
      const emptyish = !em || em === "{}" || em === "[object Object]" || em === "Unknown error";
      let msg;
      if (/already|registered|exists/i.test(em)) msg = "Email sudah terdaftar.";
      else if (/not allowed|forbidden|403|401|api key|apikey|role|jwt/i.test(em))
        msg = "Server tidak berwenang membuat akun. Pastikan SUPABASE_SERVICE_ROLE_KEY di Vercel = service_role key (bukan anon), lalu redeploy.";
      else if (emptyish || /database|trigger|constraint|column|schema|relation/i.test(em))
        msg = "Gagal membuat akun di database. Kemungkinan skema tabel 'profiles' salah atau ada trigger auto-create. Jalankan supabase-reset-profiles.sql (lihat README).";
      else msg = "Gagal daftar: " + em;
      return res.status(400).json({ ok: false, error: msg });
    }
    const uid = created.user.id;

    // Simpan profil
    const { error: pErr } = await admin.from("profiles").insert({ user_id: uid, username, email });
    if (pErr) {
      console.error("profiles insert error:", pErr);
      await admin.auth.admin.deleteUser(uid).catch(() => {}); // rollback
      const em = errMsg(pErr);
      let msg;
      if (/duplicate|unique/i.test(em)) msg = "Username sudah dipakai.";
      else if (/relation|does not exist|schema cache|find the table|profiles/i.test(em))
        msg = "Tabel 'profiles' belum ada. Jalankan ulang supabase-schema.sql di Supabase SQL Editor.";
      else msg = "Gagal menyimpan profil: " + em;
      return res.status(400).json({ ok: false, error: msg });
    }

    // Langsung login -> kembalikan sesi
    const anon = anonClient();
    const { data: s } = await anon.auth.signInWithPassword({ email, password });
    const session = s && s.session
      ? { access_token: s.session.access_token, refresh_token: s.session.refresh_token }
      : null;

    res.status(200).json({ ok: true, session });
  } catch (err) {
    console.error("register fatal:", err);
    res.status(500).json({ ok: false, error: errMsg(err, "Gagal daftar.") });
  }
};
