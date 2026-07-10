import React, { useState } from 'react';
import { Customer, SaleRecord } from '../types';
import { Search, UserPlus, History, Award, X } from 'lucide-react';

interface CustomersProps {
  customers: Customer[];
  sales: SaleRecord[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'joinDate' | 'loyaltyPoints' | 'totalSpent'>) => void;
}

const Customers: React.FC<CustomersProps> = ({ customers, sales, onAddCustomer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Filter customers
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // New Customer Form State
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCustomer(newCustomer);
    setNewCustomer({ name: '', phone: '', email: '' });
    setShowAddModal(false);
  };

  // Get customer history
  const customerHistory = selectedCustomer 
    ? sales.filter(s => s.customerId === selectedCustomer.id).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[var(--brand-surface)] p-4 rounded-2xl border border-[var(--brand-border)] shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand-border)]" size={20} />
          <input 
            type="text" 
            placeholder="Search by name, phone, or email..." 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)] bg-white placeholder-[var(--brand-border)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full md:w-auto flex items-center gap-2 bg-[var(--brand-dark)] text-[var(--brand-text-light)] px-5 py-2.5 rounded-xl font-medium hover:bg-[var(--brand-bg)] transition-colors shadow-lg shadow-[var(--brand-border)]"
        >
          <UserPlus size={18} />
          Add Customer
        </button>
      </div>

      {/* Customer List */}
      <div className="bg-[var(--brand-surface)] rounded-2xl border border-[var(--brand-border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--brand-muted)] border-b border-[var(--brand-border)]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Loyalty Points</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Total Spent</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--brand-border)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--brand-border)]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[var(--brand-border)]">
                    No customers found matching your search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-[var(--brand-muted)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--brand-dark)]">{customer.name}</div>
                      <div className="text-xs text-[var(--brand-border)]">Joined {customer.joinDate.toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--brand-text-dark)]">
                      <div>{customer.phone}</div>
                      <div className="text-xs text-[var(--brand-border)]">{customer.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--brand-accent)]/20 text-[var(--brand-dark)] text-sm font-medium border border-[var(--brand-border)]">
                        <Award size={14} />
                        {customer.loyaltyPoints} pts
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[var(--brand-text-dark)]">
                      ₹{customer.totalSpent.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedCustomer(customer)}
                        className="text-[var(--brand-border)] hover:text-[var(--brand-dark)] p-2 hover:bg-[var(--brand-muted)] rounded-lg transition-all"
                        title="View History"
                      >
                        <History size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[var(--brand-dark)]/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--brand-surface)] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up border border-[var(--brand-border)]">
            <div className="p-6 border-b border-[var(--brand-border)] flex justify-between items-center bg-[var(--brand-muted)]">
              <h3 className="text-lg font-bold text-[var(--brand-dark)]">Add New Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--brand-border)] hover:text-[var(--brand-dark)]">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--brand-dark)] mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)]"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--brand-dark)] mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  required
                  className="w-full px-4 py-2 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)]"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--brand-dark)] mb-1">Email (Optional)</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2 rounded-xl border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 focus:border-[var(--brand-accent)] text-[var(--brand-text-dark)]"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-[var(--brand-dark)] text-[var(--brand-text-light)] py-3 rounded-xl font-medium hover:bg-[var(--brand-bg)] transition-colors">
                  Create Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-[var(--brand-dark)]/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--brand-surface)] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-up border border-[var(--brand-border)]">
            <div className="p-6 border-b border-[var(--brand-border)] flex justify-between items-center bg-[var(--brand-muted)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--brand-dark)]">{selectedCustomer.name}</h3>
                <p className="text-sm text-[var(--brand-border)]">{selectedCustomer.email} • {selectedCustomer.phone}</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-[var(--brand-border)] hover:text-[var(--brand-dark)]">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex gap-4 mb-6">
                 <div className="flex-1 bg-[var(--brand-accent)]/20 p-4 rounded-xl border border-[var(--brand-border)] text-center">
                    <p className="text-xs text-[var(--brand-dark)] font-semibold uppercase">Loyalty Points</p>
                    <p className="text-2xl font-bold text-[var(--brand-dark)]">{selectedCustomer.loyaltyPoints}</p>
                 </div>
                 <div className="flex-1 bg-[var(--brand-muted)] p-4 rounded-xl border border-[var(--brand-border)] text-center">
                    <p className="text-xs text-[var(--brand-border)] font-semibold uppercase">Lifetime Value</p>
                    <p className="text-2xl font-bold text-[var(--brand-dark)]">₹{selectedCustomer.totalSpent.toFixed(2)}</p>
                 </div>
                 <div className="flex-1 bg-[var(--brand-surface)] p-4 rounded-xl border border-[var(--brand-border)] text-center">
                    <p className="text-xs text-[var(--brand-border)] font-semibold uppercase">Total Orders</p>
                    <p className="text-2xl font-bold text-[var(--brand-dark)]">{customerHistory.length}</p>
                 </div>
              </div>

              <h4 className="font-semibold text-[var(--brand-dark)] mb-4">Order History</h4>
              
              {customerHistory.length === 0 ? (
                <div className="text-center py-8 text-[var(--brand-border)] border-2 border-dashed border-[var(--brand-border)] rounded-xl">
                  No orders found for this customer.
                </div>
              ) : (
                <div className="space-y-3">
                  {customerHistory.map(sale => (
                    <div key={sale.id} className="bg-[var(--brand-surface)] border border-[var(--brand-border)] p-4 rounded-xl hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-[var(--brand-border)]">
                          {new Date(sale.timestamp).toLocaleString()}
                        </span>
                        <span className="font-bold text-[var(--brand-dark)]">₹{sale.total.toFixed(2)}</span>
                      </div>
                      <div className="text-sm text-[var(--brand-border)]">
                        {sale.items.map(item => (
                          <span key={item.id} className="mr-3">
                             {item.quantity}x {item.name}
                          </span>
                        ))}
                      </div>
                      {sale.pointsEarned && (
                        <div className="mt-2 text-xs text-[var(--brand-dark)] font-medium flex items-center gap-1">
                          <Award size={12} />
                          Earned {sale.pointsEarned} pts
                        </div>
                      )}
                      {sale.pointsRedeemed && sale.pointsRedeemed > 0 && (
                        <div className="mt-1 text-xs text-[var(--brand-dark)] font-medium">
                          Redeemed {sale.pointsRedeemed} pts for discount
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;