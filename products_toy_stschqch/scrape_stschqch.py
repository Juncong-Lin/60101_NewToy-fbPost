"""Scrape 1688 shop offer list and export to CSV/XLSX with images.

Target shop:
https://shop65514me278820.1688.com/page/offerlist.htm

Strategy:
  1688.com heavily protects against scraping with captcha / login walls.
  This script:
  - Uses headed Chromium with anti-detection (stealth) measures.
  - Loads a saved session (storage state) when available.
  - If captcha or login appears, pauses for manual resolution.
  - Checks for captcha AFTER EVERY navigation (pagination included).
  - Scrolls the page thoroughly to load lazy-loaded product cards.
  - Extracts products via THREE independent strategies:
    a) DOM-based JS evaluation (most reliable when page renders)
    b) HTML parsing with BeautifulSoup as fallback
    c) Intercepted JSON network responses / window variables
  - Paginates by clicking the numbered page buttons OR by URL query.
  - Deduplicates products by product_id across all pages.

Outputs:
  - products_toy_stschqch/result.csv
  - products_toy_stschqch/result.xlsx
  - products_toy_stschqch/stschqch_images/*
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import traceback
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional, Set
from urllib.parse import urlencode, urljoin, urlparse, urlunparse, parse_qs

import pandas as pd
import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SHOP_URL = "https://shop65514me278820.1688.com/page/offerlist.htm"
TOTAL_PAGES = 4

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_DIR = os.path.join(ROOT_DIR, "products_toy_stschqch")
OUTPUT_CSV = os.path.join(OUTPUT_DIR, "result.csv")
OUTPUT_XLSX = os.path.join(OUTPUT_DIR, "result.xlsx")

IMAGE_ROOT = os.path.join(ROOT_DIR, "products_toy_stschqch")
IMAGE_DIR = os.path.join(IMAGE_ROOT, "stschqch_images")

STORAGE_STATE = os.path.join(OUTPUT_DIR, "playwright_storage_state.json")

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/136.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

# Page load / scroll timings (seconds)
PAGE_WAIT_AFTER_NAV = 3
SCROLL_PAUSE = 0.5
INTER_PAGE_DELAY = 4  # delay between page navigations


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class Product:
    product_id: str
    title: str
    price: Optional[str] = None
    min_order: Optional[str] = None
    sold_count: Optional[str] = None
    detail_url: Optional[str] = None
    image_url: Optional[str] = None
    raw_price_text: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_filename(name: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9\-_\.]+", "_", name)
    return name.strip("_")[:200] or "image"


def _abs_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("http"):
        return url
    if url.startswith("/"):
        return urljoin(SHOP_URL, url)
    return url


def _parse_product_id(url: str) -> str:
    m = re.search(r"/offer/(\d+)\.html", url)
    if m:
        return m.group(1)
    m = re.search(r"offer/(\d+)", url)
    if m:
        return m.group(1)
    return ""


def _normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _update_query(url: str, **params: str) -> str:
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    for k, v in params.items():
        query[k] = [str(v)]
    new_query = urlencode(query, doseq=True)
    return urlunparse(parsed._replace(query=new_query))


# ---------------------------------------------------------------------------
# Anti-bot / Captcha handling
# ---------------------------------------------------------------------------

def _is_captcha_page(page) -> bool:
    """Check whether the current page is a captcha / punish page.

    We only return True when the page is *visibly* a captcha/punish wall.
    Residual CDN script references (nocaptcha JS bundles) that linger on
    normal pages must NOT trigger a false positive.
    """
    # --- URL-based checks (very reliable) ---
    try:
        url = page.url.lower()
        if "punish" in url or "captcha" in url:
            return True
    except Exception:
        pass

    # --- Title-based check ---
    try:
        title = page.title().lower()
    except Exception:
        title = ""

    if any(kw in title for kw in ("captcha", "punish", "验证", "interception")):
        return True

    # --- DOM element check (look for VISIBLE captcha container) ---
    try:
        result = page.evaluate("""
            () => {
                // Check for the punish component / container that is visible
                const punish = document.getElementById('baxia-punish');
                if (punish) {
                    const style = window.getComputedStyle(punish);
                    if (style.display !== 'none' && style.visibility !== 'hidden') return true;
                }
                const pc = document.querySelector('punish-component');
                if (pc) return true;
                // Check for sufei-punish wrapper that is the main page content
                const sufei = document.querySelector('[class*="sufei-punish"]');
                if (sufei) return true;
                // If the page body has very little real content, it's probably captcha
                const body = document.body;
                if (body && body.querySelectorAll('a[href*="/offer/"], img.main-picture').length === 0) {
                    const text = (body.innerText || '').toLowerCase();
                    if (text.includes('滑块验证') || text.includes('请滑动') || text.includes('slide to verify')) {
                        return true;
                    }
                }
                return false;
            }
        """)
        return bool(result)
    except Exception:
        return False


def _is_login_page(page) -> bool:
    """Check whether we've been redirected to a login page."""
    url = page.url.lower()
    return "login" in url or "signin" in url


