import { memo } from 'react';

export const FileTreeRow = memo(function FileTreeRow({
  id,
  name,
  type,
  expanded,
  selected,
  onToggle,
  onSelect,
}) {
  return (
    <div className="file-tree-row">
      {type === 'folder' ? (
        <button
          type="button"
          className="folder-toggle"
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${name}`}
          aria-expanded={expanded}
          onClick={() => onToggle(id)}
        >
          <span aria-hidden="true">{expanded ? '−' : '+'}</span>
        </button>
      ) : (
        <span className="folder-toggle-spacer" aria-hidden="true" />
      )}
      <button
        type="button"
        className="file-tree-item"
        aria-label={`${name} ${type}`}
        aria-pressed={selected}
        onClick={() => onSelect(id)}
      >
        {name}
        <span className="item-type">{type}</span>
      </button>
    </div>
  );
});
