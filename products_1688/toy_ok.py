# Save this file as xxxx.py (e.g., printhead_scraper.py)
# The output folder will be named 'xxxx' (e.g., 'printhead_scraper') in the same directory as this script

import os
import re
import sys
import requests
import json
import time
import copy
import shutil
import logging
from datetime import datetime
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

# --- Logging Setup ---
def setup_logging(output_dir):
    """Setup comprehensive logging to both console and file."""
    log_dir = os.path.join(output_dir, 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    log_file = os.path.join(log_dir, f'scraper_{timestamp}.log')
    
    # Create logger
    logger = logging.getLogger('toy_scraper')
    logger.setLevel(logging.DEBUG)
    
    # Clear any existing handlers
    logger.handlers.clear()
    
    # Console handler - INFO level with colors
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter('%(asctime)s | %(levelname)-7s | %(message)s', datefmt='%H:%M:%S')
    console_handler.setFormatter(console_format)
    
    # File handler - DEBUG level for detailed analysis
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter('%(asctime)s | %(levelname)-7s | %(funcName)s:%(lineno)d | %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
    file_handler.setFormatter(file_format)
    
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    return logger, log_file

# Global logger (will be initialized in main)
logger = None

# --- Configuration ---
BASE_URL = "https://www.1688.com"

SCRIPT_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_SOURCE_DIR = os.path.normpath(os.path.join(SCRIPT_BASE_DIR, '..', 'products_to_toy_design_help_folder', 'caculate_categories', 'results'))

# Load BRANDS and URL_TEMPLATE from JSON
with open(os.path.join(DATA_SOURCE_DIR, 'brands.json'), 'r', encoding='utf-8') as f:
    brand_data = json.load(f)

BRANDS = [item['brand'] for item in brand_data]
URL_TEMPLATE = [item['url'] for item in brand_data]

SCRAPE_LINKS = 536  # Links to be scraped per run of this script

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}
MAX_RETRIES = 3  # Maximum number of retries for any task

# Load category group definitions
with open(os.path.join(DATA_SOURCE_DIR, 'categories_summary_groups.json'), 'r', encoding='utf-8') as f:
    categories_summary_data = json.load(f)

CATEGORY_GROUPS = categories_summary_data.get('groups', [])
CATEGORY_TO_GROUP = {}
for group_entry in CATEGORY_GROUPS:
    group_name = group_entry.get('group', 'Uncategorized')
    for category_name in group_entry.get('categories', []):
        if category_name:
            CATEGORY_TO_GROUP[category_name] = group_name

CATEGORY_LOOKUP_FILENAME = 'category_lookup.json'
SKIPPED_PRODUCTS_FILENAME = 'skipped_products.json'
GROUP_ROOT_FOLDER_NAME = 'each_group_products'
PRODUCT_OUTPUT_FIELDS = [
    "galleyItemLink href",
    "galleyImg src",
    "galleyName",
    "sampleTag",
    "sampleTag (2)",
    "sampleTag (3)",
    "price",
    "priceRight",
    "marketTag",
    "sectionName"
]


def sanitize_directory_name(name, remove_spaces=False):
    if not name:
        return "Uncategorized"
    sanitized = sanitize_filename(name)
    if remove_spaces:
        sanitized = sanitized.replace(" ", "")
    return sanitized or "Unnamed"


def load_category_lookup(path):
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception:
            pass
    return {}


def save_category_lookup(path, lookup):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(lookup, f, indent=2, ensure_ascii=False)


def determine_group_and_category(section_name):
    if not section_name:
        return "Uncategorized", "Uncategorized"
    candidate = section_name.strip()
    # Normalize candidate for comparison (remove spaces/punctuation, lowercase)
    cand_norm = re.sub(r"[^0-9a-z\u4e00-\u9fff]", "", candidate.lower())

    # First check exact matches (normalized)
    for category, group in CATEGORY_TO_GROUP.items():
        if not category:
            continue
        cat_norm = re.sub(r"[^0-9a-z\u4e00-\u9fff]", "", category.lower())
        if cand_norm and cat_norm and cand_norm == cat_norm:
            return group, category

    # Next check substring relationships (category contained in candidate or vice versa)
    for category, group in CATEGORY_TO_GROUP.items():
        if not category:
            continue
        cat_norm = re.sub(r"[^0-9a-z\u4e00-\u9fff]", "", category.lower())
        if cat_norm and (cat_norm in cand_norm or cand_norm in cat_norm):
            return group, category

    # Check if key parts of category names appear in the candidate text
    # This helps match product names like "积木玩具" to category "积木拼插类玩具"
    category_keywords = {
        "益智": "Educational Toys",
        "科教": "Educational Toys",
        "积木": "Building Blocks & Construction",
        "拼插": "Building Blocks & Construction",
        "模型": "Building Blocks & Construction",
        "遥控": "Vehicles & Ride-On Toys",
        "电动": "Vehicles & Ride-On Toys",
        "运动": "Outdoor & Sports Toys",
        "休闲": "Outdoor & Sports Toys",
        "球": "Outdoor & Sports Toys",
        "过家家": "Action Figures & Role Play",
        "厨房": "Action Figures & Role Play",
        "医生": "Action Figures & Role Play",
        "新奇特": "Novelty & Gag Toys",
        "解压": "Novelty & Gag Toys",
        "整蛊": "Novelty & Gag Toys",
        "公仔": "Dolls & Plush Toys",
        "娃娃": "Dolls & Plush Toys",
        "毛绒": "Dolls & Plush Toys",
        "充气": "Inflatable & Water Toys",
        "水枪": "Inflatable & Water Toys",
        "泳": "Inflatable & Water Toys",
        "电子": "Electronic & Interactive Toys",
        "发光": "Electronic & Interactive Toys",
        "棋": "Puzzles & Board Games",
        "拼图": "Puzzles & Board Games"
    }
    for keyword, group in category_keywords.items():
        if keyword in cand_norm:
            # Find the actual category that maps to this group
            for cat, grp in CATEGORY_TO_GROUP.items():
                if grp == group:
                    return group, cat
            return group, keyword

    # Finally, try tokenized matching using delimiters commonly seen in section names
    tokens = [token.strip() for token in re.split(r'[、/,，,\s]+', candidate) if token.strip()]
    for token in tokens:
        token_norm = re.sub(r"[^0-9a-z\u4e00-\u9fff]", "", token.lower())
        if not token_norm:
            continue
        for category, group in CATEGORY_TO_GROUP.items():
            if not category:
                continue
            cat_norm = re.sub(r"[^0-9a-z\u4e00-\u9fff]", "", category.lower())
            if token_norm in cat_norm:
                return group, category

    return "Uncategorized", candidate


def is_other_industries_group(name):
    """Return True if the group name corresponds to Other Industries (robust to spacing/casing)."""
    if not name:
        return False
    norm = re.sub(r'[^0-9a-z]', '', str(name).lower())
    return norm in ('otherindustries', 'other')


# Tokens that indicate aggregator/section headers we should ignore (e.g. "全部")
AGGREGATOR_TOKENS = ("全部", "哇噢定制", "新品", "活动", "all")


def is_aggregator_category(name):
    """Return True if the category/section name is an aggregator header like '全部'."""
    if not name:
        return False
    # Normalize by removing whitespace and non-alphanumeric/CJK chars,
    # then compare against normalized tokens. This handles punctuation,
    # full-width spaces, and other unicode noise that can prevent
    # straightforward comparisons (e.g. '全部商品', '全部 ', ' 全部').
    norm = str(name)
    norm = re.sub(r"\s+", "", norm)
    norm = re.sub(r"[^0-9a-z\u4e00-\u9fff]", "", norm.lower())
    for tok in AGGREGATOR_TOKENS:
        tok_norm = str(tok)
        tok_norm = re.sub(r"\s+", "", tok_norm)
        tok_norm = re.sub(r"[^0-9a-z\u4e00-\u9fff]", "", tok_norm.lower())
        if tok_norm and norm.startswith(tok_norm):
            return True
    return False


def sanitize_product_for_output(product):
    return {field: product.get(field, "") for field in PRODUCT_OUTPUT_FIELDS}


def extract_offer_id(href):
    if not href:
        return ""
    match = re.search(r'offer/(\d+)', href)
    return match.group(1) if match else ""


def build_product_folder_name(product):
    base_name = sanitize_directory_name(product.get('galleyName', '') or 'Unnamed')
    offer_id = extract_offer_id(product.get('galleyItemLink href'))
    if offer_id and offer_id not in base_name:
        return f"{base_name}_{offer_id}"
    return base_name


def determine_image_filename(base_name, image_url):
    parsed_path = urlparse(image_url).path if image_url else ''
    ext = os.path.splitext(parsed_path)[1].lower()
    if ext not in {'.jpg', '.jpeg', '.png', '.webp'}:
        ext = '.jpg'
    return f"{base_name}{ext}"


def download_product_image(image_url, destination_path, referer=None):
    if not image_url:
        return False
    headers = dict(HEADERS)
    if referer:
        headers['Referer'] = referer
    try:
        response = requests.get(image_url, headers=headers, timeout=20)
        response.raise_for_status()
        with open(destination_path, 'wb') as f:
            f.write(response.content)
        return True
    except Exception as exc:
        print(f"WARNING: Failed to download image {image_url}. Reason: {exc}")
        return False


def build_markdown_content(product, group_name, category_name, brand_name):
    product_name = product.get('galleyName', '').strip() or 'Unnamed Product'
    price = product.get('price', '').strip()
    price_right = product.get('priceRight', '').strip()
    market_tag = product.get('marketTag', '').strip()
    sample_tags = [tag for tag in [product.get('sampleTag', ''), product.get('sampleTag (2)', ''), product.get('sampleTag (3)', '')] if tag]
    href = product.get('galleyItemLink href', '').strip()

    lines = [f"# {product_name}"]
    details = []
    if brand_name:
        details.append(f"- Brand: {brand_name}")
    if group_name:
        details.append(f"- Group: {group_name}")
    if category_name:
        details.append(f"- Category: {category_name}")
    if price:
        details.append(f"- Price: {price}")
    if price_right:
        details.append(f"- Price Info: {price_right}")
    if market_tag:
        details.append(f"- Market Tag: {market_tag}")
    if sample_tags:
        details.append(f"- Tags: {', '.join(sample_tags)}")
    if details:
        lines.append('')
        lines.extend(details)
    if href:
        lines.append('')
        lines.append(f"[View on 1688]({href})")
    lines.append('')
    return "\n".join(lines)


def escape_js_string(value):
    return value.replace('\\', '\\\\').replace('"', '\\"')


def build_product_record(product, group_name, category_name, brand_name, image_rel_path, markdown_rel_path):
    sample_tags = [tag for tag in [product.get('sampleTag'), product.get('sampleTag (2)'), product.get('sampleTag (3)')] if tag]
    offer_id = extract_offer_id(product.get('galleyItemLink href'))
    fallback_id = re.sub(r'[^0-9a-zA-Z]+', '', product.get('galleyName', '')) or 'product'
    product_id = offer_id or fallback_id
    return {
        "id": product_id,
        "name": product.get('galleyName', '').strip(),
        "href": product.get('galleyItemLink href', ''),
        "image": image_rel_path.replace('\\', '/') if image_rel_path else "",
        "markdown": markdown_rel_path.replace('\\', '/') if markdown_rel_path else "",
        "price": product.get('price', ''),
        "priceRight": product.get('priceRight', ''),
        "marketTag": product.get('marketTag', ''),
        "tags": sample_tags
    }


def write_group_aggregates(group_dir, group_name, category_records, total_products, generated_at):
    file_base = sanitize_directory_name(group_name, remove_spaces=True)
    json_path = os.path.join(group_dir, 'products_data.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(category_records, f, indent=2, ensure_ascii=False)

    var_name = re.sub(r'[^0-9a-zA-Z_]', '', group_name)
    if not var_name:
        var_name = 'Group'
    var_name = f"{var_name}Products"

    js_path = os.path.join(group_dir, f"{file_base}.js")
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(f"// Total products: {total_products}, Date: {generated_at}\n")
        f.write(f"export const {var_name} = {{\n")
        sorted_categories = list(sorted(category_records.items(), key=lambda item: item[0]))
        for cat_index, (category, brands) in enumerate(sorted_categories):
            f.write(f"  \"{escape_js_string(category)}\": {{\n")
            sorted_brands = list(sorted(brands.items(), key=lambda item: item[0]))
            for brand_index, (brand, records) in enumerate(sorted_brands):
                f.write(f"    \"{escape_js_string(brand)}\": [\n")
                for record_index, record in enumerate(records):
                    record_json = json.dumps(record, ensure_ascii=False, indent=4)
                    indented_record = "\n".join("      " + line for line in record_json.splitlines())
                    f.write(indented_record)
                    if record_index < len(records) - 1:
                        f.write(",\n")
                    else:
                        f.write("\n")
                f.write("    ]")
                if brand_index < len(sorted_brands) - 1:
                    f.write(",\n")
                else:
                    f.write("\n")
            f.write("  }")
            if cat_index < len(sorted_categories) - 1:
                f.write(",\n")
            else:
                f.write("\n")
        f.write("};\n")

    md_path = os.path.join(group_dir, f"{file_base}.md")
    lines = [f"# {group_name} Products", "", f"Last updated: {generated_at}", "", f"Total products: {total_products}", ""]
    for category in sorted(category_records.keys()):
        lines.append(f"## {category}")
        lines.append("")
        brand_map = category_records[category]
        for brand in sorted(brand_map.keys()):
            items = brand_map[brand]
            lines.append(f"- BRAND: {brand}")
            lines.append(f"- Products: {len(items)}")
            for record in items:
                product_name = record.get('name', '').strip()
                if product_name:
                    lines.append(f"  - {product_name}")
            lines.append("")
        lines.append("")
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))