def _wait_for_human(page, reason: str = "captcha") -> None:
    """Pause and wait for the user to manually resolve captcha/login."""
    print(f"\n{'='*60}")
    print(f"  ⚠️  {reason.upper()} DETECTED")
    print(f"  Please complete the {reason} in the browser window,")
    print(f"  then press Enter here to continue...")
    print(f"{'='*60}\n")
    input(">>> Press Enter after resolving... ")


def _ensure_access(page, target_url: str = "") -> None:
    """
    Ensure the page is accessible (not captcha, not login).
    If blocked, prompt the user and retry until clean.

    IMPORTANT: After captcha is solved, we do NOT re-navigate to
    SHOP_URL because that often triggers a brand-new captcha.
    Instead we wait for the browser's auto-redirect to finish.
    """
    if not target_url:
        target_url = SHOP_URL

    max_retries = 8
    for attempt in range(max_retries):
        time.sleep(1)

        # --- Login wall ---
        if _is_login_page(page):
            _wait_for_human(page, reason="LOGIN")
            # After login the browser will auto-redirect; wait for it
            time.sleep(5)
            try:
                page.wait_for_load_state("domcontentloaded", timeout=15000)
            except Exception:
                pass
            # If still not on the shop page, navigate there ONCE
            if _is_login_page(page):
                try:
                    page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
                    time.sleep(PAGE_WAIT_AFTER_NAV)
                except Exception:
                    pass
            continue

        # --- Captcha / punish wall ---
        if _is_captcha_page(page):
            _wait_for_human(page, reason="CAPTCHA / VERIFICATION")
            # The captcha page usually auto-redirects after solving.
            # Give it generous time; do NOT navigate away.
            print("  Waiting for auto-redirect after captcha...")
            for _ in range(20):            # poll for up to ~20 s
                time.sleep(1)
                if not _is_captcha_page(page) and not _is_login_page(page):
                    break
            # If we're STILL on captcha after 20 s, try navigating
            if _is_captcha_page(page) or _is_login_page(page):
                try:
                    page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
                    time.sleep(PAGE_WAIT_AFTER_NAV)
                except Exception:
                    pass
            continue

        # Page is clean
        print(f"  ✓ Page accessible  (url: {page.url[:80]}...)")
        return

    print("⚠️  Could not get past captcha/login after many attempts.")
    print("    Continuing anyway — products may be empty for this page.")


# ---------------------------------------------------------------------------
# Scrolling — trigger lazy-load
# ---------------------------------------------------------------------------

def _scroll_page_fully(page, max_scrolls: int = 25) -> None:
    """Scroll down the page in steps to trigger lazy loading of images/cards."""
    try:
        viewport_height = page.evaluate("window.innerHeight") or 900
    except Exception:
        viewport_height = 900

    current_pos = 0
    scroll_step = int(viewport_height * 0.6)

    for _ in range(max_scrolls):
        current_pos += scroll_step
        try:
            page.evaluate(f"window.scrollTo(0, {current_pos})")
        except Exception:
            break
        time.sleep(SCROLL_PAUSE)

        try:
            new_height = page.evaluate("document.body.scrollHeight")
            if current_pos >= new_height:
                break
        except Exception:
            break

    # Scroll back to bottom to ensure pagination is visible
    try:
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(0.5)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Extraction Strategy 1: DOM JavaScript evaluation
# ---------------------------------------------------------------------------

