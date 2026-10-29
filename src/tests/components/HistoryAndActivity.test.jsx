import { StrictMode } from 'react';
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
const activity = () =>
  within(screen.getByRole('region', { name: 'Recent activity' }));
const entries = () => activity().getAllByRole('listitem');

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('History controls and recent activity', () => {
  it('starts with disabled history controls and an empty activity panel', () => {
    setup();
    expect(
      screen.getByRole('button', { name: 'Undo', exact: true }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Redo', exact: true }),
    ).toBeDisabled();
    expect(activity().getByText(/No changes yet/)).toBeInTheDocument();
  });

  it('updates the tree, details, search, and button availability through undo and redo', async () => {
    const { sdk, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Notes.txt file' }));
    await user.type(screen.getByRole('searchbox'), 'Todo');
    act(() => {
      sdk.renameItem('notes', 'Todo.txt');
    });
    await user.click(screen.getByRole('button', { name: 'Undo', exact: true }));
    expect(sdk.getItem('notes').name).toBe('Notes.txt');
    expect(
      screen.getByRole('button', { name: 'Notes.txt file' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByRole('region', { name: 'Item details' })).getByText(
        'Notes.txt',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/No matching items/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Undo', exact: true }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Redo', exact: true }),
    ).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Redo', exact: true }));
    expect(
      screen.getByRole('button', { name: 'Todo.txt file' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Select Todo.txt from search' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Redo', exact: true }),
    ).toBeDisabled();
    expect(entries()[0]).toHaveTextContent('Redid last change');
    expect(entries()[1]).toHaveTextContent('Undid last change');
    expect(entries()[2]).toHaveTextContent('Renamed Todo.txt');
  });

  it('records every mutation once and preserves historical names, including deleted folders', () => {
    const { sdk } = setup();
    let folder;
    let file;
    act(() => {
      folder = sdk.createFolder('root', 'Projects');
      file = sdk.createFile(folder.id, 'Plan.txt');
      sdk.renameItem(file.id, 'Final.txt');
      sdk.moveItem(file.id, 'images');
      sdk.deleteItem(folder.id);
    });

    expect(entries()).toHaveLength(5);
    expect(entries()[0]).toHaveTextContent('Deleted Projects');
    expect(entries()[1]).toHaveTextContent('Moved Final.txt');
    expect(entries()[2]).toHaveTextContent('Renamed Final.txt');
    expect(entries()[3]).toHaveTextContent('Created file Plan.txt');
    expect(entries()[4]).toHaveTextContent('Created folder Projects');
  });

  it('restores a deleted subtree with one click and logs one event per history action', async () => {
    const { sdk, user } = setup();
    const before = sdk.getStructure();
    act(() => {
      sdk.deleteItem('documents');
    });
    expect(entries()).toHaveLength(1);
    expect(entries()[0]).toHaveTextContent('Deleted Documents');
    await user.click(screen.getByRole('button', { name: 'Undo', exact: true }));
    expect(sdk.getStructure()).toEqual(before);
    expect(
      screen.getByRole('button', { name: 'Documents folder' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Redo', exact: true }));
    expect(sdk.getItem('resume')).toBeNull();
    expect(entries()).toHaveLength(3);
  });

  it('keeps only the 20 most recent changes', () => {
    const { sdk } = setup();
    act(() => {
      for (let index = 1; index <= 23; index++)
        sdk.renameItem('notes', `Notes-${index}.txt`);
    });
    expect(entries()).toHaveLength(20);
    expect(entries()[0]).toHaveTextContent('Renamed Notes-23.txt');
    expect(entries()[19]).toHaveTextContent('Renamed Notes-4.txt');
    expect(
      activity().queryByText('Renamed Notes-3.txt'),
    ).not.toBeInTheDocument();
  });

  it('does not log reads, selection, expansion, failures, or no-ops', async () => {
    const { sdk, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Expand Documents' }));
    await user.click(screen.getByRole('button', { name: 'Resume.pdf file' }));
    await user.type(screen.getByRole('searchbox'), 'resume');
    act(() => {
      sdk.renameItem('notes', 'Notes.txt');
      sdk.moveItem('notes', 'root');
      expect(() => sdk.deleteItem('root')).toThrow();
      sdk.undo();
      sdk.redo();
    });
    expect(activity().getByText(/No changes yet/)).toBeInTheDocument();
  });

  it('disables redo after branching without removing the activity record', async () => {
    const { sdk, user } = setup();
    act(() => {
      sdk.renameItem('notes', 'Todo.txt');
    });
    await user.click(screen.getByRole('button', { name: 'Undo', exact: true }));
    act(() => {
      sdk.renameItem('notes', 'Other.txt');
    });
    expect(
      screen.getByRole('button', { name: 'Redo', exact: true }),
    ).toBeDisabled();
    expect(entries()).toHaveLength(3);
    expect(activity().getByText('Renamed Todo.txt')).toBeInTheDocument();
  });

  it('reports history errors and allows a later retry without recording a false change', async () => {
    const { sdk, user } = setup();
    act(() => {
      sdk.renameItem('notes', 'Todo.txt');
    });
    const undo = vi.spyOn(sdk, 'undo').mockImplementation(() => {
      throw new Error('Undo failed');
    });
    await user.click(screen.getByRole('button', { name: 'Undo', exact: true }));
    expect(screen.getByRole('alert')).toHaveTextContent('Undo failed');
    expect(entries()).toHaveLength(1);
    undo.mockRestore();
    await user.click(screen.getByRole('button', { name: 'Undo', exact: true }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(entries()).toHaveLength(2);
  });

  it('does not duplicate events under StrictMode and resets activity for a new SDK', () => {
    const first = new FileExplorerSDK();
    const second = new FileExplorerSDK();
    const view = (sdk) => (
      <StrictMode>
        <FileExplorerProvider sdk={sdk}>
          <App />
        </FileExplorerProvider>
      </StrictMode>
    );
    const { rerender } = render(view(first));
    act(() => {
      first.renameItem('notes', 'Todo.txt');
    });
    expect(entries()).toHaveLength(1);
    rerender(view(second));
    expect(activity().getByText(/No changes yet/)).toBeInTheDocument();
    act(() => {
      first.renameItem('notes', 'Ignored.txt');
    });
    expect(activity().getByText(/No changes yet/)).toBeInTheDocument();
    act(() => {
      second.renameItem('notes', 'New.txt');
    });
    expect(entries()).toHaveLength(1);
    expect(entries()[0]).toHaveTextContent('Renamed New.txt');
  });
});
