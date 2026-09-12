import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient';
export { supabase };
import { Product, SaleRecord, Customer, CartItem, Category, Ingredient, InventoryAdjustment, UserRole } from '../types';
import { getCartLineId } from '../constants';

const parseUnitFromProductName = (productName: string, fallback = 'unit') => {
    const match = productName.match(/\(([^)]+)\)\s*$/);
    return match ? match[1] : fallback;
};

const adjustStockForItems = async (items: CartItem[], direction: 'deduct' | 'restore') => {
    if (!supabase) throw new Error('No DB');

    const qtyByProduct = new Map<string, number>();
    for (const item of items) {
        if (!item.id?.trim()) continue;
        qtyByProduct.set(item.id, (qtyByProduct.get(item.id) || 0) + item.quantity);
    }
    if (qtyByProduct.size === 0) return;

    const productIds = Array.from(qtyByProduct.keys());
    const { data: products, error } = await supabase
        .from('products')
        .select('id, stock')
        .in('id', productIds);
    if (error) throw error;

    await Promise.all((products || []).map((product) => {
        const qty = qtyByProduct.get(product.id) || 0;
        const delta = direction === 'deduct' ? -qty : qty;
        const updatedStock = Math.max(0, Number(product.stock) + delta);
        return supabase.from('products').update({ stock: updatedStock }).eq('id', product.id);
    }));
};

const updateCustomerAfterSale = async (sale: SaleRecord) => {
    if (!supabase || !sale.customerId) return;

    const { data: cust } = await supabase
        .from('customers')
        .select('total_spent, loyalty_points')
        .eq('id', sale.customerId)
        .single();
    if (!cust) return;

    await supabase.from('customers').update({
        total_spent: Number(cust.total_spent) + sale.total,
        loyalty_points: Number(cust.loyalty_points) + (sale.pointsEarned ?? 0) - (sale.pointsRedeemed ?? 0),
    }).eq('id', sale.customerId);
};

export const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase client not initialized.');
    return await supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
    if (!supabase) throw new Error('Supabase client not initialized.');
    return await supabase.auth.signOut();
};

export const getUser = async () => {
    if (!supabase) return { data: { user: null }, error: null };
    return await supabase.auth.getUser();
};

export const resolveUserRoleFromMetadata = (user: any): UserRole | null => {
    if (!user) return null;
    const metadataRole = user.user_metadata?.role ?? user.app_metadata?.role ?? user?.role;
    if (typeof metadataRole !== 'string') return null;
    const normalizedRole = metadataRole.toLowerCase();
    if (normalizedRole === UserRole.EMPLOYEE) return UserRole.EMPLOYEE;
    if (normalizedRole === UserRole.ADMIN) return UserRole.ADMIN;
    return null;
};

export const getUserRole = async (user: any): Promise<UserRole> => {
    if (!user) return UserRole.ADMIN;

    if (!supabase || !user.id) return UserRole.ADMIN;

    // Always verify the user still has an active row in user_profiles.
    // This is the single source of truth — if an admin deletes the employee
    // from the panel (which removes the user_profiles row), access is denied
    // even though the Supabase Auth account still exists.
    try {
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.warn('Failed to verify user profile:', profileError);
            // Fall through to metadata-based role resolution on DB errors
        } else if (!profile) {
            // User has been deleted from the admin panel — revoke the session
            await supabase.auth.signOut();
            throw new Error('Your account has been deactivated. Please contact an administrator.');
        } else {
            // Profile exists — use its role as the authoritative source
            const normalizedRole = String(profile.role).toLowerCase();
            return normalizedRole === UserRole.EMPLOYEE ? UserRole.EMPLOYEE : UserRole.ADMIN;
        }
    } catch (err: any) {
        // Re-throw our own access-denied errors so callers can display them
        if (err?.message?.includes('deactivated')) throw err;
        console.warn('Failed to resolve role from user profile:', err);
    }

    return resolveUserRoleFromMetadata(user) ?? UserRole.ADMIN;
};

// --- Data Services ---

let softDeleteSupported: boolean | null = null;

