import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { getHagakiClient } from "../lib/hagaki";

const listPostsFn = createServerFn({ method: "GET" }).handler(async () => {
    const client = getHagakiClient();
    return client.posts.list({ sortBy: "date", order: "desc" });
});

export const Route = createFileRoute("/posts/")({
    loader: () => listPostsFn(),
    component: PostsIndexPage,
});

function PostsIndexPage() {
    const posts = Route.useLoaderData();
    return (
        <section className="flex flex-col gap-4">
            <h1>Posts</h1>
            {posts.length === 0 ? (
                <p className="text-muted-foreground">記事がまだありません。</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                    {posts.map((post) => (
                        <Link
                            key={post.slug}
                            to="/posts/$slug"
                            params={{ slug: post.slug }}
                            preload="intent"
                            className="block transition-colors hover:[&>div]:bg-accent/40"
                        >
                            <Card className="h-full">
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        {post.title || post.slug}
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {post.description}
                                    </CardDescription>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {post.category} · {post.date}
                                    </p>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
