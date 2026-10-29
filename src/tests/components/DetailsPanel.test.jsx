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
const panel = () =>
  within(screen.getByRole('region', { name: 'Item details' }));
const field = (label) =>
  panel().getByText(label, { selector: 'dt' }).nextElementSibling;

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('Selected item details', () => {
  it('shows an empty state before selection', () => {
    setup();
    expect(
      panel().getByRole('heading', { name: 'Details' }),
    ).toBeInTheDocument();
    expect(
      panel().getByText('Select a file or folder to view its details.'),
    ).toBeInTheDocument();
    expect(panel().queryByText('Parent ID')).not.toBeInTheDocument();
  });

  it('displays file metadata from a tree selection', async () => {
    const { sdk, user } = setup();
    const before = sdk.getStructure();
    await user.click(screen.getByRole('button', { name: 'Expand Documents' }));
    await user.click(screen.getByRole('button', { name: 'Resume.pdf file' }));

    expect(field('Name')).toHaveTextContent('Resume.pdf');
    expect(field('Type')).toHaveTextContent('file');
    expect(field('ID')).toHaveTextContent('resume');
    expect(field('Parent folder')).toHaveTextContent('Documents');
    expect(field('Parent ID')).toHaveTextContent('documents');
    expect(field('Location')).toHaveTextContent(
      'My Files / Documents / Resume.pdf',
    );
    expect(sdk.getStructure()).toEqual(before);
    expect(sdk.canUndo()).toBe(false);
  });

  it('displays folders and handles the root parent explicitly', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Documents folder' }));
    expect(field('Type')).toHaveTextContent('folder');
    expect(field('Parent folder')).toHaveTextContent('My Files');
    await user.click(screen.getByRole('button', { name: 'My Files folder' }));
    expect(field('Name')).toHaveTextContent('My Files');
    expect(field('ID')).toHaveTextContent('root');
    expect(field('Parent folder')).toHaveTextContent('No parent (root folder)');
    expect(field('Parent ID')).toHaveTextContent('None');
    expect(field('Location')).toHaveTextContent('My Files');
  });

  it('updates from a nested search result and remains visible when its ancestor collapses', async () => {
    const { user } = setup();
    await user.type(screen.getByRole('searchbox'), 'logo');
    await user.click(
      screen.getByRole('button', { name: 'Select Logo.svg from search' }),
    );
    expect(field('Name')).toHaveTextContent('Logo.svg');
    expect(field('Location')).toHaveTextContent('My Files / Images / Logo.svg');
    await user.click(screen.getByRole('button', { name: 'Close search' }));
    await user.click(screen.getByRole('button', { name: 'Collapse Images' }));
    expect(field('ID')).toHaveTextContent('logo');
    expect(
      screen.queryByRole('button', { name: 'Logo.svg file' }),
    ).not.toBeInTheDocument();
  });

  it('reflects renames, moves, ancestor changes, undo, and redo', async () => {
    const { sdk, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Notes.txt file' }));
    act(() => {
      sdk.renameItem('notes', 'Todo.txt');
    });
    expect(field('Name')).toHaveTextContent('Todo.txt');
    act(() => {
      sdk.moveItem('notes', 'images');
    });
    expect(field('Parent folder')).toHaveTextContent('Images');
    expect(field('Parent ID')).toHaveTextContent('images');
    act(() => {
      sdk.renameItem('images', 'Pictures');
    });
    act(() => {
      sdk.renameItem('root', 'Workspace');
    });
    expect(field('Location')).toHaveTextContent(
      'Workspace / Pictures / Todo.txt',
    );
    act(() => {
      sdk.undo();
    });
    expect(field('Location')).toHaveTextContent(
      'My Files / Pictures / Todo.txt',
    );
    act(() => {
      sdk.undo();
    });
    act(() => {
      sdk.undo();
    });
    expect(field('Parent folder')).toHaveTextContent('My Files');
    expect(field('Location')).toHaveTextContent('My Files / Todo.txt');
    act(() => {
      sdk.redo();
    });
    expect(field('Location')).toHaveTextContent('My Files / Images / Todo.txt');
    expect(field('ID')).toHaveTextContent('notes');
  });

  it.each(['resume', 'documents'])(
    'clears details when %s is deleted and does not restore selection on undo',
    async (deletedId) => {
      const { sdk, user } = setup();
      await user.click(
        screen.getByRole('button', { name: 'Expand Documents' }),
      );
      await user.click(screen.getByRole('button', { name: 'Resume.pdf file' }));
      act(() => {
        sdk.deleteItem(deletedId);
      });
      expect(
        panel().getByText('Select a file or folder to view its details.'),
      ).toBeInTheDocument();
      expect(panel().queryByText('Resume.pdf')).not.toBeInTheDocument();
      act(() => {
        sdk.undo();
      });
      expect(
        panel().getByText('Select a file or folder to view its details.'),
      ).toBeInTheDocument();
    },
  );
});
