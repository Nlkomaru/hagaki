export interface Committer {
    name: string;
    email: string;
}

export interface MakeCommitterInput {
    name: string;
    id?: string;
    email?: string;
    defaultEmail?: string;
    /**
     * Customize how the committer name is rendered.
     * Default: includes the id in parentheses when present, e.g. `"alice (uuid)"`.
     */
    nameFormat?: (input: { id?: string; name: string }) => string;
}

const defaultNameFormat = (input: { id?: string; name: string }) =>
    input.id ? `${input.name} (${input.id})` : input.name;

export function makeCommitter(input: MakeCommitterInput): Committer {
    const email = input.email ?? input.defaultEmail;
    if (!email) {
        throw new Error(
            "hagaki: makeCommitter requires either `email` or `defaultEmail`",
        );
    }
    const formatter = input.nameFormat ?? defaultNameFormat;
    return {
        name: formatter({ id: input.id, name: input.name }),
        email,
    };
}

/**
 * Structural shape shared by better-auth, next-auth and friends. Declared
 * here rather than imported so hagaki never depends on a specific auth
 * library — anything with a matching `user` object works.
 */
export interface SessionLike {
    user?: {
        id?: string | null;
        name?: string | null;
        email?: string | null;
    } | null;
}

export interface CommitterFromSessionOptions {
    /** Fallback when the session user has no email. */
    defaultEmail?: string;
    /** Override committer name formatting. */
    nameFormat?: (input: { id?: string; name: string }) => string;
}

/**
 * Build a `Committer` from an authenticated session. Returns `undefined`
 * when the session has no usable name or email, so callers can fall back to
 * the token's own identity.
 */
export function committerFromSession(
    session: SessionLike | null | undefined,
    options?: CommitterFromSessionOptions,
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
