import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const standaloneDir = ".next/standalone";

if (!existsSync(standaloneDir)) {
  console.error("Missing .next/standalone — run next build with output: standalone");
  process.exit(1);
}

cpSync(".next/static", join(standaloneDir, ".next/static"), { recursive: true });
cpSync("public", join(standaloneDir, "public"), { recursive: true });

const certificates = ["certs/russian_trusted_root_ca.cer", "certs/russian_trusted_sub_ca.cer"];
if (certificates.every((path) => existsSync(path))) {
  const bundle = certificates.map((path) => readFileSync(path, "utf8").trim()).join("\n");
  writeFileSync(join(standaloneDir, "russian-trusted-ca.pem"), `${bundle}\n`);
}

if (process.argv.includes("--amvera")) {
  cpSync(standaloneDir, "build/standalone", {
    recursive: true,
    filter: (source) => !/^\.env(?:\.|$)/.test(source.split(/[\\/]/).at(-1)),
  });
  console.log("Amvera artifact prepared: build/standalone");
}

console.log("Standalone bundle prepared");
