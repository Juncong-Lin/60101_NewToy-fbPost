import {
  getGroupList,
  getGroupInfo,
  getProductsForGroup,
  getProductsForCategory,
  getAllProducts,
  resolveCategory,
  resolveCategoryByHash,
  resolveGroupByHash,
  resolveNavDisplay,
  getNavGroupMap,
  getLegacyNavAliases,
} from '../shared/toy-data.js';
import { formatPriceRange, formatCurrency, getProductPriceDetails } from '../shared/money.js';
import { parseMarkdown } from '../shared/markdown-parser.js';

const urlParams = new URLSearchParams(window.location.search);
const isSearchRequest = urlParams.has('search');

const toyGroupsMeta = getGroupList();
const navGroupMap = getNavGroupMap() || {};
const legacyNavAliases = getLegacyNavAliases() || {};

const toyGroupAliasMap = Object.create(null);
const toyGroupKeyToDisplay = Object.create(null);
const toyGroupKeys = new Set();

registerGroupAliases();

function registerGroupAliases() {
  toyGroupsMeta.forEach((meta) => {
    const displayName = meta.label || meta.key;
    registerAlias(meta.key, meta.key, displayName);
    if (meta.slug) {
      registerAlias(meta.slug, meta.key, displayName);
    }
    if (meta.hash) {
      registerAlias(meta.hash, meta.key, displayName);
    }
    registerAlias(displayName, meta.key, displayName);
  });

  Object.entries(navGroupMap).forEach(([displayName, groupKey]) => {
    registerAlias(displayName, groupKey, displayName);
  });

  Object.entries(legacyNavAliases).forEach(([displayName, groupKey]) => {
    registerAlias(displayName, groupKey, displayName);
  });
}

function registerAlias(value, groupKey, displayNameOverride) {
  if (!value || !groupKey) {
    return;
  }

  toyGroupKeys.add(groupKey);

  const displayName = displayNameOverride || resolveNavDisplay(groupKey) || value;
  if (displayName && !toyGroupKeyToDisplay[groupKey]) {
    toyGroupKeyToDisplay[groupKey] = displayName;
  }

  const variants = collectAliasVariants(value);
  variants.forEach((alias) => {
    toyGroupAliasMap[alias] = groupKey;
  });

  if (displayName) {
    const displayVariants = collectAliasVariants(displayName);
    displayVariants.forEach((alias) => {
      toyGroupAliasMap[alias] = groupKey;
    });
  }
}

function collectAliasVariants(value) {
  const variants = new Set();
  const raw = String(value);
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  const slug = createNavSlug(trimmed);
  variants.add(raw);
  variants.add(trimmed);
  variants.add(lower);
  if (slug) {
    variants.add(slug);
    if (slug.includes('-and-')) {
      variants.add(slug.replace(/-and-/g, '-'));
    }
  }
  const encoded = encodeURIComponent(trimmed);
  variants.add(encoded);
  variants.add(encoded.toLowerCase());
  return variants;
}

