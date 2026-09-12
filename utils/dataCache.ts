import { Product, Category, Customer, Ingredient, SaleRecord, InventoryAdjustment } from '../types';

const CACHE_KEY = 'suvai_app_cache_v1';
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface AppDataCache {
  timestamp: number;
  products: Product[];
  categories: Category[];
  customers: Customer[];
  ingredients: Ingredient[];
  sales: SaleRecord[];
  inventoryAdjustments: InventoryAdjustment[];
}

const reviveSale = (sale: SaleRecord): SaleRecord => ({
  ...sale,
  timestamp: new Date(sale.timestamp),
});

const reviveProduct = (product: Product): Product => ({
  ...product,
  deletedAt: product.deletedAt ? new Date(product.deletedAt) : undefined,
});

const reviveCustomer = (customer: Customer): Customer => ({
  ...customer,
  joinDate: new Date(customer.joinDate),
});

const reviveIngredient = (ingredient: Ingredient): Ingredient => ({
  ...ingredient,
  createdAt: ingredient.createdAt ? new Date(ingredient.createdAt) : undefined,
});

const reviveAdjustment = (adjustment: InventoryAdjustment): InventoryAdjustment => ({
  ...adjustment,
  createdAt: new Date(adjustment.createdAt),
});

export const loadAppDataCache = (): AppDataCache | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as AppDataCache;
    if (!parsed?.timestamp || Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }

    return {
      ...parsed,
      products: (parsed.products || []).map(reviveProduct),
      categories: parsed.categories || [],
      customers: (parsed.customers || []).map(reviveCustomer),
      ingredients: (parsed.ingredients || []).map(reviveIngredient),
      sales: (parsed.sales || []).map(reviveSale),
      inventoryAdjustments: (parsed.inventoryAdjustments || []).map(reviveAdjustment),
    };
  } catch {
    sessionStorage.removeItem(CACHE_KEY);
    return null;
  }
};

export const saveAppDataCache = (cache: Omit<AppDataCache, 'timestamp'>) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      ...cache,
      timestamp: Date.now(),
    }));
  } catch {
    // Ignore quota errors — cache is optional.
  }
};

export const clearAppDataCache = () => {
  sessionStorage.removeItem(CACHE_KEY);
};
