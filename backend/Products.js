export const PRODUCT_CATEGORIES = [
  'Textbooks & Academic',
  'Electronics & Gadgets',
  'Fashion & Apparel',
  'Hostel & Room Essentials',
  'Snacks & Food Provisions',
  'Health & Personal Care',
  'Sports & Fitness',
  'Other Services'
];

export const PRODUCT_CONDITIONS = ['New', 'Fairly Used', 'Used'];

export function validateProductData(data) {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 3) errors.push('Product name must be at least 3 characters.');
  if (!data.description || typeof data.description !== 'string' || data.description.trim().length < 10) errors.push('Product description must be at least 10 characters.');
  if (!data.category || !PRODUCT_CATEGORIES.includes(data.category)) errors.push(`Category must be valid`);
  const price = Number(data.price);
  if (isNaN(price) || price <= 0) errors.push('Price must be a positive number.');
  if (!data.condition || !PRODUCT_CONDITIONS.includes(data.condition)) errors.push(`Condition must be valid`);
  if (!data.images || !Array.isArray(data.images) || data.images.length === 0) errors.push('At least one product image is required.');
  return { valid: errors.length === 0, errors };
}

export function filterProducts(products, filters = {}) {
  const { category, search, minPrice, maxPrice, condition, availability, sellerId, includeDeleted = false } = filters;
  return products.filter(product => {
    if (!includeDeleted && product.status === 'deleted') return false;
    if (category && category !== 'All' && product.category !== category) return false;
    if (condition && condition !== 'All' && product.condition !== condition) return false;
    if (availability && product.availability !== availability) return false;
    if (sellerId && product.sellerId !== sellerId) return false;
    if (minPrice !== undefined && Number(product.price) < Number(minPrice)) return false;
    if (maxPrice !== undefined && Number(product.price) > Number(maxPrice)) return false;
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      const inName = product.name?.toLowerCase().includes(q);
      const inDesc = product.description?.toLowerCase().includes(q);
      if (!inName && !inDesc) return false;
    }
    return true;
  });
}

export function softDeleteProduct(product, adminId) {
  return {
    ...product,
    status: 'deleted',
    deletedBy: adminId,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function restoreProduct(product) {
  return {
    ...product,
    status: 'active',
    deletedBy: null,
    deletedAt: null,
    updatedAt: new Date().toISOString()
  };
}
