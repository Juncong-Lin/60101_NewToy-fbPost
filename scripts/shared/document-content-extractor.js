/**
 * Document Content Extractor
 * This script handles extracting and displaying the content of PDF and DOC/DOCX files directly
 */

import { parseMarkdown } from './markdown-parser.js';

/**
 * Product metadata mapping for inkjet printers
 * Contains category and pdfPath information extracted from product data
 */
const INKJET_PRINTER_METADATA = {
  // XP600 Series Printers - eco-solvent
  'AM1601XP': {
    category: 'eco-solvent-xp600',
    pdfPath: 'products/inkjetPrinter/inkjet printer with/AM1601XP 1.6meter Inkjet printer with 1 XP600 Printhead (the economic version)/AM1601XP 1.6meter Inkjet printer with 1 XP600 Printhead (the economic version).pdf'
  },
  'AM1802XP': {
    category: 'eco-solvent-xp600',
    pdfPath: 'products/inkjetPrinter/inkjet printer with/AM1802XP 1.8meter Inkjet printer with 2 XP600 Print head (the economic version)/AM1802XP 1.8meter Inkjet printer with 2 XP600 Print head (the economic version).pdf'
  },
  'AM1901XP': {
    category: 'eco-solvent-xp600',
    pdfPath: 'products/inkjetPrinter/inkjet printer with/AM1901XP 1.9meter Inkjet printer with 1 XP600 Printhead (the economic version)/AM1901XP 1.9meter Inkjet printer with 1 XP600 Printhead (the economic version).pdf'
  },
  
  // I1600 Series Printers - eco-solvent
  'AM1601i16': {
    category: 'eco-solvent-i1600',
    pdfPath: 'products/inkjetPrinter/inkjet printer with/AM1601i16 1.6meter Inkjet printer with 1 i1600 Printhead (the economic version)/AM1601i16 1.6meter Inkjet printer with 1 i1600 Printhead (the economic version).pdf'
  },
  'AM1802i16': {
    category: 'eco-solvent-i1600',
    pdfPath: 'products/inkjetPrinter/inkjet printer with/AM1802i16 1.8meter Inkjet printer with 2 i1600 Printhead (the economic version)/AM1802i16 1.8meter Inkjet printer with 2 i1600 Printhead (the economic version).pdf'
  },
  'AM1901i16': {
    category: 'eco-solvent-i1600',
    pdfPath: 'products/inkjetPrinter/inkjet printer with/AM1901i16 1.9meter Inkjet printer with 1 i1600 Printhead (the economic version)/AM1901i16 1.9meter Inkjet printer with 1 i1600 Printhead (the economic version).pdf'
  },
  
  // I3200 Series Printers - eco-solvent
  'AM1601i32': {
    category: 'eco-solvent-i3200',
    pdfPath: 'products/inkjetPrinter/inkjet printer with/AM1601i32 1.6meter Inkjet printer with 1 i3200 Printhead (the economic version)/AM1601i32 1.6meter Inkjet printer with 1 i3200 Printhead (the economic version).pdf'
  },
  'AM1802i32': {
    category: 'eco-solvent-i3200',
    pdfPath: 'products/inkjetPrinter/inkjet printer with/AM1802i32 1.8meter Inkjet printer with 2 i3200 Printhead (the economic version)/AM1802i32 1.8meter Inkjet printer with 2 i3200 Printhead (the economic version).pdf'
  },
  'AM1901i32': {
    category: 'eco-solvent-i3200',
    pdfPath: 'products/inkjetPrinter/inkjet printer with/AM1901i32 1.9meter Inkjet printer with 1 i3200 Printhead (the economic version)/AM1901i32 1.9meter Inkjet printer with 1 i3200 Printhead (the economic version).pdf'
  }
};

/**
 * Get product metadata by product ID
 * @param {string} productId - ID of the product
 * @returns {Object|null} - Product metadata object or null if not found
 */
export function getProductMetadata(productId) {
  return INKJET_PRINTER_METADATA[productId] || null;
}

/**
 * Get PDF path for a product
 * @param {string} productId - ID of the product
 * @returns {string|null} - PDF path or null if not found
 */
export function getProductPdfPath(productId) {
  const metadata = getProductMetadata(productId);
  return metadata ? metadata.pdfPath : null;
}

/**
 * Get category for a product
 * @param {string} productId - ID of the product
 * @returns {string|null} - Category or null if not found
 */
export function getProductCategory(productId) {
  const metadata = getProductMetadata(productId);
  return metadata ? metadata.category : null;
}

/**
 * Get all products by category
 * @param {string} category - Category to filter by
 * @returns {Array} - Array of product IDs in the specified category
 */
