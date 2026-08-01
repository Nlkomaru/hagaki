const BASE64_CHUNK_SIZE = 0x8000;

export function bytesToBase64(bytes: Uint8Array): string {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64");
    }

    let binary = "";
    for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
        binary += String.fromCharCode(
            ...Array.from(bytes.subarray(i, i + BASE64_CHUNK_SIZE)),
        );
    }
    return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
    if (typeof Buffer !== "undefined") {
        return new Uint8Array(Buffer.from(base64, "base64"));
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
