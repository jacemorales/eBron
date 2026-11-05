/**
 * eBron – Covenant University Student Marketplace
 * Google Apps Script Full Backend Implementation (Code.gs)
 *
 * This file contains the complete, self-contained Google Apps Script backend.
 * Copy and paste this file into your Google Apps Script editor.
 */

// Target spreadsheet ID (or leave null to bind to active spreadsheet)
var SPREADSHEET_ID = '15EOXAegJGiSMNmnNN2rX0YUFHtmJ6nr2Q5XridTYb8c';

var SHEETS_SCHEMA = {
  Users: [
    'userId',
    'fullName',
    'regNumber',
    'matricNumber',
    'schoolEmail',
    'gender',
    'hallOfResidence',
    'roomNumber',
    'passwordHash',
    'salt',
    'role',       // 'student' | 'admin'
    'status',     // 'active' | 'suspended'
    'createdAt',
    'updatedAt'
  ],
  Products: [
    'productId',
    'sellerId',
    'sellerName',
    'sellerEmail',
    'name',
    'description',
    'category',
    'price',
    'condition',  // 'New' | 'Fairly Used' | 'Used'
    'stockNumber', // Optional stock reference
    'primaryImageUrl',
    'images',     // JSON array string
    'availability', // 'available' | 'reserved' | 'sold'
    'status',     // 'active' | 'deleted'
    'viewsCount',
    'deletedBy',
    'deletedAt',
    'createdAt',
    'updatedAt'
  ],
  SavedItems: [
    'savedId',
    'userId',
    'productId',
    'createdAt'
  ],
  Conversations: [
    'conversationId',
    'productId',
    'productName',
    'productPrice',
    'productImage',
    'buyerId',
    'buyerName',
    'sellerId',
    'sellerName',
    'lastMessageSnippet',
    'lastMessageAt',
    'createdAt'
  ],
  Messages: [
    'messageId',
    'conversationId',
    'senderId',
    'receiverId',
    'content',
    'isRead',
    'createdAt'
  ],
  Orders: [
    'orderId',
    'orderReference',
    'productId',
    'productName',
    'productImage',
    'buyerId',
    'buyerName',
    'sellerId',
    'sellerName',
    'amount',
    'status', // 'awaiting_payment' | 'payment_successful' | 'awaiting_seller_confirmation' | 'awaiting_buyer_confirmation' | 'completed' | 'cancelled' | 'disputed'
    'paymentMode', // 'TEST_MODE' | 'PAYPAL'
    'paymentRef',
    'deliveryFullName',
    'deliveryGender',
    'deliveryHall',
    'deliveryRoom',
    'sellerConfirmedAt',
    'buyerConfirmedAt',
    'completedAt',
    'disputeReason',
    'createdAt',
    'updatedAt'
  ],
  Wallets: [
    'walletId',
    'userId',
    'availableBalance', // Buyer spending funds exclusively
    'updatedAt'
  ],
  WalletTransactions: [
    'transactionId',
    'userId',
    'type', // 'topup' | 'purchase_deduction'
    'amount',
    'reference',
    'status', // 'successful' | 'pending' | 'failed'
    'description',
    'createdAt'
  ],
  SalesBalances: [
    'salesBalanceId',
    'userId',
    'availableBalance', // Available for withdrawal
    'pendingBalance', // Pending dual confirmation
    'totalEarnings',
    'totalWithdrawals',
    'updatedAt'
  ],
  SalesTransactions: [
    'transactionId',
    'sellerId',
    'orderId',
    'orderReference',
    'amount',
    'type', // 'pending_sale' | 'released_sale' | 'withdrawal'
    'status', // 'pending' | 'completed' | 'disputed'
    'createdAt'
  ],
  WithdrawalRequests: [
    'requestId',
    'userId',
    'userName',
    'userEmail',
    'amount',
    'bankName',
    'accountNumber',
    'accountName',
    'status', // 'pending' | 'approved' | 'rejected' | 'processed'
    'adminNotes',
    'processedAt',
    'createdAt'
  ],
  Notifications: [
    'notificationId',
    'userId',
    'title',
    'message',
    'type', // 'order' | 'message' | 'wallet' | 'sales' | 'admin'
    'destinationUrl',
    'isRead',
    'createdAt'
  ],
  NotificationSubscriptions: [
    'subscriptionId',
    'userId',
    'endpoint',
    'p256dh',
    'auth',
    'enabled',
    'createdAt',
    'updatedAt'
  ],
  Reports: [
    'reportId',
    'productId',
    'productName',
    'productStockNumber',
    'productImage',
    'sellerId',
    'sellerName',
    'reporterId',
    'reporterEmail',
    'category',
    'explanation',
    'status', // 'pending' | 'under_review' | 'resolved' | 'dismissed'
    'adminNotes',
    'createdAt',
    'updatedAt'
  ],
  AnalyticsEvents: [
    'eventId',
    'eventType',
    'userId',
    'amount',
    'details',
    'createdAt'
  ]
};

function getDb() {
  if (SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {
      return SpreadsheetApp.getActiveSpreadsheet();
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function setupDatabase() {
  var ss = getDb();
  var sheetNames = Object.keys(SHEETS_SCHEMA);
  var created = [];

  sheetNames.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    var headers = SHEETS_SCHEMA[name];

    if (!sheet) {
      sheet = ss.insertSheet(name);
      created.push(name);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  });

  return {
    success: true,
    message: 'Database initialization complete. Verified ' + sheetNames.length + ' sheets.',
    createdSheets: created
  };
}

function jsonOutput(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function getSheetRows(sheetName) {
  var ss = getDb();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      item[headers[j]] = row[j];
    }
    rows.push(item);
  }
  return rows;
}

function appendSheetRow(sheetName, record) {
  var ss = getDb();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet ' + sheetName + ' does not exist');

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = [];

  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    var val = record[key];
    if (val === undefined || val === null) {
      row.push('');
    } else if (Array.isArray(val) || typeof val === 'object') {
      row.push(JSON.stringify(val));
    } else {
      row.push(val);
    }
  }

  sheet.appendRow(row);
  return record;
}

function updateSheetRow(sheetName, matchColumn, matchValue, updates) {
  var ss = getDb();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return false;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var colIdx = headers.indexOf(matchColumn);
  if (colIdx === -1) return false;

  var updated = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIdx]) === String(matchValue)) {
      for (var key in updates) {
        var uCol = headers.indexOf(key);
        if (uCol !== -1) {
          var val = updates[key];
          sheet.getRange(i + 1, uCol + 1).setValue(typeof val === 'object' ? JSON.stringify(val) : val);
        }
      }
      updated++;
    }
  }
  return updated > 0;
}

function computePasswordHash(password, salt) {
  var s = salt || Utilities.getUuid();
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + s, Utilities.Charset.UTF_8);
  var hash = '';
  for (var i = 0; i < raw.length; i++) {
    var b = raw[i];
    if (b < 0) b += 256;
    var hex = b.toString(16);
    if (hex.length === 1) hex = '0' + hex;
    hash += hex;
  }
  return { hash: hash, salt: s };
}

