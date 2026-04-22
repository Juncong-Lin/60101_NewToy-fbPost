import { cart } from '../../data/cart.js';

export function updateCartQuantity() {
  // Calculate the total quantity of items in cart
  let cartQuantity = 0;
  
  cart.forEach((item) => {
    cartQuantity += item.quantity;
  });

  // Update the cart quantity display in the header
  const cartQuantityElement = document.querySelector('.js-cart-quantity');
  if (cartQuantityElement) {
    cartQuantityElement.textContent = cartQuantity;
  }
}
