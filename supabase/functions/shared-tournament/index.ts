import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
const backendKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  backendKey,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}
function normalizeCode(value: unknown) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function newCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}
function validSnapshot(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const stores = (value as Record<string, unknown>).stores;
  if (!stores || typeof stores !== "object" || Array.isArray(stores)) return false;
  return ["students", "groups", "tournaments", "matches", "history"].every(
    (key) => Array.isArray((stores as Record<string, unknown>)[key]),
  );
}
function snapshotSize(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}
async function findSession(code: string, id?: string) {
  const codeHash = await sha256(code);
  let query = supabase.from("shared_tournaments")
    .select("id, code_hash, snapshot, revision, updated_at")
    .eq("code_hash", codeHash);
  if (id) query = query.eq("id", id);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Méthode non autorisée." });
  try {
    const body = await req.json();
    const action = String(body?.action ?? "");

    if (action === "health") {
      const { error } = await supabase.from("shared_tournaments").select("id").limit(1);
      if (error) throw error;
      return reply(200, { ok: true, service: "shared-tournament", database: "connected" });
    }

    if (action === "create") {
      if (!validSnapshot(body.snapshot)) return reply(400, { error: "Sauvegarde de tournoi invalide." });
      if (snapshotSize(body.snapshot) > 900000) return reply(413, { error: "Les données dépassent la limite de test (900 Ko)." });
      let code = newCode();
      let codeHash = await sha256(code);
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase.from("shared_tournaments")
          .insert({ code_hash: codeHash, snapshot: body.snapshot, revision: 1 })
          .select("id, revision, updated_at")
          .single();
        if (!error && data) return reply(200, { ok: true, code, sessionId: data.id, revision: data.revision, updatedAt: data.updated_at });
        if (error?.code !== "23505") throw error;
        code = newCode();
        codeHash = await sha256(code);
      }
      return reply(503, { error: "Impossible de générer un code. Réessayez." });
    }

    const code = normalizeCode(body?.code);
    if (code.length !== 10) return reply(400, { error: "Le code doit contenir 10 caractères." });

    if (action === "join") {
      const session = await findSession(code);
      if (!session) return reply(404, { error: "Code introuvable. Vérifiez le code et réessayez." });
      return reply(200, { ok: true, sessionId: session.id, revision: session.revision, updatedAt: session.updated_at, snapshot: session.snapshot });
    }

    if (action === "get") {
      const session = await findSession(code, String(body?.sessionId ?? ""));
      if (!session) return reply(404, { error: "Tournoi partagé introuvable." });
      const since = Number(body?.sinceRevision ?? 0);
      return reply(200, {
        ok: true,
        sessionId: session.id,
        revision: session.revision,
        updatedAt: session.updated_at,
        snapshot: session.revision > since ? session.snapshot : null,
      });
    }

    if (action === "save") {
      if (!validSnapshot(body.snapshot)) return reply(400, { error: "Sauvegarde de tournoi invalide." });
      if (snapshotSize(body.snapshot) > 900000) return reply(413, { error: "Les données dépassent la limite de test (900 Ko)." });
      const sessionId = String(body?.sessionId ?? "");
      const expected = Number(body?.expectedRevision);
      if (!sessionId || !Number.isInteger(expected) || expected < 1) return reply(400, { error: "Révision de synchronisation invalide." });
      const codeHash = await sha256(code);
      const { data, error } = await supabase.from("shared_tournaments")
        .update({ snapshot: body.snapshot, revision: expected + 1, updated_at: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("code_hash", codeHash)
        .eq("revision", expected)
        .select("id, revision, updated_at")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        const current = await findSession(code, sessionId);
        if (!current) return reply(404, { error: "Tournoi partagé introuvable." });
        return reply(409, { error: "Une autre tablette a enregistré une modification. Les données locales doivent être actualisées.", revision: current.revision });
      }
      return reply(200, { ok: true, revision: data.revision, updatedAt: data.updated_at });
    }

    return reply(400, { error: "Action inconnue." });
  } catch (error) {
    console.error("shared-tournament error", error);
    return reply(500, { error: "Erreur du service de partage. Réessayez." });
  }
});
