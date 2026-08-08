import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { getAuth } from "../lib/auth";

const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
    const auth = await getAuth();
    const session = await auth.api.getSession({
        headers: getRequest().headers,
    });
    if (!session) return null;
    return { name: session.user.name, email: session.user.email };
});

const signInFn = createServerFn({ method: "POST" }).handler(async () => {
    const auth = await getAuth();
    const result = await auth.api.signInWithOAuth2({
        body: {
            providerId: "MineAuth",
            callbackURL: "/",
            scopes: ["openid", "profile", "email", "roles"],
        },
    });
    const redirectUrl = typeof result === "string" ? result : result.url;
    return { redirectUrl };
});

const signOutFn = createServerFn({ method: "POST" }).handler(async () => {
    const auth = await getAuth();
    await auth.api.signOut({ headers: getRequest().headers });
    return { ok: true };
});

export const Route = createFileRoute("/auth/sign-in")({
    loader: () => getSessionFn(),
    component: SignInPage,
});

function SignInPage() {
    const session = Route.useLoaderData();
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    async function onSignIn() {
        setBusy(true);
        try {
            const { redirectUrl } = await signInFn();
            window.location.href = redirectUrl;
        } catch {
            setBusy(false);
        }
    }

    async function onSignOut() {
        setBusy(true);
        try {
            await signOutFn();
            await router.invalidate();
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="flex flex-col items-start gap-4">
            <h1 className="mb-0">サインイン</h1>
            {session ? (
                <>
                    <p className="text-muted-foreground">
                        {session.name} としてサインイン済みです。
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={onSignOut}
                    >
                        サインアウト
                    </Button>
                </>
            ) : (
                <>
                    <p className="text-muted-foreground">
                        記事の閲覧は誰でもできますが、編集・保存には MineAuth
                        でのサインインが必要です。
                    </p>
                    <Button type="button" disabled={busy} onClick={onSignIn}>
                        {busy ? "リダイレクト中…" : "MineAuth でサインイン"}
                    </Button>
                </>
            )}
        </section>
    );
}
