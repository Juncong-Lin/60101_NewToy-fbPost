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
- products_toy_ctys/product_detail_folder/<product_name>/key_attributes.md
- products_toy_ctys/product_detail_folder/<product_name>/packaging_and_delivery.md
- products_toy_ctys/product_detail_folder/<product_name>/product_description.md

Usage:
  python scrape_ctys.py                 # Scrape product list only
  python scrape_ctys.py --details       # Scrape product details only (from existing CSV)
  python scrape_ctys.py --all           # Scrape product list + details
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import time
import traceback
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import unquote

import pandas as pd
import requests
from bs4 import BeautifulSoup

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False


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
DETAIL_OUTPUT_DIR = os.path.join(OUTPUT_DIR, "product_detail_folder")
DETAIL_STORAGE_STATE = os.path.join(OUTPUT_DIR, "playwright_storage_state.json")

# Detail page timing (seconds)
DETAIL_PAGE_DELAY = 4          # wait between detail page requests
DETAIL_NAV_TIMEOUT = 45000     # milliseconds for page navigation
DETAIL_SCROLL_PAUSE = 0.6      # pause between scroll steps


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


# ===========================================================================
# PRODUCT DETAIL SCRAPING  (Playwright-based)
# ===========================================================================

def _safe_folder_name(product_id: str, title: str) -> str:
    """Create a safe folder name from product_id and title."""
    safe_title = re.sub(r"[^a-zA-Z0-9\-_]+", "_", title)
    safe_title = safe_title.strip("_")[:80]
    return f"{product_id}_{safe_title}"


def _is_detail_complete(product_dir: str) -> bool:
    """Check if all 3 detail markdown files exist and have meaningful content."""
    files = ["key_attributes.md", "packaging_and_delivery.md", "product_description.md"]
    for f in files:
        path = os.path.join(product_dir, f)
        if not os.path.exists(path):
            return False
        if os.path.getsize(path) < 50:
            return False

    # Extra check: key_attributes.md must have table data (not just fallback text)
    ka_path = os.path.join(product_dir, "key_attributes.md")
    try:
        with open(ka_path, "r", encoding="utf-8") as fh:
            content = fh.read()
            if "No key attributes data found" in content:
                return False
            if "|" not in content:
                return False
    except Exception:
        return False

    return True


def _is_alibaba_captcha(page) -> bool:
    """Check if the current page is a captcha / anti-bot page."""
    try:
        url = page.url.lower()
        if "captcha" in url or "punish" in url or "tmd" in url:
            return True
    except Exception:
        pass
    try:
        return bool(page.evaluate("""
            () => {
                const text = (document.body?.innerText || '').toLowerCase();
                if (text.includes('slide to verify') ||
                    text.includes('unusual traffic') ||
                    text.includes('验证') ||
                    text.includes('sorry, we have detected')) {
                    return true;
                }
                // Very short page with no product content = likely captcha
                if (document.querySelectorAll('[class*="product"], [class*="attr"], h1').length === 0
                    && text.length < 800) {
                    return true;
                }
                return false;
            }
        """))
    except Exception:
        return False


def _wait_for_human_detail(page, reason: str = "captcha") -> None:
    """Pause and wait for user to manually resolve captcha."""
    print(f"\n{'='*60}")
    print(f"  WARNING: {reason.upper()} DETECTED on detail page")
    print(f"  Please resolve in the browser window,")
    print(f"  then press Enter here to continue...")
    print(f"{'='*60}\n")
    input(">>> Press Enter after resolving... ")
    time.sleep(2)


def _scroll_detail_page(page, steps: int = 6) -> None:
    """Scroll down the page in steps to trigger lazy loading."""
    for i in range(1, steps + 1):
        try:
            page.evaluate(f"window.scrollTo(0, document.body.scrollHeight * {i / steps})")
        except Exception:
            break
        time.sleep(DETAIL_SCROLL_PAUSE)


# ---------------------------------------------------------------------------
# JavaScript extraction — multiple strategies
# ---------------------------------------------------------------------------

