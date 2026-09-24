(function(){
/* Turnstone bookmarklet — "core" variant, generated 2026-09-24T18:51:18.785Z
   from app.html @ 6b2d605 + uncommitted changes. Regenerate with: node ports/bookmarklet/build.js --variant core
   Lines are %0A-encoded at the end of the build; everything above is app.html. */
'use strict';
var __TS_BMK__ = { variant: "core", libs: ["papa-shim","xlsx-shim"],
  blurb: "no libraries — the above plus read-only XLSX",
  css: "\n  /* Theme tokens — dark is the default; <html data-theme=\"light\"> flips the palette. */\n  :host {\n    color-scheme: dark;\n    --bg: #0f1115;\n    --panel: #171a21;\n    --panel-2: #1d212b;\n    --border: #262b36;\n    --text: #e6e9ef;\n    --muted: #8b93a5;\n    --accent: #7aa2ff;\n    --accent-dark: #5a82e0;\n    --green: #3fb970;\n    --amber: #f5c542;\n    --danger: #e5534b;\n    --sidebar-w: 340px;\n    --mark-bg: #f5c542;\n    --mark-fg: #16181d;\n    --pane-bg: #ffffff;\n    --done-border: #2c4a38;\n    --done-strike: #3a5c47;\n  }\n  :host([data-theme=\"light\"]) {\n    color-scheme: light;\n    --bg: #f4f6fa;\n    --panel: #ffffff;\n    --panel-2: #eef1f7;\n    --border: #d5dbe6;\n    --text: #1c2330;\n    --muted: #64708a;\n    --accent: #3b66d0;\n    --accent-dark: #2f57bb;\n    --green: #1e8e4e;\n    --amber: #a87b0a;\n    --danger: #c93c34;\n    --mark-bg: #ffd54d;\n    --mark-fg: #1c2330;\n    --pane-bg: #ffffff;\n    --done-border: #b5dfc4;\n    --done-strike: #7fae91;\n  }\n  * { box-sizing: border-box; }\n  #ts-app { height: 100%; }\n  #ts-app {\n    flex: 1 1 auto; min-height: 0;\n    margin: 0;\n    background: var(--bg);\n    color: var(--text);\n    font: 13px/1.45 system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif;\n    display: flex;\n    overflow: hidden;\n  }\n  .btn {\n    background: var(--panel-2); color: var(--text);\n    border: 1px solid var(--border); border-radius: 6px;\n    padding: 5px 11px; font-size: 12px; cursor: pointer; white-space: nowrap;\n  }\n  .btn:hover { border-color: var(--accent-dark); }\n  .btn:disabled { opacity: .45; cursor: default; }\n  .btn.primary { background: var(--accent-dark); border-color: var(--accent-dark); color: #fff; }\n  .btn.primary:hover { background: var(--accent); }\n\n  /* ---------- Sidebar header: hamburger + file name (replaces the old topbar) ---------- */\n  #side-head {\n    flex: 0 0 auto;\n    display: flex; align-items: center; gap: 8px;\n    padding: 8px 10px; border-bottom: 1px solid var(--border);\n    background: var(--panel);\n  }\n  #btn-menu {\n    flex: 0 0 auto; width: 30px; height: 30px; border-radius: 7px;\n    border: 1px solid var(--border); background: var(--panel-2); color: var(--text);\n    font-size: 15px; cursor: pointer; line-height: 1;\n  }\n  #btn-menu:hover { border-color: var(--accent-dark); }\n  #head-name {\n    flex: 1 1 auto; min-width: 0; font-size: 12px; color: var(--text);\n    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\n  }\n  #head-name .no-file { color: var(--muted); }\n  #head-save { flex: 0 0 auto; font-size: 10.5px; color: var(--muted); white-space: nowrap; }\n  #head-save.dirty { color: var(--amber); }\n  #head-save.saved { color: var(--green); }\n\n  /* ---------- Hamburger dropdown ---------- */\n  #menu {\n    position: fixed; top: 44px; z-index: 120;\n    width: 260px; max-height: 80vh; overflow-y: auto;\n    background: var(--panel); border: 1px solid var(--border); border-radius: 10px;\n    box-shadow: 0 10px 30px rgba(0,0,0,.35); padding: 6px;\n  }\n  #menu[hidden] { display: none; }\n  .menu-item {\n    display: flex; align-items: center; gap: 9px; width: 100%; text-align: left;\n    background: none; border: none; color: var(--text); padding: 8px 9px;\n    border-radius: 7px; cursor: pointer; font-size: 12.5px;\n  }\n  .menu-item:hover { background: var(--panel-2); }\n  .menu-item:disabled { opacity: .4; cursor: default; }\n  .menu-item:disabled:hover { background: none; }\n  .menu-item .mi { flex: 0 0 20px; text-align: center; }\n  .menu-sep { height: 1px; background: var(--border); margin: 5px 4px; }\n  .menu-label { font-size: 10px; letter-spacing: .8px; text-transform: uppercase; color: var(--muted); padding: 7px 9px 3px; }\n  .mode-item.checked::after { content: \"✓\"; margin-left: auto; color: var(--green); font-weight: 700; }\n\n  /* ---------- Split pane: workspace LEFT, sidebar RIGHT (approved deviation) ---------- */\n  #app {\n    flex: 1 1 auto;\n    display: grid;\n    grid-template-columns: 1fr var(--sidebar-w);\n    min-height: 0;\n  }\n\n  /* ---------- Workspace (left) ---------- */\n  #workspace { display: flex; flex-direction: column; min-width: 0; min-height: 0; }\n  #tabbar {\n    flex: 0 0 auto;\n    display: flex; align-items: stretch; gap: 2px;\n    background: var(--panel);\n    border-bottom: 1px solid var(--border);\n    padding: 4px 6px 0;\n    overflow-x: auto;\n    min-height: 36px;\n  }\n  #tabbar.hidden-mode { display: none; }\n  #tabbar:empty::after {\n    content: \"Tabs mode — click a task card to open it here\";\n    color: var(--muted); font-size: 11.5px; align-self: center; padding: 0 8px 6px;\n  }\n  .tab {\n    display: flex; align-items: center; gap: 6px;\n    padding: 6px 8px 6px 12px;\n    background: var(--bg);\n    border: 1px solid var(--border); border-bottom: none;\n    border-radius: 8px 8px 0 0;\n    max-width: 220px; cursor: pointer; user-select: none;\n    color: var(--muted);\n  }\n  .tab.active { background: var(--panel-2); color: var(--text); border-color: var(--accent-dark); }\n  .tab .tab-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }\n  .tab .tab-ext, .tab .tab-close {\n    flex: 0 0 auto; border: none; background: none; color: var(--muted);\n    cursor: pointer; font-size: 12px; padding: 1px 3px; border-radius: 4px; text-decoration: none;\n  }\n  .tab .tab-ext:hover, .tab .tab-close:hover { color: var(--text); background: var(--border); }\n  #panes { flex: 1 1 auto; position: relative; min-height: 0; background: var(--bg); }\n  .pane { position: absolute; inset: 0; display: none; }\n  .pane.active { display: block; }\n  .pane iframe { width: 100%; height: 100%; border: 0; background: var(--pane-bg); }\n  #pane-hint {\n    flex: 0 0 auto; padding: 4px 12px; font-size: 11px; color: var(--muted);\n    border-top: 1px solid var(--border); background: var(--panel);\n  }\n  #welcome {\n    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;\n    padding: 24px;\n  }\n  #welcome .box { max-width: 460px; width: 100%; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 26px; }\n  #welcome h1 { margin: 0 0 2px; font-size: 19px; display: flex; align-items: center; gap: 8px; }\n  #welcome h1 .logo { width: 17px; height: 17px; vertical-align: -2.5px; }\n  #welcome h1 .logo img { display: block; width: 100%; height: 100%; }\n  #welcome h1 .logo img.light { display: none; }\n  :host([data-theme=\"light\"]) #welcome h1 .logo img.light { display: block; }\n  :host([data-theme=\"light\"]) #welcome h1 .logo img.dark { display: none; }\n  #welcome .tagline { margin: 0 0 16px; color: var(--muted); font-size: 12px; }\n  #welcome p { margin: 0 0 16px; color: var(--muted); }\n  #welcome .row { display: flex; gap: 8px; margin-bottom: 10px; }\n  /* Primary start affordance: drop a file on it, or click to pick one. */\n  #dropzone {\n    display: flex; flex-direction: column; align-items: center; gap: 3px;\n    text-align: center; padding: 20px 16px; margin: 0 0 12px;\n    border: 1.5px dashed var(--border); border-radius: 10px; background: var(--bg);\n    cursor: pointer; transition: border-color .15s, background .15s;\n  }\n  #dropzone:hover { border-color: var(--accent-dark); }\n  #dropzone:focus-visible { outline: 2px solid var(--accent-dark); outline-offset: 2px; }\n  #dropzone.over { border-color: var(--accent-dark); background: var(--panel-2); }\n  #dropzone .dz-icon { font-size: 20px; line-height: 1; color: var(--accent-dark); }\n  #dropzone .dz-main { font-size: 13px; font-weight: 600; }\n  #dropzone .dz-sub { font-size: 11.5px; color: var(--muted); }\n  #dropzone .dz-formats { font-size: 10.5px; color: var(--muted); letter-spacing: .3px; margin-top: 3px; }\n  #cap-notice {\n    font-size: 11.5px; color: var(--muted); text-align: center;\n    border: 1px solid var(--border); border-radius: 8px; padding: 7px 10px; margin: -4px 0 12px; background: var(--panel-2);\n  }\n  #cap-notice b { color: var(--text); }\n  #welcome .or { font-size: 11px; color: var(--muted); text-align: center; margin: 0 0 12px; }\n  #welcome input[type=text] {\n    flex: 1; background: var(--bg); color: var(--text);\n    border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; font-size: 12.5px;\n  }\n  #recents { margin-top: 16px; }\n  #recents h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .8px; color: var(--muted); margin: 0 0 6px; }\n  .recent-item {\n    display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;\n    background: none; border: none; color: var(--text); padding: 6px 4px; border-radius: 6px; cursor: pointer; font-size: 12.5px;\n  }\n  .recent-item:hover { background: var(--panel-2); }\n  .recent-item .ts { margin-left: auto; color: var(--muted); font-size: 11px; }\n\n  /* ---------- Sidebar (right) ---------- */\n  #sidebar {\n    display: flex; flex-direction: column; min-height: 0;\n    background: var(--panel); border-left: 1px solid var(--border);\n  }\n  #filters { flex: 0 0 auto; padding: 10px 10px 8px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }\n  #search {\n    width: 100%; background: var(--bg); color: var(--text);\n    border: 1px solid var(--border); border-radius: 6px; padding: 7px 10px; font-size: 12.5px;\n  }\n  #search:focus, #welcome input:focus { outline: none; border-color: var(--accent-dark); }\n  #filter-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); }\n  #filter-row label { display: flex; align-items: center; gap: 5px; cursor: pointer; }\n  #sort-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }\n  #sort-row select {\n    flex: 1; background: var(--bg); color: var(--text); border: 1px solid var(--border);\n    border-radius: 6px; padding: 4px 6px; font-size: 11.5px; cursor: pointer; min-width: 0;\n  }\n  #sort-dir {\n    flex: 0 0 auto; width: 28px; padding: 4px 0; background: var(--bg); color: var(--text);\n    border: 1px solid var(--border); border-radius: 6px; font-size: 12px; cursor: pointer;\n  }\n  #sort-dir:hover { border-color: var(--accent-dark); }\n  #cards { flex: 1 1 auto; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }\n  #cards .empty { color: var(--muted); text-align: center; padding: 30px 10px; font-size: 12px; }\n  #sidebar-footer {\n    flex: 0 0 auto; padding: 7px 12px; border-top: 1px solid var(--border);\n    color: var(--muted); font-size: 11.5px; display: flex; gap: 10px;\n  }\n  #sidebar-footer .done { color: var(--green); }\n\n  .card {\n    background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px;\n    padding: 9px 10px; display: flex; flex-direction: column; gap: 7px;\n  }\n  .card.done { border-color: var(--done-border); }\n  .card.done .card-title { color: var(--muted); text-decoration: line-through; text-decoration-color: var(--done-strike); }\n  .card.done { opacity: .82; }\n  .card-top { display: flex; align-items: flex-start; gap: 6px; }\n  .card-title {\n    flex: 1; background: none; border: none; color: var(--text); text-align: left;\n    font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 0; word-break: break-word;\n  }\n  .card-title:hover { color: var(--accent); }\n  .icon {\n    display: inline-flex; align-items: center; justify-content: center;\n    min-width: 20px; height: 20px; padding: 0 4px;\n    border: none; border-radius: 4px; background: none; color: var(--muted);\n    cursor: pointer; font-size: 12px; text-decoration: none;\n  }\n  .icon:hover { color: var(--text); background: var(--border); }\n  .icon.ok { color: var(--green); }\n  .card-url { display: flex; align-items: center; gap: 4px; font-size: 11.5px; }\n  .card-url a { color: var(--accent); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }\n  .card-url a:hover { text-decoration: underline; }\n  .card-mid { display: flex; gap: 6px; align-items: center; }\n  .btn-done {\n    flex: 1; background: var(--bg); color: var(--green); border: 1px solid var(--done-border);\n    border-radius: 6px; padding: 5px 8px; font-size: 12px; cursor: pointer;\n  }\n  .btn-done:hover { background: var(--done-border); color: #fff; }\n  .btn-undo {\n    flex: 1; background: none; color: var(--muted); border: 1px dashed var(--border);\n    border-radius: 6px; padding: 4px 8px; font-size: 11.5px; cursor: pointer; opacity: .75;\n  }\n  .btn-undo:hover { opacity: 1; color: var(--text); border-color: var(--muted); }\n  .card-notes { display: flex; flex-direction: column; gap: 3px; }\n  .card-notes .label { display: flex; align-items: center; gap: 4px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); }\n  .card-notes textarea {\n    background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 6px;\n    padding: 5px 7px; font-size: 12px; font-family: inherit; resize: vertical; min-height: 34px;\n  }\n  .card-notes textarea:focus { outline: none; border-color: var(--accent-dark); }\n  mark { background: var(--mark-bg); color: var(--mark-fg); border-radius: 2px; padding: 0 1px; }\n\n  /* Inline copy icons sit right after the value they copy; revealed on hover\n     of the card (always visible on touch devices, or right after a copy). */\n  #cards .copy { opacity: 0; transition: opacity .12s; }\n  #cards .card:hover .copy, #cards .copy:focus-visible, #cards .copy.ok { opacity: 1; }\n  @media (hover: none) { #cards .copy { opacity: 1; } }\n\n  /* Data-column rows (collapsed cards show the first 3; expanding shows all). */\n  .col-row { display: flex; align-items: baseline; gap: 5px; font-size: 11.5px; min-width: 0; }\n  .col-row .ck { flex: 0 0 auto; color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }\n  .col-row .cv { flex: 1 1 auto; color: var(--text); word-break: break-word; min-width: 0; }\n  .col-row .emptyv { color: var(--muted); }\n  .col-more {\n    align-self: flex-start; background: none; border: none; color: var(--accent);\n    font-size: 11px; cursor: pointer; padding: 1px 0;\n  }\n  .col-more:hover { text-decoration: underline; }\n  .card.ex .col-more { color: var(--muted); }\n\n  /* Column settings overlay */\n  #settings-overlay {\n    position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 200;\n    display: flex; align-items: center; justify-content: center; padding: 20px;\n  }\n  #settings-overlay[hidden] { display: none; }\n  #settings-box {\n    background: var(--panel); color: var(--text); border: 1px solid var(--border);\n    border-radius: 12px; padding: 18px; width: 400px; max-width: 94vw; max-height: 86vh; overflow-y: auto;\n  }\n  #settings-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }\n  #settings-head h2 { margin: 0; font-size: 15px; }\n  #settings-box .hint { font-size: 11px; color: var(--muted); margin: 6px 0; }\n  #settings-cols { display: flex; flex-direction: column; gap: 4px; margin: 8px 0; }\n  .set-col {\n    display: flex; align-items: center; gap: 8px; padding: 6px 8px;\n    background: var(--bg); border: 1px solid var(--border); border-radius: 6px; font-size: 12.5px;\n  }\n  .set-col.fixed { color: var(--muted); }\n  .set-col.fixed em { font-style: normal; font-size: 10.5px; opacity: .85; }\n  .set-col .drag { cursor: grab; color: var(--muted); font-size: 12px; user-select: none; }\n  .set-col.fixed .drag { cursor: default; opacity: .5; }\n  .set-col.dragging { opacity: .5; }\n  .set-col label { display: flex; align-items: center; gap: 6px; cursor: pointer; }\n  .set-col .pos { margin-left: auto; color: var(--muted); font-size: 10.5px; }\n  #settings-presets { display: flex; flex-direction: column; gap: 4px; margin: 8px 0; }\n  .preset-row { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 5px 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; }\n  .preset-row .pname { font-weight: 600; }\n  .preset-row .pmeta { color: var(--muted); font-size: 10.5px; flex: 1; }\n  .srow { display: flex; gap: 6px; margin-top: 8px; }\n  .srow input[type=text] { flex: 1; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 6px 9px; font-size: 12px; }\n\n  /* ---------- Toast ---------- */\n  #toast {\n    position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%) translateY(8px);\n    background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px;\n    padding: 8px 14px; font-size: 12.5px; opacity: 0; pointer-events: none;\n    transition: opacity .2s, transform .2s; max-width: 70vw; z-index: 50;\n  }\n  #toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }\n  #toast.error { border-color: var(--danger); color: var(--danger); }\n  #toast.success { border-color: var(--green); }\n\n  @media (max-width: 760px) {\n    #app { grid-template-columns: 1fr; grid-template-rows: 1fr 45vh; }\n    #sidebar { border-left: none; border-top: 1px solid var(--border); }\n  }\n",
  markup: "\n\n<input type=\"file\" id=\"file-input\" accept=\".csv,.tsv,.tab,.txt,.xlsx,.xls,.ods,.json,.jsonl,.ndjson,.html,.htm,.xml,.rss,.atom,.opml,text/csv,text/tab-separated-values,text/plain,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet,text/html,application/xml,text/xml\" hidden>\n\n<main id=\"app\">\n  <!-- LEFT: tabbed iframe workspace (one of several open modes) -->\n  <section id=\"workspace\">\n    <div id=\"tabbar\"></div>\n    <div id=\"panes\">\n      <div id=\"welcome\">\n        <div class=\"box\">\n          <h1><span class=\"logo\"><img class=\"dark\" src=\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CiAgPCEtLSBEYXJrLXRoZW1lIHZhcmlhbnQ6IHRoZSBzdG9uZSBrZWVwcyBhIGxpZ2h0IHJpbSBzbyBpdCByZWFkcyBhZ2FpbnN0IG5lYXItYmxhY2sKICAgICAgIHN1cmZhY2VzLiBTYW1lIGdlb21ldHJ5IGFuZCBlbmdyYXZpbmcgdGVjaG5pcXVlIGFzIGxvZ28uc3ZnLiAtLT4KICA8ZGVmcz4KICAgIDxyYWRpYWxHcmFkaWVudCBpZD0ic3RvbmVTaGFkZUQiIGN4PSIwLjM4IiBjeT0iMC4zMiIgcj0iMC44NSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2NmY2ZjZiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjAuNzIiIHN0b3AtY29sb3I9IiNhOGE4YTgiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjOGY4ZjhmIi8+CiAgICA8L3JhZGlhbEdyYWRpZW50PgogIDwvZGVmcz4KCiAgPGNpcmNsZSBjeD0iMjU2IiBjeT0iMjU2IiByPSIyNDgiIGZpbGw9InVybCgjc3RvbmVTaGFkZUQpIi8+CiAgPGNpcmNsZSBjeD0iMjU2IiBjeT0iMjU2IiByPSIyNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzVjNWY2NiIgc3Ryb2tlLXdpZHRoPSI3Ii8+CgogIDxwYXRoIGQ9Ik0xNDggMjY4IEwyMzIgMzUyIEwzNjggMTgwIiBmaWxsPSJub25lIiBzdHJva2U9IiM2ZjZmNmYiCiAgICAgICAgc3Ryb2tlLXdpZHRoPSI1MiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIgogICAgICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIgMikiLz4KICA8cGF0aCBkPSJNMTQ4IDI2OCBMMjMyIDM1MiBMMzY4IDE4MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNGE0YTRhIgogICAgICAgIHN0cm9rZS13aWR0aD0iNTIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K\" alt=\"\"><img class=\"light\" src=\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CiAgPCEtLSBMaWdodC10aGVtZSB2YXJpYW50OiB0aGUgc3RvbmUgaXMgbGlnaHRlbmVkIHNvIGl0IGRvZXNuJ3QgdmFuaXNoIG9uIHdoaXRlIHN1cmZhY2VzLgogICAgICAgU2FtZSBnZW9tZXRyeSBhbmQgZW5ncmF2aW5nIHRlY2huaXF1ZSBhcyBsb2dvLnN2Zy4gLS0+CiAgPGRlZnM+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9InN0b25lU2hhZGVMIiBjeD0iMC4zOCIgY3k9IjAuMzIiIHI9IjAuODUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNlNmU2ZTYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIwLjcyIiBzdG9wLWNvbG9yPSIjYzRjNGM0Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2E2YTZhNiIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KICA8L2RlZnM+CgogIDxjaXJjbGUgY3g9IjI1NiIgY3k9IjI1NiIgcj0iMjQ4IiBmaWxsPSJ1cmwoI3N0b25lU2hhZGVMKSIvPgogIDxjaXJjbGUgY3g9IjI1NiIgY3k9IjI1NiIgcj0iMjQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ZThlOGUiIHN0cm9rZS13aWR0aD0iNyIvPgoKICA8cGF0aCBkPSJNMTQ4IDI2OCBMMjMyIDM1MiBMMzY4IDE4MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjN2Q3ZDdkIgogICAgICAgIHN0cm9rZS13aWR0aD0iNTIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIKICAgICAgICB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyIDIpIi8+CiAgPHBhdGggZD0iTTE0OCAyNjggTDIzMiAzNTIgTDM2OCAxODAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzUyNTI1MiIKICAgICAgICBzdHJva2Utd2lkdGg9IjUyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==\" alt=\"\"></span> Turnstone</h1>\n          <p class=\"tagline\">Your list, worked through.</p>\n          <p>Turn your list of links into a work queue: track status &amp; notes, open each link the way you like — tabs, browser tabs, or popup windows — and auto-save back to the file (Chromium) or, in this build, this tab only — export to keep your work.</p>\n          <div id=\"dropzone\" role=\"button\" tabindex=\"0\" aria-label=\"Drop a link-list file here, or activate to choose one from disk\">\n            <span class=\"dz-icon\" aria-hidden=\"true\">⤓</span>\n            <span class=\"dz-main\">Drop a file here, or click to choose</span>\n            <span class=\"dz-sub\">Read and parsed on this device — nothing is uploaded.</span>\n            <span class=\"dz-formats\" id=\"dz-formats\">CSV · TSV · XLSX / XLS / ODS · JSON · HTML · XML</span>\n          </div>\n          <p id=\"cap-notice\" hidden></p>\n          <div class=\"row\">\n            <input type=\"text\" id=\"url-input\" placeholder=\"…or paste a link-list URL\" spellcheck=\"false\">\n            <button class=\"btn\" id=\"btn-load-url\">Load</button>\n          </div>\n          \n          <p class=\"or\">or try it with sample data</p>\n          <div class=\"row\">\n            <button class=\"btn\" id=\"btn-demo\" title=\"Load the small built-in demo list\">Demo list</button>\n            <button class=\"btn\" hidden id=\"btn-test-csv\" title=\"Load the bundled sample dataset (CSV)\">Test CSV</button>\n            <button class=\"btn\" hidden id=\"btn-test-xlsx\" title=\"Load the bundled sample dataset as a real XLSX parse\">Test XLSX</button>\n          </div>\n          <div id=\"recents\" hidden>\n            <h2>Recent files</h2>\n            <div id=\"recents-list\"></div>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div id=\"pane-hint\">If a site refuses to render (X-Frame-Options), it can’t be framed in a browser — switch to “New browser tab” mode in the ☰ menu, or use the ↗ on a card.</div>\n  </section>\n\n  <!-- RIGHT: task sidebar (approved deviation from PRD's left-hand sidebar) -->\n  <aside id=\"sidebar\">\n    <div id=\"side-head\">\n      <button id=\"btn-menu\" title=\"Menu — open, export, columns, settings\">☰</button>\n      <span id=\"head-name\"><span class=\"no-file\">No file loaded</span></span>\n      <span id=\"head-save\"></span>\n    </div>\n    <nav id=\"menu\" hidden>\n      <button class=\"menu-item\" id=\"mi-open\"><span class=\"mi\">📂</span> Open file…</button>\n      <button class=\"menu-item\" id=\"mi-restore\" hidden><span class=\"mi\">↺</span> Restore last file</button>\n      <button class=\"menu-item\" id=\"mi-close\" disabled><span class=\"mi\">✕</span> Close current file</button>\n      <button class=\"menu-item\" id=\"mi-link\" disabled><span class=\"mi\">🔗</span> Copy share link (?file=)</button>\n      <div class=\"menu-sep\"></div>\n      <div class=\"menu-label\">Opening links</div>\n      <button class=\"menu-item mode-item\" data-mode=\"tabs\"><span class=\"mi\">🗂</span> Tabs (iframes)</button>\n      <button class=\"menu-item mode-item\" data-mode=\"newtab\"><span class=\"mi\">↗</span> New browser tab</button>\n      <button class=\"menu-item mode-item\" data-mode=\"newwin\"><span class=\"mi\">◱</span> New popup window</button>\n      <button class=\"menu-item\" id=\"mi-mode-help\"><span class=\"mi\">❔</span> Which should I pick?</button>\n      <div class=\"menu-sep\"></div>\n      <div class=\"menu-label\">Automation</div>\n      <button class=\"menu-item toggle-item\" id=\"mi-auto-open\"><span class=\"mi\">⚡</span> Open link when card is selected</button>\n      <button class=\"menu-item toggle-item\" id=\"mi-auto-advance\"><span class=\"mi\">⏭</span> Auto-open next after completing</button>\n      <div class=\"menu-sep\"></div>\n      <button class=\"menu-item\" id=\"mi-columns\"><span class=\"mi\">⚙</span> Columns &amp; presets…</button>\n      <button class=\"menu-item\" id=\"mi-export-csv\" disabled><span class=\"mi\">⬇</span> Export CSV</button>\n      <button class=\"menu-item\" id=\"mi-export-xlsx\" disabled><span class=\"mi\">⬇</span> Export XLSX</button>\n      <button class=\"menu-item\" id=\"mi-install\" hidden><span class=\"mi\">⤓</span> Install app</button>\n      <button class=\"menu-item\" id=\"mi-theme\"><span class=\"mi\">◐</span> <span id=\"mi-theme-label\">Light mode</span></button>\n    </nav>\n    <div id=\"filters\">\n      <input type=\"search\" id=\"search\" placeholder=\"Search tasks…\" autocomplete=\"off\">\n      <div id=\"filter-row\">\n        <label><input type=\"checkbox\" id=\"show-completed\"> Show completed</label>\n        <span id=\"filter-info\" style=\"margin-left:auto\"></span>\n      </div>\n      <div id=\"sort-row\">\n        <span>Sort</span>\n        <select id=\"sort-col\"><option value=\"\">File order</option></select>\n        <button id=\"sort-dir\" title=\"Toggle ascending / descending\">↓</button>\n      </div>\n    </div>\n    <div id=\"cards\"><div class=\"empty\">No file loaded yet.<br>Open a link list to populate task cards.</div></div>\n    <div id=\"sidebar-footer\"><span id=\"count-total\">0 tasks</span><span id=\"count-done\" class=\"done\">0 done</span><span id=\"count-left\">0 left</span></div>\n  </aside>\n</main>\n\n<div id=\"settings-overlay\" hidden>\n  <div id=\"settings-box\">\n    <div id=\"settings-head\">\n      <h2>Task card columns</h2>\n      <button class=\"icon\" id=\"settings-x\" title=\"Close\">✕</button>\n    </div>\n    <p class=\"hint\">Drag to reorder · untick to hide. URL, name, status and notes are fixed card features. Changes apply live.</p>\n    <div id=\"settings-cols\"></div>\n    <p class=\"hint\">Save the layout as a preset — any link list whose header row matches this exact column order loads with it pre-applied.</p>\n    <div class=\"srow\">\n      <input type=\"text\" id=\"preset-name\" placeholder=\"Preset name (e.g. Client audit)\" maxlength=\"40\">\n      <button class=\"btn primary\" id=\"btn-preset-save\">Save preset</button>\n    </div>\n    <div id=\"settings-presets\"></div>\n    <div class=\"srow\">\n      <button class=\"btn\" id=\"btn-cols-reset\">Reset to file order</button>\n    </div>\n  </div>\n</div>\n\n<div id=\"toast\"></div>\n\n\n\n\n\n\n" };
/* ---------------------------------------------------------------------------
 * Bookmarklet boot, part 1 — runs BEFORE the app code is evaluated.
 *
 * Why this order: app.html binds its whole element map (`const els = {…}`) at
 * script-evaluation time, so every element it looks up must already exist. This
 * layer creates the overlay first, then the app code runs against it.
 *
 * Why a shadow root: a bookmarklet runs inside the host page and the page's own
 * CSS would shred the app's layout. A shadow root isolates both directions, and
 * a **constructed stylesheet** (`new CSSStyleSheet()` + adoptedStyleSheets)
 * sidesteps `style-src`, which blocks an injected `<style>` on a strict-CSP page.
 *
 * Nothing here becomes a global on the host page: the vendored libraries are
 * evaluated against a shadow object (`Object.create(window)`), so a page already
 * shipping its own SheetJS or PapaParse keeps its own copies.
 * ------------------------------------------------------------------------- */

var TS_BMK = __TS_BMK__;                       // { variant, libs, css, markup, … } injected by build.js
var TS_HOST_ID = 'turnstone-bookmarklet-root';

var ROOT = null;                               // the app's element root — all its queries scope here
var THEME_ROOT = null;                         // element carrying data-theme
var TS_HOST = null, TS_SHADOW = null, TS_APP = null;

if (document.getElementById(TS_HOST_ID)) {
  throw new Error('Turnstone is already running on this page — close it first (✕ in the top bar).');
}

/* --- Host shell: a 26px bar (carry state / close) + the app viewport ------- */
TS_HOST = document.createElement('div');
TS_HOST.id = TS_HOST_ID;
TS_HOST.setAttribute('data-turnstone-variant', TS_BMK.variant);
TS_HOST.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;margin:0;padding:0;' +
  'background:#0f1115;color:#e6e9ef;font:13px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
  'display:flex;flex-direction:column;overflow:hidden';
document.documentElement.appendChild(TS_HOST);

TS_SHADOW = TS_HOST.attachShadow({ mode: 'open' });
TS_SHADOW.innerHTML =
  '<div id="ts-bar">' +
    '<span class="ts-brand">Turnstone</span>' +
    '<span class="ts-variant"></span>' +
    '<span class="ts-spacer"></span>' +
    '<button type="button" id="ts-copy" title="Copy this queue as JSON — paste it back later with Restore">Copy state</button>' +
    '<button type="button" id="ts-restore" title="Paste a state JSON copied earlier and keep going">Restore state</button>' +
    '<button type="button" id="ts-close" title="Close Turnstone and return to the page">✕ Close</button>' +
  '</div>' +
  '<div id="ts-app">' + TS_BMK.markup + '</div>';

ROOT = TS_SHADOW.getElementById('ts-app');
TS_APP = ROOT;
THEME_ROOT = TS_HOST;

/* Styles that go into the shadow root: constructed sheet when available (CSP-proof),
   a plain <style> otherwise. Used for both the bar and the app's own stylesheet. */
function tsAdoptCss(text) {
  try {
    if (typeof CSSStyleSheet === 'function' && 'adoptedStyleSheets' in ShadowRoot.prototype) {
      var sheet = new CSSStyleSheet();
      sheet.replaceSync(text);
      TS_SHADOW.adoptedStyleSheets = TS_SHADOW.adoptedStyleSheets.concat(sheet);
      return 'constructed';
    }
  } catch (e) { console.warn('[Turnstone] constructed stylesheet unavailable', e); }
  var el = document.createElement('style');
  el.textContent = text;
  TS_SHADOW.appendChild(el);
  return 'inline';
}

/* Chrome the app knows nothing about — styled from here so the app's stylesheet
   stays byte-for-byte what app.html ships. */
var TS_CSS_HOW = tsAdoptCss(
  '#ts-bar{display:flex;align-items:center;gap:8px;flex:0 0 26px;height:26px;padding:0 8px;' +
  'background:#171a21;color:#8b93a5;border-bottom:1px solid #262b36;font-size:11.5px}' +
  '#ts-bar button{font:inherit;font-size:11px;color:#e6e9ef;background:#1d212b;border:1px solid #262b36;' +
  'border-radius:5px;padding:1px 7px;cursor:pointer}' +
  '#ts-bar button:hover{border-color:#5a82e0}' +
  '.ts-brand{font-weight:600;color:#e6e9ef}' +
  '.ts-variant{font-size:10.5px;letter-spacing:.3px;text-transform:uppercase}' +
  '.ts-spacer{flex:1 1 auto}'
);
/* The app's own stylesheet, shadow-scoped. */
tsAdoptCss(TS_BMK.css);

/* --- Theme: the app's tokens now select on :host([data-theme=…]) ----------- */
(function themeBoot() {
  var theme = 'dark';
  try {
    var saved = localStorage.getItem('turnstone-theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
    else if (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) theme = 'light';
  } catch (e) { /* storage blocked: dark is the app's own default */ }
  TS_HOST.dataset.theme = theme;
})();

/* --- Session-only storage -------------------------------------------------
 * Locked scope: a bookmarklet tab may run on a throwaway origin, so storage must
 * never be assumed to stick. IndexedDB is shadowed with an in-memory stand-in so
 * the app's snapshot code keeps working for the tab's lifetime — and the user's
 * queue is never written into the host site's database. localStorage stays real
 * (every access in the app is already guarded) because that is what remembers
 * theme, open mode and column presets: small, namespaced keys. */
var indexedDB = (function memIndexedDb() {
  var stores = {};
  function request() { return { result: undefined, onsuccess: null, onerror: null }; }
  function soon(fn) { setTimeout(fn, 0); }
  function makeStore(name) {
    if (!Object.prototype.hasOwnProperty.call(stores, name)) stores[name] = new Map();
    var map = stores[name];
    return {
      put: function (value) {
        var req = request();
        soon(function () { map.set(value.key, value); req.result = value.key; if (req.onsuccess) req.onsuccess(); });
        return req;
      },
      get: function (key) {
        var req = request();
        soon(function () { req.result = map.get(key); if (req.onsuccess) req.onsuccess(); });
        return req;
      },
      getAll: function () {
        var req = request();
        soon(function () { req.result = Array.from(map.values()); if (req.onsuccess) req.onsuccess(); });
        return req;
      },
      delete: function (key) {
        var req = request();
        soon(function () { map.delete(key); if (req.onsuccess) req.onsuccess(); });
        return req;
      },
      clear: function () {
        var req = request();
        soon(function () { map.clear(); if (req.onsuccess) req.onsuccess(); });
        return req;
      },
    };
  }
  return {
    open: function (name) {
      var req = request();
      soon(function () {
        req.result = {
          name: name,
          objectStoreNames: { contains: function (n) { return Object.prototype.hasOwnProperty.call(stores, n); } },
          createObjectStore: function (n) { makeStore(n); return {}; },
          transaction: function (n) {
            var os = makeStore(n);
            var tx = { objectStore: function () { return os; }, oncomplete: null, onerror: null, error: null };
            soon(function () { if (tx.oncomplete) tx.oncomplete(); });   // writes above are queued first
            return tx;
          },
        };
        if (req.onupgradeneeded) req.onupgradeneeded();
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    },
  };
})();

/* PapaParse stand-in — the app's API surface, in ~2 KB, no dependency. */
/* PapaParse stand-in — the exact slice of the API app.html consumes.
 *
 *   Papa.parse(text, { skipEmptyLines: 'greedy', delimiter }) -> { data, errors, meta: { delimiter } }
 *   Papa.unparse(matrix, { delimiter })                        -> string
 *
 * Real RFC-4180 behaviour (quoted fields, doubled quotes, embedded commas and
 * newlines, CRLF, BOM) plus delimiter sniffing, in ~2 KB and with no dependency.
 * That is what lets the zero-library bookmarklet keep full CSV/TSV support —
 * the hosted app loads the real PapaParse through vendor/ instead.
 */
var Papa = (function () {
  var CANDIDATES = [',', '\t', ';', '|'];

  /** Delimiter counts on a line, ignoring anything inside quotes. */
  function countOutsideQuotes(line, delim) {
    var n = 0, quoted = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (quoted) {
        if (ch === '"') {
          if (line[i + 1] === '"') i++;
          else quoted = false;
        }
      } else if (ch === '"') quoted = true;
      else if (ch === delim) n++;
    }
    return n;
  }

  /** Pick the delimiter that splits the most lines into the same number of fields. */
  function sniff(text) {
    var lines = text.split(/\r?\n/).slice(0, 30).filter(function (l) { return l.trim() !== ''; });
    if (!lines.length) return ',';
    var best = ',', bestScore = 0;
    for (var c = 0; c < CANDIDATES.length; c++) {
      var d = CANDIDATES[c];
      var counts = lines.map(function (l) { return countOutsideQuotes(l, d); });
      var sorted = counts.slice().sort(function (a, b) { return a - b; });
      var median = sorted[Math.floor(sorted.length / 2)];
      if (median < 1) continue;                                     // delim never appears
      var agree = counts.filter(function (n) { return n === median; }).length / counts.length;
      var score = median * agree;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return best;
  }

  /** RFC-4180 state machine. Unterminated quotes are an error, not a crash. */
  function splitRows(text, delim, errors) {
    var rows = [], row = [], field = '', quoted = false, i = 0;
    var sawField = false;
    while (i < text.length) {
      var ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          quoted = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === '"' && field === '') { quoted = true; sawField = true; i++; continue; }
      if (ch === delim) { row.push(field); field = ''; sawField = true; i++; continue; }
      if (ch === '\r') { i++; continue; }                            // CRLF or lone CR
      if (ch === '\n') {
        if (field !== '' || sawField || row.length) { row.push(field); rows.push(row); }
        row = []; field = ''; sawField = false; i++; continue;
      }
      field += ch; sawField = true; i++;
    }
    if (quoted) errors.push({ type: 'Quotes', message: 'Unterminated quoted field', row: rows.length });
    if (field !== '' || sawField || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function parse(text, opts) {
    opts = opts || {};
    var errors = [];
    var delim = opts.delimiter || sniff(text);
    var data = splitRows(String(text == null ? '' : text), delim, errors);
    if (opts.skipEmptyLines) {
      data = data.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
    }
    return { data: data, errors: errors, meta: { delimiter: delim } };
  }

  function needsQuotes(s, delim) {
    return s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0
      || s.indexOf(delim) >= 0 || s.charAt(0) === ' ' || s.charAt(s.length - 1) === ' ';
  }

  function unparse(rows, opts) {
    var delim = (opts && opts.delimiter) || ',';
    return rows.map(function (row) {
      return row.map(function (cell) {
        var s = cell == null ? '' : String(cell);
        return needsQuotes(s, delim) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(delim);
    }).join('\n');
  }

  return {
    parse: parse,
    unparse: unparse,
    shim: true,                       // app/payload can log which implementation is live
  };
})();

/* SheetJS stand-in — read-only XLSX via the browser's own ZIP + DecompressionStream. */
/* SheetJS stand-in — read-only XLSX support with zero dependencies.
 *
 * Implements exactly the API surface app.html consumes:
 *   XLSX.read(buf, { type:'array' })                  -> Promise<{ SheetNames, Sheets, version }>
 *   XLSX.read(buf, { type:'array', bookSheets: true }) -> Promise<{ SheetNames }>
 *   XLSX.utils.sheet_to_json(ws, { header:1 })          -> string[][]
 *
 * `XLSX.write` is deliberately absent, so the app reports HAS_XLSX_WRITE=false,
 * treats workbooks as one-way imports and hides XLSX export — the locked-scope
 * rule that a build must never promise a write-back it cannot deliver.
 *
 * How it works without SheetJS: an .xlsx file is a ZIP of XML. The ZIP is walked
 * through its central directory, each member inflated with the browser's own
 * DecompressionStream('deflate-raw'), and the sheet/shared-string XML read with
 * DOMParser. No eval, no blob-script injection, no network — which is what makes
 * this variant survivable under a strict page CSP.
 *
 * Deliberately not supported (throws a readable reason instead): .xls (BIFF8),
 * .xlsb, .ods, and cell number formats (dates arrive as their stored serial).
 */
var XLSX = (function () {
  var ENTRY_SIG = 0x04034b50, CD_SIG = 0x02014b50, EOCD_SIG = 0x06054b50;
  var REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  function u16(dv, o) { return dv.getUint16(o, true); }
  function u32(dv, o) { return dv.getUint32(o, true); }

  /** Locate the End Of Central Directory record by scanning back from the tail. */
  function findEocd(dv) {
    var min = Math.max(0, dv.byteLength - 65557 - 22);
    for (var i = dv.byteLength - 22; i >= min; i--) {
      if (u32(dv, i) === EOCD_SIG) return i;
    }
    return -1;
  }

  /** name -> central-directory entry (offset/size/method). */
  function readCentralDirectory(buf) {
    var dv = new DataView(buf);
    var eocd = findEocd(dv);
    if (eocd < 0) throw new Error('not a ZIP container (no end-of-central-directory record) — not an .xlsx file?');
    var count = u16(dv, eocd + 10);
    var offset = u32(dv, eocd + 16);
    var entries = {};
    for (var n = 0; n < count; n++) {
      if (u32(dv, offset) !== CD_SIG) break;
      var method = u16(dv, offset + 10);
      var compSize = u32(dv, offset + 20);
      var nameLen = u16(dv, offset + 28);
      var extraLen = u16(dv, offset + 30);
      var commentLen = u16(dv, offset + 32);
      var localOffset = u32(dv, offset + 42);
      var name = new TextDecoder('utf-8').decode(new Uint8Array(buf, offset + 46, nameLen));
      entries[name] = { method: method, compSize: compSize, localOffset: localOffset };
      offset += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
  }

  /** Inflate (stored or deflate) one member to text. */
  async function readEntryText(buf, entry) {
    var dv = new DataView(buf);
    if (u32(dv, entry.localOffset) !== ENTRY_SIG) throw new Error('corrupt ZIP member header');
    var nameLen = u16(dv, entry.localOffset + 26);
    var extraLen = u16(dv, entry.localOffset + 28);
    var start = entry.localOffset + 30 + nameLen + extraLen;
    var bytes = new Uint8Array(buf, start, entry.compSize);
    if (entry.method === 0) return new TextDecoder('utf-8').decode(bytes);
    if (entry.method !== 8) throw new Error('unsupported ZIP compression method ' + entry.method);
    if (typeof DecompressionStream !== 'function') {
      throw new Error('this browser cannot inflate XLSX parts (no DecompressionStream) — use the full build or export to CSV');
    }
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new TextDecoder('utf-8').decode(await new Response(stream).arrayBuffer());
  }

  function parseXml(text, label) {
    var doc = new DOMParser().parseFromString(text, 'application/xml');
    var bad = doc.querySelector('parsererror');
    if (bad) throw new Error('could not read ' + label + ' XML');
    return doc;
  }

  /** "BC12" -> 54 (zero-based column index). */
  function colIndex(ref) {
    var letters = String(ref || '').match(/^[A-Za-z]+/);
    if (!letters) return 0;
    var s = letters[0].toUpperCase(), n = 0;
    for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1;
  }

  /** Every <t> under a shared-string <si>, so rich text runs concatenate. */
  function sharedStringsOf(text) {
    if (text == null) return [];
    var doc = parseXml(text, 'sharedStrings');
    return Array.prototype.map.call(doc.getElementsByTagName('si'), function (si) {
      return Array.prototype.map.call(si.getElementsByTagName('t'), function (t) { return t.textContent; }).join('');
    });
  }

  function relationshipTargets(text) {
    var doc = parseXml(text, 'workbook relationships');
    var map = {};
    Array.prototype.forEach.call(doc.getElementsByTagName('Relationship'), function (rel) {
      map[rel.getAttribute('Id')] = rel.getAttribute('Target');
    });
    return map;
  }

  /** Sheet name -> worksheet part path, in workbook order. */
  function sheetParts(workbookXml, rels) {
    var doc = parseXml(workbookXml, 'workbook');
    var sheets = doc.getElementsByTagName('sheet');
    return Array.prototype.map.call(sheets, function (s) {
      var rid = s.getAttributeNS(REL_NS, 'id') || s.getAttribute('r:id');
      var target = rels[rid] || '';
      if (/^\//.test(target)) target = target.slice(1);            // absolute package path
      else if (target) target = 'xl/' + target.replace(/^\.\//, '');
      return { name: s.getAttribute('name') || 'Sheet1', path: target };
    });
  }

  /** One worksheet -> dense 2D array of strings (or numbers-as-written). */
  function gridFromSheet(xml, strings) {
    var doc = parseXml(xml, 'worksheet');
    var rows = doc.getElementsByTagName('row');
    var grid = [], width = 0;
    Array.prototype.forEach.call(rows, function (row) {
      var rowIndex = parseInt(row.getAttribute('r'), 10);
      if (isNaN(rowIndex)) rowIndex = grid.length + 1;
      var out = [];
      Array.prototype.forEach.call(row.getElementsByTagName('c'), function (cell) {
        var at = colIndex(cell.getAttribute('r'));
        var type = cell.getAttribute('t') || 'n';
        var value = '';
        if (type === 'inlineStr') {
          var is = cell.getElementsByTagName('is')[0];
          value = is ? Array.prototype.map.call(is.getElementsByTagName('t'), function (t) { return t.textContent; }).join('') : '';
        } else {
          var v = cell.getElementsByTagName('v')[0];
          var raw = v ? v.textContent : '';
          if (type === 's') value = strings[parseInt(raw, 10)] || '';
          else if (type === 'b') value = raw === '1' ? 'TRUE' : 'FALSE';
          else value = raw;
        }
        out[at] = value;
        if (at + 1 > width) width = at + 1;
      });
      while (grid.length < rowIndex - 1) grid.push([]);            // honour sparse rows
      grid[rowIndex - 1] = out;
    });
    for (var r = 0; r < grid.length; r++) {
      var row = grid[r] || [];
      for (var c = 0; c < width; c++) if (row[c] === undefined) row[c] = '';
      row.length = width;
      grid[r] = row;
    }
    return grid;
  }

  function utils() {
    return {
      /** The slice app.html uses: { header: 1, raw: false, defval: '' }. */
      sheet_to_json: function (ws, opts) {
        opts = opts || {};
        var defval = opts.defval === undefined ? '' : opts.defval;
        return (ws.rows || []).map(function (row) {
          return row.map(function (cell) { return cell === undefined || cell === null ? defval : cell; });
        });
      },
    };
  }

  async function read(buf, opts) {
    opts = opts || {};
    var head = new Uint8Array(buf, 0, Math.min(8, buf.byteLength));
    if (head[0] === 0xD0 && head[1] === 0xCF && head[2] === 0x11 && head[3] === 0xE0) {
      throw new Error('legacy .xls (BIFF8) needs the full build — re-save it as .xlsx or CSV');
    }
    var entries = readCentralDirectory(buf);
    if (!entries['xl/workbook.xml']) {
      if (entries['content.xml']) throw new Error('.ods workbooks need the full build — re-save as .xlsx or CSV');
      if (entries['xl/workbook.bin']) throw new Error('.xlsb workbooks need the full build — re-save as .xlsx or CSV');
      throw new Error('no xl/workbook.xml inside the archive — not a readable .xlsx file');
    }
    var parts = sheetParts(await readEntryText(buf, entries['xl/workbook.xml']),
      entries['xl/_rels/workbook.xml.rels'] ? relationshipTargets(await readEntryText(buf, entries['xl/_rels/workbook.xml.rels'])) : {});
    var names = parts.map(function (p) { return p.name; });
    if (opts.bookSheets) return { SheetNames: names };

    var strings = sharedStringsOf(entries['xl/sharedStrings.xml'] ? await readEntryText(buf, entries['xl/sharedStrings.xml']) : null);
    var Sheets = {};
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var entry = entries[p.path] || entries['xl/worksheets/sheet' + (i + 1) + '.xml'];
      if (!entry) continue;
      Sheets[p.name] = { rows: gridFromSheet(await readEntryText(buf, entry), strings) };
    }
    return { SheetNames: names, Sheets: Sheets, version: 'turnstone-mini', mini: true };
  }

  return { read: read, utils: utils(), mini: true };
})();


(function(){

'use strict';
/* =========================================================================
   Project Turnstone — zero-server URL-list processor.
   Vanilla JS. Workspace on the LEFT, task sidebar on the RIGHT (deviation).
   ========================================================================= */

const LOG = '[Turnstone]';
const log  = (...a) => console.log(LOG, ...a);
const warn = (...a) => console.warn(LOG, ...a);
const err  = (...a) => console.error(LOG, ...a);

/* ---------------------------- IndexedDB layer ---------------------------- */
const DB_NAME = 'turnstone', DB_VER = 1;
let idbPromise = null;

function idbOpen() {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('session')) db.createObjectStore('session', { keyPath: 'key' });
      log('IndexedDB stores created');
    };
    req.onsuccess = () => { log('IndexedDB opened'); resolve(req.result); };
    req.onerror = () => { err('IndexedDB open failed', req.error); reject(req.error); };
  });
  return idbPromise;
}
async function idbPut(store, value) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => { log(`IDB put → ${store}/${value.key}`); res(); };
    tx.onerror = () => { err(`IDB put failed → ${store}/${value.key}`, tx.error); rej(tx.error); };
  });
}
async function idbGet(store, key) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const req = db.transaction(store).objectStore(store).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => { err(`IDB get failed → ${store}/${key}`, req.error); rej(req.error); };
  });
}
async function idbGetAll(store) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const req = db.transaction(store).objectStore(store).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => { err(`IDB getAll failed → ${store}`, req.error); rej(req.error); };
  });
}

