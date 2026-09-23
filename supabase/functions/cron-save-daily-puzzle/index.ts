/**
 * Verifies that today's row exists in public.daily_puzzles.
 * Puzzle creation is owned by Supabase data imports or the save endpoint;
 * this job never calls an external puzzle API.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

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
  const { data, error } = await createClient(supabaseUrl, serviceRoleKey)
    .from("daily_puzzles")
    .select("date,puzzle_id")
    .eq("date", date)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ date, puzzle_id: data?.puzzle_id || null, exists: Boolean(data) });
});
