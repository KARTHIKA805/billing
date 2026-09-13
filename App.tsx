import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import {
  signIn as supabaseSignIn,
  signOut as supabaseSignOut,
  supabase,
  getUser,
  getUserRole,
  resolveUserRoleFromMetadata,
  getProducts,
  getCategories,
  getSales,
  getCustomers,
  getIngredients,
  getInventoryAdjustments,
  adjustProductStock as apiAdjustProductStock,
  adjustIngredientStock as apiAdjustIngredientStock,
  addProduct as apiAddProduct,
  addCategory as apiAddCategory,
  addIngredient as apiAddIngredient,
  updateProduct as apiUpdateProduct,
  updateIngredient as apiUpdateIngredient,
  deleteProduct as apiDeleteProduct,
  deleteIngredient as apiDeleteIngredient,
  getDeletedProducts,
  getDeletedIngredients,
  restoreProduct as apiRestoreProduct,
  restoreIngredient as apiRestoreIngredient,
  addCustomer as apiAddCustomer,
  deleteCustomer as apiDeleteCustomer,
  createSale as apiCreateSale,
  updateSale as apiUpdateSale,
  voidSale as apiVoidSale,
  touchUserLastSignIn
} from './services/supabaseService';
import { ViewState, Product, SaleRecord, CartItem, Customer, DailyStat, UserRole, Category, Ingredient, InventoryAdjustment } from './types';
import { MOCK_DAILY_STATS } from './constants';
import Billing from './components/Billing';
import Layout from "./components/Layout";
import { updateCategory, deleteCategory } from './services/supabaseService';
import { clearAppDataCache, loadAppDataCache, saveAppDataCache } from './utils/dataCache';

import { Lock, User, Loader2 } from 'lucide-react';

const Dashboard = lazy(() => import('./components/Dashboard'));
const EmployeeDashboard = lazy(() => import('./components/EmployeeDashboard'));
const BillsHistory = lazy(() => import('./components/BillsHistory'));
const Inventory = lazy(() => import('./components/Inventory'));
const Customers = lazy(() => import('./components/Customers'));
const Users = lazy(() => import('./components/Users'));
const Categories = lazy(() => import('./components/Categories'));

const PageLoader = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="animate-spin text-[var(--brand-dark)]" size={32} />
  </div>
);

const DEMO_AUTH_STORAGE_KEY = 'suvai_demo_auth';

const readStoredDemoRole = (): UserRole | null => {
  const stored = sessionStorage.getItem(DEMO_AUTH_STORAGE_KEY);
  if (stored === UserRole.ADMIN || stored === UserRole.EMPLOYEE) return stored;
  return null;
};

const readCachedAppData = () => loadAppDataCache({ allowStale: true });

