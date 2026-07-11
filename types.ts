export enum ViewState {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  BILLING = 'BILLING',
  CATEGORIES = 'CATEGORIES',
  INVENTORY = 'INVENTORY',
  CUSTOMERS = 'CUSTOMERS',
  USERS = 'USERS',
}

export enum UserRole {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
  deletedAt?: Date;
}

export interface Category {
  id: string;
  name: string;
  createdAt: Date;
  imageUrl?: string;
  
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  createdAt: Date;
  deletedAt?: Date;
}

export interface ProductIngredient {
  id: string;
  productId: string;
  ingredientId: string;
  quantityPerUnit: number;
}

export interface InventoryAdjustment {
  id: string;
  productId?: string;
  ingredientId?: string;
  adjustment: number;
  reason: string;
  createdBy: string;
  createdAt: Date;
}

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface CartItem extends Product {
  quantity: number;
}

export type PaymentMethod = 'CASH' | 'UPI' | 'OTHER';

export interface SaleRecord {
  id: string;
  timestamp: Date;
  items: CartItem[];
  subtotal?: number;
  taxAmount?: number;
  roundingAdjustment?: number;
  total: number;
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  customerId?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  discountAmount?: number;
}

export interface DailyStat {
  date: string;
  sales: number;
  orders: number;
}

export interface NotificationItem {
  id: string;
  type: 'warning' | 'info' | 'success';
  message: string;
  timestamp: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  totalSpent: number;
  notes?: string;
  joinDate: Date;
}
