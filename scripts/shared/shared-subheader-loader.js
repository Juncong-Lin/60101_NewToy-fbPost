// Shared Subheader Loader
async function loadSharedSubheader() {
  try {
    const response = await fetch('components/shared-subheader.html');
    const subheaderHTML = await response.text();
    
    // Find the placeholder element for the subheader
    const placeholder = document.getElementById('shared-subheader-placeholder');
    if (placeholder) {
      // Replace placeholder with actual subheader content
      placeholder.innerHTML = subheaderHTML;
      
      // Reinitialize sub-header navigation after content is loaded
      initializeSubHeaderAfterLoad();
    } else {
      // Fallback: Insert after main header if placeholder not found
      const headerElement = document.querySelector('.qili-header, .checkout-header');
      if (headerElement) {
        headerElement.insertAdjacentHTML('afterend', subheaderHTML);
        
        // Reinitialize sub-header navigation after content is loaded
        initializeSubHeaderAfterLoad();
      }
    }
  } catch (error) {
    console.error('Error loading shared subheader:', error);
  }
}

// Global navigation handler functions for the shared subheader
window.handleNavigationClick = function(hash) {  // Check if we're on the index page
  if (UrlUtils.isIndexPage()) {
    // We're on index page - update hash and let existing navigation handle it
    if (hash) {
      window.location.hash = hash;
    } else {
      // For "See All Departments", load all products
      if (window.loadAllProducts && typeof window.loadAllProducts === 'function') {
        window.loadAllProducts();
      }
    }  } else {
    // We're on a different page - navigate to index with hash
    UrlUtils.navigateToIndex(hash || '');
  }
};

