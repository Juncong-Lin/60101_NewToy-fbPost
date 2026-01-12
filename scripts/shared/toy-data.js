/*
 * Unified toy data provider.
 * Builds normalized views over products_toy/toy/each_group_products/*
 * and exposes helpers for navigation, product lookup, and search.
 */
import { ActionFiguresRolePlayProducts } from '../../products_toy/toy/each_group_products/ActionFigures&RolePlay/ActionFigures&RolePlay.js';
import { ArtsCraftsToysProducts } from '../../products_toy/toy/each_group_products/Arts&CraftsToys/Arts&CraftsToys.js';
import { BuildingBlocksConstructionProducts } from '../../products_toy/toy/each_group_products/BuildingBlocks&Construction/BuildingBlocks&Construction.js';
import { DollsPlushToysProducts } from '../../products_toy/toy/each_group_products/Dolls&PlushToys/Dolls&PlushToys.js';
import { EducationalToysProducts } from '../../products_toy/toy/each_group_products/EducationalToys/EducationalToys.js';
import { ElectronicInteractiveToysProducts } from '../../products_toy/toy/each_group_products/Electronic&InteractiveToys/Electronic&InteractiveToys.js';
import { InflatableWaterToysProducts } from '../../products_toy/toy/each_group_products/Inflatable&WaterToys/Inflatable&WaterToys.js';
import { OtherIndustriesProducts } from '../../products_toy/toy/each_group_products/OtherIndustries/OtherIndustries.js';
import { OtherToysProducts } from '../../products_toy/toy/each_group_products/OtherToys/OtherToys.js';
import { OutdoorSportsToysProducts } from '../../products_toy/toy/each_group_products/Outdoor&SportsToys/Outdoor&SportsToys.js';
import { PopCultureLicensedToysProducts } from '../../products_toy/toy/each_group_products/PopCulture&LicensedToys/PopCulture&LicensedToys.js';
import { PuzzlesBoardGamesProducts } from '../../products_toy/toy/each_group_products/Puzzles&BoardGames/Puzzles&BoardGames.js';
import { TraditionalToysProducts } from '../../products_toy/toy/each_group_products/TraditionalToys/TraditionalToys.js';
import { VehiclesRideOnToysProducts } from '../../products_toy/toy/each_group_products/Vehicles&Ride-OnToys/Vehicles&Ride-OnToys.js';

const BASE_ASSET_PREFIX = 'products_toy/toy/each_group_products/';

const GROUP_DEFINITIONS = [
  { key: 'ActionFiguresRolePlay', label: 'Action Figures & Role Play', data: ActionFiguresRolePlayProducts },
  { key: 'ArtsCraftsToys', label: 'Arts & Crafts Toys', data: ArtsCraftsToysProducts },
  { key: 'BuildingBlocksConstruction', label: 'Building Blocks & Construction', data: BuildingBlocksConstructionProducts },
  { key: 'DollsPlushToys', label: 'Dolls & Plush Toys', data: DollsPlushToysProducts },
  { key: 'EducationalToys', label: 'Educational Toys', data: EducationalToysProducts },
  { key: 'ElectronicInteractiveToys', label: 'Electronic & Interactive Toys', data: ElectronicInteractiveToysProducts },
  { key: 'InflatableWaterToys', label: 'Inflatable & Water Toys', data: InflatableWaterToysProducts },
  { key: 'OtherIndustries', label: 'Other Industries', data: OtherIndustriesProducts },
  { key: 'OtherToys', label: 'Other Toys', data: OtherToysProducts },
  { key: 'OutdoorSportsToys', label: 'Outdoor & Sports Toys', data: OutdoorSportsToysProducts },
  { key: 'PopCultureLicensedToys', label: 'Pop Culture & Licensed Toys', data: PopCultureLicensedToysProducts },
  { key: 'PuzzlesBoardGames', label: 'Puzzles & Board Games', data: PuzzlesBoardGamesProducts },
  { key: 'TraditionalToys', label: 'Traditional Toys', data: TraditionalToysProducts },
  { key: 'VehiclesRideOnToys', label: 'Vehicles & Ride-On Toys', data: VehiclesRideOnToysProducts },
];

