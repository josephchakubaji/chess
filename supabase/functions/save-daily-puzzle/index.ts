// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";
import { DailyPuzzleSourceError, fetchDailyPuzzleRow } from "../_shared/daily-puzzle.ts";

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

    const row = await fetchDailyPuzzleRow(body.date);

    const { data, error } = await supabase
      .from("daily_puzzles")
      .upsert(row, { onConflict: "date" })
      .select(puzzleColumns)
      .single();
    if (error) throw error;

    return Response.json({ puzzle: data, saved: true }, { headers: corsHeaders });
  } catch (error) {
    const status = error instanceof DailyPuzzleSourceError ? error.status : 500;
    return Response.json({ error: error?.message || String(error) }, { status, headers: corsHeaders });
  }
});