export function getProductsByCategory(category) {
  return Object.keys(INKJET_PRINTER_METADATA).filter(
    productId => INKJET_PRINTER_METADATA[productId].category === category
  );
}

/**
 * Extract and display document content directly in the product details
 * @param {string} productId - ID of the product
 * @param {string} documentPath - Path to the document file (PDF, DOC, DOCX) - optional, will use metadata if not provided
 */
export async function displayDocumentContent(productId, documentPath = null) {
  try {
    // If no document path provided, try to get it from metadata
    if (!documentPath) {
      documentPath = getProductPdfPath(productId);
      if (!documentPath) {
        throw new Error(`No document path found for product: ${productId}`);
      }
    }
    
    const fileExtension = documentPath.split('.').pop().toLowerCase();
    const detailsContainer = document.querySelector('.js-product-details-content');
    
    // Add eco-solvent-printer class to help with hiding elements
    detailsContainer.classList.add('eco-solvent-printer');
    
    // Show loading indicator
    detailsContainer.innerHTML = '<div class="document-loading">Loading document content...</div>';
      console.log('Attempting to load document:', documentPath);
    
    // Hide the product description (red box)
    const productDescriptionElement = document.querySelector('.js-product-description');
    if (productDescriptionElement) {
      productDescriptionElement.style.display = 'none';    }
    
    // Also hide compatibility and specifications tabs/sections
    const compatibilitySection = document.querySelector('.product-compatibility-section');
    if (compatibilitySection) {
      compatibilitySection.style.display = 'none';
    }
    
    const specificationsSection = document.querySelector('.product-specifications-section');
    if (specificationsSection) {
      specificationsSection.style.display = 'none';
    }
    
    // First check if the file exists
    try {
      const response = await fetch(documentPath, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`Document not found: ${documentPath}`);
      }
    } catch (error) {
      console.error('Document fetch check failed:', error);
      throw error;
    }
    
    if (fileExtension === 'pdf') {
      await extractPdfContent(documentPath, detailsContainer);
    } else if (fileExtension === 'docx' || fileExtension === 'doc') {
      await extractDocContent(documentPath, detailsContainer);
    }  } catch (error) {
    console.error('Error extracting document content:', error);
    const detailsContainer = document.querySelector('.js-product-details-content');
    detailsContainer.innerHTML = `
      <div class="document-error">
        <p>There was an error loading the document content.</p>
        <p>Please <a href="${documentPath}" download>download the document</a> to view its contents.</p>
        <div class="debug-info" style="display: none;">
          <p>Error Details: ${error.toString()}</p>
          <p>Document Path: ${documentPath}</p>
          <p>Product ID: ${productId}</p>
        </div>
      </div>
    `;
  }
}

/**
 * Extract content from a DOCX file and display it
 * @param {string} docPath - Path to the DOC/DOCX file
 * @param {HTMLElement} container - Container to display content in
 */
