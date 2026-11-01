export function calculateAnalytics({ users = [], products = [], orders = [] }) {
  return {
    platform: {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'active').length,
      totalProducts: products.length,
      availableProducts: products.filter(p => p.status === 'active' && p.availability === 'available').length,
      soldProducts: products.filter(p => p.availability === 'sold').length,
      completedOrders: orders.filter(o => o.status === 'completed').length
    }
  };
}
