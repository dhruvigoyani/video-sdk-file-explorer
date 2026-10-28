// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { FileExplorerSDK } from '../../sdk/FileExplorerSDK.js';

describe('FileExplorerSDK search', () => {
  it('matches nested names case-insensitively and trims the query', () => {
    const sdk = new FileExplorerSDK();

    expect(sdk.search('  LoGO  ')).toEqual({
      items: [
        {
          id: 'logo',
          name: 'Logo.svg',
          type: 'file',
          parentId: 'images',
          location: 'My Files / Images / Logo.svg',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
    expect(sdk.search('doc').items.map((item) => item.id)).toEqual([
      'documents',
      'project-plan',
    ]);
  });

  it('searches deeply nested items and includes their full location', () => {
    const sdk = new FileExplorerSDK();
    const folder = sdk.createFolder('documents', 'Projects');
    const nested = sdk.createFolder(folder.id, 'Drafts');
    const file = sdk.createFile(nested.id, 'Report.txt');

    expect(sdk.search('report').items).toEqual([
      {
        ...file,
        location: 'My Files / Documents / Projects / Drafts / Report.txt',
      },
    ]);
    expect(sdk.search('Projects').items).toEqual([
      { ...folder, location: 'My Files / Documents / Projects' },
    ]);
  });

  it('filters matching names by file or folder', () => {
    const sdk = new FileExplorerSDK();

    expect(
      sdk.search('doc', { type: 'folder' }).items.map((item) => item.id),
    ).toEqual(['documents']);
    expect(
      sdk.search('doc', { type: 'file' }).items.map((item) => item.id),
    ).toEqual(['project-plan']);
    expect(sdk.search('doc', { type: 'all' }).total).toBe(2);
  });

  it('treats omitted, empty, and whitespace queries as matching every item including the root', () => {
    const sdk = new FileExplorerSDK();
    const result = sdk.search();

    expect(result.total).toBe(8);
    expect(result.items.map((item) => item.id)).toEqual([
      'documents',
      'images',
      'logo',
      'root',
      'notes',
      'photo',
      'project-plan',
      'resume',
    ]);
    expect(result.items.find((item) => item.id === 'root').location).toBe(
      'My Files',
    );
    expect(sdk.search('')).toEqual(result);
    expect(sdk.search('   ')).toEqual(result);
    expect(sdk.search('', { type: 'file' }).total).toBe(5);
    expect(sdk.search('', { type: 'folder' }).total).toBe(3);
  });

  it('matches names rather than ancestor paths and treats special characters literally', () => {
    const sdk = new FileExplorerSDK();
    const file = sdk.createFile('documents', '[draft].txt');

    expect(sdk.search('My Files / Documents').total).toBe(0);
    expect(sdk.search('[draft]').items.map((item) => item.id)).toEqual([
      file.id,
    ]);
  });

  it('sorts by name in ascending and descending order', () => {
    const sdk = new FileExplorerSDK();
    const ascending = sdk.search('', { sortBy: 'name', sortOrder: 'asc' });
    const descending = sdk.search('', { sortBy: 'name', sortOrder: 'desc' });

    expect(descending.items.map((item) => item.id)).toEqual(
      ascending.items.map((item) => item.id).reverse(),
    );
    const upper = sdk.createFile('root', 'ALPHA');
    const lower = sdk.createFile('documents', 'alpha');
    expect(sdk.search('alpha').items.map((item) => item.id)).toEqual([
      upper.id,
      lower.id,
    ]);
    expect(
      sdk.search('alpha', { sortOrder: 'desc' }).items.map((item) => item.id),
    ).toEqual([lower.id, upper.id]);
  });

  it('sorts by type with deterministic ID ordering for equal types', () => {
    const sdk = new FileExplorerSDK();

    expect(
      sdk.search('', { sortBy: 'type' }).items.map((item) => item.id),
    ).toEqual([
      'logo',
      'notes',
      'photo',
      'project-plan',
      'resume',
      'documents',
      'images',
      'root',
    ]);
    expect(
      sdk
        .search('', { sortBy: 'type', sortOrder: 'desc' })
        .items.map((item) => item.id),
    ).toEqual([
      'root',
      'images',
      'documents',
      'resume',
      'project-plan',
      'photo',
      'notes',
      'logo',
    ]);
  });

  it('sorts by full location', () => {
    const sdk = new FileExplorerSDK();

    expect(
      sdk.search('', { sortBy: 'location' }).items.map((item) => item.id),
    ).toEqual([
      'root',
      'documents',
      'project-plan',
      'resume',
      'images',
      'logo',
      'photo',
      'notes',
    ]);
  });

  it('filters and sorts before paginating and reports totals before pagination', () => {
    const sdk = new FileExplorerSDK();
    const options = { type: 'file', sortOrder: 'desc', pageSize: 2 };

    expect(sdk.search('', { ...options, page: 1 })).toMatchObject({
      items: [{ id: 'resume' }, { id: 'project-plan' }],
      total: 5,
      page: 1,
      pageSize: 2,
      totalPages: 3,
    });
    expect(
      sdk.search('', { ...options, page: 2 }).items.map((item) => item.id),
    ).toEqual(['photo', 'notes']);
    expect(
      sdk.search('', { ...options, page: 3 }).items.map((item) => item.id),
    ).toEqual(['logo']);
    expect(sdk.search('', { ...options, page: 4 })).toEqual({
      items: [],
      total: 5,
      page: 4,
      pageSize: 2,
      totalPages: 3,
    });
  });

  it('returns empty results and zero pages for no matches', () => {
    const sdk = new FileExplorerSDK();

    expect(sdk.search('not-found')).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });
  });

  it('reflects creation, renaming, moving, ancestor renaming, and deletion', () => {
    const sdk = new FileExplorerSDK();
    expect(sdk.search('draft').total).toBe(0);
    const folder = sdk.createFolder('documents', 'Drafts');
    const file = sdk.createFile(folder.id, 'Draft.txt');
    const original = sdk.search('draft');
    expect(original.total).toBe(2);

    sdk.renameItem(file.id, 'Final.txt');
    expect(sdk.search('draft').total).toBe(1);
    sdk.moveItem(folder.id, 'images');
    expect(sdk.search('final').items[0].location).toBe(
      'My Files / Images / Drafts / Final.txt',
    );
    sdk.renameItem('images', 'Pictures');
    sdk.renameItem('root', 'Files');
    expect(sdk.search('final').items[0].location).toBe(
      'Files / Pictures / Drafts / Final.txt',
    );
    sdk.deleteItem(folder.id);
    expect(sdk.search('draft').total).toBe(0);
    expect(sdk.search('final').total).toBe(0);
    expect(original.items.find((item) => item.id === file.id)).toMatchObject({
      name: 'Draft.txt',
      location: 'My Files / Documents / Drafts / Draft.txt',
    });
  });

  it('does not mutate the hierarchy or options and returns detached results', () => {
    const sdk = new FileExplorerSDK();
    const before = sdk.getStructure();
    const options = Object.freeze({
      sortBy: 'location',
      sortOrder: 'desc',
      pageSize: 20,
    });
    const result = sdk.search('', options);
    result.items[0].name = 'Changed';
    result.items[0].parentId = 'missing';
    result.items[0].location = 'Changed';
    result.items.pop();
    result.total = 0;

    expect(sdk.getStructure()).toEqual(before);
    expect(sdk.search('', options).total).toBe(8);
    expect(sdk.search('', options).items).toHaveLength(8);
    expect(
      sdk.search('', options).items.some((item) => item.name === 'Changed'),
    ).toBe(false);
  });

  it.each([null, 42, true, {}, [], /logo/])(
    'rejects an invalid query: %j',
    (query) => {
      const sdk = new FileExplorerSDK();
      const before = sdk.getStructure();

      expect(() => sdk.search(query)).toThrow('Search query must be a string.');
      expect(sdk.getStructure()).toEqual(before);
    },
  );

  it.each([null, 'file', 1, true, []])(
    'rejects invalid options: %j',
    (options) => {
      const sdk = new FileExplorerSDK();

      expect(() => sdk.search('', options)).toThrow(
        'Search options must be an object.',
      );
    },
  );

  it.each([
    [{ type: 'document' }, 'Search type'],
    [{ type: null }, 'Search type'],
    [{ sortBy: 'id' }, 'Search sortBy'],
    [{ sortBy: null }, 'Search sortBy'],
    [{ sortOrder: 'ascending' }, 'Search sortOrder'],
    [{ sortOrder: null }, 'Search sortOrder'],
    [{ page: 0 }, 'Search page must'],
    [{ page: -1 }, 'Search page must'],
    [{ page: 1.5 }, 'Search page must'],
    [{ page: '1' }, 'Search page must'],
    [{ page: null }, 'Search page must'],
    [{ page: NaN }, 'Search page must'],
    [{ page: Infinity }, 'Search page must'],
    [{ page: Number.MAX_SAFE_INTEGER + 1 }, 'Search page must'],
    [{ pageSize: 0 }, 'Search pageSize must'],
    [{ pageSize: -1 }, 'Search pageSize must'],
    [{ pageSize: 1.5 }, 'Search pageSize must'],
    [{ pageSize: '10' }, 'Search pageSize must'],
    [{ pageSize: null }, 'Search pageSize must'],
    [{ pageSize: NaN }, 'Search pageSize must'],
    [{ pageSize: Infinity }, 'Search pageSize must'],
    [{ pageSize: Number.MAX_SAFE_INTEGER + 1 }, 'Search pageSize must'],
    [{ typo: true }, 'Unknown search option "typo"'],
  ])(
    'rejects invalid search settings %j without changing state',
    (options, message) => {
      const sdk = new FileExplorerSDK();
      const before = sdk.getStructure();

      expect(() => sdk.search('', options)).toThrow(TypeError);
      expect(() => sdk.search('', options)).toThrow(message);
      expect(sdk.getStructure()).toEqual(before);
    },
  );
});
