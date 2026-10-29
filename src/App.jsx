import { FileExplorer } from './components/FileExplorer/FileExplorer.jsx';
import {
  Box,
  Chip,
  Container,
  CssBaseline,
  Stack,
  ThemeProvider,
  Typography,
} from '@mui/material';
import FolderRounded from '@mui/icons-material/FolderRounded';
import { theme } from './theme.js';

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        component="header"
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg" sx={{ py: 2.5 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                display: 'flex',
                p: 1,
                borderRadius: 2.5,
              }}
            >
              <FolderRounded />
            </Box>
            <Typography sx={{ fontWeight: 750 }}>
              VideoSDK{' '}
              <Box
                component="span"
                sx={{ color: 'text.secondary', fontWeight: 400 }}
              >
                Workspace
              </Box>
            </Typography>
            <Chip
              label="File explorer"
              size="small"
              variant="outlined"
              sx={{
                ml: 'auto !important',
                display: { xs: 'none', sm: 'flex' },
                borderColor: 'divider',
                color: 'text.secondary',
              }}
            />
          </Stack>
        </Container>
      </Box>
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
        <Box sx={{ mb: 3.5 }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.8 }}
          >
            Your workspace, organized
          </Typography>
          <Typography variant="h1" sx={{ mt: 0.5, mb: 1 }}>
            VideoSDK File Explorer
          </Typography>
          <Typography color="text.secondary">
            Create, organize, and manage your files in one place.
          </Typography>
        </Box>
        <FileExplorer />
      </Container>
    </ThemeProvider>
  );
};

export default App;