function createNotification(userId, title, message, type, destinationUrl) {
  try {
    var notifId = 'notif_' + Utilities.getUuid().substr(0, 8);
    var now = new Date().toISOString();
    var record = {
      notificationId: notifId,
      userId: userId,
      title: title,
      message: message,
      type: type || 'admin',
      destinationUrl: destinationUrl || '/',
      isRead: false,
      createdAt: now
    };
    appendSheetRow('Notifications', record);
    return record;
  } catch (e) {
    console.error('Failed to create notification: ' + e);
    return null;
  }
}

/**
 * HTTP GET Request Handler
 */
function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var action = params.action;

    if (!action) {
      return jsonOutput({ success: false, error: 'No action specified' });
    }

    if (action === 'ping') {
      return jsonOutput({ success: true, message: 'eBron backend operational' });
    }

    if (action === 'setup') {
      return jsonOutput(setupDatabase());
    }

    // 1. GET PRODUCTS
    if (action === 'getProducts') {
      var all = getSheetRows('Products');
      var includeDeleted = params.includeDeleted === 'true';
      var category = params.category;
      var sellerId = params.sellerId;
      var search = params.search ? String(params.search).toLowerCase().trim() : '';

      var filtered = all.filter(function(p) {
        if (!includeDeleted && p.status === 'deleted') return false;
        if (category && category !== 'All' && p.category !== category) return false;
        if (sellerId && p.sellerId !== sellerId) return false;
        if (search) {
          var inName = String(p.name).toLowerCase().indexOf(search) !== -1;
          var inDesc = String(p.description).toLowerCase().indexOf(search) !== -1;
          if (!inName && !inDesc) return false;
        }
        return true;
      });

      // Parse images if stringified JSON
      filtered.forEach(function(item) {
        if (typeof item.images === 'string' && item.images.startsWith('[')) {
          try { item.images = JSON.parse(item.images); } catch(err) { item.images = [item.primaryImageUrl]; }
        }
      });

      return jsonOutput({ success: true, products: filtered });
    }

    // 2. GET PRODUCT BY ID
    if (action === 'getProductById') {
      var prods = getSheetRows('Products');
      var prod = prods.find(function(p) { return p.productId === params.productId; });
      if (prod) {
        var views = (Number(prod.viewsCount) || 0) + 1;
        updateSheetRow('Products', 'productId', params.productId, { viewsCount: views });
        prod.viewsCount = views;
        if (typeof prod.images === 'string' && prod.images.startsWith('[')) {
          try { prod.images = JSON.parse(prod.images); } catch(err) { prod.images = [prod.primaryImageUrl]; }
        }
      }
      return jsonOutput({ success: true, product: prod || null });
    }

    // 3. GET PROFILE
    if (action === 'getProfile') {
      var users = getSheetRows('Users');
      var u = users.find(function(item) { return item.userId === params.userId; });
      if (u) {
        delete u.passwordHash;
        delete u.salt;
      }
      return jsonOutput({ success: true, user: u || null });
    }

    // 4. GET SAVED ITEMS
    if (action === 'getSavedItems') {
      var saved = getSheetRows('SavedItems').filter(function(s) { return s.userId === params.userId; });
      var savedIds = saved.map(function(s) { return s.productId; });
      var allProds = getSheetRows('Products').filter(function(p) {
        return savedIds.indexOf(p.productId) !== -1 && p.status !== 'deleted';
      });
      return jsonOutput({ success: true, savedItems: allProds });
    }

    // 5. IS ITEM SAVED
    if (action === 'isItemSaved') {
      var isSaved = getSheetRows('SavedItems').some(function(s) {
        return s.userId === params.userId && s.productId === params.productId;
      });
      return jsonOutput({ success: true, isSaved: isSaved });
    }

    // 6. GET CONVERSATIONS (with unread message counts)
    if (action === 'getConversations') {
      var convs = getSheetRows('Conversations').filter(function(c) {
        return c.buyerId === params.userId || c.sellerId === params.userId;
      });
      var allMsgs = getSheetRows('Messages');
      convs.forEach(function(c) {
        var unread = allMsgs.filter(function(m) {
          return m.conversationId === c.conversationId && m.receiverId === params.userId && (m.isRead === false || m.isRead === 'false' || m.isRead === '');
        }).length;
        c.unreadCount = unread;
      });
      return jsonOutput({ success: true, conversations: convs });
    }

    // 6b. GET UNREAD COUNTS
    if (action === 'getUnreadCounts') {
      var uMsgs = getSheetRows('Messages').filter(function(m) {
        return m.receiverId === params.userId && (m.isRead === false || m.isRead === 'false' || m.isRead === '');
      });
      var notifs = getSheetRows('Notifications').filter(function(n) {
        return n.userId === params.userId && (n.isRead === false || n.isRead === 'false' || n.isRead === '');
      });
      return jsonOutput({
        success: true,
        unreadMessages: uMsgs.length,
        unreadNotifications: notifs.length
      });
    }

    // 7. GET MESSAGES
    if (action === 'getMessages') {
      var msgs = getSheetRows('Messages').filter(function(m) {
        return m.conversationId === params.conversationId;
      });
      // Mark as read if user is receiver
      if (params.userId) {
        var ss = getDb();
        var mSheet = ss.getSheetByName('Messages');
        if (mSheet && mSheet.getLastRow() > 1) {
          var mData = mSheet.getDataRange().getValues();
          var mHeaders = mData[0];
          var convIdx = mHeaders.indexOf('conversationId');
          var recIdx = mHeaders.indexOf('receiverId');
          var isReadIdx = mHeaders.indexOf('isRead');
          if (convIdx !== -1 && recIdx !== -1 && isReadIdx !== -1) {
            for (var mi = 1; mi < mData.length; mi++) {
              if (mData[mi][convIdx] === params.conversationId && mData[mi][recIdx] === params.userId) {
                mSheet.getRange(mi + 1, isReadIdx + 1).setValue(true);
              }
            }
          }
        }
      }
      return jsonOutput({ success: true, messages: msgs });
    }

    // 7b. GET NOTIFICATIONS
    if (action === 'getNotifications') {
      var notifs = getSheetRows('Notifications').filter(function(n) {
        return n.userId === params.userId;
      }).sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return jsonOutput({ success: true, notifications: notifs });
    }

    // 8. GET ORDERS
    if (action === 'getOrders') {
      var orders = getSheetRows('Orders');
      if (params.buyerId) {
        orders = orders.filter(function(o) { return o.buyerId === params.buyerId; });
      } else if (params.sellerId) {
        orders = orders.filter(function(o) { return o.sellerId === params.sellerId; });
      }
      return jsonOutput({ success: true, orders: orders });
    }

    // 9. GET WALLET (Buyer Spending Wallet)
    if (action === 'getWallet') {
      var wallets = getSheetRows('Wallets');
      var w = wallets.find(function(item) { return item.userId === params.userId; });
      if (!w) {
        w = {
          walletId: 'wal_' + params.userId,
          userId: params.userId,
          availableBalance: 0,
          updatedAt: new Date().toISOString()
        };
        appendSheetRow('Wallets', w);
      }
      return jsonOutput({ success: true, wallet: w });
    }

    // 9b. GET WALLET TRANSACTIONS (Buyer Top-ups & Deductions)
    if (action === 'getWalletTransactions') {
      var wtxs = getSheetRows('WalletTransactions').filter(function(tx) {
        return tx.userId === params.userId;
      }).sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return jsonOutput({ success: true, transactions: wtxs });
    }

    // 9c. GET SALES BALANCE (Seller Income Account)
    if (action === 'getSalesBalance') {
      var sbList = getSheetRows('SalesBalances');
      var sb = sbList.find(function(item) { return item.userId === params.userId; });
      if (!sb) {
        sb = {
          salesBalanceId: 'sb_' + params.userId,
          userId: params.userId,
          availableBalance: 0,
          pendingBalance: 0,
          totalEarnings: 0,
          totalWithdrawals: 0,
          updatedAt: new Date().toISOString()
        };
        appendSheetRow('SalesBalances', sb);
      }
      return jsonOutput({ success: true, salesBalance: sb });
    }

    // 9d. GET SALES TRANSACTIONS (Seller sales income history)
    if (action === 'getSalesTransactions') {
      var stxs = getSheetRows('SalesTransactions').filter(function(tx) {
        return tx.sellerId === params.userId;
      }).sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return jsonOutput({ success: true, transactions: stxs });
    }

    // 10. GET USER WITHDRAWALS (From Sales Balance)
    if (action === 'getUserWithdrawals') {
      var wds = getSheetRows('WithdrawalRequests').filter(function(item) {
        return item.userId === params.userId;
      }).sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return jsonOutput({ success: true, withdrawals: wds });
    }

    // 11. GET ALL USERS (Admin)
    if (action === 'getAllUsers') {
      var allUsers = getSheetRows('Users').map(function(u) {
        delete u.passwordHash;
        delete u.salt;
        return u;
      });
      return jsonOutput({ success: true, users: allUsers });
    }

    // 12. GET ALL WITHDRAWALS (Admin)
    if (action === 'getAllWithdrawals') {
      var allW = getSheetRows('WithdrawalRequests');
      return jsonOutput({ success: true, withdrawals: allW });
    }

    // 12b. GET ALL REPORTS (Admin)
    if (action === 'getReports') {
      var allReports = getSheetRows('Reports');
      var rTimeframe = params.timeframe || 'all';
      var rCat = params.category;
      var rStat = params.status;
      var rCutoff = null;
      var rNow = new Date();

      if (rTimeframe === 'daily') {
        rCutoff = new Date(); rCutoff.setHours(rCutoff.getHours() - 24);
      } else if (rTimeframe === 'weekly') {
        rCutoff = new Date(); rCutoff.setDate(rCutoff.getDate() - 7);
      } else if (rTimeframe === 'monthly') {
        rCutoff = new Date(); rCutoff.setDate(rCutoff.getDate() - 30);
      }

      var filteredReports = allReports.filter(function(r) {
        if (rCutoff && r.createdAt) {
          var d = new Date(r.createdAt);
          if (d < rCutoff || d > rNow) return false;
        }
        if (rCat && rCat !== 'All' && r.category !== rCat) return false;
        if (rStat && rStat !== 'All' && r.status !== rStat) return false;
        return true;
      });

      return jsonOutput({ success: true, reports: filteredReports });
    }

    // 12c. GET PRODUCT REPORTS
    if (action === 'getProductReports') {
      var pId = params.productId;
      var pReports = getSheetRows('Reports').filter(function(r) {
        return r.productId === pId;
      });
      return jsonOutput({ success: true, reports: pReports });
    }

    // 13. GET COMPREHENSIVE ADMIN ANALYTICS
    if (action === 'getAdminAnalytics') {
      var uList = getSheetRows('Users');
      var pList = getSheetRows('Products');
      var oList = getSheetRows('Orders');
      var wList = getSheetRows('Wallets');
      var wdList = getSheetRows('WithdrawalRequests');
      var sList = getSheetRows('SavedItems');
      var mList = getSheetRows('Messages');

      var timeframe = params.timeframe || 'all';
      var cutoff = null;
      var now = new Date();
      if (timeframe === 'daily') {
        cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - 24);
      } else if (timeframe === 'weekly') {
        cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
      } else if (timeframe === 'monthly') {
        cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
      }

      var inTime = function(dateStr) {
        if (!cutoff || !dateStr) return true;
        var d = new Date(dateStr);
        return d >= cutoff && d <= now;
      };

      var filUsers = uList.filter(function(u) { return inTime(u.createdAt); });
      var filProds = pList.filter(function(p) { return inTime(p.createdAt); });
      var filOrders = oList.filter(function(o) { return inTime(o.createdAt); });
      var filWds = wdList.filter(function(w) { return inTime(w.createdAt); });

      var completed = filOrders.filter(function(o) { return o.status === 'completed'; });
      var completedVol = completed.reduce(function(acc, o) { return acc + (Number(o.amount) || 0); }, 0);
      var totalVol = filOrders.reduce(function(acc, o) { return acc + (Number(o.amount) || 0); }, 0);

      var catCounts = {};
      filProds.forEach(function(p) {
        if (p.category) catCounts[p.category] = (catCounts[p.category] || 0) + 1;
      });

      var buyers = {};
      var sellers = {};
      filOrders.forEach(function(o) {
        buyers[o.buyerId] = true;
        sellers[o.sellerId] = true;
      });
      var bothCount = 0;
      Object.keys(buyers).forEach(function(bId) {
        if (sellers[bId]) bothCount++;
      });

      var pendingBalances = wList.reduce(function(acc, w) { return acc + (Number(w.pendingBalance) || 0); }, 0);
      var availBalances = wList.reduce(function(acc, w) { return acc + (Number(w.availableBalance) || 0); }, 0);

      var analytics = {
        timeframe: timeframe,
        platform: {
          totalUsers: filUsers.length,
          activeUsers: filUsers.filter(function(u) { return u.status === 'active'; }).length,
          totalProducts: filProds.length,
          availableProducts: filProds.filter(function(p) { return p.status === 'active' && p.availability === 'available'; }).length,
          soldProducts: filProds.filter(function(p) { return p.availability === 'sold'; }).length,
          completedOrders: completed.length
        },
        users: {
          newRegistrations: filUsers.length,
          activeBuyers: Object.keys(buyers).length,
          activeSellers: Object.keys(sellers).length,
          bothBuyerAndSeller: bothCount,
          suspendedUsers: filUsers.filter(function(u) { return u.status === 'suspended'; }).length
        },
        products: {
          totalUploaded: filProds.length,
          available: filProds.filter(function(p) { return p.status === 'active' && p.availability === 'available'; }).length,
          sold: filProds.filter(function(p) { return p.availability === 'sold'; }).length,
          deleted: filProds.filter(function(p) { return p.status === 'deleted'; }).length,
          byCategory: catCounts
        },
        sales: {
          totalOrders: filOrders.length,
          completedOrders: completed.length,
          pendingOrders: filOrders.filter(function(o) { return o.status !== 'completed' && o.status !== 'cancelled'; }).length,
          cancelledOrders: filOrders.filter(function(o) { return o.status === 'cancelled'; }).length,
          disputedOrders: filOrders.filter(function(o) { return o.status === 'disputed'; }).length,
          totalVolume: totalVol,
          completedVolume: completedVol,
          averageOrderValue: completed.length > 0 ? Math.round(completedVol / completed.length) : 0
        },
        financial: {
          totalPendingFunds: pendingBalances,
          totalAvailableBalances: availBalances,
          totalWithdrawalRequestsCount: filWds.length,
          totalWithdrawalsProcessed: filWds.filter(function(w) { return w.status === 'processed'; }).reduce(function(acc, w) { return acc + (Number(w.amount) || 0); }, 0),
          simulatedVolume: totalVol
        },
        engagement: {
          totalMessages: mList.filter(function(m) { return inTime(m.createdAt); }).length,
          totalSavedItems: sList.filter(function(s) { return inTime(s.createdAt); }).length
        }
      };

      return jsonOutput({ success: true, analytics: analytics });
    }

    return jsonOutput({ success: false, error: 'Unknown GET action: ' + action });
  } catch (err) {
    return jsonOutput({ success: false, error: err.toString() });
  }
}

