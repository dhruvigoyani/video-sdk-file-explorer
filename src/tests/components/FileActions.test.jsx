import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App.jsx';
import { FileExplorerProvider } from '../../context/FileExplorerProvider.jsx';
import { FileExplorerSDK } from '../../sdk/FileExplorerSDK.js';

function setup(sdk = new FileExplorerSDK()) {
  render(
    <FileExplorerProvider sdk={sdk}>
      <App />
    </FileExplorerProvider>,
  );
  return { sdk, user: userEvent.setup() };
}

beforeEach(() => vi.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe('File action controls', () => {
  it('offers create and rename actions without duplicate move or delete controls', async () => {
    const { user } = setup();
    expect(
      screen.getByRole('button', { name: 'Rename', exact: true }),
    ).toBeDisabled();
    for (const name of ['Move', 'Delete']) {
      expect(
        screen.queryByRole('button', { name, exact: true }),
      ).not.toBeInTheDocument();
    }
    await user.click(screen.getByRole('button', { name: 'My Files folder' }));
    expect(
      screen.getByRole('button', { name: 'Rename', exact: true }),
    ).toBeEnabled();
  });

  it('creates a file in the root without a selection and selects the result', async () => {
    const { sdk, user } = setup();
    await user.click(screen.getByRole('button', { name: 'New file' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New.txt');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      screen.getByRole('button', { name: 'New.txt file' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(sdk.search('New.txt').items[0].parentId).toBe('root');
    expect(sdk.canUndo()).toBe(true);
  });

  it('creates a folder inside the selected folder and reveals it', async () => {
    const { sdk, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Documents folder' }));
    await user.click(screen.getByRole('button', { name: 'New folder' }));
    await user.type(screen.getByLabelText('Name'), 'Projects');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      screen.getByRole('button', { name: 'Projects folder' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Expand Projects' }),
    ).toBeInTheDocument();
    expect(sdk.search('Projects').items[0].parentId).toBe('documents');
  });

  it('uses the selected file’s parent when creating another file', async () => {
    const { sdk, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Expand Documents' }));
    await user.click(screen.getByRole('button', { name: 'Resume.pdf file' }));
    await user.click(screen.getByRole('button', { name: 'New file' }));
    await user.type(screen.getByLabelText('Name'), 'New.txt');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(sdk.search('New.txt').items[0].parentId).toBe('documents');
  });

  it('renames the selected item while preserving its ID', async () => {
    const { sdk, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Notes.txt file' }));
    await user.click(
      screen.getByRole('button', { name: 'Rename', exact: true }),
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Notes.txt');
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Todo.txt');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(sdk.getItem('notes').name).toBe('Todo.txt');
    expect(
      screen.getByRole('button', { name: 'Todo.txt file' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it.each(['New file', 'New folder', 'Rename'])(
    'cancels %s without changing SDK state',
    async (action) => {
      const { sdk, user } = setup();
      await user.click(screen.getByRole('button', { name: 'Notes.txt file' }));
      const before = sdk.getStructure();
      await user.click(
        screen.getByRole('button', { name: action, exact: true }),
      );
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(sdk.getStructure()).toEqual(before);
      expect(sdk.canUndo()).toBe(false);
      expect(
        screen.queryByRole('button', { name: 'Cancel' }),
      ).not.toBeInTheDocument();
    },
  );

  it('shows duplicate-name errors, preserves input and selection, and allows correction', async () => {
    const { sdk, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Notes.txt file' }));
    await user.click(
      screen.getByRole('button', { name: 'Rename', exact: true }),
    );
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'IMAGES');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alert')).toHaveTextContent('already exists');
    expect(screen.getByLabelText('Name')).toHaveValue('IMAGES');
    expect(
      screen.getByRole('button', { name: 'Notes.txt file' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(sdk.canUndo()).toBe(false);
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Todo.txt');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(sdk.getItem('notes').name).toBe('Todo.txt');
  });

  it('shows SDK errors for blank names without changing data', async () => {
    const { sdk, user } = setup();
    const before = sdk.getStructure();
    await user.click(screen.getByRole('button', { name: 'New file' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('non-empty string');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(sdk.getStructure()).toEqual(before);
    expect(sdk.canUndo()).toBe(false);
  });

  it('closes stale forms when selection changes or the target is deleted externally', async () => {
    const { sdk, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Notes.txt file' }));
    await user.click(
      screen.getByRole('button', { name: 'Rename', exact: true }),
    );
    await user.click(screen.getByRole('button', { name: 'Documents folder' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Rename', exact: true }),
    );
    act(() => {
      sdk.deleteItem('documents');
    });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No item selected');
  });
});