window.handleCategoryClick = function(categoryName) {
  // Hide the dropdown menu for all inkjet printer subcategories
  const inkjetCategories = [
    'DTF Printer',
    'UV DTF Printer',
    'Direct to Fabric & Film',
    'Eco-Solvent Printers',
    'Eco-Solvent Inkjet Printers - With XP600 Printhead',
    'Eco-Solvent Inkjet Printers - With I1600 Printhead',
    'Eco-Solvent Inkjet Printers - With I3200 Printhead',
    'Solvent Inkjet Printers',
    'Solvent Inket Printers - With Ricoh Gen5 Printhead',
    'Solvent Inket Printers - With Ricoh Gen6 Printhead',
    'Solvent Inket Printers - With Konica KM512i Printhead',
    'Solvent Inket Printers - With Konica KM1024i Printhead',
    'Sublimation Printers',
    'Sublimation Printers - With XP600 Printhead',
    'Sublimation Printers - With I1600 Printhead',
    'Sublimation Printers - With I3200 Printhead',
    'UV Inkjet Printers',
    'UV Inkjet Printers - With XP600 Printhead',
    'UV Inkjet Printers - With I1600 Printhead',
    'UV Inkjet Printers - With I3200 Printhead',
    'UV Inkjet Printers - With Ricoh Gen5 Printhead',
    'UV Inkjet Printers - With Ricoh Gen6 Printhead',
    'UV Inkjet Printers - With Konica KM1024i Printhead',
    'UV Flatbed Printers',
    'UV Flatbed Printers - With XP600 Printhead',
    'UV Flatbed Printers - With I3200 Printhead',
    'UV Flatbed Printers - With Ricoh Gen5 Printhead',
    'UV Flatbed Printers - With Ricoh Gen6 Printhead',
    'UV Flatbed Printers - With Konica KM1024i Printheads',
    'UV Hybrid Inkjet Printer',
    'UV Hybrid Inkjet Printer - With Ricoh Gen6 Printheads',
    'UV Hybrid Inkjet Printer - With Konica KM1024i Printheads',
    'Double Side Printers',
    'Direct Printing'
  ];
  
  if (inkjetCategories.includes(categoryName) && window.subHeaderNav && window.subHeaderNav.hideAllSubmenus) {
    window.subHeaderNav.hideAllSubmenus();
  }

  // Check if we're on the index page
  if (UrlUtils.isIndexPage() && window.loadSpecificCategory && typeof window.loadSpecificCategory === 'function') {
    // We're on index page - use existing function
    
    // Map category names to their correct hash values for consistency
    let hashValue = '';
    if (categoryName === 'Eco-Solvent Inkjet Printers - With XP600 Printhead') {
      hashValue = '#eco-solvent-xp600-printers';
    } else if (categoryName === 'Eco-Solvent Inkjet Printers - With I1600 Printhead') {
      hashValue = '#eco-solvent-i1600-printers';
    } else if (categoryName === 'Eco-Solvent Inkjet Printers - With I3200 Printhead') {
      hashValue = '#eco-solvent-i3200-printers';
    } else if (categoryName === 'Epson Printer Spare Parts') {
      hashValue = '#epson-printer-spare-parts';
    } else if (categoryName === 'Roland Printer Spare Parts') {
      hashValue = '#roland-printer-spare-parts';
    } else if (categoryName === 'Canon Printer Spare Parts') {
      hashValue = '#canon-printer-spare-parts';
    } else if (categoryName === 'Ricoh Printer Spare Parts') {
      hashValue = '#ricoh-printer-spare-parts';
    } else if (categoryName === 'HP Printer Spare Parts') {
      hashValue = '#hp-printer-spare-parts';
    } else if (categoryName === 'Brother Printer Spare Parts') {
      hashValue = '#brother-printer-spare-parts';
    } else if (categoryName === 'Mutoh Printer Spare Parts') {
      hashValue = '#mutoh-printer-spare-parts';
    } else if (categoryName === 'Mimaki Printer Spare Parts') {
      hashValue = '#mimaki-printer-spare-parts';
    } else if (categoryName === 'Flora Printer Spare Parts') {
      hashValue = '#flora-printer-spare-parts';
    } else if (categoryName === 'Galaxy Printer Spare Parts') {
      hashValue = '#galaxy-printer-spare-parts';    } else if (categoryName === 'Infiniti / Challenger Printer Spare Parts') {
      hashValue = '#infiniti-challenger-printer-spare-parts';
    } else if (categoryName === 'Wit-color Printer Spare Parts') {
      hashValue = '#wit-color-printer-spare-parts';
    } else if (categoryName === 'Gongzheng Printer Spare Parts') {
      hashValue = '#gongzheng-printer-spare-parts';
    } else if (categoryName === 'Human Printer Spare Parts') {
      hashValue = '#human-printer-spare-parts';
    } else if (categoryName === 'Teflon Printer Spare Parts') {
      hashValue = '#teflon-printer-spare-parts';
    } else if (categoryName === 'Wiper Printer Spare Parts') {
      hashValue = '#wiper-printer-spare-parts';
    } else if (categoryName === 'Xaar Printer Spare Parts') {
      hashValue = '#xaar-printer-spare-parts';
    } else if (categoryName === 'Toshiba Printer Spare Parts') {
      hashValue = '#toshiba-printer-spare-parts';
    } else if (categoryName === 'DTF Printer') {
      hashValue = '#dtf-printer';
    } else if (categoryName === 'UV DTF Printer') {
      hashValue = '#uv-dtf-printer';
    } else if (categoryName === 'Solvent Inkjet Printers') {
      hashValue = '#solvent-inkjet-printers';
    } else if (categoryName === 'Solvent Inket Printers - With Konica KM512i Printhead') {
      hashValue = '#solvent-km512i-printers';
    } else if (categoryName === 'Solvent Inket Printers - With Konica KM1024i Printhead') {
      hashValue = '#solvent-km1024i-printers';
    } else if (categoryName === 'Solvent Inket Printers - With Ricoh Gen5 Printhead') {
      hashValue = '#solvent-ricoh-gen5-printers';
    } else if (categoryName === 'Solvent Inket Printers - With Ricoh Gen6 Printhead') {
      hashValue = '#solvent-ricoh-gen6-printers';
    } else if (categoryName === 'Sublimation Printers') {
      hashValue = '#sublimation-printers';
    } else if (categoryName === 'Sublimation Printers - With XP600 Printhead') {
      hashValue = '#sublimation-xp600-printers';
    } else if (categoryName === 'Sublimation Printers - With I1600 Printhead') {
      hashValue = '#sublimation-i1600-printers';
    } else if (categoryName === 'Sublimation Printers - With I3200 Printhead') {
      hashValue = '#sublimation-printers---with-i3200-printhead';
    } else {
      // Default hash conversion for other categories
      const categorySlug = categoryName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '').replace(/'/g, '').replace(/\//g, '-');
      hashValue = '#' + categorySlug;
    }
    
    // First update the hash to ensure correct browser history
    if (history.pushState) {
      history.pushState(null, null, hashValue);
    } else {
      window.location.hash = hashValue;
    }
      // Then load the category content
    // Call specific loader functions for printer spare parts categories
    if (categoryName === 'Epson Printer Spare Parts' && window.loadEpsonPrinterSpareParts) {
      window.loadEpsonPrinterSpareParts();
    } else if (categoryName === 'Roland Printer Spare Parts' && window.loadRolandPrinterSpareParts) {
      window.loadRolandPrinterSpareParts();
    } else if (categoryName === 'Canon Printer Spare Parts' && window.loadCanonPrinterSpareParts) {
      window.loadCanonPrinterSpareParts();
    } else if (categoryName === 'Ricoh Printer Spare Parts' && window.loadRicohPrinterSpareParts) {
      window.loadRicohPrinterSpareParts();
    } else if (categoryName === 'Infiniti / Challenger Printer Spare Parts' && window.loadInfinitiChallengerPrinterSpareParts) {
      window.loadInfinitiChallengerPrinterSpareParts();
    } else if (categoryName === 'Flora Printer Spare Parts' && window.loadFloraPrinterSpareParts) {
      window.loadFloraPrinterSpareParts();
    } else if (categoryName === 'Galaxy Printer Spare Parts' && window.loadGalaxyPrinterSpareParts) {
      window.loadGalaxyPrinterSpareParts();
    } else if (categoryName === 'Mimaki Printer Spare Parts' && window.loadMimakiPrinterSpareParts) {
      window.loadMimakiPrinterSpareParts();
    } else if (categoryName === 'Mutoh Printer Spare Parts' && window.loadMutohPrinterSpareParts) {
      window.loadMutohPrinterSpareParts();
    } else if (categoryName === 'Wit-color Printer Spare Parts' && window.loadWitColorPrinterSpareParts) {
      window.loadWitColorPrinterSpareParts();
    } else if (categoryName === 'Gongzheng Printer Spare Parts' && window.loadGongzhengPrinterSpareParts) {
      window.loadGongzhengPrinterSpareParts();
    } else if (categoryName === 'Human Printer Spare Parts' && window.loadHumanPrinterSpareParts) {
      window.loadHumanPrinterSpareParts();
    } else if (categoryName === 'Teflon Printer Spare Parts' && window.loadTeflonPrinterSpareParts) {
      window.loadTeflonPrinterSpareParts();
    } else if (categoryName === 'Wiper Printer Spare Parts' && window.loadWiperPrinterSpareParts) {
      window.loadWiperPrinterSpareParts();
    } else if (categoryName === 'Xaar Printer Spare Parts' && window.loadXaarPrinterSpareParts) {
      window.loadXaarPrinterSpareParts();
    } else if (categoryName === 'Toshiba Printer Spare Parts' && window.loadToshibaPrinterSpareParts) {
      window.loadToshibaPrinterSpareParts();
    } else if (categoryName === 'DTF Printer' && window.loadDTFPrinters) {
      window.loadDTFPrinters();
    } else if (categoryName === 'UV DTF Printer' && window.loadUVDTFPrinters) {
      window.loadUVDTFPrinters();
    } else if (categoryName === 'Solvent Inkjet Printers' && window.loadAllSolventPrinters) {
      window.loadAllSolventPrinters();
    } else if (categoryName === 'Solvent Inket Printers - With Konica KM512i Printhead' && window.loadSolventKM512iPrinters) {
      window.loadSolventKM512iPrinters();
    } else if (categoryName === 'Solvent Inket Printers - With Konica KM1024i Printhead' && window.loadSolventKM1024iPrinters) {
      window.loadSolventKM1024iPrinters();
    } else if (categoryName === 'Sublimation Printers' && window.loadSpecificCategory) {
      window.loadSpecificCategory(categoryName);
    } else if (categoryName === 'Sublimation Printers - With XP600 Printhead' && window.loadSpecificCategory) {
      // Set flag to prevent hash regeneration
      window.preventHashUpdate = true;
      window.loadSpecificCategory(categoryName);
      // Clear flag after a short delay
      setTimeout(() => { window.preventHashUpdate = false; }, 100);
    } else if (categoryName === 'Sublimation Printers - With I1600 Printhead' && window.loadSpecificCategory) {
      // Set flag to prevent hash regeneration
      window.preventHashUpdate = true;
      window.loadSpecificCategory(categoryName);
      // Clear flag after a short delay
      setTimeout(() => { window.preventHashUpdate = false; }, 100);
    } else if (categoryName === 'Sublimation Printers - With I3200 Printhead' && window.loadSpecificCategory) {
      // Set flag to prevent hash regeneration
      window.preventHashUpdate = true;
      window.loadSpecificCategory(categoryName);
      // Clear flag after a short delay
      setTimeout(() => { window.preventHashUpdate = false; }, 100);
    } else if (categoryName === 'Eco-Solvent Inkjet Printers - With XP600 Printhead' && window.loadSpecificCategory) {
      // Set flag to prevent hash regeneration
      window.preventHashUpdate = true;
      window.loadSpecificCategory(categoryName);
      // Clear flag after a short delay
      setTimeout(() => { window.preventHashUpdate = false; }, 100);
    } else if (categoryName === 'Eco-Solvent Inkjet Printers - With I1600 Printhead' && window.loadSpecificCategory) {
      // Set flag to prevent hash regeneration
      window.preventHashUpdate = true;
      window.loadSpecificCategory(categoryName);
      // Clear flag after a short delay
      setTimeout(() => { window.preventHashUpdate = false; }, 100);
    } else if (categoryName === 'Eco-Solvent Inkjet Printers - With I3200 Printhead' && window.loadSpecificCategory) {
      // Set flag to prevent hash regeneration
      window.preventHashUpdate = true;
      window.loadSpecificCategory(categoryName);
      // Clear flag after a short delay
      setTimeout(() => { window.preventHashUpdate = false; }, 100);
    } else {
      // For other categories, use the generic loader
      window.loadSpecificCategory(categoryName);
    }
  } else {
    // We're on a different page - navigate to index and handle the category loading
    let hashValue = '';
    if (categoryName === 'Eco-Solvent Inkjet Printers - With XP600 Printhead') {
      hashValue = '#eco-solvent-xp600-printers';
    } else if (categoryName === 'Eco-Solvent Inkjet Printers - With I1600 Printhead') {
      hashValue = '#eco-solvent-i1600-printers';
    } else if (categoryName === 'Eco-Solvent Inkjet Printers - With I3200 Printhead') {
      hashValue = '#eco-solvent-i3200-printers';
    } else if (categoryName === 'Epson Printer Spare Parts') {
      hashValue = '#epson-printer-spare-parts';
    } else if (categoryName === 'Roland Printer Spare Parts') {
      hashValue = '#roland-printer-spare-parts';
    } else if (categoryName === 'Canon Printer Spare Parts') {
      hashValue = '#canon-printer-spare-parts';
    } else if (categoryName === 'Ricoh Printer Spare Parts') {
      hashValue = '#ricoh-printer-spare-parts';
    } else if (categoryName === 'HP Printer Spare Parts') {
      hashValue = '#hp-printer-spare-parts';
    } else if (categoryName === 'Brother Printer Spare Parts') {
      hashValue = '#brother-printer-spare-parts';
    } else if (categoryName === 'Mutoh Printer Spare Parts') {
      hashValue = '#mutoh-printer-spare-parts';
    } else if (categoryName === 'Mimaki Printer Spare Parts') {
      hashValue = '#mimaki-printer-spare-parts';
    } else if (categoryName === 'Flora Printer Spare Parts') {
      hashValue = '#flora-printer-spare-parts';
    } else if (categoryName === 'Galaxy Printer Spare Parts') {
      hashValue = '#galaxy-printer-spare-parts';    } else if (categoryName === 'Infiniti / Challenger Printer Spare Parts') {
      hashValue = '#infiniti-challenger-printer-spare-parts';
    } else if (categoryName === 'Wit-color Printer Spare Parts') {
      hashValue = '#wit-color-printer-spare-parts';
    } else if (categoryName === 'Gongzheng Printer Spare Parts') {
      hashValue = '#gongzheng-printer-spare-parts';
    } else if (categoryName === 'Human Printer Spare Parts') {
      hashValue = '#human-printer-spare-parts';
    } else if (categoryName === 'Teflon Printer Spare Parts') {
      hashValue = '#teflon-printer-spare-parts';
    } else if (categoryName === 'Wiper Printer Spare Parts') {
      hashValue = '#wiper-printer-spare-parts';
    } else if (categoryName === 'Xaar Printer Spare Parts') {
      hashValue = '#xaar-printer-spare-parts';
    } else if (categoryName === 'Toshiba Printer Spare Parts') {
      hashValue = '#toshiba-printer-spare-parts';
    } else if (categoryName === 'DTF Printer') {
      hashValue = '#dtf-printer';
    } else if (categoryName === 'UV DTF Printer') {
      hashValue = '#uv-dtf-printer';
    } else if (categoryName === 'Solvent Inkjet Printers') {
      hashValue = '#solvent-inkjet-printers';
    } else if (categoryName === 'Solvent Inket Printers - With Konica KM512i Printhead') {
      hashValue = '#solvent-km512i-printers';
    } else if (categoryName === 'Solvent Inket Printers - With Konica KM1024i Printhead') {
      hashValue = '#solvent-km1024i-printers';
    } else if (categoryName === 'Solvent Inket Printers - With Ricoh Gen5 Printhead') {
      hashValue = '#solvent-ricoh-gen5-printers';
    } else if (categoryName === 'Solvent Inket Printers - With Ricoh Gen6 Printhead') {
      hashValue = '#solvent-ricoh-gen6-printers';
    } else if (categoryName === 'Sublimation Printers') {
      hashValue = '#sublimation-printers';
    } else if (categoryName === 'Sublimation Printers - With XP600 Printhead') {
      hashValue = '#sublimation-xp600-printers';
    } else if (categoryName === 'Sublimation Printers - With I1600 Printhead') {
      hashValue = '#sublimation-i1600-printers';
    } else if (categoryName === 'Sublimation Printers - With I3200 Printhead') {
      hashValue = '#sublimation-printers---with-i3200-printhead';
    } else {
      // Default hash conversion - for other pages, no category prefix is needed since the above covers all Print Spare Parts
      const categorySlug = categoryName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '').replace(/'/g, '').replace(/\//g, '-');
      hashValue = '#' + categorySlug;
    }
    
    // Navigate to index page with the appropriate hash
    UrlUtils.navigateToIndex(hashValue);
  }
};