function createNavSlug(value) {
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

function safeLower(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function getNavDisplayForGroup(groupKey) {
  if (!groupKey) {
    return '';
  }
  const display = resolveNavDisplay(groupKey);
  if (display) {
    return display;
  }
  return toyGroupKeyToDisplay[groupKey] || groupKey;
}

function resolveGroupKeyFromAlias(identifier) {
  if (!identifier) {
    return null;
  }
  const variants = collectAliasVariants(identifier);
  for (const variant of variants) {
    if (toyGroupAliasMap[variant]) {
      return toyGroupAliasMap[variant];
    }
  }
  return null;
}

function resolveToyCategory(identifier) {
  if (!identifier) {
    return null;
  }

  let category = resolveCategoryByHash(identifier);
  if (category) {
    return category;
  }

  for (let index = 0; index < toyGroupsMeta.length; index += 1) {
    const group = toyGroupsMeta[index];
    category = resolveCategory(group.key, identifier);
    if (category) {
      return category;
    }
    category = resolveCategory(group.key, safeLower(identifier));
    if (category) {
      return category;
    }
  }

  return null;
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

function buildAssetUrl(value) {
  if (!value) {
    return '';
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }
  const encoded = encodeURI(trimmed).replace(/#/g, '%23');
  return encoded;
}

function safeDecodeURIComponent(value) {
  if (!value) {
    return '';
  }
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function buildDetailUrl(product) {
  const params = new URLSearchParams();
  params.set('productId', product.id);
  params.set('productType', 'toy');
  if (product.groupKey) {
    params.set('group', product.groupKey);
  }
  let categoryToken = product.categorySlug;
  if (!categoryToken && product.categoryHash) {
    categoryToken = safeDecodeURIComponent(product.categoryHash);
  }
  if (!categoryToken && product.categoryName) {
    categoryToken = product.categoryName;
  }
  if (categoryToken) {
    params.set('category', categoryToken);
  }
  return `detail.html?${params.toString()}`;
}

function derivePriceDisplay(product) {
  if (!product) {
    return 'Contact for price';
  }

  const usdCandidates = [
    product.price_usd,
    product.raw?.price_usd,
    product.raw?.priceUSD,
    product.raw?.['price usd'],
  ];
  for (let index = 0; index < usdCandidates.length; index += 1) {
    const candidate = usdCandidates[index];
    if (typeof candidate !== 'string' || !candidate.trim()) {
      continue;
    }
    const match = candidate.match(/(\d+(?:\.\d+)?)/);
    if (!match) {
      continue;
    }
    const numeric = Number(match[1]);
    if (Number.isFinite(numeric) && numeric > 0) {
      return `USD $${numeric.toFixed(3)}`;
    }
  }

  const lower = product.lower_price ?? product.raw?.lower_price;
  const higher = product.higher_price ?? product.raw?.higher_price;
  const rangeDisplay = formatPriceRange(lower, higher);
  if (rangeDisplay && rangeDisplay !== 'Contact for price') {
    return rangeDisplay;
  }

  const priceCandidates = [product.priceValue, product.price, product.raw?.price];
  for (let index = 0; index < priceCandidates.length; index += 1) {
    const candidate = priceCandidates[index];
    if (candidate === undefined || candidate === null) {
      continue;
    }
    const numeric = Number(candidate);
    if (!Number.isNaN(numeric) && numeric > 0) {
      const formatted = formatCurrency(numeric);
      if (formatted) {
        return `USD $${formatted}`;
      }
    }
    if (typeof candidate === 'string' && candidate.trim()) {
      const trimmed = candidate.trim();
      if (/^usd\s*\$/i.test(trimmed)) {
        return trimmed;
      }
      if (/^usd/i.test(trimmed)) {
        return trimmed.replace(/^usd/i, 'USD').trim();
      }
      if (/^\$/i.test(trimmed)) {
        return `USD ${trimmed}`;
      }
      if (/^contact/i.test(trimmed)) {
        return trimmed;
      }
      return `USD $${trimmed}`;
    }
  }

  if (product.priceRight) {
    return `MOQ ${product.priceRight}`;
  }

  return 'Contact for price';
}

function formatNumeric(value, { maximumFractionDigits = 2 } = {}) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  if (Number.isFinite(number)) {
    const decimals = number % 1 === 0 ? 0 : maximumFractionDigits;
    return number.toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  }
  const trimmed = String(value).trim();
  return trimmed || null;
}

function formatCartonSize(carton) {
  if (!carton || typeof carton !== 'object') {
    return null;
  }
  const dimensions = [carton.length, carton.width, carton.height]
    .map((dimension) => formatNumeric(dimension, { maximumFractionDigits: 2 }))
    .filter(Boolean);
  if (dimensions.length === 0) {
    return null;
  }
  return `${dimensions.join(' × ')} cm`;
}

function formatWeightKg(value) {
  const formatted = formatNumeric(value, { maximumFractionDigits: 2 });
  return formatted ? `${formatted} kg` : null;
}

function formatVolumeCbm(value) {
  const formatted = formatNumeric(value, { maximumFractionDigits: 3 });
  return formatted ? `${formatted} cbm` : null;
}

function formatQuantity(value) {
  const formatted = formatNumeric(value, { maximumFractionDigits: 0 });
  return formatted ? `${formatted} pcs` : null;
}

function extractNumericValue(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const number = Number(match[0]);
      return Number.isFinite(number) ? number : null;
    }
  }
  return null;
}

function hasCurrencyOrUnitPrice(value) {
  if (!value) {
    return false;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return false;
  }
  if (/^contact/i.test(trimmed)) {
    return false;
  }
  return /(usd|\$)/i.test(trimmed) && /\d/.test(trimmed);
}

function buildProductSpecsMarkup(product, priceDisplay) {
  const specs = [];
  const attributes = product.attributes || {};

  const productCode = attributes.productCode || product.sku || product.id;
  if (productCode) {
    specs.push({ label: 'Product Code', value: productCode });
  }

  if (attributes.packaging) {
    specs.push({ label: 'Packaging', value: attributes.packaging });
  }

  const quantityPerCartonRaw = attributes.qtyPerCarton ?? product.qty_per_carton ?? null;
  const quantityPerCarton = formatQuantity(quantityPerCartonRaw);
  const quantityPerCartonNumeric = extractNumericValue(quantityPerCartonRaw);
  const priceDetails = getProductPriceDetails(product, quantityPerCartonNumeric);
  if (quantityPerCarton) {
    specs.push({ label: 'Quantity per Carton', value: quantityPerCarton });
  }

  const cartonSize = formatCartonSize(attributes.outerCarton);
  if (cartonSize) {
    specs.push({ label: 'Carton Size', value: cartonSize });
  }

  const volume = formatVolumeCbm(attributes.volumeCbm);
  if (volume) {
    specs.push({ label: 'Volume', value: volume });
  }

  const grossWeight = formatWeightKg(attributes.grossWeightKg);
  if (grossWeight) {
    specs.push({ label: 'Gross Weight', value: `${grossWeight} / carton` });
  }

  const netWeight = formatWeightKg(attributes.netWeightKg);
  if (netWeight) {
    specs.push({ label: 'Net Weight', value: `${netWeight} / carton` });
  }

  const moqRaw = attributes.priceRight ?? product.priceRight ?? null;
  const moq = formatQuantity(moqRaw);
  const moqNumeric = extractNumericValue(moqRaw);
  const priceLooksLikeCurrency = hasCurrencyOrUnitPrice(priceDisplay) || (product.priceValue !== null && product.priceValue !== undefined);
  const isDuplicateMoq = moqNumeric !== null && quantityPerCartonNumeric !== null && moqNumeric === quantityPerCartonNumeric;
  const priceIndicatesMoq = typeof priceDisplay === 'string' && /^MOQ\b/i.test(priceDisplay.trim());
  if (moq && !priceIndicatesMoq && !isDuplicateMoq && !priceLooksLikeCurrency) {
    specs.push({ label: 'MOQ', value: moq });
  }

  const normalizedPrice = priceDetails.pieceDisplay || (typeof priceDisplay === 'string' ? priceDisplay.trim() : '');
  if (normalizedPrice && !/^MOQ\s/i.test(normalizedPrice)) {
    specs.push({ label: 'Price per Piece', value: normalizedPrice });
  }

  if (priceDetails.cartonDisplay) {
    specs.push({ label: 'Price Per Carton', value: priceDetails.cartonDisplay });
  }

  if (specs.length === 0) {
    return '';
  }

  const rows = specs
    .map((spec) => `
      <div class="product-specs-row">
        <span class="product-specs-label">${escapeHTML(spec.label)}</span>
        <span class="product-specs-value">${escapeHTML(spec.value)}</span>
      </div>
    `)
    .join('');

  return `<div class="product-specs">${rows}</div>`;
}

function createProductCard(product) {
  const detailUrl = buildDetailUrl(product);
  const priceDisplay = derivePriceDisplay(product);
  const sku = product.sku || product.id;
  // Badges intentionally disabled to avoid small numeric chips (e.g. "2") appearing
  // under the title; we keep the area for future badges but do not render them now.
  const badges = [];

  const imageUrl = buildAssetUrl(product.image);
  const imageHTML = imageUrl
    ? `<img class="product-image" src="${escapeHTML(imageUrl)}" alt="${escapeHTML(product.name)} preview">`
    : `<div class="product-image product-image-placeholder" role="img" aria-label="Image coming soon"></div>`;

  const badgeHTML = badges.length ? `<div class="product-badges">${badges.join('')}</div>` : '';
  const specsHTML = buildProductSpecsMarkup(product, priceDisplay);
  const primaryProductCode = product.attributes?.productCode || product.sku || product.id;
  const shouldShowSku = sku && safeLower(sku) !== safeLower(primaryProductCode);
  const skuMarkup = shouldShowSku
    ? `<div class="product-meta"><span class="product-sku">SKU: ${escapeHTML(sku)}</span></div>`
    : '';

  return `
    <div class="product-container" data-product-id="${escapeHTML(product.id)}">
      <div class="product-image-container">
        <a href="${detailUrl}" class="product-image-link">
          ${imageHTML}
        </a>
      </div>
      <div class="product-name">
        <a href="${detailUrl}" class="product-link limit-text-to-2-lines">${escapeHTML(product.name || 'Toy product')}</a>
      </div>
      ${badgeHTML}
      ${skuMarkup}
      ${specsHTML}
      <div class="product-spacer"></div>
      <a class="add-to-cart-button button-primary" href="${detailUrl}" aria-label="View details for ${escapeHTML(product.name || sku)}">
        View Details
      </a>
    </div>
  `;
}

function renderProducts(products, context = 'regular') {
  if (!Array.isArray(products) || products.length === 0) {
    return `
      <div class="coming-soon">
        <h2>Products coming soon</h2>
        <p>We are curating toys for this collection.</p>
      </div>
    `;
  }
  return products.map((product) => createProductCard(product, context)).join('');
}

function truncateText(value, maxLength = 160) {
  if (!value) {
    return '';
  }
  const text = String(value).trim();
  if (!text) {
    return '';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function buildHeroDescription(product, snippet) {
  if (snippet) {
    return truncateText(snippet, 220);
  }
  if (!product) {
    return '';
  }
  if (product.description && product.description.trim()) {
    return truncateText(product.description, 220);
  }
  if (Array.isArray(product.tags) && product.tags.length > 0) {
    return truncateText(product.tags.slice(0, 3).join(', '), 220);
  }
  if (product.marketTag) {
    return truncateText(product.marketTag, 220);
  }
  return 'Discover the latest arrivals from this collection.';
}

function extractPlainTextFromHtml(html) {
  if (!html) {
    return '';
  }
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const paragraph = temp.querySelector('p, li');
  if (paragraph && paragraph.textContent) {
    return paragraph.textContent.trim();
  }
  return temp.textContent.trim();
}

async function loadProductHeroSnippet(product) {
  if (!product || !product.markdown) {
    return '';
  }
  try {
    const markdownUrl = buildAssetUrl(product.markdown);
    if (!markdownUrl) {
      return '';
    }
    const response = await fetch(markdownUrl);
    if (!response.ok) {
      return '';
    }
    const markdownText = await response.text();
    const renderedHtml = parseMarkdown(markdownText);
    const plainText = extractPlainTextFromHtml(renderedHtml);
    return truncateText(plainText, 260);
  } catch (error) {
    console.warn('Failed to load hero markdown snippet', error);
    return '';
  }
}

function chooseRandomProduct(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * products.length);
  return products[index];
}

async function selectHeroHighlights(limit = toyGroupsMeta.length) {
  const highlightPromises = toyGroupsMeta.map(async (meta) => {
    const groupInfo = getGroupInfo(meta.key);
    if (!groupInfo || !Array.isArray(groupInfo.allProducts) || groupInfo.allProducts.length === 0) {
      return null;
    }

    const candidates = groupInfo.allProducts.filter((product) => product && product.image);
    if (candidates.length === 0) {
      return null;
    }

    const product = chooseRandomProduct(candidates);
    if (!product) {
      return null;
    }

    const imageUrl = buildAssetUrl(product.image);
    if (!imageUrl) {
      return null;
    }

    const snippet = await loadProductHeroSnippet(product);
    return {
      product,
      groupInfo,
      snippet,
      imageUrl,
    };
  });

  const results = await Promise.all(highlightPromises);
  const highlights = results.filter((value) => !!value);

  const truncated = highlights.slice(0, limit);
  for (let i = truncated.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    const temp = truncated[i];
    truncated[i] = truncated[randomIndex];
    truncated[randomIndex] = temp;
  }

  return truncated;
}

function createHeroIndicatorMarkup(index, label = null) {
  const indicatorLabel = label ? `Go to ${label}` : `Go to slide ${index + 1}`;
  return `
    <button
      type="button"
      class="hero-indicator${index === 0 ? ' active' : ''}"
      data-index="${index}"
      aria-label="${escapeHTML(indicatorLabel)}"
    ></button>
  `;
}

function createHeroSlideMarkup(product, groupInfo, index, snippet, imageUrlOverride) {
  if (!product) {
    return '';
  }

  const imageUrl = imageUrlOverride || buildAssetUrl(product.image);
  if (!imageUrl) {
    return '';
  }

  const slideClasses = ['hero-slide'];
  if (index === 0) {
    slideClasses.push('active');
  }

  const detailUrl = buildDetailUrl(product);
  const badgeText = (groupInfo && groupInfo.label) || product.groupLabel || 'Featured Toys';

  const metaParts = [];
  if (badgeText) {
    metaParts.push(badgeText);
  }
  if (product.categoryName) {
    metaParts.push(product.categoryName);
  }
  if (product.sku) {
    metaParts.push(`SKU ${product.sku}`);
  }
  const metaText = metaParts.join(' • ');

  const priceText = derivePriceDisplay(product);
  const description = buildHeroDescription(product, snippet);
  const inlineStyle = index === 0 ? ' style="opacity:1;transform:translateX(0);z-index:2;"' : '';

  return `
    <div class="${slideClasses.join(' ')}" data-index="${index}"${inlineStyle}>
      <article class="hero-card hero-card-toy">
        <a class="hero-card-link" href="${detailUrl}" aria-label="View ${escapeHTML(product.name || 'toy product')}">
          <div class="hero-image-wrapper">
            <img class="hero-image" src="${escapeHTML(imageUrl)}" alt="${escapeHTML(product.name || badgeText)} showcase image">
          </div>
          <div class="hero-overlay">
            <div class="hero-badge">${escapeHTML(badgeText)}</div>
            <h3 class="hero-title">${escapeHTML(product.name || 'Toy highlight')}</h3>
            ${metaText ? `<p class="hero-meta">${escapeHTML(metaText)}</p>` : ''}
            ${priceText ? `<p class="hero-price">${escapeHTML(priceText)}</p>` : ''}
            ${description ? `<p class="hero-description">${escapeHTML(description)}</p>` : ''}
            <span class="hero-cta">
              <span>Explore product</span>
              <span class="hero-cta-icon" aria-hidden="true">&rarr;</span>
            </span>
          </div>
        </a>
      </article>
    </div>
  `;
}

async function renderHeroSlides() {
  const heroContainer = document.querySelector('.hero-container');
  const heroIndicatorsContainer = document.querySelector('.hero-indicators');
  if (!heroContainer || !heroIndicatorsContainer) {
    return [];
  }

  heroContainer.innerHTML = `
    <div class="hero-loading">
      <div class="loading-spinner"></div>
      <p>Curating featured collections...</p>
    </div>
  `;
  heroIndicatorsContainer.innerHTML = '';

  const highlights = await selectHeroHighlights();

  if (highlights.length === 0) {
    heroContainer.innerHTML = '';
    heroIndicatorsContainer.innerHTML = '';
    heroIndicatorsContainer.style.display = 'none';
    const navButtons = document.querySelectorAll('.hero-nav-arrow');
    navButtons.forEach((button) => {
      button.style.display = 'none';
      button.disabled = true;
    });
    return [];
  }

  const renderedEntries = [];
  highlights.forEach((highlight, index) => {
    const markup = createHeroSlideMarkup(highlight.product, highlight.groupInfo, renderedEntries.length, highlight.snippet, highlight.imageUrl);
    if (markup) {
      renderedEntries.push({ markup, highlight });
    }
  });

  heroContainer.innerHTML = renderedEntries.map((entry) => entry.markup).join('');

  if (renderedEntries.length > 1) {
    heroIndicatorsContainer.innerHTML = renderedEntries
      .map((entry, index) => createHeroIndicatorMarkup(index, entry.highlight.product.name))
      .join('');
    heroIndicatorsContainer.style.display = 'flex';
    const navButtons = document.querySelectorAll('.hero-nav-arrow');
    navButtons.forEach((button) => {
      button.style.display = '';
      button.disabled = false;
    });
  } else {
    heroIndicatorsContainer.innerHTML = '';
    heroIndicatorsContainer.style.display = 'none';
    const navButtons = document.querySelectorAll('.hero-nav-arrow');
    navButtons.forEach((button) => {
      button.style.display = 'none';
      button.disabled = true;
    });
  }

  return renderedEntries.map((entry) => entry.highlight);
}

function attachAddToCartListeners() {
  // Cart is disabled while we focus on catalog navigation.
}

function hideActiveSubmenus() {
  document.querySelectorAll('.submenu.active').forEach((submenu) => {
    submenu.classList.remove('active');
  });
  document.querySelectorAll('.expandable.active').forEach((link) => {
    link.classList.remove('active');
  });
}

function showLoadingState() {
  const productsGrid = document.querySelector('.js-prodcts-grid');
  if (!productsGrid) {
    return;
  }
  productsGrid.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading products...</p>
    </div>
  `;
  productsGrid.style.display = '';
  productsGrid.classList.remove('showing-coming-soon');
}

function clearProductsGrid() {
  const productsGrid = document.querySelector('.js-prodcts-grid');
  if (productsGrid) {
    productsGrid.innerHTML = '';
    productsGrid.style.display = 'none';
    productsGrid.classList.remove('showing-coming-soon');
  }

  const pageHeader = document.querySelector('.page-header');
  if (pageHeader && pageHeader.parentNode) {
    pageHeader.parentNode.removeChild(pageHeader);
  }

  const breadcrumb = document.querySelector('.breadcrumb-nav');
  if (breadcrumb && breadcrumb.parentNode) {
    breadcrumb.parentNode.removeChild(breadcrumb);
  }
}

function showHeroBanner() {
  const heroBanner = document.querySelector('.hero-banner');
  if (!heroBanner) {
    return;
  }
  heroBanner.style.display = 'block';
  window.setTimeout(() => {
    heroBanner.classList.add('show');
    if (window.heroCarousel) {
      window.heroCarousel.startAutoPlay();
    }
  }, 10);
}

function hideHeroBanner() {
  const heroBanner = document.querySelector('.hero-banner');
  if (!heroBanner) {
    return;
  }
  if (window.heroCarousel) {
    window.heroCarousel.stopAutoPlay();
  }
  heroBanner.classList.remove('show');
  window.setTimeout(() => {
    heroBanner.style.display = 'none';
  }, 320);
}

function scrollToProducts() {
  const mainElement = document.querySelector('.main');
  if (!mainElement) {
    return;
  }
  window.scrollTo({
    top: Math.max(mainElement.offsetTop - 120, 0),
    behavior: 'smooth',
  });
}

function updatePageHeader(title, productCount = null) {
  let headerElement = document.querySelector('.page-header');
  if (!headerElement) {
    headerElement = document.createElement('h2');
    headerElement.className = 'page-header';
    const mainElement = document.querySelector('.main');
    if (mainElement) {
      mainElement.insertBefore(headerElement, mainElement.firstChild);
    }
  }

  if (productCount !== null && productCount !== undefined) {
    headerElement.textContent = `${title} (Total: ${productCount})`;
  } else {
    headerElement.textContent = title;
  }
}

function ensureBreadcrumbContainer() {
  let breadcrumbElement = document.querySelector('.breadcrumb-nav');
  if (!breadcrumbElement) {
    breadcrumbElement = document.createElement('div');
    breadcrumbElement.className = 'breadcrumb-nav';
    const mainElement = document.querySelector('.main');
    if (mainElement) {
      mainElement.insertBefore(breadcrumbElement, mainElement.firstChild);
    }
  }
  return breadcrumbElement;
}

function createBreadcrumbSeparator() {
  const separator = document.createElement('span');
  separator.className = 'breadcrumb-separator';
  separator.textContent = '>';
  return separator;
}

function createBreadcrumbNode({ text, href, onClick, isCurrent }) {
  if (isCurrent || (!href && !onClick)) {
    const span = document.createElement('span');
    span.className = 'breadcrumb-current';
    span.textContent = text;
    return span;
  }

  const link = document.createElement('a');
  link.className = 'breadcrumb-link';
  link.textContent = text;
  link.href = href || 'javascript:void(0)';
  if (typeof onClick === 'function') {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      onClick();
    });
  }
  return link;
}

function updateToyBreadcrumb({ navDisplayName, groupInfo, categoryInfo }) {
  const breadcrumbElement = ensureBreadcrumbContainer();
  if (!breadcrumbElement) {
    return;
  }

  breadcrumbElement.innerHTML = '';

  const isDetailPage = window.location.pathname.includes('detail.html');
  const nodes = [];

  const homeNode = createBreadcrumbNode({
    text: 'Home',
    href: isDetailPage ? 'index.html' : 'javascript:void(0)',
    onClick: isDetailPage ? null : () => {
      if (window.loadAllProducts) {
        window.loadAllProducts();
      }
    },
    isCurrent: false,
  });
  nodes.push(homeNode);

  const groupSlug = groupInfo && (groupInfo.slug || groupInfo.hash)
    ? (groupInfo.slug || groupInfo.hash)
    : '';

  if (navDisplayName) {
    nodes.push(createBreadcrumbSeparator());
    const navNode = createBreadcrumbNode({
      text: navDisplayName,
      href: isDetailPage && groupSlug ? `index.html#${groupSlug}` : 'javascript:void(0)',
      onClick: isDetailPage ? null : () => {
        if (window.loadSpecificCategory) {
          window.loadSpecificCategory(navDisplayName);
        }
      },
      isCurrent: !categoryInfo,
    });
    nodes.push(navNode);
  }

  if (categoryInfo && categoryInfo.name) {
    nodes.push(createBreadcrumbSeparator());
    const categorySlug = categoryInfo.slug || categoryInfo.hash || categoryInfo.name;
    const categoryNode = createBreadcrumbNode({
      text: categoryInfo.name,
      href: isDetailPage ? `index.html#${categorySlug}` : 'javascript:void(0)',
      onClick: isDetailPage ? null : () => {
        if (window.loadSpecificCategory) {
          window.loadSpecificCategory(categoryInfo.name);
        }
      },
      isCurrent: true,
    });
    nodes.push(categoryNode);
  }

  nodes.forEach((node) => {
    breadcrumbElement.appendChild(node);
  });
}

