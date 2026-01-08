import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from products_1688.toy import scrape_products_from_factory

URL_TO_BRAND = {
    "https://sale.1688.com/factory/l6rr893d.html?memberId=b2b-22156758559717dde3": "汕头市澄海区思卡恩玩具厂",
    "https://sale.1688.com/factory/l6rr893d.html?memberId=b2b-220798729583430bb9": "汕头市澄海区奋进玩具厂",
    "https://sale.1688.com/factory/l6rr893d.html?memberId=b2b-2220638609655e6f30": "汕头市澄海区奇妙星趣玩具厂",
    "https://sale.1688.com/factory/l6rr893d.html?memberId=b2b-3853515848f14fa": "汕头市澄海区申乐玩具厂",
    "https://sale.1688.com/factory/l6rr893d.html?memberId=b2b-2200540019856d995e": "汕头市点桐贸易有限公司",
    "https://sale.1688.com/factory/l6rr893d.html?memberId=b2b-221033193854773933": "汕头市亨乐迪贸易有限公司",
}

if __name__ == "__main__":
    for url, brand in URL_TO_BRAND.items():
        scraped_brand, products, retry = scrape_products_from_factory(url, URL_TO_BRAND)
        print(f"{brand}: brand={scraped_brand}, products={len(products)}, retry={retry}")
