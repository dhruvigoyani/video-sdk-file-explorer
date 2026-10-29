import { memo } from 'react';
import {
  Box,
  ButtonBase,
  Checkbox,
  Chip,
  IconButton,
  Typography,
} from '@mui/material';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import FolderRounded from '@mui/icons-material/FolderRounded';
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded';
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined';

export const FileTreeRow = memo(
  ({
    id,
    name,
    type,
    expanded,
    selected,
    checked,
    bulkDisabled,
    onBulkToggle,
    onToggle,
    onSelect,
  }) => {
    const ItemIcon =
      type === 'folder'
        ? expanded
          ? FolderOpenRounded
          : FolderRounded
        : InsertDriveFileOutlined;

    return (
      <Box
        onClick={() => type === 'folder' && onToggle(id)}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, my: 0.25 }}
      >
        <Checkbox
          size="small"
          checked={checked}
          disabled={bulkDisabled}
          onClick={(event) => event.stopPropagation()}
          onChange={() => onBulkToggle(id)}
          slotProps={{
            input: { 'aria-label': `Include ${name} in bulk selection` },
          }}
          sx={{ p: 0.5 }}
        />
        {type === 'folder' ? (
          <IconButton
            size="small"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${name}`}
            aria-expanded={expanded}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(id);
            }}
            sx={{ width: 28, height: 28, flexShrink: 0 }}
          >
            {expanded ? (
              <ExpandMoreRounded fontSize="small" />
            ) : (
              <ChevronRightRounded fontSize="small" />
            )}
          </IconButton>
        ) : (
          <Box aria-hidden="true" sx={{ width: 28, flexShrink: 0 }} />
        )}
        <ButtonBase
          aria-label={`${name} ${type}`}
          aria-pressed={selected}
          aria-expanded={type === 'folder' ? expanded : undefined}
          onClick={() => onSelect(id)}
          sx={{
            flex: 1,
            minWidth: 0,
            justifyContent: 'flex-start',
            gap: 1.5,
            p: 1,
            borderRadius: 1.5,
            bgcolor: selected ? '#eeebfc' : 'transparent',
            color: selected ? 'primary.main' : 'text.primary',
            '&:hover': { bgcolor: selected ? '#e7e1fa' : '#f6f7fb' },
          }}
        >
          <ItemIcon
            sx={{
              fontSize: 23,
              flexShrink: 0,
              color: type === 'folder' ? '#b87e21' : '#777f9e',
            }}
          />
          <Typography
            component="span"
            variant="body2"
            sx={{
              textAlign: 'left',
              fontWeight: selected ? 600 : 500,
              overflowWrap: 'anywhere',
              minWidth: 0,
            }}
          >
            {name}
          </Typography>
          <Chip
            label={type}
            size="small"
            sx={{
              ml: 'auto',
              height: 22,
              fontSize: '0.65rem',
              bgcolor: selected ? '#e2dcf8' : '#f0f2f7',
              color: 'text.secondary',
              flexShrink: 0,
            }}
          />
        </ButtonBase>
      </Box>
    );
  },
);

FileTreeRow.displayName = 'FileTreeRow';
