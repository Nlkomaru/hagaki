import { IMAGE_COMPONENT_NAME, parseImageComponentAttributes } from './chunk-LTAAQ5UM.js';
import { blurhashToBase64, blurhashToDataUrl } from './chunk-2NLG3F5D.js';
import { getPending, subscribe, removePending } from './chunk-CCX2QUH3.js';
import './chunk-LSPG3ZGH.js';
import { InsertImage, UndoRedo, Separator, ListsToggle, InsertThematicBreak, InsertTable, InsertCodeBlock, InsertAdmonition, DiffSourceToggleWrapper, CreateLink, ConditionalContents, CodeToggle, BoldItalicUnderlineToggles, BlockTypeSelect, insertJsx$, iconComponentFor$, readOnly$, Button, insertImage$, openNewImageDialog$, MDXEditor, activeEditor$, headingsPlugin, linkPlugin, tablePlugin, listsPlugin, directivesPlugin, AdmonitionDirectiveDescriptor, jsxPlugin, codeBlockPlugin, quotePlugin, thematicBreakPlugin, markdownShortcutPlugin, imagePlugin, toolbarPlugin, currentListType$, editorInTable$, applyListType$, currentFormat$, applyFormat$, useLexicalNodeRemove } from '@mdxeditor/editor';
import { usePublisher, useCellValues, useCellValue } from '@mdxeditor/gurx';
import { CAN_REDO_COMMAND, COMMAND_PRIORITY_CRITICAL, REDO_COMMAND, CAN_UNDO_COMMAND, UNDO_COMMAND } from 'lexical';
import { createContext, useContext, useRef, useMemo, useState, useEffect, Children, isValidElement, useCallback, useSyncExternalStore } from 'react';
import { jsxs, Fragment, jsx } from 'react/jsx-runtime';

