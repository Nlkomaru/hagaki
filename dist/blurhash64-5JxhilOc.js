//#region src/markdown/blurhash64.ts
/**
* Stored form of a blurhash: base64 of the raw hash.
*
* Raw blurhashes use the base83 charset, which includes `{`, `}`, `|`, `$`,
* `%`, `@` — characters that need escaping (or get corrupted) in YAML
* frontmatter and JSX string attributes. The content format therefore always
* stores `blurhash64` / `blurHash64` (base64, safe everywhere) and decodes
* back to the raw hash right before rendering.
*/
/** Encode a raw blurhash into its stored base64 form. */
function blurhashToBase64(raw) {
	if (typeof Buffer !== "undefined") return Buffer.from(raw, "utf-8").toString("base64");
	return btoa(raw);
}
/**
* Decode the stored base64 form back to the raw blurhash. Returns `undefined`
* for malformed input instead of throwing so callers can fall back to "no
* placeholder".
*/
function blurhashFromBase64(encoded) {
	if (!encoded) return void 0;
	try {
		if (typeof Buffer !== "undefined") return Buffer.from(encoded, "base64").toString("utf-8") || void 0;
		return atob(encoded) || void 0;
	} catch {
		return;
	}
}
//#endregion
export { blurhashToBase64 as n, blurhashFromBase64 as t };

//# sourceMappingURL=blurhash64-5JxhilOc.js.map