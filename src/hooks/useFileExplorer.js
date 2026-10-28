import { useContext } from 'react';
import { FileExplorerContext } from '../context/FileExplorerContext.js';

export function useFileExplorer() {
  const context = useContext(FileExplorerContext);

  if (context === null) {
    throw new Error(
      'useFileExplorer must be used within FileExplorerProvider.',
    );
  }

  return context;
}
