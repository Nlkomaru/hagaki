import { t as blurhashToDataUrl } from "./blurhash-data-url-CIOkeGeK.js";
import { n as blurhashToBase64, t as blurhashFromBase64 } from "./blurhash64-5JxhilOc.js";
import { a as parseImageComponentAttributes, i as isImageComponentNode, n as extractImageComponentIds, r as imageComponentMarkdown, t as IMAGE_COMPONENT_NAME } from "./image-jsx-BUhLvWgR.js";
//#region src/markdown/images.ts
const IMG_REGEX = /!\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g;
function normalizePrefix(value) {
	return value.endsWith("/") ? value : `${value}/`;
}
/**
* Walk a markdown body and return the repository paths of every embedded
* image the caller owns:
*
*   - legacy `![alt](url)` references whose URL lives under
*     `config.urlPrefix` (external `http(s)://` and `data:` URLs are
*     skipped), and
*   - `<Image imageId="<uuid>" />` MDX components, whose blobs live at
*     `<repoDir><id>.avif` by convention.
*
* Useful for diff'ing the "before" and "after" of a post to figure out which
* image blobs should be cleaned up when the post is saved.
*/
function extractRepoImagePaths(markdown, config) {
	const urlPrefix = normalizePrefix(config.urlPrefix);
	const repoDir = normalizePrefix(config.repoDir);
	const paths = /* @__PURE__ */ new Set();
	for (const match of markdown.matchAll(IMG_REGEX)) {
		const url = match[1];
		if (!url?.startsWith(urlPrefix)) continue;
		const filename = url.slice(urlPrefix.length);
		if (!filename) continue;
		paths.add(`${repoDir}${filename}`);
	}
	for (const id of extractImageComponentIds(markdown)) paths.add(`${repoDir}${id}.avif`);
	return [...paths];
}
/**
* Return the repo paths of images that were referenced by `oldBody` but no
* longer appear in `newBody`. Designed to be piped into `commitFiles`'
* `deletePaths` so the orphaned image blobs are removed in the same commit
* that updates the post.
*/
function diffRemovedImagePaths(oldBody, newBody, config) {
	const before = extractRepoImagePaths(oldBody, config);
	if (before.length === 0) return [];
	const after = new Set(extractRepoImagePaths(newBody, config));
	return before.filter((path) => !after.has(path));
}
//#endregion
export { IMAGE_COMPONENT_NAME, blurhashFromBase64, blurhashToBase64, blurhashToDataUrl, diffRemovedImagePaths, extractImageComponentIds, extractRepoImagePaths, imageComponentMarkdown, isImageComponentNode, parseImageComponentAttributes };

//# sourceMappingURL=markdown.js.map