/**
 * HTTP POST Request Handler (with atomic lock)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = false;

  try {
    hasLock = lock.tryLock(10000);
    if (!hasLock) {
      return jsonOutput({ success: false, error: 'Server busy. Please try again.' });
    }

    var payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
    var action = payload.action;

    // 1. REGISTER
    if (action === 'register') {
      var email = (payload.schoolEmail || '').trim().toLowerCase();
      if (!email.endsWith('@stu.cu.edu.ng')) {
        return jsonOutput({ success: false, error: 'Only @stu.cu.edu.ng Covenant University emails are allowed.' });
      }

      var users = getSheetRows('Users');
      if (users.some(function(u) { return String(u.schoolEmail).toLowerCase() === email; })) {
        return jsonOutput({ success: false, error: 'An account with this school email already exists.' });
      }

      var hashRes = computePasswordHash(payload.password);
      var userId = 'u_' + Utilities.getUuid().substr(0, 8);
      var now = new Date().toISOString();

      var newUser = {
        userId: userId,
        fullName: payload.fullName,
        regNumber: payload.regNumber,
        matricNumber: payload.matricNumber,
        schoolEmail: email,
        gender: payload.gender,
        hallOfResidence: payload.hallOfResidence,
        roomNumber: payload.roomNumber,
        passwordHash: hashRes.hash,
        salt: hashRes.salt,
        role: 'student',
        status: 'active',
        createdAt: now,
        updatedAt: now
      };

      appendSheetRow('Users', newUser);
      appendSheetRow('Wallets', {
        walletId: 'wal_' + userId,
        userId: userId,
        availableBalance: 0,
        updatedAt: now
      });
      appendSheetRow('SalesBalances', {
        salesBalanceId: 'sb_' + userId,
        userId: userId,
        availableBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
        updatedAt: now
      });
      createNotification(userId, 'Welcome to eBron!', 'Your student marketplace account is active. Explore products or list your first item.', 'admin', '/');

      delete newUser.passwordHash;
      delete newUser.salt;
      return jsonOutput({ success: true, user: newUser });
    }

    // 2. LOGIN
    if (action === 'login') {
      var lEmail = (payload.schoolEmail || '').trim().toLowerCase();
      var allU = getSheetRows('Users');

      // Auto-provision or verify default administrator account if requested
      if (lEmail === 'admin@stu.cu.edu.ng' && payload.password === 'AdminPassword123!') {
        var existingAdmin = allU.find(function(u) { return String(u.schoolEmail).toLowerCase() === 'admin@stu.cu.edu.ng'; });
        if (!existingAdmin) {
          var adminHash = computePasswordHash('AdminPassword123!');
          var adminUserId = 'u_admin_001';
          var adminNow = new Date().toISOString();
          existingAdmin = {
            userId: adminUserId,
            fullName: 'eBron System Administrator',
            regNumber: 'ADMIN001',
            matricNumber: 'CU/ADMIN/001',
            schoolEmail: 'admin@stu.cu.edu.ng',
            gender: 'Male',
            hallOfResidence: 'Peter',
            roomNumber: 'ADM-01',
            passwordHash: adminHash.hash,
            salt: adminHash.salt,
            role: 'admin',
            status: 'active',
            createdAt: adminNow,
            updatedAt: adminNow
          };
          appendSheetRow('Users', existingAdmin);
          appendSheetRow('Wallets', {
            walletId: 'wal_' + adminUserId,
            userId: adminUserId,
            availableBalance: 500000,
            pendingBalance: 0,
            totalEarnings: 500000,
            totalWithdrawals: 0,
            updatedAt: adminNow
          });
        } else if (existingAdmin.role !== 'admin') {
          updateSheetRow('Users', 'userId', existingAdmin.userId, { role: 'admin', status: 'active' });
          existingAdmin.role = 'admin';
        }

        var safeAdmin = Object.assign({}, existingAdmin);
        delete safeAdmin.passwordHash;
        delete safeAdmin.salt;
        return jsonOutput({ success: true, user: safeAdmin });
      }

      var user = allU.find(function(u) { return String(u.schoolEmail).toLowerCase() === lEmail; });

      if (!user) return jsonOutput({ success: false, error: 'Invalid school email or password.' });
      if (user.status === 'suspended') return jsonOutput({ success: false, error: 'Account has been suspended.' });

      var testHash = computePasswordHash(payload.password, user.salt);
      if (testHash.hash !== user.passwordHash) {
        return jsonOutput({ success: false, error: 'Invalid school email or password.' });
      }

      delete user.passwordHash;
      delete user.salt;
      return jsonOutput({ success: true, user: user });
    }

    // 3. UPDATE PROFILE
    if (action === 'updateProfile') {
      var now = new Date().toISOString();
      var updates = {
        fullName: payload.fullName,
        gender: payload.gender,
        hallOfResidence: payload.hallOfResidence,
        roomNumber: payload.roomNumber,
        updatedAt: now
      };
      var ok = updateSheetRow('Users', 'userId', payload.userId, updates);
      if (!ok) return jsonOutput({ success: false, error: 'User not found.' });

      var updatedUser = getSheetRows('Users').find(function(u) { return u.userId === payload.userId; });
      if (updatedUser) {
        delete updatedUser.passwordHash;
        delete updatedUser.salt;
      }
      return jsonOutput({ success: true, user: updatedUser });
    }

    // 4. CREATE PRODUCT
    if (action === 'createProduct') {
      var pId = 'prod_' + Utilities.getUuid().substr(0, 8);
      var now = new Date().toISOString();
      var images = payload.images || [];
      var pIndex = payload.primaryIndex || 0;
      var primary = images[pIndex] || images[0] || '';

      var newProd = {
        productId: pId,
        sellerId: payload.sellerId,
        sellerName: payload.sellerName,
        sellerEmail: payload.sellerEmail,
        name: payload.name,
        description: payload.description,
        category: payload.category,
        price: Number(payload.price),
        condition: payload.condition,
        stockNumber: payload.stockNumber ? String(payload.stockNumber).trim() : '',
        primaryImageUrl: primary,
        images: images,
        availability: 'available',
        status: 'active',
        viewsCount: 0,
        deletedBy: '',
        deletedAt: '',
        createdAt: now,
        updatedAt: now
      };

      appendSheetRow('Products', newProd);
      return jsonOutput({ success: true, product: newProd });
    }

    // 5. UPDATE PRODUCT
    if (action === 'updateProduct') {
      var updates = {
        price: Number(payload.price),
        description: payload.description,
        updatedAt: new Date().toISOString()
      };
      if (payload.stockNumber !== undefined) {
        updates.stockNumber = payload.stockNumber ? String(payload.stockNumber).trim() : '';
      }
      updateSheetRow('Products', 'productId', payload.productId, updates);
      return jsonOutput({ success: true });
    }

    // 6. TOGGLE PRODUCT AVAILABILITY
    if (action === 'toggleProductAvailability') {
      var p = getSheetRows('Products').find(function(item) { return item.productId === payload.productId; });
      if (!p) return jsonOutput({ success: false, error: 'Product not found' });
      var nextAvail = p.availability === 'available' ? 'reserved' : 'available';
      updateSheetRow('Products', 'productId', payload.productId, {
        availability: nextAvail,
        updatedAt: new Date().toISOString()
      });
      return jsonOutput({ success: true });
    }

    // 7. SOFT DELETE PRODUCT (Admin)
    if (action === 'softDeleteProduct') {
      updateSheetRow('Products', 'productId', payload.productId, {
        status: 'deleted',
        deletedBy: payload.adminId,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return jsonOutput({ success: true });
    }

    // 8. RESTORE PRODUCT (Admin)
    if (action === 'restoreProduct') {
      updateSheetRow('Products', 'productId', payload.productId, {
        status: 'active',
        deletedBy: '',
        deletedAt: '',
        updatedAt: new Date().toISOString()
      });
      return jsonOutput({ success: true });
    }

    // 9. TOGGLE SAVE ITEM
    if (action === 'toggleSaveItem') {
      var saved = getSheetRows('SavedItems');
      var match = saved.find(function(s) {
        return s.userId === payload.userId && s.productId === payload.productId;
      });

      if (match) {
        // Unsave
        var ss = getDb();
        var sSheet = ss.getSheetByName('SavedItems');
        var data = sSheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (data[i][0] === match.savedId) {
            sSheet.deleteRow(i + 1);
            break;
          }
        }
        return jsonOutput({ success: true, isSaved: false });
      } else {
        // Save
        appendSheetRow('SavedItems', {
          savedId: 'sav_' + Utilities.getUuid().substr(0, 8),
          userId: payload.userId,
          productId: payload.productId,
          createdAt: new Date().toISOString()
        });
        return jsonOutput({ success: true, isSaved: true });
      }
    }

    // 10. CONVERSATIONS & MESSAGING
    if (action === 'startOrGetConversation') {
      var convs = getSheetRows('Conversations');
      var exist = convs.find(function(c) {
        return c.productId === payload.productId && c.buyerId === payload.buyerId;
      });
      if (exist) return jsonOutput({ success: true, conversation: exist });

      var prod = getSheetRows('Products').find(function(p) { return p.productId === payload.productId; });
      var now = new Date().toISOString();
      var newConv = {
        conversationId: 'conv_' + Utilities.getUuid().substr(0, 8),
        productId: payload.productId,
        productName: prod ? prod.name : '',
        productPrice: prod ? prod.price : 0,
        productImage: prod ? prod.primaryImageUrl : '',
        buyerId: payload.buyerId,
        buyerName: payload.buyerName,
        sellerId: prod ? prod.sellerId : '',
        sellerName: prod ? prod.sellerName : 'Seller',
        lastMessageSnippet: 'Conversation started',
        lastMessageAt: now,
        createdAt: now
      };
      appendSheetRow('Conversations', newConv);
      return jsonOutput({ success: true, conversation: newConv });
    }

    if (action === 'sendMessage') {
      var conv = getSheetRows('Conversations').find(function(c) { return c.conversationId === payload.conversationId; });
      if (!conv) return jsonOutput({ success: false, error: 'Conversation not found' });
      var receiverId = conv.buyerId === payload.senderId ? conv.sellerId : conv.buyerId;
      var now = new Date().toISOString();

      var newMsg = {
        messageId: 'msg_' + Utilities.getUuid().substr(0, 8),
        conversationId: payload.conversationId,
        senderId: payload.senderId,
        receiverId: receiverId,
        content: payload.content,
        isRead: false,
        createdAt: now
      };

      appendSheetRow('Messages', newMsg);
      updateSheetRow('Conversations', 'conversationId', payload.conversationId, {
        lastMessageSnippet: payload.content,
        lastMessageAt: now
      });

      var senderName = conv.buyerId === payload.senderId ? (conv.buyerName || 'Buyer') : (conv.sellerName || 'Seller');
      var snippet = payload.content.length > 50 ? (payload.content.substring(0, 50) + '...') : payload.content;
      createNotification(
        receiverId,
        'New message from ' + senderName,
        snippet,
        'message',
        '/messages?conversationId=' + payload.conversationId
      );

      return jsonOutput({ success: true, message: newMsg });
    }

    // 10a2. MARK CONVERSATION AS READ
    if (action === 'markConversationAsRead') {
      var convId = payload.conversationId;
      var currentUserId = payload.userId;
      var ss = getDb();
      var mSheet = ss.getSheetByName('Messages');
      if (mSheet && mSheet.getLastRow() > 1) {
        var mData = mSheet.getDataRange().getValues();
        var mHeaders = mData[0];
        var cIdx = mHeaders.indexOf('conversationId');
        var rIdx = mHeaders.indexOf('receiverId');
        var irIdx = mHeaders.indexOf('isRead');
        if (cIdx !== -1 && rIdx !== -1 && irIdx !== -1) {
          for (var i = 1; i < mData.length; i++) {
            if (mData[i][cIdx] === convId && mData[i][rIdx] === currentUserId) {
              mSheet.getRange(i + 1, irIdx + 1).setValue(true);
            }
          }
        }
      }
      return jsonOutput({ success: true });
    }

    // 10a3. MARK NOTIFICATION AS READ
    if (action === 'markNotificationRead') {
      if (payload.all && payload.userId) {
        var ss = getDb();
        var nSheet = ss.getSheetByName('Notifications');
        if (nSheet && nSheet.getLastRow() > 1) {
          var nData = nSheet.getDataRange().getValues();
          var nHeaders = nData[0];
          var uIdx = nHeaders.indexOf('userId');
          var isRIdx = nHeaders.indexOf('isRead');
          if (uIdx !== -1 && isRIdx !== -1) {
            for (var ni = 1; ni < nData.length; ni++) {
              if (nData[ni][uIdx] === payload.userId) {
                nSheet.getRange(ni + 1, isRIdx + 1).setValue(true);
              }
            }
          }
        }
        return jsonOutput({ success: true });
      } else if (payload.notificationId) {
        updateSheetRow('Notifications', 'notificationId', payload.notificationId, { isRead: true });
        return jsonOutput({ success: true });
      }
      return jsonOutput({ success: false, error: 'Invalid parameters' });
    }

    // 10a4. SAVE PUSH SUBSCRIPTION
    if (action === 'savePushSubscription') {
      var subUserId = payload.userId;
      var subEndpoint = payload.endpoint;
      var subP256dh = payload.p256dh;
      var subAuth = payload.auth;
      var nowSub = new Date().toISOString();

      var subs = getSheetRows('NotificationSubscriptions');
      var existingSub = subs.find(function(s) { return s.userId === subUserId && s.endpoint === subEndpoint; });

      if (existingSub) {
        updateSheetRow('NotificationSubscriptions', 'subscriptionId', existingSub.subscriptionId, {
          enabled: payload.enabled !== false,
          updatedAt: nowSub
        });
      } else {
        appendSheetRow('NotificationSubscriptions', {
          subscriptionId: 'sub_' + Utilities.getUuid().substr(0, 8),
          userId: subUserId,
          endpoint: subEndpoint,
          p256dh: subP256dh,
          auth: subAuth,
          enabled: true,
          createdAt: nowSub,
          updatedAt: nowSub
        });
      }
      return jsonOutput({ success: true });
    }

    // 10b. TOP UP BUYER WALLET (via Paystack)
    if (action === 'topUpWallet') {
      var topUserId = payload.userId;
      var topAmount = Number(payload.amount);
      var payRef = payload.reference || ('PSTK_' + Date.now());

      if (!topAmount || topAmount <= 0) {
        return jsonOutput({ success: false, error: 'Invalid top up amount.' });
      }

      // Check duplicate reference in WalletTransactions
      var existingTx = getSheetRows('WalletTransactions').find(function(tx) {
        return tx.reference === payRef && tx.status === 'successful';
      });
      if (existingTx) {
        return jsonOutput({ success: false, error: 'This transaction reference has already been processed.' });
      }

      var wList = getSheetRows('Wallets');
      var userWallet = wList.find(function(w) { return w.userId === topUserId; });
      var now = new Date().toISOString();

      if (!userWallet) {
        userWallet = {
          walletId: 'wal_' + topUserId,
          userId: topUserId,
          availableBalance: topAmount,
          updatedAt: now
        };
        appendSheetRow('Wallets', userWallet);
      } else {
        var updatedAvail = Number(((Number(userWallet.availableBalance) || 0) + topAmount).toFixed(2));
        updateSheetRow('Wallets', 'userId', topUserId, {
          availableBalance: updatedAvail,
          updatedAt: now
        });
        userWallet.availableBalance = updatedAvail;
      }

      // Record in WalletTransactions
      appendSheetRow('WalletTransactions', {
        transactionId: 'wtx_' + Utilities.getUuid().substr(0, 8),
        userId: topUserId,
        type: 'topup',
        amount: topAmount,
        reference: payRef,
        status: 'successful',
        description: 'Paystack Wallet Top-up',
        createdAt: now
      });

      // Notification
      createNotification(
        topUserId,
        'Wallet Funded Successfully',
        '₦' + topAmount.toLocaleString() + ' was successfully credited to your spending wallet.',
        'wallet',
        '/buy/wallets'
      );

      return jsonOutput({ success: true, wallet: userWallet, reference: payRef });
    }

    // 11. CREATE ORDER & WALLET PAYMENT
    if (action === 'createOrder') {
      var prod = getSheetRows('Products').find(function(p) { return p.productId === payload.productId; });
      if (!prod || prod.availability !== 'available') {
        return jsonOutput({ success: false, error: 'Product is unavailable.' });
      }

      var price = Number(prod.price);
      var wList = getSheetRows('Wallets');
      var bWallet = wList.find(function(w) { return w.userId === payload.buyerId; });
      var buyerAvail = Number(bWallet ? bWallet.availableBalance : 0);

      // Verify buyer has sufficient wallet balance
      if (buyerAvail < price) {
        var deficit = price - buyerAvail;
        return jsonOutput({
          success: false,
          error: 'Insufficient wallet balance. You need ₦' + deficit.toLocaleString() + ' more to complete this purchase. Please top up your wallet.'
        });
      }

      var now = new Date().toISOString();
      var oId = 'ord_' + Utilities.getUuid().substr(0, 8);
      var oRef = 'EBR-' + Math.floor(100000 + Math.random() * 900000);

      var newOrder = {
        orderId: oId,
        orderReference: oRef,
        productId: prod.productId,
        productName: prod.name,
        productImage: prod.primaryImageUrl,
        buyerId: payload.buyerId,
        buyerName: payload.buyerName,
        sellerId: prod.sellerId,
        sellerName: prod.sellerName,
        amount: price,
        status: 'payment_successful',
        paymentMode: 'WALLET_ESCROW',
        paymentRef: 'WAL_PAY_' + Date.now(),
        deliveryFullName: payload.deliveryInfo.fullName,
        deliveryGender: payload.deliveryInfo.gender,
        deliveryHall: payload.deliveryInfo.hallOfResidence,
        deliveryRoom: payload.deliveryInfo.roomNumber,
        sellerConfirmedAt: '',
        buyerConfirmedAt: '',
        completedAt: '',
        disputeReason: '',
        createdAt: now,
        updatedAt: now
      };

      appendSheetRow('Orders', newOrder);
      updateSheetRow('Products', 'productId', prod.productId, { availability: 'sold', updatedAt: now });

      // Deduct from buyer available balance (Wallets)
      var newBuyerAvail = Number((buyerAvail - price).toFixed(2));
      updateSheetRow('Wallets', 'userId', payload.buyerId, {
        availableBalance: newBuyerAvail,
        updatedAt: now
      });

      // Record buyer WalletTransaction
      appendSheetRow('WalletTransactions', {
        transactionId: 'wtx_' + Utilities.getUuid().substr(0, 8),
        userId: payload.buyerId,
        type: 'purchase_deduction',
        amount: price,
        reference: oRef,
        status: 'successful',
        description: 'Purchase payment for ' + prod.name,
        createdAt: now
      });

      // Credit seller pending balance in SalesBalances (NOT Wallets)
      var sbList = getSheetRows('SalesBalances');
      var sBalance = sbList.find(function(s) { return s.userId === prod.sellerId; });
      if (!sBalance) {
        appendSheetRow('SalesBalances', {
          salesBalanceId: 'sb_' + prod.sellerId,
          userId: prod.sellerId,
          availableBalance: 0,
          pendingBalance: price,
          totalEarnings: 0,
          totalWithdrawals: 0,
          updatedAt: now
        });
      } else {
        var newPending = Number(((Number(sBalance.pendingBalance) || 0) + price).toFixed(2));
        updateSheetRow('SalesBalances', 'userId', prod.sellerId, { pendingBalance: newPending, updatedAt: now });
      }

      // Record in SalesTransactions
      appendSheetRow('SalesTransactions', {
        transactionId: 'stx_' + Utilities.getUuid().substr(0, 8),
        sellerId: prod.sellerId,
        orderId: oId,
        orderReference: oRef,
        amount: price,
        type: 'pending_sale',
        status: 'pending',
        createdAt: now
      });

      // Send notifications to buyer and seller
      createNotification(
        payload.buyerId,
        'Purchase Placed (' + oRef + ')',
        'Your payment of ₦' + price.toLocaleString() + ' for ' + prod.name + ' was deducted. Track your delivery and confirm receipt when received.',
        'order',
        '/buy/pending'
      );

      createNotification(
        prod.sellerId,
        'New Sale Received! (' + oRef + ')',
        payload.buyerName + ' purchased ' + prod.name + ' for ₦' + price.toLocaleString() + '. Deliver the item and confirm handover.',
        'order',
        '/sell/pending'
      );

      return jsonOutput({ success: true, order: newOrder });
    }

    // 12. CONFIRM ORDER (Dual Confirmation State Machine)
    if (action === 'confirmOrder') {
      var ord = getSheetRows('Orders').find(function(o) { return o.orderId === payload.orderId; });
      if (!ord) return jsonOutput({ success: false, error: 'Order not found' });

      var now = new Date().toISOString();
      var sellerAt = ord.sellerConfirmedAt;
      var buyerAt = ord.buyerConfirmedAt;

      if (payload.role === 'seller') sellerAt = now;
      if (payload.role === 'buyer') buyerAt = now;

      var st = ord.status;
      var released = false;

      if (sellerAt && buyerAt) {
        st = 'completed';
        released = true;

        // Shift pending to available in seller SalesBalances (NOT Wallets)
        var sb = getSheetRows('SalesBalances').find(function(item) { return item.userId === ord.sellerId; });
        if (sb) {
          var pBal = Math.max(0, Number(((Number(sb.pendingBalance) || 0) - Number(ord.amount)).toFixed(2)));
          var aBal = Number(((Number(sb.availableBalance) || 0) + Number(ord.amount)).toFixed(2));
          var tot = Number(((Number(sb.totalEarnings) || 0) + Number(ord.amount)).toFixed(2));
          updateSheetRow('SalesBalances', 'userId', ord.sellerId, {
            pendingBalance: pBal,
            availableBalance: aBal,
            totalEarnings: tot,
            updatedAt: now
          });
        }

        // Add released transaction to SalesTransactions
        appendSheetRow('SalesTransactions', {
          transactionId: 'stx_' + Utilities.getUuid().substr(0, 8),
          sellerId: ord.sellerId,
          orderId: ord.orderId,
          orderReference: ord.orderReference,
          amount: ord.amount,
          type: 'released_sale',
          status: 'completed',
          createdAt: now
        });

        createNotification(
          ord.sellerId,
          'Funds Released to Sales Balance (' + ord.orderReference + ')',
          '₦' + Number(ord.amount).toLocaleString() + ' is now available for withdrawal in your Sales Balance.',
          'sales',
          '/sell/sales-balance'
        );

        createNotification(
          ord.buyerId,
          'Transaction Completed (' + ord.orderReference + ')',
          'Your transaction for ' + (ord.productName || 'product') + ' is marked complete. Thank you for using eBron!',
          'order',
          '/buy/history'
        );
      } else if (sellerAt) {
        st = 'awaiting_buyer_confirmation';
        createNotification(
          ord.buyerId,
          'Seller Confirmed Delivery (' + ord.orderReference + ')',
          'The seller confirmed handing over ' + (ord.productName || 'your item') + '. Please confirm receipt once received.',
          'order',
          '/buy/pending'
        );
      } else if (buyerAt) {
        st = 'awaiting_seller_confirmation';
        createNotification(
          ord.sellerId,
          'Buyer Confirmed Receipt (' + ord.orderReference + ')',
          'The buyer has confirmed receiving the item. Please confirm handover to release funds.',
          'order',
          '/sell/pending'
        );
      }

      updateSheetRow('Orders', 'orderId', ord.orderId, {
        sellerConfirmedAt: sellerAt,
        buyerConfirmedAt: buyerAt,
        status: st,
        completedAt: st === 'completed' ? now : '',
        updatedAt: now
      });

      return jsonOutput({
        success: true,
        status: st,
        fundsReleased: released,
        message: released ? 'Transaction completed! Funds released.' : 'Confirmation recorded.'
      });
    }

    // 13. DISPUTE ORDER
    if (action === 'disputeOrder') {
      updateSheetRow('Orders', 'orderId', payload.orderId, {
        status: 'disputed',
        disputeReason: payload.reason,
        updatedAt: new Date().toISOString()
      });
      return jsonOutput({ success: true });
    }

    // 14. WITHDRAWAL REQUESTS (Deducted from Seller Sales Balance)
    if (action === 'requestWithdrawal') {
      var user = getSheetRows('Users').find(function(u) { return u.userId === payload.userId; });
      var sbList = getSheetRows('SalesBalances');
      var sBalance = sbList.find(function(w) { return w.userId === payload.userId; });
      var amt = Number(payload.amount);

      if (!sBalance || (Number(sBalance.availableBalance) || 0) < amt) {
        return jsonOutput({
          success: false,
          error: 'Insufficient available sales balance. Pending sales cannot be withdrawn, and buyer wallet funds cannot be withdrawn.'
        });
      }

      var now = new Date().toISOString();
      var reqId = 'wdr_' + Utilities.getUuid().substr(0, 8);
      var req = {
        requestId: reqId,
        userId: payload.userId,
        userName: user ? user.fullName : '',
        userEmail: user ? user.schoolEmail : '',
        amount: amt,
        bankName: payload.bankName,
        accountNumber: payload.accountNumber,
        accountName: payload.accountName,
        status: 'pending',
        adminNotes: '',
        processedAt: '',
        createdAt: now
      };

      appendSheetRow('WithdrawalRequests', req);
      var newAvail = Number(((Number(sBalance.availableBalance) || 0) - amt).toFixed(2));
      var newTotalW = Number(((Number(sBalance.totalWithdrawals) || 0) + amt).toFixed(2));
      updateSheetRow('SalesBalances', 'userId', payload.userId, {
        availableBalance: newAvail,
        totalWithdrawals: newTotalW,
        updatedAt: now
      });

      appendSheetRow('SalesTransactions', {
        transactionId: 'stx_' + Utilities.getUuid().substr(0, 8),
        sellerId: payload.userId,
        orderId: '',
        orderReference: reqId,
        amount: amt,
        type: 'withdrawal',
        status: 'pending',
        createdAt: now
      });

      createNotification(
        payload.userId,
        'Withdrawal Request Submitted',
        'Your request for ₦' + amt.toLocaleString() + ' has been submitted and is pending administrator review.',
        'sales',
        '/sell/sales-balance'
      );

      return jsonOutput({ success: true, request: req });
    }

    // 15. PROCESS WITHDRAWAL (Admin)
    if (action === 'processWithdrawal') {
      var wReq = getSheetRows('WithdrawalRequests').find(function(r) { return r.requestId === payload.requestId; });
      if (!wReq) return jsonOutput({ success: false, error: 'Request not found' });

      var now = new Date().toISOString();
      updateSheetRow('WithdrawalRequests', 'requestId', payload.requestId, {
        status: payload.decision,
        adminNotes: payload.adminNotes || '',
        processedAt: now
      });

      var sb = getSheetRows('SalesBalances').find(function(item) { return item.userId === wReq.userId; });
      if (sb) {
        if (payload.decision === 'rejected') {
          // Refund to seller available sales balance
          var refundAvail = Number(((Number(sb.availableBalance) || 0) + Number(wReq.amount)).toFixed(2));
          var refundTotalW = Math.max(0, Number(((Number(sb.totalWithdrawals) || 0) - Number(wReq.amount)).toFixed(2)));
          updateSheetRow('SalesBalances', 'userId', wReq.userId, {
            availableBalance: refundAvail,
            totalWithdrawals: refundTotalW,
            updatedAt: now
          });
        }
      }

      var notifMsg = payload.decision === 'processed'
        ? 'Your withdrawal of ₦' + Number(wReq.amount).toLocaleString() + ' has been processed.'
        : 'Your withdrawal request was rejected. The funds have been refunded to your available sales balance.';

      createNotification(
        wReq.userId,
        'Withdrawal ' + (payload.decision === 'processed' ? 'Processed' : 'Rejected'),
        notifMsg,
        'sales',
        '/sell/sales-balance'
      );

      return jsonOutput({ success: true });
    }

    // 16. TOGGLE USER SUSPENSION (Admin)
    if (action === 'toggleUserSuspension') {
      var uTarget = getSheetRows('Users').find(function(item) { return item.userId === payload.userId; });
      if (!uTarget) return jsonOutput({ success: false, error: 'User not found' });
      var nextSt = uTarget.status === 'active' ? 'suspended' : 'active';
      updateSheetRow('Users', 'userId', payload.userId, { status: nextSt, updatedAt: new Date().toISOString() });
      uTarget.status = nextSt;
      delete uTarget.passwordHash;
      delete uTarget.salt;
      return jsonOutput({ success: true, user: uTarget });
    }

    // 17. REPORT PRODUCT
    if (action === 'reportProduct') {
      var rUserId = payload.reporterId;
      var rProductId = payload.productId;
      var rCat = payload.category;
      var rExp = payload.explanation;

      if (!rExp || typeof rExp !== 'string' || rExp.trim().length === 0) {
        return jsonOutput({ success: false, error: 'Please explain why you are reporting this product.' });
      }

      var prod = getSheetRows('Products').find(function(p) { return p.productId === rProductId; });
      if (!prod) return jsonOutput({ success: false, error: 'Product not found.' });

      if (prod.sellerId === rUserId) {
        return jsonOutput({ success: false, error: 'You cannot report your own product.' });
      }

      var existingReports = getSheetRows('Reports');
      var alreadyReported = existingReports.some(function(r) {
        return r.productId === rProductId && r.reporterId === rUserId && r.status !== 'dismissed';
      });
      if (alreadyReported) {
        return jsonOutput({ success: false, error: 'You have already submitted an active report for this product.' });
      }

      var reporter = getSheetRows('Users').find(function(u) { return u.userId === rUserId; });
      var rId = 'rep_' + Utilities.getUuid().substr(0, 8);
      var now = new Date().toISOString();

      var newReport = {
        reportId: rId,
        productId: prod.productId,
        productName: prod.name,
        productStockNumber: prod.stockNumber || '',
        productImage: prod.primaryImageUrl || '',
        sellerId: prod.sellerId,
        sellerName: prod.sellerName,
        reporterId: rUserId,
        reporterEmail: reporter ? reporter.schoolEmail : '',
        category: rCat,
        explanation: rExp.trim(),
        status: 'pending',
        adminNotes: '',
        createdAt: now,
        updatedAt: now
      };

      appendSheetRow('Reports', newReport);
      return jsonOutput({
        success: true,
        report: newReport,
        message: 'Your report has been submitted successfully. Our team will review it.'
      });
    }

    // 18. UPDATE REPORT STATUS (Admin)
    if (action === 'updateReportStatus') {
      var reportId = payload.reportId;
      var newStatus = payload.status; // 'pending' | 'under_review' | 'resolved' | 'dismissed'
      var adminNotes = payload.adminNotes;
      var now = new Date().toISOString();

      var updates = {
        status: newStatus,
        updatedAt: now
      };
      if (adminNotes !== undefined) {
        updates.adminNotes = adminNotes;
      }

      var ok = updateSheetRow('Reports', 'reportId', reportId, updates);
      if (!ok) return jsonOutput({ success: false, error: 'Report not found.' });
      return jsonOutput({ success: true, message: 'Report status updated.' });
    }

    // 19. REMOVE PRODUCT (Admin Moderation)
    if (action === 'removeProductAdmin') {
      var prodId = payload.productId;
      var adminId = payload.adminId;
      var reason = payload.reason || 'Removed by administrator';
      var now = new Date().toISOString();

      var ok = updateSheetRow('Products', 'productId', prodId, {
        status: 'deleted',
        deletedBy: adminId,
        deletedAt: now,
        updatedAt: now
      });

      if (!ok) return jsonOutput({ success: false, error: 'Product not found.' });

      // Automatically update pending reports for this product to resolved
      var allR = getSheetRows('Reports');
      allR.forEach(function(r) {
        if (r.productId === prodId && (r.status === 'pending' || r.status === 'under_review')) {
          updateSheetRow('Reports', 'reportId', r.reportId, {
            status: 'resolved',
            adminNotes: (r.adminNotes ? r.adminNotes + ' | ' : '') + 'Product removed: ' + reason,
            updatedAt: now
          });
        }
      });

      return jsonOutput({ success: true, message: 'Product removed from marketplace successfully.' });
    }

    return jsonOutput({ success: false, error: 'Unknown POST action: ' + action });
  } catch (err) {
    return jsonOutput({ success: false, error: err.toString() });
  } finally {
    if (hasLock) lock.releaseLock();
  }
}
