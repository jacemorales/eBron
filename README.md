# eBron – Covenant University Student Marketplace

eBron is an eBay-inspired student marketplace designed exclusively for students of Covenant University. It provides a unified platform for students to buy, sell, save items, communicate in real-time, confirm hostel deliveries, and transact securely through a two-step transaction confirmation protection system.

---

## A. Project Overview

- **Purpose**: A dedicated university marketplace enabling verified Covenant University students to buy and sell textbooks, electronics, hostel provisions, and essentials safely.
- **Key Features**:
  - Unified accounts: every registered student has access to both buying and selling functions without creating separate accounts.
  - Institutional email verification: strictly accepts `@stu.cu.edu.ng` emails.
  - Dynamic gender-based hostel assignment: Male (Peter, John, Paul, Daniel, Joseph, Joshua); Female (Mary, Lydia, Deborah).
  - Two-Step Transaction Protection: buyers pay in simulated test mode; funds sit in seller's *Pending Balance* and are only released to *Available Balance* after both parties confirm handover and receipt.
  - Comprehensive Admin Portal with live analytics calculated from real records across Daily, Weekly, and Monthly timeframes.
- **Technologies Used**:
  - **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React, React Router DOM, Vite.
  - **Backend**: Google Apps Script (GAS) Web App (`backend/Code.gs`).
  - **Primary Database**: Google Sheets.

---

## B. Prerequisites

1. **Node.js**: v18.0.0 or higher (v20+ recommended).
2. **Google Account**: with access to Google Drive and Google Sheets.
3. **Browser**: Modern web browser (Chrome, Firefox, Safari, Edge).

---

## C. Installation & Local Setup

1. **Clone or Download the Repository**:
   ```bash
   git clone <repo-url>
   cd <repo-folder>
   ```

2. **Install Frontend Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

3. **Configure Frontend Environment**:
   Create a `.env` file in the `frontend/` directory and configure your Google Apps Script Web App URL:
   ```bash
   VITE_API_URL=https://script.google.com/macros/s/<YOUR_APPS_SCRIPT_DEPLOYMENT_ID>/exec
   ```
   > **Note on Backend Communication:** eBron communicates directly with Google Apps Script and Google Sheets. All actions (registering accounts, authenticating, listing items, saving wishlists, placing orders, and balance confirmations) send live HTTP requests to this URL. Ensure `VITE_API_URL` is set before testing registration or login.

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## D. Google Sheets Database Blueprint & Configuration

The primary database is Google Sheets. You can either run the automatic `setupDatabase()` function in Google Apps Script (`backend/Code.gs` or `backend/Setup.js`) or manually create the sheets with the exact headers specified below.

> **Key Financial Architecture – Separation of Balances:**
> To eliminate confusion and prevent fraud, eBron enforces a strict architectural separation between **Buyer Spending Wallets** and **Seller Sales Balances**:
> 1. **`Wallets` & `WalletTransactions`**: Dedicated exclusively to buyer shopping capital. Funds added via top-up are locked for campus marketplace purchases and cannot be withdrawn.
> 2. **`SalesBalances` & `SalesTransactions`**: Dedicated exclusively to seller earnings. Revenue from sales is initially held in pending status until two-step confirmation (handover + receipt), after which it enters available sales balance and is eligible for bank withdrawal.

---

### Sheet 1: `Users`
- **Purpose**: Stores student and administrator credentials, profiles, hall assignments, and authorization roles.
- **Columns (in exact order)**:
  `userId`, `fullName`, `regNumber`, `matricNumber`, `schoolEmail`, `gender`, `hallOfResidence`, `roomNumber`, `passwordHash`, `salt`, `role`, `status`, `createdAt`, `updatedAt`
- **Notes**: `role` can be `student` or `admin`. Passwords are encrypted with PBKDF2/SHA-256 and unique salts; plaintext passwords are never stored.

### Sheet 2: `Products`
- **Purpose**: Marketplace product catalog with pricing, condition, availability, and soft-delete flags.
- **Columns (in exact order)**:
  `productId`, `sellerId`, `name`, `description`, `category`, `price`, `condition`, `stockNumber`, `primaryImageUrl`, `availability`, `status`, `viewsCount`, `createdAt`, `updatedAt`
- **Notes**: `availability` is `available`, `sold`, or `reserved`. `status` is `active` or `deleted` (preserving records via soft deletion).

### Sheet 3: `ProductImages`
- **Purpose**: Gallery images for product listings, supporting multiple images per product.
- **Columns (in exact order)**:
  `imageId`, `productId`, `imageUrl`, `isPrimary`, `createdAt`

### Sheet 4: `SavedItems`
- **Purpose**: Student wishlists and bookmarked products.
- **Columns (in exact order)**:
  `savedId`, `userId`, `productId`, `createdAt`

### Sheet 5: `Conversations`
- **Purpose**: Direct buyer-seller chat threads linked to specific marketplace products.
- **Columns (in exact order)**:
  `conversationId`, `productId`, `buyerId`, `sellerId`, `lastMessageSnippet`, `lastMessageAt`, `createdAt`

