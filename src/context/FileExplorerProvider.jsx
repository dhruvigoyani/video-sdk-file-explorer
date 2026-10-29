import { useEffect, useState } from 'react';
import { FileExplorerContext } from './FileExplorerContext.js';

const readSnapshot = (sdk) => {
  return {
    sdk,
    structure: sdk.getStructure(),
    canUndo: sdk.canUndo(),
    canRedo: sdk.canRedo(),
  };
};

export const FileExplorerProvider = ({ sdk, children }) => {
  const [snapshot, setSnapshot] = useState(() => readSnapshot(sdk));

  useEffect(() => {
    const updateSnapshot = () => setSnapshot(readSnapshot(sdk));
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
