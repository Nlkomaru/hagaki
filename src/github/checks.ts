import type { CheckRun, CommitStatus } from "../types.js";
import type { GitHubContext } from "./octokit.js";

const CONCLUSIONS = new Set([
    "success",
    "failure",
    "neutral",
    "cancelled",
    "skipped",
    "timed_out",
    "action_required",
]);

/** Conclusions that make the aggregate state `"failure"`. */
const FAILING = new Set([
    "failure",
    "cancelled",
    "timed_out",
    "action_required",
]);

function normalizeStatus(status: string): CheckRun["status"] {
    if (status === "completed" || status === "in_progress") return status;
    // `waiting` / `requested` / `pending` all mean "hasn't started yet".
    return "queued";
}

function normalizeConclusion(
    conclusion: string | null,
): CheckRun["conclusion"] {
    if (conclusion === null) return null;
    if (CONCLUSIONS.has(conclusion))
        return conclusion as CheckRun["conclusion"];
    // GitHub can introduce new conclusions (`stale`, `startup_failure`, …).
    // Bucket anything we don't recognize as a failure: reporting green for a
    // state we cannot interpret is the one wrong answer here.
    return "failure";
}

function aggregate(checks: CheckRun[]): CommitStatus["state"] {
    if (checks.length === 0) return "none";
    // Order matters: a failure outranks an in-flight run.
    if (checks.some((c) => c.conclusion && FAILING.has(c.conclusion))) {
        return "failure";
    }
    if (checks.some((c) => c.status !== "completed" || c.conclusion === null)) {
        return "pending";
    }
    return "success";
}

/**
 * Fetch a commit together with its check runs, flattened into a single typed
 * status the UI can render without touching GitHub's raw payloads.
 */
export async function getCommitStatus(
    ctx: GitHubContext,
    sha: string,
): Promise<CommitStatus> {
    const { octokit, owner, repo } = ctx;
    const { data: commit } = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: sha,
    });
    const { data: checkRuns } = await octokit.rest.checks.listForRef({
        owner,
        repo,
        ref: sha,
        per_page: 100,
    });

    const checks: CheckRun[] = checkRuns.check_runs.map((run) => ({
        name: run.name,
        status: normalizeStatus(run.status),
        conclusion: normalizeConclusion(run.conclusion),
        detailsUrl: run.details_url ?? null,
    }));

    return {
        sha: commit.sha,
        message: commit.commit.message,
        htmlUrl: commit.html_url,
        // The git author (what `savePost` writes from a `Committer`), not the
        // linked GitHub account — that one is null for unmatched emails.
        authorName: commit.commit.author?.name ?? null,
        authoredAt: commit.commit.author?.date ?? null,
        checks,
        state: aggregate(checks),
    };
}