async function extractDocContent(docPath, container) {
  try {
    console.log('Extracting DOCX content from:', docPath);
    
    // Show loading indicator with spinner
    container.innerHTML = `
      <div class="document-loading">
        <p>Converting document to HTML...</p>
        <div class="loading-spinner"></div>
      </div>
    `;
    
    // Check if we need to load mammoth.js
    if (typeof mammoth === 'undefined') {
      try {
        console.log('Mammoth.js not loaded, loading it now...');
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
          
          // Set timeout in case the script doesn't load
          setTimeout(() => reject(new Error('Mammoth.js loading timeout')), 5000);
        });
      } catch (error) {
        console.error('Failed to load Mammoth.js:', error);
        throw new Error('Document converter library could not be loaded');
      }
    }
    
    // Check if mammoth is loaded now
    if (typeof mammoth === 'undefined') {
      throw new Error('Mammoth.js library not available');
    }
    
    // Fetch the document file with timestamp to avoid caching
    const docUrlWithTimestamp = `${docPath}?t=${new Date().getTime()}`;
    const response = await fetch(docUrlWithTimestamp);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('Document fetched, size:', Math.round(blob.size / 1024), 'KB');
    
    // Use mammoth.js to convert DOCX to HTML with improved styling
    const result = await mammoth.convertToHtml({ 
      arrayBuffer: await blob.arrayBuffer(),
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1.document-title:fresh",
        "p[style-name='Subtitle'] => h2.document-subtitle:fresh",
        "r[style-name='Strong'] => strong:fresh",
        "p[style-name='List Paragraph'] => li:fresh",
        "table => table.document-table:fresh"
      ],
      includeDefaultStyleMap: true,
      transformDocument: function(document) {
        return document;
      }
    });
    
    const html = result.value;
    console.log('Document converted to HTML successfully');
    
    // If there are any warnings, log them
    if (result.messages.length > 0) {
      console.log('Document conversion notes:', result.messages);
    }
    
    // Create a wrapper for the content with document title
    const filenameParts = docPath.split('/');
    const filename = filenameParts[filenameParts.length - 1];
    const fileExtension = docPath.split('.').pop().toUpperCase();    // Display the extracted content without document title, but with download link
    container.innerHTML = `
      <div class="document-content docx-content">${html}</div>
      <div class="doc-download-link">
        <a href="${docPath}" download class="download-btn">Download ${fileExtension} Document</a>
      </div>
    `;
    
    // Apply styling to make it match the site design
    applyContentStyling();
    
    // Add special handling for tables in DOCX
    const tables = container.querySelectorAll('table');
    tables.forEach(table => {
      // Add responsive wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'table-responsive';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
      
      // Add table classes
      table.classList.add('document-table');
      
      // Ensure all cells have borders
      const cells = table.querySelectorAll('td, th');
      cells.forEach(cell => {
        cell.style.border = '1px solid #ddd';
        cell.style.padding = '8px';
      });
    });
    
    // Fix images in the document
    const images = container.querySelectorAll('img');
    if (images.length > 0) {
      console.log(`Found ${images.length} images in document`);
      images.forEach(img => {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.classList.add('document-image');
        
        // Add error handling for images
        img.addEventListener('error', () => {
          img.style.display = 'none';
          const errorText = document.createElement('span');
          errorText.textContent = '[Image not available]';
          errorText.className = 'image-error';
          img.parentNode.insertBefore(errorText, img.nextSibling);
        });
      });
    }
    
    // Fix lists - sometimes mammoth doesn't properly convert list structures
    const lists = container.querySelectorAll('li');
    if (lists.length > 0 && !container.querySelector('ul, ol')) {
      // Find sequential list items and wrap them in ul elements
      let currentListItems = [];
      let allElements = Array.from(container.querySelector('.docx-content').childNodes);
      
      for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];
        
        if (element.tagName === 'LI') {
          currentListItems.push(element);
          
          // Remove from DOM temporarily
          element.parentNode.removeChild(element);
          
          // If next element is not an LI or we're at the end, create a list
          if (i === allElements.length - 1 || 
              allElements[i+1].tagName !== 'LI') {
            
            const ul = document.createElement('ul');
            ul.className = 'document-list';
            
            // Add all collected list items to the list
            currentListItems.forEach(li => ul.appendChild(li));
            
            // Insert the list at the current position
            if (i < allElements.length - 1) {
              allElements[i+1].parentNode.insertBefore(ul, allElements[i+1]);
            } else {
              container.querySelector('.docx-content').appendChild(ul);
            }
            
            // Reset the collection
            currentListItems = [];
          }
        }
      }
    }
      } catch (error) {
    console.error('DOCX extraction error:', error);
    // Show error message with download option
    container.innerHTML = `
      <div class="document-error">
        <p>The document could not be displayed in the browser.</p>
        <p>You can still access the document by downloading it:</p>
        <a href="${docPath}" download class="download-btn">Download Document</a>
      </div>
    `;
  }
}

/**
 * Extract content from a PDF file and display it
 * 
 * Note: This is a simplified implementation. PDF text extraction is inherently
 * difficult to preserve formatting. For production use, consider using a
 * server-side solution or PDF.js with more complex rendering.
 * 
 * @param {string} pdfPath - Path to the PDF file
 * @param {HTMLElement} container - Container to display content in
 */
