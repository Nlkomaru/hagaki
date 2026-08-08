import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FolderTree, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";

export const Route = createFileRoute("/")({
    component: HomePage,
});

const ENV_VARS: Array<[string, string]> = [
    ["HAGAKI_GITHUB_OWNER", "必須"],
    ["HAGAKI_GITHUB_REPO", "必須"],
    ["HAGAKI_GITHUB_TOKEN", "必須"],
    ["HAGAKI_CDN_BASE_URL", "必須"],
    ["HAGAKI_GITHUB_BRANCH", '任意 · default "main"'],
];

function HomePage() {
    return (
        <section className="flex flex-col gap-8">
            <div>
                <h1 className="mb-2">hagaki template</h1>
                <p className="text-muted-foreground mb-0">
                    hagaki を使った最小構成の TanStack Start テンプレート。
                    GitHub をストレージにマークダウン記事を読み書きします。
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">記事</CardTitle>
                        <CardDescription>
                            記事の一覧・作成・編集
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                        <Button asChild size="sm">
                            <Link to="/posts">
                                一覧
                                <ArrowRight />
                            </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                            <Link to="/posts/new">
                                <Plus />
                                新規
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">カテゴリ</CardTitle>
                        <CardDescription>カテゴリの管理</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild size="sm" variant="outline">
                            <Link to="/categories">
                                <FolderTree />
                                管理
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">必要な環境変数</CardTitle>
                    <CardDescription>
                        <code>.env</code> / <code>.dev.vars</code> に設定
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <dl className="flex flex-col divide-y divide-border text-sm">
                        {ENV_VARS.map(([name, note]) => (
                            <div
                                key={name}
                                className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
                            >
                                <code>{name}</code>
                                <span className="text-xs text-muted-foreground">
                                    {note}
                                </span>
                            </div>
                        ))}
                    </dl>
                </CardContent>
            </Card>
        </section>
    );
}
