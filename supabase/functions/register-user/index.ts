import { createClient } from "npm:@supabase/supabase-js@2";

const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const EMOJI_PATTERN = /\p{Extended_Pictographic}/u;

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function normalizeEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  const atIndex = email.lastIndexOf("@");
  if (atIndex < 1) return email;
  return `${email.slice(0, atIndex).split("+")[0]}@${email.slice(atIndex + 1)}`;
}

function validationError(email: string, password: string, displayName: string) {
  if (!EMAIL_PATTERN.test(email)) return "Use a valid email address with standard ASCII characters only.";
  if (EMOJI_PATTERN.test(email)) return "Emoji characters cannot be used in an email address.";
  if (EMOJI_PATTERN.test(password)) return "Emoji characters cannot be used in a password.";
  if (EMOJI_PATTERN.test(displayName)) return "Emoji characters cannot be used in a display name.";
  if (!displayName || displayName.length > 40) return "Display name must be between 1 and 40 characters.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Missing Supabase service configuration" }, { status: 500, headers });
  }

  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const error = validationError(email, password, displayName);
    if (error) return Response.json({ error }, { status: 400, headers });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: claimError } = await admin
      .from("auth_email_claims")
      .insert({ email });
    if (claimError) {
      if (claimError.code === "23505") {
        return Response.json(
          { error: "An account already exists for this email address." },
          { status: 409, headers },
        );
      }
      throw claimError;
    }

    const { data, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    if (createError || !data.user) {
      await admin.from("auth_email_claims").delete().eq("email", email);
      return Response.json(
        { error: createError?.message || "Could not create account" },
        { status: createError?.status || 500, headers },
      );
    }

    return Response.json({ user: data.user }, { status: 201, headers });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers },
    );
  }
});
