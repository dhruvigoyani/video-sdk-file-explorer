# Submission review

This review maps the implementation to the root [requirements](../REQUIREMENT.md).
It is a source review and manual verification guide, not a record of passing
runtime tests. Tests and production builds were intentionally left unrun during
implementation. Browser interaction and render observations are also pending.

## Requirement mapping

| Requirement                                                                  | Implementation                                                   | Automated coverage under `src/tests/`                                                           |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Standalone JavaScript SDK, hierarchy, IDs, parent references, detached reads | `src/sdk/FileExplorerSDK.js`                                     | `sdk/FileExplorerSDK.test.js`                                                                   |
| Create, rename, move, delete, name validation, circular-move prevention      | SDK mutation methods                                             | `sdk/FileExplorerSDK.mutations.test.js`                                                         |
| Nested case-insensitive search, filtering, sorting, pagination, locations    | SDK `search()` and `src/components/Search/`                      | `sdk/FileExplorerSDK.search.test.js`, `components/SearchPanel.test.jsx`                         |
| Undo/redo, nested restoration, failed-operation history isolation            | SDK history methods                                              | `sdk/FileExplorerSDK.history.test.js`                                                           |
| Change notifications, unsubscribe, listener isolation                        | SDK `subscribe()`                                                | `sdk/FileExplorerSDK.subscriptions.test.js`                                                     |
| React integration, one subscription, cleanup, StrictMode behavior            | Provider and `useFileExplorer()`                                 | `components/FileExplorerProvider.test.jsx`                                                      |
| Recursive tree, expand/collapse, active selection, state cleanup             | `src/components/FileExplorer/`                                   | `components/FileExplorer.test.jsx`                                                              |
| Action controls and meaningful errors                                        | `FileActions.jsx`                                                | `components/FileActions.test.jsx`                                                               |
| Selected-item details                                                        | `DetailsPanel.jsx`                                               | `components/DetailsPanel.test.jsx`                                                              |
| Undo/redo controls and recent activity                                       | `HistoryControls.jsx`, `ActivityPanel.jsx`                       | `components/HistoryAndActivity.test.jsx`                                                        |
| Bonus: atomic transactions                                                   | SDK `transaction()`                                              | `sdk/FileExplorerSDK.transactions.test.js`                                                      |
| Bonus: multi-selection and transactional bulk deletion                       | Tree checkboxes and `BulkActions.jsx`                            | `components/BulkActions.test.jsx`                                                               |
| Render logging and performance explanation                                   | Recursive `FileTree` log, memoized rows, local form/search state | Rendering isolation scenario in `components/SearchPanel.test.jsx`; browser observations pending |
| Install, run, API examples, architecture, history, bonuses, limitations      | Root `README.md`                                                 | Documentation reviewed against source                                                           |

## Commands for manual verification

From the project root, using Node.js 24 and npm:

```sh
npm ci
npm run format:check
npm test
npm run dev
```

`npm ci` uses the committed lockfile and runs the Husky prepare script. On Windows,
use `npm.cmd` if PowerShell blocks `npm.ps1`. Run the following separately when
ready to validate production output:

```sh
npm run build
npm run preview
```

The build command has not been executed as part of this commit. A ZIP submission
should include source, tests, configuration, requirements, documentation, and the
lockfile; exclude `node_modules`, generated build output, local environment files,
and Git metadata.

## Browser checks to perform

Each item below describes expected behavior, not an observed result.

1. Open the application. The root is expanded; nested folders are collapsed.
   Expand Documents, select Resume.pdf, and verify its details and parent path.
   Collapse Documents and confirm details retain the hidden active selection.
2. Create a folder and file, rename an item, and move it to a nested destination.
   Verify the tree, details, search results, and activity update together.
3. Try an empty name, case-insensitive duplicate name, and a move into a folder's
   descendant. Verify an error appears without losing input or changing data.
4. Delete Documents and undo once. Verify all descendants return. Redo deletion,
   then undo and make a new change; Redo should become disabled.
5. Search with mixed casing, switch file/folder filters, reverse sorting, and
   paginate. Select a nested result and verify it is revealed in the tree.
   Change the query or mutate data while on a later page; pagination resets.
6. Check items from different folders, collapse a selected branch, and verify the
   bulk count persists. Include an ancestor and descendant, confirm bulk delete,
   and verify one undo restores the batch. Root bulk selection stays disabled.
7. Verify Cancel leaves data unchanged. Exercise a failed bulk transaction in the
   automated suite and verify selection remains available for retry.
8. Use Tab, Enter, and Space on native controls. At narrow viewport widths, verify
   forms remain usable, details stack below the tree, and long names wrap.
9. Refresh the page and verify the sample data returns; persistence is outside the
   in-memory assignment scope.

## Rendering observations to record

Open the browser console and filter for `FileTree render:`. The following are
expectations based on component structure; record actual results during review.

| Action                | Expected behavior                                                                  |
| --------------------- | ---------------------------------------------------------------------------------- |
| Expand/collapse       | Visible recursive containers render; descendants mount or unmount.                 |
| Select a file         | Active selection and details update; unchanged memoized rows can skip rendering.   |
| Create/rename         | SDK notification replaces the read snapshot; affected row values update.           |
| Delete a folder       | Descendants unmount; stale active, expanded, and checked IDs are pruned.           |
| Type a search query   | Search panel updates locally without recursive-tree logs.                          |
| Check a bulk checkbox | Checked state changes; primitive props let unchanged memoized rows skip rendering. |

Recursive logs measure render attempts, not DOM commits. Enabling React
StrictMode can repeat development renders and effects; the current entry point
does not enable it. The integration suite explicitly exercises StrictMode cleanup.

## Remaining verification

- [ ] Full automated suite executed and any failures addressed.
- [ ] Production build and preview verified.
- [ ] Browser checks completed on desktop and a narrow viewport.
- [ ] Render behavior observed and recorded against the expectations above.

Both bonus features are implemented. Known limitations and architecture tradeoffs
are documented in the README; passing runtime verification is not claimed here.
