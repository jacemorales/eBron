# eBron – Covenant University Student Marketplace

eBron is an eBay-inspired student marketplace designed exclusively for students of Covenant University. It provides a secure, university-tailored platform for verified students to buy, sell, communicate in real time, arrange on-campus hostel deliveries, and transact securely through an escrow-backed financial system.

---

## 1. Key Features & Architecture

- **Unified Student Accounts**:
  - Every student account seamlessly handles both buying and selling without needing separate profiles.
  - Strict institutional authentication: only valid `@stu.cu.edu.ng` email addresses are permitted.
  - Dynamic hall of residence assignment:
    - **Male Halls**: Peter, John, Paul, Daniel, Joseph, Joshua.
    - **Female Halls**: Mary, Lydia, Deborah.

- **Dual-Balance Financial Architecture (Strict Separation of Funds)**:
  - **Buyer Spending Wallet (`Wallets` & `WalletTransactions`)**:
    - Dedicated to shopping capital.
    - Funded via verified Paystack checkout. Funds are strictly earmarked for marketplace purchases and cannot be withdrawn.
  - **Seller Sales Balance (`SalesBalances` & `SalesTransactions`)**:
    - Dedicated to earned sales revenue.
    - Purchase amounts are initially held in **Pending Balance** in escrow until dual confirmation.
    - Once both seller (item handed over) and buyer (item received) confirm the transaction, funds move to **Available Balance** and become eligible for bank withdrawal.

- **Order Cancellations & Administrative Refunds**:
  - **Buyer Cancellation**: Buyers can request order cancellation from **Pending Purchases** with standard reason options and an optional explanation.
  - **Seller Cancellation**: Sellers can cancel pending sales from **Pending Sales** with standard reason options.
  - **Escrow Freeze**: The order status transitions to `refund_pending_approval`, preventing delivery confirmations and duplicate cancellation requests.
  - **Admin Refund Approval**: In the Admin Dashboard Transactions area, administrators can approve or reject refund requests. Approval automatically credits the buyer's wallet, reverses the seller's pending escrow balance, and restores product inventory.

- **Financial Security & Duplicate Transaction Protection**:
  - **Script Lock**: All monetary operations (wallet top-ups, purchases, escrow releases, refunds, withdrawal requests, and payouts) acquire `LockService.getScriptLock()` with a 15–20s timeout in Google Apps Script.
  - **Server-Side Idempotency**: Prevents double-spending, duplicate sale confirmations, and repeated wallet credits. If an order's seller confirmation is already timestamped, subsequent clicks do not credit the seller's sales balance.
  - **In-Flight UI Button Locks & Spinners**: Immediate button disablement and animated loading spinners prevent duplicate requests during network transit.

- **Central Financial Ledger & Automated Reconciliation**:
  - All monetary events are recorded in the central `Transactions` sheet.
  - Each entry maintains a persistent JSON `statusHistory` audit trail preserving every status transition with timestamps and reasons.
  - **Reconciliation Engine**: Transactions where Paystack succeeded but eBron fulfillment encountered client or network interruptions can be reconciled with one click in the Admin Dashboard, crediting the user's wallet safely without recharging.

- **Optimized Bank Withdrawals (Opay, Moniepoint, PalmPay)**:
  - Bank payouts are strictly restricted to **Opay** (`999992`), **Moniepoint** (`50515`), and **PalmPay** (`999991`) for guaranteed and faster processing.
  - Enforces strict 10-numerical-digit account number validation (`/^\d{10}$/`).
  - Available sales funds are locked/reserved immediately upon withdrawal request to prevent double-spending.
  - Real Paystack transfer execution is deferred to administrative approval.
  - **Approve All Bulk Payouts**: Administrators can approve all pending withdrawals in bulk, with each request executed independently and summarized in a detailed execution dialog.
  - If a transfer fails or is rejected, funds are automatically restored to the seller's available balance.