### Sheet 6: `Messages`
- **Purpose**: Individual messages exchanged within a conversation thread.
- **Columns (in exact order)**:
  `messageId`, `conversationId`, `senderId`, `receiverId`, `content`, `isRead`, `createdAt`

### Sheet 7: `Orders`
- **Purpose**: Purchase transactions, immutable delivery snapshots, test payment simulation flags, and dual-party confirmation timestamps.
- **Columns (in exact order)**:
  `orderId`, `orderReference`, `productId`, `buyerId`, `sellerId`, `amount`, `status`, `paymentMode`, `paymentRef`, `deliveryFullName`, `deliveryGender`, `deliveryHall`, `deliveryRoom`, `sellerConfirmedAt`, `buyerConfirmedAt`, `completedAt`, `createdAt`, `updatedAt`
- **Notes**: `status` transitions: `awaiting_payment` → `payment_successful` → `awaiting_seller_confirmation` / `awaiting_buyer_confirmation` → `completed` (or `cancelled` / `disputed`).

### Sheet 8: `Transactions`
- **Purpose**: Global platform ledger tracking all monetary movements and confirmation events.
- **Columns (in exact order)**:
  `transactionId`, `orderId`, `orderReference`, `type`, `fromUserId`, `toUserId`, `amount`, `status`, `mode`, `notes`, `createdAt`
- **Notes**: `type` can be `payment`, `escrow_hold`, `balance_release`, or `withdrawal`.

### Sheet 9: `Wallets` (Buyer Spending Account)
- **Purpose**: Tracks student buyer purchasing balances. Funds here are strictly used for buying items on eBron.
- **Columns (in exact order)**:
  `walletId`, `userId`, `availableBalance`, `updatedAt`
- **Notes**: Only buyer spending funds reside here. Automatically created with `0` balance on first user activity.

### Sheet 10: `WalletTransactions` (Buyer Top-ups & Deductions)
- **Purpose**: Audit trail for buyer wallet funding (via Paystack simulation/live) and order purchase deductions.
- **Columns (in exact order)**:
  `transactionId`, `userId`, `type`, `amount`, `reference`, `status`, `description`, `createdAt`
- **Notes**: `type` is either `topup` or `purchase_deduction`.

### Sheet 11: `SalesBalances` (Seller Earnings Account)
- **Purpose**: Tracks seller revenue from sold products, separating pending sales from withdrawable earnings.
- **Columns (in exact order)**:
  `salesBalanceId`, `userId`, `availableBalance`, `pendingBalance`, `totalEarnings`, `totalWithdrawals`, `updatedAt`
- **Notes**:
  - `pendingBalance`: Sales amount currently held awaiting dual confirmation (seller handover + buyer receipt).
  - `availableBalance`: Confirmed sales revenue released and eligible for bank withdrawal.
  - Corresponds 100% to verified seller order records.

### Sheet 12: `SalesTransactions` (Seller Income Ledger)
- **Purpose**: Granular ledger of seller sales credits, funds releases upon dual confirmation, and processed withdrawals.
- **Columns (in exact order)**:
  `transactionId`, `sellerId`, `orderId`, `orderReference`, `amount`, `type`, `status`, `createdAt`
- **Notes**: `type` is `pending_sale`, `released_sale`, or `withdrawal`.

### Sheet 13: `WithdrawalRequests`
- **Purpose**: Bank payout requests submitted by sellers from their available sales balance.
- **Columns (in exact order)**:
  `requestId`, `userId`, `amount`, `bankName`, `accountNumber`, `accountName`, `status`, `adminNotes`, `processedAt`, `createdAt`
- **Notes**: `status` can be `pending`, `approved`, `rejected`, or `processed`.

### Sheet 14: `Notifications`
- **Purpose**: In-app notifications for order updates, message receipts, balance releases, and administrative alerts.
- **Columns (in exact order)**:
  `notificationId`, `userId`, `title`, `message`, `type`, `destinationUrl`, `isRead`, `createdAt`

### Sheet 15: `NotificationSubscriptions`
- **Purpose**: Web push notification subscription tokens for real-time mobile/desktop alerts.
- **Columns (in exact order)**:
  `subscriptionId`, `userId`, `endpoint`, `p256dh`, `auth`, `enabled`, `createdAt`, `updatedAt`

### Sheet 16: `Reports`
- **Purpose**: Product listing complaints and scam reports submitted by students for administrator investigation.
- **Columns (in exact order)**:
  `reportId`, `productId`, `productName`, `productStockNumber`, `productImage`, `sellerId`, `sellerName`, `reporterId`, `reporterEmail`, `category`, `explanation`, `status`, `adminNotes`, `createdAt`, `updatedAt`

### Sheet 17: `AdminLogs`
- **Purpose**: Audit trail of administrative actions (suspensions, product takedowns/restorations, withdrawal processing).
- **Columns (in exact order)**:
  `logId`, `adminId`, `action`, `details`, `targetId`, `ipAddress`, `createdAt`

---

## E. Google Apps Script Deployment

