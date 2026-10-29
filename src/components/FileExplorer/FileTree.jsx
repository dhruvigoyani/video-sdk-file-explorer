import { FileTreeRow } from './FileTreeRow.jsx';

export const FileTree = ({
  node,
  expandedIds,
  selectedId,
  bulkIds,
  onBulkToggle,
  onToggle,
  onSelect,
  filterType = 'all',
  sortBy = 'name',
  sortOrder = 'asc',
}) => {
  console.log('FileTree render:', node.id);

  const expanded = node.type === 'folder' && expandedIds.has(node.id);
  // Keep folders as navigation paths when filtering for files.
  const includesMatch = (item) =>
    filterType === 'all' ||
    item.type === filterType ||
    (item.type === 'folder' && item.children.some(includesMatch));
  const children =
    node.type === 'folder'
      ? node.children
          .filter(includesMatch)
          .slice()
          .sort((a, b) => {
            const field = sortBy === 'type' ? 'type' : 'name';
            const comparison =
              a[field].localeCompare(b[field], undefined, {
                sensitivity: 'base',
              }) || a.name.localeCompare(b.name);
            return sortOrder === 'desc' ? -comparison : comparison;
          })
      : [];

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
          {children.map((child) => (
            <FileTree
              key={child.id}
              node={child}
              expandedIds={expandedIds}
              selectedId={selectedId}
              bulkIds={bulkIds}
              onBulkToggle={onBulkToggle}
              onToggle={onToggle}
              onSelect={onSelect}
              filterType={filterType}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
