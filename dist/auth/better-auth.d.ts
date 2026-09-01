import { C as Committer } from '../index-CSJ3CBj7.js';

/**
 * Claims an OAuth/OIDC userinfo response may carry. The OIDC standard names
 * are listed; anything else is reachable through the index signature, which is
 * what {@link mapOAuthProfile}'s `idClaims` / `nameClaims` read.
 */
interface OAuthProfile extends Record<string, unknown> {
    sub?: string;
    preferred_username?: string;
    name?: string;
    picture?: string;
    email?: string;
}
interface MapOAuthProfileOptions {
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
interface MappedOAuthUser {
    id: string;
    name?: string;
    image?: string;
}
/**
 * Map an OAuth/OIDC userinfo response onto a user record. Pure — no auth
 * library is imported, so the result fits better-auth's `mapProfileToUser` or
 * any equivalent hook.
 */
declare function mapOAuthProfile(profile: OAuthProfile, options?: MapOAuthProfileOptions): MappedOAuthUser;
/**
 * Structural type for any session that looks like a better-auth session.
 * We deliberately avoid importing from `better-auth` so consumers using
 * other auth solutions can still pass compatible session objects.
 */
interface BetterAuthLikeSession {
    user?: {
        id?: string | null;
        name?: string | null;
        email?: string | null;
    } | null;
}
interface CommitterFromBetterAuthOptions {
    /** Fallback when the session user has no email. */
    defaultEmail?: string;
    /** Override committer name formatting. */
    nameFormat?: (input: {
        id?: string;
        name: string;
    }) => string;
}
/**
 * Build a `Committer` from a better-auth session (or any object with the same
 * `user` shape). Returns `undefined` if the session lacks a usable name.
 */
declare function committerFromBetterAuth(session: BetterAuthLikeSession | null | undefined, options?: CommitterFromBetterAuthOptions): Committer | undefined;

export { type BetterAuthLikeSession, type CommitterFromBetterAuthOptions, type MapOAuthProfileOptions, type MappedOAuthUser, type OAuthProfile, committerFromBetterAuth, mapOAuthProfile };