const isMissingDeletedAtError = (error: any) => {
    const message = String(error?.message || error?.details || '').toLowerCase();
    const code = String(error?.code || '');
    return (
        code === '42703' ||
        code === 'PGRST204' ||
        message.includes('deleted_at') ||
        (message.includes('column') && message.includes('does not exist'))
    );
};

const disableSoftDelete = () => {
    softDeleteSupported = false;
};

const canUseSoftDelete = () => softDeleteSupported !== false;

const mapProduct = (p: any): Product => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: Number(p.price),
    cost: Number(p.cost),
    stock: Number(p.stock),
    minStock: Number(p.min_stock),
    unit: p.unit,
    deletedAt: p.deleted_at ? new Date(p.deleted_at) : undefined
});

const mapIngredient = (i: any): Ingredient => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    currentStock: Number(i.current_stock),
    minStock: Number(i.min_stock),
    createdAt: new Date(i.created_at),
    deletedAt: i.deleted_at ? new Date(i.deleted_at) : undefined
});

// Products
export const getProducts = async (): Promise<Product[]> => {
    if (!supabase) return [];

    if (canUseSoftDelete()) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .is('deleted_at', null);
        if (!error) return (data || []).map(mapProduct);
        if (isMissingDeletedAtError(error)) {
            disableSoftDelete();
        } else {
            throw error;
        }
    }

    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    return (data || []).map(mapProduct);
};

export const getDeletedProducts = async (): Promise<Product[]> => {
    if (!supabase || !canUseSoftDelete()) return [];
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
    if (error) {
        if (isMissingDeletedAtError(error)) {
            disableSoftDelete();
            return [];
        }
        throw error;
    }
    return (data || []).map(mapProduct);
};

export const addProduct = async (product: Omit<Product, 'id'>) => {
    if (!supabase) throw new Error('No DB');
    const dbPayload = {
        name: product.name,
        category: product.category,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        min_stock: product.minStock,
        unit: product.unit
    };
    const { data, error } = await supabase.from('products').insert(dbPayload).select().single();
    if (error) throw error;
    return data;
};

export const updateProduct = async (product: Product) => {
    if (!supabase) throw new Error('No DB');
    const dbPayload = {
        name: product.name,
        category: product.category,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        min_stock: product.minStock,
        unit: product.unit
    };
    const { error } = await supabase.from('products').update(dbPayload).eq('id', product.id);
    if (error) throw error;
};

const clearProductDeleteBlockers = async (productId: string) => {
    if (!supabase) return;
    await supabase.from('inventory_adjustments').delete().eq('product_id', productId);
    await supabase.from('product_ingredients').delete().eq('product_id', productId);
};

const clearIngredientDeleteBlockers = async (ingredientId: string) => {
    if (!supabase) return;
    await supabase.from('inventory_adjustments').delete().eq('ingredient_id', ingredientId);
    await supabase.from('product_ingredients').delete().eq('ingredient_id', ingredientId);
};

const isForeignKeyError = (error: any) => {
    const message = String(error?.message || error?.details || '').toLowerCase();
    return message.includes('foreign key') || message.includes('violates foreign key constraint');
};

export const deleteProduct = async (id: string) => {
    if (!supabase) throw new Error('No DB');

    // Always prefer soft delete so past sales and stock history stay intact.
    const { error: softDeleteError } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
    if (!softDeleteError) {
        softDeleteSupported = true;
        return;
    }
    if (!isMissingDeletedAtError(softDeleteError)) {
        throw softDeleteError;
    }
    disableSoftDelete();

    await clearProductDeleteBlockers(id);

    const { error: hardDeleteError } = await supabase.from('products').delete().eq('id', id);
    if (hardDeleteError) {
        if (isForeignKeyError(hardDeleteError)) {
            throw new Error(
                'This product is linked to past sales and cannot be permanently removed. Run add_missing_columns.sql in Supabase to enable soft delete, then delete again to move it to Deleted Items.'
            );
        }
        throw hardDeleteError;
    }
};

export const restoreProduct = async (id: string) => {
    if (!supabase) throw new Error('No DB');
    if (!canUseSoftDelete()) return;

    const { error } = await supabase
        .from('products')
        .update({ deleted_at: null })
        .eq('id', id);
    if (error) {
        if (isMissingDeletedAtError(error)) {
            disableSoftDelete();
            return;
        }
        throw error;
    }
};

