import React, { useMemo, useState } from 'react';
import { Category, Product, Ingredient, InventoryAdjustment } from '../types';
import { ArrowUpDown, AlertCircle, Plus, X, Pencil, Trash2, Tag, Edit3, Box, Archive } from 'lucide-react';

interface InventoryProps {
  products: Product[];
  categories: Category[];
  ingredients: Ingredient[];
  inventoryAdjustments: InventoryAdjustment[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onAddCategory: (name: string, imageFile?: File | null) => Promise<void> | void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onAddIngredient: (ingredient: Omit<Ingredient, 'id' | 'createdAt'>) => void;
  onUpdateIngredient: (ingredient: Ingredient) => void;
  onDeleteIngredient: (id: string) => void;
  onAdjustProductStock: (productId: string, adjustment: number, reason: string) => void;
  onAdjustIngredientStock: (ingredientId: string, adjustment: number, reason: string) => void;
  canEdit?: boolean;
}

type SortField = 'name' | 'profit' | 'margin' | 'stock' | 'price';
const ALLOWED_UNITS = ['pcs', 'kg'];

const Inventory: React.FC<InventoryProps> = ({ products, categories, ingredients, inventoryAdjustments, onAddProduct, onAddCategory, onUpdateProduct, onDeleteProduct, onAddIngredient, onUpdateIngredient, onDeleteIngredient, onAdjustProductStock, onAdjustIngredientStock, canEdit = true }) => {
  const [sortField, setSortField] = useState<SortField>('profit');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedProductForQuickUpdate, setSelectedProductForQuickUpdate] = useState<Product | null>(null);
  const [quickAdjustAmount, setQuickAdjustAmount] = useState('0');
  const [quickAdjustReason, setQuickAdjustReason] = useState('Stock correction');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState<File | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [selectedIngredientForAdjust, setSelectedIngredientForAdjust] = useState<Ingredient | null>(null);
  const [selectedIngredientForEdit, setSelectedIngredientForEdit] = useState<Ingredient | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('0');
  const [adjustReason, setAdjustReason] = useState('Stock correction');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [isIngredientAddMode, setIsIngredientAddMode] = useState(false);
  const [isIngredientEditMode, setIsIngredientEditMode] = useState(false);
  const [ingredientForm, setIngredientForm] = useState({ name: '', unit: 'pcs', currentStock: '0', minStock: '0' });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    unit: 'pcs'
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const categoryOptions = useMemo(() => {
    const categoryNames = [
      ...customCategories,
      ...categories.map(category => category.name.trim()).filter(Boolean),
      ...products
      .map(product => product.category.trim())
      .filter(Boolean)
    ];

    if (formData.category.trim()) {
      categoryNames.push(formData.category.trim());
    }

    return Array.from(new Set(categoryNames)).sort((a, b) => a.localeCompare(b));
  }, [customCategories, categories, products, formData.category]);

  const categoryFilterOptions = useMemo(() => [
    'All',
    ...new Set(categoryOptions)
  ], [categoryOptions]);

