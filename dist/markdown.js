import { extractImageComponentIds } from './chunk-LTAAQ5UM.js';
export { IMAGE_COMPONENT_NAME, extractImageComponentIds, imageComponentMarkdown, isImageComponentNode, parseImageComponentAttributes } from './chunk-LTAAQ5UM.js';
export { blurhashFromBase64, blurhashToBase64, blurhashToDataUrl } from './chunk-2NLG3F5D.js';

// src/markdown/images.ts
var IMG_REGEX = /!\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g;
function normalizePrefix(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function extractRepoImagePaths(markdown, config) {
  const urlPrefix = normalizePrefix(config.urlPrefix);
  const repoDir = normalizePrefix(config.repoDir);
  const paths = /* @__PURE__ */ new Set();
  for (const match of markdown.matchAll(IMG_REGEX)) {
    const url = match[1];
    if (!url || !url.startsWith(urlPrefix)) continue;
    const filename = url.slice(urlPrefix.length);
    if (!filename) continue;
    paths.add(`${repoDir}${filename}`);
  }
  for (const id of extractImageComponentIds(markdown)) {
    paths.add(`${repoDir}${id}.avif`);
  }
  return [...paths];
}
function diffRemovedImagePaths(oldBody, newBody, config) {
  const before = extractRepoImagePaths(oldBody, config);
  if (before.length === 0) return [];
  const after = new Set(extractRepoImagePaths(newBody, config));
  return before.filter((path) => !after.has(path));
}

export { diffRemovedImagePaths, extractRepoImagePaths };
//# sourceMappingURL=markdown.js.map
//# sourceMappingURL=markdown.js.map