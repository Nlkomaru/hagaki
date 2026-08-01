import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { getHagakiClient } from "../lib/hagaki";

const listPostsFn = createServerFn({ method: "GET" }).handler(async () => {
    const client = await getHagakiClient();
    return client.posts.list({ sortBy: "date", order: "desc" });
});

export const Route = createFileRoute("/posts/")({
    loader: () => listPostsFn(),
    component: PostsIndexPage,
});

function PostsIndexPage() {
    const posts = Route.useLoaderData();
    return (
        <section className="flex flex-col gap-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="mb-1">Posts</h1>
                    <p className="text-sm text-muted-foreground mb-0">
                        {posts.length} 件の記事
                    </p>
                </div>
                <Button asChild>
                    <Link to="/posts/new">
                        <Plus />
                        新規作成
                    </Link>
                </Button>
            </div>
            <Separator />
            {posts.length === 0 ? (
                <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
                    記事がまだありません。「新規作成」から始めましょう。
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {posts.map((post) => (
                        <Link
                            key={post.slug}
                            to="/posts/$slug"
                            params={{ slug: post.slug }}
                            preload="intent"
                            className="group block"
                        >
                            <Card className="h-full transition-colors group-hover:border-foreground/30 group-hover:bg-accent/40">
                                <CardHeader>
                                    <div className="flex items-center gap-2 mb-1">
                                        {post.category && (
                                            <Badge variant="secondary">
                                                {post.category}
                                            </Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            {post.date}
                                        </span>
                                    </div>
                                    <CardTitle className="text-base">
                                        {post.title || post.slug}
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {post.description || "—"}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
