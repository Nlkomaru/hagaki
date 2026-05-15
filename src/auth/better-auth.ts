import { type Committer, makeCommitter } from "./index.js";

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

export interface CommitterFromBetterAuthOptions {
    /** Fallback when the session user has no email. */
    defaultEmail?: string;
    /** Override committer name formatting. */
    nameFormat?: (input: { id?: string; name: string }) => string;
}

/**
 * Build a `Committer` from a better-auth session (or any object with the same
 * `user` shape). Returns `undefined` if the session lacks a usable name.
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
        id: user.id ?? undefined,
        email,
        nameFormat: options?.nameFormat,
    });
}
