// Temporarily commented out cart imports - preserved for future reuse
// import {cart, addToCart} from '../../data/cart.js'; 
import {products} from '../../data/products.js';
import {printheadProducts} from '../../data/printhead-products.js';
import {inkjetPrinterProducts} from '../../data/inkjetPrinter-products.js';
import {printSparePartProducts} from '../../data/printsparepart-products.js';
import {upgradingKitProducts} from '../../data/upgradingkit-products.js';
import {materialProducts} from '../../data/material-products.js';
import {ledAndLcdProducts} from '../../data/ledAndLcd-products.js';
import {channelLetterBendingMechineProducts} from '../../data/channelLetterBendingMechine-products.js';
import {otherProducts} from '../../data/other-products.js';
import { formatCurrency, formatPriceRange } from '../shared/money.js';

// Early search parameter detection to prevent hero banner flash
// Check immediately if this is a search request and hide hero banner
const urlParams = new URLSearchParams(window.location.search);
const isSearchRequest = urlParams.has('search');

// If this is a search request, immediately hide the hero banner to prevent flash
if (isSearchRequest) {
  // Add CSS to immediately hide hero banner before it renders
  const style = document.createElement('style');
  style.textContent = `
    .hero-banner {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
  
  // Also set a flag for the search system to know this is an early detection
  window.isEarlySearchDetection = true;
}

// Unified product rendering function with optional type parameter
function renderProducts(productList, type = 'regular') {
  let productsHTML = '';
  productList.forEach((product) => {
    productsHTML += `
      <div class="product-container">        
        <div class="product-image-container">
          <a href="detail.html?productId=${product.id}" class="product-image-link">
            <img class="product-image" src="${product.image}">
          </a>
        </div>
        <div class="product-name limit-text-to-3-lines">
          <a href="detail.html?productId=${product.id}" class="product-link">
            ${product.name}
          </a>
        </div>        <div class="product-price">
          ${(() => {
            if (type === 'regular' && product.getPrice) {
              return product.getPrice();
            } else if (product.lower_price !== undefined || product.higher_price !== undefined) {
              return formatPriceRange(product.lower_price, product.higher_price);
            } else if (product.price) {
              return 'USD:$' + formatCurrency(product.price);
            } else {
              return 'USD: #NA';
            }
          })()}</div>
        <!-- Temporarily commented out quantity section - not needed for View Details -->
        <!--
        <div class="product-quantity-section">
          <div class="product-quantity-container">
            <select>
              <option selected value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="9">9</option>
              <option value="10">10</option>
            </select>
          </div>
          <div class="added-message">Added</div>
        </div>
        --><div class="product-spacer"></div>
        <a class="add-to-cart-button button-primary" href="detail.html?productId=${product.id}">
          View Details
        </a>
      </div>`;
  });
  return productsHTML;
}

// Function to load printhead products for a specific brand
window.loadPrintheadProducts = function(brand) {
  const brandProducts = printheadProducts[brand];
  if (brandProducts) {
    // Hide the submenu after selection
    hideActiveSubmenus();
    
    // Hide hero banner for specific category views
    hideHeroBanner();
    
    // Highlight selected menu item(brand);
    highlightSelectedMenuItem(brand);
      // Add loading animation
    showLoadingState();
    
    // Small delay for smooth transition
    setTimeout(() => {      const productsHTML = renderProducts(brandProducts, 'printhead');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();        // Update page title or add a header to show which brand is selected
      updatePageHeader(`${brand.charAt(0).toUpperCase() + brand.slice(1)} Printheads`, brandProducts.length);
          // Update breadcrumb navigation
    updateBreadcrumb(brand);
      
      // Scroll to top of products
      scrollToProducts();
    }, 200);
  }
};

// Function to load all printhead products from all brands
window.loadAllPrintheadProducts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Print Heads') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Combine all printhead products from all brands
    let allPrintheadProducts = [];
    for (const brand in printheadProducts) {
      allPrintheadProducts = allPrintheadProducts.concat(printheadProducts[brand]);
    }      const productsHTML = renderProducts(allPrintheadProducts, 'printhead');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
      // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();      // Update page title or add a header to show print heads category
    updatePageHeader('Print Heads', allPrintheadProducts.length);
      // Update breadcrumb navigation
    updateBreadcrumb('printHeads');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load all regular products (default view)
window.loadAllProducts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Highlight selected menu item
  highlightSelectedMenuItem('all');
    // Show hero banner for main homepage view
  showHeroBanner();
    // Initialize hero carousel
  if (!heroCarousel) {
    heroCarousel = new HeroCarousel();
    window.heroCarousel = heroCarousel;
  }
  
  // Clear products grid for homepage - just show hero banner
  const productsGrid = document.querySelector('.js-prodcts-grid');
  productsGrid.innerHTML = '';
  productsGrid.classList.remove('showing-coming-soon');
  
  // Remove page header for clean homepage
  const pageHeader = document.querySelector('.page-header');
  if (pageHeader) {
    pageHeader.remove();
  }
  
  // Remove breadcrumb for clean homepage
  const breadcrumbElement = document.querySelector('.breadcrumb-nav');
  if (breadcrumbElement) {
    breadcrumbElement.remove();
  }
};

// Function to load XP600 printer products
window.loadXP600Printers = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item
  highlightSelectedMenuItem('xp600-printers');
  
  // Add loading animation
  showLoadingState();
    // Small delay for smooth transition
  setTimeout(() => {
    const xp600Printers = getEcoSolventXP600Printers();
    const productsHTML = renderProducts(xp600Printers, 'printer');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
      // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
    
    // Update page title
    updatePageHeader('XP600 Inkjet Printers', xp600Printers.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('xp600-printers');
    
    // Scroll to top of products
    scrollToProducts();
  }, 200);
};

// Function to load I1600 printer products
window.loadI1600Printers = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item
  highlightSelectedMenuItem('i1600-printers');
  
  // Add loading animation
  showLoadingState();
    // Small delay for smooth transition
  setTimeout(() => {
    const i1600Printers = getEcoSolventI1600Printers();
    const productsHTML = renderProducts(i1600Printers, 'printer');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
      // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
    
    // Update page title
    updatePageHeader('Printers with I1600 Printhead', i1600Printers.length);
      // Update breadcrumb navigation
    updateBreadcrumb('i1600-printers');
    
    // Scroll to top of products
    scrollToProducts();
  }, 200);
};

// Function to load I3200 printer products
window.loadI3200Printers = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item
  highlightSelectedMenuItem('i3200-printers');
  
  // Show "Coming Soon" message briefly for smooth transition  showComingSoonMessage();
  
  // Small delay for smooth transition
  setTimeout(() => {
    const i3200Printers = getEcoSolventI3200Printers();
    const productsHTML = renderProducts(i3200Printers, 'printer');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
      // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
    
    // Update page title
    updatePageHeader('Printers with I3200 Printhead', i3200Printers.length);
      // Update breadcrumb navigation
    updateBreadcrumb('i3200-printers');
    
    // Scroll to top of products
    scrollToProducts();
  }, 200);
};

// Function to load upgrading kit products for a specific brand
window.loadUpgradingKitProducts = function(brand) {
  const brandProducts = upgradingKitProducts[brand];
  if (brandProducts) {
    // Hide the submenu after selection
    hideActiveSubmenus();
    
    // Hide hero banner for specific category views
    hideHeroBanner();
    
    // Highlight selected menu item
    highlightSelectedMenuItem(brand);
    
    // Add loading animation
    showLoadingState();
    
    // Small delay for smooth transition
    setTimeout(() => {
      const productsHTML = renderProducts(brandProducts, 'upgradingkit');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
        // Update page title or add a header to show which brand is selected
      updatePageHeader(`${brand.charAt(0).toUpperCase() + brand.slice(1)} Upgrading Kit`, brandProducts.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb(brand, 'upgradingkit');
      
      // Scroll to top of products
      scrollToProducts();
    }, 200);
  }
};

// Function to load all upgrading kit products from all brands
window.loadAllUpgradingKitProducts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Upgrading Kit') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Combine all upgrading kit products from all brands
    let allUpgradingKitProducts = [];
    for (const brand in upgradingKitProducts) {
      allUpgradingKitProducts = allUpgradingKitProducts.concat(upgradingKitProducts[brand]);
    }
    
    const productsHTML = renderProducts(allUpgradingKitProducts, 'upgradingkit');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title or add a header to show upgrading kit category
    updatePageHeader('Upgrading Kit', allUpgradingKitProducts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('upgradingKit');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load LED & LCD products for a specific category
window.loadLedLcdProducts = function(category) {
  const categoryProducts = ledAndLcdProducts[category];
  if (categoryProducts) {
    // Hide the submenu after selection
    hideActiveSubmenus();
    
    // Hide hero banner for specific category views
    hideHeroBanner();
    
    // Highlight selected menu item
    highlightSelectedMenuItem(category);
    
    // Add loading animation
    showLoadingState();
    
    // Small delay for smooth transition
    setTimeout(() => {
      const productsHTML = renderProducts(categoryProducts, 'ledlcd');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
        // Update page title or add a header to show which category is selected
      updatePageHeader(`${category.charAt(0).toUpperCase() + category.slice(1)} LED & LCD`, categoryProducts.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb(`led-lcd-${category}`);
      
      // Scroll to top of products
      scrollToProducts();
    }, 200);
  }
};

// Function to load all LED & LCD products from all categories
window.loadAllLedLcdProducts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'LED & LCD') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Combine all LED & LCD products from all categories
    let allLedLcdProducts = [];
    for (const category in ledAndLcdProducts) {
      allLedLcdProducts = allLedLcdProducts.concat(ledAndLcdProducts[category]);
    }
    
    const productsHTML = renderProducts(allLedLcdProducts, 'ledlcd');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title or add a header to show LED & LCD category
    updatePageHeader('LED & LCD', allLedLcdProducts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('led-lcd');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to hide all active submenus
function hideActiveSubmenus() {
  document.querySelectorAll('.submenu.active').forEach(submenu => {
    submenu.classList.remove('active');
  });
  document.querySelectorAll('.expandable.active').forEach(link => {
    link.classList.remove('active');
  });
}

// Function to show loading state
function showLoadingState() {
  const productsGrid = document.querySelector('.js-prodcts-grid');
  productsGrid.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading products...</p>
    </div>
  `;
  productsGrid.classList.remove('showing-coming-soon');
}

// Function to show hero banner
function showHeroBanner() {
  const heroBanner = document.querySelector('.hero-banner');
  if (heroBanner) {
    heroBanner.style.display = 'block';
    // Add the show class for CSS transition
    setTimeout(() => {
      heroBanner.classList.add('show');
    }, 10);
  }
}

// Function to hide hero banner
function hideHeroBanner() {
  const heroBanner = document.querySelector('.hero-banner');
  if (heroBanner) {
    heroBanner.classList.remove('show');
    // Hide after transition completes
    setTimeout(() => {
      heroBanner.style.display = 'none';
    }, 600);
  }
}

// Function to show coming soon message
function showComingSoonMessage() {
  const productsGrid = document.querySelector('.js-prodcts-grid');
  productsGrid.innerHTML = `
    <div class="coming-soon">
      <h2>Loading Products...</h2>
      <p>Please wait while we load the products for you.</p>
    </div>
  `;
  productsGrid.classList.add('showing-coming-soon');
}

// Function to scroll to products section
function scrollToProducts() {
  // Get the main container to scroll to
  const mainElement = document.querySelector('.main');
  
  if (mainElement) {
    // Scroll to the main section with a slight offset to show the header
    window.scrollTo({
      top: mainElement.offsetTop - 120, // Reduce the scroll distance with an offset
      behavior: 'smooth'
    });
  }
}

// Function to update page header with optional product count
function updatePageHeader(title, productCount = null) {
  let headerElement = document.querySelector('.page-header');
  if (!headerElement) {
    // Create header if it doesn't exist
    headerElement = document.createElement('h2');
    headerElement.className = 'page-header';
    headerElement.style.margin = '20px 0';
    headerElement.style.textAlign = 'center';
    headerElement.style.fontSize = '24px';
    headerElement.style.fontWeight = 'bold';
    
    const mainElement = document.querySelector('.main');
    mainElement.insertBefore(headerElement, mainElement.firstChild);
  }
  
  // Format title with product count if provided
  if (productCount !== null && productCount !== undefined) {
    headerElement.textContent = `${title} (Total: ${productCount})`;
  } else {
    headerElement.textContent = title;
  }
}

