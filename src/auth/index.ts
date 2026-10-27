export interface Committer {
    name: string;
    email: string;
}

export interface MakeCommitterInput {
    name: string;
    /**
     * Stable user id to embed in the committer name — whatever the app uses as
     * the user's identity (typically better-auth's `session.user.id`). hagaki
     * doesn't interpret it; it only has to survive the round trip through
     * git and {@link userIdFromCommitterName}, so with the default format it
     * must not contain parentheses, whitespace, `<`, `>` or control characters.
     */
    id?: string;
    email?: string;
    defaultEmail?: string;
    /**
     * Customize how the committer name is rendered.
     * Default: includes the id in parentheses when present, e.g. `"alice (id)"`.
     * A custom format is not understood by {@link userIdFromCommitterName}, so
     * the generated history won't carry a `userId` for those commits.
     */
    nameFormat?: (input: { id?: string; name: string }) => string;
}

/**
 * An id the default committer-name format can carry: non-empty, with no
 * parentheses, whitespace, `<`, `>` or control characters. Parentheses and
 * whitespace would make the trailing `" (<id>)"` group ambiguous to parse
 * back, and git strips `<` / `>` from ident names (they delimit the email),
 * so such an id would not read back unchanged from `git log`.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are rejected on purpose
const COMMITTER_ID = /^[^()<>\s\x00-\x1f\x7f]+$/;

/** Trailing `" (<id>)"` group written by {@link defaultNameFormat}. */
// biome-ignore lint/suspicious/noControlCharactersInRegex: same character set as COMMITTER_ID
const COMMITTER_ID_SUFFIX = /\(([^()<>\s\x00-\x1f\x7f]+)\)$/;

const defaultNameFormat = (input: { id?: string; name: string }) => {
    if (!input.id) return input.name;
    if (!COMMITTER_ID.test(input.id)) {
        throw new Error(
            `hagaki: committer id "${input.id}" can't contain parentheses, whitespace, '<', '>' or control characters`,
        );
    }
    return `${input.name} (${input.id})`;
};

/**
 * Recover the user id from a committer name written by {@link makeCommitter}'s
 * default format, `"<name> (<id>)"` — the id is the last parenthesized group
 * at the very end of the name. It is the exact inverse of that format: for any
 * `id` the format accepts, `userIdFromCommitterName(format({ name, id }))`
 * returns `id` unchanged.
 *
 * `null` for any other name (commits made outside hagaki, or a custom
 * `nameFormat`). Note that a committer made *without* an id whose display name
 * itself ends in `"(<token>)"` is indistinguishable from one with an id, and
 * reads back as `<token>`.
 */
export function userIdFromCommitterName(name: string): string | null {
    return COMMITTER_ID_SUFFIX.exec(name.trimEnd())?.[1] ?? null;
}

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
