import { FileTreeRow } from './FileTreeRow.jsx';

export const FileTree = ({
  node,
  expandedIds,
  selectedId,
  bulkIds,
  onBulkToggle,
  onToggle,
  onSelect,
}) => {
  console.log('FileTree render:', node.id);

  const expanded = node.type === 'folder' && expandedIds.has(node.id);

  return (
    <li>
      <FileTreeRow
        id={node.id}
        name={node.name}
        type={node.type}
        expanded={expanded}
        selected={selectedId === node.id}
        checked={bulkIds.has(node.id)}
        bulkDisabled={node.parentId === null}
        onBulkToggle={onBulkToggle}
        onToggle={onToggle}
        onSelect={onSelect}
      />
      {expanded && (
        <ul>
          {node.children.map((child) => (
            <FileTree
              key={child.id}
              node={child}
              expandedIds={expandedIds}
              selectedId={selectedId}
              bulkIds={bulkIds}
              onBulkToggle={onBulkToggle}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