def _extract_products_from_dom(page) -> List[Product]:
    """Extract products via JavaScript evaluation in the page context.

    The 1688 shop "winport" pages render product cards as plain <div> elements
    (NOT <a> links) inside the wp_pc_common_offerlist widget.  Each card is a
    230px-wide inline-block div containing:
      - An <img class="main-picture"> for the product image
      - A <p title="..."> for the product title (full title in the attribute)
      - Price spans with color rgb(255, 41, 0) — ¥ + integer + decimal
      - A <span title="累计销量"> for sales count

    There are NO <a href="/offer/..."> links anywhere on the page — the Rax
    framework attaches click handlers to the divs instead.  We therefore
    locate cards via img.main-picture and walk up to the card container.
    """
    js = r"""
    () => {
      const absUrl = (u) => {
        if (!u) return null;
        if (u.startsWith('//')) return 'https:' + u;
        if (u.startsWith('http')) return u;
        try { return new URL(u, location.href).href; } catch { return u; }
      };

      const items = [];
      const seen = new Set();

      // ===== PRIMARY APPROACH: img.main-picture based extraction =====
      // Each product card contains an <img class="main-picture">.
      // We walk up to the card container (the 230px inline-block div)
      // and then extract title, price, and sales from sibling divs.
      const imgs = document.querySelectorAll('img.main-picture');
      for (const img of imgs) {
        // Walk up to find the card container (inline-block, ~230px wide)
        let card = img;
        for (let i = 0; i < 8; i++) {
          if (!card.parentElement) break;
          card = card.parentElement;
          const style = card.style || {};
          const cs = window.getComputedStyle(card);
          // The card container is an inline-block div ~230px wide with cursor:pointer
          if ((cs.display === 'inline-block' || style.display === 'inline-block')
              && parseInt(cs.width) >= 200 && parseInt(cs.width) <= 260) {
            break;
          }
        }

        // Image URL
        let imageUrl = img.getAttribute('src') || img.getAttribute('data-src')
                     || img.getAttribute('data-lazyload') || '';
        if (imageUrl.startsWith('data:')) {
          imageUrl = img.getAttribute('data-src') || img.getAttribute('data-lazyload') || '';
        }
        imageUrl = absUrl(imageUrl);

        // Title — the <p title="..."> element inside the card
        const titleEl = card.querySelector('p[title]');
        const title = titleEl
          ? (titleEl.getAttribute('title') || titleEl.textContent || '').replace(/\s+/g, ' ').trim()
          : '';
        if (!title || title.length < 2) continue;

        // Product ID — extract from image URL pattern
        // Pattern: O1CN01{hash}2LN2{hash}_!!{sellerId}-0-cib
        // We use the image hash as product identifier since there are no offer URLs
        let productId = '';
        if (imageUrl) {
          // Try to extract the unique hash from the CDN image URL
          const m = imageUrl.match(/O1CN01(\w+?)_!!/);
          if (m) productId = m[1];
        }
        // Fallback: use title-based hash
        if (!productId) {
          productId = 'title_' + title.substring(0, 50).replace(/\s+/g, '_');
        }
        if (seen.has(productId)) continue;

        // Price — red-colored spans: ¥ + integer part (font-size 24px) + decimal
        let price = '';
        const allSpans = card.querySelectorAll('span');
        let foundYuan = false;
        for (const span of allSpans) {
          const text = span.textContent.trim();
          const color = window.getComputedStyle(span).color;
          // Price spans have color rgb(255, 41, 0) or rgb(255, 29, 0)
          if (color.includes('255') && (color.includes('41') || color.includes('29') || color.includes('64'))) {
            if (text === '¥') { foundYuan = true; price = '¥'; continue; }
            if (foundYuan && /^\d/.test(text)) {
              price += text;
              // Don't break — there may be a decimal part in the next span
              if (text.includes('.')) { foundYuan = false; }
              continue;
            }
            // Also catch cases where price is already combined
            if (/^¥?\d/.test(text)) {
              price = text.startsWith('¥') ? text : '¥' + text;
              foundYuan = false;
            }
          }
        }

        // Sales count — <span title="累计销量">
        const soldEl = card.querySelector('span[title="累计销量"]');
        const soldCount = soldEl ? soldEl.textContent.replace(/\s+/g, ' ').trim() : null;

        // Detail URL — not available in DOM (cards use JS click handlers),
        // leave null for now; will be populated later if offerId is found
        const detailUrl = null;

        items.push({ productId, title, price: price || null, minOrder: null,
                      soldCount, detailUrl, imageUrl });
        seen.add(productId);
      }

      // ===== FALLBACK APPROACH: a[href*="/offer/"] links (standard 1688 pages) =====
      if (items.length === 0) {
        const links = Array.from(document.querySelectorAll('a[href*="/offer/"]'));
        for (const a of links) {
          const href = a.getAttribute('href') || '';
          const detailUrl = absUrl(href);
          const idMatch = detailUrl && detailUrl.match(/\/offer\/(\d+)/);
          const productId = idMatch ? idMatch[1] : '';
          if (!productId || seen.has(productId)) continue;

          let card = a;
          for (let i = 0; i < 10; i++) {
            if (!card || !card.parentElement) break;
            const parent = card.parentElement;
            if (parent.classList && (
              [...parent.classList].some(c =>
                /card|item|offer|product|goods|grid-item|waterfall/i.test(c)
              ) || parent.tagName === 'LI'
            )) { card = parent; break; }
            const rect = parent.getBoundingClientRect();
            if (rect.width > 150 && rect.height > 150 && parent.querySelectorAll('img').length > 0) {
              card = parent; break;
            }
            card = parent;
          }

          let title = a.getAttribute('title') || '';
          if (!title) {
            const titleEl = card ? card.querySelector('[class*="title"], [class*="subject"], [class*="name"], h3, h4, h5, p[title]') : null;
            title = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent.trim()) : a.textContent.trim();
          }
          title = title.replace(/\s+/g, ' ').trim();
          if (!title || title.length < 2) continue;

          let imageUrl = null;
          if (card) {
            const imgs = card.querySelectorAll('img');
            for (const im of imgs) {
              let src = im.getAttribute('src') || im.getAttribute('data-src')
                      || im.getAttribute('data-lazyload');
              if (src && src.startsWith('data:')) src = im.getAttribute('data-src') || null;
              if (src && !src.startsWith('data:') && src.length > 10) { imageUrl = src; break; }
            }
          }
          imageUrl = absUrl(imageUrl);

          const priceEl = card ? card.querySelector('[class*="price"], [class*="Price"]') : null;
          const price = priceEl ? priceEl.textContent.replace(/\s+/g, ' ').trim() : null;
          const soldEl = card ? card.querySelector('span[title="累计销量"], [class*="sold"], [class*="成交"]') : null;
          const soldCount = soldEl ? soldEl.textContent.replace(/\s+/g, ' ').trim() : null;

          items.push({ productId, title, price, minOrder: null, soldCount, detailUrl, imageUrl });
          seen.add(productId);
        }
      }

      return items;
    }
    """

    try:
        raw_items = page.evaluate(js)
    except Exception as exc:
        print(f"  [DOM] JS evaluation error: {exc}")
        return []

    products = []
    for item in raw_items:
        title = _normalize_space(item.get("title") or "")
        products.append(
            Product(
                product_id=item.get("productId") or "",
                title=title,
                price=_normalize_space(item.get("price") or "") or None,
                min_order=_normalize_space(item.get("minOrder") or "") or None,
                sold_count=_normalize_space(item.get("soldCount") or "") or None,
                detail_url=item.get("detailUrl") or None,
                image_url=_abs_url(item.get("imageUrl") or None),
                raw_price_text=item.get("price") or None,
            )
        )
    return products


