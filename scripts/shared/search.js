// Search functionality for the header
class SearchSystem {  constructor() {
    this.searchInput = null;
    this.searchButton = null;
    this.searchHistoryDropdown = null;
    this.isInitialized = false;
    this.maxHistoryItems = 10;
    this.searchHistory = this.loadSearchHistory();
  }
  init() {
    // Prevent double initialization
    if (this.isInitialized) {
      return;
    }
    
    // Wait for the header to be loaded
    this.waitForHeader();
  }
  waitForHeader() {
    // Check if header elements exist, if not wait and try again
    const checkInterval = setInterval(() => {
      this.searchInput = document.querySelector('.search-bar');
      this.searchButton = document.querySelector('.search-button');      if (this.searchInput && this.searchButton && !this.isInitialized) {
        this.setupEventListeners();
        this.setupSearchHistory();
        this.isInitialized = true;
        clearInterval(checkInterval);
        
        // Check for URL search parameters
        this.handleURLSearchParams();
      }
    }, 100); // Check every 100ms

    // Stop checking after 10 seconds to avoid infinite loop
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 10000);
  }

  setupEventListeners() {
    if (!this.searchInput || !this.searchButton) return;

    // Handle search button click
    this.searchButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.performSearch();
    });

    // Handle Enter key press in search input
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.performSearch();
      }
    });    // Handle input changes for live search (optional)
    this.searchInput.addEventListener('input', (e) => {
      this.handleSearchInput(e.target.value);
    });    // Handle focus/blur for search history
    this.searchInput.addEventListener('focus', () => {
      if (this.searchHistory.length > 0) {
        this.showSearchHistory();
      }
    });

    this.searchInput.addEventListener('blur', (e) => {
      // Delay hiding to allow clicks on dropdown items
      setTimeout(() => {
        this.hideSearchHistory();
      }, 200);
    });

    // Also show on hover for better UX
    this.searchInput.addEventListener('mouseenter', () => {
      if (this.searchHistory.length > 0) {
        this.showSearchHistory();
      }
    });

    // Keep dropdown visible when hovering over it
    const searchContainer = this.searchInput.parentNode;
    if (searchContainer) {
      searchContainer.addEventListener('mouseleave', () => {
        setTimeout(() => {
          this.hideSearchHistory();
        }, 300);
      });
    }// Handle clicks outside to hide dropdown
    document.addEventListener('click', (e) => {
      if (!this.searchInput?.contains(e.target) && 
          !this.searchHistoryDropdown?.contains(e.target) &&
          !this.searchButton?.contains(e.target)) {
        this.hideSearchHistory();
      }
    });  }  setupSearchHistory() {
    try {
      // Create search history dropdown
      this.searchHistoryDropdown = document.createElement('div');
      this.searchHistoryDropdown.className = 'search-history-dropdown';
      
      // Insert after the search input
      const searchContainer = this.searchInput.parentNode;
      if (searchContainer) {
        searchContainer.appendChild(this.searchHistoryDropdown);
        this.updateSearchHistoryDisplay();
      }
    } catch (error) {
      // Silent error handling
    }
  }

  loadSearchHistory() {
    try {
      const stored = localStorage.getItem('qili_search_history');
      let history = stored ? JSON.parse(stored) : [];
      
      // Add some default search history for testing if none exists
      if (history.length === 0) {
        history = [
          { term: 'inkjet', timestamp: Date.now() - 1000000 },
          { term: 'print heads', timestamp: Date.now() - 2000000 },
          { term: 'epson', timestamp: Date.now() - 3000000 },
          { term: 'printer', timestamp: Date.now() - 4000000 }
        ];
      }
      
      return history;
    } catch (e) {
      return [];
    }
  }

  saveSearchHistory() {
    try {
      localStorage.setItem('qili_search_history', JSON.stringify(this.searchHistory));
    } catch (e) {
      // Silent error handling
    }
  }

  addToSearchHistory(searchTerm) {
    if (!searchTerm || searchTerm.trim().length < 2) return;
    
    const term = searchTerm.trim();
    
    // Remove existing entry if it exists
    this.searchHistory = this.searchHistory.filter(item => item.term !== term);
    
    // Add to beginning of array
    this.searchHistory.unshift({
      term: term,
      timestamp: Date.now()
    });
    
    // Keep only the most recent items
    this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
    
    this.saveSearchHistory();
    this.updateSearchHistoryDisplay();
  }

  clearSearchHistory() {
    this.searchHistory = [];
    this.saveSearchHistory();
    this.updateSearchHistoryDisplay();
  }

  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  updateSearchHistoryDisplay() {
    if (!this.searchHistoryDropdown) return;
    
    if (this.searchHistory.length === 0) {
      this.searchHistoryDropdown.innerHTML = `
        <div class="search-history-empty">No recent searches</div>
      `;
    } else {
      const historyItems = this.searchHistory.map(item => `
        <div class="search-history-item" data-term="${item.term}">
          <span class="search-history-text">${item.term}</span>
          <span class="search-history-time">${this.formatTimeAgo(item.timestamp)}</span>
        </div>
      `).join('');
      
      this.searchHistoryDropdown.innerHTML = `
        <div class="search-history-header">Recent Searches</div>
        ${historyItems}
        <div class="search-history-clear">Clear History</div>
      `;
      
      // Add event listeners
      this.searchHistoryDropdown.querySelectorAll('.search-history-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const term = e.currentTarget.getAttribute('data-term');
          this.searchInput.value = term;
          this.hideSearchHistory();
          this.performSearch();
        });
      });
      
      const clearButton = this.searchHistoryDropdown.querySelector('.search-history-clear');
      if (clearButton) {
        clearButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.clearSearchHistory();
        });
      }
    }
  }  showSearchHistory() {
    if (!this.searchHistoryDropdown) return;
    if (this.searchHistory.length === 0) return;
    
    // Force the dropdown to appear
    this.searchHistoryDropdown.style.zIndex = '1001';
    this.searchHistoryDropdown.style.position = 'absolute';
    this.searchHistoryDropdown.classList.add('show');
  }

  hideSearchHistory() {
    if (!this.searchHistoryDropdown) return;
    
    this.searchHistoryDropdown.classList.remove('show');
  }
  performSearch() {
    const searchTerm = this.searchInput.value.trim();
    
    if (!searchTerm) {
      this.showSearchMessage('Please enter a search term');
      return;
    }

    // Add to search history
    this.addToSearchHistory(searchTerm);
    
    // Hide search history dropdown
    this.hideSearchHistory();

    // Redirect to index page if not already there, then perform search
    if (!this.isIndexPage()) {
      // Navigate to index page with search parameter
      window.location.href = `index.html?search=${encodeURIComponent(searchTerm)}`;
      return;
    }

    // Perform search on current page
    this.searchProducts(searchTerm);
  }  searchProducts(searchTerm) {
    const searchTermLower = searchTerm.toLowerCase();
    let searchResults = [];    try {
      // Check if product data is available, if not wait for it to load
      const hasProducts = window.inkjetPrinterProducts || window.printheadProducts || 
                         window.printSparePartProducts || window.upgradingKitProducts;
      
      if (!hasProducts) {
        // Wait for product data to load, then retry search
        this.waitForProductData(() => this.searchProducts(searchTerm));
        return;
      }

      // Search in all product datasets      // Search inkjet printer products
      if (window.inkjetPrinterProducts) {
        for (const category in window.inkjetPrinterProducts) {
          const products = window.inkjetPrinterProducts[category];
          const matches = products.filter(product => 
            this.productMatchesSearch(product, searchTermLower, {
              category: category,
              brand: null,
              type: 'printer'
            })
          );
          searchResults = searchResults.concat(matches.map(p => ({...p, type: 'printer', category: category})));
        }
      }

      // Search printhead products  
      if (window.printheadProducts) {
        for (const brand in window.printheadProducts) {
          const products = window.printheadProducts[brand];
          const matches = products.filter(product => 
            this.productMatchesSearch(product, searchTermLower, {
              category: 'printhead',
              brand: brand,
              type: 'printhead'
            })
          );
          searchResults = searchResults.concat(matches.map(p => ({...p, type: 'printhead', brand: brand, category: 'printhead'})));
        }
      }

      // Search print spare parts
      if (window.printSparePartProducts) {
        for (const brand in window.printSparePartProducts) {
          const products = window.printSparePartProducts[brand];
          const matches = products.filter(product => 
            this.productMatchesSearch(product, searchTermLower, {
              category: 'print spare parts',
              brand: brand,
              type: 'printsparepart'
            })
          );
          searchResults = searchResults.concat(matches.map(p => ({...p, type: 'printsparepart', brand: brand, category: 'print spare parts'})));
        }
      }

      // Search upgrading kit products
      if (window.upgradingKitProducts) {
        for (const brand in window.upgradingKitProducts) {
          const products = window.upgradingKitProducts[brand];
          const matches = products.filter(product => 
            this.productMatchesSearch(product, searchTermLower, {
              category: 'upgrading kit',
              brand: brand,
              type: 'upgradingkit'
            })
          );
          searchResults = searchResults.concat(matches.map(p => ({...p, type: 'upgradingkit', brand: brand, category: 'upgrading kit'})));        }
      }

      this.displaySearchResults(searchResults, searchTerm);

    } catch (error) {
      this.showSearchMessage('Search temporarily unavailable. Please try again.');
    }
  }  productMatchesSearch(product, searchTerm, context = {}) {
    if (!product) return false;

    // Search in product name
    if (product.name && product.name.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // Search in derived category (from data structure)
    if (context.category && context.category.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // Search in product category (if exists)
    if (product.category && product.category.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // Search in product subcategory (if exists)
    if (product.subcategory && product.subcategory.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // Search in derived brand (from data structure)
    if (context.brand && context.brand.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // Search in product brand (if exists)
    if (product.brand && product.brand.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // Special handling for common search terms
    // Handle "print heads" or "printheads" searches
    if ((searchTerm.includes('print head') || searchTerm.includes('printhead')) && context.category === 'printhead') {
      return true;
    }

    // Handle "print spare parts" searches
    if (searchTerm.includes('print spare') && context.category === 'print spare parts') {
      return true;
    }

    // Handle "upgrading kit" searches
    if (searchTerm.includes('upgrading') && context.category === 'upgrading kit') {
      return true;
    }

    // Handle printer-related searches
    if ((searchTerm.includes('printer') || searchTerm.includes('inkjet')) && context.type === 'printer') {
      return true;
    }

    return false;
  }
  displaySearchResults(results, searchTerm) {
    // Hide hero banner
    if (window.hideHeroBanner) {
      window.hideHeroBanner();
    }

    // Hide any active submenus
    if (window.hideActiveSubmenus) {
      window.hideActiveSubmenus();
    }

    // Clear any sub-header highlighting for search results
    this.clearSubHeaderHighlight();

    // Update page header to show search results count
    if (window.updatePageHeader) {
      window.updatePageHeader(`Found ${results.length} result${results.length !== 1 ? 's' : ''}`);
    }

    // Update breadcrumb
    this.updateSearchBreadcrumb(searchTerm);

    const productsGrid = document.querySelector('.js-prodcts-grid');
    if (!productsGrid) {
      this.showSearchMessage('Unable to display search results');
      return;
    }

    // Remove any existing search results header since we're showing count in page title
    const existingHeader = document.querySelector('.search-results-header');
    if (existingHeader) {
      existingHeader.remove();
    }    if (results.length === 0) {
      productsGrid.innerHTML = `
        <div class="search-no-results">
          <h2>No results found for "${searchTerm}"</h2>
          <p>Try adjusting your search terms or browse our categories.</p>
          <div class="search-suggestions">
            <h3>Popular categories:</h3>
            <div class="suggestion-links">
              <a href="javascript:void(0)" onclick="window.loadAllPrintheadProducts && window.loadAllPrintheadProducts()">Print Heads</a>
              <a href="javascript:void(0)" onclick="window.loadSpecificCategory && window.loadSpecificCategory('Inkjet Printers')">Inkjet Printers</a>
              <a href="javascript:void(0)" onclick="window.loadSpecificCategory && window.loadSpecificCategory('Print Spare Parts')">Print Spare Parts</a>
              <a href="javascript:void(0)" onclick="window.loadSpecificCategory && window.loadSpecificCategory('Upgrading Kit')">Upgrading Kit</a>
            </div>
          </div>
        </div>
      `;    } else {
      // Use existing renderProducts function if available
      if (window.renderProducts) {
        const productsHTML = window.renderProducts(results, 'mixed');
        productsGrid.innerHTML = productsHTML;
        
        // Re-attach event listeners
        if (window.attachAddToCartListeners) {
          window.attachAddToCartListeners();
        }
      } else {
        // Fallback rendering
        this.renderSearchResults(results, productsGrid);
      }
    }

    productsGrid.classList.remove('showing-coming-soon');

    // Scroll to products
    if (window.scrollToProducts) {
      window.scrollToProducts();
    }

    // Update URL with search parameter
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('search', searchTerm);
    window.history.pushState(null, '', newUrl);
  }
  renderSearchResults(results, container) {
    // Remove the search results info since it's now displayed in the header
    let html = '';

    results.forEach(product => {
      html += `
        <div class="product-container">        
          <div class="product-image-container">
            <a href="detail.html?productId=${product.id}&type=${product.type}" class="product-image-link">
              <img class="product-image" src="${product.image}">
            </a>
          </div>
          <div class="product-name limit-text-to-3-lines">
            <a href="detail.html?productId=${product.id}&type=${product.type}" class="product-link">
              ${product.name}
            </a>
          </div>
          <div class="product-price">
            ${(() => {
              if (product.lower_price !== undefined || product.higher_price !== undefined) {
                // Use the same price formatting as the main site
                const formatPriceRange = window.formatPriceRange || ((lower, higher) => {
                  if (lower && higher) {
                    return `USD:$${(lower/100).toFixed(0)} - $${(higher/100).toFixed(0)}`;
                  } else if (lower) {
                    return `USD:$${(lower/100).toFixed(0)}`;
                  } else {
                    return 'Contact for Price';
                  }
                });
                return formatPriceRange(product.lower_price, product.higher_price);
              } else if (product.price) {
                return 'USD:$' + (product.price/100).toFixed(2);
              } else {
                return 'Contact for Price';
              }
            })()}
          </div>
          <div class="product-spacer"></div>
          <a class="add-to-cart-button button-primary" href="detail.html?productId=${product.id}&type=${product.type}">
            View Details
          </a>
        </div>`;
    });

    container.innerHTML = html;  }

  updateSearchBreadcrumb(searchTerm) {
    let breadcrumbElement = document.querySelector('.breadcrumb-nav');
    if (!breadcrumbElement) {
      breadcrumbElement = document.createElement('div');
      breadcrumbElement.className = 'breadcrumb-nav';

      const mainElement = document.querySelector('.main');
      if (mainElement) {
        mainElement.insertBefore(breadcrumbElement, mainElement.firstChild);
      }
    }

    breadcrumbElement.innerHTML = `
      <a href="javascript:void(0)" onclick="window.loadAllProducts && window.loadAllProducts()" class="breadcrumb-link">Home</a>
      <span class="breadcrumb-separator">&gt;</span>
      <span class="breadcrumb-current">Search: "${searchTerm}"</span>
    `;
  }
  handleSearchInput(value) {
    // Optional: implement live search suggestions
    // For now, we'll keep it simple and only search on Enter/Click
  }  handleURLSearchParams() {
    // Check if there's a search parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('search');
    
    if (searchTerm) {
      // Set the search input value
      if (this.searchInput) {
        this.searchInput.value = searchTerm;
      }
      
      // Add to search history (but only if not already added)
      this.addToSearchHistory(searchTerm);
      
      // If this was detected early, hide hero banner and active submenus immediately
      if (window.isEarlySearchDetection) {
        // Hide hero banner
        if (window.hideHeroBanner) {
          window.hideHeroBanner();
        }
        
        // Hide any active submenus
        if (window.hideActiveSubmenus) {
          window.hideActiveSubmenus();
        }
        
        // Clear sub-header highlighting
        this.clearSubHeaderHighlight();
      }
      
      // Perform the search automatically
      this.searchProducts(searchTerm);
    }
  }

  showSearchMessage(message) {
    // Show temporary message to user
    const existingMessage = document.querySelector('.search-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'search-message';
    messageDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: #ff6b6b;
      color: white;
      padding: 10px 15px;
      border-radius: 4px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    // Remove message after 3 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }

  isIndexPage() {
    return window.location.pathname.includes('index.html') || 
           window.location.pathname === '/' || 
           window.location.pathname.endsWith('/');  }

  waitForProductData(callback) {
    // Show loading message
    this.showSearchMessage('Products are loading. Please wait...');
    
    // Check for product data availability every 100ms
    const checkInterval = setInterval(() => {
      const hasProducts = window.inkjetPrinterProducts || window.printheadProducts || 
                         window.printSparePartProducts || window.upgradingKitProducts;
      
      if (hasProducts) {
        clearInterval(checkInterval);
        callback();
      }
    }, 100);

    // Stop checking after 10 seconds to avoid infinite loop
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!(window.inkjetPrinterProducts || window.printheadProducts || 
            window.printSparePartProducts || window.upgradingKitProducts)) {
        this.showSearchMessage('Unable to load product data. Please refresh the page and try again.');
      }
    }, 10000);
  }

  clearSubHeaderHighlight() {
    // Remove any active highlighting from sub-header links
    const subHeaderLinks = document.querySelectorAll('.sub-header-link');
    subHeaderLinks.forEach(link => {
      link.classList.remove('active');
    });
  }
}

// Initialize search system
const searchSystem = new SearchSystem();

// Don't initialize automatically on DOMContentLoaded since header loads dynamically
// The shared-header-loader.js will call searchSystem.init() when header is ready

// Make search system globally available
window.searchSystem = searchSystem;