// Categories
export const getCategories = async (): Promise<Category[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
    if (error) throw error;
    if (!data) return [];
    return data.map((category: any) => ({
        id: category.id,
        name: category.name,
        createdAt: new Date(category.created_at),
        imageUrl: category.image_url || null
    }));
};
export const addCategory = async (name: string, imageFile?: File | null): Promise<Category> => {
    if (!supabase) throw new Error('No DB');
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Category name is required');

    let imageUrl: string | null = null;

    if (imageFile) {
        // attempt to upload to a bucket named 'category-images'
        const path = `categories/${Date.now()}-${imageFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('category-images').upload(path, imageFile as any, { upsert: true });
        if (uploadError) {
            console.error('Category image upload failed:', uploadError.message || uploadError);
            throw new Error(`Failed to upload category image: ${uploadError.message}. Make sure the "category-images" bucket exists in Supabase Storage.`);
        } else {
            const { data: urlData } = supabase.storage.from('category-images').getPublicUrl(path);
            imageUrl = urlData.publicUrl || null;
        }
    }

    const payload: any = { name: trimmedName };
    if (imageUrl) payload.image_url = imageUrl;

    const { data, error } = await supabase
        .from('categories')
        .upsert(payload, { onConflict: 'name' })
        .select()
        .single();
    if (error) throw error;

    return {
        id: data.id,
        name: data.name,
        createdAt: new Date(data.created_at),
        imageUrl: data.image_url || null
    };
};

export const updateCategory = async (id: string, name: string, imageFile?: File | null) => {
    if (!supabase) throw new Error('No DB');
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Category name is required');

    let imageUrl: string | null = null;

    if (imageFile) {
        const path = `categories/${Date.now()}-${imageFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('category-images').upload(path, imageFile as any, { upsert: true });
        if (uploadError) {
            console.error('Category image upload failed:', uploadError.message || uploadError);
            throw new Error(`Failed to upload category image: ${uploadError.message}. Make sure the "category-images" bucket exists in Supabase Storage.`);
        } else {
            const { data: urlData } = supabase.storage.from('category-images').getPublicUrl(path);
            imageUrl = urlData.publicUrl || null;
        }
    }

    const payload: any = { name: trimmedName };
    if (imageUrl) payload.image_url = imageUrl;

    const { error } = await supabase.from('categories').update(payload).eq('id', id);
    if (error) throw error;
};

export const deleteCategory = async (id: string) => {
    if (!supabase) throw new Error('No DB');
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
};

// Customers
export const getCustomers = async (): Promise<Customer[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('customers').select('*');
    if (error) throw error;
    if (!data) return [];
    return data.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
        loyaltyPoints: Number(c.loyalty_points),
        totalSpent: Number(c.total_spent),
        joinDate: new Date(c.join_date)
    }));
};

export const getIngredients = async (): Promise<Ingredient[]> => {
    if (!supabase) return [];

    if (canUseSoftDelete()) {
        const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .is('deleted_at', null)
            .order('name', { ascending: true });
        if (!error) return (data || []).map(mapIngredient);
        if (isMissingDeletedAtError(error)) {
            disableSoftDelete();
        } else {
            throw error;
        }
    }

    const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name', { ascending: true });
    if (error) throw error;
    if (!data) return [];
    return data.map(mapIngredient);
};

export const getDeletedIngredients = async (): Promise<Ingredient[]> => {
    if (!supabase || !canUseSoftDelete()) return [];
    const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
    if (error) {
        if (isMissingDeletedAtError(error)) {
            disableSoftDelete();
            return [];
        }
        throw error;
    }
    if (!data) return [];
    return data.map(mapIngredient);
};

export const getInventoryAdjustments = async (): Promise<InventoryAdjustment[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('inventory_adjustments').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    if (!data) return [];
    return data.map((adj: any) => ({
        id: adj.id,
        productId: adj.product_id,
        ingredientId: adj.ingredient_id,
        adjustment: Number(adj.adjustment),
        reason: adj.reason,
        createdBy: adj.created_by,
        createdAt: new Date(adj.created_at)
    }));
};

