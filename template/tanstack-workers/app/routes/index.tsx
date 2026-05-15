import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
    component: HomePage,
});

function HomePage() {
    return (
        <section className="flex flex-col gap-4">
            <h1>hagaki template</h1>
            <p>
                hagaki を使った最小構成の TanStack Start テンプレートです。
                GitHub をストレージにマークダウン記事を読み書きします。
            </p>
            <h2>セットアップ</h2>
            <ol className="pl-5 list-decimal space-y-1">
                <li>
                    <code>.env</code> と <code>.dev.vars</code>{" "}
                    に必要な環境変数を設定 (README.md 参照)
                </li>
                <li>
                    <code>pnpm dev</code> で開発サーバを起動
                </li>
                <li>
                    <Link
                        to="/posts"
                        className="text-primary underline underline-offset-4"
                    >
                        /posts
                    </Link>{" "}
                    で記事一覧を確認
                </li>
            </ol>
            <h2>必要な環境変数</h2>
            <ul className="pl-5 list-disc space-y-0.5">
                <li>
                    <code>HAGAKI_GITHUB_OWNER</code>
                </li>
                <li>
                    <code>HAGAKI_GITHUB_REPO</code>
                </li>
                <li>
                    <code>HAGAKI_GITHUB_TOKEN</code>
                </li>
                <li>
                    <code>HAGAKI_CDN_BASE_URL</code>
                </li>
                <li>
                    <code>HAGAKI_GITHUB_BRANCH</code> (任意, default "main")
                </li>
                <li>
                    <code>HAGAKI_GITHUB_CONTENT_PATH</code> (任意, default
                    "content/wiki")
                </li>
            </ul>
        </section>
    );
}
