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

- **Centralized & Configurable Fee Structure (Wallet Top-Ups & Seller Payouts)**:
  - **Dynamic Single Source of Truth**: All percentage charges, flat fees, and amount ranges are centrally managed in the **`FeeConfig`** Google Sheet tab. Any adjustments or new amount tiers made directly in the spreadsheet take effect immediately across the application without modifying code or re-deploying.
  - **Integer Kobo Precision**: All calculations convert Naira to integer kobo (`Math.round(amount * 100)`) prior to rate multiplication to eliminate floating-point rounding issues.
  - **Wallet Top-Up Progressive Fee Tiers (Buyer Deposits)**:
    | Top-Up Amount | Percentage Fee | Flat Gateway Cost |
    |---|---:|---:|
    | Below ₦5,000 | 2.5% | ₦200 |
    | ₦5,000 – ₦29,999.99 | 3.0% | ₦200 |
    | ₦30,000 – ₦99,999.99 | 3.5% | ₦200 |
    | ₦100,000 and above | 4.0% | ₦2,000 |
    - **Formula**: `Total Top-Up Charge = (Top-Up Amount × Percentage Fee) + Flat Gateway Cost`; `Total Payment = Top-Up Amount + Total Top-Up Charge`.
    - **Balance Isolation**: Only the intended deposit amount is credited to the buyer's spendable wallet (`Wallets.availableBalance`). Deposit fees are paid to Paystack and isolated in `WalletTransactions` and `Transactions` records.
  - **Seller Payout Progressive Fee Tiers (Bank Withdrawals)**:
    | Payout Amount | Service Charge | Flat Transfer Fee |
    |---|---:|---:|
    | Below ₦5,000 | 6.0% | ₦100 |
    | ₦5,000 – ₦24,999.99 | 5.0% | ₦100 |
    | ₦25,000 – ₦79,999.99 | 6.0% | ₦200 |
    | ₦80,000 and above | 5.0% | ₦500 |
    - **Formula**: `Percentage Charge = Payout Amount × Applicable Percentage`; `Total Payout Fee = Percentage Charge + Flat Transfer Fee`; `Net Payout = Payout Amount - Total Payout Fee`.
    - **Positive Net Payout Enforcement**: The withdrawal amount must strictly exceed total fee deductions (`Net Payout > 0`). Requests where deductions meet or exceed the requested amount are rejected.
    - **Reservation & Transfer Integrity**: The full requested amount is reserved from the seller's available sales balance upon submission. Upon admin approval, the **Net Payout** is transferred to the seller's bank account (via Paystack automated transfer or manual bank transfer), and the full reserved amount is finalized. If cancelled or rejected, the full reserved amount is restored to available balance.
  - **Historical Fee Snapshot Invariance**: Every transaction and withdrawal request persists a serialized `feeSnapshot` and granular fee fields (`feePercentage`, `percentageFee`, `flatFee`, `totalFee`, `netAmount`, `totalAmountPaid`). Subsequent modifications to fee configuration tiers never retroactively change historical transaction records.
  - **Live Transparency Throughout UI**:
    - Buyer Top-Up modal renders real-time calculation cards showing Intended Credit, Service Charge %, Flat Gateway Cost, Total Deposit Charges, and Final Payable Amount.
    - Seller Withdrawal modal shows Requested Amount, Platform Service Charge %, Flat Transfer Fee, Total Deductions, and Net Payout amount before submission.
    - Admin Withdrawal Approval dialog explicitly presents Requested Amount, Deductions, and Net Bank Transfer Amount for both Paystack and manual transfer flows.

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

- **Simplified & Safe Bank Withdrawals (Opay, Moniepoint, PalmPay)**:
  - Bank payouts are strictly restricted to **Opay** (`999992`), **Moniepoint** (`50515`), and **PalmPay** (`999991`) for guaranteed and faster processing.
  - Enforces strict 10-numerical-digit account number validation (`/^\d{10}$/`).
  - **Submitting a withdrawal request NEVER contacts Paystack.** The request is written to the `WithdrawalRequests` sheet with status `Pending Approval`, and the requested amount is moved from **Available** to **Reserved** immediately (preventing double-spending) — but no recipient is created, no transfer is initiated, and no funds are permanently deducted.
  - For safety, the amount stays reserved if a transfer fails (funds are never lost or duplicated) and can be safely retried.
  - **Approve All Bulk Payouts**: Administrators can approve all pending withdrawals in bulk, with each request executed independently through the same backend workflow and summarized in a detailed execution dialog.
  - Rejecting a request releases the reserved amount back to the seller's available balance.
  - **Seller-Initiated Cancellation**: A seller can cancel their own request from **Sales Balance** while it is still awaiting approval (status `pending`, or `failed` without a Paystack transfer code). Cancelling sets the status to `Cancelled`, releases the reserved amount back to **Available**, records the cancellation in the withdrawal history **and** the central `Transactions` ledger, and notifies the seller. Requests already paid out, in `processing`, already `rejected`/`reversed`, or a `failed` request that produced a transfer code **cannot** be cancelled. Cancelling an already-cancelled request is a safe no-op and can never release funds twice.