/* --------------------------------- State --------------------------------- */
const state = {
  name: null,          // file name or URL label
  ext: 'csv',          // format id: csv | tsv | xlsx | xls | ods | json | html | xml
  mode: null,          // 'fs' (File System Access) | 'fallback' | 'remote' | 'demo'
  fileHandle: null,    // FileSystemFileHandle (Chromium only)
  sheetName: 'Sheet1',
  data: [],            // 2D array, exactly as parsed
  hasHeader: false,
  urlCol: 0, nameCol: -1, statusCol: -1, notesCol: -1,
  status: [],          // virtual per-card status ('incomplete'|'complete'), cardIndex-based
  notes: [],           // virtual per-card notes
  isDirty: false,
  search: '', hideCompleted: true,   // completed cards hidden by default (toggle: Show completed)
  sortCol: null, sortAsc: true,      // card ordering; null = file order
  autoOpenOnSelect: false,           // open a link as soon as its card is expanded
  autoAdvance: false,                // open the next incomplete card's link when one is completed
  sourceUrl: null,      // remote URL the file was fetched from (?file=/ pasted), enables 🔗 Link
  colOrder: null,       // card-display order of data columns (indices); null = file order
  colHidden: {},        // column index → true when hidden from cards
  expanded: {},         // card index → true when all data columns are shown
};

