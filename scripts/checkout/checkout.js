import {renderOrderSummary} from './orderSummary.js';
import {renderPaymentSummary} from './paymentSummary.js';
import { cart } from '../../data/cart.js';
import { updateCartQuantity } from '../shared/cart-quantity.js';

// Function to update the page title with current cart statistics
export function updatePageTitle() {
  const uniqueItems = cart ? cart.length : 0;
  const totalQuantity = cart ? cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
  
  const pageTitleElement = document.querySelector('.page-title');
  if (pageTitleElement) {
    pageTitleElement.innerHTML = `Checkout (Items: ${uniqueItems}, Total quantity: ${totalQuantity})`;
  }
}

// Checkout.js loaded
// Cart data available from import

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  // Update cart quantity in header
  updateCartQuantity();
  
  // Always render payment summary first (it will handle cart cleaning)
  renderPaymentSummary(); 
  
  // Only render order summary and page title if cart still has items after cleaning
  if (cart.length > 0) {
    // Calculate unique items and total quantity after cleaning
    const uniqueItems = cart.length;
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Show normal checkout view
    document.querySelector('.checkout-grid').style.display = 'grid';
    document.querySelector('.js-payment-summary').style.display = 'block';
    document.querySelector('.js-empty-cart').style.display = 'none';
    
    const checkoutHeaderMiddle = document.querySelector('.checkout-header-middle-section');
    if (checkoutHeaderMiddle) {
      checkoutHeaderMiddle.innerHTML = '';
    }
    
    // Add page title above everything
    const mainElement = document.querySelector('.main');
    const emptyCartMessage = document.querySelector('.js-empty-cart');
    
    // Create page title element
    const pageTitleElement = document.createElement('div');
    pageTitleElement.className = 'page-title';
    pageTitleElement.innerHTML = `Checkout (Items: ${uniqueItems}, Total quantity: ${totalQuantity})`;
    
    // Insert page title after the empty cart message (which is hidden)
    mainElement.insertBefore(pageTitleElement, emptyCartMessage.nextSibling);
    
    renderOrderSummary(); // Then render order summary
  }
});