const NAV_GROUP_MAP = {
  'Action Figures & Role Play': 'ActionFiguresRolePlay',
  'Dolls & Plush Toys': 'DollsPlushToys',
  'Electronic & Interactive Toys': 'ElectronicInteractiveToys',
  'Building Blocks & Construction': 'BuildingBlocksConstruction',
  'Puzzles & Board Games': 'PuzzlesBoardGames',
  'Arts & Crafts Toys': 'ArtsCraftsToys',
  'Pop Culture & Licensed Toys': 'PopCultureLicensedToys',
  'Outdoor & Sports Toys': 'OutdoorSportsToys',
  'Traditional Toys': 'TraditionalToys',
  'Vehicles & Ride-On Toys': 'VehiclesRideOnToys',
  'Educational Toys': 'EducationalToys',
  'Inflatable & Water Toys': 'InflatableWaterToys',
  'Other Industries': 'OtherIndustries',
  'Other Toys': 'OtherToys',
};

const LEGACY_NAV_ALIASES = {
  'Print Heads': 'ElectronicInteractiveToys',
  'Print Spare Parts': 'BuildingBlocksConstruction',
  'Upgrading Kit': 'VehiclesRideOnToys',
  'Material': 'ArtsCraftsToys',
  'LED & LCD': 'PopCultureLicensedToys',
  'Laser': 'OutdoorSportsToys',
  'Cutting': 'TraditionalToys',
  'Channel Letter': 'OtherIndustries',
  'CNC': 'EducationalToys',
  'Displays': 'InflatableWaterToys',
  'Other': 'OtherToys',
  'Inkjet Printers': 'ActionFiguresRolePlay',
};

const GROUP_TO_NAV = Object.entries(NAV_GROUP_MAP).reduce((accumulator, [displayName, groupKey]) => {
  if (!accumulator[groupKey]) {
    accumulator[groupKey] = displayName;
  }
  return accumulator;
}, {});

const groupCache = new Map();
const groupLookup = new Map();
const categoryIndexByGroup = new Map();
const categoryIndexGlobal = new Map();
const productIndex = new Map();
let allProductsCache = null;

function ensureAssetPath(relativePath) {
  if (!relativePath) {
    return null;
  }
  if (/^https?:/i.test(relativePath)) {
    return relativePath;
  }
  if (relativePath.startsWith(BASE_ASSET_PREFIX)) {
    return relativePath;
  }
  return `${BASE_ASSET_PREFIX}${relativePath}`;
}

function encodeHashSegment(value) {
  if (!value) {
    return '';
  }
  return encodeURIComponent(value.trim());
}

function decodeHashSegment(value) {
  if (!value) {
    return '';
  }
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function safeLower(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function createSlug(value, fallback) {
  if (!value) {
    return fallback || '';
  }
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug) {
    return slug;
  }
  return fallback || encodeHashSegment(value);
}

function cloneTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }
  return tags.map((tag) => String(tag));
}

function firstTruthy(values) {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value) {
      return value;
    }
  }
  return null;
}

