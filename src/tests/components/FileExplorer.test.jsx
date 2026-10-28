import { act, render, screen } from '@testing-library/react';
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

  it('selects files and folders independently of expansion without changing SDK data', async () => {
    const user = userEvent.setup();
    const sdk = renderExplorer();
    const original = sdk.getStructure();
    await user.click(screen.getByRole('button', { name: 'Documents folder' }));
    expect(
      screen.getByRole('button', { name: 'Documents folder' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Expand Documents' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand Documents' }));
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
