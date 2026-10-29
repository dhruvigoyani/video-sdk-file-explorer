import { useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import { useFileExplorer } from '../../hooks/useFileExplorer.js';

export const BulkActions = ({ selectedIds, items, onClear }) => {
  const { sdk } = useFileExplorer();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const deleteSelected = () => {
    setError('');
    try {
      // A selected ancestor already deletes its descendants in the transaction.
      const topLevelIds = [...selectedIds].filter((id) => {
        let parentId = items.get(id)?.parentId;
        while (parentId !== null && parentId !== undefined) {
          if (selectedIds.has(parentId)) return false;
          parentId = items.get(parentId)?.parentId;
        }
        return true;
      });
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
          color="error"
          startIcon={<DeleteOutlineRounded />}
          disabled={selectedIds.size === 0}
          onClick={() => {
            setConfirming(true);
            setError('');
          }}
        >
          Delete selected
        </Button>
      </Stack>
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
