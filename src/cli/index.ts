import * as path from "node:path";
import { parseArgs } from "node:util";
import { generateManifests } from "./generate.js";

const USAGE = `Usage: hagaki <command>

Commands:
  generate [--content-dir <path>]   Generate article.json / slug-index.json /
                                    categories.json / article/*/info.json for a
                                    hagaki content directory (default ./content)
`;

async function main() {
    const [command, ...rest] = process.argv.slice(2);
    switch (command) {
        case "generate": {
            const { values } = parseArgs({
                args: rest,
                options: {
                    "content-dir": { type: "string", default: "./content" },
                },
            });
            await generateManifests(
                path.resolve(process.cwd(), values["content-dir"]),
            );
            return;
        }
        case undefined:
        case "help":
        case "--help":
        case "-h":
            process.stdout.write(USAGE);
            return;
        default:
            process.stderr.write(`hagaki: unknown command "${command}"\n\n`);
            process.stderr.write(USAGE);
            process.exit(2);
    }
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
