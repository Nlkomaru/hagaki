import { createFileRoute, notFound } from "@tanstack/react-router";
import { CategoryForm } from "~/components/CategoryForm";
import { getCategoryFn } from "../lib/category-server";

export const Route = createFileRoute("/categories/$slug/edit")({
    loader: async ({ params }) => {
        const category = await getCategoryFn({ data: params.slug });
        if (!category) throw notFound();
        return category;
    },
    component: EditCategoryPage,
});

function EditCategoryPage() {
    const category = Route.useLoaderData();
    return <CategoryForm slugLocked initial={category} />;
}
