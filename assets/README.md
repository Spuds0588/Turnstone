# assets/ — Turnstone brand assets

The logo is a **circular grey stone with a dark-grey checkmark engraved into it** — the
engraving is faked with a second, offset copy of the check forming the groove's shadow lip.

| File | What it is |
|---|---|
| `logo.svg` | Master logo (theme-neutral). **Edit this one** when changing the design. |
| `logo-light.svg` | Light-theme variant — brighter stone so it holds contrast on white surfaces. |
| `logo-dark.svg` | Dark-theme variant — subtle rim so the stone reads on near-black surfaces. |
| `icon-192.png` / `icon-512.png` | Rasterized from `logo.svg` by `build-icons.js`; root-level copies are precached by the service worker. |
| `icon-maskable-512.png` | Maskable (safe-zone) variant for Android/adaptive icons. |
| `build-icons.js` | Zero-dependency generator: re-rasterizes the SVG geometry into all PNGs (`node assets/build-icons.js`). |

## Rules

- **SVGs are the source of truth**; never hand-edit the PNGs — regenerate them.
- The generator samples the logo's geometry directly (circle + check polyline), so if the
  master SVG's shapes change, update the `STONE`/`CHECK` constants at the top of
  `build-icons.js` to match.
- Light/dark variants exist for the few contexts where CSS `currentColor` tricks can't help
  (favicon-style uses, `<img>` in theme-aware spots). The app's welcome header swaps
  `logo-dark.svg` / `logo-light.svg` via its `data-theme` attribute.
- The favicon + apple-touch-icon in `app.html` are embedded data URIs of `icon-192.png` so
  the icon survives opening the app straight from disk.
