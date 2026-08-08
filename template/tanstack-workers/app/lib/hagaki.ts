import { env } from "cloudflare:workers";
import { createHagakiClient, type HagakiClient } from "hagaki";
import { getOptionalStringEnv } from "./server-env";

let cached: HagakiClient | null = null;

/**
 * Server-side hagaki client. Reads config from Cloudflare Worker env bindings
 * (wrangler.jsonc `vars` / `.dev.vars` / `secrets_store_secrets`):
 * - HAGAKI_GITHUB_OWNER
 * - HAGAKI_GITHUB_REPO
 * - HAGAKI_GITHUB_BRANCH (optional, default "main")
 * - HAGAKI_GITHUB_TOKEN (Cloudflare Secrets Store binding, async — see getHagakiClient)
 * - HAGAKI_CDN_BASE_URL
 */
export async function getHagakiClient(): Promise<HagakiClient> {
    if (cached) return cached;
    const owner = requireEnv("HAGAKI_GITHUB_OWNER");
    const repo = requireEnv("HAGAKI_GITHUB_REPO");
    // HAGAKI_GITHUB_TOKEN は Cloudflare Secrets Store バインディング
    // (BSM: hagaki/HAGAKI_GITHUB_TOKEN) から取得するため、他の env とは異なり
    // 非同期の `.get()` で読み出す。
    const token = await env.HAGAKI_GITHUB_TOKEN.get();
    if (!token) {
        throw new Error("Missing required env var: HAGAKI_GITHUB_TOKEN");
    }
    const cdnBaseUrl = requireEnv("HAGAKI_CDN_BASE_URL");
    cached = createHagakiClient({
        github: {
            owner,
            repo,
            branch: readEnv("HAGAKI_GITHUB_BRANCH") ?? "main",
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
