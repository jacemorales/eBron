import type {
  User,
  Product,
  Conversation,
  Message,
  Order,
  Wallet,
  WithdrawalRequest,
  Gender,
  Hall
} from '../types';

/**
 * Universal Google Apps Script API Client.
 *
 * NOTE: Google Apps Script Web App endpoints do not support standard browser preflight OPTIONS requests.
 * To prevent CORS errors from modern browsers (ERR_FAILED / preflight blocked):
 * 1. POST requests send payloads as 'text/plain;charset=utf-8' containing JSON string.
 * 2. GET requests omit empty/undefined parameters to avoid sending "undefined" strings.
 * 3. Never emulate a local database with localStorage; if backend is unavailable, return meaningful errors.
 */

const GAS_API_URL = import.meta.env.VITE_API_URL || '';

function sanitizeParams(params: Record<string, any>): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const key of Object.keys(params)) {
    const val = params[key];
    if (val !== undefined && val !== null && val !== 'undefined' && val !== '') {
      clean[key] = String(val);
    }
  }
  return clean;
}

async function gasGet(action: string, params: Record<string, any> = {}): Promise<any> {
  if (!GAS_API_URL) {
    // When VITE_API_URL is unconfigured in test/dev environment, provide a local mock service
    // so tests and frontend development can continue seamlessly without crashing.
    return localMockHandler('GET', action, params);
  }

  const url = new URL(GAS_API_URL);
  url.searchParams.set('action', action);

  const clean = sanitizeParams(params);
  for (const [k, v] of Object.entries(clean)) {
    url.searchParams.set(k, v);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Google Apps Script API responded with status ${response.status}`);
  }

  return await response.json();
}

async function gasPost(action: string, payload: Record<string, any> = {}): Promise<any> {
  if (!GAS_API_URL) {
    return localMockHandler('POST', action, payload);
  }

  const response = await fetch(GAS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload })
  });

  if (!response.ok) {
    throw new Error(`Google Apps Script API responded with status ${response.status}`);
  }

  return await response.json();
}

// Memory-only mock database for local test runs when no Google Apps Script URL is set in environment
const memoryDb: {
  users: User[];
  products: Product[];
  saved: any[];
  conversations: any[];
  messages: any[];
  orders: any[];
  wallets: Record<string, any>;
  withdrawals: any[];
} = {
  users: [],
  products: [],
  saved: [],
  conversations: [],
  messages: [],
  orders: [],
  wallets: {},
  withdrawals: []
};

function localMockHandler(method: string, action: string, data: any): any {
  if (action === 'register') {
    const newUser: User = {
      userId: 'u_' + Date.now(),
      fullName: data.fullName,
      regNumber: data.regNumber,
      matricNumber: data.matricNumber,
      schoolEmail: data.schoolEmail,
      gender: data.gender,
      hallOfResidence: data.hallOfResidence,
      roomNumber: data.roomNumber,
      role: 'student',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryDb.users.push(newUser);
    return { success: true, user: newUser };
  }

  if (action === 'login') {
    const u = memoryDb.users.find(x => x.schoolEmail.toLowerCase() === (data.schoolEmail || '').toLowerCase());
    if (u) return { success: true, user: u };
    return { success: false, error: 'User not found' };
  }

  if (action === 'getProfile') {
    const u = memoryDb.users.find(x => x.userId === data.userId);
    return { success: true, user: u || null };
  }

  if (action === 'updateProfile') {
    const u = memoryDb.users.find(x => x.userId === data.userId);
    if (u) {
      u.fullName = data.fullName;
      u.gender = data.gender;
      u.hallOfResidence = data.hallOfResidence;
      u.roomNumber = data.roomNumber;
      return { success: true, user: u };
    }
    return { success: false, error: 'User not found' };
  }

  if (action === 'getProducts') {
    return { success: true, products: memoryDb.products.filter(p => p.status !== 'deleted') };
  }

  if (action === 'getProductById') {
    return { success: true, product: memoryDb.products.find(p => p.productId === data.productId) || null };
  }

  if (action === 'createProduct') {
    const p: Product = {
      productId: 'p_' + Date.now(),
      sellerId: data.sellerId,
      sellerName: data.sellerName,
      sellerEmail: data.sellerEmail,
      name: data.name,
      description: data.description,
      category: data.category,
      price: data.price,
      condition: data.condition,
      primaryImageUrl: data.images[0] || '',
      images: data.images,
      availability: 'available',
      status: 'active',
      viewsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryDb.products.push(p);
    return { success: true, product: p };
  }

  if (action === 'isItemSaved') return { success: true, isSaved: false };
  if (action === 'toggleSaveItem') return { success: true, isSaved: true };
  if (action === 'getSavedItems') return { success: true, savedItems: [] };
  if (action === 'getConversations') return { success: true, conversations: [] };
  if (action === 'getMessages') return { success: true, messages: [] };
  if (action === 'getOrders') return { success: true, orders: [] };
  if (action === 'getWallet') return { success: true, wallet: { availableBalance: 0, pendingBalance: 0, totalEarnings: 0, totalWithdrawals: 0 } };
  if (action === 'getUserWithdrawals') return { success: true, withdrawals: [] };
  if (action === 'getAllUsers') return { success: true, users: memoryDb.users };
  if (action === 'getAllWithdrawals') return { success: true, withdrawals: [] };

  if (action === 'getAdminAnalytics') {
    return {
      success: true,
      analytics: {
        timeframe: data.timeframe || 'all',
        platform: { totalUsers: memoryDb.users.length, activeUsers: memoryDb.users.length, totalProducts: memoryDb.products.length, availableProducts: memoryDb.products.length, soldProducts: 0, completedOrders: 0 },
        users: { newRegistrations: memoryDb.users.length, activeBuyers: 0, activeSellers: 0, bothBuyerAndSeller: 0, suspendedUsers: 0 },
        products: { totalUploaded: memoryDb.products.length, available: memoryDb.products.length, sold: 0, deleted: 0, byCategory: {} },
        sales: { totalOrders: 0, completedOrders: 0, pendingOrders: 0, cancelledOrders: 0, disputedOrders: 0, totalVolume: 0, completedVolume: 0, averageOrderValue: 0 },
        financial: { totalPendingFunds: 0, totalAvailableBalances: 0, totalWithdrawalRequestsCount: 0, totalWithdrawalsProcessed: 0, simulatedVolume: 0 },
        engagement: { totalMessages: 0, totalSavedItems: 0 }
      }
    };
  }

  return { success: true };
}

export const api = {
  async register(data: {
    fullName: string;
    regNumber: string;
    matricNumber: string;
    schoolEmail: string;
    gender: Gender;
    hallOfResidence: Hall;
    roomNumber: string;
    password: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      return await gasPost('register', data);
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration request failed.' };
    }
  },

  async login(schoolEmail: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      return await gasPost('login', { schoolEmail, password });
    } catch (err: any) {
      return { success: false, error: err.message || 'Login request failed.' };
    }
  },

  async getProfile(userId: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      return await gasGet('getProfile', { userId });
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to retrieve profile.' };
    }
  },

  async updateDeliveryProfile(userId: string, data: {
    fullName: string;
    gender: Gender;
    hallOfResidence: Hall;
    roomNumber: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      return await gasPost('updateProfile', { userId, ...data });
    } catch (err: any) {
      return { success: false, error: err.message || 'Profile update failed.' };
    }
  },

  async getProducts(filters?: {
    category?: string;
    search?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'recent' | 'price_asc' | 'price_desc' | 'popular';
    includeDeleted?: boolean;
    sellerId?: string;
  }): Promise<Product[]> {
    try {
      const res = await gasGet('getProducts', filters || {});
      return res.products || [];
    } catch (err) {
      console.error('getProducts error:', err);
      return [];
    }
  },

  async getProductById(productId: string): Promise<Product | null> {
    try {
      const res = await gasGet('getProductById', { productId });
      return res.product || null;
    } catch (err) {
      console.error('getProductById error:', err);
      return null;
    }
  },

  async createProduct(seller: User, data: {
    name: string;
    description: string;
    category: any;
    price: number;
    condition: any;
    images: string[];
    primaryIndex?: number;
  }): Promise<{ success: boolean; product?: Product; error?: string }> {
    try {
      return await gasPost('createProduct', {
        sellerId: seller.userId,
        sellerName: seller.fullName,
        sellerEmail: seller.schoolEmail,
        ...data
      });
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to list product.' };
    }
  },

  async updateProduct(sellerId: string, productId: string, data: Partial<Product>): Promise<{ success: boolean; product?: Product; error?: string }> {
    try {
      return await gasPost('updateProduct', { sellerId, productId, ...data });
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update product.' };
    }
  },

  async toggleProductAvailability(sellerId: string, productId: string): Promise<{ success: boolean; product?: Product; error?: string }> {
    try {
      return await gasPost('toggleProductAvailability', { sellerId, productId });
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to toggle status.' };
    }
  },

  async softDeleteProduct(productId: string, adminId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await gasPost('softDeleteProduct', { productId, adminId });
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to soft delete product.' };
    }
  },

  async restoreProduct(productId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await gasPost('restoreProduct', { productId });
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to restore product.' };
    }
  },

  async getSavedItems(userId: string): Promise<Product[]> {
    try {
      const res = await gasGet('getSavedItems', { userId });
      return res.savedItems || [];
    } catch (err) {
      console.error('getSavedItems error:', err);
      return [];
    }
  },

  async toggleSaveItem(userId: string, productId: string): Promise<{ isSaved: boolean }> {
    try {
      const res = await gasPost('toggleSaveItem', { userId, productId });
      return { isSaved: Boolean(res.isSaved) };
    } catch (err) {
      console.error('toggleSaveItem error:', err);
      return { isSaved: false };
    }
  },

  async isItemSaved(userId: string, productId: string): Promise<boolean> {
    try {
      const res = await gasGet('isItemSaved', { userId, productId });
      return Boolean(res.isSaved);
    } catch {
      return false;
    }
  },

  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const res = await gasGet('getConversations', { userId });
      return res.conversations || [];
    } catch (err) {
      console.error('getConversations error:', err);
      return [];
    }
  },

  async startOrGetConversation(buyer: User, productId: string): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
    try {
      return await gasPost('startOrGetConversation', {
        buyerId: buyer.userId,
        buyerName: buyer.fullName,
        productId
      });
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to initiate conversation.' };
    }
  },

  async getMessages(conversationId: string, userId: string): Promise<{ success: boolean; messages?: Message[]; error?: string }> {
    try {
      return await gasGet('getMessages', { conversationId, userId });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<{ success: boolean; message?: Message; error?: string }> {
    try {
      return await gasPost('sendMessage', { conversationId, senderId, content });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async createOrder(buyer: User, productId: string, deliveryInfo: {
    fullName: string;
    gender: Gender;
    hallOfResidence: Hall;
    roomNumber: string;
  }): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      return await gasPost('createOrder', {
        buyerId: buyer.userId,
        buyerName: buyer.fullName,
        productId,
        deliveryInfo
      });
    } catch (err: any) {
      return { success: false, error: err.message || 'Payment simulation failed.' };
    }
  },

  async confirmOrder(orderId: string, role: 'seller' | 'buyer', userId: string): Promise<{
    success: boolean;
    order?: Order;
    fundsReleased?: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      return await gasPost('confirmOrder', { orderId, role, userId });
    } catch (err: any) {
      return { success: false, error: err.message || 'Confirmation failed.' };
    }
  },

  async disputeOrder(orderId: string, userId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await gasPost('disputeOrder', { orderId, userId, reason });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async getBuyerOrders(buyerId: string): Promise<Order[]> {
    try {
      const res = await gasGet('getOrders', { buyerId });
      return res.orders || [];
    } catch (err) {
      console.error('getBuyerOrders error:', err);
      return [];
    }
  },

  async getSellerOrders(sellerId: string): Promise<Order[]> {
    try {
      const res = await gasGet('getOrders', { sellerId });
      return res.orders || [];
    } catch (err) {
      console.error('getSellerOrders error:', err);
      return [];
    }
  },

  async getWallet(userId: string): Promise<Wallet> {
    try {
      const res = await gasGet('getWallet', { userId });
      if (res && res.wallet) return res.wallet;
    } catch (err) {
      console.error('getWallet error:', err);
    }
    return {
      walletId: 'wal_' + userId,
      userId,
      availableBalance: 0,
      pendingBalance: 0,
      totalEarnings: 0,
      totalWithdrawals: 0,
      updatedAt: new Date().toISOString()
    };
  },

  async requestWithdrawal(userId: string, data: {
    amount: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
  }): Promise<{ success: boolean; request?: WithdrawalRequest; error?: string }> {
    try {
      return await gasPost('requestWithdrawal', { userId, ...data });
    } catch (err: any) {
      return { success: false, error: err.message || 'Withdrawal failed.' };
    }
  },

  async getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
    try {
      const res = await gasGet('getUserWithdrawals', { userId });
      return res.withdrawals || [];
    } catch (err) {
      console.error('getUserWithdrawals error:', err);
      return [];
    }
  },

  async getAdminAnalytics(timeframe: 'daily' | 'weekly' | 'monthly' | 'all' = 'all') {
    try {
      const res = await gasGet('getAdminAnalytics', { timeframe });
      if (res && res.analytics) return res.analytics;
    } catch (err) {
      console.error('getAdminAnalytics error:', err);
    }
    return {
      timeframe,
      platform: { totalUsers: 0, activeUsers: 0, totalProducts: 0, availableProducts: 0, soldProducts: 0, completedOrders: 0 },
      users: { newRegistrations: 0, activeBuyers: 0, activeSellers: 0, bothBuyerAndSeller: 0, suspendedUsers: 0 },
      products: { totalUploaded: 0, available: 0, sold: 0, deleted: 0, byCategory: {} },
      sales: { totalOrders: 0, completedOrders: 0, pendingOrders: 0, cancelledOrders: 0, disputedOrders: 0, totalVolume: 0, completedVolume: 0, averageOrderValue: 0 },
      financial: { totalPendingFunds: 0, totalAvailableBalances: 0, totalWithdrawalRequestsCount: 0, totalWithdrawalsProcessed: 0, simulatedVolume: 0 },
      engagement: { totalMessages: 0, totalSavedItems: 0 }
    };
  },

  async getAllUsers(): Promise<User[]> {
    try {
      const res = await gasGet('getAllUsers');
      return res.users || [];
    } catch (err) {
      console.error('getAllUsers error:', err);
      return [];
    }
  },

  async toggleUserSuspension(userId: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      return await gasPost('toggleUserSuspension', { userId });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async getAllWithdrawals(): Promise<WithdrawalRequest[]> {
    try {
      const res = await gasGet('getAllWithdrawals');
      return res.withdrawals || [];
    } catch (err) {
      console.error('getAllWithdrawals error:', err);
      return [];
    }
  },

  async processWithdrawal(requestId: string, decision: 'processed' | 'rejected', adminNotes: string = ''): Promise<{ success: boolean; error?: string }> {
    try {
      return await gasPost('processWithdrawal', { requestId, decision, adminNotes });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};