// Login Component
const Login = ({ onLogin }: { onLogin: (role: UserRole, isDemo?: boolean) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Demo login for testing - accept "admin" or any email starting with "admin"
      const isAdminDemo = username === 'admin' || username.startsWith('admin@');
      const isEmployeeDemo = username === 'employee' || username.startsWith('employee@');
      if (isAdminDemo && password === 'demo') {
        onLogin(UserRole.ADMIN, true);
        return;
      }
      if (isEmployeeDemo && password === 'demo') {
        onLogin(UserRole.EMPLOYEE, true);
        return;
      }

      if (!supabase) {
        setError('Database connection not configured. Please check environment variables.');
        setLoading(false);
        return;
      }

      const { error } = await supabaseSignIn(username, password);
      if (error) {
        setError(error.message || 'Authentication failed.');
        setLoading(false);
        return;
      }
      const { data } = await getUser();
      if (data.user?.id) {
        await touchUserLastSignIn(data.user.id);
      }
      const role = await getUserRole(data.user);
      onLogin(role, false);

    } catch (err: any) {
      setError(err?.message || 'Unexpected error during authentication.');
      setLoading(false);
    }
  };

  return (
<div className="min-h-screen flex items-center justify-center bg-[var(--brand-muted)] p-4">
      <div className="bg-[var(--brand-surface)] p-8 rounded-2xl shadow-xl w-full max-w-sm border border-[var(--brand-border)]">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[var(--brand-accent)] rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-[var(--brand-border)]">
            <Lock className="text-[var(--brand-dark)]" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-[var(--brand-text-dark)]">Welcome Back</h1>
          <p className="text-[var(--brand-text-dark)] text-sm mt-1">Secure Admin Login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--brand-text-dark)] uppercase mb-1.5 ml-1">Email</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand-border)] z-10" size={18} />
              <input
                type="email"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--brand-border)] focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] outline-none transition-all text-[var(--brand-text-dark)] bg-white placeholder-slate-300"
                placeholder="Enter email"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--brand-text-dark)] uppercase mb-1.5 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand-border)] z-10" size={18} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--brand-border)] focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] outline-none transition-all text-[var(--brand-text-dark)] bg-white placeholder-slate-300"
                required
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--brand-dark)] text-[var(--brand-text-light)] py-3.5 rounded-xl font-medium hover:bg-[var(--brand-bg)] transition-all shadow-lg shadow-[var(--brand-border)] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const initialDemoRole = readStoredDemoRole();
  const initialCache = initialDemoRole ? readCachedAppData() : null;

  const [isLoggedIn, setIsLoggedIn] = useState(!!initialDemoRole);
  const [isAuthLoading, setIsAuthLoading] = useState(!initialDemoRole);
  const [userRole, setUserRole] = useState<UserRole | null>(initialDemoRole);
  const [currentView, setCurrentView] = useState<ViewState>(
    initialDemoRole === UserRole.EMPLOYEE ? ViewState.BILLING : ViewState.DASHBOARD
  );

  // Data State
  const [products, setProducts] = useState<Product[]>(initialCache?.products ?? []);
  const [categories, setCategories] = useState<Category[]>(initialCache?.categories ?? []);
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialCache?.ingredients ?? []);
  const [inventoryAdjustments, setInventoryAdjustments] = useState<InventoryAdjustment[]>(
    initialCache?.inventoryAdjustments ?? []
  );
  const [sales, setSales] = useState<SaleRecord[]>(initialCache?.sales ?? []);
  const [customers, setCustomers] = useState<Customer[]>(initialCache?.customers ?? []);
  const [isSyncingData, setIsSyncingData] = useState(false);

  // Dynamic stats derived from interactions
  const [notifications, setNotifications] = useState<{id: string, message: string}[]>([]);

  const applyCachedData = (cached: ReturnType<typeof readCachedAppData>) => {
    if (!cached?.products?.length) return false;

    setProducts(cached.products);
    setCategories(cached.categories);
    setCustomers(cached.customers);
    setIngredients(cached.ingredients);
    setSales(cached.sales);
    setInventoryAdjustments(cached.inventoryAdjustments);
    return true;
  };

  // Restore auth session on refresh
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const storedDemoRole = readStoredDemoRole();
        if (storedDemoRole) {
          if (!isMounted) return;
          applyCachedData(readCachedAppData());
          setUserRole(storedDemoRole);
          setIsLoggedIn(true);
          setCurrentView(storedDemoRole === UserRole.EMPLOYEE ? ViewState.BILLING : ViewState.DASHBOARD);
          setIsAuthLoading(false);
          return;
        }

        if (!supabase) {
          if (isMounted) setIsAuthLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const quickRole = resolveUserRoleFromMetadata(session.user) ?? UserRole.ADMIN;
        if (!isMounted) return;
        applyCachedData(readCachedAppData());
        setUserRole(quickRole);
        setIsLoggedIn(true);
        setCurrentView(quickRole === UserRole.EMPLOYEE ? ViewState.BILLING : ViewState.DASHBOARD);

        getUserRole(session.user)
          .then((verifiedRole) => {
            if (!isMounted) return;
            setUserRole(verifiedRole);
            setCurrentView(verifiedRole === UserRole.EMPLOYEE ? ViewState.BILLING : ViewState.DASHBOARD);
          })
          .catch((error) => {
            console.error('Failed to verify user role:', error);
          });
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    restoreSession();

    if (!supabase) {
      return () => {
        isMounted = false;
      };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' || sessionStorage.getItem(DEMO_AUTH_STORAGE_KEY)) return;

      if (session?.user) {
        try {
          if (event === 'SIGNED_IN') {
            await touchUserLastSignIn(session.user.id);
          }
          const role = await getUserRole(session.user);
          if (!isMounted) return;
          setUserRole(role);
          setIsLoggedIn(true);
        } catch (error) {
          console.error('Failed to resolve user role:', error);
        }
      } else if (isMounted) {
        setIsLoggedIn(false);
        setUserRole(null);
        clearAppDataCache();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const saveCurrentDataCache = (
    data: {
      products: Product[];
      categories: Category[];
      customers: Customer[];
      ingredients: Ingredient[];
      sales: SaleRecord[];
      inventoryAdjustments: InventoryAdjustment[];
    }
  ) => {
    saveAppDataCache(data);
  };

  const fetchSecondaryData = async (prods: Product[]) => {
    const [ings, adjustments, sls] = await Promise.all([
      getIngredients(),
      getInventoryAdjustments(),
      getSales(prods),
    ]);

    setIngredients(ings);
    setInventoryAdjustments(adjustments);
    setSales(sls);

    return { ings, adjustments, sls };
  };

  const fetchData = async (options?: { background?: boolean }) => {
    const hasCachedProducts = products.length > 0;
    const isBackground = options?.background ?? hasCachedProducts;
    if (!isBackground) setIsSyncingData(true);

    try {
      const [prods, cats, custs] = await Promise.all([
        getProducts(),
        getCategories(),
        getCustomers(),
      ]);

      setProducts(prods);
      setCategories(cats);
      setCustomers(custs);

      const secondary = await fetchSecondaryData(prods);

      saveCurrentDataCache({
        products: prods,
        categories: cats,
        customers: custs,
        ingredients: secondary.ings,
        sales: secondary.sls,
        inventoryAdjustments: secondary.adjustments,
      });
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsSyncingData(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    const hasCache = applyCachedData(readCachedAppData());
    void fetchData({ background: hasCache });
  }, [isLoggedIn]);

  useEffect(() => {
    if (userRole === UserRole.EMPLOYEE && [ViewState.USERS, ViewState.CATEGORIES].includes(currentView)) {
      setCurrentView(ViewState.BILLING);
    }
  }, [currentView, userRole]);

  const salesTodayTotal = useMemo(() => {
    const now = new Date();
    return sales
      .filter((sale) =>
        sale.timestamp.getFullYear() === now.getFullYear() &&
        sale.timestamp.getMonth() === now.getMonth() &&
        sale.timestamp.getDate() === now.getDate()
      )
      .reduce((sum, sale) => sum + sale.total, 0);
  }, [sales]);

  useEffect(() => {
    // Calculate notifications based on low stock
    const lowStockProducts = products.filter(p => p.stock <= p.minStock);
    const lowStockIngredients = ingredients.filter(i => i.currentStock <= i.minStock);
    
    const notifs = [
      ...lowStockProducts.map(p => ({ id: `p-${p.id}`, message: `Product ${p.name} is low on stock (${p.stock} left)` })),
      ...lowStockIngredients.map(i => ({ id: `i-${i.id}`, message: `Ingredient ${i.name} is low on stock (${i.currentStock} left)` }))
    ];
    setNotifications(notifs);
  }, [products, ingredients]);

  const applySaleResultsLocally = (createdSales: SaleRecord[]) => {
    if (createdSales.length === 0) return;

    setSales((prev) => [...createdSales, ...prev]);

    const qtyByProduct = new Map<string, number>();
    const customerUpdates = new Map<string, { pointsDelta: number; totalDelta: number }>();

    for (const sale of createdSales) {
      for (const item of sale.items) {
        if (!item.id) continue;
        qtyByProduct.set(item.id, (qtyByProduct.get(item.id) || 0) + item.quantity);
      }
      if (sale.customerId) {
        const existing = customerUpdates.get(sale.customerId) || { pointsDelta: 0, totalDelta: 0 };
        existing.pointsDelta += (sale.pointsEarned ?? 0) - (sale.pointsRedeemed ?? 0);
        existing.totalDelta += sale.total;
        customerUpdates.set(sale.customerId, existing);
      }
    }

    setProducts((prev) => prev.map((product) => {
      const soldQty = qtyByProduct.get(product.id);
      if (!soldQty) return product;
      return { ...product, stock: Math.max(0, product.stock - soldQty) };
    }));

    setCustomers((prev) => prev.map((customer) => {
      const update = customerUpdates.get(customer.id);
      if (!update) return customer;
      return {
        ...customer,
        loyaltyPoints: customer.loyaltyPoints + update.pointsDelta,
        totalSpent: customer.totalSpent + update.totalDelta,
      };
    }));
  };

  const refreshAfterSale = async () => {
    try {
      const [prods, custs] = await Promise.all([getProducts(), getCustomers()]);
      setProducts(prods);
      setCustomers(custs);

      const cached = readCachedAppData();
      if (cached) {
        saveAppDataCache({
          ...cached,
          products: prods,
          customers: custs,
        });
      }
    } catch (error) {
      console.error('Failed to refresh after sale:', error);
    }
  };

  const handleCompleteSales = async (salesPayload: Omit<SaleRecord, 'id' | 'timestamp'>[]): Promise<SaleRecord[]> => {
    const pendingSales: SaleRecord[] = salesPayload.map((salePayload) => ({
      id: '',
      timestamp: new Date(),
      ...salePayload,
      pointsEarned: salePayload.pointsEarned ?? Math.floor(salePayload.total),
    }));

    const saleIds = await Promise.all(pendingSales.map((sale) => apiCreateSale(sale)));
    const createdSales = pendingSales.map((sale, index) => ({
      ...sale,
      id: saleIds[index],
      timestamp: new Date(),
    }));

    applySaleResultsLocally(createdSales);
    void refreshAfterSale();

    return createdSales;
  };

  const handleUpdateSale = async (sale: SaleRecord) => {
    await apiUpdateSale(sale);
    await fetchData({ background: true });
  };

  const handleVoidSale = async (sale: SaleRecord) => {
    await apiVoidSale(sale);
    await fetchData({ background: true });
  };

  const handleAddCustomer = async (customerData: Omit<Customer, 'id' | 'joinDate' | 'loyaltyPoints' | 'totalSpent'>) => {
    try {
      if (customerData.phone) {
        const exists = customers.some(c => c.phone === customerData.phone);
        if (exists) {
          alert('A customer with this phone number already exists.');
          return;
        }
      }
      await apiAddCustomer(customerData);
      await fetchData({ background: true });
    } catch (error) {
      console.error("Failed to add customer:", error);
      alert("Failed to add customer.");
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await apiDeleteCustomer(customerId);
      await fetchData({ background: true });
    } catch (error: any) {
      console.error("Failed to delete customer:", error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to delete customer. Error: ${msg}`);
    }
  };

  const handleAddProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      await apiAddProduct(productData);
      await fetchData({ background: true });
    } catch (error: any) {
      console.error("Failed to add product:", error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to add product.\n\nError: ${msg}\n\nCheck the browser console (F12) for details.`);
    }
  };

  const handleAddCategory = async (name: string, imageFile?: File | null) => {
    try {
      await apiAddCategory(name, imageFile as any);
      const latestCategories = await getCategories();
      setCategories(latestCategories);
    } catch (error: any) {
      console.error("Failed to add category:", error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to add category.\n\nError: ${msg}`);
      throw error;
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      await apiUpdateProduct(updatedProduct);
      await fetchData({ background: true });
    } catch (error: any) {
      console.error("Failed to update product:", error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to update product.\n\nError: ${msg}`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await apiDeleteProduct(productId);
      await fetchData({ background: true });
    } catch (error: any) {
      console.error("Failed to delete product:", error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to delete product.\n\nError: ${msg}`);
    }
  };

  const handleFetchDeletedItems = async () => {
    const [deletedProducts, deletedIngredients] = await Promise.all([
      getDeletedProducts(),
      getDeletedIngredients()
    ]);
    return { products: deletedProducts, ingredients: deletedIngredients };
  };

  const handleRestoreProduct = async (productId: string) => {
    try {
      await apiRestoreProduct(productId);
      await fetchData({ background: true });
    } catch (error: any) {
      console.error('Failed to restore product:', error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to restore product.\n\nError: ${msg}`);
      throw error;
    }
  };

  const handleRestoreIngredient = async (ingredientId: string) => {
    try {
      await apiRestoreIngredient(ingredientId);
      await fetchData({ background: true });
    } catch (error: any) {
      console.error('Failed to restore ingredient:', error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to restore ingredient.\n\nError: ${msg}`);
      throw error;
    }
  };

  const handleAddIngredient = async (ingredientData: Omit<Ingredient, 'id' | 'createdAt'>) => {
    try {
      await apiAddIngredient(ingredientData);
      await fetchData({ background: true });
    } catch (error: any) {
      console.error('Failed to add ingredient:', error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to add ingredient. ${msg}`);
    }
  };

  const handleUpdateIngredient = async (updatedIngredient: Ingredient) => {
    try {
      await apiUpdateIngredient(updatedIngredient);
      await fetchData({ background: true });
    } catch (error: any) {
      console.error('Failed to update ingredient:', error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to update ingredient. ${msg}`);
    }
  };

  const handleDeleteIngredient = async (ingredientId: string) => {
    try {
      await apiDeleteIngredient(ingredientId);
      await fetchData({ background: true });
    } catch (error: any) {
      console.error('Failed to delete ingredient:', error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to delete ingredient. ${msg}`);
    }
  };

  const handleAdjustProductStock = async (productId: string, adjustment: number, reason: string) => {
    try {
      await apiAdjustProductStock(productId, adjustment, reason, userRole ?? 'system');
      await fetchData({ background: true });
    } catch (error: any) {
      console.error('Failed to adjust product stock:', error);
      alert(`Failed to adjust stock. ${error?.message || ''}`);
    }
  };

  const handleAdjustIngredientStock = async (ingredientId: string, adjustment: number, reason: string) => {
    try {
      await apiAdjustIngredientStock(ingredientId, adjustment, reason, userRole ?? 'system');
      await fetchData({ background: true });
    } catch (error: any) {
      console.error('Failed to adjust ingredient stock:', error);
      alert(`Failed to adjust ingredient stock. ${error?.message || ''}`);
    }
  };

  const handleLogin = (role: UserRole, isDemo = false) => {
    if (isDemo) {
      sessionStorage.setItem(DEMO_AUTH_STORAGE_KEY, role);
      applyCachedData(readCachedAppData());
    } else {
      sessionStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
    }
    setUserRole(role);
    setIsLoggedIn(true);
    setIsAuthLoading(false);
    setCurrentView(role === UserRole.EMPLOYEE ? ViewState.BILLING : ViewState.DASHBOARD);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--brand-muted)] p-4">
        <div className="flex flex-col items-center gap-4 bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-3xl shadow-xl p-8">
          <Loader2 className="animate-spin text-[var(--brand-dark)]" size={48} />
          <p className="text-[var(--brand-text-dark)] font-medium">Restoring session...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout
      currentView={currentView}
      fillViewport={currentView === ViewState.BILLING}
      onChangeView={setCurrentView}
      onLogout={async () => {
        try {
          sessionStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
          if (supabase) await supabaseSignOut();
        } catch (err) {
          console.warn('Sign-out failed:', err);
        }
        clearAppDataCache();
        setIsLoggedIn(false);
        setUserRole(null);
      }}
      notifications={notifications}
      userRole={userRole ?? UserRole.ADMIN}
    >
      {isSyncingData && products.length === 0 && (
        <div className="mx-3 sm:mx-4 md:mx-6 mt-2 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-2 text-sm text-[var(--brand-dark)] flex items-center gap-2">
          <Loader2 className="animate-spin shrink-0" size={16} />
          Syncing latest products...
        </div>
      )}
      <Suspense fallback={<PageLoader />}>
        {currentView === ViewState.DASHBOARD && (
          userRole === UserRole.EMPLOYEE ? (
            <EmployeeDashboard sales={sales} products={products} dailyStats={MOCK_DAILY_STATS} />
          ) : (
            <Dashboard sales={sales} products={products} dailyStats={MOCK_DAILY_STATS} />
          )
        )}
        {currentView === ViewState.BILLING && (
          <Billing
            products={products}
            customers={customers}
            categories={categories}
            salesTodayTotal={salesTodayTotal}
            onCompleteSales={handleCompleteSales}
          />
        )}
        {currentView === ViewState.BILLS && (
          <BillsHistory
            sales={sales}
            customers={customers}
            userRole={userRole ?? UserRole.ADMIN}
            onUpdateSale={handleUpdateSale}
            onVoidSale={handleVoidSale}
          />
        )}
        {currentView === ViewState.CUSTOMERS && (
          <Customers
            customers={customers}
            sales={sales}
            onAddCustomer={handleAddCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        )}
        {currentView === ViewState.USERS && userRole === UserRole.ADMIN && (
          <Users />
        )}
        {currentView === ViewState.INVENTORY && (
          <Inventory
              products={products}
              categories={categories}
              ingredients={ingredients}
              inventoryAdjustments={inventoryAdjustments}
              onAddProduct={handleAddProduct}
              onAddCategory={handleAddCategory}
              onAddIngredient={handleAddIngredient}
              onUpdateIngredient={handleUpdateIngredient}
              onDeleteIngredient={handleDeleteIngredient}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onAdjustProductStock={handleAdjustProductStock}
              onAdjustIngredientStock={handleAdjustIngredientStock}
              onFetchDeletedItems={handleFetchDeletedItems}
              onRestoreProduct={handleRestoreProduct}
              onRestoreIngredient={handleRestoreIngredient}
              canEdit={userRole === UserRole.ADMIN}
            />
        )}
        {currentView === ViewState.CATEGORIES && userRole === UserRole.ADMIN && (
          <Categories
            categories={categories}
            onAddCategory={handleAddCategory}
            onUpdateCategory={async (id, name, file) => { try { await updateCategory(id, name, file as any); const latest = await getCategories(); setCategories(latest); } catch (err) { console.error(err); alert('Failed to update category'); } }}
            onDeleteCategory={async (id) => { try { await deleteCategory(id); const latest = await getCategories(); setCategories(latest); } catch (err) { console.error(err); alert('Failed to delete category'); } }}
            canEdit={userRole === UserRole.ADMIN}
          />
        )}
      </Suspense>
    </Layout>
  );
};

export default App;