export const addIngredient = async (ingredient: Omit<Ingredient, 'id' | 'createdAt'>) => {
    if (!supabase) throw new Error('No DB');
    const { data, error } = await supabase.from('ingredients').insert({
        name: ingredient.name,
        unit: ingredient.unit,
        current_stock: ingredient.currentStock,
        min_stock: ingredient.minStock
    }).select().single();
    if (error) throw error;
    if (!data) throw new Error('Failed to insert ingredient');
    return {
        id: data.id,
        name: data.name,
        unit: data.unit,
        currentStock: Number(data.current_stock),
        minStock: Number(data.min_stock),
        createdAt: new Date(data.created_at)
    };
};

export const updateIngredient = async (ingredient: Ingredient) => {
    if (!supabase) throw new Error('No DB');
    const { error } = await supabase.from('ingredients').update({
        name: ingredient.name,
        unit: ingredient.unit,
        current_stock: ingredient.currentStock,
        min_stock: ingredient.minStock
    }).eq('id', ingredient.id);
    if (error) throw error;
};

export const deleteIngredient = async (id: string) => {
    if (!supabase) throw new Error('No DB');

    const { error: softDeleteError } = await supabase
        .from('ingredients')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
    if (!softDeleteError) {
        softDeleteSupported = true;
        return;
    }
    if (!isMissingDeletedAtError(softDeleteError)) {
        throw softDeleteError;
    }
    disableSoftDelete();

    await clearIngredientDeleteBlockers(id);

    const { error: hardDeleteError } = await supabase.from('ingredients').delete().eq('id', id);
    if (hardDeleteError) {
        if (isForeignKeyError(hardDeleteError)) {
            throw new Error(
                'This ingredient is linked to other records and cannot be permanently removed. Run add_missing_columns.sql in Supabase to enable soft delete, then delete again.'
            );
        }
        throw hardDeleteError;
    }
};

export const restoreIngredient = async (id: string) => {
    if (!supabase) throw new Error('No DB');
    if (!canUseSoftDelete()) return;

    const { error } = await supabase
        .from('ingredients')
        .update({ deleted_at: null })
        .eq('id', id);
    if (error) {
        if (isMissingDeletedAtError(error)) {
            disableSoftDelete();
            return;
        }
        throw error;
    }
};

export const adjustProductStock = async (productId: string, adjustment: number, reason: string, createdBy: string = 'system') => {
    if (!supabase) throw new Error('No DB');
    const { data: product, error: prodError } = await supabase.from('products').select('stock').eq('id', productId).single();
    if (prodError) throw prodError;
    if (!product) throw new Error('Product not found');
    
    const newStock = Number(product.stock) + adjustment;
    if (newStock < 0) throw new Error('Cannot reduce stock below zero.');

    const { error: updateError } = await supabase.from('products').update({ stock: newStock }).eq('id', productId);
    if (updateError) throw updateError;
    const { error: adjError } = await supabase.from('inventory_adjustments').insert({
        product_id: productId,
        ingredient_id: null,
        adjustment,
        reason,
        created_by: createdBy
    });
    if (adjError) throw adjError;
};

export const adjustIngredientStock = async (ingredientId: string, adjustment: number, reason: string, createdBy: string = 'system') => {
    if (!supabase) throw new Error('No DB');
    const { data: ingredient, error: ingError } = await supabase.from('ingredients').select('current_stock').eq('id', ingredientId).single();
    if (ingError) throw ingError;
    if (!ingredient) throw new Error('Ingredient not found');
    
    const newStock = Number(ingredient.current_stock) + adjustment;
    if (newStock < 0) throw new Error('Cannot reduce ingredient stock below zero.');

    const { error: updateError } = await supabase.from('ingredients').update({ current_stock: newStock }).eq('id', ingredientId);
    if (updateError) throw updateError;
    const { error: adjError } = await supabase.from('inventory_adjustments').insert({
        product_id: null,
        ingredient_id: ingredientId,
        adjustment,
        reason,
        created_by: createdBy
    });
    if (adjError) throw adjError;
};

