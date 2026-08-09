import { createFileRoute } from "@tanstack/react-router";
import { CategoryForm } from "~/components/CategoryForm";
import { listCategoriesFn } from "../lib/category-server";

export const Route = createFileRoute("/categories/new")({
    loader: () => listCategoriesFn(),
    component: NewCategoryPage,
});

function NewCategoryPage() {
    const categories = Route.useLoaderData();
    return (
        <CategoryForm
            slugLocked={false}
            existingSlugs={categories.map((c) => c.slug)}
            initial={{ title: "", slug: "", body: "" }}
        />
    );
}
