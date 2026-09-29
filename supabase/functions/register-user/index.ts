import { createClient } from "npm:@supabase/supabase-js@2";
import { cleanupExpiredUnverifiedUsers } from "../_shared/cleanup-unverified-signups.ts";

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
  const localPart = email.slice(0, atIndex).split("+")[0];
  const domain = email.slice(atIndex + 1);
  return `${localPart}@${domain}`;
}

function normalizeEmailClaim(email: string) {
  const atIndex = email.lastIndexOf("@");
  if (atIndex < 1) return email;
  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${localPart.replace(/\./g, "")}@gmail.com`;
  }
  return email;
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
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !serviceRoleKey || !publicKey) {
    return Response.json({ error: "Missing Supabase service configuration" }, { status: 500, headers });
  }

  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const emailClaim = normalizeEmailClaim(email);
    const password = typeof body.password === "string" ? body.password : "";
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const error = validationError(email, password, displayName);
    if (error) return Response.json({ error }, { status: 400, headers });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await cleanupExpiredUnverifiedUsers(admin);

    const { error: claimError } = await admin
      .from("auth_email_claims")
      .insert({ email: emailClaim });
    if (claimError) {
      if (claimError.code === "23505") {
        return Response.json(
          { error: "An account already exists for this email address." },
          { status: 409, headers },
        );
      }
      throw claimError;
    }

    const publicClient = createClient(supabaseUrl, publicKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error: createError } = await publicClient.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (createError || !data.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) {
      await admin.from("auth_email_claims").delete().eq("email", emailClaim);
      if (!createError && data.user?.identities?.length === 0) {
        return Response.json(
          { error: "An account already exists for this email address." },
          { status: 409, headers },
        );
      }
      return Response.json(
        { error: createError?.message || "Could not create account" },
        { status: createError?.status || 500, headers },
      );
    }

    if (data.session) {
      await admin.auth.admin.deleteUser(data.user.id);
      await admin.from("auth_email_claims").delete().eq("email", emailClaim);
      return Response.json(
        { error: "Email verification is disabled in Supabase Auth. Enable Confirm email before registering." },
        { status: 503, headers },
      );
    }

    return Response.json(
      { confirmationRequired: true, email: data.user.email },
      { status: 201, headers },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers },
    );
  }
});
