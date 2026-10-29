import { useEffect, useId, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useFileExplorer } from '../../hooks/useFileExplorer.js';
import { SearchResults } from './SearchResults.jsx';

export const SearchPanel = ({ selectedId, onSelect, children }) => {
  const { sdk, structure } = useFileExplorer();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const hasSearched = query.trim().length > 0;
  const id = useId();

  useEffect(() => {
    setPage(1);
  }, [sdk, structure]);

  const { result, error } = useMemo(() => {
    if (!hasSearched) return { result: null, error: '' };
    try {
      return {
        result: sdk.search(query, { type, sortBy, sortOrder, page, pageSize }),
        error: '',
      };
    } catch (failure) {
      return {
        result: null,
        error: failure instanceof Error ? failure.message : 'Search failed.',
      };
    }
  }, [
    sdk,
    structure,
    query,
    type,
    sortBy,
    sortOrder,
    page,
    pageSize,
    hasSearched,
  ]);

  const changeControl = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <>
      <Box
        component="section"
        aria-label="Search"
        sx={{ px: { xs: 2, sm: 3 }, py: 3 }}
      >
        <Typography component="h2" variant="h2" sx={{ mb: 0.5 }}>
          Search
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Find files and folders anywhere in your workspace.
        </Typography>
        <Stack
          component="form"
          spacing={2}
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
          }}
        >
          <TextField
            id={`${id}-query`}
            label="Search files and folders"
            type="search"
            value={query}
            onChange={changeControl(setQuery)}
            size="small"
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              id={`${id}-type`}
              label="Item type"
              select
              slotProps={{ select: { native: true } }}
              value={type}
              onChange={changeControl(setType)}
              size="small"
              fullWidth
            >
              <option value="all">All items</option>
              <option value="file">Files</option>
              <option value="folder">Folders</option>
            </TextField>
            <TextField
              id={`${id}-sort`}
              label="Sort by"
              select
              slotProps={{ select: { native: true } }}
              value={sortBy}
              onChange={changeControl(setSortBy)}
              size="small"
              fullWidth
            >
              <option value="name">Name</option>
              <option value="type">Type</option>
              <option value="location">Location</option>
            </TextField>
            <TextField
              id={`${id}-order`}
              label="Sort order"
              select
              slotProps={{ select: { native: true } }}
              value={sortOrder}
              onChange={changeControl(setSortOrder)}
              size="small"
              fullWidth
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </TextField>
            <TextField
              id={`${id}-size`}
              label="Results per page"
              select
              slotProps={{ select: { native: true } }}
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              size="small"
              fullWidth
            >
              {[5, 10, 20].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </TextField>
          </Stack>
          {hasSearched && (
            <Button
              onClick={() => {
                setQuery('');
                setPage(1);
              }}
              sx={{ alignSelf: 'flex-start' }}
            >
              Close search
            </Button>
          )}
        </Stack>
      </Box>
      {(() => {
        const searchResults =
          hasSearched &&
          (error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <>
              <Typography
                variant="body2"
                color="text.secondary"
                aria-live="polite"
              >
                {result.total} matching {result.total === 1 ? 'item' : 'items'}
              </Typography>
              <SearchResults
                items={result.items}
                selectedId={selectedId}
                onSelect={onSelect}
              />
              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  disabled={page <= 1}
                  onClick={() => setPage((previous) => previous - 1)}
                >
                  Previous page
                </Button>
                <Typography variant="body2">
                  Page {result.totalPages === 0 ? 0 : page} of{' '}
                  {result.totalPages}
                </Typography>
                <Button
                  disabled={page >= result.totalPages}
                  onClick={() => setPage((previous) => previous + 1)}
                >
                  Next page
                </Button>
              </Stack>
            </>
          ));
        return children
          ? children({
              searchResults,
              searching: hasSearched,
              type,
              sortBy,
              sortOrder,
            })
          : searchResults;
      })()}
    </>
  );
};
