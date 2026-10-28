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

  createFile(parentId, name) {
    return this.#createItem(parentId, name, 'file');
  }

  createFolder(parentId, name) {
    return this.#createItem(parentId, name, 'folder');
  }

  renameItem(id, name) {
    const item = this.#requireItem(id);
    const normalizedName = this.#validateName(name, item.parentId, id);
    const updated = { ...item, name: normalizedName };
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
    const updated = { ...item, parentId };
    this.#items.set(id, updated);
    return { ...updated };
  }

  deleteItem(id) {
    const item = this.#requireItem(id);
    this.#protectRoot(item, 'deleted');
    const pending = [id];

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
    this.#items.set(item.id, item);
    return { ...item };
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
