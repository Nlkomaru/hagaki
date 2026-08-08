import { env } from "cloudflare:workers";
import { getRequest } from "@tanstack/react-start/server";
import type { Committer } from "hagaki";
import { committerFromBetterAuth } from "hagaki/auth/better-auth";
import { getAuth } from "./auth";

/**
 * git Committer の解決。
 *
 * DB-less 構成の better-auth では `session.user.id` は内部生成 ID で、
 * isolate が変わるたびに別ユーザー扱いになる。そのため Committer の
 * キーには使わず、MineAuth の userinfo から得た OIDC `sub`
 * (= Minecraft UUID) と `preferred_username` (= MCID) を使う:
 *
 *   getAccessToken({ providerId: "MineAuth" })
 *     → GET ${MAIN_SERVER_URL}/oauth2/userinfo (Bearer)
 *     → committer "MCID (uuid)" <uuid+mcid@morino.party>
 */

interface MinecraftProfile {
    /** OIDC `sub` — Minecraft UUID。 */
    uuid: string;
    /** OIDC `preferred_username` — MCID。 */
    mcid: string;
}

// userinfo 2 段目 fetch の結果キャッシュ(isolate ローカル)。アクセス
// トークンをキーにすることで、同一セッションからの連続保存で毎回
// 2 段 fetch が走るのを避ける。
const profileCache = new Map<
    string,
    { profile: MinecraftProfile; expiresAt: number }
>();
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

export async function resolveCommitter(): Promise<Committer> {
    const auth = await getAuth();
    const tokenResult = await auth.api.getAccessToken({
        body: { providerId: "MineAuth" },
        headers: getRequest().headers,
    });
    const accessToken = tokenResult.accessToken;
    if (!accessToken) {
        throw new Error("committer: MineAuth access token unavailable");
    }

    const profile = await fetchProfile(accessToken);
    const committer = committerFromBetterAuth(
        { user: { id: profile.uuid, name: profile.mcid } },
        { defaultEmail: `${profile.uuid}+${profile.mcid}@morino.party` },
    );
    if (!committer) {
        throw new Error("committer: could not build committer from userinfo");
    }
    return committer;
}

async function fetchProfile(accessToken: string): Promise<MinecraftProfile> {
    const now = Date.now();
    const cached = profileCache.get(accessToken);
    if (cached && cached.expiresAt > now) return cached.profile;

    const response = await fetch(`${env.MAIN_SERVER_URL}/oauth2/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        throw new Error(
            `committer: userinfo fetch failed (${response.status})`,
        );
    }
    const data = (await response.json()) as {
        sub?: string;
        preferred_username?: string;
    };
    if (!data.sub || !data.preferred_username) {
        throw new Error(
            "committer: userinfo is missing sub / preferred_username",
        );
    }

    const profile: MinecraftProfile = {
        uuid: data.sub,
        mcid: data.preferred_username,
    };
    for (const [key, value] of profileCache) {
        if (value.expiresAt <= now) profileCache.delete(key);
    }
    profileCache.set(accessToken, {
        profile,
        expiresAt: now + PROFILE_CACHE_TTL_MS,
    });
    return profile;
}
