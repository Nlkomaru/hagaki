import { Link, useRouter } from "@tanstack/react-router";
import type { WikiCategory } from "hagaki";
import { toUrlSlug } from "hagaki";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { commitCategoryFn } from "../lib/category-server";

export interface CategoryFormProps {
    initial: WikiCategory;
    /** New categories derive their slug from the title; existing ones are
     *  pinned (the slug is the `categories/<slug>.json` file identity). */
    slugLocked: boolean;
    /** Slugs already present — used to warn before overwriting (new mode). */
    existingSlugs?: string[];
}

export function CategoryForm({
    initial,
    slugLocked,
    existingSlugs = [],
}: CategoryFormProps) {
    const router = useRouter();
    const [category, setCategory] = useState<WikiCategory>(initial);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const slug = slugLocked ? category.slug : toUrlSlug(category.title);
    const slugTaken =
        !slugLocked && slug.length > 0 && existingSlugs.includes(slug);
    const update = (patch: Partial<WikiCategory>) =>
        setCategory((c) => ({ ...c, ...patch }));

    async function onSave() {
        setSaving(true);
        setError(null);
        try {
            await commitCategoryFn({ data: { ...category, slug } });
            await router.invalidate();
            router.navigate({ to: "/categories" });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="flex flex-col gap-6">
            <h1 className="mb-0">
                {slugLocked ? `カテゴリを編集: ${slug}` : "新規カテゴリ"}
            </h1>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">カテゴリ情報</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={category.title}
                            onChange={(e) => update({ title: e.target.value })}
                        />
                        {slug && (
                            <p className="text-xs text-muted-foreground">
                                slug: <code>{slug}</code>
                            </p>
                        )}
                        {slugTaken && (
                            <p className="text-xs text-destructive">
                                この slug のカテゴリは既に存在します。保存すると
                                <strong>上書き</strong>されます。
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="body">Body</Label>
                        <Textarea
                            id="body"
                            value={category.body}
                            onChange={(e) => update({ body: e.target.value })}
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="size-4 accent-foreground"
                            checked={category.hasPosition}
                            onChange={(e) =>
                                update({ hasPosition: e.target.checked })
                            }
                        />
                        hasPosition（一覧で上位に固定）
                    </label>
                </CardContent>
            </Card>

            {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </div>
            )}

            <div className="flex justify-end gap-2">
                <Button asChild variant="outline">
                    <Link to="/categories">キャンセル</Link>
                </Button>
                <Button
                    type="button"
                    disabled={saving || !slug}
                    onClick={onSave}
                    className={cn(saving && "opacity-70")}
                >
                    {saving ? "保存中…" : "保存"}
                </Button>
            </div>
        </section>
    );
}
