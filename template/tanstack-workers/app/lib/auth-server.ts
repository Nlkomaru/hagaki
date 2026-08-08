import { getRequest } from "@tanstack/react-start/server";
import { getAuth } from "./auth";

/**
 * エンドポイント単位のセッション検証。
 *
 * TanStack Start の createServerFn は独立した RPC エンドポイントとして
 * 直接叩けるため、レイアウトの beforeLoad(moripath の `_signed_in`
 * パターン)ではサーバー関数は守れない。書き込み系・編集系のサーバー
 * 関数は必ずハンドラ冒頭でこれを呼ぶこと。
 *
 * 未認証は 401 JSON を返す(ページ遷移前提の redirect にはしない —
 * fetch 呼び出し元がハンドリングする)。
 */
export async function requireSession() {
    const auth = await getAuth();
    const session = await auth.api.getSession({
        headers: getRequest().headers,
    });
    if (!session) {
        throw new Response(
            JSON.stringify({
                error: "unauthorized",
                message: "サインインが必要です (/auth/sign-in)",
            }),
            {
                status: 401,
                headers: { "content-type": "application/json" },
            },
        );
    }
    return session;
}
