#!/usr/bin/env python3
"""
scripts/ensure_presentation_fonts.py
Scans a PPTX or PDF presentation, detects all referenced font families,
and automatically downloads any missing fonts (from Google Fonts or font cache)
into the system/user font directory so LibreOffice renders exact fonts without
misalignment, overflow, or bad kerning.
"""

import sys
import os
import re
import json
import zipfile
import urllib.request
import urllib.parse
import subprocess

IGNORE_FONTS = {
    "symbol", "wingdings", "wingdings 2", "wingdings 3", "webdings",
    "+mn-lt", "+mj-lt", "+mn-ea", "+mj-ea", "+mn-cs", "+mj-cs"
}

# Metric substitutes or standard pre-installed fonts
SYSTEM_KNOWN = {
    "arial", "times new roman", "courier new", "georgia", "impact",
    "dejavu sans", "dejavu serif", "liberation sans", "liberation serif",
    "carlito", "caladea", "aptos", "aptos display"
}

def load_system_fonts_cache():
    fonts = set(SYSTEM_KNOWN)
    try:
        res = subprocess.run(["fc-list", ":", "family"], capture_output=True, text=True, timeout=3)
        if res.returncode == 0:
            for line in res.stdout.splitlines():
                for f in line.split(","):
                    clean = f.strip().lower()
                    if clean:
                        fonts.add(clean)
    except Exception:
        pass
    return fonts

def get_target_fonts_dir(custom_dir=None):
    if custom_dir and os.path.isdir(custom_dir):
        return custom_dir
    
    # Priority 1: System-wide directory if running on server (root)
    system_dir = "/usr/local/share/fonts/hgf_fonts"
    try:
        os.makedirs(system_dir, exist_ok=True)
        test_file = os.path.join(system_dir, ".write_test")
        with open(test_file, "w") as f:
            f.write("ok")
        os.remove(test_file)
        return system_dir
    except Exception:
        pass

    # Priority 2: User-local fonts directory
    user_dir = os.path.expanduser("~/.local/share/fonts/hgf_fonts")
    try:
        os.makedirs(user_dir, exist_ok=True)
        return user_dir
    except Exception:
        pass

    # Priority 3: Project local fonts cache
    proj_dir = os.path.join(os.getcwd(), "public", "fonts_cache")
    os.makedirs(proj_dir, exist_ok=True)
    return proj_dir

def parse_xml_fonts(content, is_slide=False):
    fonts = set()
    # Explicit Latin typefaces in text runs and major/minor theme declarations
    for m in re.finditer(r'<a:latin\s+[^>]*typeface="([^"]+)"', content):
        val = m.group(1).strip()
        if val and not val.startswith("+m"):
            fonts.add(val)
    for m in re.finditer(r'<p:font[^>]*name="([^"]+)"', content):
        val = m.group(1).strip()
        if val and not val.startswith("+m"):
            fonts.add(val)
    if is_slide:
        for m in re.finditer(r'typeface="([^"]+)"', content):
            val = m.group(1).strip()
            if val and not val.startswith("+m") and not any(ord(c) > 0x2000 for c in val):
                fonts.add(val)
    return fonts

def extract_fonts_from_pptx(pptx_path):
    fonts = set()
    try:
        if os.path.isdir(pptx_path):
            for root, _, files in os.walk(pptx_path):
                for f in files:
                    if f.endswith(".xml") and "_rels" not in root:
                        is_slide = "slide" in f.lower()
                        try:
                            with open(os.path.join(root, f), "r", encoding="utf-8", errors="ignore") as xml_f:
                                fonts.update(parse_xml_fonts(xml_f.read(), is_slide=is_slide))
                        except Exception:
                            pass
        elif zipfile.is_zipfile(pptx_path):
            with zipfile.ZipFile(pptx_path, "r") as z:
                for name in z.namelist():
                    if name.startswith("ppt/") and name.endswith(".xml") and "_rels" not in name:
                        is_slide = "slides/slide" in name
                        try:
                            content = z.read(name).decode("utf-8", errors="ignore")
                            fonts.update(parse_xml_fonts(content, is_slide=is_slide))
                        except Exception:
                            pass
    except Exception as e:
        print(f"[ensure_fonts] Warning reading PPTX: {e}", file=sys.stderr)
    return fonts

def extract_fonts_from_pdf(pdf_path):
    fonts = set()
    try:
        res = subprocess.run(["pdffonts", pdf_path], capture_output=True, text=True, timeout=5)
        if res.returncode == 0:
            lines = res.stdout.splitlines()
            if len(lines) > 2:
                for line in lines[2:]:
                    parts = line.split()
                    if len(parts) >= 5:
                        font_name = parts[0]
                        emb = parts[4].lower() if len(parts) > 4 else "no"
                        if emb == "no":
                            clean_name = re.sub(r'^[A-Z]{6}\+', '', font_name)
                            clean_name = clean_name.split("-")[0].split(",")[0]
                            fonts.add(clean_name.strip())
    except Exception:
        pass
    return fonts

