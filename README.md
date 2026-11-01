# eBron – Covenant University Student Marketplace

eBron is an eBay-inspired student marketplace designed exclusively for students of Covenant University. It provides an unified platform for students to buy, sell, save items, communicate in real-time, confirm hostel deliveries, and transact securely through a dual-party confirmation escrow payment protection mechanism.

---

## Architecture Overview

- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS + Lucide Icons + React Router DOM
- **Backend**: Google Apps Script (GAS) Web App + modular handlers
- **Database**: Google Sheets (13 structured tables with relational foreign IDs)

---

## Directory Structure

```
├── backend/
│   ├── Setup.js        # Automatic sheet creation & schema definitions
│   ├── Auth.js         # CU email (@stu.cu.edu.ng) & dynamic gender-hall validation
│   ├── Products.js     # Product listing, filtering, soft-delete & restore
│   ├── Orders.js       # Transaction state machine & dual confirmation logic
│   ├── Wallet.js       # Available vs Pending balances & withdrawal processing
│   ├── Messages.js     # Buyer-seller real-time chat coordination
│   ├── Admin.js        # Dynamic analytics calculation from real records
│   ├── Code.js         # Google Apps Script doGet/doPost request router
│   └── tests/          # Unit tests verifying backend business logic
├── frontend/
│   ├── src/
│   │   ├── components/ # Navbar, ActionMenu, ProductCard, EmptyState, Skeletons
│   │   ├── context/    # AuthContext with profile synchronization
│   │   ├── pages/      # Browse, Details, Checkout, Orders, Sales, Wallet, Chat, Admin
│   │   ├── services/   # Typed API client with GAS connection
│   │   └── types/      # TypeScript data models
│   └── e2e/            # Playwright end-to-end integration tests
└── README.md
```

---

## Google Sheets Database Setup

1. Create a new Google Spreadsheet in Google Drive (e.g. named `eBron CU Database`).
2. Open **Extensions > Apps Script**.
3. Copy the files from the `backend/` directory into your Apps Script editor:
   - `Setup.gs` (from `Setup.js`)
   - `Auth.gs` (from `Auth.js`)
   - `Products.gs` (from `Products.js`)
   - `Orders.gs` (from `Orders.js`)
   - `Wallet.gs` (from `Wallet.js`)
   - `Admin.gs` (from `Admin.js`)
   - `Code.gs` (from `Code.js`)
4. In the Apps Script toolbar, select the `setupDatabase` function from `Setup.gs` and click **Run**. This will automatically create all 13 required sheets with bold headers:
   - `Users`
   - `Products`
   - `ProductImages`
   - `SavedItems`
   - `Conversations`
   - `Messages`
   - `Orders`
   - `Transactions`
   - `Wallets`
   - `WithdrawalRequests`
   - `Notifications`
   - `Reports`
   - `AdminLogs`

---

## Deploying Google Apps Script Web App

1. In the Apps Script editor, click **Deploy > New deployment**.
2. Select **Web app** as the deployment type.
3. Configure settings:
   - **Description**: `eBron Production API`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone` (required so the frontend can dispatch requests)
4. Click **Deploy** and copy the resulting **Web app URL** (e.g., `https://script.google.com/macros/s/.../exec`).

---

## Frontend Installation & Configuration

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   npm install
   ```

2. Configure environment variables by creating `.env`:
   ```bash
   VITE_API_URL=https://script.google.com/macros/s/<YOUR_GAS_DEPLOYMENT_ID>/exec
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Build production bundle:
   ```bash
   npm run build
   ```

---

## Authentication & Covenant University Validation

- **Email Restriction**: All student accounts must use an email ending in `@stu.cu.edu.ng`.
- **Gender & Hall Validation**: The hall dropdown dynamically adapts based on selected gender:
  - **Male**: Peter, John, Paul, Daniel, Joseph, Joshua
  - **Female**: Mary, Lydia, Deborah
- **Unified Role**: Every student account has instant access to both **Buy Products** and **Sell Products**.
- **Delivery Sync**: Updating delivery information during checkout automatically syncs to the student's profile for future orders while saving an immutable snapshot for the specific order.

---

## Payment Protection & Dual-Party Confirmation

To eliminate fraud between students on campus:
1. **Purchase in TEST MODE**: Buyer places order; money is held in escrow.
2. **Pending Balance**: The seller's wallet immediately reflects the funds under **Pending Balance**. The funds cannot be withdrawn.
3. **Dual Confirmation**:
   - Seller delivers the product to the buyer's hall and clicks **Confirm Handover** in *Pending Sales*.
   - Buyer inspects the item and clicks **Confirm I Received Product** in *Pending Purchases*.
4. **Fund Release**: Only after **both** parties submit confirmation does the transaction transition to `Completed`, shifting the earnings from the seller's *Pending Balance* to their *Available Balance*.

### Enabling Real PayPal Payments
In `frontend/src/pages/Checkout.tsx` and `backend/Orders.js`, a placeholder for PayPal integration is prepared. When ready:
1. Replace `paymentMode: 'TEST_MODE'` with the live PayPal Client SDK.
2. Provide your `VITE_PAYPAL_CLIENT_ID` in `.env`.
3. Un-comment the PayPal Button component inside the payment mode selector.

---

## Initial Administrator Account

An administrative account is automatically seeded in the system with full administrative capabilities:
- **Email**: `admin@stu.cu.edu.ng`
- **Password**: `admin123`
- Direct access to `/admin` management console (Analytics, Soft-delete / Restore, User suspension, and Withdrawal processing).

---

## Testing

- **Backend Unit Tests**:
  ```bash
  npm run test:backend
  ```
- **Playwright Frontend E2E Tests**:
  ```bash
  cd frontend && npx playwright test
  ```
