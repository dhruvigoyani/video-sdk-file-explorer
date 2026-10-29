import { useState } from 'react';
import { Alert, Box, Button, Stack } from '@mui/material';
import UndoRounded from '@mui/icons-material/UndoRounded';
import RedoRounded from '@mui/icons-material/RedoRounded';
import { useFileExplorer } from '../../hooks/useFileExplorer.js';

export const HistoryControls = () => {
  const { sdk, canUndo, canRedo } = useFileExplorer();
  const [error, setError] = useState('');

  const restore = (action) => {
    setError('');
    try {
      sdk[action]();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not restore history.',
      );
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        role="group"
        aria-label="History controls"
      >
        <Button
          startIcon={<UndoRounded />}
          disabled={!canUndo}
          onClick={() => restore('undo')}
        >
          Undo
        </Button>
        <Button
          startIcon={<RedoRounded />}
          disabled={!canRedo}
          onClick={() => restore('redo')}
        >
          Redo
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};