EXTRACT_ATTRIBUTES_JS = r"""
() => {
    const result = {
        key_attributes: {},
        packaging_delivery: {}
    };

    function cleanText(el) {
        if (!el) return '';
        return el.textContent.replace(/\s+/g, ' ').trim();
    }

    // ====================================================================
    // STRATEGY 1 (BEST):  Extract from window.detailData JSON
    //   - keyAttributes + otherAttributes from mediaItems
    //   - productBasicProperties
    // ====================================================================
    try {
        const dd = window.detailData;
        if (dd && dd.globalData && dd.globalData.product) {
            const product = dd.globalData.product;

            // Find the "attribute" type media item
            const mediaItems = product.mediaItems || [];
            for (const item of mediaItems) {
                if (item.type === 'attribute' && item.attributeData) {
                    const ad = item.attributeData;

                    // keyAttributes: [{attributeName, attributeValue}, ...]
                    if (Array.isArray(ad.keyAttributes)) {
                        ad.keyAttributes.forEach(a => {
                            if (a.attributeName && a.attributeValue) {
                                result.key_attributes[a.attributeName] = a.attributeValue;
                            }
                        });
                    }

                    // otherAttributes: same format
                    if (Array.isArray(ad.otherAttributes)) {
                        ad.otherAttributes.forEach(a => {
                            if (a.attributeName && a.attributeValue) {
                                result.key_attributes[a.attributeName] = a.attributeValue;
                            }
                        });
                    }
                    break;
                }
            }

            // productBasicProperties as fallback/supplement
            if (Array.isArray(product.productBasicProperties)) {
                product.productBasicProperties.forEach(p => {
                    const name = p.attrName || p.attributeName || '';
                    const value = p.attrValue || p.attributeValue || '';
                    if (name && value && !result.key_attributes[name]) {
                        result.key_attributes[name] = value;
                    }
                });
            }
        }
    } catch(e) {}

    // ====================================================================
    // STRATEGY 2:  DOM-based extraction for Key Attributes
    //   Container: div.module_attribute
    // ====================================================================
    if (Object.keys(result.key_attributes).length === 0) {
        try {
            const attrModule = document.querySelector('.module_attribute, [class*="module_attribute"]');
            if (attrModule) {
                // Find all potential key-value pairs in the module
                // Modern Alibaba uses divs with id- prefixed classes
                const allChildren = attrModule.querySelectorAll('div, span');
                const texts = [];
                for (const el of allChildren) {
                    const t = cleanText(el);
                    if (t && t.length < 100 && el.children.length === 0) {
                        texts.push(t);
                    }
                }
                // Key attributes table-like structure: the attribute grid
                // uses alternating value/key pattern in some layouts
                // Also check for colon-separated pairs
                for (let i = 0; i < texts.length; i++) {
                    const t = texts[i];
                    if (t.includes(':')) {
                        const parts = t.split(':');
                        if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
                            result.key_attributes[parts[0].trim()] = parts[1].trim();
                        }
                    }
                }
            }
        } catch(e) {}
    }

    // ====================================================================
    // STRATEGY 3:  DOM extraction for Packaging & Delivery
    //   Find the H3 "Packaging and delivery" heading and parse siblings
    // ====================================================================
    try {
        const h3s = document.querySelectorAll('h3');
        for (const h3 of h3s) {
            const text = cleanText(h3).toLowerCase();
            if (text.includes('packaging') && text.includes('delivery')) {
                // Get the parent container
                const parent = h3.parentElement;
                if (!parent) continue;

                // Look for key-value patterns in sibling/child elements
                const items = parent.querySelectorAll(
                    'div[class*="id-"], span[class*="id-"], ' +
                    'div[class*="info"], div[class*="item"]'
                );

                // Collect all leaf text nodes
                const leafTexts = [];
                const allLeafs = parent.querySelectorAll('*');
                for (const el of allLeafs) {
                    if (el === h3) continue;
                    if (el.children.length === 0 ||
                        (el.children.length <= 1 && el.textContent.trim().length < 80)) {
                        const t = cleanText(el);
                        if (t && t.length > 0 && t.length < 80) {
                            leafTexts.push(t);
                        }
                    }
                }

                // Parse as key:value pairs
                for (const t of leafTexts) {
                    if (t.includes(':')) {
                        const idx = t.indexOf(':');
                        const k = t.substring(0, idx).trim();
                        const v = t.substring(idx + 1).trim();
                        if (k && v) result.packaging_delivery[k] = v;
                    }
                }

                // If no colon-separated pairs, try pairing adjacent texts
                if (Object.keys(result.packaging_delivery).length === 0) {
                    // Remove duplicates
                    const unique = [...new Set(leafTexts)];
                    for (let i = 0; i < unique.length - 1; i += 2) {
                        const k = unique[i];
                        const v = unique[i + 1];
                        if (k && v && k !== v && k.length < 50) {
                            result.packaging_delivery[k] = v;
                        }
                    }
                }
                break;
            }
        }
    } catch(e) {}

    // ====================================================================
    // STRATEGY 4:  Try extracting packaging from detailData nodeMap
    // ====================================================================
    if (Object.keys(result.packaging_delivery).length === 0) {
        try {
            const dd = window.detailData;
            if (dd && dd.nodeMap && dd.nodeMap.module_sorted_attribute) {
                const mod = dd.nodeMap.module_sorted_attribute;
                if (mod.privateData) {
                    const pd = mod.privateData;
                    // Look for packaging data
                    if (pd.packaging || pd.packagingInfo) {
                        const pkg = pd.packaging || pd.packagingInfo;
                        if (typeof pkg === 'object') {
                            for (const [k, v] of Object.entries(pkg)) {
                                if (typeof v === 'string') {
                                    result.packaging_delivery[k] = v;
                                }
                            }
                        }
                    }
                }
            }
        } catch(e) {}
    }

    return result;
}
"""


