import { env } from "cloudflare:workers";
import type { Committer } from "@morinoparty/hagaki";
import { committerFromBetterAuth } from "@morinoparty/hagaki/auth/better-auth";
import { getRequest } from "@tanstack/react-start/server";
import { getAuth } from "./auth";

/**
 * git Committer の解決。
 *
 * DB-less 構成の better-auth では `session.user.id` は内部生成 ID で、
 * isolate が変わるたびに別ユーザー扱いになる。そのため Committer の
 * キーには使わず、OIDC プロバイダの userinfo から得た `sub` と
 * `preferred_username` を使う。`sub` がそのまま hagaki のユーザー ID
 * (履歴の `userId`、frontmatter の `editor`) になる:
 *
 *   getAccessToken()
 *     → GET <userinfo endpoint> (Bearer)
 *     → committer "<preferred_username> (<sub>)" <<sub>+<preferred_username>@users.noreply.morino.party>
 *
 * プロバイダ (このテンプレートでは MineAuth) は lib/auth.ts の設定だけで、
 * ここは OIDC の標準クレームしか見ない。
 */

interface OidcIdentity {
    /** OIDC `sub` — プロバイダ内で安定したユーザー ID。 */
    sub: string;
    /** OIDC `preferred_username` — 表示名。 */
    preferredUsername: string;
}

// userinfo 2 段目 fetch の結果キャッシュ(isolate ローカル)。アクセス
// トークンをキーにすることで、同一セッションからの連続保存で毎回
// 2 段 fetch が走るのを避ける。
const profileCache = new Map<
    string,
    { profile: OidcIdentity; expiresAt: number }
>();
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

export async function resolveCommitter(): Promise<Committer> {
    const auth = await getAuth();
    const tokenResult = await auth.api.getAccessToken({
        // DB-less: the linked account lives in the account cookie.
        body: { useAccountCookie: true },
        headers: getRequest().headers,
    });
    const accessToken = tokenResult.accessToken;
    if (!accessToken) {
        throw new Error("committer: OAuth access token unavailable");
    }

    const profile = await fetchProfile(accessToken);
    // `sub` を session.user.id の代わりに渡す。committer 名は
    // "<name> (<sub>)" になり、hagaki が履歴から userId として読み戻す。
    const committer = committerFromBetterAuth(
        { user: { id: profile.sub, name: profile.preferredUsername } },
        {
            defaultEmail: `${profile.sub}+${profile.preferredUsername}@users.noreply.morino.party`,
        },
    );
    if (!committer) {
        throw new Error("committer: could not build committer from userinfo");
    }
    return committer;
}

async function fetchProfile(accessToken: string): Promise<OidcIdentity> {
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

    const profile: OidcIdentity = {
        sub: data.sub,
        preferredUsername: data.preferred_username,
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
