import {
    AdmonitionDirectiveDescriptor,
    BlockTypeSelect,
    BoldItalicUnderlineToggles,
    codeBlockPlugin,
    directivesPlugin,
    headingsPlugin,
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
import { imageDirectiveDescriptor } from "./image-directive.js";
import {
    hagakiImageUploadPlugin,
    type ImageUploadHandler,
} from "./image-upload.js";

export interface DefaultPluginsOptions {
    /** See `HagakiEditorRootProps.onImageUpload`. */
    onImageUpload?: ImageUploadHandler;
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
            directiveDescriptors: [
                imageDirectiveDescriptor,
                AdmonitionDirectiveDescriptor,
            ],
        }),
        codeBlockPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
    ];

    if (options.onImageUpload) {
        plugins.push(
            hagakiImageUploadPlugin({ onImageUpload: options.onImageUpload }),
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
