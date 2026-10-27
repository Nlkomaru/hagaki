import { type Committer, makeCommitter } from "./index.js";

/**
 * Claims an OAuth/OIDC userinfo response may carry. The OIDC standard names
 * are listed; anything else is reachable through the index signature, which is
 * what {@link mapOAuthProfile}'s `idClaims` / `nameClaims` read.
 */
export interface OAuthProfile extends Record<string, unknown> {
    sub?: string;
    preferred_username?: string;
    name?: string;
    picture?: string;
    email?: string;
}

export interface MapOAuthProfileOptions {
    /**
     * Claim names to try, in order, for the stable identity. The OIDC `sub` is
     * always tried last, so listing a provider-specific claim here lets it win
     * without losing the standard fallback.
     */
    idClaims?: readonly string[];
    /** Claim names to try, in order, for the display name. */
    nameClaims?: readonly string[];
    /**
     * Build an avatar URL from the resolved id. Providers that serve avatars
     * off the identity (a game UUID, a gravatar hash) plug in here instead of
     * hagaki knowing about any of them.
     */
    avatarUrl?: (id: string) => string;
}

/**
 * Identity mapped out of an OAuth profile, ready to hand to an auth library.
 *
 * `id` is the provider's stable identifier rather than one the auth library
 * invents. That matters for DB-less setups: a generated id changes on every
 * login, so anything stored against it in content (authors, owners, locks)
 * stops matching. Keeping the provider's id makes those references durable.
 */
export interface MappedOAuthUser {
    id: string;
    name?: string;
    image?: string;
}

function firstString(
    profile: OAuthProfile,
    claims: readonly string[],
): string | undefined {
    for (const claim of claims) {
        const value = profile[claim];
        if (typeof value === "string" && value.length > 0) return value;
    }
    return undefined;
}

/**
 * Map an OAuth/OIDC userinfo response onto a user record. Pure — no auth
 * library is imported, so the result fits better-auth's `mapProfileToUser` or
 * any equivalent hook.
 */
export function mapOAuthProfile(
    profile: OAuthProfile,
    options?: MapOAuthProfileOptions,
): MappedOAuthUser {
    const id =
        firstString(profile, [...(options?.idClaims ?? []), "sub"]) ?? "";
    const name = firstString(profile, [
        ...(options?.nameClaims ?? []),
        "preferred_username",
        "name",
    ]);
    const image = id ? options?.avatarUrl?.(id) : undefined;
    return { id, name, image: image ?? profile.picture };
}

/**
 * Structural type for any session that looks like a better-auth session.
 * We deliberately avoid importing from `better-auth` so consumers using
 * other auth solutions can still pass compatible session objects.
 */
export interface BetterAuthLikeSession {
    user?: {
        id?: string | null;
        name?: string | null;
        email?: string | null;
    } | null;
}

/**
 * The user id hagaki records for a better-auth session: `session.user.id`,
 * verbatim. This is the value that ends up in the committer name, and so in
 * the generated `userId` fields (`info.json` history, `article.json`
 * `editors`, `PathCommit.userId`), and the value an app should put in a post's
 * frontmatter `editor` list. Compare against it to answer "did this user
 * edit / may this user edit".
 *
 * hagaki doesn't know what the id is (an OIDC `sub`, a database key, a game
 * account id) — only that it should be stable across logins. In DB-less
 * setups, make sure the auth library keeps the provider's id as
 * `session.user.id` (see {@link MappedOAuthUser}) or every login gets a new
 * one. `null` when the session has no user or an empty id.
 */
export function userIdFromSession(
    session: BetterAuthLikeSession | null | undefined,
): string | null {
    return session?.user?.id || null;
}

export interface CommitterFromBetterAuthOptions {
    /** Fallback when the session user has no email. */
    defaultEmail?: string;
    /** Override committer name formatting. */
    nameFormat?: (input: { id?: string; name: string }) => string;
}

/**
 * Build a `Committer` from a better-auth session (or any object with the same
 * `user` shape). The committer name embeds {@link userIdFromSession} as
 * `"<name> (<id>)"`, which is how the history recovers who made each commit
 * (`userIdFromCommitterName`). Returns `undefined` if the session lacks a
 * usable name or email; throws if the id can't be carried by the default
 * name format (it contains parentheses, whitespace, `<`, `>` or control
 * characters).
 */
export function committerFromBetterAuth(
    session: BetterAuthLikeSession | null | undefined,
    options?: CommitterFromBetterAuthOptions,
): Committer | undefined {
    const user = session?.user;
    if (!user) return undefined;
    const name = user.name ?? undefined;
    if (!name) return undefined;
    const email = user.email ?? options?.defaultEmail;
    if (!email) return undefined;
    return makeCommitter({
        name,
        id: userIdFromSession(session) ?? undefined,
        email,
        nameFormat: options?.nameFormat,
    });
}