EXTRACT_DESCRIPTION_JS = r"""
() => {
    const desc = { title: '', table: {}, text: '', images: [] };

    function cleanText(el) {
        if (!el) return '';
        return el.textContent.replace(/\s+/g, ' ').trim();
    }

    // Product title from detailData or DOM
    try {
        const dd = window.detailData;
        if (dd && dd.globalData && dd.globalData.product) {
            desc.title = dd.globalData.product.subject || '';
        }
    } catch(e) {}

    if (!desc.title) {
        const titleEl = document.querySelector(
            'h1, [class*="product-title"], [class*="module-pdp-title"]'
        );
        if (titleEl) desc.title = cleanText(titleEl);
    }

    // NOTE: Description content is primarily in an iframe (descIframe.html).
    // This JS only provides the product title.  The iframe extraction
    // in Python handles the actual description text and tables.

    return desc;
}
"""


EXTRACT_DESC_FROM_IFRAME_JS = r"""
() => {
    const result = { table: {}, text: '', images: [] };

    function cleanText(el) {
        if (!el) return '';
        return el.textContent.replace(/\s+/g, ' ').trim();
    }

    // Remove all <style> and <script> tags before extracting text
    const styleTags = document.querySelectorAll('style, script');
    styleTags.forEach(s => s.remove());

    // Get all text from the iframe body (after removing styles)
    const body = document.body || document.documentElement;
    result.text = cleanText(body);

    // Extract tables (key-value pairs)
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            if (cells.length >= 2) {
                const k = cleanText(cells[0]);
                const v = cleanText(cells[1]);
                if (k && v && k.length < 80) result.table[k] = v;
            }
        });
    });

    // Collect image URLs from the description
    const imgs = document.querySelectorAll('img');
    imgs.forEach(img => {
        const src = img.src || img.getAttribute('data-src') || '';
        if (src && src.startsWith('http')) {
            result.images.push(src);
        }
    });

    return result;
}
"""


# ---------------------------------------------------------------------------
# Data extraction orchestrator
# ---------------------------------------------------------------------------

