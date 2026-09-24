# vendor/ — vendored third-party libraries

Turnstone ships these libraries **inside the repo** so the app never touches a CDN at
runtime. This is what makes the tool viable on locked-down, air-gapped, or strict-CSP
machines, and it is a hard requirement — not a convenience. Do not reintroduce a CDN
`<script>` tag.

| File | Library | Version | Upstream URL |
| --- | --- | --- | --- |
| `papaparse.min.js` | [PapaParse](https://www.papaparse.com/) | 5.4.1 | `https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js` |
| `xlsx.full.min.js` | [SheetJS](https://sheetjs.com/) | 0.20.3 | `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js` |

Integrity (sha256 of the files as vendored):

```
b8e870c5d2b29772f10c9fa9a693c8b896aac8540ed6701e3cc6304c683febdb  papaparse.min.js
cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41  xlsx.full.min.js
```

## Re-downloading / upgrading

```bash
curl -sSL -o vendor/papaparse.min.js "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"
curl -sSL -o vendor/xlsx.full.min.js "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"
sha256sum vendor/*.min.js   # compare against the table above
node --check vendor/papaparse.min.js && node --check vendor/xlsx.full.min.js
```

After any change here:

1. Bump `VERSION` in [`../sw.js`](../sw.js) so installed PWAs re-precache the new files.
2. Re-run the browser check from [`../testing-notes.md`](../testing-notes.md): a CSV load
   and an XLSX load, confirming the network log stays **entirely same-origin**.
3. Update the version table and hashes above.

## Who consumes these

- `app.html` — the canonical web app (the only current consumer).
- `ports/extension/`, `ports/tauri/` — should reuse these files rather than their own copies
  once built, so all editions stay on one library version.

## Notes

- Both files are the **full upstream builds**, unmodified. `xlsx.full.min.js` is ~930 KB;
  it carries the whole SheetJS feature set (format support, writing) which the write-back
  and XLSX export paths need.
- The [bookmarklet port](../ports/bookmarklet/README.md) is the deliberate exception: it
  cannot ship a 930 KB payload in a bookmark URL, so it injects SheetJS at runtime and
  falls back to a built-in CSV-only parser when that injection fails. Keep that fallback
  contract in mind if these versions ever diverge.
- `file:` is allowed in the app's CSP precisely because these files can also be opened from
  a plain disk copy of the app — see the "Hardened deployment" section of the
  [README](../README.md).
