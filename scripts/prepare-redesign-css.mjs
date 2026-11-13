import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public", "redesign", "site.css");
let css = readFileSync(src, "utf8");
css = css.replace(/url\(fonts\//g, "url(/redesign/fonts/");
writeFileSync(src, css);
console.log("Updated font paths in public/redesign/site.css");
