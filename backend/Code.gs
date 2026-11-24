/**
 * eBron – Covenant University Student Marketplace
 * Google Apps Script Full Backend Implementation (Code.gs)
 *
 * This file contains the complete, self-contained Google Apps Script backend.
 * Copy and paste this file into your Google Apps Script editor.
 */

// Target spreadsheet ID (or leave null to bind to active spreadsheet)
var SPREADSHEET_ID = '15EOXAegJGiSMNmnNN2rX0YUFHtmJ6nr2Q5XridTYb8c';

// Note: wallet top-ups are recorded without server-side Paystack verification and
// therefore make no outbound calls. Bank withdrawals DO call the Paystack API via
// paystackApiCall(), which requires the https://www.googleapis.com/auth/script.external_request
// scope. After adding this scope you must deploy a NEW version of the Web App and
// re-authorize (see README).

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
    'status',     // 'active' | 'suspended' | 'deactivated'
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
    'initialStock',
    'availableStock',
    'soldQuantity',
    'stockStatus', // 'in_stock' | 'sold_out'
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
  // Unified Messages sheet: stores BOTH conversation threads and individual messages
  // in a single sheet. Conversation rows have an empty `messageId` and carry the
  // product + participant details; message rows have a `messageId` and carry the
  // sender, receiver and content. This keeps all chat data in one maintainable sheet.
  Messages: [
    'conversationId',
    'messageId',
    'productId',
    'productName',
    'productPrice',
    'productImage',
    'buyerId',
    'buyerName',
    'sellerId',
    'sellerName',
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
    'quantity',
    'status', // 'awaiting_payment' | 'payment_successful' | 'awaiting_seller_confirmation' | 'awaiting_buyer_confirmation' | 'refund_pending_approval' | 'refunded' | 'completed' | 'cancelled' | 'disputed'
    'paymentMode', // 'WALLET_ESCROW' | 'PAYPAL'
    'paymentRef',
    'deliveryFullName',
    'deliveryGender',
    'deliveryHall',
    'deliveryRoom',
    'sellerConfirmedAt',
    'buyerConfirmedAt',
    'completedAt',
    'cancellationRequestedBy', // 'buyer' | 'seller'
    'cancellationReason',
    'cancellationExplanation',
    'cancellationRequestedAt',
    'refundStatus', // 'none' | 'pending_approval' | 'approved' | 'rejected'
    'refundAdminNotes',
    'refundProcessedAt',
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
    'type', // 'topup' | 'purchase_deduction' | 'refund'
    'amount',
    'feePercentage',
    'percentageFee',
    'flatFee',
    'totalFee',
    'totalAmountPaid',
    'feeSnapshot',
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
    'reservedBalance', // Funds reserved by pending withdrawal requests (not yet paid out)
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
    'type', // 'pending_sale' | 'released_sale' | 'withdrawal' | 'cancelled_sale'
    'status', // 'pending' | 'completed' | 'disputed' | 'refunded'
    'createdAt'
  ],
  // Central financial transactions ledger with active tracking and reconciliation
  Transactions: [
    'transactionId',
    'reference',
    'userId',
    'buyerId',
    'sellerId',
    'productId',
    'orderId',
    'type', // 'topup' | 'purchase_deduction' | 'pending_sale' | 'released_sale' | 'refund' | 'withdrawal_request' | 'withdrawal_transfer' | 'withdrawal_failed' | 'reversal'
    'amount',
    'feePercentage',
    'percentageFee',
    'flatFee',
    'totalFee',
    'netAmount',
    'totalAmountPaid',
    'feeSnapshot',
    'paymentMethod', // 'paystack' | 'wallet' | 'sales_balance' | 'bank_transfer'
    'paymentProvider', // 'paystack' | 'ebron'
    'eBronStatus', // 'pending' | 'completed' | 'failed' | 'requires_reconciliation' | 'refunded' | 'reversed'
    'paystackStatus', // 'success' | 'failed' | 'pending' | 'abandoned' | 'reversed' | 'none'
    'statusHistory', // JSON array of { status, eBronStatus, paystackStatus, timestamp, details }
    'createdAt',
    'updatedAt',
    'verificationDetails',
    'errorMessage'
  ],
  WithdrawalRequests: [
    'requestId',
    'userId',
    'userName',
    'userRegNumber',
    'userEmail',
    'amount',
    'feePercentage',
    'percentageFee',
    'flatFee',
    'totalFee',
    'netAmount',
    'feeSnapshot',
    'bankName',
    'bankCode',
    'accountNumber',
    'accountName',
    'status', // 'pending' (Pending Approval) | 'processing' | 'successful' | 'failed' | 'rejected' | 'reversed' | 'cancelled'
    'reference',
    'paystackRecipientCode',
    'paystackTransferCode',
    'paystackStatus',
    'paymentMethod', // '' (undecided) | 'paystack' | 'manual_bank_transfer'
    'adminId', // Admin who approved/rejected
    'manualConfirmedBy', // Admin who confirmed a manual bank transfer
    'manualConfirmedAt', // When an admin confirmed a manual bank transfer
    'rejectionReason',
    'failureReason', // Reason a (manual or Paystack) transfer failed or was cancelled
    'adminNotes',
    'processedAt',
    'completedAt',
    'createdAt',
    'updatedAt'
  ],
  Appeals: [
    'appealId',
    'userId',
    'userName',
    'schoolEmail',
    'explanation',
    'status', // 'pending' | 'approved' | 'rejected'
    'adminNotes',
    'reviewedBy',
    'reviewedAt',
    'createdAt'
  ],
  // Unified Notifications sheet: stores BOTH in-app notification rows and web-push
  // subscription rows. Notification rows have a `notificationId`; subscription rows
  // have a `subscriptionId` (and title 'PUSH_SUBSCRIPTION') with an empty notificationId.
  Notifications: [
    'notificationId',
    'userId',
    'title',
    'message',
    'type', // 'order' | 'message' | 'wallet' | 'sales' | 'admin' | 'push'
    'destinationUrl',
    'isRead',
    'createdAt',
    'subscriptionId',
    'endpoint',
    'p256dh',
    'auth',
    'enabled',
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
  // User feedback submitted from the Guidelines & Safety page.
  Feedback: [
    'feedbackId',
    'userId',
    'userName',
    'userEmail',
    'type', // 'Issue/Problem' | 'Suggestion' | 'Positive Feedback' | 'General Feedback'
    'subject',
    'message',
    'status', // 'New' | 'Under Review' | 'Resolved'
    'adminNotes', // Administrator-only internal notes
    'createdAt',
    'updatedAt'
  ],
  FeeConfig: [
    'configId',
    'category', // 'walletTopUp' | 'sellerPayout'
    'min',
    'max',
    'percentage',
    'flatFee',
    'description',
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

// ============================================================================
// DYNAMIC FEE EVALUATION & CALCULATION (FeeConfig Google Sheet is Single Authority)
// ============================================================================

function getFeeTier(amount, tiers) {
  var num = Number(amount);
  if (isNaN(num) || num <= 0 || !Array.isArray(tiers) || tiers.length === 0) return null;
  var sorted = tiers.slice().sort(function(a, b) {
    return (Number(a.min) || 0) - (Number(b.min) || 0);
  });
  var matchedTier = null;
  for (var i = 0; i < sorted.length; i++) {
    var tier = sorted[i];
    var nextTier = sorted[i + 1];
    var min = Number(tier.min) || 0;
    var effectiveMax = (tier.max !== null && tier.max !== undefined && String(tier.max).trim() !== '' && !isNaN(Number(tier.max)))
      ? Number(tier.max)
      : (nextTier ? (Number(nextTier.min) || null) : null);
    var meetsMin = num >= min;
    var meetsMax = effectiveMax === null || isNaN(effectiveMax) || num < effectiveMax;
    if (meetsMin && meetsMax) {
      matchedTier = tier;
    }
  }
  return matchedTier || sorted[sorted.length - 1] || null;
}

/**
 * Loads fee configuration dynamically from the 'FeeConfig' Google Sheet tab.
 * There is NO hardcoded in-code fallback. The FeeConfig sheet is the sole authority.
 */
function getActiveFeeConfig() {
  try {
    var ss = getDb();
    var sheet = ss.getSheetByName('FeeConfig');
    if (!sheet) {
      throw new Error("Sheet tab 'FeeConfig' does not exist in the spreadsheet.");
    }
    if (sheet.getLastRow() <= 1) {
      throw new Error("The 'FeeConfig' sheet tab exists but contains no data rows.");
    }
    var rows = getSheetRows('FeeConfig');
    if (!rows || rows.length === 0) {
      throw new Error("The 'FeeConfig' sheet tab contains no readable records.");
    }
    var topUpTiers = [];
    var payoutTiers = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var cat = String(r.category || r.type || '').trim().toLowerCase();
      if (!cat) continue;
      var minVal = Number(r.min) || 0;
      var rawMax = r.max;
      var maxVal = (rawMax !== null && rawMax !== undefined && String(rawMax).trim() !== '' && String(rawMax).toLowerCase() !== 'null')
        ? Number(rawMax)
        : null;
      var pct = Number(r.percentage || r.rate || 0);
      var flat = Number(r.flatFee || r.flatCost || 0);
      var tierObj = { min: minVal, max: maxVal, percentage: pct, flatFee: flat };
      if (cat === 'wallettopup' || cat === 'topup' || cat === 'deposit') {
        topUpTiers.push(tierObj);
      } else if (cat === 'sellerpayout' || cat === 'payout' || cat === 'withdrawal') {
        payoutTiers.push(tierObj);
      }
    }
    if (topUpTiers.length > 0 || payoutTiers.length > 0) {
      topUpTiers.sort(function(a, b) { return a.min - b.min; });
      payoutTiers.sort(function(a, b) { return a.min - b.min; });
      return {
        walletTopUp: { tiers: topUpTiers },
        sellerPayout: { tiers: payoutTiers }
      };
    }
    throw new Error("No rows matching category 'walletTopUp' or 'sellerPayout' found in 'FeeConfig'.");
  } catch (err) {
    Logger.log('Could not load dynamic FeeConfig sheet: ' + err.toString());
    throw new Error('Unable to read FeeConfig sheet: ' + (err.message || err.toString()));
  }
}

function calculateTopUpFee(amount, config) {
  var cfg = config || getActiveFeeConfig();
  var num = Number(amount);
  if (isNaN(num) || num <= 0) throw new Error('Top-up amount must be a positive number.');
  var tier = getFeeTier(num, cfg.walletTopUp.tiers);
  if (!tier) throw new Error('No applicable fee tier found for top-up amount.');
  var amountKobo = Math.round(num * 100);
  var percentageFeeKobo = Math.round((amountKobo * tier.percentage) / 100);
  var flatFeeKobo = Math.round(tier.flatFee * 100);
  var totalFeeKobo = percentageFeeKobo + flatFeeKobo;
  var totalPaymentKobo = amountKobo + totalFeeKobo;
  return {
    originalAmount: num,
    percentageRate: tier.percentage,
    percentageFee: Number((percentageFeeKobo / 100).toFixed(2)),
    flatFee: Number((flatFeeKobo / 100).toFixed(2)),
    totalFee: Number((totalFeeKobo / 100).toFixed(2)),
    totalPayment: Number((totalPaymentKobo / 100).toFixed(2)),
    isValid: true,
    tierSnapshot: { min: tier.min, max: tier.max, percentage: tier.percentage, flatFee: tier.flatFee }
  };
}

function calculatePayoutFee(amount, config) {
  var cfg = config || getActiveFeeConfig();
  var num = Number(amount);
  if (isNaN(num) || num <= 0) throw new Error('Withdrawal amount must be a positive number.');
  var tier = getFeeTier(num, cfg.sellerPayout.tiers);
  if (!tier) throw new Error('No applicable fee tier found for payout amount.');
  var amountKobo = Math.round(num * 100);
  var percentageFeeKobo = Math.round((amountKobo * tier.percentage) / 100);
  var flatFeeKobo = Math.round(tier.flatFee * 100);
  var totalFeeKobo = percentageFeeKobo + flatFeeKobo;
  var netPayoutKobo = amountKobo - totalFeeKobo;
  return {
    requestedAmount: num,
    percentageRate: tier.percentage,
    percentageFee: Number((percentageFeeKobo / 100).toFixed(2)),
    flatFee: Number((flatFeeKobo / 100).toFixed(2)),
    totalFee: Number((totalFeeKobo / 100).toFixed(2)),
    netPayout: Number((netPayoutKobo / 100).toFixed(2)),
    isValid: netPayoutKobo > 0,
    tierSnapshot: { min: tier.min, max: tier.max, percentage: tier.percentage, flatFee: tier.flatFee }
  };
}

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

function getSpreadsheet() {
  return getDb();
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
    } else {
      // Append any newly added schema columns to existing sheets without altering existing records
      var lastCol = Math.max(1, sheet.getLastColumn());
      var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
      headers.forEach(function(h) {
        if (existingHeaders.indexOf(h) === -1) {
          var newCol = sheet.getLastColumn() + 1;
          sheet.getRange(1, newCol).setValue(h).setFontWeight('bold');
        }
      });
    }
  });

  // Pre-populate FeeConfig with active default tiers if empty
  var feeSheet = ss.getSheetByName('FeeConfig');
  if (feeSheet && feeSheet.getLastRow() <= 1) {
    var nowIso = new Date().toISOString();
    var starterTopUpTiers = [
      { min: 0, max: 5000, percentage: 2.5, flatFee: 200 },
      { min: 5000, max: 30000, percentage: 3.0, flatFee: 200 },
      { min: 30000, max: 100000, percentage: 3.5, flatFee: 200 },
      { min: 100000, max: '', percentage: 2.0, flatFee: 2000 }
    ];
    var starterPayoutTiers = [
      { min: 0, max: 5000, percentage: 6.0, flatFee: 100 },
      { min: 5000, max: 25000, percentage: 5.0, flatFee: 100 },
      { min: 25000, max: 80000, percentage: 6.0, flatFee: 200 },
      { min: 80000, max: '', percentage: 5.0, flatFee: 500 }
    ];
    starterTopUpTiers.forEach(function(t, idx) {
      appendSheetRow('FeeConfig', {
        configId: 'cfg_topup_' + (idx + 1),
        category: 'walletTopUp',
        min: t.min,
        max: (t.max !== null && t.max !== undefined) ? t.max : '',
        percentage: t.percentage,
        flatFee: t.flatFee,
        description: 'Wallet top-up tier ' + (idx + 1),
        updatedAt: nowIso
      });
    });
    starterPayoutTiers.forEach(function(t, idx) {
      appendSheetRow('FeeConfig', {
        configId: 'cfg_payout_' + (idx + 1),
        category: 'sellerPayout',
        min: t.min,
        max: (t.max !== null && t.max !== undefined) ? t.max : '',
        percentage: t.percentage,
        flatFee: t.flatFee,
        description: 'Seller payout tier ' + (idx + 1),
        updatedAt: nowIso
      });
    });
  }

  // Sheets retired after table merges. Conversations now live in Messages,
  // subscriptions now live in Notifications.
  var obsoleteSheets = ['Conversations', 'NotificationSubscriptions'];
  var removed = [];
  obsoleteSheets.forEach(function(name) {
    var dead = ss.getSheetByName(name);
    if (dead) {
      ss.deleteSheet(dead);
      removed.push(name);
    }
  });

  return {
    success: true,
    message: 'Database initialization complete. Verified ' + sheetNames.length + ' sheets.',
    createdSheets: created,
    removedSheets: removed
  };
}