function normalizeProductEntry({
  entry,
  sku,
  variantIndex,
  groupKey,
  groupLabel,
  groupSlug,
  groupHash,
  categoryName,
  categorySlug,
  categoryHash,
}) {
  const name = firstTruthy([
    entry.name,
    entry.galleyName,
    entry.productName,
    entry.title,
    categoryName,
    sku,
  ]);

  const primaryImage = firstTruthy([
    entry.image,
    entry.img,
    entry.picture,
    entry['galleyImg src'],
    Array.isArray(entry.images) ? entry.images.find((img) => !!img) : null,
  ]);
  const markdownPath = firstTruthy([
    entry.markdown,
    entry['markdown path'],
  ]);

  let priceRaw = entry.price ?? entry.priceValue ?? null;
  if (typeof priceRaw === 'string' && priceRaw.trim() === '') {
    priceRaw = null;
  }
  const priceValue = priceRaw !== null && !Number.isNaN(Number(priceRaw))
    ? Number(priceRaw)
    : null;

  const tags = cloneTags(entry.tags);

  return {
    id: sku,
    sku,
    idLower: sku.toLowerCase(),
    variantIndex,
    name,
    nameLower: name.toLowerCase(),
    description: entry.description || entry.details || '',
    href: entry.href || entry.link || '',
    image: ensureAssetPath(primaryImage),
    markdown: ensureAssetPath(markdownPath),
    price: priceRaw,
    priceValue,
    priceRight: entry.priceRight ?? entry['price right'] ?? null,
    marketTag: entry.marketTag ?? entry['market tag'] ?? null,
    tags,
    tagsLower: tags.map((tag) => tag.toLowerCase()),
    attributes: entry.attributes ? { ...entry.attributes } : undefined,
    raw: entry,
    groupKey,
    groupLabel,
    groupSlug,
    groupHash,
    groupLower: groupLabel.toLowerCase(),
    categoryName,
    categorySlug,
    categoryHash,
    categoryLower: categoryName ? categoryName.toLowerCase() : '',
  };
}

function registerGroupLookup(groupInfo) {
  const keys = [
    groupInfo.key,
    encodeHashSegment(groupInfo.key),
    groupInfo.label,
    safeLower(groupInfo.label),
    groupInfo.slug,
    groupInfo.hash,
  ];
  const navDisplayAlias = resolveNavDisplay(groupInfo.key);
  if (navDisplayAlias) {
    keys.push(navDisplayAlias, safeLower(navDisplayAlias));
    const navSlug = createSlug(navDisplayAlias, navDisplayAlias);
    if (navSlug) {
      keys.push(navSlug, safeLower(navSlug));
      if (navSlug.includes('-and-')) {
        const legacySlug = navSlug.replace(/-and-/g, '-');
        keys.push(legacySlug, safeLower(legacySlug));
      }
    }
  }
  Object.entries(LEGACY_NAV_ALIASES).forEach(([legacyDisplay, legacyGroupKey]) => {
    if (legacyGroupKey !== groupInfo.key) {
      return;
    }
    keys.push(legacyDisplay, safeLower(legacyDisplay));
    const legacySlug = createSlug(legacyDisplay, legacyDisplay);
    if (legacySlug) {
      keys.push(legacySlug, safeLower(legacySlug));
    }
  });
  keys.forEach((key) => {
    if (!key) {
      return;
    }
    groupLookup.set(key, groupInfo);
  });
}

function initGroup(groupKey) {
  if (groupCache.has(groupKey)) {
    return groupCache.get(groupKey);
  }

  const definition = GROUP_DEFINITIONS.find((group) => group.key === groupKey);
  if (!definition) {
    return null;
  }

  const groupLabel = definition.label || groupKey;
  const groupHash = encodeHashSegment(groupLabel);
  const groupSlug = createSlug(groupLabel, groupHash || groupKey.toLowerCase());

  const rawData = definition.data || {};
  const categories = [];
  const categoryMap = new Map();

  Object.keys(rawData).forEach((categoryName) => {
    const skuMap = rawData[categoryName] || {};
    const categoryHash = encodeHashSegment(categoryName);
    const categorySlug = createSlug(categoryName, categoryHash || categoryName);
    const products = [];

    Object.keys(skuMap).forEach((sku) => {
      const entries = skuMap[sku] || [];
      entries.forEach((entry, variantIndex) => {
        const normalized = normalizeProductEntry({
          entry,
          sku,
          variantIndex,
          groupKey,
          groupLabel,
          groupSlug,
          groupHash,
          categoryName,
          categorySlug,
          categoryHash,
        });

        products.push(normalized);

        const list = productIndex.get(normalized.idLower) || [];
        list.push(normalized);
        productIndex.set(normalized.idLower, list);
      });
    });

    const categoryInfo = {
      groupKey,
      groupLabel,
      groupSlug,
      groupHash,
      name: categoryName,
      hash: categoryHash,
      slug: categorySlug,
      productCount: products.length,
      products,
    };

    categories.push(categoryInfo);

    [categoryHash, categoryName, safeLower(categoryName)].forEach((key) => {
      if (!key) {
        return;
      }
      categoryMap.set(key, categoryInfo);
    });

    [`${groupKey}:${categoryHash}`, `${groupKey}:${categoryName}`, `${groupKey}:${safeLower(categoryName)}`]
      .forEach((key) => {
        categoryIndexByGroup.set(key, categoryInfo);
      });

    if (!categoryIndexGlobal.has(categoryHash)) {
      categoryIndexGlobal.set(categoryHash, categoryInfo);
    }
  });

  const allProducts = categories.flatMap((category) => category.products);
  const groupInfo = {
    key: groupKey,
    label: groupLabel,
    slug: groupSlug,
    hash: groupHash,
    productCount: allProducts.length,
    categories,
    categoryMap,
    allProducts,
  };

  groupCache.set(groupKey, groupInfo);
  registerGroupLookup(groupInfo);
  allProductsCache = null;

  return groupInfo;
}

