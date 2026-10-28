// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { FileExplorerSDK } from '../../sdk/FileExplorerSDK.js';

describe('FileExplorerSDK undo and redo', () => {
  it('starts without history and returns false when nothing can be restored', () => {
    const sdk = new FileExplorerSDK();
    const original = sdk.getStructure();

    expect(sdk.canUndo()).toBe(false);
    expect(sdk.canRedo()).toBe(false);
    expect(sdk.undo()).toBe(false);
    expect(sdk.redo()).toBe(false);
    expect(sdk.getStructure()).toEqual(original);
  });

  it.each(['createFile', 'createFolder'])(
    'undoes and redoes %s while retaining the original ID',
    (method) => {
      const sdk = new FileExplorerSDK();
      const before = sdk.getStructure();
      const item = sdk[method]('documents', 'New item');
      const after = sdk.getStructure();

      expect(sdk.canUndo()).toBe(true);
      expect(sdk.canRedo()).toBe(false);
      expect(sdk.undo()).toBe(true);
      expect(sdk.getItem(item.id)).toBeNull();
      expect(sdk.getStructure()).toEqual(before);
      expect(sdk.canUndo()).toBe(false);
      expect(sdk.canRedo()).toBe(true);
      expect(sdk.redo()).toBe(true);
      expect(sdk.getItem(item.id)).toEqual(item);
      expect(sdk.getStructure()).toEqual(after);
      expect(sdk.canUndo()).toBe(true);
      expect(sdk.canRedo()).toBe(false);
    },
  );

  it.each(['resume', 'documents', 'root'])(
    'undoes and redoes renaming %s without changing its identity',
    (id) => {
      const sdk = new FileExplorerSDK();
      const before = sdk.getStructure();
      sdk.renameItem(id, 'New name');
      const after = sdk.getStructure();

      sdk.undo();
      expect(sdk.getStructure()).toEqual(before);
      sdk.redo();
      expect(sdk.getStructure()).toEqual(after);
      expect(sdk.getItem(id).name).toBe('New name');
    },
  );

  it.each(['resume', 'documents'])(
    'undoes and redoes moving %s, preserving descendants and sibling order',
    (id) => {
      const sdk = new FileExplorerSDK();
      const before = sdk.getStructure();
      sdk.moveItem(id, 'images');
      const after = sdk.getStructure();

      sdk.undo();
      expect(sdk.getStructure()).toEqual(before);
      sdk.redo();
      expect(sdk.getStructure()).toEqual(after);
      expect(sdk.getItem(id).parentId).toBe('images');
    },
  );

  it('undoes and redoes file deletion', () => {
    const sdk = new FileExplorerSDK();
    const before = sdk.getStructure();
    sdk.deleteItem('resume');
    const after = sdk.getStructure();

    sdk.undo();
    expect(sdk.getStructure()).toEqual(before);
    sdk.redo();
    expect(sdk.getStructure()).toEqual(after);
    expect(sdk.getItem('resume')).toBeNull();
  });

  it('restores a deleted folder and its full nested structure in one undo', () => {
    const sdk = new FileExplorerSDK();
    const child = sdk.createFolder('documents', 'Projects');
    const nested = sdk.createFolder(child.id, 'Drafts');
    const file = sdk.createFile(nested.id, 'Plan.txt');
    const before = sdk.getStructure();
    sdk.deleteItem('documents');
    const after = sdk.getStructure();

    sdk.undo();
    expect(sdk.getStructure()).toEqual(before);
    expect(sdk.getItem(file.id)).toEqual(file);
    sdk.redo();
    expect(sdk.getStructure()).toEqual(after);
    for (const id of [
      'documents',
      'resume',
      'project-plan',
      child.id,
      nested.id,
      file.id,
    ]) {
      expect(sdk.getItem(id)).toBeNull();
    }
  });

  it('restores every state in order across mixed operations and repeated history cycles', () => {
    const sdk = new FileExplorerSDK();
    const states = [sdk.getStructure()];
    const folder = sdk.createFolder('root', 'Projects');
    states.push(sdk.getStructure());
    const file = sdk.createFile(folder.id, 'Plan.txt');
    states.push(sdk.getStructure());
    sdk.renameItem(file.id, 'Final.txt');
    states.push(sdk.getStructure());
    sdk.moveItem(folder.id, 'documents');
    states.push(sdk.getStructure());
    sdk.deleteItem('documents');
    states.push(sdk.getStructure());

    for (let cycle = 0; cycle < 2; cycle++) {
      for (let index = states.length - 2; index >= 0; index--) {
        expect(sdk.undo()).toBe(true);
        expect(sdk.getStructure()).toEqual(states[index]);
      }
      expect(sdk.undo()).toBe(false);
      for (let index = 1; index < states.length; index++) {
        expect(sdk.redo()).toBe(true);
        expect(sdk.getStructure()).toEqual(states[index]);
      }
      expect(sdk.redo()).toBe(false);
    }
  });

  it.each([
    (sdk) => sdk.createFile('root', 'New.txt'),
    (sdk) => sdk.createFolder('root', 'New'),
    (sdk) => sdk.renameItem('notes', 'Renamed.txt'),
    (sdk) => sdk.moveItem('notes', 'images'),
    (sdk) => sdk.deleteItem('notes'),
  ])('clears redo history after a new mutation', (mutate) => {
    const sdk = new FileExplorerSDK();
    const before = sdk.getStructure();
    sdk.renameItem('documents', 'Work');
    sdk.undo();
    mutate(sdk);
    const after = sdk.getStructure();

    expect(sdk.canRedo()).toBe(false);
    expect(sdk.redo()).toBe(false);
    sdk.undo();
    expect(sdk.getStructure()).toEqual(before);
    sdk.redo();
    expect(sdk.getStructure()).toEqual(after);
  });

  it.each([
    (sdk) => sdk.createFile('documents', 'RESUME.PDF'),
    (sdk) => sdk.createFolder('notes', 'Child'),
    (sdk) => sdk.renameItem('notes', 'Images'),
    (sdk) => sdk.moveItem('documents', 'documents'),
    (sdk) => sdk.moveItem('notes', 'missing'),
    (sdk) => sdk.deleteItem('root'),
    (sdk) => sdk.deleteItem('missing'),
  ])(
    'does not add undo entries or discard redo history for failed mutations',
    (mutate) => {
      const sdk = new FileExplorerSDK();
      sdk.renameItem('documents', 'Work');
      const renamed = sdk.getStructure();
      sdk.renameItem('notes', 'Todo.txt');
      sdk.undo();
      const before = sdk.getStructure();

      expect(() => mutate(sdk)).toThrow();
      expect(sdk.getStructure()).toEqual(before);
      expect(sdk.canRedo()).toBe(true);
      sdk.undo();
      expect(sdk.getItem('documents').name).toBe('Documents');
      sdk.redo();
      expect(sdk.getStructure()).toEqual(renamed);
      sdk.redo();
      expect(sdk.getItem('notes').name).toBe('Todo.txt');
    },
  );

  it('does not record no-op mutations or reads, or clear redo history for them', () => {
    const sdk = new FileExplorerSDK();
    sdk.renameItem('notes', 'Todo.txt');
    sdk.undo();

    sdk.renameItem('notes', ' Notes.txt ');
    sdk.moveItem('resume', 'documents');
    sdk.getItem('notes');
    sdk.getStructure();
    sdk.search('doc');
    expect(() => sdk.search('', { page: 0 })).toThrow();

    expect(sdk.canUndo()).toBe(false);
    expect(sdk.canRedo()).toBe(true);
    expect(sdk.undo()).toBe(false);
    expect(sdk.redo()).toBe(true);
    expect(sdk.getItem('notes').name).toBe('Todo.txt');
  });

  it('records case-only renaming as a change', () => {
    const sdk = new FileExplorerSDK();
    sdk.renameItem('documents', 'DOCUMENTS');
    sdk.undo();
    expect(sdk.getItem('documents').name).toBe('Documents');
    sdk.redo();
    expect(sdk.getItem('documents').name).toBe('DOCUMENTS');
  });

  it('does not reuse IDs from undone creations when branching', () => {
    const sdk = new FileExplorerSDK();
    const discarded = sdk.createFile('root', 'New.txt');
    sdk.undo();
    const replacement = sdk.createFile('root', 'New.txt');

    expect(replacement.id).not.toBe(discarded.id);
    expect(sdk.getItem(discarded.id)).toBeNull();
    sdk.undo();
    sdk.redo();
    expect(sdk.getItem(replacement.id)).toEqual(replacement);
  });

  it('keeps search results and locations consistent after history changes', () => {
    const sdk = new FileExplorerSDK();
    sdk.moveItem('resume', 'images');
    sdk.deleteItem('images');
    expect(sdk.search('resume').total).toBe(0);
    sdk.undo();
    expect(sdk.search('resume').items[0].location).toBe(
      'My Files / Images / Resume.pdf',
    );
    sdk.undo();
    expect(sdk.search('resume').items[0].location).toBe(
      'My Files / Documents / Resume.pdf',
    );
    sdk.redo();
    expect(sdk.search('resume').items[0].location).toBe(
      'My Files / Images / Resume.pdf',
    );
    sdk.redo();
    expect(sdk.search('resume').total).toBe(0);
  });

  it('protects history from consumer changes to returned data', () => {
    const sdk = new FileExplorerSDK();
    const original = sdk.getStructure();
    const created = sdk.createFolder('documents', 'Projects');
    const tree = sdk.getStructure();
    const result = sdk.search('projects');
    created.name = 'Changed';
    tree.children[0].children.length = 0;
    result.items[0].name = 'Changed';
    sdk.undo();
    expect(sdk.getStructure()).toEqual(original);
    sdk.redo();
    expect(sdk.getItem(created.id).name).toBe('Projects');
    const item = sdk.getItem(created.id);
    item.name = 'Changed again';
    sdk.undo();
    sdk.redo();
    expect(sdk.getItem(created.id).name).toBe('Projects');
  });

  it('keeps histories independent between SDK instances', () => {
    const first = new FileExplorerSDK();
    const second = new FileExplorerSDK();
    const original = second.getStructure();
    first.deleteItem('documents');

    expect(second.canUndo()).toBe(false);
    expect(second.canRedo()).toBe(false);
    expect(second.undo()).toBe(false);
    expect(second.getStructure()).toEqual(original);
    first.undo();
    expect(first.getStructure()).toEqual(original);
  });
});
