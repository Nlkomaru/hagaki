import {
    createRootRoute,
    HeadContent,
    Link,
    Outlet,
    Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import appCss from "../styles/app.css?url";

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { charSet: "utf-8" },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            { title: "hagaki template" },
        ],
        links: [
            { rel: "stylesheet", type: "text/css", href: appCss },
            {
                rel: "stylesheet",
                href: "https://cdn.jsdelivr.net/npm/@mdxeditor/editor@3/style.css",
            },
        ],
    }),
    component: RootComponent,
});

function RootComponent() {
    return (
        <RootDocument>
            <nav className="flex gap-4 px-4 md:px-6 py-3 border-b border-border bg-card">
                <Link
                    to="/"
                    activeProps={{
                        className: "text-primary underline underline-offset-4",
                    }}
                    activeOptions={{ exact: true }}
                    className="font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    Home
                </Link>
                <Link
                    to="/posts"
                    activeProps={{
                        className: "text-primary underline underline-offset-4",
                    }}
                    className="font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    Posts
                </Link>
            </nav>
            <main className="max-w-4xl mx-auto px-4 md:px-6 py-6">
                <Outlet />
            </main>
        </RootDocument>
    );
}

function RootDocument({ children }: { children: ReactNode }) {
    return (
        <html lang="ja">
            <head>
                <HeadContent />
            </head>
            <body>
                {children}
                {process.env.NODE_ENV === "development" && (
                    <TanStackRouterDevtools position="bottom-right" />
                )}
                <Scripts />
            </body>
        </html>
    );
}
