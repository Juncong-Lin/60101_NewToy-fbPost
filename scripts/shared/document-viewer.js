/**
 * Document Viewer functionality for product detail pages
 * This script handles the integration of document viewers for PDF, DOC, and DOCX files
 */

/**
 * Load product documentation into the product detail page
 * @param {string} productId - ID of the product
 * @param {string} documentPath - Path to the document file (PDF, DOC, DOCX)
 * @param {Object} options - Additional options (optional)
 */
export function loadProductDocumentation(productId, documentPath, options = {}) {
  // Default options
  const defaultOptions = {
    height: '600px',
    title: 'Product Documentation',
    viewerType: 'google', // 'google' or 'microsoft'
    position: 'afterDetails' // 'afterDetails', 'afterSpecifications', 'afterCompatibility'
  };
  
  // Merge options
  const settings = { ...defaultOptions, ...options };
  
  // Get the appropriate container based on position
  let targetElement;
  
  switch (settings.position) {
    case 'afterSpecifications':
      targetElement = document.querySelector('.product-specifications-section');
      break;
    case 'afterCompatibility':
      targetElement = document.querySelector('.product-compatibility-section');
      break;
    case 'afterDetails':
    default:
      targetElement = document.querySelector('#product-details');
      break;
  }
  
  if (!targetElement) {
    console.error('Could not find target element for document viewer');
    return;
  }
  
  // Create document viewer section
  const docSection = document.createElement('div');
  docSection.className = 'product-documentation-section';
  docSection.setAttribute('data-product-id', productId);
  
  // Get file extension to determine viewer
  const fileExtension = documentPath.split('.').pop().toLowerCase();
  
  // Set viewer URL based on type
  let viewerUrl;
  if (settings.viewerType === 'microsoft') {
    viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + documentPath)}`;
  } else {
    viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + documentPath)}&embedded=true`;
  }
    // Create HTML for document viewer
  docSection.innerHTML = `
    <h2>${settings.title}</h2>
    <div class="doc-viewer-container">
      <iframe 
        src="${viewerUrl}" 
        width="100%" 
        height="${settings.height}" 
        frameborder="0"
        class="doc-viewer-iframe">
      </iframe>
    </div>
    <div class="doc-download-link">
      <a href="${documentPath}" download class="download-btn">
        Download ${fileExtension.toUpperCase()} File
      </a>
    </div>
  `;
    // Insert the document viewer
  targetElement.appendChild(docSection);
  
  // Get the iframe and attach load event listener
  const iframe = docSection.querySelector('iframe');
  if (iframe) {
    iframe.addEventListener('load', () => {
      checkIframeLoaded(iframe);
    });
  }
}

/**
 * Check if the iframe loaded correctly and provide fallback if needed
 * @param {HTMLIFrameElement} iframe - The iframe element to check
 */
export function checkIframeLoaded(iframe) {
  // Check if iframe loaded correctly
  setTimeout(() => {
    try {
      // If iframe is blank, it likely failed to load
      if (iframe.contentWindow.document.body.innerHTML === '') {
        handleIframeLoadError(iframe);
      }
    } catch (e) {
      // Cross-origin errors will be caught here, provide fallback
      handleIframeLoadError(iframe);
    }
  }, 3000);
}

/**
 * Handle iframe loading errors with fallback content
 * @param {HTMLIFrameElement} iframe - The iframe that failed to load
 */
export function handleIframeLoadError(iframe) {
  const container = iframe.parentNode;
  const documentPath = iframe.src.includes('?url=') 
    ? decodeURIComponent(iframe.src.split('?url=')[1].split('&')[0])
    : iframe.src.split('src=')[1];
    
  container.innerHTML = `
    <div class="doc-viewer-fallback">
      <p>Document viewer couldn't be loaded. Please download the document instead.</p>
      <a href="${documentPath}" class="download-btn" download>
        Download Document
      </a>
    </div>
  `;
}

// This file exports functions individually
// loadProductDocumentation, checkIframeLoaded, and handleIframeLoadError
