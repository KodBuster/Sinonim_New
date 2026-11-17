import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, rmdir } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const directory = await mkdtemp(join(tmpdir(), "sinonim-reviews-test-"));
const dbPath = join(directory, "reviews.sqlite");
const serverPath = resolve(process.argv.includes("--amvera") ? "build/standalone/server.js" : ".next/standalone/server.js");
const moderator = randomBytes(32).toString("hex");
const socket = createServer();
socket.listen(0, "127.0.0.1");
await once(socket, "listening");
const port = socket.address().port;
await new Promise((done) => socket.close(done));
const base = `http://127.0.0.1:${port}`;
const endpoint = `${base}/api/reviews/siyanie-ring`;
let server;

async function start() {
  server = spawn(process.execPath, [serverPath], {
    env: { ...process.env, NODE_ENV: "production", PORT: String(port), HOSTNAME: "127.0.0.1",
      ADVANTSHOP_BASE_URL: " ", ADVANTSHOP_CATEGORY_MAP: " ",
      REVIEWS_DB_PATH: dbPath, REVIEWS_ADMIN_TOKEN: moderator },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(`${base}/robots.txt`)).ok) return;
    } catch { /* Server is still starting. */ }
    if (server.exitCode !== null) throw new Error("Test server exited");
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error("Test server did not start");
}

async function stop() {
  if (server && server.exitCode === null) {
    const ended = once(server, "exit");
    server.kill();
    await ended;
  }
}

function visitor() {
  let cookie = "";
  return async (payload, token) => {
    const response = await fetch(endpoint, {
      method: payload ? "POST" : "GET",
      headers: { ...(cookie && { Cookie: cookie }), ...(payload && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }) },
      ...(payload && { body: JSON.stringify(payload) }),
    });
    const receivedCookie = response.headers.get("set-cookie");
    if (receivedCookie) cookie = receivedCookie.split(";")[0];
    const result = await response.json();
    return { status: response.status, result };
  };
}

try {
  const nativeSqlite = process.getBuiltinModule?.("node:sqlite");
  if (nativeSqlite) {
    const existing = new nativeSqlite.DatabaseSync(dbPath);
    existing.exec(`CREATE TABLE reviews (
      id INTEGER PRIMARY KEY, product TEXT NOT NULL, author TEXT NOT NULL, name TEXT NOT NULL,
      rating INTEGER NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      updated INTEGER NOT NULL DEFAULT (unixepoch()), UNIQUE(product, author));
      INSERT INTO reviews (product, author, name, rating, body, status)
      VALUES ('luna-ring', 'existing-author', 'Существующий покупатель', 4, 'Отзыв из предыдущей SQLite базы', 'published');`);
    existing.close();
  }
  await start();
  if (nativeSqlite) {
    const legacy = await (await fetch(`${base}/api/reviews/luna-ring`)).json();
    assert.equal(legacy.reviews[0].name, "Существующий покупатель");
  }
  const preview = await fetch(`${base}/api/products/siyanie-ring/share-image`);
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get("content-type"), "image/jpeg");
  const image = Buffer.from(await preview.arrayBuffer());
  assert.equal(image.readUInt16BE(0), 0xffd8);
  assert.ok(image.length > 1000);
  const page = await (await fetch(`${base}/products/siyanie-ring`, { headers: { "User-Agent": "TelegramBot" } })).text();
  const head = page.split("</head>")[0];
  assert.ok(head.includes(`content="${base}/api/products/siyanie-ring/share-image"`));
  assert.ok(head.includes('property="og:title"'));
  assert.ok(head.includes('property="og:description"'));
  const author = visitor();
  const voter = visitor();
  assert.equal((await author()).status, 200);
  assert.equal((await author({ action: "save", name: "Тест", body: "Коротко", rating: 6 })).status, 400);
  const review = { action: "save", name: "Проверка", body: "Тестовый отзыв в отдельной временной базе.", rating: 5 };
  assert.equal((await author(review)).status, 200);
  let own = (await author()).result;
  assert.equal(own.own.status, "pending");
  assert.equal(own.reviews.length, 0);
  assert.equal((await voter()).result.own, null);
  assert.equal((await fetch(`${base}/api/reviews/admin?moderation`)).status, 403);
  const pendingResponse = await fetch(`${base}/api/reviews/admin?moderation`, { headers: { Authorization: `Bearer ${moderator}` } });
  const { pending } = await pendingResponse.json();
  assert.equal(pending.length, 1);
  const reviewId = pending[0].id;
  const moderate = (status) => author({ action: "moderate", reviewId, status }, moderator);
  assert.equal((await author({ action: "moderate", reviewId, status: "published" })).status, 403);
  assert.equal((await moderate("published")).status, 200);
  assert.deepEqual((await author()).result.distribution, [{ rating: 5, count: 1 }]);
  assert.equal((await voter({ action: "vote", reviewId, helpful: 1 })).status, 200);
  assert.equal((await voter({ action: "vote", reviewId, helpful: 1 })).status, 200);
  assert.equal((await author()).result.reviews[0].yes, 1);
  assert.equal((await voter({ action: "vote", reviewId, helpful: 0 })).status, 200);
  assert.equal((await author()).result.reviews[0].no, 1);
  assert.equal((await author({ action: "vote", reviewId, helpful: 1 })).status, 400);
  await stop();
  await start();
  assert.equal((await author()).result.reviews.length, 1);
  assert.equal((await author({ ...review, rating: 4 })).status, 200);
  own = (await author()).result;
  assert.equal(own.own.status, "pending");
  assert.equal(own.reviews.length, 0);
  assert.equal((await moderate("rejected")).status, 200);
  assert.equal((await author()).result.own.status, "rejected");
  const summary = await fetch(`${endpoint}?summary`);
  assert.equal(summary.headers.get("set-cookie"), null);
  assert.deepEqual((await summary.json()).distribution, []);
  console.log("PASS: share metadata, preview JPEG, existing SQLite data, validation, submission, moderation, publication, voting, editing and persistence");
} finally {
  await stop();
  for (const suffix of ["", "-wal", "-shm", "-journal"]) await rm(`${dbPath}${suffix}`, { force: true });
  await rmdir(directory);
}