def write_group_products(root_dir, structure, generated_at):
    if os.path.exists(root_dir):
        shutil.rmtree(root_dir)
    os.makedirs(root_dir, exist_ok=True)

    root_rel_base = root_dir

    for group_name, categories in structure.items():
        group_dir = os.path.join(root_dir, sanitize_directory_name(group_name, remove_spaces=True))
        os.makedirs(group_dir, exist_ok=True)
        group_records = {}
        total_products = 0

        for category_name, brand_map in categories.items():
            category_dir = os.path.join(group_dir, sanitize_directory_name(category_name))
            os.makedirs(category_dir, exist_ok=True)

            for brand_name, products in brand_map.items():
                brand_dir = os.path.join(category_dir, sanitize_directory_name(brand_name))
                os.makedirs(brand_dir, exist_ok=True)

                for product in products:
                    product_folder_name = build_product_folder_name(product)
                    product_dir = os.path.join(brand_dir, product_folder_name)
                    os.makedirs(product_dir, exist_ok=True)

                    markdown_path = os.path.join(product_dir, f"{product_folder_name}.md")
                    markdown_content = build_markdown_content(product, group_name, category_name, brand_name)
                    with open(markdown_path, 'w', encoding='utf-8') as f:
                        f.write(markdown_content)

                    image_rel_path = ""
                    image_url = product.get('galleyImg src', '').strip()
                    if image_url:
                        image_folder = os.path.join(product_dir, 'image')
                        os.makedirs(image_folder, exist_ok=True)
                        image_filename = determine_image_filename(product_folder_name, image_url)
                        image_path = os.path.join(image_folder, image_filename)
                        referer = product.get('galleyItemLink href', '').strip() or None
                        downloaded = download_product_image(image_url, image_path, referer=referer)
                        if downloaded:
                            image_rel_path = os.path.relpath(image_path, start=root_rel_base)
                        else:
                            try:
                                if os.path.exists(image_path):
                                    image_rel_path = os.path.relpath(image_path, start=root_rel_base)
                            except OSError:
                                image_rel_path = ""

                    markdown_rel_path = os.path.relpath(markdown_path, start=root_rel_base)

                    record = build_product_record(
                        product,
                        group_name,
                        category_name,
                        brand_name,
                        image_rel_path,
                        markdown_rel_path
                    )
                    category_records = group_records.setdefault(category_name, {})
                    category_records.setdefault(brand_name, []).append(record)
                    total_products += 1

        write_group_aggregates(group_dir, group_name, group_records, total_products, generated_at)

