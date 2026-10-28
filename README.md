# VideoSDK File Explorer

A React application backed by a standalone, in-memory JavaScript file explorer SDK. The SDK provides the sample hierarchy, read APIs, and validated create, rename, move, and delete operations. The React application currently displays a heading; UI features will follow in later commits.

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
IDs, defensive copies, and independent instances. Mutation tests cover file and
folder operations, validation failures, circular moves, and nested deletion.
SDK tests use Vitest's Node
environment; React tests use the configured jsdom environment.

## SDK foundation

```js
import { FileExplorerSDK } from './src/sdk/FileExplorerSDK.js';

const sdk = new FileExplorerSDK();
const tree = sdk.getStructure();
const documents = sdk.getItem('documents');

const projects = sdk.createFolder(documents.id, 'Projects');
const task = sdk.createFile(projects.id, 'Task.txt');
sdk.renameItem(task.id, 'Todo.txt');
sdk.moveItem(task.id, 'images');
sdk.deleteItem(projects.id);
```

Each instance starts with My Files, Documents (Resume.pdf and Project Plan.docx),
Images (Photo.png and Logo.svg), and Notes.txt.

| Method                         | Parameters                        | Returns                                                                                                        |
| ------------------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `getStructure()`               | None                              | The complete root folder with nested `children` arrays on folders.                                             |
| `getItem(id)`                  | A non-empty string ID             | An item record without descendants, or `null` if no item matches. Invalid IDs throw a descriptive `TypeError`. |
| `createFile(parentId, name)`   | Parent folder ID and file name    | A detached copy of the created file record.                                                                    |
| `createFolder(parentId, name)` | Parent folder ID and folder name  | A detached copy of the created folder record.                                                                  |
| `renameItem(id, name)`         | Item ID and new name              | A detached copy of the updated item record.                                                                    |
| `moveItem(id, parentId)`       | Item ID and destination folder ID | A detached copy of the updated item record.                                                                    |
| `deleteItem(id)`               | Item ID                           | A detached copy of the deleted item record, without descendants. All descendants are also deleted.             |

The SDK stores item records in a private `Map`, indexed by stable string IDs.
Each record contains `id`, `name`, `type` (`file` or `folder`), and `parentId`.
The root has ID `root` and a `null` parent. Other items reference their parent
folder by ID. Sample IDs are fixed and unique within each instance.
New items receive sequential IDs (`item-1`, `item-2`, etc.) unique within that
instance. Deleted IDs are not reused during the instance's lifetime. IDs are
preserved when renaming or moving an item.

Read methods return fresh copies. `getStructure()` builds a detached hierarchy;
changing its nested objects or arrays cannot change SDK state. Item records
contain only primitive fields, so `getItem()` uses a shallow copy. The SDK has
no React imports and can be used directly from JavaScript.

Mutation methods validate inputs before changing state. Names must be non-empty
strings and are trimmed before storage. Files and folders share one
case-insensitive namespace within each parent folder; the same name is allowed
in different folders. No additional disk-specific naming restrictions apply to
this in-memory model.

Invalid IDs or names throw a descriptive `TypeError`. Unknown mutation targets,
non-folder parents, duplicate names, and invalid moves throw a descriptive
`Error`. Failures leave the hierarchy unchanged. Folders cannot move into
themselves or any descendant. The root can be renamed but cannot be moved or
deleted. Moving to the current parent and renaming to the current name are
allowed and leave the hierarchy unchanged. Case-only renaming is allowed.

Mutations replace changed records rather than editing them in place. All returned
records and previously retrieved hierarchies remain detached. Deletion walks
descendants iteratively, avoiding recursive call-stack limits. Reads and
validation favor straightforward scans over additional indexes for this small,
in-memory assignment.

This phase has no custom initial-data input, search, history,
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
