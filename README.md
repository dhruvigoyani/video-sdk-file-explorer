# VideoSDK File Explorer

A React application backed by a standalone, in-memory JavaScript file explorer SDK. The SDK foundation provides the sample hierarchy and read APIs. The React application currently displays a heading; mutations and UI features will follow in later commits.

## Technology stack

- React 18 and JavaScript
- Vite and CSS
- Vitest, React Testing Library, jest-dom, user-event, and jsdom

## Installation

Use Node.js 24 LTS and npm.

```sh
npm install
```

## Development

```sh
npm run dev
```

## Tests

```sh
npm test
npm run test:watch
```

SDK foundation tests cover the sample hierarchy, identifiers, retrieval, invalid
IDs, defensive copies, and independent instances. SDK tests use Vitest's Node
environment; React tests use the configured jsdom environment.

## SDK foundation

```js
import { FileExplorerSDK } from './src/sdk/FileExplorerSDK.js';

const sdk = new FileExplorerSDK();
const tree = sdk.getStructure();
const documents = sdk.getItem('documents');
```

Each instance starts with My Files, Documents (Resume.pdf and Project Plan.docx),
Images (Photo.png and Logo.svg), and Notes.txt.

| Method           | Parameters            | Returns                                                                                                        |
| ---------------- | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `getStructure()` | None                  | The complete root folder with nested `children` arrays on folders.                                             |
| `getItem(id)`    | A non-empty string ID | An item record without descendants, or `null` if no item matches. Invalid IDs throw a descriptive `TypeError`. |

The SDK stores item records in a private `Map`, indexed by stable string IDs.
Each record contains `id`, `name`, `type` (`file` or `folder`), and `parentId`.
The root has ID `root` and a `null` parent. Other items reference their parent
folder by ID. Sample IDs are fixed and unique within each instance.

Read methods return fresh copies. `getStructure()` builds a detached hierarchy;
changing its nested objects or arrays cannot change SDK state. Item records
contain only primitive fields, so `getItem()` uses a shallow copy. The SDK has
no React imports and can be used directly from JavaScript.

This phase has no custom initial-data input, mutation methods, search, history,
subscriptions, or bonus features. The React app is not connected to the SDK yet.

## Formatting and Git hooks

```sh
npm run format
npm run format:check
```

Prettier formats project files. The Husky pre-commit hook checks formatting and
blocks commits if formatting needs fixing. Run `npm run format` and review the
changes before staging them.

The `prepare` script installs Git hooks during `npm install`. If Git has not
been initialized yet, run `git init` and then `npm run prepare` to activate hooks.

## Project structure

```text
src/
  sdk/
  components/
    FileExplorer/
    Search/
    DetailsPanel/
    ActivityPanel/
    common/
  hooks/
  context/
  tests/
    sdk/
    components/
    setup.js
  App.jsx
  main.jsx
  index.css
```
