import { Octokit } from "octokit";

export type AuthToken = string | (() => string | Promise<string>);

/**
 * Everything a GitHub write/read helper needs: an authenticated client plus
 * the repository coordinates. Built by `createGitHubContextFactory` and
 * passed explicitly so the helpers stay free of module state.
 */
export interface GitHubContext {
    octokit: Octokit;
    owner: string;
    repo: string;
    branch: string;
}

export interface GitHubContextConfig {
    owner: string;
    repo: string;
    branch?: string;
    auth: AuthToken;
}

/**
 * Build a per-client factory that resolves the auth token and produces a
 * `GitHubContext`.
 *
 * A string token never changes, so the Octokit instance it produces is
 * created once and reused (this keeps Octokit's throttling/retry state warm
 * across calls). A function token is assumed to be a rotating credential —
 * an installation token, a refreshed OAuth token — so it is re-resolved on
 * every call and a fresh Octokit is built around the current value.
 */
export function createGitHubContextFactory(
    config: GitHubContextConfig,
): () => Promise<GitHubContext> {
    const branch = config.branch ?? "main";
    let cached: Octokit | undefined;

    return async () => {
        let octokit: Octokit;
        if (typeof config.auth === "string") {
            cached ??= new Octokit({ auth: config.auth });
            octokit = cached;
        } else {
            octokit = new Octokit({ auth: await config.auth() });
        }
        return { octokit, owner: config.owner, repo: config.repo, branch };
    };
}
