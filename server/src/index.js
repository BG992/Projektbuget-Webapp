const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../public')));

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const parseId = (value) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError(400, 'Ungültige ID.');
  return id;
};

const requireName = (value, label = 'Name') => {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, `${label} darf nicht leer sein.`);
  if (value.trim().length > 120) throw new ApiError(400, `${label} darf höchstens 120 Zeichen lang sein.`);
  return value.trim();
};

const requireMoney = (value, label) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) {
    throw new ApiError(400, `${label} muss eine Zahl ab 0 sein.`);
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

const requireThreshold = (value) => {
  const threshold = Number(value);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new ApiError(400, 'Die Warnschwelle muss zwischen 0 und 100 Prozent liegen.');
  }
  return threshold;
};

const requireBoolean = (value) => {
  if (![true, false, 0, 1].includes(value)) throw new ApiError(400, 'Ungültiger Erledigt-Status.');
  return value ? 1 : 0;
};

const getProject = db.prepare('SELECT * FROM projects WHERE id = ?');
const getSubbudget = db.prepare('SELECT * FROM subbudgets WHERE id = ?');
const getPosition = db.prepare('SELECT * FROM positions WHERE id = ?');

const assertExists = (statement, id, label) => {
  const record = statement.get(id);
  if (!record) throw new ApiError(404, `${label} wurde nicht gefunden.`);
  return record;
};