function showEmptyCategoryState(label) {
  const productsGrid = document.querySelector('.js-prodcts-grid');
  if (!productsGrid) {
    return;
  }
  productsGrid.innerHTML = `
    <div class="coming-soon">
      <h2>${escapeHTML(label || 'Collection')} Products</h2>
      <p>Products for this collection will be available soon.</p>
    </div>
  `;
  productsGrid.style.display = '';
  productsGrid.classList.add('showing-coming-soon');
  updatePageHeader(label || 'Collection');
}

function updateSubHeaderActiveState(groupKey) {
  const links = document.querySelectorAll('.sub-header-link');
  links.forEach((link) => {
    link.classList.remove('active');
  });
  const allLink = document.querySelector('.sub-header-link.all-products-link');
  if (!groupKey && allLink) {
    allLink.classList.add('active');
    return;
  }
  if (!groupKey) {
    return;
  }
  const normalized = String(groupKey).toLowerCase();
  links.forEach((link) => {
    const linkGroup = link.getAttribute('data-toy-group');
    if (linkGroup && linkGroup.toLowerCase() === normalized) {
      link.classList.add('active');
    }
  });
}

function applyProductsToGrid(products, context = 'regular') {
  const productsGrid = document.querySelector('.js-prodcts-grid');
  if (!productsGrid) {
    return;
  }
  const html = renderProducts(products, context);
  productsGrid.innerHTML = html;
  productsGrid.style.display = '';
  productsGrid.classList.toggle('showing-coming-soon', products.length === 0);
  attachAddToCartListeners();
}

