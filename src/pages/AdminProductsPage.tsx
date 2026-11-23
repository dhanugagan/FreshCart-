import React, { useEffect, useState } from 'react';
import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import { AdminShell } from './AdminGuard';
import { AnimatedPageTransition } from '../animations/MotionPrimitives';
import { adminService } from '../services/adminService';
import { productService } from '../services/productService';
import { storageService } from '../services/storageService';
import { extractApiError } from '../services/api';
import { productUploadSoonImg } from '../assets/brandAssets';
import { useApp } from '../context/AppContext';
import type { Category, Product } from '../types';

export const AdminProductsPage: React.FC = () => {
  const { user, pushToast } = useApp();
  const isAdmin = user?.roles?.includes('ADMIN');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState(1);
  const [price, setPrice] = useState('99');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [stockQuantity, setStockQuantity] = useState('40');
  const [unit, setUnit] = useState('500 g');

  const load = async () => {
    const [cats, prods] = await Promise.all([productService.getCategories(), productService.getProducts({ limit: 150 })]);
    setCategories(cats);
    setProducts(prods.items);
    if (cats.length > 0 && categoryId === 1) setCategoryId(cats[0].id);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.createProduct({
        categoryId,
        name,
        brand,
        unit,
        price: Number(price),
        discountPercent: Number(discountPercent),
        stockQuantity: Number(stockQuantity),
      });
      setName('');
      setBrand('');
      setShowAdd(false);
      pushToast('success', 'Product added to catalog');
      await load();
    } catch (err) {
      pushToast('error', extractApiError(err));
    }
  };

  const handleQuickPrice = async (p: Product, nextPrice: number) => {
    if (Number.isNaN(nextPrice) || nextPrice <= 0) return;
    await adminService.updateProduct(p.id, { price: nextPrice });
    pushToast('success', `Updated ${p.name} price`);
    await load();
  };

  const handleDelete = async (id: number) => {
    await adminService.deleteProduct(id);
    pushToast('info', 'Product removed from storefront');
    await load();
  };

  const handleImageUpload = async (product: Product, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      pushToast('error', 'Choose a PNG, JPG, or WebP image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result || '');
        const res = await storageService.uploadProductImage(product.id, file.name, dataUrl);
        pushToast('success', `Photo uploaded for ${product.name} (${res.storageProvider})`);
        await load();
      } catch (err) {
        pushToast('error', extractApiError(err, 'Failed to upload photo'));
      }
    };
    reader.readAsDataURL(file);
  };

  const filtered = search.trim()
    ? products.filter((p) => `${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(search.toLowerCase()))
    : products;

  return (
    <AnimatedPageTransition>
      <AdminShell title="Product Management" subtitle={`Add, price in ₹, and maintain ${products.length} grocery catalog items`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter catalog by name, brand, or SKU..."
            className="h-10 w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={() => setShowAdd((s) => !s)}
            data-testid="admin-add-product-toggle"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleCreate} className="grid gap-4 rounded-2xl border border-emerald-200 bg-white p-5 sm:grid-cols-3 dark:border-emerald-900 dark:bg-[#131C17]">
            <input required placeholder="Product Name" value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <input required placeholder="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input required type="number" step="1" placeholder="Price (₹)" value={price} onChange={(e) => setPrice(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <input required type="number" placeholder="Initial Stock" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <input required placeholder="Unit (e.g. 500 g)" value={unit} onChange={(e) => setUnit(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <input type="number" placeholder="Discount %" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <button type="submit" data-testid="admin-save-product" className="h-10 rounded-xl bg-emerald-700 px-5 text-xs font-semibold text-white sm:col-span-2">
              Save New Product
            </button>
          </form>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white dark:border-emerald-950/60 dark:bg-[#131C17]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                <th className="p-4">Photo</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price (₹)</th>
                <th className="p-4">Stock</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={p.imageUrl || productUploadSoonImg}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                      />
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        <ImagePlus className="h-3.5 w-3.5" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          onChange={(e) => handleImageUpload(p, e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-slate-500">{p.sku}</td>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    {p.name} <span className="font-normal text-slate-500">· {p.brand} ({p.unit})</span>
                  </td>
                  <td className="p-4">{p.categoryName}</td>
                  <td className="p-4">
                    <input
                      type="number"
                      step="1"
                      defaultValue={p.price}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (val !== p.price) handleQuickPrice(p, val);
                      }}
                      className="h-8 w-24 rounded-lg border border-slate-200 px-2 tabular-nums dark:border-slate-700 dark:bg-slate-900"
                    />
                  </td>
                  <td className="p-4 tabular-nums">{p.stockQuantity}</td>
                  <td className="p-4 text-right">
                    <button type="button" onClick={() => handleDelete(p.id)} aria-label="Delete product" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminShell>
    </AnimatedPageTransition>
  );
};