# ---------------------------------------------------------------------------
# Extraction Strategy 2: BeautifulSoup HTML parsing
# ---------------------------------------------------------------------------

def _extract_products_from_html(html: str, base_url: str) -> List[Product]:
    """Extract products from raw HTML using BeautifulSoup.

    The 1688 winport pages render product cards as inline-block divs with
    <img class="main-picture"> and <p title="..."> — no <a> links.
    We use img.main-picture as the anchor element, walk up to the card
    container, then extract title/price/sales from sibling elements.
    """
    soup = BeautifulSoup(html, "html.parser")
    products: List[Product] = []
    seen_ids: Set[str] = set()

    # ===== PRIMARY: img.main-picture based extraction =====
    for img in soup.select("img.main-picture"):
        # Walk up to the card container div (~230px wide, inline-block)
        card = img
        for _ in range(8):
            if card.parent is None:
                break
            card = card.parent
            style = card.get("style", "")
            if "inline-block" in style and "230px" in style and "cursor" in style:
                break

        # Image URL
        image_url = img.get("src") or img.get("data-src") or img.get("data-lazyload") or ""
        if image_url.startswith("data:"):
            image_url = img.get("data-src") or img.get("data-lazyload") or ""
        image_url = _abs_url(image_url)

        # Title — <p title="...">
        title_el = card.find("p", attrs={"title": True}) if card else None
        title = ""
        if title_el:
            title = title_el.get("title", "") or title_el.get_text(strip=True)
        title = _normalize_space(title)
        if not title or len(title) < 2:
            continue

        # Product ID from image URL hash
        product_id = ""
        if image_url:
            m = re.search(r"O1CN01(\w+?)_!!", image_url)
            if m:
                product_id = m.group(1)
        if not product_id:
            product_id = "title_" + re.sub(r"\s+", "_", title[:50])
        if product_id in seen_ids:
            continue

        # Price — find spans with red color containing ¥ and digits
        price_parts = []
        if card:
            for span in card.find_all("span"):
                span_style = span.get("style", "")
                text = span.get_text(strip=True)
                if "255" in span_style and ("41" in span_style or "29" in span_style or "64" in span_style):
                    if text in ("¥",) or re.match(r"^¥?\d", text):
                        price_parts.append(text)
        price_text = "".join(price_parts) if price_parts else None
        if price_text and not price_text.startswith("¥"):
            price_text = "¥" + price_text

        # Sales count — <span title="累计销量">
        sold_el = card.find("span", attrs={"title": "累计销量"}) if card else None
        sold_count = _normalize_space(sold_el.get_text(strip=True)) if sold_el else None

        products.append(
            Product(
                product_id=product_id,
                title=title,
                price=price_text,
                min_order=None,
                sold_count=sold_count,
                detail_url=None,
                image_url=image_url,
                raw_price_text=price_text,
            )
        )
        seen_ids.add(product_id)

    # ===== FALLBACK: a[href*="/offer/"] links (standard 1688 pages) =====
    if not products:
        for link in soup.select('a[href*="/offer/"]'):
            href = link.get("href") or ""
            detail_url = _abs_url(urljoin(base_url, href))
            product_id = _parse_product_id(detail_url or "")
            if not product_id or product_id in seen_ids:
                continue

            card = link
            for _ in range(10):
                if card is None or card.parent is None:
                    break
                parent = card.parent
                parent_class = " ".join(parent.get("class", []))
                if re.search(r"card|item|offer|product|goods", parent_class, re.I):
                    card = parent
                    break
                if parent.name == "li":
                    card = parent
                    break
                card = parent

            title = link.get("title") or ""
            if not title:
                title_el = card.select_one('[class*="title"], [class*="subject"], [class*="name"], h3, h4, p[title]') if card else None
                if title_el:
                    title = title_el.get("title", "") or title_el.get_text(strip=True)
                else:
                    title = link.get_text(strip=True)
            title = _normalize_space(title)

            img_el = card.find("img") if card else None
            image_url = None
            if img_el:
                image_url = img_el.get("src") or img_el.get("data-src") or img_el.get("data-lazyload")
                if image_url and image_url.startswith("data:"):
                    image_url = img_el.get("data-src") or img_el.get("data-lazyload")
            image_url = _abs_url(image_url)

            price_el = card.select_one('[class*="price"], [class*="Price"]') if card else None
            price_text = _normalize_space(price_el.get_text(" ", strip=True)) if price_el else None

            sold_el = card.select_one('span[title="累计销量"], [class*="sold"], [class*="成交"]') if card else None
            sold_count = _normalize_space(sold_el.get_text(strip=True)) if sold_el else None

            products.append(
                Product(
                    product_id=product_id,
                    title=title,
                    price=price_text,
                    min_order=None,
                    sold_count=sold_count,
                    detail_url=detail_url,
                    image_url=image_url,
                    raw_price_text=price_text,
                )
            )
            seen_ids.add(product_id)

    return products