- **Admin-Approved Withdrawal Payouts — Paystack OR Manual Bank Transfer**:
  - Clicking **Approve** opens a method-selection modal. The administrator **must** explicitly choose **Paystack Transfer** or **Manual Bank Transfer** — there is no default and the method cannot be switched once processing starts.
  - **Paystack path (automated)**: Paystack is called **only after an administrator explicitly approves** a request, using one shared backend helper (`processSingleWithdrawalApproval`) for both individual and bulk approvals. On approval the request is moved to `Processing` **before** any Paystack call, the recipient is created/retrieved, and a transfer is initiated with a unique reference. A request is only marked `Successful` once the transfer is confirmed; if it fails, the exact error is recorded, the status becomes `Failed`, and funds remain reserved for investigation/safe retry. The Paystack secret key is read server-side only and is never exposed to the frontend.
  - **Manual bank transfer path (owner action)**: The modal shows the real saved payout details — the seller's full name, amount, bank name, account number, withdrawal reference, and request date. The administrator transfers the funds out-of-band, then records the outcome:
    - **I Have Transferred** opens a confirmation step; confirming marks the request `Successful`, sets `paymentMethod = manual_bank_transfer`, records the confirming admin (`manualConfirmedBy`) and timestamp (`manualConfirmedAt`), finalizes the reserved-balance deduction, writes to the history + `Transactions` ledger, and notifies the seller. eBron **never** marks a manual transfer successful without this explicit admin confirmation.
    - **Transfer Failed** requires a failure explanation, saves it as `failureReason`, sets the status to `Failed`, releases the reserved amount back to Available (because no payment was made), and notifies the seller so they can safely retry.
  - The same safeguards apply to both methods: money is never released or deducted twice, a request cannot be processed by both methods, and the responsible administrator is always recorded.

- **Live Pending Counters in Navigation**:
  - The **Pending Purchases** and **Pending Sales** navigation entries show a live count for the signed-in user, polled every 10 seconds and refreshed on navigation.
  - Counts are computed server-side per-user (endpoint `getPendingCounts`) from real saved order data and exclude any order that is already `completed`, `cancelled`, `refunded`, or `rejected`, so the badge hides automatically when there is nothing pending. Because they are derived from the shared sheet, they stay consistent across sessions and devices.

- **Multi-Unit Inventory & Stock Management**:
  - Listings track `initialStock`, `availableStock`, `soldQuantity`, and `stockStatus` (`in_stock` vs `sold_out`).
  - Real-time stock decrement upon purchase with strict overselling prevention.
  - Sold-out listings are automatically badged as **Sold Out** and hidden from public marketplace browsing, while remaining visible in the seller's catalog and administrative panels.

- **Account Deactivation, Enforcement & Appeals**:
  - Administrators can deactivate or reactivate user accounts directly from the Admin Dashboard Users tab.
  - Deactivated accounts are blocked from listing products, placing orders, sending messages, or confirming deliveries.
  - Deactivated students can submit an appeal with an explanation directly from the login page.
  - Pending appeals are reviewed directly inside the Users tab with full student details.

- **Consolidated Messaging & Notifications**:
  - Chat threads and individual messages are unified inside a single `Messages` sheet.
  - In-app notification alerts and web-push subscriptions are consolidated into a single `Notifications` sheet.

- **User Feedback & Admin Triage**:
  - Authenticated students submit feedback from the **Guidelines & Safety** page across four categories: `Issue/Problem`, `Suggestion`, `Positive Feedback`, and `General Feedback`.
  - A feedback type and message are required; the student's ID, category, subject, message, and submission timestamp are stored in the `Feedback` sheet with an initial status of `New`.
  - Submissions are strictly private — a student only ever sees their own feedback (`getMyFeedback`), and admin notes are stripped from any non-admin response.
  - Administrators triage feedback in the **User Feedback** tab of the Admin Dashboard: search and filter by category, status, and submission date, view full messages, advance status between `New` → `Under Review` → `Resolved`, and attach internal admin notes.
  - Admins are notified in-app when new feedback arrives.