function jsonOutput(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Migrates the spreadsheet to the current schema. Creates any missing sheets AND
 * appends newly-introduced header columns to existing sheets (e.g. reservedBalance on
 * SalesBalances, or userRegNumber / adminId / rejectionReason / updatedAt on
 * WithdrawalRequests) without modifying existing data. Safe to run repeatedly.
 */
function initializeAllSheets() {
  Object.keys(SHEETS_SCHEMA).forEach(function(name) {
    ensureSheet(name);
  });
  return setupDatabase();
}

/**
 * Returns a sheet by name, creating it with the correct header row when it does not
 * exist yet. This guarantees that writers (e.g. WalletTransactions / SalesTransactions)
 * never fail silently or throw because a sheet is missing from an older spreadsheet.
 */
function ensureSheet(sheetName) {
  var ss = getDb();
  var sheet = ss.getSheetByName(sheetName);
  var headers = SHEETS_SCHEMA[sheetName];

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (headers && sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (headers && sheet.getLastRow() >= 1) {
    var existingHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    headers.forEach(function(h) {
      if (existingHeaders.indexOf(h) === -1) {
        var nextCol = sheet.getLastColumn() + 1;
        sheet.getRange(1, nextCol).setValue(h).setFontWeight('bold');
        existingHeaders.push(h);
      }
    });
  }
  return sheet;
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
  var sheet = ensureSheet(sheetName);
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
  var sheet = ensureSheet(sheetName);
  if (sheet.getLastRow() <= 1) return false;

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
 * Records or updates a transaction in the central 'Transactions' sheet.
 * Always preserves the complete statusHistory array (never overwrites).
 */
function logFinancialTransaction(data) {
  try {
    ensureSheet('Transactions', SHEETS_SCHEMA.Transactions);
    var allTx = getSheetRows('Transactions');
    var existing = allTx.find(function(t) {
      return (data.reference && t.reference === data.reference) || (data.transactionId && t.transactionId === data.transactionId);
    });
    var now = new Date().toISOString();

    var statusEntry = {
      status: data.eBronStatus || data.status || 'pending',
      eBronStatus: data.eBronStatus || 'pending',
      paystackStatus: data.paystackStatus || 'none',
      timestamp: now,
      details: data.details || data.errorMessage || ''
    };

    if (existing) {
      var history = [];
      try {
        history = typeof existing.statusHistory === 'string' ? JSON.parse(existing.statusHistory) : (existing.statusHistory || []);
      } catch (e) {
        history = [];
      }
      history.push(statusEntry);

      var updateFields = {
        eBronStatus: data.eBronStatus || existing.eBronStatus,
        paystackStatus: data.paystackStatus || existing.paystackStatus,
        statusHistory: JSON.stringify(history),
        updatedAt: now
      };
      if (data.verificationDetails) updateFields.verificationDetails = typeof data.verificationDetails === 'object' ? JSON.stringify(data.verificationDetails) : String(data.verificationDetails);
      if (data.errorMessage) updateFields.errorMessage = data.errorMessage;
      if (data.amount) updateFields.amount = data.amount;

      updateSheetRow('Transactions', 'transactionId', existing.transactionId, updateFields);
      return Object.assign({}, existing, updateFields);
    } else {
      var txId = data.transactionId || ('tx_' + Utilities.getUuid().substr(0, 8));
      var newTx = {
        transactionId: txId,
        reference: data.reference || ('REF_' + Date.now()),
        userId: data.userId || '',
        buyerId: data.buyerId || '',
        sellerId: data.sellerId || '',
        productId: data.productId || '',
        orderId: data.orderId || '',
        type: data.type,
        amount: Number(data.amount) || 0,
        paymentMethod: data.paymentMethod || 'wallet',
        paymentProvider: data.paymentProvider || 'ebron',
        eBronStatus: data.eBronStatus || 'pending',
        paystackStatus: data.paystackStatus || 'none',
        statusHistory: JSON.stringify([statusEntry]),
        createdAt: now,
        updatedAt: now,
        verificationDetails: data.verificationDetails ? (typeof data.verificationDetails === 'object' ? JSON.stringify(data.verificationDetails) : String(data.verificationDetails)) : '',
        errorMessage: data.errorMessage || ''
      };
      appendSheetRow('Transactions', newTx);
      return newTx;
    }
  } catch (err) {
    Logger.log('Error logging financial transaction: ' + err.toString());
    return null;
  }
}

/**
 * Returns list of banks for withdrawal requests. Strictly limited to Opay, Moniepoint, and PalmPay.
 */
function getPaystackBanks() {
  return {
    success: true,
    banks: [
      { id: 'opay', name: 'Opay', code: '999992' },
      { id: 'moniepoint', name: 'Moniepoint', code: '50515' },
      { id: 'palmpay', name: 'PalmPay', code: '999991' }
    ]
  };
}

/**
 * Low-level Paystack API helper used by account resolution and payout transfers.
 * The secret key is read ONLY from Script Properties (never hardcoded, never exposed
 * to the frontend). Returns a normalised object: { configured, statusCode, response, error }.
 */
function paystackApiCall(path, method, payload) {
  var secretKey = '';
  try {
    secretKey = (typeof PropertiesService !== 'undefined')
      ? (PropertiesService.getScriptProperties().getProperty('PAYSTACK_SECRET_KEY') || '')
      : '';
  } catch (e) {
    secretKey = '';
  }

  if (!secretKey) {
    return {
      configured: false,
      statusCode: 0,
      response: null,
      error: 'PAYSTACK_SECRET_KEY is not configured on the server. Add it under Project Settings > Script Properties.'
    };
  }

  var url = 'https://api.paystack.co' + path;
  var httpMethod = String(method || 'get').toLowerCase() === 'post' ? 'post' : 'get';
  var options = {
    method: httpMethod,
    headers: {
      Authorization: 'Bearer ' + secretKey,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    muteHttpExceptions: true
  };
  if (httpMethod === 'post' && payload) {
    options.payload = JSON.stringify(payload);
  }

  try {
    var res = UrlFetchApp.fetch(url, options);
    var code = res.getResponseCode();
    var body = res.getContentText();
    var json = null;
    try { json = JSON.parse(body); } catch (parseErr) { json = null; }

    var errMsg = '';
    if (!json) {
      errMsg = 'Paystack returned a non-JSON response (HTTP ' + code + ').';
    } else if (code >= 400 || json.status === false) {
      errMsg = json.message || ('Paystack request failed with HTTP ' + code + '.');
    }

    return {
      configured: true,
      statusCode: code,
      response: json,
      error: errMsg
    };
  } catch (err) {
    return {
      configured: true,
      statusCode: 0,
      response: null,
      error: 'Paystack connection error: ' + err.toString() + '. Ensure the Web App is deployed with the external-request scope and re-authorized.'
    };
  }
}

/**
 * Resolves account number with Paystack.
 */
function resolvePaystackAccount(accountNumber, bankCode) {
  var apiRes = paystackApiCall('/bank/resolve?account_number=' + encodeURIComponent(accountNumber) + '&bank_code=' + encodeURIComponent(bankCode), 'get');
  if (apiRes.configured && apiRes.response && apiRes.response.status === true && apiRes.response.data) {
    return {
      success: true,
      accountName: apiRes.response.data.account_name,
      accountNumber: apiRes.response.data.account_number
    };
  }
  var msg = (apiRes.response && apiRes.response.message) ? apiRes.response.message : (apiRes.error || 'Could not resolve account details.');
  return { success: false, error: msg };
}

/**
 * Initiates an actual Paystack transfer to the user's verified bank account.
 */
function executePaystackTransfer(amount, bankCode, accountNumber, accountName, reference, reason) {
  var secretKey = typeof PropertiesService !== 'undefined' ? (PropertiesService.getScriptProperties().getProperty('PAYSTACK_SECRET_KEY') || '') : '';
  if (!secretKey) {
    return {
      success: false,
      error: 'PAYSTACK_SECRET_KEY is not configured on the server. Payout transfers require server-side configuration.'
    };
  }

  // Duplicate-transfer protection: if this reference has already been paid out
  // successfully (recorded in the central ledger), never transfer again.
  try {
    var ledger = getSheetRows('Transactions');
    var alreadyPaid = ledger.some(function(t) {
      return t.reference === reference &&
        (t.type === 'withdrawal' || t.type === 'withdrawal_transfer') &&
        t.eBronStatus === 'completed';
    });
    if (alreadyPaid) {
      return {
        success: false,
        duplicate: true,
        error: 'Duplicate transfer prevented: a payout for reference ' + reference + ' has already been completed.'
      };
    }
  } catch (dedupErr) {
    Logger.log('Transfer dedup check failed (continuing): ' + dedupErr.toString());
  }

  // 1. Create Transfer Recipient
  var recRes = paystackApiCall('/transferrecipient', 'post', {
    type: 'nuban',
    name: accountName,
    account_number: accountNumber,
    bank_code: bankCode,
    currency: 'NGN'
  });

  if (!recRes.response || recRes.response.status !== true || !recRes.response.data || !recRes.response.data.recipient_code) {
    var recErr = (recRes.response && recRes.response.message) ? recRes.response.message : (recRes.error || 'Failed to create Paystack transfer recipient.');
    return { success: false, error: recErr };
  }

  var recipientCode = recRes.response.data.recipient_code;

  // 2. Initiate Transfer (amount converted to kobo)
  var amountKobo = Math.round(Number(amount) * 100);
  var trfRes = paystackApiCall('/transfer', 'post', {
    source: 'balance',
    amount: amountKobo,
    recipient: recipientCode,
    reason: reason || 'eBron Sales Balance Withdrawal',
    reference: reference
  });

  if (!trfRes.response || trfRes.response.status !== true || !trfRes.response.data) {
    var trfErr = (trfRes.response && trfRes.response.message) ? trfRes.response.message : (trfRes.error || 'Paystack transfer request failed.');
    return { success: false, error: trfErr, recipientCode: recipientCode };
  }

  var trfData = trfRes.response.data;
  return {
    success: true,
    recipientCode: recipientCode,
    transferCode: trfData.transfer_code,
    transferStatus: trfData.status || 'success',
    reference: trfData.reference || reference,
    message: trfRes.response.message || 'Transfer processed via Paystack'
  };
}

/**
 * Returns the seller's SalesBalances row, creating it with zeroed balances when absent.
 * Uses reservedBalance to hold funds locked by pending withdrawal requests.
 */
function getOrCreateSalesBalance(userId) {
  ensureSheet('SalesBalances');
  var list = getSheetRows('SalesBalances');
  var sb = list.find(function(item) { return item.userId === userId; });
  if (!sb) {
    sb = {
      salesBalanceId: 'sb_' + userId,
      userId: userId,
      availableBalance: 0,
      pendingBalance: 0,
      reservedBalance: 0,
      totalEarnings: 0,
      totalWithdrawals: 0,
      updatedAt: new Date().toISOString()
    };
    appendSheetRow('SalesBalances', sb);
  }
  return sb;
}

/**
 * Moves `amt` from availableBalance into reservedBalance (fund reservation on request).
 * Reserved funds are unavailable for purchases and further withdrawal requests.
 */
function reserveWithdrawalFunds(userId, amt) {
  var sb = getOrCreateSalesBalance(userId);
  var avail = Number(sb.availableBalance) || 0;
  var reserved = Number(sb.reservedBalance) || 0;
  if (avail < amt) {
    return { success: false, error: 'Insufficient available sales balance.' };
  }
  var now = new Date().toISOString();
  var newAvail = Number((avail - amt).toFixed(2));
  var newReserved = Number((reserved + amt).toFixed(2));
  updateSheetRow('SalesBalances', 'userId', userId, {
    availableBalance: newAvail,
    reservedBalance: newReserved,
    updatedAt: now
  });
  return { success: true, availableBalance: newAvail, reservedBalance: newReserved };
}

/**
 * Releases a reservation back into availableBalance (rejection or formal cancellation).
 */
function releaseWithdrawalReservation(userId, amt) {
  var sb = getOrCreateSalesBalance(userId);
  var avail = Number(sb.availableBalance) || 0;
  var reserved = Number(sb.reservedBalance) || 0;
  var now = new Date().toISOString();
  var newAvail = Number((avail + amt).toFixed(2));
  var newReserved = Number(Math.max(0, reserved - amt).toFixed(2));
  updateSheetRow('SalesBalances', 'userId', userId, {
    availableBalance: newAvail,
    reservedBalance: newReserved,
    updatedAt: now
  });
  return { success: true, availableBalance: newAvail, reservedBalance: newReserved };
}

/**
 * Finalizes a paid withdrawal: removes the reservation and adds it to the withdrawn total.
 */
function finalizeWithdrawalReservation(userId, amt) {
  var sb = getOrCreateSalesBalance(userId);
  var reserved = Number(sb.reservedBalance) || 0;
  var totalW = Number(sb.totalWithdrawals) || 0;
  var now = new Date().toISOString();
  var newReserved = Number(Math.max(0, reserved - amt).toFixed(2));
  var newTotal = Number((totalW + amt).toFixed(2));
  updateSheetRow('SalesBalances', 'userId', userId, {
    reservedBalance: newReserved,
    totalWithdrawals: newTotal,
    updatedAt: now
  });
  return { success: true, reservedBalance: newReserved, totalWithdrawals: newTotal };
}

/**
 * Shared admin-approval workflow for a single withdrawal request. Used by both the
 * individual "Approve Withdrawal" action and the "Approve All" bulk action so the two
 * can never drift apart. It performs full status validation, marks the request
 * `processing` BEFORE contacting Paystack (single-flight guard), then executes the
 * transfer. Funds stay reserved unless the transfer is confirmed successful.
 *
 * Returns: { success, status: 'successful'|'failed'|'skipped', reference, error }
 */
function processSingleWithdrawalApproval(requestId, adminId) {
  var wReq = getSheetRows('WithdrawalRequests').find(function(r) { return r.requestId === requestId; });
  if (!wReq) return { success: false, status: 'skipped', error: 'Request not found.' };

  var now = new Date().toISOString();
  var amt = Number(wReq.amount) || 0;
  var st = String(wReq.status || '').toLowerCase();

  // Terminal / already-processed states must never be processed again.
  if (st === 'successful' || st === 'processed') {
    return { success: false, status: 'skipped', error: 'Withdrawal already paid out.' };
  }
  if (st === 'rejected') {
    return { success: false, status: 'skipped', error: 'Withdrawal already rejected.' };
  }
  if (st === 'reversed') {
    return { success: false, status: 'skipped', error: 'Withdrawal was reversed and cannot be re-approved.' };
  }
  // In-flight guard: a transfer has already been initiated for this request.
  if (st === 'processing' && wReq.paystackTransferCode) {
    return { success: false, status: 'skipped', error: 'Transfer already in progress for this request. Await confirmation before retrying.' };
  }
  // Only pending, failed (safe retry) or a processing request with no transfer code are approvable.
  if (st !== 'pending' && st !== 'failed' && st !== 'processing') {
    return { success: false, status: 'skipped', error: 'Request is not in an approvable state (' + wReq.status + ').' };
  }
  if (!/^\d{10}$/.test(String(wReq.accountNumber || ''))) {
    return { success: false, status: 'failed', error: 'Request has an invalid 10-digit account number.' };
  }
  if (!wReq.bankCode) {
    return { success: false, status: 'failed', error: 'Request is missing a valid bank code.' };
  }

  // Step 2: mark Processing before any Paystack call (prevents duplicate transfers).
  updateSheetRow('WithdrawalRequests', 'requestId', requestId, {
    status: 'processing',
    adminId: adminId || wReq.adminId || '',
    updatedAt: now
  });

  // Step 3: best-effort account name resolution (never blocks the payout).
  var accountName = wReq.accountName || wReq.userName || '';
  try {
    var resolved = resolvePaystackAccount(String(wReq.accountNumber), String(wReq.bankCode));
    if (resolved && resolved.success && resolved.accountName) accountName = resolved.accountName;
  } catch (resolveErr) {
    Logger.log('Account resolve skipped during payout: ' + resolveErr.toString());
  }

  var transferAmt = wReq.netAmount !== undefined && wReq.netAmount !== '' && Number(wReq.netAmount) > 0
    ? Number(wReq.netAmount)
    : amt;

  var transferResult = executePaystackTransfer(
    transferAmt,
    wReq.bankCode,
    wReq.accountNumber,
    accountName,
    wReq.reference || wReq.requestId,
    'eBron Sales Payout for ' + (wReq.userName || wReq.userId)
  );

  // A duplicate means the ledger already recorded a completed payout for this
  // reference. Finalize the reservation exactly once and mark the request successful.
  if (transferResult.success || transferResult.duplicate) {
    finalizeWithdrawalReservation(wReq.userId, amt);

    updateSheetRow('WithdrawalRequests', 'requestId', requestId, {
      status: 'successful',
      accountName: accountName,
      paystackRecipientCode: transferResult.recipientCode || wReq.paystackRecipientCode || '',
      paystackTransferCode: transferResult.transferCode || wReq.paystackTransferCode || '',
      paystackStatus: transferResult.transferStatus || 'success',
      processedAt: now,
      completedAt: now,
      updatedAt: now
    });

    appendSheetRow('SalesTransactions', {
      transactionId: 'stx_' + Utilities.getUuid().substr(0, 8),
      sellerId: wReq.userId,
      orderId: '',
      orderReference: wReq.reference || wReq.requestId,
      amount: amt,
      type: 'withdrawal',
      status: 'completed',
      createdAt: now
    });

    logFinancialTransaction({
      reference: wReq.reference || wReq.requestId,
      userId: wReq.userId,
      sellerId: wReq.userId,
      type: 'withdrawal',
      amount: amt,
      netAmount: transferAmt,
      totalFee: Number(wReq.totalFee) || 0,
      feePercentage: Number(wReq.feePercentage) || 0,
      paymentMethod: 'bank_transfer',
      paymentProvider: 'paystack',
      eBronStatus: 'completed',
      paystackStatus: transferResult.transferStatus || 'success',
      statusHistory: [{ status: 'completed', timestamp: now, reason: transferResult.duplicate ? 'Payout already completed (duplicate prevented)' : 'Paystack transfer executed successfully for net ₦' + transferAmt.toLocaleString() }],
      verificationDetails: JSON.stringify(transferResult)
    });

    createNotification(
      wReq.userId,
      'Withdrawal Successful (' + (wReq.reference || wReq.requestId) + ')',
      'Your bank payout of ₦' + transferAmt.toLocaleString() + ' (Net of ₦' + (Number(wReq.totalFee) || 0).toLocaleString() + ' deductions) was successfully transferred to ' + wReq.bankName + ' (' + wReq.accountNumber + ').',
      'sales',
      '/sell/sales-balance'
    );

    return {
      success: true,
      status: 'successful',
      reference: wReq.reference || wReq.requestId,
      transferCode: transferResult.transferCode || ''
    };
  }

  // Failure: keep funds RESERVED for investigation/retry. Never lose the user's money.
  updateSheetRow('WithdrawalRequests', 'requestId', requestId, {
    status: 'failed',
    paystackStatus: 'failed',
    accountName: accountName,
    adminNotes: 'Transfer failed: ' + (transferResult.error || 'Gateway error') + '. Funds remain reserved for retry.',
    processedAt: now,
    updatedAt: now
  });

  logFinancialTransaction({
    reference: wReq.reference || wReq.requestId,
    userId: wReq.userId,
    sellerId: wReq.userId,
    type: 'withdrawal_failed',
    amount: amt,
    paymentMethod: 'bank_transfer',
    paymentProvider: 'paystack',
    eBronStatus: 'failed',
    paystackStatus: 'failed',
    errorMessage: transferResult.error || 'Gateway transfer error',
    statusHistory: [{ status: 'failed', timestamp: now, reason: transferResult.error || 'Gateway transfer error. Funds remain reserved.' }],
    verificationDetails: JSON.stringify(transferResult)
  });

  createNotification(
    wReq.userId,
    'Withdrawal Transfer Failed',
    'Your payout transfer failed (' + (transferResult.error || 'Gateway error') + '). Your ₦' + amt.toLocaleString() + ' is safe and remains reserved while support investigates. No funds were lost.',
    'sales',
    '/sell/sales-balance'
  );

  return { success: false, status: 'failed', error: transferResult.error || 'Paystack transfer failed.' };
}

/**
 * Checks whether an account is active. Deactivated and suspended accounts cannot perform actions.
 */
function checkUserActiveStatus(userId) {
  if (!userId) return { active: true };
  var users = getSheetRows('Users');
  var u = users.find(function(user) { return user.userId === userId; });
  if (u && (u.status === 'deactivated' || u.status === 'suspended')) {
    return {
      active: false,
      status: u.status,
      error: 'Your account has been deactivated. Protected marketplace operations are restricted. You may submit an appeal from the sign-in page.'
    };
  }
  return { active: true };
}

/**
 * Treats sheet booleans (true/false and their string/empty variants) as unread flags.
 */
function isUnreadFlag(val) {
  return val === false || val === 'false' || val === '' || val === undefined || val === null || val === 0 || val === '0';
}

/**
 * Returns the individual message rows (messageId present) for a conversation.
 */
function getConversationMessages(allRows, conversationId) {
  return allRows.filter(function(r) {
    return r.messageId && r.conversationId === conversationId;
  });
}

/**
 * Builds a conversation summary object expected by the frontend from a conversation
 * metadata row (messageId === ''), deriving the latest snippet and unread count from
 * the message rows stored in the same unified Messages sheet.
 */
function buildConversationView(metaRow, allRows, userId) {
  var msgs = getConversationMessages(allRows, metaRow.conversationId);
  var unread = msgs.filter(function(m) {
    return m.receiverId === userId && isUnreadFlag(m.isRead);
  }).length;

  var last = null;
  msgs.forEach(function(m) {
    if (!last || new Date(m.createdAt) > new Date(last.createdAt)) last = m;
  });

  return {
    conversationId: metaRow.conversationId,
    productId: metaRow.productId,
    productName: metaRow.productName,
    productPrice: metaRow.productPrice,
    productImage: metaRow.productImage,
    buyerId: metaRow.buyerId,
    buyerName: metaRow.buyerName,
    sellerId: metaRow.sellerId,
    sellerName: metaRow.sellerName,
    lastMessageSnippet: last ? last.content : 'Conversation started',
    lastMessageAt: last ? last.createdAt : metaRow.createdAt,
    unreadCount: unread,
    createdAt: metaRow.createdAt
  };
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

    // 0b. GET CENTRALIZED FEE CONFIGURATION
    if (action === 'getFeeConfig') {
      return jsonOutput({ success: true, config: getActiveFeeConfig() });
    }

    // 1. GET PRODUCTS
    if (action === 'getProducts') {
      var all = getSheetRows('Products');
      var includeDeleted = params.includeDeleted === 'true';
      var includeSold = params.includeSold === 'true';
      var category = params.category;
      var sellerId = params.sellerId;
      var search = params.search ? String(params.search).toLowerCase().trim() : '';

      var filtered = all.filter(function(p) {
        if (!includeDeleted && p.status === 'deleted') return false;
        // Hide sold and sold-out products from public marketplace view
        if (!includeSold && !sellerId) {
          if (p.availability === 'sold' || p.stockStatus === 'sold_out') return false;
          if (p.availableStock !== undefined && p.availableStock !== '' && Number(p.availableStock) <= 0) return false;
        }
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
      var allMsgs = getSheetRows('Messages');
      var seenConvs = {};
      var convs = [];
      allMsgs.forEach(function(c) {
        if (c.messageId) return; // skip individual message rows
        if (c.buyerId !== params.userId && c.sellerId !== params.userId) return;
        if (seenConvs[c.conversationId]) return;
        seenConvs[c.conversationId] = true;
        convs.push(buildConversationView(c, allMsgs, params.userId));
      });
      convs.sort(function(a, b) {
        return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
      });
      return jsonOutput({ success: true, conversations: convs });
    }

    // 6b. GET UNREAD COUNTS
    if (action === 'getUnreadCounts') {
      var uMsgs = getSheetRows('Messages').filter(function(m) {
        return m.messageId && m.receiverId === params.userId && isUnreadFlag(m.isRead);
      });
      var notifs = getSheetRows('Notifications').filter(function(n) {
        return n.notificationId && n.userId === params.userId && isUnreadFlag(n.isRead);
      });
      return jsonOutput({
        success: true,
        unreadMessages: uMsgs.length,
        unreadNotifications: notifs.length
      });
    }

    // 6c. GET PENDING COUNTS (Live nav badges, per-user, derived from real order records)
    // Pending = active orders still in the dual-confirmation lifecycle. Completed,
    // cancelled, refunded and rejected orders are never counted as pending.
    if (action === 'getPendingCounts') {
      var nonPendingStatuses = ['completed', 'cancelled', 'refunded', 'rejected'];
      var allOrders = getSheetRows('Orders');
      var pendingPurchases = 0;
      var pendingSales = 0;
      allOrders.forEach(function(o) {
        var oStatus = String(o.status || '').toLowerCase();
        if (nonPendingStatuses.indexOf(oStatus) !== -1) return;
        if (o.buyerId === params.userId) pendingPurchases++;
        if (o.sellerId === params.userId) pendingSales++;
      });
      return jsonOutput({
        success: true,
        pendingPurchases: pendingPurchases,
        pendingSales: pendingSales
      });
    }

    // 7. GET MESSAGES
    if (action === 'getMessages') {
      var msgs = getSheetRows('Messages').filter(function(m) {
        return m.messageId && m.conversationId === params.conversationId;
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
        return n.notificationId && n.userId === params.userId;
      }).map(function(n) {
        return {
          notificationId: n.notificationId,
          userId: n.userId,
          title: n.title,
          message: n.message,
          type: n.type,
          destinationUrl: n.destinationUrl,
          isRead: n.isRead,
          createdAt: n.createdAt
        };
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
          reservedBalance: 0,
          totalEarnings: 0,
          totalWithdrawals: 0,
          updatedAt: new Date().toISOString()
        };
        appendSheetRow('SalesBalances', sb);
      } else if (sb.reservedBalance === undefined || sb.reservedBalance === '') {
        sb.reservedBalance = 0;
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

    // 12a. GET ALL WALLET TRANSACTIONS (Admin monitoring)
    if (action === 'getAllWalletTransactions') {
      var allWTx = getSheetRows('WalletTransactions').sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return jsonOutput({ success: true, transactions: allWTx });
    }

    // 12b. GET ALL SALES TRANSACTIONS (Admin monitoring)
    if (action === 'getAllSalesTransactions') {
      var allSTx = getSheetRows('SalesTransactions').sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return jsonOutput({ success: true, transactions: allSTx });
    }

    // 12b1. GET CENTRAL TRANSACTIONS LEDGER (Admin monitoring)
    if (action === 'getTransactionsLedger' || action === 'getAllTransactions') {
      ensureSheet('Transactions', SHEETS_SCHEMA.Transactions);
      var allTx = getSheetRows('Transactions').sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return jsonOutput({ success: true, transactions: allTx });
    }

    // 12b2. GET RECONCILIATION TRANSACTIONS (Admin reconciliation)
    if (action === 'getReconciliations' || action === 'getReconciliationTransactions') {
      ensureSheet('Transactions', SHEETS_SCHEMA.Transactions);
      var reconTx = getSheetRows('Transactions').filter(function(t) {
        return t.eBronStatus === 'requires_reconciliation';
      }).sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return jsonOutput({ success: true, transactions: reconTx });
    }

    // 12c. GET ALL REPORTS (Admin)
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
      var wtxList = getSheetRows('WalletTransactions');
      var sbList = getSheetRows('SalesBalances');
      var stxList = getSheetRows('SalesTransactions');
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

      // Filtered transactions for timeframe
      var filWtx = wtxList.filter(function(t) { return inTime(t.createdAt); });
      var filStx = stxList.filter(function(t) { return inTime(t.createdAt); });

      // Buyer Wallets (Spending) Analytics
      var totalBuyerWallets = wList.length;
      var totalBuyerSpendingBalance = wList.reduce(function(acc, w) { return acc + (Number(w.availableBalance) || 0); }, 0);
      var topUpTransactions = filWtx.filter(function(t) { return t.type === 'topup' && t.status === 'successful'; });
      var totalTopUpVolume = topUpTransactions.reduce(function(acc, t) { return acc + (Number(t.amount) || 0); }, 0);
      var purchaseDeductions = filWtx.filter(function(t) { return t.type === 'purchase_deduction'; });
      var totalPurchaseDeductionsVolume = purchaseDeductions.reduce(function(acc, t) { return acc + (Number(t.amount) || 0); }, 0);

      // Seller Sales Balance & Payout Analytics
      var totalSellerSalesBalances = sbList.length;
      var totalSellerPendingSales = sbList.reduce(function(acc, s) { return acc + (Number(s.pendingBalance) || 0); }, 0);
      var totalSellerAvailableSales = sbList.reduce(function(acc, s) { return acc + (Number(s.availableBalance) || 0); }, 0);
      var totalSellerEarnings = sbList.reduce(function(acc, s) { return acc + (Number(s.totalEarnings) || 0); }, 0);
      var totalSellerWithdrawals = sbList.reduce(function(acc, s) { return acc + (Number(s.totalWithdrawals) || 0); }, 0);

      var filProcessedWds = filWds.filter(function(w) { return w.status === 'processed'; });
      var totalWithdrawalsProcessedAmount = filProcessedWds.reduce(function(acc, w) { return acc + (Number(w.amount) || 0); }, 0);

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
        // Dedicated Buyer Wallet Analysis
        walletAnalysis: {
          totalBuyerWallets: totalBuyerWallets,
          totalAvailableSpendingBalance: totalBuyerSpendingBalance,
          topUpCount: topUpTransactions.length,
          totalTopUpVolume: totalTopUpVolume,
          purchaseDeductionsCount: purchaseDeductions.length,
          totalPurchaseDeductionsVolume: totalPurchaseDeductionsVolume
        },
        // Dedicated Seller Sales Balance Analysis
        salesBalanceAnalysis: {
          totalSellerAccounts: totalSellerSalesBalances,
          totalPendingSalesBalance: totalSellerPendingSales,
          totalAvailableSalesBalance: totalSellerAvailableSales,
          totalLifetimeEarnings: totalSellerEarnings,
          totalWithdrawalsRequested: totalSellerWithdrawals,
          totalWithdrawalRequestsCount: filWds.length,
          totalWithdrawalsProcessedCount: filProcessedWds.length,
          totalWithdrawalsProcessedAmount: totalWithdrawalsProcessedAmount
        },
        // Legacy backward compatible financial field
        financial: {
          totalPendingFunds: totalSellerPendingSales,
          totalAvailableBalances: totalBuyerSpendingBalance + totalSellerAvailableSales,
          totalWithdrawalRequestsCount: filWds.length,
          totalWithdrawalsProcessed: totalWithdrawalsProcessedAmount,
          simulatedVolume: totalVol
        },
        engagement: {
          totalMessages: mList.filter(function(m) { return inTime(m.createdAt); }).length,
          totalSavedItems: sList.filter(function(s) { return inTime(s.createdAt); }).length
        }
      };

      return jsonOutput({ success: true, analytics: analytics });
    }

    // 14. GET REFUND REQUESTS (Admin & Monitoring)
    if (action === 'getRefundRequests') {
      var orders = getSheetRows('Orders');
      var pendingRefunds = orders.filter(function(o) {
        return o.status === 'refund_pending_approval' || o.refundStatus === 'pending_approval';
      }).sort(function(a, b) {
        var dateA = new Date(a.cancellationRequestedAt || a.updatedAt || a.createdAt);
        var dateB = new Date(b.cancellationRequestedAt || b.updatedAt || b.createdAt);
        return dateB - dateA;
      });
      return jsonOutput({ success: true, refundRequests: pendingRefunds });
    }

    // 15. GET PAYSTACK BANKS
    if (action === 'getBanks') {
      return jsonOutput(getPaystackBanks());
    }

    // 16. RESOLVE BANK ACCOUNT (Paystack NUBAN Verification)
    if (action === 'resolveAccount') {
      var accNum = params.accountNumber;
      var bCode = params.bankCode;
      if (!accNum || !bCode) {
        return jsonOutput({ success: false, error: 'Both account number and bank code are required.' });
      }
      return jsonOutput(resolvePaystackAccount(accNum, bCode));
    }

    // 17. GET APPEALS (Admin User Management)
    if (action === 'getAppeals') {
      var appeals = getSheetRows('Appeals').sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return jsonOutput({ success: true, appeals: appeals });
    }

    // 18. GET USER APPEAL
    if (action === 'getUserAppeal') {
      var allAppeals = getSheetRows('Appeals');
      var uAppeals = allAppeals.filter(function(a) {
        if (params.userId && a.userId === params.userId) return true;
        if (params.schoolEmail && String(a.schoolEmail).toLowerCase() === String(params.schoolEmail).toLowerCase()) return true;
        return false;
      }).sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return jsonOutput({ success: true, appeal: uAppeals[0] || null });
    }

    // 19. GET ALL FEEDBACK (Admin only - includes internal admin notes)
    if (action === 'getAllFeedback') {
      var allFeedback = getSheetRows('Feedback').sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      if (params.type && params.type !== 'All') {
        allFeedback = allFeedback.filter(function(f) { return f.type === params.type; });
      }
      if (params.status && params.status !== 'All') {
        allFeedback = allFeedback.filter(function(f) { return f.status === params.status; });
      }
      return jsonOutput({ success: true, feedback: allFeedback });
    }

    // 20. GET MY FEEDBACK (Scoped to the requesting user only; hides admin notes)
    if (action === 'getMyFeedback') {
      var myFeedback = getSheetRows('Feedback').filter(function(f) {
        return f.userId === params.userId;
      }).sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }).map(function(f) {
        return {
          feedbackId: f.feedbackId,
          userId: f.userId,
          userName: f.userName,
          type: f.type,
          subject: f.subject,
          message: f.message,
          status: f.status,
          adminNotes: '',
          createdAt: f.createdAt,
          updatedAt: f.updatedAt
        };
      });
      return jsonOutput({ success: true, feedback: myFeedback });
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

    if (action === 'getFeeConfig') {
      return jsonOutput({ success: true, config: getActiveFeeConfig() });
    }

    // Global Account Status Check: prevent deactivated accounts from performing protected marketplace operations
    var restrictedActions = [
      'createProduct', 'updateProduct', 'toggleProductAvailability', 'softDeleteProduct',
      'createOrder', 'confirmOrder', 'disputeOrder', 'requestOrderCancellation',
      'topUpWallet', 'requestWithdrawal', 'sendMessage', 'toggleSaveItem', 'reportProduct'
    ];
    if (restrictedActions.indexOf(action) !== -1) {
      var actingUserId = payload.userId || payload.buyerId || payload.sellerId;
      if (actingUserId) {
        var userActiveCheck = checkUserActiveStatus(actingUserId);
        if (!userActiveCheck.active) {
          return jsonOutput({
            success: false,
            error: userActiveCheck.error,
            isDeactivated: true
          });
        }
      }
    }

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
            updatedAt: adminNow
          });
          appendSheetRow('SalesBalances', {
            salesBalanceId: 'sb_' + adminUserId,
            userId: adminUserId,
            availableBalance: 250000,
            pendingBalance: 0,
            totalEarnings: 250000,
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

      var testHash = computePasswordHash(payload.password, user.salt);
      if (testHash.hash !== user.passwordHash) {
        return jsonOutput({ success: false, error: 'Invalid school email or password.' });
      }

      if (user.status === 'deactivated' || user.status === 'suspended') {
        return jsonOutput({
          success: false,
          error: 'Your account has been deactivated. Please submit an appeal below to request reactivation.',
          isDeactivated: true,
          userId: user.userId,
          fullName: user.fullName,
          schoolEmail: user.schoolEmail
        });
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

      var stockQty = payload.stockQuantity !== undefined && payload.stockQuantity !== null && String(payload.stockQuantity).trim() !== ''
        ? Math.max(1, parseInt(payload.stockQuantity, 10) || 1)
        : 1;

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
        initialStock: stockQty,
        availableStock: stockQty,
        soldQuantity: 0,
        stockStatus: 'in_stock',
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

    // 9. TOGGLE SAVE ITEM (Strictly prevents duplicate saves for the same user and item)
    if (action === 'toggleSaveItem') {
      var saved = getSheetRows('SavedItems');
      var matches = saved.filter(function(s) {
        return s.userId === payload.userId && s.productId === payload.productId;
      });

      if (matches.length > 0) {
        // Unsave: remove any matching rows to guarantee no duplicates remain
        var ss = getDb();
        var sSheet = ss.getSheetByName('SavedItems');
        var data = sSheet.getDataRange().getValues();
        // Delete in reverse order to keep row indices valid
        for (var i = data.length - 1; i >= 1; i--) {
          var rowSavedId = data[i][0];
          var isMatch = matches.some(function(m) { return m.savedId === rowSavedId; });
          if (isMatch) {
            sSheet.deleteRow(i + 1);
          }
        }
        return jsonOutput({ success: true, isSaved: false });
      } else {
        // Save: append single entry
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
      var allConvRows = getSheetRows('Messages');
      var exist = allConvRows.find(function(c) {
        return !c.messageId && c.productId === payload.productId && c.buyerId === payload.buyerId;
      });
      if (exist) {
        return jsonOutput({ success: true, conversation: buildConversationView(exist, allConvRows, payload.buyerId) });
      }

      var prod = getSheetRows('Products').find(function(p) { return p.productId === payload.productId; });
      var now = new Date().toISOString();
      var newConv = {
        conversationId: 'conv_' + Utilities.getUuid().substr(0, 8),
        messageId: '',
        productId: payload.productId,
        productName: prod ? prod.name : '',
        productPrice: prod ? prod.price : 0,
        productImage: prod ? prod.primaryImageUrl : '',
        buyerId: payload.buyerId,
        buyerName: payload.buyerName,
        sellerId: prod ? prod.sellerId : '',
        sellerName: prod ? prod.sellerName : 'Seller',
        senderId: '',
        receiverId: '',
        content: '',
        isRead: '',
        createdAt: now
      };
      appendSheetRow('Messages', newConv);
      return jsonOutput({ success: true, conversation: buildConversationView(newConv, [newConv], payload.buyerId) });
    }

    if (action === 'sendMessage') {
      var conv = getSheetRows('Messages').find(function(c) {
        return !c.messageId && c.conversationId === payload.conversationId;
      });
      if (!conv) return jsonOutput({ success: false, error: 'Conversation not found' });
      var receiverId = conv.buyerId === payload.senderId ? conv.sellerId : conv.buyerId;
      var now = new Date().toISOString();

      var newMsg = {
        conversationId: payload.conversationId,
        messageId: 'msg_' + Utilities.getUuid().substr(0, 8),
        productId: '',
        productName: '',
        productPrice: '',
        productImage: '',
        buyerId: '',
        buyerName: '',
        sellerId: '',
        sellerName: '',
        senderId: payload.senderId,
        receiverId: receiverId,
        content: payload.content,
        isRead: false,
        createdAt: now
      };

      appendSheetRow('Messages', newMsg);

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
          var nIdIdx = nHeaders.indexOf('notificationId');
          if (uIdx !== -1 && isRIdx !== -1) {
            for (var ni = 1; ni < nData.length; ni++) {
              // Only touch real notification rows, never push-subscription rows.
              var isNotifRow = nIdIdx === -1 || !!nData[ni][nIdIdx];
              if (isNotifRow && nData[ni][uIdx] === payload.userId) {
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
      var nowSub = new Date().toISOString();

      // Subscription rows live in the unified Notifications sheet and are identified
      // by a non-empty subscriptionId (notification rows leave it empty).
      var subs = getSheetRows('Notifications').filter(function(s) { return s.subscriptionId; });
      var existingSub = subs.find(function(s) { return s.userId === subUserId && s.endpoint === subEndpoint; });

      if (existingSub) {
        updateSheetRow('Notifications', 'subscriptionId', existingSub.subscriptionId, {
          enabled: payload.enabled !== false,
          updatedAt: nowSub
        });
      } else {
        appendSheetRow('Notifications', {
          notificationId: '',
          userId: subUserId,
          title: 'PUSH_SUBSCRIPTION',
          message: '',
          type: 'push',
          destinationUrl: '',
          isRead: '',
          createdAt: nowSub,
          subscriptionId: 'sub_' + Utilities.getUuid().substr(0, 8),
          endpoint: subEndpoint,
          p256dh: payload.p256dh,
          auth: payload.auth,
          enabled: true,
          updatedAt: nowSub
        });
      }
      return jsonOutput({ success: true });
    }

    // 10b. TOP UP BUYER WALLET (Verified via Paystack, with script locking & active ledger tracking)
    if (action === 'topUpWallet') {
      var topUpLock = LockService.getScriptLock();
      var hasTopUpLock = topUpLock.tryLock(15000);
      if (!hasTopUpLock) {
        return jsonOutput({ success: false, error: 'A wallet transaction is currently processing. Please try again.' });
      }

      try {
        var topUserId = payload.userId;
        var requestedAmount = Number(payload.amount);
        var payRef = (payload.reference || '').toString().trim();

        if (!topUserId) {
          return jsonOutput({ success: false, error: 'Missing user for wallet top-up.' });
        }
        if (!payRef) {
          return jsonOutput({ success: false, error: 'Missing Paystack payment reference.' });
        }
        if (!requestedAmount || requestedAmount <= 0) {
          return jsonOutput({ success: false, error: 'Invalid top up amount.' });
        }

        // Active payment tracking: register pending in central Transactions ledger
        logFinancialTransaction({
          reference: payRef,
          userId: topUserId,
          type: 'topup',
          amount: requestedAmount,
          paymentMethod: 'paystack',
          paymentProvider: 'paystack',
          eBronStatus: 'pending',
          paystackStatus: 'pending',
          details: 'Initiated wallet top-up verification'
        });

        var wList = getSheetRows('Wallets');
        var userWallet = wList.find(function(w) { return w.userId === topUserId; });

        // Idempotency: a payment reference is credited at most once
        var existingTx = getSheetRows('WalletTransactions').find(function(tx) {
          return tx.reference === payRef && tx.status === 'successful';
        });
        if (existingTx) {
          if (!userWallet) {
            userWallet = {
              walletId: 'wal_' + topUserId,
              userId: topUserId,
              availableBalance: 0,
              updatedAt: new Date().toISOString()
            };
          }
          logFinancialTransaction({
            reference: payRef,
            eBronStatus: 'completed',
            paystackStatus: 'success',
            details: 'Idempotent request: reference already credited'
          });
          return jsonOutput({ success: true, wallet: userWallet, reference: payRef, alreadyCredited: true });
        }

        // Server-side Paystack verification is disabled: no external API call is
        // made here, so wallet top-up works without the UrlFetchApp permission
        // scope. Duplicate credits are still prevented by the reference check above.
        var creditAmount = requestedAmount;
        var feeCalc = calculateTopUpFee(requestedAmount);

        var now = new Date().toISOString();

        try {
          if (!userWallet) {
            userWallet = {
              walletId: 'wal_' + topUserId,
              userId: topUserId,
              availableBalance: Number(creditAmount.toFixed(2)),
              updatedAt: now
            };
            appendSheetRow('Wallets', userWallet);
          } else {
            var updatedAvail = Number(((Number(userWallet.availableBalance) || 0) + creditAmount).toFixed(2));
            updateSheetRow('Wallets', 'userId', topUserId, {
              availableBalance: updatedAvail,
              updatedAt: now
            });
            userWallet.availableBalance = updatedAvail;
          }

          // Record in WalletTransactions with complete progressive fee audit
          appendSheetRow('WalletTransactions', {
            transactionId: 'wtx_' + Utilities.getUuid().substr(0, 8),
            userId: topUserId,
            type: 'topup',
            amount: creditAmount,
            feePercentage: feeCalc.percentageRate,
            percentageFee: feeCalc.percentageFee,
            flatFee: feeCalc.flatFee,
            totalFee: feeCalc.totalFee,
            totalAmountPaid: feeCalc.totalPayment,
            reference: payRef,
            status: 'successful',
            description: 'Paystack Wallet Top-up (Paid ₦' + feeCalc.totalPayment.toLocaleString() + ' incl. ₦' + feeCalc.totalFee.toLocaleString() + ' fees)',
            createdAt: now
          });

          // Log in central Transactions ledger
          logFinancialTransaction({
            reference: payRef,
            amount: creditAmount,
            feePercentage: feeCalc.percentageRate,
            percentageFee: feeCalc.percentageFee,
            flatFee: feeCalc.flatFee,
            totalFee: feeCalc.totalFee,
            totalAmountPaid: feeCalc.totalPayment,
            eBronStatus: 'completed',
            paystackStatus: 'success',
            verificationDetails: JSON.stringify(feeCalc),
            details: 'Wallet credited with ₦' + creditAmount.toLocaleString() + ' (Total paid: ₦' + feeCalc.totalPayment.toLocaleString() + ', Fees: ₦' + feeCalc.totalFee.toLocaleString() + ')'
          });

          createNotification(
            topUserId,
            'Wallet Funded Successfully',
            '₦' + Number(creditAmount).toLocaleString() + ' was successfully credited to your spending wallet (Total paid: ₦' + feeCalc.totalPayment.toLocaleString() + ').',
            'wallet',
            '/buy/wallets'
          );

          return jsonOutput({ success: true, wallet: userWallet, reference: payRef, feeDetails: feeCalc });
        } catch (creditErr) {
          // Reconciliation Safeguard: Paystack verified, but eBron write failed
          logFinancialTransaction({
            reference: payRef,
            amount: creditAmount,
            eBronStatus: 'requires_reconciliation',
            paystackStatus: 'success',
            verificationDetails: null,
            errorMessage: 'Wallet credit failed after payment: ' + creditErr.toString()
          });
          return jsonOutput({
            success: false,
            requiresReconciliation: true,
            error: 'Paystack confirmed your payment, but eBron encountered a system error recording your wallet credit. Your funds are safe and an administrator has been alerted to reconcile your balance.'
          });
        }
      } finally {
        topUpLock.releaseLock();
      }
    }

    // 11. CREATE ORDER & WALLET PAYMENT (Atomic Script Lock & Stock Check)
    if (action === 'createOrder') {
      var orderLock = LockService.getScriptLock();
      var hasOrderLock = orderLock.tryLock(15000);
      if (!hasOrderLock) {
        return jsonOutput({ success: false, error: 'Checkout is currently busy processing. Please try again.' });
      }

      try {
        var prod = getSheetRows('Products').find(function(p) { return p.productId === payload.productId; });
        if (!prod || prod.availability === 'sold' || prod.stockStatus === 'sold_out' || prod.status === 'deleted') {
          return jsonOutput({ success: false, error: 'Product is sold out or no longer listed.' });
        }

        var qty = Math.max(1, Number(payload.quantity) || 1);
        var currentAvail = prod.availableStock !== undefined && prod.availableStock !== '' ? Number(prod.availableStock) : 1;
        if (currentAvail < qty) {
          return jsonOutput({
            success: false,
            error: 'Insufficient stock. Only ' + currentAvail + ' unit(s) remaining for this item.'
          });
        }

        var unitPrice = Number(prod.price);
        var totalPrice = Number((unitPrice * qty).toFixed(2));
        var wList = getSheetRows('Wallets');
        var bWallet = wList.find(function(w) { return w.userId === payload.buyerId; });
        var buyerAvail = Number(bWallet ? bWallet.availableBalance : 0);

        // Verify buyer has sufficient wallet balance
        if (buyerAvail < totalPrice) {
          var deficit = Number((totalPrice - buyerAvail).toFixed(2));
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
          amount: totalPrice,
          quantity: qty,
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
          cancellationRequestedBy: '',
          cancellationReason: '',
          cancellationExplanation: '',
          cancellationRequestedAt: '',
          refundStatus: 'none',
          refundAdminNotes: '',
          refundProcessedAt: '',
          disputeReason: '',
          createdAt: now,
          updatedAt: now
        };

        appendSheetRow('Orders', newOrder);

        // Atomically decrement stock and update availability
        var newAvail = currentAvail - qty;
        var newSold = (Number(prod.soldQuantity) || 0) + qty;
        var isSoldOut = newAvail <= 0;
        updateSheetRow('Products', 'productId', prod.productId, {
          availableStock: newAvail,
          soldQuantity: newSold,
          stockStatus: isSoldOut ? 'sold_out' : 'in_stock',
          availability: isSoldOut ? 'sold' : 'available',
          updatedAt: now
        });

        // Deduct from buyer available balance (Wallets)
        var newBuyerAvail = Number((buyerAvail - totalPrice).toFixed(2));
        updateSheetRow('Wallets', 'userId', payload.buyerId, {
          availableBalance: newBuyerAvail,
          updatedAt: now
        });

        // Record buyer WalletTransaction
        appendSheetRow('WalletTransactions', {
          transactionId: 'wtx_' + Utilities.getUuid().substr(0, 8),
          userId: payload.buyerId,
          type: 'purchase_deduction',
          amount: totalPrice,
          reference: oRef,
          status: 'successful',
          description: 'Purchase payment for ' + prod.name + (qty > 1 ? ' (' + qty + ' units)' : ''),
          createdAt: now
        });

        // Credit seller pending balance in SalesBalances
        var sbList = getSheetRows('SalesBalances');
        var sBalance = sbList.find(function(s) { return s.userId === prod.sellerId; });
        if (!sBalance) {
          appendSheetRow('SalesBalances', {
            salesBalanceId: 'sb_' + prod.sellerId,
            userId: prod.sellerId,
            availableBalance: 0,
            pendingBalance: totalPrice,
            totalEarnings: 0,
            totalWithdrawals: 0,
            updatedAt: now
          });
        } else {
          var newPending = Number(((Number(sBalance.pendingBalance) || 0) + totalPrice).toFixed(2));
          updateSheetRow('SalesBalances', 'userId', prod.sellerId, { pendingBalance: newPending, updatedAt: now });
        }

        // Record in SalesTransactions
        appendSheetRow('SalesTransactions', {
          transactionId: 'stx_' + Utilities.getUuid().substr(0, 8),
          sellerId: prod.sellerId,
          orderId: oId,
          orderReference: oRef,
          amount: totalPrice,
          type: 'pending_sale',
          status: 'pending',
          createdAt: now
        });

        // Log in central Transactions ledger
        logFinancialTransaction({
          reference: oRef,
          userId: payload.buyerId,
          buyerId: payload.buyerId,
          sellerId: prod.sellerId,
          productId: prod.productId,
          orderId: oId,
          type: 'purchase_deduction',
          amount: totalPrice,
          paymentMethod: 'wallet',
          paymentProvider: 'ebron',
          eBronStatus: 'completed',
          paystackStatus: 'none',
          details: 'Purchase payment of ₦' + totalPrice.toLocaleString() + ' placed in seller escrow'
        });

        createNotification(
          payload.buyerId,
          'Purchase Placed (' + oRef + ')',
          'Your payment of ₦' + totalPrice.toLocaleString() + ' for ' + prod.name + ' was deducted. Track your delivery and confirm receipt when received.',
          'order',
          '/buy/pending'
        );

        createNotification(
          prod.sellerId,
          'New Sale Received! (' + oRef + ')',
          payload.buyerName + ' purchased ' + prod.name + ' (' + qty + ' unit' + (qty > 1 ? 's' : '') + ') for ₦' + totalPrice.toLocaleString() + '. Deliver the item and confirm handover.',
          'order',
          '/sell/pending'
        );

        return jsonOutput({ success: true, order: newOrder });
      } finally {
        orderLock.releaseLock();
      }
    }

    // 12. CONFIRM ORDER (Dual Confirmation State Machine with Duplicate Protection & Script Lock)
    if (action === 'confirmOrder') {
      var confirmLock = LockService.getScriptLock();
      var hasConfirmLock = confirmLock.tryLock(15000);
      if (!hasConfirmLock) {
        return jsonOutput({ success: false, error: 'A confirmation transaction is currently processing. Please wait a moment.' });
      }

      try {
        var ord = getSheetRows('Orders').find(function(o) { return o.orderId === payload.orderId; });
        if (!ord) return jsonOutput({ success: false, error: 'Order not found' });
        if (ord.status === 'completed') {
          return jsonOutput({ success: true, message: 'Order is already completed.', order: ord, alreadyConfirmed: true, fundsReleased: false });
        }
        if (ord.status === 'refund_pending_approval' || ord.refundStatus === 'pending_approval') {
          return jsonOutput({ success: false, error: 'Order is currently pending refund review and cannot be confirmed.' });
        }
        if (ord.status === 'refunded' || ord.status === 'cancelled') {
          return jsonOutput({ success: false, error: 'This order has been cancelled or refunded.' });
        }

        var now = new Date().toISOString();
        var sellerAt = ord.sellerConfirmedAt;
        var buyerAt = ord.buyerConfirmedAt;

        // Duplicate confirmation check for seller
        if (payload.role === 'seller') {
          if (ord.sellerId !== payload.userId) return jsonOutput({ success: false, error: 'Unauthorized.' });
          if (ord.sellerConfirmedAt) {
            return jsonOutput({
              success: true,
              message: 'You have already confirmed handover for this order.',
              alreadyConfirmed: true,
              order: ord,
              fundsReleased: false
            });
          }
          sellerAt = now;
        }

        // Duplicate confirmation check for buyer
        if (payload.role === 'buyer') {
          if (ord.buyerId !== payload.userId) return jsonOutput({ success: false, error: 'Unauthorized.' });
          if (ord.buyerConfirmedAt) {
            return jsonOutput({
              success: true,
              message: 'You have already confirmed delivery for this order.',
              alreadyConfirmed: true,
              order: ord,
              fundsReleased: false
            });
          }
          buyerAt = now;
        }

        var st = ord.status;
        var released = false;

        // Atomic check: ONLY release funds if order is NOT already completed AND both are confirmed
        if (sellerAt && buyerAt && ord.status !== 'completed') {
          st = 'completed';
          released = true;

          // Shift pending to available in seller SalesBalances
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

          // Log in central Transactions ledger
          logFinancialTransaction({
            reference: ord.orderReference + '_RELEASE',
            userId: ord.sellerId,
            buyerId: ord.buyerId,
            sellerId: ord.sellerId,
            productId: ord.productId,
            orderId: ord.orderId,
            type: 'released_sale',
            amount: Number(ord.amount),
            paymentMethod: 'wallet',
            paymentProvider: 'ebron',
            eBronStatus: 'completed',
            paystackStatus: 'none',
            details: 'Escrow sales funds released to seller upon dual confirmation'
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
          completedAt: st === 'completed' ? now : ord.completedAt,
          updatedAt: now
        });

        ord.status = st;
        ord.sellerConfirmedAt = sellerAt;
        ord.buyerConfirmedAt = buyerAt;
        if (st === 'completed') ord.completedAt = now;

        return jsonOutput({
          success: true,
          status: st,
          order: ord,
          fundsReleased: released,
          message: released ? 'Transaction completed! Funds released.' : 'Confirmation recorded.'
        });
      } finally {
        confirmLock.releaseLock();
      }
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

    // 13a. REQUEST ORDER CANCELLATION (Buyer or Seller)
    if (action === 'requestOrderCancellation') {
      var ord = getSheetRows('Orders').find(function(o) { return o.orderId === payload.orderId; });
      if (!ord) return jsonOutput({ success: false, error: 'Order not found.' });

      var requesterRole = payload.requestedBy; // 'buyer' | 'seller'
      if (requesterRole !== 'buyer' && requesterRole !== 'seller') {
        return jsonOutput({ success: false, error: 'Invalid requester role.' });
      }

      if (ord.status === 'completed') {
        return jsonOutput({ success: false, error: 'Completed orders cannot be cancelled.' });
      }
      if (ord.status === 'refunded' || ord.status === 'cancelled') {
        return jsonOutput({ success: false, error: 'This order has already been cancelled or refunded.' });
      }
      if (ord.status === 'refund_pending_approval' || ord.refundStatus === 'pending_approval') {
        return jsonOutput({
          success: false,
          error: 'A cancellation request for this order is already pending administrator review. Conflicting requests are not permitted.'
        });
      }

      var now = new Date().toISOString();
      var reason = payload.reason || 'Requested by ' + requesterRole;
      var explanation = payload.explanation ? String(payload.explanation).trim() : '';

      updateSheetRow('Orders', 'orderId', ord.orderId, {
        status: 'refund_pending_approval',
        cancellationRequestedBy: requesterRole,
        cancellationReason: reason,
        cancellationExplanation: explanation,
        cancellationRequestedAt: now,
        refundStatus: 'pending_approval',
        updatedAt: now
      });

      // Notify admin
      var allUsers = getSheetRows('Users');
      var admins = allUsers.filter(function(u) { return u.role === 'admin'; });
      admins.forEach(function(adm) {
        createNotification(
          adm.userId,
          'New Refund Request (' + ord.orderReference + ')',
          requesterRole.toUpperCase() + ' requested cancellation for order ' + ord.orderReference + ' (₦' + Number(ord.amount).toLocaleString() + '). Reason: ' + reason,
          'admin',
          '/admin'
        );
      });

      // Notify counterparty
      var counterPartyId = requesterRole === 'buyer' ? ord.sellerId : ord.buyerId;
      var requesterName = requesterRole === 'buyer' ? ord.buyerName : ord.sellerName;
      createNotification(
        counterPartyId,
        'Cancellation Requested (' + ord.orderReference + ')',
        requesterName + ' (' + requesterRole + ') has submitted a cancellation request for order ' + ord.orderReference + '. It is awaiting admin review.',
        'order',
        requesterRole === 'buyer' ? '/sell/pending' : '/buy/pending'
      );

      return jsonOutput({ success: true, message: 'Cancellation request submitted for administrator review.' });
    }

    // 13b. PROCESS REFUND (Admin Approval / Rejection)
    if (action === 'processRefund') {
      var ord = getSheetRows('Orders').find(function(o) { return o.orderId === payload.orderId; });
      if (!ord) return jsonOutput({ success: false, error: 'Order not found.' });

      if (ord.status !== 'refund_pending_approval' && ord.refundStatus !== 'pending_approval') {
        return jsonOutput({ success: false, error: 'Order does not have a pending refund request.' });
      }
      if (ord.refundStatus === 'approved') {
        return jsonOutput({ success: false, error: 'This refund has already been approved and credited.' });
      }

      var now = new Date().toISOString();
      var decision = payload.decision; // 'approved' | 'rejected'
      var adminNotes = payload.adminNotes ? String(payload.adminNotes).trim() : '';
      var refundAmt = Number(ord.amount);

      if (decision === 'approved') {
        // 1. Credit buyer Wallet exactly once
        var wList = getSheetRows('Wallets');
        var bWallet = wList.find(function(w) { return w.userId === ord.buyerId; });
        if (bWallet) {
          var newBuyerBal = Number(((Number(bWallet.availableBalance) || 0) + refundAmt).toFixed(2));
          updateSheetRow('Wallets', 'userId', ord.buyerId, {
            availableBalance: newBuyerBal,
            updatedAt: now
          });
        } else {
          appendSheetRow('Wallets', {
            walletId: 'wal_' + ord.buyerId,
            userId: ord.buyerId,
            availableBalance: refundAmt,
            updatedAt: now
          });
        }

        // 2. Record refund transaction in WalletTransactions
        appendSheetRow('WalletTransactions', {
          transactionId: 'wtx_' + Utilities.getUuid().substr(0, 8),
          userId: ord.buyerId,
          type: 'refund',
          amount: refundAmt,
          reference: ord.orderReference,
          status: 'successful',
          description: 'Refund for order ' + ord.orderReference + ' (' + (ord.cancellationReason || 'Admin Approved') + ')',
          createdAt: now
        });

        // 3. Deduct seller pending sales balance
        var sbList = getSheetRows('SalesBalances');
        var sBal = sbList.find(function(s) { return s.userId === ord.sellerId; });
        if (sBal) {
          var newPendingBal = Math.max(0, Number(((Number(sBal.pendingBalance) || 0) - refundAmt).toFixed(2)));
          updateSheetRow('SalesBalances', 'userId', ord.sellerId, {
            pendingBalance: newPendingBal,
            updatedAt: now
          });
        }

        // 4. Record in SalesTransactions
        appendSheetRow('SalesTransactions', {
          transactionId: 'stx_' + Utilities.getUuid().substr(0, 8),
          sellerId: ord.sellerId,
          orderId: ord.orderId,
          orderReference: ord.orderReference,
          amount: refundAmt,
          type: 'cancelled_sale',
          status: 'refunded',
          createdAt: now
        });

        // 5. Restore product stock inventory
        var prod = getSheetRows('Products').find(function(p) { return p.productId === ord.productId; });
        if (prod) {
          var orderQty = Math.max(1, Number(ord.quantity) || 1);
          var restoredAvail = (Number(prod.availableStock) || 0) + orderQty;
          var restoredSold = Math.max(0, (Number(prod.soldQuantity) || 0) - orderQty);
          updateSheetRow('Products', 'productId', ord.productId, {
            availableStock: restoredAvail,
            soldQuantity: restoredSold,
            stockStatus: 'in_stock',
            availability: 'available',
            updatedAt: now
          });
        }

        // 6. Update order status
        updateSheetRow('Orders', 'orderId', ord.orderId, {
          status: 'refunded',
          refundStatus: 'approved',
          refundAdminNotes: adminNotes || 'Refund approved by administrator',
          refundProcessedAt: now,
          updatedAt: now
        });

        // 7. Notify buyer and seller
        createNotification(
          ord.buyerId,
          'Refund Approved & Credited (' + ord.orderReference + ')',
          'Your refund of ₦' + refundAmt.toLocaleString() + ' for order ' + ord.orderReference + ' has been approved and credited to your spending wallet.',
          'wallet',
          '/buy/wallets'
        );

        createNotification(
          ord.sellerId,
          'Order Cancellation Approved (' + ord.orderReference + ')',
          'The cancellation and refund of ₦' + refundAmt.toLocaleString() + ' for order ' + ord.orderReference + ' has been approved by the administrator.',
          'order',
          '/sell/pending'
        );

        return jsonOutput({ success: true, message: 'Refund approved. Buyer wallet credited with ₦' + refundAmt.toLocaleString() });
      }

      if (decision === 'rejected') {
        // Revert to active pending status
        var revertedStatus = 'payment_successful';
        if (ord.sellerConfirmedAt && ord.buyerConfirmedAt) {
          revertedStatus = 'completed';
        } else if (ord.sellerConfirmedAt) {
          revertedStatus = 'awaiting_buyer_confirmation';
        } else if (ord.buyerConfirmedAt) {
          revertedStatus = 'awaiting_seller_confirmation';
        }

        updateSheetRow('Orders', 'orderId', ord.orderId, {
          status: revertedStatus,
          refundStatus: 'rejected',
          refundAdminNotes: adminNotes || 'Refund request rejected by administrator',
          refundProcessedAt: now,
          updatedAt: now
        });

        var requesterUserId = ord.cancellationRequestedBy === 'seller' ? ord.sellerId : ord.buyerId;
        var requesterIsBuyer = ord.cancellationRequestedBy !== 'seller';

        // Notify the requester (detailed, including rejection reason when supplied)
        createNotification(
          requesterUserId,
          'Refund Request Rejected (' + ord.orderReference + ')',
          'Your cancellation request for order ' + ord.orderReference + ' was rejected by the administrator. The order continues normally from its current stage. ' + (adminNotes ? 'Reason: ' + adminNotes : ''),
          'order',
          requesterIsBuyer ? '/buy/pending' : '/sell/pending'
        );

        // Notify the counterparty so both parties are aware the order remains active
        var otherUserId = requesterIsBuyer ? ord.sellerId : ord.buyerId;
        if (otherUserId && otherUserId !== requesterUserId) {
          createNotification(
            otherUserId,
            'Cancellation Request Rejected (' + ord.orderReference + ')',
            'The cancellation request for order ' + ord.orderReference + ' was rejected by the administrator. The order continues normally from its current stage.',
            'order',
            requesterIsBuyer ? '/sell/pending' : '/buy/pending'
          );
        }

        return jsonOutput({ success: true, message: 'Refund request rejected. Order remains active.' });
      }

      return jsonOutput({ success: false, error: 'Invalid decision: ' + decision });
    }

    // 14. WITHDRAWAL REQUESTS (Deducted from Seller Sales Balance)
    if (action === 'requestWithdrawal') {
      var lock = LockService.getScriptLock();
      var hasLock = false;
      try {
        hasLock = lock.tryLock(15000);
      } catch (e) {}
      if (!hasLock) {
        return jsonOutput({ success: false, error: 'Server is currently busy processing another transaction. Please wait a moment.' });
      }

      try {
        // NOTE: This user-side path NEVER contacts Paystack. It only validates,
        // reserves funds, and stores a pending request. Paystack is called later,
        // exclusively during admin approval (processSingleWithdrawalApproval).
        var supportedBanks = [
          { id: 'opay', name: 'Opay', code: '999992' },
          { id: 'moniepoint', name: 'Moniepoint', code: '50515' },
          { id: 'palmpay', name: 'PalmPay', code: '999991' }
        ];
        var targetBank = String(payload.bankCode || payload.bankName || '').trim().toLowerCase();
        var matchedBank = supportedBanks.find(function(b) {
          return b.code.toLowerCase() === targetBank ||
                 b.name.toLowerCase() === targetBank ||
                 b.id.toLowerCase() === targetBank;
        });
        if (!matchedBank) {
          return jsonOutput({
            success: false,
            error: 'Please select one of our supported banks for faster withdrawal processing (Opay, Moniepoint, PalmPay).'
          });
        }

        var acc = String(payload.accountNumber || '').trim();
        if (!/^\d{10}$/.test(acc)) {
          return jsonOutput({ success: false, error: 'Account number must be exactly 10 numerical digits.' });
        }

        var user = getSheetRows('Users').find(function(u) { return u.userId === payload.userId; });
        var amt = Number(payload.amount);
        if (isNaN(amt) || amt <= 0) {
          return jsonOutput({ success: false, error: 'Withdrawal amount must be a positive number.' });
        }

        var feeCalc;
        try {
          feeCalc = calculatePayoutFee(amt);
        } catch (calcErr) {
          return jsonOutput({ success: false, error: calcErr.message || 'Error calculating withdrawal fees.' });
        }

        if (!feeCalc.isValid || feeCalc.netPayout <= 0) {
          return jsonOutput({
            success: false,
            error: 'Withdrawal amount (₦' + amt.toLocaleString() + ') must be greater than total deductions (₦' + feeCalc.totalFee.toLocaleString() + ') to produce a positive payout.'
          });
        }

        var sBalance = getOrCreateSalesBalance(payload.userId);
        if ((Number(sBalance.availableBalance) || 0) < amt) {
          return jsonOutput({
            success: false,
            error: 'Insufficient available sales balance. Pending sales cannot be withdrawn, and buyer wallet funds cannot be withdrawn.'
          });
        }

        var now = new Date().toISOString();
        var reqId = 'wdr_' + Utilities.getUuid().substr(0, 8);
        var ref = 'WD-' + Utilities.getUuid().replace(/-/g, '').substr(0, 12).toUpperCase();

        // Account name is optional on the user side (no Paystack verification required
        // to submit). It is resolved/confirmed later during admin-approved payout.
        var providedName = payload.accountName ? String(payload.accountName).trim() : '';

        var req = {
          requestId: reqId,
          userId: payload.userId,
          userName: user ? user.fullName : '',
          userRegNumber: user ? (user.regNumber || user.matricNumber || '') : '',
          userEmail: user ? user.schoolEmail : '',
          amount: amt,
          feePercentage: feeCalc.percentageRate,
          percentageFee: feeCalc.percentageFee,
          flatFee: feeCalc.flatFee,
          totalFee: feeCalc.totalFee,
          netAmount: feeCalc.netPayout,
          feeSnapshot: JSON.stringify(feeCalc),
          bankName: matchedBank.name,
          bankCode: matchedBank.code,
          accountNumber: acc,
          accountName: providedName || (user ? user.fullName : ''),
          status: 'pending',
          reference: ref,
          paystackRecipientCode: '',
          paystackTransferCode: '',
          paystackStatus: '',
          paymentMethod: '',
          adminId: '',
          manualConfirmedBy: '',
          manualConfirmedAt: '',
          rejectionReason: '',
          failureReason: '',
          adminNotes: '',
          processedAt: '',
          completedAt: '',
          createdAt: now,
          updatedAt: now
        };

        appendSheetRow('WithdrawalRequests', req);

        // Reserve funds: move full requested amount from availableBalance into reservedBalance.
        var reserveRes = reserveWithdrawalFunds(payload.userId, amt);
        if (!reserveRes.success) {
          return jsonOutput({ success: false, error: reserveRes.error || 'Could not reserve withdrawal funds.' });
        }

        // Record in central Transactions ledger
        logFinancialTransaction({
          reference: ref,
          userId: payload.userId,
          sellerId: payload.userId,
          type: 'withdrawal_request',
          amount: amt,
          feePercentage: feeCalc.percentageRate,
          percentageFee: feeCalc.percentageFee,
          flatFee: feeCalc.flatFee,
          totalFee: feeCalc.totalFee,
          netAmount: feeCalc.netPayout,
          paymentMethod: 'bank_transfer',
          paymentProvider: 'paystack',
          eBronStatus: 'pending',
          paystackStatus: 'pending',
          statusHistory: [{ status: 'pending', timestamp: now, reason: 'Withdrawal request submitted for ₦' + amt.toLocaleString() + ' (Net payout: ₦' + feeCalc.netPayout.toLocaleString() + ', Deductions: ₦' + feeCalc.totalFee.toLocaleString() + ')' }],
          verificationDetails: JSON.stringify({ bankName: matchedBank.name, bankCode: matchedBank.code, accountNumber: acc, reserved: true, feeDetails: feeCalc })
        });

        // Notify administrator
        var allUsers = getSheetRows('Users');
        var admins = allUsers.filter(function(u) { return u.role === 'admin'; });
        admins.forEach(function(adm) {
          createNotification(
            adm.userId,
            'New Withdrawal Request (' + ref + ')',
            (user ? user.fullName : payload.userId) + ' requested bank payout of ₦' + amt.toLocaleString() + ' to ' + matchedBank.name + '.',
            'admin',
            '/admin'
          );
        });

        createNotification(
          payload.userId,
          'Withdrawal Request Submitted (' + ref + ')',
          'Your withdrawal request for ₦' + amt.toLocaleString() + ' has been submitted successfully and is awaiting admin approval.',
          'sales',
          '/sell/sales-balance'
        );

        return jsonOutput({ success: true, request: req });
      } finally {
        try { lock.releaseLock(); } catch (e) {}
      }
    }

    // 14b. CANCEL WITHDRAWAL (User) — allowed only BEFORE payment processing begins
    if (action === 'cancelWithdrawal') {
      var cLock = LockService.getScriptLock();
      var hasCLock = false;
      try { hasCLock = cLock.tryLock(15000); } catch (e) {}
      if (!hasCLock) {
        return jsonOutput({ success: false, error: 'Server is currently busy processing another transaction. Please wait a moment.' });
      }

      try {
        var cReq = getSheetRows('WithdrawalRequests').find(function(r) { return r.requestId === payload.requestId; });
        if (!cReq) return jsonOutput({ success: false, error: 'Withdrawal request not found.' });
        if (cReq.userId !== payload.userId) return jsonOutput({ success: false, error: 'Unauthorized.' });

        var cSt = String(cReq.status || '').toLowerCase();
        if (cSt === 'cancelled') {
          return jsonOutput({ success: true, alreadyCancelled: true, message: 'This withdrawal request has already been cancelled.' });
        }
        if (cSt === 'successful' || cSt === 'processed') {
          return jsonOutput({ success: false, error: 'This withdrawal has already been paid out and cannot be cancelled.' });
        }
        if (cSt === 'rejected' || cSt === 'reversed') {
          return jsonOutput({ success: false, error: 'This withdrawal is already closed and cannot be cancelled.' });
        }
        // A transfer that has entered processing (or a failed Paystack attempt that produced a
        // transfer code) must never be cancelled automatically — support must handle it.
        if (cSt === 'processing' || (cSt === 'failed' && cReq.paystackTransferCode)) {
          return jsonOutput({ success: false, error: 'This withdrawal is already being processed and cannot be cancelled. Please contact support.' });
        }
        if (cSt !== 'pending' && cSt !== 'failed') {
          return jsonOutput({ success: false, error: 'This withdrawal cannot be cancelled in its current state.' });
        }

        var cAmt = Number(cReq.amount) || 0;
        var cNow = new Date().toISOString();
        var cReason = payload.reason ? String(payload.reason).trim() : 'Cancelled by user.';

        // Release the reservation back to the seller's available balance (guarded: only once,
        // because the status check above ensures we only reach here for a cancellable request).
        releaseWithdrawalReservation(cReq.userId, cAmt);

        updateSheetRow('WithdrawalRequests', 'requestId', payload.requestId, {
          status: 'cancelled',
          failureReason: cReason,
          adminNotes: (cReq.adminNotes ? cReq.adminNotes + ' | ' : '') + 'Cancelled by user: ' + cReason,
          processedAt: cNow,
          updatedAt: cNow
        });

        logFinancialTransaction({
          reference: cReq.reference || cReq.requestId,
          userId: cReq.userId,
          sellerId: cReq.userId,
          type: 'withdrawal_cancelled',
          amount: cAmt,
          paymentMethod: cReq.paymentMethod || 'bank_transfer',
          paymentProvider: cReq.paymentMethod === 'manual_bank_transfer' ? 'ebron' : 'paystack',
          eBronStatus: 'cancelled',
          paystackStatus: 'cancelled',
          statusHistory: [{ status: 'cancelled', timestamp: cNow, reason: cReason + ' Reserved funds released.' }],
          verificationDetails: JSON.stringify({ cancelledBy: payload.userId, reason: cReason })
        });

        createNotification(
          cReq.userId,
          'Withdrawal Request Cancelled (' + (cReq.reference || cReq.requestId) + ')',
          'Your withdrawal request of ₦' + cAmt.toLocaleString() + ' was cancelled. The reserved funds have been returned to your available sales balance.',
          'sales',
          '/sell/sales-balance'
        );

        // Notify administrators so the request is no longer treated as pending approval.
        var cAdmins = getSheetRows('Users').filter(function(u) { return u.role === 'admin'; });
        cAdmins.forEach(function(adm) {
          createNotification(
            adm.userId,
            'Withdrawal Cancelled (' + (cReq.reference || cReq.requestId) + ')',
            (cReq.userName || cReq.userId) + ' cancelled their withdrawal request of ₦' + cAmt.toLocaleString() + '. No payout is required.',
            'admin',
            '/admin'
          );
        });

        return jsonOutput({ success: true, message: 'Withdrawal request cancelled and reserved funds released.' });
      } finally {
        try { cLock.releaseLock(); } catch (e) {}
      }
    }

    // 15. PROCESS WITHDRAWAL (Admin) — approve triggers Paystack, reject releases funds
    if (action === 'processWithdrawal') {
      var lock = LockService.getScriptLock();
      var hasLock = false;
      try {
        hasLock = lock.tryLock(20000);
      } catch (e) {}
      if (!hasLock) {
        return jsonOutput({ success: false, error: 'Server is currently busy processing another transaction. Please wait a moment.' });
      }

      try {
        var wReq = getSheetRows('WithdrawalRequests').find(function(r) { return r.requestId === payload.requestId; });
        if (!wReq) return jsonOutput({ success: false, error: 'Request not found' });

        var now = new Date().toISOString();
        // Normalise the decision (frontend may send 'approved'/'rejected' or 'approve'/'reject').
        var rawDecision = String(payload.decision || '').toLowerCase();
        var isApprove = (rawDecision === 'approve' || rawDecision === 'approved' || rawDecision === 'process' || rawDecision === 'processed');
        var isReject = (rawDecision === 'reject' || rawDecision === 'rejected');
        var adminNotes = payload.adminNotes ? String(payload.adminNotes).trim() : '';
        var amt = Number(wReq.amount);
        var adminId = payload.adminId || '';
        var st = String(wReq.status || '').toLowerCase();

        if (isApprove) {
          var method = String(payload.method || 'paystack').toLowerCase();
          if (method === 'manual') method = 'manual_bank_transfer';
          var isManual = (method === 'manual_bank_transfer');
          if (method !== 'paystack' && !isManual) {
            return jsonOutput({ success: false, error: 'Unknown payment method: ' + payload.method });
          }

          if (isManual) {
            // ===== MANUAL BANK TRANSFER =====
            // Funded/paid outside Paystack. The admin must explicitly confirm success or report a failure.
            if (st === 'successful' || st === 'processed') {
              return jsonOutput({ success: false, error: 'This withdrawal has already been paid out.' });
            }
            if (st === 'rejected' || st === 'cancelled' || st === 'reversed') {
              return jsonOutput({ success: false, error: 'This withdrawal is closed (' + wReq.status + ') and cannot be processed.' });
            }
            // Prevent switching payment methods while a Paystack transfer is in flight.
            if (st === 'processing' && wReq.paystackTransferCode) {
              return jsonOutput({ success: false, error: 'A Paystack transfer is already in progress for this request and cannot be switched to a manual transfer.' });
            }
            if (st !== 'pending' && st !== 'failed') {
              return jsonOutput({ success: false, error: 'Request is not in a processable state (' + wReq.status + ').' });
            }

            var manualAction = String(payload.manualAction || '').toLowerCase();

            if (manualAction === 'confirmed' || manualAction === 'success' || manualAction === 'successful') {
              // Finalize the reservation exactly once. Marked Successful ONLY on explicit admin confirmation.
              finalizeWithdrawalReservation(wReq.userId, amt);

              updateSheetRow('WithdrawalRequests', 'requestId', payload.requestId, {
                status: 'successful',
                paymentMethod: 'manual_bank_transfer',
                adminId: adminId || wReq.adminId || '',
                manualConfirmedBy: adminId || wReq.manualConfirmedBy || '',
                manualConfirmedAt: now,
                processedAt: now,
                completedAt: now,
                updatedAt: now
              });

              appendSheetRow('SalesTransactions', {
                transactionId: 'stx_' + Utilities.getUuid().substr(0, 8),
                sellerId: wReq.userId,
                orderId: '',
                orderReference: wReq.reference || wReq.requestId,
                amount: amt,
                type: 'withdrawal',
                status: 'completed',
                createdAt: now
              });

              var manualTransferAmt = wReq.netAmount !== undefined && wReq.netAmount !== '' && Number(wReq.netAmount) > 0
                ? Number(wReq.netAmount)
                : amt;

              logFinancialTransaction({
                reference: wReq.reference || wReq.requestId,
                userId: wReq.userId,
                sellerId: wReq.userId,
                type: 'withdrawal',
                amount: amt,
                netAmount: manualTransferAmt,
                totalFee: Number(wReq.totalFee) || (amt - manualTransferAmt),
                percentageFee: Number(wReq.percentageFee) || 0,
                flatFee: Number(wReq.flatFee) || 0,
                feePercentage: Number(wReq.feePercentage) || 0,
                paymentMethod: 'manual_bank_transfer',
                paymentProvider: 'ebron',
                eBronStatus: 'completed',
                paystackStatus: 'none',
                statusHistory: [{ status: 'completed', timestamp: now, reason: 'Manual bank transfer confirmed by admin ' + (adminId || 'n/a') + ' for net ₦' + manualTransferAmt.toLocaleString() }],
                verificationDetails: JSON.stringify({ method: 'manual_bank_transfer', confirmedBy: adminId || '', netPayout: manualTransferAmt, fee: Number(wReq.totalFee) || 0 })
              });

              createNotification(
                wReq.userId,
                'Withdrawal Completed (' + (wReq.reference || wReq.requestId) + ')',
                'Your withdrawal of ₦' + amt.toLocaleString() + ' (net payout ₦' + manualTransferAmt.toLocaleString() + ' after ₦' + (Number(wReq.totalFee) || 0).toLocaleString() + ' fee deductions) has been paid to ' + wReq.bankName + ' (' + wReq.accountNumber + ') via bank transfer.',
                'sales',
                '/sell/sales-balance'
              );

              return jsonOutput({ success: true, message: 'Manual bank transfer recorded. Withdrawal marked successful.' });
            }

            if (manualAction === 'failed' || manualAction === 'fail') {
              var failReason = payload.failureReason ? String(payload.failureReason).trim() : '';
              if (!failReason) {
                return jsonOutput({ success: false, error: 'A failure explanation is required.' });
              }

              // Payment was not made: release the reservation back to the seller's available balance.
              releaseWithdrawalReservation(wReq.userId, amt);

              updateSheetRow('WithdrawalRequests', 'requestId', payload.requestId, {
                status: 'failed',
                paymentMethod: 'manual_bank_transfer',
                adminId: adminId || wReq.adminId || '',
                failureReason: failReason,
                adminNotes: 'Manual transfer failed: ' + failReason + '. Reserved funds released.',
                processedAt: now,
                updatedAt: now
              });

              logFinancialTransaction({
                reference: wReq.reference || wReq.requestId,
                userId: wReq.userId,
                sellerId: wReq.userId,
                type: 'withdrawal_failed',
                amount: amt,
                paymentMethod: 'manual_bank_transfer',
                paymentProvider: 'ebron',
                eBronStatus: 'failed',
                paystackStatus: 'none',
                errorMessage: failReason,
                statusHistory: [{ status: 'failed', timestamp: now, reason: 'Manual transfer failed: ' + failReason + '. Reserved funds released.' }],
                verificationDetails: JSON.stringify({ method: 'manual_bank_transfer', failureReason: failReason })
              });

              createNotification(
                wReq.userId,
                'Withdrawal Could Not Be Completed',
                'Your withdrawal of ₦' + amt.toLocaleString() + ' could not be completed. Reason: ' + failReason + '. The reserved funds have been returned to your available sales balance.',
                'sales',
                '/sell/sales-balance'
              );

              return jsonOutput({ success: true, message: 'Manual transfer marked as failed and reserved funds released.' });
            }

            return jsonOutput({ success: false, error: 'Select a manual transfer outcome ("I Have Transferred" or "Transfer Failed").' });
          }

          // ===== PAYSTACK TRANSFER =====
          // Delegate to the shared single-request approval workflow (also used by Approve All).
          var result = processSingleWithdrawalApproval(payload.requestId, adminId);
          if (result.success) {
            return jsonOutput({
              success: true,
              message: 'Paystack transfer successful! Reference: ' + (result.reference || payload.requestId),
              transferCode: result.transferCode || ''
            });
          }
          if (result.status === 'skipped') {
            return jsonOutput({ success: false, error: result.error || 'This request cannot be approved.', status: 'skipped' });
          }
          return jsonOutput({
            success: false,
            error: 'Paystack transfer failed: ' + (result.error || 'Gateway error') + '. Funds remain reserved for retry.',
            status: 'failed'
          });
        }

        if (isReject) {
          if (st === 'successful' || st === 'processed' || st === 'reversed') {
            return jsonOutput({ success: false, error: 'This withdrawal has already been finalized and cannot be rejected.' });
          }
          if (st === 'rejected') {
            return jsonOutput({ success: false, error: 'This withdrawal has already been rejected.' });
          }
          if (st === 'cancelled') {
            return jsonOutput({ success: false, error: 'This withdrawal has already been cancelled.' });
          }

          // Release the reserved funds back to the seller's available balance.
          releaseWithdrawalReservation(wReq.userId, amt);

          updateSheetRow('WithdrawalRequests', 'requestId', payload.requestId, {
            status: 'rejected',
            adminId: adminId || wReq.adminId || '',
            rejectionReason: adminNotes || 'Withdrawal request rejected by administrator.',
            adminNotes: adminNotes || 'Withdrawal request rejected by administrator. Funds released.',
            processedAt: now,
            updatedAt: now
          });

          logFinancialTransaction({
            reference: wReq.reference || wReq.requestId,
            userId: wReq.userId,
            sellerId: wReq.userId,
            type: 'withdrawal',
            amount: amt,
            paymentMethod: 'bank_transfer',
            paymentProvider: 'paystack',
            eBronStatus: 'rejected',
            paystackStatus: 'cancelled',
            statusHistory: [{ status: 'rejected', timestamp: now, reason: adminNotes || 'Rejected by administrator. Reserved funds released.' }],
            verificationDetails: JSON.stringify({ adminNotes: adminNotes })
          });

          createNotification(
            wReq.userId,
            'Withdrawal Request Rejected',
            'Your withdrawal request for ₦' + amt.toLocaleString() + ' was rejected. The reserved funds have been returned to your available sales balance. ' + (adminNotes ? 'Reason: ' + adminNotes : ''),
            'sales',
            '/sell/sales-balance'
          );

          return jsonOutput({ success: true, message: 'Withdrawal request rejected and reserved funds released.' });
        }

        return jsonOutput({ success: false, error: 'Unknown decision: ' + payload.decision });
      } finally {
        try { lock.releaseLock(); } catch (e) {}
      }
    }

    // 15b. BULK PROCESS WITHDRAWALS (Admin "Approve All")
    if (action === 'bulkProcessWithdrawals') {
      var lock = LockService.getScriptLock();
      var hasLock = false;
      try {
        hasLock = lock.tryLock(30000);
      } catch (e) {}
      if (!hasLock) {
        return jsonOutput({ success: false, error: 'Server is currently busy processing another transaction. Please wait a moment.' });
      }

      try {
        var adminId = payload.adminId || '';
        // Only Pending Approval requests are eligible for bulk processing.
        var pendingWdr = getSheetRows('WithdrawalRequests').filter(function(r) {
          return String(r.status || '').toLowerCase() === 'pending';
        });

        if (Array.isArray(payload.requestIds) && payload.requestIds.length > 0) {
          pendingWdr = pendingWdr.filter(function(r) { return payload.requestIds.indexOf(r.requestId) !== -1; });
        }

        var results = {
          total: pendingWdr.length,
          successful: 0,
          failed: 0,
          skipped: 0,
          details: []
        };

        for (var bIdx = 0; bIdx < pendingWdr.length; bIdx++) {
          var curReq = pendingWdr[bIdx];
          try {
            // Re-read the freshest record; each request is validated independently.
            var freshReq = getSheetRows('WithdrawalRequests').find(function(r) { return r.requestId === curReq.requestId; });
            if (!freshReq || String(freshReq.status || '').toLowerCase() !== 'pending') {
              results.skipped++;
              results.details.push({ requestId: curReq.requestId, status: 'skipped', reason: 'Not in Pending Approval status' });
              continue;
            }

            // Reuse the exact same approval workflow as individual approvals.
            var outcome = processSingleWithdrawalApproval(curReq.requestId, adminId);
            if (outcome.success) {
              results.successful++;
              results.details.push({ requestId: curReq.requestId, status: 'successful', reference: outcome.reference });
            } else if (outcome.status === 'skipped') {
              results.skipped++;
              results.details.push({ requestId: curReq.requestId, status: 'skipped', reason: outcome.error });
            } else {
              // Transfer failed for this request only — continue processing the rest.
              results.failed++;
              results.details.push({ requestId: curReq.requestId, status: 'failed', error: outcome.error });
            }
          } catch (itemErr) {
            results.failed++;
            results.details.push({ requestId: curReq.requestId, status: 'failed', error: itemErr.message });
          }
        }

        return jsonOutput({
          success: true,
          summary: results,
          message: 'Processed ' + results.total + ' withdrawals: ' + results.successful + ' successful, ' + results.failed + ' failed, ' + results.skipped + ' skipped.'
        });
      } finally {
        try { lock.releaseLock(); } catch (e) {}
      }
    }

    // 15c. RECONCILE TRANSACTION (Admin)
    if (action === 'reconcileTransaction') {
      var lock = LockService.getScriptLock();
      var hasLock = false;
      try {
        hasLock = lock.tryLock(15000);
      } catch (e) {}
      if (!hasLock) {
        return jsonOutput({ success: false, error: 'Server is currently busy processing another transaction. Please wait a moment.' });
      }

      try {
        var ref = payload.reference;
        if (!ref) return jsonOutput({ success: false, error: 'Transaction reference is required for reconciliation.' });

        var allTxs = getSheetRows('Transactions');
        var tx = allTxs.find(function(t) { return t.reference === ref; });
        if (!tx) return jsonOutput({ success: false, error: 'Transaction not found in ledger.' });

        if (tx.eBronStatus === 'completed') {
          return jsonOutput({ success: true, message: 'Transaction is already completed.', transaction: tx });
        }

        var now = new Date().toISOString();
        var amt = Number(tx.amount) || 0;
        if (amt <= 0) {
          return jsonOutput({ success: false, error: 'Cannot reconcile: transaction amount is missing from the ledger.' });
        }

        if (tx.userId) {
          var allWallets = getSheetRows('Wallets');
          var wallet = allWallets.find(function(w) { return w.userId === tx.userId; });
          if (wallet) {
            var newBal = Number(((Number(wallet.availableBalance) || 0) + amt).toFixed(2));
            updateSheetRow('Wallets', 'userId', tx.userId, {
              availableBalance: newBal,
              updatedAt: now
            });
          } else {
            appendSheetRow('Wallets', {
              walletId: 'wal_' + tx.userId,
              userId: tx.userId,
              availableBalance: amt,
              updatedAt: now
            });
          }

          var allWtx = getSheetRows('WalletTransactions');
          var existingWtx = allWtx.find(function(w) { return w.reference === ref; });
          if (!existingWtx) {
            appendSheetRow('WalletTransactions', {
              transactionId: 'wtx_' + Utilities.getUuid().substr(0, 8),
              userId: tx.userId,
              type: 'topup',
              amount: amt,
              reference: ref,
              status: 'successful',
              description: 'Reconciled Paystack Top-up',
              createdAt: now
            });
          }

          createNotification(
            tx.userId,
            'Wallet Credited via Reconciliation',
            'Your wallet has been safely credited with ₦' + amt.toLocaleString() + ' following payment reconciliation.',
            'wallet',
            '/buy/wallet'
          );
        }

        logFinancialTransaction({
          reference: ref,
          userId: tx.userId,
          type: tx.type || 'topup',
          amount: amt,
          paymentMethod: tx.paymentMethod || 'paystack',
          paymentProvider: 'paystack',
          eBronStatus: 'completed',
          paystackStatus: 'success',
          statusHistory: [{ status: 'completed', timestamp: now, reason: 'Reconciled by administrator: missing wallet credit completed.' }],
          errorMessage: '',
          verificationDetails: null
        });

        return jsonOutput({
          success: true,
          message: 'Transaction ' + ref + ' reconciled successfully. ₦' + amt.toLocaleString() + ' credited to user.',
          reconciled: true
        });
      } finally {
        try { lock.releaseLock(); } catch (e) {}
      }
    }

    // 16. TOGGLE USER SUSPENSION / DEACTIVATION (Admin)
    if (action === 'toggleUserSuspension' || action === 'deactivateUser') {
      var uTarget = getSheetRows('Users').find(function(item) { return item.userId === payload.userId; });
      if (!uTarget) return jsonOutput({ success: false, error: 'User not found' });
      var targetStatus = payload.status || (uTarget.status === 'active' ? 'deactivated' : 'active');
      var now = new Date().toISOString();
      updateSheetRow('Users', 'userId', payload.userId, { status: targetStatus, updatedAt: now });

      createNotification(
        payload.userId,
        targetStatus === 'active' ? 'Account Reactivated' : 'Account Deactivated',
        targetStatus === 'active'
          ? 'Your eBron account has been reactivated. You now have full access to marketplace features.'
          : 'Your eBron account has been deactivated by an administrator. You may submit an appeal from the sign-in page.',
        'admin',
        '/'
      );

      uTarget.status = targetStatus;
      delete uTarget.passwordHash;
      delete uTarget.salt;
      return jsonOutput({ success: true, user: uTarget, status: targetStatus });
    }

    // 16b. SUBMIT ACCOUNT APPEAL (Deactivated user)
    if (action === 'submitAccountAppeal') {
      var appealEmail = (payload.schoolEmail || '').trim().toLowerCase();
      var users = getSheetRows('Users');
      var userToAppeal = users.find(function(u) {
        return (payload.userId && u.userId === payload.userId) || String(u.schoolEmail).toLowerCase() === appealEmail;
      });

      if (!userToAppeal) {
        return jsonOutput({ success: false, error: 'Account not found with provided school email.' });
      }

      if (userToAppeal.status !== 'deactivated' && userToAppeal.status !== 'suspended') {
        return jsonOutput({ success: false, error: 'This account is already active. Only deactivated accounts can appeal.' });
      }

      var explanation = (payload.explanation || '').trim();
      if (!explanation || explanation.length < 10) {
        return jsonOutput({ success: false, error: 'Please provide an appeal explanation of at least 10 characters.' });
      }

      // Prevent duplicate pending appeals
      var existingAppeals = getSheetRows('Appeals');
      var hasPending = existingAppeals.some(function(a) {
        return a.userId === userToAppeal.userId && a.status === 'pending';
      });
      if (hasPending) {
        return jsonOutput({
          success: false,
          error: 'You already have an appeal awaiting administrative review. Please allow time for the admin to review it.'
        });
      }

      var appealId = 'app_' + Utilities.getUuid().substr(0, 8);
      var now = new Date().toISOString();

      var newAppeal = {
        appealId: appealId,
        userId: userToAppeal.userId,
        userName: userToAppeal.fullName,
        schoolEmail: userToAppeal.schoolEmail,
        explanation: explanation,
        status: 'pending',
        adminNotes: '',
        reviewedBy: '',
        reviewedAt: '',
        createdAt: now
      };

      appendSheetRow('Appeals', newAppeal);

      // Notify admins
      var admins = users.filter(function(u) { return u.role === 'admin'; });
      admins.forEach(function(adm) {
        createNotification(
          adm.userId,
          'New Account Deactivation Appeal',
          userToAppeal.fullName + ' (' + userToAppeal.schoolEmail + ') has submitted an appeal for account reactivation.',
          'admin',
          '/admin'
        );
      });

      return jsonOutput({ success: true, message: 'Your appeal has been submitted successfully and is awaiting review.', appeal: newAppeal });
    }

    // 16c. PROCESS ACCOUNT APPEAL (Admin User Management)
    if (action === 'processAccountAppeal') {
      var appList = getSheetRows('Appeals');
      var targetAppeal = appList.find(function(a) { return a.appealId === payload.appealId; });
      if (!targetAppeal) return jsonOutput({ success: false, error: 'Appeal not found.' });

      var decision = payload.decision; // 'approved' | 'rejected'
      var adminNotes = payload.adminNotes ? String(payload.adminNotes).trim() : '';
      var now = new Date().toISOString();
      var adminId = payload.adminId || 'admin';

      if (decision === 'approved') {
        // Reactivate account
        updateSheetRow('Users', 'userId', targetAppeal.userId, {
          status: 'active',
          updatedAt: now
        });

        updateSheetRow('Appeals', 'appealId', targetAppeal.appealId, {
          status: 'approved',
          adminNotes: adminNotes || 'Appeal approved. Account reactivated.',
          reviewedBy: adminId,
          reviewedAt: now
        });

        createNotification(
          targetAppeal.userId,
          'Account Reactivated!',
          'Your deactivation appeal has been approved by the administrator. Welcome back to eBron!',
          'admin',
          '/'
        );

        return jsonOutput({ success: true, message: 'Account successfully reactivated.' });
      }

      if (decision === 'rejected') {
        updateSheetRow('Appeals', 'appealId', targetAppeal.appealId, {
          status: 'rejected',
          adminNotes: adminNotes || 'Appeal reviewed and rejected.',
          reviewedBy: adminId,
          reviewedAt: now
        });

        createNotification(
          targetAppeal.userId,
          'Appeal Decision: Rejected',
          'Your account deactivation appeal was reviewed and rejected. ' + (adminNotes ? 'Reason: ' + adminNotes : ''),
          'admin',
          '/login'
        );

        return jsonOutput({ success: true, message: 'Appeal rejected. Account remains deactivated.' });
      }

      return jsonOutput({ success: false, error: 'Invalid decision: ' + decision });
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

    // 20. SUBMIT FEEDBACK (Guidelines & Safety page)
    if (action === 'submitFeedback') {
      var fbUserId = payload.userId;
      if (!fbUserId) {
        return jsonOutput({ success: false, error: 'You must be signed in to submit feedback.' });
      }

      var validTypes = ['Issue/Problem', 'Suggestion', 'Positive Feedback', 'General Feedback'];
      var fbType = payload.type;
      if (!fbType || validTypes.indexOf(fbType) === -1) {
        return jsonOutput({ success: false, error: 'Please select a valid feedback type.' });
      }

      var fbMessage = payload.message ? String(payload.message).trim() : '';
      if (!fbMessage) {
        return jsonOutput({ success: false, error: 'Please enter your feedback message.' });
      }

      var fbSubject = payload.subject ? String(payload.subject).trim() : '';
      if (!fbSubject) {
        fbSubject = fbType;
      }

      var fbUser = getSheetRows('Users').find(function(u) { return u.userId === fbUserId; });
      var now = new Date().toISOString();
      var feedbackId = 'fb_' + Utilities.getUuid().substr(0, 8);

      var newFeedback = {
        feedbackId: feedbackId,
        userId: fbUserId,
        userName: payload.userName || (fbUser ? fbUser.fullName : ''),
        userEmail: payload.userEmail || (fbUser ? fbUser.schoolEmail : ''),
        type: fbType,
        subject: fbSubject,
        message: fbMessage,
        status: 'New',
        adminNotes: '',
        createdAt: now,
        updatedAt: now
      };

      appendSheetRow('Feedback', newFeedback);

      // Notify administrators of new feedback
      var fbAdmins = getSheetRows('Users').filter(function(u) { return u.role === 'admin'; });
      fbAdmins.forEach(function(adm) {
        createNotification(
          adm.userId,
          'New User Feedback (' + fbType + ')',
          newFeedback.userName + ' submitted ' + fbType + ': "' + fbSubject + '".',
          'admin',
          '/admin'
        );
      });

      return jsonOutput({
        success: true,
        feedback: newFeedback,
        message: 'Thank you! Your feedback has been submitted successfully.'
      });
    }

    // 21. UPDATE FEEDBACK STATUS / ADMIN NOTES (Admin)
    if (action === 'updateFeedbackStatus') {
      var fbId = payload.feedbackId;
      if (!fbId) return jsonOutput({ success: false, error: 'Feedback ID is required.' });

      var validStatuses = ['New', 'Under Review', 'Resolved'];
      var fbStatus = payload.status;
      var fbUpdates = { updatedAt: new Date().toISOString() };

      if (fbStatus !== undefined && fbStatus !== null && fbStatus !== '') {
        if (validStatuses.indexOf(fbStatus) === -1) {
          return jsonOutput({ success: false, error: 'Invalid feedback status: ' + fbStatus });
        }
        fbUpdates.status = fbStatus;
      }

      if (payload.adminNotes !== undefined) {
        fbUpdates.adminNotes = String(payload.adminNotes || '').trim();
      }

      var fbOk = updateSheetRow('Feedback', 'feedbackId', fbId, fbUpdates);
      if (!fbOk) return jsonOutput({ success: false, error: 'Feedback record not found.' });
      return jsonOutput({ success: true, message: 'Feedback updated successfully.' });
    }

    return jsonOutput({ success: false, error: 'Unknown POST action: ' + action });
  } catch (err) {
    return jsonOutput({ success: false, error: err.toString() });
  } finally {
    if (hasLock) lock.releaseLock();
  }
}
