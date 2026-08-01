import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { markdownToHtml } from "hagaki/markdown";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { getHagakiClient } from "../lib/hagaki";
import { getStringEnv } from "../lib/server-env";

const getRenderedPostFn = createServerFn({ method: "GET" })
    .inputValidator((slug: string) => slug)
    .handler(async ({ data: slug }) => {
        const { env } = await import("cloudflare:workers");
        const client = getHagakiClient();
        const post = await client.posts.getBySlug(slug);
        if (!post) return null;
        const cdnBaseUrl = getStringEnv(env, "HAGAKI_CDN_BASE_URL");
        const html = await markdownToHtml(post.body, { cdnBaseUrl });
        return {
            title: post.title,
            slug: post.slug,
            description: post.description,
            date: post.date,
            category: post.category,
            html,
        };
    });

export const Route = createFileRoute("/posts/$slug/")({
    loader: async ({ params }) => {
        const result = await getRenderedPostFn({ data: params.slug });
        if (!result) throw notFound();
        return result;
    },
    head: ({ loaderData }) =>
        loaderData
            ? {
                  meta: [
                      { title: loaderData.title || loaderData.slug },
                      {
                          name: "description",
                          content: loaderData.description,
                      },
                  ],
              }
            : {},
    component: PostViewPage,
});

function PostViewPage() {
    const post = Route.useLoaderData();
    return (
        <article className="flex flex-col gap-6">
            <Button
                asChild
                variant="ghost"
                size="sm"
                className="-ml-2 w-fit text-muted-foreground"
            >
                <Link to="/posts">
                    <ArrowLeft />
                    一覧へ戻る
                </Link>
            </Button>

            <header className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    {post.category && (
                        <Badge variant="secondary">{post.category}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                        {post.date}
                    </span>
                </div>
                <h1 className="mb-0">{post.title || post.slug}</h1>
                {post.description && (
                    <p className="text-muted-foreground mb-0">
                        {post.description}
                    </p>
                )}
            </header>

            <Separator />

            <div className="prose prose-neutral max-w-none">
                {/* HTML is generated server-side by remark+rehype with
                    blurhash placeholders pre-baked as data URLs, so no
                    client-side parsing or useEffect is needed. */}
                <div
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is produced by a trusted server-side pipeline (gray-matter + remark + rehype) over content fetched from a private GitHub repo we control.
                    dangerouslySetInnerHTML={{ __html: post.html }}
                />
            </div>

            <Separator />

            <div className="flex justify-end">
                <Button asChild>
                    <Link to="/posts/$slug/edit" params={{ slug: post.slug }}>
                        <Pencil />
                        編集
                    </Link>
                </Button>
            </div>
        </article>
    );
}
