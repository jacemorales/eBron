/**
 * eBron - Student Marketplace
 * Google Sheets Database Setup & Schema Definitions
 */

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
    'role', // 'student' | 'admin'
    'status', // 'active' | 'suspended'
    'createdAt',
    'updatedAt'
  ],
  Products: [
    'productId',
    'sellerId',
    'name',
    'description',
    'category',
    'price',
    'condition', // 'New' | 'Fairly Used' | 'Used'
    'stockNumber', // Optional stock reference
    'primaryImageUrl',
    'availability', // 'available' | 'sold' | 'reserved'
    'status', // 'active' | 'deleted' (soft delete)
    'viewsCount',
    'createdAt',
    'updatedAt'
  ],
  ProductImages: [
    'imageId',
    'productId',
    'imageUrl',
    'isPrimary',
    'createdAt'
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
    'buyerId',
    'sellerId',
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
    'buyerId',
    'sellerId',
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
    'createdAt',
    'updatedAt'
  ],
  Transactions: [
    'transactionId',
    'orderId',
    'orderReference',
    'type', // 'payment' | 'escrow_hold' | 'balance_release' | 'withdrawal'
    'fromUserId',
    'toUserId',
    'amount',
    'status', // 'pending' | 'completed' | 'cancelled'
    'mode', // 'TEST_MODE' | 'REAL'
    'notes',
    'createdAt'
  ],
  // Buyer spending wallet
  Wallets: [
    'walletId',
    'userId',
    'availableBalance', // Buyer spending funds exclusively
    'updatedAt'
  ],
  // Buyer wallet top-ups & purchase deductions
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
  // Seller sales balance
  SalesBalances: [
    'salesBalanceId',
    'userId',
    'availableBalance', // Confirmed sales income available for withdrawal
    'pendingBalance', // Sales income pending dual confirmation
    'totalEarnings',
    'totalWithdrawals',
    'updatedAt'
  ],
  // Seller income and withdrawal records
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
  AdminLogs: [
    'logId',
    'adminId',
    'action',
    'details',
    'targetId',
    'ipAddress',
    'createdAt'
  ]
};

function setupDatabase(spreadsheet) {
  var ss = spreadsheet || (typeof SpreadsheetApp !== 'undefined' ? SpreadsheetApp.getActiveSpreadsheet() : null);
  if (!ss) throw new Error('SpreadsheetApp is not available');
  var sheetNames = Object.keys(SHEETS_SCHEMA);

  sheetNames.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    var headers = SHEETS_SCHEMA[sheetName];
    if (!sheet) sheet = ss.insertSheet(sheetName);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }
  });

  return { success: true, message: 'eBron database initialized successfully.' };
}

export { SHEETS_SCHEMA, setupDatabase };
