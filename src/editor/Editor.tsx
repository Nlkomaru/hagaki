"use client";

import {
    AdmonitionDirectiveDescriptor,
    codeBlockPlugin,
    directivesPlugin,
    headingsPlugin,
    imagePlugin,
    linkPlugin,
    listsPlugin,
    MDXEditor,
    type MDXEditorMethods,
    markdownShortcutPlugin,
    quotePlugin,
    type RealmPlugin,
    type Translation,
    tablePlugin,
    thematicBreakPlugin,
    toolbarPlugin,
} from "@mdxeditor/editor";
import {
    Children,
    isValidElement,
    type MutableRefObject,
    type ReactNode,
} from "react";
import { Content } from "./Content.js";
import { defaultPlugins } from "./plugins.js";
import { Toolbar } from "./Toolbar.js";

export interface HagakiEditorRootProps {
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

interface ResolvedSlots {
    toolbarChildren?: ReactNode;
    toolbarClassName?: string;
    contentClassName?: string;
}

function resolveSlots(children: ReactNode): ResolvedSlots {
    const slots: ResolvedSlots = {};
    for (const child of Children.toArray(children)) {
        if (!isValidElement(child)) continue;
        if (child.type === Toolbar) {
            const props = child.props as {
                children?: ReactNode;
                className?: string;
            };
            slots.toolbarChildren = props.children;
            slots.toolbarClassName = props.className;
        } else if (child.type === Content) {
            const props = child.props as { className?: string };
            slots.contentClassName = props.className;
        }
    }
    return slots;
}

function buildPlugins(
    props: HagakiEditorRootProps,
    slots: ResolvedSlots,
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

    if (props.onImageUpload || props.onImagePreview) {
        plugins.push(
            imagePlugin({
                imageUploadHandler: props.onImageUpload,
                imagePreviewHandler: props.onImagePreview,
                imageAutocompleteSuggestions:
                    props.imageAutocompleteSuggestions,
            }),
        );
    }

    if (slots.toolbarChildren != null) {
        plugins.push(
            toolbarPlugin({
                toolbarClassName: slots.toolbarClassName,
                toolbarContents: () => slots.toolbarChildren,
            }),
        );
    }

    return plugins;
}

/**
 * Composite editor. Compose with `<HagakiEditor.Toolbar>` and
 * `<HagakiEditor.Content>` to style each region independently:
 *
 * ```tsx
 * <HagakiEditor markdown={md} onChange={setMd} onImageUpload={handleUpload}>
 *   <HagakiEditor.Toolbar className="...">
 *     <HagakiEditor.UndoRedo />
 *     <HagakiEditor.BoldItalicUnderlineToggles />
 *     <HagakiEditor.InsertImage />
 *   </HagakiEditor.Toolbar>
 *   <HagakiEditor.Content className="prose p-4" />
 * </HagakiEditor>
 * ```
 *
 * For full plugin control, pass a custom `plugins` prop (children are ignored).
 *
 * Note: MDXEditor is client-only. In Next.js or TanStack Start, load this via
 * `dynamic(() => import("./your-editor"), { ssr: false })` or `lazy(...)`.
 */
function resolveTranslation(
    translation: Translation | undefined,
    i18n: Record<string, string> | undefined,
): Translation | undefined {
    if (translation) return translation;
    if (!i18n) return undefined;
    return (key, defaultValue, interpolations) => {
        const override = i18n[key];
        if (override === undefined) return defaultValue;
        if (!interpolations) return override;
        // Same interpolation syntax as MDXEditor's default (`{{name}}`).
        return override.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
            const value = interpolations[name];
            return value == null ? "" : String(value);
        });
    };
}

export function HagakiEditorRoot(props: HagakiEditorRootProps) {
    const {
        markdown,
        onChange,
        editorRef,
        children,
        plugins,
        className,
        contentEditableClassName,
        suppressHtmlProcessing = true,
        onError,
        translation,
        i18n,
    } = props;

    const slots = plugins ? {} : resolveSlots(children);
    const finalPlugins = plugins ?? buildPlugins(props, slots);
    const finalTranslation = resolveTranslation(translation, i18n);

    return (
        <MDXEditor
            ref={editorRef}
            markdown={markdown}
            onChange={onChange}
            onError={onError}
            suppressHtmlProcessing={suppressHtmlProcessing}
            plugins={finalPlugins.length > 0 ? finalPlugins : defaultPlugins()}
            className={className}
            contentEditableClassName={
                slots.contentClassName ?? contentEditableClassName
            }
            translation={finalTranslation}
        />
    );
}

export type HagakiEditorProps = HagakiEditorRootProps;