function updateHash(hash) {
  const newUrl = new URL(window.location.href);
  newUrl.hash = hash ? `#${hash}` : '';
  window.updatingHashFromCategory = true;
  window.history.replaceState(null, '', newUrl);
  window.setTimeout(() => {
    window.updatingHashFromCategory = false;
  }, 30);
}

function showProductsView({
  products,
  title,
  productCount,
  navDisplayName,
  groupInfo,
  categoryInfo,
  shouldHideHero,
  context,
  hashValue,
}) {
  if (shouldHideHero) {
    hideHeroBanner();
  } else if (!isSearchRequest) {
    showHeroBanner();
  }

  if (hashValue !== undefined) {
    updateHash(hashValue);
  }

  updatePageHeader(title, productCount);
  updateToyBreadcrumb({ navDisplayName, groupInfo, categoryInfo });
  applyProductsToGrid(products, context);
  scrollToProducts();
}

function loadAllProducts(options = {}) {
  updateSubHeaderActiveState(null);
  hideActiveSubmenus();
  clearProductsGrid();
  showHeroBanner();
  if (!options.skipHashUpdate) {
    updateHash('');
  }
  return true;
}

function loadToyGroupView(groupKey, options = {}) {
  if (!groupKey || !toyGroupKeys.has(groupKey)) {
    return false;
  }

  const groupInfo = getGroupInfo(groupKey);
  if (!groupInfo) {
    showEmptyCategoryState(getNavDisplayForGroup(groupKey));
    return false;
  }

  const products = getProductsForGroup(groupKey);
  const navDisplayName = options.displayName || getNavDisplayForGroup(groupKey);

  updateSubHeaderActiveState(groupKey);

  showProductsView({
    products,
    title: navDisplayName,
    productCount: products.length,
    navDisplayName,
    groupInfo,
    categoryInfo: null,
    shouldHideHero: true,
    context: 'group',
    hashValue: options.skipHashUpdate ? undefined : (groupInfo.slug || groupInfo.hash || createNavSlug(groupInfo.label)),
  });

  return true;
}

