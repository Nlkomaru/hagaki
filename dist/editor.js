import { t as blurhashToDataUrl } from "./blurhash-data-url-CIOkeGeK.js";
import { n as blurhashToBase64 } from "./blurhash64-5JxhilOc.js";
import { a as parseImageComponentAttributes, t as IMAGE_COMPONENT_NAME } from "./image-jsx-BUhLvWgR.js";
import { a as getPending, d as subscribe, l as removePending } from "./store-CEqpYuPk.js";
import { Children, createContext, isValidElement, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { AdmonitionDirectiveDescriptor, BlockTypeSelect, BlockTypeSelect as BlockTypeSelect$1, BoldItalicUnderlineToggles, BoldItalicUnderlineToggles as BoldItalicUnderlineToggles$1, Button, CodeToggle, ConditionalContents, CreateLink, DiffSourceToggleWrapper, InsertAdmonition, InsertCodeBlock, InsertImage as InsertImage$1, InsertTable, InsertThematicBreak, ListsToggle, MDXEditor, Separator, UndoRedo, UndoRedo as UndoRedo$1, activeEditor$, applyFormat$, applyListType$, codeBlockPlugin, currentFormat$, currentListType$, directivesPlugin, editorInTable$, headingsPlugin, iconComponentFor$, imagePlugin, insertImage$, insertJsx$, jsxPlugin, linkPlugin, listsPlugin, markdownShortcutPlugin, openNewImageDialog$, quotePlugin, readOnly$, tablePlugin, thematicBreakPlugin, toolbarPlugin, useLexicalNodeRemove } from "@mdxeditor/editor";
import { useCellValue, useCellValues, usePublisher } from "@mdxeditor/gurx";
import { CAN_REDO_COMMAND, CAN_UNDO_COMMAND, COMMAND_PRIORITY_CRITICAL, REDO_COMMAND, UNDO_COMMAND } from "lexical";
//#region src/editor/image-jsx.tsx
const ImageComponentContext = createContext({});
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
function createImageComponentDescriptor(config) {
	return {
		name: IMAGE_COMPONENT_NAME,
		kind: "flow",
		props: [
			{
				name: "imageId",
				type: "string"
			},
			{
				name: "blurHash64",
				type: "string"
			},
			{
				name: "width",
				type: "string"
			},
			{
				name: "height",
				type: "string"
			},
			{
				name: "alt",
				type: "string"
			}
		],
		hasChildren: false,
		Editor: ImageComponentEditor,
		config
	};
}
/**
* Subscribe to the pending store and re-render when the entry for `id`
* changes. Entries mutate in place, so the snapshot serializes the fields the
* view depends on instead of relying on object identity.
*/
function usePendingSnapshot(id) {
	const getSnapshot = useCallback(() => {
		const entry = getPending(id);
		if (!entry) return "";
		return `${entry.status} ${entry.previewUrl ?? ""}`;
	}, [id]);
	useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
const SPINNER_CSS = "@keyframes hagaki-img-spin{to{transform:rotate(360deg)}}";
const overlayStyle = {
	position: "absolute",
	inset: 0,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	gap: "0.5rem",
	background: "rgba(0,0,0,0.35)",
	color: "#fff",
	fontSize: "0.875rem",
	lineHeight: 1.4
};
const spinnerStyle = {
	width: "1.25rem",
	height: "1.25rem",
	borderRadius: "50%",
	border: "2px solid rgba(255,255,255,0.4)",
	borderTopColor: "#fff",
	animation: "hagaki-img-spin 0.8s linear infinite"
};
const errorBoxStyle = {
	display: "inline-flex",
	alignItems: "center",
	gap: "0.5rem",
	padding: "0.5rem 0.75rem",
	border: "1px solid #dc2626",
	borderRadius: "0.5rem",
	color: "#dc2626",
	fontSize: "0.875rem",
	lineHeight: 1.4
};
const errorButtonStyle = {
	padding: "0.125rem 0.5rem",
	border: "1px solid currentcolor",
	borderRadius: "0.25rem",
	background: "transparent",
	color: "inherit",
	font: "inherit",
	cursor: "pointer"
};
function ImageComponentEditor(props) {
	const { mdastNode, descriptor } = props;
	const { config } = descriptor;
	const attrs = parseImageComponentAttributes(mdastNode.attributes);
	usePendingSnapshot(attrs?.id ?? "");
	const [loaded, setLoaded] = useState(false);
	const removeNode = useLexicalNodeRemove();
	if (!attrs) return /* @__PURE__ */ jsx("span", {
		style: errorBoxStyle,
		children: "画像の指定が不正です"
	});
	const { id, blurhash, width, height, alt } = attrs;
	const entry = getPending(id);
	if (entry?.status === "error") {
		const handleRemove = () => {
			removeNode();
			removePending(id);
		};
		return /* @__PURE__ */ jsxs("span", {
			style: errorBoxStyle,
			children: ["画像の変換に失敗しました", /* @__PURE__ */ jsx("button", {
				type: "button",
				style: errorButtonStyle,
				onClick: handleRemove,
				children: "削除"
			})]
		});
	}
	const placeholder = blurhash ? blurhashToDataUrl(blurhash, width, height) : "";
	const src = entry ? entry.previewUrl ?? "" : config.previewUrlFor(id);
	const busy = entry?.status === "encoding";
	const wrapperStyle = {
		position: "relative",
		display: "inline-block",
		overflow: "hidden",
		lineHeight: 0,
		background: "#0001",
		borderRadius: "0.5rem",
		aspectRatio: width && height ? `${width} / ${height}` : void 0,
		maxWidth: "100%",
		width: width && height ? `${width}px` : void 0
	};
	return /* @__PURE__ */ jsxs("span", {
		"data-hagaki-img": "",
		style: wrapperStyle,
		children: [
			placeholder ? /* @__PURE__ */ jsx("img", {
				src: placeholder,
				alt: "",
				"aria-hidden": "true",
				style: {
					position: "absolute",
					inset: 0,
					width: "100%",
					height: "100%",
					objectFit: "cover",
					filter: "blur(18px)",
					transform: "scale(1.1)"
				}
			}) : null,
			src ? /* @__PURE__ */ jsx("img", {
				src,
				alt: alt ?? "",
				width,
				height,
				onLoad: () => setLoaded(true),
				onError: () => setLoaded(true),
				style: {
					position: "relative",
					display: "block",
					width: "100%",
					height: "auto",
					opacity: placeholder && !loaded ? 0 : 1,
					transition: "opacity 350ms ease-in"
				}
			}) : null,
			busy ? /* @__PURE__ */ jsxs("span", {
				style: overlayStyle,
				children: [
					/* @__PURE__ */ jsx("style", { children: SPINNER_CSS }),
					/* @__PURE__ */ jsx("span", { style: spinnerStyle }),
					"変換中…"
				]
			}) : null
		]
	});
}
//#endregion
//#region src/editor/buttons.tsx
const IS_BOLD = 1;
const IS_ITALIC = 2;
const IS_STRIKETHROUGH = 4;
const IS_UNDERLINE = 8;
const IS_CODE = 16;
const icon = (fn, name) => fn(name);
function Undo(props) {
	const activeEditor = useCellValue(activeEditor$);
	const [readOnly, iconFor] = useCellValues(readOnly$, iconComponentFor$);
	const [canUndo, setCanUndo] = useState(false);
	useEffect(() => {
		if (!activeEditor) return;
		return activeEditor.registerCommand(CAN_UNDO_COMMAND, (payload) => {
			setCanUndo(payload);
			return false;
		}, COMMAND_PRIORITY_CRITICAL);
	}, [activeEditor]);
	return /* @__PURE__ */ jsx(Button, {
		className: props.className,
		disabled: readOnly || !canUndo,
		title: props.title ?? "Undo",
		onClick: () => activeEditor?.dispatchCommand(UNDO_COMMAND, void 0),
		children: props.children ?? icon(iconFor, "undo")
	});
}
function Redo(props) {
	const activeEditor = useCellValue(activeEditor$);
	const [readOnly, iconFor] = useCellValues(readOnly$, iconComponentFor$);
	const [canRedo, setCanRedo] = useState(false);
	useEffect(() => {
		if (!activeEditor) return;
		return activeEditor.registerCommand(CAN_REDO_COMMAND, (payload) => {
			setCanRedo(payload);
			return false;
		}, COMMAND_PRIORITY_CRITICAL);
	}, [activeEditor]);
	return /* @__PURE__ */ jsx(Button, {
		className: props.className,
		disabled: readOnly || !canRedo,
		title: props.title ?? "Redo",
		onClick: () => activeEditor?.dispatchCommand(REDO_COMMAND, void 0),
		children: props.children ?? icon(iconFor, "redo")
	});
}
function makeFormatButton(cfg) {
	return function FormatButton(props) {
		const [currentFormat, iconFor, readOnly] = useCellValues(currentFormat$, iconComponentFor$, readOnly$);
		const applyFormat = usePublisher(applyFormat$);
		const active = (currentFormat & cfg.flag) !== 0;
		return /* @__PURE__ */ jsx(Button, {
			className: props.className,
			disabled: readOnly,
			"data-state": active ? "on" : "off",
			title: props.title ?? cfg.defaultTitle,
			onClick: () => applyFormat(cfg.name),
			children: props.children ?? icon(iconFor, cfg.iconName)
		});
	};
}
const Bold = makeFormatButton({
	flag: IS_BOLD,
	name: "bold",
	iconName: "format_bold",
	defaultTitle: "Bold"
});
const Italic = makeFormatButton({
	flag: IS_ITALIC,
	name: "italic",
	iconName: "format_italic",
	defaultTitle: "Italic"
});
const Underline = makeFormatButton({
	flag: IS_UNDERLINE,
	name: "underline",
	iconName: "format_underlined",
	defaultTitle: "Underline"
});
const Strikethrough = makeFormatButton({
	flag: IS_STRIKETHROUGH,
	name: "strikethrough",
	iconName: "strikeThrough",
	defaultTitle: "Strikethrough"
});
const InlineCode = makeFormatButton({
	flag: IS_CODE,
	name: "code",
	iconName: "code",
	defaultTitle: "Inline code"
});
function makeListButton(cfg) {
	return function ListButton(props) {
		const [currentListType, iconFor, inTable, readOnly] = useCellValues(currentListType$, iconComponentFor$, editorInTable$, readOnly$);
		const applyListType = usePublisher(applyListType$);
		const active = currentListType === cfg.value;
		return /* @__PURE__ */ jsx(Button, {
			className: props.className,
			disabled: readOnly || inTable,
			"data-state": active ? "on" : "off",
			title: props.title ?? cfg.defaultTitle,
			onClick: () => applyListType(active ? "" : cfg.value),
			children: props.children ?? icon(iconFor, cfg.iconName)
		});
	};
}
const BulletList = makeListButton({
	value: "bullet",
	iconName: "format_list_bulleted",
	defaultTitle: "Bulleted list"
});
const NumberedList = makeListButton({
	value: "number",
	iconName: "format_list_numbered",
	defaultTitle: "Numbered list"
});
const CheckList = makeListButton({
	value: "check",
	iconName: "format_list_checked",
	defaultTitle: "Check list"
});
/** Opens MDXEditor's built-in image dialog (URL + alt + optional upload). */
function InsertImageTrigger(props) {
	const openDialog = usePublisher(openNewImageDialog$);
	const [iconFor, readOnly] = useCellValues(iconComponentFor$, readOnly$);
	return /* @__PURE__ */ jsx(Button, {
		className: props.className,
		disabled: readOnly,
		title: props.title ?? "Insert image",
		onClick: () => openDialog(),
		children: props.children ?? icon(iconFor, "add_photo")
	});
}
/**
* Bypasses the standard image dialog: opens a file picker, hands the file off
* to the configured `onImageUpload`, then inserts the image into the document.
* Useful when you want a "drop a file → image appears" UX.
*/
function InsertImageFileButton(props) {
	const insert = usePublisher(insertImage$);
	const [iconFor, readOnly] = useCellValues(iconComponentFor$, readOnly$);
	const inputRef = useRef(null);
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Button, {
		className: props.className,
		disabled: readOnly,
		title: props.title ?? "Upload image",
		onClick: () => inputRef.current?.click(),
		children: props.children ?? icon(iconFor, "add_photo")
	}), /* @__PURE__ */ jsx("input", {
		ref: inputRef,
		type: "file",
		accept: props.accept ?? "image/*",
		style: { display: "none" },
		onChange: (e) => {
			const file = e.target.files?.[0];
			if (file) insert({
				file,
				altText: "",
				title: ""
			});
			e.target.value = "";
		}
	})] });
}
/**
* File picker for the MDX image flow: hands the file to the editor's
* `onInsertImage` (via {@link ImageComponentContext}) and inserts an
* `<Image imageId="…" blurHash64="…" width="…" height="…" alt="" />` component
* with the attributes it resolves to. The blurhash placeholder shows
* immediately while the AVIF encode continues in the background.
*
* Disabled unless the editor was given an `onInsertImage` prop. If
* `onInsertImage` rejects, nothing is inserted and the error is reported via
* `onError` (or `console.error`).
*/
function InsertImageComponentButton(props) {
	const insertJsx = usePublisher(insertJsx$);
	const [iconFor, readOnly] = useCellValues(iconComponentFor$, readOnly$);
	const { onInsertImage, onError } = useContext(ImageComponentContext);
	const inputRef = useRef(null);
	const handleFile = async (file) => {
		if (!onInsertImage) return;
		let attrs;
		try {
			attrs = await onInsertImage(file);
		} catch (e) {
			if (onError) onError(e);
			else console.error(e);
			return;
		}
		insertJsx({
			kind: "flow",
			name: IMAGE_COMPONENT_NAME,
			props: {
				imageId: attrs.id,
				...attrs.blurhash ? { blurHash64: blurhashToBase64(attrs.blurhash) } : {},
				...attrs.width != null ? { width: String(attrs.width) } : {},
				...attrs.height != null ? { height: String(attrs.height) } : {},
				alt: attrs.alt ?? ""
			}
		});
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Button, {
		className: props.className,
		disabled: readOnly || !onInsertImage,
		title: props.title ?? "Upload image",
		onClick: () => inputRef.current?.click(),
		children: props.children ?? icon(iconFor, "add_photo")
	}), /* @__PURE__ */ jsx("input", {
		ref: inputRef,
		type: "file",
		accept: props.accept ?? "image/*",
		style: { display: "none" },
		onChange: (e) => {
			const file = e.target.files?.[0];
			if (file) handleFile(file);
			e.target.value = "";
		}
	})] });
}
//#endregion
//#region src/editor/Content.tsx
/**
* Slot marker. `HagakiEditorRoot` reads the `className` prop and passes it as
* MDXEditor's `contentEditableClassName`. The component renders nothing on its
* own — MDXEditor renders the editable surface.
*/
function Content(_props) {
	return null;
}
//#endregion
//#region src/editor/plugins.tsx
/**
* Default toolbar with block type, inline formatting, and undo/redo.
* Callers can pass their own via `toolbarContents`.
*/
function defaultToolbarContents() {
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(BlockTypeSelect$1, {}),
		/* @__PURE__ */ jsx(BoldItalicUnderlineToggles$1, {}),
		/* @__PURE__ */ jsx(UndoRedo$1, {})
	] });
}
function defaultPlugins(options = {}) {
	const plugins = [
		headingsPlugin(),
		linkPlugin(),
		tablePlugin(),
		listsPlugin(),
		directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
		jsxPlugin({ jsxComponentDescriptors: [createImageComponentDescriptor({ previewUrlFor: options.imagePreviewUrlFor ?? (() => "") })] }),
		codeBlockPlugin(),
		quotePlugin(),
		thematicBreakPlugin(),
		markdownShortcutPlugin()
	];
	if (options.imageUploadHandler || options.imagePreviewHandler) plugins.push(imagePlugin({
		imageUploadHandler: options.imageUploadHandler,
		imagePreviewHandler: options.imagePreviewHandler,
		imageAutocompleteSuggestions: options.imageAutocompleteSuggestions
	}));
	if (options.toolbarContents) plugins.push(toolbarPlugin({
		toolbarClassName: options.toolbarClassName,
		toolbarContents: options.toolbarContents
	}));
	return plugins;
}
//#endregion
//#region src/editor/Toolbar.tsx
/**
* Slot marker. `HagakiEditorRoot` scans for this element type and forwards its
* children into MDXEditor's `toolbarPlugin({ toolbarContents })`. Children must
* be MDXEditor toolbar components (re-exported as `HagakiEditor.UndoRedo` etc.)
* because they rely on MDXEditor's gurx context.
*/
function Toolbar(_props) {
	return null;
}
//#endregion
//#region src/editor/Editor.tsx
function resolveSlots(children) {
	const slots = {};
	for (const child of Children.toArray(children)) {
		if (!isValidElement(child)) continue;
		if (child.type === Toolbar) {
			const props = child.props;
			slots.toolbarChildren = props.children;
			slots.toolbarClassName = props.className;
		} else if (child.type === Content) slots.contentClassName = child.props.className;
	}
	return slots;
}
function buildPlugins(props, slots) {
	const plugins = [
		headingsPlugin(),
		linkPlugin(),
		tablePlugin(),
		listsPlugin(),
		directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
		jsxPlugin({ jsxComponentDescriptors: [createImageComponentDescriptor({ previewUrlFor: props.imagePreviewUrlFor ?? (() => "") })] }),
		codeBlockPlugin(),
		quotePlugin(),
		thematicBreakPlugin(),
		markdownShortcutPlugin()
	];
	if (props.onImageUpload || props.onImagePreview) plugins.push(imagePlugin({
		imageUploadHandler: props.onImageUpload,
		imagePreviewHandler: props.onImagePreview,
		imageAutocompleteSuggestions: props.imageAutocompleteSuggestions
	}));
	if (slots.toolbarChildren != null) plugins.push(toolbarPlugin({
		toolbarClassName: slots.toolbarClassName,
		toolbarContents: () => slots.toolbarChildren
	}));
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
function resolveTranslation(translation, i18n) {
	if (translation) return translation;
	if (!i18n) return void 0;
	return (key, defaultValue, interpolations) => {
		const override = i18n[key];
		if (override === void 0) return defaultValue;
		if (!interpolations) return override;
		return override.replace(/\{\{(\w+)\}\}/g, (_match, name) => {
			const value = interpolations[name];
			return value == null ? "" : String(value);
		});
	};
}
function HagakiEditorRoot(props) {
	const { markdown, onChange, editorRef, children, plugins, className, contentEditableClassName, suppressHtmlProcessing = true, onError, onInsertImage, translation, i18n } = props;
	const slots = plugins ? {} : resolveSlots(children);
	const finalPlugins = plugins ?? buildPlugins(props, slots);
	const finalTranslation = resolveTranslation(translation, i18n);
	const imageComponentContext = useMemo(() => ({
		onInsertImage,
		onError
	}), [onInsertImage, onError]);
	return /* @__PURE__ */ jsx(ImageComponentContext.Provider, {
		value: imageComponentContext,
		children: /* @__PURE__ */ jsx(MDXEditor, {
			ref: editorRef,
			markdown,
			onChange,
			onError,
			suppressHtmlProcessing,
			plugins: finalPlugins.length > 0 ? finalPlugins : defaultPlugins(),
			className,
			contentEditableClassName: slots.contentClassName ?? contentEditableClassName,
			translation: finalTranslation
		})
	});
}
//#endregion
//#region src/editor/index.ts
const InsertImage = Object.assign(InsertImage$1, {
	Trigger: InsertImageTrigger,
	FileButton: InsertImageFileButton,
	ComponentButton: InsertImageComponentButton
});
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
const HagakiEditor = Object.assign(HagakiEditorRoot, {
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
	UndoRedo
});
//#endregion
export { HagakiEditor, ImageComponentContext, createImageComponentDescriptor, defaultPlugins, defaultToolbarContents };

//# sourceMappingURL=editor.js.map