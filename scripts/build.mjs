import { cpSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { join } from "node:path";

await import("./sync-demo-case-js.mjs");
await import("./verify.mjs");

const root = process.cwd();
const outDir = join(root, "public");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const file of ["index.html", "styles.css", "script.js", "model-adapter.js", "source-fed.html", "source-fed.css", "source-fed.js", "favicon.svg", "favicon.ico"]) {
  copyFileSync(join(root, file), join(outDir, file));
}

for (const dir of ["assets", "data"]) {
  cpSync(join(root, dir), join(outDir, dir), { recursive: true });
}
mkdirSync(join(outDir, "lib"), { recursive: true });
for (const file of ["aculeus-source-fed-contracts.js"]) {
  copyFileSync(join(root, "lib", file), join(outDir, "lib", file));
}

console.log("Aculeus SLM static bundle written to public/.");
