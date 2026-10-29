import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App.jsx';
import { FileExplorerProvider } from '../../context/FileExplorerProvider.jsx';
import { FileExplorerSDK } from '../../sdk/FileExplorerSDK.js';

function renderExplorer(sdk = new FileExplorerSDK()) {
  render(
    <FileExplorerProvider sdk={sdk}>
      <App />
    </FileExplorerProvider>,
  );
  return sdk;
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('File explorer tree', () => {
  it('renders the root expanded and nested folders collapsed', () => {
    renderExplorer();

    expect(
      screen.getByRole('heading', { name: 'VideoSDK File Explorer' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Collapse My Files' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: 'Expand Documents' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('button', { name: 'Notes.txt file' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Resume.pdf file' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No item selected');
  });

  it('expands recursively and preserves nested expansion when an ancestor is collapsed', async () => {
    const user = userEvent.setup();
    const sdk = new FileExplorerSDK();
    const folder = sdk.createFolder('documents', 'Projects');
    sdk.createFile(folder.id, 'Plan.txt');
    renderExplorer(sdk);

    await user.click(screen.getByRole('button', { name: 'Expand Documents' }));
    await user.click(screen.getByRole('button', { name: 'Expand Projects' }));
    expect(
      screen.getByRole('button', { name: 'Plan.txt file' }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Collapse Documents' }),
    );
    expect(
      screen.queryByRole('button', { name: 'Plan.txt file' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand Documents' }));
    expect(
      screen.getByRole('button', { name: 'Plan.txt file' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No item selected');
  });

  it('expands folders from their names and selects items without changing SDK data', async () => {
    const user = userEvent.setup();
    const sdk = renderExplorer();
    const original = sdk.getStructure();
    await user.click(screen.getByRole('button', { name: 'Documents folder' }));
    expect(
      screen.getByRole('button', { name: 'Documents folder' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Collapse Documents' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resume.pdf file' }));
    expect(
      screen.getByRole('button', { name: 'Documents folder' }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', { name: 'Resume.pdf file' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await user.click(
      screen.getByRole('button', { name: 'Collapse Documents' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Selected: Resume.pdf',
    );
    await user.click(screen.getByRole('button', { name: 'Expand Documents' }));
    expect(
      screen.getByRole('button', { name: 'Resume.pdf file' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(sdk.getStructure()).toEqual(original);
    expect(sdk.canUndo()).toBe(false);
  });

  it('supports expansion and selection through native keyboard buttons', async () => {
    const user = userEvent.setup();
    renderExplorer();
    const expand = screen.getByRole('button', { name: 'Expand Documents' });
    expand.focus();
    await user.keyboard('{Enter}');
    const resume = screen.getByRole('button', { name: 'Resume.pdf file' });
    resume.focus();
    await user.keyboard(' ');

    expect(resume).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Selected: Resume.pdf',
    );
  });

  it('preserves selection and expansion through renames and moves', async () => {
    const user = userEvent.setup();
    const sdk = renderExplorer();
    await user.click(screen.getByRole('button', { name: 'Expand Documents' }));
    await user.click(screen.getByRole('button', { name: 'Resume.pdf file' }));
    act(() => {
      sdk.renameItem('resume', 'CV.pdf');
    });
    expect(screen.getByRole('status')).toHaveTextContent('Selected: CV.pdf');
    act(() => {
      sdk.moveItem('documents', 'images');
    });
    expect(screen.getByRole('status')).toHaveTextContent('Selected: CV.pdf');
    await user.click(screen.getByRole('button', { name: 'Expand Images' }));
    expect(
      screen.getByRole('button', { name: 'Collapse Documents' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CV.pdf file' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('clears deleted descendant selection and prunes expansion when a folder is restored', async () => {
    const user = userEvent.setup();
    const sdk = renderExplorer();
    await user.click(screen.getByRole('button', { name: 'Expand Documents' }));
    await user.click(screen.getByRole('button', { name: 'Resume.pdf file' }));
    act(() => {
      sdk.deleteItem('documents');
    });
    expect(screen.getByRole('status')).toHaveTextContent('No item selected');
    expect(
      screen.queryByRole('button', { name: 'Collapse Documents' }),
    ).not.toBeInTheDocument();
    act(() => {
      sdk.undo();
    });
    expect(
      screen.getByRole('button', { name: 'Expand Documents' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No item selected');
    await user.click(screen.getByRole('button', { name: 'Expand Documents' }));
    expect(
      screen.getByRole('button', { name: 'Resume.pdf file' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('updates the visible tree after creation, undo, and redo', () => {
    const sdk = renderExplorer();
    let file;
    act(() => {
      file = sdk.createFile('root', 'New.txt');
    });
    expect(
      screen.getByRole('button', { name: 'New.txt file' }),
    ).toBeInTheDocument();
    act(() => {
      sdk.undo();
    });
    expect(
      screen.queryByRole('button', { name: 'New.txt file' }),
    ).not.toBeInTheDocument();
    act(() => {
      sdk.redo();
    });
    expect(
      screen.getByRole('button', { name: 'New.txt file' }),
    ).toBeInTheDocument();
    expect(sdk.getItem(file.id).name).toBe('New.txt');
  });

  it('allows expanding an empty folder and collapsing the root', async () => {
    const user = userEvent.setup();
    const sdk = new FileExplorerSDK();
    sdk.createFolder('root', 'Empty');
    renderExplorer(sdk);
    await user.click(screen.getByRole('button', { name: 'Expand Empty' }));
    expect(
      screen.getByRole('button', { name: 'Collapse Empty' }),
    ).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'Collapse My Files' }));
    expect(
      screen.queryByRole('button', { name: 'Notes.txt file' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand My Files' }));
    expect(
      screen.getByRole('button', { name: 'Collapse Empty' }),
    ).toBeInTheDocument();
  });
});

describe('Drag and drop moves', () => {
  const row = (name) => screen.getByRole('button', { name }).parentElement;
  const drag = (source, destination) => {
    const dataTransfer = {
      setData: vi.fn(),
      setDragImage: vi.fn(),
      effectAllowed: '',
      dropEffect: '',
    };
    fireEvent.dragStart(row(source), { dataTransfer });
    expect(dataTransfer.setDragImage).toHaveBeenCalledOnce();
    const preview = dataTransfer.setDragImage.mock.calls[0][0];
    expect(preview).toHaveAttribute('aria-hidden', 'true');
    expect(preview.children).toHaveLength(0);
    expect(preview.textContent).toContain(
      source.replace(/ (file|folder)$/, ''),
    );
    fireEvent.dragOver(row(destination), { dataTransfer });
    fireEvent.drop(row(destination), { dataTransfer });
    fireEvent.dragEnd(row(destination), { dataTransfer });
  };

  it('moves a single file into a collapsed folder and supports undo', () => {
    const sdk = renderExplorer();
    drag('Notes.txt file', 'Images folder');
    expect(sdk.getItem('notes').parentId).toBe('images');
    expect(
      screen.getByRole('button', { name: 'Collapse Images' }),
    ).toBeInTheDocument();
    act(() => sdk.undo());
    expect(sdk.getItem('notes').parentId).toBe('root');
  });

  it('moves checked branches together while preserving nested contents', async () => {
    const user = userEvent.setup();
    const sdk = renderExplorer();
    const transaction = vi.spyOn(sdk, 'transaction');
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Include Documents in bulk selection',
      }),
    );
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Include Notes.txt in bulk selection',
      }),
    );
    drag('Documents folder', 'Images folder');
    expect(transaction).toHaveBeenCalledWith([
      { method: 'moveItem', args: ['documents', 'images'] },
      { method: 'moveItem', args: ['notes', 'images'] },
    ]);
    expect(sdk.getItem('resume').parentId).toBe('documents');
    expect(screen.getByText('0 selected for bulk actions')).toBeInTheDocument();
  });

  it('rejects drops on files, itself, and descendants', async () => {
    const user = userEvent.setup();
    const sdk = renderExplorer();
    act(() => sdk.createFolder('documents', 'Nested'));
    await user.click(screen.getByRole('button', { name: 'Documents folder' }));
    const before = sdk.getStructure();
    drag('Documents folder', 'Nested folder');
    drag('Documents folder', 'Documents folder');
    drag('Documents folder', 'Notes.txt file');
    expect(sdk.getStructure()).toEqual(before);
    expect(row('My Files folder')).toHaveAttribute('draggable', 'false');
  });

  it('rolls back the whole selection on conflicts and displays the error', async () => {
    const user = userEvent.setup();
    const sdk = renderExplorer();
    act(() => sdk.createFile('images', 'Notes.txt'));
    const before = sdk.getStructure();
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Include Documents in bulk selection',
      }),
    );
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Include Notes.txt in bulk selection',
      }),
    );
    drag('Documents folder', 'Images folder');
    expect(sdk.getStructure()).toEqual(before);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('4 selected for bulk actions')).toBeInTheDocument();
  });
});