export const addCustomer = async (customer: Omit<Customer, 'id' | 'joinDate' | 'loyaltyPoints' | 'totalSpent'>) => {
    if (!supabase) throw new Error('No DB');
    const dbPayload = {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        loyalty_points: 0,
        total_spent: 0
    };
    const { data, error } = await supabase.from('customers').insert(dbPayload).select().single();
    if (error) throw error;
    return data;
};

export const deleteCustomer = async (id: string) => {
    if (!supabase) throw new Error('No DB');
    // Nullify customer_id in sales to avoid foreign key constraint errors
    await supabase.from('sales').update({ customer_id: null }).eq('customer_id', id);
    
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
};

// Sales
export const createSale = async (sale: SaleRecord) => {
    if (!supabase) throw new Error('No DB');

    // 1. Create Sale Record
    const salePayload: Record<string, unknown> = {
        total: sale.total,
        subtotal: sale.subtotal ?? sale.total,
        tax_amount: sale.taxAmount ?? 0,
        rounding_adjustment: sale.roundingAdjustment ?? 0,
        paid_amount: sale.paidAmount ?? sale.total,
        payment_method: sale.paymentMethod ?? 'CASH',
        customer_id: sale.customerId || null,
        points_earned: sale.pointsEarned ?? 0,
        points_redeemed: sale.pointsRedeemed ?? 0,
        discount_amount: sale.discountAmount ?? 0,
        created_by: sale.billLabel || sale.customerName || 'system',
        timestamp: new Date().toISOString()
    };

    if (sale.paymentMethod === 'SPLIT') {
        salePayload.cash_paid = sale.cashPaid ?? 0;
        salePayload.upi_paid = sale.upiPaid ?? 0;
    }

    const { data: saleData, error: saleError } = await supabase.from('sales').insert(salePayload).select().single();
    if (saleError) {
        if (saleError.message?.includes('fetch')) {
            throw new Error('Network error: could not connect to the database. Check your internet connection.');
        }
        throw saleError;
    }

    const saleId = saleData.id;

    // 2. Create Sale Items — filter out any items with missing IDs to avoid FK violations
    const itemsPayload = sale.items
        .filter(item => item.id && item.id.trim() !== '')
        .map(item => ({
            sale_id: saleId,
            product_id: item.id,
            quantity: item.quantity,
            price_at_sale: item.price,
            product_name: `${item.name} (${item.unit})`
        }));

    if (itemsPayload.length === 0) {
        throw new Error('No valid items in cart. Please remove items and try again.');
    }

    const { error: itemsError } = await supabase.from('sale_items').insert(itemsPayload);
    if (itemsError) throw itemsError;

    await Promise.all([
        adjustStockForItems(sale.items, 'deduct'),
        updateCustomerAfterSale(sale),
    ]);

    return saleId;
};

export const createSales = async (sales: SaleRecord[]): Promise<string[]> => {
    return Promise.all(sales.map((sale) => createSale(sale)));
};

type ProductLookup = Map<string, Pick<Product, 'id' | 'name' | 'category' | 'price' | 'cost' | 'stock' | 'minStock' | 'unit'>>;

const buildProductLookup = (products: Product[]): ProductLookup => {
    const lookup: ProductLookup = new Map();
    products.forEach((product) => {
        lookup.set(product.id, product);
    });
    return lookup;
};

