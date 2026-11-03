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
    throw new Error('Google Apps Script Web App URL (VITE_API_URL) is not configured in .env. Please configure your Google Apps Script deployment URL.');
  }

  const url = new URL(GAS_API_URL);
  url.searchParams.set('action', action);

  const clean = sanitizeParams(params);
  for (const [k, v] of Object.entries(clean)) {
    url.searchParams.set(k, v);
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script API responded with HTTP status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    console.error(`gasGet [${action}] failed:`, err);
    throw new Error(`Failed to communicate with Google Sheets backend: ${err.message || 'Network error'}`);
  }
}

async function gasPost(action: string, payload: Record<string, any> = {}): Promise<any> {
  if (!GAS_API_URL) {
    throw new Error('Google Apps Script Web App URL (VITE_API_URL) is not configured in .env. Please configure your Google Apps Script deployment URL.');
  }

  try {
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload })
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script API responded with HTTP status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    console.error(`gasPost [${action}] failed:`, err);
    throw new Error(`Failed to communicate with Google Sheets backend: ${err.message || 'Network error'}`);
  }
}

export const api = {
  // Authentication & Profile
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
      const res = await gasPost('register', data);
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async login(schoolEmail: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await gasPost('login', { schoolEmail, password });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async getProfile(userId: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await gasGet('getProfile', { userId });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateDeliveryProfile(userId: string, data: {
    fullName: string;
    gender: Gender;
    hallOfResidence: Hall;
    roomNumber: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await gasPost('updateProfile', { userId, ...data });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Products
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
      const res = await gasPost('createProduct', {
        sellerId: seller.userId,
        sellerName: seller.fullName,
        sellerEmail: seller.schoolEmail,
        ...data
      });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateProduct(sellerId: string, productId: string, data: Partial<Product>): Promise<{ success: boolean; product?: Product; error?: string }> {
    try {
      const res = await gasPost('updateProduct', { sellerId, productId, ...data });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async toggleProductAvailability(sellerId: string, productId: string): Promise<{ success: boolean; product?: Product; error?: string }> {
    try {
      const res = await gasPost('toggleProductAvailability', { sellerId, productId });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async softDeleteProduct(productId: string, adminId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await gasPost('softDeleteProduct', { productId, adminId });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async restoreProduct(productId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await gasPost('restoreProduct', { productId });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Saved Items
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

  // Conversations & Messages
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
      const res = await gasPost('startOrGetConversation', {
        buyerId: buyer.userId,
        buyerName: buyer.fullName,
        productId
      });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async getMessages(conversationId: string, userId: string): Promise<{ success: boolean; messages?: Message[]; error?: string }> {
    try {
      const res = await gasGet('getMessages', { conversationId, userId });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<{ success: boolean; message?: Message; error?: string }> {
    try {
      const res = await gasPost('sendMessage', { conversationId, senderId, content });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Orders, Test Payment & Dual Confirmation
  async createOrder(buyer: User, productId: string, deliveryInfo: {
    fullName: string;
    gender: Gender;
    hallOfResidence: Hall;
    roomNumber: string;
  }): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      const res = await gasPost('createOrder', {
        buyerId: buyer.userId,
        buyerName: buyer.fullName,
        productId,
        deliveryInfo
      });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
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
      const res = await gasPost('confirmOrder', { orderId, role, userId });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async disputeOrder(orderId: string, userId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await gasPost('disputeOrder', { orderId, userId, reason });
      return res;
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

  // Wallets & Withdrawals
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
      const res = await gasPost('requestWithdrawal', { userId, ...data });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
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

  // Admin Operations
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
      const res = await gasPost('toggleUserSuspension', { userId });
      return res;
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
      const res = await gasPost('processWithdrawal', { requestId, decision, adminNotes });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};
