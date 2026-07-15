import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { api } from './api.js';

const currency = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatEuro = (value) => currency.format(Number(value) || 0);
const percentOf = (value, total) => (total > 0 ? (value / total) * 100 : 0);
const progressValue = (value) => Math.min(Math.max(value, 0), 100);
const numberValue = (value) => (value === '' ? 0 : Number(value));

function budgetState(used, budget, threshold = 0.9) {
  if (budget <= 0 && used > 0) return { label: 'Ohne Budget', color: 'error', severity: 'error' };
  if (used > budget) return { label: 'Überschritten', color: 'error', severity: 'error' };
  if (budget > 0 && used / budget >= threshold) return { label: 'Warnschwelle', color: 'warning', severity: 'warning' };
  return { label: 'Im Rahmen', color: 'success', severity: 'success' };
}

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(() => Number(localStorage.getItem('selected-project')) || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projectDialog, setProjectDialog] = useState({ open: false, project: null });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ open: false, message: '', severity: 'success' });

  const loadProjects = useCallback(async (preferredId) => {
    try {
      const data = await api.getProjects();
      setError('');
      setProjects(data);
      setSelectedProjectId((currentId) => {
        const wantedId = preferredId ?? currentId;
        if (data.some((project) => project.id === wantedId)) return wantedId;
        return data[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial remote data loading is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (selectedProjectId) localStorage.setItem('selected-project', String(selectedProjectId));
    else localStorage.removeItem('selected-project');
  }, [selectedProjectId]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || null;

  const refresh = () => {
    setRefreshing(true);
    loadProjects(selectedProjectId);
  };

  const mutate = async (action, successMessage, preferredId = selectedProjectId) => {
    setSaving(true);
    try {
      const result = await action();
      const nextId = typeof preferredId === 'function' ? preferredId(result) : preferredId;
      await loadProjects(nextId);
      setNotice({ open: true, message: successMessage, severity: 'success' });
      return true;
    } catch (mutationError) {
      setNotice({ open: true, message: mutationError.message, severity: 'error' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveProject = async (values, project) => {
    const success = project
      ? await mutate(() => api.updateProject(project.id, values), 'Projekt wurde aktualisiert.', project.id)
      : await mutate(() => api.createProject(values), 'Projekt wurde angelegt.', (result) => result.id);
    if (success) setProjectDialog({ open: false, project: null });
  };

  const sidebar = (
    <Sidebar
      projects={projects}
      selectedProjectId={selectedProjectId}
      onSelect={(id) => {
        setSelectedProjectId(id);
        setMobileMenuOpen(false);
      }}
      onCreate={() => {
        setProjectDialog({ open: true, project: null });
        setMobileMenuOpen(false);
      }}
    />
  );

  return (
    <Box className="app-shell">
      <Box component="aside" className="desktop-sidebar">{sidebar}</Box>

      <Box className="main-content">
        <AppBar className="mobile-topbar" position="sticky" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', backdropFilter: 'blur(18px)', bgcolor: 'rgba(11,14,19,.86)' }}>
          <Toolbar>
            <IconButton edge="start" onClick={() => setMobileMenuOpen(true)} aria-label="Projekte öffnen"><MenuRoundedIcon /></IconButton>
            <Typography sx={{ ml: 1, fontWeight: 750, flex: 1 }} noWrap>{selectedProject?.name || 'Projektbudget'}</Typography>
            <Tooltip title="Aktualisieren"><span><IconButton onClick={refresh} disabled={refreshing}>{refreshing ? <CircularProgress size={20} /> : <RefreshRoundedIcon />}</IconButton></span></Tooltip>
          </Toolbar>
        </AppBar>

        <Box component="main" className="content-frame">
          {loading ? (
            <LoadingView />
          ) : error ? (
            <ErrorView message={error} onRetry={refresh} />
          ) : selectedProject ? (
            <ProjectWorkspace
              key={selectedProject.id}
              project={selectedProject}
              saving={saving}
              onMutate={mutate}
              onEditProject={() => setProjectDialog({ open: true, project: selectedProject })}
              onRefresh={refresh}
              refreshing={refreshing}
            />
          ) : (
            <EmptyProjects onCreate={() => setProjectDialog({ open: true, project: null })} />
          )}
        </Box>
      </Box>

      <Drawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} PaperProps={{ sx: { width: 290, bgcolor: 'background.default' } }}>
        {sidebar}
      </Drawer>

      {projectDialog.open && (
        <ProjectDialog
          open
          project={projectDialog.project}
          saving={saving}
          onClose={() => setProjectDialog({ open: false, project: null })}
          onSave={saveProject}
        />
      )}

      <Snackbar open={notice.open} autoHideDuration={4200} onClose={() => setNotice((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={() => setNotice((current) => ({ ...current, open: false }))}>{notice.message}</Alert>
      </Snackbar>
    </Box>
  );
}

function Sidebar({ projects, selectedProjectId, onSelect, onCreate }) {
  return (
    <Stack sx={{ minHeight: '100%', p: 2.25 }}>
      <Stack direction="row" alignItems="center" spacing={1.4} sx={{ px: 1, pt: 0.5, pb: 3 }}>
        <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 38, height: 38 }}><AccountBalanceWalletRoundedIcon fontSize="small" /></Avatar>
        <Box>
          <Typography sx={{ fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.1 }}>Projektbudget</Typography>
          <Typography variant="caption" color="text.secondary">Planen. Entscheiden. Fertig.</Typography>
        </Box>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1, mb: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '.11em' }}>Projekte</Typography>
        <Chip label={projects.length} size="small" sx={{ height: 22 }} />
      </Stack>

      <List disablePadding sx={{ flex: 1 }}>
        {projects.map((project) => {
          const progress = percentOf(project.used, project.total_budget);
          return (
            <ListItemButton
              key={project.id}
              selected={project.id === selectedProjectId}
              onClick={() => onSelect(project.id)}
              sx={{ borderRadius: 2, mb: 0.6, px: 1.25, py: 1.1, alignItems: 'flex-start', '&.Mui-selected': { bgcolor: 'rgba(159,232,112,.1)', '&:hover': { bgcolor: 'rgba(159,232,112,.14)' } } }}
            >
              <ListItemText
                primary={project.name}
                secondary={`${formatEuro(project.used)} von ${formatEuro(project.total_budget)}`}
                primaryTypographyProps={{ noWrap: true, fontWeight: project.id === selectedProjectId ? 750 : 600 }}
                secondaryTypographyProps={{ noWrap: true, fontSize: '.72rem', color: progress > 100 ? 'error.main' : 'text.secondary' }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ my: 2 }} />
      <Stack spacing={1}>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={onCreate} fullWidth>Neues Projekt</Button>
        <Button component="a" href="/api/backup" startIcon={<DownloadRoundedIcon />} color="inherit" fullWidth>Backup herunterladen</Button>
      </Stack>
    </Stack>
  );
}

function ProjectWorkspace({ project, saving, onMutate, onEditProject, onRefresh, refreshing }) {
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [subbudgetDialog, setSubbudgetDialog] = useState({ open: false, subbudget: null });
  const [positionDialog, setPositionDialog] = useState({ open: false, subbudget: null, position: null });
  const [confirm, setConfirm] = useState(null);

  const remaining = project.total_budget - project.used;
  const unallocated = project.total_budget - project.allocated;
  const projectProgress = percentOf(project.used, project.total_budget);
  const projectStatus = budgetState(project.used, project.total_budget, 0.9);
  const queryLower = query.trim().toLocaleLowerCase('de');

  const filteredSubbudgets = useMemo(() => {
    if (!queryLower) return project.subbudgets;
    return project.subbudgets
      .map((subbudget) => {
        if (subbudget.name.toLocaleLowerCase('de').includes(queryLower)) return subbudget;
        return { ...subbudget, positions: subbudget.positions.filter((position) => position.name.toLocaleLowerCase('de').includes(queryLower)) };
      })
      .filter((subbudget) => subbudget.name.toLocaleLowerCase('de').includes(queryLower) || subbudget.positions.length > 0);
  }, [project.subbudgets, queryLower]);

  const saveSubbudget = async (values, subbudget) => {
    const success = subbudget
      ? await onMutate(() => api.updateSubbudget(subbudget.id, values), 'Teilbudget wurde aktualisiert.', project.id)
      : await onMutate(() => api.createSubbudget(project.id, values), 'Teilbudget wurde angelegt.', project.id);
    if (success) setSubbudgetDialog({ open: false, subbudget: null });
  };

  const savePosition = async (values, subbudget, position) => {
    const success = position
      ? await onMutate(() => api.updatePosition(position.id, values), 'Position wurde aktualisiert.', project.id)
      : await onMutate(() => api.createPosition(subbudget.id, values), 'Position wurde angelegt.', project.id);
    if (success) setPositionDialog({ open: false, subbudget: null, position: null });
  };

  const deleteProject = async () => {
    await onMutate(() => api.deleteProject(project.id), 'Projekt wurde gelöscht.', null);
    setConfirm(null);
  };

  return (
    <Stack spacing={3.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800, letterSpacing: '.12em' }}>Projektübersicht</Typography>
          <Typography variant="h1">{project.name}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Daten aktualisieren"><span><IconButton onClick={onRefresh} disabled={refreshing}>{refreshing ? <CircularProgress size={20} /> : <RefreshRoundedIcon />}</IconButton></span></Tooltip>
          <Button color="inherit" startIcon={<EditRoundedIcon />} onClick={onEditProject}>Bearbeiten</Button>
          <Tooltip title="Projekt löschen"><IconButton color="error" onClick={() => setConfirm({ title: 'Projekt wirklich löschen?', body: `„${project.name}“ und alle enthaltenen Budgets und Positionen werden dauerhaft gelöscht.`, action: deleteProject })}><DeleteOutlineRoundedIcon /></IconButton></Tooltip>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: { xs: 2.25, md: 3 }, overflow: 'hidden', position: 'relative' }}>
        <Box sx={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', bgcolor: 'rgba(159,232,112,.06)', filter: 'blur(2px)', right: -100, top: -150, pointerEvents: 'none' }} />
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={3} sx={{ position: 'relative' }}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Typography color="text.secondary" fontWeight={650}>Aktueller Budgetstand</Typography>
              <Chip label={projectStatus.label} color={projectStatus.color} size="small" variant="outlined" />
            </Stack>
            <Typography sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 780, letterSpacing: '-.05em', lineHeight: 1.05 }}>{formatEuro(project.used)}</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>von {formatEuro(project.total_budget)} Gesamtbudget</Typography>
            <LinearProgress color={projectStatus.color} variant="determinate" value={progressValue(projectProgress)} sx={{ mt: 2.5, maxWidth: 580 }} />
            <Typography variant="caption" color={projectProgress > 100 ? 'error.main' : 'text.secondary'}>{projectProgress.toLocaleString('de-DE', { maximumFractionDigits: 1 })} % verwendet</Typography>
          </Box>
          <Stack direction="row" gap={1.25} flexWrap="wrap" alignContent="flex-start">
            <Metric label="Verfügbar" value={formatEuro(remaining)} tone={remaining < 0 ? 'error.main' : 'text.primary'} />
            <Metric label="Noch nicht verteilt" value={formatEuro(unallocated)} tone={unallocated < 0 ? 'warning.main' : 'text.primary'} />
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, value) => setTab(value)} aria-label="Projektbereiche">
          <Tab label="Budgets & Positionen" />
          <Tab label="Analyse" />
        </Tabs>
      </Box>

      {tab === 0 ? (
        <Stack spacing={2.2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Budgets oder Positionen suchen"
              aria-label="Budgets oder Positionen suchen"
              sx={{ width: { xs: '100%', sm: 340 } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
            />
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setSubbudgetDialog({ open: true, subbudget: null })}>Teilbudget anlegen</Button>
          </Stack>

          {project.subbudgets.length === 0 ? (
            <EmptySection title="Noch keine Teilbudgets" body="Gliedere dein Gesamtbudget in Bereiche wie Material, Personal oder Reisen." action="Erstes Teilbudget anlegen" onAction={() => setSubbudgetDialog({ open: true, subbudget: null })} />
          ) : filteredSubbudgets.length === 0 ? (
            <EmptySection title="Keine Treffer" body="Versuche einen anderen Suchbegriff." action="Suche zurücksetzen" onAction={() => setQuery('')} />
          ) : (
            filteredSubbudgets.map((subbudget) => (
              <SubbudgetCard
                key={subbudget.id}
                subbudget={subbudget}
                searchActive={Boolean(queryLower)}
                saving={saving}
                onAddPosition={() => setPositionDialog({ open: true, subbudget, position: null })}
                onEdit={() => setSubbudgetDialog({ open: true, subbudget })}
                onEditPosition={(position) => setPositionDialog({ open: true, subbudget, position })}
                onDelete={() => setConfirm({
                  title: 'Teilbudget löschen?',
                  body: `„${subbudget.name}“ und ${subbudget.positions.length} enthaltene Positionen werden dauerhaft gelöscht.`,
                  action: async () => {
                    await onMutate(() => api.deleteSubbudget(subbudget.id), 'Teilbudget wurde gelöscht.', project.id);
                    setConfirm(null);
                  },
                })}
                onDeletePosition={(position) => setConfirm({
                  title: 'Position löschen?',
                  body: `„${position.name}“ wird dauerhaft gelöscht.`,
                  action: async () => {
                    await onMutate(() => api.deletePosition(position.id), 'Position wurde gelöscht.', project.id);
                    setConfirm(null);
                  },
                })}
                onTogglePosition={async (position, done) => {
                  if (done && position.actual === 0 && position.planned > 0) {
                    setPositionDialog({ open: true, subbudget, position: { ...position, done: true, actual: position.planned } });
                    return;
                  }
                  await onMutate(() => api.updatePositionStatus(position.id, { done, actual: position.actual }), done ? 'Position wurde abgeschlossen.' : 'Position ist wieder offen.', project.id);
                }}
              />
            ))
          )}
        </Stack>
      ) : (
        <AnalysisView project={project} />
      )}

      {subbudgetDialog.open && <SubbudgetDialog open subbudget={subbudgetDialog.subbudget} saving={saving} onClose={() => setSubbudgetDialog({ open: false, subbudget: null })} onSave={saveSubbudget} />}
      {positionDialog.open && <PositionDialog open subbudget={positionDialog.subbudget} position={positionDialog.position} saving={saving} onClose={() => setPositionDialog({ open: false, subbudget: null, position: null })} onSave={savePosition} />}
      <ConfirmDialog open={Boolean(confirm)} title={confirm?.title} body={confirm?.body} saving={saving} onClose={() => setConfirm(null)} onConfirm={confirm?.action} />
    </Stack>
  );
}

function SubbudgetCard({ subbudget, searchActive, saving, onAddPosition, onEdit, onEditPosition, onDelete, onDeletePosition, onTogglePosition }) {
  const [expanded, setExpanded] = useState(searchActive);
  const percentage = percentOf(subbudget.used, subbudget.budget);
  const state = budgetState(subbudget.used, subbudget.budget, subbudget.threshold);
  const isExpanded = expanded || searchActive;

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', borderColor: state.severity === 'error' ? 'rgba(255,116,116,.35)' : state.severity === 'warning' ? 'rgba(255,189,91,.28)' : 'divider' }}>
      <Box sx={{ p: { xs: 2, md: 2.4 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.6 }}>
              <Typography variant="h2" noWrap>{subbudget.name}</Typography>
              <Chip size="small" color={state.color} variant="outlined" label={state.label} />
            </Stack>
            <Typography color="text.secondary" variant="body2">
              {formatEuro(subbudget.used)} von {formatEuro(subbudget.budget)} · Warnung ab {Math.round(subbudget.threshold * 100)} %
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Tooltip title="Position hinzufügen"><IconButton color="primary" onClick={onAddPosition}><AddRoundedIcon /></IconButton></Tooltip>
            <Tooltip title="Teilbudget bearbeiten"><IconButton onClick={onEdit}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Teilbudget löschen"><IconButton color="error" onClick={onDelete}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
            <IconButton aria-label={isExpanded ? 'Positionen einklappen' : 'Positionen ausklappen'} onClick={() => setExpanded((value) => !value)} sx={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><ExpandMoreRoundedIcon /></IconButton>
          </Stack>
        </Stack>
        <LinearProgress variant="determinate" color={state.color} value={progressValue(percentage)} sx={{ mt: 2 }} />
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.8 }}>
          <Typography variant="caption" color="text.secondary">{subbudget.positions.length} {subbudget.positions.length === 1 ? 'Position' : 'Positionen'}</Typography>
          <Typography variant="caption" color={percentage > 100 ? 'error.main' : 'text.secondary'}>{percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %</Typography>
        </Stack>
      </Box>

      {isExpanded && (
        <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
          {subbudget.positions.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ mb: 1.5 }}>Noch keine Positionen in diesem Budget.</Typography>
              <Button size="small" startIcon={<AddRoundedIcon />} onClick={onAddPosition}>Position hinzufügen</Button>
            </Box>
          ) : (
            <Stack divider={<Divider flexItem />}>
              {subbudget.positions.map((position) => (
                <PositionRow key={position.id} position={position} saving={saving} onToggle={(done) => onTogglePosition(position, done)} onEdit={() => onEditPosition(position)} onDelete={() => onDeletePosition(position)} />
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Paper>
  );
}

function PositionRow({ position, saving, onToggle, onEdit, onDelete }) {
  const activeCost = position.done ? position.actual : position.planned;
  const variance = position.actual - position.planned;
  return (
    <Stack direction="row" alignItems="center" spacing={1.2} sx={{ px: { xs: 1.4, md: 2.2 }, py: 1.25, '&:hover': { bgcolor: 'rgba(255,255,255,.018)' } }}>
      <Checkbox checked={position.done} disabled={saving} onChange={(event) => onToggle(event.target.checked)} aria-label={`${position.name} als ${position.done ? 'offen' : 'erledigt'} markieren`} color="success" />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={{ xs: 0.25, sm: 1 }}>
          <Typography fontWeight={650} noWrap sx={{ textDecoration: position.done ? 'line-through' : 'none', color: position.done ? 'text.secondary' : 'text.primary', maxWidth: '100%' }}>{position.name}</Typography>
          <Chip size="small" label={position.done ? 'Erledigt' : 'Geplant'} color={position.done ? 'success' : 'default'} variant="outlined" sx={{ height: 22 }} />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Plan {formatEuro(position.planned)}{position.done ? ` · Ist ${formatEuro(position.actual)} · ${variance > 0 ? '+' : ''}${formatEuro(variance)} Abweichung` : ''}
        </Typography>
      </Box>
      <Typography fontWeight={750} sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 95, textAlign: 'right' }}>{formatEuro(activeCost)}</Typography>
      <Tooltip title="Bearbeiten"><IconButton size="small" onClick={onEdit}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Löschen"><IconButton size="small" color="error" onClick={onDelete}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
    </Stack>
  );
}

function AnalysisView({ project }) {
  const unallocated = project.total_budget - project.allocated;
  const openPositions = project.positions_count - project.done_count;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1.4fr) minmax(280px,.6fr)' }, gap: 2 }}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h2" sx={{ mb: 0.5 }}>Budgetverteilung</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2.5 }}>Verbrauch je Teilbudget</Typography>
        {project.subbudgets.length === 0 ? (
          <Typography color="text.secondary">Noch keine Daten vorhanden.</Typography>
        ) : (
          <Stack spacing={2.2}>
            {project.subbudgets.map((subbudget) => {
              const value = percentOf(subbudget.used, subbudget.budget);
              const state = budgetState(subbudget.used, subbudget.budget, subbudget.threshold);
              return (
                <Box key={subbudget.id}>
                  <Stack direction="row" justifyContent="space-between" gap={2} sx={{ mb: 0.75 }}>
                    <Typography fontWeight={650} noWrap>{subbudget.name}</Typography>
                    <Typography variant="body2" color={state.severity === 'success' ? 'text.secondary' : `${state.color}.main`} noWrap>{formatEuro(subbudget.used)} / {formatEuro(subbudget.budget)}</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={progressValue(value)} color={state.color} />
                </Box>
              );
            })}
          </Stack>
        )}
      </Paper>
      <Stack spacing={2}>
        <InsightCard icon={<AccountBalanceWalletRoundedIcon />} label="Verteilt" value={formatEuro(project.allocated)} note={`${formatEuro(unallocated)} noch nicht verteilt`} tone={unallocated < 0 ? 'warning' : 'primary'} />
        <InsightCard icon={<CheckCircleRoundedIcon />} label="Erledigt" value={`${project.done_count} / ${project.positions_count}`} note={`${openPositions} Positionen noch offen`} tone="success" />
        <InsightCard icon={project.used > project.total_budget ? <WarningAmberRoundedIcon /> : <TrendingUpRoundedIcon />} label="Budgetstatus" value={project.used > project.total_budget ? 'Handlungsbedarf' : 'Im Blick'} note={`${formatEuro(project.total_budget - project.used)} verbleibend`} tone={project.used > project.total_budget ? 'error' : 'secondary'} />
      </Stack>
    </Box>
  );
}

function InsightCard({ icon, label, value, note, tone }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.2 }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar variant="rounded" sx={{ bgcolor: `${tone}.main`, color: `${tone}.contrastText`, width: 38, height: 38 }}>{icon}</Avatar>
        <Box minWidth={0}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
          <Typography variant="h2" sx={{ my: 0.25 }} noWrap>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{note}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function Metric({ label, value, tone }) {
  return (
    <Box sx={{ p: 1.75, minWidth: 150, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'rgba(255,255,255,.018)' }}>
      <Typography variant="caption" color="text.secondary" fontWeight={650}>{label}</Typography>
      <Typography sx={{ fontSize: '1.2rem', fontWeight: 760, color: tone, mt: 0.25 }}>{value}</Typography>
    </Box>
  );
}

function ProjectDialog({ open, project, saving, onClose, onSave }) {
  const [values, setValues] = useState(() => ({ name: project?.name || '', total_budget: project?.total_budget ?? '' }));
  const [submitted, setSubmitted] = useState(false);

  const valid = values.name.trim() && Number(values.total_budget) >= 0 && values.total_budget !== '';
  const submit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (valid) onSave({ name: values.name.trim(), total_budget: numberValue(values.total_budget) }, project);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>{project ? 'Projekt bearbeiten' : 'Neues Projekt'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField autoFocus label="Projektname" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} error={submitted && !values.name.trim()} helperText={submitted && !values.name.trim() ? 'Bitte gib einen Namen ein.' : 'Zum Beispiel: Wohnung renovieren'} inputProps={{ maxLength: 120 }} />
            <MoneyField label="Gesamtbudget" value={values.total_budget} onChange={(value) => setValues({ ...values, total_budget: value })} error={submitted && (values.total_budget === '' || Number(values.total_budget) < 0)} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={onClose} disabled={saving}>Abbrechen</Button><LoadingButton type="submit" loading={saving}>{project ? 'Speichern' : 'Projekt anlegen'}</LoadingButton></DialogActions>
      </Box>
    </Dialog>
  );
}

function SubbudgetDialog({ open, subbudget, saving, onClose, onSave }) {
  const [values, setValues] = useState(() => ({ name: subbudget?.name || '', budget: subbudget?.budget ?? '', threshold: subbudget ? Math.round(subbudget.threshold * 100) : 90 }));
  const [submitted, setSubmitted] = useState(false);

  const threshold = Number(values.threshold);
  const valid = values.name.trim() && values.budget !== '' && Number(values.budget) >= 0 && threshold >= 0 && threshold <= 100;
  const submit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (valid) onSave({ name: values.name.trim(), budget: numberValue(values.budget), threshold: threshold / 100 }, subbudget);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>{subbudget ? 'Teilbudget bearbeiten' : 'Teilbudget anlegen'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField autoFocus label="Name des Teilbudgets" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} error={submitted && !values.name.trim()} helperText={submitted && !values.name.trim() ? 'Bitte gib einen Namen ein.' : 'Zum Beispiel: Material'} inputProps={{ maxLength: 120 }} />
            <MoneyField label="Budget" value={values.budget} onChange={(value) => setValues({ ...values, budget: value })} error={submitted && (values.budget === '' || Number(values.budget) < 0)} />
            <TextField label="Warnschwelle" type="number" value={values.threshold} onChange={(event) => setValues({ ...values, threshold: event.target.value })} error={submitted && (threshold < 0 || threshold > 100)} helperText="Ab dieser Auslastung wird das Budget hervorgehoben." InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} inputProps={{ min: 0, max: 100, step: 1 }} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={onClose} disabled={saving}>Abbrechen</Button><LoadingButton type="submit" loading={saving}>{subbudget ? 'Speichern' : 'Teilbudget anlegen'}</LoadingButton></DialogActions>
      </Box>
    </Dialog>
  );
}

function PositionDialog({ open, subbudget, position, saving, onClose, onSave }) {
  const [values, setValues] = useState(() => ({ name: position?.name || '', planned: position?.planned ?? '', actual: position?.actual ?? '', done: Boolean(position?.done) }));
  const [submitted, setSubmitted] = useState(false);

  const valid = values.name.trim() && values.planned !== '' && Number(values.planned) >= 0 && (values.actual === '' || Number(values.actual) >= 0);
  const submit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (valid) onSave({ name: values.name.trim(), planned: numberValue(values.planned), actual: numberValue(values.actual), done: values.done }, subbudget, position);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>{position ? 'Position bearbeiten' : `Position zu „${subbudget?.name || ''}“ hinzufügen`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField autoFocus label="Bezeichnung" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} error={submitted && !values.name.trim()} helperText={submitted && !values.name.trim() ? 'Bitte gib eine Bezeichnung ein.' : 'Zum Beispiel: Fliesen'} inputProps={{ maxLength: 120 }} />
            <MoneyField label="Geplante Kosten" value={values.planned} onChange={(value) => setValues({ ...values, planned: value })} error={submitted && (values.planned === '' || Number(values.planned) < 0)} />
            <MoneyField label="Tatsächliche Kosten" value={values.actual} onChange={(value) => setValues({ ...values, actual: value })} error={submitted && Number(values.actual) < 0} helperText={values.done ? 'Dieser Wert zählt jetzt für das Budget.' : 'Wird erst gezählt, wenn die Position erledigt ist.'} />
            <FormControlLabel control={<Checkbox checked={values.done} onChange={(event) => setValues({ ...values, done: event.target.checked })} color="success" />} label="Position ist erledigt" />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={onClose} disabled={saving}>Abbrechen</Button><LoadingButton type="submit" loading={saving}>{position ? 'Speichern' : 'Position anlegen'}</LoadingButton></DialogActions>
      </Box>
    </Dialog>
  );
}

function MoneyField({ label, value, onChange, error, helperText }) {
  return (
    <TextField
      label={label}
      type="number"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={error}
      helperText={error ? 'Bitte gib einen Betrag ab 0 ein.' : helperText}
      InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
      inputProps={{ min: 0, max: 1000000000, step: '0.01', inputMode: 'decimal' }}
    />
  );
}

function LoadingButton({ loading, children, ...props }) {
  return <Button variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined} {...props}>{children}</Button>;
}

