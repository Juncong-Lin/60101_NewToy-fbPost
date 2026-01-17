import { parseMarkdown } from '../shared/markdown-parser.js';
import { formatPriceRange, formatCurrency } from '../shared/money.js';
import { findProductById, getGroupInfo, resolveNavDisplay } from '../shared/toy-data.js';

const urlParams = new URLSearchParams(window.location.search);
const rawProductId = urlParams.get('id') || urlParams.get('productId') || urlParams.get('product');
const productId = rawProductId ? safeDecodeURIComponent(rawProductId) : '';
const rawGroupParam = urlParams.get('group');
const rawCategoryParam = urlParams.get('category');
const requestedGroup = rawGroupParam ? safeDecodeURIComponent(rawGroupParam) : '';
const requestedCategory = rawCategoryParam ? safeDecodeURIComponent(rawCategoryParam) : '';

let teardownMagnifier = null;

initDetailPage();

async function initDetailPage() {
  if (!productId) {
    renderNotFound('Product not specified.');
    return;
  }

  const match = findProductById(productId);
  if (!match || !match.primary) {
    renderNotFound('Product not found.');
    return;
  }

  const product = { ...match.primary };
  product.variants = Array.isArray(match.variants) ? match.variants.map((variant) => ({ ...variant })) : [];

  if (!product.groupKey && requestedGroup) {
    product.groupKey = requestedGroup;
  }
  if (!product.categorySlug && requestedCategory) {
    product.categorySlug = requestedCategory;
  }
  if (!product.categoryName && product.categorySlug && product.groupKey) {
    const groupInfo = getGroupInfo(product.groupKey);
    const categoryInfo = findCategoryBySlug(groupInfo, product.categorySlug);
    if (categoryInfo) {
      product.categoryName = categoryInfo.name;
    }
  }

  document.title = `${product.name || 'Toy Product'} - Qilitrading.com`;

  renderBreadcrumb(product);
  renderPrimaryInfo(product);
  renderPrice(product);
  renderTags(product);
  renderGallery(product);
  setupImageMagnifier();
  await renderProductContent(product);
  hideLegacySections();
}

function renderPrimaryInfo(product) {
  const nameElement = document.querySelector('.js-product-name');
  if (nameElement) {
    nameElement.textContent = product.name || 'Toy Product';
  }

  const descriptionElement = document.querySelector('.js-product-description');
  if (descriptionElement) {
    descriptionElement.textContent = product.description || buildFallbackDescription(product);
  }

  const ratingContainer = document.querySelector('.product-rating-container');
  if (ratingContainer) {
    ratingContainer.style.display = 'none';
  }

  const ratingStars = document.querySelector('.js-product-rating');
  if (ratingStars) {
    ratingStars.removeAttribute('src');
  }

  const ratingCountElement = document.querySelector('.js-product-rating-count');
  if (ratingCountElement) {
    ratingCountElement.textContent = '';
  }
}

function renderPrice(product) {
  const priceElement = document.querySelector('.js-product-price');
  if (priceElement) {
    priceElement.textContent = derivePriceDisplay(product);
  }

  const originalPriceElement = document.querySelector('.js-product-original-price');
  if (originalPriceElement) {
    originalPriceElement.style.display = 'none';
  }
}

function renderTags(product) {
  const tagsContainer = document.querySelector('.js-product-tags');
  if (!tagsContainer) {
    return;
  }

  const tags = Array.isArray(product.tags) ? product.tags.filter((tag) => !!tag) : [];
  if (tags.length === 0) {
    tagsContainer.innerHTML = '';
    tagsContainer.style.display = 'none';
    return;
  }

  tagsContainer.innerHTML = tags
    .slice(0, 6)
    .map((tag) => `
      <div class="product-tag">
        <span>${escapeHTML(tag)}</span>
      </div>
    `)
    .join('');
  tagsContainer.style.display = '';
}

