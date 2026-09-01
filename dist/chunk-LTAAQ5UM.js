import { blurhashToBase64, blurhashFromBase64 } from './chunk-2NLG3F5D.js';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

var IMAGE_COMPONENT_NAME = "Image";
var UUID_REGEX = /^[a-f0-9-]{36}$/i;
var MAX_IMAGE_DIMENSION = 2e4;
function cleanAttrValue(value) {
  return value.replace(/["{}<>]/g, "").replace(/[\r\n]+/g, " ");
}
function parseDimension(value) {
  if (!value) return void 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return void 0;
  const i = Math.floor(n);
  if (i < 1 || i > MAX_IMAGE_DIMENSION) return void 0;
  return i;
}
function isValidDimension(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= MAX_IMAGE_DIMENSION;
}
function imageComponentMarkdown(attrs) {
  const parts = [`imageId="${cleanAttrValue(attrs.id)}"`];
  if (attrs.blurhash) {
    parts.push(
      `blurHash64="${cleanAttrValue(blurhashToBase64(attrs.blurhash))}"`
    );
  }
  if (isValidDimension(attrs.width)) {
    parts.push(`width="${Math.floor(attrs.width)}"`);
  }
  if (isValidDimension(attrs.height)) {
    parts.push(`height="${Math.floor(attrs.height)}"`);
  }
  if (attrs.alt != null) parts.push(`alt="${cleanAttrValue(attrs.alt)}"`);
  return `<${IMAGE_COMPONENT_NAME} ${parts.join(" ")} />`;
}
function isImageComponentNode(node) {
  return (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") && node.name === IMAGE_COMPONENT_NAME;
}
function attrValue(attributes, name) {
  for (const attr of attributes ?? []) {
    if (attr?.type !== "mdxJsxAttribute" || attr.name !== name) continue;
    const { value } = attr;
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      const raw = value.value ?? void 0;
      if (raw == null) return void 0;
      const m = /^\s*(["'])(.*)\1\s*$/s.exec(raw);
      return m ? m[2] : raw.trim();
    }
    return void 0;
  }
  return void 0;
}
function parseImageComponentAttributes(attributes) {
  const id = attrValue(attributes, "imageId");
  if (!id || !UUID_REGEX.test(id)) return void 0;
  return {
    id,
    blurhash: blurhashFromBase64(attrValue(attributes, "blurHash64")),
    width: parseDimension(attrValue(attributes, "width")),
    height: parseDimension(attrValue(attributes, "height")),
    alt: attrValue(attributes, "alt")
  };
}
var mdxParser = unified().use(remarkParse).use(remarkMdx);
function extractImageComponentIds(markdown) {
  const ids = /* @__PURE__ */ new Set();
  const walk = (node) => {
    if (isImageComponentNode(node)) {
      const attrs = parseImageComponentAttributes(node.attributes);
      if (attrs) ids.add(attrs.id);
    }
    if (node.children) for (const c of node.children) walk(c);
  };
  walk(mdxParser.parse(markdown));
  return [...ids];
}

export { IMAGE_COMPONENT_NAME, extractImageComponentIds, imageComponentMarkdown, isImageComponentNode, parseImageComponentAttributes };
//# sourceMappingURL=chunk-LTAAQ5UM.js.map
//# sourceMappingURL=chunk-LTAAQ5UM.js.map