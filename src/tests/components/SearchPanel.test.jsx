import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App.jsx';
import { FileExplorerProvider } from '../../context/FileExplorerProvider.jsx';
import { FileExplorerSDK } from '../../sdk/FileExplorerSDK.js';

const setup = () => {
  const sdk = new FileExplorerSDK();
  render(
    <FileExplorerProvider sdk={sdk}>
      <App />
    </FileExplorerProvider>,
  );
  return { sdk, user: userEvent.setup() };
};
const results = () =>
  within(screen.getByRole('list', { name: 'Search results' }));
beforeEach(() => vi.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe('Search interface', () => {
  it('places controls between creation and bulk actions and starts with the tree', () => {
    setup();
    const search = screen.getByRole('region', { name: 'Search' });
    expect(
      screen
        .getByRole('button', { name: 'New file', exact: true })
        .compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      search.compareDocumentPosition(
        screen.getByText('0 selected for bulk actions'),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Files' })).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Search results' }),
    ).not.toBeInTheDocument();
  });

  it('searches as you type and restores the tree on clear or close', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Expand Documents' }));
    await user.type(screen.getByRole('searchbox'), '  LoGO  ');
    expect(results().getByText('Logo.svg')).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Files' }),
    ).not.toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    expect(
      screen.getByRole('button', { name: 'Resume.pdf file' }),
    ).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'resume');
    await user.click(screen.getByRole('button', { name: 'Close search' }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.getByRole('list', { name: 'Files' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Next page' }),
    ).not.toBeInTheDocument();
  });

  it('paginates matching results and resets after changing the query', async () => {
    const { sdk, user } = setup();
    act(() => {
      for (let i = 0; i < 12; i++) sdk.createFile('root', `Report-${i}.txt`);
    });
    await user.type(screen.getByRole('searchbox'), 'Report');
    expect(results().getAllByRole('button')).toHaveLength(5);
    expect(
      screen.getByRole('button', { name: 'Previous page' }),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Results per page'), '20');
    expect(results().getAllByRole('button')).toHaveLength(12);
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), '-missing');
    expect(screen.getByText(/No matching items/)).toBeInTheDocument();
    expect(screen.getByText('Page 0 of 0')).toBeInTheDocument();
  });

  it('filters and sorts the tree without changing SDK data', async () => {
    const { sdk, user } = setup();
    const original = sdk.getStructure();
    await user.selectOptions(screen.getByLabelText('Item type'), 'folder');
    expect(
      screen.queryByRole('button', { name: 'Notes.txt file' }),
    ).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Sort order'), 'desc');
    const tree = within(screen.getByRole('list', { name: 'Files' }));
    expect(
      tree
        .getAllByRole('button')
        .filter((button) =>
          button.getAttribute('aria-label')?.endsWith(' folder'),
        )
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['My Files folder', 'Images folder', 'Documents folder']);
    await user.selectOptions(screen.getByLabelText('Item type'), 'file');
    await user.click(screen.getByRole('button', { name: 'Expand Documents' }));
    expect(
      screen.getByRole('button', { name: 'Resume.pdf file' }),
    ).toBeInTheDocument();
    expect(sdk.getStructure()).toEqual(original);
  });

  it('selects a search result and reveals it after closing search', async () => {
    const { user } = setup();
    await user.type(screen.getByRole('searchbox'), 'resume');
    await user.click(
      screen.getByRole('button', { name: 'Select Resume.pdf from search' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Selected: Resume.pdf',
    );
    await user.click(screen.getByRole('button', { name: 'Close search' }));
    expect(
      screen.getByRole('button', { name: 'Resume.pdf file' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('refreshes search results after changes and undo', async () => {
    const { sdk, user } = setup();
    await user.type(screen.getByRole('searchbox'), 'resume');
    act(() => sdk.deleteItem('resume'));
    expect(screen.getByText(/No matching items/)).toBeInTheDocument();
    act(() => sdk.undo());
    expect(results().getByText('Resume.pdf')).toBeInTheDocument();
  });
});
