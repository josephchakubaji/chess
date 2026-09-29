// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const puzzleColumns =
  "date,puzzle_id,source_puzzle_id,title,category,goal,fen,solution,hint,rating,themes,source";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Missing Supabase service configuration" }, { status: 500, headers: corsHeaders });
  }

  try {
    const accessToken = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return Response.json({ error: "Authentication required" }, { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return Response.json({ error: "Invalid authentication token" }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body?.date || "")) {
      return Response.json({ error: "A valid date is required" }, { status: 400, headers: corsHeaders });
    }

    const sourceResponse = await fetch("https://lichess.org/api/puzzle/daily", {
      headers: { Accept: "application/json" },
    });
    if (!sourceResponse.ok) {
      return Response.json({ error: "Unable to fetch today's puzzle" }, { status: 502, headers: corsHeaders });
    }

    const sourceData = await sourceResponse.json();
    const sourcePuzzle = sourceData?.puzzle;
    const solution = sourcePuzzle?.solution;
    if (
      !sourcePuzzle?.id || !sourcePuzzle?.fen || !Array.isArray(solution) ||
      solution.length < 4 || solution.length > 6 ||
      solution.some((move) => typeof move !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))
    ) {
      return Response.json({ error: "Today's source puzzle is not a 2-3 move line" }, { status: 422, headers: corsHeaders });
    }

    const themes = Array.isArray(sourcePuzzle.themes) ? sourcePuzzle.themes : [];
    const themeTitle = themes[0]
      ? themes[0].replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())
      : "Tactical Challenge";
    const moveCount = Math.ceil(solution.length / 2);
    const row = {
      date: body.date,
      puzzle_id: `daily_${body.date}_${sourcePuzzle.id}`,
      source_puzzle_id: sourcePuzzle.id,
      title: `Daily: ${themeTitle}`,
      category: "Advanced",
      goal: `Find the best line in ${moveCount} moves.`,
      fen: sourcePuzzle.fen,
      solution,
      hint: "Look for forcing checks, captures, and threats. Calculate the full line.",
      rating: sourcePuzzle.rating || null,
      themes,
      source: "lichess",
    };

    const { data, error } = await supabase
      .from("daily_puzzles")
      .upsert(row, { onConflict: "date" })
      .select(puzzleColumns)
      .single();
    if (error) throw error;

    return Response.json({ puzzle: data, saved: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500, headers: corsHeaders });
  }
});
