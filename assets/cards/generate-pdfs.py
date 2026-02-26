#!/usr/bin/env python3
"""
SUKODA kaartide PDF genereerimine
Konverteerib SVG kujundusfailid PDF trükifailideks.

Trükifailid:
- Tervituskaart (esi + taga): 154x105 mm
- Kinkekaart DL (esi + taga): 216x105 mm
- Ümbrik DL: 226x116 mm
- Fondid embedded (Chrome sisestab Google Fonts PDF-i)
- Lõikemärke ei lisata
"""

import subprocess
import sys
import os
import time

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CARDS_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = os.path.join(CARDS_DIR, "pdf")
os.makedirs(PDF_DIR, exist_ok=True)

# (svg_path_relative_to_CARDS_DIR, pdf_nimi, laius_mm, kõrgus_mm)
FILES = [
    ("print/tervituskaart-ees-dl.svg",  "SUKODA-tervituskaart-esipool_154x105mm.pdf",   154, 105),
    ("print/tervituskaart-taga-dl.svg", "SUKODA-tervituskaart-tagapool_154x105mm.pdf",  154, 105),
    ("print/kinkekaart-ees-dl.svg",     "SUKODA-kinkekaart-DL-esipool_216x105mm.pdf",   216, 105),
    ("print/kinkekaart-taga-dl.svg",    "SUKODA-kinkekaart-DL-tagapool_216x105mm.pdf",  216, 105),
    ("print/umbrik-dl.svg",             "SUKODA-umbrik-DL_226x116mm.pdf",               226, 116),
]


def svg_to_pdf(svg_rel, pdf_name, width_mm, height_mm):
    svg_path = os.path.join(CARDS_DIR, svg_rel)
    pdf_path = os.path.join(PDF_DIR, pdf_name)
    tmp_html = os.path.join(PDF_DIR, pdf_name.replace(".pdf", "_tmp.html"))

    with open(svg_path, "r", encoding="utf-8") as f:
        svg_content = f.read()

    # Inline SVG directly so fonts can load via @import (no cross-origin block)
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page {{
    size: {width_mm}mm {height_mm}mm;
    margin: 0;
  }}
  html, body {{
    margin: 0;
    padding: 0;
    width: {width_mm}mm;
    height: {height_mm}mm;
    overflow: hidden;
    background: #FFFFFF;
  }}
  svg {{
    display: block;
    width: {width_mm}mm;
    height: {height_mm}mm;
  }}
</style>
</head>
<body>
{svg_content}
</body>
</html>"""

    with open(tmp_html, "w", encoding="utf-8") as f:
        f.write(html)

    w_in = width_mm / 25.4
    h_in = height_mm / 25.4

    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-web-security",
        "--print-to-pdf=" + pdf_path,
        "--no-pdf-header-footer",
        f"--paper-width={w_in}",
        f"--paper-height={h_in}",
        "--margin-top=0",
        "--margin-bottom=0",
        "--margin-left=0",
        "--margin-right=0",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=3000",
        "file://" + tmp_html,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    os.remove(tmp_html)

    if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 5000:
        size_kb = os.path.getsize(pdf_path) // 1024
        print(f"  ✓  {pdf_name}  ({size_kb} KB)")
        return True
    else:
        size = os.path.getsize(pdf_path) if os.path.exists(pdf_path) else 0
        print(f"  ✗  {pdf_name}  — VIGA (failisuurus: {size} B)")
        if result.stderr:
            print("     ", result.stderr[:400])
        return False


def main():
    print("\nSUKODA kaartide PDF genereerimine")
    print("=" * 52)
    ok = 0
    for svg_rel, pdf_name, w, h in FILES:
        if svg_to_pdf(svg_rel, pdf_name, w, h):
            ok += 1
    print("=" * 52)
    print(f"Valmis: {ok}/{len(FILES)} faili")
    print(f"Kausta: {PDF_DIR}\n")


if __name__ == "__main__":
    main()
