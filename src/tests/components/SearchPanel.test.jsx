import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App.jsx';
import { SearchPanel } from '../../components/Search/SearchPanel.jsx';
import { FileExplorerProvider } from '../../context/FileExplorerProvider.jsx';
import { FileExplorerSDK } from '../../sdk/FileExplorerSDK.js';

const setup = (sdk = new FileExplorerSDK()) => {
  render(
    <FileExplorerProvider sdk={sdk}>
      <App />
    </FileExplorerProvider>,
  );
  return { sdk, user: userEvent.setup() };
};
const results = () =>
  within(screen.getByRole('list', { name: 'Search results' }));

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('Search interface', () => {
  it('shows all items for an empty query with pagination and disabled boundaries', async () => {
    const { user } = setup();
    expect(screen.getByText('8 matching items')).toBeInTheDocument();
    expect(results().getAllByRole('button')).toHaveLength(5);
    expect(
      screen.getByRole('button', { name: 'Previous page' }),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(results().getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('matches nested names case-insensitively and shows type and location', async () => {
    const { user } = setup();
    await user.type(screen.getByRole('searchbox'), '  LoGO  ');
    expect(results().getAllByRole('button')).toHaveLength(1);
    expect(results().getByText('Logo.svg')).toBeInTheDocument();
    expect(results().getByText('file')).toBeInTheDocument();
    expect(
      results().getByText('My Files / Images / Logo.svg'),
    ).toBeInTheDocument();
  });

  it('filters and sorts through SDK search', async () => {
    const { sdk, user } = setup();
    const search = vi.spyOn(sdk, 'search');
    await user.selectOptions(screen.getByLabelText('Item type'), 'folder');
    expect(screen.getByText('3 matching items')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Sort order'), 'desc');
    expect(
      results()
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual([
      'Select My Files from search',
      'Select Images from search',
      'Select Documents from search',
    ]);
    await user.selectOptions(screen.getByLabelText('Sort by'), 'location');
    expect(search).toHaveBeenLastCalledWith('', {
      type: 'folder',
      sortBy: 'location',
      sortOrder: 'desc',
      page: 1,
      pageSize: 5,
    });
    await user.selectOptions(screen.getByLabelText('Item type'), 'file');
    expect(screen.getByText('5 matching items')).toBeInTheDocument();
  });

  it('resets pagination when query, filtering, sorting, or page size changes', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await user.selectOptions(screen.getByLabelText('Sort order'), 'desc');
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await user.type(screen.getByRole('searchbox'), 'doc');
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await user.selectOptions(screen.getByLabelText('Item type'), 'file');
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Item type'), 'all');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await user.selectOptions(screen.getByLabelText('Results per page'), '10');
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    expect(results().getAllByRole('button')).toHaveLength(8);
  });

  it('handles no matches and whitespace-only queries', async () => {
    const { user } = setup();
    await user.type(screen.getByRole('searchbox'), 'nonexistent');
    expect(screen.getByText(/No matching items/)).toBeInTheDocument();
    expect(screen.getByText('Page 0 of 0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Previous page' }),
    ).toBeDisabled();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), '   ');
    expect(screen.getByText('8 matching items')).toBeInTheDocument();
  });

  it('selects a hidden nested result and reveals it in the tree', async () => {
    const { user } = setup();
    await user.type(screen.getByRole('searchbox'), 'resume');
    await user.click(
      screen.getByRole('button', { name: 'Select Resume.pdf from search' }),
    );
    expect(
      screen.getByRole('button', { name: 'Resume.pdf file' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Select Resume.pdf from search' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Selected: Resume.pdf',
    );
    expect(
      screen.getByRole('button', { name: 'Rename', exact: true }),
    ).toBeEnabled();
  });

  it('refreshes results and locations after mutation, undo, and redo', async () => {
    const { sdk, user } = setup();
    await user.type(screen.getByRole('searchbox'), 'resume');
    act(() => {
      sdk.moveItem('resume', 'images');
    });
    expect(
      results().getByText('My Files / Images / Resume.pdf'),
    ).toBeInTheDocument();
    act(() => {
      sdk.renameItem('images', 'Pictures');
    });
    expect(
      results().getByText('My Files / Pictures / Resume.pdf'),
    ).toBeInTheDocument();
    act(() => {
      sdk.deleteItem('resume');
    });
    expect(screen.getByText(/No matching items/)).toBeInTheDocument();
    act(() => {
      sdk.undo();
    });
    expect(results().getByText('Resume.pdf')).toBeInTheDocument();
    act(() => {
      sdk.redo();
    });
    expect(screen.getByText(/No matching items/)).toBeInTheDocument();
    act(() => {
      sdk.createFile('root', 'Resume-new.pdf');
    });
    expect(results().getByText('Resume-new.pdf')).toBeInTheDocument();
  });

  it('returns to the first page after SDK changes shrink the result set', async () => {
    const { sdk, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    act(() => {
      sdk.deleteItem('documents');
    });
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    expect(results().getAllByRole('button')).toHaveLength(5);
  });

  it('keeps search input state local without changing SDK data or rendering the tree', async () => {
    const { sdk, user } = setup();
    const before = sdk.getStructure();
    console.log.mockClear();
    await user.type(screen.getByRole('searchbox'), 'logo');
    await user.selectOptions(screen.getByLabelText('Item type'), 'file');

    expect(console.log).not.toHaveBeenCalled();
    expect(sdk.getStructure()).toEqual(before);
    expect(sdk.canUndo()).toBe(false);
  });

  it('displays search errors and recovers after another query', async () => {
    const sdk = new FileExplorerSDK();
    const search = vi.spyOn(sdk, 'search').mockImplementation(() => {
      throw new Error('Search unavailable');
    });
    render(
      <FileExplorerProvider sdk={sdk}>
        <SearchPanel onSelect={vi.fn()} />
      </FileExplorerProvider>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Search unavailable');
    search.mockRestore();
    await userEvent.setup().type(screen.getByRole('searchbox'), 'logo');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(results().getByText('Logo.svg')).toBeInTheDocument();
  });
});
