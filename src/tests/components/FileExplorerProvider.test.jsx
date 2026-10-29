import { StrictMode, useLayoutEffect } from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FileExplorerProvider } from '../../context/FileExplorerProvider.jsx';
import { useFileExplorer } from '../../hooks/useFileExplorer.js';
import { FileExplorerSDK } from '../../sdk/FileExplorerSDK.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function SnapshotView() {
  const { structure, canUndo, canRedo } = useFileExplorer();

  return (
    <>
      <pre data-testid="structure">{JSON.stringify(structure)}</pre>
      <p>Can undo: {String(canUndo)}</p>
      <p>Can redo: {String(canRedo)}</p>
    </>
  );
}

function readRenderedTree() {
  return JSON.parse(screen.getByTestId('structure').textContent);
}

describe('React SDK integration', () => {
  it('provides the supplied SDK and its initial snapshot', () => {
    const sdk = new FileExplorerSDK();
    const wrapper = ({ children }) => (
      <FileExplorerProvider sdk={sdk}>{children}</FileExplorerProvider>
    );

    const { result } = renderHook(() => useFileExplorer(), { wrapper });

    expect(result.current.sdk).toBe(sdk);
    expect(result.current.structure).toEqual(sdk.getStructure());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('updates consumers after create, rename, move, delete, undo, and redo', () => {
    const sdk = new FileExplorerSDK();
    render(
      <FileExplorerProvider sdk={sdk}>
        <SnapshotView />
      </FileExplorerProvider>,
    );
    let folder;
    let file;

    act(() => {
      folder = sdk.createFolder('root', 'Projects');
    });
    act(() => {
      file = sdk.createFile(folder.id, 'Plan.txt');
    });
    expect(readRenderedTree()).toEqual(sdk.getStructure());
    expect(screen.getByText('Can undo: true')).toBeInTheDocument();
    act(() => {
      sdk.renameItem(file.id, 'Final.txt');
    });
    expect(screen.getByTestId('structure')).toHaveTextContent('Final.txt');
    act(() => {
      sdk.moveItem(folder.id, 'documents');
    });
    expect(readRenderedTree().children[0].children[2].id).toBe(folder.id);
    act(() => {
      sdk.deleteItem('documents');
    });
    expect(screen.getByTestId('structure')).not.toHaveTextContent('Final.txt');
    act(() => {
      sdk.undo();
    });
    expect(screen.getByTestId('structure')).toHaveTextContent('Final.txt');
    expect(screen.getByText('Can redo: true')).toBeInTheDocument();
    act(() => {
      sdk.redo();
    });
    expect(readRenderedTree()).toEqual(sdk.getStructure());
    expect(screen.getByText('Can redo: false')).toBeInTheDocument();
  });

  it('observes changes made between rendering and the subscription effect', () => {
    const sdk = new FileExplorerSDK();
    function ChangeBeforeSubscription() {
      useLayoutEffect(() => {
        sdk.renameItem('notes', 'Changed.txt');
      }, []);
      return <SnapshotView />;
    }

    render(
      <FileExplorerProvider sdk={sdk}>
        <ChangeBeforeSubscription />
      </FileExplorerProvider>,
    );

    expect(screen.getByTestId('structure')).toHaveTextContent('Changed.txt');
    expect(screen.getByText('Can undo: true')).toBeInTheDocument();
  });

  it('keeps one subscription for multiple consumers and ordinary rerenders', () => {
    const sdk = new FileExplorerSDK();
    const subscribe = vi.spyOn(sdk, 'subscribe');
    function HistoryView() {
      const { canUndo } = useFileExplorer();
      return <span>{String(canUndo)}</span>;
    }
    const content = (
      <>
        <SnapshotView />
        <HistoryView />
      </>
    );
    const { rerender } = render(
      <FileExplorerProvider sdk={sdk}>{content}</FileExplorerProvider>,
    );
    rerender(<FileExplorerProvider sdk={sdk}>{content}</FileExplorerProvider>);
    act(() => {
      sdk.renameItem('notes', 'Todo.txt');
    });

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Can undo: true')).toBeInTheDocument();
  });

  it('removes the subscription on unmount', () => {
    const sdk = new FileExplorerSDK();
    const originalSubscribe = sdk.subscribe.bind(sdk);
    const cleanup = vi.fn();
    vi.spyOn(sdk, 'subscribe').mockImplementation((listener) => {
      const unsubscribe = originalSubscribe(listener);
      return () => {
        cleanup();
        unsubscribe();
      };
    });
    const read = vi.spyOn(sdk, 'getStructure');
    const { unmount } = render(
      <FileExplorerProvider sdk={sdk}>
        <SnapshotView />
      </FileExplorerProvider>,
    );
    unmount();
    read.mockClear();
    sdk.renameItem('notes', 'Todo.txt');

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(read).not.toHaveBeenCalled();
  });

  it('cleans up StrictMode subscriptions and leaves exactly one active callback', () => {
    const sdk = new FileExplorerSDK();
    const originalSubscribe = sdk.subscribe.bind(sdk);
    const active = new Set();
    vi.spyOn(sdk, 'subscribe').mockImplementation((listener) => {
      active.add(listener);
      const unsubscribe = originalSubscribe(listener);
      return () => {
        active.delete(listener);
        unsubscribe();
      };
    });
    const read = vi.spyOn(sdk, 'getStructure');
    const { unmount } = render(
      <FileExplorerProvider sdk={sdk}>
        <SnapshotView />
      </FileExplorerProvider>,
    );
    expect(active.size).toBe(1);
    read.mockClear();
    act(() => {
      sdk.renameItem('notes', 'Todo.txt');
    });
    expect(read).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('structure')).toHaveTextContent('Todo.txt');
    unmount();
    expect(active.size).toBe(0);
  });

  it('switches subscriptions when given a different SDK instance', () => {
    const first = new FileExplorerSDK();
    const second = new FileExplorerSDK();
    second.renameItem('root', 'Second root');
    const { rerender } = render(
      <FileExplorerProvider sdk={first}>
        <SnapshotView />
      </FileExplorerProvider>,
    );
    rerender(
      <FileExplorerProvider sdk={second}>
        <SnapshotView />
      </FileExplorerProvider>,
    );
    const readFirst = vi.spyOn(first, 'getStructure');
    act(() => {
      first.renameItem('notes', 'Old SDK.txt');
    });
    expect(readFirst).not.toHaveBeenCalled();
    expect(readRenderedTree().name).toBe('Second root');
    act(() => {
      second.renameItem('notes', 'New SDK.txt');
    });
    expect(screen.getByTestId('structure')).toHaveTextContent('New SDK.txt');
  });

  it('does not update consumers for failures or no-op operations', () => {
    const sdk = new FileExplorerSDK();
    const wrapper = ({ children }) => (
      <FileExplorerProvider sdk={sdk}>{children}</FileExplorerProvider>
    );
    const { result } = renderHook(() => useFileExplorer(), { wrapper });
    const before = result.current;

    act(() => {
      expect(() => sdk.renameItem('notes', 'Images')).toThrow('already exists');
      sdk.renameItem('notes', ' Notes.txt ');
      sdk.moveItem('resume', 'documents');
    });

    expect(result.current).toBe(before);
    expect(result.current.canUndo).toBe(false);
  });

  it('keeps consumer snapshots detached from SDK data', () => {
    const sdk = new FileExplorerSDK();
    const wrapper = ({ children }) => (
      <FileExplorerProvider sdk={sdk}>{children}</FileExplorerProvider>
    );
    const { result } = renderHook(() => useFileExplorer(), { wrapper });
    const original = sdk.getStructure();
    result.current.structure.children.length = 0;

    expect(sdk.getStructure()).toEqual(original);
    act(() => {
      sdk.renameItem('notes', 'Todo.txt');
    });
    expect(result.current.structure).toEqual(sdk.getStructure());
  });

  it('reports a useful error when the hook is used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useFileExplorer())).toThrow(
      'useFileExplorer must be used within FileExplorerProvider.',
    );
  });
});