- **Primary Database**: Google Sheets operated via Google Apps Script (GAS) Web App (`backend/Code.gs`).

---

## 2. Google Sheets Database Blueprint (18 Sheets)

The database consists of 18 structured sheets. To initialize or update your spreadsheet automatically, run `setupDatabase()` or `initializeAllSheets()` in `backend/Code.gs`.

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
- **Purpose**: Audit trail for buyer wallet funding, order deductions, and refund credits with detailed fee breakdowns.
- **Columns (in exact order)**:
  `transactionId`, `userId`, `type`, `amount`, `feePercentage`, `percentageFee`, `flatFee`, `totalFee`, `totalAmountPaid`, `feeSnapshot`, `reference`, `status`, `description`, `createdAt`
- **Transaction Types**: `'topup'`, `'purchase_deduction'`, `'refund_credit'`.

### Sheet 9: `SalesBalances` (Seller Escrow & Earnings)
- **Purpose**: Tracks seller revenue, separating pending escrow amounts, withdrawable earnings, and funds reserved by pending withdrawal requests.
- **Columns (in exact order)**:
  `salesBalanceId`, `userId`, `availableBalance`, `pendingBalance`, `reservedBalance`, `totalEarnings`, `totalWithdrawals`, `updatedAt`

### Sheet 10: `SalesTransactions` (Seller Income Ledger)
- **Purpose**: Granular ledger of seller sales credits, escrow releases upon dual confirmation, and processed withdrawals.
- **Columns (in exact order)**:
  `transactionId`, `sellerId`, `orderId`, `orderReference`, `amount`, `type`, `status`, `createdAt`
- **Transaction Types**: `'pending_sale'`, `'released_sale'`, `'withdrawal'`, `'cancelled_sale'`.

### Sheet 11: `WithdrawalRequests` (Admin-Approved Bank Payouts)
- **Purpose**: Bank transfer payout requests submitted by sellers from their available sales balance, including fee deductions, net payout tracking, and the full admin-approval lifecycle for **both** Paystack and manual bank transfers, including cancellations.
- **Columns (in exact order)**:
  `requestId`, `userId`, `userName`, `userRegNumber`, `userEmail`, `amount`, `feePercentage`, `percentageFee`, `flatFee`, `totalFee`, `netAmount`, `feeSnapshot`, `bankName`, `bankCode`, `accountNumber`, `accountName`, `status`, `reference`, `paystackRecipientCode`, `paystackTransferCode`, `paystackStatus`, `paymentMethod`, `adminId`, `manualConfirmedBy`, `manualConfirmedAt`, `rejectionReason`, `failureReason`, `adminNotes`, `processedAt`, `completedAt`, `createdAt`, `updatedAt`
- **Statuses**: `'pending'` (Pending Approval), `'processing'`, `'successful'`, `'failed'`, `'rejected'`, `'reversed'`, `'cancelled'`.
- **`paymentMethod`**: `''` (undecided), `'paystack'`, or `'manual_bank_transfer'`. Set when an administrator chooses the payout method and never switched once processing begins.
- **`netAmount`**: The actual net amount transferred to the seller's bank account after platform fee deductions.
- **`adminId`**: administrator who approved/rejected the request. **`manualConfirmedBy` / `manualConfirmedAt`**: the administrator and timestamp that confirmed a manual bank transfer actually completed. **`failureReason`**: reason a manual or Paystack transfer failed, or the reason a request was cancelled.

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
- **Purpose**: Comprehensive, tamper-evident ledger of every monetary movement across eBron with complete transition history and fee tracking.
- **Columns (in exact order)**:
  `transactionId`, `reference`, `userId`, `buyerId`, `sellerId`, `productId`, `orderId`, `type`, `amount`, `feePercentage`, `percentageFee`, `flatFee`, `totalFee`, `netAmount`, `totalAmountPaid`, `feeSnapshot`, `paymentMethod`, `paymentProvider`, `eBronStatus`, `paystackStatus`, `statusHistory`, `createdAt`, `updatedAt`, `verificationDetails`, `errorMessage`