def _extract_detail_data(page) -> dict:
    """Extract Key Attributes, Packaging & Delivery, Product Description."""

    data = {
        "key_attributes": {},
        "packaging_delivery": {},
        "product_description": {"title": "", "table": {}, "text": "", "images": []},
    }

    # Scroll to load lazy content
    _scroll_detail_page(page, 5)

    # --- Step 1: Extract key attributes & packaging (uses window.detailData) ---
    try:
        attr_data = page.evaluate(EXTRACT_ATTRIBUTES_JS)
        data["key_attributes"] = attr_data.get("key_attributes", {})
        data["packaging_delivery"] = attr_data.get("packaging_delivery", {})
    except Exception as e:
        print(f"    Warn: JS attr extraction error: {e}")

    # --- Step 2: Get product title from main page ---
    try:
        desc_data = page.evaluate(EXTRACT_DESCRIPTION_JS)
        data["product_description"]["title"] = desc_data.get("title", "")
    except Exception as e:
        print(f"    Warn: JS title extraction error: {e}")

    # --- Step 3: Extract description from iframe (PRIMARY method) ---
    #    Alibaba loads description in descIframe.html?productId=XXX
    iframe_found = False
    try:
        frames = page.frames
        for frame in frames:
            frame_url = frame.url or ""
            # Only match the description iframe specifically
            if "descIframe" in frame_url or "description" in frame_url.lower():
                try:
                    iframe_data = frame.evaluate(EXTRACT_DESC_FROM_IFRAME_JS)
                    if iframe_data.get("text") or iframe_data.get("table"):
                        data["product_description"]["table"] = iframe_data.get("table", {})
                        data["product_description"]["text"] = iframe_data.get("text", "")
                        data["product_description"]["images"] = iframe_data.get("images", [])
                        iframe_found = True
                        break
                except Exception:
                    continue
    except Exception:
        pass

    # --- Step 4: If no iframe found, try navigating to the iframe URL directly ---
    if not iframe_found:
        try:
            current_url = page.url
            # Extract product ID from URL
            import re as _re
            pid_match = _re.search(r'/(\d{10,})\.html', current_url)
            if pid_match:
                product_id = pid_match.group(1)
                iframe_url = f"https://www.alibaba.com/product-detail/description/descIframe.html?productId={product_id}"
                print(f"    Trying direct iframe URL: {iframe_url}")
                # Create a new page context for the iframe
                try:
                    resp = page.evaluate(f"""
                    async () => {{
                        const response = await fetch("{iframe_url}");
                        return await response.text();
                    }}
                    """)
                    if resp and len(resp) > 50:
                        # Parse with BS4 in Python
                        from bs4 import BeautifulSoup as _BS
                        soup = _BS(resp, "html.parser")
                        text = soup.get_text(" ", strip=True)
                        table = {}
                        for tr in soup.find_all("tr"):
                            cells = tr.find_all(["td", "th"])
                            if len(cells) >= 2:
                                k = cells[0].get_text(strip=True)
                                v = cells[1].get_text(strip=True)
                                if k and v and len(k) < 80:
                                    table[k] = v
                        imgs = []
                        for img in soup.find_all("img"):
                            src = img.get("src") or img.get("data-src") or ""
                            if src.startswith("http"):
                                imgs.append(src)
                        if text or table:
                            data["product_description"]["text"] = text
                            data["product_description"]["table"] = table
                            data["product_description"]["images"] = imgs
                            iframe_found = True
                except Exception as e2:
                    print(f"    Warn: Direct iframe fetch error: {e2}")
        except Exception:
            pass

    # --- Step 5: Fallback — extract full-page HTML and parse with BS4 ---
    if (not data["key_attributes"]
            and not data["packaging_delivery"]
            and not data["product_description"]["table"]
            and not data["product_description"]["text"]):
        try:
            html = page.content()
            _extract_detail_from_html(html, data)
        except Exception as e:
            print(f"    Warn: HTML fallback extraction error: {e}")

    return data


