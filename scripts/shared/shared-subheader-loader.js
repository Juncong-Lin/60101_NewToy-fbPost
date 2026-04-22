// Shared Subheader Loader rebuilt for toy-driven navigation
async function loadSharedSubheader() {
  try {
    const response = await fetch('components/shared-subheader.html');
    const subheaderHTML = await response.text();

    const placeholder = document.getElementById('shared-subheader-placeholder');
    if (placeholder) {
      placeholder.innerHTML = subheaderHTML;
      initializeSubHeaderAfterLoad();
      return;
    }

    const headerElement = document.querySelector('.qili-header, .checkout-header');
    if (headerElement) {
      headerElement.insertAdjacentHTML('afterend', subheaderHTML);
      initializeSubHeaderAfterLoad();
    }
  } catch (error) {
    console.error('Error loading shared subheader:', error);
  }
}

function getToyDataAPI() {
  if (window.toyData && typeof window.toyData.getGroupList === 'function') {
    return window.toyData;
  }
  return null;
}

function createSlugForNavigation(value) {
  if (!value) {
    return '';
  }
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findToyCategoryMetaByName(categoryName) {
  const toyAPI = getToyDataAPI();
  if (!toyAPI || !categoryName) {
    return null;
  }

  const groups = toyAPI.getGroupList();
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const category = toyAPI.resolveCategory(group.key, categoryName);
    if (category) {
      return { category, group };
    }
  }

  return null;
}

function resolveNavDisplay(groupKey, toyAPI) {
  if (!toyAPI || !groupKey || typeof toyAPI.resolveNavDisplay !== 'function') {
    return null;
  }
  return toyAPI.resolveNavDisplay(groupKey);
}

function computeGroupHash(groupInfo, fallbackLabel) {
  if (!groupInfo) {
    return createSlugForNavigation(fallbackLabel || '');
  }
  return groupInfo.slug || groupInfo.hash || createSlugForNavigation(groupInfo.label);
}

function navigateToIndex(hashValue) {
  if (UrlUtils && typeof UrlUtils.navigateToIndex === 'function') {
    UrlUtils.navigateToIndex(hashValue || '');
  }
}

window.handleNavigationClick = function(target) {
  const toyAPI = getToyDataAPI();
  let hashValue = '';
  let groupKey = null;
  let navDisplay = null;

  if (typeof target === 'string' && target.startsWith('group:')) {
    groupKey = target.slice(6);
    if (toyAPI && typeof toyAPI.getGroupInfo === 'function') {
      const groupInfo = toyAPI.getGroupInfo(groupKey);
      hashValue = computeGroupHash(groupInfo, groupKey);
      navDisplay = resolveNavDisplay(groupKey, toyAPI) || (groupInfo ? groupInfo.label : groupKey);
    }
  } else if (typeof target === 'string') {
    hashValue = target;
  }

  if (hashValue && !hashValue.startsWith('#')) {
    hashValue = `#${hashValue}`;
  }

  if (UrlUtils && typeof UrlUtils.isIndexPage === 'function' && UrlUtils.isIndexPage()) {
    if (groupKey && window.loadSpecificCategory && typeof window.loadSpecificCategory === 'function') {
      window.loadSpecificCategory(navDisplay || groupKey);
      return;
    }

    if (hashValue) {
      window.location.hash = hashValue;
    } else if (typeof window.loadAllProducts === 'function') {
      window.loadAllProducts();
    }
    return;
  }

  navigateToIndex(hashValue);
};

window.handleCategoryClick = function(categoryName) {
  if (!categoryName) {
    return;
  }

  if (window.subHeaderNav && typeof window.subHeaderNav.hideAllSubmenus === 'function') {
    window.subHeaderNav.hideAllSubmenus();
  }

  const toyMeta = findToyCategoryMetaByName(categoryName);

  if (UrlUtils && typeof UrlUtils.isIndexPage === 'function' && UrlUtils.isIndexPage() && typeof window.loadSpecificCategory === 'function') {
    window.loadSpecificCategory(categoryName);
    return;
  }

  const categorySlug = toyMeta && toyMeta.category
    ? (toyMeta.category.slug || toyMeta.category.hash)
    : createSlugForNavigation(categoryName);

  if (categorySlug) {
    navigateToIndex(`#${categorySlug}`);
  }
};

function populateToySubmenuContent(container, groupKey, toyAPI) {
  if (!container || !groupKey || !toyAPI) {
    return;
  }

  const categories = toyAPI.getCategoriesForGroup(groupKey) || [];

  container.innerHTML = '';
  container.setAttribute('role', 'menu');
  container.classList.add('sub-header-submenu-grid');

  if (categories.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'sub-header-submenu-empty';
    placeholder.textContent = 'Categories coming soon';
    container.appendChild(placeholder);
    return;
  }

  const fragment = document.createDocumentFragment();

  categories.forEach((category) => {
    const link = document.createElement('a');
    link.className = 'sub-header-submenu-item';
    link.href = 'javascript:void(0)';
    link.textContent = category.name;
    link.setAttribute('role', 'menuitem');
    link.addEventListener('click', () => {
      window.handleCategoryClick(category.name);
    });
    fragment.appendChild(link);
  });

  const viewAllLink = document.createElement('a');
  viewAllLink.className = 'sub-header-submenu-item view-all-link';
  viewAllLink.href = 'javascript:void(0)';
  viewAllLink.textContent = 'Shop Entire Collection';
  viewAllLink.setAttribute('role', 'menuitem');
  viewAllLink.addEventListener('click', () => {
    window.handleNavigationClick(`group:${groupKey}`);
  });
  fragment.appendChild(viewAllLink);

  container.appendChild(fragment);
}