- **Types**: `'topup'`, `'purchase'`, `'refund'`, `'sales_credit'`, `'withdrawal'`, `'withdrawal_request'`.
- **eBron Statuses**: `'pending'`, `'completed'`, `'failed'`, `'requires_reconciliation'`, `'rejected'`.
- **statusHistory**: A JSON-serialized array preserving each sequential state change (timestamp, status, reason/error).

### Sheet 17: `Feedback` (User Feedback & Admin Triage)
- **Purpose**: Stores feedback submitted by authenticated students from the **Guidelines & Safety** page, with admin triage status and internal notes.
- **Columns (in exact order)**:
  `feedbackId`, `userId`, `userName`, `userEmail`, `type`, `subject`, `message`, `status`, `adminNotes`, `createdAt`, `updatedAt`
- **Feedback Types**: `'Issue/Problem'`, `'Suggestion'`, `'Positive Feedback'`, `'General Feedback'`.
- **Statuses**: `'New'`, `'Under Review'`, `'Resolved'`.
- **adminNotes**: Administrator-only internal notes. This column is never returned to non-admin requests (`getMyFeedback` strips it).

### Sheet 18: `FeeConfig` (Dynamic Fee Configuration & Amount Ranges)
- **Purpose**: Stores live, editable fee tiers for wallet top-ups and seller payouts. When populated, Google Apps Script dynamically loads fees directly from this sheet so administrators can adjust charges or add amount ranges without re-deploying code.
- **Columns (in exact order)**:
  `configId`, `category`, `min`, `max`, `percentage`, `flatFee`, `description`, `updatedAt`
- **Categories**: `'walletTopUp'`, `'sellerPayout'`.
- **Pre-population**: Running `setupDatabase()` automatically inserts default tier rows if the sheet is empty.

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
   - **Important**: The secret key must be the `sk_...` **secret** key (never the `pk_...` public key). It is read exclusively server-side by `paystackApiCall()` and is never sent to the frontend.
7. Run `initializeAllSheets` or `setupDatabase` once from the Apps Script editor to auto-create and format all 18 sheets. If you have an existing spreadsheet with data, `setupDatabase` safely detects and appends any missing fee columns (`feePercentage`, `percentageFee`, `flatFee`, `totalFee`, `netAmount`, `totalAmountPaid`, `feeSnapshot`) to existing sheets without clearing or disturbing historical rows.
8. Click **Deploy > New deployment**:
   - **Type**: Web app
   - **Description**: eBron Production API
   - **Execute as**: Me
   - **Who has access**: Anyone
9. Copy the **Web App URL** and paste it into `frontend/.env` as `VITE_API_URL`.

> **Required manual authorization step for bank withdrawals**: Live Paystack payouts call `UrlFetchApp.fetch()` inside `paystackApiCall()`, which needs the `https://www.googleapis.com/auth/script.external_request` scope. Adding this scope does **not** re-authorize an existing deployment — you must **(a)** confirm the scope is present in `appsscript.json`, **(b)** run any function once from the Apps Script editor and click **"Review permissions" → Allow** to grant/refresh authorization, and **(c)** create a **new deployment version** (**Deploy > Manage deployments > Edit > Version: New version > Deploy**) so the live Web App runs the updated code. Without this, withdrawals fail with a `UrlFetchApp` permission error.

### 4. Configure Paystack for Bank Transfers
Transfers (admin approvals) require more than a secret key. Complete all of the following in your Paystack dashboard and Apps Script project:

1. **Secret key (Script Property)** — In Apps Script **Project Settings > Script Properties**, set `PAYSTACK_SECRET_KEY` to your `sk_test_...` (testing) or `sk_live_...` (production) key. Never use the `pk_...` public key here and never place the secret key in the frontend.
2. **Transfers enabled** — In Paystack Dashboard, enable **Transfers** for your business/account. New accounts may require identity/business verification before transfers are permitted.
3. **Settlement/balance** — Ensure your Paystack balance has enough settled funds. Transfers fail when the available balance is insufficient.
4. **Optional transfer OTP** — Some Paystack accounts require a one-time transfer OTP. If enabled, transfers initiated by the API will return a `pending`/OTP-required response instead of completing immediately; eBron records the response and keeps the request for review rather than marking it successful.
5. **Webhook (recommended)** — In Paystack Dashboard **Settings > API Keys & Webhooks**, set your Webhook URL to the deployed Web App URL (`VITE_API_URL`). This lets Paystack notify eBron of asynchronous `transfer.success`, `transfer.failed`, and `transfer.reversed` events.
6. **Bank codes** — eBron supports only Opay (`999992`), Moniepoint (`50515`), and PalmPay (`999991`). These match Paystack's transfer recipient bank codes; if a code changes, update the supported-bank list in `backend/Code.gs` and the frontend.
7. **Safe testing** — Use **Test mode** keys first. Verify withdrawals end-to-end with test banks/Paystack test transfer recipients before switching to `sk_live_...`. Note that a test-mode transfer does not move real money.

