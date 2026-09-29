export async function cleanupExpiredUnverifiedUsers(supabase: any) {
  const cutoff = Date.now() - 30 * 60 * 1000;
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;

    const pageUsers = data?.users || [];
    users.push(...pageUsers);
    if (pageUsers.length < 1000) break;
    page += 1;
  }

  const expiredUsers = users.filter(
    (user) =>
      user.email &&
      !user.email_confirmed_at &&
      Date.parse(user.created_at) < cutoff,
  );
  const deletedUserIds = new Set<string>();
  const expiredClaimEmails = new Set<string>();

  for (const user of expiredUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw error;
    deletedUserIds.add(user.id);
    expiredClaimEmails.add(normalizeEmailClaim(user.email));
  }

  const retainedClaimEmails = new Set(
    users
      .filter((user) => !deletedUserIds.has(user.id) && user.email)
      .map((user) => normalizeEmailClaim(user.email)),
  );
  const { data: claims, error: claimsError } = await supabase
    .from("auth_email_claims")
    .select("email,created_at");
  if (claimsError) throw claimsError;

  const staleClaims = (claims || [])
    .filter(
      (claim) =>
        !retainedClaimEmails.has(claim.email) &&
        (expiredClaimEmails.has(claim.email) || Date.parse(claim.created_at) < cutoff),
    )
    .map((claim) => claim.email);

  if (staleClaims.length) {
    const { error } = await supabase
      .from("auth_email_claims")
      .delete()
      .in("email", staleClaims);
    if (error) throw error;
  }

  return deletedUserIds.size;
}

function normalizeEmailClaim(value: string) {
  const email = value.trim().toLowerCase();
  const atIndex = email.lastIndexOf("@");
  if (atIndex < 1) return email;

  const localPart = email.slice(0, atIndex).split("+")[0];
  const domain = email.slice(atIndex + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${localPart.replace(/\./g, "")}@gmail.com`;
  }
  return `${localPart}@${domain}`;
}