# ---------------------------------------------------------------------------
# Extraction Strategy 3: JSON blobs (network / window variables)
# ---------------------------------------------------------------------------

def _find_product_dicts(obj: Any) -> List[Dict[str, Any]]:
    """Recursively find dicts that look like product entries."""
    found: List[Dict[str, Any]] = []
    if isinstance(obj, dict):
        key_set = {k.lower() for k in obj.keys()}
        if ("offerid" in key_set or "id" in key_set) and (
            "title" in key_set or "subject" in key_set or "offertitle" in key_set
        ):
            found.append(obj)
        for v in obj.values():
            found.extend(_find_product_dicts(v))
    elif isinstance(obj, list):
        for item in obj:
            found.extend(_find_product_dicts(item))
    return found


def _normalize_product_dict(raw: Dict[str, Any]) -> Optional[Product]:
    def _get(*keys: str) -> Optional[Any]:
        for key in keys:
            if key in raw:
                return raw.get(key)
        for key in keys:
            for k in raw.keys():
                if k.lower() == key.lower():
                    return raw.get(k)
        return None

    product_id = str(_get("offerId", "id", "offerID") or "")
    title = _get("title", "subject", "offerTitle") or ""
    title = _normalize_space(str(title))
    if not product_id or not title:
        return None

    detail_url = _get("offerUrl", "detailUrl", "url", "offerHref")
    if detail_url:
        detail_url = _abs_url(str(detail_url))
    else:
        detail_url = f"https://detail.1688.com/offer/{product_id}.html"

    image_url = _get("imageUrl", "imgUrl", "image", "picUrl", "mainImage", "imgSrc")
    if image_url:
        image_url = _abs_url(str(image_url))

    price = _get("price", "priceStr", "priceText", "displayPrice", "tpPrice")
    min_order = _get("minOrder", "moq", "minimumOrder", "saleMoq", "beginAmount")
    sold_count = _get("soldCount", "saleCount", "tradeCount", "dealCount", "gmvCount")

    return Product(
        product_id=product_id,
        title=title,
        price=str(price) if price is not None else None,
        min_order=str(min_order) if min_order is not None else None,
        sold_count=str(sold_count) if sold_count is not None else None,
        detail_url=detail_url,
        image_url=image_url,
        raw_price_text=str(price) if price is not None else None,
    )


def _extract_products_from_json_blob(obj: Any) -> List[Product]:
    products: List[Product] = []
    seen: Set[str] = set()
    for raw in _find_product_dicts(obj):
        product = _normalize_product_dict(raw)
        if not product or not product.product_id or product.product_id in seen:
            continue
        seen.add(product.product_id)
        products.append(product)
    return products


