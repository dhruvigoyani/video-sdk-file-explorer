import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFileExplorer } from '../../hooks/useFileExplorer.js';
import { FileTree } from './FileTree.jsx';
import { FileActions } from './FileActions.jsx';
import { SearchPanel } from '../Search/SearchPanel.jsx';
import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded';

export const FileExplorer = () => {
  const { structure } = useFileExplorer();
  const [selectedId, setSelectedId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set([structure.id]));

  const items = useMemo(() => {
    const index = new Map();
    const pending = [structure];
    while (pending.length > 0) {
      const item = pending.pop();
      index.set(item.id, item);
      if (item.type === 'folder') {
        pending.push(...item.children);
      }
    }
    return index;
  }, [structure]);

  useEffect(() => {
    setSelectedId((previous) => (items.has(previous) ? previous : null));
    setExpandedIds((previous) => {
      const remaining = new Set(
        [...previous].filter((id) => items.get(id)?.type === 'folder'),
      );
      return remaining.size === previous.size ? previous : remaining;
    });
  }, [items]);

  const toggleFolder = useCallback((id) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selected = items.get(selectedId);

  const revealItem = (item) => {
    setSelectedId(item.id);
    setExpandedIds((previous) => {
      const next = new Set(previous);
      let parent = items.get(item.parentId);
      while (parent) {
        next.add(parent.id);
        parent = items.get(parent.parentId);
      }
      return next;
    });
  };

  return (
    <Paper
      component="section"
      aria-label="File explorer"
      variant="outlined"
      sx={{
        overflow: 'hidden',
        borderColor: 'divider',
        borderRadius: 3,
        boxShadow: '0 8px 36px #25283d05',
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', px: { xs: 2, sm: 3 }, py: 2.5 }}
      >
        <FolderOpenRounded color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography component="h2" variant="h2">
            Files
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Everything in one place
          </Typography>
        </Box>
        <Chip
          label={`${items.size} items`}
          size="small"
          sx={{ bgcolor: '#f1effa', color: 'primary.main', fontWeight: 600 }}
        />
      </Stack>
      <Divider />
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <FileActions
          key={selected?.id ?? 'no-selection'}
          selected={selected}
          onReveal={revealItem}
        />
      </Box>
      <Divider />
      <Box
        sx={{
          px: { xs: 1.5, sm: 3 },
          pt: 1.5,
          pb: 3,
          minHeight: 300,
          overflowX: 'auto',
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{
            display: 'block',
            px: 1,
            mb: 1,
            fontSize: '0.65rem',
            letterSpacing: 1.5,
          }}
        >
          Name
        </Typography>
        <ul className="file-tree" aria-label="Files">
          <FileTree
            node={structure}
            expandedIds={expandedIds}
            selectedId={selected?.id ?? null}
            onToggle={toggleFolder}
            onSelect={setSelectedId}
          />
        </ul>
      </Box>
      <Divider />
      <SearchPanel selectedId={selected?.id ?? null} onSelect={revealItem} />
      <Divider />
      <Typography
        role="status"
        variant="body2"
        sx={{
          bgcolor: '#fafafe',
          px: 3,
          py: 1.5,
          color: selected ? 'primary.main' : 'text.secondary',
          overflowWrap: 'anywhere',
        }}
      >
        {selected ? `Selected: ${selected.name}` : 'No item selected'}
      </Typography>
    </Paper>
  );
};