- **Multi-Unit Inventory & Stock Management**:
  - Listings track `initialStock`, `availableStock`, `soldQuantity`, and `stockStatus` (`in_stock` vs `sold_out`).
  - Real-time stock decrement upon purchase with strict overselling prevention.
  - Sold-out listings are automatically badged as **Sold Out** and hidden from public marketplace browsing, while remaining visible in the seller's catalog and administrative panels.

- **Automated Paystack Withdrawals**:
  - Sellers initiate payout requests directly to their Nigerian bank account.
  - Live bank selection dropdown and real-time Paystack NUBAN account name resolution (`/bank/resolve`).
  - Withdrawals are processed server-side in Google Apps Script using the Paystack Transfers API (`/transferrecipient` and `/transfer`).
  - If a transfer fails or is rejected by an administrator, funds are automatically reversed to the seller's available sales balance.

- **Account Deactivation, Enforcement & Appeals**:
  - Administrators can deactivate or reactivate user accounts directly from the Admin Dashboard Users tab.
  - Deactivated accounts are blocked from listing products, placing orders, sending messages, or confirming deliveries.
  - Deactivated students can submit an appeal with an explanation directly from the login page.
  - Pending appeals are reviewed directly inside the Users tab with full student details.

- **Consolidated Messaging & Notifications**:
  - Chat threads and individual messages are unified inside a single `Messages` sheet.
  - In-app notification alerts and web-push subscriptions are consolidated into a single `Notifications` sheet.

- **Primary Database**: Google Sheets operated via Google Apps Script (GAS) Web App (`backend/Code.gs`).

---

## 2. Google Sheets Database Blueprint (16 Sheets)

The database consists of 16 structured sheets. To initialize or update your spreadsheet automatically, run `setupDatabase()` or `initializeAllSheets()` in `backend/Code.gs`.

### Sheet 1: `Users`
- **Purpose**: Student accounts, administrative roles, residence details, and security credentials.
- **Columns (in exact order)**:
  `userId`, `fullName`, `regNumber`, `matricNumber`, `schoolEmail`, `gender`, `hallOfResidence`, `roomNumber`, `passwordHash`, `salt`, `role`, `status`, `createdAt`, `updatedAt`
- **Roles**: `'student'`, `'admin'`.
- **Statuses**: `'active'`, `'suspended'`, `'deactivated'`.

### Sheet 2: `Products`
- **Purpose**: Marketplace catalog with pricing, stock quantity tracking, condition, and soft-delete flags.
- **Columns (in exact order)**:
  `productId`, `sellerId`, `name`, `description`, `category`, `price`, `condition`, `stockNumber`, `initialStock`, `availableStock`, `soldQuantity`, `stockStatus`, `primaryImageUrl`, `availability`, `status`, `viewsCount`, `createdAt`, `updatedAt`
- **Condition**: `'New'`, `'Fairly Used'`, `'Used'`.
- **Stock Status**: `'in_stock'`, `'sold_out'`.
- **Availability**: `'available'`, `'sold'`, `'reserved'`.
- **Status**: `'active'`, `'deleted'` (soft-deletion preserves order history).

### Sheet 3: `ProductImages`
- **Purpose**: Secondary and gallery images for multi-image product listings.
- **Columns (in exact order)**:
  `imageId`, `productId`, `imageUrl`, `isPrimary`, `createdAt`

### Sheet 4: `SavedItems`
- **Purpose**: Student wishlists and bookmarked products.
- **Columns (in exact order)**:
  `savedId`, `userId`, `productId`, `createdAt`

### Sheet 5: `Messages` (Consolidated Chat & Conversations)
- **Purpose**: Stores conversation threads and individual chat messages in a unified structure.
- **Columns (in exact order)**:
  `conversationId`, `messageId`, `productId`, `productName`, `productPrice`, `productImage`, `buyerId`, `buyerName`, `sellerId`, `sellerName`, `senderId`, `receiverId`, `content`, `isRead`, `createdAt`
