"use client";
import {
    activeEditor$,
    applyFormat$,
    applyListType$,
    currentFormat$,
    currentListType$,
    editorInTable$,
    iconComponentFor$,
    insertDirective$,
    readOnly$,
    Button as ToolbarButton,
} from "@mdxeditor/editor";
import { useCellValue, useCellValues, usePublisher } from "@mdxeditor/gurx";
import {
    CAN_REDO_COMMAND,
    CAN_UNDO_COMMAND,
    COMMAND_PRIORITY_CRITICAL,
    REDO_COMMAND,
    UNDO_COMMAND,
} from "lexical";
import { type ReactNode, useContext, useEffect, useRef, useState } from "react";
import {
    IMAGE_DIRECTIVE_NAME,
    type ImageDirectiveAttrs,
} from "../markdown/directive.js";
import { ImageDirectiveContext } from "./image-directive.js";

// Bitflags used by MDXEditor's `currentFormat$`. Mirrors `FormatConstants.ts`
// inside @mdxeditor/editor (not exported, so we duplicate).
const IS_BOLD = 1;
const IS_ITALIC = 1 << 1;
const IS_STRIKETHROUGH = 1 << 2;
const IS_UNDERLINE = 1 << 3;
const IS_CODE = 1 << 4;

export interface HagakiEditorToolbarButtonProps {
    className?: string;
    /** Override the default icon. */
    children?: ReactNode;
    title?: string;
}

// MDXEditor's IconKey is a union of all known names; passing a string we know
// exists is safe.
// biome-ignore lint/suspicious/noExplicitAny: see above
const icon = (fn: (name: any) => ReactNode, name: string) => fn(name);

// ─── Undo / Redo ─────────────────────────────────────────────────────────

export function Undo(props: HagakiEditorToolbarButtonProps) {
    const activeEditor = useCellValue(activeEditor$);
    const [readOnly, iconFor] = useCellValues(readOnly$, iconComponentFor$);
    const [canUndo, setCanUndo] = useState(false);
    useEffect(() => {
        if (!activeEditor) return;
        return activeEditor.registerCommand(
            CAN_UNDO_COMMAND,
            (payload: boolean) => {
                setCanUndo(payload);
                return false;
            },
            COMMAND_PRIORITY_CRITICAL,
        );
    }, [activeEditor]);
    return (
        <ToolbarButton
            className={props.className}
            disabled={readOnly || !canUndo}
            title={props.title ?? "Undo"}
            onClick={() =>
                activeEditor?.dispatchCommand(UNDO_COMMAND, undefined)
            }
        >
            {props.children ?? icon(iconFor, "undo")}
        </ToolbarButton>
    );
}

export function Redo(props: HagakiEditorToolbarButtonProps) {
    const activeEditor = useCellValue(activeEditor$);
    const [readOnly, iconFor] = useCellValues(readOnly$, iconComponentFor$);
    const [canRedo, setCanRedo] = useState(false);
    useEffect(() => {
        if (!activeEditor) return;
        return activeEditor.registerCommand(
            CAN_REDO_COMMAND,
            (payload: boolean) => {
                setCanRedo(payload);
                return false;
            },
            COMMAND_PRIORITY_CRITICAL,
        );
    }, [activeEditor]);
    return (
        <ToolbarButton
            className={props.className}
            disabled={readOnly || !canRedo}
            title={props.title ?? "Redo"}
            onClick={() =>
                activeEditor?.dispatchCommand(REDO_COMMAND, undefined)
            }
        >
            {props.children ?? icon(iconFor, "redo")}
        </ToolbarButton>
    );
}

// ─── Inline format toggles (Bold / Italic / Underline / Strikethrough / InlineCode) ──

interface FormatButtonConfig {
    flag: number;
    name: "bold" | "italic" | "underline" | "strikethrough" | "code";
    iconName: string;
    defaultTitle: string;
}

function makeFormatButton(cfg: FormatButtonConfig) {
    return function FormatButton(props: HagakiEditorToolbarButtonProps) {
        const [currentFormat, iconFor, readOnly] = useCellValues(
            currentFormat$,
            iconComponentFor$,
            readOnly$,
        );
        const applyFormat = usePublisher(applyFormat$);
        const active = (currentFormat & cfg.flag) !== 0;
        return (
            <ToolbarButton
                className={props.className}
                disabled={readOnly}
                data-state={active ? "on" : "off"}
                title={props.title ?? cfg.defaultTitle}
                onClick={() => applyFormat(cfg.name)}
            >
                {props.children ?? icon(iconFor, cfg.iconName)}
            </ToolbarButton>
        );
    };
}

