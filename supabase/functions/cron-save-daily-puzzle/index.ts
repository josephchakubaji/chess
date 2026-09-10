/**
 * cron-save-daily-puzzle
 *
 * Called by pg_cron at 23:45 UTC every day via pg_net.
 * Fetches the current Lichess daily puzzle and upserts it into daily_puzzles.
 * Uses the service-role key internally — no user session required.
 *
 * Requests must include the header:
 *   Authorization: Bearer <CRON_SECRET>
 * where CRON_SECRET is a Supabase secret set via:
 *   supabase secrets set CRON_SECRET=<random-value>
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { Chess } from "npm:chess.js@1.0.0";

const LICHESS_DAILY_API = "https://lichess.org/api/puzzle/daily";

type LichessDaily = {
  game?: {
    id?: string;
    fen?: string;
    pgn?: string;
  };
  puzzle?: {
    id?: string;
    rating?: number;
    solution?: string[];
    themes?: string[];
    fen?: string;
  };
};

function getInitialFen(data: LichessDaily): string | null {
  if (data.puzzle?.fen) return data.puzzle.fen;
  if (data.game?.fen) return data.game.fen;
  if (!data.game?.pgn) return null;
  try {
    const chess = new Chess();
    chess.loadPgn(data.game.pgn);
    return chess.fen();
  } catch (_e) {
    return null;
  }
}

function buildPlayerPosition(
  initialFen: string,
  solution: string[],
): { cleanFen: string; playerSolution: string[] } {
  const chess = new Chess();
  chess.load(initialFen);

  let playerFen = initialFen;
  let playerSolution = solution;

  // solution[0] is the opponent's setup move — apply it so the board is at the
  // player's turn before we record the position.
  if (solution.length > 1) {
    const setupMove = solution[0];
    try {
      const move = chess.move({
        from: setupMove.slice(0, 2),
        to: setupMove.slice(2, 4),
        promotion: setupMove[4] || "q",
      });
      if (move) {
        playerFen = chess.fen();
        playerSolution = solution.slice(1);
      }
    } catch (_e) {
      try {
        const move = chess.move(setupMove);
        if (move) {
          playerFen = chess.fen();
          playerSolution = solution.slice(1);
        }
      } catch (_e2) {
        // keep original FEN
      }
    }
  }

  const cleanFen = `${playerFen.split(" ").slice(0, 4).join(" ")} 0 1`;
  return { cleanFen, playerSolution };
}

Deno.serve(async (req) => {
  // Only allow POST and the internal cron ping
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Authenticate the cron caller using a shared secret
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (token !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check if we already have today's puzzle saved
    const { data: existing } = await supabase
      .from("daily_puzzles")
      .select("date,puzzle_id")
      .eq("date", todayKey)
      .eq("source", "lichess-api")
      .maybeSingle();

    if (existing) {
      return Response.json({
        message: "Puzzle already saved for today",
        date: todayKey,
        puzzle_id: existing.puzzle_id,
        saved: false,
      });
    }

    // Fetch from Lichess
    const lichessRes = await fetch(LICHESS_DAILY_API, {
      headers: { Accept: "application/json" },
    });

    if (!lichessRes.ok) {
      return Response.json(
        { error: `Lichess API returned ${lichessRes.status}` },
        { status: 502 },
      );
    }

    const data = (await lichessRes.json()) as LichessDaily;
    const initialFen = getInitialFen(data);
    const solution = data.puzzle?.solution || [];

    if (!initialFen || !solution.length) {
      return Response.json(
        { error: "Lichess payload was incomplete — no FEN or solution" },
        { status: 502 },
      );
    }

    const { cleanFen, playerSolution } = buildPlayerPosition(initialFen, solution);
    const firstTheme = data.puzzle?.themes?.[0];

    const row = {
      date: todayKey,
      puzzle_id: `lichess_daily_${todayKey}_${data.puzzle?.id || "api"}`,
      source_puzzle_id: data.puzzle?.id || null,
      title: `Daily: ${
        firstTheme ? firstTheme.replace(/([A-Z])/g, " $1") : "Tactical Shot"
      }`,
      category: "Advanced",
      goal: `${
        cleanFen.split(" ")[1] === "w" ? "White" : "Black"
      } to move: Find the best tactical move!`,
      fen: cleanFen,
      solution: playerSolution,
      hint: `Daily puzzle rating: ${
        data.puzzle?.rating || 1500
      }. Focus on the strongest tactical forcing move!`,
      rating: data.puzzle?.rating || null,
      themes: data.puzzle?.themes || [],
      source: "lichess-api",
    };

    const { data: saved, error } = await supabase
      .from("daily_puzzles")
      .upsert([row], { onConflict: "date" })
      .select("date,puzzle_id,rating")
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      message: "Daily puzzle saved successfully",
      date: todayKey,
      puzzle_id: (saved || row).puzzle_id,
      rating: data.puzzle?.rating || null,
      saved: true,
    });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
});
