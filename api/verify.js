const { serviceClient, getUserFromReq } = require("../lib/supa");
const { decrypt } = require("../lib/crypto");
const nodemailer = require("nodemailer");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ ok: false, error: "Sesi tidak valid. Silakan login ulang." });

  try {
    const supa = serviceClient();
    const { data: cfg } = await supa
      .from("email_configs")
      .select("email_user, email_pass_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cfg || !cfg.email_pass_encrypted) {
      return res.status(400).json({ ok: false, error: "Konfigurasi email belum diatur." });
    }

    const pass = decrypt(cfg.email_pass_encrypted);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: cfg.email_user, pass },
    });
    await transporter.verify();
    res.status(200).json({ ok: true, from: cfg.email_user });
  } catch (err) {
    res.status(200).json({ ok: false, error: err.message });
  }
};
