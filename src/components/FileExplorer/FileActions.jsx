import { useId, useMemo, useState } from 'react';
import { useFileExplorer } from '../../hooks/useFileExplorer.js';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import NoteAddOutlined from '@mui/icons-material/NoteAddOutlined';
import CreateNewFolderOutlined from '@mui/icons-material/CreateNewFolderOutlined';
import DriveFileRenameOutlineRounded from '@mui/icons-material/DriveFileRenameOutlineRounded';

export const FileActions = ({ selected, onReveal }) => {
  const { sdk, structure } = useFileExplorer();
  const [action, setAction] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const fieldId = useId();
  const folders = useMemo(
    () =>
      sdk.search('', { type: 'folder', pageSize: Number.MAX_SAFE_INTEGER })
        .items,
    [sdk, structure],
  );
  const parentId =
    selected?.type === 'folder'
      ? selected.id
      : (selected?.parentId ?? structure.id);
  const parent = folders.find((folder) => folder.id === parentId);

  const startAction = (nextAction) => {
    setAction(nextAction);
    setName(nextAction === 'rename' ? selected.name : '');
    setError('');
  };

  const submit = (event) => {
    event.preventDefault();
    setError('');

    try {
      if (action === 'createFile' || action === 'createFolder') {
        onReveal(sdk[action](parentId, name));
      } else if (action === 'rename') {
        sdk.renameItem(selected.id, name);
      }
      setAction(null);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'The operation failed.',
      );
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        useFlexGap
        sx={{ flexWrap: 'wrap', gap: 1 }}
        role="group"
        aria-label="File actions"
      >
        <Button
          variant="contained"
          startIcon={<NoteAddOutlined />}
          onClick={() => startAction('createFile')}
        >
          New file
        </Button>
        <Button
          variant="outlined"
          startIcon={<CreateNewFolderOutlined />}
          onClick={() => startAction('createFolder')}
        >
          New folder
        </Button>
        <Button
          startIcon={<DriveFileRenameOutlineRounded />}
          type="button"
          disabled={!selected}
          onClick={() => startAction('rename')}
        >
          Rename
        </Button>
      </Stack>
      {action && (
        <Paper
          component="form"
          variant="outlined"
          onSubmit={submit}
          noValidate
          sx={{
            mt: 2,
            p: { xs: 2, sm: 2.5 },
            maxWidth: 560,
            display: 'grid',
            gap: 2,
            borderColor: 'divider',
            bgcolor: '#fafafe',
          }}
        >
          {(action === 'createFile' ||
            action === 'createFolder' ||
            action === 'rename') && (
            <>
              <Typography variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>
                {action === 'rename'
                  ? `Rename ${selected.name}`
                  : `Create ${action === 'createFile' ? 'file' : 'folder'} in ${parent?.location}`}
              </Typography>
              <TextField
                label="Name"
                size="small"
                fullWidth
                error={Boolean(error)}
                id={fieldId}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained">
              Save
            </Button>
            <Button
              type="button"
              onClick={() => {
                setAction(null);
                setError('');
              }}
            >
              Cancel
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};
