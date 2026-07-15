const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projektbudget-test-'));
const legacyPath = path.join(tempDir, 'legacy.db');
const legacyDb = new Database(legacyPath);
legacyDb.exec(`
  CREATE TABLE projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, total_budget REAL NOT NULL);
  CREATE TABLE subbudgets (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, name TEXT NOT NULL, budget REAL NOT NULL, threshold REAL DEFAULT 0.9, FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE);
  CREATE TABLE positions (id INTEGER PRIMARY KEY AUTOINCREMENT, subbudget_id INTEGER NOT NULL, name TEXT NOT NULL, planned REAL NOT NULL, actual REAL DEFAULT 0, done INTEGER DEFAULT 0, FOREIGN KEY(subbudget_id) REFERENCES subbudgets(id) ON DELETE CASCADE);
`);
legacyDb.close();
process.env.DB_PATH = legacyPath;

const app = require('../src/index');
const db = require('../src/db');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const payload = response.status === 204 ? null : await response.json();
  return { response, payload };
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

test('older databases are migrated without manual intervention', () => {
  for (const table of ['projects', 'subbudgets', 'positions']) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
    assert.ok(columns.includes('created_at'));
    assert.ok(columns.includes('updated_at'));
  }
});

test('health endpoint reports a running service', async () => {
  const { response, payload } = await request('/api/health');
  assert.equal(response.status, 200);
  assert.deepEqual(payload, { status: 'ok' });
});

test('invalid project input is rejected with a useful error', async () => {
  const { response, payload } = await request('/api/projects', json('POST', { name: '', total_budget: -1 }));
  assert.equal(response.status, 400);
  assert.match(payload.error, /Projektname/);
});

test('complete budget lifecycle uses planned and actual costs correctly', async () => {
  const createdProject = await request('/api/projects', json('POST', { name: 'Haus', total_budget: 10_000 }));
  assert.equal(createdProject.response.status, 201);
  const projectId = createdProject.payload.id;

  const createdSubbudget = await request(`/api/projects/${projectId}/subbudgets`, json('POST', { name: 'Küche', budget: 4_000, threshold: 0.8 }));
  assert.equal(createdSubbudget.response.status, 201);
  const subbudgetId = createdSubbudget.payload.id;

  const openPosition = await request(`/api/subbudgets/${subbudgetId}/positions`, json('POST', { name: 'Arbeitsplatte', planned: 1_200, actual: 1_350, done: false }));
  const donePosition = await request(`/api/subbudgets/${subbudgetId}/positions`, json('POST', { name: 'Spüle', planned: 500, actual: 450, done: true }));
  assert.equal(openPosition.response.status, 201);
  assert.equal(donePosition.response.status, 201);

  let projects = (await request('/api/projects')).payload;
  assert.equal(projects.length, 1);
  assert.equal(projects[0].used, 1_650);
  assert.equal(projects[0].allocated, 4_000);
  assert.equal(projects[0].positions_count, 2);
  assert.equal(projects[0].done_count, 1);
  assert.equal(projects[0].subbudgets[0].used, 1_650);

  const completed = await request(`/api/positions/${openPosition.payload.id}/status`, json('PATCH', { done: true, actual: 1_350 }));
  assert.equal(completed.response.status, 200);

  projects = (await request('/api/projects')).payload;
  assert.equal(projects[0].used, 1_800);
  assert.equal(projects[0].done_count, 2);

  const backup = await request('/api/backup');
  assert.equal(backup.payload.version, 1);
  assert.equal(backup.payload.projects[0].name, 'Haus');

  const deleted = await request(`/api/projects/${projectId}`, { method: 'DELETE' });
  assert.equal(deleted.response.status, 204);
  assert.deepEqual((await request('/api/projects')).payload, []);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM positions').get().count, 0);
});

test('unknown resources return 404 instead of succeeding silently', async () => {
  const { response, payload } = await request('/api/projects/999', json('PUT', { name: 'Nichts', total_budget: 1 }));
  assert.equal(response.status, 404);
  assert.match(payload.error, /nicht gefunden/);
});
