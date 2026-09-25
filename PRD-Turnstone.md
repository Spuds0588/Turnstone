# Project Turnstone: Master Document

> **Status: the original V1 specification, kept as written.** It is the design this project started
> from, and it is deliberately frozen rather than rewritten — the reasoning behind every change since
> is in [`history.md`](history.md). Two things below are now historical and would mislead a reader who
> took them as current: the application is **`app.html`** (`index.html` is the site's landing page),
> and dependencies are **vendored under `vendor/`, never loaded from a CDN** — the app runs under
> `default-src 'none'`. For what the product is today, read [`README.md`](README.md); for the rules an
> agent is held to, [`agents.md`](agents.md); for what is built versus planned, [`todo.md`](todo.md).

## 1. Product Requirements Document (PRD)

### 1.1 Overview & Problem Statement
Data processors working with lists of URLs suffer from context switching, constantly bouncing between a spreadsheet and multiple browser tabs. 
**Project Turnstone** is a zero-server, browser-based SPA that transforms a local CSV/XLSX file into a high-speed workspace. It features a left-hand sidebar containing actionable task cards and a right-hand workspace utilizing tabbed iframes. Users can process links in a single-surface environment, update statuses/notes, and seamlessly write data back to the local file (or local storage as a fallback).

### 1.2 Target Audience
Data entry specialists, QA testers, content moderators, and list-processors who need to rapidly iterate through hundreds of URLs without breaking their flow state.

### 1.3 Scope
* **In Scope (V1 Web SPA):**
  * Local file selection (CSV and XLSX).
  * Remote file loading via URL parameters (e.g., `?file=https://domain.com/data.csv`).
  * Split-pane UI: Task Sidebar (Left) + Multi-Tab Iframe Workspace (Right).
  * 1-Click loading of URLs into iframes, with a fallback "Open in New Tab" button (to bypass `X-Frame-Options` restrictions).
  * Search bar with keyword highlighting and task filtering.
  * Filters (e.g., "Hide Completed").
  * 1-Click "Copy to Clipboard" icons on all card data fields.
  * Inputs for "Status" (Complete/Incomplete) and "Notes" with auto-save.
  * **Chromium Native:** Live, silent write-back to the local file via the File System Access API. File handles stored in IndexedDB to support auto-loading last-used files and quick-switching between recents.
  * **Fallback Mode (Non-Chromium/Safari/Firefox):** Session persistence via `localStorage`/IndexedDB. Export via "Download CSV/XLSX" button. Strict `beforeunload` warnings to prevent accidental data loss before exporting.
* **Future Scope (V2 Chrome Extension & Electron App):**
  * Bypass Iframe CORS / `X-Frame-Options` headers natively.
  * Persistent local file access without requiring user re-authorization prompts.
  * Direct saving/syncing to Google Drive and OneDrive.

### 1.4 Core User Flow
1. User opens `index.html`.
2. App checks IndexedDB for previous file handles. If found, prompts user to click "Restore Workspace".
3. If new, user loads a file via Local Picker or URL parameter.
4. Left sidebar populates with task cards. User filters out "Completed" tasks.
5. User clicks a URL. It opens in a right-side iframe tab. User can open multiple tabs and switch between them.
6. User reviews the iframe, changes status to "Complete", and adds a note.
7. System auto-saves instantly to the local file (or local storage).
8. (Fallback Mode) If trying to close the window without exporting, a browser warning halts them.

---

## 2. Implementation Guide

### 2.1 Architecture & Stack
* **Frontend:** Vanilla HTML/CSS/JavaScript (YAGNI approach).
* **Styling:** CSS Flexbox/Grid for the Split-Pane layout and Tabs.
* **Dependencies — superseded: vendored, never CDN.** PapaParse and SheetJS are the two that survived
  and both live in [`vendor/`](vendor/README.md) with recorded hashes; `localforage` was dropped in
  favour of IndexedDB and `localStorage` directly. The app declares `default-src 'none'`, so a CDN
  reference is not a preference here, it is a policy violation. *(Original text: `PapaParse`,
  `SheetJS (xlsx)` and an optional `localforage` loaded from a CDN.)*

### 2.2 Data Flow & Persistence Management
1. **File Handle Storage:** The `FileSystemFileHandle` object *can* be stored in IndexedDB. On page reload, we retrieve the handle. The browser will require a user gesture (a click) to call `verifyPermission({mode: 'readwrite'})` to re-establish the connection without picking the file again.
2. **In-Memory State:** Data is held in a 2D array. The DOM heavily relies on data-attributes (e.g., `data-row-index="4"`) to map inputs back to the array.
3. **Fallback Mode:** If `window.showOpenFilePicker` is undefined, we read the file using standard `<input type="file">`. Every row update is saved to `localStorage` (or IndexedDB for larger files). An "Export Progress" button generates a Blob for download.
4. **Iframe Constraints:** Many modern websites use `X-Frame-Options: DENY`. We **cannot** bypass this in a pure web SPA. Every task card must have an "Open in Iframe" primary button, and an "Open in New Window" secondary icon for incompatible links.

---

## 3. Developer Task List

### Phase 1: Core Setup, Parsing, & URL Params
- [ ] Task 1.1: Initialize boilerplate with PapaParse and SheetJS.
- [ ] Task 1.2: Implement `window.showOpenFilePicker` (Chromium) and `<input type="file">` (Fallback).
- [ ] Task 1.3: Implement logic to parse `?file=` from URL parameters and `fetch()` the remote file.
- [ ] Task 1.4: Normalize parsed data into a standard 2D JavaScript Array.

### Phase 2: Split-Pane UI & Task Cards
- [ ] Task 2.1: Build Layout (Left Sidebar 30vw, Right Workspace 70vw).
- [ ] Task 2.2: Render Task Cards in the sidebar with Status dropdown, Notes textarea, and Copy-to-Clipboard icons.
- [ ] Task 2.3: Implement Search Bar (filter array, highlight text) and "Hide Completed" toggle.

### Phase 3: Tabbed Iframe Workspace
- [ ] Task 3.1: Build the top Tab bar in the right workspace.
- [ ] Task 3.2: Implement `openInIframe(url, rowId)` to create a new tab and iframe. 
- [ ] Task 3.3: Handle tab switching logic (hide/show active iframes without reloading them).
- [ ] Task 3.4: Add "Open in New Tab" fallback mechanism for sites that block iframes.

### Phase 4: Write-Back Engine & Persistence
- [ ] Task 4.1: Implement Debounced Auto-Save to the active `fileHandle`.
- [ ] Task 4.2: Implement IndexedDB storage of `FileSystemFileHandle` to allow "Recent Files" jumping and auto-loading.
- [ ] Task 4.3: Implement Fallback Data Engine (save to IndexedDB, export via Blob).
- [ ] Task 4.4: Add `window.addEventListener('beforeunload')` logic for Fallback mode to prevent data loss.

---

## 4. AI Developer Context & Rules

These rules used to be duplicated here. They are **not** any more: the live version is
[`agents.md`](agents.md), because two copies of a rule set is how a rule set goes stale — and this
one did. Read that file; the PRD's contribution to it is the intent behind the original eight rules
(vanilla, YAGNI, no backend, iframe awareness, persistence, logging, complete files, pushback),
which still hold where they do not contradict the app as built.