# Convert Inkjet Printers → Action Figures & Role Play — Implementation Guide

This document lists the correct methods, file paths, and focused code changes required to replace the site's "Inkjet Printers" section with the Action Figures & Role Play toy dataset and make product cards link to toy detail pages. Use these as a compact playbook to implement, review, and verify the conversion.

Summary of goals
- Replace the `Inkjet Printers` index/listing with the `ActionFigures&RolePlay` toy dataset.
- Ensure every product card uses the SKU as `product.id` so detail links point to `detail.html?productId=<SKU>`.
- Make the detail page accept those SKUs and resolve toy data correctly.
- Make sub-header submenu clicks (including percent-encoded Chinese slugs) navigate to the correct toy subcategory listing on index.
- Keep price formatting consistent (ceil → 1 decimal) and normalize toy image/markdown paths.

Files to inspect and modify (highest impact)

- `scripts/index/qilitrading.js`
  - Key functions: `renderProducts(productList, type)`, `window.loadSpecificCategory(categoryName)` and category branches for `Inkjet Printers` and its subcategories.
  - Changes to make:
    - Replace the inkjet data source with `ActionFiguresRolePlayProducts` and flatten the nested SKU maps into an array for `renderProducts()`.
    - When flattening, always assign `fixed.id = sku;` (do not rely on placeholder `id: 'product'`).
    - Normalize toy image paths to start with `products_toy/..` (prefix if necessary).
    - Ensure `renderProducts()` output anchors use `detail.html?productId=${product.id}`.
    - Ensure price formatting path handles toy price strings or cents → convert to dollars then `Math.ceil(... *10)/10` and display one decimal.

- `products_toy/toy/each_group_products/ActionFigures&RolePlay/ActionFigures&RolePlay.js`
  - Key: source toy dataset. Many entries use SKU keys but sometimes `id` fields in entries are placeholder strings.
  - Changes/notes:
    - Prefer leaving SKU keys intact in file; do NOT rely on `entry.id` — set `fixed.id = sku` while flattening.
    - If preferred, create a small pre-processing script to normalize dataset (replace `id: 'product'` with SKU), but runtime flattening is usually simpler.

- `scripts/detail/detail.js`
  - Key functions: detail page loader (reads query string `productId`), `findToyById()` (toy lookup), and content setup functions.
  - Changes to make:
    - Implement or ensure a `findToyById(productId)` exists that searches all toy groups (aggregated `ActionFiguresRolePlayProducts` and others) and returns a normalized object: { id, name, image, markdown, description, price, ... }.
    - Normalize image/markdown paths here too (prefix `products_toy/toy/each_group_products/...` if the dataset uses relative names).
    - Use the same price display logic as index (ceil to 1 decimal) so prices match.
    - Ensure the detail loader accepts `productId` query param (not `id` or `product`) and doesn't break if passed percent-encoded values — use `decodeURIComponent()` when reading the param.

- `components/shared-subheader.html` + `scripts/shared/shared-subheader-loader.js`
  - Purpose: Sub-header UI (the menu entries) and the loader that wires the links.
  - Changes/notes:
    - Menu entries call `handleCategoryClick('...')` with the category names (including Chinese ones). Keep those names consistent with keys in `ActionFiguresRolePlayProducts`.
    - `shared-subheader-loader.js` must map categoryName → hash and call `window.loadSpecificCategory(categoryName)` when on index, or `UrlUtils.navigateToIndex(hash)` when on another page.

- `scripts/shared/sub-header-nav.js`
  - Purpose: `SubHeaderNavigation` and `handleHashNavigation(hash)` that responds to index hash values and loads the matching category.
  - Changes to make:
    - Decode percent-encoded hashes inside `handleHashNavigation` (call `decodeURIComponent(hash)` in a try/catch).
    - Add a fallback for unknown hashes: if `categoryMap[hash]` is not found, call `loadSpecificCategory(hash)` (using the decoded value) and set the active main nav to `Inkjet Printers` so submenu categories for Action Figures display correctly.
    - Ensure `handleHashNavigation` uses the same category naming as `qilitrading.loadSpecificCategory`.

- `scripts/shared/url-utils.js`
  - Purpose: build index URL and navigate from other pages to `index.html#<hash>`.
  - Changes/notes:
    - It already exists; ensure `UrlUtils.buildIndexUrl(hash)` preserves the hash as-is (do not double-encode). When navigating from `detail.html`, use the encoded hash, and let `sub-header-nav` decode it on index.