const $ = (sel) => ROOT.querySelector(sel);
const els = {
  fileInput: $('#file-input'), dropzone: $('#dropzone'), btnDemo: $('#btn-demo'),
  dzFormats: $('#dz-formats'), capNotice: $('#cap-notice'),
  btnMenu: $('#btn-menu'), menu: $('#menu'), headName: $('#head-name'), headSave: $('#head-save'),
  miOpen: $('#mi-open'), miRestore: $('#mi-restore'), miClose: $('#mi-close'), miLink: $('#mi-link'),
  miColumns: $('#mi-columns'), miExportCsv: $('#mi-export-csv'), miExportXlsx: $('#mi-export-xlsx'),
  miInstall: $('#mi-install'), miTheme: $('#mi-theme'), miThemeLabel: $('#mi-theme-label'),
  miAutoOpen: $('#mi-auto-open'), miAutoAdvance: $('#mi-auto-advance'),
  settingsOverlay: $('#settings-overlay'), settingsCols: $('#settings-cols'), settingsPresets: $('#settings-presets'),
  settingsX: $('#settings-x'), presetName: $('#preset-name'), btnPresetSave: $('#btn-preset-save'), btnColsReset: $('#btn-cols-reset'),
  urlInput: $('#url-input'), btnLoadUrl: $('#btn-load-url'),
  btnTestCsv: $('#btn-test-csv'), btnTestXlsx: $('#btn-test-xlsx'),
  welcome: $('#welcome'), recents: $('#recents'), recentsList: $('#recents-list'),
  tabbar: $('#tabbar'), panes: $('#panes'),
  search: $('#search'), showCompleted: $('#show-completed'), filterInfo: $('#filter-info'),
  sortCol: $('#sort-col'), sortDir: $('#sort-dir'),
  cards: $('#cards'),
  countTotal: $('#count-total'), countDone: $('#count-done'), countLeft: $('#count-left'),
  toast: $('#toast'),
};

/* ------------------------------- Utilities ------------------------------- */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function highlight(text, q) {
  const raw = String(text ?? '');
  if (!q) return esc(raw);
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return raw.split(rx).map(esc).join('<mark>' + esc(q) + '</mark>'); // split keeps separators; escape every part
}
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

let toastTimer = null;
function toast(msg, type = '') {
  log('Toast:', msg);
  els.toast.textContent = msg;
  els.toast.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.className = ''; }, 3500);
}

async function copyText(text, label = 'text') {
  try {
    await navigator.clipboard.writeText(text);
    log(`Copied ${label} to clipboard (${text.length} chars)`);
    return true;
  } catch (e) {
    warn('Clipboard API failed, falling back to execCommand', e);
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    log(`execCommand copy ${ok ? 'succeeded' : 'failed'} for ${label}`);
    return ok;
  }
}

/* ------------------------------ Parsing core ------------------------------ */
/* Every supported input — CSV, TSV, XLSX/XLS/ODS, JSON, HTML tables, XML —
   collapses into ONE shape: a 2D array of strings. Everything downstream
   (analyzeMatrix → loadMatrix → renderCards) is format-agnostic, so adding a
   format means one detector entry plus one parser that returns rows. */

const HEADER_URL_RE = /^(url|link|href|website|web site|site|address|loc|permalink)\b/i;
const HEADER_NAME_RE = /^(name|title|task|label|page|description)\b/i;
const URL_VALUE_RE = /^https?:\/\//i;

/* Completed/status + notes columns. We emit "Status"/"Notes" on export, but a
   file dropped back in (or built elsewhere) may label them Completed / Done /
   Finished / Checked / Comment — accepting that whole family is what lets a
   re-import resume the user's progress instead of resetting every card. */
const HEADER_STATUS_RE = /^(status|state|complet(e|ed|ion)|done|finished|checked|reviewed|processed|handled)\b/i;
const HEADER_NOTES_RE  = /^(notes?|comments?|remarks?|memo)\b/i;
const STATUS_HEADER_WORDS = new Set(['status', 'state', 'complete', 'completed', 'completion', 'done', 'finished', 'checked', 'reviewed', 'processed', 'handled']);
const NOTES_HEADER_WORDS  = new Set(['note', 'notes', 'comment', 'comments', 'remark', 'remarks', 'memo']);
const normalizeHeader = (h) => String(h ?? '').toLowerCase().replace(/[^a-z]/g, '');