# --- Utility Functions ---

def get_script_name():
    """Returns the script name without the .py extension."""
    return os.path.splitext(os.path.basename(__file__))[0]

def sanitize_filename(name):
    """Removes invalid characters for a valid folder or file name."""
    sanitized = re.sub(r'[\\/*?:"<>|]', "", name)
    return " ".join(sanitized.split()).strip()

def load_previous_products(md_path):
    """Loads previously scraped product names from the xxxx.md file."""
    previous_products = set()
    if os.path.exists(md_path):
        with open(md_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith('  - '):
                    product_name = line[4:].strip()
                    if product_name:
                        previous_products.add(product_name)
    return previous_products

def deduplicate_in_display_order(products):
    """Keeps the first occurrence of each href so list matches rendered order."""
    unique_products = []
    seen_hrefs = set()
    for product in products:
        href = product.get("galleyItemLink href")
        if not href or href in seen_hrefs:
            continue
        seen_hrefs.add(href)
        unique_products.append(product)
    return unique_products

# --- Core Scraping Functions ---

def scrape_products_from_factory(url, url_to_brand, retry_count=0, index=1, total=SCRAPE_LINKS):
    """Scrapes products from a factory page and returns list of product data."""
    global logger
    
    try:
        logger.info(f"=" * 80)
        logger.info(f"SCRAPING FACTORY: {url}")
        logger.info(f"Attempt: {retry_count + 1}/{MAX_RETRIES} | Factory {index}/{total}")
        logger.info(f"=" * 80)
        
        with sync_playwright() as p:
            # Launch browser with more realistic settings
            browser = p.chromium.launch(
                headless=True,
                args=['--disable-blink-features=AutomationControlled']
            )
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = context.new_page()
            
            logger.info(f"Navigating to page...")
            page.goto(url, wait_until='networkidle', timeout=60000)
            logger.debug(f"Page loaded, waiting for content to settle...")
            page.wait_for_timeout(3000)
            
            # Get initial product count from the page (e.g., "全部2000")
            try:
                total_text = page.locator('text=/全部\\d+/').first.text_content(timeout=5000)
                expected_total_match = re.search(r'全部(\d+)', total_text or '')
                expected_total = int(expected_total_match.group(1)) if expected_total_match else None
                logger.info(f"Page indicates TOTAL products: {expected_total}")
            except Exception as e:
                expected_total = None
                logger.warning(f"Could not determine expected total from page: {e}")
            
            # Collect products using a more reliable infinite scroll approach
            all_hrefs = set()
            all_element_data = []
            last_count = 0
            no_change_count = 0
            max_no_change = 10  # Stop after 10 scrolls with no new products
            scroll_iteration = 0
            max_scroll_iterations = 500  # Safety limit
            
            logger.info(f"Starting infinite scroll to load all products...")
            
            while scroll_iteration < max_scroll_iterations:
                scroll_iteration += 1
                
                # Get current products on page
                current_elements = page.eval_on_selector_all(
                    'a.galleyItemLink[href*="detail.1688.com/offer/"]',
                    """
                    elements => elements.map(el => {
                        const href = el.getAttribute('href') || "";
                        return { href };
                    })
                    """
                )
                
                # Count unique new products
                current_hrefs = {e['href'] for e in current_elements if e.get('href')}
                new_hrefs = current_hrefs - all_hrefs
                all_hrefs.update(new_hrefs)
                
                current_count = len(all_hrefs)
                
                if scroll_iteration % 20 == 0 or len(new_hrefs) > 0:
                    logger.debug(f"Scroll #{scroll_iteration}: Found {len(current_elements)} visible, {len(new_hrefs)} new, Total unique: {current_count}")
                
                if current_count == last_count:
                    no_change_count += 1
                    if no_change_count >= max_no_change:
                        logger.info(f"No new products for {max_no_change} scrolls, stopping scroll.")
                        break
                else:
                    no_change_count = 0
                    last_count = current_count
                
                # Check if we've reached expected total
                if expected_total and current_count >= expected_total:
                    logger.info(f"Reached expected total ({expected_total}), stopping scroll.")
                    break
                
                # Scroll down
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                page.wait_for_timeout(500)
                
                # Try to click any "load more" button if visible
                try:
                    load_more_btn = page.locator('[class*="load-more"], button:has-text("加载更多")').first
                    if load_more_btn.is_visible(timeout=500):
                        load_more_btn.click()
                        page.wait_for_timeout(1000)
                        logger.debug("Clicked load more button")
                except:
                    pass
            
            logger.info(f"Scroll complete. Total unique products found: {len(all_hrefs)}")
            
            # Scroll back to top and wait
            page.evaluate("window.scrollTo(0, 0)")
            page.wait_for_timeout(2000)
            
            # Now do full scroll again to collect complete product data
            logger.info("Collecting complete product data...")
            
            # Collect all product data with position info
            all_element_data = page.eval_on_selector_all(
                'a.galleyItemLink[href*="detail.1688.com/offer/"]',
                """
                elements => elements.map((el, index) => {
                    const rect = el.getBoundingClientRect();
                    const readText = selector => {
                        const node = el.querySelector(selector);
                        return node ? node.textContent.trim() : "";
                    };
                    const sampleNodes = Array.from(el.querySelectorAll('.sampleTag'));
                    const findSectionName = (element) => {
                        const hasSectionClass = (node) => node && node.classList && (node.classList.contains('sectionTitle') || node.classList.contains('uniqueee-item-title'));
                        let current = element;
                        while (current) {
                            let sibling = current.previousElementSibling;
                            while (sibling) {
                                if (hasSectionClass(sibling)) {
                                    const nameNode = sibling.querySelector('.sectionName');
                                    if (nameNode) {
                                        return nameNode.textContent.trim();
                                    }
                                }
                                sibling = sibling.previousElementSibling;
                            }
                            current = current.parentElement;
                        }
                        return '';
                    };
                    return {
                        href: el.getAttribute('href') || "",
                        imgSrc: (() => {
                            const img = el.querySelector('img');
                            return img ? (img.getAttribute('src') || "") : "";
                        })(),
                        galleyName: readText('.galleyName'),
                        sampleTags: sampleNodes.map(node => node.textContent.trim()),
                        price: readText('.price'),
                        priceRight: readText('.priceRight'),
                        marketTag: readText('.marketTag'),
                        sectionName: findSectionName(el),
                        displayOrder: index,
                        top: rect.top + window.scrollY,
                        left: rect.left + window.scrollX
                    };
                })
                """
            )
            
            # Get factory name from page
            content = page.content()
            soup = BeautifulSoup(content, 'html.parser')
            factory_name_tag = soup.select_one('h1')
            factory_name = factory_name_tag.get_text(strip=True) if factory_name_tag else "Unknown Factory"
            brand = url_to_brand.get(url, factory_name)
            
            logger.info(f"Factory: {brand}")
            logger.info(f"Raw elements collected: {len(all_element_data)}")
            
            browser.close()
        
        # Deduplicate by href while preserving display order
        seen_hrefs = set()
        unique_elements = []
        for item in all_element_data:
            href = item.get('href')
            if href and href not in seen_hrefs:
                seen_hrefs.add(href)
                unique_elements.append(item)
        
        logger.info(f"After deduplication: {len(unique_elements)} unique products")
        
        # Sort by display order (original page order)
        sorted_elements = sorted(unique_elements, key=lambda x: x.get('displayOrder', 0))
        
        # Log section analysis
        sections = {}
        for item in sorted_elements:
            section = item.get('sectionName', '') or '(no section)'
            sections[section] = sections.get(section, 0) + 1
        
        logger.info(f"Section breakdown:")
        for section, count in sorted(sections.items(), key=lambda x: -x[1])[:10]:
            logger.info(f"  - {section}: {count} products")
        
        # Check for aggregator sections
        has_meaningful_sections = any(
            (item.get("sectionName") or "").strip() and not is_aggregator_category(item.get("sectionName"))
            for item in sorted_elements
        )
        logger.debug(f"Has meaningful (non-aggregator) sections: {has_meaningful_sections}")
        
        products = []
        skipped_aggregator = 0
        for item in sorted_elements:
            href = item.get("href")
            if not href:
                continue

            section_name = (item.get("sectionName", "") or "").strip()
            if has_meaningful_sections and is_aggregator_category(section_name):
                skipped_aggregator += 1
                continue

            sample_tags = item.get("sampleTags", [])
            sampleTag = sample_tags[0] if len(sample_tags) > 0 else ""
            sampleTag2 = sample_tags[1] if len(sample_tags) > 1 else ""
            sampleTag3 = sample_tags[2] if len(sample_tags) > 2 else ""

            product_data = {
                "galleyItemLink href": href,
                "galleyImg src": item.get("imgSrc", ""),
                "galleyName": item.get("galleyName", ""),
                "sampleTag": sampleTag,
                "sampleTag (2)": sampleTag2,
                "sampleTag (3)": sampleTag3,
                "price": item.get("price", ""),
                "priceRight": item.get("priceRight", ""),
                "marketTag": item.get("marketTag", ""),
                "sectionName": section_name
            }
            products.append(product_data)

        if skipped_aggregator > 0:
            logger.debug(f"Skipped {skipped_aggregator} products from aggregator sections")

        # Final deduplication
        products = deduplicate_in_display_order(products)
        
        logger.info(f"Final product count: {len(products)}")
        if expected_total:
            diff = expected_total - len(products)
            if abs(diff) < 50:
                logger.info(f"✓ Count matches expected (diff: {diff})")
            else:
                logger.warning(f"⚠ Count differs from expected by {diff}")
        
        return brand, products, retry_count

    except Exception as e:
        logger.error(f"ERROR scraping {url}: {e}", exc_info=True)
        return None, [], retry_count + 1

def main():
    global logger
    
    root_folder_name = get_script_name()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, root_folder_name)
    os.makedirs(output_dir, exist_ok=True)
    
    # Setup logging
    logger, log_file = setup_logging(output_dir)
    logger.info("=" * 80)
    logger.info("TOY SCRAPER STARTED")
    logger.info("=" * 80)
    logger.info(f"Output directory: {output_dir}")
    logger.info(f"Log file: {log_file}")
    
    each_brand_dir = os.path.join(output_dir, 'each_brand_products')
    os.makedirs(each_brand_dir, exist_ok=True)
    md_path = os.path.join(output_dir, f"{root_folder_name}.md")
    category_lookup_path = os.path.join(output_dir, CATEGORY_LOOKUP_FILENAME)
    category_lookup = load_category_lookup(category_lookup_path)

    # Load previously scraped products
    previous_products = load_previous_products(md_path)
    interactive = sys.stdin.isatty()
    if previous_products:
        logger.info(f"Previously scraped products: {len(previous_products)} total")
        if interactive:
            input("\nPress Enter to continue scraping...")
        else:
            logger.info("Non-interactive session detected; continuing without prompt.")
    else:
        logger.info("Previously scraped products: 0 total")
        if interactive:
            input("Press Enter to start scraping...")
        else:
            logger.info("Non-interactive session detected; starting automatically.")

    logger.info(f"Scraper started. Data will be saved in '{root_folder_name}' folder.")

    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Load existing product data from individual brand files
    products_by_brand = {}
    if os.path.exists(each_brand_dir):
        for file in os.listdir(each_brand_dir):
            if file.endswith('.json'):
                brand_file_path = os.path.join(each_brand_dir, file)
                with open(brand_file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for brand_key in data:
                        products = data[brand_key]
                        # Deduplicate while preserving stored order
                        products = deduplicate_in_display_order(products)
                        for product in products:
                            href = product.get("galleyItemLink href")
                            product.setdefault("sectionName", "")
                            lookup_entry = category_lookup.get(href, {}) if href else {}
                            product['categoryFolder'] = lookup_entry.get('category', product.get('categoryFolder', ''))
                            product['groupName'] = lookup_entry.get('group', product.get('groupName', ''))
                        products_by_brand[brand_key] = products

    original_products_by_brand = copy.deepcopy(products_by_brand)

    # Calculate scraped_count from number of brand files
    scraped_count = len(products_by_brand)

    brand_to_url = dict(zip(BRANDS, URL_TEMPLATE))
    url_to_brand = {url: brand for brand, url in brand_to_url.items()}

    # Scrape each factory URL
    slice_urls = URL_TEMPLATE[scraped_count : scraped_count + SCRAPE_LINKS]
    factory_tasks = [(url, 0, i + 1) for i, url in enumerate(slice_urls)]
    total_factories = len(slice_urls)
    current_factory_number = 0
    last_scraped_links = URL_TEMPLATE[scraped_count : scraped_count + SCRAPE_LINKS]

    while factory_tasks:
        url, retry_count, index = factory_tasks.pop(0)
        current_factory_number += 1
        if retry_count >= MAX_RETRIES:
            print(f"ERROR: Max retries ({MAX_RETRIES}) reached for factory {url}. Skipping.")
            continue
        factory_name, products, new_retry_count = scrape_products_from_factory(url, url_to_brand, retry_count, index, total_factories)
        if factory_name:
            brand_key = factory_name
            existing_products = products_by_brand.get(brand_key, [])
            remaining_lookup = {
                item["galleyItemLink href"]: item
                for item in deduplicate_in_display_order(existing_products)
            }
            ordered_products = []
            new_hrefs = set()
            for product in products:
                href = product.get("galleyItemLink href")
                if not href:
                    continue
                ordered_products.append(product)
                new_hrefs.add(href)
            for href, item in remaining_lookup.items():
                if href not in new_hrefs:
                    ordered_products.append(item)
            products_by_brand[brand_key] = ordered_products
            logger.info(f"Updated {brand_key} products in display order ({len(products)} current items)")
        else:
            factory_tasks.append((url, new_retry_count, index))
            time.sleep(5)

    scraped_count += len(last_scraped_links)

    group_structure = {}
    updated_category_lookup = {}
    # Filter out products that belong to the OtherIndustries group so they are
    # not included in group outputs, brand jsons, or the aggregated JS/MD files.
    filtered_products_by_brand = {}
    skipped_count = 0
    skipped_products = []  # collect skipped product details for reporting
    
    logger.info(f"\n--- Starting product filtering for {len(products_by_brand)} brands ---")
    for brand_key, products in products_by_brand.items():
        logger.debug(f"Processing brand: {brand_key} with {len(products)} products")
        
        # Check if this brand has ANY non-aggregator sections
        has_non_aggregator_sections = any(
            (p.get("sectionName") or "").strip() and not is_aggregator_category(p.get("sectionName"))
            for p in products
        )
        
        for product in products:
            href = product.get("galleyItemLink href")
            section_name = (product.get("sectionName") or "").strip()
            stored_category = (product.get("categoryFolder") or "").strip()

            # When section is an aggregator (e.g., "全部") and page has no meaningful sections,
            # immediately infer group/category from product name and tags instead
            if section_name and is_aggregator_category(section_name) and not has_non_aggregator_sections:
                # Build inference text from product name only (avoid using tags that may contain non-toy keywords)
                infer_text = product.get('galleyName', '')
                inferred_group, inferred_category = determine_group_and_category(infer_text)
                if inferred_group and inferred_group != 'Uncategorized':
                    final_group = inferred_group
                    category_candidate = inferred_category or inferred_group
                else:
                    # Fallback to brand name as category under Uncategorized
                    final_group = "Uncategorized"
                    category_candidate = brand_key
            # Prefer group/category determined from the current page's section name
            elif section_name:
                group_candidate, matched_category = determine_group_and_category(section_name)
                category_candidate = section_name or (matched_category or stored_category)
                if not category_candidate or category_candidate.lower() == 'uncategorized':
                    category_candidate = matched_category or stored_category or "Uncategorized"
                final_group = group_candidate or product.get("groupName") or "Uncategorized"
            else:
                # No section info on this product from current scrape; keep stored values
                category_candidate = stored_category or product.get('categoryFolder') or "Uncategorized"
                final_group = product.get('groupName') or determine_group_and_category(category_candidate)[0] or "Uncategorized"
            
            product['categoryFolder'] = category_candidate
            product['groupName'] = final_group
            
            logger.debug(f"  Product: {product.get('galleyName', '')[:30]}... | Section: '{section_name}' | Group: '{final_group}' | Category: '{category_candidate}'")
            
            # Only skip aggregator products if there are OTHER meaningful sections on the page
            # This prevents skipping ALL products when a page only has aggregator sections
            if section_name and is_aggregator_category(section_name) and has_non_aggregator_sections:
                skipped_count += 1
                skipped_products.append({
                    'brand': brand_key,
                    'brand_url': brand_to_url.get(brand_key, "Unknown"),
                    'product_name': product.get('galleyName', '').strip(),
                    'href': href,
                    'category': category_candidate,
                    'group': final_group,
                    'reason': 'aggregator'
                })
                logger.debug(f"    -> SKIPPED (aggregator)")
                continue

            # Skip products that belong to "Other Industries" group, as they are not toy-related
            if is_other_industries_group(final_group):
                # Double-check: is this REALLY Other Industries or just uncategorized?
                if final_group.lower().replace(" ", "") in ('otherindustries', 'other'):
                    skipped_count += 1
                    skipped_products.append({
                        'brand': brand_key,
                        'brand_url': brand_to_url.get(brand_key, "Unknown"),
                        'product_name': product.get('galleyName', '').strip(),
                        'href': href,
                        'category': category_candidate,
                        'group': final_group,
                        'reason': 'other_industries'
                    })
                    logger.debug(f"    -> SKIPPED (other_industries)")
                    continue
            
            # If group wasn't determined, try to infer it from other product fields
            if not final_group or final_group == 'Uncategorized':
                infer_text = " ".join(filter(None, [section_name, product.get('galleyName',''), product.get('sampleTag',''), product.get('sampleTag (2)',''), product.get('sampleTag (3)','')]))
                inferred_group, inferred_category = determine_group_and_category(infer_text)
                if inferred_group and inferred_group != 'Uncategorized':
                    final_group = inferred_group
                    category_candidate = inferred_category or category_candidate
                    product['groupName'] = final_group
                    product['categoryFolder'] = category_candidate

            # keep product
            filtered_products_by_brand.setdefault(brand_key, []).append(product)
            logger.debug(f"    -> KEPT")
            if href:
                updated_category_lookup[href] = {
                    'category': category_candidate,
                    'group': final_group
                }

    # Build group structure from filtered products only
    for brand_key, products in filtered_products_by_brand.items():
        for product in products:
            href = product.get("galleyItemLink href")
            category_candidate = product.get('categoryFolder') or 'Uncategorized'
            final_group = product.get('groupName') or 'Uncategorized'
            # If the category is an aggregator (e.g. '全部'), map it to the
            # brand name so group outputs retain the brand grouping instead
            # of creating an Uncategozied/全部 folder.
            if is_aggregator_category(category_candidate):
                category_candidate = brand_key or 'Uncategorized'
            group_dict = group_structure.setdefault(final_group, {})
            category_dict = group_dict.setdefault(category_candidate, {})
            category_dict.setdefault(brand_key, []).append(product)

    # Post-process: attempt to reassign any products placed under the
    # 'Uncategorized' group to a better group by inferring from their
    # sectionName, sample tags, or product name. This helps when pages
    # only expose aggregator sections (e.g. '全部') which otherwise
    # end up as `Uncategorized/<brand>` folders.
    uncats = group_structure.get('Uncategorized', {})
    if uncats:
        moved = []
        for cat_name, brand_map in list(uncats.items()):
            for brand_name, items in list(brand_map.items()):
                for product in items:
                    # Build inference text
                    infer_parts = [product.get('sectionName') or '', product.get('galleyName') or '']
                    infer_parts += [product.get('sampleTag') or '', product.get('sampleTag (2)') or '', product.get('sampleTag (3)') or '']
                    infer_text = " ".join([p for p in infer_parts if p])
                    inferred_group, inferred_category = determine_group_and_category(infer_text)
                    if inferred_group and inferred_group != 'Uncategorized':
                        # Move product to inferred group/category
                        tgt_group = inferred_group
                        tgt_cat = inferred_category or inferred_group
                        tgt_group_dict = group_structure.setdefault(tgt_group, {})
                        tgt_cat_dict = tgt_group_dict.setdefault(tgt_cat, {})
                        tgt_cat_dict.setdefault(brand_name, []).append(product)
                        removed = True
                        moved.append((brand_name, product.get('galleyName', '')[:40], tgt_group, tgt_cat))
                # after moving individual products, remove them from uncats
                # we will remove the whole brand entry to be safe
                if brand_name in brand_map:
                    del brand_map[brand_name]
            if not brand_map:
                del uncats[cat_name]
        if not uncats:
            group_structure.pop('Uncategorized', None)

    # Replace products_by_brand with the filtered version for downstream processing,
    # but keep the original brand keys so we don't drop entire companies when all
    # their products were skipped (we'll preserve them with empty lists).
    original_brand_keys = list(products_by_brand.keys())
    products_by_brand = {bk: filtered_products_by_brand.get(bk, []) for bk in original_brand_keys}
    
    logger.info(f"\n--- Filtering Summary ---")
    logger.info(f"Total brands processed: {len(original_brand_keys)}")
    logger.info(f"Brands with products after filtering: {len([bk for bk in original_brand_keys if filtered_products_by_brand.get(bk)])}")
    logger.info(f"Total products kept: {sum(len(prods) for prods in filtered_products_by_brand.values())}")
    if skipped_count:
        logger.info(f"Skipped {skipped_count} products (aggregator: {len([p for p in skipped_products if p.get('reason') == 'aggregator'])}, other_industries: {len([p for p in skipped_products if p.get('reason') == 'other_industries'])})")
    
    # Show brands with 0 products for debugging
    zero_product_brands = [bk for bk in original_brand_keys if not filtered_products_by_brand.get(bk)]
    if zero_product_brands:
        logger.warning(f"{len(zero_product_brands)} brands have 0 products after filtering:")
        for bk in zero_product_brands[:5]:  # Show first 5
            logger.warning(f"  - {bk}")
        if len(zero_product_brands) > 5:
            logger.warning(f"  ... and {len(zero_product_brands) - 5} more")

    group_root_dir = os.path.join(output_dir, GROUP_ROOT_FOLDER_NAME)
    write_group_products(group_root_dir, group_structure, current_time)
    save_category_lookup(category_lookup_path, updated_category_lookup)

    legacy_products_dir = os.path.normpath(os.path.join(SCRIPT_BASE_DIR, '..', 'products', root_folder_name))
    if os.path.isdir(legacy_products_dir):
        shutil.rmtree(legacy_products_dir)

    # Save each brand's products to individual JSON files
    for brand_key, products in products_by_brand.items():
        if products:  # only save if there are products
            original_products = original_products_by_brand.get(brand_key, [])
            if products != original_products:
                # Products changed or new brand, save new file
                # First, delete old files for this brand
                if os.path.exists(each_brand_dir):
                    for file in os.listdir(each_brand_dir):
                        if file.endswith('.json'):
                            old_file_path = os.path.join(each_brand_dir, file)
                            try:
                                with open(old_file_path, 'r', encoding='utf-8') as f:
                                    data = json.load(f)
                                    if brand_key in data:
                                        os.remove(old_file_path)
                                        logger.debug(f"Removed old file for {brand_key}: {file}")
                            except:
                                pass  # ignore errors
                # Now save new file
                total_products = len(products)
                timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
                sanitized_brand = sanitize_filename(brand_key)
                brand_file_path = os.path.join(each_brand_dir, f"{total_products}_{sanitized_brand}_{timestamp}.json")
                sanitized_products = [sanitize_product_for_output(product) for product in products]
                with open(brand_file_path, 'w', encoding='utf-8') as f:
                    json.dump({brand_key: sanitized_products}, f, indent=2, ensure_ascii=False)
                logger.info(f"Saved updated file for {brand_key}: {os.path.basename(brand_file_path)}")
            else:
                logger.debug(f"No changes for {brand_key}, keeping original file.")

    # Calculate total products
    total_products_overall = sum(len(products) for products in products_by_brand.values())

    # Generate xxxx.js with all products
    js_filename = f"{root_folder_name}.js"
    js_path = os.path.join(output_dir, js_filename)
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(f"// Total products: {total_products_overall}, Date: {current_time}\n")
        f.write(f"export const {root_folder_name}Products = {{\n")
        for brand_key in sorted(products_by_brand.keys()):
            f.write(f"  \"{brand_key}\": [\n")
            for product in products_by_brand[brand_key]:
                f.write(f"    {{\n")
                f.write(f"      \"galleyItemLink href\": \"{product['galleyItemLink href']}\",\n")
                f.write(f"      \"galleyImg src\": \"{product['galleyImg src']}\",\n")
                f.write(f"      \"galleyName\": \"{product['galleyName'].replace('\"', '\\\"')}\",\n")
                f.write(f"      \"sampleTag\": \"{product['sampleTag']}\",\n")
                f.write(f"      \"sampleTag (2)\": \"{product['sampleTag (2)']}\",\n")
                f.write(f"      \"sampleTag (3)\": \"{product['sampleTag (3)']}\",\n")
                f.write(f"      \"price\": \"{product['price']}\",\n")
                f.write(f"      \"priceRight\": \"{product['priceRight']}\",\n")
                f.write(f"      \"marketTag\": \"{product['marketTag']}\"\n")
                f.write(f"    }},\n")
            f.write(f"  ],\n")
        f.write(f"}};\n")
    logger.info(f"JavaScript file saved to: {js_path}")

    # Persist skipped products across runs and update xxxx.md with all products
    skipped_json_path = os.path.join(output_dir, SKIPPED_PRODUCTS_FILENAME)
    combined_skipped = []
    if os.path.exists(skipped_json_path):
        try:
            with open(skipped_json_path, 'r', encoding='utf-8') as sf:
                prev = json.load(sf)
                if isinstance(prev, list):
                    prev_map = {entry.get('href') or entry.get('product_name'): entry for entry in prev}
                else:
                    prev_map = {}
        except Exception:
            prev_map = {}
    else:
        prev_map = {}

    # Add current skipped entries if they are new (preserve historical ones)
    for entry in skipped_products:
        key = entry.get('href') or entry.get('product_name')
        if key and key not in prev_map:
            prev_map[key] = entry

    combined_skipped = list(prev_map.values())

    # Save combined skipped records back to JSON for future runs
    try:
        with open(skipped_json_path, 'w', encoding='utf-8') as sf:
            json.dump(combined_skipped, sf, indent=2, ensure_ascii=False)
    except Exception:
        pass

    # Update xxxx.md with all products
    total_url_template = len(URL_TEMPLATE)
    total_scraped_links = len(products_by_brand)
    remained_links = total_url_template - total_scraped_links
    all_products = set()
    for brand, products in products_by_brand.items():
        for product in products:
            galley_name = product['galleyName'].strip()
            if galley_name:
                all_products.add(galley_name)
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(f"# Scraped Products\n\n")
        f.write(f"Last updated: {current_time}\n\n")
        f.write(f"Total url_template links: {total_url_template}\n")
        f.write(f"Last scraped links: {len(last_scraped_links)}\n")
        f.write(f"Total scraped links: {total_scraped_links}\n")
        f.write(f"Remained links: {remained_links}\n\n")
        f.write(f"Total products: {len(all_products)}\n\n")
        for brand in BRANDS:
            if brand in products_by_brand:
                url = brand_to_url.get(brand, "Unknown")
                products_list = [p['galleyName'] for p in products_by_brand[brand] if p['galleyName'].strip()]
                f.write(f"- BRAND: {brand}\n")
                f.write(f"- URL_TEMPLATE: {url}\n")
                f.write(f"- Products: {len(products_list)}\n")
                for product in products_list:
                    f.write(f"  - {product}\n")
                f.write(f"\n")
        # Report skipped products (aggregator sections / Other Industries)
        if combined_skipped:
            f.write("# Skipped Products\n\n")
            f.write(f"Total skipped products: {len(combined_skipped)}\n\n")
            # Group skipped entries by (reason, brand, brand_url)
            skipped_map = {}
            for entry in combined_skipped:
                key = (entry.get('reason'), entry.get('brand'), entry.get('brand_url'))
                skipped_map.setdefault(key, []).append(entry)
            for (reason, brand, brand_url), items in skipped_map.items():
                reason_label = 'Other Industries' if reason == 'other_industries' else 'Aggregator'
                f.write(f"- BRAND (skipped): {brand}\n")
                f.write(f"- URL_TEMPLATE: {brand_url}\n")
                f.write(f"- Reason: {reason_label}\n")
                f.write(f"- Products: {len(items)}\n")
                for it in items:
                    name = it.get('product_name') or ''
                    href = it.get('href') or ''
                    f.write(f"  - {name} ({href})\n")
                f.write("\n")
    logger.info(f"Product list saved to: {md_path}")

    # Display summary
    logger.info(f"\nTotal products: {total_products_overall}, Date: {current_time}")
    logger.info(f"\n--- Scraping complete! Data saved in '{root_folder_name}' folder. ---")

if __name__ == "__main__":
    main()