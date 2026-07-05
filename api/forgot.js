const { serviceClient, anonClient } = require("../lib/supa");
const { readJson } = require("../lib/body");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  // Selalu balas sukses generik supaya tidak bisa dipakai menebak akun yang ada (anti-enumerasi).
  const generic = { ok: true };

  try {
    const b = await readJson(req);
    const identifier = (b.identifier || "").trim();
    const redirectTo = (b.redirectTo || process.env.SITE_URL || "").trim();
    if (!identifier) return res.status(200).json(generic);

    let email = identifier.toLowerCase();
    if (!identifier.includes("@")) {
      const admin = serviceClient();
      const { data } = await admin
        .from("profiles").select("email").eq("username_lower", identifier.toLowerCase()).maybeSingle();
      if (!data || !data.email) return res.status(200).json(generic);
      email = data.email;
    }

    const anon = anonClient();
    await anon.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
  } catch (_) {
    // diamkan agar respons tetap generik
  }
  res.status(200).json(generic);
};
