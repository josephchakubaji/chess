// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";
import { Chess } from "npm:chess.js@1.0.0";

const LICHESS_DAILY_API = "https://lichess.org/api/puzzle/daily";

function normalizeOrigin(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";

  try {
    return new URL(trimmed).origin;
  } catch (_error) {
    return trimmed;
  }
}

function getCorsHeaders(origin: string | null) {
  const normalizedOrigin = origin ? normalizeOrigin(origin) : null;

  return {
    "Access-Control-Allow-Origin": normalizedOrigin || "*",
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, accept, origin, x-requested-with",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

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

function getInitialFen(data: LichessDaily) {
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

function buildPlayerPosition(initialFen: string, solution: string[]) {
  const chess = new Chess();
  chess.load(initialFen);

  let playerFen = initialFen;
  let playerSolution = solution;

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
      } catch (_e2) {}
    }
  }

  const cleanFen = `${playerFen.split(" ").slice(0, 4).join(" ")} 0 1`;
  return { cleanFen, playerSolution };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    if (req.method !== "POST" && req.method !== "GET") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405, headers: corsHeaders },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return Response.json(
        { error: "Missing Supabase service configuration" },
        { status: 500, headers: corsHeaders },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const authorization = req.headers.get("Authorization");
    const accessToken = authorization?.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401, headers: corsHeaders },
      );
    }
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return Response.json(
        { error: "Invalid authentication token" },
        { status: 401, headers: corsHeaders },
      );
    }

    // Parse optional client-provided puzzle payload.
    // The client can send: { date?, puzzle_id?, source_puzzle_id?, title?, category?,
    //   goal?, fen, solution, hint?, rating?, themes? }
    // When `fen` + `solution` are present the edge function skips the Lichess fetch
    // and uses the client data directly — which lets past dates be saved as well.
    let clientRow: Record<string, unknown> | null = null;
    let targetDate = new Date().toISOString().slice(0, 10);

    if (req.method === "POST") {
      try {
        const body = await req.json().catch(() => ({}));
        if (
          body &&
          typeof body.fen === "string" &&
          body.fen.length > 0 &&
          Array.isArray(body.solution) &&
          body.solution.length > 0
        ) {
          // Validate the date field if present
          if (body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
            targetDate = body.date;
          }
          clientRow = {
            date: targetDate,
            puzzle_id:
              body.puzzle_id ||
              `lichess_daily_${targetDate}_${body.source_puzzle_id || "api"}`,
            source_puzzle_id: body.source_puzzle_id ?? null,
            title: body.title || "Daily Tactical Shot",
            category: body.category || "Advanced",
            goal: body.goal || "Find the best move!",
            fen: body.fen,
            solution: body.solution,
            hint: body.hint ?? null,
            rating: body.rating ?? null,
            themes: Array.isArray(body.themes) ? body.themes : [],
            source: "lichess-api",
          };
        }
      } catch (_e) {
        // ignore — fall through to Lichess fetch
      }
    }

    // Check if a record already exists for this date
    const { data: existing } = await supabase
      .from("daily_puzzles")
      .select(
        "date,puzzle_id,source_puzzle_id,title,category,goal,fen,solution,hint,rating,themes,source",
      )
      .eq("date", targetDate)
      .eq("source", "lichess-api")
      .maybeSingle();

    // If a record exists and we have no new client data to force an update, return it
    if (existing && !clientRow) {
      return Response.json(
        { puzzle: existing, saved: false },
        { headers: corsHeaders },
      );
    }

    let row = clientRow;

    if (!row) {
      // No client payload — fetch fresh from Lichess (only returns today's puzzle)
      const lichessRes = await fetch(LICHESS_DAILY_API, {
        headers: { Accept: "application/json" },
      });

      if (!lichessRes.ok) {
        return Response.json(
          { error: "Could not fetch Lichess daily puzzle" },
          { status: 502, headers: corsHeaders },
        );
      }

      const data = (await lichessRes.json()) as LichessDaily;
      const initialFen = getInitialFen(data);
      const solution = data.puzzle?.solution || [];

      if (!initialFen || !solution.length) {
        return Response.json(
          { error: "Lichess daily puzzle payload was incomplete" },
          { status: 502, headers: corsHeaders },
        );
      }

      const { cleanFen, playerSolution } = buildPlayerPosition(initialFen, solution);
      const firstTheme = data.puzzle?.themes?.[0];

      row = {
        date: targetDate,
        puzzle_id: `lichess_daily_${targetDate}_${data.puzzle?.id || "api"}`,
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
    }

    // Save/upsert to Supabase daily_puzzles table
    const { data: saved, error } = await supabase
      .from("daily_puzzles")
      .upsert([row], { onConflict: "date" })
      .select(
        "date,puzzle_id,source_puzzle_id,title,category,goal,fen,solution,hint,rating,themes,source",
      )
      .maybeSingle();

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500, headers: corsHeaders },
      );
    }

    return Response.json(
      { puzzle: saved || row, saved: true },
      { headers: corsHeaders },
    );
  } catch (err: any) {
    return Response.json(
      { error: err?.message || String(err) },
      { status: 500, headers: corsHeaders },
    );
  }
});