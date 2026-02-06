"""Scrape Alibaba store product list and export to CSV/XLSX.

Target store:
https://yiyuanfa8888.en.alibaba.com/productlist-num.html

Strategy:
  The product data is embedded as URL-encoded JSON inside a
  ``module-data`` attribute on the <div module-name="icbu-pc-productListPc">
  element.  We URL-decode it, parse the JSON, and extract the rich product
  data including multiple image URLs at various resolutions.

Outputs:
- products_toy_ctys/result.csv
- products_toy_ctys/result.xlsx
- products_toy_ctys/ctys_images/*
"""

from __future__ import annotations

import json
import math
import os
import re
import time
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import unquote

import pandas as pd
import requests
from bs4 import BeautifulSoup


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "https://yiyuanfa8888.en.alibaba.com/productlist-{num}.html"
DEFAULT_PARAMS = {
    "filter": "all",
    "sortType": "modified-desc",
    "spm": "a2700.shop_pl.41413.dbtmnavgo",
}

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://yiyuanfa8888.en.alibaba.com/",
}

OUTPUT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "products_toy_ctys")
)
OUTPUT_CSV = os.path.join(OUTPUT_DIR, "result.csv")
OUTPUT_XLSX = os.path.join(OUTPUT_DIR, "result.xlsx")
IMAGE_DIR = os.path.join(OUTPUT_DIR, "ctys_images")


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class Product:
    product_id: str
    title: str
    price: Optional[str] = None
    price_from: Optional[str] = None
    price_to: Optional[str] = None
    fob_price: Optional[str] = None
    min_order: Optional[str] = None
    currency: Optional[str] = None
    detail_url: Optional[str] = None
    image_url: Optional[str] = None
    image_url_original: Optional[str] = None
    image_url_350: Optional[str] = None
    all_image_urls: Optional[str] = None
    sku_images: Optional[str] = None
    sold_180d: Optional[int] = None
    order_count: Optional[int] = None
    group_id: Optional[int] = None
    rts_product: Optional[bool] = None


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

_session = requests.Session()
_session.headers.update(REQUEST_HEADERS)


def fetch_page(num: int, retries: int = 3) -> str:
    """Fetch a product-list page.  Retries on transient errors."""
    url = BASE_URL.format(num=num)
    for attempt in range(retries):
        try:
            resp = _session.get(url, params=DEFAULT_PARAMS, timeout=30)
            resp.raise_for_status()
            return resp.text
        except requests.RequestException as exc:
            if attempt < retries - 1:
                wait = 2 ** attempt
                print(f"  Retry {attempt + 1} for page {num} after error: {exc}")
                time.sleep(wait)
            else:
                raise


# ---------------------------------------------------------------------------
# HTML → JSON extraction
# ---------------------------------------------------------------------------

def _extract_module_data(html: str) -> Optional[Dict[str, Any]]:
    """Extract the URL-encoded JSON from the productListPc module-data attr."""

    soup = BeautifulSoup(html, "html.parser")

    # Strategy 1: find the div with module-name="icbu-pc-productListPc"
    div = soup.find(attrs={"module-name": "icbu-pc-productListPc"})
    if div:
        raw = div.get("module-data", "")
        if raw:
            decoded = unquote(raw)
            try:
                return json.loads(decoded)
            except json.JSONDecodeError:
                pass

    # Strategy 2: regex fallback
    m = re.search(
        r'module-name=["\']icbu-pc-productListPc["\'][^>]*module-data=["\']([^"\']+)["\']',
        html,
    )
    if m:
        decoded = unquote(m.group(1))
        try:
            return json.loads(decoded)
        except json.JSONDecodeError:
            pass

    # Strategy 3: search for URL-encoded productList blob anywhere
    decoded_html = unquote(html)
    m2 = re.search(r'"productList"\s*:\s*\[', decoded_html)
    if m2:
        start = m2.start()
        depth = 0
        for i in range(start, -1, -1):
            if decoded_html[i] == "}":
                depth += 1
            elif decoded_html[i] == "{":
                if depth == 0:
                    bracket_depth = 0
                    j = m2.end() - 1
                    for j in range(m2.end() - 1, len(decoded_html)):
                        if decoded_html[j] == "[":
                            bracket_depth += 1
                        elif decoded_html[j] == "]":
                            bracket_depth -= 1
                            if bracket_depth == 0:
                                break
                    snippet = '{"productList":' + decoded_html[m2.end() - 1 : j + 1] + "}"
                    try:
                        return {"mds": {"moduleData": {"data": json.loads(snippet)}}}
                    except json.JSONDecodeError:
                        pass
                    break
                depth -= 1

    return None


