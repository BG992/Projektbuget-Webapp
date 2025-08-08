const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getSubBudgetUsed(id){
  const positions = db.prepare('SELECT planned, actual, done FROM positions WHERE subbudget_id = ?').all(id);
  return positions.reduce((sum,p)=> sum + (p.done ? p.actual : p.planned),0);
}

app.get('/api/projects', (req,res)=>{
  const projects = db.prepare('SELECT * FROM projects').all();
  res.json(projects);
});

app.post('/api/projects', (req,res)=>{
  const {name,total_budget} = req.body;
  const info = db.prepare('INSERT INTO projects (name,total_budget) VALUES (?,?)').run(name,total_budget);
  res.json({id: info.lastInsertRowid});
});

app.put('/api/projects/:id', (req,res)=>{
  const {name,total_budget} = req.body;
  db.prepare('UPDATE projects SET name=?, total_budget=? WHERE id=?').run(name,total_budget,req.params.id);
  res.json({status:'ok'});
});

app.delete('/api/projects/:id', (req,res)=>{
  db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  res.json({status:'ok'});
});

app.get('/api/projects/:projectId/subbudgets', (req,res)=>{
  const subs = db.prepare('SELECT * FROM subbudgets WHERE project_id=?').all(req.params.projectId);
  const result = subs.map(s => ({...s, used: getSubBudgetUsed(s.id)}));
  res.json(result);
});

app.post('/api/projects/:projectId/subbudgets', (req,res)=>{
  const {name,budget,threshold=0.9} = req.body;
  const info = db.prepare('INSERT INTO subbudgets (project_id,name,budget,threshold) VALUES (?,?,?,?)').run(req.params.projectId,name,budget,threshold);
  res.json({id: info.lastInsertRowid});
});

app.put('/api/subbudgets/:id', (req,res)=>{
  const {name,budget,threshold} = req.body;
  db.prepare('UPDATE subbudgets SET name=?, budget=?, threshold=? WHERE id=?').run(name,budget,threshold,req.params.id);
  res.json({status:'ok'});
});

app.delete('/api/subbudgets/:id', (req,res)=>{
  db.prepare('DELETE FROM subbudgets WHERE id=?').run(req.params.id);
  res.json({status:'ok'});
});

app.get('/api/subbudgets/:subId/positions', (req,res)=>{
  const positions = db.prepare('SELECT * FROM positions WHERE subbudget_id=?').all(req.params.subId);
  res.json(positions);
});

app.post('/api/subbudgets/:subId/positions', (req,res)=>{
  const {name,planned,actual=0,done=0} = req.body;
  const info = db.prepare('INSERT INTO positions (subbudget_id,name,planned,actual,done) VALUES (?,?,?,?,?)').run(req.params.subId,name,planned,actual,done);
  res.json({id: info.lastInsertRowid});
});

app.put('/api/positions/:id', (req,res)=>{
  const {name,planned,actual,done} = req.body;
  db.prepare('UPDATE positions SET name=?, planned=?, actual=?, done=? WHERE id=?').run(name,planned,actual,done,req.params.id);
  res.json({status:'ok'});
});

app.delete('/api/positions/:id', (req,res)=>{
  db.prepare('DELETE FROM positions WHERE id=?').run(req.params.id);
  res.json({status:'ok'});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));
