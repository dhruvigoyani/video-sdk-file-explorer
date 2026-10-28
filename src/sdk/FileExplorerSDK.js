const initialItems = [
  { id: 'root', name: 'My Files', type: 'folder', parentId: null },
  { id: 'documents', name: 'Documents', type: 'folder', parentId: 'root' },
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
  { id: 'images', name: 'Images', type: 'folder', parentId: 'root' },
  { id: 'photo', name: 'Photo.png', type: 'file', parentId: 'images' },
  { id: 'logo', name: 'Logo.svg', type: 'file', parentId: 'images' },
  { id: 'notes', name: 'Notes.txt', type: 'file', parentId: 'root' },
];

export class FileExplorerSDK {
  #items = new Map(initialItems.map((item) => [item.id, { ...item }]));
  #nextId = 1;
  #undoStack = [];
  #redoStack = [];

  getStructure() {
    const nodes = new Map();

    for (const item of this.#items.values()) {
      nodes.set(
        item.id,
        item.type === 'folder' ? { ...item, children: [] } : { ...item },
      );
    }

    for (const node of nodes.values()) {
      if (node.parentId !== null) {
        nodes.get(node.parentId).children.push(node);
      }
    }

    return nodes.get('root');
  }

  getItem(id) {
    this.#validateId(id);

    const item = this.#items.get(id);
    return item ? { ...item } : null;
  }

  search(query = '', options = {}) {
    if (typeof query !== 'string') {
      throw new TypeError('Search query must be a string.');
    }
    if (
      options === null ||
      typeof options !== 'object' ||
      Array.isArray(options)
    ) {
      throw new TypeError('Search options must be an object.');
    }

    const allowedOptions = ['type', 'sortBy', 'sortOrder', 'page', 'pageSize'];
    for (const key of Object.keys(options)) {
      if (!allowedOptions.includes(key)) {
        throw new TypeError(`Unknown search option "${key}".`);
      }
    }

    const {
      type = 'all',
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      pageSize = 10,
    } = options;

    if (!['all', 'file', 'folder'].includes(type)) {
      throw new TypeError('Search type must be "all", "file", or "folder".');
    }
    if (!['name', 'type', 'location'].includes(sortBy)) {
      throw new TypeError(
        'Search sortBy must be "name", "type", or "location".',
      );
    }
    if (!['asc', 'desc'].includes(sortOrder)) {
      throw new TypeError('Search sortOrder must be "asc" or "desc".');
    }
    if (!Number.isSafeInteger(page) || page < 1) {
      throw new TypeError('Search page must be a positive safe integer.');
    }
    if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
      throw new TypeError('Search pageSize must be a positive safe integer.');
    }

    const normalizedQuery = query.trim().toLowerCase();
    const matches = [];

    for (const item of this.#items.values()) {
      if (
        (type === 'all' || item.type === type) &&
        item.name.toLowerCase().includes(normalizedQuery)
      ) {
        matches.push({ ...item, location: this.#getLocation(item) });
      }
    }

    const direction = sortOrder === 'asc' ? 1 : -1;
    matches.sort((first, second) => {
      const comparison = first[sortBy].localeCompare(second[sortBy], 'en', {
        sensitivity: 'base',
      });
      return (
        direction * (comparison || first.id.localeCompare(second.id, 'en'))
      );
    });

    const start = (page - 1) * pageSize;
    return {
      items: matches.slice(start, start + pageSize),
      total: matches.length,
      page,
      pageSize,
      totalPages: Math.ceil(matches.length / pageSize),
    };
  }

  createFile(parentId, name) {
    return this.#createItem(parentId, name, 'file');
  }

  createFolder(parentId, name) {
    return this.#createItem(parentId, name, 'folder');
  }

  canUndo() {
    return this.#undoStack.length > 0;
  }

  canRedo() {
    return this.#redoStack.length > 0;
  }

  undo() {
    if (!this.canUndo()) {
      return false;
    }

    this.#redoStack.push(new Map(this.#items));
    this.#items = this.#undoStack.pop();
    return true;
  }

  redo() {
    if (!this.canRedo()) {
      return false;
    }

    this.#undoStack.push(new Map(this.#items));
    this.#items = this.#redoStack.pop();
    return true;
  }

  renameItem(id, name) {
    const item = this.#requireItem(id);
    const normalizedName = this.#validateName(name, item.parentId, id);
    if (normalizedName === item.name) {
      return { ...item };
    }

    const updated = { ...item, name: normalizedName };
    this.#recordHistory();
    this.#items.set(id, updated);
    return { ...updated };
  }

  moveItem(id, parentId) {
    const item = this.#requireItem(id);
    this.#protectRoot(item, 'moved');
    const parent = this.#requireFolder(parentId);

    let ancestor = parent;
    while (ancestor) {
      if (ancestor.id === id) {
        throw new Error(
          'A folder cannot be moved into itself or a descendant.',
        );
      }
      ancestor = this.#items.get(ancestor.parentId);
    }

    this.#validateName(item.name, parentId, id);
    if (item.parentId === parentId) {
      return { ...item };
    }

    const updated = { ...item, parentId };
    this.#recordHistory();
    this.#items.set(id, updated);
    return { ...updated };
  }

  deleteItem(id) {
    const item = this.#requireItem(id);
    this.#protectRoot(item, 'deleted');
    const pending = [id];
    this.#recordHistory();

    while (pending.length > 0) {
      const currentId = pending.pop();
      for (const child of this.#items.values()) {
        if (child.parentId === currentId) {
          pending.push(child.id);
        }
      }
      this.#items.delete(currentId);
    }

    return { ...item };
  }

  #createItem(parentId, name, type) {
    this.#requireFolder(parentId);
    const normalizedName = this.#validateName(name, parentId);
    const item = {
      id: `item-${this.#nextId++}`,
      name: normalizedName,
      type,
      parentId,
    };
    this.#recordHistory();
    this.#items.set(item.id, item);
    return { ...item };
  }

  #getLocation(item) {
    const names = [];
    let current = item;
    while (current) {
      names.push(current.name);
      current = this.#items.get(current.parentId);
    }
    return names.reverse().join(' / ');
  }

  #recordHistory() {
    // Records are replaced on mutation, so snapshots can safely share them.
    this.#undoStack.push(new Map(this.#items));
    this.#redoStack.length = 0;
  }

  #validateId(id) {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new TypeError('Item ID must be a non-empty string.');
    }
  }

  #requireItem(id) {
    this.#validateId(id);
    const item = this.#items.get(id);
    if (!item) {
      throw new Error(`Item with ID "${id}" was not found.`);
    }
    return item;
  }

  #requireFolder(id) {
    const item = this.#requireItem(id);
    if (item.type !== 'folder') {
      throw new Error('The parent item must be a folder.');
    }
    return item;
  }

  #validateName(name, parentId, excludedId) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('Item name must be a non-empty string.');
    }

    const normalizedName = name.trim();
    for (const item of this.#items.values()) {
      if (
        item.parentId === parentId &&
        item.id !== excludedId &&
        item.name.toLowerCase() === normalizedName.toLowerCase()
      ) {
        throw new Error(
          `An item named "${normalizedName}" already exists in this folder.`,
        );
      }
    }
    return normalizedName;
  }

  #protectRoot(item, operation) {
    if (item.parentId === null) {
      throw new Error(`The root folder cannot be ${operation}.`);
    }
  }
}
