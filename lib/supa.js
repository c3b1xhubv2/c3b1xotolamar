const { createClient } = require("@supabase/supabase-js");

// Client dengan service role (server-only) — bypass RLS, dipakai di serverless functions.
function serviceClient() {
  const url = process.env.SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur di Environment Variables.");
  }
  return createClient(url, svc, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Verifikasi token JWT dari header Authorization, kembalikan user Supabase.
async function getUserFromReq(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;
  try {
    const supa = serviceClient();
    const { data, error } = await supa.auth.getUser(token);
    if (error || !data || !data.user) return null;
    return data.user;
  } catch (_) {
    return null;
  }
}

// Client dengan anon key (server-side) — dipakai untuk signInWithPassword & resetPasswordForEmail.
function anonClient() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY belum diatur di Environment Variables.");
  }
  return createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

module.exports = { serviceClient, anonClient, getUserFromReq };
