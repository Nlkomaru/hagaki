/**
 * Base64-encode raw bytes. The single encoder used by every GitHub write
 * path (blob contents), so callers never hand-roll their own.
 */
export function bytesToBase64(input: ArrayBuffer | Uint8Array): string {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64");
    }
    // Edge / browser fallback. Built one byte at a time on purpose:
    // `String.fromCharCode(...bytes)` overflows the argument stack on
    // real image payloads.
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
}