function loadCategoryView(categoryInfo, groupInfo, options = {}) {
  if (!categoryInfo || !groupInfo) {
    return false;
  }
  const products = getProductsForCategory(groupInfo.key, categoryInfo.name);
  if (!products || products.length === 0) {
    showEmptyCategoryState(categoryInfo.name);
    return false;
  }

  const navDisplayName = getNavDisplayForGroup(groupInfo.key);
  updateSubHeaderActiveState(groupInfo.key);

  showProductsView({
    products,
    title: categoryInfo.name,
    productCount: products.length,
    navDisplayName,
    groupInfo,
    categoryInfo,
    shouldHideHero: true,
    context: 'category',
    hashValue: options.skipHashUpdate ? undefined : (categoryInfo.slug || categoryInfo.hash || createNavSlug(categoryInfo.name)),
  });

  return true;
}

function loadSpecificCategory(identifier, options = {}) {
  if (!identifier) {
    return loadAllProducts(options);
  }

  const groupAlias = resolveGroupKeyFromAlias(identifier);
  if (groupAlias) {
    return loadToyGroupView(groupAlias, options);
  }

  const categoryInfo = resolveToyCategory(identifier);
  if (!categoryInfo) {
    showEmptyCategoryState(identifier);
    return false;
  }

  const groupInfo = getGroupInfo(categoryInfo.groupKey);
  return loadCategoryView(categoryInfo, groupInfo, options);
}