1. Open your Google Spreadsheet in Google Drive.
2. Click **Extensions > Apps Script**.
3. Clear any existing code and copy the entire contents of `backend/Code.gs` into the editor.
4. Set the `SPREADSHEET_ID` variable in `backend/Code.gs` to your Google Spreadsheet ID (or leave it bound to the active spreadsheet).
5. In the Apps Script toolbar, select `setupDatabase` and click **Run**.
6. When prompted, click **Review permissions**, choose your Google Account, click **Advanced**, and then click **Go to Untitled project (unsafe)** to grant spreadsheet access.
7. Click **Deploy > New deployment**:
   - **Select type**: `Web app`
   - **Description**: `eBron Production API v1`
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone` *(Critical: Allows your frontend application to call the endpoint)*
8. Click **Deploy**. Copy the provided **Web app URL** (e.g. `https://script.google.com/macros/s/.../exec`).
9. Paste this URL into `frontend/.env` as `VITE_API_URL`.
10. **Redeploying after updates**: Whenever you change `Code.gs`, click **Deploy > Manage deployments > Edit > New version > Deploy**.

---

## F. Administrator Setup

Administrator details are stored and verified directly in the `Users` sheet in Google Sheets (with `role: "admin"`). No administrator passwords or credentials are hardcoded into the frontend.

### Initial Administrator Record Template
Copy and paste this row directly into row 2 of the `Users` sheet (or append to the end):

| Column | Value |
|---|---|
| `userId` | `u_admin_001` |
| `fullName` | `Covenant University Admin` |
| `regNumber` | `ADM/2026/01` |
| `matricNumber` | `CU/ADM/001` |
| `schoolEmail` | `admin@stu.cu.edu.ng` |
| `gender` | `Male` |
| `hallOfResidence` | `Peter` |
| `roomNumber` | `AdminSuite1` |
| `passwordHash` | `414777a8848d6db3866b1a13e2bb97f5a9f242d5e272a8069502b489a202dfb8` |
| `salt` | `covenant_admin_salt` |
| `role` | `admin` |
| `status` | `active` |
| `createdAt` | `2026-11-01T00:00:00.000Z` |
| `updatedAt` | `2026-11-01T00:00:00.000Z` |

*(The template hash above corresponds to password: `AdminPassword123!`)*

---

## G. Image Hosting Configuration

When uploading multiple product images, sellers can either paste valid image URLs or upload files. The application converts uploaded local images into standard data URIs and persists them into the `Products` sheet. For external image hosting (e.g., Cloudinary or Imgur), provide your CDN credentials in `frontend/.env` and configure direct URL uploads.

---

## H. Troubleshooting & Common Errors

### Error 1: CORS Policy / Preflight Blocked
- **Symptoms**:
  `Access to fetch at 'https://script.google.com/...' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`
- **Cause**: Google Apps Script Web Apps do not respond to browser preflight HTTP `OPTIONS` requests. If the browser sends `Content-Type: application/json` or custom headers, the preflight request fails with CORS.
- **Solution**:
  In `frontend/src/services/api.ts`, all POST requests are sent with `headers: { 'Content-Type': 'text/plain;charset=utf-8' }` with a stringified JSON body. This treats the request as a simple request without triggering an `OPTIONS` preflight, allowing Google Apps Script to process the request and return JSON with standard CORS headers.

### Error 2: Undefined Query Parameters in URL
- **Symptoms**:
  `?action=getProducts&category=undefined&search=undefined`
- **Cause**: Optional React state variables passed as parameters evaluate to `"undefined"` strings when appended naively to URL search params.
- **Solution**:
  The `sanitizeParams()` helper in `frontend/src/services/api.ts` filters out any keys whose values are `undefined`, `null`, empty string, or literal `"undefined"` before building URL query strings.

### Error 3: Local Persistence Fallback Errors
- **Symptoms**:
  `GAS endpoint call error, using local persistence fallback: TypeError: Failed to fetch`
- **Cause**: Previous code tried to fallback to `localStorage` when network requests failed, violating the requirement to use Google Sheets as the sole source of truth.
- **Solution**:
  All `localStorage` fallback databases have been completely removed. If Google Apps Script is unreachable or `VITE_API_URL` is missing, the application returns a clear error message prompting the user to verify their network or Apps Script configuration.

### Error 4: Registration Preflight Failure
- **Symptoms**:
  `Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present.`
- **Cause**: Registration POST payload was previously dispatched with `application/json`, which triggered an unhandled CORS preflight in Google Apps Script.
- **Solution**:
  The `api.register()` method now uses `text/plain;charset=utf-8` payload serialization, cleanly processed by `doPost(e)` in `backend/Code.gs`.

### Error 5: Wallet Request Failure
- **Symptoms**:
  `getWallet&userId=... failed`
- **Cause**: Wallet queries failing due to nonexistent wallet records in new user accounts.
- **Solution**:
  `doGet` in `backend/Code.gs` automatically creates and appends an empty wallet record with 0 available and pending balances if one does not exist for the queried user ID.

---

## I. Testing & Verification

1. **Backend Unit Tests**:
   ```bash
   npm run test:backend
   ```
2. **Frontend End-to-End Tests**:
   ```bash
   cd frontend
   npx playwright test
   ```
