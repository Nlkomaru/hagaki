interface Committer {
    name: string;
    email: string;
}
interface MakeCommitterInput {
    name: string;
    id?: string;
    email?: string;
    defaultEmail?: string;
    /**
     * Customize how the committer name is rendered.
     * Default: includes the id in parentheses when present, e.g. `"alice (uuid)"`.
     */
    nameFormat?: (input: {
        id?: string;
        name: string;
    }) => string;
}
declare function makeCommitter(input: MakeCommitterInput): Committer;

export { type Committer as C, makeCommitter as m };
