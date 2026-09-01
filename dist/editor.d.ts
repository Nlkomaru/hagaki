import * as react from 'react';
import { ReactNode, MutableRefObject, ComponentType } from 'react';
import { MDXEditorMethods, RealmPlugin, Translation, JsxComponentDescriptor } from '@mdxeditor/editor';
export { MDXEditorMethods, RealmPlugin, Translation } from '@mdxeditor/editor';
import { I as ImageComponentAttrs } from './image-jsx-DeaMXloi.js';

interface HagakiEditorToolbarButtonProps {
    className?: string;
    /** Override the default icon. */
    children?: ReactNode;
    title?: string;
}
interface InsertImageFileButtonProps extends HagakiEditorToolbarButtonProps {
    /** `<input type="file">` accept attribute. Defaults to `image/*`. */
    accept?: string;
}
interface InsertImageComponentButtonProps extends HagakiEditorToolbarButtonProps {
    /** `<input type="file">` accept attribute. Defaults to `image/*`. */
    accept?: string;
}

interface HagakiEditorContentProps {
    className?: string;
}

interface HagakiEditorRootProps {
    markdown: string;
    onChange: (markdown: string) => void;
    editorRef?: MutableRefObject<MDXEditorMethods | null>;
    /**
     * Children of the editor. Provide `<HagakiEditor.Toolbar>` and
     * `<HagakiEditor.Content>` slots to customize each part.
     *
     * If `plugins` is supplied, children are ignored.
     */
    children?: ReactNode;
    /**
     * Pre-built plugin array. Pass this to fully take over plugin assembly —
     * children are ignored when this is set.
     */
    plugins?: RealmPlugin[];
    /** Async image upload handler (returns the URL to insert into markdown). */
    onImageUpload?: (file: File) => Promise<string>;
    /** Async image preview handler (resolves a URL to a display-able URL). */
    onImagePreview?: (src: string) => Promise<string>;
    /**
     * MDX image flow: analyze the file + start the pending upload
     * (`startPending` from `hagaki/pending-images`), resolving with the
     * attributes for the `<Image />` component to insert. Consumed by
     * `<HagakiEditor.InsertImage.ComponentButton>`.
     */
    onInsertImage?: (file: File) => Promise<ImageComponentAttrs>;
    /**
     * MDX image flow: display URL for a committed image id. When set,
     * `<Image />` components render inline (blurhash placeholder + upload
     * progress); ids without a pending entry resolve through this callback.
     */
    imagePreviewUrlFor?: (id: string) => string;
    /** Optional autocompletion suggestions for the image dialog. */
    imageAutocompleteSuggestions?: string[];
    className?: string;
    /** Fallback when no `<HagakiEditor.Content>` slot is provided. */
    contentEditableClassName?: string;
    /** MDXEditor's `suppressHtmlProcessing`. Defaults to `true`. */
    suppressHtmlProcessing?: boolean;
    onError?: (e: unknown) => void;
    /**
     * Override i18n strings for the built-in image dialog, link dialog, alt
     * texts, etc. Either pass a `Translation` function (full control), or an
     * `i18n` object that maps keys (`"uploadImage.addViaUrlInstructions"` etc.)
     * to their replacements — unknown keys fall back to the default English.
     */
    translation?: Translation;
    i18n?: Record<string, string>;
}
type HagakiEditorProps = HagakiEditorRootProps;

interface HagakiEditorToolbarProps {
    children?: ReactNode;
    className?: string;
}

/**
 * Context that carries the image-flow callbacks from `<HagakiEditor>` down to
 * `<HagakiEditor.InsertImage.ComponentButton>`. Provided by
 * `HagakiEditorRoot`; consumers normally never touch it directly.
 */
interface ImageComponentContextValue {
    /**
     * Analyze the file + start the pending upload, resolving with the
     * attributes for the `<Image />` component to insert.
     */
    onInsertImage?: (file: File) => Promise<ImageComponentAttrs>;
    /** Error sink for failed inserts. Falls back to `console.error`. */
    onError?: (e: unknown) => void;
}
declare const ImageComponentContext: react.Context<ImageComponentContextValue>;
interface ImageComponentConfig {
    /**
     * Display URL for a committed image (CDN). Ids not present in the pending
     * store resolve through this.
     */
    previewUrlFor: (id: string) => string;
}
/**
 * Build a {@link JsxComponentDescriptor} that renders
 * `<Image imageId="…" />` MDX components inside the editor:
 *
 *   - while the pending upload is encoding/uploading — blurhash placeholder
 *     with an "アップロード中…" overlay;
 *   - once uploaded — the temporary Workers preview URL, fading in over the
 *     blurhash;
 *   - on upload error — an inline error with a delete button;
 *   - no pending entry (already committed) — `config.previewUrlFor(id)`.
 *
 * Node selection and Backspace deletion are left to MDXEditor's standard
 * JSX-node behavior. No `source` is set — the MDX body carries no import
 * statement; consumers map the `Image` component at render time.
 */
declare function createImageComponentDescriptor(config: ImageComponentConfig): JsxComponentDescriptor;

interface DefaultPluginsOptions {
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
 * Default toolbar with block type, inline formatting, and undo/redo.
 * Callers can pass their own via `toolbarContents`.
 */
declare function defaultToolbarContents(): ReactNode;
declare function defaultPlugins(options?: DefaultPluginsOptions): RealmPlugin[];

/**
 * Toolbar buttons that we re-export from `@mdxeditor/editor` are typed loosely
 * because their real prop shapes reference deeply-nested
 * `@radix-ui/react-toolbar` symbols that `tsc` can't name portably from this
 * re-export. Consumers who want strict prop types should import the original
 * component from `@mdxeditor/editor` directly.
 */
type ToolbarButton = ComponentType<any>;
/**
 * `InsertImage` keeps its original behaviour (opens MDXEditor's image dialog)
 * but is augmented with composable subcomponents:
 *
 * - `InsertImage.Trigger` — just the button that opens the standard dialog
 * - `InsertImage.FileButton` — bypasses the dialog and opens a file picker
 *   directly, then hands the file off to `onImageUpload`.
 * - `InsertImage.ComponentButton` — file picker for the MDX image flow:
 *   hands the file to `onInsertImage` and inserts an
 *   `<Image imageId="…" />` component (requires `imagePreviewUrlFor` on the
 *   editor for inline rendering).
 */
type InsertImageComponent = ToolbarButton & {
    Trigger: ComponentType<HagakiEditorToolbarButtonProps>;
    FileButton: ComponentType<InsertImageFileButtonProps>;
    ComponentButton: ComponentType<InsertImageComponentButtonProps>;
};
type HagakiEditorComponent = ComponentType<HagakiEditorRootProps> & {
    Toolbar: ComponentType<HagakiEditorToolbarProps>;
    Content: ComponentType<HagakiEditorContentProps>;
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
    InsertImage: InsertImageComponent;
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
declare const HagakiEditor: HagakiEditorComponent;

export { type DefaultPluginsOptions, HagakiEditor, type HagakiEditorContentProps, type HagakiEditorProps, type HagakiEditorRootProps, type HagakiEditorToolbarButtonProps, type HagakiEditorToolbarProps, type ImageComponentConfig, ImageComponentContext, type ImageComponentContextValue, type InsertImageComponentButtonProps, type InsertImageFileButtonProps, createImageComponentDescriptor, defaultPlugins, defaultToolbarContents };
