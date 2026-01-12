function getToyDataAPI() {
  if (window.toyData && typeof window.toyData.getGroupList === 'function') {
    return window.toyData;
  }
  return null;
}

function isIndexPage() {
  if (window.UrlUtils && typeof window.UrlUtils.isIndexPage === 'function') {
    return window.UrlUtils.isIndexPage();
  }
  return window.location.pathname.includes('index');
}

function navigateToIndex(hashValue) {
  if (window.UrlUtils && typeof window.UrlUtils.navigateToIndex === 'function') {
    window.UrlUtils.navigateToIndex(hashValue ? `#${hashValue}` : '');
    return;
  }
  if (hashValue) {
    window.location.href = `index.html#${hashValue}`;
  } else {
    window.location.href = 'index.html';
  }
}

function shouldAvoidScroll() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('noscroll') || urlParams.get('noscroll') === 'true';
}

class SubHeaderNavigation {
  constructor() {
    this.activeLink = null;
    this.activeSubmenu = null;
    this.hideTimeout = null;
    this.navRoot = document.querySelector('.sub-header');
    this.links = Array.from(document.querySelectorAll('.sub-header-link[data-submenu]'));
    this.submenus = Array.from(document.querySelectorAll('.sub-header-submenu'));
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handleHashChange = this.handleHashChange.bind(this);
    this.init();
  }

  init() {
    if (!this.navRoot) {
      return;
    }
    this.attachLinkListeners();
    this.attachSubmenuListeners();
    document.addEventListener('click', this.handleDocumentClick, true);
    window.addEventListener('hashchange', this.handleHashChange);
  }

  attachLinkListeners() {
    this.links.forEach((link) => {
      link.addEventListener('mouseenter', () => {
        this.showSubmenu(link);
      });

      link.addEventListener('mouseleave', () => {
        this.scheduleHide();
      });

      link.addEventListener('focus', () => {
        this.showSubmenu(link);
      });

      link.addEventListener('blur', () => {
        this.scheduleHide();
      });

      link.addEventListener('click', (event) => {
        const submenu = this.getSubmenuForLink(link);
        if (!submenu) {
          this.hideAllSubmenus();
          return;
        }

        if (window.innerWidth > 900) {
          this.hideAllSubmenus();
          return;
        }

        if (!submenu.classList.contains('active')) {
          event.preventDefault();
          this.showSubmenu(link);
          return;
        }

        this.hideAllSubmenus();
      });
    });
  }

  attachSubmenuListeners() {
    this.submenus.forEach((submenu) => {
      submenu.addEventListener('mouseenter', () => {
        this.clearHideTimer();
        submenu.classList.add('active');
        if (this.activeLink) {
          this.activeLink.classList.add('active');
        }
      });

      submenu.addEventListener('mouseleave', () => {
        this.scheduleHide();
      });
    });
  }

  handleDocumentClick(event) {
    if (!this.navRoot) {
      return;
    }
    if (!this.navRoot.contains(event.target)) {
      this.hideAllSubmenus();
    }
  }

  handleHashChange() {
    if (window.updatingHashFromCategory) {
      return;
    }
    const hash = window.location.hash.substring(1);
    if (hash) {
      this.handleHashNavigation(hash);
    } else {
      this.resetActiveState();
    }
  }

  getSubmenuForLink(link) {
    const submenuId = link.getAttribute('data-submenu');
    if (!submenuId) {
      return null;
    }
    return document.getElementById(`submenu-${submenuId}`);
  }

  showSubmenu(link) {
    const submenu = this.getSubmenuForLink(link);
    if (!submenu) {
      return;
    }
    this.clearHideTimer();
    this.hideAllSubmenus();
    link.classList.add('active');
    submenu.classList.add('active');
    this.activeLink = link;
    this.activeSubmenu = submenu;
  }

  scheduleHide() {
    this.clearHideTimer();
    this.hideTimeout = window.setTimeout(() => {
      this.hideAllSubmenus();
    }, 120);
  }

  clearHideTimer() {
    if (this.hideTimeout) {
      window.clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  hideAllSubmenus() {
    this.clearHideTimer();
    this.links.forEach((link) => link.classList.remove('active'));
    this.submenus.forEach((submenu) => submenu.classList.remove('active'));
    this.activeLink = null;
    this.activeSubmenu = null;
  }

  resetActiveState() {
    this.hideAllSubmenus();
    const allLink = document.querySelector('.sub-header-link.all-products-link');
    if (allLink) {
      allLink.classList.add('active');
    }
  }

  setActiveGroup(groupKey) {
    if (!groupKey) {
      this.resetActiveState();
      return;
    }
    const normalized = String(groupKey).toLowerCase();
    const targetLink = this.links.find((link) => {
      const linkGroup = link.getAttribute('data-toy-group');
      return linkGroup && linkGroup.toLowerCase() === normalized;
    });

    this.links.forEach((link) => link.classList.remove('active'));
    const allLink = document.querySelector('.sub-header-link.all-products-link');
    if (allLink) {
      allLink.classList.remove('active');
    }

    if (targetLink) {
      targetLink.classList.add('active');
    }
  }

  handleHashNavigation(rawHash) {
    const toyAPI = getToyDataAPI();
    if (!rawHash) {
      this.resetActiveState();
      if (isIndexPage() && typeof window.loadAllProducts === 'function') {
        window.loadAllProducts();
      }
      return true;
    }

    const cleanedHash = rawHash.replace(/^#/, '');
    const sanitizedHash = cleanedHash.split('?')[0];

    if (!toyAPI) {
      window.setTimeout(() => {
        this.handleHashNavigation(sanitizedHash);
      }, 100);
      return false;
    }

    const categoryInfo = toyAPI.resolveCategoryByHash(sanitizedHash);
    if (categoryInfo) {
      this.setActiveGroup(categoryInfo.groupKey);
      if (isIndexPage() && typeof window.loadSpecificCategory === 'function') {
        if (shouldAvoidScroll() && typeof window.scrollToProducts === 'function') {
          const originalScroll = window.scrollToProducts;
          window.scrollToProducts = function noop() {};
          window.loadSpecificCategory(categoryInfo.name);
          window.setTimeout(() => {
            window.scrollToProducts = originalScroll;
          }, 800);
        } else {
          window.loadSpecificCategory(categoryInfo.name);
        }
      } else if (!isIndexPage()) {
        navigateToIndex(sanitizedHash);
      }
      return true;
    }

    const groupInfo = toyAPI.resolveGroupByHash(sanitizedHash);
    if (groupInfo) {
      this.setActiveGroup(groupInfo.key);
      const displayName = typeof toyAPI.resolveNavDisplay === 'function'
        ? toyAPI.resolveNavDisplay(groupInfo.key)
        : groupInfo.label;
      if (isIndexPage() && displayName && typeof window.loadSpecificCategory === 'function') {
        window.loadSpecificCategory(displayName);
      } else if (!isIndexPage()) {
        navigateToIndex(groupInfo.hash || groupInfo.slug || sanitizedHash);
      }
      return true;
    }

    if (typeof window.handleHashFallback === 'function') {
      window.handleHashFallback(sanitizedHash);
      return true;
    }

    return false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SubHeaderNavigation;
}
