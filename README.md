# VideoSDK File Explorer

A React application backed by a standalone, in-memory JavaScript file explorer SDK. The SDK provides the sample hierarchy, read APIs, validated create, rename, move, and delete operations, search with filtering, sorting, and pagination, undo/redo, and change subscriptions. The React application displays a recursive file tree with folder expansion, single-item selection, create, rename, move, and delete controls, searchable results with filtering, sorting, and pagination, a selected-item details panel, recent activity, and undo/redo controls.

## Technology stack

- React 18 and JavaScript
- Vite, Material UI, Emotion, and CSS
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
Search tests cover nested matching, filtering, sorting, pagination, invalid
options, fresh results after mutations, and protection of internal data.
History tests cover undo/redo for every mutation, nested restoration, branching,
failed operations, no-ops, ID stability, and independent histories.
Subscription tests cover notifications, cleanup, duplicate registration, invalid
listeners, listener errors, and data isolation.
React integration tests cover initial state, SDK-driven updates, undo/redo,
subscription cleanup, StrictMode, SDK replacement, and invalid hook usage.
Tree tests cover recursive expansion, selection, keyboard buttons, SDK-driven
updates, deletion cleanup, and restoration through undo/redo.
Action tests cover creation, renaming, moving, deletion confirmation,
cancellation, validation errors, and stale-form cleanup.
Search UI tests cover controls, pagination boundaries and resets, result
selection, mutation-driven updates, error recovery, and isolated rendering.
Details tests cover file, folder, and root metadata, tree and search selection,
ancestor changes, undo/redo updates, and deletion cleanup.
History and activity UI tests cover button availability, subtree restoration,
branching, historical names, retention, failures, StrictMode, and SDK replacement.
SDK tests use Vitest's Node
environment; React tests use the configured jsdom environment.

## SDK API

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

| Method                         | Parameters                                          | Returns                                                                                                        |
| ------------------------------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `getStructure()`               | None                                                | The complete root folder with nested `children` arrays on folders.                                             |
| `getItem(id)`                  | A non-empty string ID                               | An item record without descendants, or `null` if no item matches. Invalid IDs throw a descriptive `TypeError`. |
| `createFile(parentId, name)`   | Parent folder ID and file name                      | A detached copy of the created file record.                                                                    |
| `createFolder(parentId, name)` | Parent folder ID and folder name                    | A detached copy of the created folder record.                                                                  |
| `renameItem(id, name)`         | Item ID and new name                                | A detached copy of the updated item record.                                                                    |
| `moveItem(id, parentId)`       | Item ID and destination folder ID                   | A detached copy of the updated item record.                                                                    |
| `deleteItem(id)`               | Item ID                                             | A detached copy of the deleted item record, without descendants. All descendants are also deleted.             |
| `search(query, options)`       | Optional query string and search options            | `{ items, total, page, pageSize, totalPages }`. Each item includes its full display `location`.                |
| `canUndo()`                    | None                                                | Whether an operation is available to undo.                                                                     |
| `canRedo()`                    | None                                                | Whether an operation is available to redo.                                                                     |
| `undo()`                       | None                                                | `true` if the previous state was restored, or `false` if undo history is empty.                                |
| `redo()`                       | None                                                | `true` if an undone state was reapplied, or `false` if redo history is empty.                                  |
| `subscribe(listener)`          | A synchronous callback receiving `{ type, itemId }` | An unsubscribe function. Invalid listeners throw a descriptive `TypeError`.                                    |

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

## Search

```js
const result = sdk.search('doc', {
  type: 'file',
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  pageSize: 10,
});

// result.items contains Project Plan.docx with
// location: 'My Files / Documents / Project Plan.docx'.
```

Search performs case-insensitive substring matching on item names across the
complete hierarchy, including the root. The query is trimmed; omitted, empty,
and whitespace-only queries match every item. Queries are literal strings,
not regular expressions, and do not match ancestor paths.