def _extract_detail_from_html(html: str, data: dict) -> None:
    """BeautifulSoup fallback: parse HTML to find attribute tables."""
    soup = BeautifulSoup(html, "html.parser")

    def _find_section(heading_text: str):
        """Find a section container by its heading text."""
        for tag in soup.find_all(re.compile(r"^(h[1-6]|div|span)$")):
            text = tag.get_text(strip=True).lower()
            if heading_text.lower() in text:
                parent = tag.find_parent("div")
                return parent
        return None

    # Key attributes
    if not data["key_attributes"]:
        section = _find_section("key attribute")
        if section:
            for row in section.find_all("tr"):
                cells = row.find_all(["td", "th"])
                for i in range(0, len(cells) - 1, 2):
                    k = cells[i].get_text(strip=True)
                    v = cells[i + 1].get_text(strip=True)
                    if k and v:
                        data["key_attributes"][k] = v
            # Also try do-entry-item divs
            if not data["key_attributes"]:
                for item in section.select(".do-entry-item, [class*='attr-item']"):
                    key_el = item.select_one("[class*='key'], [class*='name']")
                    val_el = item.select_one("[class*='val'], [class*='value']")
                    if key_el and val_el:
                        k = key_el.get_text(strip=True)
                        v = val_el.get_text(strip=True)
                        if k and v:
                            data["key_attributes"][k] = v

    # Packaging and delivery
    if not data["packaging_delivery"]:
        section = _find_section("packaging")
        if section:
            for row in section.find_all("tr"):
                cells = row.find_all(["td", "th"])
                for i in range(0, len(cells) - 1, 2):
                    k = cells[i].get_text(strip=True)
                    v = cells[i + 1].get_text(strip=True)
                    if k and v:
                        data["packaging_delivery"][k] = v

    # Product description
    if not data["product_description"]["table"]:
        section = _find_section("product description")
        if section:
            data["product_description"]["text"] = section.get_text(" ", strip=True)
            for table in section.find_all("table"):
                for row in table.find_all("tr"):
                    cells = row.find_all(["td", "th"])
                    if len(cells) >= 2:
                        k = cells[0].get_text(strip=True)
                        v = cells[1].get_text(strip=True)
                        if k and v:
                            data["product_description"]["table"][k] = v


# ---------------------------------------------------------------------------
# Markdown file generation
# ---------------------------------------------------------------------------

