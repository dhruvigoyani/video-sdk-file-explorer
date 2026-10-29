// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { FileExplorerSDK } from '../../sdk/FileExplorerSDK.js';

describe('SDK atomic transactions', () => {
  it('applies operations sequentially and returns their detached results', () => {
    const sdk = new FileExplorerSDK();
    const results = sdk.transaction([
      { method: 'renameItem', args: ['notes', 'Todo.txt'] },
      { method: 'moveItem', args: ['notes', 'documents'] },
      { method: 'createFolder', args: ['root', 'Projects'] },
      { method: 'createFile', args: ['images', 'Draft.txt'] },
      { method: 'deleteItem', args: ['photo'] },
    ]);

    expect(results).toHaveLength(5);
    expect(results[0]).toMatchObject({
      id: 'notes',
      name: 'Todo.txt',
      parentId: 'root',
    });
    expect(results[1]).toMatchObject({
      id: 'notes',
      name: 'Todo.txt',
      parentId: 'documents',
    });
    expect(sdk.getItem('notes')).toEqual(results[1]);
    expect(results[2].type).toBe('folder');
    expect(results[3].type).toBe('file');
    expect(results[2].id).not.toBe(results[3].id);
    expect(sdk.getItem('photo')).toBeNull();
    results[1].name = 'Changed';
    results[2].name = 'Changed';
    expect(sdk.getItem('notes').name).toBe('Todo.txt');
    expect(sdk.getItem(results[2].id).name).toBe('Projects');
  });

  it('notifies once only after all data and history are committed', () => {
    const sdk = new FileExplorerSDK();
    const observed = [];
    sdk.subscribe((event) =>
      observed.push({
        event,
        notes: sdk.getItem('notes'),
        photo: sdk.getItem('photo'),
        canUndo: sdk.canUndo(),
        canRedo: sdk.canRedo(),
      }),
    );
    sdk.transaction([
      { method: 'renameItem', args: ['notes', 'Todo.txt'] },
      { method: 'deleteItem', args: ['photo'] },
    ]);

    expect(observed).toEqual([
      {
        event: { type: 'transaction', itemId: null },
        notes: {
          id: 'notes',
          name: 'Todo.txt',
          type: 'file',
          parentId: 'root',
        },
        photo: null,
        canUndo: true,
        canRedo: false,
      },
    ]);
  });

  it('undoes and redoes the entire transaction, including nested deletion, in one step', () => {
    const sdk = new FileExplorerSDK();
    const before = sdk.getStructure();
    sdk.transaction([
      { method: 'deleteItem', args: ['documents'] },
      { method: 'moveItem', args: ['notes', 'images'] },
      { method: 'createFile', args: ['root', 'New.txt'] },
    ]);
    const after = sdk.getStructure();

    expect(sdk.undo()).toBe(true);
    expect(sdk.getStructure()).toEqual(before);
    expect(sdk.canUndo()).toBe(false);
    expect(sdk.redo()).toBe(true);
    expect(sdk.getStructure()).toEqual(after);
    expect(sdk.canRedo()).toBe(false);
    expect(sdk.search('New.txt').total).toBe(1);
  });

  it.each([
    { method: 'createFile', args: ['root', 'DOCUMENTS'] },
    { method: 'renameItem', args: ['notes', 'Documents'] },
    { method: 'moveItem', args: ['documents', 'documents'] },
    { method: 'moveItem', args: ['notes', 'photo'] },
    { method: 'deleteItem', args: ['root'] },
    { method: 'deleteItem', args: ['missing'] },
    { method: 'createFolder', args: ['root', ''] },
    { method: 'undo', args: [] },
    null,
  ])('rolls back earlier changes on failure: %j', (failure) => {
    const sdk = new FileExplorerSDK();
    const before = sdk.getStructure();
    const listener = vi.fn();
    sdk.subscribe(listener);

    expect(() =>
      sdk.transaction([
        { method: 'createFolder', args: ['root', 'Projects'] },
        { method: 'renameItem', args: ['resume', 'CV.pdf'] },
        { method: 'deleteItem', args: ['images'] },
        failure,
      ]),
    ).toThrow();
    expect(sdk.getStructure()).toEqual(before);
    expect(sdk.canUndo()).toBe(false);
    expect(sdk.canRedo()).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('validates later operations against earlier staged changes', () => {
    const sdk = new FileExplorerSDK();
    const before = sdk.getStructure();

    expect(() =>
      sdk.transaction([
        { method: 'createFile', args: ['root', 'New.txt'] },
        { method: 'createFolder', args: ['root', 'NEW.TXT'] },
      ]),
    ).toThrow('already exists');
    expect(() =>
      sdk.transaction([
        { method: 'moveItem', args: ['images', 'documents'] },
        { method: 'moveItem', args: ['documents', 'images'] },
      ]),
    ).toThrow('descendant');
    expect(sdk.getStructure()).toEqual(before);
  });

  it('preserves existing history and redo after failure and clears redo after a commit', () => {
    const sdk = new FileExplorerSDK();
    sdk.renameItem('notes', 'Todo.txt');
    sdk.renameItem('documents', 'Work');
    sdk.undo();
    const before = sdk.getStructure();

    expect(() =>
      sdk.transaction([
        { method: 'deleteItem', args: ['notes'] },
        { method: 'deleteItem', args: ['root'] },
      ]),
    ).toThrow();
    expect(sdk.getStructure()).toEqual(before);
    expect(sdk.canRedo()).toBe(true);
    sdk.redo();
    expect(sdk.getItem('documents').name).toBe('Work');
    sdk.undo();
    sdk.transaction([{ method: 'deleteItem', args: ['photo'] }]);
    expect(sdk.canRedo()).toBe(false);
    sdk.undo();
    expect(sdk.getStructure()).toEqual(before);
    sdk.undo();
    expect(sdk.getItem('notes').name).toBe('Notes.txt');
  });

  it('does not record or notify for empty or entirely no-op transactions', () => {
    const sdk = new FileExplorerSDK();
    sdk.renameItem('notes', 'Todo.txt');
    sdk.undo();
    const listener = vi.fn();
    sdk.subscribe(listener);

    expect(sdk.transaction([])).toEqual([]);
    expect(
      sdk.transaction([
        { method: 'renameItem', args: ['notes', ' Notes.txt '] },
        { method: 'moveItem', args: ['resume', 'documents'] },
      ]),
    ).toHaveLength(2);
    expect(sdk.canUndo()).toBe(false);
    expect(sdk.canRedo()).toBe(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps committed IDs unique across normal creation and history branching', () => {
    const sdk = new FileExplorerSDK();
    const first = sdk.createFile('root', 'First.txt');
    const [second, third] = sdk.transaction([
      { method: 'createFile', args: ['root', 'Second.txt'] },
      { method: 'createFolder', args: ['root', 'Third'] },
    ]);
    sdk.undo();
    const fourth = sdk.createFile('root', 'Fourth.txt');

    expect(new Set([first.id, second.id, third.id, fourth.id]).size).toBe(4);
    expect(sdk.getItem(second.id)).toBeNull();
    expect(sdk.getItem(third.id)).toBeNull();
  });

  it.each([undefined, null, {}, 'operations', () => {}])(
    'rejects a non-array transaction: %j',
    (input) => {
      const sdk = new FileExplorerSDK();
      expect(() => sdk.transaction(input)).toThrow(
        'Transaction operations must be an array.',
      );
      expect(sdk.canUndo()).toBe(false);
    },
  );

  it.each([
    {},
    [],
    { method: 'getItem', args: ['notes'] },
    { method: 'transaction', args: [[]] },
    { method: 'subscribe', args: [() => {}] },
    { method: 'deleteItem' },
    { method: 'deleteItem', args: 'notes' },
  ])('rejects unsupported descriptors: %j', (operation) => {
    const sdk = new FileExplorerSDK();
    expect(() => sdk.transaction([operation])).toThrow(TypeError);
    expect(sdk.canUndo()).toBe(false);
  });
});
