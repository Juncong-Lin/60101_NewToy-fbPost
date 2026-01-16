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