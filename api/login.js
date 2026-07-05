const { serviceClient, anonClient } = require("../lib/supa");
const { readJson } = require("../lib/body");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const b = await readJson(req);
    const identifier = (b.identifier || "").trim();
    const password = b.password || "";
    if (!identifier || !password)
      return res.status(400).json({ ok: false, error: "Isi email/username dan password." });

    let email = identifier.toLowerCase();

    // Kalau bukan email, anggap username -> resolusi ke email
    if (!identifier.includes("@")) {
      const admin = serviceClient();
      const { data } = await admin
        .from("profiles").select("email").eq("username_lower", identifier.toLowerCase()).maybeSingle();
      if (!data || !data.email)
        return res.status(400).json({ ok: false, error: "Email/username atau password salah." });
      email = data.email;
    }

    const anon = anonClient();
    const { data: s, error } = await anon.auth.signInWithPassword({ email, password });
    if (error || !s.session)
      return res.status(400).json({ ok: false, error: "Email/username atau password salah." });

    res.status(200).json({
      ok: true,
      session: { access_token: s.session.access_token, refresh_token: s.session.refresh_token },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
