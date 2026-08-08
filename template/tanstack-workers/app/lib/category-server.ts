import { createServerFn } from "@tanstack/react-start";
import type { Category } from "hagaki";
import { getHagakiClient } from "./hagaki";

export const listCategoriesFn = createServerFn({ method: "GET" }).handler(
    async () => (await getHagakiClient()).categories.list(),
);

export const getCategoryFn = createServerFn({ method: "GET" })
    .inputValidator((slug: string) => slug)
    .handler(async ({ data: slug }) => {
        const client = await getHagakiClient();
        const list = await client.categories.list();
        return list.find((c) => c.slug === slug) ?? null;
    });

const SLUG_RE = /^[a-z0-9-]+$/;

export const commitCategoryFn = createServerFn({ method: "POST" })
    .inputValidator((category: Category) => category)
    .handler(async ({ data }) => {
        // The slug is concatenated straight into a repo path — never trust
        // the client to keep it inside content/categories/.
        if (!SLUG_RE.test(data.slug)) {
            throw new Error(
                `commitCategoryFn: invalid slug "${data.slug}" (allowed: a-z 0-9 -)`,
            );
        }
        const client = await getHagakiClient();
        const path = `content/categories/${data.slug}.json`;
        const content = `${JSON.stringify(
            {
                title: data.title,
                slug: data.slug,
                body: data.body,
                hasPosition: data.hasPosition,
            },
            null,
            4,
        )}\n`;
        return client.commits.commitFiles({
            files: [{ path, content }],
            commitMessage: `Update category: ${data.slug}`,
        });
    });
