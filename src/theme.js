import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#6854cc' },
    background: { default: '#f6f7fb', paper: '#ffffff' },
    text: { primary: '#25283d', secondary: '#72768a' },
    divider: '#e9eaf2',
  },
  typography: {
    fontFamily: '"Segoe UI", Arial, sans-serif',
    h1: { fontSize: '1.85rem', fontWeight: 750, letterSpacing: '-0.045em' },
    h2: { fontSize: '1.1rem', fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 8, padding: '8px 14px' } },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiCssBaseline: {
      styleOverrides: {
        'button:focus-visible': {
          outline: '2px solid #6854cc',
          outlineOffset: 3,
        },
        '::selection': { background: '#e7e1ff' },
      },
    },
  },
});
