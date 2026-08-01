import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { toUrlSlug } from "hagaki";
import { useState } from "react";
import { CategoryInput } from "~/components/CategoryInput";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { getHagakiClient } from "../lib/hagaki";

const newPostDataFn = createServerFn({ method: "GET" }).handler(async () => {
    const client = getHagakiClient();
    const [categories, posts] = await Promise.all([
        client.categories.list(),
        client.posts.list(),
    ]);
    return { categories, slugs: posts.map((p) => p.slug) };
});

export const Route = createFileRoute("/posts/new")({
    loader: () => newPostDataFn(),
    component: NewPostPage,
});

function NewPostPage() {
    const { categories, slugs } = Route.useLoaderData();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const slug = toUrlSlug(title);
    const slugTaken = slug.length > 0 && slugs.includes(slug);

    function onCreate() {
        if (!slug) return;
        navigate({
            to: "/posts/$slug/edit",
            params: { slug },
            search: { title, category: category || undefined },
        });
    }

    return (
        <section className="flex flex-col gap-6">
            <div>
                <h1 className="mb-1">新規記事</h1>
                <p className="text-sm text-muted-foreground mb-0">
                    タイトルから slug を生成し、編集画面へ進みます。
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">基本情報</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="記事のタイトル"
                        />
                        {slug && (
                            <p className="text-xs text-muted-foreground">
                                slug: <code>{slug}</code>
                            </p>
                        )}
                        {slugTaken && (
                            <p className="text-xs text-destructive">
                                この slug の記事は既に存在します。続けると
                                <strong>既存記事の編集</strong>になります。
                            </p>
                        )}
                    </div>

                    <CategoryInput
                        value={category}
                        categories={categories}
                        onChange={setCategory}
                    />
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="button" disabled={!slug} onClick={onCreate}>
                    {slugTaken ? "既存記事を編集" : "作成して編集へ"}
                </Button>
            </div>
        </section>
    );
}
