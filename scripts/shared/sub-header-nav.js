// Sub-header navigation functionality
class SubHeaderNavigation {
  constructor() {
    this.activeSubmenu = null;
    this.submenuTimeout = null;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Add event listeners to all sub-header links with submenus
    const subHeaderLinks = document.querySelectorAll('.sub-header-link[data-submenu]');
    const submenus = document.querySelectorAll('.sub-header-submenu');
    
    subHeaderLinks.forEach(link => {
      // Mouse enter - show submenu
      link.addEventListener('mouseenter', (event) => {
        this.showSubmenu(event.target);
      });
      
      // Mouse leave - hide submenu with delay
      link.addEventListener('mouseleave', (event) => {
        this.hideSubmenuWithDelay();
      });      // Click event for both submenu toggle and navigation
      link.addEventListener('click', (event) => {
        const submenuId = link.getAttribute('data-submenu');
        const linkText = link.textContent.trim();
        
        // Check if submenu is currently active and hide it if clicked again
        if (submenuId) {
          const submenu = document.getElementById(`submenu-${submenuId}`);
          if (submenu && submenu.classList.contains('active')) {
            this.hideAllSubmenus();
            return; // Don't proceed with navigation if we're just hiding the menu
          }
        }
        
        // Check if we're on the index page by looking for product grid or if load functions exist
        const isIndexPage = window.loadSpecificCategory && window.loadAllPrintheadProducts && window.loadAllMaterialProducts && window.loadAllLedLcdProducts;// Handle navigation based on the category
        let hash = '';
        if (linkText === 'Inkjet Printers') {
            hash = '#inkjet-printers';
        } else if (linkText === 'Print Heads') {
            hash = '#print-heads';
        } else if (linkText === 'Print Spare Parts') {
            hash = '#print-spare-parts';
        } else if (linkText === 'Upgrading Kit') {
            hash = '#upgrading-kit';
        } else if (linkText === 'Material') {
            hash = '#material';
        } else if (linkText === 'LED & LCD') {
            hash = '#led-lcd';
        } else if (linkText === 'Laser') {
            hash = '#laser';
        } else if (linkText === 'Cutting') {
            hash = '#cutting';
        } else if (linkText === 'Channel Letter') {
            hash = '#channel-letter';
        } else if (linkText === 'CNC') {
            hash = '#cnc';
        } else if (linkText === 'Displays') {
            hash = '#displays';
        } else if (linkText === 'Other') {
            hash = '#other';
        }

        if (isIndexPage) {
          // We're on index page - use existing category loading functions
          if (linkText === 'Inkjet Printers' && window.loadSpecificCategory) {
            window.loadSpecificCategory('Inkjet Printers');
            this.setActiveCategory('Inkjet Printers');
            window.location.hash = hash;
          } else if (linkText === 'Print Heads' && window.loadAllPrintheadProducts) {
            window.loadAllPrintheadProducts();
            this.setActiveCategory('Print Heads');
            window.location.hash = hash;
          } else if (linkText === 'Print Spare Parts' && window.loadSpecificCategory) {
            window.loadSpecificCategory('Print Spare Parts');
            this.setActiveCategory('Print Spare Parts');
            window.location.hash = hash;          } else if (linkText === 'Upgrading Kit' && window.loadSpecificCategory) {
            window.loadSpecificCategory('Upgrading Kit');
            this.setActiveCategory('Upgrading Kit');
            window.location.hash = hash;          }          else if (linkText === 'Material' && window.loadAllMaterialProducts) {
            window.loadAllMaterialProducts();
            this.setActiveCategory('Material');
            window.location.hash = hash;
          } else if (linkText === 'LED & LCD' && window.loadAllLedLcdProducts) {
            window.loadAllLedLcdProducts();
            this.setActiveCategory('LED & LCD');
            window.location.hash = hash;
          } else if (linkText === 'Laser' && window.loadSpecificCategory) {
            window.loadSpecificCategory('Laser');
            this.setActiveCategory('Laser');
            window.location.hash = hash;          } else if (linkText === 'Cutting' && window.loadSpecificCategory) {
            window.loadSpecificCategory('Cutting');
            this.setActiveCategory('Cutting');
            window.location.hash = hash;
          } else if (linkText === 'Channel Letter' && window.loadSpecificCategory) {
            window.loadSpecificCategory('Channel Letter');
            this.setActiveCategory('Channel Letter');
            window.location.hash = hash;
          } else if (linkText === 'CNC' && window.loadSpecificCategory) {
            window.loadSpecificCategory('CNC');
            this.setActiveCategory('CNC');
            window.location.hash = hash;          } else if (linkText === 'Displays' && window.loadSpecificCategory) {
            window.loadSpecificCategory('Displays');
            this.setActiveCategory('Displays');
            window.location.hash = hash;
          } else if (linkText === 'Other' && window.loadSpecificCategory) {
            window.loadSpecificCategory('Other');
            this.setActiveCategory('Other');
            window.location.hash = hash;
          }
        } else {
          // We're on a different page - navigate to index page with hash
          event.preventDefault();
          
          if (linkText === 'Inkjet Printers') {
            hash = '#inkjet-printers';
          } else if (linkText === 'Print Heads') {
            hash = '#print-heads';
          } else if (linkText === 'Print Spare Parts') {
            hash = '#print-spare-parts';
          } else if (linkText === 'Upgrading Kit') {
            hash = '#upgrading-kit';
          } else if (linkText === 'Material') {
            hash = '#material';
          } else if (linkText === 'LED & LCD') {
            hash = '#led-lcd';
          } else if (linkText === 'Laser') {
            hash = '#laser';
          } else if (linkText === 'Cutting') {
            hash = '#cutting';
          } else if (linkText === 'Channel Letter') {
            hash = '#channel-letter';
          } else if (linkText === 'CNC') {
            hash = '#cnc';
          } else if (linkText === 'Displays') {
            hash = '#displays';
          } else if (linkText === 'Other') {
            hash = '#other';
          }          // Navigate to index page with the appropriate hash
          if (hash) {
            UrlUtils.navigateToIndex(hash);
            return;
          }        }
        
        // Show submenu for this link if it has one
        if (submenuId) {
          this.showSubmenu(event.target);
        }
        
        // Don't prevent default to allow any additional onclick handlers
        return true;
      });
    });
    
    // Add event listeners to submenus themselves
    submenus.forEach(submenu => {
      submenu.addEventListener('mouseenter', () => {
        this.clearSubmenuTimeout();
      });
      
      submenu.addEventListener('mouseleave', () => {
        this.hideSubmenuWithDelay();
      });
    });
    
    // Hide submenu when clicking outside
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.sub-header') && !event.target.closest('.sub-header-submenu')) {
        this.hideAllSubmenus();
      }
    });
      // Handle "See All Departments" link separately
    const allProductsLink = document.querySelector('.all-products-link');
    if (allProductsLink) {
      allProductsLink.addEventListener('click', (event) => {
        event.preventDefault();
        this.hideAllSubmenus();
        
        // Check if we're on the index page
        const isIndexPage = window.loadAllProducts && typeof window.loadAllProducts === 'function';
          if (isIndexPage) {
          // We're on index page - use existing function
          this.setActiveCategory('See All Departments');
          window.loadAllProducts();        } else {
          // We're on a different page - navigate to index page
          UrlUtils.navigateToIndex();
        }
      });
    }
  }

  showSubmenu(link) {
    this.clearSubmenuTimeout();
    const submenuId = link.getAttribute('data-submenu');
    
    if (submenuId) {
      // Hide all other submenus
      this.hideAllSubmenus();
      
      // Show the target submenu
      const submenu = document.getElementById(`submenu-${submenuId}`);
      if (submenu) {
        submenu.classList.add('active');
        this.activeSubmenu = submenu;
      }
      
      // Update active state
      this.setActiveCategory(link.textContent.trim());
    }
  }

  hideSubmenuWithDelay() {
    this.submenuTimeout = setTimeout(() => {
      this.hideAllSubmenus();
    }, 300); // 300ms delay
  }

  clearSubmenuTimeout() {
    if (this.submenuTimeout) {
      clearTimeout(this.submenuTimeout);
      this.submenuTimeout = null;
    }
  }

  toggleSubmenu(link) {
    const submenuId = link.getAttribute('data-submenu');
    
    if (submenuId) {
      const submenu = document.getElementById(`submenu-${submenuId}`);
      
      if (submenu && submenu.classList.contains('active')) {
        this.hideAllSubmenus();
      } else {
        this.showSubmenu(link);
      }
    }
  }
  hideAllSubmenus() {
    this.clearSubmenuTimeout();
    const activeSubmenus = document.querySelectorAll('.sub-header-submenu.active');
    activeSubmenus.forEach(submenu => {
      submenu.classList.remove('active');
    });
    this.activeSubmenu = null;
  }

  // Method to set active link based on current page/category
  setActiveCategory(category) {
    document.querySelectorAll('.sub-header-link').forEach(link => {
      link.classList.remove('active');
      if (link.textContent.trim() === category) {
        link.classList.add('active');
      }
    });
  }

  // Methods to expand sidebar menus (for navigation compatibility)
  expandPrintHeadsMenu() {
    // Find and expand the print heads menu in the sidebar if it exists
    const printHeadsLink = document.querySelector('[onclick*="loadAllPrintheadProducts"]');
    if (printHeadsLink) {
      const submenu = printHeadsLink.nextElementSibling;
      if (submenu && submenu.classList.contains('submenu')) {
        printHeadsLink.classList.add('expanded');
        submenu.style.display = 'block';
      }
    }
  }

  expandInkjetPrintersMenu() {
    // Find and expand the inkjet printers menu in the sidebar if it exists
    const inkjetLink = document.querySelector('[onclick*="loadSpecificCategory"][onclick*="Inkjet Printers"]:not([onclick*="Eco-Solvent"]):not([onclick*="UV"]):not([onclick*="Solvent"])');
    if (inkjetLink) {
      const submenu = inkjetLink.nextElementSibling;
      if (submenu && submenu.classList.contains('submenu')) {
        inkjetLink.classList.add('expanded');
        submenu.style.display = 'block';
      }
    }
  }  expandPrintSparePartsMenu() {
    // Find and expand the print spare parts menu in the sidebar if it exists
    const sparePartsLink = document.querySelector('[onclick*="loadAllPrintSpareParts"]');
    if (sparePartsLink) {
      const submenu = sparePartsLink.nextElementSibling;
      if (submenu && submenu.classList.contains('submenu')) {
        sparePartsLink.classList.add('expanded');
        submenu.style.display = 'block';
      }
    }
  }
  expandUpgradingKitMenu() {
    // Find and expand the upgrading kit menu in the sidebar if it exists
    const upgradingKitLink = document.querySelector('[onclick*="loadAllUpgradingKitProducts"]');
    if (upgradingKitLink) {
      const submenu = upgradingKitLink.nextElementSibling;
      if (submenu && submenu.classList.contains('submenu')) {
        upgradingKitLink.classList.add('expanded');
        submenu.style.display = 'block';
      }
    }
  }
  expandMaterialMenu() {
    // Find and expand the material menu in the sidebar if it exists
    const materialLink = document.querySelector('[onclick*="loadAllMaterialProducts"]');
    if (materialLink) {
      const submenu = materialLink.nextElementSibling;
      if (submenu && submenu.classList.contains('submenu')) {
        materialLink.classList.add('expanded');
        submenu.style.display = 'block';
      }
    }
  }

  expandLedLcdMenu() {
    // Find and expand the LED & LCD menu in the sidebar if it exists
    const ledLcdLink = document.querySelector('[onclick*="loadAllLedLcdProducts"]');
    if (ledLcdLink) {
      const submenu = ledLcdLink.nextElementSibling;
      if (submenu && submenu.classList.contains('submenu')) {
        ledLcdLink.classList.add('expanded');
        submenu.style.display = 'block';
      }
    }
  }
  expandChannelLetterMenu() {
    // Find and expand the Channel Letter menu in the sidebar if it exists
    const channelLetterLink = document.querySelector('[onclick*="loadAllChannelLetterProducts"]');
    if (channelLetterLink) {
      const submenu = channelLetterLink.nextElementSibling;
      if (submenu && submenu.classList.contains('submenu')) {
        channelLetterLink.classList.add('expanded');
        submenu.style.display = 'block';
      }
    }
  }
  expandOtherMenu() {
    // Find and expand the Other menu in the sidebar if it exists
    const otherLink = document.querySelector('[onclick*="loadAllOtherProducts"]');
    if (otherLink) {
      const submenu = otherLink.nextElementSibling;
      if (submenu && submenu.classList.contains('submenu')) {
        otherLink.classList.add('expanded');
        submenu.style.display = 'block';
      }
    }
  }
  // Handle hash navigation - called from external scripts
  handleHashNavigation(hash) {
    if (!hash) return;
    
    // Handle special category prefixes
    if (hash.startsWith('category-')) {
      hash = hash.replace('category-', '');
    }
    
    // Handle printhead-specific hashes
    if (hash === 'print-heads' || hash === 'printheads') {
      if (window.loadAllPrintheadProducts) {
        window.loadAllPrintheadProducts();
        this.setActiveCategory('Print Heads');
        this.expandPrintHeadsMenu();
      }
      return;
    }
    
    // Direct handling for eco-solvent printer categories to ensure first-click functionality
    if (hash === 'eco-solvent-xp600-printers') {
      if (window.loadSpecificCategory) {
        window.loadSpecificCategory('Eco-Solvent Inkjet Printers - With XP600 Printhead');
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }
    
    if (hash === 'eco-solvent-i1600-printers') {
      if (window.loadSpecificCategory) {
        window.loadSpecificCategory('Eco-Solvent Inkjet Printers - With I1600 Printhead');
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }
    
    if (hash === 'eco-solvent-i3200-printers') {
      // Make sure we're not in the middle of loading sublimation printers
      if (window.updatingHashFromCategory) {
        return;
      }
      if (window.loadSpecificCategory) {
        window.loadSpecificCategory('Eco-Solvent Inkjet Printers - With I3200 Printhead');
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }
    
    // Direct handling for solvent printer categories
    if (hash === 'solvent-inkjet-printers') {
      if (window.loadAllSolventPrinters) {
        window.loadAllSolventPrinters();
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }
    
    if (hash === 'solvent-km512i-printers') {
      if (window.loadSolventKM512iPrinters) {
        window.loadSolventKM512iPrinters();
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }
    
    if (hash === 'solvent-km1024i-printers') {
      if (window.loadSolventKM1024iPrinters) {
        window.loadSolventKM1024iPrinters();
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }
    
    // Direct handling for UV printer categories
    if (hash === 'uv-inkjet-printers') {
      if (window.loadAllUvInkjetPrinters) {
        window.loadAllUvInkjetPrinters();
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }
    
    if (hash === 'uv-inkjet-printers---with-ricoh-gen6-printhead') {
      if (window.loadUvRicohGen6Printers) {
        window.loadUvRicohGen6Printers();
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }
    
    if (hash === 'uv-konica-km1024i-printers') {
      if (window.loadUvKonica1024iPrinters) {
        window.loadUvKonica1024iPrinters();
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }
    
    // Direct handling for UV Hybrid printer categories
    if (hash === 'uv-hybrid-inkjet-printers') {
      if (window.loadAllUvHybridPrinters) {
        window.loadAllUvHybridPrinters();
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }
    
    if (hash === 'uv-hybrid-konica-km1024i-printers') {
      if (window.loadSpecificCategory) {
        window.loadSpecificCategory('UV Hybrid Inkjet Printer - With Konica KM1024i Printhead');
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }
    
    if (hash === 'uv-hybrid-ricoh-gen6-printers') {
      if (window.loadSpecificCategory) {
        window.loadSpecificCategory('UV Hybrid Inkjet Printer - With Ricoh Gen6 Printhead');
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }      return;
    }
    
    // Direct handling for double side printer categories
    if (hash === 'double-side-printers') {
      if (window.loadAllDoubleSidePrinters) {
        window.loadAllDoubleSidePrinters();
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }
    
    if (hash === 'double-side-printers---direct-printing') {
      if (window.loadDoubleSideDirectPrinting) {
        window.loadDoubleSideDirectPrinting();
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }

    // Handle print spare parts specific hashes
    if (hash === 'print-spare-parts') {
      if (window.loadAllPrintSpareParts) {
        window.loadAllPrintSpareParts();
        this.setActiveCategory('Print Spare Parts');
        this.expandPrintSparePartsMenu();
      }
      return;
    }
      if (hash === 'epson-printer-spare-parts') {
      if (window.loadEpsonPrinterSpareParts) {
        window.loadEpsonPrinterSpareParts();
        this.setActiveCategory('Print Spare Parts');
        this.expandPrintSparePartsMenu();
      }
      return;
    }
      if (hash === 'roland-printer-spare-parts') {
      if (window.loadRolandPrinterSpareParts) {
        window.loadRolandPrinterSpareParts();
        this.setActiveCategory('Print Spare Parts');
        this.expandPrintSparePartsMenu();
      }
      return;
    }
      if (hash === 'canon-printer-spare-parts') {
      if (window.loadCanonPrinterSpareParts) {
        window.loadCanonPrinterSpareParts();
        this.setActiveCategory('Print Spare Parts');
        this.expandPrintSparePartsMenu();
      }
      return;
    }
    
    if (hash === 'ricoh-printer-spare-parts') {
      if (window.loadRicohPrinterSpareParts) {
        window.loadRicohPrinterSpareParts();
        this.setActiveCategory('Print Spare Parts');
        this.expandPrintSparePartsMenu();
      }
      return;
    }
      if (hash.startsWith('printheads-')) {
      const brand = hash.replace('printheads-', '');
      if (window.loadPrintheadProducts) {
        window.loadPrintheadProducts(brand);
        this.setActiveCategory('Print Heads');
        this.expandPrintHeadsMenu();
      }
      return;
    }

    if (hash.startsWith('upgrading-kit-')) {
      const kitType = hash.replace('upgrading-kit-', '');
      let brandKey = kitType;
      
      // Map hash names to data keys
      if (kitType === 'roll-to-roll') {
        brandKey = 'roll_to_roll_style';
      } else if (kitType === 'uv-flatbed') {
        brandKey = 'uv_flatbed';
      } else if (kitType === 'without-cable') {
        brandKey = 'without_cable_work';
      }
      
      if (window.loadUpgradingKitProducts) {
        window.loadUpgradingKitProducts(brandKey);
        this.setActiveCategory('Upgrading Kit');
        this.expandUpgradingKitMenu();      }
      return;
    }

    if (hash === 'material') {
      if (window.loadAllMaterialProducts) {
        window.loadAllMaterialProducts();
        this.setActiveCategory('Material');
        this.expandMaterialMenu();
      }
      return;
    }    if (hash.startsWith('material-')) {
      const materialCategory = hash.replace('material-', '');
      
      if (window.loadMaterialProducts) {
        window.loadMaterialProducts(materialCategory);
        this.setActiveCategory('Material');
        this.expandMaterialMenu();
      }
      return;
    }

    if (hash === 'led-lcd') {
      if (window.loadAllLedLcdProducts) {
        window.loadAllLedLcdProducts();
        this.setActiveCategory('LED & LCD');
        this.expandLedLcdMenu();
      }
      return;
    }    if (hash.startsWith('led-lcd-')) {
      const ledLcdCategory = hash.replace('led-lcd-', '');
      
      if (window.loadLedLcdProducts) {
        window.loadLedLcdProducts(ledLcdCategory);
        this.setActiveCategory('LED & LCD');
        this.expandLedLcdMenu();
      }
      return;
    }

    if (hash === 'channel-letter') {
      if (window.loadAllChannelLetterProducts) {
        window.loadAllChannelLetterProducts();
        this.setActiveCategory('Channel Letter');
        this.expandChannelLetterMenu();
      }
      return;
    }    if (hash.startsWith('channel-letter-')) {
      const channelLetterCategory = hash.replace('channel-letter-', '');
      
      if (window.loadChannelLetterProducts) {
        window.loadChannelLetterProducts(channelLetterCategory);
        this.setActiveCategory('Channel Letter');
        this.expandChannelLetterMenu();
      }
      return;
    }

    if (hash === 'other') {
      if (window.loadAllOtherProducts) {
        window.loadAllOtherProducts();
        this.setActiveCategory('Other');
        this.expandOtherMenu();
      }
      return;
    }

    if (hash.startsWith('other-')) {
      const otherCategory = hash.replace('other-', '');
      
      if (window.loadOtherProducts) {
        window.loadOtherProducts(otherCategory);
        this.setActiveCategory('Other');
        this.expandOtherMenu();
      }
      return;
    }

    // Handle DTF printer specific hashes
    if (hash === 'direct-to-fabric-film') {
      if (window.loadDirectToFabricFilmPrinters) {
        window.loadDirectToFabricFilmPrinters();
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }

    if (hash === 'dtf-printers') {
      if (window.loadDTFPrinters) {
        window.loadDTFPrinters();
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }

    if (hash === 'uv-dtf-printer' || hash === 'uv-dtf-printers') {
      if (window.loadUVDTFPrinters) {
        window.loadUVDTFPrinters();
        this.setActiveCategory('Inkjet Printers');
        this.expandInkjetPrintersMenu();
      }
      return;
    }

// Handle other category hashes
    const categoryMap = {
      'inkjet-printers': 'Inkjet Printers',
      'inkjetprinters-ecosolvent': 'Eco-Solvent Inkjet Printers',
      'direct-to-fabric-film': 'Direct to Fabric & Film',
      'dtf-printers': 'DTF Printers',
      'uv-dtf-printer': 'UV DTF Printer',
      'uv-dtf-printers': 'UV DTF Printers',
      'eco-solvent-xp600-printers': 'Eco-Solvent Inkjet Printers - With XP600 Printhead',
      'eco-solvent-i1600-printers': 'Eco-Solvent Inkjet Printers - With I1600 Printhead',
      'eco-solvent-i3200-printers': 'Eco-Solvent Inkjet Printers - With I3200 Printhead',
      'eco-solvent-inkjet-printers---with-xp600-printhead': 'Eco-Solvent Inkjet Printers - With XP600 Printhead',
      'eco-solvent-inkjet-printers---with-i1600-printhead': 'Eco-Solvent Inkjet Printers - With I1600 Printhead',
      'eco-solvent-inkjet-printers---with-i3200-printhead': 'Eco-Solvent Inkjet Printers - With I3200 Printhead',
      'solvent-inkjet-printers': 'Solvent Inkjet Printers',
      'solvent-km512i-printers': 'Solvent Inkjet Printers - With Konica KM512i Printhead',
      'solvent-km1024i-printers': 'Solvent Inkjet Printers - With Konica KM1024i Printhead',
      'uv-inkjet-printers': 'UV Inkjet Printers',
      'uv-inkjet-printers---with-ricoh-gen6-printhead': 'UV Inkjet Printers - With Ricoh Gen6 Printhead',
      'uv-konica-km1024i-printers': 'UV Inkjet Printers - With Konica KM1024i Printhead',
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
    
    const categoryName = categoryMap[hash];
    if (categoryName && window.loadSpecificCategory) {
      window.loadSpecificCategory(categoryName);
      this.setActiveCategory(categoryName);        // Expand appropriate sidebar menu
      if (categoryName === 'Inkjet Printers' || categoryName.startsWith('Sublimation Printers')) {
        this.expandInkjetPrintersMenu();
      } else if (categoryName === 'Print Spare Parts') {
        this.expandPrintSparePartsMenu();
      } else if (categoryName === 'Upgrading Kit') {        this.expandUpgradingKitMenu();
      } else if (categoryName === 'Material') {
        this.expandMaterialMenu();
      } else if (categoryName === 'LED & LCD') {
        this.expandLedLcdMenu();
      }
    }
  }
}

// Helper function to check if we should avoid scrolling based on URL
function shouldAvoidScroll() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('noscroll');
}

// Initialize sub-header navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're using shared subheader (placeholder exists)
  const hasSharedSubheader = document.getElementById('shared-subheader-placeholder');
  
  // Only auto-initialize if NOT using shared subheader
  if (!hasSharedSubheader) {
    window.subHeaderNav = new SubHeaderNavigation();
    
    // Handle URL hash navigation on initial page load
    let hash = window.location.hash.substring(1);
    
    // Check if the hash contains parameters to prevent scrolling
    const shouldSkipScroll = window.location.search.includes('noscroll=true') || 
                            hash.includes('noscroll=true');
    
    // Clean up the hash by removing any parameters
    if (hash.includes('?')) {
      hash = hash.split('?')[0];
    }
    
    if (hash) {
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
  
  // Always listen for hash changes while on the page
  window.addEventListener('hashchange', function() {
    // Check if hash is being updated by category loading to prevent conflicts
    if (window.updatingHashFromCategory) {
      return;
    }
    
    let newHash = window.location.hash.substring(1);
    
    // Clean up the hash by removing any parameters
    if (newHash.includes('?')) {
      newHash = newHash.split('?')[0];
    }
    
    // Prevent conflicting navigation for sublimation printer subcategories
    if (newHash.startsWith('sublimation-')) {
      // Let the sublimation navigation handle this
      return;
    }
    
    if (newHash && window.subHeaderNav && window.subHeaderNav.handleHashNavigation) {
      window.subHeaderNav.handleHashNavigation(newHash);
    }
  });
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SubHeaderNavigation;
}