// New handler for Economic Version Printers grid view
window.handleEconomicVersionClick = function() {
  // Hide the dropdown menu
  if (window.subHeaderNav && window.subHeaderNav.hideAllSubmenus) {
    window.subHeaderNav.hideAllSubmenus();
  }
  
  // Check if we're on the index page
  if (UrlUtils.isIndexPage() && window.loadAllEconomicVersionPrinters && typeof window.loadAllEconomicVersionPrinters === 'function') {
    // We're on index page - use the new economic version function
    window.loadAllEconomicVersionPrinters();
    window.location.hash = 'eco-solvent-inkjet-printers';
  } else {
    // We're on a different page - navigate to index with hash
    UrlUtils.navigateToIndex('#eco-solvent-inkjet-printers');
  }
};

// Helper function to fix Eco-Solvent submenu items click behavior
function fixEcoSolventSubmenuItems() {
  // We specifically want to ensure these problematic submenu items work on first click
  setTimeout(() => {
    // Find and fix the eco-solvent and sublimation submenu items
    const ecosolventItems = document.querySelectorAll('.sub-header-submenu-item');
    
    ecosolventItems.forEach(item => {
      // Target only the problematic items
      let categoryName = "";
      let hashValue = "";
      if (item.textContent.includes('With XP600 Printhead')) {
        if (item.closest('.sub-header-submenu-column') && item.closest('.sub-header-submenu-column').textContent.includes('Sublimation Printers')) {
          categoryName = 'Sublimation Printers - With XP600 Printhead';
          hashValue = 'sublimation-xp600-printers';
        } else {
          categoryName = 'Eco-Solvent Inkjet Printers - With XP600 Printhead';
          hashValue = 'eco-solvent-xp600-printers';
        }
      } else if (item.textContent.includes('With I1600 Printhead')) {
        if (item.closest('.sub-header-submenu-column') && item.closest('.sub-header-submenu-column').textContent.includes('Sublimation Printers')) {
          categoryName = 'Sublimation Printers - With I1600 Printhead';
          hashValue = 'sublimation-i1600-printers';
        } else {
          categoryName = 'Eco-Solvent Inkjet Printers - With I1600 Printhead';
          hashValue = 'eco-solvent-i1600-printers';
        }
      } else if (item.textContent.includes('With I3200 Printhead')) {
        if (item.closest('.sub-header-submenu-column') && item.closest('.sub-header-submenu-column').textContent.includes('Sublimation Printers')) {
          categoryName = 'Sublimation Printers - With I3200 Printhead';
          hashValue = 'sublimation-printers---with-i3200-printhead';
        } else {
          categoryName = 'Eco-Solvent Inkjet Printers - With I3200 Printhead';
          hashValue = 'eco-solvent-i3200-printers';
        }
      }
      // Only continue if we found a match
      if (categoryName && hashValue) {
        // Clone and replace the element to override any existing click handlers
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        // Add a direct click event handler that will work on any page
        newItem.addEventListener('click', function(event) {
          event.preventDefault();
          // Hide any active submenus
          document.querySelectorAll('.sub-header-submenu.active').forEach(submenu => {
            submenu.classList.remove('active');
          });
          // Check if we're on the index page or another page
          if (UrlUtils.isIndexPage() && window.loadSpecificCategory) {
            if (history.pushState) {
              history.pushState(null, null, `#${hashValue}`);
            } else {
              window.location.hash = `#${hashValue}`;
            }
            window.loadSpecificCategory(categoryName);
          } else {
            UrlUtils.navigateToIndex(`#${hashValue}`);
          }
        });
      }
    });
  }, 300); // Small delay to ensure shared subheader is fully loaded
}

