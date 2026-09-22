# Project Turnstone: Master Document

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
* **Dependencies (via CDN):**
  * `PapaParse` (for robust CSV parsing).
  * `SheetJS (xlsx)` (for parsing and writing XLSX binary files).
  * `localforage` (Optional YAGNI fallback to easily manage IndexedDB for file handles/storage).

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

## 4. agents.md (AI Developer Context & Rules)

If you are an AI agent assisting with Project Turnstone, you must strictly adhere to the following rules:

### Context
Project Turnstone is a vanilla JS single-page application that acts as a split-pane task manager. It reads local/remote CSV/XLSX files, populates a sidebar of task cards, loads URLs into tabbed iframes, and automatically saves progress back to the user's filesystem or browser storage.

### Development Rules
1. **Strictly Vanilla:** Do not introduce bundlers (Webpack, Vite), frameworks (React, Vue), or TypeScript. Stick to pure HTML, CSS, and JS in a single `index.html` file (or linked `.js`/`.css` if file size exceeds reasonable limits).
2. **YAGNI (You Aren't Gonna Need It):** Prefer simple one-liners and native JS methods over complex abstractions. 
3. **No Backends:** This is a zero-server application. Everything lives in the browser and the user's local filesystem.
4. **Iframe Awareness:** Always assume iframes might fail to load due to CORS/`X-Frame-Options`. Provide secondary `<a target="_blank">` escape hatches for all links.
5. **Persistence Handling:** 
   * Chromium: Store the `FileSystemFileHandle` in IndexedDB. Remember to request `verifyPermission()` on reload.
   * Fallback: Track an `isDirty` boolean. If `isDirty` is true and File System Access API is not active, trigger `event.preventDefault()` on `beforeunload`.
6. **Extensive Console Logging:** Every major action, state change, file read, file write, and caught error MUST have a descriptive `console.log()`. 
7. **Code Output:** When outputting code, output the FULL file contents. Do not use snippets like `// ... rest of code`. The PM needs to copy-paste the entire file to test.
8. **Pushback:** If the PM asks to bypass Iframe CORS headers in the web version, push back and remind them that this is impossible in standard browsers and is explicitly slated for the V2 Electron/Extension phase.