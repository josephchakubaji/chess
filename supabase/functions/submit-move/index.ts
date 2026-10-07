// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";
import { Chess } from "npm:chess.js@0.10.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accessToken = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!supabaseUrl || !serviceRoleKey || !accessToken) {
    return Response.json({ error: "Authentication and server configuration are required" }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const gameId = body?.game_id;
    const roomCode = body?.room_code;
    const fenBefore = body?.fen_before;
    const from = body?.from;
    const to = body?.to;
    const promotion = body?.promotion || undefined;

    if (!gameId || !roomCode || typeof fenBefore !== "string" || !from || !to) {
      return Response.json({ error: "Invalid move request" }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return Response.json({ error: "Invalid authentication token" }, { status: 401, headers: corsHeaders });
    }

    const { data: game, error: gameError } = await supabase
      .from("game_history")
      .select("id,user_id,mode,status,room_code,current_fen,pgn")
      .eq("id", gameId)
      .eq("room_code", roomCode)
      .eq("mode", "private")
      .eq("status", "in_progress")
      .maybeSingle();

    if (gameError || !game || game.user_id !== userData.user.id) {
      return Response.json({ error: "Game not found" }, { status: 404, headers: corsHeaders });
    }
    if (game.current_fen !== fenBefore) {
      return Response.json({ error: "The board position is out of date" }, { status: 409, headers: corsHeaders });
    }

    const position = new Chess(fenBefore);
    const move = position.move({ from, to, promotion });
    if (!move) {
      return Response.json({ error: "Move is not legal" }, { status: 422, headers: corsHeaders });
    }

    const nextFen = position.fen();
    const nextPgn = position.pgn();
    const { error: updateError } = await supabase
      .from("game_history")
      .update({ current_fen: nextFen, pgn: nextPgn })
      .eq("id", gameId)
      .eq("user_id", userData.user.id);

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500, headers: corsHeaders });
    }

    return Response.json({
      ok: true,
      fen: nextFen,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      san: move.san,
      history: position.history(),
      pgn: nextPgn,
      game_over: position.game_over(),
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500, headers: corsHeaders });
  }
});