// Helper function to fix Print Spare Parts submenu items click behavior
function fixPrintSparePartsSubmenuItems() {
  // We specifically want to ensure these Print Spare Parts submenu items work on first click
  setTimeout(() => {
    // Find and fix the print spare parts submenu items
    const printSparePartsItems = document.querySelectorAll('.sub-header-submenu-item');
    
    printSparePartsItems.forEach(item => {
      const itemText = item.textContent.trim();
      
      // Target Print Spare Parts submenu items
      if (itemText.includes('Printer Parts') || itemText.includes('Printer Spare Parts')) {
        // Define the mapping for print spare parts categories
        let categoryName = "";
        let hashValue = "";
        
        if (itemText === 'Epson Printer Parts') {
          categoryName = 'Epson Printer Spare Parts';
          hashValue = 'epson-printer-spare-parts';
        } else if (itemText === 'Roland Printer Parts') {
          categoryName = 'Roland Printer Spare Parts';
          hashValue = 'roland-printer-spare-parts';
        } else if (itemText === 'Canon Printer Parts') {
          categoryName = 'Canon Printer Spare Parts';
          hashValue = 'canon-printer-spare-parts';
        } else if (itemText === 'Ricoh Printer Parts') {
          categoryName = 'Ricoh Printer Spare Parts';
          hashValue = 'ricoh-printer-spare-parts';
        } else if (itemText === 'HP Printer Parts') {
          categoryName = 'HP Printer Spare Parts';
          hashValue = 'hp-printer-spare-parts';
        } else if (itemText === 'Brother Printer Parts') {
          categoryName = 'Brother Printer Spare Parts';
          hashValue = 'brother-printer-spare-parts';
        } else if (itemText === 'Mutoh Printer Parts') {
          categoryName = 'Mutoh Printer Spare Parts';
          hashValue = 'mutoh-printer-spare-parts';
        } else if (itemText === 'Mimaki Printer Parts') {
          categoryName = 'Mimaki Printer Spare Parts';
          hashValue = 'mimaki-printer-spare-parts';
        } else if (itemText === 'Flora Printer Parts') {
          categoryName = 'Flora Printer Spare Parts';
          hashValue = 'flora-printer-spare-parts';
        } else if (itemText === 'Galaxy Printer Parts') {
          categoryName = 'Galaxy Printer Spare Parts';
          hashValue = 'galaxy-printer-spare-parts';        } else if (itemText === 'Infiniti/Challenger Parts') {
          categoryName = 'Infiniti / Challenger Printer Spare Parts';
          hashValue = 'infiniti-challenger-printer-spare-parts';
        } else if (itemText === 'Wit-color Printer Parts') {
          categoryName = 'Wit-color Printer Spare Parts';
          hashValue = 'wit-color-printer-spare-parts';
        } else if (itemText === 'Gongzheng Printer Parts') {
          categoryName = 'Gongzheng Printer Spare Parts';
          hashValue = 'gongzheng-printer-spare-parts';
        } else if (itemText === 'Human Printer Parts') {
          categoryName = 'Human Printer Spare Parts';
          hashValue = 'human-printer-spare-parts';
        } else if (itemText === 'Teflon Printer Parts') {
          categoryName = 'Teflon Printer Spare Parts';
          hashValue = 'teflon-printer-spare-parts';
        } else if (itemText === 'Wiper Printer Parts') {
          categoryName = 'Wiper Printer Spare Parts';
          hashValue = 'wiper-printer-spare-parts';
        } else if (itemText === 'Xaar Printer Parts') {
          categoryName = 'Xaar Printer Spare Parts';
          hashValue = 'xaar-printer-spare-parts';
        } else if (itemText === 'Toshiba Printer Parts') {
          categoryName = 'Toshiba Printer Spare Parts';
          hashValue = 'toshiba-printer-spare-parts';
        }
        
        // Only continue if we found a match
        if (categoryName && hashValue) {
          // Clone and replace the element to override any existing click handlers
          const newItem = item.cloneNode(true);
          item.parentNode.replaceChild(newItem, item);
          
          // Add a direct click event handler that will work on any page
          newItem.addEventListener('click', function(event) {
            event.preventDefault();
            
            // Hide any active submenus
            document.querySelectorAll('.sub-header-submenu.active').forEach(submenu => {
              submenu.classList.remove('active');
            });
            
            // Check if we're on the index page or another page
            if (UrlUtils.isIndexPage() && window.loadSpecificCategory) {
              // We're on the index page - update hash and load content directly
              if (history.pushState) {
                history.pushState(null, null, `#${hashValue}`);
              } else {
                window.location.hash = `#${hashValue}`;
              }
              
              // Then load the category content
              window.loadSpecificCategory(categoryName);
            } else {
              // We're on a different page (like detail.html) - navigate to index page with hash
              UrlUtils.navigateToIndex(`#${hashValue}`);
            }
          });
        }
      }
    });
  }, 300); // Small delay to ensure shared subheader is fully loaded
}