  const resetForm = () => {
    setFormData({ name: '', category: '', price: '', cost: '', stock: '', minStock: '', unit: 'pcs' });
    setEditingId(null);
    setIsAddingCategory(false);
    setNewCategory('');
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setIsAddingCategory(false);
    setNewCategory('');
    setEditingId(product.id);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      cost: product.cost.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      unit: ALLOWED_UNITS.includes(product.unit) ? product.unit : 'pcs'
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleDeleteClick = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      onDeleteProduct(id);
    }
  };

  const openProductAdjustment = (product: Product) => {
    setSelectedProductForAdjust(product);
    setSelectedIngredientForAdjust(null);
    setAdjustAmount('0');
    setAdjustReason('Stock correction');
    setShowAdjustmentModal(true);
  };

  const openIngredientAdjustment = (ingredient: Ingredient) => {
    setIsIngredientAddMode(false);
    setIsIngredientEditMode(false);
    setSelectedIngredientForAdjust(ingredient);
    setSelectedIngredientForEdit(null);
    setSelectedProductForAdjust(null);
    setAdjustAmount('0');
    setAdjustReason('Stock correction');
    setShowAdjustmentModal(true);
  };

  const openEditIngredient = (ingredient: Ingredient) => {
    setIsIngredientAddMode(false);
    setIsIngredientEditMode(true);
    setSelectedIngredientForAdjust(null);
    setSelectedIngredientForEdit(ingredient);
    setIngredientForm({
      name: ingredient.name,
      unit: ingredient.unit,
      currentStock: ingredient.currentStock.toString(),
      minStock: ingredient.minStock.toString()
    });
    setShowAdjustmentModal(true);
  };

  const openAddIngredient = () => {
    setIsIngredientAddMode(true);
    setSelectedIngredientForAdjust(null);
    setSelectedProductForAdjust(null);
    setAdjustAmount('0');
    setAdjustReason('New ingredient');
    setIngredientForm({ name: '', unit: 'pcs', currentStock: '0', minStock: '0' });
    setShowAdjustmentModal(true);
  };

  const closeAdjustmentModal = () => {
    setShowAdjustmentModal(false);
    setSelectedProductForAdjust(null);
    setSelectedIngredientForAdjust(null);
    setSelectedIngredientForEdit(null);
    setAdjustAmount('0');
    setAdjustReason('Stock correction');
    setIsIngredientAddMode(false);
    setIsIngredientEditMode(false);
  };

  const submitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (isIngredientAddMode) {
      if (!ingredientForm.name.trim()) return;
      onAddIngredient({
        name: ingredientForm.name.trim(),
        unit: ingredientForm.unit,
        currentStock: Number(ingredientForm.currentStock),
        minStock: Number(ingredientForm.minStock)
      });
      closeAdjustmentModal();
      return;
    }

    if (isIngredientEditMode && selectedIngredientForEdit) {
      onUpdateIngredient({
        id: selectedIngredientForEdit.id,
        name: ingredientForm.name.trim(),
        unit: ingredientForm.unit,
        currentStock: Number(ingredientForm.currentStock),
        minStock: Number(ingredientForm.minStock),
        createdAt: selectedIngredientForEdit.createdAt
      });
      closeAdjustmentModal();
      return;
    }

    const amount = Number(adjustAmount);
    if (!amount || !adjustReason.trim()) return;

    if (selectedProductForAdjust) {
      onAdjustProductStock(selectedProductForAdjust.id, amount, adjustReason.trim());
    }
    if (selectedIngredientForAdjust) {
      onAdjustIngredientStock(selectedIngredientForAdjust.id, amount, adjustReason.trim());
    }
    closeAdjustmentModal();
  };

  const handleAddCategory = async () => {
    const trimmedCategory = newCategory.trim();
    if (!trimmedCategory) return;

    setCustomCategories(prev => {
      const alreadyExists = prev.some(category => category.toLowerCase() === trimmedCategory.toLowerCase());
      return alreadyExists ? prev : [...prev, trimmedCategory];
    });
    setFormData({ ...formData, category: trimmedCategory });
    setNewCategory('');
    setIsAddingCategory(false);
    try {
      await onAddCategory(trimmedCategory, newCategoryImage);
    } finally {
      setNewCategoryImage(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost),
      stock: parseInt(formData.stock),
      minStock: parseInt(formData.minStock),
      unit: formData.unit
    };

    if (editingId) {
      onUpdateProduct({ ...productData, id: editingId });
    } else {
      onAddProduct(productData);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const profitA = a.price - a.cost;
      const profitB = b.price - b.cost;
      
      let valA: number | string = 0;
      let valB: number | string = 0;

      switch (sortField) {
        case 'name': valA = a.name; valB = b.name; break;
        case 'stock': valA = a.stock; valB = b.stock; break;
        case 'price': valA = a.price; valB = b.price; break;
        case 'profit': valA = profitA; valB = profitB; break;
        case 'margin': valA = ((profitA / a.price) * 100); valB = ((profitB / b.price) * 100); break;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, sortField, sortDir]);

  const filteredProducts = useMemo(() => {
    return sortedProducts.filter(product => categoryFilter === 'All' || product.category === categoryFilter);
  }, [sortedProducts, categoryFilter]);

  const TableHeader = ({ field, label }: { field: SortField, label: string }) => (
    <th 
      className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider cursor-pointer hover:bg-[var(--brand-muted)] transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={sortField === field ? 'text-[var(--brand-accent)]' : 'text-[var(--brand-border)]'} />
      </div>
    </th>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--brand-dark)]">Menu & Stock List</h3>
          <p className="text-sm text-[var(--brand-border)]">Manage your product offerings and inventory levels.</p>
        </div>
        {canEdit ? (
          <button 
            onClick={openAddModal}
            className="w-full md:w-auto bg-[var(--brand-dark)] text-[var(--brand-text-light)] px-5 py-3 rounded-xl font-medium hover:bg-[var(--brand-bg)] transition-colors shadow-lg shadow-[var(--brand-border)] flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Add Item
          </button>
        ) : (
          <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-muted)] px-4 py-3 text-sm text-[var(--brand-border)]">
            Employee access: view only
          </div>
        )}
      </div>

      <div className="bg-[var(--brand-surface)] rounded-2xl border border-[var(--brand-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--brand-border)] flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex flex-col md:flex-row md:items-center md:gap-4">
            <div className="flex items-center gap-3 mb-3 md:mb-0">
              <span className="text-sm font-medium text-[var(--brand-dark)]">Category</span>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto py-1">
              <button
                type="button"
                onClick={() => setCategoryFilter('All')}
                className={`inline-flex flex-col items-center gap-1 px-3 py-2 rounded-lg border ${categoryFilter === 'All' ? 'border-[var(--brand-dark)] bg-[var(--brand-dark)] text-[var(--brand-text-light)]' : 'border-[var(--brand-border)] bg-white text-[var(--brand-dark)]'}`}
              >
                <div className="w-16 h-12 bg-[var(--brand-muted)] rounded-md flex items-center justify-center text-xs">All</div>
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.name)}
                  className={`inline-flex flex-col items-center gap-1 px-3 py-2 rounded-lg border ${categoryFilter === cat.name ? 'border-[var(--brand-dark)] bg-[var(--brand-dark)] text-[var(--brand-text-light)]' : 'border-[var(--brand-border)] bg-white text-[var(--brand-dark)]'}`}
                >
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.name} className="w-16 h-12 object-cover rounded-md" />
                  ) : (
                    <div className="w-16 h-12 bg-[var(--brand-muted)] rounded-md flex items-center justify-center text-xs">{cat.name}</div>
                  )}
                  <span className="text-xs mt-1">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--brand-border)]">Quick stock update</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--brand-muted)] border-b border-[var(--brand-border)]">
              <tr>
                <TableHeader field="name" label="Product" />
                <TableHeader field="stock" label="Stock Level" />
                <TableHeader field="price" label="Price" />
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider hidden md:table-cell">Cost</th>
                <TableHeader field="profit" label="Profit / Unit" />
                <TableHeader field="margin" label="Margin" />
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const profit = product.price - product.cost;
                const margin = ((profit / product.price) * 100).toFixed(0);
                const isLowStock = product.stock <= product.minStock;

                return (
                  <tr key={product.id} className="hover:bg-[var(--brand-muted)]/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-[var(--brand-dark)]">{product.name}</span>
                        <span className="text-xs text-[var(--brand-border)]">{product.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-mono text-sm ${isLowStock ? 'text-[var(--brand-accent)] font-bold' : 'text-[var(--brand-text-dark)]'}`}>
                        {product.stock}
                      </span>
                      <span className="text-xs text-[var(--brand-border)] ml-1">{product.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--brand-text-dark)]">₹{product.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-[var(--brand-border)] hidden md:table-cell">₹{product.cost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-[var(--brand-dark)]">+₹{profit.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${margin >= 30 ? 'bg-emerald-100 text-emerald-700' : margin >= 15 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                        {margin}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isLowStock ? (
                        <div className="flex items-center gap-1.5 text-[var(--brand-dark)] bg-[var(--brand-accent)]/20 px-2 py-1 rounded-full w-fit">
                          <AlertCircle size={14} />
                          <span className="text-xs font-medium hidden sm:inline">Low Stock</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[var(--brand-border)]">
                          <div className="w-2 h-2 rounded-full bg-[var(--brand-accent)]"></div>
                          <span className="text-xs hidden sm:inline">OK</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canEdit ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openProductAdjustment(product)}
                            className="p-2 text-[var(--brand-border)] hover:text-[var(--brand-dark)] hover:bg-[var(--brand-muted)] rounded-lg transition-colors"
                            title="Adjust stock"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => openEditModal(product)}
                            className="p-2 text-[var(--brand-border)] hover:text-[var(--brand-dark)] hover:bg-[var(--brand-muted)] rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(product.id, product.name)}
                            className="p-2 text-[var(--brand-border)] hover:text-[var(--brand-dark)] hover:bg-[var(--brand-muted)] rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--brand-border)]">View only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ingredient Inventory + Adjustment History */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="bg-[var(--brand-surface)] rounded-2xl border border-[var(--brand-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--brand-border)] bg-[var(--brand-muted)] flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[var(--brand-dark)]">Ingredient Inventory</h3>
              <p className="text-sm text-[var(--brand-border)]">Track ingredients used for bakery products.</p>
            </div>
            <button
              type="button"
              onClick={openAddIngredient}
              className="inline-flex items-center gap-2 bg-[var(--brand-dark)] text-[var(--brand-text-light)] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--brand-bg)] transition-colors"
            >
              <Plus size={16} /> Add Ingredient
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--brand-muted)] border-b border-[var(--brand-border)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Ingredient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Alert</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)]">
                {ingredients.map(ingredient => {
                  const isLow = ingredient.currentStock <= ingredient.minStock;
                  return (
                    <tr key={ingredient.id} className="hover:bg-[var(--brand-muted)]/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-[var(--brand-dark)]">{ingredient.name}</div>
                        <div className="text-xs text-[var(--brand-border)]">{ingredient.unit}</div>
                      </td>
                      <td className="px-6 py-4 text-[var(--brand-text-dark)]">{ingredient.currentStock.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-accent)]/20 text-[var(--brand-dark)] px-2 py-1 text-xs font-semibold">
                            <AlertCircle size={12} /> Low stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-muted)] text-[var(--brand-text-dark)] px-2 py-1 text-xs font-semibold">
                            In stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openIngredientAdjustment(ingredient)}
                          className="inline-flex items-center justify-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-text-dark)] hover:bg-[var(--brand-muted)] p-2 transition-colors"
                          title="Adjust ingredient stock"
                        >
                          <Box size={16} />
                        </button>
                        <button
                          onClick={() => openEditIngredient(ingredient)}
                          className="inline-flex items-center justify-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-text-dark)] hover:bg-[var(--brand-muted)] p-2 transition-colors"
                          title="Edit ingredient"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ingredient '${ingredient.name}'? This cannot be undone.`)) {
                              onDeleteIngredient(ingredient.id);
                            }
                          }}
                          className="inline-flex items-center justify-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-text-dark)] hover:bg-[var(--brand-muted)] p-2 transition-colors"
                          title="Delete ingredient"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {ingredients.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-[var(--brand-border)]">
                      No ingredients configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[var(--brand-surface)] rounded-2xl border border-[var(--brand-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--brand-border)] bg-[var(--brand-muted)]">
            <h3 className="text-lg font-bold text-[var(--brand-dark)]">Stock Adjustment History</h3>
            <p className="text-sm text-[var(--brand-border)]">Recent manual stock changes.</p>
          </div>
          <div className="overflow-y-auto max-h-[440px]">
            <div className="divide-y divide-[var(--brand-border)]">
              {inventoryAdjustments.length === 0 ? (
                <div className="p-6 text-center text-[var(--brand-border)]">No inventory adjustments recorded yet.</div>
              ) : inventoryAdjustments.map(adj => (
                <div key={adj.id} className="px-6 py-4 hover:bg-[var(--brand-muted)] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--brand-dark)]">{adj.adjustment >= 0 ? 'Added' : 'Removed'} {Math.abs(adj.adjustment)}</p>
                      <p className="text-xs text-[var(--brand-border)]">{adj.reason}</p>
                    </div>
                    <span className="text-xs text-[var(--brand-border)]">{adj.createdAt.toLocaleString()}</span>
                  </div>
                  <div className="mt-2 text-xs text-[var(--brand-border)]">
                    {adj.productId ? `Product ID: ${adj.productId}` : adj.ingredientId ? `Ingredient ID: ${adj.ingredientId}` : 'System'} • By {adj.createdBy}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[var(--brand-dark)]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--brand-surface)] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-scale-up max-h-[90vh] flex flex-col border border-[var(--brand-border)]">
            <div className="p-5 border-b border-[var(--brand-border)] flex justify-between items-center bg-[var(--brand-muted)] shrink-0">
              <h3 className="text-lg font-bold text-[var(--brand-dark)]">
                {editingId ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button onClick={closeModal} className="text-[var(--brand-border)] hover:text-[var(--brand-dark)] p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-[var(--brand-dark)] mb-1.5">Product Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Masala Chai"
                    className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)] bg-white"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="col-span-1">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-sm font-semibold text-[var(--brand-dark)]">Category</label>
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(true)}
                      className="text-xs font-semibold text-[var(--brand-accent)] hover:text-[var(--brand-dark)] flex items-center gap-1"
                    >
                      <Tag size={12} />
                      Add
                    </button>
                  </div>
                  <select
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] bg-white text-[var(--brand-text-dark)]"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="" disabled>Select category</option>
                    {categoryOptions.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {isAddingCategory && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        placeholder="New category"
                        className="min-w-0 flex-1 px-3 py-2 rounded-lg border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-sm text-[var(--brand-text-dark)] bg-white"
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCategory();
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="shrink-0 px-3 py-2 rounded-lg bg-[var(--brand-accent)] text-[var(--brand-text-light)] text-sm font-semibold hover:bg-[#d09f48] transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-[var(--brand-dark)] mb-1.5">Unit</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] bg-white text-[var(--brand-text-dark)]"
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="kg">Kilogram (kg)</option>
                  </select>
                </div>
                
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-[var(--brand-dark)] mb-1.5">Selling Price (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)] bg-white"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-[var(--brand-dark)] mb-1.5">Cost Price (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)] bg-white"
                    value={formData.cost}
                    onChange={e => setFormData({...formData, cost: e.target.value})}
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-[var(--brand-dark)] mb-1.5">Current Stock</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)] bg-white"
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: e.target.value})}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-[var(--brand-dark)] mb-1.5">Alert Level</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)] bg-white"
                    value={formData.minStock}
                    onChange={e => setFormData({...formData, minStock: e.target.value})}
                  />
                </div>

                <div className="col-span-2 pt-4">
                  <button type="submit" className="w-full bg-[var(--brand-dark)] text-[var(--brand-text-light)] py-3.5 rounded-xl font-medium hover:bg-[var(--brand-bg)] transition-colors shadow-md shadow-[var(--brand-border)]">
                    {editingId ? 'Update Item' : 'Add Item to Menu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment / Ingredient Add Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-[var(--brand-dark)]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--brand-surface)] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up max-h-[90vh] flex flex-col border border-[var(--brand-border)]">
            <div className="p-5 border-b border-[var(--brand-border)] flex justify-between items-center bg-[var(--brand-muted)]">
              <h3 className="text-lg font-bold text-[var(--brand-dark)]">
                {isIngredientAddMode ? 'Add New Ingredient' : selectedProductForAdjust ? `Adjust ${selectedProductForAdjust.name}` : selectedIngredientForAdjust ? `Adjust ${selectedIngredientForAdjust.name}` : 'Inventory Adjustment'}
              </h3>
              <button onClick={closeAdjustmentModal} className="text-[var(--brand-border)] hover:text-[var(--brand-dark)] p-1">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <form onSubmit={submitAdjustment} className="space-y-5">
                {isIngredientAddMode || isIngredientEditMode ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-[var(--brand-dark)] mb-1.5">Ingredient Name</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)] bg-white"
                        placeholder="e.g. All-purpose flour"
                        value={ingredientForm.name}
                        onChange={e => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[var(--brand-dark)] mb-1.5">Unit</label>
                        <select
                          className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] bg-white text-[var(--brand-text-dark)]"
                          value={ingredientForm.unit}
                          onChange={e => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                        >
                          {ALLOWED_UNITS.map(unit => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[var(--brand-dark)] mb-1.5">Current Stock</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)] bg-white"
                          value={ingredientForm.currentStock}
                          onChange={e => setIngredientForm({ ...ingredientForm, currentStock: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[var(--brand-dark)] mb-1.5">Minimum Stock Alert</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)] bg-white"
                        value={ingredientForm.minStock}
                        onChange={e => setIngredientForm({ ...ingredientForm, minStock: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-[var(--brand-dark)] mb-1.5">Adjustment Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)] bg-white"
                        value={adjustAmount}
                        onChange={e => setAdjustAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[var(--brand-dark)] mb-1.5">Reason</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)] bg-white"
                        value={adjustReason}
                        onChange={e => setAdjustReason(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={closeAdjustmentModal} className="px-4 py-3 rounded-xl border border-[var(--brand-border)] text-[var(--brand-border)] hover:bg-[var(--brand-muted)] transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-3 rounded-xl bg-[var(--brand-dark)] text-[var(--brand-text-light)] font-semibold hover:bg-[var(--brand-bg)] transition-colors">
                    {isIngredientAddMode ? 'Create Ingredient' : 'Save Adjustment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
