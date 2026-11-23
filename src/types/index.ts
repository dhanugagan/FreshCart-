export interface User {
  id: number;
  fullName: string;
  email: string;
  mobile: string;
  status: string;
  roles: string[];
  notifyOrders: boolean;
  notifyOffers: boolean;
  notifyDelivery: boolean;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  productCount: number;
}

export interface Product {
  id: number;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  sku: string;
  name: string;
  brand: string;
  unit: string;
  description: string;
  price: number;
  discountPercent: number;
  effectivePrice: number;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  isTrending: boolean;
  isBestseller: boolean;
  stockQuantity: number;
  imageUrl: string;
  images?: string[];
}

export interface ProductReview {
  id: number;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CartItem {
  id: number;
  productId: number;
  name: string;
  brand: string;
  unit: string;
  originalPrice: number;
  discountPercent: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  stockQuantity: number;
  imageUrl: string;
}

export interface CartSnapshot {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  appliedCoupon: string | null;
  taxAmount: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  totalAmount: number;
}

export interface WishlistItem {
  id: number;
  productId: number;
  name: string;
  brand: string;
  unit: string;
  price: number;
  discountPercent: number;
  effectivePrice: number;
  rating: number;
  stockQuantity: number;
  imageUrl: string;
}

export interface Coupon {
  id: number;
  code: string;
  title: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'FIRST_ORDER';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  expiresAt: string;
  isExpired: boolean;
}

export interface Address {
  id: number;
  label: string;
  recipientName: string;
  mobile: string;
  street: string;
  apartment: string;
  city: string;
  state: string;
  postalCode: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productImage: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  shippingAddress: Address;
  deliverySlot: string;
  deliveryInstructions: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  couponCode: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}

export interface TrackingTimelineStep {
  status: string;
  label: string;
  completed: boolean;
  timestamp: string | null;
}

export interface DeliveryTracking {
  orderId: number;
  driverName: string;
  currentStatus: string;
  progressPercent: number;
  etaMinutes: number;
  currentLat?: number;
  currentLng?: number;
  storeLat?: number;
  storeLng?: number;
  destLat?: number;
  destLng?: number;
  isSimulated: boolean;
  timeline: TrackingTimelineStep[];
  updatedAt: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface PaymentRecord {
  id: number;
  orderId: number;
  method: string;
  amount: number;
  status: 'INITIATED' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  transactionRef: string;
  providerMessage?: string;
  maskedInstrument: string;
}

export interface RazorpayOrderSession {
  razorpayOrderId: string;
  amountPaise: number;
  amountInr: number;
  currency: 'INR';
  keyId: string;
  gatewayMode: 'live' | 'test_gateway';
  orderNumber: string;
}