/** Cell values that mean "this task is done". Ticks are accepted so rows pasted
    from a spreadsheet round-trip, and a completion *date* counts as done too. */
const COMPLETE_RE = /^(complete|completed|done|finished|yes|y|true|1|x|✓|✔|☑|✅)$/i;
const COMPLETE_DATE_RE = /^\d{4}-\d{1,2}-\d{1,2}([T ].*)?$/;
/* Same test after stripping decoration, so "✓ done", "done ✔" and "- complete"
   all count. Anchored matches keep "not done" and "incomplete" safely false. */
const DONE_DECOR_RE = /[\s✓✔☑✅·•\-–—:]/g;
const isCompleteValue = (raw) => {
  const v = String(raw ?? '').trim().replace(/\uFE0F/g, '');   // drop emoji variation selectors
  if (!v) return false;
  return COMPLETE_RE.test(v) || COMPLETE_RE.test(v.replace(DONE_DECOR_RE, '')) || COMPLETE_DATE_RE.test(v);
};

/* `writable` = we can rebuild the file byte-for-byte in its own format, so edits
   save silently in place. Everything else is a one-way import: its edits live in
   browser storage until the user exports CSV/XLSX. XLS/XLSM/XLSB/ODS are read-only
   on purpose — writing XLSX bytes under a .xls/.xlsm name would drop macros and
   mislabel the file. */
const FORMAT_INFO = {
  csv:  { label: 'CSV',        writable: true  },
  tsv:  { label: 'TSV',        writable: true  },
  xlsx: { label: 'XLSX',       writable: true  },
  xls:  { label: 'XLS',        writable: false },
  xlsm: { label: 'XLSM',       writable: false },
  xlsb: { label: 'XLSB',       writable: false },
  ods:  { label: 'ODS',        writable: false },
  json: { label: 'JSON',       writable: false },
  html: { label: 'HTML table', writable: false },
  xml:  { label: 'XML',        writable: false },
  pdf:  { label: 'PDF',        writable: false },
};
const formatLabel = (f) => (FORMAT_INFO[f] || {}).label || String(f || '').toUpperCase();
/** Formats whose matrix can be written back into the source file in place. */
const isWritable = (f) => !!(FORMAT_INFO[f] && FORMAT_INFO[f].writable);

/* Workbook support is a **capability**, not a build assumption. The bookmarklet's
   no-library variant and the standalone CSV-only build ship without SheetJS, and
   the app must degrade out loud: refuse `.xlsx` with a real reason, hide the XLSX
   export, and say so on the welcome panel — never fail on the first workbook. */
const HAS_XLSX = typeof XLSX === 'object' && XLSX !== null && typeof XLSX.read === 'function';
/* Reading a workbook and *rebuilding* one are separate capabilities: a build can
   ship a read-only workbook reader (the bookmarklet's zero-library variant does)
   and must then treat workbooks as one-way imports instead of promising a
   write-back it cannot deliver. */
const HAS_XLSX_WRITE = HAS_XLSX && typeof XLSX.write === 'function';
/* Some builds have no durable storage at all — the bookmarklet overlay runs on a
   throwaway origin and shadows IndexedDB. Those builds must say so instead of
   promising a snapshot that will not outlive the tab. */
const SESSION_ONLY = true;   // ports/bookmarklet/build.js flips this to true
const storageLabel = () => (SESSION_ONLY ? 'this tab only' : 'browser storage');
/** Formats we can rebuild in place, given this build's capabilities. */
const canWrite = (f) => isWritable(f) && (!isWorkbookFormat(f) || HAS_XLSX_WRITE);
/** Everything SheetJS opens as a workbook container. */
const isWorkbookFormat = (f) => f === 'xlsx' || f === 'xls' || f === 'xlsm' || f === 'xlsb' || f === 'ods';

/* Extension → format. Explicit aliases only; content sniffing outranks them. */
const EXT_FORMAT = {
  csv: 'csv', txt: 'csv', tsv: 'tsv', tab: 'tsv',
  xlsx: 'xlsx', xlsm: 'xlsm', xlsb: 'xlsb', xls: 'xls', ods: 'ods',
  json: 'json', jsonl: 'json', ndjson: 'json',
  html: 'html', htm: 'html', xml: 'xml', rss: 'xml', atom: 'xml', opml: 'xml',
  pdf: 'pdf',
};
const CT_FORMAT = [
  [/spreadsheetml|ms-excel|excel/, 'xlsx'],
  [/opendocument\.spreadsheet/, 'ods'],
  [/json/, 'json'],
  [/html/, 'html'],
  [/xml/, 'xml'],
  [/tab-separated/, 'tsv'],
  [/csv|comma-separated/, 'csv'],
  [/pdf/, 'pdf'],
];

const MAGIC = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  ole: [0xd0, 0xcf, 0x11, 0xe0], // OLE2 container — legacy .xls
  zip: [0x50, 0x4b, 0x03, 0x04], // PK\x03\x04 — xlsx / xlsm / xlsb / ods
};
function hasMagic(buf, bytes) {
  return buf.byteLength >= bytes.length && bytes.every((b, i) => new DataView(buf).getUint8(i) === b);
}
function bufHead(buf, n = 2048) {
  return new TextDecoder('utf-8').decode(buf.slice(0, Math.min(n, buf.byteLength))).replace(/^\uFEFF/, '');
}

/** Content sniffing for text formats — the strongest signal we have. */
function sniffTextFormat(head) {
  const h = head.trimStart().toLowerCase();
  if (!h) return null;
  if (h[0] === '[' || h[0] === '{') return 'json';
  if (h.startsWith('<!doctype html') || h.startsWith('<html')) return 'html';
  if (h.startsWith('<?xml')) return 'xml';
  if (h.startsWith('<!--')) return /<!doctype html|<html|<table/.test(h) ? 'html' : 'xml';
  if (h[0] === '<') return /<table\b|<tr\b|<td\b/.test(h) ? 'html' : 'xml';
  return null; // delimiter choice is PapaParse's job, not ours
}