| Option      | Default  | Accepted values                                   |
| ----------- | -------- | ------------------------------------------------- |
| `type`      | `'all'`  | `'all'`, `'file'`, `'folder'`                     |
| `sortBy`    | `'name'` | `'name'`, `'type'`, `'location'`                  |
| `sortOrder` | `'asc'`  | `'asc'`, `'desc'`                                 |
| `page`      | `1`      | Positive safe integer; pages are numbered from 1. |
| `pageSize`  | `10`     | Positive safe integer.                            |

Sorting uses English, case-insensitive comparison. Equal sort values are ordered
by ID, using the same sort direction, to keep pagination deterministic. Filtering
and sorting happen before pagination. `total` counts all matching items, while
`totalPages` is `Math.ceil(total / pageSize)`. No matches produce zero total pages;
a page beyond the last page returns an empty `items` array without clamping the
requested page number.

Each result is a detached item record without descendants, plus a `location`
string containing its full path, including the item name. The root location is
`My Files`. Locations are display labels separated by `/`, not disk paths or
unique identifiers; use item IDs for operations.

Search scans current records on each call, so results and locations reflect
creation, renaming, moving, and deletion immediately. It does not change the
hierarchy or caller options, and previously returned results stay unchanged.
Invalid queries, non-object options, unsupported option names or values, and
invalid pagination values throw descriptive `TypeError`s. Options set to
`undefined` use their defaults.

## Undo and redo

```js
const created = sdk.createFolder('root', 'Archive');
sdk.canUndo(); // true
sdk.undo(); // true; Archive is removed
sdk.getItem(created.id); // null
sdk.canRedo(); // true
sdk.redo(); // true; Archive is restored with its original ID
```

Each successful state-changing creation, rename, move, or deletion records one
snapshot on a private undo stack. A snapshot copies the item `Map`, preserving
records and insertion order. Records are never edited in place and are never
exposed directly, so snapshots can safely share unchanged records. Undo moves
the current state to the redo stack and restores the last undo snapshot; redo
does the reverse. Neither calls mutation methods or creates extra history entries.

Deleting a folder records one history entry regardless of the number of
descendants. Undo restores the complete nested structure, original IDs, and
sibling order. Search uses the restored state immediately, including updated
locations. Root renaming and case-only renaming are also undoable.

A new state-changing mutation after undo clears the entire redo stack. Failed
operations, reads, same-name renames (after trimming), and moves to the current
parent neither add history entries nor clear redo. Empty undo or redo returns
`false` and leaves both stacks unchanged.

The ID counter is not part of snapshots. Redo restores the original IDs, while
new creations never reuse IDs allocated before an undo. Each SDK instance has
its own history. History is kept in memory without a size limit or persistence;
each entry copies all map entries, trading memory for a straightforward and
reliable implementation suited to this assignment.

## Change subscriptions

```js
const unsubscribe = sdk.subscribe(({ type, itemId }) => {
  console.log(type, itemId);
  const updatedTree = sdk.getStructure();
  // Use the updated tree to refresh the consuming application.
});

sdk.renameItem('notes', 'Todo.txt');
// Notifies with { type: 'renameItem', itemId: 'notes' }.

unsubscribe();
```

Callbacks run synchronously, in registration order, after the complete change
and history update. Registration does not immediately invoke the callback;
consumers read the initial state explicitly. Each state-changing operation emits
one event, including deleting a folder with descendants. Reads, failed
operations, no-ops, and empty undo/redo do not notify.

Event `type` is `createFile`, `createFolder`, `renameItem`, `moveItem`,
`deleteItem`, `undo`, or `redo`. `itemId` identifies the directly affected item
for mutations, including a deleted item. Undo and redo use `itemId: null`, since
restoring history can affect an entire subtree. Callbacks can read the SDK to
retrieve the current hierarchy and history availability. Each listener receives
its own event object, containing no references to SDK state.

Listeners are deduplicated by function identity. Registering the same callback
twice still notifies it once; either returned cleanup function removes that
callback. Cleanup can be called repeatedly. A notification uses a snapshot of
the registered callbacks, so subscribing or unsubscribing during delivery takes
effect on subsequent notifications. Subscriptions belong to the SDK instance
and remain registered across undo and redo.