function populateToySubmenus() {
  const toyAPI = getToyDataAPI();
  if (!toyAPI || typeof toyAPI.getCategoriesForGroup !== 'function') {
    // Retry shortly if toy data has not been initialized yet
    setTimeout(populateToySubmenus, 100);
    return;
  }

  const processed = new Set();
  document.querySelectorAll('.sub-header-submenu[data-toy-group]').forEach((submenu) => {
    const groupKey = submenu.getAttribute('data-toy-group');
    if (!groupKey || processed.has(groupKey)) {
      return;
    }
    const hasGroupInfo = typeof toyAPI.getGroupInfo === 'function' ? toyAPI.getGroupInfo(groupKey) : null;
    if (!hasGroupInfo) {
      submenu.style.display = 'none';
      const navLink = document.querySelector(`.sub-header-link[data-toy-group="${groupKey}"]`);
      if (navLink) {
        navLink.style.display = 'none';
      }
      processed.add(groupKey);
      return;
    }

    const container = submenu.querySelector('.js-toy-submenu-content');
    if (!container) {
      return;
    }

    populateToySubmenuContent(container, groupKey, toyAPI);
    processed.add(groupKey);
  });
}

function setupSubHeaderAutoScroll() {
  const scrollContainer = document.querySelector('.sub-header-content');
  if (!scrollContainer) {
    return;
  }

  let scrollSpeed = 0;
  let rafId = null;

  const stopAutoScroll = () => {
    scrollSpeed = 0;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const step = () => {
    if (scrollSpeed === 0) {
      rafId = null;
      return;
    }

    const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    if (maxScroll <= 0) {
      stopAutoScroll();
      return;
    }

    const nextScroll = Math.max(0, Math.min(maxScroll, scrollContainer.scrollLeft + scrollSpeed));
    scrollContainer.scrollLeft = nextScroll;

    if ((scrollSpeed < 0 && nextScroll === 0) || (scrollSpeed > 0 && nextScroll === maxScroll)) {
      stopAutoScroll();
      return;
    }

    rafId = requestAnimationFrame(step);
  };

  const updateScrollSpeed = (speed) => {
    if (speed === scrollSpeed) {
      return;
    }
    scrollSpeed = speed;
    if (scrollSpeed === 0) {
      stopAutoScroll();
      return;
    }
    if (rafId === null) {
      rafId = requestAnimationFrame(step);
    }
  };

  const SCROLL_ZONE_MIN = 32;
  const SCROLL_ZONE_RATIO = 0.12;
  const MAX_SPEED = 16;

  const handlePointerMove = (event) => {
    const rect = scrollContainer.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const zoneWidth = Math.max(SCROLL_ZONE_MIN, rect.width * SCROLL_ZONE_RATIO);
    const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;

    if (maxScroll <= 0) {
      updateScrollSpeed(0);
      return;
    }

    if (relativeX < zoneWidth && scrollContainer.scrollLeft > 0) {
      const intensity = (zoneWidth - relativeX) / zoneWidth;
      const speed = -Math.max(2, Math.min(MAX_SPEED, intensity * MAX_SPEED));
      updateScrollSpeed(speed);
      return;
    }

    if (relativeX > rect.width - zoneWidth && scrollContainer.scrollLeft < maxScroll) {
      const distance = relativeX - (rect.width - zoneWidth);
      const intensity = distance / zoneWidth;
      const speed = Math.max(2, Math.min(MAX_SPEED, intensity * MAX_SPEED));
      updateScrollSpeed(speed);
      return;
    }

    updateScrollSpeed(0);
  };

  const handleScroll = () => {
    const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    if ((scrollSpeed < 0 && scrollContainer.scrollLeft <= 0) ||
        (scrollSpeed > 0 && scrollContainer.scrollLeft >= maxScroll)) {
      updateScrollSpeed(0);
    }
  };

  scrollContainer.addEventListener('mousemove', handlePointerMove, { passive: true });
  scrollContainer.addEventListener('mouseleave', () => updateScrollSpeed(0));
  scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', stopAutoScroll);
}

function initializeSubHeaderAfterLoad() {
  setTimeout(() => {
    populateToySubmenus();

    if (typeof SubHeaderNavigation !== 'undefined') {
      window.subHeaderNav = new SubHeaderNavigation();
    }

    setupSubHeaderAutoScroll();

    const hash = window.location.hash ? window.location.hash.substring(1) : '';
    if (hash && window.subHeaderNav && typeof window.subHeaderNav.handleHashNavigation === 'function') {
      window.subHeaderNav.handleHashNavigation(hash);
    }
  }, 50);
}

document.addEventListener('DOMContentLoaded', loadSharedSubheader);