> **Manual steps required before production withdrawals work** (none of these are automated):
> 1. Set `PAYSTACK_SECRET_KEY` in Script Properties (secret key only).
> 2. Confirm `appsscript.json` includes the `script.external_request` scope.
> 3. Authorize the scopes once (Run any function → **Review permissions → Allow**).
> 4. Create a **new deployment version** so the live Web App uses the updated code.
> 5. Enable **Transfers** and fund your Paystack balance (and resolve any transfer OTP/verification requirement).
> 6. Point the Paystack **Webhook** at the Web App URL (recommended for async status).
> 7. Run `initializeAllSheets()` once so all sheets (including the new withdrawal columns) exist in your spreadsheet.

### 5. Configure Manual Bank Transfers (no extra setup required)
Manual bank transfers need **no** Paystack configuration and **no** additional environment variables — they are performed by an administrator manually. Only the standard deployment below is required:

1. Ensure `initializeAllSheets()` has been run so `WithdrawalRequests` contains the `paymentMethod`, `manualConfirmedBy`, `manualConfirmedAt`, and `failureReason` columns (existing spreadsheets are migrated non-destructively — no existing data is lost).
2. Create a **new deployment version** of the Web App so the live backend serves the manual-transfer handlers (`cancelWithdrawal`, `processManualWithdrawal`).
3. When an administrator chooses **Manual Bank Transfer**, a human must transfer the funds to the seller's saved bank account (out-of-band, e.g. via the bank app) and then record **I Have Transferred** or **Transfer Failed** in the Admin Dashboard. eBron never performs a manual bank transfer automatically and never marks one successful without that explicit step.
4. Keep the seller's bank details accurate: manual transfers use the account details saved on the withdrawal request (full name, bank name, account number). Only Opay, Moniepoint and PalmPay are accepted.

### 6. Deployment steps (summary)
Do these in order whenever you update the backend:

1. Paste the latest `backend/Code.gs` into the Apps Script editor and save.
2. Set/confirm `SPREADSHEET_ID` and the `PAYSTACK_SECRET_KEY` Script Property.
3. Confirm `appsscript.json` includes the `script.external_request` scope and authorize once (**Review permissions → Allow**).
4. Run `initializeAllSheets()` / `setupDatabase()` once to create or non-destructively migrate every sheet (including the new withdrawal columns and `FeeConfig` sheet).
5. **Deploy > Manage deployments > Edit > Version: New version > Deploy** so the live Web App runs the updated code.
6. Update `frontend/.env` (`VITE_API_URL`, `VITE_PAYSTACK_PUBLIC_KEY`), then rebuild the frontend (`cd frontend && npm run build`).

---

## 4. How to Manage Service Charges & Add Amount Ranges (Google Sheets)

eBron allows administrators to manage wallet top-up and seller payout service charges dynamically via the **`FeeConfig`** Google Sheet tab. This enables you to adjust percentage rates, flat fees, or add new amount ranges on the fly without editing code or re-deploying Google Apps Script.

### 1. The `FeeConfig` Google Sheet Blueprint

Open your eBron Google Spreadsheet and switch to the **`FeeConfig`** tab (created and populated automatically when running `setupDatabase()`).

#### Columns (in exact order):
1. **`configId`**: Unique identifier for the tier (e.g. `cfg_topup_1`, `cfg_payout_1`).
2. **`category`**: Must be either `walletTopUp` (buyer deposits) or `sellerPayout` (seller bank withdrawals).
3. **`min`**: Start of amount range in Naira (e.g. `0`, `5000`, `100000`).
4. **`max`**: End of amount range in Naira (e.g. `5000`, `30000`). **Leave empty or blank for the highest unbounded tier**.
5. **`percentage`**: Service charge percentage (e.g. `2.5`, `3.0`, `5.0`).
6. **`flatFee`**: Flat fee in Naira (e.g. `200`, `100`, `2000`).
7. **`description`**: Human-readable label (e.g. `Under ₦5,000 deposit tier`).
8. **`updatedAt`**: ISO timestamp of last update (e.g. `2026-11-25T00:00:00.000Z`).

