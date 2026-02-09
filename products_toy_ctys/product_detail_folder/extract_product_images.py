"""Extract product images referenced in product_description.md files.

Scans each subfolder of the `product_detail_folder`, finds
`product_description.md`, extracts image references (Markdown `![]()`,
HTML `<img src=..>`, plain URLs, and data URIs), downloads or decodes
them, and stores the images in an `images/` subfolder alongside the
markdown file.

Usage:
  python products_toy_ctys\product_detail_folder\extract_product_images.py --root products_toy_ctys\product_detail_folder --limit 41

Options:
  --root PATH   Root folder that contains product subfolders (default: .)
  --force       Overwrite existing files when hashes differ
  --update      Replace remote URLs in markdown with local image paths
  --limit N     Only process first N product folders (for testing)

The script tries to use `requests` for downloads but falls back to
`urllib.request` if unavailable.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import os
import re
import shutil
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    import requests
except Exception:
    requests = None


MD_IMAGE_RE = re.compile(r"!\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
HTML_IMG_RE = re.compile(r"<img[^>]+src=[\'\"]([^\'\"]+)[\'\"]", re.I)
URL_RE = re.compile(r"https?://[^)\s'\"]+\.(?:png|jpe?g|gif|webp|svg)(?:\?[^)\s']*)?", re.I)
DATA_URI_RE = re.compile(r"data:(image/[^;]+);base64,([A-Za-z0-9+/=\n\r]+)")


def sha1_bytes(b: bytes) -> str:
    return hashlib.sha1(b).hexdigest()


def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def sanitize_filename(name: str) -> str:
    # keep only safe characters
    return re.sub(r"[^A-Za-z0-9._-]", "_", name)


def guess_ext_from_mime(mime: str) -> str:
    mime = mime.lower()
    if "jpeg" in mime:
        return ".jpg"
    if "png" in mime:
        return ".png"
    if "gif" in mime:
        return ".gif"
    if "webp" in mime:
        return ".webp"
    if "svg" in mime:
        return ".svg"
    return ""


def download_url(url: str, timeout: int = 30) -> Tuple[Optional[bytes], Optional[str]]:
    """Download URL, return (bytes, mime) or (None, None) on failure."""
    try:
        if requests:
            r = requests.get(url, timeout=timeout)
            r.raise_for_status()
            mime = r.headers.get("content-type", "")
            return r.content, mime
        else:
            from urllib.request import urlopen

            with urlopen(url, timeout=timeout) as resp:
                data = resp.read()
                mime = resp.headers.get_content_type() if hasattr(resp.headers, "get_content_type") else resp.headers.get("Content-Type", "")
                return data, mime
    except Exception:
        return None, None


def extract_image_refs(text: str) -> List[str]:
    refs: List[str] = []
    refs += MD_IMAGE_RE.findall(text)
    refs += HTML_IMG_RE.findall(text)
    refs += URL_RE.findall(text)
    # collect data URIs explicitly
    refs += [m.group(0) for m in DATA_URI_RE.finditer(text)]
    # dedupe while preserving order
    seen = set()
    out = []
    for r in refs:
        if r not in seen:
            seen.add(r)
            out.append(r)
    return out


def save_image_bytes(dst_dir: Path, src_bytes: bytes, preferred_name: Optional[str] = None, mime: Optional[str] = None, force: bool = False) -> Path:
    ensure_dir(dst_dir)
    content_hash = sha1_bytes(src_bytes)
    # check for existing file with same hash
    for f in dst_dir.iterdir():
        if not f.is_file():
            continue
        try:
            if sha1_bytes(f.read_bytes()) == content_hash:
                return f
        except Exception:
            continue

    # determine extension
    ext = ""
    if preferred_name:
        ext = Path(preferred_name).suffix
    if not ext and mime:
        ext = guess_ext_from_mime(mime)
    if not ext:
        ext = ".bin"

    if preferred_name:
        base = sanitize_filename(Path(preferred_name).stem)
        filename = f"{base}{ext}"
    else:
        filename = f"img_{content_hash[:10]}{ext}"

    out_path = dst_dir / filename
    # avoid overwriting different content unless force
    if out_path.exists() and not force:
        # if exists but different, add hash suffix
        if sha1_bytes(out_path.read_bytes()) != content_hash:
            out_path = dst_dir / f"{out_path.stem}_{content_hash[:8]}{out_path.suffix}"

    out_path.write_bytes(src_bytes)
    return out_path


def process_product_folder(product_dir: Path, force: bool = False, update_md: bool = False) -> Dict[str, str]:
    """Process one product folder; returns mapping remote->local"""
    md_file = product_dir / "product_description.md"
    if not md_file.exists():
        return {}
    text = md_file.read_text(encoding="utf-8")
    refs = extract_image_refs(text)
    if not refs:
        return {}

    images_dir = product_dir / "images"
    ensure_dir(images_dir)
    mapping: Dict[str, str] = {}

    for ref in refs:
        ref = ref.strip()
        # data URI
        m_data = DATA_URI_RE.match(ref)
        if m_data:
            mime = m_data.group(1)
            b64 = m_data.group(2)
            try:
                raw = base64.b64decode(b64)
            except Exception:
                continue
            out = save_image_bytes(images_dir, raw, preferred_name=None, mime=mime, force=force)
            mapping[ref] = os.path.relpath(out, product_dir).replace("\\", "/")
            continue

        # http(s) URL
        if ref.lower().startswith("http://") or ref.lower().startswith("https://"):
            data, mime = download_url(ref)
            if data is None:
                continue
            # try to keep original filename
            preferred = None
            try:
                preferred = Path(ref.split("?")[0]).name
            except Exception:
                preferred = None
            out = save_image_bytes(images_dir, data, preferred_name=preferred, mime=mime, force=force)
            mapping[ref] = os.path.relpath(out, product_dir).replace("\\", "/")
            continue

        # otherwise treat as relative or local file path
        # resolve relative to md_file
        local_path = (product_dir / ref).resolve()
        if local_path.exists() and local_path.is_file():
            data = local_path.read_bytes()
            out = save_image_bytes(images_dir, data, preferred_name=local_path.name, mime=None, force=force)
            mapping[ref] = os.path.relpath(out, product_dir).replace("\\", "/")
            continue

    # optionally update markdown
    if update_md and mapping:
        new_text = text
        for old, newrel in mapping.items():
            # replace occurrences of old with newrel
            new_text = new_text.replace(old, newrel)
        if new_text != text:
            md_file.write_text(new_text, encoding="utf-8")

    return mapping


def find_product_dirs(root: Path) -> List[Path]:
    dirs = [p for p in root.iterdir() if p.is_dir()]
    # sort for reproducible order
    dirs.sort()
    return dirs


def main(argv=None):
    p = argparse.ArgumentParser(description="Extract product images into images/ folder")
    p.add_argument("--root", default=".", help="root path containing product subfolders")
    p.add_argument("--force", action="store_true", help="overwrite differing files")
    p.add_argument("--update", action="store_true", help="replace remote URLs in markdown with local paths")
    p.add_argument("--limit", type=int, default=0, help="limit number of product folders processed (0 = all)")
    args = p.parse_args(argv)

    root = Path(args.root)
    if not root.exists():
        print(f"Root path not found: {root}")
        return 2

    product_dirs = find_product_dirs(root)
    if args.limit and args.limit > 0:
        product_dirs = product_dirs[: args.limit]

    total = 0
    updated = 0
    for pd in product_dirs:
        mapping = process_product_folder(pd, force=args.force, update_md=args.update)
        if mapping:
            total += 1
            print(f"Processed {pd} -> {len(mapping)} images")
            if args.update:
                updated += 1

    print(f"Done. Processed {total} product folders. Markdown updated: {updated}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