/** Split an extension + Content-Type into soft hints used only when content is inconclusive. */
function formatHints(name, contentType) {
  const m = String(name || '').match(/\.([a-z0-9]{1,5})(?:$|[?#])/i);
  const ext = m ? m[1].toLowerCase() : null;
  const ct = String(contentType || '').toLowerCase();
  const hit = CT_FORMAT.find(([re]) => re.test(ct));
  return { ext, extFormat: (ext && EXT_FORMAT[ext]) || null, ctFormat: hit ? hit[1] : null, contentType: ct };
}

/** Decide the format of a buffer. Precedence: magic bytes → content → hints. */
function detectFormat(buf, name, contentType) {
  const hint = formatHints(name, contentType);
  let format, why;
  if (hasMagic(buf, MAGIC.pdf)) { format = 'pdf'; why = 'magic %PDF'; }
  else if (hasMagic(buf, MAGIC.ole)) { format = 'xls'; why = 'magic OLE2 (legacy Excel)'; }
  else if (hasMagic(buf, MAGIC.zip)) {
    // xlsx / xlsm / xlsb / ods all share the ZIP magic — the extension says which.
    format = isWorkbookFormat(hint.extFormat) ? hint.extFormat : 'xlsx';
    why = `magic PK\\x03\\x04 (ZIP container → ${format})`;
  } else {
    const sniffed = sniffTextFormat(bufHead(buf));
    if (sniffed) { format = sniffed; why = 'content sniff'; }
    else if (hint.extFormat) { format = hint.extFormat; why = `extension .${hint.ext}`; }
    else if (hint.ctFormat) { format = hint.ctFormat; why = `content-type "${hint.contentType}"`; }
    else { format = 'csv'; why = 'assumed delimited text'; }
  }
  log(`Format detection: ${why} → ${format} (ext=${hint.ext || 'none'}, content-type="${hint.contentType || 'none'}")`);
  return { format, ...hint };
}

/* ---- Parser: delimited text (CSV, TSV, semicolon/pipe) ---- */
function parseDelimitedText(text, format) {
  const t = String(text).replace(/^\uFEFF/, '').trim();
  const res = Papa.parse(t, { skipEmptyLines: 'greedy', delimiter: format === 'tsv' ? '\t' : '' });
  if (res.errors.length) warn('PapaParse reported errors:', res.errors.slice(0, 3));
  const delim = (res.meta && res.meta.delimiter) || ',';
  const rows = res.data.map(r => (Array.isArray(r) ? r : [r]).map(c => String(c ?? '')));
  log(`Parsed ${formatLabel(format)} text (${text.length} chars) with PapaParse — delimiter ${JSON.stringify(delim)}, ${rows.length} rows`);
  return rows;
}

/* ---- Parser: workbooks (XLSX / XLS / ODS / XLSB) via SheetJS ---- */
async function parseWorkbook(buf, sheetPick) {
  log(`Parsing workbook (${buf.byteLength} bytes) with SheetJS${sheetPick ? `, sheet "${sheetPick}"` : ''}`);
  // `await` on purpose: the real SheetJS resolves synchronously, but a
  // dependency-free reader (the bookmarklet build) inflates asynchronously.
  const wb = await XLSX.read(buf, { type: 'array' });
  const name = sheetPick && wb.SheetNames.includes(sheetPick) ? sheetPick : wb.SheetNames[0];
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
    .map(row => row.map(c => String(c ?? '')));
  log(`Workbook parsed: ${wb.SheetNames.length} sheet(s), loaded "${name}" — ${rows.length} rows`);
  return { rows, sheetName: name };
}

/* ---- Parser: JSON (array of objects, array of arrays, wrapped array, NDJSON) ---- */
function jsonScalar(v) {
  if (v === null || v === undefined) return '';
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

/** Array of objects → header row (union of keys, first-seen order) + data rows. */
function jsonObjectsToMatrix(objs) {
  const keys = [], seen = new Set();
  for (const o of objs) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) continue;
    for (const k of Object.keys(o)) if (!seen.has(k)) { seen.add(k); keys.push(k); }
  }
  if (!keys.length) return null;
  return [keys, ...objs.map(o => keys.map(k => jsonScalar(o && typeof o === 'object' ? o[k] : '')))];
}

/** First array nested anywhere inside an object, e.g. {items:[…]} or {data:{rows:[…]}}. */
function findJsonArray(value, depth = 0) {
  if (depth > 4 || !value || typeof value !== 'object' || Array.isArray(value)) return null;
  for (const v of Object.values(value)) if (Array.isArray(v) && v.length) return v;
  for (const v of Object.values(value)) {
    const hit = findJsonArray(v, depth + 1);
    if (hit) return hit;
  }
  return null;
}

function jsonToMatrix(value) {
  let v = value;
  if (!Array.isArray(v)) {
    if (v && typeof v === 'object') {
      const inner = findJsonArray(v);
      if (inner) { log('JSON: unwrapped a single nested array (e.g. {items:[…]})'); v = inner; }
      else {
        const vals = Object.values(v);
        if (vals.length && vals.every(x => x && typeof x === 'object' && !Array.isArray(x))) {
          log(`JSON: an object map with ${vals.length} entries → records, keys kept as _key`);
          return jsonObjectsToMatrix(Object.entries(v).map(([k, o]) => ({ _key: k, ...o })));
        }
        log('JSON: a single object → one record');
        return jsonObjectsToMatrix([v]);
      }
    } else {
      return [['Value'], [jsonScalar(v)]];
    }
  }
  if (!v.length) return [];
  if (v.every(Array.isArray)) {
    log(`JSON: array of ${v.length} arrays → rows verbatim`);
    return v.map(r => r.map(jsonScalar));
  }
  if (v.every(x => x && typeof x === 'object' && !Array.isArray(x))) {
    const m = jsonObjectsToMatrix(v);
    if (m) { log(`JSON: array of ${v.length} objects → ${m[0].length} columns`); return m; }
  }
  log(`JSON: array of ${v.length} scalars → single Value column`);
  return [['Value'], ...v.map(x => [jsonScalar(x)])];
}

function parseJsonText(text) {
  let parsed;
  try {
    parsed = JSON.parse(String(text).replace(/^\uFEFF/, ''));
  } catch (e) {
    // JSON Lines / NDJSON: one object per line is a very common export shape.
    const lines = String(text).trim().split(/\r?\n/).filter(l => l.trim());
    const objs = lines.length > 1 && lines.every(l => /^\s*[\[{]/.test(l))
      ? lines.map(l => { try { return JSON.parse(l); } catch { return null; } })
      : [];
    if (!objs.length || !objs.every(Boolean)) throw new Error(`invalid JSON (${e.message})`);
    log(`JSON.parse failed — recovered as NDJSON (${objs.length} lines)`);
    return jsonToMatrix(objs);
  }
  const rows = jsonToMatrix(parsed);
  log(`JSON parsed: ${rows.length} rows × ${rows.reduce((m, r) => Math.max(m, r.length), 0)} cols`);
  return rows;
}

/* ---- Parser: HTML tables (and, for local picks, plain link lists) ---- */
/** Rows of a <table> → rectangular grid, honouring rowspan/colspan. */
function tableToMatrix(table) {
  const own = (el) => el.closest('table') === table; // ignore nested tables
  const trs = [...table.querySelectorAll('tr')].filter(own);
  const grid = [];
  trs.forEach((tr, r) => {
    grid[r] = grid[r] || [];
    let col = 0;
    for (const cell of [...tr.querySelectorAll('th, td')].filter(own)) {
      while (grid[r][col] !== undefined) col++;
      const cs = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10) || 1);
      const rs = Math.max(1, parseInt(cell.getAttribute('rowspan') || '1', 10) || 1);
      const text = cell.textContent.replace(/\s+/g, ' ').trim();
      for (let dr = 0; dr < rs; dr++) {
        grid[r + dr] = grid[r + dr] || [];
        for (let dc = 0; dc < cs; dc++) {
          if (grid[r + dr][col + dc] === undefined) grid[r + dr][col + dc] = dr === 0 && dc === 0 ? text : '';
        }
      }
      col += cs;
    }
  });
  return grid
    .filter(row => row && row.some(c => c !== undefined && c !== ''))
    .map(row => { const out = []; for (let i = 0; i < row.length; i++) out[i] = String(row[i] ?? ''); return out; });
}

function parseHtmlText(text, { allowLinkFallback = true } = {}) {
  // parseFromString yields an inert document: no scripts run, no images fetch.
  const doc = new DOMParser().parseFromString(String(text), 'text/html');
  // Only consider top-level tables; a nested table is almost always layout filler.
  const tables = [...doc.querySelectorAll('table')].filter(t => !(t.parentElement && t.parentElement.closest('table')));
  let best = null, bestScore = 0;
  for (const t of tables) {
    const m = tableToMatrix(t);
    const score = m.length * m.reduce((w, r) => Math.max(w, r.length), 0);
    if (score > bestScore) { bestScore = score; best = m; }
  }
  if (best && best.length >= 2) {
    log(`HTML parsed: picked the largest of ${tables.length} table(s) — ${best.length} rows × ${best.reduce((w, r) => Math.max(w, r.length), 0)} cols`);
    return best;
  }
  if (!allowLinkFallback) throw new Error('that URL returned a web page with no data table in it');
  // Saved bookmarks pages and link round-ups are lists, not tables.
  const seen = new Set(), links = [];
  for (const a of doc.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href') || '';
    if (!/^https?:\/\//i.test(href) || seen.has(href)) continue;
    seen.add(href);
    links.push([a.textContent.replace(/\s+/g, ' ').trim() || href, href]);
  }
  if (links.length) {
    log(`HTML parsed: no usable table — harvested ${links.length} http(s) link(s) from <a href>`);
    return [['Name', 'URL'], ...links];
  }
  throw new Error('no <table> rows and no http(s) links found');
}

/* ---- Parser: XML (RSS/Atom feeds, sitemaps, OPML, generic record lists) ---- */
const XML_RECORD_TAGS = /^(item|entry|record|row|link|url|post|article|result|job|task|page|doc|node|member|place|event|product|book)$/i;

/** The element name that most looks like a repeated record in this document.
    Record containers (elements that hold fields) beat leaf elements — otherwise an
    RSS feed would tabulate its <link> elements instead of its <item> elements. */
function pickXmlRecordTag(doc) {
  const seen = new Map(); // tagName → { count, containers }
  for (const el of doc.querySelectorAll('*')) {
    const n = el.tagName;
    const rec = seen.get(n) || { count: 0, containers: 0 };
    rec.count++;
    if (el.children.length) rec.containers++;
    seen.set(n, rec);
  }
  const repeated = [...seen.entries()]
    .filter(([n, r]) => r.count >= 2 && !/^(html|head|body|script|style)$/i.test(n))
    .map(([n, r]) => ({ tag: n, ...r, known: XML_RECORD_TAGS.test(n) }));
  if (!repeated.length) return null;
  const rank = (a, b) => (b.known - a.known) || (b.count - a.count);
  const containers = repeated.filter(r => r.containers === r.count).sort(rank);
  if (containers.length) return containers[0].tag;
  return repeated.sort(rank)[0].tag;
}

/** Text of a leaf element — falling back to its url-ish attribute (Atom <link href>). */
function xmlLeafValue(el) {
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  if (text) return text;
  for (const a of ['href', 'url', 'src', 'loc']) {
    const v = el.getAttribute && el.getAttribute(a);
    if (v) return v;
  }
  return [...(el.attributes || [])].map(a => a.value).join(' ');
}

function xmlElementToRecord(el) {
  const rec = {};
  // Attributes first so href/url land in an early column.
  for (const attr of el.attributes || []) rec[attr.name] = attr.value;
  const kids = [...el.children];
  if (!kids.length && !Object.keys(rec).length) rec.value = xmlLeafValue(el);
  for (const k of kids) {
    const val = k.children.length ? JSON.stringify(xmlToPlain(k)) : xmlLeafValue(k);
    rec[k.tagName] = rec[k.tagName] === undefined ? val : `${rec[k.tagName]}; ${val}`;
  }
  return rec;
}
function xmlToPlain(el) {
  const o = {};
  for (const attr of el.attributes || []) o[attr.name] = attr.value;
  const kids = [...el.children];
  if (!kids.length) o.value = xmlLeafValue(el);
  for (const k of kids) o[k.tagName] = k.children.length ? xmlToPlain(k) : xmlLeafValue(k);
  return o;
}

function parseXmlText(text) {
  const doc = new DOMParser().parseFromString(String(text), 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML is not well-formed');
  const tag = pickXmlRecordTag(doc);
  if (!tag) throw new Error('no repeated record elements to turn into rows');
  const els = [...doc.querySelectorAll(tag)];
  log(`XML parsed: ${els.length} <${tag}> record element(s)`);
  const recs = els.map(xmlElementToRecord);
  const keys = [];
  for (const r of recs) for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);
  return [keys, ...recs.map(r => keys.map(k => jsonScalar(r[k])))];
}

/** Detect + parse any supported buffer into a matrix. Throws a friendly error for the rest. */
async function parseDetected(buf, det, sheetPick, htmlOpts) {
  const format = det.format;
  if (format === 'pdf') {
    throw new Error('PDF is not supported yet — export the list to CSV/XLSX first');
  }
  if (isWorkbookFormat(format)) {
    if (!HAS_XLSX) throw new Error(`${formatLabel(format)} needs workbook support, which this build does not include — load a CSV, TSV, JSON, HTML or XML list instead`);
    const { rows, sheetName } = await parseWorkbook(buf, sheetPick);
    return { rows, sheetName, format };
  }
  const text = new TextDecoder('utf-8').decode(buf);
  const rows = format === 'json' ? parseJsonText(text)
    : format === 'html' ? parseHtmlText(text, htmlOpts)
    : format === 'xml' ? parseXmlText(text)
    : parseDelimitedText(text, format);
  return { rows, sheetName: null, format };
}

/** Pick a header column: an exact word ("Completed") outranks a prefix match
    ("Completed on", "Notes / comments"). Returns -1 when nothing matches. */
function pickColumn(header, exactWords, re) {
  const exact = header.findIndex(h => exactWords.has(normalizeHeader(h)));
  return exact >= 0 ? exact : header.findIndex(h => re.test(h));
}

/** Detect header row + column roles from a 2D matrix. */
function analyzeMatrix(data) {
  // Trim fully-empty trailing rows
  while (data.length && data[data.length - 1].every(c => !String(c).trim())) data.pop();

  const width = data.reduce((m, r) => Math.max(m, r.length), 1);
  const first = (data[0] || []).map(c => String(c).trim());

  // Header heuristic: known header words, or a first row with no URL values while later rows have URLs.
  const firstRowHasUrl = first.some(c => URL_VALUE_RE.test(c));
  const hasHeader = first.some(c => HEADER_URL_RE.test(c) || HEADER_NAME_RE.test(c) || HEADER_STATUS_RE.test(c) || HEADER_NOTES_RE.test(c))
    || (!firstRowHasUrl && data.slice(1, 51).some(r => r.some(c => URL_VALUE_RE.test(String(c)))));

  const header = hasHeader ? first : [];
  let urlCol = -1, nameCol = -1, statusCol = -1, notesCol = -1;

  if (hasHeader) {
    header.forEach((h, i) => {
      if (urlCol < 0 && HEADER_URL_RE.test(h)) urlCol = i;
      if (nameCol < 0 && HEADER_NAME_RE.test(h)) nameCol = i;
    });
    statusCol = pickColumn(header, STATUS_HEADER_WORDS, HEADER_STATUS_RE);
    notesCol = pickColumn(header, NOTES_HEADER_WORDS, HEADER_NOTES_RE);
  }
  // Fallback URL column: the column with the most http-prefixed values in the first 50 rows.
  if (urlCol < 0) {
    let best = -1, bestCount = 0;
    for (let c = 0; c < width; c++) {
      let n = 0;
      for (let r = hasHeader ? 1 : 0; r < Math.min(data.length, 50); r++) if (URL_VALUE_RE.test(String(data[r][c] || '').trim())) n++;
      if (n > bestCount) { bestCount = n; best = c; }
    }
    urlCol = bestCount > 0 ? best : 0;
  }
  // Fallback name column: first non-URL column with any text.
  if (nameCol < 0) {
    for (let c = 0; c < width; c++) {
      if (c === urlCol) continue;
      if (data.some(r => String(r[c] || '').trim())) { nameCol = c; break; }
    }
  }
  log(`Matrix analyzed: header=${hasHeader}, urlCol=${urlCol}, nameCol=${nameCol}, statusCol=${statusCol}, notesCol=${notesCol}, width=${width}`);
  return { hasHeader, urlCol, nameCol, statusCol, notesCol, width };
}

/** Load a normalized 2D matrix into app state. */
function loadMatrix(data, meta) {
  log(`loadMatrix: ${data.length} rows from "${meta.name}" (mode=${meta.mode}, ext=${meta.ext})`);
  const a = analyzeMatrix(data);
  const bodyRows = data.length - (a.hasHeader ? 1 : 0);

  state.name = meta.name;
  state.ext = meta.ext;
  state.mode = meta.mode;
  state.fileHandle = meta.handle || null;
  state.sourceUrl = meta.sourceUrl || null;
  state.sheetName = meta.sheetName || 'Sheet1';
  state.data = data;
  Object.assign(state, a);

  // Seed per-card status/notes. Priority: explicit session restore > the file's
  // own Status/Notes columns (round-trip) > blank state.
  const n = bodyRows;
  const fileHasCols = a.hasHeader && (a.statusCol >= 0 || a.notesCol >= 0);
  const headerRow = data[0] || [];
  const statusName = a.statusCol >= 0 ? String(headerRow[a.statusCol] || 'Status') : 'Status';
  const notesName  = a.notesCol  >= 0 ? String(headerRow[a.notesCol]  || 'Notes')  : 'Notes';
  const seeded = Array.from({ length: n }, (_, i) => {
    const row = data[i + (a.hasHeader ? 1 : 0)] || [];
    const raw = a.statusCol >= 0 ? String(row[a.statusCol] || '').trim() : '';
    return isCompleteValue(raw) ? 'complete' : 'incomplete';
  });
  const seededNotes = a.hasHeader && a.notesCol >= 0
    ? Array.from({ length: n }, (_, i) => String((data[i + (a.hasHeader ? 1 : 0)] || [])[a.notesCol] ?? ''))
    : null;
  const restoring = Array.isArray(meta.status) && meta.status.length === n;
  state.status = restoring ? meta.status.slice() : seeded;
  state.notes  = restoring ? (Array.isArray(meta.notes) && meta.notes.length === n ? meta.notes.slice() : Array(n).fill(''))
               : (seededNotes || Array(n).fill(''));

  // Round-trip resume: an exported/updated file dropped back in carries the
  // user's progress in its completed status + notes columns. Report what was
  // picked up so "continue where you left off" is visible, not silent.
  const seededDone = seeded.filter(s => s === 'complete').length;
  const seededWithNotes = seededNotes ? seededNotes.filter(s => String(s).trim()).length : 0;
  const resumed = [];
  if (!restoring && fileHasCols) {
    if (a.statusCol >= 0) {
      log(`Seeded ${seededDone} 'complete' status(es) from the file's ${statusName} column (round-trip)`);
      if (seededDone) resumed.push(`${seededDone} complete`);
    }
    if (a.notesCol >= 0) {
      log(`Seeded ${seededWithNotes} note(s) from the file's ${notesName} column (round-trip)`);
      if (seededWithNotes) resumed.push(`${seededWithNotes} note${seededWithNotes === 1 ? '' : 's'}`);
    }
  }

  state.isDirty = false;
  closeAllTabs();
  els.search.value = ''; state.search = '';
  els.showCompleted.checked = false; state.hideCompleted = true;  // completed hidden by default
  state.sortCol = null; state.sortAsc = true; els.sortDir.textContent = '↓';
  state.expanded = {};
  applyLayoutFor(state.data[0] || []);   // auto-apply a saved preset when the header matches
  buildSortOptions();

  updateChrome();
  renderCards();
  els.welcome.hidden = true;
  els.welcome.style.display = 'none';
  maybeShowFirstRunPicker();
  const noun = `task${n === 1 ? '' : 's'}`;
  toast(`Loaded ${n} ${noun} from ${state.name}${resumed.length ? ` — resumed ${resumed.join(' · ')}` : ''}`, 'success');
}

/* ----------------------- First-run open-mode picker ----------------------- */
const LS_SEEN_PICKER = 'turnstone-mode-picked';

function maybeShowFirstRunPicker() {
  let seen = false;
  try { seen = localStorage.getItem(LS_SEEN_PICKER) === '1'; } catch (e) {}
  if (seen) return;
  showModePicker(true);
}

/** Ask the user how links should open (first run, or later via the menu). */
function showModePicker(firstRun) {
  log(`Showing open-mode picker (firstRun=${firstRun})`);
  const overlay = document.createElement('div');
  overlay.id = 'mode-picker';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:300;padding:20px';
  const opts = Object.entries(OPEN_MODES).map(([k, v]) => `
    <button data-pick="${k}" style="display:flex;flex-direction:column;gap:2px;text-align:left;width:100%;margin:6px 0;padding:11px 14px;font-size:13px;cursor:pointer;border-radius:9px;border:1px solid var(--border);background:var(--bg);color:var(--text)">
      <span style="font-weight:600">${v.label}</span>
      <span style="font-size:11px;color:var(--muted)">${v.hint}</span>
    </button>`).join('');
  overlay.innerHTML = `
    <div style="background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:12px;padding:22px;width:380px;max-width:94vw">
      <h3 style="margin:0 0 4px;font-size:15px">How do you want to work through your links?</h3>
      <p style="margin:0 0 12px;font-size:12px;color:var(--muted)">You can change this anytime from the ☰ menu.</p>
      ${opts}
      <button id="picker-later" style="margin-top:8px;padding:6px 10px;font-size:11.5px;cursor:pointer;border-radius:7px;border:1px solid var(--border);background:none;color:var(--muted)">${firstRun ? 'Decide later (tabs by default)' : 'Cancel'}</button>
    </div>`;
  ROOT.appendChild(overlay);
  const done = () => { overlay.remove(); };
  overlay.querySelectorAll('button[data-pick]').forEach(b => {
    b.onclick = () => {
      setOpenMode(b.dataset.pick, false);
      try { localStorage.setItem(LS_SEEN_PICKER, '1'); } catch (e) {}
      toast(`Links will open as ${OPEN_MODES[b.dataset.pick].label.toLowerCase()}`, 'success');
      done();
    };
  });
  overlay.querySelector('#picker-later').onclick = () => {
    try { localStorage.setItem(LS_SEEN_PICKER, '1'); } catch (e) {}
    log('Open-mode picker deferred — staying with current mode');
    done();
  };
}

/* ------------------------- Card column layout ----------------------------- */
const COLLAPSED_COLS = 3;   // data columns shown on a collapsed card
const LS_PRESETS = 'turnstone-col-presets';

/** Header signature: trimmed, lowercased header values joined with '¦'. */
function headerSignature(headerRow) {
  return (headerRow || []).map(h => String(h || '').trim().toLowerCase()).join('¦');
}

function loadPresets() {
  try { return JSON.parse(localStorage.getItem(LS_PRESETS) || '{}'); }
  catch (e) { warn('Could not read column presets', e); return {}; }
}

function savePresets(p) {
  try { localStorage.setItem(LS_PRESETS, JSON.stringify(p)); return true; }
  catch (e) { warn('Could not persist column presets', e); return false; }
}

/** If a saved preset matches this file's header exactly, apply its layout. */
function applyLayoutFor(headerRow) {
  const width = (state.data[0] || []).length;
  if (!width) return;
  const sig = headerSignature(headerRow);
  const presets = loadPresets();
  const preset = sig && presets[sig];
  if (preset && Array.isArray(preset.colOrder)) {
    const valid = preset.colOrder.filter(c => Number.isInteger(c) && c >= 0 && c < width);
    for (let c = 0; c < width; c++) if (!valid.includes(c)) valid.push(c); // tolerate schema drift
    state.colOrder = valid;
    state.colHidden = {};
    for (const c of preset.hidden || []) if (c >= 0 && c < width) state.colHidden[c] = true;
    log(`Preset "${preset.name}" auto-applied (header signature matched)`);
    toast(`Layout preset "${preset.name}" applied`, 'success');
  } else {
    state.colOrder = null;
    state.colHidden = {};
    log('No matching layout preset for this header — using file order');
  }
}

/** Data-column display order for cards (fixed roles excluded). */
function cardColumns() {
  const width = state.data.reduce((m, r) => Math.max(m, r.length), 0);
  const fixed = new Set([state.urlCol, state.nameCol, state.statusCol, state.notesCol].filter(c => c >= 0));
  const all = [];
  for (let c = 0; c < width; c++) if (!fixed.has(c)) all.push(c);
  const order = state.colOrder ? state.colOrder.filter(c => !fixed.has(c) && c < width) : [];
  for (const c of all) if (!order.includes(c)) order.push(c); // append anything the preset didn't mention
  return order.filter(c => !state.colHidden[c]);
}

function colLabel(c) {
  if (state.hasHeader) return String((state.data[0] || [])[c] || '').trim() || `Column ${c + 1}`;
  return `Column ${c + 1}`;
}

function visibleCardCount() { return cardColumns().length; }

/* ------------------------------ Settings UI -------------------------------- */
function openSettings() {
  log('Opening column settings');
  renderSettings();
  els.settingsOverlay.hidden = false;
}
function closeSettings() { els.settingsOverlay.hidden = true; }

function renderSettings() {
  const width = state.data.reduce((m, r) => Math.max(m, r.length), 0);
  const fixed = new Set([state.urlCol, state.nameCol, state.statusCol, state.notesCol].filter(c => c >= 0));
  const roles = { [state.urlCol]: 'URL', [state.nameCol]: 'name', [state.statusCol]: 'status', [state.notesCol]: 'notes' };
  const order = state.colOrder ? state.colOrder.filter(c => c < width) : [];
  for (let c = 0; c < width; c++) if (!order.includes(c)) order.push(c);

  const frag = document.createDocumentFragment();
  for (const c of order) {
    const div = document.createElement('div');
    div.className = 'set-col' + (fixed.has(c) ? ' fixed' : '');
    div.draggable = !fixed.has(c);
    div.dataset.col = c;
    div.innerHTML = fixed.has(c)
      ? `<span class="drag">⋮⋮</span><em>${esc(String(roles[c] || '').toUpperCase())}</em> <span>${esc(colLabel(c))}</span><span class="pos">card feature</span>`
      : `<span class="drag" title="Drag to reorder">⋮⋮</span>
         <label><input type="checkbox" data-colshow="${c}" ${state.colHidden[c] ? '' : 'checked'}> ${esc(colLabel(c))}</label>
         <span class="pos">#${order.indexOf(c) + 1}</span>`;
    frag.appendChild(div);
  }
  if (!order.length) els.settingsCols.innerHTML = '<p class="hint">No extra columns — every column in this file is a fixed card feature.</p>';
  else { els.settingsCols.innerHTML = ''; els.settingsCols.appendChild(frag); }

  const presets = loadPresets();
  const sig = headerSignature(state.hasHeader ? state.data[0] : []);
  els.settingsPresets.innerHTML = '';
  const entries = Object.entries(presets);
  if (!entries.length) { els.settingsPresets.innerHTML = '<p class="hint">No presets saved yet.</p>'; }
  for (const [s, p] of entries) {
    const row = document.createElement('div');
    row.className = 'preset-row';
    row.innerHTML = `<span class="pname">${esc(p.name)}</span>
      <span class="pmeta">${(p.colOrder || []).length} columns · ${p.hidden?.length ? p.hidden.length + ' hidden' : 'none hidden'}${s === sig ? ' · matches this file' : ''}</span>
      <button class="btn" data-preset-apply="${esc(s)}" ${s === sig ? 'disabled' : ''}>Apply here</button>
      <button class="icon" data-preset-del="${esc(s)}" title="Delete preset">🗑</button>`;
    els.settingsPresets.appendChild(row);
  }
}

function savePreset() {
  if (!state.hasHeader) { toast('This file has no header row — presets need column names', 'error'); return; }
  const name = els.presetName.value.trim();
  if (!name) { toast('Give the preset a name first', 'error'); return; }
  const width = state.data.reduce((m, r) => Math.max(m, r.length), 0);
  const order = state.colOrder ? state.colOrder.filter(c => c < width) : [];
  for (let c = 0; c < width; c++) if (!order.includes(c)) order.push(c);
  const hidden = Object.keys(state.colHidden).map(Number).filter(c => c < width);
  const sig = headerSignature(state.data[0]);
  const presets = loadPresets();
  presets[sig] = { name, colOrder: order, hidden, ts: Date.now() };
  if (savePresets(presets)) {
    log(`Column preset "${name}" saved for header signature (${sig.split('¦').length} cols)`);
    toast(`Preset "${name}" saved — files with this exact header auto-apply it`, 'success');
    els.presetName.value = '';
    renderSettings();
  } else toast('Could not save preset (storage unavailable?)', 'error');
}

function applyPresetByKey(sig) {
  const p = loadPresets()[sig];
  if (!p) return;
  state.colOrder = (p.colOrder || []).slice();
  state.colHidden = {};
  for (const c of p.hidden || []) state.colHidden[c] = true;
  state.expanded = {};
  log(`Preset "${p.name}" applied manually`);
  renderCards();
  renderSettings();
}

function resetColLayout() {
  state.colOrder = null;
  state.colHidden = {};
  state.expanded = {};
  log('Column layout reset to file order');
  renderCards();
  renderSettings();
}

/** Read a File/Blob (picked locally) and load it. */
async function loadFromFileObject(file, handle) {
  state.sourceUrl = null; // local picks are not shareable via ?file=
  log(`Reading picked file "${file.name}" (${file.size} bytes, type="${file.type || 'unknown'}", fsHandle=${!!handle})`);
  try {
    const buf = await file.arrayBuffer();
    const det = detectFormat(buf, file.name, file.type);
    const { rows: matrix, sheetName } = await parseDetected(buf, det, null, { allowLinkFallback: true });
    if (!matrix.length) { toast('File appears to be empty', 'error'); warn('Empty file:', file.name); return; }
    // Only formats we can rebuild get silent write-back; the rest import one-way.
    const writable = canWrite(det.format);
    if (!writable) {
      log(`"${det.format}" is import-only — write-back disabled, edits persist to ${storageLabel()}`);
      toast(`${formatLabel(det.format)} imports as a one-way conversion — your edits save to ${storageLabel()}. Use Export to keep them.`, 'success');
    }
    const keep = writable && !!handle;
    loadMatrix(matrix, { name: file.name, ext: det.format, mode: keep ? 'fs' : 'fallback', handle: keep ? handle : null, sheetName });
    await rememberFile(keep ? { key: 'active', kind: 'fs', name: file.name, ts: Date.now(), handle }
                            : { key: 'active', kind: 'fallback', name: file.name, ts: Date.now(), handle: null });
    scheduleSave(0); // persist a session snapshot right away (fallback modes)
  } catch (e) {
    err('Failed to load file', file.name, e);
    toast(`Could not parse "${file.name}": ${e.message}`, 'error');
  }
}

/* ---------------------- Drag & drop initial acquisition ------------------- */
/** True when a drag is carrying files from the OS (not an in-page drag like the
    settings panel's column reordering, which must stay untouched). */
function isFileDrag(e) {
  return [...((e.dataTransfer && e.dataTransfer.types) || [])].includes('Files');
}

/** Chromium hands dropped files a real handle, which can restore silent write-back.
    Resolve it only when it is already writable — no surprise permission dialog on drop. */
async function handleFromDrop(dt) {
  const item = [...(dt.items || [])].find(i => i.kind === 'file' && typeof i.getAsFileSystemHandle === 'function');
  if (!item) return null;
  try {
    const handle = await item.getAsFileSystemHandle();
    if (!handle || handle.kind !== 'file') return null;
    if (!handle.queryPermission) return handle;
    const state = await handle.queryPermission({ mode: 'readwrite' });
    if (state === 'granted') { log(`Dropped file "${handle.name}" is writable → silent write-back enabled`); return handle; }
    log('Dropped file handle is read-only — edits will go to browser storage (use the drop zone→picker, or Open file…, for live write-back)');
    return null;
  } catch (e) {
    warn('Could not read a file handle from the drop', e);
    return null;
  }
}

/** Load the file(s) of a drop. Extra files are reported rather than silently ignored. */
async function handleDroppedFiles(dt) {
  const files = [...(dt.files || [])];
  if (!files.length) return;
  if (files.length > 1) warn(`Drop carried ${files.length} files — loading the first one ("${files[0].name}")`);
  const file = files[0];
  log(`Dropped file "${file.name}" (${file.size} bytes, type="${file.type || 'unknown'}")`);
  toast(`Reading ${file.name}…`);
  await loadFromFileObject(file, await handleFromDrop(dt));
}

/** If this exact file was previously worked on in fallback mode, reuse its statuses/notes. */
async function readSessionMetaFor(name) {
  try {
    const sess = await idbGet('session', 'session');
    if (sess && sess.name === name) { log('Found prior fallback session for', name); return sess; }
  } catch (e) { warn('No session meta', e); }
  return null;
}

/* --------------------------- File acquisition ---------------------------- */
const FS_PICK_OPTS = {
  types: [{
    description: 'Link list (CSV, TSV, XLSX, XLS, ODS, JSON, HTML, XML)',
    accept: {
      'text/csv': ['.csv', '.tsv', '.tab', '.txt'],
      'text/plain': ['.csv', '.tsv', '.txt'],
      'application/json': ['.json', '.jsonl', '.ndjson'],
      'text/html': ['.html', '.htm'],
      'application/xml': ['.xml', '.rss', '.atom', '.opml'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xlsm'],
      'application/vnd.ms-excel': ['.xls', '.xlsb'],
      'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
    },
  }],
  excludeAcceptAllOption: false,
  multiple: false,
};

async function openLocalFile() {
  log(`Open file requested. showOpenFilePicker available: ${!!window.showOpenFilePicker}`);
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker(FS_PICK_OPTS);
      log('File handle acquired:', handle.name);
      const file = await handle.getFile();
      await loadFromFileObject(file, handle);
    } catch (e) {
      if (e.name === 'AbortError') { log('File picker aborted by user'); return; }
      err('showOpenFilePicker failed, using fallback input', e);
      els.fileInput.click();
    }
  } else {
    log('File System Access API unavailable → <input type=file> fallback');
    els.fileInput.click();
  }
}

/** Load a remote file from ?file=/?url= param or the welcome-panel input. */

async function loadFromUrl(fileUrl) {
  fileUrl = String(fileUrl || '').trim();
  let parsed;
  try {
    parsed = new URL(fileUrl, location.href);
  } catch (e) {
    toast('That does not look like a valid URL', 'error');
    warn('URL parse failed for', fileUrl, e);
    return;
  }
  if (!/^https?:$/.test(parsed.protocol)) { toast('Only http(s) URLs can be fetched', 'error'); return; }
  // Bare words resolve as relative URLs — require a scheme or at least a dot before wasting a fetch.
  if (!/^[a-z][a-z0-9+.\-]*:/i.test(fileUrl) && !fileUrl.includes('.')) {
    toast('That does not look like a valid URL', 'error');
    warn('Rejected non-URL input:', fileUrl);
    return;
  }
  if (parsed.href === location.href) { toast('That URL is this app itself — paste a data file URL', 'error'); return; }

  log(`Loading remote file: ${fileUrl}`);
  toast(`Fetching ${parsed.pathname.split('/').pop() || parsed.host}…`);
  els.btnLoadUrl.disabled = true;
  try {
    const res = await fetch(fileUrl, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const buf = await res.arrayBuffer();
    log(`Fetched ${buf.byteLength} bytes (content-type: ${res.headers.get('content-type') || 'unknown'})`);

    // Format detection: magic bytes first, then content sniffing, then URL extension and Content-Type.
    const det = detectFormat(buf, parsed.pathname, res.headers.get('content-type'));

    // Guard: many hosts serve an HTML error/landing page with HTTP 200. Remote HTML is
    // only believed when it really carries a table — never its navigation link list.
    if (det.format === 'html' && det.ext !== 'html' && det.ext !== 'htm') {
      throw new Error(det.ext
        ? `that URL returned a web page, not a ${det.ext.toUpperCase()} file`
        : 'that URL returned a web page — paste a direct link to a data file instead');
    }

    let { rows: matrix, sheetName } = await parseDetected(buf, det, null, { allowLinkFallback: false });
    if (isWorkbookFormat(det.format) && await wbHasMultipleSheets(buf)) {
      const pick = await pickSheetName(buf, sheetName);
      if (pick === null) { log('User cancelled sheet picker — load aborted'); return; }
      ({ rows: matrix, sheetName } = await parseDetected(buf, det, pick));
    }
    if (!matrix.length) { toast('Remote file appears to be empty', 'error'); return; }

    // If this URL was worked on before in fallback mode, restore its statuses/notes (round-trip for remote files).
    const meta = await readSessionMetaFor(fileUrl);
    loadMatrix(matrix, { name: parsed.pathname.split('/').pop() || parsed.host, ext: det.format, mode: 'remote', sheetName, sourceUrl: fileUrl, status: meta?.status, notes: meta?.notes });
    await rememberFile({ key: 'active', kind: 'url', name: state.name, ts: Date.now(), handle: null, url: fileUrl });
    scheduleSave(0);
  } catch (e) {
    err('Remote file load failed', e);
    // Only network problems get the fetch/CORS framing; parse and format errors
    // (unsupported format, HTML error page, malformed XML) speak for themselves.
    if (/Failed to fetch|NetworkError|load failed/i.test(String(e.message))) {
      toast(`Fetch failed: ${e.message}. The host may block cross-origin reads (CORS) — or the URL is unreachable.`, 'error');
    } else {
      toast(String(e.message), 'error');
    }
  } finally {
    els.btnLoadUrl.disabled = false;
  }
}

/** Sheet-name list for the workbook behind `buf` (SheetJS returns an array OR {SheetNames}). */
async function sheetNamesOf(buf) {
  if (!HAS_XLSX) return [];
  const info = await XLSX.read(buf, { type: 'array', bookSheets: true });
  return Array.isArray(info) ? info : (info && info.SheetNames) || [];
}

/** True when the workbook behind `buf` has more than one sheet. */
async function wbHasMultipleSheets(buf) {
  try { return (await sheetNamesOf(buf)).length > 1; }
  catch (e) { warn('Could not inspect sheet list', e); return false; }
}

/** Ask the user which worksheet to load (only for multi-sheet workbooks). Returns null when cancelled. */
function pickSheetName(buf, current) {
  return new Promise(async (resolve) => {
    const names = await sheetNamesOf(buf);
    log(`Multi-sheet workbook detected: [${names.join(', ')}]`);
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:999';
    overlay.innerHTML = `
      <div style="background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:12px;padding:22px;min-width:280px">
        <h3 style="margin:0 0 4px;font-size:15px">Multiple sheets found</h3>
        <p style="margin:0 0 12px;font-size:12px;color:var(--muted)">Which worksheet holds your task list?</p>
        ${names.map(n => `<button data-sheet="${esc(n)}" style="display:block;width:100%;text-align:left;margin:4px 0;padding:7px 12px;font-size:13px;cursor:pointer;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text)${n === current ? ';border-color:var(--accent-dark);font-weight:600' : ''}">${esc(n)}</button>`).join('')}
        <button id="sheet-cancel" style="margin-top:8px;padding:6px 12px;font-size:12px;cursor:pointer;border-radius:8px;border:1px solid var(--border);background:none;color:var(--muted)">Cancel</button>
      </div>`;
    ROOT.appendChild(overlay);
    overlay.querySelector('#sheet-cancel').onclick = () => { overlay.remove(); resolve(null); };
    overlay.querySelectorAll('button[data-sheet]').forEach(b => { b.onclick = () => { const s = b.dataset.sheet; overlay.remove(); log('User picked sheet:', s); resolve(s); }; });
  });
}

/* --------------------- Restore / recent files (IDB) ---------------------- */
async function rememberFile(activeRecord) {
  try {
    await idbPut('handles', activeRecord);
    await idbPut('handles', { key: activeRecord.name, kind: activeRecord.kind, name: activeRecord.name, ts: activeRecord.ts, handle: activeRecord.handle });
    els.miRestore.hidden = false;
    log('File handle remembered in IndexedDB (active + recents)');
  } catch (e) { warn('Could not persist file handle', e); }
}

async function restoreLastFile() {
  log('Restore Workspace clicked');
  try {
    const rec = await idbGet('handles', 'active');
    if (!rec) { toast('No previous workspace found', 'error'); return; }
    if (rec.kind === 'fs' && rec.handle) {
      let perm = await rec.handle.queryPermission({ mode: 'readwrite' });
      log(`Saved handle permission: ${perm}`);
      if (perm !== 'granted') {
        perm = await rec.handle.requestPermission({ mode: 'readwrite' });
        log(`Requested handle permission: ${perm}`);
      }
      if (perm !== 'granted') { toast('Permission denied — pick the file again', 'error'); return; }
      const file = await rec.handle.getFile();
      await loadFromFileObject(file, rec.handle);
    } else {
      const sess = await idbGet('session', 'session');
      if (!sess || !sess.data) { toast('No saved browser session found', 'error'); return; }
      log('Restoring fallback session from IndexedDB:', sess.name);
      loadMatrix(sess.data, { name: sess.name, ext: sess.ext || 'csv', mode: 'fallback', sheetName: sess.sheetName, status: sess.status, notes: sess.notes, sourceUrl: sess.sourceUrl || null });
      state.isDirty = true; // still needs exporting
      updateSaveIndicator();
      scheduleSave(0);
    }
  } catch (e) {
    err('Restore failed', e);
    toast(`Restore failed: ${e.message}`, 'error');
  }
}

async function renderRecents() {
  try {
    const all = (await idbGetAll('handles')).filter(r => r.name && r.ts).sort((a, b) => b.ts - a.ts).slice(0, 5);
    if (!all.length) return;
    els.recents.hidden = false;
    els.recentsList.innerHTML = '';
    for (const r of all) {
      const btn = document.createElement('button');
      btn.className = 'recent-item';
      btn.innerHTML = `<span>📄 ${esc(r.name)}</span><span class="ts">${new Date(r.ts).toLocaleString()}</span>`;
      btn.addEventListener('click', () => {
        log('Recent file clicked:', r.name);
        if (r.kind === 'fs' && r.handle) { restoreHandle(r.handle); }
        else if (r.kind === 'url' && r.url) { loadFromUrl(r.url); }
        else { restoreLastFile(); }
      });
      els.recentsList.appendChild(btn);
    }
    log(`Rendered ${all.length} recent file(s)`);
  } catch (e) { warn('Recents render failed', e); }
}

async function restoreHandle(handle) {
  try {
    let perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') perm = await handle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') { toast('Permission denied — pick the file again', 'error'); return; }
    await loadFromFileObject(await handle.getFile(), handle);
  } catch (e) {
    err('Recent-file restore failed', e);
    toast(`Could not reopen file: ${e.message}`, 'error');
  }
}

/* ------------------------------- Rendering ------------------------------- */
function cardCount() { return state.data.length - (state.hasHeader ? 1 : 0); }

function updateChrome() {
  const modeLabels = { fs: 'file write-back ON', fallback: SESSION_ONLY ? 'this tab only — export to keep' : 'fallback: browser storage', remote: 'remote file (read-only source)', demo: 'demo data' };
  const has = cardCount() > 0;
  // Sidebar header: file name + save state
  els.headName.innerHTML = state.name
    ? `${esc(state.name)} <span style="color:var(--muted);font-size:10.5px">· ${modeLabels[state.mode] || ''} · ${state.ext.toUpperCase()}</span>`
    : '<span class="no-file">No file loaded</span>';
  els.headName.title = state.sourceUrl ? `${state.name} — from ${state.sourceUrl}` : (state.name || '');
  // Menu item availability
  els.miClose.disabled = !state.mode;
  els.miLink.disabled = !state.sourceUrl;
  els.miExportCsv.disabled = !has;
  els.miExportXlsx.disabled = !has || !HAS_XLSX_WRITE;
  els.miExportXlsx.hidden = !HAS_XLSX_WRITE;   // no workbook writer → offer only what works
  updateSaveIndicator();
  renderModeMenu();
  renderAutoMenu();
}

function updateSaveIndicator() {
  const el = els.headSave;
  el.className = '';
  if (!state.mode) { el.textContent = ''; return; }
  if (state.isDirty) { el.className = 'dirty'; el.textContent = '● unsaved'; }
  else if (state.lastSavedAt) {
    el.className = 'saved';
    el.textContent = `✓ saved ${new Date(state.lastSavedAt).toLocaleTimeString()}`;
  } else el.textContent = '';
}

/* ------------------------------ Card ordering ----------------------------- */
function buildSortOptions() {
  els.sortCol.innerHTML = '<option value="">File order</option>';
  const width = state.data.reduce((m, r) => Math.max(m, r.length), 0);
  const fixed = new Set([state.urlCol, state.nameCol, state.statusCol, state.notesCol].filter(c => c >= 0));
  for (let c = 0; c < width; c++) {
    const o = document.createElement('option');
    o.value = String(c);
    o.textContent = (fixed.has(c) ? colLabel(c) + ' *' : colLabel(c));
    els.sortCol.appendChild(o);
  }
  els.sortCol.value = state.sortCol === null ? '' : String(state.sortCol);
}

function sortedIndices() {
  const total = cardCount();
  const idx = Array.from({ length: total }, (_, i) => i);
  if (state.sortCol === null || state.sortCol < 0) return idx;
  const c = state.sortCol;
  const val = i => String((state.data[i + (state.hasHeader ? 1 : 0)] || [])[c] ?? '').trim();
  const numeric = idx.every(i => val(i) === '' || /^-?\d+(\.\d+)?$/.test(val(i)));
  idx.sort((a, b) => {
    const va = val(a), vb = val(b);
    let cmp;
    if (numeric) cmp = (parseFloat(va) || 0) - (parseFloat(vb) || 0);
    else cmp = va.localeCompare(vb, undefined, { sensitivity: 'base', numeric: true });
    return state.sortAsc ? cmp : -cmp;
  });
  return idx;
}

/** Next incomplete card in file order after row i (or first, when i is null). */
function nextIncompleteRow(afterRow) {
  const total = cardCount();
  const start = afterRow === null || afterRow === undefined ? 0 : afterRow + 1;
  for (let j = start; j < total; j++) if ((state.status[j] || 'incomplete') !== 'complete') return j;
  for (let j = 0; j <= (afterRow ?? -1); j++) if ((state.status[j] || 'incomplete') !== 'complete') return j; // wrap
  return -1;
}

function renderCards() {
  const q = state.search.trim().toLowerCase();
  const total = cardCount();
  const cols = cardColumns();               // display-ordered, hidden-removed
  const collapsed = cols.slice(0, COLLAPSED_COLS);
  const extra = cols.slice(COLLAPSED_COLS); // shown only when expanded
  let visible = 0;
  log(`renderCards: total=${total}, cols=${cols.length}, sort=${state.sortCol === null ? 'file' : state.sortCol + (state.sortAsc ? ' asc' : ' desc')}, search="${q}", showCompleted=${!state.hideCompleted}`);
  const frag = document.createDocumentFragment();

  const copyBtn = (value, label, key) =>
    `<button class="icon copy" data-copy-col="${key}" data-copy-label="${esc(label)}" title="Copy ${esc(label)}">⧉</button>`;

  const colRow = (c, i) => {
    const row = state.data[i + (state.hasHeader ? 1 : 0)] || [];
    const raw = String(row[c] ?? '').trim();
    if (!raw) return ''; // no value → no row, no clutter
    return `<div class="col-row">
      <span class="ck">${esc(colLabel(c))}</span>
      <span class="cv">${esc(raw)}</span>
      ${copyBtn(raw, colLabel(c), `${i}:${c}`)}
    </div>`;
  };

  for (const i of sortedIndices()) {
    const row = state.data[i + (state.hasHeader ? 1 : 0)] || [];
    const url = String(row[state.urlCol] || '').trim();
    const name = String(state.nameCol >= 0 ? row[state.nameCol] : '') || url;
    const status = state.status[i] || 'incomplete';
    const notes = state.notes[i] || '';

    if (state.hideCompleted && status === 'complete') continue;
    if (q && !(`${name} ${url} ${notes} ${row.join(' ')}`.toLowerCase().includes(q))) continue;
    visible++;

    const expanded = !!state.expanded[i] || extra.length === 0;
    const shown = expanded ? cols : collapsed;
    const colRows = shown.map(c => colRow(c, i)).join('');
    const moreBtn = extra.length
      ? `<button class="col-more" data-toggle-col="${i}">${expanded ? '▲ Less' : `▼ +${extra.length} more column${extra.length === 1 ? '' : 's'}`}</button>`
      : '';

    const card = document.createElement('article');
    card.className = 'card' + (status === 'complete' ? ' done' : '') + (expanded ? ' ex' : '');
    card.dataset.rowIndex = i; // PRD: DOM↔array mapping via data-row-index
    card.innerHTML = `
      <div class="card-top">
        <button class="card-title" title="Open this link (your chosen mode) + show all columns">${highlight(name, state.search.trim())}</button>
        ${copyBtn(name, 'name', `${i}:name`)}
        <a class="icon" href="${esc(url)}" target="_blank" rel="noopener" title="Open in new browser tab (always a real tab)">↗</a>
      </div>
      <div class="card-url">
        <a href="${esc(url)}" target="_blank" rel="noopener" title="${esc(url)}">${highlight(url, state.search.trim())}</a>
        ${copyBtn(url, 'URL', `${i}:url`)}
      </div>
      ${colRows}
      ${moreBtn}
      <div class="card-mid">
        ${status === 'complete'
          ? `<button class="btn-undo" data-undo="${i}" title="Mark back to incomplete">↺ Incomplete</button>`
          : `<button class="btn-done" data-done="${i}" title="Mark complete (auto-opens next when enabled)">✓ Complete</button>`}
      </div>
      <div class="card-notes">
        <span class="label">Notes ${copyBtn(notes, 'notes', `${i}:notes`)}</span>
        <textarea rows="2" placeholder="Add a note…" data-notes="${i}">${esc(notes)}</textarea>
      </div>`;
    frag.appendChild(card);
  }

  const done = state.status.filter(s => s === 'complete').length;
  const allDone = total > 0 && state.hideCompleted && done === total;
  els.cards.innerHTML = '';
  if (!visible) els.cards.innerHTML = `<div class="empty">${
    !total ? 'No file loaded yet.<br>Open a link list to populate task cards.'
    : allDone ? `All ${total} task${total === 1 ? '' : 's'} complete — tick “Show completed” to review them.`
    : 'No tasks match your filters.'}</div>`;
  else els.cards.appendChild(frag);

  els.countTotal.textContent = `${total} task${total === 1 ? '' : 's'}`;
  els.countDone.textContent = `${done} done`;
  els.countLeft.textContent = `${total - done} left`;
  els.filterInfo.textContent = q || state.hideCompleted ? `${visible} shown · ${done} hidden` : '';
  log(`renderCards done: ${visible} visible, ${done} complete`);
}

/** Completion side-effects: hide the done card (default) and auto-advance. */
function afterComplete(i) {
  if (state.autoAdvance) {
    const next = nextIncompleteRow(i);
    if (next >= 0) {
      log(`Auto-advance: next incomplete row is ${next}`);
      state.expanded[next] = true;
      openUrlFor(next);
    } else {
      log('Auto-advance: no incomplete rows left — queue finished!');
      toast('🎉 Queue finished — every task is complete', 'success');
    }
  }
  renderCards();
  markDirty();
}

/* ------------------------------ Open modes -------------------------------- */
/* How a card's link opens: tabbed iframes, a real browser tab, or a popup window.
   User-selectable at any time; remembered across sessions. */
const LS_OPEN_MODE = 'turnstone-open-mode';
const OPEN_MODES = {
  tabs:   { label: 'Tabs (iframes)',       hint: 'Open inside this app, one tab per link' },
  newtab: { label: 'New browser tab',      hint: 'Hand off to a full browser tab' },
  newwin: { label: 'New popup window',     hint: 'Small always-on-top window beside the queue' },
};

function getOpenMode() {
  try { const m = localStorage.getItem(LS_OPEN_MODE); if (OPEN_MODES[m]) return m; } catch (e) {}
  return 'tabs';
}

function setOpenMode(m, announce = true) {
  if (!OPEN_MODES[m]) return;
  try { localStorage.setItem(LS_OPEN_MODE, m); } catch (e) { warn('Could not persist open mode', e); }
  if (announce) { log(`Open mode → ${OPEN_MODES[m].label}`); toast(`Links now open as ${OPEN_MODES[m].label.toLowerCase()}`); }
  renderModeMenu();
}

/** Open a task URL according to the current mode. */
function openUrlFor(i) {
  const url = String((state.data[i + (state.hasHeader ? 1 : 0)] || [])[state.urlCol] || '').trim();
  if (!url) { warn(`openUrlFor(${i}): no URL in row`); return; }
  const mode = getOpenMode();
  log(`Opening row ${i} as ${mode}: ${url}`);
  if (mode === 'tabs') { openInIframe(url, i); return; }
  if (mode === 'newtab') { window.open(url, '_blank', 'noopener'); return; }
  if (mode === 'newwin') {
    const w = window.open(url, 'turnstone-win', 'popup=yes,width=1024,height=768,noopener');
    if (!w) toast('Popup blocked — allow popups for this site, or use Tabs/New tab mode', 'error');
  }
}

function renderModeMenu() {
  const mode = getOpenMode();
  els.menu.querySelectorAll('.mode-item').forEach(b => b.classList.toggle('checked', b.dataset.mode === mode));
  els.tabbar.classList.toggle('hidden-mode', mode !== 'tabs');
}

/* ------------------------- Tabbed iframe workspace ------------------------ */
let tabs = [];        // { id, url, title, rowId }
let activeTabId = null;
let tabSeq = 0;

/** PRD Task 3.2: open (or focus) a URL in a tabbed iframe. */
function openInIframe(url, rowId) {
  if (!url) { warn('openInIframe called with empty URL'); return; }
  const existing = tabs.find(t => t.rowId === rowId && t.url === url);
  if (existing) { log(`Tab for row ${rowId} already open → focusing tab ${existing.id}`); activateTab(existing.id); return; }

  const id = 'tab-' + (++tabSeq);
  const title = tabTitle(url, rowId);
  log(`Opening iframe tab ${id}: "${title}" → ${url}`);
  tabs.push({ id, url, title, rowId });

  const pane = document.createElement('div');
  pane.className = 'pane'; pane.id = id; pane.dataset.tabId = id;
  pane.innerHTML = `<iframe src="${esc(url)}" referrerpolicy="no-referrer-when-downgrade" allow="fullscreen"></iframe>`;
  els.panes.appendChild(pane);

  renderTabbar();
  activateTab(id);
}

function tabTitle(url, rowId) {
  const row = state.data[rowId + (state.hasHeader ? 1 : 0)] || [];
  const name = String(state.nameCol >= 0 ? row[state.nameCol] : '').trim();
  let t = name || url.replace(/^https?:\/\//, '');
  if (t.length > 26) t = t.slice(0, 25) + '…';
  return t;
}

function renderTabbar() {
  els.tabbar.innerHTML = '';
  for (const t of tabs) {
    const tab = document.createElement('div');
    tab.className = 'tab' + (t.id === activeTabId ? ' active' : '');
    tab.dataset.tabId = t.id;
    tab.title = t.url;
    tab.innerHTML = `
      <span class="tab-title">${esc(t.title)}</span>
      <a class="tab-ext" href="${esc(t.url)}" target="_blank" rel="noopener" title="Open in new browser tab">↗</a>
      <button class="tab-close" title="Close tab">✕</button>`;
    els.tabbar.appendChild(tab);
  }
}

/** PRD Task 3.3: switch tabs by hiding/showing panes (iframes never reload). */
function activateTab(id) {
  activeTabId = id;
  const target = tabs.find(t => t.id === id);
  log(`Activating tab ${id}${target ? ` (${target.title})` : ''}`);
  for (const pane of els.panes.querySelectorAll('.pane')) pane.classList.toggle('active', pane.id === id);
  renderTabbar();
}

function closeTab(id) {
  const idx = tabs.findIndex(t => t.id === id);
  if (idx < 0) return;
  log(`Closing tab ${id} (${tabs[idx].title})`);
  els.panes.querySelector(`#${CSS.escape(id)}`)?.remove(); // destroys the iframe
  tabs.splice(idx, 1);
  if (activeTabId === id) {
    const next = tabs[Math.min(idx, tabs.length - 1)];
    activeTabId = next ? next.id : null;
  }
  renderTabbar();
  if (activeTabId) activateTab(activeTabId);
}

function closeAllTabs() {
  if (tabs.length) log(`Closing all ${tabs.length} tab(s) for new file`);
  tabs = []; activeTabId = null;
  els.tabbar.innerHTML = '';
  els.panes.querySelectorAll('.pane').forEach(p => p.remove());
}

/* ------------------------ Write-back & persistence ----------------------- */
let saveTimer = null;

/** PRD Task 4.1: debounced auto-save (1.2s in FS mode, 0.7s fallback). */
function markDirty() {
  state.isDirty = true;
  updateSaveIndicator();
  scheduleSave();
}
function scheduleSave(delay) {
  clearTimeout(saveTimer);
  const d = delay ?? (state.mode === 'fs' ? 1200 : 700);
  saveTimer = setTimeout(saveNow, d);
}

async function saveNow() {
  if (!state.mode || !cardCount()) return;
  clearTimeout(saveTimer);
  const t0 = performance.now();
  log(`saveNow: mode=${state.mode}, dirty=${state.isDirty}`);
  try {
    if (state.mode === 'fs' && state.fileHandle && canWrite(state.ext)) {
      const perm = await state.fileHandle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        warn('Write permission lost — cannot silently save. Data kept in memory.');
        toast('File permission expired — use Restore Workspace to re-authorize, then edit again.', 'error');
        await persistSessionSnapshot(); // safety net
        return;
      }
      await writeBackToFile();
      state.isDirty = false;
      state.lastSavedAt = Date.now(); state.lastSavedWhere = 'to file';
      log(`Wrote file "${state.name}" in ${(performance.now() - t0).toFixed(0)}ms`);
    } else {
      await persistSessionSnapshot();
      state.isDirty = state.mode !== 'fs'; // fallback stays dirty until exported
      state.lastSavedAt = Date.now(); state.lastSavedWhere = 'to browser storage';
      log(`Saved session snapshot in ${(performance.now() - t0).toFixed(0)}ms`);
    }
  } catch (e) {
    err('Save failed', e);
    toast(`Save failed: ${e.message}`, 'error');
  }
  updateSaveIndicator();
}

/** Merge virtual Status/Notes columns into an export matrix. */
function buildExportMatrix() {
  let next = state.data.reduce((m, r) => Math.max(m, r.length), 1);
  const stCol = state.statusCol >= 0 ? state.statusCol : next++;
  const ntCol = state.notesCol >= 0 ? state.notesCol : next++;

  const out = [];
  if (state.hasHeader) {
    const header = state.data[0].slice();
    while (header.length < next) header.push('');
    header[stCol] = 'Status';
    header[ntCol] = 'Notes';
    out.push(header);
  } else {
    out.push(Array.from({ length: next }, (_, c) => c === state.urlCol ? 'URL' : c === stCol ? 'Status' : c === ntCol ? 'Notes' : `Column ${c + 1}`));
    log('No header row in source — a header row will be added on write-back to persist Status/Notes');
  }
  for (let i = 0; i < cardCount(); i++) {
    const row = (state.data[i + (state.hasHeader ? 1 : 0)] || []).slice();
    while (row.length < next) row.push('');
    row[stCol] = state.status[i] || 'incomplete';
    row[ntCol] = state.notes[i] || '';
    out.push(row);
  }
  log(`buildExportMatrix: ${out.length} rows × ${next} cols (status@${stCol}, notes@${ntCol})`);
  return out;
}

/** PRD Task 4.1: silent write-back via File System Access API. */
async function writeBackToFile() {
  const matrix = buildExportMatrix();
  const writable = await state.fileHandle.createWritable();
  try {
    if (isWorkbookFormat(state.ext)) {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matrix), sanitizeSheetName(state.sheetName));
      await writable.write(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
    } else {
      // Delimited text keeps its own delimiter so a TSV source stays a TSV.
      await writable.write(Papa.unparse(matrix, { delimiter: state.ext === 'tsv' ? '\t' : ',' }));
    }
  } finally {
    await writable.close();
  }
  log(`Write-back complete (${state.ext})`);
}

function sanitizeSheetName(n) {
  const clean = String(n || 'Sheet1').replace(/[\\/?*[\]:]/g, '_');
  return clean.slice(0, 31) || 'Sheet1';
}

/** PRD Task 4.3: fallback persistence — full snapshot to IndexedDB. */
async function persistSessionSnapshot() {
  try {
    await idbPut('session', {
      key: 'session', name: state.name, ext: state.ext, sheetName: state.sheetName,
      data: state.data, status: state.status, notes: state.notes, sourceUrl: state.sourceUrl, ts: Date.now(),
    });
    log(`Session snapshot persisted (${cardCount()} cards)`);
  } catch (e) {
    err('Session snapshot failed (file too large for IndexedDB?)', e);
  }
}

/* PRD Task 4.3: export via Blob download (always available). */
function exportFile(kind) {
  if (kind === 'xlsx' && !HAS_XLSX_WRITE) {
    warn('XLSX export requested in a build without a workbook writer');
    toast('XLSX export is not in this build — Export CSV instead', 'error');
    return;
  }
  const matrix = buildExportMatrix();
  const base = (state.name || 'turnstone').replace(/\.[a-z0-9]+$/i, '');
  const a = document.createElement('a');
  if (kind === 'xlsx') {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matrix), sanitizeSheetName(state.sheetName));
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = base + '.xlsx';
  } else {
    a.href = URL.createObjectURL(new Blob([Papa.unparse(matrix)], { type: 'text/csv;charset=utf-8' }));
    a.download = base + '-turnstone.csv';
  }
  document.body.appendChild(a); a.click(); a.remove();
  log(`Exported ${a.download} (${kind})`);
  toast(`Exported ${a.download}`, 'success');
}

