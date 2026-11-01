import type {
  User,
  Product,
  SavedItem,
  Conversation,
  Message,
  Order,
  Wallet,
  WithdrawalRequest,
  Gender,
  Hall
} from '../types';

// Google Apps Script Web App URL from environment
const GAS_URL = import.meta.env.VITE_API_URL || '';

/**
 * Universal API Client:
 * Dispatches live requests to Google Apps Script Web App when VITE_API_URL is configured,
 * while safely falling back to local simulation when working offline or in test environments.
 */
async function callGAS(action: string, method: 'GET' | 'POST' = 'GET', data?: any) {
  if (!GAS_URL) return null;

  try {
    if (method === 'GET') {
      const url = new URL(GAS_URL);
      url.searchParams.set('action', action);
      if (data) {
        Object.keys(data).forEach(k => url.searchParams.set(k, String(data[k])));
      }
      const res = await fetch(url.toString(), { method: 'GET' });
      return await res.json();
    } else {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      });
      return await res.json();
    }
  } catch (e) {
    console.warn('GAS endpoint call error, using local persistence fallback:', e);
    return null;
  }
}

// Local persistence cache obeying the real records constraint
const STORAGE_KEY = 'ebron_database_state_v1';

function getStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return {
    users: [
      {
        userId: 'u_admin_default',
        fullName: 'System Administrator',
        regNumber: 'ADM001',
        matricNumber: 'CU/ADM/001',
        schoolEmail: 'admin@stu.cu.edu.ng',
        gender: 'Male',
        hallOfResidence: 'Peter',
        roomNumber: 'AdminSuite1',
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    userCredentials: {
      'admin@stu.cu.edu.ng': {
        hash: 'admin123',
        salt: 'admin_salt'
      }
    },
    products: [],
    savedItems: [],
    conversations: [],
    messages: [],
    orders: [],
    wallets: {
      'u_admin_default': {
        walletId: 'wal_u_admin_default',
        userId: 'u_admin_default',
        availableBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
        updatedAt: new Date().toISOString()
      }
    },
    withdrawals: []
  };
}

function saveState(state: any) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
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
    // Attempt backend GAS call first
    const gasRes = await callGAS('register', 'POST', data);
    if (gasRes) return gasRes;

    const email = data.schoolEmail.trim().toLowerCase();
    if (!email.endsWith('@stu.cu.edu.ng')) {
      return { success: false, error: 'Registration failed: email must end with @stu.cu.edu.ng' };
    }

    const state = getStoredState();
    if (state.users.some((u: any) => u.schoolEmail.toLowerCase() === email)) {
      return { success: false, error: 'An account with this Covenant University email already exists.' };
    }

    const userId = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newUser: User = {
      userId,
      fullName: data.fullName.trim(),
      regNumber: data.regNumber.trim(),
      matricNumber: data.matricNumber.trim(),
      schoolEmail: email,
      gender: data.gender,
      hallOfResidence: data.hallOfResidence,
      roomNumber: data.roomNumber.trim(),
      role: 'student',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    state.users.push(newUser);
    state.userCredentials[email] = { hash: data.password, salt: 'salt_' + userId };
    state.wallets[userId] = {
      walletId: 'wal_' + userId,
      userId,
      availableBalance: 0,
      pendingBalance: 0,
      totalEarnings: 0,
      totalWithdrawals: 0,
      updatedAt: new Date().toISOString()
    };

    saveState(state);
    return { success: true, user: newUser };
  },

  async login(schoolEmail: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const gasRes = await callGAS('login', 'POST', { schoolEmail, password });
    if (gasRes) return gasRes;

    const email = schoolEmail.trim().toLowerCase();
    const state = getStoredState();
    const user = state.users.find((u: any) => u.schoolEmail.toLowerCase() === email);

    if (!user) return { success: false, error: 'Invalid school email or password.' };
    if (user.status === 'suspended') return { success: false, error: 'Your account has been suspended.' };

    const creds = state.userCredentials[email];
    if (!creds || creds.hash !== password) {
      return { success: false, error: 'Invalid school email or password.' };
    }

    return { success: true, user };
  },

  async updateDeliveryProfile(userId: string, data: {
    fullName: string;
    gender: Gender;
    hallOfResidence: Hall;
    roomNumber: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const state = getStoredState();
    const idx = state.users.findIndex((u: any) => u.userId === userId);
    if (idx === -1) return { success: false, error: 'User not found.' };

    state.users[idx] = {
      ...state.users[idx],
      fullName: data.fullName.trim(),
      gender: data.gender,
      hallOfResidence: data.hallOfResidence,
      roomNumber: data.roomNumber.trim(),
      updatedAt: new Date().toISOString()
    };

    saveState(state);
    return { success: true, user: state.users[idx] };
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
    const gasRes = await callGAS('getProducts', 'GET', filters);
    if (gasRes && gasRes.products) return gasRes.products;

    const state = getStoredState();
    let list = [...state.products];

    if (!filters?.includeDeleted) list = list.filter((p: any) => p.status !== 'deleted');
    if (filters?.sellerId) list = list.filter((p: any) => p.sellerId === filters.sellerId);
    if (filters?.category && filters.category !== 'All') list = list.filter((p: any) => p.category === filters.category);
    if (filters?.condition && filters.condition !== 'All') list = list.filter((p: any) => p.condition === filters.condition);
    if (filters?.minPrice !== undefined) list = list.filter((p: any) => p.price >= filters.minPrice!);
    if (filters?.maxPrice !== undefined) list = list.filter((p: any) => p.price <= filters.maxPrice!);

    if (filters?.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      list = list.filter((p: any) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    if (filters?.sortBy === 'price_asc') list.sort((a: any, b: any) => a.price - b.price);
    else if (filters?.sortBy === 'price_desc') list.sort((a: any, b: any) => b.price - a.price);
    else list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list;
  },

  async getProductById(productId: string): Promise<Product | null> {
    const gasRes = await callGAS('getProductById', 'GET', { productId });
    if (gasRes && gasRes.product) return gasRes.product;

    const state = getStoredState();
    const product = state.products.find((p: any) => p.productId === productId);
    if (!product) return null;
    product.viewsCount = (product.viewsCount || 0) + 1;
    saveState(state);
    return product;
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
    const state = getStoredState();
    const productId = 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const primaryIndex = data.primaryIndex || 0;

    const newProduct: Product = {
      productId,
      sellerId: seller.userId,
      sellerName: seller.fullName,
      sellerEmail: seller.schoolEmail,
      name: data.name.trim(),
      description: data.description.trim(),
      category: data.category,
      price: Number(data.price),
      condition: data.condition,
      primaryImageUrl: data.images[primaryIndex] || data.images[0],
      images: data.images,
      availability: 'available',
      status: 'active',
      viewsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    state.products.unshift(newProduct);
    saveState(state);
    return { success: true, product: newProduct };
  },

  async updateProduct(sellerId: string, productId: string, data: Partial<Product>): Promise<{ success: boolean; product?: Product; error?: string }> {
    const state = getStoredState();
    const idx = state.products.findIndex((p: any) => p.productId === productId);
    if (idx === -1) return { success: false, error: 'Product not found.' };

    const prod = state.products[idx];
    if (prod.sellerId !== sellerId) return { success: false, error: 'Unauthorized.' };

    state.products[idx] = { ...prod, ...data, updatedAt: new Date().toISOString() };
    saveState(state);
    return { success: true, product: state.products[idx] };
  },

  async toggleProductAvailability(sellerId: string, productId: string): Promise<{ success: boolean; product?: Product; error?: string }> {
    const state = getStoredState();
    const prod = state.products.find((p: any) => p.productId === productId);
    if (!prod) return { success: false, error: 'Product not found.' };
    if (prod.sellerId !== sellerId) return { success: false, error: 'Unauthorized.' };

    prod.availability = prod.availability === 'available' ? 'reserved' : 'available';
    prod.updatedAt = new Date().toISOString();
    saveState(state);
    return { success: true, product: prod };
  },

  async softDeleteProduct(productId: string, adminId: string): Promise<{ success: boolean; error?: string }> {
    const state = getStoredState();
    const prod = state.products.find((p: any) => p.productId === productId);
    if (!prod) return { success: false, error: 'Product not found.' };

    prod.status = 'deleted';
    prod.deletedBy = adminId;
    prod.deletedAt = new Date().toISOString();
    saveState(state);
    return { success: true };
  },

  async restoreProduct(productId: string): Promise<{ success: boolean; error?: string }> {
    const state = getStoredState();
    const prod = state.products.find((p: any) => p.productId === productId);
    if (!prod) return { success: false, error: 'Product not found.' };

    prod.status = 'active';
    prod.deletedBy = null;
    prod.deletedAt = null;
    saveState(state);
    return { success: true };
  },

  async getSavedItems(userId: string): Promise<Product[]> {
    const gasRes = await callGAS('getSavedItems', 'GET', { userId });
    if (gasRes && gasRes.savedItems) return gasRes.savedItems;

    const state = getStoredState();
    const savedIds = state.savedItems.filter((s: any) => s.userId === userId).map((s: any) => s.productId);
    return state.products.filter((p: any) => savedIds.includes(p.productId) && p.status !== 'deleted');
  },

  async toggleSaveItem(userId: string, productId: string): Promise<{ isSaved: boolean }> {
    const state = getStoredState();
    const existingIndex = state.savedItems.findIndex((s: any) => s.userId === userId && s.productId === productId);

    if (existingIndex >= 0) {
      state.savedItems.splice(existingIndex, 1);
      saveState(state);
      return { isSaved: false };
    } else {
      state.savedItems.push({
        savedId: 'sav_' + Date.now(),
        userId,
        productId,
        createdAt: new Date().toISOString()
      });
      saveState(state);
      return { isSaved: true };
    }
  },

  async isItemSaved(userId: string, productId: string): Promise<boolean> {
    const state = getStoredState();
    return state.savedItems.some((s: any) => s.userId === userId && s.productId === productId);
  },

  async getConversations(userId: string): Promise<Conversation[]> {
    const gasRes = await callGAS('getConversations', 'GET', { userId });
    if (gasRes && gasRes.conversations) return gasRes.conversations;

    const state = getStoredState();
    return state.conversations
      .filter((c: any) => c.buyerId === userId || c.sellerId === userId)
      .sort((a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  },

  async startOrGetConversation(buyer: User, productId: string): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
    const state = getStoredState();
    const product = state.products.find((p: any) => p.productId === productId);
    if (!product) return { success: false, error: 'Product not found.' };

    if (product.sellerId === buyer.userId) {
      return { success: false, error: 'You cannot message yourself on your own product.' };
    }

    const seller = state.users.find((u: any) => u.userId === product.sellerId);
    const existing = state.conversations.find((c: any) => c.productId === productId && c.buyerId === buyer.userId);
    if (existing) return { success: true, conversation: existing };

    const newConv: Conversation = {
      conversationId: 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      productId,
      productName: product.name,
      productPrice: product.price,
      productImage: product.primaryImageUrl,
      buyerId: buyer.userId,
      buyerName: buyer.fullName,
      sellerId: product.sellerId,
      sellerName: seller?.fullName || 'Seller',
      lastMessageSnippet: 'Conversation started',
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    state.conversations.unshift(newConv);
    saveState(state);
    return { success: true, conversation: newConv };
  },

  async getMessages(conversationId: string, userId: string): Promise<{ success: boolean; messages?: Message[]; error?: string }> {
    const gasRes = await callGAS('getMessages', 'GET', { conversationId });
    if (gasRes && gasRes.messages) return gasRes.messages;

    const state = getStoredState();
    const conv = state.conversations.find((c: any) => c.conversationId === conversationId);
    if (!conv) return { success: false, error: 'Conversation not found.' };

    state.messages.forEach((m: any) => {
      if (m.conversationId === conversationId && m.receiverId === userId) m.isRead = true;
    });
    saveState(state);

    const msgs = state.messages
      .filter((m: any) => m.conversationId === conversationId)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return { success: true, messages: msgs };
  },

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<{ success: boolean; message?: Message; error?: string }> {
    const state = getStoredState();
    const conv = state.conversations.find((c: any) => c.conversationId === conversationId);
    if (!conv) return { success: false, error: 'Conversation not found.' };

    const receiverId = conv.buyerId === senderId ? conv.sellerId : conv.buyerId;
    const now = new Date().toISOString();

    const msg: Message = {
      messageId: 'msg_' + Date.now(),
      conversationId,
      senderId,
      receiverId,
      content: content.trim(),
      isRead: false,
      createdAt: now
    };

    state.messages.push(msg);
    conv.lastMessageSnippet = content.trim();
    conv.lastMessageAt = now;
    saveState(state);
    return { success: true, message: msg };
  },

  async createOrder(buyer: User, productId: string, deliveryInfo: {
    fullName: string;
    gender: Gender;
    hallOfResidence: Hall;
    roomNumber: string;
  }): Promise<{ success: boolean; order?: Order; error?: string }> {
    const gasRes = await callGAS('createOrder', 'POST', { buyerId: buyer.userId, productId, deliveryInfo });
    if (gasRes && gasRes.order) return gasRes;

    const state = getStoredState();
    const product = state.products.find((p: any) => p.productId === productId);
    if (!product) return { success: false, error: 'Product not found.' };
    if (product.availability !== 'available') return { success: false, error: 'Product unavailable.' };

    const seller = state.users.find((u: any) => u.userId === product.sellerId);
    const now = new Date().toISOString();
    const orderId = 'ord_' + Date.now();
    const orderRef = 'EBR-' + Math.floor(100000 + Math.random() * 900000);

    const newOrder: Order = {
      orderId,
      orderReference: orderRef,
      productId: product.productId,
      productName: product.name,
      productImage: product.primaryImageUrl,
      buyerId: buyer.userId,
      buyerName: buyer.fullName,
      sellerId: product.sellerId,
      sellerName: seller?.fullName || 'Seller',
      amount: product.price,
      status: 'payment_successful',
      paymentMode: 'TEST_MODE',
      paymentRef: 'SIM_PAY_' + Date.now(),
      deliveryFullName: deliveryInfo.fullName,
      deliveryGender: deliveryInfo.gender,
      deliveryHall: deliveryInfo.hallOfResidence,
      deliveryRoom: deliveryInfo.roomNumber,
      sellerConfirmedAt: null,
      buyerConfirmedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now
    };

    product.availability = 'sold';
    if (!state.wallets[product.sellerId]) {
      state.wallets[product.sellerId] = {
        walletId: 'wal_' + product.sellerId,
        userId: product.sellerId,
        availableBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
        updatedAt: now
      };
    }
    state.wallets[product.sellerId].pendingBalance += product.price;

    state.orders.unshift(newOrder);
    saveState(state);
    return { success: true, order: newOrder };
  },

  async confirmOrder(orderId: string, role: 'seller' | 'buyer', userId: string): Promise<{
    success: boolean;
    order?: Order;
    fundsReleased?: boolean;
    message?: string;
    error?: string;
  }> {
    const gasRes = await callGAS('confirmOrder', 'POST', { orderId, role, userId });
    if (gasRes && gasRes.status) return gasRes;

    const state = getStoredState();
    const order = state.orders.find((o: any) => o.orderId === orderId);
    if (!order) return { success: false, error: 'Order not found.' };
    if (order.status === 'completed') return { success: true, order, fundsReleased: false };

    const now = new Date().toISOString();
    let fundsReleased = false;

    if (role === 'seller') {
      if (order.sellerId !== userId) return { success: false, error: 'Unauthorized.' };
      order.sellerConfirmedAt = now;
    } else if (role === 'buyer') {
      if (order.buyerId !== userId) return { success: false, error: 'Unauthorized.' };
      order.buyerConfirmedAt = now;
    }

    if (order.sellerConfirmedAt && order.buyerConfirmedAt) {
      order.status = 'completed';
      order.completedAt = now;
      fundsReleased = true;

      const sellerWallet = state.wallets[order.sellerId];
      if (sellerWallet) {
        sellerWallet.pendingBalance = Math.max(0, sellerWallet.pendingBalance - order.amount);
        sellerWallet.availableBalance += order.amount;
        sellerWallet.totalEarnings += order.amount;
      }
    } else if (order.sellerConfirmedAt) {
      order.status = 'awaiting_buyer_confirmation';
    } else if (order.buyerConfirmedAt) {
      order.status = 'awaiting_seller_confirmation';
    }

    order.updatedAt = now;
    saveState(state);

    return {
      success: true,
      order,
      fundsReleased,
      message: fundsReleased ? 'Transaction completed! Funds released.' : 'Confirmation recorded.'
    };
  },

  async getBuyerOrders(buyerId: string): Promise<Order[]> {
    const gasRes = await callGAS('getOrders', 'GET', { buyerId });
    if (gasRes && gasRes.orders) return gasRes.orders;

    const state = getStoredState();
    return state.orders.filter((o: any) => o.buyerId === buyerId);
  },

  async getSellerOrders(sellerId: string): Promise<Order[]> {
    const gasRes = await callGAS('getOrders', 'GET', { sellerId });
    if (gasRes && gasRes.orders) return gasRes.orders;

    const state = getStoredState();
    return state.orders.filter((o: any) => o.sellerId === sellerId);
  },

  async getWallet(userId: string): Promise<Wallet> {
    const gasRes = await callGAS('getWallet', 'GET', { userId });
    if (gasRes && gasRes.wallet) return gasRes.wallet;

    const state = getStoredState();
    if (!state.wallets[userId]) {
      state.wallets[userId] = {
        walletId: 'wal_' + userId,
        userId,
        availableBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
        updatedAt: new Date().toISOString()
      };
      saveState(state);
    }
    return state.wallets[userId];
  },

  async requestWithdrawal(userId: string, data: {
    amount: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
  }): Promise<{ success: boolean; request?: WithdrawalRequest; error?: string }> {
    const state = getStoredState();
    const wallet = state.wallets[userId];
    if (!wallet) return { success: false, error: 'Wallet not found.' };
    if (wallet.availableBalance < data.amount) return { success: false, error: 'Insufficient funds.' };

    const user = state.users.find((u: any) => u.userId === userId);
    wallet.availableBalance -= data.amount;

    const req: WithdrawalRequest = {
      requestId: 'wdr_' + Date.now(),
      userId,
      userEmail: user?.schoolEmail,
      userName: user?.fullName,
      amount: data.amount,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      accountName: data.accountName,
      status: 'pending',
      adminNotes: '',
      processedAt: null,
      createdAt: new Date().toISOString()
    };

    state.withdrawals.unshift(req);
    saveState(state);
    return { success: true, request: req };
  },

  async getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
    const state = getStoredState();
    return state.withdrawals.filter((w: any) => w.userId === userId);
  },

  async getAdminAnalytics(timeframe: 'daily' | 'weekly' | 'monthly' | 'all' = 'all') {
    const gasRes = await callGAS('getAdminAnalytics', 'GET', { timeframe });
    if (gasRes && gasRes.analytics) return gasRes.analytics;

    const state = getStoredState();
    const completedOrdersList = state.orders.filter((o: any) => o.status === 'completed');
    const completedVolume = completedOrdersList.reduce((acc: any, o: any) => acc + o.amount, 0);

    const categoryCounts: Record<string, number> = {};
    state.products.forEach((p: any) => {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });

    const totalPendingFunds = Object.values(state.wallets).reduce((acc: any, w: any) => acc + w.pendingBalance, 0);
    const totalAvailableBalances = Object.values(state.wallets).reduce((acc: any, w: any) => acc + w.availableBalance, 0);

    return {
      timeframe,
      platform: {
        totalUsers: state.users.length,
        activeUsers: state.users.filter((u: any) => u.status === 'active').length,
        totalProducts: state.products.length,
        availableProducts: state.products.filter((p: any) => p.status === 'active' && p.availability === 'available').length,
        soldProducts: state.products.filter((p: any) => p.availability === 'sold').length,
        completedOrders: completedOrdersList.length
      },
      sales: {
        totalOrders: state.orders.length,
        completedOrders: completedOrdersList.length,
        pendingOrders: state.orders.filter((o: any) => o.status.startsWith('awaiting_') || o.status === 'payment_successful').length,
        cancelledOrders: state.orders.filter((o: any) => o.status === 'cancelled').length,
        disputedOrders: state.orders.filter((o: any) => o.status === 'disputed').length,
        totalVolume: state.orders.reduce((acc: any, o: any) => acc + o.amount, 0),
        completedVolume,
        averageOrderValue: completedOrdersList.length > 0 ? Math.round(completedVolume / completedOrdersList.length) : 0
      },
      products: {
        totalUploaded: state.products.length,
        available: state.products.filter((p: any) => p.status === 'active' && p.availability === 'available').length,
        sold: state.products.filter((p: any) => p.availability === 'sold').length,
        deleted: state.products.filter((p: any) => p.status === 'deleted').length,
        byCategory: categoryCounts
      },
      financial: {
        totalPendingFunds,
        totalAvailableBalances,
        totalWithdrawalRequestsCount: state.withdrawals.length,
        totalWithdrawalsProcessed: state.withdrawals.filter((w: any) => w.status === 'processed').reduce((acc: any, w: any) => acc + w.amount, 0)
      }
    };
  },

  async getAllUsers(): Promise<User[]> {
    const state = getStoredState();
    return state.users;
  },

  async toggleUserSuspension(userId: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const state = getStoredState();
    const user = state.users.find((u: any) => u.userId === userId);
    if (!user) return { success: false, error: 'User not found.' };
    user.status = user.status === 'active' ? 'suspended' : 'active';
    saveState(state);
    return { success: true, user };
  },

  async getAllOrders(): Promise<Order[]> {
    const state = getStoredState();
    return state.orders;
  },

  async getAllWithdrawals(): Promise<WithdrawalRequest[]> {
    const state = getStoredState();
    return state.withdrawals;
  },

  async processWithdrawal(requestId: string, decision: 'processed' | 'rejected', adminNotes: string = ''): Promise<{ success: boolean; error?: string }> {
    const state = getStoredState();
    const req = state.withdrawals.find((w: any) => w.requestId === requestId);
    if (!req) return { success: false, error: 'Not found' };

    req.status = decision;
    req.adminNotes = adminNotes;
    req.processedAt = new Date().toISOString();

    const wallet = state.wallets[req.userId];
    if (wallet) {
      if (decision === 'processed') wallet.totalWithdrawals += req.amount;
      if (decision === 'rejected') wallet.availableBalance += req.amount;
    }

    saveState(state);
    return { success: true };
  }
};
