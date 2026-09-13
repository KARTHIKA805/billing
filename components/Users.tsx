import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Trash2, Eye, EyeOff, X, AlertCircle, Check, Info, Shield, User } from 'lucide-react';
import { getAdminUsers, createAdminUser, deleteAdminUser } from '../services/supabaseService';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at?: string | null;
}

const formatUserDateTime = (value?: string | null) => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const Users: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'employee' });

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminUsers();
      setUsers(data.map((user: any) => ({
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'employee',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
      })));
    } catch (err: any) {
      // This error is expected if using client-side auth
      console.warn('Note: User management requires admin access. For full functionality, use the admin console.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setWarning('');

    if (!newUser.email || !newUser.password) {
      setError('Email and password are required');
      return;
    }

    if (newUser.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res: any = await createAdminUser(newUser.email, newUser.password, { role: newUser.role });
      const createdUser = res?.user ?? res;
      const signInTest = res?.signInTest;

      setSuccess(
        `${newUser.role === 'admin' ? 'Admin' : 'Employee'} user ${newUser.email} created successfully.`
      );

      // If sign-in test failed due to email confirmation, surface a helpful warning (not an error)
      if (signInTest && signInTest.success === false) {
        const isEmailConfirmation = /confirm|email/i.test(signInTest.error || '');
        if (isEmailConfirmation) {
          setWarning(
            `User created, but email confirmation is required. The user must confirm their email before they can log in. To skip this, disable "Email Confirmations" in Supabase → Authentication → Providers → Email.`
          );
        } else {
          setWarning(
            `User created, but sign-in test failed: ${signInTest.error || 'requires email confirmation or signups disabled'}`
          );
        }
      }

      setNewUser({ email: '', password: '', role: 'employee' });
      setShowAddModal(false);
      await loadUsers();
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to create user';
      if (/not allowed|service_role|admin/i.test(errorMsg)) {
        setError('User creation is not permitted with the current key. Ensure signups are enabled in Supabase (Authentication → Providers → Email), or create the user from the Supabase admin console.');
      } else if (/registered|already/i.test(errorMsg)) {
        setError('A user with this email already exists.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setLoading(true);
    setError('');
    setSuccess('');
    setWarning('');
    try {
      await deleteAdminUser(userId);
      setSuccess('User deleted successfully!');
      setDeleteConfirm(null);
      await loadUsers();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete user';
      if (/not allowed|permission|policy|rls/i.test(errorMsg)) {
        setError(
          'Permission denied: your Supabase RLS policy does not allow deleting from user_profiles. ' +
          'Run the fix_rls_policies.sql script in your Supabase SQL editor to grant admin delete access.'
        );
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Info Banner */}
      <div className="bg-[var(--brand-muted)] border border-[var(--brand-border)] p-4 rounded-xl flex items-start gap-3">
        <Info className="text-[var(--brand-dark)] flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="font-medium text-[var(--brand-dark)]">User Management</p>
          <p className="text-sm text-[var(--brand-border)] mt-1">
            For production use, create admin and employee users through the <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">admin console</a> (Authentication → Users).
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[var(--brand-surface)] p-4 rounded-2xl border border-[var(--brand-border)] shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand-border)]" size={20} />
          <input
            type="text"
            placeholder="Search by email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)] bg-white placeholder-[var(--brand-border)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--brand-dark)] text-[var(--brand-text-light)] rounded-xl hover:bg-[var(--brand-bg)] font-medium transition-colors shadow-md shadow-[var(--brand-border)] whitespace-nowrap"
        >
          <UserPlus size={20} />
          Add User
        </button>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-red-700">{error}</p>
          </div>
        </div>
      )}

      {warning && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-amber-700">{warning}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-start gap-3">
          <Check className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-[var(--brand-surface)] rounded-2xl border border-[var(--brand-border)] shadow-sm overflow-hidden">
        {loading && filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--brand-border)]">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--brand-border)]">No users found</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead className="bg-[var(--brand-muted)] border-b border-[var(--brand-border)]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Last Sign In</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)]">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-[var(--brand-muted)] transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-[var(--brand-dark)]">{user.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'admin'
                            ? 'bg-[var(--brand-accent)]/20 text-[var(--brand-dark)] border border-[var(--brand-border)]'
                            : 'bg-[var(--brand-muted)] text-[var(--brand-text-dark)] border border-[var(--brand-border)]'
                        }`}
                      >
                        {user.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                        {user.role === 'admin' ? 'Admin' : 'Employee'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[var(--brand-border)] text-sm">
                        {formatUserDateTime(user.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[var(--brand-border)] text-sm">
                        {formatUserDateTime(user.last_sign_in_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deleteConfirm === user.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <p className="text-sm text-[var(--brand-border)] mr-3">Delete user?</p>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={loading}
                            className="px-3 py-1 bg-[var(--brand-dark)] text-[var(--brand-text-light)] rounded-lg text-sm hover:bg-[var(--brand-bg)] disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            disabled={loading}
                            className="px-3 py-1 bg-[var(--brand-muted)] text-[var(--brand-dark)] rounded-lg text-sm hover:bg-[var(--brand-surface)] disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(user.id)}
                          className="p-2 text-[var(--brand-dark)] hover:bg-[var(--brand-muted)] rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[var(--brand-dark)]/20 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--brand-surface)] rounded-2xl shadow-xl max-w-md w-full p-6 border border-[var(--brand-border)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--brand-dark)]">Create New User</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-[var(--brand-muted)] rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--brand-dark)] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)] placeholder-[var(--brand-border)]"
                  placeholder="admin@bakery.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--brand-dark)] mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)] placeholder-[var(--brand-border)]"
                    placeholder="Minimum 6 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-border)] hover:text-[var(--brand-dark)]"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-[var(--brand-border)] mt-1">Minimum 6 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--brand-dark)] mb-2">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewUser({ ...newUser, role: 'employee' })}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                      newUser.role === 'employee'
                        ? 'border-[var(--brand-border)] bg-[var(--brand-muted)] text-[var(--brand-dark)] ring-2 ring-[var(--brand-accent)]/20'
                        : 'border-[var(--brand-border)] text-[var(--brand-border)] hover:bg-[var(--brand-surface)]'
                    }`}
                  >
                    <User size={18} />
                    <div className="text-left">
                      <p className="text-sm font-medium">Employee</p>
                      <p className="text-xs opacity-70">Sales & stock view</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUser({ ...newUser, role: 'admin' })}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                      newUser.role === 'admin'
                        ? 'border-[var(--brand-border)] bg-[var(--brand-muted)] text-[var(--brand-dark)] ring-2 ring-[var(--brand-accent)]/20'
                        : 'border-[var(--brand-border)] text-[var(--brand-border)] hover:bg-[var(--brand-surface)]'
                    }`}
                  >
                    <Shield size={18} />
                    <div className="text-left">
                      <p className="text-sm font-medium">Admin</p>
                      <p className="text-xs opacity-70">Full access</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="bg-[var(--brand-muted)] border border-[var(--brand-border)] p-3 rounded-lg">
                <p className="text-xs text-[var(--brand-border)]">
                  {newUser.role === 'admin'
                    ? 'Admins get full access: dashboard, billing, inventory editing, customers, and user management.'
                    : 'Employees can record sales, view inventory (read-only), and manage customers. No user management or inventory editing.'}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-[var(--brand-border)] text-[var(--brand-dark)] rounded-xl hover:bg-[var(--brand-muted)] font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-[var(--brand-dark)] text-[var(--brand-text-light)] rounded-xl hover:bg-[var(--brand-bg)] font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
