#!/usr/bin/env python3
"""
scripts/ensure_presentation_fonts.py
1. Extracts embedded fonts inside PPTX `ppt/fonts/*.fntdata` / `*.odttf`:
   - Unwraps Microsoft EOT (0x504C "LP") uncompressed SFNT (TTF/OTF) payloads
   - Decodes MTX-compressed EOT via `eot2ttf` (`libeot-bin`) when available
   - De-obfuscates ODTTF GUID-XOR headers
2. Scans all PPTX/PDF typography and downloads missing fonts from:
   - Google Fonts CSS API (full weights + italics -> .ttf/.otf)
   - CDNFonts (`fonts.cdnfonts.com`) with pure-Python WOFF 1.0 -> .ttf/.otf decoder
   - Aptos distribution & Fontconfig metric-compatible twin aliases
3. Optional `--normalize-out <dest.pptx>`: rewrites Canva/PowerPoint OOXML quirks
   (`typeface="Roboto Bold"` / `"The Seasons Italics"` -> base family + b/i flags,
   LibreOffice `spc` right-edge clipping removal, single-line `wrap="none"`, and
   multi-line HarfBuzz width tolerance) before headless LibreOffice conversion.
"""

import sys
import os
import re
import json
import struct
import zlib
import shutil
import zipfile
import tempfile
import urllib.request
import urllib.parse
import subprocess

IGNORE_FONTS = {
    "symbol", "wingdings", "wingdings 2", "wingdings 3", "webdings",
    "marlett", "ms outlook", "ms reference specialty", "mt extra",
    "+mn-lt", "+mj-lt", "+mn-ea", "+mj-ea", "+mn-cs", "+mj-cs"
}

SYSTEM_KNOWN = {
    "arial", "arial black", "times new roman", "courier new", "georgia",
    "impact", "comic sans ms", "andale mono",
    "dejavu sans", "dejavu serif", "dejavu sans mono",
    "liberation sans", "liberation serif", "liberation mono",
    "carlito", "caladea", "aptos", "aptos display"
}