var ImageComponentContext = createContext(
  {}
);
function createImageComponentDescriptor(config) {
  const descriptor = {
    name: IMAGE_COMPONENT_NAME,
    kind: "flow",
    props: [
      { name: "imageId", type: "string" },
      { name: "blurHash64", type: "string" },
      { name: "width", type: "string" },
      { name: "height", type: "string" },
      { name: "alt", type: "string" }
    ],
    hasChildren: false,
    // Module-level component so its identity is stable even though the
    // descriptor object itself is rebuilt on every editor render — this
    // keeps React from remounting (and re-fading) every image.
    Editor: ImageComponentEditor,
    config
  };
  return descriptor;
}
function usePendingSnapshot(id) {
  const getSnapshot = useCallback(() => {
    const entry = getPending(id);
    if (!entry) return "";
    return `${entry.status} ${entry.previewUrl ?? ""}`;
  }, [id]);
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
var SPINNER_CSS = "@keyframes hagaki-img-spin{to{transform:rotate(360deg)}}";
var overlayStyle = {
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
var spinnerStyle = {
  width: "1.25rem",
  height: "1.25rem",
  borderRadius: "50%",
  border: "2px solid rgba(255,255,255,0.4)",
  borderTopColor: "#fff",
  animation: "hagaki-img-spin 0.8s linear infinite"
};
var errorBoxStyle = {
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
var errorButtonStyle = {
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
  if (!attrs) {
    return /* @__PURE__ */ jsx("span", { style: errorBoxStyle, children: "\u753B\u50CF\u306E\u6307\u5B9A\u304C\u4E0D\u6B63\u3067\u3059" });
  }
  const { id, blurhash, width, height, alt } = attrs;
  const entry = getPending(id);
  if (entry?.status === "error") {
    const handleRemove = () => {
      removeNode();
      removePending(id);
    };
    return /* @__PURE__ */ jsxs("span", { style: errorBoxStyle, children: [
      "\u753B\u50CF\u306E\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          style: errorButtonStyle,
          onClick: handleRemove,
          children: "\u524A\u9664"
        }
      )
    ] });
  }
  const placeholder = blurhash ? blurhashToDataUrl(blurhash, width, height) : "";
  const src = entry ? entry.status === "uploaded" ? entry.previewUrl ?? "" : "" : config.previewUrlFor(id);
  const busy = entry?.status === "encoding" || entry?.status === "uploading";
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
  return /* @__PURE__ */ jsxs("span", { "data-hagaki-img": "", style: wrapperStyle, children: [
    placeholder ? /* @__PURE__ */ jsx(
      "img",
      {
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
      }
    ) : null,
    src ? /* @__PURE__ */ jsx(
      "img",
      {
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
      }
    ) : null,
    busy ? /* @__PURE__ */ jsxs("span", { style: overlayStyle, children: [
      /* @__PURE__ */ jsx("style", { children: SPINNER_CSS }),
      /* @__PURE__ */ jsx("span", { style: spinnerStyle }),
      "\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u4E2D\u2026"
    ] }) : null
  ] });
}
var IS_BOLD = 1;
var IS_ITALIC = 1 << 1;
var IS_STRIKETHROUGH = 1 << 2;
var IS_UNDERLINE = 1 << 3;
var IS_CODE = 1 << 4;
var icon = (fn, name) => fn(name);
function Undo(props) {
  const activeEditor = useCellValue(activeEditor$);
  const [readOnly, iconFor] = useCellValues(readOnly$, iconComponentFor$);
  const [canUndo, setCanUndo] = useState(false);
  useEffect(() => {
    if (!activeEditor) return;
    return activeEditor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [activeEditor]);
  return /* @__PURE__ */ jsx(
    Button,
    {
      className: props.className,
      disabled: readOnly || !canUndo,
      title: props.title ?? "Undo",
      onClick: () => activeEditor?.dispatchCommand(UNDO_COMMAND, void 0),
      children: props.children ?? icon(iconFor, "undo")
    }
  );
}
function Redo(props) {
  const activeEditor = useCellValue(activeEditor$);
  const [readOnly, iconFor] = useCellValues(readOnly$, iconComponentFor$);
  const [canRedo, setCanRedo] = useState(false);
  useEffect(() => {
    if (!activeEditor) return;
    return activeEditor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [activeEditor]);
  return /* @__PURE__ */ jsx(
    Button,
    {
      className: props.className,
      disabled: readOnly || !canRedo,
      title: props.title ?? "Redo",
      onClick: () => activeEditor?.dispatchCommand(REDO_COMMAND, void 0),
      children: props.children ?? icon(iconFor, "redo")
    }
  );
}
function makeFormatButton(cfg) {
  return function FormatButton(props) {
    const [currentFormat, iconFor, readOnly] = useCellValues(
      currentFormat$,
      iconComponentFor$,
      readOnly$
    );
    const applyFormat = usePublisher(applyFormat$);
    const active = (currentFormat & cfg.flag) !== 0;
    return /* @__PURE__ */ jsx(
      Button,
      {
        className: props.className,
        disabled: readOnly,
        "data-state": active ? "on" : "off",
        title: props.title ?? cfg.defaultTitle,
        onClick: () => applyFormat(cfg.name),
        children: props.children ?? icon(iconFor, cfg.iconName)
      }
    );
  };
}
var Bold = makeFormatButton({
  flag: IS_BOLD,
  name: "bold",
  iconName: "format_bold",
  defaultTitle: "Bold"
});
var Italic = makeFormatButton({
  flag: IS_ITALIC,
  name: "italic",
  iconName: "format_italic",
  defaultTitle: "Italic"
});
var Underline = makeFormatButton({
  flag: IS_UNDERLINE,
  name: "underline",
  iconName: "format_underlined",
  defaultTitle: "Underline"
});
var Strikethrough = makeFormatButton({
  flag: IS_STRIKETHROUGH,
  name: "strikethrough",
  iconName: "strikeThrough",
  defaultTitle: "Strikethrough"
});
var InlineCode = makeFormatButton({
  flag: IS_CODE,
  name: "code",
  iconName: "code",
  defaultTitle: "Inline code"
});
function makeListButton(cfg) {
  return function ListButton(props) {
    const [currentListType, iconFor, inTable, readOnly] = useCellValues(
      currentListType$,
      iconComponentFor$,
      editorInTable$,
      readOnly$
    );
    const applyListType = usePublisher(applyListType$);
    const active = currentListType === cfg.value;
    return /* @__PURE__ */ jsx(
      Button,
      {
        className: props.className,
        disabled: readOnly || inTable,
        "data-state": active ? "on" : "off",
        title: props.title ?? cfg.defaultTitle,
        onClick: () => applyListType(active ? "" : cfg.value),
        children: props.children ?? icon(iconFor, cfg.iconName)
      }
    );
  };
}
var BulletList = makeListButton({
  value: "bullet",
  iconName: "format_list_bulleted",
  defaultTitle: "Bulleted list"
});
var NumberedList = makeListButton({
  value: "number",
  iconName: "format_list_numbered",
  defaultTitle: "Numbered list"
});
var CheckList = makeListButton({
  value: "check",
  iconName: "format_list_checked",
  defaultTitle: "Check list"
});
function InsertImageTrigger(props) {
  const openDialog = usePublisher(openNewImageDialog$);
  const [iconFor, readOnly] = useCellValues(iconComponentFor$, readOnly$);
  return /* @__PURE__ */ jsx(
    Button,
    {
      className: props.className,
      disabled: readOnly,
      title: props.title ?? "Insert image",
      onClick: () => openDialog(),
      children: props.children ?? icon(iconFor, "add_photo")
    }
  );
}
function InsertImageFileButton(props) {
  const insert = usePublisher(insertImage$);
  const [iconFor, readOnly] = useCellValues(iconComponentFor$, readOnly$);
  const inputRef = useRef(null);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      Button,
      {
        className: props.className,
        disabled: readOnly,
        title: props.title ?? "Upload image",
        onClick: () => inputRef.current?.click(),
        children: props.children ?? icon(iconFor, "add_photo")
      }
    ),
    /* @__PURE__ */ jsx(
      "input",
      {
        ref: inputRef,
        type: "file",
        accept: props.accept ?? "image/*",
        style: { display: "none" },
        onChange: (e) => {
          const file = e.target.files?.[0];
          if (file) insert({ file, altText: "", title: "" });
          e.target.value = "";
        }
      }
    )
  ] });
}
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
      // String attributes only — hagaki/react's <Image> coerces
      // width/height back to numbers.
      props: {
        imageId: attrs.id,
        ...attrs.blurhash ? { blurHash64: blurhashToBase64(attrs.blurhash) } : {},
        ...attrs.width != null ? { width: String(attrs.width) } : {},
        ...attrs.height != null ? { height: String(attrs.height) } : {},
        alt: attrs.alt ?? ""
      }
    });
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      Button,
      {
        className: props.className,
        disabled: readOnly || !onInsertImage,
        title: props.title ?? "Upload image",
        onClick: () => inputRef.current?.click(),
        children: props.children ?? icon(iconFor, "add_photo")
      }
    ),
    /* @__PURE__ */ jsx(
      "input",
      {
        ref: inputRef,
        type: "file",
        accept: props.accept ?? "image/*",
        style: { display: "none" },
        onChange: (e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }
      }
    )
  ] });
}

