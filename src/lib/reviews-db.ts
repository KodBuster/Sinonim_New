import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import initSqlJs from "sql.js";

type SqlValue = string | number | null;
type Statement = {
  all(...params: SqlValue[]): unknown[];
  run(...params: SqlValue[]): { changes: number };
};
type Database = { prepare(sql: string): Statement };

let database: Promise<Database> | undefined;

export function reviewsDb() {
  if (database) return database;
  database = openDatabase().catch((error) => {
    database = undefined;
    throw error;
  });
  return database;
}

async function openDatabase(): Promise<Database> {
  const path = process.env.REVIEWS_DB_PATH || (process.env.NODE_ENV === "production" && process.platform === "linux"
    ? "/data/reviews.sqlite"
    : join(process.cwd(), "data", "reviews.sqlite"));
  mkdirSync(dirname(path), { recursive: true });
  const SQL = await initSqlJs({
    wasmBinary: new Uint8Array(readFileSync(join(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm"))).buffer,
  });
  let saved = existsSync(path) ? readFileSync(path) : undefined;
  let db = new SQL.Database(saved);
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
  function persist() {
    const temporary = `${path}.${process.pid}.tmp`;
    try {
      const bytes = Buffer.from(db.export());
      writeFileSync(temporary, bytes, { mode: 0o600 });
      renameSync(temporary, path);
      saved = bytes;
    } catch (error) {
      db.close();
      db = new SQL.Database(saved);
      db.run("PRAGMA foreign_keys = ON");
      throw error;
    } finally {
      rmSync(temporary, { force: true });
    }
    // sql.js export reopens the database connection, so restore foreign keys.
    db.run("PRAGMA foreign_keys = ON");
  }
  persist();
  return {
    prepare(sql) {
      return {
        all(...params) {
          const statement = db.prepare(sql);
          try {
            statement.bind(params);
            const rows = [];
            while (statement.step()) rows.push(statement.getAsObject());
            return rows;
          } finally {
            statement.free();
          }
        },
        run(...params) {
          db.run(sql, params);
          const changes = db.getRowsModified();
          if (changes) persist();
          return { changes };
        },
      };
    },
  };
}
