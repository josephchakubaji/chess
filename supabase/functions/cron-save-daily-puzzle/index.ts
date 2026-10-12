/**
 * Archives today's Lichess daily puzzle if it has not been saved yet.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { cleanupExpiredUnverifiedUsers } from "../_shared/cleanup-unverified-signups.ts";
import { DailyPuzzleSourceError, fetchDailyPuzzleRow } from "../_shared/daily-puzzle.ts";

function hasValidSolution(solution: unknown) {
  let moves = solution;
  if (typeof moves === "string") {
    try {
      moves = JSON.parse(moves);
    } catch {
      return false;
    }
  }
  return Array.isArray(moves) && moves.length >= 4 && moves.length <= 6;
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!cronSecret || token !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }

  const date = new Date().toISOString().slice(0, 10);
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const removedUnverifiedUsers = await cleanupExpiredUnverifiedUsers(supabase);
  const { data: existingPuzzle, error: lookupError } = await supabase
    .from("daily_puzzles")
    .select("date,puzzle_id,solution")
    .eq("date", date)
    .maybeSingle();

  if (lookupError) return Response.json({ error: lookupError.message }, { status: 500 });

  let puzzleId = existingPuzzle?.puzzle_id || null;
  let saved = false;
  if (!hasValidSolution(existingPuzzle?.solution)) {
    let row;
    try {
      row = await fetchDailyPuzzleRow(date);
    } catch (error) {
      const status = error instanceof DailyPuzzleSourceError ? error.status : 500;
      return Response.json({ error: error?.message || String(error) }, { status });
    }

    const { data: savedPuzzle, error: saveError } = await supabase
      .from("daily_puzzles")
      .upsert(row, { onConflict: "date" })
      .select("date,puzzle_id")
      .single();
    if (saveError) return Response.json({ error: saveError.message }, { status: 500 });
    puzzleId = savedPuzzle.puzzle_id;
    saved = true;
  }

  return Response.json({
    date,
    puzzle_id: puzzleId,
    exists: Boolean(puzzleId),
    saved,
    removed_unverified_users: removedUnverifiedUsers,
  });
});