function renderGallery(product) {
  const mainImage = document.querySelector('.js-product-image');
  const thumbnailsContainer = document.querySelector('.js-product-thumbnails');
  const prevButton = document.querySelector('.js-thumbnail-arrow-left');
  const nextButton = document.querySelector('.js-thumbnail-arrow-right');

  const images = gatherProductImages(product)
    .map((value) => buildAssetUrl(value))
    .filter((value) => !!value);

  if (mainImage) {
    if (images.length > 0) {
      mainImage.src = images[0];
      mainImage.alt = product.name || 'Toy product image';
    } else {
      mainImage.src = '';
      mainImage.alt = 'Image coming soon';
    }
  }

  if (!thumbnailsContainer) {
    return;
  }

  if (images.length === 0) {
    thumbnailsContainer.innerHTML = '';
    if (prevButton) {
      prevButton.style.display = 'none';
    }
    if (nextButton) {
      nextButton.style.display = 'none';
    }
    return;
  }

  thumbnailsContainer.innerHTML = images
    .map((src, index) => {
      const activeClass = index === 0 ? ' active' : '';
      return `
        <button type="button" class="thumbnail-item${activeClass}" data-src="${escapeAttribute(src)}" data-index="${index}" aria-label="View image ${index + 1}">
          <img src="${escapeAttribute(src)}" alt="${escapeHTML(product.name || 'Toy product')} image ${index + 1}" class="thumbnail-img">
        </button>
      `;
    })
    .join('');

  const toggleActive = (target) => {
    thumbnailsContainer.querySelectorAll('.thumbnail-item').forEach((element) => {
      element.classList.toggle('active', element === target);
    });
  };

  thumbnailsContainer.addEventListener('click', (event) => {
    const target = event.target.closest('.thumbnail-item');
    if (!target || !mainImage) {
      return;
    }
    const src = target.dataset.src;
    if (!src) {
      return;
    }
    mainImage.src = src;
    const index = Number.parseInt(target.dataset.index || '0', 10) + 1;
    mainImage.alt = `${product.name || 'Toy product'} image ${index}`;
    toggleActive(target);
    setupImageMagnifier();
  });

  const shouldShowNavigation = images.length > 1;
  if (prevButton) {
    prevButton.style.display = shouldShowNavigation ? 'flex' : 'none';
    prevButton.onclick = () => {
      thumbnailsContainer.scrollBy({ left: -120, behavior: 'smooth' });
    };
  }
  if (nextButton) {
    nextButton.style.display = shouldShowNavigation ? 'flex' : 'none';
    nextButton.onclick = () => {
      thumbnailsContainer.scrollBy({ left: 120, behavior: 'smooth' });
    };
  }
}

async function renderProductContent(product) {
  const detailsContainer = document.querySelector('.js-product-details-content');
  if (!detailsContainer) {
    return;
  }

  let detailHTML = '';

  if (product.markdown) {
    try {
      const markdownUrl = buildAssetUrl(product.markdown);
      if (markdownUrl) {
        const response = await fetch(markdownUrl);
        if (response.ok) {
          const markdown = await response.text();
          detailHTML = parseMarkdown(markdown) || '';
        }
      }
    } catch (error) {
      console.warn('Failed to load product markdown', error);
    }
  }

  if (!detailHTML) {
    detailHTML = `
      <section class="product-overview">
        <h3>Product Overview</h3>
        <p>Detailed product information is being prepared. Contact us for the latest specifications.</p>
      </section>
    `;
  }

  const variantSection = buildVariantSection(product);

  detailsContainer.innerHTML = `${detailHTML}${variantSection}`;
}

function renderBreadcrumb(product) {
  const breadcrumb = document.querySelector('.breadcrumb-nav');
  if (!breadcrumb) {
    return;
  }

  const fragments = [];
  fragments.push('<a href="index.html" class="breadcrumb-link">Home</a>');
  fragments.push('<span class="breadcrumb-separator">&gt;</span>');

  const resolvedGroupKey = product.groupKey || resolveGroupKeyFromQuery();
  const groupInfo = resolvedGroupKey ? getGroupInfo(resolvedGroupKey) : null;
  const groupLabel = groupInfo ? (resolveNavDisplay(resolvedGroupKey) || groupInfo.label) : (product.groupLabel || 'Toys');

  const categoryInfo = groupInfo ? findCategoryBySlug(groupInfo, product.categorySlug || product.categoryHash || resolveCategorySlugFromQuery()) : null;
  if (categoryInfo && !product.categoryName) {
    product.categoryName = categoryInfo.name;
  }

  if (groupInfo && groupInfo.slug) {
    fragments.push(`<a href="index.html#${groupInfo.slug}" class="breadcrumb-link">${escapeHTML(groupLabel)}</a>`);
  } else if (groupLabel) {
    fragments.push(`<span class="breadcrumb-link">${escapeHTML(groupLabel)}</span>`);
  }

  if (product.categoryName || categoryInfo) {
    fragments.push('<span class="breadcrumb-separator">&gt;</span>');
    const categoryTarget = product.categoryHash || product.categorySlug || resolveCategorySlugFromQuery();
    const categoryDisplayName = product.categoryName || (categoryInfo ? categoryInfo.name : 'Category');
    if (categoryTarget) {
      fragments.push(`<a href="index.html#${categoryTarget}" class="breadcrumb-link">${escapeHTML(categoryDisplayName)}</a>`);
    } else {
      fragments.push(`<span class="breadcrumb-link">${escapeHTML(categoryDisplayName)}</span>`);
    }
  }

  fragments.push('<span class="breadcrumb-separator">&gt;</span>');
  fragments.push(`<span class="breadcrumb-current">${escapeHTML(product.name || 'Product')}</span>`);

  breadcrumb.innerHTML = fragments.join('');
}

