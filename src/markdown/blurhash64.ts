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
export function blurhashToBase64(raw: string): string {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(raw, "utf-8").toString("base64");
    }
    // Blurhash is pure ASCII, so btoa is safe.
    return btoa(raw);
}

/**
 * Decode the stored base64 form back to the raw blurhash. Returns `undefined`
 * for malformed input instead of throwing so callers can fall back to "no
 * placeholder".
 */
export function blurhashFromBase64(
    encoded: string | null | undefined,
): string | undefined {
    if (!encoded) return undefined;
    try {
        if (typeof Buffer !== "undefined") {
            const decoded = Buffer.from(encoded, "base64").toString("utf-8");
            return decoded || undefined;
        }
        return atob(encoded) || undefined;
    } catch {
        return undefined;
    }
}