/* beforeunload guard removed in the bookmarklet build: leaving a page is the host
   page's business, and our state is session-only by design anyway. */
// Safety net: flush pending debounced saves when the tab is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && state.isDirty) { log('Visibility hidden → flushing pending save'); saveNow(); }
});

/* PWA plumbing removed in the bookmarklet build — an installed app and an
   install prompt belong to a real origin, not to a page we were launched from. */

/* Service worker: offline shell. Skipped on plain file:// (nothing to serve), and
   skipped in the standalone single-file build, where there is no sw.js to load.
   assets/build-standalone.js flips STANDALONE_BUILD to true. */
const STANDALONE_BUILD = true;
if (!STANDALONE_BUILD && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => log(`Service worker registered (scope: ${reg.scope})`))
      .catch((e) => warn('Service worker registration failed (offline mode unavailable)', e));
  }
} else {
  log(STANDALONE_BUILD ? 'Service worker skipped (standalone single-file build)' : `Service worker skipped on ${location.protocol} origin`);
}

/* Install button: only shown when the browser fires beforeinstallprompt. */
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  els.miInstall.hidden = false;
  log('Turnstone is installable → Install item shown in menu');
});
els.miInstall.addEventListener('click', async () => {
  closeMenu();
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  log(`Install prompt outcome: ${outcome}`);
  deferredInstallPrompt = null;
  els.miInstall.hidden = true;
});
window.addEventListener('appinstalled', () => {
  els.miInstall.hidden = true;
  log('Turnstone installed as an app');
  toast('Turnstone installed — find it in your apps menu', 'success');
});

