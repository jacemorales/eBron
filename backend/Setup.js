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
    'status', // 'active' | 'suspended' | 'deactivated'
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
    'initialStock',
    'availableStock',
    'soldQuantity',
    'stockStatus', // 'in_stock' | 'sold_out'
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
  // Unified Messages sheet: conversation rows (empty messageId) + message rows.
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
  // Seller sales balance
  SalesBalances: [
    'salesBalanceId',
    'userId',
    'availableBalance', // Confirmed sales income available for withdrawal
    'pendingBalance', // Sales income pending dual confirmation
    'reservedBalance', // Funds reserved by pending withdrawal requests (not yet paid out)
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
    'verificationDetails', // JSON payload
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
    'status', // 'pending' | 'processing' | 'successful' | 'failed' | 'rejected' | 'reversed' | 'cancelled'
    'reference',
    'paystackRecipientCode',
    'paystackTransferCode',
    'paystackStatus',
    'paymentMethod', // '' (undecided) | 'paystack' | 'manual_bank_transfer'
    'adminId', // Admin approval ID
    'manualConfirmedBy', // Admin who confirmed a manual bank transfer completed
    'manualConfirmedAt', // Timestamp of that manual confirmation
    'rejectionReason', // Reason provided when an admin rejects the request
    'failureReason', // Reason a (manual or Paystack) transfer failed
    'adminNotes',
    'processedAt', // Admin decision date
    'completedAt', // Completion timestamp (successful payout)
    'createdAt', // Request timestamp
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
  // Unified Notifications sheet: notification rows (notificationId set) +
  // web-push subscription rows (subscriptionId set).
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
    } else {
      // Append any missing header columns to existing sheets without disturbing data
      var lastCol = Math.max(1, sheet.getLastColumn());
      var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
      headers.forEach(function(h) {
        if (existingHeaders.indexOf(h) === -1) {
          var newCol = sheet.getLastColumn() + 1;
          sheet.getRange(1, newCol).setValue(h);
        }
      });
    }
  });

  // Remove sheets retired after the table merges (Conversations -> Messages,
  // NotificationSubscriptions -> Notifications).
  var obsoleteSheets = ['Conversations', 'NotificationSubscriptions'];
  var removed = [];
  obsoleteSheets.forEach(function(sheetName) {
    var dead = ss.getSheetByName(sheetName);
    if (dead) {
      ss.deleteSheet(dead);
      removed.push(sheetName);
    }
  });

  return { success: true, message: 'eBron database initialized successfully.', removedSheets: removed };
}

export { SHEETS_SCHEMA, setupDatabase };
