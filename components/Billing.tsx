import { FC, useState, useMemo, useEffect } from 'react';
import { Product, CartItem, Customer } from '../types';
import { Search, Plus, Minus, CreditCard, CheckCircle, ShoppingBag, User, X, Award, Smartphone, Banknote } from 'lucide-react';
import { SHOP_QR_CODE_URL } from '../constants';

interface BillingProps {
  products: Product[];
  customers: Customer[];
  categories: import('../types').Category[];
  onCompleteSale: (
    items: CartItem[],
    total: number,
    subtotal: number,
    taxAmount: number,
    roundingAdjustment: number,
    paidAmount: number,
    paymentMethod: 'CASH' | 'UPI' | 'OTHER',
    customerId?: string,
    pointsRedeemed?: number,
    discountAmount?: number
  ) => Promise<void>;
}

interface BillGroup {
  id: string;
  name: string;
  customer?: Customer;
  items: CartItem[];
  redeemPoints: boolean;
}

type PaymentMethod = 'CASH' | 'UPI' | 'OTHER' | null;
const CGST_RATE = 0.09;
const SGST_RATE = 0.09;

const Billing: FC<BillingProps> = ({ products, customers, categories, onCompleteSale }) => {
  const [groups, setGroups] = useState<BillGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [categoryScrollIndex, setCategoryScrollIndex] = useState(0);
  const [customerSearch, setCustomerSearch] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'payment' | 'success'>('cart');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [isProcessing, setIsProcessing] = useState(false);
  const [saleError, setSaleError] = useState('');
  const [printMode, setPrintMode] = useState<'all' | 'selected'>('all');
  const [selectedPrintGroupIds, setSelectedPrintGroupIds] = useState<string[]>([]);

  const categoryNamesFromProducts = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort();
  }, [products]);

  const combinedCategories = useMemo(() => {
    // Use provided categories with images, but keep any product-derived category names
    const names = new Set<string>();
    categoryNamesFromProducts.forEach(n => names.add(n));
    (categories || []).forEach(c => names.add(c.name));
    return ['All', ...Array.from(names).sort()];
  }, [categoryNamesFromProducts, categories]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return products.filter((p) => {
      const matchesText = p.name.toLowerCase().includes(normalizedSearch) || p.category.toLowerCase().includes(normalizedSearch);
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      return matchesText && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return [];
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.phone.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  const activeGroup = useMemo(() => {
    return groups.find((group) => group.id === activeGroupId) ?? groups[0] ?? null;
  }, [groups, activeGroupId]);

  const printGroups = useMemo(() => {
    return printMode === 'all' ? groups : groups.filter((g) => selectedPrintGroupIds.includes(g.id));
  }, [groups, printMode, selectedPrintGroupIds]);

  useEffect(() => {
    setSelectedPrintGroupIds((prev) => prev.filter((id) => groups.some((group) => group.id === id)));
  }, [groups]);

  const createGroup = (name: string, customer?: Customer) => {
    const id = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newGroup: BillGroup = {
      id,
      name,
      customer,
      items: [],
      redeemPoints: false,
    };
    setGroups((prev) => [...prev, newGroup]);
    setActiveGroupId(id);
    setCustomerSearch('');
  };

  const assignCustomerToGroup = (customer: Customer) => {
    if (!activeGroup) {
      createGroup(`Customer ${groups.length + 1}`, customer);
      return;
    }
    setGroups((prev) => prev.map((group) => {
      if (group.id !== activeGroup.id) return group;
      return { ...group, customer, redeemPoints: false };
    }));
    setCustomerSearch('');
  };

  const toggleRedeemPoints = (enabled: boolean) => {
    if (!activeGroup) return;
    setGroups((prev) => prev.map((group) => {
      if (group.id !== activeGroup.id) return group;
      return { ...group, redeemPoints: enabled };
    }));
  };

  const addToCart = (product: Product) => {
    if (!activeGroup) {
      const groupName = `Customer ${groups.length + 1}`;
      const group: BillGroup = {
        id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: groupName,
        items: [{ ...product, quantity: 1 }],
        redeemPoints: false,
      };
      setGroups((prev) => [...prev, group]);
      setActiveGroupId(group.id);
      return;
    }

    setGroups((prev) => prev.map((group) => {
      if (group.id !== activeGroup.id) return group;
      const existing = group.items.find((item) => item.id === product.id);
      if (existing) {
        return {
          ...group,
          items: group.items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item),
        };
      }
      return {
        ...group,
        items: [...group.items, { ...product, quantity: 1 }],
      };
    }));
  };

  const updateQuantity = (groupId: string, id: string, delta: number) => {
    setGroups((prev) => prev.map((group) => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        items: group.items.map((item) => {
          if (item.id === id) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        }).filter((item) => item.quantity > 0),
      };
    }));
  };

  const removeGroup = (groupId: string) => {
    setGroups((prev) => {
      const next = prev.filter((group) => group.id !== groupId);
      if (activeGroupId === groupId) {
        setActiveGroupId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const removeItem = (groupId: string, itemId: string) => {
    setGroups((prev) => prev.map((group) => {
      if (group.id !== groupId) return group;
      return { ...group, items: group.items.filter((it) => it.id !== itemId) };
    }));
    // if the removed item made the active group empty, keep the group but UI handles empty state
  };

  const getGroupSubtotal = (group: BillGroup) => group.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const getGroupDiscount = (group: BillGroup) => {
    if (!group.redeemPoints || !group.customer) return 0;
    return Math.min(getGroupSubtotal(group), 50);
  };
  const getGroupCgst = (group: BillGroup) => parseFloat(((getGroupSubtotal(group) - getGroupDiscount(group)) * CGST_RATE).toFixed(2));
  const getGroupSgst = (group: BillGroup) => parseFloat(((getGroupSubtotal(group) - getGroupDiscount(group)) * SGST_RATE).toFixed(2));
  const getGroupTotal = (group: BillGroup) => {
    const subtotal = getGroupSubtotal(group);
    const discount = getGroupDiscount(group);
    const cgst = getGroupCgst(group);
    const sgst = getGroupSgst(group);
    return parseFloat((subtotal - discount + cgst + sgst).toFixed(2));
  };

  const totalSubtotal = groups.reduce((sum, group) => sum + getGroupSubtotal(group), 0);
  const totalDiscount = groups.reduce((sum, group) => sum + getGroupDiscount(group), 0);
  const totalCgst = groups.reduce((sum, group) => sum + getGroupCgst(group), 0);
  const totalSgst = groups.reduce((sum, group) => sum + getGroupSgst(group), 0);
  const totalGst = parseFloat((totalCgst + totalSgst).toFixed(2));
  const invoiceTotalBeforeRound = totalSubtotal - totalDiscount + totalGst;
  const roundingAdjustment = parseFloat((Math.round(invoiceTotalBeforeRound) - invoiceTotalBeforeRound).toFixed(2));
  const finalTotal = parseFloat((invoiceTotalBeforeRound + roundingAdjustment).toFixed(2));
  const paidAmount = finalTotal;

  const combinedItems = groups.flatMap((group) => group.items);
  const activeGroupSubtotal = activeGroup ? getGroupSubtotal(activeGroup) : 0;
  const activeGroupItems = activeGroup?.items ?? [];
  const activeGroupCanRedeem = !!activeGroup?.customer && activeGroup.customer.loyaltyPoints >= 50 && activeGroupItems.length > 0;
  const activeGroupRedeemPoints = activeGroup?.redeemPoints ?? false;
  const hasInvoiceItems = groups.some((group) => group.items.length > 0);

  const handleProceedToPayment = () => {
    if (!hasInvoiceItems) return;
    setCheckoutStep('payment');
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    setSaleError('');
    try {
      await onCompleteSale(
        combinedItems,
        finalTotal,
        totalSubtotal,
        totalGst,
        roundingAdjustment,
        paidAmount,
        paymentMethod || 'CASH'
      );
      setCheckoutStep('success');
    } catch (err: any) {
      const msg = err?.message || String(err) || 'Unknown error';
      if (/fetch|network|connect/i.test(msg)) {
        setSaleError('Network error: could not reach the database. Check your internet connection and try again.');
      } else {
        setSaleError(`Sale failed: ${msg}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartNewBill = () => {
    setGroups([]);
    setActiveGroupId(null);
    setCustomerSearch('');
    setCheckoutStep('cart');
    setPaymentMethod('CASH');
    setSaleError('');
    setPrintMode('all');
    setSelectedPrintGroupIds([]);
  };

  const printReceipt = () => {
    // ensure thermal print area reflects current selection
    window.print();
  };

  const togglePrintGroupSelection = (groupId: string) => {
    setSelectedPrintGroupIds((prev) => {
      if (prev.includes(groupId)) return prev.filter((id) => id !== groupId);
      return [...prev, groupId];
    });
  };

  const handlePrintModeChange = (mode: 'all' | 'selected') => {
    setPrintMode(mode);
    if (mode === 'selected') {
      setSelectedPrintGroupIds((prev) => {
        if (prev.length > 0) return prev.filter((id) => groups.some((group) => group.id === id));
        return groups.map((group) => group.id);
      });
      return;
    }
    setSelectedPrintGroupIds([]);
  };

  const receiptNumber = `INV-${Date.now().toString().slice(-6)}`;
  const receiptTimestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  if (checkoutStep === 'success') {
    return (
      <div className="h-full flex flex-col items-center justify-center animate-fade-in text-center p-8">
        <div className="bg-[var(--brand-accent)]/20 p-6 rounded-full text-[var(--brand-dark)] mb-6 animate-scale-up">
          <CheckCircle size={64} />
        </div>
        <h2 className="text-2xl font-bold text-[var(--brand-dark)] mb-2">Payment Successful!</h2>
        <p className="text-[var(--brand-border)] mb-4">Transaction recorded securely. You can print the bill below.</p>

        <div className="mb-4 w-full max-w-md">
            
            <div className="mb-3 flex items-center gap-3">
              <button
                type="button"
                className={`px-3 py-2 rounded-xl border cursor-pointer ${printMode === 'all' ? 'bg-[var(--brand-dark)] text-[var(--brand-text-light)]' : 'bg-white text-[var(--brand-border)]'}`}
                onClick={() => handlePrintModeChange('all')}
              >
                Print All
              </button>
              <button
                type="button"
                className={`px-3 py-2 rounded-xl border cursor-pointer ${printMode === 'selected' ? 'bg-[var(--brand-dark)] text-[var(--brand-text-light)]' : 'bg-white text-[var(--brand-border)]'}`}
                onClick={() => handlePrintModeChange('selected')}
              >
                Print Selected
              </button>
            </div>
            {printMode === 'selected' && (
              <div className="space-y-2 mb-3 rounded-lg border p-3 bg-white text-sm">
                {groups.map((group) => (
                  <label key={group.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedPrintGroupIds.includes(group.id)} onChange={() => togglePrintGroupSelection(group.id)} />
                      <span className="text-sm">{group.customer?.name ?? group.name}</span>
                    </div>
                    <span className="text-xs text-[var(--brand-border)]">₹{getGroupTotal(group).toFixed(2)}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="thermal-receipt-print" aria-hidden="true">
              <div className="thermal-receipt-print__header">
                <div className="font-bold text-[12px] uppercase tracking-wide">Suvai Bakery</div>
                <div className="text-[10px]">Bakery Billing Receipt</div>
                <div className="text-[10px]">Receipt #: {receiptNumber}</div>
                <div className="text-[10px]">{receiptTimestamp}</div>
              </div>
              <div className="thermal-receipt-print__divider" />
              {printGroups.map((group) => (
                <div key={group.id} className="space-y-1 text-[10px] thermal-receipt-print__group">
                  <div className="font-bold">{group.customer?.name ?? group.name}</div>
                  {group.items.map((item) => (
                    <div key={`${group.id}-${item.id}`} className="flex justify-between gap-2">
                      <span className="flex-1">{item.name} x {item.quantity}</span>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[10px] pt-1">
                    <span>Subtotal</span>
                    <span>₹{getGroupSubtotal(group).toFixed(2)}</span>
                  </div>
                  {getGroupDiscount(group) > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span>Discount</span>
                      <span>-₹{getGroupDiscount(group).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[10px]">
                    <span>CGST (9%)</span>
                    <span>₹{getGroupCgst(group).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>SGST (9%)</span>
                    <span>₹{getGroupSgst(group).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-semibold pt-1 border-t border-dashed border-slate-200">
                    <span>Total</span>
                    <span>₹{getGroupTotal(group).toFixed(2)}</span>
                  </div>
                </div>
              ))}
              <div className="thermal-receipt-print__divider" />
              <div className="text-[10px] text-center">
                <div>Payment: {paymentMethod === 'UPI' ? 'UPI / GPay' : 'Cash'}</div>
                <div>Thank you for shopping!</div>
              </div>
            </div>
          </div>
        <div className="mt-4 flex flex-col gap-3">
          <button
            onClick={printReceipt}
            disabled={printMode === 'selected' && selectedPrintGroupIds.length === 0}
            className={`btn btn-primary transition-all ${printMode === 'selected' && selectedPrintGroupIds.length === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {printMode === 'selected' ? `Print Selected (${selectedPrintGroupIds.length})` : 'Print All Customers'}
          </button>
          <button
            type="button"
            onClick={handleStartNewBill}
            className="btn btn-secondary"
          >
            Start New Bill
          </button>
        </div>
      </div>
    );
  }

  // Payment Selection Screen
  if (checkoutStep === 'payment') {
      return (
          <div className="h-full flex flex-col items-center justify-center animate-fade-in p-4">
              <div className="bg-[var(--brand-surface)] p-8 rounded-2xl shadow-xl border border-[var(--brand-border)] max-w-md w-full">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-[var(--brand-dark)]">Select Payment Method</h2>
                      <button onClick={() => setCheckoutStep('cart')} className="text-[var(--brand-border)] hover:text-[var(--brand-dark)]">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="text-center mb-6">
                      <p className="text-[var(--brand-border)] text-sm mb-1">Review each customer's bill</p>
                      <h2 className="text-2xl font-bold text-[var(--brand-dark)]">Checkout Review</h2>
                  </div>

                  <div className="space-y-3 mb-8 rounded-3xl border border-[var(--brand-border)] bg-white p-4 text-sm text-[var(--brand-dark)]">
                    {groups.map((group) => (
                      <div key={group.id} className="space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span>{group.customer?.name ?? group.name}</span>
                          <span>₹{getGroupTotal(group).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[var(--brand-border)] text-xs">
                          <span>Subtotal</span>
                          <span>₹{getGroupSubtotal(group).toFixed(2)}</span>
                        </div>
                        {getGroupDiscount(group) > 0 && (
                          <div className="flex justify-between text-[var(--brand-border)] text-xs">
                            <span>Discount</span>
                            <span>-₹{getGroupDiscount(group).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[var(--brand-border)] text-xs">
                          <span>CGST (9%)</span>
                          <span>₹{getGroupCgst(group).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[var(--brand-border)] text-xs">
                          <span>SGST (9%)</span>
                          <span>₹{getGroupSgst(group).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                      <button 
                          onClick={() => setPaymentMethod('CASH')}
                          className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                              paymentMethod === 'CASH' ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)]/20 text-[var(--brand-dark)]' : 'border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-border)] hover:border-[var(--brand-dark)]'
                          }`}
                      >
                          <Banknote size={32} />
                          <span className="font-semibold">Cash</span>
                      </button>
                      <button 
                          onClick={() => setPaymentMethod('UPI')}
                          className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                              paymentMethod === 'UPI' ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)]/20 text-[var(--brand-dark)]' : 'border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-border)] hover:border-[var(--brand-dark)]'
                          }`}
                      >
                          <Smartphone size={32} />
                          <span className="font-semibold">UPI / GPay</span>
                      </button>
                  </div>

                  {paymentMethod === 'UPI' && (
                      <div className="mb-8 text-center bg-[var(--brand-muted)] p-6 rounded-xl border border-[var(--brand-border)] animate-fade-in">
                          <p className="text-sm text-[var(--brand-border)] mb-4">Scan QR to Pay</p>
                          <div className="w-40 h-40 bg-[var(--brand-surface)] p-2 rounded-lg shadow-sm mx-auto mb-4 border border-[var(--brand-border)]">
                              <img src={SHOP_QR_CODE_URL} alt="Shop UPI QR" className="w-full h-full object-contain" />
                          </div>
                      </div>
                  )}

                  <button 
                      onClick={handleConfirmPayment}
                      disabled={!paymentMethod || isProcessing}
                      className="w-full bg-[var(--brand-dark)] text-[var(--brand-text-light)] py-4 rounded-xl font-bold text-lg hover:bg-[var(--brand-bg)] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[var(--brand-border)] flex items-center justify-center gap-3"
                  >
                      {isProcessing ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        paymentMethod === 'UPI' ? 'Confirm Payment Received' : 'Complete Cash Sale'
                      )}
                  </button>
                  {saleError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
                      {saleError}
                    </div>
                  )}
              </div>
          </div>
      )
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] gap-6 md:gap-8 pb-20 md:pb-0">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="mb-4 md:mb-6 space-y-4">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand-border)]" size={20} />
            <input 
              type="text" 
              placeholder="Search products..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] transition-all text-[var(--brand-text-dark)] bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-sm font-medium text-[var(--brand-dark)]">Category</label>
            <div className="w-full overflow-x-auto py-2">
              <div className="inline-flex items-center gap-3">
                <button type="button" onClick={() => setCategoryFilter('All')} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl ${categoryFilter === 'All' ? 'bg-[var(--brand-dark)] text-[var(--brand-text-light)]' : 'bg-white text-[var(--brand-border)]'}`}>
                  All
                </button>
                {(categories || []).map(cat => (
                  <button key={cat.id} type="button" onClick={() => setCategoryFilter(cat.name)} className={`inline-flex items-center gap-2 px-2 py-1 rounded-md ${categoryFilter === cat.name ? 'bg-[var(--brand-dark)] text-[var(--brand-text-light)]' : 'bg-white text-[var(--brand-border)]'}`}>
                    {cat.imageUrl ? <img src={cat.imageUrl} alt={cat.name} className="w-8 h-6 object-cover rounded-sm" /> : <div className="w-8 h-6 bg-[var(--brand-muted)] rounded-sm" />}
                    <span className="text-xs">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-[var(--brand-border)] bg-white px-3 py-2 text-sm text-[var(--brand-text-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
            >
              {combinedCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 overflow-y-auto pr-1 pb-2">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              disabled={product.stock <= 0}
              className={`p-3 md:p-4 rounded-xl border text-left transition-all relative group ${
                product.stock <= 0 
                  ? 'bg-[var(--brand-muted)] border-[var(--brand-border)] opacity-60 cursor-not-allowed' 
                  : 'bg-[var(--brand-surface)] border-[var(--brand-border)] hover:border-[var(--brand-dark)] hover:shadow-sm active:scale-[0.98]'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-[var(--brand-border)] bg-[var(--brand-muted)] px-2 py-0.5 rounded-full">{product.category}</span>
                <span className="font-bold text-[var(--brand-dark)]">₹{product.price.toFixed(2)}</span>
              </div>
              <h4 className="font-medium text-[var(--brand-dark)] mb-1 truncate text-sm md:text-base">{product.name}</h4>
              <p className={`text-xs ${product.stock < 10 ? 'text-[var(--brand-accent)]' : 'text-[var(--brand-border)]'}`}>
                {product.stock} {product.unit} left
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Sidebar (Desktop: Static, Mobile: Bottom Sheet logic could go here, but for now just stacking) */}
      <div className="w-full md:w-96 bg-[var(--brand-surface)] rounded-2xl border border-[var(--brand-border)] shadow-sm flex flex-col overflow-hidden shrink-0 h-[40vh] md:h-auto">
        {/* Group Navigation */}
        <div className="p-3 border-b border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <div className="flex flex-wrap gap-2 items-center mb-3">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`px-3 py-2 rounded-2xl border text-xs font-semibold transition ${
                  activeGroup?.id === group.id
                    ? 'border-[var(--brand-dark)] bg-[var(--brand-dark)]/10 text-[var(--brand-dark)]'
                    : 'border-[var(--brand-border)] bg-white text-[var(--brand-border)] hover:border-[var(--brand-dark)]'
                }`}
              >
                {group.name}
              </button>
            ))}
            <button
              onClick={() => createGroup(`Customer ${groups.length + 1}`)}
              className="px-3 py-2 rounded-2xl border border-[var(--brand-border)] bg-white text-[var(--brand-dark)] text-xs font-semibold hover:border-[var(--brand-dark)]"
            >
              + Add Group
            </button>
          </div>
          <div className="text-xs text-[var(--brand-border)]">
            {activeGroup ? `Active group: ${activeGroup.name}` : 'Create a group and add items.'}
          </div>
        </div>

        {/* Customer Section */}
        <div className="p-3 md:p-4 border-b border-[var(--brand-border)] bg-[var(--brand-muted)]">
          {activeGroup ? (
            activeGroup.customer ? (
              <div className="flex justify-between items-center bg-[var(--brand-surface)] p-2 rounded-lg border border-[var(--brand-border)]">
                <div>
                  <div className="text-sm font-bold text-[var(--brand-dark)]">{activeGroup.customer.name}</div>
                  <div className="text-xs text-[var(--brand-dark)] font-medium flex items-center gap-1">
                    <Award size={12} /> {activeGroup.customer.loyaltyPoints} Points
                  </div>
                </div>
                <button
                  onClick={() => {
                    setGroups((prev) => prev.map((group) => {
                      if (group.id !== activeGroup.id) return group;
                      return { ...group, customer: undefined, redeemPoints: false };
                    }));
                    setCustomerSearch('');
                  }}
                  className="text-[var(--brand-border)] hover:text-[var(--brand-dark)]"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand-border)]" size={18} />
                <input
                  type="text"
                  placeholder="Find Customer (Name/Phone)"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-sm text-[var(--brand-text-dark)] bg-white"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                {customerSearch && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-lg shadow-lg mt-1 z-20 max-h-48 overflow-y-auto">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        className="w-full text-left px-4 py-2 hover:bg-[var(--brand-muted)] text-sm"
                        onClick={() => assignCustomerToGroup(c)}
                      >
                        <div className="font-medium text-[var(--brand-dark)]">{c.name}</div>
                        <div className="text-xs text-[var(--brand-border)]">{c.phone} • {c.loyaltyPoints} pts</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="text-sm text-[var(--brand-border)]">Select or add a group, then assign a customer.</div>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[var(--brand-surface)]">
          {!activeGroup || activeGroupItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--brand-border)] text-sm">
              <ShoppingBag size={32} className="mb-2 opacity-50" />
              <p>{activeGroup ? 'No items in the active group yet.' : 'No group selected.'}</p>
            </div>
          ) : (
            activeGroupItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-[var(--brand-surface)] p-2 rounded-lg border border-[var(--brand-border)]">
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-[var(--brand-dark)]">{item.name}</h4>
                  <div className="text-xs text-[var(--brand-border)]">₹{item.price.toFixed(2)} x {item.quantity}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(activeGroup.id, item.id, -1)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--brand-muted)] hover:bg-[var(--brand-surface)] text-[var(--brand-dark)] transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="font-medium text-sm w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(activeGroup.id, item.id, 1)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--brand-muted)] hover:bg-[var(--brand-surface)] text-[var(--brand-dark)] transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(activeGroup.id, item.id)}
                  className="ml-2 p-1 rounded-md text-[var(--brand-border)] hover:text-[var(--brand-dark)]"
                  aria-label="Remove item"
                >
                  <X size={16} />
                </button>
                <div className="font-bold text-sm text-[var(--brand-dark)] min-w-[3rem] text-right">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals Section */}
        <div className="p-4 bg-[var(--brand-surface)] border-t border-[var(--brand-border)]">
          {activeGroupCanRedeem && (
             <div className="mb-3 flex items-center justify-between bg-[var(--brand-accent)]/20 p-2 rounded-lg border border-[var(--brand-border)]">
               <div className="flex items-center gap-2">
                 <input
                    type="checkbox"
                    id="redeem"
                    checked={activeGroupRedeemPoints}
                    onChange={(e) => toggleRedeemPoints(e.target.checked)}
                    className="rounded text-[var(--brand-accent)] focus:ring-[var(--brand-accent)] w-4 h-4"
                 />
                 <label htmlFor="redeem" className="text-xs font-medium text-[var(--brand-dark)] cursor-pointer">
                    Redeem 50 pts (₹50 off)
                 </label>
               </div>
             </div>
          )}

          <div className="space-y-3 mb-4">
            <div className="text-[var(--brand-border)] text-xs">
              Checkout will show each customer's invoice separately with independent GST and totals.
            </div>
          </div>

          <button 
            onClick={handleProceedToPayment}
            disabled={!hasInvoiceItems}
            className="w-full bg-[var(--brand-dark)] text-[var(--brand-text-light)] py-3 rounded-xl font-semibold hover:bg-[var(--brand-bg)] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[var(--brand-border)] active:scale-95"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Billing;