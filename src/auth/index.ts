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
