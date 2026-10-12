/**
 * rejoin-game edge function
 *
 * GET  → returns the caller's active in-progress private game snapshot
 * POST → records a leave/rejoin signal and enforces the reconnect window
 *
 * The home screen reads the same active-game record through get_active_game.
 * The submit-move function keeps both players' board snapshots current.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, accept, origin, x-requested-with",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  const cors = corsHeaders();

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
      .select("id, room_code, pgn, time_control, created_at, current_fen, player_color, clock_ms, last_move_at")
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

  // ── POST: coordinate both players' reconnection attempts ──────────────────
  let body: {
    action?: "left" | "rejoin" | "status";
    room_code?: string;
    disconnected_user_id?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: cors });
  }

  const { action, room_code, disconnected_user_id } = body;
  if (!room_code || !["left", "rejoin", "status"].includes(action || "")) {
    return Response.json({ error: "A room code and valid action are required" }, { status: 400, headers: cors });
  }
  const { data, error } = await supabase.rpc("update_private_game_rejoin", {
    p_user_id: userId,
    p_room_code: room_code,
    p_action: action,
    p_disconnected_user_id: disconnected_user_id || null,
  });
  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: cors });
  }

  return Response.json(data, { headers: cors });
});