/* ----------------------------- Demo dataset ------------------------------ */
const DEMO_CSV = `Name,URL,Notes
Example Domain,https://example.com/,
HTTPBin HTML,https://httpbin.org/html/,
MDN Web Docs,https://developer.mozilla.org/,
OpenStreetMap Embed,https://www.openstreetmap.org/export/embed.html?bbox=-0.2%2C51.4%2C0.0%2C51.6&layer=mapnik,
Wikipedia,https://en.wikipedia.org/wiki/Main_Page,`;

function loadDemo() {
  log('Loading demo dataset');
  const matrix = parseDelimitedText(DEMO_CSV, 'csv');
  loadMatrix(matrix, { name: 'demo-links.csv', ext: 'csv', mode: 'demo', sourceUrl: null });
  scheduleSave(0);
}

/* ------------------------------ Event wiring ----------------------------- */
/* Hamburger menu */
function openMenu() {
  els.menu.hidden = false;
  const r = els.btnMenu.getBoundingClientRect();
  els.menu.style.left = Math.min(r.left, window.innerWidth - 276) + 'px';
  log('Menu opened');
}
function closeMenu() { els.menu.hidden = true; }
els.btnMenu.addEventListener('click', (e) => { e.stopPropagation(); els.menu.hidden ? openMenu() : closeMenu(); });
document.addEventListener('click', (e) => { if (!els.menu.hidden && !e.target.closest('#menu') && !e.target.closest('#btn-menu')) closeMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
window.addEventListener('resize', () => { if (!els.menu.hidden) closeMenu(); });

els.miOpen.addEventListener('click', () => { closeMenu(); openLocalFile(); });

/* Drop zone: click/press to pick a file. Drops themselves are handled on the
   document (below) so that a file dropped anywhere still loads — and, just as
   importantly, so the browser never navigates away to the dropped file. */
els.dropzone.addEventListener('click', openLocalFile);
els.dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLocalFile(); }
});
ROOT.addEventListener('dragover', (e) => {
  if (!isFileDrag(e)) return;                 // leave in-page drags (settings reorder) alone
  e.preventDefault();                          // required for `drop` to fire at all
  els.dropzone.classList.add('over');
});
ROOT.addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) els.dropzone.classList.remove('over');   // left the window
});
ROOT.addEventListener('drop', async (e) => {
  els.dropzone.classList.remove('over');
  if (!isFileDrag(e)) return;                 // an in-page drag: not ours to handle
  e.preventDefault();
  try {
    await handleDroppedFiles(e.dataTransfer);
  } catch (err2) {
    err('Dropped-file load failed', err2);
    toast(`Could not read the dropped file: ${err2.message}`, 'error');
  }
});
window.addEventListener('blur', () => els.dropzone.classList.remove('over'));
els.miRestore.addEventListener('click', () => { closeMenu(); restoreLastFile(); });
els.miClose.addEventListener('click', () => { closeMenu(); closeCurrentFile(); });
els.miLink.addEventListener('click', async () => {
  closeMenu();
  if (!state.sourceUrl) return;
  const link = `${location.origin}${location.pathname}?file=${encodeURIComponent(state.sourceUrl)}`;
  await copyText(link, 'shareable ?file= link');
  toast('Link copied — anyone opening it gets this same file', 'success');
});
els.menu.querySelectorAll('.mode-item').forEach(b => b.addEventListener('click', () => { closeMenu(); setOpenMode(b.dataset.mode); }));
els.menu.querySelector('#mi-mode-help')?.addEventListener('click', () => { closeMenu(); showModePicker(false); });

/* Automation toggles (persisted) */
const LS_AUTO_OPEN = 'turnstone-auto-open', LS_AUTO_ADV = 'turnstone-auto-advance';
function getAutoOpen() { try { return localStorage.getItem(LS_AUTO_OPEN) === '1'; } catch (e) { return false; } }
function getAutoAdvance() { try { return localStorage.getItem(LS_AUTO_ADV) === '1'; } catch (e) { return false; } }
function renderAutoMenu() {
  els.miAutoOpen.classList.toggle('checked', getAutoOpen());
  els.miAutoAdvance.classList.toggle('checked', getAutoAdvance());
}
els.miAutoOpen.addEventListener('click', () => {
  const next = !getAutoOpen();
  try { localStorage.setItem(LS_AUTO_OPEN, next ? '1' : '0'); } catch (e) {}
  state.autoOpenOnSelect = next;
  log(`Auto-open-on-select → ${next}`);
  toast(next ? 'Cards auto-open their link when selected' : 'Auto-open on select is off');
  renderAutoMenu();
});
els.miAutoAdvance.addEventListener('click', () => {
  const next = !getAutoAdvance();
  try { localStorage.setItem(LS_AUTO_ADV, next ? '1' : '0'); } catch (e) {}
  state.autoAdvance = next;
  log(`Auto-advance → ${next}`);
  toast(next ? 'Completing a task opens the next one' : 'Auto-advance is off');
  renderAutoMenu();
});
els.miColumns.addEventListener('click', () => { closeMenu(); openSettings(); });
els.miExportCsv.addEventListener('click', () => { closeMenu(); exportFile('csv'); });
els.miExportXlsx.addEventListener('click', () => { closeMenu(); exportFile('xlsx'); });
els.miTheme.addEventListener('click', () => { closeMenu(); toggleThemeFromMenu(); });

