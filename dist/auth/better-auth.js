import { makeCommitter } from '../chunk-Z2DKOU4M.js';

// src/auth/better-auth.ts
function firstString(profile, claims) {
  for (const claim of claims) {
    const value = profile[claim];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return void 0;
}
function mapOAuthProfile(profile, options) {
  const id = firstString(profile, [...options?.idClaims ?? [], "sub"]) ?? "";
  const name = firstString(profile, [
    ...options?.nameClaims ?? [],
    "preferred_username",
    "name"
  ]);
  const image = id ? options?.avatarUrl?.(id) : void 0;
  return { id, name, image: image ?? profile.picture };
}
function committerFromBetterAuth(session, options) {
  const user = session?.user;
  if (!user) return void 0;
  const name = user.name ?? void 0;
  if (!name) return void 0;
  const email = user.email ?? options?.defaultEmail;
  if (!email) return void 0;
  return makeCommitter({
    name,
    id: user.id ?? void 0,
    email,
    nameFormat: options?.nameFormat
  });
}

export { committerFromBetterAuth, mapOAuthProfile };
//# sourceMappingURL=better-auth.js.map
//# sourceMappingURL=better-auth.js.map