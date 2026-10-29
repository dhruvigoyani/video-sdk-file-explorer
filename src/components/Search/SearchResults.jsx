import { Box, ButtonBase, Chip, Typography } from '@mui/material';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined';

export const SearchResults = ({ items, selectedId, onSelect }) => {
  if (items.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        No matching items. Try another name or filter.
      </Typography>
    );
  }

  return (
    <Box
      component="ul"
      aria-label="Search results"
      sx={{ listStyle: 'none', p: 0, m: 0 }}
    >
      {items.map((item) => (
        <Box component="li" key={item.id} sx={{ mb: 0.5 }}>
          <ButtonBase
            aria-label={`Select ${item.name} from search`}
            aria-pressed={selectedId === item.id}
            onClick={() => onSelect(item)}
            sx={{
              width: '100%',
              textAlign: 'left',
              justifyContent: 'flex-start',
              gap: 1.5,
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: selectedId === item.id ? '#eeebfc' : '#fafafe',
              '&:hover': { bgcolor: '#f0edf9' },
            }}
          >
            {item.type === 'folder' ? (
              <FolderOutlined color="primary" />
            ) : (
              <InsertDriveFileOutlined color="action" />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
              >
                {item.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', overflowWrap: 'anywhere' }}
              >
                {item.location}
              </Typography>
            </Box>
            <Chip label={item.type} size="small" sx={{ flexShrink: 0 }} />
          </ButtonBase>
        </Box>
      ))}
    </Box>
  );
};