def _save_key_attributes_md(product_dir: str, title: str, attrs: dict) -> None:
    """Save key attributes as a styled markdown file."""
    path = os.path.join(product_dir, "key_attributes.md")
    lines = [
        f"# Key Attributes",
        f"",
        f"**Product:** {title}",
        f"",
    ]

    if attrs:
        lines.append("| Attribute | Value |")
        lines.append("|:----------|:------|")
        for k, v in attrs.items():
            # Escape pipe characters in values
            k_safe = k.replace("|", "\\|")
            v_safe = v.replace("|", "\\|")
            lines.append(f"| {k_safe} | {v_safe} |")
    else:
        lines.append("*No key attributes data found.*")

    lines.append("")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def _save_packaging_md(product_dir: str, title: str, packaging: dict) -> None:
    """Save packaging and delivery info as a styled markdown file."""
    path = os.path.join(product_dir, "packaging_and_delivery.md")
    lines = [
        f"# Packaging and Delivery",
        f"",
        f"**Product:** {title}",
        f"",
    ]

    if packaging:
        lines.append("| Item | Details |")
        lines.append("|:-----|:--------|")
        for k, v in packaging.items():
            k_safe = k.replace("|", "\\|")
            v_safe = v.replace("|", "\\|")
            lines.append(f"| {k_safe} | {v_safe} |")
    else:
        lines.append("*No packaging and delivery data found.*")

    lines.append("")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def _save_description_md(product_dir: str, title: str, desc: dict) -> None:
    """Save product description as a styled markdown file."""
    path = os.path.join(product_dir, "product_description.md")
    desc_title = desc.get("title", "") or title
    table = desc.get("table", {})
    text = desc.get("text", "")

    lines = [
        f"# Product Description",
        f"",
        f"## {desc_title}",
        f"",
    ]

    if table:
        lines.append("| Attribute | Details |")
        lines.append("|:----------|:--------|")
        for k, v in table.items():
            k_safe = k.replace("|", "\\|")
            v_safe = v.replace("|", "\\|")
            lines.append(f"| {k_safe} | {v_safe} |")
        lines.append("")

    if text:
        # Clean up the text
        clean = text.strip()
        # Remove CSS rules that may leak from iframe style blocks
        clean = re.sub(
            r'#detail_decorate_root\s+\.magic-\d+\{[^}]*\}',
            '', clean
        )
        # Remove any remaining inline CSS blocks
        clean = re.sub(r'\{[^}]*(?:font-size|padding|margin|overflow|border)[^}]*\}', '', clean)
        # Remove HTML img/IMG tags (images are listed separately)
        clean = re.sub(r'<[Ii][Mm][Gg][^>]*/?>', '', clean)
        # Remove any remaining HTML tags
        clean = re.sub(r'<[^>]+>', '', clean)
        # Collapse whitespace
        clean = re.sub(r"\s{2,}", "\n\n", clean.strip())
        # Remove empty lines
        clean = re.sub(r"\n{3,}", "\n\n", clean)

        if clean and len(clean) > 10:
            # Truncate if extremely long
            if len(clean) > 5000:
                clean = clean[:5000] + "\n\n*(truncated)*"
            lines.append("### Description Text")
            lines.append("")
            lines.append(clean)
            lines.append("")

    # Include description images
    images = desc.get("images", [])
    if images:
        lines.append("### Product Images")
        lines.append("")
        for img_url in images:
            lines.append(f"![product image]({img_url})")
            lines.append("")

    if not table and not text and not images:
        lines.append("*No product description data found.*")
        lines.append("")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


# ---------------------------------------------------------------------------
# Main detail scraping loop
# ---------------------------------------------------------------------------

