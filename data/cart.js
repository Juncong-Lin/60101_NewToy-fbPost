export let cart = JSON.parse(localStorage.getItem('cart'));

if (!cart) {
  cart = [];
  localStorage.setItem('cart', JSON.stringify(cart));
}

// Function to clear the cart (useful for testing)
export function clearCart() {
  cart.length = 0; // Clear array contents instead of reassigning
  localStorage.setItem('cart', JSON.stringify(cart));
}

// Function to remove invalid items from cart
export function cleanInvalidItems(validProductIds) {
  const originalLength = cart.length;
  for (let i = cart.length - 1; i >= 0; i--) {
    if (!validProductIds.includes(cart[i].productId)) {
      cart.splice(i, 1);
    }
  }
  if (cart.length !== originalLength) {
    saveToStorage();
  }
}

function saveToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

export function addToCart (productId, quantity = 1) {
  let matchingItem;
  cart.forEach((cartItem) => {
    if (productId === cartItem.productId) {
      matchingItem = cartItem;
    }
  });

  if (matchingItem) {
    matchingItem.quantity += quantity;
  } else {  
    cart.push({
      productId : productId,    
      quantity: quantity,
      deliveryOptionId: '1'
    })
  }
  saveToStorage();
}

export function removeFromCart(productId) {
  // Remove items by filtering in place
  for (let i = cart.length - 1; i >= 0; i--) {
    if (cart[i].productId === productId) {
      cart.splice(i, 1);
    }
  }
  saveToStorage();
}

export function updateDeliveryOption(productId, deliveryOptionId) {
  let matchingItem;
  cart.forEach((cartItem) => {
    if (productId === cartItem.productId) {
      matchingItem = cartItem;
    }
  });
  matchingItem.deliveryOptionId = deliveryOptionId;
  saveToStorage();
}
