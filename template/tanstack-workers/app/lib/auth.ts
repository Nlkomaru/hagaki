import { env } from "cloudflare:workers";
import { getRequest } from "@tanstack/react-start/server";
import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

// baseURL(= リクエストの origin)ごとに BetterAuth インスタンスをメモ化する。
// 固定の redirect URL を持たないことで、production / preview バージョン /
// ローカル開発のどの origin でもそのまま動く(moripath と同じパターン)。
const authCache = new Map<string, Promise<Auth>>();

async function buildAuth(baseURL: string) {
    // AUTH_SECRET は Cloudflare Secrets Store バインディング (BSM: shared/AUTH_SECRET)
    // から供給されるため、他の env とは異なり非同期の `.get()` で読み出す。
    // (Secrets Store バインディングは global scope での非同期 I/O を許可しない
    // ため、モジュールトップレベルではなく初回リクエスト時に遅延解決する)
    const secret = await env.AUTH_SECRET.get();

    return betterAuth({
        baseURL,
        secret,
        session: {
            cookieCache: {
                enabled: true,
                // DB-less 構成では session の実体がこの暗号化 Cookie に載る。
                // 既定 (300s) のままだと失効時のフォールバック先(メモリ
                // アダプタ)が Workers では isolate ごとに空なので、実効
                // セッション寿命が約 5 分になってしまう。明示的に延ばす。
                // 推奨: 1〜8 時間。長くするほどサインアウト・権限変更の
                // 反映が遅れる点とのトレードオフ。
                maxAge: 60 * 60 * 4,
            },
        },
        plugins: [
            genericOAuth({
                config: [
                    {
                        providerId: "MineAuth",
                        clientId: env.CLIENT_ID,
                        // token_endpoint_auth_method: "none" のため空文字列
                        clientSecret: "",
                        pkce: true,
                        discoveryUrl: `${env.MAIN_SERVER_URL}/.well-known/openid-configuration`,
                        // roles / preferred_username を userinfo で受け取る
                        // ため明示。sub (Minecraft UUID) は committer 解決に
                        // 使う(session.user.id は DB-less では不安定なので
                        // git committer のキーにしない — lib/committer.ts)。
                        scopes: ["openid", "profile", "email", "roles"],
                    },
                ],
            }),
            // Better Auth 公式の TanStack Start 向けクッキープラグイン(最後に置く)
            tanstackStartCookies(),
        ],
    });
}

// プラグイン(genericOAuth / tanstackStartCookies)のエンドポイント型を
// 保つため、明示アノテーションではなく buildAuth の推論結果を使う。
type Auth = Awaited<ReturnType<typeof buildAuth>>;

/**
 * 現在のリクエストの origin を baseURL としたメモ化済み BetterAuth
 * インスタンスを返す。リクエストコンテキスト内(サーバー関数・ルート
 * ハンドラー)からのみ呼び出せる。
 */
export function getAuth(): Promise<Auth> {
    const origin = new URL(getRequest().url).origin;
    let auth = authCache.get(origin);
    if (!auth) {
        auth = buildAuth(origin);
        authCache.set(origin, auth);
    }
    return auth;
}