Synchronous callback exceptions are logged with `console.error`; they do not
change the completed operation's result, corrupt history, or prevent later
callbacks from running. Listeners should be synchronous observers that read
state rather than mutate the SDK during delivery. Listener return values are
ignored; asynchronous callbacks and rejected promises are not managed by the
SDK. Consumers must unsubscribe when they no longer need updates.

## React integration

The entry point creates one SDK instance outside the React render lifecycle and
passes it to `FileExplorerProvider`. SDK changes update a shared read snapshot
containing `{ sdk, structure, canUndo, canRedo, activity }`. Consumers access this value
through `useFileExplorer()`; using the hook outside the provider throws a
descriptive error.

```jsx
import { useFileExplorer } from './src/hooks/useFileExplorer.js';

function RootName() {
  const { structure } = useFileExplorer();
  return <h2>{structure.name}</h2>;
}
```

The provider takes `sdk` and `children` props. Keep the SDK instance stable
instead of constructing it during each parent render. Multiple consumers share
one subscription. The effect depends on the SDK instance, unsubscribes during
cleanup, and reconnects if that instance changes. It also refreshes after
subscribing to catch changes between the initial render and effect setup. This
adds one reconciliation update on setup; ordinary parent rerenders keep the same
context value until the next SDK notification. StrictMode's effect replay cleans
up the previous listener before reconnecting.

React stores the SDK's detached read snapshot and a recent activity list here; all file-management
operations still run through the SDK. Consumers should treat snapshots as
read-only and handle SDK errors where actions are initiated. The provider does
not expose setters or duplicate validation, history, or search logic.

## File tree and rendering

`FileExplorer` consumes the SDK snapshot and owns the selected item ID and a set
of expanded folder IDs. The root starts expanded, other folders start collapsed,
and nothing is selected. Expansion and selection have separate native buttons,
with `aria-expanded` and `aria-pressed` exposing their states. Nested lists retain
the hierarchy, and native buttons support Tab, Enter, and Space without a custom
tree keyboard model.

Selecting a folder does not expand it. Collapsing an ancestor hides its
descendants but preserves their selection and expansion. Renaming or moving
items preserves UI state by ID. If the selected item is deleted, directly or
through an ancestor, selection clears. Deleted folder IDs are removed from the
expanded set. Undo restores data without restoring discarded UI selection or
expansion, so restored folders start collapsed. Newly created folders also
start collapsed. A status line identifies the selected item even when hidden
under a collapsed folder.

`FileTree` recursively renders only visible branches and logs
`FileTree render:` with each item's ID. `FileTreeRow` is memoized and receives
primitive item values, expansion and selection booleans, and stable callbacks.
Recursive containers still traverse visible nodes when UI state changes, while
unchanged rows can skip rendering. Selection changes update the old and new
selected rows; folder toggles update that folder's row and mount or unmount its
descendants. SDK mutations replace the read snapshot, but unchanged row props
can still compare equal. No custom deep comparisons or structural-sharing
library is needed.

Use the browser console while expanding, selecting, renaming, creating, and
deleting through the SDK to observe the recursive logs. Development StrictMode
may log render calls more than once; logs reflect render attempts rather than
DOM changes. Search input state stays inside `SearchPanel`, so typing or changing
search options does not rerender the recursive tree. Selecting a search result
updates shared selection and expansion, which does render the tree. Tree state stays inside `FileExplorer`
instead of updating the provider or the rest of the app for every selection.

## File action controls

`FileActions` presents New file, New folder, Rename, Move, and Delete buttons
with inline forms. New items are created inside the selected folder, beside the
selected file, or in the root when nothing is selected. Successful creation
selects the new item and expands its ancestor folders. Move preserves selection
and expands the destination's ancestors. New folders themselves start collapsed.

Rename, Move, and Delete require a selection. Root renaming is allowed, while
root Move and Delete are disabled. Moving uses a folder dropdown with full
locations returned by SDK search, including collapsed and nested folders. The
SDK validates destination conflicts and circular moves; React does not duplicate
those rules. Delete shows an inline confirmation before calling the SDK and
warns that deleting a folder also removes its descendants.