function ConfirmDialog({ open, title, body, saving, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent><Typography color="text.secondary">{body}</Typography></DialogContent>
      <DialogActions><Button onClick={onClose} disabled={saving}>Abbrechen</Button><LoadingButton loading={saving} color="error" onClick={onConfirm}>Endgültig löschen</LoadingButton></DialogActions>
    </Dialog>
  );
}

function EmptyProjects({ onCreate }) {
  return (
    <Paper variant="outlined" sx={{ minHeight: 520, display: 'grid', placeItems: 'center', p: 3, textAlign: 'center' }}>
      <Box sx={{ maxWidth: 480 }}>
        <Avatar variant="rounded" sx={{ width: 64, height: 64, bgcolor: 'rgba(159,232,112,.12)', color: 'primary.main', mx: 'auto', mb: 2 }}><AccountBalanceWalletRoundedIcon /></Avatar>
        <Typography variant="h1" sx={{ fontSize: '2rem' }}>Dein Budget beginnt hier</Typography>
        <Typography color="text.secondary" sx={{ my: 2 }}>Lege ein Projekt an, verteile das Gesamtbudget auf Bereiche und behalte geplante sowie tatsächliche Kosten im Blick.</Typography>
        <Button variant="contained" size="large" startIcon={<AddRoundedIcon />} onClick={onCreate}>Erstes Projekt anlegen</Button>
      </Box>
    </Paper>
  );
}

function EmptySection({ title, body, action, onAction }) {
  return (
    <Paper variant="outlined" sx={{ p: 5, textAlign: 'center' }}>
      <Avatar variant="rounded" sx={{ mx: 'auto', mb: 1.5, bgcolor: 'rgba(120,185,255,.1)', color: 'secondary.main' }}><MoreHorizRoundedIcon /></Avatar>
      <Typography variant="h2">{title}</Typography>
      <Typography color="text.secondary" sx={{ my: 1, mx: 'auto', maxWidth: 480 }}>{body}</Typography>
      <Button onClick={onAction} startIcon={<AddRoundedIcon />}>{action}</Button>
    </Paper>
  );
}

function LoadingView() {
  return <Box sx={{ minHeight: 520, display: 'grid', placeItems: 'center' }}><Stack alignItems="center" spacing={2}><CircularProgress /><Typography color="text.secondary">Projekte werden geladen …</Typography></Stack></Box>;
}

function ErrorView({ message, onRetry }) {
  return <Alert severity="error" action={<Button color="inherit" onClick={onRetry}>Erneut versuchen</Button>}><Typography fontWeight={700}>Daten konnten nicht geladen werden</Typography>{message}</Alert>;
}

export default App;
