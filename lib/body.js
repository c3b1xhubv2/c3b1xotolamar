// Baca body JSON dengan aman, baik saat sudah di-parse Vercel maupun masih raw stream.
async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.length) {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (_) { return {}; }
}

module.exports = { readJson };
