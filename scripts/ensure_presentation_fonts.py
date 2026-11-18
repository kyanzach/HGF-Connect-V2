#!/usr/bin/env python3
"""
scripts/ensure_presentation_fonts.py
Scans a PPTX or PDF presentation, detects all referenced font families (and extracts
any un-obfuscated embedded TTF/OTF binaries inside ppt/fonts/), and automatically
downloads missing fonts from Google Fonts or verified metric-compatible repositories
into the system/user font cache so LibreOffice renders exact typography.
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
    "marlett", "ms outlook", "ms reference specialty", "mt extra",
    "+mn-lt", "+mj-lt", "+mn-ea", "+mj-ea", "+mn-cs", "+mj-cs"
}

# Pre-installed Linux / Microsoft metric-compatible families
SYSTEM_KNOWN = {
    "arial", "arial black", "times new roman", "courier new", "georgia",
    "impact", "comic sans ms", "andale mono",
    "dejavu sans", "dejavu serif", "dejavu sans mono",
    "liberation sans", "liberation serif", "liberation mono",
    "carlito", "caladea", "aptos", "aptos display"
}

# Proprietary desktop fonts mapped to metric/visual twins hosted on Google Fonts
PROPRIETARY_TO_GOOGLE_TWIN = {
    "century gothic": "Jost",
    "futura": "Jost",
    "tw cen mt": "Jost",
    "avant garde": "Questrial",
    "segoe ui": "Open Sans",
    "segoe ui light": "Open Sans",
    "segoe ui semibold": "Open Sans",
    "helvetica": "Arimo",
    "helvetica neue": "Arimo",
    "garamond": "EB Garamond",
    "adobe garamond pro": "EB Garamond",
    "palatino": "Libre Baskerville",
    "palatino linotype": "Libre Baskerville",
    "book antiqua": "Libre Baskerville",
    "baskerville": "Libre Baskerville",
    "gill sans": "Lato",
    "gill sans mt": "Lato",
    "franklin gothic": "Libre Franklin",
    "franklin gothic medium": "Libre Franklin",
    "franklin gothic heavy": "Libre Franklin",
    "trebuchet ms": "Fira Sans",
    "verdana": "PT Sans",
    "tahoma": "PT Sans",
    "rockwell": "Arvo",
    "consolas": "JetBrains Mono",
}

STYLE_SUFFIX_RE = re.compile(
    r'[\s_-]+(Regular|Bold|SemiBold|DemiBold|ExtraBold|UltraBold|Medium|Light|'
    r'ExtraLight|UltraLight|Thin|Hairline|Black|Heavy|Italic|Oblique|Condensed|'
    r'SemiCondensed|ExtraCondensed|Narrow|MT|PSMT|BoldMT|ItalicMT|BoldItalicMT)$',
    re.IGNORECASE
)


def normalize_family_name(raw_name: str) -> str:
    name = raw_name.strip().strip('"').strip("'")
    # Strip 6-char PDF subset prefix (e.g. ABCDEF+Montserrat-Bold)
    name = re.sub(r'^[A-Z]{6}\+', '', name)
    # Split comma attributes (e.g. "Arial,Bold")
    name = name.split(",")[0].strip()
    # Repeatedly strip trailing weight/style tokens (e.g. "Montserrat Bold Italic" -> "Montserrat")
    prev = None
    while prev != name:
        prev = name
        name = STYLE_SUFFIX_RE.sub('', name).strip()
    return name


def make_safe_prefix(family: str) -> str:
    return re.sub(r'[^a-zA-Z0-9]+', '_', family.strip()).strip('_').lower()


def load_system_fonts_cache():
    fonts = set(SYSTEM_KNOWN)
    try:
        res = subprocess.run(["fc-list", ":", "family"], capture_output=True, text=True, timeout=4)
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
    proj_dir = os.path.join(os.getcwd(), "tmp", "fonts_cache")
    os.makedirs(proj_dir, exist_ok=True)
    return proj_dir


def parse_xml_fonts(content: str, is_slide_xml: bool = False):
    fonts = set()
    # 1. Explicit Latin typefaces in runs, layouts, masters, and major/minor theme fonts
    for m in re.finditer(r'<a:latin\s+[^>]*typeface="([^"]+)"', content):
        val = m.group(1).strip()
        if val and not val.startswith("+m"):
            fonts.add(val)

    # 2. Explicit font declarations in presentation.xml (<p:font typeface="..."/>) & fontTable.xml
    for m in re.finditer(r'<p:font\s+[^>]*(?:typeface|name)="([^"]+)"', content):
        val = m.group(1).strip()
        if val and not val.startswith("+m"):
            fonts.add(val)

    # 3. Direct slide text runs with any Latin/ASCII typeface attribute
    if is_slide_xml:
        for m in re.finditer(r'typeface="([^"]+)"', content):
            val = m.group(1).strip()
            if val and not val.startswith("+m") and not any(ord(c) > 0x2000 for c in val):
                fonts.add(val)

    return fonts


def is_valid_font_binary(data: bytes) -> str:
    """Returns '.ttf' or '.otf' if data starts with valid SFNT magic bytes, else ''."""
    if len(data) < 16:
        return ""
    magic = data[:4]
    if magic in (b'\x00\x01\x00\x00', b'true', b'typ1'):
        return ".ttf"
    if magic == b'OTTO':
        return ".otf"
    return ""


def extract_fonts_from_pptx(pptx_path: str, target_dir: str):
    fonts = set()
    extracted_embedded = []

    try:
        if os.path.isdir(pptx_path):
            # 1. Check embedded font binaries in ppt/fonts/
            emb_dir = os.path.join(pptx_path, "ppt", "fonts")
            if os.path.isdir(emb_dir):
                for fname in os.listdir(emb_dir):
                    fpath = os.path.join(emb_dir, fname)
                    if os.path.isfile(fpath):
                        try:
                            with open(fpath, "rb") as bf:
                                raw = bf.read()
                            ext = is_valid_font_binary(raw)
                            if ext:
                                base = os.path.splitext(fname)[0]
                                out_name = f"embedded_{re.sub(r'[^a-zA-Z0-9_-]', '_', base)}{ext}"
                                out_path = os.path.join(target_dir, out_name)
                                if not os.path.exists(out_path):
                                    with open(out_path, "wb") as out_f:
                                        out_f.write(raw)
                                    extracted_embedded.append(out_name)
                        except Exception:
                            pass

            # 2. Scan XML files under ppt/
            ppt_root = os.path.join(pptx_path, "ppt")
            scan_root = ppt_root if os.path.isdir(ppt_root) else pptx_path
            for root, _, files in os.walk(scan_root):
                if "_rels" in root:
                    continue
                rel_root = os.path.relpath(root, scan_root).replace("\\", "/")
                for f in files:
                    if f.endswith(".xml"):
                        is_slide_xml = rel_root == "slides" and f.startswith("slide")
                        try:
                            with open(os.path.join(root, f), "r", encoding="utf-8", errors="ignore") as xml_f:
                                fonts.update(parse_xml_fonts(xml_f.read(), is_slide_xml=is_slide_xml))
                        except Exception:
                            pass

        elif zipfile.is_zipfile(pptx_path):
            with zipfile.ZipFile(pptx_path, "r") as z:
                for name in z.namelist():
                    if name.startswith("ppt/fonts/") and not name.endswith("/"):
                        try:
                            raw = z.read(name)
                            ext = is_valid_font_binary(raw)
                            if ext:
                                base = os.path.splitext(os.path.basename(name))[0]
                                out_name = f"embedded_{re.sub(r'[^a-zA-Z0-9_-]', '_', base)}{ext}"
                                out_path = os.path.join(target_dir, out_name)
                                if not os.path.exists(out_path):
                                    with open(out_path, "wb") as out_f:
                                        out_f.write(raw)
                                    extracted_embedded.append(out_name)
                        except Exception:
                            pass
                    elif name.startswith("ppt/") and name.endswith(".xml") and "_rels" not in name:
                        is_slide_xml = name.startswith("ppt/slides/slide")
                        try:
                            content = z.read(name).decode("utf-8", errors="ignore")
                            fonts.update(parse_xml_fonts(content, is_slide_xml=is_slide_xml))
                        except Exception:
                            pass
    except Exception as e:
        print(f"[ensure_fonts] Warning reading PPTX: {e}", file=sys.stderr)

    return fonts, extracted_embedded


def extract_fonts_from_pdf(pdf_path: str):
    fonts = set()
    try:
        res = subprocess.run(["pdffonts", pdf_path], capture_output=True, text=True, timeout=5)
        if res.returncode == 0:
            lines = res.stdout.splitlines()
            if len(lines) > 2:
                # Determine width of the 'name' column from the dashed separator line
                dash_cols = lines[1].split()
                name_col_width = len(dash_cols[0]) if dash_cols else 36
                flag_re = re.compile(r'\s+(yes|no)\s+(yes|no)\s+(yes|no)\s+\S+\s+\S+\s*$', re.IGNORECASE)

                for line in lines[2:]:
                    if len(line) < name_col_width:
                        continue
                    m = flag_re.search(line)
                    if not m:
                        continue
                    emb_flag = m.group(1).lower()
                    if emb_flag == "no":
                        raw_font_name = line[:name_col_width].strip()
                        clean_name = normalize_family_name(raw_font_name)
                        if clean_name:
                            fonts.add(clean_name)
    except Exception:
        pass
    return fonts


def ensure_fontconfig_aliases() -> bool:
    """
    Ensures a Fontconfig alias configuration exists so LibreOffice maps proprietary
    desktop font names (e.g. 'Calibri Light', 'Century Gothic', 'Segoe UI') to their
    installed metric/visual twin families instead of falling back to DejaVu Sans.
    Returns True if a new config file was written.
    """
    alias_pairs = [
        ("Calibri Light", "Carlito"),
        ("Calibri", "Carlito"),
        ("Cambria", "Caladea"),
        ("Aptos Display", "Aptos"),
        ("Aptos Light", "Aptos"),
        ("Aptos SemiBold", "Aptos"),
        ("Aptos Narrow", "Aptos"),
    ] + [(k.title(), v) for k, v in PROPRIETARY_TO_GOOGLE_TWIN.items()]

    # Preserve exact casing for acronyms like MT, MS, UI, Pro
    casing_fixes = {
        "Tw Cen Mt": "Tw Cen MT",
        "Segoe Ui": "Segoe UI",
        "Segoe Ui Light": "Segoe UI Light",
        "Segoe Ui Semibold": "Segoe UI Semibold",
        "Adobe Garamond Pro": "Adobe Garamond Pro",
        "Gill Sans Mt": "Gill Sans MT",
        "Trebuchet Ms": "Trebuchet MS",
    }

    rules_xml = ['<?xml version="1.0"?>', '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">', '<fontconfig>']
    seen = set()
    for src_raw, target_fam in alias_pairs:
        src_fam = casing_fixes.get(src_raw, src_raw)
        if src_fam.lower() in seen:
            continue
        seen.add(src_fam.lower())
        rules_xml.append(f"""  <alias binding="same">
    <family>{src_fam}</family>
    <prefer><family>{target_fam}</family></prefer>
  </alias>""")
    rules_xml.append("</fontconfig>\n")
    xml_payload = "\n".join(rules_xml)

    candidate_dirs = ["/etc/fonts/conf.d", os.path.expanduser("~/.config/fontconfig/conf.d")]
    for conf_dir in candidate_dirs:
        try:
            os.makedirs(conf_dir, exist_ok=True)
            conf_path = os.path.join(conf_dir, "99-hgf-presentation-aliases.conf")
            existing = ""
            if os.path.exists(conf_path):
                with open(conf_path, "r", encoding="utf-8", errors="ignore") as f:
                    existing = f.read()
            if existing != xml_payload:
                with open(conf_path, "w", encoding="utf-8") as f:
                    f.write(xml_payload)
                return True
            return False
        except Exception:
            continue
    return False


def is_font_installed(font_name: str, target_dir: str, system_fonts: set) -> bool:
    raw_lower = font_name.lower().strip()
    clean_family = normalize_family_name(font_name)
    clean_lower = clean_family.lower()

    if not clean_lower or clean_lower in IGNORE_FONTS or raw_lower in IGNORE_FONTS or raw_lower.startswith("+m"):
        return True

    # Metric-compatible equivalents pre-installed on system
    if clean_lower in ("calibri", "calibri light"):
        return "carlito" in system_fonts
    if clean_lower == "cambria":
        return "caladea" in system_fonts

    if raw_lower in system_fonts or clean_lower in system_fonts:
        return True

    # If this is a proprietary font mapped to a Google Fonts twin, check if the twin is already installed
    twin = PROPRIETARY_TO_GOOGLE_TWIN.get(clean_lower) or PROPRIETARY_TO_GOOGLE_TWIN.get(raw_lower)
    if twin and twin.lower() in system_fonts:
        return True

    # Check exact safe prefix in target_dir (prevents 'inter' matching 'winter_1.ttf')
    check_families = [clean_family] + ([twin] if twin else [])
    if os.path.isdir(target_dir):
        dir_files = [f.lower() for f in os.listdir(target_dir)]
        for fam in check_families:
            sp = make_safe_prefix(fam)
            if not sp:
                continue
            for fl in dir_files:
                if (fl.startswith(sp + "_") or fl == f"{sp}.ttf" or fl == f"{sp}.otf") and (
                    fl.endswith(".ttf") or fl.endswith(".otf")
                ):
                    return True

    return False


def download_google_font(family: str, target_dir: str):
    headers = {"User-Agent": "Mozilla/5.0"}
    downloaded_files = []

    clean_family = normalize_family_name(family)
    if not clean_family or clean_family.lower() in IGNORE_FONTS:
        return []

    # Aptos / Aptos Display fallback from verified distribution
    if "aptos" in clean_family.lower():
        aptos_repo = "https://raw.githubusercontent.com/ironveil/ttf-aptos/main"
        aptos_files = [
            "Aptos.ttf", "Aptos-Bold.ttf", "Aptos-Italic.ttf",
            "Aptos-Display.ttf", "Aptos-Display-Bold.ttf"
        ]
        for af in aptos_files:
            dest = os.path.join(target_dir, af)
            if not os.path.exists(dest):
                try:
                    req = urllib.request.Request(f"{aptos_repo}/{af}", headers=headers)
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        if resp.status == 200:
                            data = resp.read()
                            if is_valid_font_binary(data):
                                with open(dest, "wb") as out:
                                    out.write(data)
                                downloaded_files.append(af)
                except Exception:
                    pass
        return downloaded_files

    # Map known proprietary desktop font to its Google Fonts visual/metric twin if needed
    query_families = [clean_family]
    twin = PROPRIETARY_TO_GOOGLE_TWIN.get(clean_family.lower())
    if twin and twin.lower() != clean_family.lower():
        query_families.append(twin)

    ttf_urls = []
    matched_family = clean_family

    for q_fam in query_families:
        enc = urllib.parse.quote(q_fam)
        urls_to_try = [
            f"https://fonts.googleapis.com/css2?family={enc}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700",
            f"https://fonts.googleapis.com/css2?family={enc}:wght@400;700",
            f"https://fonts.googleapis.com/css2?family={enc}",
        ]
        for url in urls_to_try:
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=3) as response:
                    if response.status == 200:
                        css = response.read().decode("utf-8", errors="ignore")
                        matches = re.findall(r'src:\s*url\((https://fonts\.gstatic\.com/[^)]+\.(?:ttf|otf))\)', css)
                        if matches:
                            # Deduplicate while preserving order
                            seen = set()
                            ttf_urls = [u for u in matches if not (u in seen or seen.add(u))]
                            matched_family = q_fam
                            break
            except Exception:
                continue
        if ttf_urls:
            break

    if not ttf_urls:
        return []

    safe_name = make_safe_prefix(matched_family) or "font"
    for idx, ttf_url in enumerate(ttf_urls, start=1):
        ext = ".otf" if ttf_url.lower().endswith(".otf") else ".ttf"
        dest_filename = f"{safe_name}_{idx}{ext}"
        dest_path = os.path.join(target_dir, dest_filename)
        if not os.path.exists(dest_path):
            try:
                req = urllib.request.Request(ttf_url, headers=headers)
                with urllib.request.urlopen(req, timeout=5) as resp:
                    if resp.status == 200:
                        data = resp.read()
                        if is_valid_font_binary(data):
                            with open(dest_path, "wb") as out:
                                out.write(data)
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

    aliases_updated = ensure_fontconfig_aliases()
    system_fonts = load_system_fonts_cache()

    raw_fonts = set()
    extracted_embedded = []
    if input_path.lower().endswith(".pdf"):
        raw_fonts = extract_fonts_from_pdf(input_path)
    else:
        raw_fonts, extracted_embedded = extract_fonts_from_pptx(input_path, target_dir)

    # Deduplicate normalized font families
    seen_families = set()
    fonts_to_check = []
    for f in sorted(raw_fonts):
        clean = f.strip()
        if not clean or clean.lower() in IGNORE_FONTS or clean.startswith("+m"):
            continue
        norm = normalize_family_name(clean).lower()
        if not norm or norm in IGNORE_FONTS or norm in seen_families:
            continue
        seen_families.add(norm)
        fonts_to_check.append(clean)

    downloaded = list(extracted_embedded)
    missing_fonts = []

    for font in fonts_to_check:
        if not is_font_installed(font, target_dir, system_fonts):
            missing_fonts.append(font)
            new_files = download_google_font(font, target_dir)
            if new_files:
                downloaded.extend(new_files)
                # Add to in-memory cache so duplicate variants in same run don't re-fetch
                system_fonts.add(normalize_family_name(font).lower())

    if downloaded or aliases_updated:
        try:
            subprocess.run(["fc-cache", "-f"], capture_output=True, timeout=10)
        except Exception:
            pass

    result = {
        "status": "ok",
        "fonts_dir": target_dir,
        "fonts_found": fonts_to_check,
        "missing_fonts": missing_fonts,
        "downloaded_files": downloaded
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
