import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "cricsmart.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initDb(_db);
  }
  return _db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      primary_role TEXT DEFAULT 'Batter',
      bowling_style TEXT DEFAULT '',
      skill_level TEXT DEFAULT 'Beginner',
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      score REAL,
      data TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Seed admin user if not exists
  const admin = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get("admin");
  if (!admin) {
    const bcrypt = require("bcryptjs");
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare(
      "INSERT INTO users (username, password, is_admin, primary_role, skill_level) VALUES (?, ?, 1, 'Batter', 'Advanced')"
    ).run("admin", hash);
  }
}
