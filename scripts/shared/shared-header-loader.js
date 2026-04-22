// Shared Header Loader
async function loadSharedHeader() {
  try {
    const response = await fetch('components/shared-header.html');
    const headerHTML = await response.text();
    
    // Find the placeholder element for the header
    const placeholder = document.getElementById('shared-header-placeholder');
    if (placeholder) {
      // Replace placeholder with actual header content
      placeholder.innerHTML = headerHTML;
      
      // Initialize cart quantity after header is loaded
      initializeCartQuantityAfterHeaderLoad();
      
      // Initialize search functionality after header is loaded
      initializeSearchAfterHeaderLoad();
    } else {
      console.error('Shared header placeholder not found');
    }
  } catch (error) {
    console.error('Error loading shared header:', error);
  }
}

// Initialize search functionality after header is loaded
function initializeSearchAfterHeaderLoad() {
  // Initialize search system if it exists
  if (window.searchSystem) {
    window.searchSystem.init();
  }
}

// Initialize cart quantity display after header is loaded
async function initializeCartQuantityAfterHeaderLoad() {
  try {
    // Import the cart and updateCartQuantity function
    const { cart } = await import('../../data/cart.js');
    const { updateCartQuantity } = await import('./cart-quantity.js');
    
    // Update cart quantity using the imported function
    updateCartQuantity();
  } catch (error) {
    console.error('Error initializing cart quantity:', error);
    
    // Fallback: try to calculate cart quantity manually
    try {
      const { cart } = await import('../../data/cart.js');
      let cartQuantity = 0;
      
      if (cart && Array.isArray(cart)) {
        cart.forEach((cartItem) => {
          cartQuantity += cartItem.quantity;
        });
      }
      
      const cartQuantityElement = document.querySelector('.js-cart-quantity');
      if (cartQuantityElement) {
        cartQuantityElement.textContent = cartQuantity;
      }
    } catch (fallbackError) {
      console.error('Fallback cart quantity calculation failed:', fallbackError);
    }
  }
}

// Load the shared header when the DOM is loaded
document.addEventListener('DOMContentLoaded', loadSharedHeader);
