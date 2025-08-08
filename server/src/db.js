const Database = require('better-sqlite3');
const db = new Database('data.db');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  total_budget REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS subbudgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  budget REAL NOT NULL,
  threshold REAL DEFAULT 0.9,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subbudget_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  planned REAL NOT NULL,
  actual REAL DEFAULT 0,
  done INTEGER DEFAULT 0,
  FOREIGN KEY(subbudget_id) REFERENCES subbudgets(id) ON DELETE CASCADE
);
`);
module.exports = db;