function getGroupList() {
  return GROUP_DEFINITIONS.map((definition) => {
    const info = initGroup(definition.key);
    if (!info) {
      return {
        key: definition.key,
        label: definition.label,
        slug: createSlug(definition.label, definition.key.toLowerCase()),
        hash: encodeHashSegment(definition.label || definition.key),
        productCount: 0,
        categoryCount: 0,
      };
    }
    return {
      key: info.key,
      label: info.label,
      slug: info.slug,
      hash: info.hash,
      productCount: info.productCount,
      categoryCount: info.categories.length,
    };
  });
}

function getGroupInfo(groupKey) {
  return initGroup(groupKey);
}

function getCategoriesForGroup(groupKey) {
  const groupInfo = initGroup(groupKey);
  if (!groupInfo) {
    return [];
  }
  return groupInfo.categories.map((category) => ({
    name: category.name,
    hash: category.hash,
    slug: category.slug,
    productCount: category.productCount,
  }));
}

function resolveCategory(groupKey, identifier) {
  if (!groupKey || !identifier) {
    return null;
  }

  initGroup(groupKey);

  const potentials = [
    `${groupKey}:${identifier}`,
    `${groupKey}:${safeLower(identifier)}`,
    `${groupKey}:${encodeHashSegment(identifier)}`,
  ];

  for (let index = 0; index < potentials.length; index += 1) {
    const key = potentials[index];
    if (categoryIndexByGroup.has(key)) {
      return categoryIndexByGroup.get(key);
    }
  }

  const groupInfo = groupCache.get(groupKey);
  if (!groupInfo) {
    return null;
  }

  const fallback = [
    identifier,
    safeLower(identifier),
    encodeHashSegment(identifier),
  ];

  for (let index = 0; index < fallback.length; index += 1) {
    const key = fallback[index];
    if (groupInfo.categoryMap.has(key)) {
      return groupInfo.categoryMap.get(key);
    }
  }

  return null;
}