---

### 2. Concrete Example Values for the Spreadsheet

Here is an exact table of rows to paste or enter into your `FeeConfig` spreadsheet:

| configId | category | min | max | percentage | flatFee | description | updatedAt |
|---|---|---:|---:|---:|---:|---|---|
| `cfg_topup_1` | `walletTopUp` | 0 | 5000 | 2.5 | 200 | Under ₦5k deposit | `2026-11-25T00:00:00Z` |
| `cfg_topup_2` | `walletTopUp` | 5000 | 30000 | 3.0 | 200 | ₦5k – ₦30k deposit | `2026-11-25T00:00:00Z` |
| `cfg_topup_3` | `walletTopUp` | 30000 | 100000 | 3.5 | 200 | ₦30k – ₦100k deposit | `2026-11-25T00:00:00Z` |
| `cfg_topup_4` | `walletTopUp` | 100000 | 200000 | 2.0 | 2000 | ₦100k – ₦200k deposit | `2026-11-25T00:00:00Z` |
| `cfg_topup_5` | `walletTopUp` | 200000 | | 1.5 | 2000 | ₦200k+ deposit (unbounded) | `2026-11-25T00:00:00Z` |
| `cfg_payout_1` | `sellerPayout` | 0 | 5000 | 6.0 | 100 | Under ₦5k payout | `2026-11-25T00:00:00Z` |
| `cfg_payout_2` | `sellerPayout` | 5000 | 25000 | 5.0 | 100 | ₦5k – ₦25k payout | `2026-11-25T00:00:00Z` |
| `cfg_payout_3` | `sellerPayout` | 25000 | 80000 | 6.0 | 200 | ₦25k – ₦80k payout | `2026-11-25T00:00:00Z` |
| `cfg_payout_4` | `sellerPayout` | 80000 | | 5.0 | 500 | ₦80k+ payout (unbounded) | `2026-11-25T00:00:00Z` |

---

### 3. How to Adjust Charges or Add New Amount Ranges

1. **Changing a Rate or Flat Fee**:
   - Simply find the row in the `FeeConfig` sheet and edit the `percentage` or `flatFee` cell.
   - Example: To change the ₦5,000 – ₦30,000 top-up rate from `3.0%` to `2.8%`, click cell E3 and type `2.8`.
2. **Adding a New Amount Range**:
   - Insert a new row with the relevant `category` (`walletTopUp` or `sellerPayout`).
   - Enter `min` and `max` for the range.
   - Example: To add a ₦500,000 and above tier, insert a row:
     `cfg_topup_6` | `walletTopUp` | `500000` | (leave blank) | `1.0` | `2500` | `₦500k+ VIP tier`
   - Set the previous tier's `max` to `500000`. (Even if you leave `max` blank, the smart tier engine automatically clamps the lower tier's upper bound to the next tier's `min`).
3. **Instant Live Effect**:
   - Google Apps Script queries the `FeeConfig` sheet dynamically on every incoming request.
   - The frontend automatically fetches the updated schedule on launch and whenever the Top-Up or Withdrawal modal opens. Changes take effect immediately without building or re-deploying anything.

---

### 4. Network Glitch Protection (No 0-Fee Glitches)

To prevent any scenario where a student experiences poor network and tries to pay without the service charge:
1. **Frontend Button Locking**:
   - When a student opens the Top-Up or Withdrawal modal, the submit button is **strictly disabled** with a loading spinner while fees are verified from Google Sheets.
   - If the student's internet disconnects, the modal displays an error banner: *"Unable to Calculate Charges. Could not connect to Google Sheets."* along with a **Retry** button. The payment button remains completely locked and unclickable.
2. **Independent Backend Gatekeeper**:
   - Even if someone attempted to bypass the frontend and hit the backend API directly, Google Apps Script independently recalculates the total charge from the `FeeConfig` sheet and queries Paystack directly to verify the exact amount paid. If the user paid ₦10,000 on Paystack instead of the required ₦10,500, the backend immediately rejects the transaction and credits ₦0.

---



## 5. Withdrawal Workflow