function listProjectsWithDetails() {
  const projects = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC, id DESC').all();
  const subbudgets = db.prepare('SELECT * FROM subbudgets ORDER BY id ASC').all();
  const positions = db.prepare('SELECT * FROM positions ORDER BY done ASC, id ASC').all();

  const positionsBySubbudget = new Map();
  for (const position of positions) {
    const normalized = { ...position, done: Boolean(position.done) };
    const list = positionsBySubbudget.get(position.subbudget_id) || [];
    list.push(normalized);
    positionsBySubbudget.set(position.subbudget_id, list);
  }

  const subbudgetsByProject = new Map();
  for (const subbudget of subbudgets) {
    const items = positionsBySubbudget.get(subbudget.id) || [];
    const used = items.reduce((sum, item) => sum + (item.done ? item.actual : item.planned), 0);
    const planned = items.reduce((sum, item) => sum + item.planned, 0);
    const actual = items.reduce((sum, item) => sum + item.actual, 0);
    const normalized = { ...subbudget, positions: items, used, planned, actual };
    const list = subbudgetsByProject.get(subbudget.project_id) || [];
    list.push(normalized);
    subbudgetsByProject.set(subbudget.project_id, list);
  }

  return projects.map((project) => {
    const projectSubbudgets = subbudgetsByProject.get(project.id) || [];
    const used = projectSubbudgets.reduce((sum, item) => sum + item.used, 0);
    const allocated = projectSubbudgets.reduce((sum, item) => sum + item.budget, 0);
    const positionsCount = projectSubbudgets.reduce((sum, item) => sum + item.positions.length, 0);
    const doneCount = projectSubbudgets.reduce(
      (sum, item) => sum + item.positions.filter((position) => position.done).length,
      0,
    );
    return { ...project, subbudgets: projectSubbudgets, used, allocated, positions_count: positionsCount, done_count: doneCount };
  });
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/projects', (_req, res) => res.json(listProjectsWithDetails()));

app.post('/api/projects', (req, res) => {
  const name = requireName(req.body.name, 'Projektname');
  const totalBudget = requireMoney(req.body.total_budget, 'Gesamtbudget');
  const info = db.prepare('INSERT INTO projects (name, total_budget) VALUES (?, ?)').run(name, totalBudget);
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.put('/api/projects/:id', (req, res) => {
  const id = parseId(req.params.id);
  assertExists(getProject, id, 'Projekt');
  const name = requireName(req.body.name, 'Projektname');
  const totalBudget = requireMoney(req.body.total_budget, 'Gesamtbudget');
  db.prepare("UPDATE projects SET name = ?, total_budget = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(name, totalBudget, id);
  res.json({ status: 'ok' });
});

app.delete('/api/projects/:id', (req, res) => {
  const id = parseId(req.params.id);
  assertExists(getProject, id, 'Projekt');
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  res.status(204).end();
});

app.post('/api/projects/:projectId/subbudgets', (req, res) => {
  const projectId = parseId(req.params.projectId);
  assertExists(getProject, projectId, 'Projekt');
  const name = requireName(req.body.name, 'Budgetname');
  const budget = requireMoney(req.body.budget, 'Teilbudget');
  const threshold = requireThreshold(req.body.threshold ?? 0.9);
  const info = db.prepare('INSERT INTO subbudgets (project_id, name, budget, threshold) VALUES (?, ?, ?, ?)').run(projectId, name, budget, threshold);
  db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.put('/api/subbudgets/:id', (req, res) => {
  const id = parseId(req.params.id);
  const existing = assertExists(getSubbudget, id, 'Teilbudget');
  const name = requireName(req.body.name, 'Budgetname');
  const budget = requireMoney(req.body.budget, 'Teilbudget');
  const threshold = requireThreshold(req.body.threshold);
  db.prepare("UPDATE subbudgets SET name = ?, budget = ?, threshold = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(name, budget, threshold, id);
  db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(existing.project_id);
  res.json({ status: 'ok' });
});

app.delete('/api/subbudgets/:id', (req, res) => {
  const id = parseId(req.params.id);
  const existing = assertExists(getSubbudget, id, 'Teilbudget');
  db.prepare('DELETE FROM subbudgets WHERE id = ?').run(id);
  db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(existing.project_id);
  res.status(204).end();
});

app.post('/api/subbudgets/:subId/positions', (req, res) => {
  const subbudgetId = parseId(req.params.subId);
  const subbudget = assertExists(getSubbudget, subbudgetId, 'Teilbudget');
  const name = requireName(req.body.name, 'Positionsname');
  const planned = requireMoney(req.body.planned, 'Geplante Kosten');
  const actual = requireMoney(req.body.actual ?? 0, 'Tatsächliche Kosten');
  const done = requireBoolean(req.body.done ?? false);
  const info = db.prepare('INSERT INTO positions (subbudget_id, name, planned, actual, done) VALUES (?, ?, ?, ?, ?)').run(subbudgetId, name, planned, actual, done);
  db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(subbudget.project_id);
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.put('/api/positions/:id', (req, res) => {
  const id = parseId(req.params.id);
  const existing = assertExists(getPosition, id, 'Position');
  const subbudget = assertExists(getSubbudget, existing.subbudget_id, 'Teilbudget');
  const name = requireName(req.body.name, 'Positionsname');
  const planned = requireMoney(req.body.planned, 'Geplante Kosten');
  const actual = requireMoney(req.body.actual ?? 0, 'Tatsächliche Kosten');
  const done = requireBoolean(req.body.done);
  db.prepare("UPDATE positions SET name = ?, planned = ?, actual = ?, done = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(name, planned, actual, done, id);
  db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(subbudget.project_id);
  res.json({ status: 'ok' });
});

app.patch('/api/positions/:id/status', (req, res) => {
  const id = parseId(req.params.id);
  const existing = assertExists(getPosition, id, 'Position');
  const subbudget = assertExists(getSubbudget, existing.subbudget_id, 'Teilbudget');
  const done = requireBoolean(req.body.done);
  const actual = req.body.actual === undefined ? existing.actual : requireMoney(req.body.actual, 'Tatsächliche Kosten');
  db.prepare("UPDATE positions SET done = ?, actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(done, actual, id);
  db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(subbudget.project_id);
  res.json({ status: 'ok' });
});

app.delete('/api/positions/:id', (req, res) => {
  const id = parseId(req.params.id);
  const existing = assertExists(getPosition, id, 'Position');
  const subbudget = assertExists(getSubbudget, existing.subbudget_id, 'Teilbudget');
  db.prepare('DELETE FROM positions WHERE id = ?').run(id);
  db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(subbudget.project_id);
  res.status(204).end();
});

app.get('/api/backup', (_req, res) => {
  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    projects: listProjectsWithDetails(),
  };
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Disposition', `attachment; filename="projektbudget-${date}.json"`);
  res.json(payload);
});

app.use('/api', (_req, _res, next) => next(new ApiError(404, 'API-Endpunkt wurde nicht gefunden.')));

app.get('*splat', (_req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.use((error, _req, res, _next) => {
  const status = error.status || (error.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error(error);
  res.status(status).json({ error: status >= 500 ? 'Unerwarteter Serverfehler.' : error.message });
});

const PORT = Number(process.env.PORT) || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Projektbudget läuft auf Port ${PORT}`));
}

module.exports = app;
