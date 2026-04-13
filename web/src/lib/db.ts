import { createClient, type Client } from "@libsql/client";

let _client: Client | null = null;
let _initPromise: Promise<void> | null = null;

export function getDb(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:cricsmart.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    _initPromise = initDb(_client);
  }
  return _client;
}

export async function ensureDb(): Promise<Client> {
  const client = getDb();
  if (_initPromise) await _initPromise;
  return client;
}

async function initDb(client: Client) {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT UNIQUE,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      profile_photo TEXT DEFAULT '',
      primary_role TEXT DEFAULT 'Batter',
      bowling_style TEXT DEFAULT '',
      skill_level TEXT DEFAULT 'Beginner',
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
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
  _initPromise = null;
}
