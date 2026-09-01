# jobwalk

Browser-based field photo tools for job walks and bid walks. No install, no admin rights, no GIS software — each tool is a single HTML file that runs entirely in the browser. **Photos never leave your computer**; internet is only used to draw the basemap.

## The tools

### PhotoMap ([`index.html`](index.html))

Drop geotagged job-walk photos and get:

- **Map file** — one self-contained HTML file: satellite/street basemap, numbered dots in the order taken, click a dot for the photo, click the photo for full screen, built-in distance/area measure tool (ft / acres). Email it or drop it in the job folder; opens in any browser.
- **Photo log** — a printable photo log (2-up, US Letter) with numbered thumbnails, filenames, timestamps, and coordinates. Captions stay click-to-edit in the log itself until you print it to PDF (Ctrl+P). Photos without GPS tags are included here even though they can't be mapped.
- **KMZ** — the same numbered, captioned photos for Google Earth.

Numbers match across all three outputs. Captions typed in the photo list flow into all of them.

### PinMap ([`pinmap.html`](pinmap.html))

For indoors and tight sites where GPS is useless (inside a headworks building, around a clarifier). Load a plan sheet or aerial — **PDF pages render directly**, images work too — drop your photos, and click the sheet where each one was taken. Pins are numbered, draggable, and captioned. Exports a self-contained HTML viewer that needs no internet at all.

## Using the tools

Download `index.html` (PhotoMap) and/or `pinmap.html` (PinMap), save them anywhere (desktop, OneDrive, a network drive), and double-click. That's it. Keep both in the same folder and the link between them works too.

If GitHub Pages is enabled for this repo, the same tools run at <https://mds08011.github.io/jobwalk/> (PhotoMap) and <https://mds08011.github.io/jobwalk/pinmap.html> (PinMap) — still fully client-side, photos still never leave the viewer's computer.

Field notes:

- Location must be on for the camera app (iPhone: Settings → Privacy & Security → Location Services → Camera → While Using).
- HEIC photos can't be decoded by browsers. On iPhone set Settings → Camera → Formats → Most Compatible, or transfer photos via OneDrive/cable (usually converts to JPEG and keeps the GPS tag). Texting photos and some AirDrop paths strip GPS tags.

## Development

The shipped files are assembled from templates in [`dev/`](dev/) with all libraries (Leaflet, exifr, JSZip, pdf.js) inlined, so the tools work behind corporate proxies that block CDNs.

```
cd dev
npm install          # fetches the libraries to inline
python3 build.py     # writes ../index.html and ../pinmap.html

pip install -r requirements.txt   # Pillow + piexif, only for the test fixtures
python3 make_test_photos.py   # geotagged test JPEGs + a test plan-sheet PDF
node test-photomap.js         # end-to-end tests in headless Chromium
node test-pinmap.js
```

On distros with an externally-managed Python (Ubuntu 23.04+, Debian 12+), run that
`pip install` inside a `python3 -m venv` first.

Edit `dev/template-photomap.html` / `dev/template-pinmap.html`, never the built files.

Libraries bundled at build time: [Leaflet](https://leafletjs.com) (BSD-2), [exifr](https://github.com/MikeKovarik/exifr) (MIT), [JSZip](https://stuk.github.io/jszip/) (MIT), [pdf.js](https://mozilla.github.io/pdf.js/) (Apache-2.0). Basemap tiles: Esri World Imagery and OpenStreetMap.