function handleHashNavigation(rawHash) {
  const cleanedHash = rawHash ? rawHash.replace(/^#/, '') : '';
  if (!cleanedHash) {
    if (!isSearchRequest) {
      clearProductsGrid();
      showHeroBanner();
    }
    return false;
  }

  const categoryInfo = resolveCategoryByHash(cleanedHash);
  if (categoryInfo) {
    const groupInfo = getGroupInfo(categoryInfo.groupKey);
    return loadCategoryView(categoryInfo, groupInfo, { skipHashUpdate: true });
  }

  const groupInfo = resolveGroupByHash(cleanedHash);
  if (groupInfo) {
    return loadToyGroupView(groupInfo.key, { skipHashUpdate: true, displayName: getNavDisplayForGroup(groupInfo.key) });
  }

  const groupAlias = resolveGroupKeyFromAlias(cleanedHash);
  if (groupAlias) {
    return loadToyGroupView(groupAlias, { skipHashUpdate: true });
  }

  const fallbackCategory = resolveToyCategory(cleanedHash);
  if (fallbackCategory) {
    const fallbackGroupInfo = getGroupInfo(fallbackCategory.groupKey);
    return loadCategoryView(fallbackCategory, fallbackGroupInfo, { skipHashUpdate: true });
  }

  showEmptyCategoryState(cleanedHash);
  return false;
}

function handleHashFallback(rawHash) {
  const handled = handleHashNavigation(rawHash);
  if (!handled && !rawHash && !isSearchRequest) {
    clearProductsGrid();
    showHeroBanner();
  }
}

class HeroCarousel {
  constructor() {
    this.currentSlide = 0;
    this.slides = document.querySelectorAll('.hero-slide');
    this.indicators = document.querySelectorAll('.hero-indicator');
    this.heroElement = document.querySelector('.hero-carousel');
    this.autoPlayInterval = null;
    this.autoPlayDelay = 5000;

    if (this.slides.length > 0) {
      this.init();
    }
  }

  init() {
    this.showSlide(0);
    this.startAutoPlay();
  }

  showSlide(index) {
    this.slides.forEach((slide, i) => {
      slide.style.opacity = '0';
      slide.style.transform = i < index ? 'translateX(-100%)' : 'translateX(100%)';
      slide.style.zIndex = '1';
      slide.classList.remove('active');
    });

    if (this.slides[index]) {
      this.slides[index].style.opacity = '1';
      this.slides[index].style.transform = 'translateX(0)';
      this.slides[index].style.zIndex = '2';
      this.slides[index].classList.add('active');
    }

    this.indicators.forEach((indicator, i) => {
      indicator.classList.toggle('active', i === index);
    });

    this.currentSlide = index;
  }

  goToSlide(index) {
    if (index >= 0 && index < this.slides.length) {
      this.showSlide(index);
      this.restartAutoPlay();
    }
  }

  next() {
    this.nextSlide();
    this.restartAutoPlay();
  }

  prev() {
    this.previousSlide();
    this.restartAutoPlay();
  }

  nextSlide() {
    if (this.slides.length === 0) {
      return;
    }
    const nextIndex = (this.currentSlide + 1) % this.slides.length;
    this.showSlide(nextIndex);
  }

  previousSlide() {
    if (this.slides.length === 0) {
      return;
    }
    const prevIndex = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
    this.showSlide(prevIndex);
  }

  startAutoPlay() {
    if (this.slides.length <= 1 || this.autoPlayInterval) {
      return;
    }
    this.autoPlayInterval = window.setInterval(() => {
      this.nextSlide();
    }, this.autoPlayDelay);
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      window.clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  restartAutoPlay() {
    this.stopAutoPlay();
    this.startAutoPlay();
  }
}

function initializeHeroCarousel(slideCountOverride = null) {
  const heroCarouselElement = document.querySelector('.hero-carousel');
  const heroIndicatorsContainer = document.querySelector('.hero-indicators');
  const heroPrevButton = document.querySelector('.hero-nav-prev');
  const heroNextButton = document.querySelector('.hero-nav-next');

  if (!heroCarouselElement) {
    window.heroCarousel = null;
    return;
  }

  const ensureAttributes = () => {
    if (!heroCarouselElement.hasAttribute('tabindex')) {
      heroCarouselElement.setAttribute('tabindex', '0');
    }
    if (!heroCarouselElement.hasAttribute('role')) {
      heroCarouselElement.setAttribute('role', 'region');
      heroCarouselElement.setAttribute('aria-roledescription', 'carousel');
      heroCarouselElement.setAttribute('aria-label', 'Featured toy collections carousel');
    }
  };

  ensureAttributes();

  const slides = heroCarouselElement.querySelectorAll('.hero-slide');
  const slideCount = typeof slideCountOverride === 'number' ? slideCountOverride : slides.length;

  if (slideCount <= 1) {
    if (slides[0]) {
      slides[0].classList.add('active');
      slides[0].style.opacity = '1';
      slides[0].style.transform = 'translateX(0)';
      slides[0].style.zIndex = '2';
    }
    window.heroCarousel = null;
    return;
  }

  let heroCarousel = new HeroCarousel();

  heroCarouselElement.addEventListener('mouseenter', () => {
    heroCarousel.stopAutoPlay();
  });
  heroCarouselElement.addEventListener('mouseleave', () => {
    heroCarousel.startAutoPlay();
  });
  heroCarouselElement.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      heroCarousel.prev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      heroCarousel.next();
    }
  });

  if (heroIndicatorsContainer) {
    heroIndicatorsContainer.addEventListener('click', (event) => {
      const target = event.target.closest('.hero-indicator');
      if (!target) {
        return;
      }
      const index = Number.parseInt(target.dataset.index || '', 10);
      if (!Number.isNaN(index)) {
        heroCarousel.goToSlide(index);
      }
    });
  }

  if (heroPrevButton) {
    heroPrevButton.addEventListener('click', () => {
      heroCarousel.prev();
    });
  }

  if (heroNextButton) {
    heroNextButton.addEventListener('click', () => {
      heroCarousel.next();
    });
  }

  window.heroCarousel = heroCarousel;
}

