"use client";

import type { ComponentType } from "react";
import {
    Bold,
    BulletList,
    CheckList,
    type HagakiEditorToolbarButtonProps,
    InlineCode,
    InsertImageFileButton,
    type InsertImageFileButtonProps,
    Italic,
    NumberedList,
    Redo,
    Strikethrough,
    Underline,
    Undo,
} from "./buttons.js";
import { Content, type HagakiEditorContentProps } from "./Content.js";
import { HagakiEditorRoot, type HagakiEditorRootProps } from "./Editor.js";
import { type HagakiEditorToolbarProps, Toolbar } from "./Toolbar.js";
import {
    BlockTypeSelect,
    BoldItalicUnderlineToggles,
    CodeToggle,
    ConditionalContents,
    CreateLink,
    DiffSourceToggleWrapper,
    InsertAdmonition,
    InsertCodeBlock,
    InsertTable,
    InsertThematicBreak,
    ListsToggle,
    Separator,
    UndoRedo,
} from "./toolbar-buttons.js";

/**
 * Toolbar buttons that we re-export from `@mdxeditor/editor` are typed loosely
 * because their real prop shapes reference deeply-nested
 * `@radix-ui/react-toolbar` symbols that `tsc` can't name portably from this
 * re-export. Consumers who want strict prop types should import the original
 * component from `@mdxeditor/editor` directly.
 */
// biome-ignore lint/suspicious/noExplicitAny: re-export prop-shape erasure (see comment above)
type ToolbarButton = ComponentType<any>;

/**
 * Image insertion is directive-based: `InsertImage.FileButton` opens a file
 * picker, hands the file to `onImageUpload`, and inserts a `::img` leaf
 * directive rendered by the same `<Image>` component as the read-only view.
 * (MDXEditor's URL dialog / `imagePlugin` path was removed together with
 * standard `![]()` image support.)
 */
interface InsertImageComponent {
    FileButton: ComponentType<InsertImageFileButtonProps>;
}

const InsertImage: InsertImageComponent = {
    FileButton: InsertImageFileButton,
};

type HagakiEditorComponent = ComponentType<HagakiEditorRootProps> & {
    Toolbar: ComponentType<HagakiEditorToolbarProps>;
    Content: ComponentType<HagakiEditorContentProps>;

    // Individually-styleable toolbar buttons (built on MDXEditor's primitives).
    Undo: ComponentType<HagakiEditorToolbarButtonProps>;
    Redo: ComponentType<HagakiEditorToolbarButtonProps>;
    Bold: ComponentType<HagakiEditorToolbarButtonProps>;
    Italic: ComponentType<HagakiEditorToolbarButtonProps>;
    Underline: ComponentType<HagakiEditorToolbarButtonProps>;
    Strikethrough: ComponentType<HagakiEditorToolbarButtonProps>;
    InlineCode: ComponentType<HagakiEditorToolbarButtonProps>;
    BulletList: ComponentType<HagakiEditorToolbarButtonProps>;
    NumberedList: ComponentType<HagakiEditorToolbarButtonProps>;
    CheckList: ComponentType<HagakiEditorToolbarButtonProps>;

    // Composable image controls.
    InsertImage: InsertImageComponent;

    // Re-exports from MDXEditor — bundle toggles, dropdowns, single buttons
    // that don't decompose further.
    BlockTypeSelect: ToolbarButton;
    BoldItalicUnderlineToggles: ToolbarButton;
    CodeToggle: ToolbarButton;
    ConditionalContents: ToolbarButton;
    CreateLink: ToolbarButton;
    DiffSourceToggleWrapper: ToolbarButton;
    InsertAdmonition: ToolbarButton;
    InsertCodeBlock: ToolbarButton;
    InsertTable: ToolbarButton;
    InsertThematicBreak: ToolbarButton;
    ListsToggle: ToolbarButton;
    Separator: ToolbarButton;
    UndoRedo: ToolbarButton;
};

/**
 * Composite editor. Use `<HagakiEditor.Toolbar>` / `<HagakiEditor.Content>`
 * slots to style each region, and the individual button components
 * (`<HagakiEditor.Bold>`, `<HagakiEditor.InsertImage.FileButton>`, …) to style
 * each control. Pass a custom `plugins` prop for full plugin override.
 *
 * @example
 * <HagakiEditor markdown={md} onChange={setMd} onImageUpload={handleUpload}>
 *   <HagakiEditor.Toolbar className="border-b px-2 py-1">
 *     <HagakiEditor.Undo />
 *     <HagakiEditor.Redo />
 *     <HagakiEditor.Bold />
 *     <HagakiEditor.Italic />
 *     <HagakiEditor.InsertImage.FileButton />
 *   </HagakiEditor.Toolbar>
 *   <HagakiEditor.Content className="prose px-4 py-3 min-h-[400px]" />
 * </HagakiEditor>
 */
export const HagakiEditor = Object.assign(HagakiEditorRoot, {
    Toolbar,
    Content,

    Undo,
    Redo,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    InlineCode,
    BulletList,
    NumberedList,
    CheckList,
    InsertImage,

    BlockTypeSelect,
    BoldItalicUnderlineToggles,
    CodeToggle,
    ConditionalContents,
    CreateLink,
    DiffSourceToggleWrapper,
    InsertAdmonition,
    InsertCodeBlock,
    InsertTable,
    InsertThematicBreak,
    ListsToggle,
    Separator,
    UndoRedo,
}) as HagakiEditorComponent;

export type {
    MDXEditorMethods,
    RealmPlugin,
    Translation,
} from "@mdxeditor/editor";
export type {
    HagakiEditorToolbarButtonProps,
    InsertImageFileButtonProps,
} from "./buttons.js";
export type { HagakiEditorContentProps } from "./Content.js";
export type { HagakiEditorProps, HagakiEditorRootProps } from "./Editor.js";
export { imageDirectiveDescriptor } from "./image-directive.js";
export {
    hagakiImageUploadPlugin,
    type ImageUploadHandler,
    imageUploadHandler$,
} from "./image-upload.js";
export {
    type DefaultPluginsOptions,
    defaultPlugins,
    defaultToolbarContents,
} from "./plugins.js";
export type { HagakiEditorToolbarProps } from "./Toolbar.js";
