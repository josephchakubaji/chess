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
    const body = await req.json();
    if (!body?.date || !body?.fen || !Array.isArray(body.solution) || body.solution.length === 0) {
      return Response.json({ error: "date, fen, and solution are required" }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const row = {
      date: body.date,
      puzzle_id: body.puzzle_id || `daily_${body.date}`,
      source_puzzle_id: body.source_puzzle_id || null,
      title: body.title || "Daily Tactical Shot",
      category: body.category || "Advanced",
      goal: body.goal || "Find the best move!",
      fen: body.fen,
      solution: body.solution,
      hint: body.hint || null,
      rating: body.rating || null,
      themes: Array.isArray(body.themes) ? body.themes : [],
      source: body.source || "supabase",
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
