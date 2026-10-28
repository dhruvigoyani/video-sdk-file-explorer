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
    if (typeof id !== 'string' || id.trim() === '') {
      throw new TypeError('Item ID must be a non-empty string.');
    }

    const item = this.#items.get(id);
    return item ? { ...item } : null;
  }
}
