const crypto = require("crypto");

// Kunci diambil dari ENV. Buat dengan: openssl rand -hex 32  (menghasilkan 64 karakter hex)
function key() {
  const hex = process.env.ENCRYPTION_KEY || "";
  if (hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY harus 64 karakter hex (32 byte). Buat dengan: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

// -> base64(iv[12] + authTag[16] + ciphertext)
function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(b64) {
  const raw = Buffer.from(b64, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

module.exports = { encrypt, decrypt };
