import { useEffect, useState } from 'react';
import { FileExplorerContext } from './FileExplorerContext.js';

const readSnapshot = (sdk) => {
  return {
    sdk,
    structure: sdk.getStructure(),
    canUndo: sdk.canUndo(),
    canRedo: sdk.canRedo(),
    activity: [],
  };
};

export const FileExplorerProvider = ({ sdk, children }) => {
  const [snapshot, setSnapshot] = useState(() => readSnapshot(sdk));

  useEffect(() => {
    const updateSnapshot = (event) => {
      const next = readSnapshot(sdk);
      const changedItem = event?.itemId ? sdk.getItem(event.itemId) : null;

      setSnapshot((previous) => {
        const activity = previous.sdk === sdk ? previous.activity : [];
        if (!event) {
          return { ...next, activity };
        }

        // Deleted items are absent from the SDK, but still exist in the prior snapshot.
        let name = changedItem?.name;
        if (!name && event.itemId && previous.sdk === sdk) {
          const pending = [previous.structure];
          while (pending.length > 0) {
            const item = pending.pop();
            if (item.id === event.itemId) {
              name = item.name;
              break;
            }
            if (item.type === 'folder') pending.push(...item.children);
          }
        }

        const entry = {
          id: (activity[0]?.id ?? 0) + 1,
          type: event.type,
          itemId: event.itemId,
          name: name ?? event.itemId,
        };
        return { ...next, activity: [entry, ...activity].slice(0, 20) };
      });
    };
    const unsubscribe = sdk.subscribe(updateSnapshot);

    // Catch changes between the initial render and subscribing.
    updateSnapshot();
    return unsubscribe;
  }, [sdk]);

  return (
    <FileExplorerContext.Provider value={snapshot}>
      {children}
    </FileExplorerContext.Provider>
  );
};
