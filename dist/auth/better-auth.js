import { t as makeCommitter } from "../auth-BYua3t8y.js";
//#region src/auth/better-auth.ts
function firstString(profile, claims) {
	for (const claim of claims) {
		const value = profile[claim];
		if (typeof value === "string" && value.length > 0) return value;
	}
}
/**
* Map an OAuth/OIDC userinfo response onto a user record. Pure — no auth
* library is imported, so the result fits better-auth's `mapProfileToUser` or
* any equivalent hook.
*/
function mapOAuthProfile(profile, options) {
	const id = firstString(profile, [...options?.idClaims ?? [], "sub"]) ?? "";
	return {
		id,
		name: firstString(profile, [
			...options?.nameClaims ?? [],
			"preferred_username",
			"name"
		]),
		image: (id ? options?.avatarUrl?.(id) : void 0) ?? profile.picture
	};
}
/**
* Build a `Committer` from a better-auth session (or any object with the same
* `user` shape). Returns `undefined` if the session lacks a usable name.
*/
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
//#endregion
export { committerFromBetterAuth, mapOAuthProfile };

//# sourceMappingURL=better-auth.js.map