def is_font_installed(font_name, target_dir, system_fonts):
    clean = font_name.lower().strip()
    if clean in IGNORE_FONTS or clean.startswith("+m"):
        return True
    
    # Check metric mappings
    if clean in ("calibri", "calibri light"):
        clean = "carlito"
    elif clean == "cambria":
        clean = "caladea"

    if clean in system_fonts:
        return True

    # Check target directory
    if os.path.isdir(target_dir):
        for f in os.listdir(target_dir):
            if clean in f.lower() and (f.endswith(".ttf") or f.endswith(".otf")):
                return True

    return False

def download_google_font(family, target_dir):
    headers = {"User-Agent": "Mozilla/5.0"}
    downloaded_files = []

    clean_family = re.sub(r'\s+(Regular|Bold|SemiBold|Medium|Light|Thin|Black|Italic)$', '', family, flags=re.I).strip()
    if not clean_family or clean_family.lower() in IGNORE_FONTS:
        return []

    # Check special fallback: Aptos / Aptos Display from community repo
    if "aptos" in clean_family.lower():
        aptos_repo = "https://raw.githubusercontent.com/ironveil/ttf-aptos/main"
        aptos_files = [
            "Aptos.ttf", "Aptos-Bold.ttf", "Aptos-Display.ttf", "Aptos-Display-Bold.ttf"
        ]
        for af in aptos_files:
            dest = os.path.join(target_dir, af)
            if not os.path.exists(dest):
                try:
                    req = urllib.request.Request(f"{aptos_repo}/{af}", headers=headers)
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        if resp.status == 200:
                            with open(dest, "wb") as out:
                                out.write(resp.read())
                            downloaded_files.append(af)
                except Exception:
                    pass
        return downloaded_files

    urls_to_try = [
        f"https://fonts.googleapis.com/css2?family={urllib.parse.quote(clean_family)}:wght@400;700",
        f"https://fonts.googleapis.com/css2?family={urllib.parse.quote(clean_family)}"
    ]

    ttf_urls = []
    for url in urls_to_try:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=3) as response:
                if response.status == 200:
                    css = response.read().decode("utf-8", errors="ignore")
                    matches = re.findall(r'src:\s*url\((https://fonts\.gstatic\.com/[^)]+\.ttf)\)', css)
                    if matches:
                        ttf_urls = matches
                        break
        except Exception:
            continue

    if not ttf_urls:
        return []

    idx = 1
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', clean_family)
    for ttf_url in ttf_urls:
        dest_filename = f"{safe_name}_{idx}.ttf"
        dest_path = os.path.join(target_dir, dest_filename)
        idx += 1
        if not os.path.exists(dest_path):
            try:
                req = urllib.request.Request(ttf_url, headers=headers)
                with urllib.request.urlopen(req, timeout=5) as resp:
                    if resp.status == 200:
                        with open(dest_path, "wb") as out:
                            out.write(resp.read())
                        downloaded_files.append(dest_filename)
            except Exception as dl_err:
                print(f"[ensure_fonts] Failed to download {ttf_url}: {dl_err}", file=sys.stderr)

    return downloaded_files

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: ensure_presentation_fonts.py <file_or_dir> [custom_fonts_dir]"}))
        sys.exit(1)

    input_path = sys.argv[1]
    custom_dir = sys.argv[2] if len(sys.argv) > 2 else None
    target_dir = get_target_fonts_dir(custom_dir)

    system_fonts = load_system_fonts_cache()

    raw_fonts = set()
    if input_path.endswith(".pdf"):
        raw_fonts = extract_fonts_from_pdf(input_path)
    else:
        raw_fonts = extract_fonts_from_pptx(input_path)

    fonts_to_check = []
    for f in raw_fonts:
        clean = f.strip()
        if not clean or clean.lower() in IGNORE_FONTS or clean.startswith("+m"):
            continue
        fonts_to_check.append(clean)

    downloaded = []
    missing_fonts = []

    for font in fonts_to_check:
        if not is_font_installed(font, target_dir, system_fonts):
            missing_fonts.append(font)
            new_files = download_google_font(font, target_dir)
            if new_files:
                downloaded.extend(new_files)

    if downloaded:
        try:
            subprocess.run(["fc-cache", "-f", target_dir], capture_output=True, timeout=5)
        except Exception:
            pass

    result = {
        "status": "ok",
        "fonts_dir": target_dir,
        "fonts_found": sorted(list(fonts_to_check)),
        "missing_fonts": missing_fonts,
        "downloaded_files": downloaded
    }
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
