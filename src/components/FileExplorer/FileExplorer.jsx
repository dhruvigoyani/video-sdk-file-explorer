import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFileExplorer } from '../../hooks/useFileExplorer.js';
import { FileTree } from './FileTree.jsx';

export function FileExplorer() {
  const { structure } = useFileExplorer();
  const [selectedId, setSelectedId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set([structure.id]));

  const items = useMemo(() => {
    const index = new Map();
    const pending = [structure];
    while (pending.length > 0) {
      const item = pending.pop();
      index.set(item.id, item);
      if (item.type === 'folder') {
        pending.push(...item.children);
      }
    }
    return index;
  }, [structure]);

  useEffect(() => {
    setSelectedId((previous) => (items.has(previous) ? previous : null));
    setExpandedIds((previous) => {
      const remaining = new Set(
        [...previous].filter((id) => items.get(id)?.type === 'folder'),
      );
      return remaining.size === previous.size ? previous : remaining;
    });
  }, [items]);

  const toggleFolder = useCallback((id) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selected = items.get(selectedId);

  return (
    <section aria-label="File explorer">
      <h2>Files</h2>
      <p role="status">
        {selected ? `Selected: ${selected.name}` : 'No item selected'}
      </p>
      <ul className="file-tree" aria-label="Files">
        <FileTree
          node={structure}
          expandedIds={expandedIds}
          selectedId={selected?.id ?? null}
          onToggle={toggleFolder}
          onSelect={setSelectedId}
        />
      </ul>
    </section>
  );
}
