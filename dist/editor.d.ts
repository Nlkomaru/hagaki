import { n as ImageComponentAttrs } from "./image-jsx-BDL3Y67c.js";
import { ComponentType, MutableRefObject, ReactNode } from "react";
import { JsxComponentDescriptor, MDXEditorMethods, MDXEditorMethods as MDXEditorMethods$1, RealmPlugin, RealmPlugin as RealmPlugin$1, Translation, Translation as Translation$1 } from "@mdxeditor/editor";
//#region src/editor/buttons.d.ts
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
//#endregion
//#region src/editor/Content.d.ts
interface HagakiEditorContentProps {
  className?: string;
}
//#endregion
//#region src/editor/Editor.d.ts
interface HagakiEditorRootProps {
  markdown: string;
  onChange: (markdown: string) => void;
  editorRef?: MutableRefObject<MDXEditorMethods$1 | null>;
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
  plugins?: RealmPlugin$1[];
  /** Async image upload handler (returns the URL to insert into markdown). */
  onImageUpload?: (file: File) => Promise<string>;
  /** Async image preview handler (resolves a URL to a display-able URL). */
  onImagePreview?: (src: string) => Promise<string>;
  /**
   * MDX image flow: analyze the file + start the pending encode
   * (`startPending` from `hagaki/pending-images`), resolving with the
   * attributes for the `<Image />` component to insert. Consumed by
   * `<HagakiEditor.InsertImage.ComponentButton>`.
   */
  onInsertImage?: (file: File) => Promise<ImageComponentAttrs>;
  /**
   * MDX image flow: display URL for a committed image id. When set,
   * `<Image />` components render inline (blurhash placeholder + encode
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
  translation?: Translation$1;
  i18n?: Record<string, string>;
}
type HagakiEditorProps = HagakiEditorRootProps;
//#endregion
//#region src/editor/Toolbar.d.ts
interface HagakiEditorToolbarProps {
  children?: ReactNode;
  className?: string;
}
//#endregion
//#region src/editor/image-jsx.d.ts
/**
 * Context that carries the image-flow callbacks from `<HagakiEditor>` down to
 * `<HagakiEditor.InsertImage.ComponentButton>`. Provided by
 * `HagakiEditorRoot`; consumers normally never touch it directly.
 */
interface ImageComponentContextValue {
  /**
   * Analyze the file + start the pending encode (`startPending` from
   * `hagaki/pending-images`), resolving with the attributes for the
   * `<Image />` component to insert.
   */
  onInsertImage?: (file: File) => Promise<ImageComponentAttrs>;
  /** Error sink for failed inserts. Falls back to `console.error`. */
  onError?: (e: unknown) => void;
}
export declare const ImageComponentContext: import("react").Context<ImageComponentContextValue>;
interface ImageComponentConfig {
  /**
   * Display URL for an image that has no pending entry — normally one that
   * is already committed (CDN).
   */
  previewUrlFor: (id: string) => string;
}
/**
 * Build a {@link JsxComponentDescriptor} that renders
 * `<Image imageId="…" />` MDX components inside the editor:
 *
 *   - while the pending entry is encoding — blurhash placeholder with a
 *     "変換中…" overlay;
 *   - once ready — the entry's in-memory `blob:` preview URL, fading in over
 *     the blurhash;
 *   - on encode error — an inline error with a delete button;
 *   - no pending entry (already committed) — `config.previewUrlFor(id)`.
 *
 * Node selection and Backspace deletion are left to MDXEditor's standard
 * JSX-node behavior. No `source` is set — the MDX body carries no import
 * statement; consumers map the `Image` component at render time.
 */
export declare function createImageComponentDescriptor(config: ImageComponentConfig): JsxComponentDescriptor;
//#endregion
//#region src/editor/plugins.d.ts
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
export declare function defaultToolbarContents(): ReactNode;
export declare function defaultPlugins(options?: DefaultPluginsOptions): RealmPlugin$1[];
//#endregion
//#region src/editor/index.d.ts
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
export declare const HagakiEditor: HagakiEditorComponent;
//#endregion
export type { DefaultPluginsOptions, HagakiEditorContentProps, HagakiEditorProps, HagakiEditorRootProps, HagakiEditorToolbarButtonProps, HagakiEditorToolbarProps, ImageComponentConfig, ImageComponentContextValue, InsertImageComponentButtonProps, InsertImageFileButtonProps, MDXEditorMethods, RealmPlugin, Translation };
//# sourceMappingURL=editor.d.ts.map