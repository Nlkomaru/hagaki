const LEGACY_PENDING_IMG_REGEX =
    /!\[[^\]]*\]\(pending\\?:[a-f0-9-]+(?:\s+"[^"]*")?\)/g;

export function stripLegacyPendingImages(body: string): string {
    return body.replace(LEGACY_PENDING_IMG_REGEX, "");
}
