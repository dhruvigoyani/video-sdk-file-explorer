import { Box, Stack, Typography } from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';

export const DetailsPanel = ({ item, location, parentName }) => {
  const fields = item
    ? [
        ['Name', item.name],
        ['Type', item.type],
        ['ID', item.id],
        ['Parent folder', parentName ?? 'No parent (root folder)'],
        ['Parent ID', item.parentId ?? 'None'],
        ['Location', location],
      ]
    : [];

  return (
    <Box
      component="section"
      aria-label="Item details"
      sx={{
        p: { xs: 2, sm: 3 },
        minWidth: 0,
        bgcolor: '#fafafe',
        borderColor: 'divider',
        borderLeft: { md: 1 },
        borderTop: { xs: 1, md: 0 },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2.5 }}>
        <InfoOutlined color="primary" fontSize="small" />
        <Typography component="h2" variant="h2">
          Details
        </Typography>
      </Stack>
      {item ? (
        <Box component="dl" sx={{ m: 0, display: 'grid', gap: 2 }}>
          {fields.map(([label, value]) => (
            <Box key={label}>
              <Typography
                component="dt"
                variant="caption"
                color="text.secondary"
                sx={{ mb: 0.5 }}
              >
                {label}
              </Typography>
              <Typography
                component="dd"
                variant="body2"
                sx={{
                  m: 0,
                  fontWeight: label === 'Name' ? 600 : 400,
                  overflowWrap: 'anywhere',
                }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Select a file or folder to view its details.
        </Typography>
      )}
    </Box>
  );
};
