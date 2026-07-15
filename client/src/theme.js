import { alpha, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#9fe870', contrastText: '#10210d' },
    secondary: { main: '#78b9ff' },
    background: { default: '#0b0e13', paper: '#131820' },
    text: { primary: '#f6f7f4', secondary: '#a8b0bd' },
    warning: { main: '#ffbd5b' },
    error: { main: '#ff7474' },
    success: { main: '#76d49b' },
    divider: 'rgba(255,255,255,0.08)',
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 760, letterSpacing: '-0.045em', lineHeight: 1.05 },
    h2: { fontSize: '1.35rem', fontWeight: 720, letterSpacing: '-0.02em' },
    h3: { fontSize: '1rem', fontWeight: 700 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: 'radial-gradient(circle at 75% -10%, rgba(159,232,112,0.08), transparent 35%)',
        },
        '*::selection': { background: alpha('#9fe870', 0.28) },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10, minHeight: 40, paddingInline: 16 } },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiDialog: { styleOverrides: { paper: { border: '1px solid rgba(255,255,255,0.09)' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.08)' },
        bar: { borderRadius: 99 },
      },
    },
    MuiTooltip: { defaultProps: { arrow: true } },
  },
});

export default theme;
