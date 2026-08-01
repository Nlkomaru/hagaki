export function getStringEnv(env: unknown, key: string, fallback = ""): string {
    if (!env || typeof env !== "object") return fallback;
    const value = Reflect.get(env, key);
    return typeof value === "string" ? value : fallback;
}

export function getOptionalStringEnv(
    env: unknown,
    key: string,
): string | undefined {
    const value = getStringEnv(env, key);
    return value.length > 0 ? value : undefined;
}
