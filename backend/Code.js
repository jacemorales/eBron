/**
 * eBron - Student Marketplace
 * Google Apps Script Web App Main Entry Point (Code.js)
 * Implements Google Sheets database reading, writing, atomic locking, and API routing.
 */

// Global Configuration
var CONFIG = {
  ALLOWED_EMAIL_DOMAIN: '@stu.cu.edu.ng',
  VALID_MALE_HALLS: ['Peter', 'John', 'Paul', 'Daniel', 'Joseph', 'Joshua'],
  VALID_FEMALE_HALLS: ['Mary', 'Lydia', 'Deborah']
};

/**
 * Returns JSON Content Output with CORS enabled
 */
function jsonResponse(data, status) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Helper to get a sheet and return all records as an array of objects
 */
function getSheetRecords(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var records = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    records.push(obj);
  }
  return records;
}

/**
 * Helper to append a record into a sheet based on headers
 */
function appendSheetRecord(sheetName, record) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet ' + sheetName + ' not found');

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = [];

  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    var val = record[key];
    if (val === undefined || val === null) {
      row.push('');
    } else if (typeof val === 'object') {
      row.push(JSON.stringify(val));
    } else {
      row.push(val);
    }
  }

  sheet.appendRow(row);
  return record;
}

/**
 * Helper to update rows matching a column condition
 */
function updateSheetRecords(sheetName, matchColumn, matchValue, updates) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return false;

  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var colIndex = headers.indexOf(matchColumn);
  if (colIndex === -1) return false;

  var updatedCount = 0;
  for (var i = 1; i < values.length; i++) {
    if (values[i][colIndex] === matchValue) {
      for (var key in updates) {
        var updateCol = headers.indexOf(key);
        if (updateCol !== -1) {
          var val = updates[key];
          sheet.getRange(i + 1, updateCol + 1).setValue(typeof val === 'object' ? JSON.stringify(val) : val);
        }
      }
      updatedCount++;
    }
  }
  return updatedCount > 0;
}

/**
 * Password Hashing compatible with Google Apps Script (Utilities.computeDigest)
 */
function hashPasswordGAS(password, salt) {
  var s = salt || Utilities.getUuid();
  var combined = password + s;
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, combined, Utilities.Charset.UTF_8);
  var hexHash = '';
  for (var i = 0; i < rawHash.length; i++) {
    var byte = rawHash[i];
    if (byte < 0) byte += 256;
    var byteHex = byte.toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    hexHash += byteHex;
  }
  return { hash: hexHash, salt: s };
}

/**
 * HTTP GET Router
 */