// src/editor/Content.tsx
function Content(_props) {
  return null;
}
function defaultToolbarContents() {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(BlockTypeSelect, {}),
    /* @__PURE__ */ jsx(BoldItalicUnderlineToggles, {}),
    /* @__PURE__ */ jsx(UndoRedo, {})
  ] });
}
function defaultPlugins(options = {}) {
  const plugins = [
    headingsPlugin(),
    linkPlugin(),
    tablePlugin(),
    listsPlugin(),
    directivesPlugin({
      directiveDescriptors: [AdmonitionDirectiveDescriptor]
    }),
    // MDX `<Image />` support. Registered even without a resolver so
    // bodies that contain the component still parse instead of erroring.
    jsxPlugin({
      jsxComponentDescriptors: [
        createImageComponentDescriptor({
          previewUrlFor: options.imagePreviewUrlFor ?? (() => "")
        })
      ]
    }),
    codeBlockPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin()
  ];
  if (options.imageUploadHandler || options.imagePreviewHandler) {
    plugins.push(
      imagePlugin({
        imageUploadHandler: options.imageUploadHandler,
        imagePreviewHandler: options.imagePreviewHandler,
        imageAutocompleteSuggestions: options.imageAutocompleteSuggestions
      })
    );
  }
  if (options.toolbarContents) {
    plugins.push(
      toolbarPlugin({
        toolbarClassName: options.toolbarClassName,
        toolbarContents: options.toolbarContents
      })
    );
  }
  return plugins;
}