// Function to update breadcrumb navigation
function updateBreadcrumb(brand) {
  let breadcrumbElement = document.querySelector('.breadcrumb-nav');
  if (!breadcrumbElement) {
    // Create breadcrumb if it doesn't exist
    breadcrumbElement = document.createElement('div');
    breadcrumbElement.className = 'breadcrumb-nav';
    
    const mainElement = document.querySelector('.main');
    mainElement.insertBefore(breadcrumbElement, mainElement.firstChild);
  }
  
  // Check if we're on the detail page
  const isDetailPage = window.location.pathname.includes('detail.html');
    if (brand && brand !== 'all') {
    // Special case for 'printHeads' which is the main category
    if (brand === 'printHeads') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Print Heads</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Print Heads</span>
        `;
      }
    } else if (brand === 'inkjetPrinters') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Inkjet Printers</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Inkjet Printers</span>
        `;
      }
    } else if (brand === 'printSpareParts') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Print Spare Parts</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Print Spare Parts</span>
        `;
      }
    } else if (brand === 'economicVersionPrinters') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Eco-Solvent Inkjet Printers</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Eco-Solvent Inkjet Printers</span>
        `;
      }
    } else if (brand === 'xp600-printers' || brand === 'xp600Printers') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjetprinters-ecosolvent" class="breadcrumb-link">Eco-Solvent Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With XP600 Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadSpecificCategory && window.loadSpecificCategory('Eco-Solvent Inkjet Printers')" class="breadcrumb-link">Eco-Solvent Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With XP600 Printhead</span>
        `;
      }
    } else if (brand === 'i1600-printers' || brand === 'i1600Printers') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjetprinters-ecosolvent" class="breadcrumb-link">Eco-Solvent Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With I1600 Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadSpecificCategory && window.loadSpecificCategory('Eco-Solvent Inkjet Printers')" class="breadcrumb-link">Eco-Solvent Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With I1600 Printhead</span>
        `;
      }
    } else if (brand === 'i3200-printers' || brand === 'i3200Printers') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjetprinters-ecosolvent" class="breadcrumb-link">Eco-Solvent Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With I3200 Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadSpecificCategory && window.loadSpecificCategory('Eco-Solvent Inkjet Printers')" class="breadcrumb-link">Eco-Solvent Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With I3200 Printhead</span>
        `;
      }
    } else if (brand === 'directToFabricFilm') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Direct to Fabric & Film</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Direct to Fabric & Film</span>
        `;
      }
    } else if (brand === 'dtfPrinters') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadDirectToFabricFilmPrinters()" class="breadcrumb-link">Direct to Fabric & Film</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">DTF Printer</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadDirectToFabricFilmPrinters()" class="breadcrumb-link">Direct to Fabric & Film</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">DTF Printer</span>
        `;
      }
    } else if (brand === 'uvDtfPrinters') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadDirectToFabricFilmPrinters()" class="breadcrumb-link">Direct to Fabric & Film</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">UV DTF Printer</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadDirectToFabricFilmPrinters()" class="breadcrumb-link">Direct to Fabric & Film</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">UV DTF Printer</span>
        `;
      }
    } else if (brand === 'solventPrinters') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Solvent Inkjet Printers</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Solvent Inkjet Printers</span>
        `;
      }
    } else if (brand === 'solventKM512iPrinters') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadAllSolventPrinters && window.loadAllSolventPrinters()" class="breadcrumb-link">Solvent Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Konica KM512i Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadAllSolventPrinters && window.loadAllSolventPrinters()" class="breadcrumb-link">Solvent Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Konica KM512i Printhead</span>
        `;
      }
    } else if (brand === 'solventKM1024iPrinters') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadAllSolventPrinters && window.loadAllSolventPrinters()" class="breadcrumb-link">Solvent Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Konica KM1024i Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadAllSolventPrinters && window.loadAllSolventPrinters()" class="breadcrumb-link">Solvent Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Konica KM1024i Printhead</span>
        `;
      }
    } else if (brand === 'sublimationPrinters') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Sublimation Printers</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Sublimation Printers</span>
        `;
      }
    } else if (brand === 'sublimationXP600Printers') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#sublimation-printers" class="breadcrumb-link">Sublimation Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With XP600 Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadSpecificCategory && window.loadSpecificCategory('Sublimation Printers')" class="breadcrumb-link">Sublimation Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With XP600 Printhead</span>
        `;
      }
    } else if (brand === 'sublimationI1600Printers') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#sublimation-printers" class="breadcrumb-link">Sublimation Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With I1600 Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadSpecificCategory && window.loadSpecificCategory('Sublimation Printers')" class="breadcrumb-link">Sublimation Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With I1600 Printhead</span>
        `;
      }
    } else if (brand === 'sublimationI3200Printers') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#sublimation-printers" class="breadcrumb-link">Sublimation Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With I3200 Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadSpecificCategory && window.loadSpecificCategory('Sublimation Printers')" class="breadcrumb-link">Sublimation Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With I3200 Printhead</span>
        `;
      }
    } else if (brand === 'epsonPrinterSpareParts') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#print-spare-parts" class="breadcrumb-link">Print Spare Parts</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Epson Printer Spare Parts</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadAllPrintSpareParts()" class="breadcrumb-link">Print Spare Parts</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Epson Printer Spare Parts</span>        `;
      }    } else if (brand === 'rolandPrinterSpareParts') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#print-spare-parts" class="breadcrumb-link">Print Spare Parts</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Roland Printer Spare Parts</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadAllPrintSpareParts()" class="breadcrumb-link">Print Spare Parts</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Roland Printer Spare Parts</span>
        `;
      }    } else if (brand === 'canonPrinterSpareParts') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#print-spare-parts" class="breadcrumb-link">Print Spare Parts</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Canon Printer Spare Parts</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadAllPrintSpareParts()" class="breadcrumb-link">Print Spare Parts</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Canon Printer Spare Parts</span>
        `;
      }    } else if (brand === 'ricohPrinterSpareParts') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#print-spare-parts" class="breadcrumb-link">Print Spare Parts</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Ricoh Printer Spare Parts</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadAllPrintSpareParts()" class="breadcrumb-link">Print Spare Parts</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Ricoh Printer Spare Parts</span>
        `;
      }
    } else if (brand === 'upgradingKit') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Upgrading Kit</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Upgrading Kit</span>
        `;
      }
    } else if (brand === 'hoson' || brand === 'mimaki' || brand === 'mutoh' || brand === 'roll_to_roll_style' || brand === 'uv_flatbed' || brand === 'without_cable_work') {
      // These are upgrading kit brands
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#upgrading-kit" class="breadcrumb-link">Upgrading Kit</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" class="breadcrumb-link" onclick="loadUpgradingKitProducts('${brand}')">${brand.charAt(0).toUpperCase() + brand.slice(1).replace(/_/g, ' ')} Products</a>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadAllUpgradingKitProducts()" class="breadcrumb-link">Upgrading Kit</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">${brand.charAt(0).toUpperCase() + brand.slice(1).replace(/_/g, ' ')} Products</span>        `;
      }
    } else if (brand === 'material') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Material</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Material</span>
        `;
      }
    } else if (brand.startsWith('material-')) {
      // These are material categories like material-adhevie, material-flex, etc.
      const materialCategory = brand.substring(9); // Remove 'material-' prefix
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#material" class="breadcrumb-link">Material</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" class="breadcrumb-link" onclick="loadMaterialProducts('${materialCategory}')">${materialCategory.charAt(0).toUpperCase() + materialCategory.slice(1)} Materials</a>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadAllMaterialProducts()" class="breadcrumb-link">Material</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">${materialCategory.charAt(0).toUpperCase() + materialCategory.slice(1)} Materials</span>        `;
      }
    } else if (brand.startsWith('led-lcd-')) {
      // These are LED & LCD categories like led-lcd-display, led-lcd-outdoor, etc.
      const ledLcdCategory = brand.substring(8); // Remove 'led-lcd-' prefix
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#led-lcd" class="breadcrumb-link">LED & LCD</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" class="breadcrumb-link" onclick="loadLedLcdProducts('${ledLcdCategory}')">${ledLcdCategory.charAt(0).toUpperCase() + ledLcdCategory.slice(1)} LED & LCD</a>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadAllLedLcdProducts()" class="breadcrumb-link">LED & LCD</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">${ledLcdCategory.charAt(0).toUpperCase() + ledLcdCategory.slice(1)} LED & LCD</span>        `;
      }
    } else if (brand.startsWith('channel-letter-')) {
      // These are Channel Letter categories like channel-letter-aluminum, channel-letter-automatic, etc.
      const channelLetterCategory = brand.substring(15); // Remove 'channel-letter-' prefix
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#channel-letter" class="breadcrumb-link">Channel Letter</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">${channelLetterCategory.charAt(0).toUpperCase() + channelLetterCategory.slice(1)} Channel Letter</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" class="breadcrumb-link" onclick="loadChannelLetterProducts('${channelLetterCategory}')">${channelLetterCategory.charAt(0).toUpperCase() + channelLetterCategory.slice(1)} Channel Letter</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadAllChannelLetterProducts()" class="breadcrumb-link">Channel Letter</a>        `;
      }
    } else if (brand.startsWith('other-')) {
      // These are Other categories like other-spectrophotometer, etc.
      const otherCategory = brand.substring(6); // Remove 'other-' prefix
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#other" class="breadcrumb-link">Other</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">${otherCategory.charAt(0).toUpperCase() + otherCategory.slice(1)} Other Products</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" class="breadcrumb-link" onclick="loadOtherProducts('${otherCategory}')">${otherCategory.charAt(0).toUpperCase() + otherCategory.slice(1)} Other Products</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadAllOtherProducts()" class="breadcrumb-link">Other</a>
        `;
      }
    } else if (brand === 'other') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Other</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Other</span>
        `;
      }
    } else if (brand === 'channel-letter') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Channel Letter</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Channel Letter</span>
        `;
      }
    } else if (brand === 'uvInkjetPrinters') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">UV Inkjet Printers</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">UV Inkjet Printers</span>
        `;
      }
    } else if (brand === 'uvRicohGen6Printers') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#uv-inkjet-printers" class="breadcrumb-link">UV Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Ricoh Gen6 Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadAllUvInkjetPrinters && window.loadAllUvInkjetPrinters()" class="breadcrumb-link">UV Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Ricoh Gen6 Printhead</span>
        `;
      }
    } else if (brand === 'uvInkjetKonica1024iPrinters') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#uv-inkjet-printers" class="breadcrumb-link">UV Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Konica KM1024i Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadAllUvInkjetPrinters && window.loadAllUvInkjetPrinters()" class="breadcrumb-link">UV Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Konica KM1024i Printhead</span>
        `;
      }
    } else if (brand === 'uvFlatbedRicohGen6Printers') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#uv-flatbed-printers" class="breadcrumb-link">UV Flatbed Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Ricoh Gen6 Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadAllUvFlatbedPrinters && window.loadAllUvFlatbedPrinters()" class="breadcrumb-link">UV Flatbed Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Ricoh Gen6 Printhead</span>
        `;
      }
    } else if (brand === 'uvFlatbedRicohGen5Printers') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#uv-flatbed-printers" class="breadcrumb-link">UV Flatbed Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Ricoh Gen5 Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadAllUvFlatbedPrinters && window.loadAllUvFlatbedPrinters()" class="breadcrumb-link">UV Flatbed Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Ricoh Gen5 Printhead</span>
        `;
      }
    } else if (brand === 'uvFlatbedI3200Printers') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#uv-flatbed-printers" class="breadcrumb-link">UV Flatbed Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With I3200 Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadAllUvFlatbedPrinters && window.loadAllUvFlatbedPrinters()" class="breadcrumb-link">UV Flatbed Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With I3200 Printhead</span>
        `;
      }
    } else if (brand === 'uvFlatbedXP600Printers') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#uv-flatbed-printers" class="breadcrumb-link">UV Flatbed Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With XP600 Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadAllUvFlatbedPrinters && window.loadAllUvFlatbedPrinters()" class="breadcrumb-link">UV Flatbed Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With XP600 Printhead</span>
        `;
      }
    } else if (brand === 'uvKonica1024iPrinters') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#uv-flatbed-printers" class="breadcrumb-link">UV Flatbed Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Konica KM1024i Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadAllUvFlatbedPrinters && window.loadAllUvFlatbedPrinters()" class="breadcrumb-link">UV Flatbed Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Konica KM1024i Printhead</span>
        `;
      }
    } else if (brand === 'uvFlatbedPrinters') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">UV Flatbed Printers</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">UV Flatbed Printers</span>
        `;
      }
    } else if (brand === 'uvHybridKonica1024iPrinters') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#uv-hybrid-inkjet-printers" class="breadcrumb-link">Hybrid UV Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Konica KM1024i Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadAllUvHybridPrinters && window.loadAllUvHybridPrinters()" class="breadcrumb-link">Hybrid UV Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Konica KM1024i Printhead</span>
        `;
      }
    } else if (brand === 'uvHybridRicohGen6Printers') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#uv-hybrid-inkjet-printers" class="breadcrumb-link">Hybrid UV Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Ricoh Gen6 Printhead</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadAllUvHybridPrinters && window.loadAllUvHybridPrinters()" class="breadcrumb-link">Hybrid UV Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">With Ricoh Gen6 Printhead</span>
        `;
      }
    } else if (brand === 'uvHybridPrinters') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Hybrid UV Printers</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Hybrid UV Printers</span>
        `;
      }
    } else if (brand === 'doubleSidePrinters') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Double Side Printers</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Double Side Printers</span>
        `;
      }
    } else if (brand === 'doubleSideDirectPrinting') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#inkjet-printers" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#double-side-printers" class="breadcrumb-link">Double Side Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Direct Printing</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadInkjetPrinters()" class="breadcrumb-link">Inkjet Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="window.loadAllDoubleSidePrinters && window.loadAllDoubleSidePrinters()" class="breadcrumb-link">Double Side Printers</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">Direct Printing</span>
        `;
      }
    } else if (brand === 'led-lcd') {
      if (isDetailPage) {
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">LED & LCD</span>
        `;
      } else {
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">LED & LCD</span>
        `;
      }
    } else {
      if (isDetailPage) {
        // On detail page, make brand level clickable to go back to brand listings
        breadcrumbElement.innerHTML = `
          <a href="index.html" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="index.html#printheads" class="breadcrumb-link">Print Heads</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" class="breadcrumb-link" onclick="loadPrintheadProducts('${brand}')">${brand.charAt(0).toUpperCase() + brand.slice(1)} Printheads</a>
        `;
      } else {
        // On index page, brand level is current/non-clickable
        breadcrumbElement.innerHTML = `
          <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">&gt;</span>
          <a href="javascript:void(0)" onclick="loadAllPrintheadProducts()" class="breadcrumb-link">Print Heads</a>
          <span class="breadcrumb-separator">&gt;</span>
          <span class="breadcrumb-current">${brand.charAt(0).toUpperCase() + brand.slice(1)} Printheads</span>
        `;
      }
    }  } else {
    // For homepage (all products), remove breadcrumb completely for clean look
    if (breadcrumbElement) {
      breadcrumbElement.remove();
    }
  }
}

// Function to attach add to cart event listeners
// Temporarily disabled since we're using "View Details" instead of "Add to Cart"
function attachAddToCartListeners() {
  // No-op function - cart functionality is temporarily disabled
  // Original cart functionality is preserved in comments for future reuse
  /*
  document.querySelectorAll('.js-add-to-cart')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const productId = button.dataset.productId;
        
        // Get the quantity from the dropdown
        const productContainer = button.closest('.product-container');
        const quantitySelect = productContainer.querySelector('select');
        const quantity = Number(quantitySelect.value);

        // Call addToCart with the selected quantity
        addToCart(productId, quantity);
        updateCartQuantity();

        // Show the 'Added' message
        const addedMessage = productContainer.querySelector('.added-message');
        if (addedMessage) {
          addedMessage.style.display = 'block';
          setTimeout(() => {
            addedMessage.style.display = 'none';
          }, 2000);
        }
      });
    });
  */
}

// Load default products on page load
document.addEventListener('DOMContentLoaded', () => {
  // Only run on the main index page, not on checkout or other pages
  const isIndexPage = document.querySelector('.products-grid') || document.querySelector('#products-grid');
    if (isIndexPage) {
    // Initialize cart quantity display on page load immediately - temporarily disabled
    // updateCartQuantity();
      // Small delay to ensure sub-header navigation is initialized
    setTimeout(() => {
      // Check for search parameters first
      const urlParams = new URLSearchParams(window.location.search);
      const isSearchRequest = urlParams.has('search');
      
      // If this is a search request, don't load default products - let search system handle it
      if (isSearchRequest) {
        return;
      }
      
      // Check if there's a hash in the URL that should load specific content
      const hash = window.location.hash.substring(1);    
      if (hash) {
        // If there's a hash, let the sub-header navigation handle it instead of loading all products
        // Check if sub-header navigation is available and can handle the hash
        if (window.subHeaderNav && window.subHeaderNav.handleHashNavigation) {
          // Sub-header nav will handle the hash, don't load all products
          return;
        } else {
          // Fallback: wait a bit more for sub-header to initialize
          setTimeout(() => {
            if (window.subHeaderNav && window.subHeaderNav.handleHashNavigation) {
              return;
            } else {
              // If still no sub-header nav, try to handle hash ourselves or load all products
              handleHashFallback(hash);
            }
          }, 200);
          return;
        }
      } else {
        // Only load all products if there's no hash and no search request
        loadAllProducts();
      }
    }, 100);
  }
});

// Initialize hero banner visibility on page load
document.addEventListener('DOMContentLoaded', () => {
  // Show hero banner by default on index page when no hash is present and no search request
  setTimeout(() => {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(window.location.search);
    const isSearchRequest = urlParams.has('search');
    const isIndexPage = document.querySelector('.products-grid') || document.querySelector('#products-grid');
    
    if (isIndexPage && !hash && !isSearchRequest) {
      // Show hero banner for default homepage view only
      showHeroBanner();
        // Initialize hero carousel
      if (!heroCarousel) {
        heroCarousel = new HeroCarousel();
        window.heroCarousel = heroCarousel;
      }
    }
  }, 150);
});

// Fallback function to handle hash navigation when sub-header nav is not available
function handleHashFallback(hash) {
  if (hash === 'print-heads' || hash === 'printheads') {
    if (window.loadAllPrintheadProducts) {
      window.loadAllPrintheadProducts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'print-spare-parts') {
    if (window.loadAllPrintSpareParts) {
      window.loadAllPrintSpareParts();
    } else {
      loadAllProducts();
    }  } else if (hash === 'epson-printer-spare-parts') {
    if (window.loadEpsonPrinterSpareParts) {
      window.loadEpsonPrinterSpareParts();
    } else {
      loadAllProducts();
    }  } else if (hash === 'roland-printer-spare-parts') {
    if (window.loadRolandPrinterSpareParts) {
      window.loadRolandPrinterSpareParts();
    } else {
      loadAllProducts();
    }  } else if (hash === 'canon-printer-spare-parts') {
    if (window.loadCanonPrinterSpareParts) {
      window.loadCanonPrinterSpareParts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'ricoh-printer-spare-parts') {
    if (window.loadRicohPrinterSpareParts) {
      window.loadRicohPrinterSpareParts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'infiniti-challenger-printer-spare-parts') {
    if (window.loadInfinitiChallengerPrinterSpareParts) {
      window.loadInfinitiChallengerPrinterSpareParts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'flora-printer-spare-parts') {
    if (window.loadFloraPrinterSpareParts) {
      window.loadFloraPrinterSpareParts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'galaxy-printer-spare-parts') {
    if (window.loadGalaxyPrinterSpareParts) {
      window.loadGalaxyPrinterSpareParts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'mimaki-printer-spare-parts') {
    if (window.loadMimakiPrinterSpareParts) {
      window.loadMimakiPrinterSpareParts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'mutoh-printer-spare-parts') {
    if (window.loadMutohPrinterSpareParts) {
      window.loadMutohPrinterSpareParts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'wit-color-printer-spare-parts') {
    if (window.loadWitColorPrinterSpareParts) {
      window.loadWitColorPrinterSpareParts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'gongzheng-printer-spare-parts') {
    if (window.loadGongzhengPrinterSpareParts) {
      window.loadGongzhengPrinterSpareParts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'human-printer-spare-parts') {
    if (window.loadHumanPrinterSpareParts) {
      window.loadHumanPrinterSpareParts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'teflon-printer-spare-parts') {
    if (window.loadTeflonPrinterSpareParts) {
      window.loadTeflonPrinterSpareParts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'wiper-printer-spare-parts') {
    if (window.loadWiperPrinterSpareParts) {
      window.loadWiperPrinterSpareParts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'xaar-printer-spare-parts') {
    if (window.loadXaarPrinterSpareParts) {
      window.loadXaarPrinterSpareParts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'toshiba-printer-spare-parts') {
    if (window.loadToshibaPrinterSpareParts) {
      window.loadToshibaPrinterSpareParts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'eco-solvent-inkjet-printers') {
    if (window.loadAllEconomicVersionPrinters) {
      window.loadAllEconomicVersionPrinters();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'solvent-inkjet-printers') {
    if (window.loadAllSolventPrinters) {
      window.loadAllSolventPrinters();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'solvent-km512i-printers') {
    if (window.loadSolventKM512iPrinters) {
      window.loadSolventKM512iPrinters();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'solvent-km1024i-printers') {
    if (window.loadSolventKM1024iPrinters) {
      window.loadSolventKM1024iPrinters();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'uv-inkjet-printers') {
    if (window.loadAllUvInkjetPrinters) {
      window.loadAllUvInkjetPrinters();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'uv-inkjet-printers---with-ricoh-gen6-printhead') {
    if (window.loadUvRicohGen6Printers) {
      window.loadUvRicohGen6Printers();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'uv-ricoh-gen6-printers') {
    // Backward compatibility - redirect to new hash
    window.location.hash = 'uv-inkjet-printers---with-ricoh-gen6-printhead';
    return;
  } else if (hash === 'uv-konica-km1024i-printers') {
    if (window.loadUvKonica1024iPrinters) {
      window.loadUvKonica1024iPrinters();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'uv-flatbed-printers') {
    if (window.loadUvFlatbedPrinters) {
      window.loadUvFlatbedPrinters();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'double-side-printers') {
    if (window.loadAllDoubleSidePrinters) {
      window.loadAllDoubleSidePrinters();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'double-side-printers---direct-printing') {
    if (window.loadDoubleSideDirectPrinting) {
      window.loadDoubleSideDirectPrinting();
    } else {
      loadAllProducts();
    }
  } else if (hash.startsWith('printheads-')) {
    const brand = hash.replace('printheads-', '');
    if (window.loadPrintheadProducts) {
      window.loadPrintheadProducts(brand);
    } else {
      loadAllProducts();
    }
  } else if (hash === 'upgrading-kit') {
    if (window.loadAllUpgradingKitProducts) {
      window.loadAllUpgradingKitProducts();
    } else {
      loadAllProducts();
    }
  } else if (hash === 'material') {
    if (window.loadAllMaterialProducts) {
      window.loadAllMaterialProducts();
    } else {
      loadAllProducts();
    }  } else if (hash.startsWith('material-')) {
    const materialCategory = hash.replace('material-', '');
    if (window.loadMaterialProducts) {
      window.loadMaterialProducts(materialCategory);
    } else {
      loadAllProducts();
    }  } else if (hash === 'led-lcd') {
    if (window.loadAllLedLcdProducts) {
      window.loadAllLedLcdProducts();
    } else {
      loadAllProducts();
    }
  } else if (hash.startsWith('led-lcd-')) {
    const ledLcdCategory = hash.replace('led-lcd-', '');
    if (window.loadLedLcdProducts) {
      window.loadLedLcdProducts(ledLcdCategory);
    } else {
      loadAllProducts();
    }
  } else if (hash === 'channel-letter') {
    if (window.loadAllChannelLetterProducts) {
      window.loadAllChannelLetterProducts();
    } else {
      loadAllProducts();
    }  } else if (hash.startsWith('channel-letter-')) {
    const channelLetterCategory = hash.replace('channel-letter-', '');
    if (window.loadChannelLetterProducts) {
      window.loadChannelLetterProducts(channelLetterCategory);
    } else {
      loadAllProducts();
    }
  } else if (hash === 'other') {
    if (window.loadAllOtherProducts) {
      window.loadAllOtherProducts();
    } else {
      loadAllProducts();
    }
  } else if (hash.startsWith('other-')) {
    const otherCategory = hash.replace('other-', '');
    if (window.loadOtherProducts) {
      window.loadOtherProducts(otherCategory);
    } else {
      loadAllProducts();
    }
  } else if (window.loadSpecificCategory) {
    // Check if hash is being updated by category loading to prevent conflicts
    if (window.updatingHashFromCategory) {
      return;
    }
    
    // Try to handle other category hashes
    const categoryMap = {
      'inkjet-printers': 'Inkjet Printers',
      'inkjetprinters-ecosolvent': 'Eco-Solvent Inkjet Printers',
      'eco-solvent-inkjet-printers': 'Eco-Solvent Inkjet Printers',
      'eco-solvent-xp600-printers': 'Eco-Solvent Inkjet Printers - With XP600 Printhead',
      'eco-solvent-i1600-printers': 'Eco-Solvent Inkjet Printers - With I1600 Printhead',
      'eco-solvent-i3200-printers': 'Eco-Solvent Inkjet Printers - With I3200 Printhead',
      'eco-solvent-inkjet-printers---with-xp600-printhead': 'Eco-Solvent Inkjet Printers - With XP600 Printhead',
      'eco-solvent-inkjet-printers---with-i1600-printhead': 'Eco-Solvent Inkjet Printers - With I1600 Printhead',
      'eco-solvent-inkjet-printers---with-i3200-printhead': 'Eco-Solvent Inkjet Printers - With I3200 Printhead',
      'solvent-inkjet-printers': 'Solvent Inkjet Printers',
      'solvent-km512i-printers': 'Solvent Inkjet Printers - With Konica KM512i Printhead',
      'solvent-km1024i-printers': 'Solvent Inkjet Printers - With Konica KM1024i Printhead',
      'solvent-ricoh-gen5-printers': 'Solvent Inkjet Printers - With Ricoh Gen5 Printhead',
      'solvent-ricoh-gen6-printers': 'Solvent Inkjet Printers - With Ricoh Gen6 Printhead',
      'uv-inkjet-printers': 'UV Inkjet Printers',
      'uv-inkjet-printers---with-ricoh-gen6-printhead': 'UV Inkjet Printers - With Ricoh Gen6 Printhead',
      'uv-konica-km1024i-printers': 'UV Inkjet Printers - With Konica KM1024i Printhead',
      'uv-flatbed-printers': 'UV Flatbed Printers',
      'sublimation-printers': 'Sublimation Printers',
      'sublimation-xp600-printers': 'Sublimation Printers - With XP600 Printhead',
      'sublimation-i1600-printers': 'Sublimation Printers - With I1600 Printhead',
      'sublimation-i3200-printers': 'Sublimation Printers - With I3200 Printhead',
      'sublimation-printers---with-xp600-printhead': 'Sublimation Printers - With XP600 Printhead',
      'sublimation-printers---with-i1600-printhead': 'Sublimation Printers - With I1600 Printhead',
      'sublimation-printers---with-i3200-printhead': 'Sublimation Printers - With I3200 Printhead',
      'print-spare-parts': 'Print Spare Parts',
      'upgrading-kit': 'Upgrading Kit',
      'material': 'Material',
      'led-lcd': 'LED & LCD',
      'laser': 'Laser',
      'cutting': 'Cutting',
      'channel-letter': 'Channel Letter',
      'cnc': 'CNC',
      'displays': 'Displays',
      'other': 'Other'
    };
    
    if (categoryMap[hash]) {
      window.loadSpecificCategory(categoryMap[hash]);
    } else {
      loadAllProducts();
    }
  } else {
    loadAllProducts();
  }
}

function updateCartQuantity() {
  // Temporarily disabled since cart is hidden from header
  // Original cart quantity functionality is preserved for future reuse
  /*
  let cartQuantity = 0;
  cart.forEach((cartItem) => {
    cartQuantity += cartItem.quantity;
  });
  
  const cartQuantityElement = document.querySelector('.js-cart-quantity');
  if (cartQuantityElement) {
    cartQuantityElement.innerHTML = cartQuantity;
  }
  */
}

// Function to find any product by ID (regular, printhead, print spare parts, or upgrading kit)
export function findProductById(productId) {
  // First check regular products
  let product = products.find(p => p.id === productId);
  
  // If not found, check printhead products
  if (!product) {
    for (const brand in printheadProducts) {
      const brandProducts = printheadProducts[brand];
      product = brandProducts.find(p => p.id === productId);
      if (product) break;
    }
  }
  
  // If not found, check print spare part products
  if (!product) {
    for (const brand in printSparePartProducts) {
      const brandProducts = printSparePartProducts[brand];
      product = brandProducts.find(p => p.id === productId);
      if (product) break;
    }
  }
  
  // If not found, check upgrading kit products
  if (!product) {
    for (const brand in upgradingKitProducts) {
      const brandProducts = upgradingKitProducts[brand];
      product = brandProducts.find(p => p.id === productId);
      if (product) break;
    }
  }
  
  return product;
}

// Function to highlight selected menu item
function highlightSelectedMenuItem(brand) {
  // Remove the 'selected-brand' class from all submenu items
  document.querySelectorAll('.department-link.selected-brand').forEach(link => {
    link.classList.remove('selected-brand');
  });

  // Add the 'selected-brand' class to the currently selected submenu item
  if (brand && brand !== 'all') {
    const brandLink = document.querySelector(`[onclick="loadPrintheadProducts('${brand}')"]`);
    if (brandLink) {
      brandLink.classList.add('selected-brand');
    }
  } else {
    // Highlight "All Products" if showing all products
    const allProductsLink = document.querySelector(`[onclick="loadAllProducts()"]`);
    if (allProductsLink) {
      allProductsLink.classList.add('selected-brand');
    }
  }
}

// Add click handler for printhead submenu items to auto-collapse
document.addEventListener('DOMContentLoaded', () => {
  // Add click listeners to all printhead submenu items
  const printheadLinks = document.querySelectorAll('[onclick*="loadPrintheadProducts"]');
  printheadLinks.forEach(link => {
    link.addEventListener('click', function() {
      // No direct style changes here! Only rely on .selected-brand class
    });
  });
  
  // Add click listener to "All Products" link
  const allProductsLink = document.querySelector('[onclick="loadAllProducts()"]');
  if (allProductsLink) {
    allProductsLink.addEventListener('click', function() {
      // No direct style changes here! Only rely on .selected-brand class
    });
  }
});

// --- Highlight sub-header link when sidebar is clicked (handles nested/child links) ---
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.department-link').forEach(link => {
    link.addEventListener('click', function(e) {
      // Find the main sidebar category for this link
      let sidebarCategory = link.textContent.trim();
      // If this is a child link, try to get the parent expandable's text
      const expandableParent = link.closest('.department-group, .department-subgroup');
      let mainCategory = sidebarCategory;
      if (expandableParent) {
        const parentExpandable = expandableParent.querySelector('.expandable');
        if (parentExpandable && parentExpandable !== link) {
          mainCategory = parentExpandable.textContent.trim();
        }
      }
      // Map sidebar category names to sub-header link names if needed
      const categoryMap = {
        'See All Departments': 'See All Departments',
        'Inkjet Printers': 'Inkjet Printers',
        'Print Heads': 'Print Heads',
        'Print Spare Parts': 'Print Spare Parts',
        'Upgrading Kit': 'Upgrading Kit',
        'Material': 'Material',
        'LED & LCD': 'LED & LCD',
        'Laser': 'Laser',
        'Cutting': 'Cutting',
        'Channel Letter': 'Channel Letter',
        'CNC': 'CNC',
        'Dispalys': 'Displays',
        'Other': 'Other'
      };
      // Use mainCategory if it matches a sub-header, else fallback to sidebarCategory
      const matchCategory = categoryMap[mainCategory] || categoryMap[sidebarCategory];
      document.querySelectorAll('.sub-header-link').forEach(subLink => {
        subLink.classList.remove('active');
        if (matchCategory && subLink.textContent.trim() === matchCategory) {
          subLink.classList.add('active');
        }
      });
    });
  });
});

// Function to handle loading of specific category products
window.loadSpecificCategory = function(categoryName) {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
    // Add loading animation
  showLoadingState();

  // --- Highlight the corresponding nav item (including special sidebar categories) ---
  const subHeaderMap = {
    'Eco-Solvent Inkjet Printers': 'Inkjet Printers',
    'Solvent Inkjet Printers': 'Inkjet Printers',
    'Solvent Inkjet Printers': 'Inkjet Printers',
    'Solvent Inkjet Printers - With Konica KM512i Printhead': 'Inkjet Printers',
    'Solvent Inkjet Printers - With Konica KM512i Printhead': 'Inkjet Printers',
    'Solvent Inkjet Printers - With Konica KM1024i Printhead': 'Inkjet Printers',
    'Solvent Inkjet Printers - With Konica KM1024i Printhead': 'Inkjet Printers',
    'Solvent Inkjet Printers - With Ricoh Gen5 Printhead': 'Inkjet Printers',
    'Solvent Inkjet Printers - With Ricoh Gen5 Printhead': 'Inkjet Printers',
    'Solvent Inkjet Printers - With Ricoh Gen6 Printhead': 'Inkjet Printers',
    'Solvent Inkjet Printers - With Ricoh Gen6 Printhead': 'Inkjet Printers',
    'UV Inkjet Printers': 'Inkjet Printers',
    'UV Inkjet Printers - With Ricoh Gen6 Printhead': 'Inkjet Printers',
    'UV Inkjet Printers - With Konica KM1024i Printhead': 'Inkjet Printers',
    'UV Flatbed Printers': 'Inkjet Printers',
    'UV Flatbed Printers - With Ricoh Gen6 Printhead': 'Inkjet Printers',
    'UV Flatbed Printers - With Ricoh Gen5 Printhead': 'Inkjet Printers',
    'UV Flatbed Printers - With I3200 Printhead': 'Inkjet Printers',
    'UV Flatbed Printers - With XP600 Printhead': 'Inkjet Printers',
    'UV Flatbed Printers - With Konica KM1024i Printhead': 'Inkjet Printers',
    'UV Flatbed Printers - With Konica KM1024i Printheads': 'Inkjet Printers',
    'UV Hybrid Inkjet Printer': 'Inkjet Printers',
    'UV Hybrid Inkjet Printer - With Konica KM1024i Printheads': 'Inkjet Printers',
    'UV Hybrid Inkjet Printer - With Konica KM1024i Printhead': 'Inkjet Printers',
    'UV Hybrid Inkjet Printer - With Ricoh Gen6 Printheads': 'Inkjet Printers',
    'UV Hybrid Inkjet Printer - With Ricoh Gen6 Printhead': 'Inkjet Printers',
    'Sublimation Printers': 'Inkjet Printers',
    'Double Side Printers': 'Inkjet Printers',
    'Epson Printer Spare Parts': 'Print Spare Parts',
    'Roland Printer Spare Parts': 'Print Spare Parts',
    'Canon Printer Spare Parts': 'Print Spare Parts',
    'Ricoh Printer Spare Parts': 'Print Spare Parts',
    // fallback: categoryName itself
  };
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (
      link.textContent.trim() === (subHeaderMap[categoryName] || categoryName)
    ) {
      link.classList.add('active');
    }
  });

  // Convert category for use in hash navigation
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '');

  // Update URL hash without triggering a navigation (unless prevented by flag)
  if (!window.preventHashUpdate) {
    // Add a flag to prevent recursive navigation
    window.updatingHashFromCategory = true;
    if (history.pushState) {
      history.pushState(null, null, `#${categorySlug}`);
    } else {
      location.hash = `#${categorySlug}`;
    }
    // Clear the flag after a short delay
    setTimeout(() => {
      window.updatingHashFromCategory = false;
    }, 100);
  }
  // Small delay for smooth transition
  setTimeout(() => {    
    // Special handling for economic version printers
    if (categoryName === 'Eco-Solvent Inkjet Printers') {
      // Use the new economic version printers function
      if (window.loadAllEconomicVersionPrinters) {
        window.loadAllEconomicVersionPrinters();
        return;
      }
    }
    
    // Special handling for printer categories
    if (categoryName === 'Inkjet Printers') {
      // Load all inkjet printer products (eco-solvent + solvent + others)
      const ecoSolventPrinters = getAllEcoSolventPrinters();
      const solventPrinters = getAllSolventPrinters();
      const dtfPrinters = inkjetPrinterProducts.dtf_printer || [];
      const uvDtfPrinters = inkjetPrinterProducts.uv_dtf || [];
      const sublimationPrinters = inkjetPrinterProducts.sublimation || [];
      const uvInkjetPrinters = inkjetPrinterProducts.amo_uv_inkjet || [];
      const uvFlatbedPrinters = inkjetPrinterProducts.uv_flatbed || [];
      const hybridUvPrinters = inkjetPrinterProducts.hybrid_uv || [];
      const doubleSidePrinters = inkjetPrinterProducts.double_side || [];
      
      const allPrinters = [
        ...ecoSolventPrinters,
        ...solventPrinters,
        ...dtfPrinters,
        ...uvDtfPrinters,
        ...sublimationPrinters,
        ...uvInkjetPrinters,
        ...uvFlatbedPrinters,
        ...hybridUvPrinters,
        ...doubleSidePrinters
      ];
      
      const productsHTML = renderProducts(allPrinters, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Inkjet Printers', allPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('inkjetPrinters');
    } else if (categoryName === 'Eco-Solvent Inkjet Printers - With XP600 Printhead') {
      // Load XP600 printers instead of showing placeholder
      const xp600Printers = getEcoSolventXP600Printers();
      const productsHTML = renderProducts(xp600Printers, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('XP600 Eco-Solvent Inkjet Printers', xp600Printers.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('xp600Printers');    } else if (categoryName === 'Eco-Solvent Inkjet Printers - With I1600 Printhead') {
      // Load I1600 printers instead of showing placeholder
      const i1600Printers = getEcoSolventI1600Printers();
      const productsHTML = renderProducts(i1600Printers, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Printers with I1600 Printhead', i1600Printers.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('i1600Printers');    } else if (categoryName === 'Eco-Solvent Inkjet Printers - With I3200 Printhead') {
      // Load I3200 printers instead of showing placeholder
      const i3200Printers = getEcoSolventI3200Printers();
      const productsHTML = renderProducts(i3200Printers, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Printers with I3200 Printhead', i3200Printers.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('i3200Printers');
    } else if (categoryName === 'Solvent Inkjet Printers') {
      // Load all solvent printer products
      const allSolventPrinters = getAllSolventPrinters();
      
      const productsHTML = renderProducts(allSolventPrinters, 'solventprinter');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Solvent Inkjet Printers', allSolventPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('solventPrinters');
    } else if (categoryName === 'Solvent Inkjet Printers') {
      // Load all solvent printer products (handle the typo from sidebar)
      const allSolventPrinters = getAllSolventPrinters();
      
      const productsHTML = renderProducts(allSolventPrinters, 'solventprinter');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Solvent Inkjet Printers', allSolventPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('solventPrinters');
    } else if (categoryName === 'Solvent Inkjet Printers - With Konica KM512i Printhead') {
      // Load KM512i solvent printers
      const km512iPrinters = getSolventKM512iPrinters();
      const productsHTML = renderProducts(km512iPrinters, 'solventprinter');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Solvent Inkjet Printers - With Konica KM512i Printhead', km512iPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('solventKM512iPrinters');
    } else if (categoryName === 'Solvent Inkjet Printers - With Konica KM1024i Printhead') {
      // Load KM1024i solvent printers
      const km1024iPrinters = getSolventKM1024iPrinters();
      const productsHTML = renderProducts(km1024iPrinters, 'solventprinter');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Solvent Inkjet Printers - With Konica KM1024i Printhead', km1024iPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('solventKM1024iPrinters');
    } else if (categoryName === 'Solvent Inkjet Printers - With Konica KM512i Printhead') {
      // Load KM512i solvent printers (corrected spelling)
      const km512iPrinters = getSolventKM512iPrinters();
      const productsHTML = renderProducts(km512iPrinters, 'solventprinter');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Solvent Inkjet Printers - With Konica KM512i Printhead', km512iPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('solventKM512iPrinters');
    } else if (categoryName === 'Solvent Inkjet Printers - With Konica KM1024i Printhead') {
      // Load KM1024i solvent printers (corrected spelling)
      const km1024iPrinters = getSolventKM1024iPrinters();
      const productsHTML = renderProducts(km1024iPrinters, 'solventprinter');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Solvent Inkjet Printers - With Konica KM1024i Printhead', km1024iPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('solventKM1024iPrinters');
    } else if (categoryName === 'Solvent Inkjet Printers - With Ricoh Gen5 Printhead') {
      // Load Ricoh Gen5 solvent printers (corrected spelling)
      const ricohGen5Printers = getSolventRicohGen5Printers();
      const productsHTML = renderProducts(ricohGen5Printers, 'solventprinter');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Solvent Inkjet Printers - With Ricoh Gen5 Printhead', ricohGen5Printers.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('solventRicohGen5Printers');
    } else if (categoryName === 'Solvent Inkjet Printers - With Ricoh Gen6 Printhead') {
      // Load Ricoh Gen6 solvent printers (corrected spelling)
      const ricohGen6Printers = getSolventRicohGen6Printers();
      const productsHTML = renderProducts(ricohGen6Printers, 'solventprinter');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Solvent Inkjet Printers - With Ricoh Gen6 Printhead', ricohGen6Printers.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('solventRicohGen6Printers');
    } else if (categoryName === 'UV Inkjet Printers') {
      // Load UV inkjet printers
      const uvPrinters = getAllUvInkjetPrinters();
      const productsHTML = renderProducts(uvPrinters, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('UV Inkjet Printers', uvPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('uvInkjetPrinters');
    } else if (categoryName === 'UV Inkjet Printers - With Ricoh Gen6 Printhead') {
      // Load UV inkjet printers with Ricoh Gen6 printhead
      const uvRicohGen6Printers = getUvRicohGen6Printers();
      const productsHTML = renderProducts(uvRicohGen6Printers, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('UV Inkjet Printers - With Ricoh Gen6 Printhead', uvRicohGen6Printers.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('uvRicohGen6Printers');
    } else if (categoryName === 'UV Inkjet Printers - With Konica KM1024i Printhead') {
      // Load UV inkjet printers with Konica KM1024i printhead
      const uvInkjetKonica1024iPrinters = getUvInkjetKonica1024iPrinters();
      const productsHTML = renderProducts(uvInkjetKonica1024iPrinters, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('UV Inkjet Printers - With Konica KM1024i Printhead', uvInkjetKonica1024iPrinters.length);
      
      // Update breadcrumb navigation (UV Inkjet path)
      updateBreadcrumb('uvInkjetKonica1024iPrinters');
    } else if (categoryName === 'UV Flatbed Printers - With Konica KM1024i Printhead' || categoryName === 'UV Flatbed Printers - With Konica KM1024i Printheads') {
      // Load UV flatbed printers with Konica KM1024i printhead
      const uvKonica1024iPrinters = getUvKonica1024iPrinters();
      const productsHTML = renderProducts(uvKonica1024iPrinters, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('UV Flatbed Printers - With Konica KM1024i Printhead', uvKonica1024iPrinters.length);
      
      // Update breadcrumb navigation (UV Flatbed path)
      updateBreadcrumb('uvKonica1024iPrinters');
    } else if (categoryName === 'UV Flatbed Printers - With Ricoh Gen6 Printhead') {
      // Load UV flatbed printers with Ricoh Gen6 printhead
      const uvFlatbedRicohGen6Printers = getUvFlatbedRicohGen6Printers();
      const productsHTML = renderProducts(uvFlatbedRicohGen6Printers, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('UV Flatbed Printers - With Ricoh Gen6 Printhead', uvFlatbedRicohGen6Printers.length);
      
      // Update breadcrumb navigation (UV Flatbed path)
      updateBreadcrumb('uvFlatbedRicohGen6Printers');
    } else if (categoryName === 'UV Flatbed Printers - With Ricoh Gen5 Printhead') {
      // Load UV flatbed printers with Ricoh Gen5 printhead
      const uvFlatbedRicohGen5Printers = getUvFlatbedRicohGen5Printers();
      const productsHTML = renderProducts(uvFlatbedRicohGen5Printers, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('UV Flatbed Printers - With Ricoh Gen5 Printhead', uvFlatbedRicohGen5Printers.length);
      
      // Update breadcrumb navigation (UV Flatbed path)
      updateBreadcrumb('uvFlatbedRicohGen5Printers');
    } else if (categoryName === 'UV Flatbed Printers - With I3200 Printhead') {
      // Load UV flatbed printers with I3200 printhead
      const uvFlatbedI3200Printers = getUvFlatbedI3200Printers();
      const productsHTML = renderProducts(uvFlatbedI3200Printers, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('UV Flatbed Printers - With I3200 Printhead', uvFlatbedI3200Printers.length);
      
      // Update breadcrumb navigation (UV Flatbed path)
      updateBreadcrumb('uvFlatbedI3200Printers');
    } else if (categoryName === 'UV Flatbed Printers - With XP600 Printhead') {
      // Load UV flatbed printers with XP600 printhead
      const uvFlatbedXP600Printers = getUvFlatbedXP600Printers();
      const productsHTML = renderProducts(uvFlatbedXP600Printers, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('UV Flatbed Printers - With XP600 Printhead', uvFlatbedXP600Printers.length);
      
      // Update breadcrumb navigation (UV Flatbed path)
      updateBreadcrumb('uvFlatbedXP600Printers');
    } else if (categoryName === 'UV Flatbed Printers') {
      // Load UV flatbed printers
      const uvFlatbedPrinters = getUvFlatbedPrinters();
      const productsHTML = renderProducts(uvFlatbedPrinters, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('UV Flatbed Printers', uvFlatbedPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('uvFlatbedPrinters');
    } else if (categoryName === 'UV Hybrid Inkjet Printer') {
      // Load all UV hybrid inkjet printers
      const uvHybridPrinters = getAllUvHybridPrinters();
      const productsHTML = renderProducts(uvHybridPrinters, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Hybrid UV Printers', uvHybridPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('uvHybridPrinters');
    } else if (categoryName === 'UV Hybrid Inkjet Printer - With Konica KM1024i Printheads' || categoryName === 'UV Hybrid Inkjet Printer - With Konica KM1024i Printhead') {
      // Load UV hybrid inkjet printers with Konica KM1024i printhead
      const uvHybridKonica1024iPrinters = getUvHybridKonica1024iPrinters();
      const productsHTML = renderProducts(uvHybridKonica1024iPrinters, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Hybrid UV Printers - With Konica KM1024i Printhead', uvHybridKonica1024iPrinters.length);
      
      // Update breadcrumb navigation (UV Hybrid path)
      updateBreadcrumb('uvHybridKonica1024iPrinters');
    } else if (categoryName === 'UV Hybrid Inkjet Printer - With Ricoh Gen6 Printheads' || categoryName === 'UV Hybrid Inkjet Printer - With Ricoh Gen6 Printhead') {
      // Load UV hybrid inkjet printers with Ricoh Gen6 printhead
      const uvHybridRicohGen6Printers = getUvHybridRicohGen6Printers();
      const productsHTML = renderProducts(uvHybridRicohGen6Printers, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Hybrid UV Printers - With Ricoh Gen6 Printhead', uvHybridRicohGen6Printers.length);
      
      // Update breadcrumb navigation (UV Hybrid path)
      updateBreadcrumb('uvHybridRicohGen6Printers');
    } else if (categoryName === 'Print Spare Parts') {
      // Load all print spare parts
      let allPrintSpareParts = [];
      for (const category in printSparePartProducts) {
        allPrintSpareParts = allPrintSpareParts.concat(printSparePartProducts[category]);
      }
      
      const productsHTML = renderProducts(allPrintSpareParts, 'printsparepart');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Print Spare Parts', allPrintSpareParts.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('printSpareParts');    } else if (categoryName === 'Epson Printer Spare Parts') {
      // Load Epson printer spare parts specifically
      const epsonSpareParts = printSparePartProducts.epson || [];
      
      const productsHTML = renderProducts(epsonSpareParts, 'printsparepart');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
        // Update page header
      updatePageHeader('Epson Printer Spare Parts', epsonSpareParts.length);
      
      // Update breadcrumb
      let breadcrumbElement = document.querySelector('.breadcrumb-nav');
      if (!breadcrumbElement) {
        breadcrumbElement = document.createElement('div');
        breadcrumbElement.className = 'breadcrumb-nav';

        const mainElement = document.querySelector('.main');
        mainElement.insertBefore(breadcrumbElement, mainElement.firstChild);
      }      breadcrumbElement.innerHTML = `
        <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
        <span class="breadcrumb-separator">&gt;</span>
        <a href="javascript:void(0)" onclick="window.loadSpecificCategory && window.loadSpecificCategory('Print Spare Parts')" class="breadcrumb-link">Print Spare Parts</a>
        <span class="breadcrumb-separator">&gt;</span>
        <span class="breadcrumb-current">Epson Printer Spare Parts</span>
      `;    } else if (categoryName === 'Roland Printer Spare Parts') {
      // Load Roland printer spare parts specifically
      const rolandSpareParts = printSparePartProducts.roland || [];
      
      const productsHTML = renderProducts(rolandSpareParts, 'printsparepart');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the
      attachAddToCartListeners();
        // Update page header
      updatePageHeader('Roland Printer Spare Parts', rolandSpareParts.length);
      
      // Update breadcrumb      let breadcrumbElement = document.querySelector('.breadcrumb-nav');
      if (!breadcrumbElement) {
        breadcrumbElement = document.createElement('div');
        breadcrumbElement.className = 'breadcrumb-nav';

        const mainElement = document.querySelector('.main');
        mainElement.insertBefore(breadcrumbElement, mainElement.firstChild);
      }
      breadcrumbElement.innerHTML = `
        <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
        <span class="breadcrumb-separator">&gt;</span>
        <a href="javascript:void(0)" onclick="window.loadSpecificCategory && window.loadSpecificCategory('Print Spare Parts')" class="breadcrumb-link">Print Spare Parts</a>
        <span class="breadcrumb-separator">&gt;</span>
        <span class="breadcrumb-current">Roland Printer Spare Parts</span>
      `;    } else if (categoryName === 'Canon Printer Spare Parts') {
      // Load Canon printer spare parts specifically
      const canonSpareParts = printSparePartProducts.canon || [];
      
      const productsHTML = renderProducts(canonSpareParts, 'printsparepart');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
        // Update page header
      updatePageHeader('Canon Printer Spare Parts', canonSpareParts.length);
      
      // Update breadcrumb
      let breadcrumbElement = document.querySelector('.breadcrumb-nav');
      if (!breadcrumbElement) {
        breadcrumbElement = document.createElement('div');
        breadcrumbElement.className = 'breadcrumb-nav';

        const mainElement = document.querySelector('.main');
        mainElement.insertBefore(breadcrumbElement, mainElement.firstChild);
      }      breadcrumbElement.innerHTML = `
        <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
        <span class="breadcrumb-separator">&gt;</span>
        <a href="javascript:void(0)" onclick="window.loadSpecificCategory && window.loadSpecificCategory('Print Spare Parts')" class="breadcrumb-link">Print Spare Parts</a>
        <span class="breadcrumb-separator">&gt;</span>
        <span class="breadcrumb-current">Canon Printer Spare Parts</span>
      `;    } else if (categoryName === 'Ricoh Printer Spare Parts') {
      // Load Ricoh printer spare parts specifically
      const ricohSpareParts = printSparePartProducts.ricoh || [];
      
      const productsHTML = renderProducts(ricohSpareParts, 'printsparepart');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
        // Update page header
      updatePageHeader('Ricoh Printer Spare Parts', ricohSpareParts.length);
      
      // Update breadcrumb
      let breadcrumbElement = document.querySelector('.breadcrumb-nav');
      if (!breadcrumbElement) {
        breadcrumbElement = document.createElement('div');
        breadcrumbElement.className = 'breadcrumb-nav';

        const mainElement = document.querySelector('.main');
        mainElement.insertBefore(breadcrumbElement, mainElement.firstChild);
      }      breadcrumbElement.innerHTML = `
        <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
        <span class="breadcrumb-separator">&gt;</span>
        <a href="javascript:void(0)" onclick="window.loadSpecificCategory && window.loadSpecificCategory('Print Spare Parts')" class="breadcrumb-link">Print Spare Parts</a>
        <span class="breadcrumb-separator">&gt;</span>
        <span class="breadcrumb-current">Ricoh Printer Spare Parts</span>
      `;
    } else if (categoryName === 'Upgrading Kit') {
      // Load all upgrading kit products
      let allUpgradingKitProducts = [];
      for (const brand in upgradingKitProducts) {
        allUpgradingKitProducts = allUpgradingKitProducts.concat(upgradingKitProducts[brand]);
      }
      
      const productsHTML = renderProducts(allUpgradingKitProducts, 'upgradingkit');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
        // Update page header
      updatePageHeader('Upgrading Kit', allUpgradingKitProducts.length);
      
      // Update breadcrumb
      let breadcrumbElement = document.querySelector('.breadcrumb-nav');
      if (!breadcrumbElement) {
        breadcrumbElement = document.createElement('div');
        breadcrumbElement.className = 'breadcrumb-nav';

        const mainElement = document.querySelector('.main');
        mainElement.insertBefore(breadcrumbElement, mainElement.firstChild);
      }
      breadcrumbElement.innerHTML = `
        <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
        <span class="breadcrumb-separator">&gt;</span>
        <span class="breadcrumb-current">Upgrading Kit</span>
      `;
    } else if (categoryName === 'DTF Printer') {
      // Load DTF printer products specifically
      const dtfPrinters = getAllDTFPrinters();
      
      const productsHTML = renderProducts(dtfPrinters, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('DTF Printers', dtfPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('dtfPrinters');
    } else if (categoryName === 'UV DTF Printer') {
      // Load UV DTF printer products specifically
      const uvDtfPrinters = getAllUVDTFPrinters();
      
      const productsHTML = renderProducts(uvDtfPrinters, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('UV DTF Printers', uvDtfPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('uvDtfPrinters');
    } else if (categoryName === 'Direct to Fabric & Film') {
      // Load all Direct to Fabric & Film printers (DTF + UV DTF)
      const dtfPrinters = getAllDTFPrinters();
      const uvDtfPrinters = getAllUVDTFPrinters();
      const allDirectToFabricFilmPrinters = [...dtfPrinters, ...uvDtfPrinters];
      
      const productsHTML = renderProducts(allDirectToFabricFilmPrinters, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Direct to Fabric & Film Printers', allDirectToFabricFilmPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('directToFabricFilm');
    } else if (categoryName === 'Sublimation Printers') {
      // Load sublimation printer products specifically
      const sublimationPrinters = inkjetPrinterProducts.sublimation || [];
      
      const productsHTML = renderProducts(sublimationPrinters, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Sublimation Printers', sublimationPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('sublimationPrinters');
    } else if (categoryName === 'Sublimation Printers - With XP600 Printhead') {
      // Filter sublimation printers with XP600 printhead
      const allSublimationPrinters = inkjetPrinterProducts.sublimation || [];
      const xp600SublimationPrinters = allSublimationPrinters.filter(printer => 
        printer.name.toLowerCase().includes('xp600') || 
        printer.name.toLowerCase().includes('xp-600')
      );
      
      const productsHTML = renderProducts(xp600SublimationPrinters, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Sublimation Printers - With XP600 Printhead', xp600SublimationPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('sublimationXP600Printers');
    } else if (categoryName === 'Sublimation Printers - With I1600 Printhead') {
      // Filter sublimation printers with I1600 printhead
      const allSublimationPrinters = inkjetPrinterProducts.sublimation || [];
      const i1600SublimationPrinters = allSublimationPrinters.filter(printer => 
        printer.name.toLowerCase().includes('i1600') || 
        printer.name.toLowerCase().includes('i-1600')
      );
      
      const productsHTML = renderProducts(i1600SublimationPrinters, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Sublimation Printers - With I1600 Printhead', i1600SublimationPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('sublimationI1600Printers');
    } else if (categoryName === 'Sublimation Printers - With I3200 Printhead') {
      // Filter sublimation printers with I3200 printhead
      const allSublimationPrinters = inkjetPrinterProducts.sublimation || [];
      const i3200SublimationPrinters = allSublimationPrinters.filter(printer => 
        printer.name.toLowerCase().includes('i3200') || 
        printer.name.toLowerCase().includes('i-3200')
      );
      
      const productsHTML = renderProducts(i3200SublimationPrinters, 'printer');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
      
      // Update page header
      updatePageHeader('Sublimation Printers - With I3200 Printhead', i3200SublimationPrinters.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb('sublimationI3200Printers');
    } else {
      // For other categories, show placeholder content
      const message = `<div class="coming-soon">
        <h2>${categoryName} Products</h2>
        <p>Products for this category will be available soon!</p>
      </div>`;
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = message;
      productsGrid.classList.add('showing-coming-soon');

      // Update page header
      updatePageHeader(categoryName);

      // Update breadcrumb
      let breadcrumbElement = document.querySelector('.breadcrumb-nav');
      if (!breadcrumbElement) {
        breadcrumbElement = document.createElement('div');
        breadcrumbElement.className = 'breadcrumb-nav';

        const mainElement = document.querySelector('.main');
        mainElement.insertBefore(breadcrumbElement, mainElement.firstChild);
      }
      breadcrumbElement.innerHTML = `
        <a href="javascript:void(0)" onclick="loadAllProducts()" class="breadcrumb-link">Home</a>
        <span class="breadcrumb-separator">&gt;</span>
        <span class="breadcrumb-current">${categoryName}</span>
      `;
    }

    // Scroll to products
    scrollToProducts();
  }, 200);
};

// Function to load Inkjet Printers
window.loadInkjetPrinters = function() {
  window.loadSpecificCategory('Inkjet Printers');
};

// Function to load Print Spare Parts  
window.loadPrintSpareParts = function() {
  window.loadSpecificCategory('Print Spare Parts');
};

// Function to load all print spare parts
window.loadAllPrintSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Print Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Get all print spare parts
    let allPrintSpareParts = [];
    for (const category in printSparePartProducts) {
      allPrintSpareParts = allPrintSpareParts.concat(printSparePartProducts[category]);
    }
    
    const productsHTML = renderProducts(allPrintSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title or add a header to show print spare parts category
    updatePageHeader('Print Spare Parts', allPrintSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('printSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Epson Printer Spare Parts specifically
window.loadEpsonPrinterSpareParts = function() {
  // Hide the submenu after selection

  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Epson Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {    // Get Epson printer spare parts
    const epsonSpareParts = printSparePartProducts.epson || [];
    
    const productsHTML = renderProducts(epsonSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title or add a header to show Epson printer spare parts category
    updatePageHeader('Epson Printer Spare Parts', epsonSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('epsonPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Roland Printer Spare Parts specifically
window.loadRolandPrinterSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Roland Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {    // Get Roland printer spare parts
    const rolandSpareParts = printSparePartProducts.roland || [];
    
    const productsHTML = renderProducts(rolandSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title or add a header to show Roland printer spare parts category
    updatePageHeader('Roland Printer Spare Parts', rolandSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('rolandPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Canon Printer Spare Parts specifically
window.loadCanonPrinterSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Canon Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {    // Get Canon printer spare parts
    const canonSpareParts = printSparePartProducts.canon || [];
    
    const productsHTML = renderProducts(canonSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title or add a header to show Canon printer spare parts category
    updatePageHeader('Canon Printer Spare Parts', canonSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('canonPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Ricoh Printer Spare Parts specifically
window.loadRicohPrinterSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Ricoh Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {    // Get Ricoh printer spare parts
    const ricohSpareParts = printSparePartProducts.ricoh || [];
    
    const productsHTML = renderProducts(ricohSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title or add a header to show Ricoh printer spare parts category
    updatePageHeader('Ricoh Printer Spare Parts', ricohSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('ricohPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Infiniti/Challenger Printer Spare Parts specifically
window.loadInfinitiChallengerPrinterSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Infiniti / Challenger Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Get Infiniti/Challenger printer spare parts
    const infinitiChallengerSpareParts = printSparePartProducts.infiniti_challenger || [];
    
    const productsHTML = renderProducts(infinitiChallengerSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title or add a header to show Infiniti/Challenger printer spare parts category
    updatePageHeader('Infiniti / Challenger Printer Spare Parts', infinitiChallengerSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('infinitiChallengerPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Flora Printer Spare Parts specifically
window.loadFloraPrinterSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Flora Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Get Flora printer spare parts
    const floraSpareParts = printSparePartProducts.flora || [];
    
    const productsHTML = renderProducts(floraSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title or add a header to show Flora printer spare parts category
    updatePageHeader('Flora Printer Spare Parts', floraSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('floraPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Galaxy Printer Spare Parts specifically
window.loadGalaxyPrinterSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Galaxy Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition

  setTimeout(() => {
    // Get Galaxy printer spare parts
    const galaxySpareParts = printSparePartProducts.galaxy || [];
    
    const productsHTML = renderProducts(galaxySpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title or add a header to show Galaxy printer spare parts category
    updatePageHeader('Galaxy Printer Spare Parts', galaxySpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('galaxyPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Mimaki Printer Spare Parts specifically
window.loadMimakiPrinterSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Mimaki Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Get Mimaki printer spare parts
    const mimakiSpareParts = printSparePartProducts.mimaki || [];
    
    const productsHTML = renderProducts(mimakiSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title or add a header to show Mimaki printer spare parts category
    updatePageHeader('Mimaki Printer Spare Parts', mimakiSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('mimakiPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Mutoh Printer Spare Parts specifically
window.loadMutohPrinterSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Mutoh Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Get Mutoh printer spare parts
    const mutohSpareParts = printSparePartProducts.mutoh || [];
    
    const productsHTML = renderProducts(mutohSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
    
    // Update page title or add a header to show Mutoh printer spare parts category
    updatePageHeader('Mutoh Printer Spare Parts', mutohSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('mutohPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Wit-color Printer Spare Parts specifically
window.loadWitColorPrinterSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Wit-color Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Get Wit-color printer spare parts
    const witcolorSpareParts = printSparePartProducts.witcolor || [];
    
    const productsHTML = renderProducts(witcolorSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
    
    // Update page title or add a header to show Wit-color printer spare parts category
    updatePageHeader('Wit-color Printer Spare Parts', witcolorSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('witColorPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Gongzheng Printer Spare Parts specifically
window.loadGongzhengPrinterSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Gongzheng Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Get Gongzheng printer spare parts
    const gongzhengSpareParts = printSparePartProducts.gongzheng || [];
    
    const productsHTML = renderProducts(gongzhengSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
    
    // Update page title or add a header to show Gongzheng printer spare parts category
    updatePageHeader('Gongzheng Printer Spare Parts', gongzhengSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('gongzhengPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Human Printer Spare Parts specifically
window.loadHumanPrinterSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Human Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Get Human printer spare parts
    const humanSpareParts = printSparePartProducts.human || [];
    
    const productsHTML = renderProducts(humanSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
    
    // Update page title or add a header to show Human printer spare parts category
    updatePageHeader('Human Printer Spare Parts', humanSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('humanPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Teflon Printer Spare Parts specifically
window.loadTeflonPrinterSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Teflon Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Get Teflon printer spare parts
    const teflonSpareParts = printSparePartProducts.teflon || [];
    
    const productsHTML = renderProducts(teflonSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
    
    // Update page title or add a header to show Teflon printer spare parts category
    updatePageHeader('Teflon Printer Spare Parts', teflonSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('teflonPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Wiper Printer Spare Parts specifically
window.loadWiperPrinterSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Wiper Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Get Wiper printer spare parts
    const wiperSpareParts = printSparePartProducts.wiper || [];
    
    const productsHTML = renderProducts(wiperSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
    
    // Update page title or add a header to show Wiper printer spare parts category
    updatePageHeader('Wiper Printer Spare Parts', wiperSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('wiperPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Xaar Printer Spare Parts specifically
window.loadXaarPrinterSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Xaar Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Get Xaar printer spare parts
    const xaarSpareParts = printSparePartProducts.xaar || [];
    
    const productsHTML = renderProducts(xaarSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
    
    // Update page title or add a header to show Xaar printer spare parts category
    updatePageHeader('Xaar Printer Spare Parts', xaarSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('xaarPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load Toshiba Printer Spare Parts specifically
window.loadToshibaPrinterSpareParts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Toshiba Printer Spare Parts') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Get Toshiba printer spare parts
    const toshibaSpareParts = printSparePartProducts.toshiba || [];
    
    const productsHTML = renderProducts(toshibaSpareParts, 'printsparepart');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
    
    // Update page title or add a header to show Toshiba printer spare parts category
    updatePageHeader('Toshiba Printer Spare Parts', toshibaSpareParts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('toshibaPrinterSpareParts');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Hero Carousel functionality
class HeroCarousel {
  constructor() {
    this.currentSlide = 0;
    this.slides = document.querySelectorAll('.hero-slide');
    this.indicators = document.querySelectorAll('.hero-indicator');
    this.autoPlayInterval = null;
    this.autoPlayDelay = 5000; // 5 seconds
    
    if (this.slides.length > 0) {
      this.init();
    }
  }
  
  init() {
    // Show first slide
    this.showSlide(0);
    
    // Start auto-play
    this.startAutoPlay();
    
    // Add event listeners for manual navigation
    this.addEventListeners();
  }
    showSlide(index) {
    // Hide all slides
    this.slides.forEach((slide, i) => {
      slide.style.opacity = '0';
      slide.style.transform = i < index ? 'translateX(-100%)' : 'translateX(100%)';
      slide.style.zIndex = '1';
      slide.classList.remove('active');
    });
    
    // Show current slide
    if (this.slides[index]) {
      this.slides[index].style.opacity = '1';
      this.slides[index].style.transform = 'translateX(0)';
      this.slides[index].style.zIndex = '2';
      this.slides[index].classList.add('active');
    }
    
    // Update indicators
    this.indicators.forEach((indicator, i) => {
      indicator.classList.toggle('active', i === index);
    });
    
    this.currentSlide = index;
  }
    goToSlide(index) {
    if (index >= 0 && index < this.slides.length) {
      this.showSlide(index);
      this.restartAutoPlay();
    }
  }
  
  next() {
    this.nextSlide();
    this.restartAutoPlay();
  }
  
  prev() {
    this.previousSlide();
    this.restartAutoPlay();
  }
  
  nextSlide() {
    const nextIndex = (this.currentSlide + 1) % this.slides.length;
    this.showSlide(nextIndex);
  }
  
  previousSlide() {
    const prevIndex = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
    this.showSlide(prevIndex);
  }
  
  startAutoPlay() {
    this.autoPlayInterval = setInterval(() => {
      this.nextSlide();
    }, this.autoPlayDelay);
  }
  
  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }
  
  restartAutoPlay() {
    this.stopAutoPlay();
    this.startAutoPlay();
  }
  
  addEventListeners() {
    // Pause auto-play on hover
    const heroCarousel = document.querySelector('.hero-carousel');
    if (heroCarousel) {
      heroCarousel.addEventListener('mouseenter', () => this.stopAutoPlay());
      heroCarousel.addEventListener('mouseleave', () => this.startAutoPlay());
    }
  }
}

// Initialize hero carousel
let heroCarousel;

// Make heroCarousel globally accessible
window.heroCarousel = null;

// Expose product data globally for search system
window.inkjetPrinterProducts = inkjetPrinterProducts;
window.printheadProducts = printheadProducts;
window.printSparePartProducts = printSparePartProducts;
window.upgradingKitProducts = upgradingKitProducts;

// Expose utility functions globally for search system
window.updatePageHeader = updatePageHeader;
window.hideHeroBanner = hideHeroBanner;
window.hideActiveSubmenus = hideActiveSubmenus;
window.renderProducts = renderProducts;
window.attachAddToCartListeners = attachAddToCartListeners;
window.scrollToProducts = scrollToProducts;

// Expose solvent printer functions globally
window.getAllSolventPrinters = getAllSolventPrinters;
window.getSolventKM512iPrinters = getSolventKM512iPrinters;
window.getSolventKM1024iPrinters = getSolventKM1024iPrinters;
window.getSolventRicohGen5Printers = getSolventRicohGen5Printers;
window.getSolventRicohGen6Printers = getSolventRicohGen6Printers;

// Function to load material products for a specific category
window.loadMaterialProducts = function(category) {
  const categoryProducts = materialProducts[category];
  if (categoryProducts) {
    // Hide the submenu after selection
    hideActiveSubmenus();
    
    // Hide hero banner for specific category views
    hideHeroBanner();
    
    // Highlight selected menu item
    highlightSelectedMenuItem(category);
    
    // Add loading animation
    showLoadingState();
    
    // Small delay for smooth transition
    setTimeout(() => {
      const productsHTML = renderProducts(categoryProducts, 'material');
      const productsGrid = document.querySelector('.js-prodcts-grid');
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
      
      // Re-attach event listeners for the new add to cart buttons
      attachAddToCartListeners();
        // Update page title or add a header to show which category is selected
      updatePageHeader(`${category.charAt(0).toUpperCase() + category.slice(1)} Materials`, categoryProducts.length);
      
      // Update breadcrumb navigation
      updateBreadcrumb(`material-${category}`);
      
      // Scroll to top of products
      scrollToProducts();
    }, 200);
  }
};

// Function to load all material products from all categories
window.loadAllMaterialProducts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Material') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Combine all material products from all categories
    let allMaterialProducts = [];
    for (const category in materialProducts) {
      allMaterialProducts = allMaterialProducts.concat(materialProducts[category]);
    }
    
    const productsHTML = renderProducts(allMaterialProducts, 'material');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title or add a header to show material category
    updatePageHeader('Material', allMaterialProducts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('material');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load specific channel letter category products
window.loadChannelLetterProducts = function(category) {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Channel Letter') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    const productsToShow = channelLetterBendingMechineProducts[category] || [];
    const productsHTML = renderProducts(productsToShow, 'channel-letter');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    updatePageHeader(`${categoryName} Channel Letter`, productsToShow.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('channel-letter', category);
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load all channel letter products from all categories
window.loadAllChannelLetterProducts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Channel Letter') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Combine all channel letter products from all categories
    let allChannelLetterProducts = [];
    for (const category in channelLetterBendingMechineProducts) {
      allChannelLetterProducts = allChannelLetterProducts.concat(channelLetterBendingMechineProducts[category]);
    }
    
    const productsHTML = renderProducts(allChannelLetterProducts, 'channel-letter');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title or add a header to show channel letter category
    updatePageHeader('Channel Letter', allChannelLetterProducts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('channel-letter');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load specific other category products
window.loadOtherProducts = function(category) {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Other') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    const productsToShow = otherProducts[category] || [];
    const productsHTML = renderProducts(productsToShow, 'other');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    updatePageHeader(`${categoryName} Other Products`, productsToShow.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('other', category);
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      // Scroll to top of products
      scrollToProducts();
    }
  }, 200);
};

// Function to load all other products from all categories
window.loadAllOtherProducts = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Other') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Combine all other products from all categories
    let allOtherProducts = [];
    for (const category in otherProducts) {
      allOtherProducts = allOtherProducts.concat(otherProducts[category]);
    }
    
    const productsHTML = renderProducts(allOtherProducts, 'other');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
      // Update page title or add a header to show other category
    updatePageHeader('Other Products', allOtherProducts.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('other');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load all economic version inkjet printers
window.loadAllEconomicVersionPrinters = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item in the navigation
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Inkjet Printers') {
      link.classList.add('active');
    }
  });
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    // Get all economic version printers
    const allEconomicPrinters = getAllEcoSolventPrinters();
    
    const productsHTML = renderProducts(allEconomicPrinters, 'economicprinter');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
    
    // Update page title or add a header to show economic version printers category
    updatePageHeader('Eco-Solvent Inkjet Printers', allEconomicPrinters.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('economicVersionPrinters');
    
    // Check if we need to skip scrolling
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    // Scroll to top of products only if not skipping
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Helper function to get all eco-solvent printer products
export function getAllEcoSolventPrinters() {
  // Eco-solvent printers should only come from economic_version category
  // DTF and UV DTF are Direct to Fabric & Film printers, not eco-solvent
  const economicPrinters = inkjetPrinterProducts.economic_version || [];
  return economicPrinters;
}

// Helper function to get eco-solvent printers with XP600 printhead
export function getEcoSolventXP600Printers() {
  return (inkjetPrinterProducts.economic_version || []).filter(printer => 
    printer.name.toLowerCase().includes('xp600')
  );
}

// Helper function to get all printers with I1600 printhead (eco-solvent and sublimation)  
export function getEcoSolventI1600Printers() {
  // Only return eco-solvent printers (from economic_version), not sublimation printers
  const economicI1600 = (inkjetPrinterProducts.economic_version || []).filter(printer => 
    printer.name.toLowerCase().includes('i1600') || printer.name.toLowerCase().includes('i16')
  );
  return economicI1600;
}

// Helper function to get all printers with I3200 printhead (eco-solvent and sublimation)
export function getEcoSolventI3200Printers() {
  // Only return eco-solvent printers (from economic_version), not sublimation printers
  const economicI3200 = (inkjetPrinterProducts.economic_version || []).filter(printer => 
    printer.name.toLowerCase().includes('i3200') || printer.name.toLowerCase().includes('i32')
  );
  return economicI3200;
}

// Helper function to get all solvent printer products
export function getAllSolventPrinters() {
  return inkjetPrinterProducts.solvent || [];
}

// Helper function to get solvent printers with KM512i printhead
export function getSolventKM512iPrinters() {
  return (inkjetPrinterProducts.solvent || []).filter(printer => 
    printer.name.toLowerCase().includes('512i') || printer.name.toLowerCase().includes('km512i')
  );
}

// Helper function to get solvent printers with KM1024i printhead  
export function getSolventKM1024iPrinters() {
  return (inkjetPrinterProducts.solvent || []).filter(printer => 
    printer.name.toLowerCase().includes('1024i') || printer.name.toLowerCase().includes('km1024i')
  );
}

// Helper function to get solvent printers with Ricoh Gen5 printhead
export function getSolventRicohGen5Printers() {
  return (inkjetPrinterProducts.solvent || []).filter(printer => 
    printer.name.toLowerCase().includes('gen5') || printer.name.toLowerCase().includes('ricoh gen5')
  );
}

// Helper function to get solvent printers with Ricoh Gen6 printhead
export function getSolventRicohGen6Printers() {
  return (inkjetPrinterProducts.solvent || []).filter(printer => 
    printer.name.toLowerCase().includes('gen6') || printer.name.toLowerCase().includes('ricoh gen6')
  );
}

// Helper function to get a specific printer by ID
export function getInkjetPrinterById(productId) {
  for (const category in inkjetPrinterProducts) {
    const products = inkjetPrinterProducts[category];
    const product = products.find(p => p.id === productId);
    if (product) {
      return { ...product, category };
    }
  }
  return null;
}

// Function to get all DTF printers
function getAllDTFPrinters() {
  return inkjetPrinterProducts.dtf_printer || [];
}

// Function to load DTF printer products
window.loadDTFPrinters = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item
  highlightSelectedMenuItem('dtf-printers');
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    const dtfPrinters = getAllDTFPrinters();
    const productsHTML = renderProducts(dtfPrinters, 'printer');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
    
    // Update page title
    updatePageHeader('DTF Printers', dtfPrinters.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('dtfPrinters');
    
    // Scroll to top of products
    scrollToProducts();
  }, 200);
};

// Function to load all Direct to Fabric & Film printers (currently only DTF)
window.loadDirectToFabricFilmPrinters = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item
  highlightSelectedMenuItem('direct-to-fabric-film');
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    const dtfPrinters = getAllDTFPrinters();
    const uvDtfPrinters = getAllUVDTFPrinters();
    const allDirectToFabricFilmPrinters = [...dtfPrinters, ...uvDtfPrinters];
    
    const productsHTML = renderProducts(allDirectToFabricFilmPrinters, 'printer');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
    
    // Update page title
    updatePageHeader('Direct to Fabric & Film Printers', allDirectToFabricFilmPrinters.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('directToFabricFilm');
    
    // Scroll to top of products
    scrollToProducts();
  }, 200);
};

// Function to get all UV DTF printers
function getAllUVDTFPrinters() {
  return inkjetPrinterProducts.uv_dtf || [];
}

// Function to load UV DTF printer products
window.loadUVDTFPrinters = function() {
  // Hide the submenu after selection
  hideActiveSubmenus();
  
  // Hide hero banner for specific category views
  hideHeroBanner();
  
  // Highlight selected menu item
  highlightSelectedMenuItem('uv-dtf-printers');
  
  // Add loading animation
  showLoadingState();
  
  // Small delay for smooth transition
  setTimeout(() => {
    const uvDtfPrinters = getAllUVDTFPrinters();
    const productsHTML = renderProducts(uvDtfPrinters, 'printer');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    // Re-attach event listeners for the new add to cart buttons
    attachAddToCartListeners();
    
    // Update page title
    updatePageHeader('UV DTF Printers', uvDtfPrinters.length);
    
    // Update breadcrumb navigation
    updateBreadcrumb('uvDtfPrinters');
    
    // Scroll to top of products
    scrollToProducts();
  }, 200);
};

// Function to load all solvent inkjet printers
window.loadAllSolventPrinters = function() {
  hideActiveSubmenus();
  hideHeroBanner();
  
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Inkjet Printers') {
      link.classList.add('active');
    }
  });
  
  showLoadingState();
  
  setTimeout(() => {
    const allSolventPrinters = getAllSolventPrinters();
    const productsHTML = renderProducts(allSolventPrinters, 'solventprinter');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    attachAddToCartListeners();
    updatePageHeader('Solvent Inkjet Printers', allSolventPrinters.length);
    updateBreadcrumb('solventPrinters');
    
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load solvent printers with KM512i printhead
window.loadSolventKM512iPrinters = function() {
  hideActiveSubmenus();
  hideHeroBanner();
  
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Inkjet Printers') {
      link.classList.add('active');
    }
  });
  
  showLoadingState();
  
  setTimeout(() => {
    const km512iPrinters = getSolventKM512iPrinters();
    const productsHTML = renderProducts(km512iPrinters, 'solventprinter');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    attachAddToCartListeners();
    updatePageHeader('Solvent Inkjet Printers - With Konica KM512i Printhead', km512iPrinters.length);
    updateBreadcrumb('solventKM512iPrinters');
    
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load solvent printers with KM1024i printhead
window.loadSolventKM1024iPrinters = function() {
  hideActiveSubmenus();
  hideHeroBanner();
  
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Inkjet Printers') {
      link.classList.add('active');
    }
  });
  
  showLoadingState();
  
  setTimeout(() => {
    const km1024iPrinters = getSolventKM1024iPrinters();
    const productsHTML = renderProducts(km1024iPrinters, 'solventprinter');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    attachAddToCartListeners();
    updatePageHeader('Solvent Inkjet Printers - With Konica KM1024i Printhead', km1024iPrinters.length);
    updateBreadcrumb('solventKM1024iPrinters');
    
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to get all sublimation printers
function getAllSublimationPrinters() {
  return inkjetPrinterProducts.sublimation || [];
}

// Function to load sublimation printer products
window.loadSublimationPrinters = function() {
  window.loadSpecificCategory('Sublimation Printers');
};

// Function to get all UV inkjet printers
export function getAllUvInkjetPrinters() {
  return inkjetPrinterProducts.amo_uv_inkjet || [];
}

// Function to get UV inkjet printers with Ricoh Gen6 printhead
export function getUvRicohGen6Printers() {
  const uvPrinters = inkjetPrinterProducts.amo_uv_inkjet || [];
  return uvPrinters.filter(printer => 
    printer.name.toLowerCase().includes('ricoh gen6') || 
    printer.name.toLowerCase().includes('gen6')
  );
}

// Function to get UV inkjet printers with Konica KM1024i printhead
export function getUvInkjetKonica1024iPrinters() {
  const uvPrinters = inkjetPrinterProducts.amo_uv_inkjet || [];
  return uvPrinters.filter(printer => 
    printer.name.toLowerCase().includes('konica 1024i') || 
    printer.name.toLowerCase().includes('km1024i') ||
    printer.name.toLowerCase().includes('k24i')
  );
}

// Function to get UV flatbed printers with Konica KM1024i printhead
export function getUvKonica1024iPrinters() {
  const uvFlatbedPrinters = inkjetPrinterProducts.uv_flatbed || [];
  return uvFlatbedPrinters.filter(printer => 
    printer.name.toLowerCase().includes('konica 1024i') || 
    printer.name.toLowerCase().includes('km1024i') ||
    printer.name.toLowerCase().includes('k24i')
  );
}

// Function to get UV flatbed printers with Ricoh Gen6 printhead
export function getUvFlatbedRicohGen6Printers() {
  const uvFlatbedPrinters = inkjetPrinterProducts.uv_flatbed || [];
  return uvFlatbedPrinters.filter(printer => 
    printer.name.toLowerCase().includes('ricoh gen6') || 
    printer.name.toLowerCase().includes('ricoh gen 6') ||
    printer.name.toLowerCase().includes('ricohgen6')
  );
}

// Function to get UV flatbed printers with Ricoh Gen5 printhead
export function getUvFlatbedRicohGen5Printers() {
  const uvFlatbedPrinters = inkjetPrinterProducts.uv_flatbed || [];
  return uvFlatbedPrinters.filter(printer => 
    printer.name.toLowerCase().includes('ricoh gen5') || 
    printer.name.toLowerCase().includes('ricoh gen 5') ||
    printer.name.toLowerCase().includes('ricohgen5')
  );
}

// Function to get UV flatbed printers with I3200 printhead
export function getUvFlatbedI3200Printers() {
  const uvFlatbedPrinters = inkjetPrinterProducts.uv_flatbed || [];
  return uvFlatbedPrinters.filter(printer => 
    printer.name.toLowerCase().includes('i3200') || 
    printer.name.toLowerCase().includes('i-3200') ||
    printer.name.toLowerCase().includes('i 3200')
  );
}

// Function to get UV flatbed printers with XP600 printhead
export function getUvFlatbedXP600Printers() {
  const uvFlatbedPrinters = inkjetPrinterProducts.uv_flatbed || [];
  return uvFlatbedPrinters.filter(printer => 
    printer.name.toLowerCase().includes('xp600') || 
    printer.name.toLowerCase().includes('xp-600') ||
    printer.name.toLowerCase().includes('xp 600')
  );
}

// Function to get UV Flatbed Printers
export function getUvFlatbedPrinters() {
  return inkjetPrinterProducts.uv_flatbed || [];
}

// Function to get all UV hybrid inkjet printers
export function getAllUvHybridPrinters() {
  return inkjetPrinterProducts.hybrid_uv || [];
}

// Function to get UV hybrid inkjet printers with Konica KM1024i printhead
export function getUvHybridKonica1024iPrinters() {
  const uvHybridPrinters = inkjetPrinterProducts.hybrid_uv || [];
  return uvHybridPrinters.filter(printer => 
    printer.name.toLowerCase().includes('konica') && 
    (printer.name.toLowerCase().includes('km1024i') || 
     printer.name.toLowerCase().includes('k24i') ||
     printer.name.toLowerCase().includes('1024i'))
  );
}

// Function to get UV hybrid inkjet printers with Ricoh Gen6 printhead
export function getUvHybridRicohGen6Printers() {
  const uvHybridPrinters = inkjetPrinterProducts.hybrid_uv || [];
  return uvHybridPrinters.filter(printer => 
    printer.name.toLowerCase().includes('ricoh') && 
    (printer.name.toLowerCase().includes('gen6') || 
     printer.name.toLowerCase().includes('gen 6') ||
     printer.name.toLowerCase().includes('ricoh gen6'))
  );
}

// Function to load all UV inkjet printers
window.loadAllUvInkjetPrinters = function() {
  hideActiveSubmenus();
  hideHeroBanner();
  
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Inkjet Printers') {
      link.classList.add('active');
    }
  });
  
  showLoadingState();
  
  setTimeout(() => {
    const uvPrinters = getAllUvInkjetPrinters();
    const productsHTML = renderProducts(uvPrinters, 'printer');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    attachAddToCartListeners();
    updatePageHeader('UV Inkjet Printers', uvPrinters.length);
    updateBreadcrumb('uvInkjetPrinters');
    
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load all UV hybrid inkjet printers
window.loadAllUvHybridPrinters = function() {
  hideActiveSubmenus();
  hideHeroBanner();
  
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Inkjet Printers') {
      link.classList.add('active');
    }
  });
  
  showLoadingState();
  
  setTimeout(() => {
    const uvHybridPrinters = getAllUvHybridPrinters();
    const productsHTML = renderProducts(uvHybridPrinters, 'printer');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    attachAddToCartListeners();
    updatePageHeader('Hybrid UV Printers', uvHybridPrinters.length);
    updateBreadcrumb('uvHybridPrinters');
    
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load UV inkjet printers with Ricoh Gen6 printhead
window.loadUvRicohGen6Printers = function() {
  hideActiveSubmenus();
  hideHeroBanner();
  
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Inkjet Printers') {
      link.classList.add('active');
    }
  });
  
  showLoadingState();
  
  setTimeout(() => {
    const ricohGen6Printers = getUvRicohGen6Printers();
    const productsHTML = renderProducts(ricohGen6Printers, 'printer');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    if (productsGrid) {
      productsGrid.innerHTML = productsHTML;
      productsGrid.classList.remove('showing-coming-soon');
    }
    
    attachAddToCartListeners();
    updatePageHeader('UV Inkjet Printers - With Ricoh Gen6 Printhead', ricohGen6Printers.length);
    updateBreadcrumb('uvRicohGen6Printers');
    
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load UV flatbed printers with Konica KM1024i printhead
window.loadUvKonica1024iPrinters = function() {
  hideActiveSubmenus();
  hideHeroBanner();
  
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Inkjet Printers') {
      link.classList.add('active');
    }
  });
  
  showLoadingState();
  
  setTimeout(() => {
    const konica1024iPrinters = getUvKonica1024iPrinters();
    const productsHTML = renderProducts(konica1024iPrinters, 'printer');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    attachAddToCartListeners();
    updatePageHeader('UV Flatbed Printers - With Konica KM1024i Printhead', konica1024iPrinters.length);
    updateBreadcrumb('uvKonica1024iPrinters');
    
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load UV Flatbed Printers
window.loadUvFlatbedPrinters = function() {
  hideActiveSubmenus();
  hideHeroBanner();
  
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Inkjet Printers') {
      link.classList.add('active');
    }
  });
  
  showLoadingState();
  
  setTimeout(() => {
    const uvFlatbedPrinters = getUvFlatbedPrinters();
    const productsHTML = renderProducts(uvFlatbedPrinters, 'printer');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    attachAddToCartListeners();
    updatePageHeader('UV Flatbed Printers', uvFlatbedPrinters.length);
    updateBreadcrumb('uvFlatbedPrinters');
    
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Export functions for global access
window.getAllUvInkjetPrinters = getAllUvInkjetPrinters;
window.getAllUvHybridPrinters = getAllUvHybridPrinters;
window.getUvRicohGen6Printers = getUvRicohGen6Printers;
window.getUvInkjetKonica1024iPrinters = getUvInkjetKonica1024iPrinters;
window.getUvFlatbedRicohGen6Printers = getUvFlatbedRicohGen6Printers;
window.getUvFlatbedRicohGen5Printers = getUvFlatbedRicohGen5Printers;
window.getUvFlatbedI3200Printers = getUvFlatbedI3200Printers;
window.getUvFlatbedXP600Printers = getUvFlatbedXP600Printers;
window.getUvHybridKonica1024iPrinters = getUvHybridKonica1024iPrinters;
window.getUvHybridRicohGen6Printers = getUvHybridRicohGen6Printers;
window.getUvKonica1024iPrinters = getUvKonica1024iPrinters;
window.getUvFlatbedPrinters = getUvFlatbedPrinters;

// Function to get all double side printers
function getAllDoubleSidePrinters() {
  return inkjetPrinterProducts.double_side || [];
}

// Function to load all double side printers
window.loadAllDoubleSidePrinters = function() {
  hideActiveSubmenus();
  hideHeroBanner();
  
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Inkjet Printers') {
      link.classList.add('active');
    }
  });
  
  showLoadingState();
  
  setTimeout(() => {
    const doubleSidePrinters = getAllDoubleSidePrinters();
    const productsHTML = renderProducts(doubleSidePrinters, 'printer');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    attachAddToCartListeners();
    updatePageHeader('Double Side Printers', doubleSidePrinters.length);
    updateBreadcrumb('doubleSidePrinters');
    
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Function to load double side direct printing printers
window.loadDoubleSideDirectPrinting = function() {
  hideActiveSubmenus();
  hideHeroBanner();
  
  document.querySelectorAll('.sub-header-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === 'Inkjet Printers') {
      link.classList.add('active');
    }
  });
  
  showLoadingState();
  
  setTimeout(() => {
    // For now, direct printing includes all double side printers
    // This can be expanded later to filter specific types
    const directPrintingPrinters = getAllDoubleSidePrinters();
    const productsHTML = renderProducts(directPrintingPrinters, 'printer');
    const productsGrid = document.querySelector('.js-prodcts-grid');
    productsGrid.innerHTML = productsHTML;
    productsGrid.classList.remove('showing-coming-soon');
    
    attachAddToCartListeners();
    updatePageHeader('Double Side Printers - Direct Printing', directPrintingPrinters.length);
    updateBreadcrumb('doubleSideDirectPrinting');
    
    const urlSearchParams = new URLSearchParams(window.location.search);
    const skipScroll = urlSearchParams.get('noscroll') === 'true';
    
    if (!skipScroll) {
      scrollToProducts();
    }
  }, 200);
};

// Export double side printer functions for global access
window.getAllDoubleSidePrinters = getAllDoubleSidePrinters;

