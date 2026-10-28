// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { FileExplorerSDK } from '../../sdk/FileExplorerSDK.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FileExplorerSDK subscriptions', () => {
  it('registers without immediately notifying and returns an unsubscribe function', () => {
    const sdk = new FileExplorerSDK();
    const listener = vi.fn();

    const unsubscribe = sdk.subscribe(listener);

    expect(typeof unsubscribe).toBe('function');
    expect(listener).not.toHaveBeenCalled();
    expect(sdk.canUndo()).toBe(false);
  });

  it('emits one descriptive event for each successful mutation', () => {
    const sdk = new FileExplorerSDK();
    const listener = vi.fn();
    sdk.subscribe(listener);

    const folder = sdk.createFolder('root', 'Projects');
    const file = sdk.createFile(folder.id, 'Plan.txt');
    sdk.renameItem(file.id, 'Final.txt');
    sdk.moveItem(file.id, 'images');
    sdk.deleteItem(file.id);

    expect(listener.mock.calls).toEqual([
      [{ type: 'createFolder', itemId: folder.id }],
      [{ type: 'createFile', itemId: file.id }],
      [{ type: 'renameItem', itemId: file.id }],
      [{ type: 'moveItem', itemId: file.id }],
      [{ type: 'deleteItem', itemId: file.id }],
    ]);
  });

  it('notifies only after data and history have been updated', () => {
    const sdk = new FileExplorerSDK();
    const observed = [];
    sdk.subscribe((event) => {
      observed.push({
        event,
        item: sdk.getItem('notes'),
        canUndo: sdk.canUndo(),
        canRedo: sdk.canRedo(),
      });
    });

    sdk.renameItem('notes', 'Todo.txt');
    sdk.undo();
    sdk.redo();

    expect(observed).toMatchObject([
      {
        event: { type: 'renameItem', itemId: 'notes' },
        item: { name: 'Todo.txt' },
        canUndo: true,
        canRedo: false,
      },
      {
        event: { type: 'undo', itemId: null },
        item: { name: 'Notes.txt' },
        canUndo: false,
        canRedo: true,
      },
      {
        event: { type: 'redo', itemId: null },
        item: { name: 'Todo.txt' },
        canUndo: true,
        canRedo: false,
      },
    ]);
  });

  it('notifies once after deleting or restoring an entire nested folder', () => {
    const sdk = new FileExplorerSDK();
    const folder = sdk.createFolder('documents', 'Projects');
    const file = sdk.createFile(folder.id, 'Plan.txt');
    const before = sdk.getStructure();
    const observed = [];
    sdk.subscribe((event) => {
      observed.push({
        event,
        tree: sdk.getStructure(),
        item: sdk.getItem(file.id),
      });
    });

    sdk.deleteItem('documents');
    const deleted = sdk.getStructure();
    sdk.undo();
    sdk.redo();

    expect(observed).toEqual([
      {
        event: { type: 'deleteItem', itemId: 'documents' },
        tree: deleted,
        item: null,
      },
      { event: { type: 'undo', itemId: null }, tree: before, item: file },
      { event: { type: 'redo', itemId: null }, tree: deleted, item: null },
    ]);
  });

  it('removes a listener and allows repeated cleanup without affecting other listeners', () => {
    const sdk = new FileExplorerSDK();
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribe = sdk.subscribe(first);
    const unsubscribeSecond = sdk.subscribe(second);
    sdk.renameItem('notes', 'Todo.txt');
    unsubscribe();
    unsubscribe();
    sdk.undo();
    sdk.redo();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(3);
    unsubscribeSecond();
    sdk.deleteItem('notes');
    expect(second).toHaveBeenCalledTimes(3);
  });

  it('deduplicates callbacks by function identity', () => {
    const sdk = new FileExplorerSDK();
    const listener = vi.fn();
    const unsubscribe = sdk.subscribe(listener);
    const unsubscribeDuplicate = sdk.subscribe(listener);
    sdk.renameItem('notes', 'Todo.txt');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribeDuplicate();
    unsubscribe();
    sdk.undo();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('can subscribe again after cleanup', () => {
    const sdk = new FileExplorerSDK();
    const listener = vi.fn();
    sdk.subscribe(listener)();
    const unsubscribe = sdk.subscribe(listener);
    sdk.renameItem('notes', 'Todo.txt');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    sdk.undo();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('uses the listeners registered at the start of each notification', () => {
    const sdk = new FileExplorerSDK();
    const added = vi.fn();
    const removed = vi.fn();
    let unsubscribeRemoved;
    sdk.subscribe(() => {
      unsubscribeRemoved();
      sdk.subscribe(added);
    });
    unsubscribeRemoved = sdk.subscribe(removed);

    sdk.renameItem('notes', 'Todo.txt');
    expect(removed).toHaveBeenCalledTimes(1);
    expect(added).not.toHaveBeenCalled();
    sdk.undo();
    expect(removed).toHaveBeenCalledTimes(1);
    expect(added).toHaveBeenCalledTimes(1);
  });

  it('does not emit for reads, failures, no-ops, or empty history', () => {
    const sdk = new FileExplorerSDK();
    const listener = vi.fn();
    sdk.subscribe(listener);

    sdk.getStructure();
    sdk.getItem('notes');
    sdk.search('doc');
    sdk.canUndo();
    sdk.canRedo();
    sdk.undo();
    sdk.redo();
    sdk.renameItem('notes', ' Notes.txt ');
    sdk.moveItem('resume', 'documents');
    expect(() => sdk.createFile('root', 'NOTES.TXT')).toThrow();
    expect(() => sdk.createFolder('notes', 'Child')).toThrow();
    expect(() => sdk.renameItem('notes', 'Images')).toThrow();
    expect(() => sdk.moveItem('documents', 'documents')).toThrow();
    expect(() => sdk.deleteItem('root')).toThrow();
    expect(() => sdk.search('', { page: 0 })).toThrow();

    expect(listener).not.toHaveBeenCalled();
    expect(sdk.canUndo()).toBe(false);
  });

  it('emits for case-only renaming', () => {
    const sdk = new FileExplorerSDK();
    const listener = vi.fn();
    sdk.subscribe(listener);
    sdk.renameItem('notes', 'NOTES.TXT');

    expect(listener).toHaveBeenCalledExactlyOnceWith({
      type: 'renameItem',
      itemId: 'notes',
    });
  });

  it('isolates listener errors without failing operations or skipping later listeners', () => {
    const sdk = new FileExplorerSDK();
    const error = new Error('Listener failed');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const healthy = vi.fn();
    sdk.subscribe(() => {
      throw error;
    });
    sdk.subscribe(healthy);

    expect(() => sdk.renameItem('notes', 'Todo.txt')).not.toThrow();
    expect(sdk.getItem('notes').name).toBe('Todo.txt');
    expect(sdk.undo()).toBe(true);
    expect(sdk.getItem('notes').name).toBe('Notes.txt');
    expect(sdk.redo()).toBe(true);
    expect(sdk.getItem('notes').name).toBe('Todo.txt');
    expect(healthy).toHaveBeenCalledTimes(3);
    expect(log).toHaveBeenCalledTimes(3);
    expect(log).toHaveBeenCalledWith(
      'FileExplorerSDK change listener failed:',
      error,
    );
  });

  it('gives each listener its own event and exposes no mutable SDK state', () => {
    const sdk = new FileExplorerSDK();
    const healthy = vi.fn();
    sdk.subscribe((event) => {
      event.type = 'changed';
      event.itemId = 'changed';
      sdk.getItem('notes').name = 'Changed';
      sdk.getStructure().children.length = 0;
    });
    sdk.subscribe(healthy);
    sdk.renameItem('notes', 'Todo.txt');

    expect(healthy).toHaveBeenCalledExactlyOnceWith({
      type: 'renameItem',
      itemId: 'notes',
    });
    expect(sdk.getItem('notes').name).toBe('Todo.txt');
    expect(sdk.getStructure().children).toHaveLength(3);
    sdk.undo();
    expect(sdk.getItem('notes').name).toBe('Notes.txt');
  });

  it.each([undefined, null, 1, 'listener', {}, []])(
    'rejects invalid listeners: %j',
    (listener) => {
      const sdk = new FileExplorerSDK();
      const before = sdk.getStructure();

      expect(() => sdk.subscribe(listener)).toThrow(TypeError);
      expect(() => sdk.subscribe(listener)).toThrow(
        'Change listener must be a function.',
      );
      expect(sdk.getStructure()).toEqual(before);
      expect(sdk.canUndo()).toBe(false);
    },
  );

  it('keeps subscriptions local to each SDK instance', () => {
    const first = new FileExplorerSDK();
    const second = new FileExplorerSDK();
    const listener = vi.fn();
    first.subscribe(listener);

    second.renameItem('notes', 'Todo.txt');
    expect(listener).not.toHaveBeenCalled();
    first.renameItem('notes', 'Other.txt');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
