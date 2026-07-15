const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const defaultDataDir = path.join(__dirname, '../data');
const dbPath = process.env.DB_PATH || path.join(defaultDataDir, 'data.db');

if (dbPath !== ':memory:') {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  total_budget REAL NOT NULL CHECK (total_budget >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS subbudgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  budget REAL NOT NULL CHECK (budget >= 0),
  threshold REAL NOT NULL DEFAULT 0.9 CHECK (threshold >= 0 AND threshold <= 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subbudget_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  planned REAL NOT NULL CHECK (planned >= 0),
  actual REAL NOT NULL DEFAULT 0 CHECK (actual >= 0),
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(subbudget_id) REFERENCES subbudgets(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_subbudgets_project_id ON subbudgets(project_id);
CREATE INDEX IF NOT EXISTS idx_positions_subbudget_id ON positions(subbudget_id);
`);

// Add timestamps to databases created by earlier versions without losing data.
const ensureColumn = (table, definition) => {
  const column = definition.split(/\s+/)[0];
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some((entry) => entry.name === column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
};

for (const table of ['projects', 'subbudgets', 'positions']) {
  ensureColumn(table, 'created_at TEXT');
  ensureColumn(table, 'updated_at TEXT');
  db.prepare(`UPDATE ${table} SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)`).run();
}

module.exports = db;