- **Row conventions**:
  - **Conversation Header**: `messageId` is empty; product and participant columns are populated.
  - **Message Item**: `messageId` is populated; sender, receiver, message content, and read receipt are set.

### Sheet 6: `Orders`
- **Purpose**: Purchase records, delivery information, payment references, confirmation timestamps, cancellations, and refunds.
- **Columns (in exact order)**:
  `orderId`, `orderReference`, `productId`, `productName`, `productImage`, `buyerId`, `buyerName`, `sellerId`, `sellerName`, `amount`, `quantity`, `status`, `paymentMode`, `paymentRef`, `deliveryFullName`, `deliveryGender`, `deliveryHall`, `deliveryRoom`, `sellerConfirmedAt`, `buyerConfirmedAt`, `completedAt`, `cancellationRequestedBy`, `cancellationReason`, `cancellationExplanation`, `cancellationRequestedAt`, `refundStatus`, `refundAdminNotes`, `refundProcessedAt`, `disputeReason`, `createdAt`, `updatedAt`
- **Order Statuses**: `'awaiting_payment'`, `'payment_successful'`, `'awaiting_seller_confirmation'`, `'awaiting_buyer_confirmation'`, `'refund_pending_approval'`, `'refunded'`, `'completed'`, `'cancelled'`, `'disputed'`.
- **Refund Statuses**: `'none'`, `'pending_approval'`, `'approved'`, `'rejected'`.
- **Cancellation Requester**: `'buyer'`, `'seller'`.

### Sheet 7: `Wallets` (Buyer Spending Accounts)
- **Purpose**: Tracks student buyer shopping capital. Funds can only be spent on marketplace purchases.
- **Columns (in exact order)**:
  `walletId`, `userId`, `availableBalance`, `updatedAt`

### Sheet 8: `WalletTransactions` (Buyer Top-ups, Deductions & Refunds)
- **Purpose**: Audit trail for buyer wallet funding, order deductions, and refund credits.
- **Columns (in exact order)**:
  `transactionId`, `userId`, `type`, `amount`, `reference`, `status`, `description`, `createdAt`
- **Transaction Types**: `'topup'`, `'purchase_deduction'`, `'refund_credit'`.

### Sheet 9: `SalesBalances` (Seller Escrow & Earnings)
- **Purpose**: Tracks seller revenue, separating pending escrow amounts from withdrawable sales earnings.
- **Columns (in exact order)**:
  `salesBalanceId`, `userId`, `availableBalance`, `pendingBalance`, `totalEarnings`, `totalWithdrawals`, `updatedAt`

### Sheet 10: `SalesTransactions` (Seller Income Ledger)
- **Purpose**: Granular ledger of seller sales credits, escrow releases upon dual confirmation, and processed withdrawals.
- **Columns (in exact order)**:
  `transactionId`, `sellerId`, `orderId`, `orderReference`, `amount`, `type`, `status`, `createdAt`
- **Transaction Types**: `'pending_sale'`, `'released_sale'`, `'withdrawal'`, `'cancelled_sale'`.

### Sheet 11: `WithdrawalRequests` (Paystack Bank Payouts)
- **Purpose**: Bank transfer payout requests submitted by sellers from their available sales balance.
- **Columns (in exact order)**:
  `requestId`, `userId`, `userName`, `userEmail`, `amount`, `bankName`, `bankCode`, `accountNumber`, `accountName`, `status`, `reference`, `paystackRecipientCode`, `paystackTransferCode`, `paystackStatus`, `adminNotes`, `processedAt`, `createdAt`
- **Statuses**: `'pending'`, `'processing'`, `'successful'`, `'failed'`, `'rejected'`, `'processed'`.

### Sheet 12: `Appeals` (Account Deactivation Appeals)
- **Purpose**: Formal appeals submitted by deactivated or suspended students for administrative review.
- **Columns (in exact order)**:
  `appealId`, `userId`, `userName`, `schoolEmail`, `explanation`, `status`, `adminNotes`, `reviewedBy`, `reviewedAt`, `createdAt`