window.handlePrintheadClick = function(brand) {
  // Hide any active submenus first
  document.querySelectorAll('.sub-header-submenu.active').forEach(submenu => {
    submenu.classList.remove('active');
  });
  
  // Check if we're on the index page
  if (UrlUtils.isIndexPage() && window.loadPrintheadProducts && typeof window.loadPrintheadProducts === 'function') {
    // We're on index page - use existing function
    window.loadPrintheadProducts(brand);
    window.location.hash = 'printheads-' + brand;  } else {
    // We're on a different page - navigate to index with printhead hash
    UrlUtils.navigateToIndex('#printheads-' + brand);
  }
};

// Helper function to handle upgrading kit clicks from subheader
window.handleUpgradingKitClick = function(kitType) {
  // Hide any active submenus first
  document.querySelectorAll('.sub-header-submenu.active').forEach(submenu => {
    submenu.classList.remove('active');
  });
  
  // Check if we're on the index page
  if (UrlUtils.isIndexPage() && window.loadUpgradingKitProducts && typeof window.loadUpgradingKitProducts === 'function') {
    // We're on the index page - load products directly
    window.loadUpgradingKitProducts(kitType);
    
    // Map kit types to hash values
    let hashValue = `upgrading-kit-${kitType}`;
    if (kitType === 'roll_to_roll_style') {
      hashValue = 'upgrading-kit-roll-to-roll';
    } else if (kitType === 'uv_flatbed') {
      hashValue = 'upgrading-kit-uv-flatbed';
    } else if (kitType === 'without_cable_work') {
      hashValue = 'upgrading-kit-without-cable';
    }
    
    // Update URL hash for proper navigation
    window.location.hash = hashValue;
  } else {
    // We're on a different page (like detail.html) - navigate to index page with hash
    let hashValue = `#upgrading-kit-${kitType}`;
    if (kitType === 'roll_to_roll_style') {
      hashValue = '#upgrading-kit-roll-to-roll';
    } else if (kitType === 'uv_flatbed') {
      hashValue = '#upgrading-kit-uv-flatbed';
    } else if (kitType === 'without_cable_work') {
      hashValue = '#upgrading-kit-without-cable';
    }
    UrlUtils.navigateToIndex(hashValue);
  }
};

