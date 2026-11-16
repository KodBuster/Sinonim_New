import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

type SqlValue = string | number | null;
type Statement = {
  all(...params: SqlValue[]): unknown[];
  run(...params: SqlValue[]): { changes: number };
};
type Database = { exec(sql: string): void; prepare(sql: string): Statement };

let database: Database | undefined;

export function reviewsDb() {
  if (database) return database;
  const sqlite = process.getBuiltinModule("node:sqlite") as
    | { DatabaseSync: new (path: string) => Database }
    | undefined;
  if (!sqlite) throw new Error("Reviews require Node.js 24");
  const path = process.env.REVIEWS_DB_PATH || (process.env.NODE_ENV === "production" && process.platform === "linux"
    ? "/data/reviews.sqlite"
    : join(process.cwd(), "data", "reviews.sqlite"));
  mkdirSync(dirname(path), { recursive: true });
  const db = new sqlite.DatabaseSync(path);
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY,
      product TEXT NOT NULL,
      author TEXT NOT NULL,
      name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','rejected')),
      updated INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE (product, author)
    );
    CREATE INDEX IF NOT EXISTS reviews_listing ON reviews(product, status, updated);
    CREATE TABLE IF NOT EXISTS review_votes (
      review INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      voter TEXT NOT NULL,
      helpful INTEGER NOT NULL CHECK (helpful IN (0,1)),
      PRIMARY KEY (review, voter)
    );
  `);
  database = db;
  return db;
}
