// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { FileExplorerSDK } from '../../sdk/FileExplorerSDK.js';

describe('FileExplorerSDK foundation', () => {
  it('returns the complete sample hierarchy', () => {
    const sdk = new FileExplorerSDK();

    expect(sdk.getStructure()).toEqual({
      id: 'root',
      name: 'My Files',
      type: 'folder',
      parentId: null,
      children: [
        {
          id: 'documents',
          name: 'Documents',
          type: 'folder',
          parentId: 'root',
          children: [
            {
              id: 'resume',
              name: 'Resume.pdf',
              type: 'file',
              parentId: 'documents',
            },
            {
              id: 'project-plan',
              name: 'Project Plan.docx',
              type: 'file',
              parentId: 'documents',
            },
          ],
        },
        {
          id: 'images',
          name: 'Images',
          type: 'folder',
          parentId: 'root',
          children: [
            {
              id: 'photo',
              name: 'Photo.png',
              type: 'file',
              parentId: 'images',
            },
            {
              id: 'logo',
              name: 'Logo.svg',
              type: 'file',
              parentId: 'images',
            },
          ],
        },
        { id: 'notes', name: 'Notes.txt', type: 'file', parentId: 'root' },
      ],
    });
  });

  it('assigns stable, unique IDs and valid parent references', () => {
    const sdk = new FileExplorerSDK();
    const ids = new Set();

    function visit(item, parentId) {
      expect(typeof item.id).toBe('string');
      expect(item.id.length).toBeGreaterThan(0);
      expect(ids.has(item.id)).toBe(false);
      expect(item.parentId).toBe(parentId);
      ids.add(item.id);

      if (item.type === 'folder') {
        item.children.forEach((child) => visit(child, item.id));
      } else {
        expect(item).not.toHaveProperty('children');
      }
    }

    visit(sdk.getStructure(), null);
    expect(ids.size).toBe(8);
    expect(sdk.getStructure()).toEqual(sdk.getStructure());
  });

  it.each(['root', 'documents', 'resume', 'images', 'photo', 'notes'])(
    'retrieves the item with ID %s without attaching descendants',
    (id) => {
      const sdk = new FileExplorerSDK();

      const item = sdk.getItem(id);

      expect(item.id).toBe(id);
      expect(item).not.toHaveProperty('children');
    },
  );

  it('returns null for an unknown ID', () => {
    const sdk = new FileExplorerSDK();

    expect(sdk.getItem('missing')).toBeNull();
  });

  it.each([undefined, null, '', '   ', 42, {}, []])(
    'rejects an invalid ID: %j',
    (id) => {
      const sdk = new FileExplorerSDK();
      const before = sdk.getStructure();

      expect(() => sdk.getItem(id)).toThrow(TypeError);
      expect(() => sdk.getItem(id)).toThrow(
        'Item ID must be a non-empty string.',
      );
      expect(sdk.getStructure()).toEqual(before);
    },
  );

  it('protects internal data from changes to a returned item', () => {
    const sdk = new FileExplorerSDK();
    const original = sdk.getItem('resume');
    const item = sdk.getItem('resume');

    item.id = 'changed';
    item.name = 'Changed.pdf';
    item.parentId = 'root';
    item.type = 'folder';

    expect(sdk.getItem('resume')).toEqual(original);
    expect(sdk.getItem('changed')).toBeNull();
    expect(sdk.getStructure().children[0].children[0]).toEqual(original);
  });

  it('protects nested data and child arrays from consumer changes', () => {
    const sdk = new FileExplorerSDK();
    const original = sdk.getStructure();
    const tree = sdk.getStructure();

    tree.name = 'Changed root';
    tree.children[0].children[0].name = 'Changed.pdf';
    tree.children[1].children.length = 0;
    tree.children.push({ id: 'injected' });

    expect(sdk.getStructure()).toEqual(original);
    expect(sdk.getItem('resume').name).toBe('Resume.pdf');
    expect(sdk.getItem('injected')).toBeNull();
  });

  it('keeps SDK instances independent', () => {
    const first = new FileExplorerSDK();
    const second = new FileExplorerSDK();
    const original = second.getStructure();

    first.getStructure().children.length = 0;
    first.getItem('documents').name = 'Changed';

    expect(first.getStructure()).toEqual(original);
    expect(second.getStructure()).toEqual(original);
  });
});
