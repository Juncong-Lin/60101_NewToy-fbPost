function normaliseAmount(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  const isLikelyCents = Number.isInteger(numeric) && Math.abs(numeric) >= 1000;
  return isLikelyCents ? numeric / 100 : numeric;
}

function extractAmountFromString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  return normaliseAmount(match[0].replace(/,/g, ''));
}

function normaliseCount(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const match = trimmed.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    if (!match) {
      return null;
    }

    const numeric = Number(match[0]);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  return null;
}

export function formatPreciseCurrency(value, maximumFractionDigits = 3) {
  const numeric = normaliseAmount(value);
  if (numeric === null) {
    return '';
  }

  return numeric.toFixed(maximumFractionDigits);
}

export function getProductPriceDetails(product, quantityPerCarton = null) {
  if (!product) {
    return {
      pieceAmount: null,
      pieceDisplay: 'Contact for price',
      cartonAmount: null,
      cartonDisplay: '',
    };
  }

  const usdCandidates = [
    product.price_usd,
    product.raw?.price_usd,
    product.raw?.priceUSD,
    product.raw?.['price usd'],
  ];

  let pieceAmount = null;
  for (let index = 0; index < usdCandidates.length; index += 1) {
    const extracted = extractAmountFromString(usdCandidates[index]);
    if (extracted !== null) {
      pieceAmount = extracted;
      break;
    }
  }

  if (pieceAmount === null) {
    const lower = normaliseAmount(product.lower_price ?? product.raw?.lower_price);
    const higher = normaliseAmount(product.higher_price ?? product.raw?.higher_price);
    if (lower !== null && higher !== null && lower !== higher) {
      return {
        pieceAmount: null,
        pieceDisplay: formatPriceRange(lower, higher),
        cartonAmount: null,
        cartonDisplay: '',
      };
    }

    pieceAmount = lower ?? higher;
  }

  if (pieceAmount === null) {
    const numericCandidates = [
      product.priceValue,
      product.price,
      product.raw?.price,
    ];

    for (let index = 0; index < numericCandidates.length; index += 1) {
      const candidate = numericCandidates[index];
      const normalized = normaliseAmount(candidate);
      if (normalized !== null) {
        pieceAmount = normalized;
        break;
      }

      const extracted = extractAmountFromString(candidate);
      if (extracted !== null) {
        pieceAmount = extracted;
        break;
      }
    }
  }

  const pieceDisplay = pieceAmount !== null
    ? `USD $${formatPreciseCurrency(pieceAmount)}`
    : (product.priceRight ? `MOQ ${product.priceRight}` : 'Contact for price');

  const normalizedQuantity = normaliseCount(quantityPerCarton);
  const cartonAmount = pieceAmount !== null && normalizedQuantity !== null
    ? pieceAmount * normalizedQuantity
    : null;

  return {
    pieceAmount,
    pieceDisplay,
    cartonAmount,
    cartonDisplay: cartonAmount !== null ? `USD $${formatPreciseCurrency(cartonAmount)}` : '',
  };
}

export function formatCurrency(value) {
  const numeric = normaliseAmount(value);
  if (numeric === null) {
    return '';
  }

  const fractionDigits = Math.abs(numeric - Math.round(numeric)) < 0.005 ? 0 : 2;
  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  });
}

export function formatPriceRange(lowerPrice, higherPrice) {
  const lower = normaliseAmount(lowerPrice);
  const higher = normaliseAmount(higherPrice);

  if (lower === null && higher === null) {
    return 'Contact for price';
  }

  const resolvedLower = formatCurrency(lower ?? higher ?? 0);
  const resolvedHigher = formatCurrency(higher ?? lower ?? 0);

  if (!resolvedLower && !resolvedHigher) {
    return 'Contact for price';
  }

  if (!resolvedHigher || resolvedLower === resolvedHigher) {
    return `USD $${resolvedLower}`;
  }

  return `USD $${resolvedLower} – $${resolvedHigher}`;
}