const { serviceClient, getUserFromReq } = require("../lib/supa");
const { encrypt } = require("../lib/crypto");
const { readJson } = require("../lib/body");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ ok: false, error: "Sesi tidak valid. Silakan login ulang." });

  let supa;
  try {
    supa = serviceClient();
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }

  // ---- Ambil config (tanpa membocorkan password) ----
  if (req.method === "GET") {
    const { data, error } = await supa
      .from("email_configs")
      .select("email_user, from_name, email_pass_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    if (!data) return res.status(200).json({ ok: true, config: null });
    return res.status(200).json({
      ok: true,
      config: {
        email_user: data.email_user,
        from_name: data.from_name || "",
        has_password: !!data.email_pass_encrypted,
      },
    });
  }

  // ---- Simpan config ----
  if (req.method === "POST") {
    const body = await readJson(req);
    const email_user = (body.email_user || "").trim();
    const from_name = (body.from_name || "").trim();
    const email_pass = (body.email_pass || "").trim();

    if (!email_user) {
      return res.status(400).json({ ok: false, error: "Email Gmail wajib diisi." });
    }

    const row = {
      user_id: user.id,
      email_user,
      from_name,
      updated_at: new Date().toISOString(),
    };

    if (email_pass) {
      try {
        row.email_pass_encrypted = encrypt(email_pass);
      } catch (e) {
        return res.status(500).json({ ok: false, error: e.message });
      }
    } else {
      // Password kosong -> pertahankan yang lama. Kalau belum ada, wajib isi.
      const { data: existing } = await supa
        .from("email_configs")
        .select("email_pass_encrypted")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing || !existing.email_pass_encrypted) {
        return res.status(400).json({ ok: false, error: "App Password wajib diisi saat pertama kali menyimpan." });
      }
    }

    const { error } = await supa.from("email_configs").upsert(row, { onConflict: "user_id" });
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ ok: false, error: "Method not allowed" });
};
