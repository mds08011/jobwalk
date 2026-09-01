#!/usr/bin/env python3
"""Assemble ../index.html (PhotoMap) and ../pinmap.html (PinMap) from the
templates in this directory, inlining all libraries from node_modules.
Run `npm install` here first."""
import base64, pathlib, re

here = pathlib.Path(__file__).parent
nm = here / "node_modules"
PLACEHOLDERS = ("@@LEAFLET_CSS@@", "@@LEAFLET_JS@@", "@@EXIFR_JS@@",
                "@@JSZIP_JS@@", "@@PDFJS_JS@@", "@@PDF_WORKER@@")

def asset(path):
    txt = (nm / path).read_text()
    txt = re.sub(r"//# sourceMappingURL=\S+", "", txt)
    assert "</script" not in txt.lower(), f"script-closing tag in {path}"
    assert not any(p in txt for p in PLACEHOLDERS), f"placeholder collision in {path}"
    return txt

css = (nm / "leaflet/dist/leaflet.css").read_text()
for img in ("layers.png", "layers-2x.png", "marker-icon.png"):
    b64 = base64.b64encode((nm / "leaflet/dist/images" / img).read_bytes()).decode()
    css = css.replace(f"url(images/{img})", f"url(data:image/png;base64,{b64})")

assets = {
    "@@LEAFLET_CSS@@": css,
    "@@LEAFLET_JS@@": asset("leaflet/dist/leaflet.js"),
    "@@EXIFR_JS@@": asset("exifr/dist/full.umd.js"),
    "@@JSZIP_JS@@": asset("jszip/dist/jszip.min.js"),
    "@@PDFJS_JS@@": asset("pdfjs-dist/legacy/build/pdf.min.mjs"),
    "@@PDF_WORKER@@": asset("pdfjs-dist/legacy/build/pdf.worker.min.mjs"),
}

def build(template, dest):
    out = (here / template).read_text()
    for ph, txt in assets.items():
        out = out.replace(ph, txt)
    assert not any(p in out for p in PLACEHOLDERS), f"unfilled placeholder in {template}"
    dest.write_text(out)
    print(f"wrote {dest} ({dest.stat().st_size/1e3:.0f} KB)")

build("template-photomap.html", here.parent / "index.html")
build("template-pinmap.html", here.parent / "pinmap.html")
