export function toUrlSlug(str: string): string {
    return encodeURIComponent(
        str
            .normalize("NFKC")
            .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
                String.fromCharCode(s.charCodeAt(0) - 0xfee0),
            )
            .replace(/\s+/g, "-")
            .replace(/[\u3000]/g, "-")
            .replace(/--+/g, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase(),
    );
}
