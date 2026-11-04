export type Gender = 'Male' | 'Female';
export type MaleHall = 'Peter' | 'John' | 'Paul' | 'Daniel' | 'Joseph' | 'Joshua';
export type FemaleHall = 'Mary' | 'Lydia' | 'Deborah';
export type Hall = MaleHall | FemaleHall;

export type UserRole = 'student' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface User {
  userId: string;
  fullName: string;
  regNumber: string;
  matricNumber: string;
  schoolEmail: string;
  gender: Gender;
  hallOfResidence: Hall;
  roomNumber: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export type ProductCategory =
  | 'Textbooks & Academic'
  | 'Electronics & Gadgets'
  | 'Fashion & Apparel'
  | 'Hostel & Room Essentials'
  | 'Snacks & Food Provisions'
  | 'Health & Personal Care'
  | 'Sports & Fitness'
  | 'Other Services';

export type ProductCondition = 'New' | 'Fairly Used' | 'Used';
export type ProductAvailability = 'available' | 'reserved' | 'sold';
export type ProductStatus = 'active' | 'deleted';

export interface Product {
  productId: string;
  sellerId: string;
  sellerName?: string;
  sellerEmail?: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  condition: ProductCondition;
  stockNumber?: string;
  primaryImageUrl: string;
  images: string[];
  availability: ProductAvailability;
  status: ProductStatus;
  viewsCount: number;
  deletedBy?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReportCategory =
  | 'Scammer or fraudulent seller'
  | 'Fake or counterfeit product'
  | 'Potentially stolen product'
  | 'Misleading product description or images'
  | 'Prohibited or inappropriate item'
  | 'Suspicious pricing or suspicious activity'
  | 'Other';

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';

export interface ProductReport {
  reportId: string;
  productId: string;
  productName: string;
  productStockNumber?: string;
  productImage?: string;
  sellerId: string;
  sellerName: string;
  reporterId: string;
  reporterEmail: string;
  category: ReportCategory;
  explanation: string;
  status: ReportStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedItem {
  savedId: string;
  userId: string;
  productId: string;
  createdAt: string;
}

export interface Conversation {
  conversationId: string;
  productId: string;
  productName?: string;
  productPrice?: number;
  productImage?: string;
  buyerId: string;
  buyerName?: string;
  sellerId: string;
  sellerName?: string;
  lastMessageSnippet: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export type OrderStatus =
  | 'awaiting_payment'
  | 'payment_successful'
  | 'awaiting_seller_confirmation'
  | 'awaiting_buyer_confirmation'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface Order {
  orderId: string;
  orderReference: string;
  productId: string;
  productName?: string;
  productImage?: string;
  buyerId: string;
  buyerName?: string;
  sellerId: string;
  sellerName?: string;
  amount: number;
  status: OrderStatus;
  paymentMode: 'TEST_MODE' | 'PAYPAL';
  paymentRef: string;
  deliveryFullName: string;
  deliveryGender: Gender;
  deliveryHall: Hall;
  deliveryRoom: string;
  sellerConfirmedAt: string | null;
  buyerConfirmedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  walletId: string;
  userId: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawals: number;
  updatedAt: string;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'processed';

export interface WithdrawalRequest {
  requestId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: WithdrawalStatus;
  adminNotes: string;
  processedAt: string | null;
  createdAt: string;
}
