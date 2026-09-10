/**
 * rejoin-game edge function
 *
 * GET  → returns the caller's active in-progress private game (room code + pgn)
 * POST → updates the pgn snapshot for a game the caller owns
 *
 * The client calls GET on the home screen to detect a resumable game and show
 * the "Rejoin" banner.  After every move in a private game the client calls POST
 * to keep the server-side PGN current so the opponent can also restore the board.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

function corsHeaders(origin: string | null) {
  const allowed = (Deno.env.get("APP_ORIGINS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    "Access-Control-Allow-Origin":
      origin && allowed.includes(origin) ? origin : "null",
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, accept, origin, x-requested-with",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors, status: 200 });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: "Server misconfigured" }, { status: 500, headers: cors });
  }

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return Response.json({ error: "Authentication required" }, { status: 401, headers: cors });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return Response.json({ error: "Invalid token" }, { status: 401, headers: cors });
  }

  const userId = authData.user.id;

  // ── GET: return the user's active in-progress private game ──────────────
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("game_history")
      .select("id, room_code, pgn, time_control, created_at")
      .eq("user_id", userId)
      .eq("mode", "private")
      .eq("status", "in_progress")
      .not("room_code", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: cors });
    }

    return Response.json({ game: data ?? null }, { headers: cors });
  }

  // ── POST: update pgn + room_code for an in-progress game ─────────────────
  let body: { game_id?: string; pgn?: string; room_code?: string } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: cors });
  }

  const { game_id, pgn, room_code } = body;
  if (!game_id) {
    return Response.json({ error: "game_id is required" }, { status: 400, headers: cors });
  }

  const updates: Record<string, string> = {};
  if (typeof pgn === "string") updates.pgn = pgn;
  if (typeof room_code === "string") updates.room_code = room_code;

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400, headers: cors });
  }

  const { error: updateError } = await supabase
    .from("game_history")
    .update(updates)
    .eq("id", game_id)
    .eq("user_id", userId)
    .eq("status", "in_progress");

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500, headers: cors });
  }

  return Response.json({ ok: true }, { headers: cors });
});
