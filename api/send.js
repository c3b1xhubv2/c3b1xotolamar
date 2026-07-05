const { serviceClient, getUserFromReq } = require("../lib/supa");
const { decrypt } = require("../lib/crypto");
const { readJson } = require("../lib/body");
const nodemailer = require("nodemailer");

function toDirectDownload(url) {
  const drive =
    url.match(/drive\.google\.com\/file\/d\/([^/]+)/) ||
    url.match(/[?&]id=([^&]+)/);
  if (drive) return `https://drive.google.com/uc?export=download&id=${drive[1]}`;
  return url;
}

function guessFileName(url, contentDisposition) {
  if (contentDisposition) {
    const m = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    if (m) return decodeURIComponent(m[1].replace(/"/g, ""));
  }
  try {
    const clean = url.split("?")[0].split("/").filter(Boolean).pop();
    if (clean && clean.includes(".")) return decodeURIComponent(clean);
  } catch (_) {}
  return "Lamaran-Kerja.pdf";
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ ok: false, error: "Sesi tidak valid. Silakan login ulang." });

  try {
    const body = await readJson(req);
    const to = (body.to || "").trim();
    const subject = (body.subject || "").trim();
    const text = (body.text || "").trim();
    const files = Array.isArray(body.files) ? body.files : []; // [{filename, contentB64, contentType}]
    const links = Array.isArray(body.links) ? body.links : []; // [{url, name}]

    if (!to || !subject || !text) {
      return res.status(400).json({ ok: false, error: "Email tujuan, subject, dan isi email wajib diisi." });
    }

    // Ambil & dekripsi konfigurasi milik user
    const supa = serviceClient();
    const { data: cfg } = await supa
      .from("email_configs")
      .select("email_user, from_name, email_pass_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cfg || !cfg.email_pass_encrypted) {
      return res.status(400).json({ ok: false, error: "Konfigurasi email belum diatur. Buka menu Pengaturan dulu." });
    }
    const pass = decrypt(cfg.email_pass_encrypted);

    // Rakit lampiran
    const attachments = [];

    for (const f of files) {
      if (!f || !f.contentB64) continue;
      attachments.push({
        filename: f.filename || "lampiran",
        content: Buffer.from(f.contentB64, "base64"),
        contentType: f.contentType || undefined,
      });
    }

    for (let i = 0; i < links.length; i++) {
      const url = (links[i].url || "").trim();
      if (!url) continue;
      const dl = toDirectDownload(url);
      const r = await fetch(dl, { redirect: "follow" });
      if (!r.ok) {
        throw new Error(`Gagal mengunduh file dari link ke-${i + 1} (HTTP ${r.status}). Pastikan link publik.`);
      }
      const buf = Buffer.from(await r.arrayBuffer());
      const name =
        (links[i].name || "").trim() ||
        guessFileName(dl, r.headers.get("content-disposition"));
      attachments.push({ filename: name, content: buf, contentType: r.headers.get("content-type") || undefined });
    }

    if (attachments.length === 0) {
      return res.status(400).json({ ok: false, error: "Lampiran wajib: minimal 1 file atau 1 link." });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: cfg.email_user, pass },
    });

    const info = await transporter.sendMail({
      from: `${cfg.from_name || "Pelamar"} <${cfg.email_user}>`,
      to,
      subject,
      text,
      attachments,
    });

    res.status(200).json({
      ok: true,
      messageId: info.messageId,
      count: attachments.length,
      filenames: attachments.map((a) => a.filename),
    });
  } catch (err) {
    console.error("Gagal kirim:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
};
