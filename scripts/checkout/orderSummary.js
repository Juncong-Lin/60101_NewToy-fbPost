import {cart, removeFromCart, updateDeliveryOption} from '../../data/cart.js';   
import {products} from '../../data/products.js';
import {printheadProducts} from '../../data/printhead-products.js';
import {inkjetPrinterProducts} from '../../data/inkjetPrinter-products.js';
import {getInkjetPrinterById} from '../index/qilitrading.js';
import {printSparePartProducts} from '../../data/printsparepart-products.js';
import {upgradingKitProducts} from '../../data/upgradingkit-products.js';
import {formatCurrency, formatPriceRange} from '../shared/money.js';
import dayjs from 'https://unpkg.com/dayjs@1.11.10/esm/index.js';
import {deliveryOptions, getDeliveryOption} from '../../data/deleveryOptions.js';
import { renderPaymentSummary } from './paymentSummary.js';
import { updateCartQuantity } from '../shared/cart-quantity.js';
import { updatePageTitle } from './checkout.js';

export function renderOrderSummary() {
// Get unique items and total quantity for the heading
const uniqueItems = cart.length;
const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

// Start with empty HTML - the page title is now rendered separately in checkout.js
let cartSummaryHTML = ``;

cart.forEach((cartItem) => {
  const productId = cartItem.productId;
  let matchingProduct;
  
  // First search in regular products
  products.forEach((product) => {
    if (product.id === productId) {
      matchingProduct = product;
    }
  });
    // If not found in regular products, search in printhead products
  if (!matchingProduct) {
    for (const brand in printheadProducts) {
      const brandProducts = printheadProducts[brand];
      const found = brandProducts.find(product => product.id === productId);
      if (found) {
        matchingProduct = found;
        break;
      }
    }  }
  // If not found in printhead products, search in inkjet printer products
  if (!matchingProduct) {
    matchingProduct = getInkjetPrinterById(productId);
  }
    // If not found in inkjet printer products, search in print spare part products
  if (!matchingProduct) {
    for (const category in printSparePartProducts) {
      const categoryProducts = printSparePartProducts[category];
      const found = categoryProducts.find(product => product.id === productId);
      if (found) {
        matchingProduct = found;
        break;
      }
    }
  }
  
  // If not found in print spare part products, search in upgrading kit products
  if (!matchingProduct) {
    for (const brand in upgradingKitProducts) {
      const brandProducts = upgradingKitProducts[brand];
      const found = brandProducts.find(product => product.id === productId);
      if (found) {
        matchingProduct = found;
        break;
      }
    }
  }
  
  if (!matchingProduct) {
    // Remove invalid product from cart
    removeFromCart(productId);
    return; // Skip this item if product not found
  }

  const deliveryOptionId = cartItem.deliveryOptionId;
  let deliveryOption;
  deliveryOptions.forEach((option) => {
    if (option.id === deliveryOptionId) {
      deliveryOption = option;
      }
  });

  if (!deliveryOption) {
    console.error('Delivery option not found for ID:', deliveryOptionId);
    deliveryOption = deliveryOptions[0]; // Use first delivery option as fallback
  }

  const today = dayjs();
  const deliveryDate = today.add(deliveryOption.deliveryDays, 'days');
  const dateString = deliveryDate.format('dddd, MMMM D');    cartSummaryHTML += `
      <div class="cart-item-container 
      js-cart-item-container-${matchingProduct.id}">
        <div class="delivery-date">
          Delivery date: ${dateString}
        </div>

        <div class="cart-item-details-grid">
          <a href="detail.html?id=${matchingProduct.id}">
            <img class="product-image"
              src="${matchingProduct.image}">
          </a>

          <div class="cart-item-details">
            <div class="product-name">
              <a href="detail.html?id=${matchingProduct.id}">${matchingProduct.name}</a>
            </div>            <div class="product-price">
              ${(() => {
                if (matchingProduct.getPrice) {
                  return matchingProduct.getPrice();
                } else if (matchingProduct.lower_price !== undefined || matchingProduct.higher_price !== undefined) {
                  return formatPriceRange(matchingProduct.lower_price, matchingProduct.higher_price);                } else if (matchingProduct.priceCents || matchingProduct.price) {
                  return 'USD:$' + formatCurrency(matchingProduct.priceCents || matchingProduct.price);
                } else {
                  return 'USD: #NA';
                }
              })()}
            </div>
            <div class="product-quantity">
              <span>
                Quantity: <span class="quantity-label js-quantity-label-${matchingProduct.id}">${cartItem.quantity}</span>
              </span>
              <span class="update-quantity-link link-primary js-update-link" data-product-id="${matchingProduct.id}">
                Update
              </span>
              <span class="delete-quantity-link link-primary \
              js-delete-link" data-product-id="${matchingProduct.id}">
                Delete
              </span>
              <span class="js-quantity-select-container-${matchingProduct.id}" style="display:none;"></span>
            </div>
          </div>

          <div class="delivery-options">
            <div class="delivery-options-title">
              Choose a delivery option:
            </div>
            ${deleveryOptionsHTML(matchingProduct,cartItem)}
          </div>
        </div>
      </div>
    `;
  });

  document.querySelector('.js-order-summary')
    .innerHTML = cartSummaryHTML;  document.querySelectorAll('.js-delete-link')
    .forEach((link) => {
      link.addEventListener('click', () => {
        const productId = link.dataset.productId;
        removeFromCart(productId);

        // Update cart quantity in header immediately
        updateCartQuantity();

        // Check if cart is empty after removal
        if (cart.length === 0) {
          // Refresh the page to show empty cart message
          window.location.reload();
          return;
        }        
        
        // Update page title with new cart statistics
        updatePageTitle();
        
        // Update by re-rendering the order summary
        renderOrderSummary();
        renderPaymentSummary();
      });
    });


  document.querySelectorAll('.js-delivery-option')
    .forEach((element) => {
      element.addEventListener('click', () => {
        const {productId, deliveryOptionId} = element.dataset;
        updateDeliveryOption(productId, deliveryOptionId);
        renderOrderSummary();
        renderPaymentSummary();
      });
    });

  document.querySelectorAll('.js-update-link')
    .forEach((link) => {
      link.addEventListener('click', () => {
        const productId = link.dataset.productId;
        const container = document.querySelector(`.js-quantity-select-container-${productId}`);
        // Create select dropdown
        let selectHTML = '<select class="js-quantity-select">';
        for (let i = 1; i <= 10; i++) {
          selectHTML += `<option value="${i}">${i}</option>`;
        }
        selectHTML += '</select>';
        container.innerHTML = selectHTML;
        container.style.display = '';
        // Hide update link
        link.style.display = 'none';
        // Set current value
        const select = container.querySelector('select');
        select.value = document.querySelector(`.js-quantity-label-${productId}`).textContent;
        select.focus();        select.addEventListener('change', () => {
          const newQuantity = Number(select.value);
          const cartItem = cart.find(item => item.productId === productId);
          cartItem.quantity = newQuantity;
          localStorage.setItem('cart', JSON.stringify(cart));
          
          // Update cart quantity in header immediately
          updateCartQuantity();
          
          // Update page title with new cart statistics
          updatePageTitle();
          
          // Update UI
          document.querySelector(`.js-quantity-label-${productId}`).textContent = newQuantity;
          container.style.display = 'none';
          link.style.display = '';          // Update summary only
          renderOrderSummary();
          renderPaymentSummary();
        });
      });
    });
}