- `scripts/shared/money.js` (optional)
  - Purpose: shared currency/price formatting helpers.
  - If you want global consistency, centralize the ceil-to-1-decimal logic here and call it from both index and detail renderers.

Other relevant files to check
- `scripts/index/*` other loaders (e.g., `loadAllProducts`, `loadAllLedLcdProducts` etc.) — to ensure no other path renders the `Inkjet Printers` content unexpectedly.
- `styles/` for any UI labels you want to adjust (e.g., `page-header` styling or hero banner copy changed to "Action Figures & Role Play").

Implementation checklist (concrete steps)
1. In `scripts/index/qilitrading.js`:
   - Replace the `Inkjet Printers` category branch to convert `ActionFiguresRolePlayProducts` into `allToys` array. Example flattening pattern:

   ```js
   const toyObj = ActionFiguresRolePlayProducts || {};
   let allToys = [];
   for (const group in toyObj) {
     const skuMap = toyObj[group] || {};
     for (const sku in skuMap) {
       const entries = skuMap[sku] || [];
       entries.forEach(entry => {
         const fixed = Object.assign({}, entry);
         fixed.id = sku; // <-- critical: use SKU for detail link
         if (fixed.image && !fixed.image.startsWith('products_toy/')) {
           fixed.image = `products_toy/toy/each_group_products/${fixed.image}`;
         }
         allToys.push(fixed);
       });
     }
   }
   const productsHTML = renderProducts(allToys, 'regular');
   ```

2. Ensure `renderProducts()` uses `detail.html?productId=${product.id}` for links (both image link and name link and CTA).

3. In `scripts/detail/detail.js`:
   - Read `productId` from query (use `decodeURIComponent()`), then call `findToyById(productId)`.
   - `findToyById(id)` should iterate all toy groups and SKU entries, returning the first matching entry (normalized as above).
   - Render images and markdown paths after normalizing prefixes.

4. In `scripts/shared/sub-header-nav.js`:
   - Add `try { hash = decodeURIComponent(hash); } catch(e) {}` near the start of `handleHashNavigation`.
   - If `categoryMap[hash]` is falsy, call `window.loadSpecificCategory(hash)` to allow Chinese slugs to load directly. Set main `Inkjet Printers` active state.

5. In `scripts/shared/shared-subheader-loader.js`:
   - Ensure `handleCategoryClick(categoryName)` sets an appropriate `hashValue` (slug) and then calls `window.loadSpecificCategory(categoryName)` when on index; when not on index, call `UrlUtils.navigateToIndex(hashValue)`.
   - Keep `preventHashUpdate` or `updatingHashFromCategory` flags in sync to avoid repeated hash/handler loops.

6. Test and verify (manual steps):
   - On index: open `index.html#仿真餐具` (or the percent-encoded variant) and confirm the `仿真餐具` products render; product anchors should have `productId=<SKU>` values.
   - Click a product card → confirm `detail.html?productId=<SKU>` opens and the detail page shows toy content.
   - From `detail.html`, click the sub-header submenu link (that points back to `仿真餐具`); the index page should load and show that category. If the detail page opens index with a percent-encoded hash, `sub-header-nav` should decode and load the category.

Troubleshooting checklist (if things still fail)
- If product links show `productId=product` instead of SKU: ensure flattening code always sets `fixed.id = sku` (unconditional assignment) and that the branch calling `renderProducts()` uses the flattened array.
- If the index shows "Products for this category will be available soon" with percent-encoded title: ensure `handleHashNavigation()` decodes the hash and falls back to `loadSpecificCategory(hash)` when `categoryMap` lookup fails.
- If detail page is blank: confirm `detail.js` reads `productId` and that `findToyById()` properly searches all `ActionFiguresRolePlayProducts` groups and SKU keys.

Notes & rationale
- The core mismatch stems from dataset entries using placeholders for `id` while UI expects SKU-based IDs for detail navigation. The minimal, safe approach is to set `fixed.id = sku` while flattening at render-time — no need to modify the original dataset file if you prefer not to.
- Hash encoding: browsers percent-encode non-ASCII characters in the URL; index code must decode before mapping to category names.
- Keep the `renderProducts()` contract (expects `product.id` and `product.image`) and update the detail loader to accept `productId` query param consistently.

If you want, I can now:
- Produce exact patches for the places above (targeted edits to `qilitrading.js`, `detail.js`, and `sub-header-nav.js`).
- Add a small test script to validate anchors in a static DOM snapshot.

-- End of guide
