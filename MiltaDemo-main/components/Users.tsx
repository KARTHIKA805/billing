import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Trash2, Eye, EyeOff, X, AlertCircle, Check, Info, ShieldCheck, BadgeCheck } from 'lucide-react';
import { getAdminUsers, createAdminUser, createEmployeeUser, deleteAdminUser } from '../services/supabaseService';

type UserRole = 'admin' | 'employee';

interface AppUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  user_metadata?: {
    role?: UserRole;
    [key: string]: unknown;
  };
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [newUser, setNewUser] = useState<{ email: string; password: string; role: UserRole }>({
    email: '',
    password: '',
    role: 'employee'
  });

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err: any) {
      // This error is expected if using client-side auth
      console.warn('Note: User management requires admin access. For full functionality, use Supabase Dashboard.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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
      if (newUser.role === 'admin') {
        await createAdminUser(newUser.email, newUser.password);
      } else {
        await createEmployeeUser(newUser.email, newUser.password);
      }
      setSuccess(`${newUser.role === 'admin' ? 'Admin' : 'Employee'} user ${newUser.email} created successfully!`);
      setNewUser({ email: '', password: '', role: 'employee' });
      setShowAddModal(false);
      await loadUsers();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create user';
      if (errorMsg.includes('admin')) {
        setError('Admin user creation requires backend setup. Please use the Supabase Dashboard to create users.');
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
    try {
      await deleteAdminUser(userId);
      setSuccess('User deleted successfully!');
      setDeleteConfirm(null);
      await loadUsers();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete user';
      if (errorMsg.includes('admin')) {
        setError('Admin user deletion requires backend setup. Please use the Supabase Dashboard to delete users.');
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
    || (u.user_metadata?.role || 'employee').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserRole = (user: AppUser): UserRole => user.user_metadata?.role === 'admin' ? 'admin' : 'employee';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
        <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="font-medium text-blue-900">Team User Management</p>
          <p className="text-sm text-blue-800 mt-1">
            Create admin and employee login accounts. For production use, this requires Supabase admin access or creating users through the <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Supabase Dashboard</a> (Authentication &gt; Users).
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 bg-white placeholder-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-medium transition-colors shadow-md shadow-amber-200 whitespace-nowrap"
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
            <p className="font-medium text-red-900">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-start gap-3">
          <Check className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-green-900">{success}</p>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Last Sign In</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">{user.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getUserRole(user) === 'admin' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold uppercase">
                          <ShieldCheck size={14} />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold uppercase">
                          <BadgeCheck size={14} />
                          Employee
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600 text-sm">
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deleteConfirm === user.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <p className="text-sm text-slate-600 mr-3">Delete user?</p>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={loading}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            disabled={loading}
                            className="px-3 py-1 bg-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-400 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Create New User</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewUser({ ...newUser, role: 'employee' })}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-medium transition-colors ${newUser.role === 'employee'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <BadgeCheck size={18} />
                    Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUser({ ...newUser, role: 'admin' })}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-medium transition-colors ${newUser.role === 'admin'
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <ShieldCheck size={18} />
                    Admin
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 placeholder-slate-400"
                  placeholder={newUser.role === 'admin' ? 'admin@bakery.com' : 'employee@bakery.com'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 placeholder-slate-400"
                    placeholder="Minimum 6 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Minimum 6 characters</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-xs text-blue-900">
                  This {newUser.role} user will be able to log in with their email and password.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-medium transition-colors disabled:opacity-50"
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