function deleveryOptionsHTML(matchingProduct, cartItem) {
  let html = '';
  deliveryOptions.forEach((deliveryOption) => {
    const today = dayjs();
    const deliveryDate = today.add(deliveryOption.deliveryDays, 'days');
    const dateString = deliveryDate.format('dddd, MMMM D');
    const priceString = deliveryOption.priceCents === 0
      ? 'FREE'
      : `$${formatCurrency(deliveryOption.priceCents)} - Shipping`;

    const isChecked = deliveryOption.id === cartItem.deliveryOptionId;    html +=
    `
      <div class="delivery-option js-delivery-option"
      data-product-id="${matchingProduct.id}"
      data-delivery-option-id="${deliveryOption.id}">
        <input type="radio"
          ${isChecked ? 'checked' : ''}
        class="delivery-option-input"
          name="delivery-option-${matchingProduct.id}">
        <div class="delivery-option-info">
          <span class="delivery-option-date">${dateString}</span>
          <span class="delivery-option-price">${priceString}</span>
        </div>
      </div>
    `;
  });
  return html;
}

// Expose product data globally for search system
window.inkjetPrinterProducts = inkjetPrinterProducts;
window.printheadProducts = printheadProducts;
window.printSparePartProducts = printSparePartProducts;
window.upgradingKitProducts = upgradingKitProducts;