// Helper function to handle material clicks from subheader
window.handleMaterialClick = function(materialCategory) {
  // Hide any active submenus first
  document.querySelectorAll('.sub-header-submenu.active').forEach(submenu => {
    submenu.classList.remove('active');
  });
  
  // Check if we're on the index page
  if (UrlUtils.isIndexPage() && window.loadMaterialProducts && typeof window.loadMaterialProducts === 'function') {
    // We're on the index page - load products directly
    window.loadMaterialProducts(materialCategory);
    
    // Update URL hash for proper navigation
    window.location.hash = `material-${materialCategory}`;
  } else {
    // We're on a different page (like detail.html) - navigate to index page with hash
    UrlUtils.navigateToIndex(`#material-${materialCategory}`);
  }
};

// Helper function to handle LED & LCD clicks from subheader
window.handleLedLcdClick = function(ledLcdCategory) {
  // Hide any active submenus first
  document.querySelectorAll('.sub-header-submenu.active').forEach(submenu => {
    submenu.classList.remove('active');
  });
  
  // Check if we're on the index page
  if (UrlUtils.isIndexPage() && window.loadLedLcdProducts && typeof window.loadLedLcdProducts === 'function') {
    // We're on the index page - load products directly
    window.loadLedLcdProducts(ledLcdCategory);
    
    // Update URL hash for proper navigation
    window.location.hash = `led-lcd-${ledLcdCategory}`;
  } else {
    // We're on a different page (like detail.html) - navigate to index page with hash
    UrlUtils.navigateToIndex(`#led-lcd-${ledLcdCategory}`);
  }
};