function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var action = params.action;

    if (!action) {
      return jsonResponse({ success: false, error: 'No action specified.' });
    }

    if (action === 'ping') {
      return jsonResponse({ success: true, message: 'eBron backend is active.' });
    }

    if (action === 'setup') {
      var setupResult = setupDatabase();
      return jsonResponse(setupResult);
    }

    if (action === 'getProducts') {
      var prods = getSheetRecords('Products');
      var includeDeleted = params.includeDeleted === 'true';
      var category = params.category;
      var sellerId = params.sellerId;

      var filtered = prods.filter(function(p) {
        if (!includeDeleted && p.status === 'deleted') return false;
        if (category && category !== 'All' && p.category !== category) return false;
        if (sellerId && p.sellerId !== sellerId) return false;
        return true;
      });

      return jsonResponse({ success: true, products: filtered });
    }

    if (action === 'getProductById') {
      var all = getSheetRecords('Products');
      var found = all.find(function(p) { return p.productId === params.productId; });
      if (found) {
        // Increment views
        updateSheetRecords('Products', 'productId', params.productId, { viewsCount: (Number(found.viewsCount) || 0) + 1 });
      }
      return jsonResponse({ success: true, product: found || null });
    }

    if (action === 'getSavedItems') {
      var saved = getSheetRecords('SavedItems');
      var userSaved = saved.filter(function(s) { return s.userId === params.userId; }).map(function(s) { return s.productId; });
      var products = getSheetRecords('Products').filter(function(p) {
        return userSaved.indexOf(p.productId) !== -1 && p.status !== 'deleted';
      });
      return jsonResponse({ success: true, savedItems: products });
    }

    if (action === 'getConversations') {
      var convs = getSheetRecords('Conversations').filter(function(c) {
        return c.buyerId === params.userId || c.sellerId === params.userId;
      });
      return jsonResponse({ success: true, conversations: convs });
    }

    if (action === 'getMessages') {
      var msgs = getSheetRecords('Messages').filter(function(m) {
        return m.conversationId === params.conversationId;
      });
      return jsonResponse({ success: true, messages: msgs });
    }

    if (action === 'getOrders') {
      var orders = getSheetRecords('Orders');
      if (params.buyerId) {
        orders = orders.filter(function(o) { return o.buyerId === params.buyerId; });
      } else if (params.sellerId) {
        orders = orders.filter(function(o) { return o.sellerId === params.sellerId; });
      }
      return jsonResponse({ success: true, orders: orders });
    }

    if (action === 'getWallet') {
      var wallets = getSheetRecords('Wallets');
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
        appendSheetRecord('Wallets', w);
      }
      return jsonResponse({ success: true, wallet: w });
    }

    if (action === 'getAdminAnalytics') {
      var users = getSheetRecords('Users');
      var products = getSheetRecords('Products');
      var orders = getSheetRecords('Orders');
      var wallets = getSheetRecords('Wallets');
      var withdrawals = getSheetRecords('WithdrawalRequests');
      var messages = getSheetRecords('Messages');
      var saved = getSheetRecords('SavedItems');

      var completedOrders = orders.filter(function(o) { return o.status === 'completed'; });
      var completedVolume = completedOrders.reduce(function(acc, o) { return acc + (Number(o.amount) || 0); }, 0);

      var categoryCounts = {};
      products.forEach(function(p) {
        if (p.category) categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
      });

      var pendingFunds = wallets.reduce(function(acc, w) { return acc + (Number(w.pendingBalance) || 0); }, 0);
      var availFunds = wallets.reduce(function(acc, w) { return acc + (Number(w.availableBalance) || 0); }, 0);

      var stats = {
        platform: {
          totalUsers: users.length,
          activeUsers: users.filter(function(u) { return u.status === 'active'; }).length,
          totalProducts: products.length,
          availableProducts: products.filter(function(p) { return p.status === 'active' && p.availability === 'available'; }).length,
          soldProducts: products.filter(function(p) { return p.availability === 'sold'; }).length,
          completedOrders: completedOrders.length
        },
        products: {
          totalUploaded: products.length,
          available: products.filter(function(p) { return p.status === 'active' && p.availability === 'available'; }).length,
          sold: products.filter(function(p) { return p.availability === 'sold'; }).length,
          deleted: products.filter(function(p) { return p.status === 'deleted'; }).length,
          byCategory: categoryCounts
        },
        sales: {
          totalOrders: orders.length,
          completedOrders: completedOrders.length,
          pendingOrders: orders.filter(function(o) { return o.status !== 'completed' && o.status !== 'cancelled'; }).length,
          cancelledOrders: orders.filter(function(o) { return o.status === 'cancelled'; }).length,
          disputedOrders: orders.filter(function(o) { return o.status === 'disputed'; }).length,
          totalVolume: orders.reduce(function(acc, o) { return acc + (Number(o.amount) || 0); }, 0),
          completedVolume: completedVolume,
          averageOrderValue: completedOrders.length > 0 ? Math.round(completedVolume / completedOrders.length) : 0
        },
        financial: {
          totalPendingFunds: pendingFunds,
          totalAvailableBalances: availFunds,
          totalWithdrawalRequestsCount: withdrawals.length,
          totalWithdrawalsProcessed: withdrawals.filter(function(w) { return w.status === 'processed'; }).reduce(function(acc, w) { return acc + (Number(w.amount) || 0); }, 0)
        }
      };

      return jsonResponse({ success: true, analytics: stats });
    }

    return jsonResponse({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * HTTP POST Router with atomic LockService
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = false;

  try {
    hasLock = lock.tryLock(10000);
    if (!hasLock) {
      return jsonResponse({ success: false, error: 'Server busy. Please retry.' });
    }

    var payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
    var action = payload.action;

    // 1. REGISTER
    if (action === 'register') {
      var email = (payload.schoolEmail || '').trim().toLowerCase();
      if (!email.endsWith(CONFIG.ALLOWED_EMAIL_DOMAIN)) {
        return jsonResponse({ success: false, error: 'Email must end with @stu.cu.edu.ng' });
      }

      var users = getSheetRecords('Users');
      var exists = users.some(function(u) { return u.schoolEmail.toLowerCase() === email; });
      if (exists) {
        return jsonResponse({ success: false, error: 'Account with this email already exists.' });
      }

      var hashRes = hashPasswordGAS(payload.password);
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

      appendSheetRecord('Users', newUser);
      appendSheetRecord('Wallets', {
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
      return jsonResponse({ success: true, user: newUser });
    }

    // 2. LOGIN
    if (action === 'login') {
      var logEmail = (payload.schoolEmail || '').trim().toLowerCase();
      var users = getSheetRecords('Users');
      var foundUser = users.find(function(u) { return u.schoolEmail.toLowerCase() === logEmail; });

      if (!foundUser) return jsonResponse({ success: false, error: 'Invalid email or password.' });
      if (foundUser.status === 'suspended') return jsonResponse({ success: false, error: 'Account suspended.' });

      var verify = hashPasswordGAS(payload.password, foundUser.salt);
      if (verify.hash !== foundUser.passwordHash) {
        return jsonResponse({ success: false, error: 'Invalid email or password.' });
      }

      delete foundUser.passwordHash;
      delete foundUser.salt;
      return jsonResponse({ success: true, user: foundUser });
    }

    // 3. CREATE ORDER & TEST PAYMENT
    if (action === 'createOrder') {
      var product = getSheetRecords('Products').find(function(p) { return p.productId === payload.productId; });
      if (!product || product.availability !== 'available') {
        return jsonResponse({ success: false, error: 'Product unavailable' });
      }

      var orderId = 'ord_' + Utilities.getUuid().substr(0, 8);
      var now = new Date().toISOString();

      var newOrder = {
        orderId: orderId,
        orderReference: 'EBR-' + Math.floor(100000 + Math.random() * 900000),
        productId: product.productId,
        buyerId: payload.buyerId,
        sellerId: product.sellerId,
        amount: Number(product.price),
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
        createdAt: now,
        updatedAt: now
      };

      appendSheetRecord('Orders', newOrder);
      updateSheetRecords('Products', 'productId', product.productId, { availability: 'sold', updatedAt: now });

      // Update seller's pending wallet
      var wallets = getSheetRecords('Wallets');
      var sellerWallet = wallets.find(function(w) { return w.userId === product.sellerId; });
      var pending = (Number(sellerWallet ? sellerWallet.pendingBalance : 0) + Number(product.price));
      if (sellerWallet) {
        updateSheetRecords('Wallets', 'userId', product.sellerId, { pendingBalance: pending, updatedAt: now });
      }

      return jsonResponse({ success: true, order: newOrder });
    }

    // 4. CONFIRM ORDER (Dual confirmation state machine)
    if (action === 'confirmOrder') {
      var orders = getSheetRecords('Orders');
      var order = orders.find(function(o) { return o.orderId === payload.orderId; });
      if (!order) return jsonResponse({ success: false, error: 'Order not found' });

      var now = new Date().toISOString();
      var sellerConfirmed = order.sellerConfirmedAt;
      var buyerConfirmed = order.buyerConfirmedAt;

      if (payload.role === 'seller') {
        sellerConfirmed = now;
      } else if (payload.role === 'buyer') {
        buyerConfirmed = now;
      }

      var status = order.status;
      var fundsReleased = false;

      if (sellerConfirmed && buyerConfirmed) {
        status = 'completed';
        fundsReleased = true;

        // Shift seller Pending balance to Available balance
        var wallets = getSheetRecords('Wallets');
        var w = wallets.find(function(item) { return item.userId === order.sellerId; });
        if (w) {
          var newPending = Math.max(0, (Number(w.pendingBalance) || 0) - Number(order.amount));
          var newAvail = (Number(w.availableBalance) || 0) + Number(order.amount);
          var newEarnings = (Number(w.totalEarnings) || 0) + Number(order.amount);
          updateSheetRecords('Wallets', 'userId', order.sellerId, {
            pendingBalance: newPending,
            availableBalance: newAvail,
            totalEarnings: newEarnings,
            updatedAt: now
          });
        }
      } else if (sellerConfirmed) {
        status = 'awaiting_buyer_confirmation';
      } else if (buyerConfirmed) {
        status = 'awaiting_seller_confirmation';
      }

      updateSheetRecords('Orders', 'orderId', order.orderId, {
        sellerConfirmedAt: sellerConfirmed,
        buyerConfirmedAt: buyerConfirmed,
        status: status,
        completedAt: status === 'completed' ? now : '',
        updatedAt: now
      });

      return jsonResponse({ success: true, status: status, fundsReleased: fundsReleased });
    }

    return jsonResponse({ success: false, error: 'Action not supported' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    if (hasLock) lock.releaseLock();
  }
}
