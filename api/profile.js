const { serviceClient, anonClient, getUserFromReq } = require("../lib/supa");
const { readJson, errMsg } = require("../lib/body");

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ ok: false, error: "Sesi tidak valid. Silakan login ulang." });

  const admin = serviceClient();

  // ---- Ambil profil ----
  if (req.method === "GET") {
    const { data } = await admin
      .from("profiles").select("username, email").eq("user_id", user.id).maybeSingle();
    return res.status(200).json({
      ok: true,
      profile: data || { username: "", email: user.email || "" },
    });
  }

  // ---- Ubah profil ----
  if (req.method === "POST") {
    const b = await readJson(req);
    const field = b.field;

    if (field === "username") {
      const username = (b.username || "").trim();
      if (!USERNAME_RE.test(username))
        return res.status(400).json({ ok: false, error: "Username 3-20 karakter (huruf, angka, _)." });
      const { data: taken } = await admin
        .from("profiles").select("user_id")
        .eq("username_lower", username.toLowerCase()).neq("user_id", user.id).maybeSingle();
      if (taken) return res.status(400).json({ ok: false, error: "Username sudah dipakai." });
      const { error } = await admin
        .from("profiles")
        .upsert({ user_id: user.id, username, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) return res.status(500).json({ ok: false, error: errMsg(error) });
      return res.status(200).json({ ok: true });
    }

    if (field === "email") {
      const email = (b.email || "").trim().toLowerCase();
      if (!email.includes("@")) return res.status(400).json({ ok: false, error: "Email tidak valid." });
      const { error: uErr } = await admin.auth.admin.updateUserById(user.id, { email, email_confirm: true });
      if (uErr) {
        const msg = /already|registered|exists/i.test(errMsg(uErr)) ? "Email sudah dipakai akun lain." : errMsg(uErr);
        return res.status(400).json({ ok: false, error: msg });
      }
      await admin.from("profiles").update({ email, updated_at: new Date().toISOString() }).eq("user_id", user.id);
      return res.status(200).json({ ok: true });
    }

    if (field === "password") {
      const currentPassword = b.currentPassword || "";
      const newPassword = b.newPassword || "";
      if (newPassword.length < 6)
        return res.status(400).json({ ok: false, error: "Password baru minimal 6 karakter." });
      // Verifikasi password saat ini
      const anon = anonClient();
      const { error: vErr } = await anon.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (vErr) return res.status(400).json({ ok: false, error: "Password saat ini salah." });
      const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
      if (error) return res.status(500).json({ ok: false, error: errMsg(error) });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: "Field tidak dikenal." });
  }

  res.status(405).json({ ok: false, error: "Method not allowed" });
};