### End-to-end lifecycle
```
User submits → eBron saves request (Available → Reserved)
→ Admin reviews → Admin chooses payout method
   ├─ Paystack Transfer  → Backend calls Paystack → verified → Successful  (automatic)
   └─ Manual Bank Transfer → Admin transfers out-of-band → records outcome
                            ├─ I Have Transferred → Successful
                            └─ Transfer Failed     → Failed (reserved released)
```
On rejection or cancellation: reserved funds return to the seller's available balance.

### Automatic eBron processes vs. manual owner actions
- **Automatic (eBron does this for you)**: request creation, reservation/validation, the Paystack recipient + transfer call on approval, Paystack status verification, balance finalisation, ledger/history writes, notifications, and all duplicate/monetary safeguards.
- **Manual owner actions (a human must do these)**: funding/verifying the Paystack business account, enabling Transfers, satisfying any transfer-OTP/business verification, **physically making a bank transfer when the Manual method is chosen**, and clicking **I Have Transferred**/**Transfer Failed** to record that outcome. eBron will **never** claim a manual transfer succeeded without that explicit confirmation. The list of manual steps below must be completed by the account owner outside the codebase.

### User side (never touches Paystack)
1. The seller opens **Sales Balance** and enters an amount, selects a supported bank, and a **10-digit account number**.
2. Validation (amount, sufficient available balance, bank, exactly 10 digits) runs on the client **and** the backend.
3. The backend generates a unique reference, writes the request with status `Pending Approval`, and moves the amount from **Available** to **Reserved**.
4. Admins are notified; the seller sees *"Your withdrawal request has been submitted successfully and is awaiting admin approval."*
5. Submitting performs **no** Paystack call, recipient creation, transfer initiation, or permanent deduction — and works even if Paystack is unavailable.
6. **Cancelling before approval**: while the request is still `pending` (or `failed` without a Paystack transfer code) the seller can cancel it from **Sales Balance**. This sets the status to `Cancelled`, releases the reserved amount back to **Available**, records the cancellation in the withdrawal history + `Transactions` ledger, and notifies the seller. Cancelling an already-cancelled request is a safe no-op and can never release funds twice; a request that is already `successful`/`processing`/`rejected`/`reversed`, or a `failed` request with a transfer code, cannot be cancelled.

### Admin side
1. The **Withdrawals** tab lists Request ID, student (name, registration number, email), amount, bank details, submission time, unique reference, and status.
2. Filter by **Pending Approval / Processing / Successful / Rejected / Failed / Reversed / Cancelled**, or search by user, reference, or request ID.
3. **Approve** opens a **method-selection modal** — the administrator must choose one:
   - **Paystack Transfer** — shows a confirmation prompt, then runs the existing secure backend transfer workflow.
   - **Manual Bank Transfer** — shows the seller's real payout details (full name, amount, bank name, account number, reference, request date) plus two actions:
     - **I Have Transferred** → a confirmation step; confirming marks the request `Successful` (`paymentMethod = manual_bank_transfer`), records the confirming admin + timestamp, finalises the reserved deduction, updates history/ledger, and notifies the seller.
     - **Transfer Failed** → requires a failure explanation; saves it as `failureReason`, sets `Failed`, releases the reserved amount back to Available, and notifies the seller so they can retry.
4. **Reject** prompts for a reason, releases the reserved funds, and notifies the seller.
5. **Approve All Pending** shows a confirmation modal with the count and total, then processes each eligible request independently (still through the Paystack workflow) and shows a summary (**total / successful / failed / skipped**). Individual failures do not stop the batch. Already-cancelled requests are never treated as pending and are excluded automatically.

### Backend transfer rules (`processSingleWithdrawalApproval`, Paystack path)
- Skips already-`successful` / `rejected` / `reversed` / `cancelled` requests; skips in-flight `processing` requests that already have a transfer code.
- Sets status to `Processing` **before** any Paystack call.
- Validates the 10-digit account number and bank code; best-effort account-name resolution (non-blocking).
- Creates/retrieves the Paystack recipient and initiates a transfer with a unique reference.
- Marks `Successful` only when confirmed; on failure records the exact error, sets `Failed`, and **keeps funds reserved** (never lost or duplicated).
- Duplicate-transfer protection prevents a second transfer for the same request; a delayed/unclear response is never re-sent blindly.
- A script lock serialises financial operations, and the reservation/ledger entries are recorded in the central `Transactions` ledger at every stage.

### Manual transfer rules (`cancelWithdrawal`, `processManualWithdrawal`)
- Only requests that have **not** entered payment processing may be cancelled; cancellation releases the reservation exactly once (guarded by status), so a repeat click is a no-op.
- A manual transfer is marked `Successful` **only** on an explicit admin confirmation; there is no code path that auto-succeeds it.
- Reporting a manual failure **requires** a reason, releases the reservation (no payment was made), and keeps the request retryable.
- Money can never be released or deducted twice, and a request can never be processed by both methods simultaneously.
- The responsible administrator is recorded on approve (`adminId`) and on manual confirmation (`manualConfirmedBy` / `manualConfirmedAt`).

### Status history & audit
Every withdrawal keeps an append-only record across **Sales Balance history**, the seller's **Transactions**, and the admin dashboard. Recorded fields include: Withdrawal ID, User ID, amount, bank name, account number, payment method, reference, approving admin ID, manual-confirmation admin ID, status, failure reason, and timestamps. The seller's history and the admin dashboard always show the **same actual status**, and prior statuses are never overwritten.

---

## 6. Default Administrator Credentials

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

## 7. Verification & Testing

### Backend Unit Tests
Execute the comprehensive Node.js unit test suite:
```bash
npm run test:backend
```
The test suite validates:
- Database schema coverage and column presence across all 18 sheets.
- Covenant University student email and hostel assignment validations.
- Buyer wallet top-up, deduction, and refund credits.
- Seller sales balance pending escrow and availability release.
- Order creation balance validation and multi-quantity calculations.
- Buyer and seller cancellation requests with status locking.
- Admin refund approval (balance reversal, wallet credit, stock restoration).
- Admin refund rejection (order reactivation with notes, no funds moved).
- Refund requests appear in the Admin Dashboard Transactions > Refunds view.
- Multi-unit inventory initialization, decrement, and overselling protection.
- Marketplace filtering (hiding sold-out products from public browse).
- Paystack transfer handling (success, bank failure, admin rejection) via `paystackApiCall()`.
- **Withdrawal submission never calls Paystack** — no recipient creation, transfer initiation, or permanent deduction occurs on submit.
- A submitted withdrawal request moves the amount from **Available** to **Reserved** and remains `Pending Approval` until an administrator approves it.
- Insufficient available balance and non-10-digit account numbers are rejected on both client and backend.
- Admin approval sets `Processing` before the Paystack call and only marks `Successful` when confirmed.
- Withdrawal failure records the exact error, sets `Failed`, and **keeps funds reserved** (funds are never lost or duplicated; safe retry is permitted).
- Admin rejection releases the reserved amount back to the seller's available balance.
- Duplicate-transfer protection prevents the same withdrawal being paid twice.
- **Approve All** processes each eligible request independently and reports total / successful / failed / skipped without stopping on individual failures.
- **Withdrawal cancellation** releases the reserved amount exactly once (idempotent repeat cancels are no-ops) and is rejected for `processing`/`successful` and for `failed` requests that produced a transfer code.
- **Manual bank transfer** confirmation is never marked successful without an explicit admin action; duplicate confirmations are rejected and never deduct twice.
- **Manual failure** requires an explanation, releases the reservation, and leaves the request retryable.
- Live pending counters (`getPendingCounts`) count only genuinely pending orders per user and exclude `completed`/`cancelled`/`refunded`/`rejected` orders.
- User feedback submission (four categories) with private per-user retrieval.
- Admin feedback retrieval, filtering, status updates, and internal notes.

### Frontend Production Build
Validate TypeScript typings and compile the frontend production bundle:
```bash
cd frontend
npm run build
```

---

## 8. Technical Troubleshooting & Best Practices

- **CORS Handling with Google Apps Script**:
  - Google Apps Script Web Apps do not respond to HTTP `OPTIONS` preflight requests.
  - In `frontend/src/services/api.ts`, all POST payloads are serialized as JSON strings with `headers: { 'Content-Type': 'text/plain;charset=utf-8' }`. This qualifies as a standard simple request, eliminating browser CORS preflight blocks.
- **Paystack Secret Key Security**:
  - Payout transfers and transaction verification are executed server-side in `backend/Code.gs`. The Paystack secret key must **never** be exposed in client code or frontend `.env` files.
- **Redeploying Google Apps Script**:
  - Whenever you modify `backend/Code.gs`, you must create a new deployment version:
    **Deploy > Manage deployments > Edit > Version: New version > Deploy**.
