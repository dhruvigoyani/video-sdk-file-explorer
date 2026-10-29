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
const checkbox = (name) =>
  screen.getByRole('checkbox', { name: `Include ${name} in bulk selection` });
const confirm = async (user) => {
  await user.click(
    screen.getByRole('button', { name: 'Delete selected', exact: true }),
  );
  await user.click(screen.getByRole('button', { name: 'Confirm bulk delete' }));
};

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('Multi-selection and atomic bulk deletion', () => {
  it('selects and clears nested descendants without expanding folders', async () => {
    const { sdk, user } = setup();
    act(() => {
      const folder = sdk.createFolder('documents', 'Nested');
      sdk.createFile(folder.id, 'Nested.txt');
    });
    await user.click(checkbox('Documents'));
    expect(
      screen.getByRole('button', { name: 'Expand Documents' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Documents folder' }));
    expect(checkbox('Resume.pdf')).toBeChecked();
    expect(checkbox('Project Plan.docx')).toBeChecked();
    expect(checkbox('Nested')).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Nested folder' }));
    expect(checkbox('Nested.txt')).toBeChecked();
    await user.click(checkbox('Documents'));
    for (const name of [
      'Documents',
      'Resume.pdf',
      'Project Plan.docx',
      'Nested',
      'Nested.txt',
    ]) {
      expect(checkbox(name)).not.toBeChecked();
    }
    expect(
      screen.getByRole('button', { name: 'Collapse Documents' }),
    ).toBeInTheDocument();
  });

  it('excludes deselected children from bulk deletion through their ancestors', async () => {
    const { sdk, user } = setup();
    await user.click(checkbox('Documents'));
    await user.click(screen.getByRole('button', { name: 'Documents folder' }));
    await user.click(checkbox('Resume.pdf'));
    expect(checkbox('Documents')).not.toBeChecked();
    expect(checkbox('Project Plan.docx')).toBeChecked();
    await confirm(user);
    expect(sdk.getItem('documents')).not.toBeNull();
    expect(sdk.getItem('resume')).not.toBeNull();
    expect(sdk.getItem('project-plan')).toBeNull();
  });

  it('allows independent selection and deselection without changing the focused item or SDK', async () => {
    const { sdk, user } = setup();
    const before = sdk.getStructure();
    expect(checkbox('My Files')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Delete selected', exact: true }),
    ).toBeDisabled();
    await user.click(checkbox('Documents'));
    await user.click(checkbox('Notes.txt'));
    expect(screen.getByText('4 selected for bulk actions')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No item selected');
    await user.click(checkbox('Notes.txt'));
    expect(screen.getByText('3 selected for bulk actions')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(checkbox('Documents')).not.toBeChecked();
    expect(sdk.getStructure()).toEqual(before);
    expect(sdk.canUndo()).toBe(false);
  });

  it('retains hidden selections through collapse, renames, and moves', async () => {
    const { sdk, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Expand Documents' }));
    await user.click(checkbox('Resume.pdf'));
    await user.click(
      screen.getByRole('button', { name: 'Collapse Documents' }),
    );
    expect(screen.getByText('1 selected for bulk actions')).toBeInTheDocument();
    act(() => {
      sdk.renameItem('resume', 'CV.pdf');
      sdk.moveItem('resume', 'images');
    });
    await user.click(screen.getByRole('button', { name: 'Expand Images' }));
    expect(checkbox('CV.pdf')).toBeChecked();
  });

  it('deletes multiple branches in one transaction and restores them with one undo', async () => {
    const { sdk, user } = setup();
    const before = sdk.getStructure();
    const transaction = vi.spyOn(sdk, 'transaction');
    await user.click(checkbox('Documents'));
    await user.click(checkbox('Notes.txt'));
    await confirm(user);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(sdk.getItem('documents')).toBeNull();
    expect(sdk.getItem('resume')).toBeNull();
    expect(sdk.getItem('notes')).toBeNull();
    expect(screen.getByText('0 selected for bulk actions')).toBeInTheDocument();
    const activity = within(
      screen.getByRole('region', { name: 'Recent activity' }),
    );
    expect(activity.getAllByRole('listitem')).toHaveLength(1);
    expect(activity.getByText('Committed transaction')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo', exact: true }));
    expect(sdk.getStructure()).toEqual(before);
    expect(checkbox('Documents')).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Redo', exact: true }));
    expect(sdk.getItem('notes')).toBeNull();
  });

  it('deletes selected ancestors only when both a folder and its descendants are checked', async () => {
    const { sdk, user } = setup();
    const transaction = vi.spyOn(sdk, 'transaction');
    await user.click(screen.getByRole('button', { name: 'Expand Documents' }));
    await user.click(checkbox('Resume.pdf'));
    await user.click(checkbox('Documents'));
    await confirm(user);

    expect(transaction).toHaveBeenCalledWith([
      { method: 'deleteItem', args: ['documents'] },
    ]);
    expect(sdk.getItem('resume')).toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('preserves selection and data after transaction failure and allows retry', async () => {
    const { sdk, user } = setup();
    const before = sdk.getStructure();
    const transaction = vi.spyOn(sdk, 'transaction').mockImplementation(() => {
      throw new Error('Bulk deletion failed');
    });
    await user.click(checkbox('Documents'));
    await user.click(checkbox('Notes.txt'));
    await confirm(user);

    expect(screen.getByRole('alert')).toHaveTextContent('Bulk deletion failed');
    expect(checkbox('Documents')).toBeChecked();
    expect(checkbox('Notes.txt')).toBeChecked();
    expect(screen.getByText('4 selected for bulk actions')).toBeInTheDocument();
    expect(sdk.getStructure()).toEqual(before);
    expect(sdk.canUndo()).toBe(false);
    transaction.mockRestore();
    await user.click(
      screen.getByRole('button', { name: 'Confirm bulk delete' }),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('0 selected for bulk actions')).toBeInTheDocument();
  });

  it('cancels confirmation without losing selection or modifying data', async () => {
    const { sdk, user } = setup();
    const before = sdk.getStructure();
    await user.click(checkbox('Notes.txt'));
    await user.click(
      screen.getByRole('button', { name: 'Delete selected', exact: true }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Cancel bulk delete' }),
    );
    expect(checkbox('Notes.txt')).toBeChecked();
    expect(sdk.getStructure()).toEqual(before);
  });

  it('prunes external deletions and closes confirmation when selection changes', async () => {
    const { sdk, user } = setup();
    await user.click(checkbox('Documents'));
    await user.click(checkbox('Notes.txt'));
    await user.click(
      screen.getByRole('button', { name: 'Delete selected', exact: true }),
    );
    await user.click(checkbox('Notes.txt'));
    expect(
      screen.queryByRole('button', { name: 'Confirm bulk delete' }),
    ).not.toBeInTheDocument();
    act(() => {
      sdk.deleteItem('documents');
    });
    expect(screen.getByText('0 selected for bulk actions')).toBeInTheDocument();
    act(() => {
      sdk.undo();
    });
    expect(checkbox('Documents')).not.toBeChecked();
  });
});

describe('Bulk move', () => {
  it('moves selected branches together and restores them with one undo', async () => {
    const { sdk, user } = setup();
    const before = sdk.getStructure();
    const transaction = vi.spyOn(sdk, 'transaction');
    await user.click(checkbox('Documents'));
    await user.click(checkbox('Notes.txt'));
    await user.click(screen.getByRole('button', { name: 'Move selected' }));
    const destination = screen.getByRole('combobox', {
      name: 'Bulk destination folder',
    });
    expect(
      within(destination).queryByRole('option', {
        name: 'My Files / Documents',
      }),
    ).not.toBeInTheDocument();
    await user.selectOptions(destination, 'images');
    await user.click(screen.getByRole('button', { name: 'Confirm bulk move' }));
    expect(transaction).toHaveBeenCalledWith([
      { method: 'moveItem', args: ['documents', 'images'] },
      { method: 'moveItem', args: ['notes', 'images'] },
    ]);
    expect(sdk.getItem('documents').parentId).toBe('images');
    expect(sdk.getItem('notes').parentId).toBe('images');
    expect(sdk.getItem('resume').parentId).toBe('documents');
    expect(screen.getByText('0 selected for bulk actions')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo', exact: true }));
    expect(sdk.getStructure()).toEqual(before);
    await user.click(screen.getByRole('button', { name: 'Redo', exact: true }));
    expect(sdk.getItem('documents').parentId).toBe('images');
  });

  it('rolls back all moves after a name conflict and retains selection for retry', async () => {
    const { sdk, user } = setup();
    act(() => sdk.createFile('images', 'Notes.txt'));
    const before = sdk.getStructure();
    await user.click(checkbox('Documents'));
    await user.click(checkbox('Notes.txt'));
    await user.click(screen.getByRole('button', { name: 'Move selected' }));
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Bulk destination folder' }),
      'images',
    );
    await user.click(screen.getByRole('button', { name: 'Confirm bulk move' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(sdk.getStructure()).toEqual(before);
    expect(checkbox('Documents')).toBeChecked();
    expect(checkbox('Notes.txt')).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Cancel bulk move' }));
    expect(
      screen.queryByRole('combobox', { name: 'Bulk destination folder' }),
    ).not.toBeInTheDocument();
    expect(sdk.getStructure()).toEqual(before);
  });

  it('excludes selected folders and nested folders from move destinations', async () => {
    const { sdk, user } = setup();
    act(() => sdk.createFolder('documents', 'Nested'));
    await user.click(checkbox('Documents'));
    await user.click(screen.getByRole('button', { name: 'Move selected' }));
    const destination = screen.getByRole('combobox', {
      name: 'Bulk destination folder',
    });
    expect(
      within(destination)
        .getAllByRole('option')
        .map((option) => option.value),
    ).toEqual(['', 'root', 'images']);
  });
});
