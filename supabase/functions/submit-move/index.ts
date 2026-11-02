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

    if (
      typeof gameId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId) ||
      typeof roomCode !== "string" ||
      !/^[A-Z0-9]{6}$/.test(roomCode) ||
      typeof fenBefore !== "string" ||
      typeof from !== "string" ||
      typeof to !== "string" ||
      !/^[a-h][1-8]$/.test(from) ||
      !/^[a-h][1-8]$/.test(to) ||
      (promotion !== undefined && !["q", "r", "b", "n"].includes(promotion))
    ) {
      return Response.json({ error: "Invalid move request" }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return Response.json({ error: "Invalid authentication token" }, { status: 401, headers: corsHeaders });
    }

    const { data: game, error: gameError } = await supabase
      .from("game_history")
      .select("id,user_id,mode,status,room_code,player_color,current_fen,initial_fen,pgn,time_control,clock_ms,last_move_at,created_at")
      .eq("id", gameId)
      .eq("room_code", roomCode)
      .eq("mode", "private")
      .eq("status", "in_progress")
      .maybeSingle();

    if (gameError) {
      return Response.json({ error: gameError.message }, { status: 500, headers: corsHeaders });
    }
    if (!game || game.user_id !== userData.user.id) {
      return Response.json({ error: "Game not found" }, { status: 404, headers: corsHeaders });
    }
    if (game.current_fen !== fenBefore) {
      return Response.json({ error: "The board position is out of date" }, { status: 409, headers: corsHeaders });
    }

    const { data: activePlayers, error: playersError } = await supabase
      .from("game_history")
      .select("id,user_id,player_color,current_fen,initial_fen,pgn")
      .eq("room_code", roomCode)
      .eq("mode", "private")
      .eq("status", "in_progress");
    if (playersError) {
      return Response.json({ error: playersError.message }, { status: 500, headers: corsHeaders });
    }
    if (
      activePlayers?.length !== 2 ||
      new Set(activePlayers.map((player) => player.user_id)).size !== 2 ||
      new Set(activePlayers.map((player) => player.player_color)).size !== 2 ||
      activePlayers.some(
        (player) =>
          player.current_fen !== game.current_fen ||
          player.initial_fen !== game.initial_fen ||
          (player.pgn || "") !== (game.pgn || ""),
      )
    ) {
      return Response.json(
        { error: "Both players' game records are not ready or synchronized" },
        { status: 409, headers: corsHeaders },
      );
    }

    if (!["w", "b"].includes(game.player_color)) {
      return Response.json({ error: "Player side is not set for this game" }, { status: 409, headers: corsHeaders });
    }

    let position: Chess;
    let initialFen = game.initial_fen;
    if (initialFen) {
      position = new Chess(initialFen);
    } else if (game.pgn) {
      position = new Chess();
      initialFen = game.pgn.match(/^\[FEN "([^"]+)"\]$/m)?.[1] || position.fen();
    } else {
      // Older records may not have a saved initial position or PGN.
      initialFen = fenBefore;
      position = new Chess(fenBefore);
    }
    if (game.pgn) {
      const loaded = position.load_pgn(game.pgn);
      if (!loaded || position.fen() !== fenBefore) {
        return Response.json({ error: "The saved move history is inconsistent" }, { status: 409, headers: corsHeaders });
      }
    } else if (position.fen() !== fenBefore) {
      return Response.json({ error: "The board position is out of date" }, { status: 409, headers: corsHeaders });
    }
    if (position.turn() !== game.player_color) {
      return Response.json({ error: "It is not your turn" }, { status: 403, headers: corsHeaders });
    }

    const timeControl = game.time_control || "unlimited";
    let nextClockMs: { w: number; b: number } | null = null;
    if (timeControl !== "unlimited") {
      const timeControlMatch = /^(1|3|5|10)\+(0|2)$/.exec(timeControl);
      if (!timeControlMatch) {
        return Response.json({ error: "Unsupported time control" }, { status: 409, headers: corsHeaders });
      }
      const baseTimeMs = Number(timeControlMatch[1]) * 60_000;
      const incrementMs = Number(timeControlMatch[2]) * 1_000;
      const hasPreviousMoves = Boolean(game.pgn);
      const storedClock = game.clock_ms;
      const clocks = hasPreviousMoves
        ? { w: Number(storedClock?.w), b: Number(storedClock?.b) }
        : { w: baseTimeMs, b: baseTimeMs };
      if (!Number.isFinite(clocks.w) || clocks.w < 0 || !Number.isFinite(clocks.b) || clocks.b < 0) {
        return Response.json({ error: "Saved clock state is invalid" }, { status: 409, headers: corsHeaders });
      }
      const clockStartedAt = Date.parse(
        hasPreviousMoves ? game.last_move_at : game.created_at,
      );
      if (!Number.isFinite(clockStartedAt)) {
        return Response.json({ error: "Saved clock timestamp is invalid" }, { status: 409, headers: corsHeaders });
      }
      const elapsedMs = Math.max(0, Date.now() - clockStartedAt);
      const movingSide = position.turn();
      const remainingMs = clocks[movingSide] - elapsedMs;
      if (remainingMs <= 0) {
        return Response.json({ error: "Your clock has expired" }, { status: 409, headers: corsHeaders });
      }
      nextClockMs = { ...clocks, [movingSide]: remainingMs + incrementMs };
    }

    const move = position.move({ from, to, promotion });
    if (!move) {
      return Response.json({ error: "Move is not legal" }, { status: 422, headers: corsHeaders });
    }

    const nextFen = position.fen();
    if (initialFen !== new Chess().fen()) {
      position.header("SetUp", "1");
      position.header("FEN", initialFen);
    }
    const nextPgn = position.pgn();
    const snapshot = {
      current_fen: nextFen,
      pgn: nextPgn,
      last_move_at: new Date().toISOString(),
      ...(nextClockMs ? { clock_ms: nextClockMs } : {}),
      ...(game.initial_fen ? {} : { initial_fen: initialFen }),
    };
    const { data: updatedRows, error: updateError } = await supabase
      .from("game_history")
      .update(snapshot)
      .eq("room_code", roomCode)
      .eq("mode", "private")
      .eq("status", "in_progress")
      .eq("current_fen", fenBefore)
      .select("id");

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500, headers: corsHeaders });
    }
    if (!updatedRows?.some((row) => row.id === gameId)) {
      return Response.json({ error: "The board position is out of date" }, { status: 409, headers: corsHeaders });
    }

    return Response.json({
      ok: true,
      fen: nextFen,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      san: move.san,
      history: position.history(),
      clock_ms: nextClockMs,
      pgn: nextPgn,
      game_over: position.game_over(),
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500, headers: corsHeaders });
  }
});
