// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { FileExplorerSDK } from '../../sdk/FileExplorerSDK.js';

describe('FileExplorerSDK mutations', () => {
  it('creates nested folders and files with unique IDs and trimmed names', () => {
    const sdk = new FileExplorerSDK();
    const folder = sdk.createFolder('documents', ' Projects ');
    const file = sdk.createFile(folder.id, ' Tasks.txt ');

    expect(folder).toEqual({
      id: expect.any(String),
      name: 'Projects',
      type: 'folder',
      parentId: 'documents',
    });
    expect(file).toEqual({
      id: expect.any(String),
      name: 'Tasks.txt',
      type: 'file',
      parentId: folder.id,
    });
    expect(file.id).not.toBe(folder.id);
    expect(sdk.getStructure().children[0].children[2]).toEqual({
      ...folder,
      children: [file],
    });
  });

  it('allows identical names in different folders', () => {
    const sdk = new FileExplorerSDK();
    const item = sdk.createFile('images', 'Resume.pdf');

    expect(sdk.getItem(item.id)).toEqual(item);
    expect(sdk.getItem('resume').parentId).toBe('documents');
  });

  it('renames files and folders while preserving identity and descendants', () => {
    const sdk = new FileExplorerSDK();
    const oldTree = sdk.getStructure();

    expect(sdk.renameItem('resume', ' CV.pdf ')).toEqual({
      id: 'resume',
      name: 'CV.pdf',
      type: 'file',
      parentId: 'documents',
    });
    expect(sdk.renameItem('documents', 'Work').id).toBe('documents');
    expect(sdk.getItem('resume').parentId).toBe('documents');
    expect(sdk.getStructure().children[0].children).toHaveLength(2);
    expect(oldTree.children[0].name).toBe('Documents');
    expect(oldTree.children[0].children[0].name).toBe('Resume.pdf');
  });

  it('allows case-only renaming and a same-name rename', () => {
    const sdk = new FileExplorerSDK();

    expect(sdk.renameItem('documents', 'DOCUMENTS').name).toBe('DOCUMENTS');
    expect(sdk.renameItem('documents', 'DOCUMENTS').name).toBe('DOCUMENTS');
  });

  it('moves a file and a nested folder without changing their IDs', () => {
    const sdk = new FileExplorerSDK();
    const child = sdk.createFolder('documents', 'Projects');
    const nested = sdk.createFile(child.id, 'Tasks.txt');

    expect(sdk.moveItem('notes', 'documents')).toEqual({
      id: 'notes',
      name: 'Notes.txt',
      type: 'file',
      parentId: 'documents',
    });
    expect(sdk.moveItem('documents', 'images').parentId).toBe('images');
    expect(sdk.getItem(child.id).parentId).toBe('documents');
    expect(sdk.getItem(nested.id).parentId).toBe(child.id);
    expect(sdk.getStructure().children.map((item) => item.id)).toEqual([
      'images',
    ]);
    expect(sdk.getStructure().children[0].children[2].id).toBe('documents');
  });

  it('treats moving to the current parent as a harmless no-op', () => {
    const sdk = new FileExplorerSDK();
    const before = sdk.getStructure();

    expect(sdk.moveItem('resume', 'documents')).toEqual(sdk.getItem('resume'));
    expect(sdk.getStructure()).toEqual(before);
  });

  it('deletes a file without deleting siblings', () => {
    const sdk = new FileExplorerSDK();

    expect(sdk.deleteItem('resume').id).toBe('resume');
    expect(sdk.getItem('resume')).toBeNull();
    expect(
      sdk.getStructure().children[0].children.map((item) => item.id),
    ).toEqual(['project-plan']);
  });

  it('deletes a folder and all descendants, leaving other branches intact', () => {
    const sdk = new FileExplorerSDK();
    const nested = sdk.createFolder('documents', 'Nested');
    const file = sdk.createFile(nested.id, 'Deep.txt');
    const before = sdk.getStructure();

    expect(sdk.deleteItem('documents').id).toBe('documents');
    for (const id of [
      'documents',
      'resume',
      'project-plan',
      nested.id,
      file.id,
    ]) {
      expect(sdk.getItem(id)).toBeNull();
    }
    expect(sdk.getStructure().children).toEqual(before.children.slice(1));
    expect(before.children[0].children).toHaveLength(3);
  });

  it('does not reuse deleted IDs and keeps instances independent', () => {
    const sdk = new FileExplorerSDK();
    const other = new FileExplorerSDK();
    const before = other.getStructure();
    const file = sdk.createFile('root', 'New.txt');
    sdk.deleteItem(file.id);
    const replacement = sdk.createFile('root', 'New.txt');
    sdk.renameItem('documents', 'Work');

    expect(replacement.id).not.toBe(file.id);
    expect(other.getStructure()).toEqual(before);
  });

  it('returns detached records from every mutation', () => {
    const sdk = new FileExplorerSDK();
    const folder = sdk.createFolder('root', 'Projects');
    const file = sdk.createFile(folder.id, 'Task.txt');
    const renamed = sdk.renameItem(file.id, 'Todo.txt');
    const moved = sdk.moveItem(file.id, 'images');
    folder.name = 'Changed';
    file.name = 'Changed';
    renamed.name = 'Changed';
    moved.parentId = 'root';

    expect(sdk.getItem(folder.id).name).toBe('Projects');
    expect(sdk.getItem(file.id)).toEqual({
      id: file.id,
      name: 'Todo.txt',
      type: 'file',
      parentId: 'images',
    });
  });

  it.each([
    ['createFile', ['root', ' documents '], 'already exists'],
    ['createFolder', ['root', 'NOTES.TXT'], 'already exists'],
    ['renameItem', ['notes', 'IMAGES'], 'already exists'],
    ['createFile', ['notes', 'Child.txt'], 'must be a folder'],
    ['createFolder', ['notes', 'Child'], 'must be a folder'],
    ['moveItem', ['resume', 'notes'], 'must be a folder'],
    ['moveItem', ['documents', 'documents'], 'itself or a descendant'],
    ['moveItem', ['root', 'images'], 'root folder cannot be moved'],
    ['deleteItem', ['root'], 'root folder cannot be deleted'],
    ['createFile', ['missing', 'New.txt'], 'was not found'],
    ['createFolder', ['missing', 'New'], 'was not found'],
    ['renameItem', ['missing', 'New'], 'was not found'],
    ['moveItem', ['missing', 'root'], 'was not found'],
    ['moveItem', ['notes', 'missing'], 'was not found'],
    ['deleteItem', ['missing'], 'was not found'],
    ['createFile', [null, 'New.txt'], 'ID must be a non-empty string'],
    ['createFolder', ['', 'New'], 'ID must be a non-empty string'],
    ['renameItem', [undefined, 'New'], 'ID must be a non-empty string'],
    ['moveItem', ['notes', 42], 'ID must be a non-empty string'],
    ['deleteItem', [false], 'ID must be a non-empty string'],
  ])('rejects %s(%j) without changing state', (method, args, message) => {
    const sdk = new FileExplorerSDK();
    const before = sdk.getStructure();

    expect(() => sdk[method](...args)).toThrow(message);
    expect(sdk.getStructure()).toEqual(before);
  });

  it.each([undefined, null, '', '   ', 42, {}, []])(
    'rejects invalid names for creation and renaming: %j',
    (name) => {
      const sdk = new FileExplorerSDK();
      const before = sdk.getStructure();

      expect(() => sdk.createFile('root', name)).toThrow(TypeError);
      expect(() => sdk.createFolder('root', name)).toThrow(TypeError);
      expect(() => sdk.renameItem('notes', name)).toThrow(TypeError);
      expect(sdk.getStructure()).toEqual(before);
    },
  );

  it('rejects moves into deep descendants without changing state', () => {
    const sdk = new FileExplorerSDK();
    const child = sdk.createFolder('documents', 'Child');
    const grandchild = sdk.createFolder(child.id, 'Grandchild');
    const before = sdk.getStructure();

    expect(() => sdk.moveItem('documents', grandchild.id)).toThrow(
      'itself or a descendant',
    );
    expect(sdk.getStructure()).toEqual(before);
  });

  it('rejects destination name conflicts across files and folders', () => {
    const sdk = new FileExplorerSDK();
    sdk.createFolder('images', 'RESUME.PDF');
    const before = sdk.getStructure();

    expect(() => sdk.moveItem('resume', 'images')).toThrow('already exists');
    expect(sdk.getStructure()).toEqual(before);
  });

  it('allows renaming the root while preserving its identity', () => {
    const sdk = new FileExplorerSDK();

    expect(sdk.renameItem('root', 'Files')).toEqual({
      id: 'root',
      name: 'Files',
      type: 'folder',
      parentId: null,
    });
    expect(sdk.getStructure().children).toHaveLength(3);
  });
});
