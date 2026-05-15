import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Button } from "~/components/ui/button";
import { getHagakiClient } from "../lib/hagaki";
import { markdownToHtml } from "../lib/markdown-to-html";

const getRenderedPostFn = createServerFn({ method: "GET" })
    .inputValidator((slug: string) => slug)
    .handler(async ({ data: slug }) => {
        const { env } = await import("cloudflare:workers");
        const client = getHagakiClient();
        const post = await client.posts.getBySlug(slug);
        if (!post) return null;
        const cdnBaseUrl =
            (env as unknown as Record<string, string | undefined>)
                .HAGAKI_CDN_BASE_URL ?? "";
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
        <article className="flex flex-col gap-4">
            <header className="flex flex-col gap-2">
                <h1>{post.title || post.slug}</h1>
                {post.description && (
                    <p className="text-muted-foreground">{post.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                    {post.category} · {post.date}
                </p>
            </header>
            <div className="prose prose-neutral max-w-none">
                {/* HTML is generated server-side by remark+rehype with
                    blurhash placeholders pre-baked as data URLs, so no
                    client-side parsing or useEffect is needed. */}
                <div
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is produced by a trusted server-side pipeline (gray-matter + remark + rehype) over content fetched from a private GitHub repo we control.
                    dangerouslySetInnerHTML={{ __html: post.html }}
                />
            </div>
            <div className="flex gap-2">
                <Button asChild variant="outline">
                    <Link to="/posts">一覧へ戻る</Link>
                </Button>
                <Button asChild>
                    <Link to="/posts/$slug/edit" params={{ slug: post.slug }}>
                        編集
                    </Link>
                </Button>
            </div>
        </article>
    );
}
