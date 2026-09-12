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
    <div className="categories-page animate-fade-in pb-20 md:pb-0">
      <div className="categories-page__header">
        <div>
          <h3 className="text-lg font-bold text-[var(--brand-dark)]">Categories</h3>
          <p className="text-sm text-[var(--brand-border)]">Create and manage product categories with images.</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 bg-[var(--brand-dark)] text-[var(--brand-text-light)] px-4 py-2.5 rounded-xl hover:bg-[var(--brand-bg)] transition-colors w-full sm:w-auto"
          >
            <Plus size={16} /> Add Category
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-6 py-12 text-center text-[var(--brand-border)]">
          No categories yet. Add your first category to organize products.
        </div>
      ) : (
        <div className="categories-grid">
          {categories.map((cat) => (
            <div key={cat.id} className="category-card">
              <div className="category-card__image-wrap">
                {cat.imageUrl ? (
                  <img src={cat.imageUrl} alt={cat.name} />
                ) : (
                  <span className="category-card__placeholder">{cat.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <p className="category-card__name">{cat.name}</p>
              {canEdit && (
                <div className="category-card__actions">
                  <button type="button" onClick={() => openEdit(cat)} title="Edit category" aria-label={`Edit ${cat.name}`}>
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="category-card__delete"
                    onClick={() => { if (confirm(`Delete category '${cat.name}'?`)) onDeleteCategory(cat.id); }}
                    title="Delete category"
                    aria-label={`Delete ${cat.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-[var(--brand-dark)]/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-3 sm:p-4">
          <div className="app-modal-panel bg-[var(--brand-surface)] rounded-2xl shadow-xl overflow-hidden animate-scale-up border border-[var(--brand-border)]">
            <div className="p-4 border-b border-[var(--brand-border)] flex justify-between items-center bg-[var(--brand-muted)]">
              <h4 className="font-bold text-[var(--brand-dark)]">{editing ? 'Edit Category' : 'Add Category'}</h4>
              <button type="button" onClick={close} className="text-[var(--brand-border)] hover:text-[var(--brand-dark)] p-1" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--brand-dark)] mb-1.5">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--brand-border)] bg-white text-[var(--brand-text-dark)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--brand-dark)] mb-1.5">
                  Image {editing ? '(leave blank to keep existing)' : '(required)'}
                </label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="mt-1 w-full text-sm" />
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <button type="button" onClick={close} className="px-4 py-2.5 rounded-lg border border-[var(--brand-border)] text-[var(--brand-dark)]">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-lg bg-[var(--brand-dark)] text-[var(--brand-text-light)] disabled:opacity-60"
                >
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
