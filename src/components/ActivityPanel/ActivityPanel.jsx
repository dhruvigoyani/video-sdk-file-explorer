import { Box, Stack, Typography } from '@mui/material';
import HistoryRounded from '@mui/icons-material/HistoryRounded';
import { useFileExplorer } from '../../hooks/useFileExplorer.js';

const actionLabels = {
  createFile: 'Created file',
  createFolder: 'Created folder',
  renameItem: 'Renamed',
  moveItem: 'Moved',
  deleteItem: 'Deleted',
};

export const ActivityPanel = () => {
  const { activity } = useFileExplorer();

  return (
    <Box
      component="section"
      aria-label="Recent activity"
      sx={{ px: { xs: 2, sm: 3 }, py: 3 }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
        <HistoryRounded fontSize="small" color="primary" />
        <Typography component="h2" variant="h2">
          Recent activity
        </Typography>
      </Stack>
      {activity.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No changes yet. File operations will appear here.
        </Typography>
      ) : (
        <Box
          component="ol"
          aria-label="Recent changes"
          sx={{ listStyle: 'none', p: 0, m: 0 }}
        >
          {activity.map((entry) => (
            <Box
              component="li"
              key={entry.id}
              sx={{
                py: 1,
                borderBottom: 1,
                borderColor: 'divider',
                '&:last-child': { borderBottom: 0 },
              }}
            >
              <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                {entry.type === 'undo'
                  ? 'Undid last change'
                  : entry.type === 'redo'
                    ? 'Redid last change'
                    : `${actionLabels[entry.type]} ${entry.name}`}
              </Typography>
              {entry.itemId && (
                <Typography variant="caption" color="text.secondary">
                  ID: {entry.itemId}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};
