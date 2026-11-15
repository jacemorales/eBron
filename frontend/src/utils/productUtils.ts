import type { Product } from '../types';

/**
 * Normalizes and extracts available stock quantity from a product record.
 * Handles numbers, numerical strings, empty strings (""), null, and undefined.
 * For legacy records or records without stock tracking, defaults to 0 if marked sold/sold_out, otherwise 1.
 */
export function getProductStock(product?: Partial<Product> | null): number {
  if (!product) return 0;
  if (
    product.availableStock !== undefined &&
    product.availableStock !== null &&
    String(product.availableStock).trim() !== ''
  ) {
    const num = Number(product.availableStock);
    return isNaN(num) ? 0 : Math.max(0, num);
  }
  if (product.stockStatus === 'sold_out' || product.availability === 'sold') {
    return 0;
  }
  return 1;
}

/**
 * Determines whether a product is sold out.
 */
export function isProductSoldOut(product?: Partial<Product> | null): boolean {
  if (!product) return true;
  if (product.status === 'deleted') return true;
  if (product.availability === 'sold' || product.stockStatus === 'sold_out') return true;
  return getProductStock(product) <= 0;
}

/**
 * Determines whether a product is available for public browsing in the marketplace.
 * Excludes deleted, sold, sold-out, and explicitly unavailable/reserved items.
 */
export function isProductAvailableForBrowsing(product?: Partial<Product> | null): boolean {
  if (!product) return false;
  if (product.status === 'deleted') return false;
  if (product.availability === 'sold' || product.stockStatus === 'sold_out') return false;
  // If availability is explicitly specified and not 'available', exclude it (e.g. 'reserved', 'unavailable')
  if (product.availability && product.availability !== 'available') return false;
  return getProductStock(product) > 0;
}