def _extract_json_from_page(page) -> List[Product]:
    """Try to extract product data from window variables embedded in the page."""
    products: List[Product] = []
    expressions = [
        "window.__INIT_DATA__",
        "window.__initData",
        "window.__APOLLO_STATE__",
        "window.__INITIAL_STATE__",
        "window.__STORE_STATE__",
        "window.pageData",
        "window.globalData",
        "window.__DATA__",
    ]
    for expr in expressions:
        try:
            data = page.evaluate(f"() => {{ try {{ return {expr} || null; }} catch {{ return null; }} }}")
            if data:
                found = _extract_products_from_json_blob(data)
                products.extend(found)
        except Exception:
            continue

    # Also try to extract JSON from <script> tags
    try:
        script_data = page.evaluate(r"""
        () => {
            const results = [];
            const scripts = document.querySelectorAll('script:not([src])');
            for (const s of scripts) {
                const text = s.textContent || '';
                const patterns = [
                    /window\.__INIT_DATA__\s*=\s*/,
                    /"offerList"\s*:\s*\[/,
                    /"offerResultData"\s*:/,
                    /"productList"\s*:\s*\[/,
                ];
                for (const pat of patterns) {
                    if (pat.test(text)) {
                        const jsonMatch = text.match(/=\s*({[\s\S]+})\s*;?\s*$/);
                        if (jsonMatch) {
                            try {
                                results.push(JSON.parse(jsonMatch[1]));
                            } catch {}
                        }
                    }
                }
            }
            return results;
        }
        """)
        if script_data:
            for blob in script_data:
                products.extend(_extract_products_from_json_blob(blob))
    except Exception:
        pass

    return products


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

def _try_navigate_page(page, page_num: int) -> bool:
    """Try to navigate to a specific page using pagination controls or URL.

    On 1688 winport pages, pagination buttons are <div> and <button> elements
    (NOT <a> links).  The page number buttons are plain divs inside a flex
    container, and prev/next are <button> elements with text "< 上一页" and
    "下一页 >".
    """

    # Strategy 1: Click the page number div in the winport pagination
    # The pagination divs have inline styles with padding, height, cursor:pointer
    try:
        clicked = page.evaluate(f"""
        () => {{
            const pageNum = '{page_num}';
            // Find all elements that could be page number buttons
            const allEls = document.querySelectorAll('div, button, a, span');
            for (const el of allEls) {{
                const text = el.textContent.trim();
                if (text !== pageNum) continue;
                // Must be a small clickable element (not a large container)
                const rect = el.getBoundingClientRect();
                if (rect.width < 15 || rect.width > 80 || rect.height < 25 || rect.height > 50) continue;
                const cs = window.getComputedStyle(el);
                if (cs.cursor !== 'pointer') continue;
                // Check it's in a pagination context (near 上一页/下一页 buttons)
                const parent = el.parentElement;
                if (!parent) continue;
                const parentText = parent.textContent || '';
                if (parentText.includes('上一页') || parentText.includes('下一页')
                    || parentText.includes('/')) {{
                    el.click();
                    return true;
                }}
            }}
            return false;
        }}
        """)
        if clicked:
            time.sleep(2)
            try:
                page.wait_for_load_state("networkidle", timeout=15000)
            except PlaywrightTimeoutError:
                pass
            return True
    except Exception:
        pass

    # Strategy 2: Traditional <a> link pagination selectors
    pager_selectors = [
        f'.pagination a:has-text("{page_num}")',
        f'.page-turn a:has-text("{page_num}")',
        f'.fui-paging a:has-text("{page_num}")',
        f'[class*="pager"] a:has-text("{page_num}")',
        f'[class*="pagination"] a:has-text("{page_num}")',
        f'[class*="page"] a:has-text("{page_num}")',
        f'a.page-item:has-text("{page_num}")',
    ]

    for selector in pager_selectors:
        try:
            locator = page.locator(selector)
            if locator.count() > 0:
                for i in range(locator.count()):
                    text = locator.nth(i).text_content().strip()
                    if text == str(page_num):
                        locator.nth(i).scroll_into_view_if_needed()
                        time.sleep(0.3)
                        locator.nth(i).click()
                        time.sleep(2)
                        try:
                            page.wait_for_load_state("networkidle", timeout=15000)
                        except PlaywrightTimeoutError:
                            pass
                        return True
        except Exception:
            continue

    # Strategy 2: Generic numbered links at the bottom of the page (JS click)
    try:
        clicked = page.evaluate(f"""
        () => {{
            const pageNum = '{page_num}';
            const allEls = document.querySelectorAll('a, button, span, li');
            for (const el of allEls) {{
                const text = el.textContent.trim();
                if (text === pageNum) {{
                    let parent = el.parentElement;
                    for (let i = 0; i < 5; i++) {{
                        if (!parent) break;
                        const cls = (parent.className || '').toLowerCase();
                        if (cls.includes('page') || cls.includes('pager') || cls.includes('pagination')
                            || cls.includes('turn')) {{
                            el.click();
                            return true;
                        }}
                        parent = parent.parentElement;
                    }}
                }}
            }}
            return false;
        }}
        """)
        if clicked:
            time.sleep(2)
            try:
                page.wait_for_load_state("networkidle", timeout=15000)
            except PlaywrightTimeoutError:
                pass
            return True
    except Exception:
        pass

    # Strategy 3: "Next page" button (button or a)
    if page_num > 1:
        next_selectors = [
            'button:has-text("下一页")',
            'a:has-text("下一页")',
            'button:has-text("Next")',
            'a:has-text("Next")',
            '[class*="next"]',
            'a.fui-next',
        ]
        for selector in next_selectors:
            try:
                locator = page.locator(selector)
                if locator.count() > 0:
                    locator.first.scroll_into_view_if_needed()
                    time.sleep(0.3)
                    locator.first.click()
                    time.sleep(2)
                    try:
                        page.wait_for_load_state("networkidle", timeout=15000)
                    except PlaywrightTimeoutError:
                        pass
                    return True
            except Exception:
                continue

    # Strategy 4: URL query parameter mutation
    current = page.url
    candidates = [
        _update_query(SHOP_URL, beginPage=str(page_num)),
        _update_query(SHOP_URL, pageNum=str(page_num)),
        _update_query(SHOP_URL, page=str(page_num)),
        _update_query(current, beginPage=str(page_num)),
        _update_query(current, pageNum=str(page_num)),
        _update_query(current, page=str(page_num)),
    ]
    seen_urls = set()
    for url in candidates:
        if url in seen_urls or url == current:
            continue
        seen_urls.add(url)
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=20000)
            time.sleep(PAGE_WAIT_AFTER_NAV)
            return True
        except Exception:
            continue

    return False