def _get_product_list(module_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Navigate the module JSON to find the productList array."""
    try:
        return module_data["mds"]["moduleData"]["data"]["productList"]
    except (KeyError, TypeError):
        pass

    # Fallback: recursive search
    def _find(obj: Any) -> Optional[List]:
        if isinstance(obj, dict):
            if "productList" in obj and isinstance(obj["productList"], list):
                return obj["productList"]
            for v in obj.values():
                result = _find(v)
                if result is not None:
                    return result
        elif isinstance(obj, list):
            for item in obj:
                result = _find(item)
                if result is not None:
                    return result
        return None

    return _find(module_data) or []


def _get_pagination(module_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract pagination info from the module JSON."""
    try:
        return module_data["mds"]["moduleData"]["data"]["pageNavView"]
    except (KeyError, TypeError):
        return {}


# ---------------------------------------------------------------------------
# Product normalisation
# ---------------------------------------------------------------------------

def _abs_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("http"):
        return url
    if url.startswith("/"):
        return "https://yiyuanfa8888.en.alibaba.com" + url
    return url


def _normalize_product(raw: Dict[str, Any]) -> Product:
    """Convert a raw JSON product dict into a Product dataclass."""

    product_id = str(raw.get("id", ""))
    title = raw.get("subject", "")

    # Price
    price = raw.get("fobPriceWithoutUnit") or raw.get("fobPrice")
    fob_price = raw.get("fobPrice")
    price_from = str(raw["priceFrom"]) if raw.get("priceFrom") else None
    price_to = str(raw["priceTo"]) if raw.get("priceTo") else None

    # Min order
    moq = raw.get("moq")

    # Currency
    currency_type = raw.get("currencyType", "")
    currency = "USD" if currency_type == "US" else currency_type

    # URL
    detail_url = _abs_url(raw.get("url"))

    # Images — pick the best resolution
    image_urls_dict = raw.get("imageUrls") or {}
    image_url_original = _abs_url(image_urls_dict.get("original"))
    image_url_350 = _abs_url(image_urls_dict.get("x350"))
    image_url = image_url_original or image_url_350 or _abs_url(image_urls_dict.get("x220"))

    # All images (first 5 originals from imageUrlList)
    all_image_urls_list: List[str] = []
    for img_dict in (raw.get("imageUrlList") or [])[:5]:
        orig = _abs_url(img_dict.get("original")) or _abs_url(img_dict.get("x350"))
        if orig:
            all_image_urls_list.append(orig)
    all_image_urls = " | ".join(all_image_urls_list) if all_image_urls_list else None

    # SKU images
    sku_imgs = raw.get("skuImg") or []
    sku_images = " | ".join(_abs_url(u) for u in sku_imgs if u) if sku_imgs else None

    # Stats
    sold_180d = raw.get("prodSold180")
    order_count = raw.get("prodOrdCnt")
    group_id = raw.get("groupId")
    rts_product = raw.get("rtsProduct")

    return Product(
        product_id=product_id,
        title=title,
        price=price,
        price_from=price_from,
        price_to=price_to,
        fob_price=fob_price,
        min_order=moq,
        currency=currency,
        detail_url=detail_url,
        image_url=image_url,
        image_url_original=image_url_original,
        image_url_350=image_url_350,
        all_image_urls=all_image_urls,
        sku_images=sku_images,
        sold_180d=sold_180d,
        order_count=order_count,
        group_id=group_id,
        rts_product=rts_product,
    )


# ---------------------------------------------------------------------------
# Parse one page
# ---------------------------------------------------------------------------

def parse_page(html: str) -> Tuple[List[Product], Dict[str, Any]]:
    """Parse products + pagination from a single page HTML."""
    module_data = _extract_module_data(html)
    if module_data is None:
        return [], {}

    raw_products = _get_product_list(module_data)
    pagination = _get_pagination(module_data)

    products = [_normalize_product(p) for p in raw_products if p.get("id")]
    return products, pagination


# ---------------------------------------------------------------------------
# Scrape all pages
# ---------------------------------------------------------------------------

def scrape_all_pages(max_pages: int = 200) -> List[Product]:
    all_products: List[Product] = []
    seen_ids: Set[str] = set()
    total_pages_estimate: Optional[int] = None

    for num in range(1, max_pages + 1):
        html = fetch_page(num)
        products, pagination = parse_page(html)

        # Determine total pages from first page pagination
        if num == 1 and pagination:
            total_lines = pagination.get("totalLines") or pagination.get("displayTotalLines") or 0
            page_lines = pagination.get("pageLines") or 16
            if total_lines and page_lines:
                total_pages_estimate = math.ceil(total_lines / page_lines)
                print(f"Store has {total_lines} products across ~{total_pages_estimate} pages (page size {page_lines})")

        if not products:
            print(f"Page {num}: no products found — stopping.")
            break

        new_count = 0
        for product in products:
            if product.product_id in seen_ids:
                continue
            seen_ids.add(product.product_id)
            all_products.append(product)
            new_count += 1

        print(f"Page {num}: {len(products)} found, {new_count} new (total so far: {len(all_products)})")

        if new_count == 0:
            print("  No new products — stopping.")
            break

        # Stop if we've reached the known last page
        if total_pages_estimate and num >= total_pages_estimate:
            print(f"  Reached last page ({total_pages_estimate}).")
            break

        time.sleep(0.8)

    return all_products


# ---------------------------------------------------------------------------
# Image download
# ---------------------------------------------------------------------------

def _safe_filename(name: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9\-_\.]+", "_", name)
    return name.strip("_")[:200]


def download_images(products: List[Product]) -> None:
    os.makedirs(IMAGE_DIR, exist_ok=True)
    downloaded = 0
    skipped = 0
    failed = 0

    for product in products:
        url = product.image_url
        if not url:
            continue

        base_name = product.product_id or _safe_filename(product.title or "image")
        url_path = url.split("?")[0]
        ext = os.path.splitext(url_path)[-1].lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            ext = ".jpg"

        file_path = os.path.join(IMAGE_DIR, f"{base_name}{ext}")
        if os.path.exists(file_path):
            skipped += 1
            continue

        try:
            resp = _session.get(url, timeout=30)
            resp.raise_for_status()
            if len(resp.content) < 100:
                failed += 1
                continue
            with open(file_path, "wb") as f:
                f.write(resp.content)
            downloaded += 1
        except requests.RequestException as exc:
            print(f"  Image download failed for {product.product_id}: {exc}")
            failed += 1

    print(f"Images: {downloaded} downloaded, {skipped} skipped (exist), {failed} failed")


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

def export_products(products: List[Product]) -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    rows = [asdict(p) for p in products]
    df = pd.DataFrame(rows)
    df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    df.to_excel(OUTPUT_XLSX, index=False)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    products = scrape_all_pages()
    if not products:
        print("No products found.")
        return

    export_products(products)
    print(f"\nSaved {len(products)} products to CSV/XLSX.")
    print(f"  CSV:  {OUTPUT_CSV}")
    print(f"  XLSX: {OUTPUT_XLSX}")

    download_images(products)
    print(f"Images saved to: {IMAGE_DIR}")


if __name__ == "__main__":
    main()