- **Statuses**: `'pending'`, `'approved'`, `'rejected'`.

### Sheet 13: `Notifications` (Consolidated In-App & Web Push)
- **Purpose**: Unified store for in-app alert notifications and browser push subscriptions.
- **Columns (in exact order)**:
  `notificationId`, `userId`, `title`, `message`, `type`, `destinationUrl`, `isRead`, `createdAt`, `subscriptionId`, `endpoint`, `p256dh`, `auth`, `enabled`, `updatedAt`
- **Row conventions**:
  - **Notification Item**: `notificationId` is set; `subscriptionId` is empty.
  - **Push Subscription**: `subscriptionId` is set; `title = 'PUSH_SUBSCRIPTION'`.

### Sheet 14: `Reports`
- **Purpose**: Product listings flagged for fraud, prohibited items, or description discrepancies.
- **Columns (in exact order)**:
  `reportId`, `productId`, `productName`, `productStockNumber`, `productImage`, `sellerId`, `sellerName`, `reporterId`, `reporterEmail`, `category`, `explanation`, `status`, `adminNotes`, `createdAt`, `updatedAt`
- **Statuses**: `'pending'`, `'under_review'`, `'resolved'`, `'dismissed'`.

### Sheet 15: `AdminLogs`
- **Purpose**: Audit trail of administrative actions (account status modifications, listing takedowns, refund decisions, and transfer approvals).
- **Columns (in exact order)**:
  `logId`, `adminId`, `action`, `details`, `targetId`, `ipAddress`, `createdAt`

### Sheet 16: `Transactions` (Central Financial Ledger & Reconciliation)
- **Purpose**: Comprehensive, tamper-evident ledger of every monetary movement across eBron with complete transition history.
- **Columns (in exact order)**:
  `transactionId`, `reference`, `userId`, `buyerId`, `sellerId`, `productId`, `orderId`, `type`, `amount`, `paymentMethod`, `paymentProvider`, `eBronStatus`, `paystackStatus`, `statusHistory`, `createdAt`, `updatedAt`, `verificationDetails`, `errorMessage`
- **Types**: `'topup'`, `'purchase'`, `'refund'`, `'sales_credit'`, `'withdrawal'`, `'withdrawal_request'`.
- **eBron Statuses**: `'pending'`, `'completed'`, `'failed'`, `'requires_reconciliation'`, `'rejected'`.
- **statusHistory**: A JSON-serialized array preserving each sequential state change (timestamp, status, reason/error).

---

## 3. Installation & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher.
- **Google Account**: Access to Google Sheets and Google Apps Script.
- **Paystack Account**: For payments and automated bank transfers.

