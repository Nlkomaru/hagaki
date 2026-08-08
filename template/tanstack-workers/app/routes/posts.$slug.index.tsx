import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ArrowLeft, Pencil } from "lucide-react";
import { PostBody } from "~/components/post-body";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { getHagakiClient } from "../lib/hagaki";
import { getStringEnv } from "../lib/server-env";

const getPostFn = createServerFn({ method: "GET" })
    .inputValidator((slug: string) => slug)
    .handler(async ({ data: slug }) => {
        const { env } = await import("cloudflare:workers");
        const client = await getHagakiClient();
        const post = await client.posts.getBySlug(slug);
        if (!post) return null;
        return {
            title: post.title,
            slug: post.slug,
            uuid: post.uuid,
            description: post.description,
            date: post.date,
            category: post.category,
            body: post.body,
            cdnBaseUrl: getStringEnv(env, "HAGAKI_CDN_BASE_URL"),
        };
    });

export const Route = createFileRoute("/posts/$slug/")({
    loader: async ({ params }) => {
        const result = await getPostFn({ data: params.slug });
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

            {/* remark-mdx + rehype-react による React 要素レンダリング。
                本文中の <Image /> は hagaki/react の <Image>(blurhash
                プレースホルダ内蔵)に直接マップされる。 */}
            <PostBody
                markdown={post.body}
                articleId={post.uuid}
                cdnBaseUrl={post.cdnBaseUrl}
                className="prose prose-neutral max-w-none"
            />

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