function toggleThemeFromMenu() {
  const next = THEME_ROOT.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('turnstone-theme', next); log(`Theme saved to localStorage: ${next}`); }
  catch (e) { warn('Could not persist theme preference', e); }
}

els.fileInput.addEventListener('change', async () => {
  const f = els.fileInput.files[0];
  els.fileInput.value = '';
  if (f) await loadFromFileObject(f, null);
});
els.btnDemo.addEventListener('click', loadDemo);
els.settingsX.addEventListener('click', closeSettings);
els.settingsOverlay.addEventListener('click', (e) => { if (e.target === els.settingsOverlay) closeSettings(); });
els.btnPresetSave.addEventListener('click', savePreset);
els.presetName.addEventListener('keydown', (e) => { if (e.key === 'Enter') savePreset(); });
els.btnColsReset.addEventListener('click', resetColLayout);

els.settingsCols.addEventListener('change', (e) => {
  const cb = e.target.closest('input[data-colshow]');
  if (!cb) return;
  const c = +cb.dataset.colshow;
  if (cb.checked) delete state.colHidden[c];
  else state.colHidden[c] = true;
  log(`Column ${c} (${colLabel(c)}) → ${cb.checked ? 'shown' : 'hidden'}`);
  renderCards();
  renderSettings();
});
els.settingsPresets.addEventListener('click', (e) => {
  const applyBtn = e.target.closest('[data-preset-apply]');
  if (applyBtn) { applyPresetByKey(applyBtn.dataset.presetApply); return; }
  const delBtn = e.target.closest('[data-preset-del]');
  if (delBtn) {
    const sig = delBtn.dataset.presetDel;
    const presets = loadPresets();
    const name = presets[sig]?.name || sig;
    delete presets[sig];
    savePresets(presets);
    log(`Preset "${name}" deleted`);
    toast(`Preset "${name}" deleted`);
    renderSettings();
  }
});

/* Drag-to-reorder inside the settings panel (HTML5 DnD, desktop convenience). */
let dragCol = null;
els.settingsCols.addEventListener('dragstart', (e) => {
  const row = e.target.closest('.set-col:not(.fixed)');
  if (!row) return;
  dragCol = +row.dataset.col;
  row.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
});
els.settingsCols.addEventListener('dragend', () => {
  els.settingsCols.querySelectorAll('.dragging').forEach(r => r.classList.remove('dragging'));
});
els.settingsCols.addEventListener('dragover', (e) => {
  const over = e.target.closest('.set-col:not(.fixed)');
  if (over && dragCol !== null) e.preventDefault();
});
els.settingsCols.addEventListener('drop', (e) => {
  const over = e.target.closest('.set-col:not(.fixed)');
  if (!over || dragCol === null) return;
  e.preventDefault();
  const target = +over.dataset.col;
  if (target === dragCol) return;
  const width = state.data.reduce((m, r) => Math.max(m, r.length), 0);
  const order = state.colOrder ? state.colOrder.filter(c => c < width) : [];
  for (let c = 0; c < width; c++) if (!order.includes(c)) order.push(c);
  order.splice(order.indexOf(dragCol), 1);
  order.splice(order.indexOf(target), 0, dragCol);
  state.colOrder = order;
  log(`Column order → [${order.join(', ')}]`);
  dragCol = null;
  renderCards();
  renderSettings();
});
els.btnTestCsv.addEventListener('click', () => loadTestFile('csv'));
els.btnTestXlsx.addEventListener('click', () => loadTestFile('xlsx'));

/** Preview-sandbox test loader: consumes window.TURNSTONE_TEST_DATA (sample-links.js).
    Production paths (native picker, ?file=) are unaffected — see testing-notes.md. */
async function loadTestFile(ext) {
  const td = window.TURNSTONE_TEST_DATA;
  if (!td) { toast('Test dataset not found — is sample-links.js loaded?', 'error'); return; }
  log(`Loading test dataset (requested as ${ext}, bundled as ${td.ext})`);
  if (ext === 'xlsx') {
    // Exercise the real XLSX pipeline: build a workbook from the sample data and parse it back.
    try {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(td.data), 'Links');
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const parsed = await parseWorkbook(buf instanceof ArrayBuffer ? buf : buf.buffer);
      loadMatrix(parsed.rows, { name: 'sample-links.xlsx', ext: 'xlsx', mode: 'remote', sheetName: parsed.sheetName, sourceUrl: null });
      return;

    } catch (e) {
      err('Test XLSX build/parse failed', e);
      toast(`Test XLSX failed: ${e.message}`, 'error');
      return;
    }
  }
  loadMatrix(td.data, { name: td.name, ext: td.ext, mode: 'remote', sheetName: td.sheetName, sourceUrl: null });
}

/* ------------------------------ Theme (light/dark) ----------------------- */
function applyTheme(theme, announce = true) {
  THEME_ROOT.dataset.theme = theme;
  els.miThemeLabel.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  if (announce) log(`Theme → ${theme}`);
}

els.search.addEventListener('input', () => {
  state.search = els.search.value;
  clearTimeout(els.search._t);
  els.search._t = setTimeout(renderCards, 150);
});
els.showCompleted.addEventListener('change', () => { state.hideCompleted = !els.showCompleted.checked; log(`Show-completed → ${els.showCompleted.checked}`); renderCards(); });
els.sortCol.addEventListener('change', () => {
  const v = els.sortCol.value;
  state.sortCol = v === '' ? null : +v;
  log(`Sort column → ${state.sortCol === null ? 'file order' : colLabel(state.sortCol)}`);
  renderCards();
});
els.sortDir.addEventListener('click', () => {
  if (state.sortCol === null) { toast('Pick a column to sort by first'); return; }
  state.sortAsc = !state.sortAsc;
  els.sortDir.textContent = state.sortAsc ? '↓' : '↑';
  els.sortDir.title = state.sortAsc ? 'Ascending — click for descending' : 'Descending — click for ascending';
  log(`Sort direction → ${state.sortAsc ? 'asc' : 'desc'}`);
  renderCards();
});

// Sidebar event delegation (cards are rebuilt often)
els.cards.addEventListener('click', (e) => {
  const doneBtn = e.target.closest('[data-done]');
  const undoBtn = e.target.closest('[data-undo]');
  const titleBtn = e.target.closest('.card-title');
  const copyBtn = e.target.closest('.copy[data-copy-col]');
  const toggleBtn = e.target.closest('[data-toggle-col]');
  const urlLink = e.target.closest('.card-url a');
  if (doneBtn) {
    const i = +doneBtn.dataset.done;
    state.status[i] = 'complete';
    log(`Row ${i} marked complete`);
    afterComplete(i);
  } else if (undoBtn) {
    const i = +undoBtn.dataset.undo;
    state.status[i] = 'incomplete';
    log(`Row ${i} marked back to incomplete`);
    renderCards();
    markDirty();
  } else if (titleBtn) {
    // Clicking the card opens its link (per current mode) AND expands the card.
    const card = titleBtn.closest('.card');
    const i = +card.dataset.rowIndex;
    log(`Card clicked (rowIndex=${i}) → open + expand`);
    const wasExpanded = !!state.expanded[i];
    state.expanded[i] = true;
    if (!wasExpanded && state.autoOpenOnSelect) {
      // Auto-open happens via the expand below; avoid double-open.
      openUrlFor(i);
    } else {
      openUrlFor(i);
    }
    renderCards();
  } else if (toggleBtn) {
    const i = +toggleBtn.dataset.toggleCol;
    state.expanded[i] = !state.expanded[i];
    log(`Card ${i} expand → ${state.expanded[i]}`);
    renderCards();
  } else if (copyBtn) {
    const key = copyBtn.dataset.copyCol;           // "rowIndex:colIndex" or a fixed kind
    const label = copyBtn.dataset.copyLabel || 'value';
    let value;
    if (key.endsWith(':name')) {
      const i = +key.split(':')[0];
      const row = state.data[i + (state.hasHeader ? 1 : 0)] || [];
      value = String(state.nameCol >= 0 ? row[state.nameCol] : row[state.urlCol] || '');
    } else if (key.endsWith(':url')) {
      const i = +key.split(':')[0];
      value = String((state.data[i + (state.hasHeader ? 1 : 0)] || [])[state.urlCol] || '');
    } else if (key.endsWith(':notes')) {
      value = state.notes[+key.split(':')[0]] || '';
    } else {
      const [i, c] = key.split(':').map(Number);
      value = String((state.data[i + (state.hasHeader ? 1 : 0)] || [])[c] ?? '');
    }
    copyText(value.trim(), label).then(ok => {
      copyBtn.classList.add('ok'); copyBtn.textContent = '✓';
      setTimeout(() => { copyBtn.classList.remove('ok'); copyBtn.textContent = '⧉'; }, 900);
      if (!ok) toast('Copy failed — your browser blocked clipboard access', 'error');
    });
  }
});
els.cards.addEventListener('input', (e) => {
  const ta = e.target.closest('textarea[data-notes]');
  if (!ta) return;
  const i = +ta.dataset.notes;
  state.notes[i] = ta.value;
  log(`Notes changed for row ${i} (${ta.value.length} chars)`);
  markDirty(); // no re-render — keeps the textarea focused
});

// Tab bar event delegation
els.tabbar.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  const id = tab.dataset.tabId;
  if (e.target.closest('.tab-close')) { closeTab(id); return; }
  if (e.target.closest('.tab-ext')) return; // let the <a target=_blank> do its thing
  activateTab(id);
});

/* ------------------------------ Close current file ------------------------ */
function closeCurrentFile() {
  if (!state.mode) { log('Close requested but no file is open'); return; }
  log(`Closing current file "${state.name}" (mode=${state.mode})`);
  state.name = null; state.ext = 'csv'; state.mode = null; state.fileHandle = null;
  state.sourceUrl = null; state.data = []; state.hasHeader = false;
  state.urlCol = 0; state.nameCol = -1; state.statusCol = -1; state.notesCol = -1;
  state.status = []; state.notes = []; state.isDirty = false; state.lastSavedAt = null; state.lastSavedWhere = null;
  state.colOrder = null; state.colHidden = {}; state.expanded = {};
  state.sortCol = null; state.sortAsc = true;
  closeAllTabs();
  els.search.value = ''; state.search = '';
  els.showCompleted.checked = false; state.hideCompleted = true;
  els.sortCol.value = '';
  updateChrome(); renderCards();
  els.welcome.hidden = false; els.welcome.style.display = '';
  els.cards.innerHTML = '<div class="empty">No file loaded yet.<br>Open a link list to populate task cards.</div>';
  toast('File closed — pick or paste another when ready');
}

/* --------------------------------- Boot ---------------------------------- */
(async function init() {
  log(`Turnstone initializing — FSA API: ${!!window.showOpenFilePicker}, XLSX: ${HAS_XLSX}, URL: ${location.href}`);
  applyTheme(THEME_ROOT.dataset.theme, false);

  // A build without SheetJS says so before the user drops a workbook on it.
  if (!HAS_XLSX_WRITE) els.btnTestXlsx.hidden = true;   // the test button builds a workbook to re-parse
  if (!HAS_XLSX) {
    els.dzFormats.textContent = 'CSV · TSV · JSON · HTML · XML';
    els.capNotice.hidden = false;
    els.capNotice.innerHTML = '<b>CSV-only build</b> — no workbook support (XLSX/XLS/ODS). Everything else works: CSV, TSV, JSON, HTML and XML lists.';
    log('Workbook support unavailable in this build — welcome panel switched to CSV-only');
  } else if (!HAS_XLSX_WRITE) {
    els.capNotice.hidden = false;
    els.capNotice.innerHTML = '<b>Read-only workbooks</b> — this build can open XLSX/XLS/ODS, but your edits are kept in the page and exported as CSV.';
    log('Workbook writer unavailable — workbooks import one-way, edits export as CSV');
  }

  // Live-follow the OS light/dark preference while the user hasn't picked explicitly.
  if (window.matchMedia) {
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      try { if (localStorage.getItem('turnstone-theme')) return; } catch (_) {}
      applyTheme(e.matches ? 'light' : 'dark');
      log(`OS color-scheme changed → ${e.matches ? 'light' : 'dark'} (no explicit user preference)`);
    });
  }

  try {
    const rec = await idbGet('handles', 'active');
    if (rec) { log('Previous workspace found in IndexedDB → showing Restore item'); els.miRestore.hidden = false; }
    await renderRecents();
  } catch (e) { warn('IndexedDB unavailable — persistence limited to this page load', e); }

  const params = new URLSearchParams(location.search);
  const fileParam = null;   // bookmarklet: the host page's query string is not ours to read
  const openFirst = params.get('open') === '1';
  if (fileParam) {
    log(`?file=/?url= param detected → loading remote file (takes precedence over restore): ${fileParam}`);
    await loadFromUrl(fileParam);
    if (openFirst && state.mode) {
      const row = state.data[state.hasHeader ? 1 : 0] || [];
      const url = String(row[state.urlCol] || '').trim();
      if (url) { log('?open=1 → auto-opening first task'); openUrlFor(0); }
      else warn('?open=1 requested but first row has no URL');
    }
  } else {
    log('No ?file=/?url= param — waiting for user to pick or restore a file');
  }
})();

/* ---------------------------------------------------------------------------
 * Bookmarklet boot, part 2 — runs AFTER the app code, wired to the bar.
 *
 * Everything below may call app functions (toast/loadMatrix/state) because by
 * now they exist. This is also where the locked-scope "carry a queue across
 * sessions" pair lives: storage is session-only by design (see boot-pre), so
 * Copy state / Restore state is the supported way to move a queue between tabs.
 * ------------------------------------------------------------------------- */

(function tsWireBar() {
  var bar = TS_SHADOW.getElementById('ts-bar');
  var label = TS_BMK.variant + (TS_BMK.libs.length ? ' · ' + TS_BMK.libs.join(' + ') : ' · no libraries');
  bar.querySelector('.ts-variant').textContent = label;

  log(`Turnstone bookmarklet mounted — variant "${TS_BMK.variant}", libs [${TS_BMK.libs.join(', ') || 'none'}], ` +
      `styles ${TS_CSS_HOW}, XLSX read=${HAS_XLSX} write=${HAS_XLSX_WRITE}, IndexedDB=memory-only`);

  /* --- Close: the overlay is the only thing we added to the page ---------- */
  TS_SHADOW.getElementById('ts-close').addEventListener('click', function () {
    log('Closing overlay — removing the host element');
    TS_HOST.remove();
    toast('Turnstone closed');
  });

  /* --- Copy state: a self-contained JSON snapshot of the queue ------------ */
  function snapshot() {
    return {
      turnstone: 'bookmarklet-state/1',
      name: state.name,
      ext: state.ext,
      sheetName: state.sheetName,
      data: state.data,
      status: state.status,
      notes: state.notes,
      savedAt: new Date().toISOString(),
    };
  }

  TS_SHADOW.getElementById('ts-copy').addEventListener('click', async function () {
    if (!cardCount()) { toast('Nothing to copy — load a list first', 'error'); return; }
    var json = JSON.stringify(snapshot());
    await copyText(json, 'queue state');
    log(`Copied queue state (${json.length} chars, ${cardCount()} cards)`);
    toast(`Copied ${cardCount()} card${cardCount() === 1 ? '' : 's'} as JSON (${(json.length / 1024).toFixed(1)} KB)`);
  });

  /* --- Restore state: paste it back, statuses and notes included ---------- */
  function openRestorePanel() {
    var existing = TS_SHADOW.getElementById('ts-restore-panel');
    if (existing) { existing.remove(); return; }
    var panel = document.createElement('div');
    panel.id = 'ts-restore-panel';
    panel.style.cssText = 'position:absolute;top:34px;right:8px;z-index:5;width:min(560px,92vw);' +
      'background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:10px;' +
      'padding:12px;box-shadow:0 12px 32px rgba(0,0,0,.45)';
    panel.innerHTML =
      '<div style="font-size:12.5px;font-weight:600;margin-bottom:4px">Restore a copied queue</div>' +
      '<div style="font-size:11.5px;color:var(--muted);margin-bottom:8px">Paste a state JSON from <em>Copy state</em>. ' +
      'Statuses and notes come back with it.</div>' +
      '<textarea id="ts-restore-text" spellcheck="false" placeholder=\'{"turnstone":"bookmarklet-state/1", …}\' ' +
      'style="width:100%;height:110px;background:var(--bg);color:var(--text);border:1px solid var(--border);' +
      'border-radius:6px;padding:7px;font:11.5px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace"></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end">' +
      '<button type="button" class="btn" id="ts-restore-cancel">Cancel</button>' +
      '<button type="button" class="btn" id="ts-restore-apply">Restore</button>' +
      '</div>';
    TS_SHADOW.appendChild(panel);
    var text = panel.querySelector('#ts-restore-text');
    text.focus();
    panel.querySelector('#ts-restore-cancel').addEventListener('click', function () { panel.remove(); });
    panel.querySelector('#ts-restore-apply').addEventListener('click', function () {
      var raw = text.value.trim();
      if (!raw) { toast('Paste a copied state first', 'error'); return; }
      var parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) { toast(`That is not valid JSON: ${e.message}`, 'error'); return; }
      if (!Array.isArray(parsed.data) || !parsed.data.length) { toast('That JSON has no queue data', 'error'); return; }
      var rows = parsed.data.length - (analyzeMatrix(parsed.data).hasHeader ? 1 : 0);
      if (Array.isArray(parsed.status) && parsed.status.length !== rows) {
        warn(`State status length ${parsed.status.length} ≠ ${rows} rows — statuses will be ignored`);
        parsed.status = null; parsed.notes = null;
      }
      log(`Restoring queue state: ${parsed.data.length} rows from "${parsed.name || 'pasted state'}"`);
      loadMatrix(parsed.data, {
        name: parsed.name || 'restored-state.csv',
        ext: parsed.ext || 'csv',
        mode: 'fallback',
        sheetName: parsed.sheetName,
        status: parsed.status,
        notes: parsed.notes,
      });
      panel.remove();
    });
  }
  TS_SHADOW.getElementById('ts-restore').addEventListener('click', openRestorePanel);

  /* --- First-run hint + capability notice --------------------------------- */
  if (!HAS_XLSX) {
    toast('Turnstone (no libraries) is running — CSV, TSV, JSON, HTML and XML lists only', 'success');
  } else if (!HAS_XLSX_WRITE) {
    toast('Turnstone is running — workbooks open read-only, edits export as CSV', 'success');
  } else {
    toast('Turnstone is running in this page — drop a CSV/XLSX list anywhere', 'success');
  }
})();

}).call(this);
})();void 0