### 1. Install Dependencies
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure Frontend Environment (`frontend/.env`)
Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=https://script.google.com/macros/s/<YOUR_DEPLOYMENT_ID>/exec
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Deploy Google Apps Script (`backend/Code.gs` & `backend/appsscript.json`)
1. Create a new Google Spreadsheet in Google Drive (or use an existing one).
2. Open **Extensions > Apps Script**.
3. Replace the script editor contents with the entire content of [`backend/Code.gs`](file:///c:/Users/Ajuna/OneDrive/Documents/jace/eBron/backend/Code.gs).
4. Configure the Manifest File (`appsscript.json`):
   - In Apps Script, click **Project Settings** (gear icon on the left sidebar).
   - Check the box **"Show 'appsscript.json' manifest file in editor"**.
   - Return to the **Editor** tab, select `appsscript.json`, and paste the contents of [`backend/appsscript.json`](file:///c:/Users/Ajuna/OneDrive/Documents/jace/eBron/backend/appsscript.json):
     ```json
     {
       "timeZone": "Africa/Lagos",
       "dependencies": {},
       "exceptionLogging": "STACKDRIVER",
       "runtimeVersion": "V8",
       "webapp": {
         "executeAs": "USER_DEPLOYING",
         "access": "ANYONE"
       },
       "oauthScopes": [
         "https://www.googleapis.com/auth/spreadsheets",
         "https://www.googleapis.com/auth/script.external_request",
         "https://www.googleapis.com/auth/script.scriptapp"
       ]
     }
     ```
     > **Note**: The `https://www.googleapis.com/auth/script.external_request` scope grants authorization for `UrlFetchApp.fetch`, enabling bank resolution, payment verification, and automated Paystack transfers without permission errors.
5. Set your spreadsheet ID at the top of `backend/Code.gs`:
   ```javascript
   var SPREADSHEET_ID = 'YOUR_GOOGLE_SPREADSHEET_ID';
   ```
6. Configure Paystack Secret Key:
   - Navigate to **Project Settings > Script Properties** in Apps Script.
   - Add property: `PAYSTACK_SECRET_KEY` = `sk_test_...` (or `sk_live_...`).
7. Run `initializeAllSheets` or `setupDatabase` once from the Apps Script editor to auto-create and format all 16 sheets.
8. Click **Deploy > New deployment**:
   - **Type**: Web app
   - **Description**: eBron Production API
   - **Execute as**: Me
   - **Who has access**: Anyone
9. Copy the **Web App URL** and paste it into `frontend/.env` as `VITE_API_URL`.

---

## 4. Default Administrator Credentials

Administrator credentials and roles are verified directly in the `Users` sheet in Google Sheets (where `role = 'admin'`).

| Field | Default Administrator Value |
|---|---|
| `userId` | `u_admin_001` |
| `fullName` | `Covenant University Admin` |
| `regNumber` | `ADM/2026/01` |
| `matricNumber` | `CU/ADM/001` |
| `schoolEmail` | `admin@stu.cu.edu.ng` |
| `gender` | `Male` |
| `hallOfResidence` | `Peter` |
| `roomNumber` | `ADM-01` |
| `passwordHash` | `414777a8848d6db3866b1a13e2bb97f5a9f242d5e272a8069502b489a202dfb8` |
| `salt` | `covenant_admin_salt` |
| `role` | `admin` |
| `status` | `active` |

> Default password for template credentials: `AdminPassword123!`

---

## 5. Verification & Testing

### Backend Unit Tests
Execute the comprehensive Node.js unit test suite:
```bash
npm run test:backend
```
The test suite validates:
- Database schema coverage and column presence across all 15 sheets.
- Covenant University student email and hostel assignment validations.
- Buyer wallet top-up, deduction, and refund credits.
- Seller sales balance pending escrow and availability release.
- Order creation balance validation and multi-quantity calculations.
- Buyer and seller cancellation requests with status locking.
- Admin refund approval (balance reversal, wallet credit, stock restoration).
- Admin refund rejection (order reactivation with notes).
- Multi-unit inventory initialization, decrement, and overselling protection.
- Marketplace filtering (hiding sold-out products from public browse).
- Paystack transfer handling (success, bank failure, admin rejection).
- Account deactivation enforcement, duplicate appeal prevention, and reactivation.

### Frontend Production Build
Validate TypeScript typings and compile the frontend production bundle:
```bash
cd frontend
npm run build
```

---

## 6. Technical Troubleshooting & Best Practices

- **CORS Handling with Google Apps Script**:
  - Google Apps Script Web Apps do not respond to HTTP `OPTIONS` preflight requests.
  - In `frontend/src/services/api.ts`, all POST payloads are serialized as JSON strings with `headers: { 'Content-Type': 'text/plain;charset=utf-8' }`. This qualifies as a standard simple request, eliminating browser CORS preflight blocks.
- **Paystack Secret Key Security**:
  - Payout transfers and transaction verification are executed server-side in `backend/Code.gs`. The Paystack secret key must **never** be exposed in client code or frontend `.env` files.
- **Redeploying Google Apps Script**:
  - Whenever you modify `backend/Code.gs`, you must create a new deployment version:
    **Deploy > Manage deployments > Edit > Version: New version > Deploy**.
