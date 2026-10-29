import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { FileExplorerProvider } from './context/FileExplorerProvider.jsx';
import { FileExplorerSDK } from './sdk/FileExplorerSDK.js';
import './index.css';

const sdk = new FileExplorerSDK();

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
    <FileExplorerProvider sdk={sdk}>
      <App />
    </FileExplorerProvider>
  // </React.StrictMode>,
);
