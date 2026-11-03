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

The primary database is Google Sheets. You can either use the automatic setup function in Apps Script or manually create the sheets with the exact headers specified below.

### Sheet 1: `Users`
- **Purpose**: Stores student and administrator credentials, profiles, and delivery settings.
- **Columns (in exact order)**:
  `userId`, `fullName`, `regNumber`, `matricNumber`, `schoolEmail`, `gender`, `hallOfResidence`, `roomNumber`, `passwordHash`, `salt`, `role`, `status`, `createdAt`, `updatedAt`

### Sheet 2: `Products`
- **Purpose**: Marketplace listings with images, descriptions, pricing, and soft-delete flags.
- **Columns (in exact order)**:
  `productId`, `sellerId`, `sellerName`, `sellerEmail`, `name`, `description`, `category`, `price`, `condition`, `primaryImageUrl`, `images`, `availability`, `status`, `viewsCount`, `deletedBy`, `deletedAt`, `createdAt`, `updatedAt`

### Sheet 3: `SavedItems`
- **Purpose**: Student wishlists and bookmarked products.
- **Columns (in exact order)**:
  `savedId`, `userId`, `productId`, `createdAt`

### Sheet 4: `Conversations`
- **Purpose**: Direct chat threads between buyers and sellers linked to products.
- **Columns (in exact order)**:
  `conversationId`, `productId`, `productName`, `productPrice`, `productImage`, `buyerId`, `buyerName`, `sellerId`, `sellerName`, `lastMessageSnippet`, `lastMessageAt`, `createdAt`

### Sheet 5: `Messages`
- **Purpose**: Individual messages within a conversation.
- **Columns (in exact order)**:
  `messageId`, `conversationId`, `senderId`, `receiverId`, `content`, `isRead`, `createdAt`

### Sheet 6: `Orders`
- **Purpose**: Orders, delivery snapshots, test payment simulation, and dual-party confirmation timestamps.
- **Columns (in exact order)**:
  `orderId`, `orderReference`, `productId`, `productName`, `productImage`, `buyerId`, `buyerName`, `sellerId`, `sellerName`, `amount`, `status`, `paymentMode`, `paymentRef`, `deliveryFullName`, `deliveryGender`, `deliveryHall`, `deliveryRoom`, `sellerConfirmedAt`, `buyerConfirmedAt`, `completedAt`, `disputeReason`, `createdAt`, `updatedAt`

### Sheet 7: `Wallets`
- **Purpose**: Student wallet balances (Available Balance, Pending Balance, Total Earnings, Total Withdrawals).
- **Columns (in exact order)**:
  `walletId`, `userId`, `availableBalance`, `pendingBalance`, `totalEarnings`, `totalWithdrawals`, `updatedAt`

### Sheet 8: `WithdrawalRequests`
- **Purpose**: Payout requests submitted by students to receive money in their bank accounts.
- **Columns (in exact order)**:
  `requestId`, `userId`, `userName`, `userEmail`, `amount`, `bankName`, `accountNumber`, `accountName`, `status`, `adminNotes`, `processedAt`, `createdAt`

### Sheet 9: `AnalyticsEvents`
- **Purpose**: Historical timestamp logs for platform events and analytics tracking.
- **Columns (in exact order)**:
  `eventId`, `eventType`, `userId`, `amount`, `details`, `createdAt`

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
