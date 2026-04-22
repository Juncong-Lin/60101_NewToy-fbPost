// URL utility functions for navigation
class UrlUtils {
  /**
   * Constructs an index.html URL for navigation from any page
   * @param {string} hash - Optional hash to append to the URL
   * @returns {string} - The constructed index.html URL
   */
  static buildIndexUrl(hash = '') {
    const origin = window.location.origin;
    const currentPath = window.location.pathname;
    
    let indexUrl;
    if (currentPath === '/' || currentPath === '') {
      indexUrl = origin + '/index.html';
    } else {
      // Get the directory of the current path
      const pathParts = currentPath.split('/');
      pathParts[pathParts.length - 1] = 'index.html'; // Replace filename with index.html
      indexUrl = origin + pathParts.join('/');
    }
    
    return hash ? indexUrl + hash : indexUrl;
  }
  
  /**
   * Checks if the current page is the index page
   * @returns {boolean} - True if current page is index
   */
  static isIndexPage() {
    return window.location.pathname.includes('index.html') || 
           window.location.pathname === '/' || 
           window.location.pathname === '';
  }
  
  /**
   * Navigates to index page with optional hash
   * @param {string} hash - Optional hash to append
   */
  static navigateToIndex(hash = '') {
    window.location.href = this.buildIndexUrl(hash);
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.UrlUtils = UrlUtils;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UrlUtils;
}
