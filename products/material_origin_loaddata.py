# Save this file as xxxx.py (e.g., printhead_scraper.py)
# The output folder will be named 'xxxx' (e.g., 'printhead_scraper') in the same directory as this script

import os
import re
import sys
import requests
import io
import time
import json
import shutil
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from PIL import Image

# --- Configuration ---
BASE_URL = "https://signchinasign.com"
URL_TEMPLATE = "https://signchinasign.com/index.php/Product/index/p/{page_num}/classid/4/price/index.php"
TOTAL_PAGES = 3
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}
BRANDS = [
    'Roll_To_Roll_Style', 'Hoson', 'Without_Cable_Work', 'UV_Flatbed', 'Roland', 'Epson', 'Mimaki', 'Mutoh', 'Witcolor', 'Galaxy','Human', 'Gongzheng', 'Flora', 'Xuli', 'Xenos', 'Yongli', 'Zhongye', 'Skyjet', 'Yaselan', 'Teckwin', 'Ricoh', 'TitanJet','Seiko', 'Skycolor', 'Myjet', 'Phaeton', 'Meitu', 'JHF', 'Kingfisher', 'Liyu', 'Locor', 'Infiniti_Challenger', 'Handtop','FunsunJet', 'Ecotech', 'Encad', 'DGI', 'Docan', 'Crystaljet', 'Atexco', 'Audley', 'Allwin', 'Photo_Papers', 'Mesh','Adhevie_Vinyl', 'Oneway_Vision', 'Flex_banner', 'ink'
]
MAX_RETRIES = 3  # Maximum number of retries for any task

# --- Utility Functions ---

def get_script_name():
    """Returns the script name without the .py extension."""
    return os.path.splitext(os.path.basename(__file__))[0]

def sanitize_filename(name):
    """Removes invalid characters for a valid folder or file name."""
    sanitized = re.sub(r'[\\/*?:"<>|]', "", name)
    return " ".join(sanitized.split()).strip()

