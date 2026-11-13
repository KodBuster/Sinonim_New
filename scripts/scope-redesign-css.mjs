import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const original = join(
  root,
  "..",
  "Синоним_редизайн",
  "assets",
  "site.css",
);
const out = join(root, "public", "redesign", "site.css");

copyFileSync(original, out);
let css = readFileSync(out, "utf8").replace(/\r\n/g, "\n");
css = css.replace(/url\(fonts\//g, "url(/redesign/fonts/");

const kept = [];
const stash = (m) => {
  kept.push(m);
  return `/*KEEP${kept.length - 1}*/`;
};
css = css.replace(/@font-face\s*\{[\s\S]*?\}/g, stash);
css = css.replace(/@keyframes\s+[^{\s]+\s*\{[\s\S]*?\}/g, stash);

function scopeSel(list) {
  return list
    .split(",")
    .map((s) => {
      s = s.trim();
      if (!s) return s;
      if (s === "html" || s === "body" || s === ":root") {
        return "body.synonym-redesign-active";
      }
      if (/^(html|body|:root)\b/.test(s)) {
        return `body.synonym-redesign-active${s.replace(/^(html|body|:root)/, "")}`;
      }
      if (s.includes("synonym-redesign-active")) return s;
      return `body.synonym-redesign-active ${s}`;
    })
    .join(", ");
}

function scopeBody(chunk) {
  return chunk.replace(/(^|})(\s*)([^@}/\s][^{]*)\{/g, (full, pre, sp, sel) => {
    const t = sel.trim();
    if (!t || t.startsWith("/*KEEP") || t.startsWith("from") || t.startsWith("to") || /^\d/.test(t)) {
      return full;
    }
    return `${pre}${sp}${scopeSel(t)} {`;
  });
}

css = css.replace(/@media[^{]+\{[\s\S]*?\n\}/g, (block) => {
  const i = block.indexOf("{");
  return `${block.slice(0, i + 1)}${scopeBody(block.slice(i + 1, -1))}}`;
});
css = scopeBody(css);
css = css.replace(/\/\*KEEP(\d+)\*\//g, (_, i) => kept[Number(i)]);

const extra = `
body.synonym-redesign-active {
  display: block !important;
  min-height: 100%;
}
body.synonym-redesign-active .synonym-redesign-root {
  font-family: var(--sans);
  color: var(--ink);
  background: #fff;
}
`;

writeFileSync(out, `${extra}\n${css}`);
console.log(
  `Scoped CSS written. preserved=${kept.length} fonts=${kept.filter((k) => k.startsWith("@font-face")).length}`,
);
