import { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Drawer, Box,
  TextField, Button, List, ListItem, ListItemButton, ListItemText,
  Accordion, AccordionSummary, AccordionDetails, Checkbox, LinearProgress, Divider,
  Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Collapse
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';

const euro = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const formatEuro = (value) => euro.format(value ?? 0);

function App() {
  const [projects, setProjects] = useState([]);
  const [projectForm, setProjectForm] = useState({ name: '', total_budget: '' });
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editProjectForm, setEditProjectForm] = useState({ name: '', total_budget: '' });
  const [editProjectId, setEditProjectId] = useState(null);

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

  const startEditProject = (p) => {
    setEditProjectForm({ name: p.name, total_budget: p.total_budget });
    setEditProjectId(p.id);
    setEditProjectOpen(true);
  };

  const saveEditProject = async () => {
    await fetch(`/api/projects/${editProjectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editProjectForm.name,
        total_budget: parseFloat(editProjectForm.total_budget || 0)
      })
    });
    setEditProjectOpen(false);
    load(editProjectId);
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
          <Box sx={{ p: 2 }}>
            <IconButton onClick={() => setShowProjectForm(v => !v)} size="small">
              <AddIcon />
            </IconButton>
            <Collapse in={showProjectForm}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
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
            </Collapse>
          </Box>
        </Box>
      </Drawer>

      {selectedProject && (
        <Project
          project={selectedProject}
          onChange={() => load(selectedProject.id)}
          onDelete={() => deleteProject(selectedProject.id)}
          onEdit={() => startEditProject(selectedProject)}
          />
        )}

      <Dialog open={editProjectOpen} onClose={() => setEditProjectOpen(false)}>
        <DialogTitle>Projekt bearbeiten</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Projektname"
            value={editProjectForm.name}
            onChange={e => setEditProjectForm({ ...editProjectForm, name: e.target.value })}
          />
          <TextField
            label="Gesamtbudget"
            type="number"
            value={editProjectForm.total_budget}
            onChange={e => setEditProjectForm({ ...editProjectForm, total_budget: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProjectOpen(false)}>Abbrechen</Button>
          <Button onClick={saveEditProject} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>

      </>
  );
}

function Project({ project, onChange, onDelete, onEdit }) {
  const [subForm, setSubForm] = useState({ name: '', budget: '', threshold: '0.9' });
  const [showSubForm, setShowSubForm] = useState(false);
  const [tab, setTab] = useState(0);
  const [editSubOpen, setEditSubOpen] = useState(false);
  const [editSubForm, setEditSubForm] = useState({ name: '', budget: '', threshold: '' });
  const [editSubId, setEditSubId] = useState(null);

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
  const startEditSub = (s) => {
    setEditSubForm({ name: s.name, budget: s.budget, threshold: s.threshold });
    setEditSubId(s.id);
    setEditSubOpen(true);
  };

  const saveEditSub = async () => {
    await fetch(`/api/subbudgets/${editSubId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editSubForm.name,
        budget: parseFloat(editSubForm.budget || 0),
        threshold: parseFloat(editSubForm.threshold || 0)
      })
    });
    setEditSubOpen(false);
    onChange();
  };

  const used = project.subbudgets.reduce((sum, s) => sum + s.used, 0);
  const percent = project.total_budget ? (used / project.total_budget) * 100 : 0;
  const totalPositions = project.subbudgets.reduce((sum, s) => sum + s.positions.length, 0);
  const donePositions = project.subbudgets.reduce((sum, s) => sum + s.positions.filter(p => p.done).length, 0);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">{project.name}</Typography>
        <Box>
          <IconButton onClick={onEdit} size="small"><EditIcon /></IconButton>
          <IconButton onClick={onDelete} size="small"><DeleteIcon /></IconButton>
        </Box>
      </Box>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Details" />
        <Tab label="Übersicht" />
      </Tabs>
      {tab === 0 && (
        <>
          <Typography variant="subtitle1">{`${formatEuro(used)} / ${formatEuro(project.total_budget)}`}</Typography>
          <LinearProgress variant="determinate" value={percent} sx={{ mb: 2 }} />
          <Box sx={{ mb: 2 }}>
            <IconButton onClick={() => setShowSubForm(v => !v)} size="small"><AddIcon /></IconButton>
            <Collapse in={showSubForm}>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
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
            </Collapse>
          </Box>
          {project.subbudgets.map(s => (
            <SubBudget
              key={s.id}
              sub={s}
              onChange={onChange}
              onDelete={() => deleteSub(s.id)}
              onEdit={() => startEditSub(s)}
            />
          ))}
        </>
      )}
      {tab === 1 && (
        <Box sx={{ p: 2 }}>
          <Typography>Gesamtbudget: {formatEuro(project.total_budget)}</Typography>
          <Typography>Verwendet: {formatEuro(used)}</Typography>
          <Typography>Rest: {formatEuro(project.total_budget - used)}</Typography>
          <LinearProgress variant="determinate" value={percent} sx={{ my: 2 }} />
          <Typography>Teilbudgets: {project.subbudgets.length}</Typography>
          <Typography>Positionen erledigt: {donePositions}/{totalPositions}</Typography>
        </Box>
      )}
      <Dialog open={editSubOpen} onClose={() => setEditSubOpen(false)}>
        <DialogTitle>Teilbudget bearbeiten</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Teilbudget"
            value={editSubForm.name}
            onChange={e => setEditSubForm({ ...editSubForm, name: e.target.value })}
          />
          <TextField
            label="Budget"
            type="number"
            value={editSubForm.budget}
            onChange={e => setEditSubForm({ ...editSubForm, budget: e.target.value })}
          />
          <TextField
            label="Schwelle"
            type="number"
            value={editSubForm.threshold}
            onChange={e => setEditSubForm({ ...editSubForm, threshold: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditSubOpen(false)}>Abbrechen</Button>
          <Button onClick={saveEditSub} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function SubBudget({ sub, onChange, onDelete, onEdit }) {
  const [posForm, setPosForm] = useState({ name: '', planned: '', actual: '', done: false });
  const [showPosForm, setShowPosForm] = useState(false);
  const [editPosOpen, setEditPosOpen] = useState(false);
  const [editPosForm, setEditPosForm] = useState({ name: '', planned: '', actual: '', done: false });
  const [editPosId, setEditPosId] = useState(null);

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

  const startEditPos = (p) => {
    setEditPosForm({ name: p.name, planned: p.planned, actual: p.actual, done: !!p.done });
    setEditPosId(p.id);
    setEditPosOpen(true);
  };

  const saveEditPos = async () => {
    await fetch(`/api/positions/${editPosId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editPosForm.name,
        planned: parseFloat(editPosForm.planned || 0),
        actual: parseFloat(editPosForm.actual || 0),
        done: editPosForm.done ? 1 : 0
      })
    });
    setEditPosOpen(false);
    onChange();
  };

  const percent = sub.budget ? (sub.used / sub.budget) * 100 : 0;
  const warning = sub.budget > 0 && sub.used / sub.budget >= sub.threshold;

    return (
      <>
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
              <Typography variant="caption">{`${formatEuro(sub.used)} / ${formatEuro(sub.budget)}`}</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 1 }}>
              <IconButton onClick={() => setShowPosForm(v => !v)} size="small"><AddIcon /></IconButton>
              <Collapse in={showPosForm}>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
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
              </Collapse>
            </Box>
            <List>
              {sub.positions.map(p => (
                <ListItem
                  key={p.id}
                  secondaryAction={
                    <>
                      <IconButton edge="end" onClick={() => startEditPos(p)}><EditIcon /></IconButton>
                      <IconButton edge="end" onClick={() => deletePos(p.id)}><DeleteIcon /></IconButton>
                    </>
                  }
                >
                  <ListItemText
                    primary={p.name}
                    secondary={`${p.done ? 'Abgeschlossen' : 'Offen'} - ${formatEuro(p.done ? p.actual : p.planned)}`}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
        <Dialog open={editPosOpen} onClose={() => setEditPosOpen(false)}>
          <DialogTitle>Position bearbeiten</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Position"
              value={editPosForm.name}
              onChange={e => setEditPosForm({ ...editPosForm, name: e.target.value })}
            />
            <TextField
              label="Geplant"
              type="number"
              value={editPosForm.planned}
              onChange={e => setEditPosForm({ ...editPosForm, planned: e.target.value })}
            />
            <TextField
              label="Ist"
              type="number"
              value={editPosForm.actual}
              onChange={e => setEditPosForm({ ...editPosForm, actual: e.target.value })}
            />
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Checkbox
                checked={editPosForm.done}
                onChange={e => setEditPosForm({ ...editPosForm, done: e.target.checked })}
              />
              Erledigt
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditPosOpen(false)}>Abbrechen</Button>
            <Button onClick={saveEditPos} variant="contained">Speichern</Button>
          </DialogActions>
        </Dialog>
      </>
    );
}

export default App;