def scrape_product_details() -> None:
    """Scrape detail pages for all products using Playwright."""

    if not HAS_PLAYWRIGHT:
        print("ERROR: playwright is not installed.")
        print("  Install it with:  pip install playwright && python -m playwright install chromium")
        return

    # Load product list from CSV
    if not os.path.exists(OUTPUT_CSV):
        print(f"ERROR: {OUTPUT_CSV} not found. Run product list scraping first.")
        return

    df = pd.read_csv(OUTPUT_CSV)
    products = df.to_dict("records")
    total = len(products)
    print(f"\n{'='*60}")
    print(f"  DETAIL SCRAPING: {total} products to process")
    print(f"{'='*60}\n")

    os.makedirs(DETAIL_OUTPUT_DIR, exist_ok=True)

    # Statistics
    scraped = 0
    skipped = 0
    failed = 0
    failed_ids: List[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-web-security",
            ],
        )

        context_opts: Dict[str, Any] = {
            "user_agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/136.0.0.0 Safari/537.36"
            ),
            "viewport": {"width": 1920, "height": 1080},
            "locale": "en-US",
        }

        if os.path.exists(DETAIL_STORAGE_STATE):
            context_opts["storage_state"] = DETAIL_STORAGE_STATE

        context = browser.new_context(**context_opts)

        # Anti-detection: override navigator.webdriver
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        """)

        page = context.new_page()

        for i, product in enumerate(products):
            detail_url = product.get("detail_url")
            if not detail_url or not isinstance(detail_url, str):
                print(f"  [{i+1}/{total}] No detail URL — skipping")
                skipped += 1
                continue

            product_id = str(product.get("product_id", ""))
            title = str(product.get("title", ""))
            folder_name = _safe_folder_name(product_id, title)
            product_dir = os.path.join(DETAIL_OUTPUT_DIR, folder_name)

            # Skip if already fully scraped
            if _is_detail_complete(product_dir):
                print(f"  [{i+1}/{total}] {product_id}: already scraped — skipping")
                skipped += 1
                continue

            os.makedirs(product_dir, exist_ok=True)
            print(f"\n[{i+1}/{total}] Scraping: {product_id} — {title[:60]}...")

            try:
                # Navigate to detail page
                page.goto(detail_url, wait_until="domcontentloaded",
                          timeout=DETAIL_NAV_TIMEOUT)
                time.sleep(DETAIL_PAGE_DELAY)

                # Check for captcha
                if _is_alibaba_captcha(page):
                    _wait_for_human_detail(page, "CAPTCHA")
                    # After solving, the page may have auto-redirected
                    if _is_alibaba_captcha(page):
                        # Try reloading
                        page.goto(detail_url, wait_until="domcontentloaded",
                                  timeout=DETAIL_NAV_TIMEOUT)
                        time.sleep(DETAIL_PAGE_DELAY)

                # Extract all detail data
                detail_data = _extract_detail_data(page)

                key_attrs = detail_data.get("key_attributes", {})
                pkg_data = detail_data.get("packaging_delivery", {})
                desc_data = detail_data.get("product_description", {})

                # Save markdown files
                _save_key_attributes_md(product_dir, title, key_attrs)
                _save_packaging_md(product_dir, title, pkg_data)
                _save_description_md(product_dir, title, desc_data)

                # Report what we got
                attr_count = len(key_attrs)
                pkg_count = len(pkg_data)
                desc_table_count = len(desc_data.get("table", {}))
                desc_text_len = len(desc_data.get("text", ""))

                print(f"  OK  attrs={attr_count}  pkg={pkg_count}  "
                      f"desc_table={desc_table_count}  desc_text={desc_text_len} chars")

                if attr_count == 0 and pkg_count == 0:
                    print(f"  WARN: No attribute data extracted for {product_id}")

                scraped += 1

            except PlaywrightTimeoutError:
                print(f"  FAIL: Timeout loading {product_id}")
                failed += 1
                failed_ids.append(product_id)
            except Exception as e:
                print(f"  FAIL: Error for {product_id}: {e}")
                traceback.print_exc()
                failed += 1
                failed_ids.append(product_id)

            # Delay between requests
            time.sleep(DETAIL_PAGE_DELAY)

            # Save storage state periodically (every 10 products)
            if (i + 1) % 10 == 0:
                try:
                    context.storage_state(path=DETAIL_STORAGE_STATE)
                except Exception:
                    pass

        # Save final storage state
        try:
            context.storage_state(path=DETAIL_STORAGE_STATE)
        except Exception:
            pass

        browser.close()

    # Summary
    print(f"\n{'='*60}")
    print(f"  DETAIL SCRAPING COMPLETE")
    print(f"  Scraped: {scraped}  |  Skipped: {skipped}  |  Failed: {failed}")
    if failed_ids:
        print(f"  Failed IDs: {', '.join(failed_ids[:20])}")
    print(f"  Output: {DETAIL_OUTPUT_DIR}")
    print(f"{'='*60}\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape Alibaba store product list and/or product details."
    )
    parser.add_argument(
        "--details", action="store_true",
        help="Scrape product detail pages only (requires existing result.csv)."
    )
    parser.add_argument(
        "--all", action="store_true",
        help="Scrape both product list and details."
    )
    args = parser.parse_args()

    run_list = not args.details  # run list scraping unless --details-only
    run_details = args.details or args.all

    if run_list:
        products = scrape_all_pages()
        if not products:
            print("No products found.")
            if not run_details:
                return

        if products:
            export_products(products)
            print(f"\nSaved {len(products)} products to CSV/XLSX.")
            print(f"  CSV:  {OUTPUT_CSV}")
            print(f"  XLSX: {OUTPUT_XLSX}")

            download_images(products)
            print(f"Images saved to: {IMAGE_DIR}")

    if run_details:
        scrape_product_details()


if __name__ == "__main__":
    main()
