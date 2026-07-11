import React, { useState } from 'react';
import { Category } from '../types';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

interface CategoriesProps {
  categories: Category[];
  onAddCategory: (name: string, imageFile?: File | null) => Promise<void> | void;
  onUpdateCategory: (id: string, name: string, imageFile?: File | null) => Promise<void> | void;
  onDeleteCategory: (id: string) => Promise<void> | void;
  canEdit?: boolean;
}

const Categories: React.FC<CategoriesProps> = ({ categories, onAddCategory, onUpdateCategory, onDeleteCategory, canEdit = true }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAdd = () => { setEditing(null); setName(''); setImageFile(null); setIsModalOpen(true); };
  const openEdit = (cat: Category) => { setEditing(cat); setName(cat.name); setImageFile(null); setIsModalOpen(true); };
  const close = () => { setIsModalOpen(false); setEditing(null); setName(''); setImageFile(null); };

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Category name is required');
    if (!imageFile && !editing) return alert('Category image is required');
    setIsSubmitting(true);
    try {
      if (editing) {
        await onUpdateCategory(editing.id, name.trim(), imageFile);
      } else {
        await onAddCategory(name.trim(), imageFile);
      }
      close();
    } catch (err) {
      console.error(err);
      alert('Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[var(--brand-dark)]">Categories</h3>
          <p className="text-sm text-[var(--brand-border)]">Create and manage product categories with images.</p>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="inline-flex items-center gap-2 bg-[var(--brand-dark)] text-[var(--brand-text-light)] px-4 py-2 rounded-xl hover:bg-[var(--brand-bg)] transition-colors">
            <Plus size={16} /> Add Category
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-[var(--brand-surface)] rounded-lg p-3 border border-[var(--brand-border)] flex flex-col items-center gap-2" style={{width:130}}>

            {cat.imageUrl ? <img src={cat.imageUrl} alt={cat.name} className="object-cover rounded-md" style={{width:75,height:75}} /> : <div className="bg-[var(--brand-muted)] rounded-md" style={{width:75,height:75}} />}
            <div className="w-full flex items-center justify-between">
              <div className="font-medium text-[var(--brand-dark)]">{cat.name}</div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(cat)} className="p-2 text-[var(--brand-border)] hover:text-[var(--brand-dark)] rounded-md"><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm(`Delete category '${cat.name}'?`)) onDeleteCategory(cat.id); }} className="p-2 text-rose-600 rounded-md"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[var(--brand-dark)]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--brand-surface)] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up border border-[var(--brand-border)]">
            <div className="p-4 border-b border-[var(--brand-border)] flex justify-between items-center bg-[var(--brand-muted)]">
              <h4 className="font-bold">{editing ? 'Edit Category' : 'Add Category'}</h4>
              <button onClick={close} className="text-[var(--brand-border)]"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold">Name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-white" required />
              </div>
              <div>
                <label className="block text-sm font-semibold">Image {editing ? '(leave blank to keep existing)' : '(required)'}</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)} className="mt-2" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-[var(--brand-border)]">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-[var(--brand-dark)] text-[var(--brand-text-light)]">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