// Helper function to handle Channel Letter clicks from subheader
window.handleChannelLetterClick = function(channelLetterCategory) {
  // Hide any active submenus first
  document.querySelectorAll('.sub-header-submenu.active').forEach(submenu => {
    submenu.classList.remove('active');
  });
  
  // Check if we're on the index page
  if (UrlUtils.isIndexPage() && window.loadChannelLetterProducts && typeof window.loadChannelLetterProducts === 'function') {
    // We're on the index page - load products directly
    window.loadChannelLetterProducts(channelLetterCategory);
    
    // Update URL hash for proper navigation
    window.location.hash = `channel-letter-${channelLetterCategory}`;
  } else {
    // We're on a different page (like detail.html) - navigate to index page with hash
    UrlUtils.navigateToIndex(`#channel-letter-${channelLetterCategory}`);
  }
};

// Helper function to handle Other clicks from subheader
window.handleOtherClick = function(otherCategory) {
  // Hide any active submenus first
  document.querySelectorAll('.sub-header-submenu.active').forEach(submenu => {
    submenu.classList.remove('active');
  });
  
  // Check if we're on the index page
  if (UrlUtils.isIndexPage() && window.loadOtherProducts && typeof window.loadOtherProducts === 'function') {
    // We're on the index page - load products directly
    window.loadOtherProducts(otherCategory);
    
    // Update URL hash for proper navigation
    window.location.hash = `other-${otherCategory}`;
  } else {
    // We're on a different page (like detail.html) - navigate to index page with hash
    UrlUtils.navigateToIndex(`#other-${otherCategory}`);
  }
};

