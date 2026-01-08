import { formatCurrency } from '../scripts/shared/money.js';  

export function getProduct(productId) {
  let matchingProduct;
  products.forEach((product) => {
    if (product.id === productId) {
      matchingProduct = product;
    }
  });
  return matchingProduct;
}

class Product {
  id;
  image; 
  name;
  priceCents;
  keywords;
  description;

  constructor(productDetails) {
    this.id = productDetails.id;
    this.image = productDetails.image;
    this.name = productDetails.name;
    this.priceCents = productDetails.priceCents;
    this.keywords = productDetails.keywords;
    this.description = productDetails.description || `${productDetails.name} - High quality product from QiliTrading.com. Contact us for more details.`;
  }
  getPrice() {
    return `$${formatCurrency(this.priceCents)}`;
  }
  extraInfoHTML() {
    return '';
  }
}

class ProductWithSize extends Product {
  sizeChartLink;
  constructor(productDetails) {
    super(productDetails);
    this.sizeChartLink = productDetails.sizeChartLink;
  }

  extraInfoHTML() {
    // super.extraInfoHTML();
    return `
      <a href="${this.sizeChartLink}" target="_blank">
        Size Chart
      </a>
    `;
  }
}


export const products = [].map((productDetails) => {
  if (productDetails.type === 'clothing') {
    return new ProductWithSize(productDetails);
  } 
  return new Product(productDetails);
})