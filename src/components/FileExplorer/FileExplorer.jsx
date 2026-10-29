import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFileExplorer } from '../../hooks/useFileExplorer.js';
import { FileTree } from './FileTree.jsx';
import { FileActions } from './FileActions.jsx';
import { SearchPanel } from '../Search/SearchPanel.jsx';
import { DetailsPanel } from '../DetailsPanel/DetailsPanel.jsx';
import { ActivityPanel } from '../ActivityPanel/ActivityPanel.jsx';
import { HistoryControls } from '../common/HistoryControls.jsx';
import { BulkActions } from './BulkActions.jsx';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded';

export const FileExplorer = () => {
  const { sdk, structure } = useFileExplorer();
  const draggedIds = useRef([]);
  const dragPreview = useRef(null);
  const [dragError, setDragError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [bulkIds, setBulkIds] = useState(() => new Set());
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
    setBulkIds((previous) => {
      const remaining = new Set([...previous].filter((id) => items.has(id)));
      return remaining.size === previous.size ? previous : remaining;
    });
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

  const toggleBulkItem = useCallback(
    (id) => {
      setBulkIds((previous) => {
        const next = new Set(previous);
        const deselecting = previous.has(id);
        const pending = [items.get(id)];
        while (pending.length > 0) {
          const item = pending.pop();
          if (!item) continue;
          if (deselecting) next.delete(item.id);
          else next.add(item.id);
          if (item.type === 'folder') pending.push(...item.children);
        }
        // A selected ancestor would include this item in bulk deletion.
        if (deselecting) {
          let parent = items.get(items.get(id)?.parentId);
          while (parent) {
            next.delete(parent.id);
            parent = items.get(parent.parentId);
          }
        }
        return next;
      });
    },
    [items],
  );

  const selected = items.get(selectedId);
  const startDrag = (event, id) => {
    if (items.get(id)?.parentId == null) {
      event.preventDefault();
      return;
    }
    const selection = bulkIds.has(id) ? bulkIds : new Set([id]);
    draggedIds.current = [...selection].filter((itemId) => {
      let parent = items.get(items.get(itemId)?.parentId);
      while (parent) {
        if (selection.has(parent.id)) return false;
        parent = items.get(parent.parentId);
      }
      return true;
    });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', items.get(id).name);
    // Give the browser a single compact preview instead of capturing the row
    // and any overflowing tree content in its default drag image.
    if (dragPreview.current) {
      dragPreview.current.textContent =
        selection.size > 1
          ? `${items.get(id).name} (${selection.size} items)`
          : items.get(id).name;
      event.dataTransfer.setDragImage(dragPreview.current, 16, 16);
    }
    setDragError('');
  };
  const canDrop = (id) => {
    if (items.get(id)?.type !== 'folder' || !draggedIds.current.length)
      return false;
    let ancestor = items.get(id);
    while (ancestor) {
      if (draggedIds.current.includes(ancestor.id)) return false;
      ancestor = items.get(ancestor.parentId);
    }
    return true;
  };
  const dropItems = (event, id) => {
    event.preventDefault();
    if (!canDrop(id)) return;
    try {
      const operations = draggedIds.current
        .filter((itemId) => items.get(itemId)?.parentId !== id)
        .map((itemId) => ({ method: 'moveItem', args: [itemId, id] }));
      if (operations.length) {
        sdk.transaction(operations);
        setBulkIds(new Set());
        setExpandedIds((previous) => new Set([...previous, id]));
      }
      setDragError('');
    } catch (failure) {
      setDragError(
        failure instanceof Error ? failure.message : 'Could not move items.',
      );
    } finally {
      draggedIds.current = [];
    }
  };
  const selectedLocation = useMemo(() => {
    const names = [];
    let item = selected;
    while (item) {
      names.push(item.name);
      item = items.get(item.parentId);
    }
    return names.reverse().join(' / ');
  }, [selected, items]);

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
      <Box
        ref={dragPreview}
        aria-hidden="true"
        sx={{
          position: 'fixed',
          left: -10000,
          top: 0,
          pointerEvents: 'none',
          width: 'max-content',
          maxWidth: 280,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          px: 2,
          py: 1,
          bgcolor: '#eeebfc',
          color: 'primary.main',
          border: '1px solid',
          borderColor: 'primary.main',
          borderRadius: 1.5,
          boxShadow: 3,
          fontSize: 14,
          fontWeight: 600,
        }}
      />
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
      {dragError && (
        <Alert severity="error" onClose={() => setDragError('')}>
          {dragError}
        </Alert>
      )}
      <Divider />
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{
            justifyContent: 'space-between',
            alignItems: { md: 'flex-start' },
          }}
        >
          <FileActions
            key={selected?.id ?? 'no-selection'}
            selected={selected}
            onReveal={revealItem}
          />
          <HistoryControls />
        </Stack>
      </Box>
      <Divider />
      <SearchPanel selectedId={selected?.id ?? null} onSelect={revealItem}>
        {({ searchResults, searching, type, sortBy, sortOrder }) => (
          <>
            <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>
              <BulkActions
                key={[...bulkIds].sort().join('|')}
                selectedIds={bulkIds}
                items={items}
                onClear={() => setBulkIds(new Set())}
              />
            </Box>
            <Divider />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  md: 'minmax(0, 1fr) minmax(240px, 320px)',
                },
              }}
            >
              <Box
                sx={{
                  px: { xs: 1.5, sm: 3 },
                  pt: 1.5,
                  pb: 3,
                  minHeight: 300,
                  overflowX: 'auto',
                }}
              >
                {searching ? (
                  searchResults
                ) : (
                  <>
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
                        filterType={type}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        expandedIds={expandedIds}
                        selectedId={selected?.id ?? null}
                        bulkIds={bulkIds}
                        onBulkToggle={toggleBulkItem}
                        onToggle={toggleFolder}
                        onSelect={setSelectedId}
                        onDragStart={startDrag}
                        onDragEnd={() => {
                          draggedIds.current = [];
                        }}
                        canDrop={canDrop}
                        onDrop={dropItems}
                      />
                    </ul>
                  </>
                )}
              </Box>
              <DetailsPanel
                item={selected}
                location={selectedLocation}
                parentName={items.get(selected?.parentId)?.name}
              />
            </Box>
            <Divider />
          </>
        )}
      </SearchPanel>
      <ActivityPanel />
      <Divider />
    </Paper>
  );
};
