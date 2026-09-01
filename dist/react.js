import { blurhashFromBase64, blurhashToDataUrl } from './chunk-2NLG3F5D.js';
import { createContext, useMemo, useContext, useState } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';

var defaultImageUrl = ({
  articleId,
  imageId
}) => `/api/images/${articleId}/${imageId}`;
var HagakiImageContext = createContext({});
function HagakiImageConfig(props) {
  const { urlFor, articleId, children } = props;
  const value = useMemo(() => ({ urlFor, articleId }), [urlFor, articleId]);
  return /* @__PURE__ */ jsx(HagakiImageContext.Provider, { value, children });
}
var MAX_IMAGE_DIMENSION = 2e4;
function toDimension(value) {
  if (value == null) return void 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return void 0;
  const i = Math.floor(n);
  if (i < 1 || i > MAX_IMAGE_DIMENSION) return void 0;
  return i;
}
function Image(props) {
  const ctx = useContext(HagakiImageContext);
  const articleId = props.articleId ?? ctx.articleId ?? "";
  const urlFor = props.urlFor ?? ctx.urlFor ?? defaultImageUrl;
  const src = props.src ?? urlFor({ articleId, imageId: props.imageId });
  const blurHash = blurhashFromBase64(props.blurHash64);
  const width = toDimension(props.width);
  const height = toDimension(props.height);
  const placeholder = useMemo(
    () => blurHash ? blurhashToDataUrl(blurHash, width, height) : "",
    [blurHash, width, height]
  );
  const [loaded, setLoaded] = useState(!placeholder);
  const hasBox = width != null && height != null;
  const wrapperStyle = {
    position: "relative",
    display: "inline-block",
    overflow: "hidden",
    lineHeight: 0,
    background: "#0001",
    borderRadius: props.borderRadius ?? "0.5rem",
    ...hasBox ? {
      aspectRatio: `${width}/${height}`,
      width: `${width}px`,
      maxWidth: "100%"
    } : {},
    ...props.style
  };
  return /* @__PURE__ */ jsxs(
    "span",
    {
      "data-hagaki-img": "",
      className: props.className,
      style: wrapperStyle,
      children: [
        placeholder && /* @__PURE__ */ jsx(
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
        ),
        /* @__PURE__ */ jsx(
          "img",
          {
            ref: (el) => {
              if (el?.complete) setLoaded(true);
            },
            src,
            alt: props.alt ?? "",
            loading: "lazy",
            decoding: "async",
            ...width != null ? { width } : {},
            ...height != null ? { height } : {},
            onLoad: () => setLoaded(true),
            onError: () => setLoaded(true),
            suppressHydrationWarning: true,
            style: {
              position: "relative",
              display: "block",
              width: "100%",
              height: "auto",
              opacity: loaded ? 1 : 0,
              transition: "opacity 350ms ease-in"
            }
          }
        )
      ]
    }
  );
}

export { HagakiImageConfig, Image, defaultImageUrl };
//# sourceMappingURL=react.js.map
//# sourceMappingURL=react.js.map