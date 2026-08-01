import { env } from "cloudflare:workers";
import { createHagakiClient, type HagakiClient } from "hagaki";
import { getOptionalStringEnv } from "./server-env";

let cached: HagakiClient | null = null;

/**
 * Server-side hagaki client. Reads config from Cloudflare Worker env bindings
 * (wrangler.jsonc `vars` / `.dev.vars` / `wrangler secret put`):
 * - HAGAKI_GITHUB_OWNER
 * - HAGAKI_GITHUB_REPO
 * - HAGAKI_GITHUB_BRANCH (optional, default "main")
 * - HAGAKI_GITHUB_CONTENT_PATH (optional, default "content/article")
 * - HAGAKI_GITHUB_TOKEN
 * - HAGAKI_CDN_BASE_URL
 */
export function getHagakiClient(): HagakiClient {
    if (cached) return cached;
    const owner = requireEnv("HAGAKI_GITHUB_OWNER");
    const repo = requireEnv("HAGAKI_GITHUB_REPO");
    const token = requireEnv("HAGAKI_GITHUB_TOKEN");
    const cdnBaseUrl = requireEnv("HAGAKI_CDN_BASE_URL");
    cached = createHagakiClient({
        github: {
            owner,
            repo,
            branch: readEnv("HAGAKI_GITHUB_BRANCH") ?? "main",
            contentPath:
                readEnv("HAGAKI_GITHUB_CONTENT_PATH") ?? "content/article",
            auth: token,
        },
        content: { cdnBaseUrl },
    });
    return cached;
}

function readEnv(key: string): string | undefined {
    return getOptionalStringEnv(env, key);
}

function requireEnv(key: string): string {
    const value = readEnv(key);
    if (!value) {
        throw new Error(`Missing required env var: ${key}`);
    }
    return value;
}
