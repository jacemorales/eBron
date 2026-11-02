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
    'availableBalance',
    'pendingBalance',
    'totalEarnings',
    'totalWithdrawals',
    'updatedAt'
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

    // 6. GET CONVERSATIONS
    if (action === 'getConversations') {
      var convs = getSheetRows('Conversations').filter(function(c) {
        return c.buyerId === params.userId || c.sellerId === params.userId;
      });
      return jsonOutput({ success: true, conversations: convs });
    }

    // 7. GET MESSAGES
    if (action === 'getMessages') {
      var msgs = getSheetRows('Messages').filter(function(m) {
        return m.conversationId === params.conversationId;
      });
      return jsonOutput({ success: true, messages: msgs });
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

    // 9. GET WALLET
    if (action === 'getWallet') {
      var wallets = getSheetRows('Wallets');
      var w = wallets.find(function(item) { return item.userId === params.userId; });
      if (!w) {
        w = {
          walletId: 'wal_' + params.userId,
          userId: params.userId,
          availableBalance: 0,
          pendingBalance: 0,
          totalEarnings: 0,
          totalWithdrawals: 0,
          updatedAt: new Date().toISOString()
        };
        appendSheetRow('Wallets', w);
      }
      return jsonOutput({ success: true, wallet: w });
    }

    // 10. GET USER WITHDRAWALS
    if (action === 'getUserWithdrawals') {
      var wds = getSheetRows('WithdrawalRequests').filter(function(item) {
        return item.userId === params.userId;
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
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
        updatedAt: now
      });

      delete newUser.passwordHash;
      delete newUser.salt;
      return jsonOutput({ success: true, user: newUser });
    }

    // 2. LOGIN
    if (action === 'login') {
      var lEmail = (payload.schoolEmail || '').trim().toLowerCase();
      var allU = getSheetRows('Users');
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

      return jsonOutput({ success: true, message: newMsg });
    }

    // 11. CREATE ORDER & TEST PAYMENT
    if (action === 'createOrder') {
      var prod = getSheetRows('Products').find(function(p) { return p.productId === payload.productId; });
      if (!prod || prod.availability !== 'available') {
        return jsonOutput({ success: false, error: 'Product is unavailable.' });
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
        amount: Number(prod.price),
        status: 'payment_successful',
        paymentMode: 'TEST_MODE',
        paymentRef: 'SIM_PAY_' + Date.now(),
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

      // Add to seller pending balance
      var wList = getSheetRows('Wallets');
      var sWallet = wList.find(function(w) { return w.userId === prod.sellerId; });
      var newPending = (Number(sWallet ? sWallet.pendingBalance : 0) + Number(prod.price));
      if (sWallet) {
        updateSheetRow('Wallets', 'userId', prod.sellerId, { pendingBalance: newPending, updatedAt: now });
      }

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

        // Shift pending to available in seller wallet
        var w = getSheetRows('Wallets').find(function(item) { return item.userId === ord.sellerId; });
        if (w) {
          var pBal = Math.max(0, (Number(w.pendingBalance) || 0) - Number(ord.amount));
          var aBal = (Number(w.availableBalance) || 0) + Number(ord.amount);
          var tot = (Number(w.totalEarnings) || 0) + Number(ord.amount);
          updateSheetRow('Wallets', 'userId', ord.sellerId, {
            pendingBalance: pBal,
            availableBalance: aBal,
            totalEarnings: tot,
            updatedAt: now
          });
        }
      } else if (sellerAt) {
        st = 'awaiting_buyer_confirmation';
      } else if (buyerAt) {
        st = 'awaiting_seller_confirmation';
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

    // 14. WITHDRAWAL REQUESTS
    if (action === 'requestWithdrawal') {
      var user = getSheetRows('Users').find(function(u) { return u.userId === payload.userId; });
      var wallet = getSheetRows('Wallets').find(function(w) { return w.userId === payload.userId; });
      var amt = Number(payload.amount);

      if (!wallet || (Number(wallet.availableBalance) || 0) < amt) {
        return jsonOutput({ success: false, error: 'Insufficient available balance.' });
      }

      var now = new Date().toISOString();
      var req = {
        requestId: 'wdr_' + Utilities.getUuid().substr(0, 8),
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
      var newAvail = (Number(wallet.availableBalance) - amt);
      updateSheetRow('Wallets', 'userId', payload.userId, { availableBalance: newAvail, updatedAt: now });

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

      var wal = getSheetRows('Wallets').find(function(item) { return item.userId === wReq.userId; });
      if (wal) {
        if (payload.decision === 'processed') {
          var totW = (Number(wal.totalWithdrawals) || 0) + Number(wReq.amount);
          updateSheetRow('Wallets', 'userId', wReq.userId, { totalWithdrawals: totW, updatedAt: now });
        } else if (payload.decision === 'rejected') {
          // Refund
          var refundAvail = (Number(wal.availableBalance) || 0) + Number(wReq.amount);
          updateSheetRow('Wallets', 'userId', wReq.userId, { availableBalance: refundAvail, updatedAt: now });
        }
      }

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

    return jsonOutput({ success: false, error: 'Unknown POST action: ' + action });
  } catch (err) {
    return jsonOutput({ success: false, error: err.toString() });
  } finally {
    if (hasLock) lock.releaseLock();
  }
}
