import {
    AdmonitionDirectiveDescriptor,
    BlockTypeSelect,
    BoldItalicUnderlineToggles,
    codeBlockPlugin,
    directivesPlugin,
    headingsPlugin,
    imagePlugin,
    jsxPlugin,
    linkPlugin,
    listsPlugin,
    markdownShortcutPlugin,
    quotePlugin,
    type RealmPlugin,
    tablePlugin,
    thematicBreakPlugin,
    toolbarPlugin,
    UndoRedo,
} from "@mdxeditor/editor";
import type { ReactNode } from "react";
import { createImageComponentDescriptor } from "./image-jsx.js";

export interface DefaultPluginsOptions {
    imageUploadHandler?: (file: File) => Promise<string>;
    imagePreviewHandler?: (src: string) => Promise<string>;
    imageAutocompleteSuggestions?: string[];
    /**
     * Display URL for a committed image id. `<Image />` MDX components
     * render inline via {@link createImageComponentDescriptor}.
     */
    imagePreviewUrlFor?: (id: string) => string;
    toolbarContents?: () => ReactNode;
    toolbarClassName?: string;
}

/**
 * Re-exported building blocks so callers can compose custom toolbars
 * without depending on `@mdxeditor/editor` directly.
 */
export { BlockTypeSelect, BoldItalicUnderlineToggles, UndoRedo };

/**
 * Default toolbar with block type, inline formatting, and undo/redo.
 * Callers can pass their own via `toolbarContents`.
 */
export function defaultToolbarContents(): ReactNode {
    return (
        <>
            <BlockTypeSelect />
            <BoldItalicUnderlineToggles />
            <UndoRedo />
        </>
    );
}

export function defaultPlugins(
    options: DefaultPluginsOptions = {},
): RealmPlugin[] {
    const plugins: RealmPlugin[] = [
        headingsPlugin(),
        linkPlugin(),
        tablePlugin(),
        listsPlugin(),
        directivesPlugin({
            directiveDescriptors: [AdmonitionDirectiveDescriptor],
        }),
        // MDX `<Image />` support. Registered even without a resolver so
        // bodies that contain the component still parse instead of erroring.
        jsxPlugin({
            jsxComponentDescriptors: [
                createImageComponentDescriptor({
                    previewUrlFor: options.imagePreviewUrlFor ?? (() => ""),
                }),
            ],
        }),
        codeBlockPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
    ];

    if (options.imageUploadHandler || options.imagePreviewHandler) {
        plugins.push(
            imagePlugin({
                imageUploadHandler: options.imageUploadHandler,
                imagePreviewHandler: options.imagePreviewHandler,
                imageAutocompleteSuggestions:
                    options.imageAutocompleteSuggestions,
            }),
        );
    }

    if (options.toolbarContents) {
        plugins.push(
            toolbarPlugin({
                toolbarClassName: options.toolbarClassName,
                toolbarContents: options.toolbarContents,
            }),
        );
    }

    return plugins;
}
