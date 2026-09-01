#!/usr/bin/env python3
"""Create test JPEGs: 3 geotagged along a line, 1 without GPS."""
import piexif
from PIL import Image, ImageDraw
from pathlib import Path

out = Path(__file__).parent / "testphotos"
out.mkdir(exist_ok=True)

def dms(deg):
    deg = abs(deg)
    d = int(deg); m = int((deg - d) * 60); s = round(((deg - d) * 60 - m) * 60 * 100)
    return ((d, 1), (m, 1), (s, 100))

pts = [
    ("IMG_0001.jpg", 33.6100, -117.7100, "2026:08:30 09:15:00"),
    ("IMG_0002.jpg", 33.6112, -117.7085, "2026:08:30 09:22:00"),
    ("IMG_0003.jpg", 33.6125, -117.7070, "2026:08:30 09:31:00"),
]
colors = [(200, 80, 20), (20, 120, 200), (30, 160, 60), (120, 120, 120)]

for i, (name, lat, lon, ts) in enumerate(pts):
    img = Image.new("RGB", (1600, 1200), colors[i])
    d = ImageDraw.Draw(img)
    d.text((60, 60), name, fill=(255, 255, 255))
    exif = piexif.dump({
        "0th": {piexif.ImageIFD.Make: b"TestCam"},
        "Exif": {piexif.ExifIFD.DateTimeOriginal: ts.encode()},
        "GPS": {
            piexif.GPSIFD.GPSLatitudeRef: b"N" if lat >= 0 else b"S",
            piexif.GPSIFD.GPSLatitude: dms(lat),
            piexif.GPSIFD.GPSLongitudeRef: b"E" if lon >= 0 else b"W",
            piexif.GPSIFD.GPSLongitude: dms(lon),
        },
    })
    img.save(out / name, "JPEG", exif=exif, quality=90)

# one photo with no GPS
img = Image.new("RGB", (1600, 1200), colors[3])
ImageDraw.Draw(img).text((60, 60), "IMG_NOGPS.jpg", fill=(255, 255, 255))
img.save(out / "IMG_NOGPS.jpg", "JPEG", quality=90)
print("wrote", sorted(p.name for p in out.iterdir()))

# --- test plan-sheet PDF (2 pages) ---
Image.init()
from PIL import ImageDraw as _ID
pages = []
for n, color in [(1, (240, 240, 240)), (2, (225, 235, 245))]:
    img = Image.new("RGB", (2200, 1700), color)
    d = _ID.Draw(img)
    for x in range(0, 2200, 100):
        d.line([(x, 0), (x, 1700)], fill=(200, 200, 200))
    for y in range(0, 1700, 100):
        d.line([(0, y), (2200, y)], fill=(200, 200, 200))
    d.rectangle([300, 300, 1900, 1400], outline=(30, 30, 30), width=6)
    d.text((320, 320), f"HEADWORKS PLAN - SHEET {n}", fill=(0, 0, 0))
    pages.append(img)
pages[0].save(Path(__file__).parent / "testsheet.pdf", save_all=True, append_images=pages[1:])
print("wrote testsheet.pdf")