// Handler for Double Side Printers
window.handleDoubleSidePrintersClick = function() {
  // Hide the dropdown menu
  if (window.subHeaderNav && window.subHeaderNav.hideAllSubmenus) {
    window.subHeaderNav.hideAllSubmenus();
  }
  
  // Check if we're on the index page
  if (UrlUtils.isIndexPage() && window.loadAllDoubleSidePrinters && typeof window.loadAllDoubleSidePrinters === 'function') {
    // We're on index page - load double side printers directly
    window.loadAllDoubleSidePrinters();
    window.location.hash = 'double-side-printers';
  } else {
    // We're on a different page - navigate to index with hash
    UrlUtils.navigateToIndex('#double-side-printers');
  }
};

// Handler for Double Side Direct Printing
window.handleDoubleSideDirectPrintingClick = function() {
  // Hide the dropdown menu
  if (window.subHeaderNav && window.subHeaderNav.hideAllSubmenus) {
    window.subHeaderNav.hideAllSubmenus();
  }
  
  // Check if we're on the index page
  if (UrlUtils.isIndexPage() && window.loadDoubleSideDirectPrinting && typeof window.loadDoubleSideDirectPrinting === 'function') {
    // We're on index page - load double side direct printing directly
    window.loadDoubleSideDirectPrinting();
    window.location.hash = 'double-side-printers---direct-printing';
  } else {
    // We're on a different page - navigate to index with hash
    UrlUtils.navigateToIndex('#double-side-printers---direct-printing');
  }
};

// Function to initialize sub-header navigation after shared content is loaded
function initializeSubHeaderAfterLoad() {
  // Wait a bit to ensure DOM is fully updated
  setTimeout(() => {
    // Create a new instance of SubHeaderNavigation if the class exists
    if (typeof SubHeaderNavigation !== 'undefined') {
      window.subHeaderNav = new SubHeaderNavigation();
      
      // Fix for Eco-Solvent submenu items clicking issue
      fixEcoSolventSubmenuItems();
      
      // Fix for Print Spare Parts submenu items clicking issue
      fixPrintSparePartsSubmenuItems();
      
      // Handle URL hash navigation on initial page load if there's a hash
      let hash = window.location.hash.substring(1);
      
      // Check if the hash contains parameters to prevent scrolling
      const shouldSkipScroll = window.location.search.includes('noscroll=true') || 
                              hash.includes('noscroll=true');
      
      // Clean up the hash by removing any parameters
      if (hash.includes('?')) {
        hash = hash.split('?')[0];
      }
      
      if (hash && window.subHeaderNav.handleHashNavigation) {
        // If we should skip scrolling, temporarily disable the scroll function
        if (shouldSkipScroll && window.scrollToProducts) {
          const originalScrollToProducts = window.scrollToProducts;
          window.scrollToProducts = function() { /* do nothing */ };
          
          // Process the hash navigation
          window.subHeaderNav.handleHashNavigation(hash);
          
          // Restore the original function after a delay
          setTimeout(() => {
            window.scrollToProducts = originalScrollToProducts;
          }, 1000);
        } else {
          // Normal hash navigation
          window.subHeaderNav.handleHashNavigation(hash);
        }
      }
    }
  }, 50); // Small delay to ensure DOM is updated
}

// Load the subheader when the DOM is ready
document.addEventListener('DOMContentLoaded', loadSharedSubheader);
