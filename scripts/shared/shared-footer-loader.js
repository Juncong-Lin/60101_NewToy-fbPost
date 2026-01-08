// Shared Footer Loader
// This script loads the shared footer component dynamically

// Function to load the shared footer
function loadSharedFooter() {
  const footerPlaceholder = document.getElementById('shared-footer-placeholder');
  
  if (footerPlaceholder) {
    fetch('components/shared-footer.html')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(html => {
        footerPlaceholder.innerHTML = html;
        
        // If we're on the index page, update footer links to use JavaScript navigation
        const isIndexPage = window.location.pathname.endsWith('index.html') || 
                           window.location.pathname === '/' || 
                           window.location.pathname.endsWith('/');
        
        if (isIndexPage && typeof window.loadSpecificCategory === 'function') {
          updateFooterLinksForIndex();
        }
      })
      .catch(error => {
        console.error('Error loading shared footer:', error);
        // Fallback: show a basic footer message
        footerPlaceholder.innerHTML = '<footer class="footer"><div class="footer-bottom"><p>© 2025 qilitrading.com - All rights reserved</p></div></footer>';
      });
  }
}

// Function to update footer links for index page with JavaScript navigation
function updateFooterLinksForIndex() {
  const footerLinks = document.querySelectorAll('.footer-links a');
  const linkMappings = {
    'Inkjet Printers': () => window.loadSpecificCategory && window.loadSpecificCategory('Inkjet Printers'),
    'Print Heads': () => { 
      window.loadAllPrintheadProducts && window.loadAllPrintheadProducts(); 
      window.location.hash = 'print-heads'; 
    },
    'Print Spare Parts': () => window.loadSpecificCategory && window.loadSpecificCategory('Print Spare Parts'),
    'Upgrading Kit': () => window.loadSpecificCategory && window.loadSpecificCategory('Upgrading Kit'),
    'Material': () => window.loadSpecificCategory && window.loadSpecificCategory('Material'),
    'LED & LCD': () => window.loadSpecificCategory && window.loadSpecificCategory('LED & LCD'),
    'Laser': () => window.loadSpecificCategory && window.loadSpecificCategory('Laser'),
    'Cutting': () => window.loadSpecificCategory && window.loadSpecificCategory('Cutting'),
    'Channel Letter': () => window.loadSpecificCategory && window.loadSpecificCategory('Channel Letter'),
    'CNC': () => window.loadSpecificCategory && window.loadSpecificCategory('CNC'),
    'Displays': () => window.loadSpecificCategory && window.loadSpecificCategory('Displays'),
    'Other': () => window.loadSpecificCategory && window.loadSpecificCategory('Other')
  };
  
  footerLinks.forEach(link => {
    const linkText = link.textContent.trim();
    if (linkMappings[linkText]) {
      link.href = 'javascript:void(0)';
      link.onclick = linkMappings[linkText];
    }
  });
}

// Load the footer when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSharedFooter);
} else {
  loadSharedFooter();
}
