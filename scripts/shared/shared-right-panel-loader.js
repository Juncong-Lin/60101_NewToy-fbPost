// Right Panel Loader & Functionality

// Function to load the right panel component
function loadRightPanel() {
  fetch('components/shared-right-panel.html')
    .then(response => response.text())
    .then(html => {
      // Create a placeholder div if it doesn't exist
      let placeholder = document.getElementById('shared-right-panel-placeholder');
      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.id = 'shared-right-panel-placeholder';
        document.body.appendChild(placeholder);
      }
      // Insert the right panel HTML
      placeholder.innerHTML = html;
    })
    .catch(error => {
      console.error('Error loading right panel:', error);
    });
}

// Function to scroll to top of the page
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// Function to scroll to footer (contact section)
function scrollToFooter() {
  const footer = document.querySelector('.footer');
  if (footer) {
    footer.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

// Show/hide right panel based on scroll position
function handleRightPanelVisibility() {
  const rightPanel = document.querySelector('.right-panel-fixed');
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  if (rightPanel) {
    // Show panel after scrolling down 200px
    if (scrollTop > 200) {
      rightPanel.style.opacity = '1';
      rightPanel.style.visibility = 'visible';
    } else {
      rightPanel.style.opacity = '0.7';
      rightPanel.style.visibility = 'visible';
    }
  }
}

// Function to handle mobile link prevention for WeChat and WhatsApp
function handleMobileLinkPrevention() {
  const isMobile = window.innerWidth <= 768;
  const wechatBtn = document.querySelector('.wechat-btn');
  const whatsappBtn = document.querySelector('.whatsapp-btn');
  
  if (wechatBtn && whatsappBtn) {
    // Remove any existing event listeners
    wechatBtn.removeEventListener('click', preventClick);
    whatsappBtn.removeEventListener('click', preventClick);
    
    if (isMobile) {
      // On mobile: prevent link navigation
      wechatBtn.addEventListener('click', preventClick);
      whatsappBtn.addEventListener('click', preventClick);
    }
    // On desktop: links work normally (no event listeners added)
  }
}

// Function to prevent click navigation
function preventClick(e) {
  e.preventDefault();
  e.stopPropagation();
  return false;
}

// Load the right panel and initialize functionality when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  loadRightPanel();
  // Add scroll event listener for panel visibility
  window.addEventListener('scroll', handleRightPanelVisibility);
  // Initial visibility check
  handleRightPanelVisibility();
  
  // Set up mobile link prevention after a small delay to ensure DOM is loaded
  setTimeout(handleMobileLinkPrevention, 100);
  
  // Re-run on window resize in case device orientation changes
  window.addEventListener('resize', handleMobileLinkPrevention);
});

// Export functions for global use
window.scrollToTop = scrollToTop;
window.scrollToFooter = scrollToFooter;