PROPRIETARY_TO_GOOGLE_TWIN = {
    "canva sans": "Open Sans",
    "century gothic": "Jost",
    "futura": "Jost",
    "tw cen mt": "Jost",
    "avant garde": "Questrial",
    "glacial indifference": "DM Sans",
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

# Note: includes plural 'Italics' used by Canva PPTX exports (e.g. 'The Seasons Italics')
STYLE_SUFFIX_RE = re.compile(
    r'[\s_-]+(Regular|Bold|SemiBold|DemiBold|ExtraBold|UltraBold|Medium|Light|'
    r'ExtraLight|UltraLight|Thin|Hairline|Black|Heavy|Italics?|Oblique|Condensed|'
    r'SemiCondensed|ExtraCondensed|Narrow|MT|PSMT|BoldMT|ItalicMT|BoldItalicMT)$',
    re.IGNORECASE
)

COMPOUND_STYLE_RE = re.compile(
    r"^(.*?)\s+(Bold\s+Italics?|Bold\s+Oblique|Semi\s*Bold\s+Italics?|Extra\s*Bold\s+Italics?|"
    r"Light\s+Italics?|Medium\s+Italics?|Thin\s+Italics?|Black\s+Italics?|"
    r"Extra\s*Bold|Ultra\s*Bold|Semi\s*Bold|Demi\s*Bold|Medium|Regular|"
    r"Extra\s*Light|Ultra\s*Light|Light|Thin|Black|Heavy|Bold|Italics?|Oblique)$",
    re.IGNORECASE
)


def normalize_family_name(raw_name: str) -> str:
    name = raw_name.strip().strip('"').strip("'")
    name = re.sub(r'^[A-Z]{6}\+', '', name)
    name = name.split(",")[0].strip()
    if name.lower() in ("arial black", "aptos display", "aptos narrow"):
        return name
    prev = None
    while prev != name:
        prev = name
        name = STYLE_SUFFIX_RE.sub('', name).strip()
    return name


def make_safe_prefix(family: str) -> str:
    return re.sub(r'[^a-zA-Z0-9]+', '_', family.strip()).strip('_').lower()


def is_valid_sfnt_binary(data: bytes) -> str:
    """Returns '.ttf' or '.otf' if data starts with valid SFNT magic bytes, else ''."""
    if len(data) < 16:
        return ""
    magic = data[:4]
    if magic in (b'\x00\x01\x00\x00', b'true', b'typ1'):
        return ".ttf"
    if magic == b'OTTO':
        return ".otf"
    return ""


def decode_woff1_to_sfnt(woff: bytes) -> tuple[bytes, str]:
    """Pure-Python W3C WOFF 1.0 -> raw TTF/OTF SFNT unpacker using stdlib struct + zlib."""
    if len(woff) < 44 or woff[:4] != b'wOFF':
        return b"", ""
    sig, flavor, length, num_tables, reserved, total_sfnt = struct.unpack(">IIIHHI", woff[:20])
    if num_tables == 0 or len(woff) < 44 + num_tables * 20:
        return b"", ""

    search_range = 1
    entry_selector = 0
    while search_range * 2 <= num_tables:
        search_range *= 2
        entry_selector += 1
    search_range *= 16
    range_shift = num_tables * 16 - search_range
    sfnt_header = struct.pack(">IHHHH", flavor, num_tables, search_range, entry_selector, range_shift)

    entries = []
    for i in range(num_tables):
        off = 44 + i * 20
        tag, w_off, comp_len, orig_len, orig_csum = struct.unpack(">4sIIII", woff[off:off + 20])
        raw_tbl = woff[w_off:w_off + comp_len]
        tbl_data = zlib.decompress(raw_tbl) if comp_len < orig_len else raw_tbl
        entries.append((tag, orig_csum, orig_len, tbl_data))

    data_offset = 12 + num_tables * 16
    dir_bytes = bytearray()
    body_bytes = bytearray()
    for tag, csum, orig_len, tbl_data in entries:
        cur_off = data_offset + len(body_bytes)
        dir_bytes += struct.pack(">4sIII", tag, csum, cur_off, orig_len)
        body_bytes += tbl_data
        while len(body_bytes) % 4 != 0:
            body_bytes += b"\x00"

    sfnt = bytes(sfnt_header + dir_bytes + body_bytes)
    ext = is_valid_sfnt_binary(sfnt)
    return (sfnt, ext) if ext else (b"", "")


def unwrap_embedded_fntdata(raw: bytes, filename: str) -> tuple[bytes, str]:
    """
    Extracts a usable .ttf or .otf SFNT binary from OOXML `ppt/fonts/*`:
    1. Raw SFNT (.ttf / .otf)
    2. Microsoft EOT wrapper (magic 0x504C 'LP' at offset 34):
       - Uncompressed EOT (Canva / PowerPoint subset/full): slices SFNT directly
       - XOR-encrypted EOT (TTEMBED_XORENCRYPTDATA 0x10000000): XORs with 0x50
       - MTX-compressed EOT (TTEMBED_TTCOMPRESSED 0x00000004): converts via `eot2ttf`
    3. ODTTF GUID-XOR obfuscated header
    """
    # 1. Already raw SFNT
    ext = is_valid_sfnt_binary(raw)
    if ext:
        return raw, ext

    # 2. WOFF 1.0
    if raw[:4] == b'wOFF':
        return decode_woff1_to_sfnt(raw)

    # 3. Microsoft EOT wrapper ('LP' at bytes 34..36)
    if len(raw) > 64 and raw[34:36] == b'LP':
        eot_size, font_size, ver, flags = struct.unpack("<IIII", raw[:16])
        # Uncompressed EOT (flags & TTEMBED_TTCOMPRESSED == 0)
        if (flags & 0x00000004) == 0 and 0 < font_size <= len(raw):
            # Locate SFNT payload: usually at eot_size - font_size or len(raw) - font_size
            for candidate_offset in (eot_size - font_size, len(raw) - font_size):
                if 0 <= candidate_offset <= len(raw) - font_size:
                    payload = raw[candidate_offset:candidate_offset + font_size]
                    if flags & 0x10000000:
                        payload = bytes(b ^ 0x50 for b in payload)
                    p_ext = is_valid_sfnt_binary(payload)
                    if p_ext:
                        return payload, p_ext

        # Compressed EOT -> try `eot2ttf` CLI (`libeot-bin`)
        if shutil.which("eot2ttf"):
            tmp_eot = None
            tmp_ttf = None
            try:
                fd_e, tmp_eot = tempfile.mkstemp(suffix=".eot")
                os.close(fd_e)
                fd_t, tmp_ttf = tempfile.mkstemp(suffix=".ttf")
                os.close(fd_t)
                with open(tmp_eot, "wb") as f:
                    f.write(raw)
                res = subprocess.run(["eot2ttf", tmp_eot, tmp_ttf], capture_output=True, timeout=8)
                if res.returncode == 0 and os.path.exists(tmp_ttf):
                    with open(tmp_ttf, "rb") as f:
                        converted = f.read()
                    c_ext = is_valid_sfnt_binary(converted)
                    if c_ext:
                        return converted, c_ext
            except Exception:
                pass
            finally:
                for p in (tmp_eot, tmp_ttf):
                    if p and os.path.exists(p):
                        try:
                            os.remove(p)
                        except Exception:
                            pass

    # 4. ODTTF GUID-XOR obfuscation (first 32 bytes XOR'd with reversed 16-byte GUID from filename)
    guid_m = re.search(
        r'([0-9a-fA-F]{8})-?([0-9a-fA-F]{4})-?([0-9a-fA-F]{4})-?([0-9a-fA-F]{4})-?([0-9a-fA-F]{12})',
        os.path.basename(filename)
    )
    if guid_m and len(raw) >= 32:
        hex_str = "".join(guid_m.groups())
        key = bytes.fromhex(hex_str)[::-1]
        deobf = bytearray(raw)
        for i in range(32):
            deobf[i] ^= key[i % 16]
        d_bytes = bytes(deobf)
        d_ext = is_valid_sfnt_binary(d_bytes)
        if d_ext:
            return d_bytes, d_ext

    return b"", ""


def query_font_family_and_style(font_file_path: str) -> tuple[str, str]:
    try:
        res = subprocess.run(
            ["fc-query", "--format=%{family}|%{style}", font_file_path],
            capture_output=True,
            text=True,
            timeout=3,
        )
        if res.returncode == 0 and "|" in res.stdout:
            fam_part, style_part = res.stdout.strip().splitlines()[0].split("|", 1)
            fam = fam_part.split(",")[0].strip()
            style = style_part.split(",")[0].strip()
            return fam, style
    except Exception:
        pass
    return "", ""


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

    user_dir = os.path.expanduser("~/.local/share/fonts/hgf_fonts")
    try:
        os.makedirs(user_dir, exist_ok=True)
        return user_dir
    except Exception:
        pass

    proj_dir = os.path.join(os.getcwd(), "tmp", "fonts_cache")
    os.makedirs(proj_dir, exist_ok=True)
    return proj_dir


def parse_xml_fonts(content: str, is_slide_xml: bool = False):
    fonts = set()
    for m in re.finditer(r'<a:latin\s+[^>]*typeface="([^"]+)"', content):
        val = m.group(1).strip()
        if val and not val.startswith("+m"):
            fonts.add(val)

    for m in re.finditer(r'<p:font\s+[^>]*(?:typeface|name)="([^"]+)"', content):
        val = m.group(1).strip()
        if val and not val.startswith("+m"):
            fonts.add(val)

    if is_slide_xml:
        for m in re.finditer(r'typeface="([^"]+)"', content):
            val = m.group(1).strip()
            if val and not val.startswith("+m") and not any(ord(c) > 0x2000 for c in val):
                fonts.add(val)

    return fonts


def save_embedded_font_blob(raw: bytes, source_name: str, target_dir: str) -> tuple[str, str]:
    """Unwraps and saves an embedded PPTX font into target_dir. Returns (saved_filename, detected_family)."""
    sfnt, ext = unwrap_embedded_fntdata(raw, source_name)
    if not sfnt or not ext:
        return "", ""

    # Write to a temp file first to inspect actual family + style via fc-query
    fd, tmp_path = tempfile.mkstemp(suffix=ext)
    os.close(fd)
    try:
        with open(tmp_path, "wb") as tf:
            tf.write(sfnt)
        fam, style = query_font_family_and_style(tmp_path)
        if fam:
            safe_fam = make_safe_prefix(fam)
            safe_sty = make_safe_prefix(style or "regular")
            # Hash suffix prevents subset collisions while avoiding duplicate writes for identical blobs
            digest = f"{ zlib.crc32(sfnt) & 0xffffffff :08x}"
            out_name = f"{safe_fam}_{safe_sty}_emb_{digest}{ext}"
        else:
            base = make_safe_prefix(os.path.splitext(os.path.basename(source_name))[0]) or "font"
            digest = f"{ zlib.crc32(sfnt) & 0xffffffff :08x}"
            out_name = f"embedded_{base}_{digest}{ext}"

        out_path = os.path.join(target_dir, out_name)
        if not os.path.exists(out_path):
            shutil.move(tmp_path, out_path)
            os.chmod(out_path, 0o644)
            return out_name, fam
        return "", fam
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


def extract_fonts_from_pptx(pptx_path: str, target_dir: str):
    fonts = set()
    extracted_embedded = []
    embedded_families = set()

    try:
        if os.path.isdir(pptx_path):
            emb_dir = os.path.join(pptx_path, "ppt", "fonts")
            if os.path.isdir(emb_dir):
                for fname in sorted(os.listdir(emb_dir)):
                    fpath = os.path.join(emb_dir, fname)
                    if os.path.isfile(fpath):
                        try:
                            with open(fpath, "rb") as bf:
                                raw = bf.read()
                            saved_name, fam = save_embedded_font_blob(raw, fname, target_dir)
                            if saved_name:
                                extracted_embedded.append(saved_name)
                            if fam:
                                embedded_families.add(fam.lower())
                        except Exception:
                            pass

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
                for name in sorted(z.namelist()):
                    if name.startswith("ppt/fonts/") and not name.endswith("/"):
                        try:
                            raw = z.read(name)
                            saved_name, fam = save_embedded_font_blob(raw, name, target_dir)
                            if saved_name:
                                extracted_embedded.append(saved_name)
                            if fam:
                                embedded_families.add(fam.lower())
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

    return fonts, extracted_embedded, embedded_families


def extract_fonts_from_pdf(pdf_path: str):
    fonts = set()
    try:
        res = subprocess.run(["pdffonts", pdf_path], capture_output=True, text=True, timeout=5)
        if res.returncode == 0:
            lines = res.stdout.splitlines()
            if len(lines) > 2:
                dash_cols = lines[1].split()
                name_col_width = len(dash_cols[0]) if dash_cols else 36
                flag_re = re.compile(r'\s+(yes|no)\s+(yes|no)\s+(yes|no)\s+\S+\s+\S+\s*$', re.IGNORECASE)

                for line in lines[2:]:
                    if len(line) < name_col_width:
                        continue
                    m = flag_re.search(line)
                    if not m:
                        continue
                    if m.group(1).lower() == "no":
                        raw_font_name = line[:name_col_width].strip()
                        clean_name = normalize_family_name(raw_font_name)
                        if clean_name:
                            fonts.add(clean_name)
    except Exception:
        pass
    return fonts


def ensure_fontconfig_aliases() -> bool:
    alias_pairs = [
        ("Calibri Light", "Carlito"),
        ("Calibri", "Carlito"),
        ("Cambria", "Caladea"),
        ("Aptos Display", "Aptos"),
        ("Aptos Light", "Aptos"),
        ("Aptos SemiBold", "Aptos"),
        ("Aptos Narrow", "Aptos"),
    ] + [(k.title(), v) for k, v in PROPRIETARY_TO_GOOGLE_TWIN.items()]

    casing_fixes = {
        "Canva Sans": "Canva Sans",
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


def has_full_non_subset_font(clean_family: str, target_dir: str, system_fonts: set) -> bool:
    """Checks if a full (non-subset) font or metric twin is already installed."""
    clean_lower = clean_family.lower().strip()
    if not clean_lower or clean_lower in IGNORE_FONTS or clean_lower.startswith("+m"):
        return True

    if clean_lower in ("calibri", "calibri light"):
        return "carlito" in system_fonts
    if clean_lower == "cambria":
        return "caladea" in system_fonts

    # Note: embedded PPTX fonts have `_emb_` in filename and may be glyph-subsetted (`saveSubsetFonts="1"`).
    # We still attempt downloading full font files from Google Fonts / CDNFonts if only an `_emb_` subset exists,
    # while keeping `_emb_` as an instant guaranteed fallback for proprietary/Canva-exclusive fonts like 'The Seasons'!
    if os.path.isdir(target_dir):
        sp = make_safe_prefix(clean_family)
        if sp:
            for f in os.listdir(target_dir):
                fl = f.lower()
                if "_emb_" in fl:
                    continue
                if (fl.startswith(sp + "_") or fl in (f"{sp}.ttf", f"{sp}.otf")) and (
                    fl.endswith(".ttf") or fl.endswith(".otf")
                ):
                    return True

    if clean_lower in SYSTEM_KNOWN:
        return True

    return False


def download_from_cdnfonts(clean_family: str, target_dir: str) -> list[str]:
    """Fallback font downloader querying fonts.cdnfonts.com (100k+ Canva/display fonts like Norwester)."""
    slug = re.sub(r'[^a-z0-9]+', '-', clean_family.lower()).strip('-')
    if not slug:
        return []

    headers = {"User-Agent": "Mozilla/5.0"}
    css_url = f"https://fonts.cdnfonts.com/css/{urllib.parse.quote(slug)}"
    try:
        req = urllib.request.Request(css_url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status != 200:
                return []
            css = resp.read().decode("utf-8", errors="ignore")
    except Exception:
        return []

    if "@font-face" not in css:
        return []

    # Extract url(...) entries (.ttf, .otf, or .woff)
    raw_urls = re.findall(r"url\(['\"]?(https?://[^)'\"\s]+\.(?:ttf|otf|woff))['\"]?\)", css, flags=re.IGNORECASE)
    if not raw_urls:
        return []

    seen = set()
    urls = [u for u in raw_urls if not (u in seen or seen.add(u))]
    safe_name = make_safe_prefix(clean_family) or "font"
    downloaded = []

    for idx, f_url in enumerate(urls[:12], start=1):
        try:
            req = urllib.request.Request(f_url, headers=headers)
            with urllib.request.urlopen(req, timeout=8) as resp:
                if resp.status != 200:
                    continue
                blob = resp.read()

            if f_url.lower().endswith(".woff") or blob[:4] == b'wOFF':
                sfnt, ext = decode_woff1_to_sfnt(blob)
            else:
                ext = is_valid_sfnt_binary(blob)
                sfnt = blob if ext else b""

            if sfnt and ext:
                dest_filename = f"{safe_name}_cdn_{idx}{ext}"
                dest_path = os.path.join(target_dir, dest_filename)
                if not os.path.exists(dest_path):
                    with open(dest_path, "wb") as out:
                        out.write(sfnt)
                    os.chmod(dest_path, 0o644)
                    downloaded.append(dest_filename)
        except Exception:
            continue

    return downloaded


def download_font_multi_source(family: str, target_dir: str) -> list[str]:
    headers = {"User-Agent": "Mozilla/5.0"}
    downloaded_files = []

    clean_family = normalize_family_name(family)
    if not clean_family or clean_family.lower() in IGNORE_FONTS:
        return []

    # 1. Aptos / Aptos Display verified repository
    if "aptos" in clean_family.lower():
        aptos_repo = "https://raw.githubusercontent.com/ironveil/ttf-aptos/main"
        for af in ("Aptos.ttf", "Aptos-Bold.ttf", "Aptos-Italic.ttf", "Aptos-Display.ttf", "Aptos-Display-Bold.ttf"):
            dest = os.path.join(target_dir, af)
            if not os.path.exists(dest):
                try:
                    req = urllib.request.Request(f"{aptos_repo}/{af}", headers=headers)
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        if resp.status == 200:
                            data = resp.read()
                            if is_valid_sfnt_binary(data):
                                with open(dest, "wb") as out:
                                    out.write(data)
                                downloaded_files.append(af)
                except Exception:
                    pass
        return downloaded_files

    # 2. Google Fonts CSS API (exact family first)
    enc = urllib.parse.quote(clean_family)
    google_urls_to_try = [
        f"https://fonts.googleapis.com/css2?family={enc}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700",
        f"https://fonts.googleapis.com/css2?family={enc}:wght@400;700",
        f"https://fonts.googleapis.com/css2?family={enc}",
    ]
    ttf_urls = []
    for url in google_urls_to_try:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=3) as response:
                if response.status == 200:
                    css = response.read().decode("utf-8", errors="ignore")
                    matches = re.findall(r'src:\s*url\((https://fonts\.gstatic\.com/[^)]+\.(?:ttf|otf))\)', css)
                    if matches:
                        seen = set()
                        ttf_urls = [u for u in matches if not (u in seen or seen.add(u))]
                        break
        except Exception:
            continue

    if ttf_urls:
        safe_name = make_safe_prefix(clean_family) or "font"
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
                            if is_valid_sfnt_binary(data):
                                with open(dest_path, "wb") as out:
                                    out.write(data)
                                os.chmod(dest_path, 0o644)
                                downloaded_files.append(dest_filename)
                except Exception:
                    pass
        return downloaded_files

    # 3. CDNFonts (`fonts.cdnfonts.com` -> WOFF/TTF/OTF for Canva & display fonts like 'Norwester')
    cdn_files = download_from_cdnfonts(clean_family, target_dir)
    if cdn_files:
        return cdn_files

    # 4. Proprietary desktop font -> Google Fonts visual/metric twin (e.g. 'Canva Sans' -> 'Open Sans')
    twin = PROPRIETARY_TO_GOOGLE_TWIN.get(clean_family.lower())
    if twin and twin.lower() != clean_family.lower():
        return download_font_multi_source(twin, target_dir)

    return []


# =============================================================================
# OOXML Slide Normalization for Headless LibreOffice Fidelity
# =============================================================================

def normalize_rpr_blocks(xml_text: str, system_fonts: set) -> str:
    """
    1. Rewrites Canva `typeface="Roboto Bold"` / `"The Seasons Italics"` -> `typeface="Roboto"`
       with `b="1"` / `i="1"` on enclosing <a:rPr> so Fontconfig matches the installed family
       instead of falling back to DejaVu Sans.
    2. Strips positive `spc="..."` tracking attributes on <a:rPr> that trigger LibreOffice 7.3's
       CFF/Type-1 right-edge horizontal clipping bug.
    """
    def fix_rpr(m):
        tag_open, attrs, body, tag_close = m.group(1), m.group(2), m.group(3), m.group(4)
        need_bold = False
        need_italic = False

        def fix_tf(tm):
            nonlocal need_bold, need_italic
            tf = tm.group(1).strip()
            tf_lower = tf.lower()
            # Keep families that genuinely exist as distinct families (e.g. 'Arial Black', 'Aptos Display')
            if tf_lower in ("arial black", "aptos display", "aptos narrow") or tf_lower in system_fonts:
                return tm.group(0)
            sm = COMPOUND_STYLE_RE.match(tf)
            if sm:
                base_fam = sm.group(1).strip()
                style_tok = sm.group(2).lower()
                if any(w in style_tok for w in ("bold", "black", "heavy")):
                    need_bold = True
                if "italic" in style_tok or "oblique" in style_tok:
                    need_italic = True
                return f'typeface="{base_fam}"'
            return tm.group(0)

        new_body = re.sub(r'typeface="([^"]+)"', fix_tf, body)
        new_attrs = re.sub(r'\s+spc="[1-9]\d*"', '', attrs)
        if need_bold and not re.search(r'\bb="(?:1|true)"', new_attrs):
            new_attrs += ' b="1"'
        if need_italic and not re.search(r'\bi="(?:1|true)"', new_attrs):
            new_attrs += ' i="1"'
        return f"<{tag_open}{new_attrs}>{new_body}</{tag_close}>"

    return re.sub(
        r"<(a:(?:def)?rPr\b)([^>]*)>(.*?)</(a:(?:def)?rPr)>",
        fix_rpr,
        xml_text,
        flags=re.DOTALL | re.IGNORECASE,
    )


def normalize_textbox_geometry(sp_xml: str) -> str:
    """
    Prevents Canva tight-width text boxes from wrapping single-line titles ('IRON' -> 'IRO\\nN',
    'OR' -> 'O\\nR') or orphaning trailing words due to HarfBuzz vs Skia sub-pixel differences.
    """
    if 'txBox="true"' not in sp_xml and 'txBox="1"' not in sp_xml:
        return sp_xml
    sp_pr_m = re.search(r"<p:spPr>.*?</p:spPr>", sp_xml, flags=re.DOTALL)
    if sp_pr_m and ("<a:solidFill>" in sp_pr_m.group(0) or "<a:gradFill>" in sp_pr_m.group(0)):
        return sp_xml

    off_m = re.search(r'<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"\s*/>', sp_xml)
    ext_m = re.search(r'<a:ext\s+cx="(\d+)"\s+cy="(\d+)"\s*/>', sp_xml)
    sz_vals = [int(s) for s in re.findall(r'\bsz="(\d+)"', sp_xml)]
    if not off_m or not ext_m or not sz_vals:
        return sp_xml

    x, y = int(off_m.group(1)), int(off_m.group(2))
    cx, cy = int(ext_m.group(1)), int(ext_m.group(2))
    max_sz_emu = max(sz_vals) * 127  # 1/100 pt * 127 = EMUs

    p_count = len(re.findall(r"<a:p\b", sp_xml))
    br_count = len(re.findall(r"<a:br\b", sp_xml))
    is_single_line = (p_count <= 1) and (br_count == 0) and (cy < max_sz_emu * 1.85)

    if is_single_line:
        # Lock wrap="none" AND <a:noAutofit/> so LibreOffice keeps exact x/ctr/r alignment without wrapping!
        def set_wrap_none(bm):
            b_attrs = bm.group(1)
            if "wrap=" in b_attrs:
                b_attrs = re.sub(r'wrap="[^"]*"', 'wrap="none"', b_attrs)
            else:
                b_attrs += ' wrap="none"'
            return f"<a:bodyPr{b_attrs}>"

        sp_xml = re.sub(r"<a:bodyPr([^>]*)>", set_wrap_none, sp_xml, count=1)
        sp_xml = re.sub(r"<a:spAutoFit\s*/>", "<a:noAutofit/>", sp_xml)
    else:
        delta = int(cx * 0.045)
        algn_m = re.search(r'\balgn="([^"]+)"', sp_xml)
        algn = algn_m.group(1) if algn_m else "l"
        new_cx = cx + delta
        if algn == "ctr":
            new_x = x - delta // 2
        elif algn == "r":
            new_x = x - delta
        else:
            new_x = x
        sp_xml = sp_xml[:off_m.start()] + f'<a:off x="{new_x}" y="{y}"/>' + sp_xml[off_m.end():]
        ext_m2 = re.search(r'<a:ext\s+cx="(\d+)"\s+cy="(\d+)"\s*/>', sp_xml)
        if ext_m2:
            sp_xml = sp_xml[:ext_m2.start()] + f'<a:ext cx="{new_cx}" cy="{cy}"/>' + sp_xml[ext_m2.end():]

    return sp_xml


def build_normalized_pptx(src_pptx_path: str, dest_pptx_path: str, system_fonts: set) -> bool:
    if not os.path.isfile(src_pptx_path) or not zipfile.is_zipfile(src_pptx_path):
        return False

    with zipfile.ZipFile(src_pptx_path, "r") as zin, zipfile.ZipFile(
        dest_pptx_path, "w", zipfile.ZIP_DEFLATED
    ) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename.startswith("ppt/") and item.filename.endswith(".xml") and "_rels" not in item.filename:
                xml_str = data.decode("utf-8", errors="ignore")
                xml_str = normalize_rpr_blocks(xml_str, system_fonts)
                if item.filename.startswith("ppt/slides/slide"):
                    xml_str = re.sub(
                        r"<p:sp\b[^>]*>.*?</p:sp>",
                        lambda m: normalize_textbox_geometry(m.group(0)),
                        xml_str,
                        flags=re.DOTALL,
                    )
                data = xml_str.encode("utf-8")
            zout.writestr(item, data)
    return True


def main():
    args = sys.argv[1:]
    normalize_src = None
    normalize_out = None

    cleaned_args = []
    i = 0
    while i < len(args):
        if args[i] == "--normalize-pptx" and i + 2 < len(args):
            normalize_src = args[i + 1]
            normalize_out = args[i + 2]
            i += 3
        else:
            cleaned_args.append(args[i])
            i += 1

    if not cleaned_args:
        print(json.dumps({"error": "Usage: ensure_presentation_fonts.py <file_or_dir> [custom_fonts_dir] [--normalize-pptx <in.pptx> <out.pptx>]"}))
        sys.exit(1)

    input_path = cleaned_args[0]
    custom_dir = cleaned_args[1] if len(cleaned_args) > 1 else None
    target_dir = get_target_fonts_dir(custom_dir)

    aliases_updated = ensure_fontconfig_aliases()
    system_fonts = load_system_fonts_cache()

    raw_fonts = set()
    extracted_embedded = []
    embedded_families = set()

    if input_path.lower().endswith(".pdf"):
        raw_fonts = extract_fonts_from_pdf(input_path)
    else:
        raw_fonts, extracted_embedded, embedded_families = extract_fonts_from_pptx(input_path, target_dir)

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
    unresolved_fonts = []

    for font in fonts_to_check:
        norm_fam = normalize_family_name(font)
        if not has_full_non_subset_font(norm_fam, target_dir, system_fonts):
            new_files = download_font_multi_source(norm_fam, target_dir)
            if new_files:
                downloaded.extend(new_files)
                system_fonts.add(norm_fam.lower())
            elif norm_fam.lower() not in embedded_families and norm_fam.lower() not in system_fonts:
                twin = PROPRIETARY_TO_GOOGLE_TWIN.get(norm_fam.lower())
                if not (twin and twin.lower() in system_fonts):
                    unresolved_fonts.append(font)

    if downloaded or aliases_updated:
        try:
            subprocess.run(["fc-cache", "-f"], capture_output=True, timeout=12)
        except Exception:
            pass
        system_fonts = load_system_fonts_cache()

    normalized_ok = False
    if normalize_src and normalize_out:
        try:
            normalized_ok = build_normalized_pptx(normalize_src, normalize_out, system_fonts)
        except Exception as norm_err:
            print(f"[ensure_fonts] Normalization warning: {norm_err}", file=sys.stderr)

    result = {
        "status": "ok",
        "fonts_dir": target_dir,
        "fonts_found": fonts_to_check,
        "embedded_families": sorted(list(embedded_families)),
        "missing_fonts": unresolved_fonts,
        "downloaded_files": downloaded,
        "normalized_pptx": normalized_ok,
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