def process_and_save_image(image_bytes, output_path, target_size=1000):
    """Processes an image to fit proportionally into a 1000x1000 canvas and saves it as JPEG."""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        w, h = img.size
        ratio = min(target_size/w, target_size/h)
        new_w, new_h = int(w*ratio), int(h*ratio)
        img_resized = img.resize((new_w, new_h), Image.LANCZOS)
        canvas = Image.new('RGB', (target_size, target_size), (255, 255, 255))
        canvas.paste(img_resized, ((target_size-new_w)//2, (target_size-new_h)//2))
        canvas.save(output_path, format='JPEG', quality=95)
        return True
    except Exception as e:
        print(f"    - ERROR: Failed to process image. Reason: {e}")
        return False

def format_price(price_str):
    """Formats the price string into 'Price: USD:XXX-YYY' format."""
    if "not found" in price_str.lower():
        return "Price: Not available"
    cleaned = re.sub(r'[$\s]|USD', '', price_str, flags=re.IGNORECASE)
    if '-' in cleaned:
        return f"Price: USD:{cleaned}"
    elif cleaned:
        return f"Price: USD:{cleaned}-{cleaned}"
    else:
        return "Price: Not available"

def get_brand(product_name, brands_list):
    """Determines the brand from the product name, adding new brands dynamically."""
    for brand in brands_list:
        if brand.lower() in product_name.lower():
            return brand
    potential_brand = product_name.split()[0]
    if potential_brand:
        print(f"    - Adding new brand: {potential_brand}")
        brands_list.append(potential_brand)
        return potential_brand
    return None

def generate_id(name):
    """Generates a unique ID from the product name."""
    name = re.sub(r'[^\w-]', '-', name)
    name = re.sub(r'-+', '-', name)
    return name.strip('-')

def parse_price(price_str):
    """Parses price string to extract lower and higher prices as integers."""
    if "not found" in price_str.lower() or not price_str:
        return None, None
    cleaned = re.sub(r'[^\d\.\- ]', '', price_str)
    numbers = re.findall(r'\d+(?:\.\d+)?', cleaned)
    if not numbers:
        return None, None
    if len(numbers) == 1:
        price = float(numbers[0])
        return int(price * 100), int(price * 100)
    elif len(numbers) >= 2:
        lower = float(numbers[0])
        higher = float(numbers[1])
        return int(lower * 100), int(higher * 100)
    return None, None

def load_previous_products(md_path):
    """Loads previously scraped product names from the xxxx.md file."""
    previous_products = set()
    if os.path.exists(md_path):
        with open(md_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith('- '):
                    product_name = line[2:].strip()
                    previous_products.add(product_name)
    return previous_products

def rename_brand_folders(output_dir, script_name):
    """Renames brand folders from 'Brand xxxx' to 'Brand'."""
    for folder_name in os.listdir(output_dir):
        if os.path.isdir(os.path.join(output_dir, folder_name)):
            # Check if folder ends with script_name
            if folder_name.endswith(f" {script_name}"):
                brand_name = folder_name[:-len(f" {script_name}")]
                old_path = os.path.join(output_dir, folder_name)
                new_path = os.path.join(output_dir, brand_name)
                try:
                    if os.path.exists(new_path):
                        print(f"    - WARNING: Folder '{new_path}' already exists. Merging contents.")
                        # Move contents of old folder to new folder
                        for item in os.listdir(old_path):
                            shutil.move(os.path.join(old_path, item), os.path.join(new_path, item))
                        shutil.rmtree(old_path)
                    else:
                        shutil.move(old_path, new_path)
                        print(f"    - Renamed folder '{folder_name}' to '{brand_name}'")
                except Exception as e:
                    print(f"    - ERROR: Failed to rename folder '{folder_name}' to '{brand_name}'. Reason: {e}")

def update_image_paths(products_by_brand, script_name):
    """Updates image paths in products_by_brand to remove script_name from brand folder."""
    for brand_key, products in products_by_brand.items():
        for product in products:
            old_image = product['image']
            # Replace 'Brand xxxx' with 'Brand' in the image path
            parts = old_image.split('/')
            if len(parts) > 3 and parts[2].endswith(f" {script_name}"):
                parts[2] = parts[2][:-len(f" {script_name}")]
                new_image = '/'.join(parts)
                product['image'] = new_image
    return products_by_brand

# --- Core Scraping Functions ---

def scrape_product_details(product_url, session, output_dir, script_name, brands_list, current_product_number, total_products_found, retry_count=0):
    """Scrapes a single product detail page and returns product data."""
    try:
        print(f"  - Scraping product page ({current_product_number}/{total_products_found}): {product_url} (Attempt {retry_count + 1}/{MAX_RETRIES})")
        response = session.get(product_url, headers=HEADERS, timeout=20)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        product_container = soup.select_one('div.row.sh_page.bg-white')
        if not product_container:
            print(f"  - WARNING: Could not find product container on {product_url}.")
            return None, retry_count + 1

        name_tag = product_container.select_one('h1.text-capitalize')
        product_name = name_tag.get_text(strip=True) if name_tag else "Unknown Product"
        sanitized_name = sanitize_filename(product_name)
        if not sanitized_name:
            print(f"  - WARNING: Invalid product name '{product_name}'.")
            return None, retry_count + 1
        print(f"    - Found Product: {product_name}")

        brand = get_brand(product_name, brands_list)
        if not brand:
            print(f"    - WARNING: Could not determine brand for '{product_name}'.")
            return None, retry_count + 1

        price_tag = product_container.select_one('span.sp_price')
        product_price = price_tag.get_text(strip=True) if price_tag else "Price not found"

        product_details = ""
        details_card = product_container.select_one('div.sp_collapse_block div.card')
        if details_card:
            details_clone = BeautifulSoup(str(details_card), 'html.parser')
            if details_clone.select_one('div.card-header'):
                details_clone.select_one('div.card-header').decompose()
            if details_clone.select_one('div.card-body'):
                details_clone.select_one('div.card-body').decompose()
            product_details = details_clone.get_text(separator='\n', strip=True)
        if not product_details:
            product_details = "No details found."

        brand_folder = os.path.join(output_dir, brand)  # Use brand name directly
        os.makedirs(brand_folder, exist_ok=True)

        product_folder = os.path.join(brand_folder, sanitized_name)
        os.makedirs(product_folder, exist_ok=True)

        image_folder = os.path.join(product_folder, 'image')
        os.makedirs(image_folder, exist_ok=True)
        image_filename = f"{sanitized_name}.jpg"
        image_path = os.path.join(image_folder, image_filename)

        image_tag = product_container.select_one('img#zoom_03')
        if image_tag and image_tag.get('src'):
            image_url = urljoin(BASE_URL, image_tag['src'])
            try:
                img_response = session.get(image_url, stream=True, headers=HEADERS, timeout=20)
                img_response.raise_for_status()
                if process_and_save_image(img_response.content, image_path):
                    print(f"    - Image saved to: {os.path.basename(image_path)}")
                else:
                    print(f"    - FAILED to process image for {product_name}")
            except requests.RequestException as e:
                print(f"    - ERROR: Image download failed {image_url}. Reason: {e}")
        else:
            print("    - WARNING: No product image found.")

        md_filename = f"{sanitized_name}.md"
        md_path = os.path.join(product_folder, md_filename)
        formatted_price = format_price(product_price)
        md_content = (
            f"# {product_name}\n\n"
            f"{formatted_price}\n\n"
            f"Product Details:\n\n"
            f"{product_details}"
        )
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(md_content)
        print(f"    - Details saved to: {os.path.basename(md_path)}")

        lower_price, higher_price = parse_price(product_price)
        product_id = generate_id(product_name)
        image_rel_path = f"products/{script_name}/{brand}/{sanitized_name}/image/{sanitized_name}.jpg"

        return {
            'id': product_id,
            'name': product_name,
            'image': image_rel_path,
            'lower_price': lower_price,
            'higher_price': higher_price,
            'brand': brand
        }, retry_count

    except requests.RequestException as e:
        print(f"  - ERROR: Failed to access {product_url}. Reason: {e}")
        return None, retry_count + 1
    except Exception as e:
        print(f"  - ERROR: Unexpected error processing {product_url}. Reason: {e}")
        return None, retry_count + 1

def main():
    root_folder_name = get_script_name()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, root_folder_name)
    os.makedirs(output_dir, exist_ok=True)
    md_path = os.path.join(output_dir, f"{root_folder_name}.md")
    products_data_path = os.path.join(output_dir, 'products_data.json')

    # Load previously scraped products
    previous_products = load_previous_products(md_path)
    if previous_products:
        print(f"\nPreviously scraped products: {len(previous_products)} total")
        for product in sorted(previous_products):
            print(f"- {product}")
        input("\nPress Enter to continue scraping...")
    else:
        print("\nPreviously scraped products: 0 total")
        input("Press Enter to start scraping...")

    print(f"\nScraper started. Data will be saved in '{root_folder_name}' folder.")
    print("Ensure you have run 'pip install Pillow requests beautifulsoup4'.")

    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Load and update existing product data if available
    if os.path.exists(products_data_path):
        with open(products_data_path, 'r', encoding='utf-8') as f:
            products_by_brand = json.load(f)
        products_by_brand = update_image_paths(products_by_brand, root_folder_name)
        with open(products_data_path, 'w', encoding='utf-8') as f:
            json.dump(products_by_brand, f, indent=2)
        print(f"Updated image paths in {products_data_path}")
    else:
        products_by_brand = {brand.lower(): [] for brand in BRANDS}

    # Rename existing brand folders
    rename_brand_folders(output_dir, root_folder_name)

    # Phase 1: Collect all product URLs
    listing_tasks = [('listing', URL_TEMPLATE.format(page_num=page_num), 0) for page_num in range(1, TOTAL_PAGES + 1)]
    product_urls = []
    with requests.Session() as session:
        while listing_tasks:
            task_type, url, retry_count = listing_tasks.pop(0)
            if retry_count >= MAX_RETRIES:
                print(f"ERROR: Max retries ({MAX_RETRIES}) reached for listing page {url}. Skipping.")
                continue
            print(f"\n--- Scraping Listing Page: {url} (Attempt {retry_count + 1}/{MAX_RETRIES}) ---")
            try:
                response = session.get(url, headers=HEADERS, timeout=15)
                response.raise_for_status()
                soup = BeautifulSoup(response.content, 'html.parser')
                product_list = soup.select_one('div#con_1.list_bigpic')
                if not product_list:
                    print(f"WARNING: No product container on {url}.")
                    continue
                product_boxes = product_list.select('div.product_box')
                if not product_boxes:
                    print(f"NOTE: No products on {url}.")
                    continue
                print(f"Found {len(product_boxes)} products on {url}.")
                for box in product_boxes:
                    link_tag = box.select_one('h3 > a')
                    if link_tag and link_tag.get('href'):
                        product_url = urljoin(BASE_URL, link_tag['href'])
                        temp_response = session.get(product_url, headers=HEADERS, timeout=20)
                        temp_soup = BeautifulSoup(temp_response.content, 'html.parser')
                        name_tag = temp_soup.select_one('h1.text-capitalize')
                        product_name = name_tag.get_text(strip=True) if name_tag else "Unknown Product"
                        if product_name not in previous_products:
                            product_urls.append(product_url)
                        else:
                            print(f"  - Skipping previously scraped product: {product_name}")
                    else:
                        print("  - WARNING: Product box missing link.")
            except requests.RequestException as e:
                print(f"ERROR: Failed to access {url}. Reason: {e}. Retrying later.")
                listing_tasks.append((task_type, url, retry_count + 1))
                time.sleep(5)

    total_products_found = len(product_urls)
    new_products_scraped = 0
    current_products = set()

    # Phase 2: Process product URLs
    product_tasks = [('product', url, 0) for url in product_urls]
    current_product_number = 0

    with requests.Session() as session:
        while product_tasks:
            task_type, url, retry_count = product_tasks.pop(0)
            current_product_number += 1
            if retry_count >= MAX_RETRIES:
                print(f"ERROR: Max retries ({MAX_RETRIES}) reached for product page {url}. Skipping.")
                continue
            product_data, new_retry_count = scrape_product_details(url, session, output_dir, root_folder_name, BRANDS, current_product_number, total_products_found, retry_count)
            if product_data:
                brand_key = product_data['brand'].lower()
                if brand_key not in products_by_brand:
                    products_by_brand[brand_key] = []
                product_ids = {p['id'] for p in products_by_brand[brand_key]}
                if product_data['id'] not in product_ids:
                    products_by_brand[brand_key].append(product_data)
                    new_products_scraped += 1
                    current_products.add(product_data['name'])
            else:
                product_tasks.append((task_type, url, new_retry_count))
                time.sleep(5)

    # Save updated products_by_brand to products_data.json
    with open(products_data_path, 'w', encoding='utf-8') as f:
        json.dump(products_by_brand, f, indent=2)

    # Calculate total products
    total_products_overall = sum(len(products) for products in products_by_brand.values())

    # Generate xxxx.js with all products
    js_filename = f"{root_folder_name}.js"
    js_path = os.path.join(output_dir, js_filename)
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(f"// Total products: {total_products_overall}, New products scraped: {new_products_scraped}, Date: {current_time}\n")
        f.write(f"export const {root_folder_name}Products = {{\n")
        for brand_key in sorted(products_by_brand.keys()):
            f.write(f"  {brand_key}: [\n")
            for product in products_by_brand[brand_key]:
                lower_price = 'null' if product['lower_price'] is None else product['lower_price']
                higher_price = 'null' if product['higher_price'] is None else product['higher_price']
                name_escaped = product['name'].replace("'", "\\'")
                f.write(f"    {{\n")
                f.write(f"      id: '{product['id']}',\n")
                f.write(f"      name: '{name_escaped}',\n")
                f.write(f"      image: '{product['image']}',\n")
                f.write(f"      lower_price: {lower_price},\n")
                f.write(f"      higher_price: {higher_price}\n")
                f.write(f"    }},\n")
            f.write(f"  ],\n")
        f.write(f"}};\n")
    print(f"JavaScript file saved to: {js_path}")

    # Update xxxx.md with all products
    all_products = previous_products.union(current_products)
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(f"# Scraped Products\n\n")
        f.write(f"Last updated: {current_time}\n\n")
        f.write(f"Total products: {len(all_products)}\n\n")
        for product in sorted(all_products):
            f.write(f"- {product}\n")
    print(f"Product list saved to: {md_path}")

    # Display summary and new products in terminal
    print(f"\nTotal products: {total_products_overall}, New products scraped: {new_products_scraped}, Date: {current_time}")
    if new_products_scraped > 0:
        print("New products:\n")
        for product_name in sorted(current_products):
            print(f"- {product_name}")
    print(f"\n--- Scraping complete! Data saved in '{root_folder_name}' folder. ---")

if __name__ == "__main__":
    main()