export const getSales = async (productsForLookup?: Product[]): Promise<SaleRecord[]> => {
    if (!supabase) return [];

    let productById: ProductLookup;
    if (productsForLookup && productsForLookup.length > 0) {
        productById = buildProductLookup(productsForLookup);
    } else {
        const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('id, name, category, price, cost, stock, min_stock, unit')
            .order('name', { ascending: true });

        productById = new Map();
        if (!productsError && productsData) {
            productsData.forEach((product: any) => {
                productById.set(product.id, {
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    price: Number(product.price),
                    cost: Number(product.cost),
                    stock: Number(product.stock),
                    minStock: Number(product.min_stock),
                    unit: product.unit,
                });
            });
        }
    }

    const { data, error } = await supabase
        .from('sales')
        .select(`
      *,
      sale_items (*)
    `)
        .order('timestamp', { ascending: false })
        .limit(200);

    if (error) throw error;

    return (data || []).map((s: any) => ({
        id: s.id,
        timestamp: new Date(s.timestamp),
        subtotal: Number(s.subtotal),
        taxAmount: Number(s.tax_amount),
        roundingAdjustment: Number(s.rounding_adjustment),
        total: Number(s.total),
        paidAmount: Number(s.paid_amount),
        paymentMethod: s.payment_method as 'CASH' | 'UPI' | 'SPLIT' | 'OTHER',
        cashPaid: s.cash_paid !== null && s.cash_paid !== undefined ? Number(s.cash_paid) : undefined,
        upiPaid: s.upi_paid !== null && s.upi_paid !== undefined ? Number(s.upi_paid) : undefined,
        customerId: s.customer_id,
        billLabel: s.created_by || undefined,
        pointsEarned: Number(s.points_earned),
        pointsRedeemed: Number(s.points_redeemed),
        discountAmount: Number(s.discount_amount),
        items: (s.sale_items || []).map((i: any) => {
            const product = productById.get(i.product_id);
            const productName = i.product_name || product?.name || 'Unknown item';
            const unit = parseUnitFromProductName(productName, product?.unit || 'unit');
            const displayName = productName.replace(/\s*\([^)]+\)\s*$/, '').trim() || productName;
            return {
                id: i.product_id,
                name: displayName,
                price: Number(i.price_at_sale),
                cost: Number(product?.cost ?? 0),
                quantity: Number(i.quantity),
                category: product?.category || 'Unknown',
                stock: Number(product?.stock ?? 0),
                minStock: Number(product?.minStock ?? 0),
                unit,
                cartLineId: getCartLineId(i.product_id, unit)
            };
        })
    }));
};

export const updateSale = async (sale: SaleRecord) => {
    if (!supabase) throw new Error('No DB');

    const { data: existingItems, error: existingItemsError } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', sale.id);
    if (existingItemsError) throw existingItemsError;

    const previousItems: CartItem[] = (existingItems || []).map((i: any) => ({
        id: i.product_id,
        name: i.product_name || 'Item',
        price: Number(i.price_at_sale),
        cost: 0,
        quantity: Number(i.quantity),
        category: '',
        stock: 0,
        minStock: 0,
        unit: parseUnitFromProductName(i.product_name || '', 'unit'),
        cartLineId: getCartLineId(i.product_id, parseUnitFromProductName(i.product_name || '', 'unit'))
    }));

    await adjustStockForItems(previousItems, 'restore');

    const salePayload: Record<string, unknown> = {
        total: sale.total,
        subtotal: sale.subtotal ?? sale.total,
        tax_amount: sale.taxAmount ?? 0,
        rounding_adjustment: sale.roundingAdjustment ?? 0,
        paid_amount: sale.paidAmount ?? sale.total,
        payment_method: sale.paymentMethod ?? 'CASH',
        customer_id: sale.customerId || null,
        points_earned: sale.pointsEarned ?? 0,
        points_redeemed: sale.pointsRedeemed ?? 0,
        discount_amount: sale.discountAmount ?? 0,
        created_by: sale.billLabel || sale.customerName || 'system'
    };

    if (sale.paymentMethod === 'SPLIT') {
        salePayload.cash_paid = sale.cashPaid ?? 0;
        salePayload.upi_paid = sale.upiPaid ?? 0;
    }

    const { error: updateError } = await supabase.from('sales').update(salePayload).eq('id', sale.id);
    if (updateError) throw updateError;

    const { error: deleteItemsError } = await supabase.from('sale_items').delete().eq('sale_id', sale.id);
    if (deleteItemsError) throw deleteItemsError;

    const itemsPayload = sale.items
        .filter(item => item.id && item.id.trim() !== '')
        .map(item => ({
            sale_id: sale.id,
            product_id: item.id,
            quantity: item.quantity,
            price_at_sale: item.price,
            product_name: `${item.name} (${item.unit})`
        }));

    if (itemsPayload.length === 0) {
        throw new Error('A bill must contain at least one item.');
    }

    const { error: itemsError } = await supabase.from('sale_items').insert(itemsPayload);
    if (itemsError) throw itemsError;

    await adjustStockForItems(sale.items, 'deduct');
};

