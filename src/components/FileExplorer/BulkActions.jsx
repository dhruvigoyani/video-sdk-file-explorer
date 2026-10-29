import { useId, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  NativeSelect,
  Stack,
  Typography,
} from '@mui/material';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import DriveFileMoveOutlined from '@mui/icons-material/DriveFileMoveOutlined';
import { useFileExplorer } from '../../hooks/useFileExplorer.js';

export const BulkActions = ({ selectedIds, items, onClear }) => {
  const { sdk } = useFileExplorer();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [moving, setMoving] = useState(false);
  const [destinationId, setDestinationId] = useState('');
  const destinationFieldId = useId();
  // Move/delete each selected branch once, keeping descendants with their folder.
  const topLevelIds = [...selectedIds].filter((id) => {
    let parentId = items.get(id)?.parentId;
    while (parentId !== null && parentId !== undefined) {
      if (selectedIds.has(parentId)) return false;
      parentId = items.get(parentId)?.parentId;
    }
    return true;
  });
  const destinations = [...items.values()].filter((item) => {
    if (item.type !== 'folder') return false;
    let ancestor = item;
    while (ancestor) {
      if (selectedIds.has(ancestor.id)) return false;
      ancestor = items.get(ancestor.parentId);
    }
    return true;
  });
  const folderLocation = (folder) => {
    const names = [];
    let item = folder;
    while (item) {
      names.unshift(item.name);
      item = items.get(item.parentId);
    }
    return names.join(' / ');
  };

  const moveSelected = (event) => {
    event.preventDefault();
    setError('');
    try {
      if (!destinations.some((folder) => folder.id === destinationId)) {
        throw new Error('Choose a destination folder.');
      }
      sdk.transaction(
        topLevelIds
          .filter((id) => items.get(id)?.parentId !== destinationId)
          .map((id) => ({ method: 'moveItem', args: [id, destinationId] })),
      );
      onClear();
      setMoving(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not move selected items.',
      );
    }
  };

  const deleteSelected = () => {
    setError('');
    try {
      sdk.transaction(
        topLevelIds.map((id) => ({ method: 'deleteItem', args: [id] })),
      );
      onClear();
      setConfirming(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not delete selected items.',
      );
    }
  };

  return (
    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
      <Stack
        direction="row"
        useFlexGap
        sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <Typography variant="body2" aria-live="polite" sx={{ mr: 'auto' }}>
          {selectedIds.size} selected for bulk actions
        </Typography>
        <Button disabled={selectedIds.size === 0} onClick={onClear}>
          Clear selection
        </Button>
        <Button
          startIcon={<DriveFileMoveOutlined />}
          disabled={selectedIds.size === 0}
          onClick={() => {
            setMoving(true);
            setConfirming(false);
            setDestinationId('');
            setError('');
          }}
        >
          Move selected
        </Button>
        <Button
          color="error"
          startIcon={<DeleteOutlineRounded />}
          disabled={selectedIds.size === 0}
          onClick={() => {
            setConfirming(true);
            setMoving(false);
            setError('');
          }}
        >
          Delete selected
        </Button>
      </Stack>
      {moving && (
        <Box
          component="form"
          onSubmit={moveSelected}
          sx={{ mt: 1.5, p: 2, bgcolor: '#fafafe', borderRadius: 2 }}
        >
          <Typography variant="body2" sx={{ mb: 1 }}>
            Move {selectedIds.size} selected items to another folder.
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel htmlFor={destinationFieldId}>
              Bulk destination folder
            </InputLabel>
            <NativeSelect
              inputProps={{ id: destinationFieldId }}
              value={destinationId}
              onChange={(event) => setDestinationId(event.target.value)}
              autoFocus
            >
              <option value="">Choose a folder</option>
              {destinations.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folderLocation(folder)}
                </option>
              ))}
            </NativeSelect>
          </FormControl>
          {error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          )}
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" disabled={!destinationId}>
              Confirm bulk move
            </Button>
            <Button
              onClick={() => {
                setMoving(false);
                setError('');
              }}
            >
              Cancel bulk move
            </Button>
          </Stack>
        </Box>
      )}
      {confirming && (
        <Box sx={{ mt: 1.5, p: 2, bgcolor: '#fafafe', borderRadius: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Delete {selectedIds.size} selected items? Selected folders and all
            their descendants will be removed.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          )}
          <Stack direction="row" spacing={1}>
            <Button color="error" variant="contained" onClick={deleteSelected}>
              Confirm bulk delete
            </Button>
            <Button
              onClick={() => {
                setConfirming(false);
                setError('');
              }}
            >
              Cancel bulk delete
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
};
