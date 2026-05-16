import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const serverDir = join(process.cwd(), ".next", "server");
const packagePath = join(serverDir, "package.json");

await mkdir(serverDir, { recursive: true });
await writeFile(packagePath, `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`);

console.log(`Marked ${packagePath} as CommonJS for Vercel serverless route bundles.`);