function resolveCategoryByHash(hash, groupKey) {
  if (!hash) {
    return null;
  }
  const cleaned = hash.replace(/^#/, '');
  const decoded = decodeHashSegment(cleaned);
  const encoded = encodeHashSegment(decoded);
  const candidates = new Set([cleaned, decoded, encoded]);

  if (groupKey) {
    for (const candidate of candidates) {
      const key = `${groupKey}:${candidate}`;
      if (categoryIndexByGroup.has(key)) {
        return categoryIndexByGroup.get(key);
      }
    }
  }

  for (const candidate of candidates) {
    if (categoryIndexGlobal.has(candidate)) {
      return categoryIndexGlobal.get(candidate);
    }
  }

  return null;
}

function resolveGroupByHash(hash) {
  if (!hash) {
    return null;
  }
  const cleaned = hash.replace(/^#/, '');
  const decoded = decodeHashSegment(cleaned);
  const encoded = encodeHashSegment(decoded);
  const candidates = [cleaned, decoded, encoded];

  for (let index = 0; index < candidates.length; index += 1) {
    const key = candidates[index];
    if (groupLookup.has(key)) {
      return groupLookup.get(key);
    }
  }

  return null;
}

function getProductsForGroup(groupKey) {
  const groupInfo = initGroup(groupKey);
  if (!groupInfo) {
    return [];
  }
  return groupInfo.allProducts.slice();
}

function getProductsForCategory(groupKey, identifier) {
  const category = resolveCategory(groupKey, identifier);
  if (!category) {
    return [];
  }
  return category.products.slice();
}

function getAllProducts() {
  if (allProductsCache) {
    return allProductsCache.slice();
  }
  const combined = GROUP_DEFINITIONS.flatMap((definition) => getProductsForGroup(definition.key));
  allProductsCache = combined;
  return combined.slice();
}

function matchesSearchTerm(product, term) {
  if (!term) {
    return false;
  }
  if (product.nameLower.includes(term)) {
    return true;
  }
  if (product.categoryLower && product.categoryLower.includes(term)) {
    return true;
  }
  if (product.groupLower && product.groupLower.includes(term)) {
    return true;
  }
  if (product.sku.toLowerCase().includes(term)) {
    return true;
  }
  if (product.description && product.description.toLowerCase().includes(term)) {
    return true;
  }
  if (product.tagsLower.some((tag) => tag.includes(term))) {
    return true;
  }
  return false;
}

function searchProducts(searchTerm) {
  if (!searchTerm) {
    return [];
  }
  const normalizedTerm = searchTerm.trim().toLowerCase();
  if (!normalizedTerm) {
    return [];
  }

  const results = [];
  const seen = new Set();

  productIndex.forEach((entries) => {
    entries.forEach((product) => {
      if (matchesSearchTerm(product, normalizedTerm)) {
        const uniqueKey = `${product.sku}::${product.variantIndex}::${product.categoryHash}`;
        if (!seen.has(uniqueKey)) {
          seen.add(uniqueKey);
          results.push(product);
        }
      }
    });
  });

  return results;
}

function findProductById(productId) {
  if (!productId) {
    return null;
  }
  const normalizedId = String(productId).trim().toLowerCase();
  if (!normalizedId) {
    return null;
  }
  const entries = productIndex.get(normalizedId);
  if (!entries || entries.length === 0) {
    return null;
  }
  return {
    primary: entries[0],
    variants: entries.slice(),
  };
}

function getNavGroupMap() {
  return { ...NAV_GROUP_MAP };
}

function getNavEntries() {
  return Object.keys(NAV_GROUP_MAP);
}

function resolveNavGroupKey(displayName) {
  if (!displayName) {
    return null;
  }
  return NAV_GROUP_MAP[displayName] || LEGACY_NAV_ALIASES[displayName] || null;
}

function getLegacyNavAliases() {
  return { ...LEGACY_NAV_ALIASES };
}

function resolveNavDisplay(groupKey) {
  if (!groupKey) {
    return null;
  }
  return GROUP_TO_NAV[groupKey] || null;
}

function getGroupInfoForNav(displayName) {
  const groupKey = resolveNavGroupKey(displayName);
  if (!groupKey) {
    return null;
  }
  return getGroupInfo(groupKey);
}

const toyDataAPI = {
  getGroupList,
  getGroupInfo,
  getCategoriesForGroup,
  resolveCategory,
  resolveCategoryByHash,
  resolveGroupByHash,
  getProductsForGroup,
  getProductsForCategory,
  getAllProducts,
  findProductById,
  searchProducts,
  getNavGroupMap,
  getNavEntries,
  resolveNavGroupKey,
  resolveNavDisplay,
  getLegacyNavAliases,
  getGroupInfoForNav,
};

export {
  toyDataAPI,
  getGroupList,
  getGroupInfo,
  getCategoriesForGroup,
  resolveCategory,
  resolveCategoryByHash,
  resolveGroupByHash,
  getProductsForGroup,
  getProductsForCategory,
  getAllProducts,
  findProductById,
  searchProducts,
  getNavGroupMap,
  getNavEntries,
  resolveNavGroupKey,
  resolveNavDisplay,
  getLegacyNavAliases,
  getGroupInfoForNav,
};

if (typeof window !== 'undefined') {
  window.toyData = toyDataAPI;
}