export const voidSale = async (sale: SaleRecord) => {
    if (!supabase) throw new Error('No DB');

    await adjustStockForItems(sale.items, 'restore');

    if (sale.customerId) {
        const { data: cust } = await supabase.from('customers').select('total_spent, loyalty_points').eq('id', sale.customerId).single();
        if (cust) {
            await supabase.from('customers').update({
                total_spent: Math.max(0, Number(cust.total_spent) - sale.total),
                loyalty_points: Math.max(0, Number(cust.loyalty_points) - (sale.pointsEarned ?? 0) + (sale.pointsRedeemed ?? 0))
            }).eq('id', sale.customerId);
        }
    }

    const { error: deleteItemsError } = await supabase.from('sale_items').delete().eq('sale_id', sale.id);
    if (deleteItemsError) throw deleteItemsError;

    const { error: deleteSaleError } = await supabase.from('sales').delete().eq('id', sale.id);
    if (deleteSaleError) throw deleteSaleError;
};

// User Management
export const getAdminUsers = async () => {
    if (!supabase) throw new Error('Supabase not initialized');
    // In client/browser contexts we cannot call admin endpoints (they require
    // a service_role key). Use the `user_profiles` table as the source of
    // truth for user listings to avoid 403 responses from the admin API.
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((profile: any) => ({
        id: profile.id,
        email: profile.email,
        user_metadata: { role: profile.role },
        created_at: profile.created_at,
        last_sign_in_at: profile.last_sign_in_at ?? null
    }));
};

export const createAdminUser = async (email: string, password: string, userMetadata?: any) => {
    if (!supabase || !supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase not initialized');
    }

    // NOTE: supabase.auth.admin.createUser() needs the service_role key, which must
    // never be exposed to the browser — with the anon key it fails with "User not
    // allowed". Instead we use the standard signUp flow (allowed with the anon key)
    // on an *isolated* client so the current admin's session isn't replaced by the
    // newly created user's session.
    const isolated = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    const role = userMetadata?.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.EMPLOYEE;

    const { data, error } = await isolated.auth.signUp({
        email,
        password,
        options: {
            data: { ...(userMetadata || {}), role },
        },
    });

    if (error) throw error;
    if (data.user) {
        await supabase.from('user_profiles').upsert({
            id: data.user.id,
            email,
            role
        });
    }
    // Attempt a client-side sign-in test for the newly created user using an
    // isolated Supabase client with noop storage to avoid interference with the
    // primary client and to prevent the "Multiple GoTrueClient instances"
    // warning. This will not change the global session.
    const noopStorage = {
        getItem: (_: string) => null,
        setItem: (_: string, _v: string) => {},
        removeItem: (_: string) => {}
    };

    let signInTest: { success: boolean; error?: string } = { success: false };
    try {
        const isolatedTest = createClient(supabaseUrl!, supabaseAnonKey!, {
            auth: { persistSession: false, autoRefreshToken: false, storage: noopStorage }
        });

        const { data: signinData, error: signinError } = await isolatedTest.auth.signInWithPassword({ email, password });
        if (signinError) {
            signInTest = { success: false, error: signinError.message || String(signinError) };
        } else if (signinData?.session) {
            signInTest = { success: true };
        }
    } catch (err: any) {
        signInTest = { success: false, error: err?.message || String(err) };
        console.warn('Sign-in test after user creation failed (non-fatal)', err);
    }

    return { user: data.user, signInTest };
};

export const deleteAdminUser = async (userId: string) => {
    if (!supabase) throw new Error('Supabase not initialized');

    // supabase.auth.admin.deleteUser() requires the service_role key which must
    // never be exposed in the browser — with the anon key it always returns
    // "User not allowed". Instead we remove the user from the user_profiles
    // table (protected by RLS for admins) which effectively revokes their
    // access from the app. The Supabase Auth account can be removed via the
    // Supabase dashboard (Authentication → Users) if a hard-delete is needed.
    const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);
    if (error) throw error;
};

export const updateAdminUserPassword = async (userId: string, password: string) => {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data, error } = await supabase.auth.admin.updateUserById(userId, { password });
    if (error) throw error;
    return data.user;
};

export default supabase;