# ---------------------------------------------------------------------------
# Stealth scripts
# ---------------------------------------------------------------------------

STEALTH_JS = """
// Overwrite webdriver detection
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

// Override plugins
Object.defineProperty(navigator, 'plugins', {
  get: () => [1, 2, 3, 4, 5],
});

// Override languages
Object.defineProperty(navigator, 'languages', {
  get: () => ['zh-CN', 'zh', 'en'],
});

// Chrome runtime
window.chrome = { runtime: {} };

// Permission query
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) =>
  parameters.name === 'notifications'
    ? Promise.resolve({ state: Notification.permission })
    : originalQuery(parameters);
"""


# ---------------------------------------------------------------------------
# Main scraping logic
# ---------------------------------------------------------------------------

def scrape_with_playwright() -> List[Product]:
    all_products: List[Product] = []
    seen_ids: Set[str] = set()
    captured_json: List[Any] = []

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with sync_playwright() as p:
        # Launch headed browser
        browser = p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )

        context = browser.new_context(
            storage_state=STORAGE_STATE if os.path.exists(STORAGE_STATE) else None,
            viewport={"width": 1400, "height": 900},
            user_agent=REQUEST_HEADERS["User-Agent"],
            locale="zh-CN",
        )

        # Add stealth scripts BEFORE any page is created
        context.add_init_script(STEALTH_JS)

        page = context.new_page()
        page.set_extra_http_headers(REQUEST_HEADERS)

        # Intercept network responses that might contain product JSON
        def handle_response(resp):
            url = resp.url.lower()
            ct = (resp.headers.get("content-type") or "").lower()
            if any(kw in url for kw in ["offer", "product", "search", "list"]):
                try:
                    if "json" in ct or "javascript" in ct:
                        data = resp.json()
                        captured_json.append(data)
                except Exception:
                    try:
                        text = resp.text()
                        if text and text.strip().startswith("{"):
                            captured_json.append(json.loads(text))
                    except Exception:
                        pass

        page.on("response", handle_response)

        # --- Navigate to the shop page ---
        print(f"Navigating to: {SHOP_URL}")
        try:
            page.goto(SHOP_URL, wait_until="domcontentloaded", timeout=30000)
        except PlaywrightTimeoutError:
            print("  Initial navigation timed out, continuing...")

        time.sleep(PAGE_WAIT_AFTER_NAV)

        # --- Handle captcha / login on initial load ---
        _ensure_access(page, target_url=SHOP_URL)

        # Save storage state after successful login/captcha resolution
        try:
            context.storage_state(path=STORAGE_STATE)
            print(f"  Session saved to: {STORAGE_STATE}")
        except Exception:
            pass

        # After resolving captcha/login, make sure we're on the offer list
        try:
            current_url = page.url.lower()
            if "offerlist" not in current_url and "1688.com" not in current_url:
                print("  Navigating to offer list page...")
                page.goto(SHOP_URL, wait_until="domcontentloaded", timeout=30000)
                time.sleep(PAGE_WAIT_AFTER_NAV)
                _ensure_access(page, target_url=SHOP_URL)
        except Exception:
            pass

        # --- Now scrape each page ---
        for page_num in range(1, TOTAL_PAGES + 1):
            print(f"\n{'─'*50}")
            print(f"  SCRAPING PAGE {page_num} of {TOTAL_PAGES}")
            print(f"{'─'*50}")

            if page_num > 1:
                print(f"  Navigating to page {page_num}...")
                time.sleep(INTER_PAGE_DELAY)
                success = _try_navigate_page(page, page_num)
                if not success:
                    print(f"  ⚠️  Failed to navigate to page {page_num}")

                # Check for captcha AFTER pagination
                time.sleep(PAGE_WAIT_AFTER_NAV)
                _ensure_access(page, target_url=page.url)

            # Wait for page to settle
            try:
                page.wait_for_load_state("networkidle", timeout=15000)
            except PlaywrightTimeoutError:
                pass

            # Wait for product cards to appear (img.main-picture is the reliable indicator)
            try:
                page.wait_for_selector('img.main-picture', timeout=10000)
                print(f"  ✓ Product cards detected on page")
            except PlaywrightTimeoutError:
                # Fallback: try the traditional offer link selector
                try:
                    page.wait_for_selector('a[href*="/offer/"]', timeout=5000)
                    print(f"  ✓ Offer links detected on page")
                except PlaywrightTimeoutError:
                    print(f"  ⚠️  No product cards found after waiting, trying anyway...")

            # Scroll to trigger lazy-loading
            print(f"  Scrolling page to load all products...")
            _scroll_page_fully(page)
            time.sleep(1)

            # ---- Extract products using all strategies ----

            # Strategy 1: DOM extraction
            dom_products = _extract_products_from_dom(page)
            print(f"  [DOM]  Extracted {len(dom_products)} products")

            # Strategy 2: HTML parsing
            html = page.content()
            html_products = _extract_products_from_html(html, page.url)
            print(f"  [HTML] Extracted {len(html_products)} products")

            # Strategy 3: JSON from network/window
            json_products: List[Product] = []
            if captured_json:
                for blob in captured_json:
                    json_products.extend(_extract_products_from_json_blob(blob))
                captured_json.clear()
            json_from_page = _extract_json_from_page(page)
            json_products.extend(json_from_page)
            print(f"  [JSON] Extracted {len(json_products)} products")

            # Merge all unique products from all strategies
            all_candidates = {}
            for prod in dom_products + html_products + json_products:
                if prod.product_id and prod.product_id not in all_candidates:
                    all_candidates[prod.product_id] = prod

            # Deduplicate against global seen set
            new_count = 0
            for pid, product in all_candidates.items():
                if pid in seen_ids:
                    continue
                seen_ids.add(pid)
                all_products.append(product)
                new_count += 1

            print(f"  → Page {page_num}: {new_count} NEW products (total so far: {len(all_products)})")

            # If no products found on this page, save debug HTML
            if new_count == 0:
                debug_path = os.path.join(OUTPUT_DIR, f"debug_page_{page_num}.html")
                with open(debug_path, "w", encoding="utf-8") as f:
                    f.write(html)
                print(f"  ⚠️  Debug HTML saved: {debug_path}")
                print(f"      URL: {page.url}")
                try:
                    print(f"      Title: {page.title()}")
                except Exception:
                    pass

        # Final storage state save
        try:
            context.storage_state(path=STORAGE_STATE)
        except Exception:
            pass

        context.close()
        browser.close()

    return all_products


