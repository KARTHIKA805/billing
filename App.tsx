import React, { useState, useEffect } from 'react';
import {
  signIn as supabaseSignIn,
  signOut as supabaseSignOut,
  supabase,
  getUser,
  getUserRole,
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
  addCustomer as apiAddCustomer,
  deleteCustomer as apiDeleteCustomer,
  createSale as apiCreateSale
} from './services/supabaseService';
import { ViewState, Product, SaleRecord, CartItem, Customer, DailyStat, UserRole, Category, Ingredient, InventoryAdjustment } from './types';
import { MOCK_DAILY_STATS } from './constants';


import Dashboard from './components/Dashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import Billing from './components/Billing';
import Inventory from './components/Inventory';
import Customers from './components/Customers';
import Users from './components/Users';
import Layout from "./components/Layout";
import Categories from './components/Categories';
import { updateCategory, deleteCategory } from './services/supabaseService';

import { Lock, User, Loader2 } from 'lucide-react';

const DEMO_AUTH_STORAGE_KEY = 'suvai_demo_auth';

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [inventoryAdjustments, setInventoryAdjustments] = useState<InventoryAdjustment[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Dynamic stats derived from interactions
  const [notifications, setNotifications] = useState<{id: string, message: string}[]>([]);

  // Restore auth session on refresh
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const storedDemoRole = sessionStorage.getItem(DEMO_AUTH_STORAGE_KEY);
        if (storedDemoRole === UserRole.ADMIN || storedDemoRole === UserRole.EMPLOYEE) {
          if (!isMounted) return;
          setUserRole(storedDemoRole);
          setIsLoggedIn(true);
          setCurrentView(storedDemoRole === UserRole.EMPLOYEE ? ViewState.BILLING : ViewState.DASHBOARD);
          return;
        }

        if (!supabase) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const role = await getUserRole(session.user);
        if (!isMounted) return;
        setUserRole(role);
        setIsLoggedIn(true);
        setCurrentView(role === UserRole.EMPLOYEE ? ViewState.BILLING : ViewState.DASHBOARD);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (sessionStorage.getItem(DEMO_AUTH_STORAGE_KEY)) return;

      if (session?.user) {
        try {
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
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch Data when Logged In
  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [prods, cats, ings, adjustments, sls, custs] = await Promise.all([
        getProducts(),
        getCategories(),
        getIngredients(),
        getInventoryAdjustments(),
        getSales(),
        getCustomers()
      ]);
      setProducts(prods);
      setCategories(cats);
      setIngredients(ings);
      setInventoryAdjustments(adjustments);
      setSales(sls);
      setCustomers(custs);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (userRole === UserRole.EMPLOYEE && [ViewState.DASHBOARD, ViewState.USERS].includes(currentView)) {
      setCurrentView(ViewState.BILLING);
    }
  }, [currentView, userRole]);

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

  const handleCompleteSale = async (
    items: CartItem[],
    total: number,
    subtotal: number,
    taxAmount: number,
    roundingAdjustment: number,
    paidAmount: number,
    paymentMethod: 'CASH' | 'UPI' | 'OTHER',
    customerId?: string,
    pointsRedeemed: number = 0,
    discountAmount: number = 0
  ): Promise<void> => {
    const pointsEarned = Math.floor(total);

    const newSale: SaleRecord = {
      id: '', // Will be generated by DB
      timestamp: new Date(),
      items,
      subtotal,
      taxAmount,
      roundingAdjustment,
      total,
      paidAmount,
      paymentMethod,
      customerId,
      pointsEarned,
      pointsRedeemed,
      discountAmount
    };

    // Let errors propagate to Billing.tsx so it can show inline error messages
    await apiCreateSale(newSale);

    // Refresh data in background after successful sale
    fetchData().catch(err => console.warn('Background refresh failed:', err));
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
      await fetchData();
    } catch (error) {
      console.error("Failed to add customer:", error);
      alert("Failed to add customer.");
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await apiDeleteCustomer(customerId);
      await fetchData();
    } catch (error: any) {
      console.error("Failed to delete customer:", error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to delete customer. Error: ${msg}`);
    }
  };

  const handleAddProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      await apiAddProduct(productData);
      await fetchData();
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
      await fetchData();
    } catch (error: any) {
      console.error("Failed to update product:", error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to update product.\n\nError: ${msg}`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await apiDeleteProduct(productId);
      await fetchData();
    } catch (error: any) {
      console.error("Failed to delete product:", error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to delete product.\n\nError: ${msg}`);
    }
  };

  const handleAddIngredient = async (ingredientData: Omit<Ingredient, 'id' | 'createdAt'>) => {
    try {
      await apiAddIngredient(ingredientData);
      await fetchData();
    } catch (error: any) {
      console.error('Failed to add ingredient:', error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to add ingredient. ${msg}`);
    }
  };

  const handleUpdateIngredient = async (updatedIngredient: Ingredient) => {
    try {
      await apiUpdateIngredient(updatedIngredient);
      await fetchData();
    } catch (error: any) {
      console.error('Failed to update ingredient:', error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to update ingredient. ${msg}`);
    }
  };

  const handleDeleteIngredient = async (ingredientId: string) => {
    try {
      await apiDeleteIngredient(ingredientId);
      await fetchData();
    } catch (error: any) {
      console.error('Failed to delete ingredient:', error);
      const msg = error?.message || error?.error_description || JSON.stringify(error);
      alert(`Failed to delete ingredient. ${msg}`);
    }
  };

  const handleAdjustProductStock = async (productId: string, adjustment: number, reason: string) => {
    try {
      await apiAdjustProductStock(productId, adjustment, reason, userRole ?? 'system');
      await fetchData();
    } catch (error: any) {
      console.error('Failed to adjust product stock:', error);
      alert(`Failed to adjust stock. ${error?.message || ''}`);
    }
  };

  const handleAdjustIngredientStock = async (ingredientId: string, adjustment: number, reason: string) => {
    try {
      await apiAdjustIngredientStock(ingredientId, adjustment, reason, userRole ?? 'system');
      await fetchData();
    } catch (error: any) {
      console.error('Failed to adjust ingredient stock:', error);
      alert(`Failed to adjust ingredient stock. ${error?.message || ''}`);
    }
  };

  const handleLogin = (role: UserRole, isDemo = false) => {
    if (isDemo) {
      sessionStorage.setItem(DEMO_AUTH_STORAGE_KEY, role);
    } else {
      sessionStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
    }
    setUserRole(role);
    setIsLoggedIn(true);
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

  if (isLoadingData && products.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--brand-muted)] p-4">
        <div className="flex flex-col items-center gap-4 bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-3xl shadow-xl p-8">
          <Loader2 className="animate-spin text-[var(--brand-dark)]" size={48} />
          <p className="text-[var(--brand-text-dark)] font-medium">Loading Bakery Data...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout
      currentView={currentView}
      onChangeView={setCurrentView}
      onLogout={async () => {
        try {
          sessionStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
          if (supabase) await supabaseSignOut();
        } catch (err) {
          console.warn('Sign-out failed:', err);
        }
        setIsLoggedIn(false);
        setUserRole(null);
      }}
      notifications={notifications}
      userRole={userRole ?? UserRole.ADMIN}
    >
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
          onCompleteSale={handleCompleteSale}
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
    </Layout>
  );
};

export default App;
