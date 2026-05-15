import type { Octokit } from "octokit";
import type { CommitWithChecks } from "./types.js";

export interface CommitsDeps {
    octokit: Octokit;
    owner: string;
    repo: string;
}

export async function getCommitWithChecks(
    deps: CommitsDeps,
    commitSha: string,
): Promise<CommitWithChecks> {
    const { octokit, owner, repo } = deps;
    const commit = await octokit.request(
        "GET /repos/{owner}/{repo}/commits/{ref}",
        { owner, repo, ref: commitSha },
    );
    const checks = await octokit.request(
        "GET /repos/{owner}/{repo}/commits/{ref}/check-runs",
        { owner, repo, ref: commitSha },
    );
    return { commit: commit.data, checks: checks.data };
}
