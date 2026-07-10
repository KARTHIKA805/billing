import React, { useState } from 'react';
import SuvaiLogo from '../Suvai.png';
import { ViewState, UserRole } from '../types';
import {
    LayoutDashboard,
    Receipt,
    Package,
    LogOut,
    ChefHat,
    Bell,
    Users,
    UserPlus,
    Menu,
    X
} from 'lucide-react';
import { Tag } from 'lucide-react';

interface LayoutProps {
    currentView: ViewState;
    onChangeView: (view: ViewState) => void;
    onLogout: () => void;
    children: React.ReactNode;
    notificationCount: number;
    userRole: UserRole;
}

const Layout: React.FC<LayoutProps> = ({
    currentView,
    onChangeView,
    onLogout,
    children,
    notificationCount,
    userRole
}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
        <button
            onClick={() => {
                onChangeView(view);
                setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-left bg-[var(--brand-dark)] text-[var(--brand-text-light)] transition-all duration-200 ease-in-out group hover:bg-[var(--brand-surface)] hover:text-[var(--brand-dark)]"
        >
            <Icon size={20} className="text-[var(--brand-text-light)] group-hover:text-[var(--brand-dark)]" />
            <span className="flex-1">{label}</span>
        </button>
    );

    return (
        <div className="flex h-screen bg-[var(--brand-muted)]">
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-[var(--brand-dark)] border-r border-[var(--brand-border)] flex flex-col hidden md:flex h-full shadow-sm z-30">
                <div className="p-6 border-b border-[var(--brand-border)]">
                    <div className="flex items-center gap-3">
                                <div className="flex items-center gap-3">
                                    <img src={SuvaiLogo} alt="Suvai" className="w-10 h-10 object-contain rounded-md" />
                                    <div>
                                        <h1 className="font-bold text-lg text-[var(--brand-text-light)] tracking-tight">Suvai</h1>
                                        <p className="text-xs text-[var(--brand-accent)] font-medium">{userRole === UserRole.ADMIN ? 'Admin Dashboard' : 'Employee Dashboard'}</p>
                                    </div>
                                </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {userRole === UserRole.ADMIN && (
                        <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
                    )}
                    <NavItem view={ViewState.BILLING} icon={Receipt} label="Billing" />
                    <NavItem view={ViewState.INVENTORY} icon={Package} label="Inventory" />
                    {userRole === UserRole.ADMIN && (
                        <NavItem view={ViewState.CATEGORIES} icon={Tag} label="Categories" />
                    )}
                    <NavItem view={ViewState.CUSTOMERS} icon={Users} label="Customers" />
                    {userRole === UserRole.ADMIN && (
                        <NavItem view={ViewState.USERS} icon={UserPlus} label="Users" />
                    )}
                </nav>

                <div className="p-4 border-t border-[var(--brand-border)]">
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-[var(--brand-text-light)] hover:bg-[var(--brand-surface)] hover:text-[var(--brand-dark)] transition-colors"
                    >
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-[var(--brand-dark)]/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* Mobile Sidebar */}
            <aside className={`fixed inset-y-0 left-0 w-64 bg-[var(--brand-dark)] shadow-xl transform transition-transform duration-300 ease-in-out z-50 md:hidden flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-[var(--brand-border)] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                            <div className="flex items-center gap-3">
                                <img src={SuvaiLogo} alt="Suvai" className="w-10 h-10 object-contain rounded-md" />
                                <div>
                                    <h1 className="font-bold text-lg text-[var(--brand-text-light)] tracking-tight">Suvai</h1>
                                </div>
                            </div>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="text-[var(--brand-text-light)]">
                        <X size={24} />
                    </button>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {userRole === UserRole.ADMIN && (
                        <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
                    )}
                    <NavItem view={ViewState.BILLING} icon={Receipt} label="Billing" />
                    <NavItem view={ViewState.INVENTORY} icon={Package} label="Inventory" />
                    <NavItem view={ViewState.CUSTOMERS} icon={Users} label="Customers" />
                    {userRole === UserRole.ADMIN && (
                        <NavItem view={ViewState.USERS} icon={UserPlus} label="Users" />
                    )}
                </nav>
                <div className="p-4 border-t border-[var(--brand-border)]">
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-[var(--brand-text-light)] hover:bg-[var(--brand-surface)] hover:text-[var(--brand-dark)] transition-colors"
                    >
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
                {/* Header */}
                <header className="h-16 bg-[var(--brand-surface)]/90 backdrop-blur-md border-b border-[var(--brand-border)] flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <button
                            className="md:hidden text-[var(--brand-dark)] p-1"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <h2 className="text-lg md:text-xl font-semibold text-[var(--brand-dark)] truncate">
                            {currentView === ViewState.DASHBOARD && 'Dashboard'}
                            {currentView === ViewState.BILLING && 'Billing'}
                            {currentView === ViewState.INVENTORY && 'Inventory'}
                            {currentView === ViewState.CUSTOMERS && 'Customers'}
                            {currentView === ViewState.USERS && 'Users'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button className="p-2 text-[var(--brand-border)] hover:text-[var(--brand-dark)] rounded-full hover:bg-[var(--brand-surface)] transition-colors relative">
                                <Bell size={20} />
                                {notificationCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[var(--brand-accent)] rounded-full border-2 border-white"></span>
                                )}
                            </button>
                        </div>
                        <div className="h-8 w-8 bg-[var(--brand-accent)] rounded-full flex items-center justify-center text-[var(--brand-dark)] font-bold text-sm border border-[var(--brand-border)]">
                            {userRole === UserRole.EMPLOYEE ? 'E' : 'A'}
                        </div>
                    </div>
                </header>

                {/* Scrollable Page Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