async function initializeIndexPage() {
  window.updatingHashFromCategory = false;
  clearProductsGrid();
  const heroHighlights = await renderHeroSlides();
  const highlightCount = Array.isArray(heroHighlights) ? heroHighlights.length : 0;
  initializeHeroCarousel(highlightCount);

  if (isSearchRequest || highlightCount === 0) {
    hideHeroBanner();
  }

  const initialHash = window.location.hash ? window.location.hash.substring(1) : '';
  if (initialHash) {
    const handled = handleHashNavigation(initialHash);
    if (!handled) {
      loadAllProducts({ skipHashUpdate: true });
    }
  } else if (!isSearchRequest) {
    window.setTimeout(() => {
      clearProductsGrid();
      showHeroBanner();
    }, 0);
  }
}

window.renderProducts = renderProducts;
window.attachAddToCartListeners = attachAddToCartListeners;
window.hideHeroBanner = hideHeroBanner;
window.showHeroBanner = showHeroBanner;
window.hideActiveSubmenus = hideActiveSubmenus;
window.updatePageHeader = updatePageHeader;
window.scrollToProducts = scrollToProducts;
window.loadAllProducts = loadAllProducts;
window.loadSpecificCategory = loadSpecificCategory;
window.loadToyGroupView = loadToyGroupView;
window.showEmptyCategoryState = showEmptyCategoryState;
window.showLoadingState = showLoadingState;
window.updateToyBreadcrumb = updateToyBreadcrumb;
window.handleHashFallback = handleHashFallback;

window.addEventListener('DOMContentLoaded', initializeIndexPage);