// src/editor/Toolbar.tsx
function Toolbar(_props) {
  return null;
}
function resolveSlots(children) {
  const slots = {};
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    if (child.type === Toolbar) {
      const props = child.props;
      slots.toolbarChildren = props.children;
      slots.toolbarClassName = props.className;
    } else if (child.type === Content) {
      const props = child.props;
      slots.contentClassName = props.className;
    }
  }
  return slots;
}
function buildPlugins(props, slots) {
  const plugins = [
    headingsPlugin(),
    linkPlugin(),
    tablePlugin(),
    listsPlugin(),
    directivesPlugin({
      directiveDescriptors: [AdmonitionDirectiveDescriptor]
    }),
    // MDX `<Image />` support. Registered even without a resolver so
    // bodies that contain the component still parse instead of erroring.
    jsxPlugin({
      jsxComponentDescriptors: [
        createImageComponentDescriptor({
          previewUrlFor: props.imagePreviewUrlFor ?? (() => "")
        })
      ]
    }),
    codeBlockPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin()
  ];
  if (props.onImageUpload || props.onImagePreview) {
    plugins.push(
      imagePlugin({
        imageUploadHandler: props.onImageUpload,
        imagePreviewHandler: props.onImagePreview,
        imageAutocompleteSuggestions: props.imageAutocompleteSuggestions
      })
    );
  }
  if (slots.toolbarChildren != null) {
    plugins.push(
      toolbarPlugin({
        toolbarClassName: slots.toolbarClassName,
        toolbarContents: () => slots.toolbarChildren
      })
    );
  }
  return plugins;
}
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
    onInsertImage,
    translation,
    i18n
  } = props;
  const slots = plugins ? {} : resolveSlots(children);
  const finalPlugins = plugins ?? buildPlugins(props, slots);
  const finalTranslation = resolveTranslation(translation, i18n);
  const imageComponentContext = useMemo(
    () => ({ onInsertImage, onError }),
    [onInsertImage, onError]
  );
  return /* @__PURE__ */ jsx(ImageComponentContext.Provider, { value: imageComponentContext, children: /* @__PURE__ */ jsx(
    MDXEditor,
    {
      ref: editorRef,
      markdown,
      onChange,
      onError,
      suppressHtmlProcessing,
      plugins: finalPlugins.length > 0 ? finalPlugins : defaultPlugins(),
      className,
      contentEditableClassName: slots.contentClassName ?? contentEditableClassName,
      translation: finalTranslation
    }
  ) });
}

// src/editor/index.ts
var InsertImage2 = Object.assign(InsertImage, {
  Trigger: InsertImageTrigger,
  FileButton: InsertImageFileButton,
  ComponentButton: InsertImageComponentButton
});
var HagakiEditor = Object.assign(HagakiEditorRoot, {
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
  InsertImage: InsertImage2,
  BlockTypeSelect: BlockTypeSelect,
  BoldItalicUnderlineToggles: BoldItalicUnderlineToggles,
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
  UndoRedo: UndoRedo
});

export { HagakiEditor, ImageComponentContext, createImageComponentDescriptor, defaultPlugins, defaultToolbarContents };
//# sourceMappingURL=editor.js.map
//# sourceMappingURL=editor.js.map