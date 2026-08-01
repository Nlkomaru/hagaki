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

const NAV_LINK =
    "px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors";
const NAV_ACTIVE = "bg-accent text-foreground";

function RootComponent() {
    return (
        <RootDocument>
            <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
                <nav className="max-w-4xl mx-auto flex items-center gap-1 px-4 md:px-6 h-14">
                    <Link to="/" className="mr-2 font-semibold tracking-tight">
                        hagaki
                    </Link>
                    <Link
                        to="/"
                        activeProps={{ className: NAV_ACTIVE }}
                        activeOptions={{ exact: true }}
                        className={NAV_LINK}
                    >
                        Home
                    </Link>
                    <Link
                        to="/posts"
                        activeProps={{ className: NAV_ACTIVE }}
                        className={NAV_LINK}
                    >
                        Posts
                    </Link>
                    <Link
                        to="/categories"
                        activeProps={{ className: NAV_ACTIVE }}
                        className={NAV_LINK}
                    >
                        Categories
                    </Link>
                </nav>
            </header>
            <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
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
