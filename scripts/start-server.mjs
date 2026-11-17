import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const packagedServer = resolve("build/standalone/server.js");
const amvera = process.argv.includes("--amvera") || existsSync(packagedServer);
const server = amvera ? packagedServer : resolve(".next/standalone/server.js");

if (!existsSync(server)) {
  console.error(`Standalone server missing: ${server}. Rebuild the application before starting it.`);
  process.exit(1);
}

const env = { ...process.env, NODE_ENV: "production" };
if (amvera) {
  env.PORT ||= "80";
  env.HOSTNAME = "0.0.0.0";
  env.ORDER_DATA_DIR = "/data";
}
const caBundle = resolve(dirname(server), "russian-trusted-ca.pem");
if (existsSync(caBundle)) env.NODE_EXTRA_CA_CERTS ||= caBundle;

const child = spawn(process.execPath, [server], { stdio: "inherit", env });
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  console.error("Could not start standalone server:", error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal === "SIGTERM" ? 143 : 130);
});