function buildVariantSection(product) {
  if (!Array.isArray(product.variants) || product.variants.length <= 1) {
    return '';
  }

  const seen = new Set();
  const rows = [];

  product.variants.forEach((variant, index) => {
    if (!variant) {
      return;
    }
    const variantKey = `${variant.sku || variant.id || index}:${variant.variantIndex ?? index}`;
    if (seen.has(variantKey)) {
      return;
    }
    seen.add(variantKey);

    const isPrimary = (variant.idLower && variant.idLower === product.idLower) || (variant.sku && variant.sku === product.sku);
    if (isPrimary && index === 0) {
      return;
    }

    rows.push(`
      <tr>
        <td>${escapeHTML(variant.sku || variant.id || `Variant ${index + 1}`)}</td>
        <td>${escapeHTML(variant.name || product.name || 'Variant')}</td>
        <td>${escapeHTML(derivePriceDisplay(variant))}</td>
        <td>${escapeHTML(variant.priceRight || '')}</td>
      </tr>
    `);
  });

  if (rows.length === 0) {
    return '';
  }

  return `
    <section class="product-variant-section">
      <h3>Available Variants</h3>
      <div class="product-variant-table-wrapper">
        <table class="product-variant-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Price</th>
              <th>MOQ</th>
            </tr>
          </thead>
          <tbody>
            ${rows.join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function gatherProductImages(product) {
  const imageSet = new Set();
  const addImage = (value) => {
    if (!value) {
      return;
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
      return;
    }
    imageSet.add(trimmed);
  };

  addImage(product.image);

  if (product.raw && Array.isArray(product.raw.images)) {
    product.raw.images.forEach(addImage);
  }
  if (product.raw && Array.isArray(product.raw.productImages)) {
    product.raw.productImages.forEach(addImage);
  }
  if (product.raw && product.raw.image) {
    addImage(product.raw.image);
  }

  if (Array.isArray(product.variants)) {
    product.variants.forEach((variant) => {
      if (variant && variant.image) {
        addImage(variant.image);
      }
    });
  }

  return Array.from(imageSet);
}

function hideLegacySections() {
  const compatibilitySection = document.querySelector('.product-compatibility-section');
  if (compatibilitySection) {
    compatibilitySection.style.display = 'none';
  }

  const specificationsSection = document.querySelector('.product-specifications-section');
  if (specificationsSection) {
    specificationsSection.style.display = 'none';
  }
}

function derivePriceDisplay(product) {
  if (!product) {
    return 'Contact for price';
  }

  const lower = extractNumeric(product.lower_price ?? product.raw?.lower_price);
  const higher = extractNumeric(product.higher_price ?? product.raw?.higher_price);
  if (lower !== null && higher !== null) {
    return formatPriceRange(lower, higher);
  }

  const numericCandidates = [
    extractNumeric(product.priceValue),
    extractNumeric(product.price),
    extractNumeric(product.raw?.price),
    extractNumericFromString(product.price),
    extractNumericFromString(product.raw?.price),
  ];

  for (let index = 0; index < numericCandidates.length; index += 1) {
    const numeric = numericCandidates[index];
    if (numeric !== null && numeric > 0) {
      return `USD $${formatCurrency(numeric)}`;
    }
  }

  const stringCandidates = [product.price, product.raw?.price];
  for (let index = 0; index < stringCandidates.length; index += 1) {
    const value = stringCandidates[index];
    const cleaned = normalisePriceString(value);
    if (cleaned) {
      return `USD $${cleaned}`;
    }
  }

  if (product.priceRight) {
    return `MOQ ${product.priceRight}`;
  }

  return 'Contact for price';
}

function extractNumeric(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return null;
  }
  return numeric;
}

function extractNumericFromString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const cleaned = normalisePriceString(value);
  if (!cleaned) {
    return null;
  }
  return extractNumeric(cleaned.replace(/,/g, ''));
}

function normalisePriceString(value) {
  if (value === undefined || value === null) {
    return '';
  }
  let cleaned = String(value).trim();
  if (!cleaned) {
    return '';
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    cleaned = cleaned.replace(/^\s*(usd\b)?\s*\$?\s*/i, '').trim();
  }

  if (!cleaned) {
    return '';
  }

  return cleaned;
}

function buildFallbackDescription(product) {
  const hints = [];
  if (product.marketTag) {
    hints.push(product.marketTag);
  }
  if (Array.isArray(product.tags) && product.tags.length > 0) {
    hints.push(`Tags: ${product.tags.slice(0, 3).join(', ')}`);
  }
  return hints.join(' - ') || 'Detailed product information is coming soon.';
}

function renderNotFound(message) {
  const breadcrumb = document.querySelector('.breadcrumb-nav');
  if (breadcrumb) {
    breadcrumb.innerHTML = `
      <a href="index.html" class="breadcrumb-link">Home</a>
      <span class="breadcrumb-separator">&gt;</span>
      <span class="breadcrumb-current">${escapeHTML(message)}</span>
    `;
  }

  const detailGrid = document.querySelector('.product-detail-grid');
  if (detailGrid) {
    detailGrid.innerHTML = `
      <div class="error-message">
        ${escapeHTML(message)} <a href="index.html">Return to homepage</a>
      </div>
    `;
  }

  const tabs = document.querySelector('.product-info-tabs');
  if (tabs) {
    tabs.style.display = 'none';
  }
}

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

function buildAssetUrl(value) {
  if (!value) {
    return '';
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }
  return encodeURI(trimmed).replace(/#/g, '%23');
}

function setupImageMagnifier() {
  if (teardownMagnifier) {
    teardownMagnifier();
    teardownMagnifier = null;
  }

  const container = document.querySelector('.product-main-image-container');
  const image = document.querySelector('.js-product-image');

  if (!container || !image || !image.src) {
    return;
  }

  const { wrapper, lens, result } = ensureMagnifierElements(container, image);

  const getSize = (element, fallback) => {
    const computed = window.getComputedStyle(element);
    const width = Number.parseFloat(computed.width) || element.getBoundingClientRect().width || fallback;
    const height = Number.parseFloat(computed.height) || element.getBoundingClientRect().height || fallback;
    return { width: width || fallback, height: height || fallback };
  };

  let scaleX = 1;
  let scaleY = 1;

  const updateBackground = () => {
    if (!image.complete || !image.naturalWidth) {
      return;
    }
    const lensSize = getSize(lens, 150);
    const resultSize = getSize(result, 320);
    // zoom factor between result and lens (how many result px per lens px)
    const zoomX = resultSize.width / lensSize.width;
    const zoomY = resultSize.height / lensSize.height;
    scaleX = zoomX;
    scaleY = zoomY;

    // Compute background size in natural image pixels to match zoom
    // backgroundSize = naturalImage * zoom
    result.style.backgroundImage = `url('${image.src}')`;
    result.style.backgroundSize = `${image.naturalWidth * zoomX}px ${image.naturalHeight * zoomY}px`;

    const rect = image.getBoundingClientRect();
    const gap = 18;
    const viewportWidth = document.documentElement.clientWidth;
    const proposedLeft = rect.right + gap;
    const fitsRight = proposedLeft + resultSize.width <= viewportWidth - 10;
    const left = fitsRight ? proposedLeft : Math.max(10, rect.left - resultSize.width - gap);

    // For position fixed, use viewport coordinates (rect.top is already viewport relative)
    result.style.left = `${left}px`;
    result.style.top = `${rect.top}px`;
  };

  const moveLens = (event) => {
    if (!image.complete || !image.naturalWidth) {
      return;
    }

    event.preventDefault();

    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const lensSize = getSize(lens, 150);
    const resultSize = getSize(result, 320);

    const x = clamp(event.clientX - rect.left, lensSize.width / 2, rect.width - lensSize.width / 2);
    const y = clamp(event.clientY - rect.top, lensSize.height / 2, rect.height - lensSize.height / 2);

    lens.style.display = 'block';
    result.style.display = 'block';
    wrapper.classList.add('magnifying');

    lens.style.left = `${x - lensSize.width / 2}px`;
    lens.style.top = `${y - lensSize.height / 2}px`;

    // convert displayed image coordinates to natural image pixels
    const ratioX = image.naturalWidth / rect.width;
    const ratioY = image.naturalHeight / rect.height;

    // compute background offset based on natural coordinates and zoom
    const backgroundX = (x * ratioX * scaleX) - (resultSize.width / 2);
    const backgroundY = (y * ratioY * scaleY) - (resultSize.height / 2);

    // clamp background position to avoid showing empty edges
    const maxBgX = image.naturalWidth * scaleX - resultSize.width;
    const maxBgY = image.naturalHeight * scaleY - resultSize.height;
    const clampedBgX = Math.min(Math.max(backgroundX, 0), Math.max(0, maxBgX));
    const clampedBgY = Math.min(Math.max(backgroundY, 0), Math.max(0, maxBgY));

    result.style.backgroundPosition = `-${clampedBgX}px -${clampedBgY}px`;
  };

  const handleEnter = (event) => {
    updateBackground();
    moveLens(event);
  };

  const handleMove = (event) => {
    moveLens(event);
  };

  const handleLeave = () => {
    lens.style.display = 'none';
    result.style.display = 'none';
    wrapper.classList.remove('magnifying');
  };

  const handleImageLoad = () => {
    updateBackground();
  };

  image.addEventListener('pointerenter', handleEnter);
  image.addEventListener('pointermove', handleMove);
  image.addEventListener('pointerleave', handleLeave);
  image.addEventListener('pointercancel', handleLeave);
  image.addEventListener('pointerup', handleLeave);
  image.addEventListener('load', handleImageLoad);

  window.addEventListener('scroll', handleLeave, true);
  window.addEventListener('resize', updateBackground);

  if (image.complete && image.naturalWidth) {
    updateBackground();
  }

  teardownMagnifier = () => {
    image.removeEventListener('pointerenter', handleEnter);
    image.removeEventListener('pointermove', handleMove);
    image.removeEventListener('pointerleave', handleLeave);
    image.removeEventListener('pointercancel', handleLeave);
    image.removeEventListener('pointerup', handleLeave);
    image.removeEventListener('load', handleImageLoad);
    window.removeEventListener('scroll', handleLeave, true);
    window.removeEventListener('resize', updateBackground);
    handleLeave();
  };
}

function ensureMagnifierElements(container, image) {
  let wrapper = container.querySelector('.image-magnifier-container');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'image-magnifier-container';
    while (container.firstChild) {
      wrapper.appendChild(container.firstChild);
    }
    container.appendChild(wrapper);
  }

  if (image.parentElement !== wrapper) {
    wrapper.appendChild(image);
  }

  let lens = wrapper.querySelector('.magnifier-lens');
  if (!lens) {
    lens = document.createElement('div');
    lens.className = 'magnifier-lens';
    lens.style.display = 'none';
    wrapper.appendChild(lens);
  }

  let result = document.querySelector('.magnifier-result');
  if (!result) {
    result = document.createElement('div');
    result.className = 'magnifier-result';
    result.style.display = 'none';
    document.body.appendChild(result);
  }

  return { wrapper, lens, result };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function findCategoryBySlug(groupInfo, slug) {
  if (!groupInfo || !slug) {
    return null;
  }
  const normalized = String(slug).toLowerCase();
  const directMatch = groupInfo.categories.find((category) => {
    return category.slug.toLowerCase() === normalized || category.hash.toLowerCase() === normalized;
  });
  if (directMatch) {
    return directMatch;
  }
  return groupInfo.categories.find((category) => category.name.toLowerCase() === normalized);
}

function resolveGroupKeyFromQuery() {
  if (!requestedGroup) {
    return '';
  }
  return requestedGroup;
}

function resolveCategorySlugFromQuery() {
  if (!requestedCategory) {
    return '';
  }
  return requestedCategory;
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}
