import { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Drawer, Box,
  TextField, Button, List, ListItem, ListItemButton, ListItemText,
  Accordion, AccordionSummary, AccordionDetails, Checkbox, LinearProgress, Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

function App() {
  const [projects, setProjects] = useState([]);
  const [projectForm, setProjectForm] = useState({ name: '', total_budget: '' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const load = async (keepId) => {
    const projs = await fetch('/api/projects').then(r => r.json());
    for (const p of projs) {
      p.subbudgets = await fetch(`/api/projects/${p.id}/subbudgets`).then(r => r.json());
      for (const s of p.subbudgets) {
        s.positions = await fetch(`/api/subbudgets/${s.id}/positions`).then(r => r.json());
      }
    }
    setProjects(projs);
    const current = keepId
      ? projs.find(p => p.id === keepId)
      : selectedProject
      ? projs.find(p => p.id === selectedProject.id)
      : projs[0];
    setSelectedProject(current || null);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addProject = async () => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: projectForm.name,
        total_budget: parseFloat(projectForm.total_budget || 0)
      })
    });
    const data = await res.json();
    setProjectForm({ name: '', total_budget: '' });
    load(data.id);
  };

  const deleteProject = async (id) => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    load();
  };

  const editProject = async (p) => {
    const name = prompt('Projektname', p.name);
    const budget = prompt('Gesamtbudget', p.total_budget);
    if (name !== null && budget !== null) {
      await fetch(`/api/projects/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, total_budget: parseFloat(budget) })
      });
      load(p.id);
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setDrawerOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6">
            {selectedProject ? selectedProject.name : 'Projektbudget'}
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 280 }} role="presentation">
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Projekte</Typography>
          </Box>
          <List>
            {projects.map(p => (
              <ListItem key={p.id} disablePadding>
                <ListItemButton
                  selected={selectedProject?.id === p.id}
                  onClick={() => { setSelectedProject(p); setDrawerOpen(false); }}
                >
                  <ListItemText primary={p.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              label="Projektname"
              value={projectForm.name}
              onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
            />
            <TextField
              label="Budget"
              type="number"
              value={projectForm.total_budget}
              onChange={e => setProjectForm({ ...projectForm, total_budget: e.target.value })}
            />
            <Button variant="contained" onClick={addProject}>Hinzufügen</Button>
          </Box>
        </Box>
      </Drawer>

      {selectedProject && (
        <Project
          project={selectedProject}
          onChange={() => load(selectedProject.id)}
          onDelete={() => deleteProject(selectedProject.id)}
          onEdit={() => editProject(selectedProject)}
        />
      )}
    </>
  );
}

function Project({ project, onChange, onDelete, onEdit }) {
  const [subForm, setSubForm] = useState({ name: '', budget: '', threshold: '0.9' });

  const addSub = async () => {
    await fetch(`/api/projects/${project.id}/subbudgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: subForm.name,
        budget: parseFloat(subForm.budget || 0),
        threshold: parseFloat(subForm.threshold || 0.9)
      })
    });
    setSubForm({ name: '', budget: '', threshold: '0.9' });
    onChange();
  };

  const deleteSub = async (id) => {
    await fetch(`/api/subbudgets/${id}`, { method: 'DELETE' });
    onChange();
  };

  const editSub = async (s) => {
    const name = prompt('Teilbudget', s.name);
    const budget = prompt('Budget', s.budget);
    const threshold = prompt('Schwelle', s.threshold);
    if (name !== null && budget !== null && threshold !== null) {
      await fetch(`/api/subbudgets/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          budget: parseFloat(budget),
          threshold: parseFloat(threshold)
        })
      });
      onChange();
    }
  };

  const used = project.subbudgets.reduce((sum, s) => sum + s.used, 0);
  const percent = project.total_budget ? (used / project.total_budget) * 100 : 0;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">{project.name}</Typography>
        <Box>
          <IconButton onClick={onEdit} size="small"><EditIcon /></IconButton>
          <IconButton onClick={onDelete} size="small"><DeleteIcon /></IconButton>
        </Box>
      </Box>
      <Typography variant="subtitle1">{`${used}/${project.total_budget}`}</Typography>
      <LinearProgress variant="determinate" value={percent} sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          label="Teilbudget"
          value={subForm.name}
          onChange={e => setSubForm({ ...subForm, name: e.target.value })}
        />
        <TextField
          label="Budget"
          type="number"
          value={subForm.budget}
          onChange={e => setSubForm({ ...subForm, budget: e.target.value })}
        />
        <TextField
          label="Schwelle"
          type="number"
          value={subForm.threshold}
          onChange={e => setSubForm({ ...subForm, threshold: e.target.value })}
        />
        <Button onClick={addSub} variant="outlined">Add</Button>
      </Box>
      {project.subbudgets.map(s => (
        <SubBudget
          key={s.id}
          sub={s}
          onChange={onChange}
          onDelete={() => deleteSub(s.id)}
          onEdit={() => editSub(s)}
        />
      ))}
    </Box>
  );
}

function SubBudget({ sub, onChange, onDelete, onEdit }) {
  const [posForm, setPosForm] = useState({ name: '', planned: '', actual: '', done: false });

  const addPos = async () => {
    await fetch(`/api/subbudgets/${sub.id}/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: posForm.name,
        planned: parseFloat(posForm.planned || 0),
        actual: parseFloat(posForm.actual || 0),
        done: posForm.done ? 1 : 0
      })
    });
    setPosForm({ name: '', planned: '', actual: '', done: false });
    onChange();
  };

  const deletePos = async (id) => {
    await fetch(`/api/positions/${id}`, { method: 'DELETE' });
    onChange();
  };

  const editPos = async (p) => {
    const name = prompt('Position', p.name);
    const planned = prompt('Geplant', p.planned);
    const actual = prompt('Ist', p.actual);
    const done = confirm('Erledigt?');
    if (name !== null && planned !== null && actual !== null) {
      await fetch(`/api/positions/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          planned: parseFloat(planned),
          actual: parseFloat(actual),
          done: done ? 1 : 0
        })
      });
      onChange();
    }
  };

  const percent = sub.budget ? (sub.used / sub.budget) * 100 : 0;
  const warning = sub.budget > 0 && sub.used / sub.budget >= sub.threshold;

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography color={warning ? 'error' : 'inherit'}>{sub.name}</Typography>
            <Box>
              <IconButton onClick={onEdit} size="small"><EditIcon fontSize="inherit" /></IconButton>
              <IconButton onClick={onDelete} size="small"><DeleteIcon fontSize="inherit" /></IconButton>
            </Box>
          </Box>
          <LinearProgress variant="determinate" value={percent} />
          <Typography variant="caption">{`${sub.used}/${sub.budget}`}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            label="Position"
            value={posForm.name}
            onChange={e => setPosForm({ ...posForm, name: e.target.value })}
          />
          <TextField
            label="Geplant"
            type="number"
            value={posForm.planned}
            onChange={e => setPosForm({ ...posForm, planned: e.target.value })}
          />
          <TextField
            label="Ist"
            type="number"
            value={posForm.actual}
            onChange={e => setPosForm({ ...posForm, actual: e.target.value })}
          />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Checkbox
              checked={posForm.done}
              onChange={e => setPosForm({ ...posForm, done: e.target.checked })}
            />
            Erledigt
          </Box>
          <Button onClick={addPos} variant="outlined">Add</Button>
        </Box>
        <List>
          {sub.positions.map(p => (
            <ListItem
              key={p.id}
              secondaryAction={
                <>
                  <IconButton edge="end" onClick={() => editPos(p)}><EditIcon /></IconButton>
                  <IconButton edge="end" onClick={() => deletePos(p.id)}><DeleteIcon /></IconButton>
                </>
              }
            >
              <ListItemText primary={`${p.name} - ${p.done ? p.actual : p.planned}`} />
            </ListItem>
          ))}
        </List>
      </AccordionDetails>
    </Accordion>
  );
}

export default App;

