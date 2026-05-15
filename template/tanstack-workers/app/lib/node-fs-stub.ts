// Stub for `node:fs` in the Cloudflare Workers SSR bundle.
//
// hagaki depends on gray-matter, which does `require('fs')` at module load
// time but only actually calls fs methods in `matter.read(filepath)`. We
// don't use that codepath, so providing throwing stubs is safe.
const notAvailable =
    (name: string) =>
    (..._args: unknown[]): never => {
        throw new Error(
            `node:fs.${name}() is not available in Cloudflare Workers`,
        );
    };

export const readFileSync = notAvailable("readFileSync");
export const writeFileSync = notAvailable("writeFileSync");
export const existsSync = (..._args: unknown[]) => false;
export const statSync = notAvailable("statSync");
export const readdirSync = notAvailable("readdirSync");
export const mkdirSync = notAvailable("mkdirSync");
export const promises = {
    readFile: notAvailable("promises.readFile"),
    writeFile: notAvailable("promises.writeFile"),
    stat: notAvailable("promises.stat"),
    readdir: notAvailable("promises.readdir"),
    mkdir: notAvailable("promises.mkdir"),
};

export default {
    readFileSync,
    writeFileSync,
    existsSync,
    statSync,
    readdirSync,
    mkdirSync,
    promises,
};
