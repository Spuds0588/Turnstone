# vendor/ — vendored third-party libraries

Turnstone ships these libraries **inside the repo** so the app never touches a CDN at
runtime. This is what makes the tool viable on locked-down, air-gapped, or strict-CSP
machines, and it is a hard requirement — not a convenience. Do not reintroduce a CDN
`<script>` tag.

| File | Library | Version | Upstream URL |
| --- | --- | --- | --- |
| `papaparse.min.js` | [PapaParse](https://www.papaparse.com/) | 5.4.1 | `https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js` |
| `xlsx.full.min.js` | [SheetJS](https://sheetjs.com/) | 0.20.3 | `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js` |
| `maillayer.js` | [MailLayer Embedded](https://github.com/Spuds0588/MailLayer-Embedded) (ours) | 2.1.0 | `https://cdn.jsdelivr.net/gh/Spuds0588/MailLayer-Embedded@master/maillayer.js` |
| `phonelayer.js` | [PhoneLayer Embedded](https://github.com/Spuds0588/PhoneLayer-Embedded) (ours) | 1.9.1 | `https://cdn.jsdelivr.net/gh/Spuds0588/PhoneLayer-Embedded@main/phonelayer.js` |

Integrity (sha256 of the files as vendored):

```
b8e870c5d2b29772f10c9fa9a693c8b896aac8540ed6701e3cc6304c683febdb  papaparse.min.js
cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41  xlsx.full.min.js
db3c2709e199e29516d27b9c8bc5894429fde2761697d0b0d8369393715c5f65  maillayer.js
84b3aacb4b2d9c1b0ca14b489d96b80f1780980f220061c7e1c6a12b73106ab3  phonelayer.js
```

## Re-downloading / upgrading

```bash
curl -sSL -o vendor/papaparse.min.js "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"
curl -sSL -o vendor/xlsx.full.min.js "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"
# Ours, so pin a release tag where one exists. PhoneLayer has @v1.9.1; MailLayer has no
# matching tag yet, so @master is the only source — re-check the sha256 after any pull
# from it, since that ref can move.
curl -sSL -o vendor/maillayer.js "https://cdn.jsdelivr.net/gh/Spuds0588/MailLayer-Embedded@master/maillayer.js"
curl -sSL -o vendor/phonelayer.js "https://cdn.jsdelivr.net/gh/Spuds0588/PhoneLayer-Embedded@v1.9.1/phonelayer.js"
sha256sum vendor/*.js   # compare against the table above
for f in vendor/*.js; do node --check "$f" || exit 1; done
```

After any change here:

1. Bump `VERSION` in [`../sw.js`](../sw.js) so installed PWAs re-precache the new files.
2. Re-run the browser check from [`../testing-notes.md`](../testing-notes.md): a CSV load
   and an XLSX load, confirming the network log stays **entirely same-origin**.
3. Update the version table and hashes above.

## Who consumes these

- `app.html` — the canonical web app.
- `ports/extension/` — copies all four into `dist/vendor/` and loads them from the
  extension page (which is why they must stay CSP-clean: no `eval`, no inline script).
- `assets/build-standalone.js` — inlines all four into `turnstone-standalone.html`.
- `ports/tauri/` — should reuse these files rather than its own copies once built, so
  all editions stay on one library version.
- **Not** `ports/bookmarklet/` — see the note below.

## The two embedded layers

`maillayer.js` and `phonelayer.js` are **ours**, not third-party, and they work
differently from the parsers above: they install a document-level click interceptor,
so `mailto:` and `tel:`/`sms:` links anywhere in the app open a composer or a provider
picker instead of a desktop handler nobody uses. Nothing calls into them — the app emits
a real anchor and the layers take the click.

- **The app stamps per-link overrides.** PhoneLayer documents a per-trigger
  `data-phonelayer-theme` / `data-phonelayer-color`, so each `tel:` anchor carries the
  theme and accent of the moment it was rendered. Its own script tag gets no config, so
  the `document.currentScript` lookup inside both libraries stays correct whether they
  are loaded from a file (`app.html`, the extension) or inlined (the standalone build).
- **They are a capability, read at boot.** `HAS_LAYERS` comes from `window.PhoneLayer`
  (MailLayer publishes no global, and the pair is vendored together). A build without
  them still ships working links: the welcome panel says the addresses and numbers go to
  the system handlers instead.
- **MailLayer fetches two icons, and our CSP refuses them.** Its provider picker
decorates the Gmail/Outlook buttons with SVGs from `upload.wikimedia.org`; `img-src
  'self'` blocks them, so those buttons show text only. That is the desired trade — a
  request-free app beats a logo — so do not widen `img-src` for it.
- **A narrow desktop window is treated as a phone by MailLayer** (it tests
  `innerWidth <= 768 && 'ontouchstart' in window`), which simply hands the click to the
  system mail handler. PhoneLayer's check is user-agent based and is not affected.

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
