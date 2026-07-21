import { FC, useState, useMemo, useEffect, useRef } from 'react';
import { Product, CartItem, Customer } from '../types';
import { Search, Plus, Minus, CreditCard, CheckCircle, ShoppingBag, User, X, Award, Smartphone, Banknote } from 'lucide-react';
import { SHOP_QR_CODE_URL, getPriceForWeight, getCostForWeight, getCartLineId, getWeightPriceBreakdown, formatInventoryUnitPrice, isPieceUnit, PIECE_UNIT, getPieceBillingOptions, getPieceCartLineId } from '../constants';

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
  const [weightPickerProduct, setWeightPickerProduct] = useState<Product | null>(null);
  const [piecePickerProduct, setPiecePickerProduct] = useState<Product | null>(null);
  const [selectedWeightUnits, setSelectedWeightUnits] = useState<string[]>([]);
  const [selectedPieceCounts, setSelectedPieceCounts] = useState<number[]>([]);
  const hasAutoPrintedRef = useRef(false);

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
    return products
      .filter((p) => {
        const matchesText = p.name.toLowerCase().includes(normalizedSearch) || p.category.toLowerCase().includes(normalizedSearch);
        const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
        return matchesText && matchesCategory;
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
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

  useEffect(() => {
    if (checkoutStep !== 'success') {
      hasAutoPrintedRef.current = false;
      return;
    }

    if (hasAutoPrintedRef.current) return;
    if (printMode === 'selected' && selectedPrintGroupIds.length === 0) return;

    const timer = window.setTimeout(() => {
      hasAutoPrintedRef.current = true;
      window.print();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [checkoutStep, printMode, selectedPrintGroupIds.length]);

  const clearCustomerFromGroup = (groupId: string) => {
    setGroups((prev) => prev.map((group) => {
      if (group.id !== groupId) return group;
      return { ...group, customer: undefined, redeemPoints: false };
    }));
    setCustomerSearch('');
  };

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

  const addToCartWithPieces = (product: Product, pieceCount: number) => {
    const unitPrice = product.price;
    const unitCost = product.cost;
    const cartLineId = getPieceCartLineId(product.id);
    const cartItem: CartItem = {
      ...product,
      unit: PIECE_UNIT,
      price: unitPrice,
      cost: unitCost,
      quantity: pieceCount,
      cartLineId,
    };

    const addItemToGroup = (groupId: string | null, createIfMissing: boolean) => {
      if (!groupId && createIfMissing) {
        const groupName = `Customer ${groups.length + 1}`;
        const group: BillGroup = {
          id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: groupName,
          items: [cartItem],
          redeemPoints: false,
        };
        setGroups((prev) => [...prev, group]);
        setActiveGroupId(group.id);
        return;
      }

      setGroups((prev) => prev.map((group) => {
        if (group.id !== groupId) return group;
        const existing = group.items.find((item) => item.cartLineId === cartLineId);
        if (existing) {
          const newQuantity = Math.min(existing.quantity + pieceCount, product.stock);
          return {
            ...group,
            items: group.items.map((item) => item.cartLineId === cartLineId ? { ...item, quantity: newQuantity } : item),
          };
        }
        return {
          ...group,
          items: [...group.items, cartItem],
        };
      }));
    };

    if (!activeGroup) {
      addItemToGroup(null, true);
      return;
    }

    addItemToGroup(activeGroup.id, false);
  };

  const addToCartWithWeight = (product: Product, selectedUnit: string) => {
    const unitPrice = getPriceForWeight(product.price, product.unit, selectedUnit);
    const unitCost = getCostForWeight(product.cost, product.unit, selectedUnit);
    const cartLineId = getCartLineId(product.id, selectedUnit);
    const cartItem: CartItem = {
      ...product,
      unit: selectedUnit,
      price: unitPrice,
      cost: unitCost,
      quantity: 1,
      cartLineId,
    };

    if (!activeGroup) {
      const groupName = `Customer ${groups.length + 1}`;
      const group: BillGroup = {
        id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: groupName,
        items: [cartItem],
        redeemPoints: false,
      };
      setGroups((prev) => [...prev, group]);
      setActiveGroupId(group.id);
      return;
    }

    setGroups((prev) => prev.map((group) => {
      if (group.id !== activeGroup.id) return group;
      const existing = group.items.find((item) => item.cartLineId === cartLineId);
      if (existing) {
        const newQuantity = Math.min(existing.quantity + 1, product.stock);
        return {
          ...group,
          items: group.items.map((item) => item.cartLineId === cartLineId ? { ...item, quantity: newQuantity } : item),
        };
      }
      return {
        ...group,
        items: [...group.items, cartItem],
      };
    }));
  };

  const openWeightPicker = (product: Product) => {
    setPiecePickerProduct(null);
    setSelectedPieceCounts([]);
    setSelectedWeightUnits([]);
    setWeightPickerProduct(product);
  };

  const openPiecePicker = (product: Product) => {
    setWeightPickerProduct(null);
    setSelectedWeightUnits([]);
    setSelectedPieceCounts([]);
    setPiecePickerProduct(product);
  };

  const handleProductSelect = (product: Product) => {
    if (isPieceUnit(product.unit)) {
      openPiecePicker(product);
      return;
    }
    openWeightPicker(product);
  };

  const closeWeightPicker = () => {
    setWeightPickerProduct(null);
    setSelectedWeightUnits([]);
  };

  const closePiecePicker = () => {
    setPiecePickerProduct(null);
    setSelectedPieceCounts([]);
  };

  const toggleWeightUnitSelection = (unit: string) => {
    setSelectedWeightUnits((prev) =>
      prev.includes(unit) ? prev.filter((selected) => selected !== unit) : [...prev, unit]
    );
  };

  const togglePieceCountSelection = (count: number) => {
    setSelectedPieceCounts((prev) =>
      prev.includes(count) ? prev.filter((selected) => selected !== count) : [...prev, count]
    );
  };

  const handleAddSelectedPieces = () => {
    if (!piecePickerProduct || selectedPieceCounts.length === 0) return;
    const totalPieces = selectedPieceCounts.reduce((sum, count) => sum + count, 0);
    addToCartWithPieces(piecePickerProduct, totalPieces);
    setSelectedPieceCounts([]);
    closePiecePicker();
  };

  const handleAddSelectedWeights = () => {
    if (!weightPickerProduct || selectedWeightUnits.length === 0) return;
    selectedWeightUnits.forEach((unit) => addToCartWithWeight(weightPickerProduct, unit));
    setSelectedWeightUnits([]);
    closeWeightPicker();
  };

  const updateQuantity = (groupId: string, cartLineId: string, delta: number) => {
    setGroups((prev) => prev.map((group) => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        items: group.items.map((item) => {
          if (item.cartLineId === cartLineId) {
            const newQty = Math.max(0, Math.min(item.quantity + delta, item.stock));
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

  const removeItem = (groupId: string, cartLineId: string) => {
    setGroups((prev) => prev.map((group) => {
      if (group.id !== groupId) return group;
      return { ...group, items: group.items.filter((it) => it.cartLineId !== cartLineId) };
    }));
  };

  const getGroupSubtotal = (group: BillGroup) => group.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const getGroupDiscount = (group: BillGroup) => {
    if (!group.redeemPoints || !group.customer) return 0;
    return Math.min(getGroupSubtotal(group), 50);
  };
  const getGroupTotal = (group: BillGroup) => {
    const subtotal = getGroupSubtotal(group);
    const discount = getGroupDiscount(group);
    return parseFloat((subtotal - discount).toFixed(2));
  };

  const totalSubtotal = groups.reduce((sum, group) => sum + getGroupSubtotal(group), 0);
  const totalDiscount = groups.reduce((sum, group) => sum + getGroupDiscount(group), 0);
  const invoiceTotalBeforeRound = totalSubtotal - totalDiscount;
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
        0,
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
    hasAutoPrintedRef.current = false;
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

  const weightPickerOptions = useMemo(() => {
    if (!weightPickerProduct) return [];
    return getWeightPriceBreakdown(weightPickerProduct.price, weightPickerProduct.unit, weightPickerProduct.cost);
  }, [weightPickerProduct]);

  const piecePickerOptions = useMemo(() => {
    if (!piecePickerProduct) return [];
    return getPieceBillingOptions(piecePickerProduct.price);
  }, [piecePickerProduct]);

  const selectedWeightTotal = useMemo(() => {
    if (!weightPickerProduct || selectedWeightUnits.length === 0) return 0;
    return selectedWeightUnits.reduce((sum, unit) => {
      return sum + getPriceForWeight(weightPickerProduct.price, weightPickerProduct.unit, unit);
    }, 0);
  }, [weightPickerProduct, selectedWeightUnits]);

  const selectedPieceSummary = useMemo(() => {
    if (!piecePickerProduct || selectedPieceCounts.length === 0) {
      return { totalPieces: 0, totalAmount: 0 };
    }
    const totalPieces = selectedPieceCounts.reduce((sum, count) => sum + count, 0);
    return {
      totalPieces,
      totalAmount: parseFloat((piecePickerProduct.price * totalPieces).toFixed(2)),
    };
  }, [piecePickerProduct, selectedPieceCounts]);

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
        <p className="text-[var(--brand-border)] mb-4">Transaction recorded securely. Your receipt is printing automatically.</p>

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
                    <div key={item.cartLineId} className="flex justify-between gap-2">
                      <span className="flex-1">{item.name} ({item.unit}) x {item.quantity}</span>
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
            {printMode === 'selected' ? `Reprint Selected (${selectedPrintGroupIds.length})` : 'Reprint Receipt'}
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
          {/* ── Premium Category Strip ── */}
          <div className="category-strip-wrapper">
            <div className="category-strip">
              {/* All pill */}
              <button
                type="button"
                id="cat-filter-all"
                onClick={() => setCategoryFilter('All')}
                className={`category-chip ${categoryFilter === 'All' ? 'category-chip--active' : ''}`}
              >
                <div className="category-chip__img-wrap">
                  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <circle cx="20" cy="20" r="20" fill="#7f1e2820" />
                    <rect x="10" y="10" width="8" height="8" rx="2" fill="#7f1e28" opacity=".8" />
                    <rect x="22" y="10" width="8" height="8" rx="2" fill="#7f1e28" opacity=".6" />
                    <rect x="10" y="22" width="8" height="8" rx="2" fill="#7f1e28" opacity=".6" />
                    <rect x="22" y="22" width="8" height="8" rx="2" fill="#7f1e28" opacity=".4" />
                  </svg>
                </div>
                <span className="category-chip__label">All</span>
                <span className="category-chip__bar" />
              </button>

              {(categories || []).map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  id={`cat-filter-${cat.id}`}
                  onClick={() => setCategoryFilter(cat.name)}
                  className={`category-chip ${categoryFilter === cat.name ? 'category-chip--active' : ''}`}
                >
                  <div className="category-chip__img-wrap">
                    {cat.imageUrl
                      ? <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-[var(--brand-dark)] text-xl font-bold">{cat.name[0]}</div>
                    }
                  </div>
                  <span className="category-chip__label">{cat.name}</span>
                  <span className="category-chip__bar" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 overflow-y-auto pr-1 pb-2">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => handleProductSelect(product)}
              disabled={product.stock <= 0}
              className={`p-3 md:p-4 rounded-xl border text-left transition-all relative group ${
                product.stock <= 0 
                  ? 'bg-[var(--brand-muted)] border-[var(--brand-border)] opacity-60 cursor-not-allowed' 
                  : 'bg-[var(--brand-surface)] border-[var(--brand-border)] hover:border-[var(--brand-dark)] hover:shadow-sm active:scale-[0.98]'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-[var(--brand-border)] bg-[var(--brand-muted)] px-2 py-0.5 rounded-full">{product.category}</span>
                <span className="font-bold text-[var(--brand-dark)]">
                  {isPieceUnit(product.unit)
                    ? formatInventoryUnitPrice(product.price, PIECE_UNIT)
                    : formatInventoryUnitPrice(product.price, product.unit)}
                </span>
              </div>
              <h4 className="font-medium text-[var(--brand-dark)] mb-1 truncate text-sm md:text-base">{product.name}</h4>
              <p className={`text-xs ${product.stock < 10 ? 'text-[var(--brand-accent)]' : 'text-[var(--brand-border)]'}`}>
                {product.stock} in stock • {isPieceUnit(product.unit) ? 'tap to choose pieces' : 'tap to choose weight'}
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
              <div key={group.id} className="relative">
                <button
                  type="button"
                  onClick={() => setActiveGroupId(group.id)}
                  className={`px-3 py-2 rounded-2xl border text-xs font-semibold transition ${
                    activeGroup?.id === group.id
                      ? 'border-[var(--brand-dark)] bg-[var(--brand-dark)]/10 text-[var(--brand-dark)]'
                      : 'border-[var(--brand-border)] bg-white text-[var(--brand-border)] hover:border-[var(--brand-dark)]'
                  }`}
                >
                  {group.name}
                </button>
                {group.customer && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      clearCustomerFromGroup(group.id);
                    }}
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--brand-border)] bg-white text-[var(--brand-border)] shadow-sm hover:text-[var(--brand-dark)]"
                    aria-label={`Remove customer from ${group.name}`}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
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
                  onClick={() => clearCustomerFromGroup(activeGroup.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--brand-border)] px-2 py-1 text-[11px] font-medium text-[var(--brand-border)] hover:border-[var(--brand-dark)] hover:text-[var(--brand-dark)]"
                >
                  <X size={14} />
                  Remove customer
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
              <div key={item.cartLineId} className="flex items-center gap-3 bg-[var(--brand-surface)] p-2 rounded-lg border border-[var(--brand-border)]">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-[var(--brand-dark)] truncate">{item.name}</h4>
                  <div className="text-xs text-[var(--brand-border)]">{item.unit} • ₹{item.price.toFixed(2)} x {item.quantity}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(activeGroup.id, item.cartLineId, -1)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--brand-muted)] hover:bg-[var(--brand-surface)] text-[var(--brand-dark)] transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="font-medium text-sm w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(activeGroup.id, item.cartLineId, 1)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--brand-muted)] hover:bg-[var(--brand-surface)] text-[var(--brand-dark)] transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(activeGroup.id, item.cartLineId)}
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
              Checkout will show each customer's invoice separately with independent totals.
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

      {piecePickerProduct && (
        <div className="fixed inset-0 bg-[var(--brand-dark)]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--brand-surface)] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-[var(--brand-border)] animate-scale-up">
            <div className="p-5 border-b border-[var(--brand-border)] bg-[var(--brand-muted)]">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="text-lg font-bold text-[var(--brand-dark)]">Select Pieces</h3>
                  <p className="text-sm text-[var(--brand-border)]">{piecePickerProduct.name}</p>
                  <p className="text-sm font-semibold text-[var(--brand-dark)] mt-2">
                    Price per piece: {formatInventoryUnitPrice(piecePickerProduct.price, PIECE_UNIT)}
                  </p>
                  <p className="text-xs text-[var(--brand-border)] mt-1">
                    Tap one or more quantities, then add to bill. Amounts are calculated automatically.
                  </p>
                </div>
                <button onClick={closePiecePicker} className="text-[var(--brand-border)] hover:text-[var(--brand-dark)] p-1 shrink-0">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {piecePickerOptions.map(({ count, amount, label }) => {
                  const isSelected = selectedPieceCounts.includes(count);
                  const outOfStock = count > piecePickerProduct.stock;
                  return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => !outOfStock && togglePieceCountSelection(count)}
                    disabled={outOfStock}
                    className={`rounded-xl border px-3 py-3 text-center transition-colors ${
                      outOfStock
                        ? 'border-[var(--brand-border)] bg-[var(--brand-muted)] opacity-50 cursor-not-allowed'
                        : isSelected
                          ? 'border-[var(--brand-dark)] bg-[var(--brand-dark)]/10 hover:bg-[var(--brand-dark)]/15'
                          : 'border-[var(--brand-border)] bg-white hover:border-[var(--brand-dark)] hover:bg-[var(--brand-muted)]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[var(--brand-dark)]">{label}</div>
                    <div className="text-xs text-[var(--brand-border)] mt-1">₹{amount.toFixed(2)}</div>
                  </button>
                  );
                })}
              </div>
            </div>
            <div className="p-5 border-t border-[var(--brand-border)] bg-[var(--brand-muted)] space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--brand-border)]">
                  {selectedPieceCounts.length === 0
                    ? 'No quantities selected'
                    : `${selectedPieceCounts.length} option${selectedPieceCounts.length === 1 ? '' : 's'} • ${selectedPieceSummary.totalPieces} piece${selectedPieceSummary.totalPieces === 1 ? '' : 's'}`}
                </span>
                <span className="font-semibold text-[var(--brand-dark)]">
                  {selectedPieceCounts.length > 0 ? `₹${selectedPieceSummary.totalAmount.toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPieceCounts([])}
                  disabled={selectedPieceCounts.length === 0}
                  className="flex-1 py-3 rounded-xl border border-[var(--brand-border)] bg-white text-[var(--brand-dark)] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleAddSelectedPieces}
                  disabled={selectedPieceCounts.length === 0 || selectedPieceSummary.totalPieces > piecePickerProduct.stock}
                  className="flex-[2] py-3 rounded-xl bg-[var(--brand-dark)] text-[var(--brand-text-light)] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {weightPickerProduct && (
        <div className="fixed inset-0 bg-[var(--brand-dark)]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--brand-surface)] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-[var(--brand-border)] animate-scale-up">
            <div className="p-5 border-b border-[var(--brand-border)] bg-[var(--brand-muted)]">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="text-lg font-bold text-[var(--brand-dark)]">Select Weight</h3>
                  <p className="text-sm text-[var(--brand-border)]">{weightPickerProduct.name}</p>
                  <p className="text-sm font-semibold text-[var(--brand-dark)] mt-2">
                    Inventory price: {formatInventoryUnitPrice(weightPickerProduct.price, weightPickerProduct.unit)}
                  </p>
                  <p className="text-xs text-[var(--brand-border)] mt-1">
                    Tap one or more weights, then add to bill. Prices are auto-calculated from inventory.
                  </p>
                </div>
                <button onClick={closeWeightPicker} className="text-[var(--brand-border)] hover:text-[var(--brand-dark)] p-1 shrink-0">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {weightPickerOptions.map(({ unit, price, isInventoryUnit }) => {
                  const isSelected = selectedWeightUnits.includes(unit);
                  return (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => toggleWeightUnitSelection(unit)}
                    className={`rounded-xl border px-3 py-3 text-center transition-colors ${
                      isSelected
                        ? 'border-[var(--brand-dark)] bg-[var(--brand-dark)]/10 hover:bg-[var(--brand-dark)]/15'
                        : isInventoryUnit
                          ? 'border-[var(--brand-border)] bg-white hover:border-[var(--brand-dark)] hover:bg-[var(--brand-muted)]'
                          : 'border-[var(--brand-border)] bg-white hover:border-[var(--brand-dark)] hover:bg-[var(--brand-muted)]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[var(--brand-dark)]">{unit}</div>
                    <div className="text-xs text-[var(--brand-border)] mt-1">₹{price.toFixed(2)}</div>
                    {isInventoryUnit && (
                      <div className="text-[10px] font-semibold text-[var(--brand-dark)] mt-1 uppercase tracking-wide">
                        Inventory
                      </div>
                    )}
                  </button>
                  );
                })}
              </div>
            </div>
            <div className="p-5 border-t border-[var(--brand-border)] bg-[var(--brand-muted)] space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--brand-border)]">
                  {selectedWeightUnits.length === 0
                    ? 'No weights selected'
                    : `${selectedWeightUnits.length} weight${selectedWeightUnits.length === 1 ? '' : 's'} selected`}
                </span>
                <span className="font-semibold text-[var(--brand-dark)]">
                  {selectedWeightUnits.length > 0 ? `₹${selectedWeightTotal.toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWeightUnits([])}
                  disabled={selectedWeightUnits.length === 0}
                  className="flex-1 py-3 rounded-xl border border-[var(--brand-border)] bg-white text-[var(--brand-dark)] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleAddSelectedWeights}
                  disabled={selectedWeightUnits.length === 0}
                  className="flex-[2] py-3 rounded-xl bg-[var(--brand-dark)] text-[var(--brand-text-light)] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;