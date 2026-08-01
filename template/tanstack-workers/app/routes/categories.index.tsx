import { createFileRoute, Link } from "@tanstack/react-router";
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
import { listCategoriesFn } from "../lib/category-server";

export const Route = createFileRoute("/categories/")({
    loader: () => listCategoriesFn(),
    component: CategoriesIndexPage,
});

function CategoriesIndexPage() {
    const categories = Route.useLoaderData();
    return (
        <section className="flex flex-col gap-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="mb-1">Categories</h1>
                    <p className="text-sm text-muted-foreground mb-0">
                        {categories.length} 件のカテゴリ
                    </p>
                </div>
                <Button asChild>
                    <Link to="/categories/new">
                        <Plus />
                        新規作成
                    </Link>
                </Button>
            </div>
            <Separator />
            {categories.length === 0 ? (
                <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
                    カテゴリがまだありません。
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map((category) => (
                        <Link
                            key={category.slug}
                            to="/categories/$slug/edit"
                            params={{ slug: category.slug }}
                            preload="intent"
                            className="group block"
                        >
                            <Card className="h-full transition-colors group-hover:border-foreground/30 group-hover:bg-accent/40">
                                <CardHeader>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline">
                                            {category.slug}
                                        </Badge>
                                        {category.hasPosition && (
                                            <Badge variant="secondary">
                                                pinned
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-base">
                                        {category.title || category.slug}
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {category.body || "—"}
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
