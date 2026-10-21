import { t as blurhashToDataUrl } from "./blurhash-data-url-CIOkeGeK.js";
import { t as blurhashFromBase64 } from "./blurhash64-5JxhilOc.js";
import { createContext, useContext, useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/render/Image.tsx
/**
* Default URL layout: an app route that can fall back from the CDN to the
* repository per image (e.g. right after a commit, before the CDN deploy). Override via `<HagakiImageConfig urlFor={…}>`
* or the `urlFor` prop when the app serves images elsewhere (direct CDN, …).
*/
const defaultImageUrl = ({ articleId, imageId }) => `/api/images/${articleId}/${imageId}`;
const HagakiImageContext = createContext({});
/**
* Ambient configuration for every `<Image>` below it: how to turn
* `articleId` + `imageId` into a URL, and (optionally) which article the
* surrounding page is about so `articleId` can be omitted per image.
*/
function HagakiImageConfig(props) {
	const { urlFor, articleId, children } = props;
	const value = useMemo(() => ({
		urlFor,
		articleId
	}), [urlFor, articleId]);
	return /* @__PURE__ */ jsx(HagakiImageContext.Provider, {
		value,
		children
	});
}
/**
* Article image with a blurhash placeholder baked in:
*
*   1. The blurhash is decoded to a tiny `data:image/bmp` URL rendered as an
*      absolutely-positioned `<img>` behind the real one; CSS `blur()`
*      smooths the 32px decode into a soft hint of the final photo.
*   2. The real `<img>` starts at `opacity: 0` and fades in on `onLoad`.
*      The ref callback checks `complete` so an image that finished loading
*      before hydration (SSR + cache) doesn't stay invisible.
*
* The wrapper reserves the final box via `aspect-ratio`, so the page doesn't
* shift when the bytes arrive. SSR-safe: the placeholder and layout render
* on the server, only the fade is client behaviour.
*/
const MAX_IMAGE_DIMENSION = 2e4;
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
	const src = props.src ?? urlFor({
		articleId,
		imageId: props.imageId
	});
	const blurHash = blurhashFromBase64(props.blurHash64);
	const width = toDimension(props.width);
	const height = toDimension(props.height);
	const placeholder = useMemo(() => blurHash ? blurhashToDataUrl(blurHash, width, height) : "", [
		blurHash,
		width,
		height
	]);
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
	return /* @__PURE__ */ jsxs("span", {
		"data-hagaki-img": "",
		className: props.className,
		style: wrapperStyle,
		children: [placeholder && /* @__PURE__ */ jsx("img", {
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
		}), /* @__PURE__ */ jsx("img", {
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
		})]
	});
}
//#endregion
export { HagakiImageConfig, Image, defaultImageUrl };

//# sourceMappingURL=react.js.map