# ---------------------------------------------------------------------------
# Image downloading
# ---------------------------------------------------------------------------

def download_images(products: List[Product]) -> None:
    os.makedirs(IMAGE_DIR, exist_ok=True)
    session = requests.Session()
    session.headers.update(REQUEST_HEADERS)
    session.headers["Referer"] = "https://www.1688.com/"

    downloaded = 0
    skipped = 0
    failed = 0

    for i, product in enumerate(products, 1):
        url = product.image_url
        if not url:
            continue

        base_name = product.product_id or _safe_filename(product.title)
        url_path = url.split("?")[0]
        ext = os.path.splitext(url_path)[-1].lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            ext = ".jpg"

        file_path = os.path.join(IMAGE_DIR, f"{base_name}{ext}")
        if os.path.exists(file_path):
            skipped += 1
            continue

        try:
            resp = session.get(url, timeout=30)
            resp.raise_for_status()
            if len(resp.content) < 100:
                failed += 1
                continue
            with open(file_path, "wb") as f:
                f.write(resp.content)
            downloaded += 1
            if downloaded % 10 == 0:
                print(f"  Downloaded {downloaded} images...")
        except requests.RequestException:
            failed += 1

    print(f"\nImages: {downloaded} downloaded, {skipped} skipped, {failed} failed")


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

def export_products(products: List[Product]) -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    rows = [asdict(p) for p in products]
    df = pd.DataFrame(rows)
    df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    df.to_excel(OUTPUT_XLSX, index=False)
    print(f"\nExported {len(products)} products:")
    print(f"  CSV:  {OUTPUT_CSV}")
    print(f"  XLSX: {OUTPUT_XLSX}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 60)
    print("  1688 Shop Scraper")
    print(f"  Target: {SHOP_URL}")
    print(f"  Pages:  {TOTAL_PAGES}")
    print("=" * 60)

    products = scrape_with_playwright()

    if not products:
        print("\n❌ No products found!")
        print("   This usually means the captcha/login wasn't completed.")
        print("   Please try running the script again and complete the")
        print("   verification in the browser window when prompted.")
        return

    export_products(products)
    download_images(products)

    print(f"\n{'='*60}")
    print(f"  ✅ DONE! {len(products)} products scraped successfully.")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
