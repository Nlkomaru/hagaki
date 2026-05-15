import {
    AdmonitionDirectiveDescriptor,
    BlockTypeSelect,
    BoldItalicUnderlineToggles,
    codeBlockPlugin,
    directivesPlugin,
    headingsPlugin,
    imagePlugin,
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

export interface DefaultPluginsOptions {
    imageUploadHandler?: (file: File) => Promise<string>;
    imagePreviewHandler?: (src: string) => Promise<string>;
    imageAutocompleteSuggestions?: string[];
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
