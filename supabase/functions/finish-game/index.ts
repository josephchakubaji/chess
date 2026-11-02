import { createClient } from "npm:@supabase/supabase-js@2";
import { Chess } from "npm:chess.js@0.10.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isValidStartingPosition(position: Chess) {
  const fenFields = position.fen().split(" ");
  const board = position.board();
  const startingBackRank = board[7].map((piece) => piece?.type);
  const opposingBackRank = board[0].map((piece) => piece?.type);
  const expectedPieces = { k: 1, q: 1, r: 2, b: 2, n: 2 };

  if (
    position.turn() !== "w" ||
    !["-", "KQkq"].includes(fenFields[2]) ||
    fenFields[3] !== "-" ||
    fenFields[4] !== "0" ||
    fenFields[5] !== "1"
  ) {
    return false;
  }
  for (const color of ["w", "b"]) {
    const pieces = board.flat().filter((piece) => piece?.color === color);
    if (pieces.length !== 16) return false;
    for (const [type, count] of Object.entries(expectedPieces)) {
      if (pieces.filter((piece) => piece?.type === type).length !== count) {
        return false;
      }
    }
    const pawnRank = color === "w" ? board[6] : board[1];
    if (pawnRank.filter((piece) => piece?.color === color && piece.type === "p").length !== 8) {
      return false;
    }
  }

  if (
    startingBackRank.some((type, index) => type !== opposingBackRank[index]) ||
    startingBackRank.filter((type) => type === "k").length !== 1 ||
    startingBackRank.filter((type) => type === "r").length !== 2 ||
    startingBackRank.filter((type) => type === "b").length !== 2
  ) {
    return false;
  }

  const kingFile = startingBackRank.indexOf("k");
  const rookFiles = startingBackRank.flatMap((type, index) => type === "r" ? [index] : []);
  const bishopFiles = startingBackRank.flatMap((type, index) => type === "b" ? [index] : []);
  return (
    kingFile > rookFiles[0] &&
    kingFile < rookFiles[1] &&
    (bishopFiles[0] + bishopFiles[1]) % 2 === 1 &&
    !position.in_check() &&
    !position.game_over()
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
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
    if (
      typeof gameId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId)
    ) {
      return Response.json({ error: "A game ID is required" }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return Response.json({ error: "Invalid authentication token" }, { status: 401, headers: corsHeaders });
    }

    const { data: game, error: gameError } = await supabase
      .from("game_history")
      .select("id,user_id,mode,status,result,result_verified,room_code,player_color,initial_fen,current_fen,pgn,time_control,clock_ms,last_move_at,created_at")
      .eq("id", gameId)
      .eq("user_id", userData.user.id)
      .eq("mode", "private")
      .maybeSingle();

    if (gameError) {
      return Response.json({ error: gameError.message }, { status: 500, headers: corsHeaders });
    }
    if (!game) {
      return Response.json({ error: "Game not found" }, { status: 404, headers: corsHeaders });
    }
    if (game.status !== "in_progress") {
      if (game.result_verified && game.result) {
        return Response.json({ status: game.status, result: game.result }, { headers: corsHeaders });
      }
      return Response.json({ error: "Game is not active" }, { status: 409, headers: corsHeaders });
    }
    if (!game.room_code || !["w", "b"].includes(game.player_color)) {
      return Response.json({ error: "Private game metadata is incomplete" }, { status: 409, headers: corsHeaders });
    }

    const pgnInitialFen = game.pgn?.match(/^\[FEN "([^"]+)"\]$/m)?.[1];
    const initialFen =
      game.initial_fen ||
      pgnInitialFen ||
      (game.pgn ? new Chess().fen() : game.current_fen);
    const initialPosition = new Chess(initialFen);
    if (!isValidStartingPosition(initialPosition)) {
      return Response.json({ error: "The game did not start from a valid chess position" }, { status: 409, headers: corsHeaders });
    }
    const position = new Chess(initialFen);
    if (game.pgn) {
      const loaded = position.load_pgn(game.pgn);
      if (!loaded || position.fen() !== game.current_fen) {
        return Response.json({ error: "The saved move history is inconsistent" }, { status: 409, headers: corsHeaders });
      }
    } else if (position.fen() !== game.current_fen) {
      return Response.json({ error: "The saved board position is inconsistent" }, { status: 409, headers: corsHeaders });
    }

    let status: "completed" | "draw";
    let winningColor: "w" | "b" | null = null;
    let draw = false;
    if (position.in_checkmate()) {
      winningColor = position.turn() === "w" ? "b" : "w";
      status = "completed";
    } else if (position.in_draw()) {
      draw = true;
      status = "draw";
    } else {
      const timeControl = game.time_control || "unlimited";
      const timeControlMatch = /^(1|3|5|10)\+(0|2)$/.exec(timeControl);
      if (!timeControlMatch) {
        return Response.json({ error: "The game has not ended" }, { status: 409, headers: corsHeaders });
      }
      const baseTimeMs = Number(timeControlMatch[1]) * 60_000;
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
      const remainingMs = clocks[position.turn()] - Math.max(0, Date.now() - clockStartedAt);
      if (remainingMs > 0) {
        return Response.json({ error: "The game has not ended" }, { status: 409, headers: corsHeaders });
      }
      winningColor = position.turn() === "w" ? "b" : "w";
      status = "completed";
    }

    const { data: players, error: playersError } = await supabase
      .from("game_history")
      .select("id,user_id,player_color")
      .eq("room_code", game.room_code)
      .eq("mode", "private")
      .eq("status", "in_progress");
    if (playersError) {
      return Response.json({ error: playersError.message }, { status: 500, headers: corsHeaders });
    }
    if (
      players?.length !== 2 ||
      new Set(players.map((player) => player.player_color)).size !== 2 ||
      !players.some((player) => player.id === game.id && player.user_id === userData.user.id)
    ) {
      return Response.json({ error: "Both players must have active game records" }, { status: 409, headers: corsHeaders });
    }

    const { error: finishError } = await supabase.rpc("finish_private_game", {
      p_game_id: game.id,
      p_room_code: game.room_code,
      p_status: status,
      p_winning_color: winningColor,
      p_expected_fen: game.current_fen,
      p_expected_last_move_at: game.last_move_at,
    });
    if (finishError) {
      return Response.json({ error: finishError.message }, { status: 500, headers: corsHeaders });
    }

    return Response.json({
      status,
      result: draw ? "draw" : game.player_color === winningColor ? "win" : "loss",
      result_verified: true,
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500, headers: corsHeaders });
  }
});