Each submission calls the SDK synchronously. Its subscription updates the tree;
React does not manually edit the file snapshot. Errors appear as alerts while
preserving the current input and selection for correction. Success or Cancel
closes the form. Changing selection or deleting the selected target externally
also closes it, preventing a draft from being applied to another item. Draft
input and errors stay inside `FileActions`, so typing does not rerender the tree.
The current SDK has no asynchronous operations, so no artificial pending state
or delay is introduced.

## Search interface

`SearchPanel` owns query, type filter, sort field, sort direction, page, and page
size state. It delegates matching, filtering, ordering, pagination, and result
locations to `sdk.search()`. `SearchResults` displays each item's name, type, and
full location. Empty and whitespace queries show all items, including the root.
No matches show an empty state; SDK search errors appear as alerts.

Search runs synchronously as controls change. Results are memoized against the
controls and SDK snapshot, so they refresh after mutations, undo, and redo.
There is no debounce or simulated loading state for this in-memory SDK.
Changing any search control or receiving a new SDK snapshot resets pagination
to page 1. Page size defaults to 5 with options for 10 or 20; Previous and Next
buttons are disabled at their boundaries. An empty result set displays page 0
of 0.

Selecting a result reveals its ancestors in the tree and sets the shared
selection, enabling the existing file action controls. It preserves search
input and pagination. Search selection and tree selection highlight the same
item. Search typing and option changes are local to the search panel and do not
change SDK data, add history, or rerender the tree.

## Selected-item details

`DetailsPanel` displays the selected item's name, type, ID, parent folder name,
parent ID, and full location using a semantic definition list. The root explicitly
shows that it has no parent. With no selection, the panel prompts the user to
select a file or folder. The panel sits beside the tree on desktop and stacks
below it on smaller screens; long names and paths wrap within the panel.

The panel receives display props from `FileExplorer` and adds no subscriptions
or independent selection state. Names, parent information, and the display path
are derived from the current SDK snapshot. Tree and search selection therefore
show the same details. Renaming or moving an item or its ancestors refreshes the
panel, as do undo and redo. Collapsing an ancestor leaves selection and details
intact. Deleting the selected item or an ancestor clears details; undo restores
the data without automatically reselecting the deleted item.

Only actual in-memory metadata is shown; file sizes, timestamps, and file content
are not simulated. Viewing details does not change SDK state or history.

## History controls and activity

`HistoryControls` calls `sdk.undo()` and `sdk.redo()` directly and derives disabled
states from the provider's `canUndo` and `canRedo` values. Successful history
changes update the tree, details, search, and activity through the existing SDK
subscription. Synchronous errors appear as alerts and can be retried. No separate
React undo stack or artificial loading state is introduced.

`ActivityPanel` shows the latest 20 SDK change events in reverse chronological
order. Activity is UI state recorded by the provider's existing subscription;
the panel creates no additional subscription. Each mutation records the operation,
item ID, and name at that point in time. Deleted item names come from the prior
read snapshot. Deleting an entire subtree creates one entry. Undo and redo have
their own entries rather than removing earlier activity records, so activity
remains a log of what happened even after branching clears redo history.

Reads, selection, expansion, search changes, failed operations, and no-op
mutations do not create entries. The panel starts empty, does not reconstruct
operations performed before subscription, and resets when the provider receives
a different SDK instance. Activity is not persisted and is independent of the
SDK's undo history; limiting it to 20 entries does not limit undo availability.

This phase has no custom initial-data input or bonus features. Atomic transactions
and multi-selection remain unimplemented. The SDK remains independent of React.

## Styling

Material UI provides the responsive layout, buttons, form inputs, alerts, and
file/folder icons. `src/theme.js` defines the shared colors, typography, and
component defaults. `App` installs the theme and CSS baseline; `src/index.css`
only handles the nested tree lists and minimum viewport width. Fonts use a
system stack and require no external font download.

React and React DOM remain pinned to 18.3.1. `react-is` is also pinned and
overridden to 18.3.1, following the
[Material UI React 18 installation guidance](https://mui.com/material-ui/getting-started/installation/#react-18-and-below).
The styling update preserves SDK behavior, accessible control names, native
destination selection, and the existing feature scope.

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