export const Bold = makeFormatButton({
    flag: IS_BOLD,
    name: "bold",
    iconName: "format_bold",
    defaultTitle: "Bold",
});
export const Italic = makeFormatButton({
    flag: IS_ITALIC,
    name: "italic",
    iconName: "format_italic",
    defaultTitle: "Italic",
});
export const Underline = makeFormatButton({
    flag: IS_UNDERLINE,
    name: "underline",
    iconName: "format_underlined",
    defaultTitle: "Underline",
});
export const Strikethrough = makeFormatButton({
    flag: IS_STRIKETHROUGH,
    name: "strikethrough",
    iconName: "strikeThrough",
    defaultTitle: "Strikethrough",
});
export const InlineCode = makeFormatButton({
    flag: IS_CODE,
    name: "code",
    iconName: "code",
    defaultTitle: "Inline code",
});

// ─── List buttons ────────────────────────────────────────────────────────

interface ListButtonConfig {
    value: "bullet" | "number" | "check";
    iconName: string;
    defaultTitle: string;
}

function makeListButton(cfg: ListButtonConfig) {
    return function ListButton(props: HagakiEditorToolbarButtonProps) {
        const [currentListType, iconFor, inTable, readOnly] = useCellValues(
            currentListType$,
            iconComponentFor$,
            editorInTable$,
            readOnly$,
        );
        const applyListType = usePublisher(applyListType$);
        const active = currentListType === cfg.value;
        return (
            <ToolbarButton
                className={props.className}
                disabled={readOnly || inTable}
                data-state={active ? "on" : "off"}
                title={props.title ?? cfg.defaultTitle}
                onClick={() => applyListType(active ? "" : cfg.value)}
            >
                {props.children ?? icon(iconFor, cfg.iconName)}
            </ToolbarButton>
        );
    };
}

export const BulletList = makeListButton({
    value: "bullet",
    iconName: "format_list_bulleted",
    defaultTitle: "Bulleted list",
});
export const NumberedList = makeListButton({
    value: "number",
    iconName: "format_list_numbered",
    defaultTitle: "Numbered list",
});
export const CheckList = makeListButton({
    value: "check",
    iconName: "format_list_checked",
    defaultTitle: "Check list",
});

// ─── Image controls ────────────────────────────────────────────────────

export interface InsertImageDirectiveButtonProps
    extends HagakiEditorToolbarButtonProps {
    /** `<input type="file">` accept attribute. Defaults to `image/*`. */
    accept?: string;
}

/**
 * File picker for the directive-based image flow: hands the file to the
 * editor's `onInsertImage` (via {@link ImageDirectiveContext}) and inserts an
 * `::img{id="…" blurhash="…" w="…" h="…" alt=""}` leaf directive with the
 * attributes it resolves to. The blurhash placeholder shows immediately while
 * the AVIF encode + upload continue in the background.
 *
 * Disabled unless the editor was given an `onInsertImage` prop. If
 * `onInsertImage` rejects, nothing is inserted and the error is reported via
 * `onError` (or `console.error`).
 */
export function InsertImageDirectiveButton(
    props: InsertImageDirectiveButtonProps,
) {
    const insertDirective = usePublisher(insertDirective$);
    const [iconFor, readOnly] = useCellValues(iconComponentFor$, readOnly$);
    const { onInsertImage, onError } = useContext(ImageDirectiveContext);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (!onInsertImage) return;
        let attrs: ImageDirectiveAttrs;
        try {
            attrs = await onInsertImage(file);
        } catch (e) {
            // Nothing was inserted — just surface the failure.
            if (onError) onError(e);
            else console.error(e);
            return;
        }
        insertDirective({
            type: "leafDirective",
            name: IMAGE_DIRECTIVE_NAME,
            // Markdown attribute names are the short forms `w`/`h`.
            attributes: {
                id: attrs.id,
                ...(attrs.blurhash ? { blurhash: attrs.blurhash } : {}),
                ...(attrs.width != null ? { w: String(attrs.width) } : {}),
                ...(attrs.height != null ? { h: String(attrs.height) } : {}),
                alt: attrs.alt ?? "",
            },
        });
    };

    return (
        <>
            <ToolbarButton
                className={props.className}
                disabled={readOnly || !onInsertImage}
                title={props.title ?? "Upload image"}
                onClick={() => inputRef.current?.click()}
            >
                {props.children ?? icon(iconFor, "add_photo")}
            </ToolbarButton>
            <input
                ref={inputRef}
                type="file"
                accept={props.accept ?? "image/*"}
                style={{ display: "none" }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                    e.target.value = "";
                }}
            />
        </>
    );
}