async function extractPdfContent(pdfPath, container) {
  try {
    console.log('Extracting PDF content from:', pdfPath);
    
    // Show user-friendly loading message
    container.innerHTML = `
      <div class="document-loading">
        <p>Loading PDF document...</p>
        <div class="loading-spinner"></div>
      </div>
    `;
    
    // Ensure PDF.js is loaded
    if (typeof pdfjsLib === 'undefined' && typeof window.pdfjsLib === 'undefined') {
      console.log('PDF.js not loaded, trying to load it now...');
      
      try {
        // Load PDF.js from CDN
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.8.162/pdf.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
          
          // Set a timeout in case the script doesn't load
          setTimeout(() => reject(new Error('PDF.js loading timeout')), 5000);
        });
        
        // Load worker script
        await new Promise((resolve, reject) => {
          const workerScript = document.createElement('script');
          workerScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.8.162/pdf.worker.min.js';
          workerScript.onload = resolve;
          workerScript.onerror = reject;
          document.head.appendChild(workerScript);
          
          setTimeout(() => reject(new Error('PDF.js worker loading timeout')), 5000);
        });
        
        // Set worker location
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.8.162/pdf.worker.min.js';
        }
      } catch (error) {
        console.error('Failed to load PDF.js:', error);
        throw new Error('PDF viewer libraries could not be loaded');
      }
    }
    
    // Use whichever PDF library is available
    const pdfLib = pdfjsLib || window.pdfjsLib;
    
    if (!pdfLib) {
      throw new Error('PDF.js library not available');
    }
    
    // Workaround for CORS issues - add a timestamp to avoid caching
    const pdfUrlWithTimestamp = `${pdfPath}?t=${new Date().getTime()}`;
    
    // Fetch the PDF document
    const loadingTask = pdfLib.getDocument(pdfUrlWithTimestamp);
    const pdf = await loadingTask.promise;
    console.log('PDF loaded successfully, pages:', pdf.numPages);    // Create PDF viewer container without page count but with download button
    container.innerHTML = `
      <div class="document-content pdf-content">
        <!-- PDF content will be rendered here -->
      </div>
      <div class="doc-download-link">
        <a href="${pdfPath}" download class="download-btn">Download PDF</a>
      </div>
    `;
    const contentDiv = container.querySelector('.pdf-content');
    
    // Get all pages and extract text
    const numPages = pdf.numPages;
    const maxPagesToShow = Math.min(numPages, 5); // Limit to first 5 pages for performance
    
    // Process pages in sequence
    for (let i = 1; i <= maxPagesToShow; i++) {
      try {
        console.log(`Rendering PDF page ${i} of ${numPages}`);
        
        // Get the page
        const page = await pdf.getPage(i);
        
        // Calculate optimal scale for display (fit to container width)
        const containerWidth = contentDiv.clientWidth || 800;
        const viewport = page.getViewport({ scale: 1.0 });
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale: scale });
          // Create page container without header
        const pageDiv = document.createElement('div');
        pageDiv.className = 'pdf-page';
        
        // Create canvas for rendering
        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-canvas';
        const context = canvas.getContext('2d');
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        
        // Add canvas to page
        pageDiv.appendChild(canvas);
        contentDiv.appendChild(pageDiv);
        
        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: scaledViewport
        }).promise;
        
        // Show loading progress
        const progressElement = document.querySelector('.pdf-page-count');
        if (progressElement) {
          progressElement.textContent = `Loading: ${i} of ${maxPagesToShow} pages rendered`;
        }
      } catch (pageError) {
        console.error(`Error rendering PDF page ${i}:`, pageError);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'pdf-page-error';
        errorDiv.textContent = `Error rendering page ${i}`;
        contentDiv.appendChild(errorDiv);
      }
    }    // Show download link if not all pages are displayed
    if (numPages > maxPagesToShow) {
      const morePages = document.createElement('div');
      morePages.className = 'pdf-more-pages';
      morePages.innerHTML = `
        <p><a href="${pdfPath}" download class="download-link">Download the full PDF</a> to view all pages.</p>
      `;
      contentDiv.appendChild(morePages);
    }
      // Remove page count message
    const pageCountElement = document.querySelector('.pdf-page-count');
    if (pageCountElement) {
      pageCountElement.style.display = 'none';
    }
    
    // Apply styling
    applyContentStyling();  } catch (error) {
    console.error('PDF extraction error:', error);
    // Show error message with download option
    container.innerHTML = `
      <div class="document-error">
        <p>The document could not be displayed in the browser.</p>
        <p>You can still access the document by downloading it:</p>
        <a href="${pdfPath}" download class="download-btn">Download PDF Document</a>
      </div>
    `;
  }
}

/**
 * Apply styling to the document content to match the site design
 */
function applyContentStyling() {
  const documentContent = document.querySelector('.document-content');
  if (!documentContent) return;
  
  // Add classes to headings, tables, lists, etc.
  documentContent.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
    heading.classList.add('document-heading');
    
    // Hide "Compatibility" and "Specifications" headings per user request
    const headingText = heading.textContent.toLowerCase();
    if (headingText.includes('compatibility') || 
        headingText.includes('specifications') || 
        headingText.includes('features')) {
      heading.style.display = 'none';
    }
  });
  
  documentContent.querySelectorAll('table').forEach(table => {
    table.classList.add('document-table');
    // Make sure tables are responsive
    const wrapper = document.createElement('div');
    wrapper.classList.add('document-table-wrapper');
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
  
  documentContent.querySelectorAll('img').forEach(img => {
    img.classList.add('document-image');
    // Make images responsive
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
  });
}
