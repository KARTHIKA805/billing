import React, { useEffect, useState } from 'react';
import SuvaiLogo from '../suvai.jpeg';
import { ViewState, UserRole } from '../types';
import {
    LayoutDashboard,
    Receipt,
    Package,
    LogOut,
    Bell,
    Users,
    UserPlus,
    Menu,
    X,
    History,
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-react';
import { Tag } from 'lucide-react';

interface LayoutProps {
    currentView: ViewState;
    onChangeView: (view: ViewState) => void;
    onLogout: () => void;
    children: React.ReactNode;
    notifications: { id: string, message: string }[];
    userRole: UserRole;
    fillViewport?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
    currentView,
    onChangeView,
    onLogout,
    children,
    notifications,
    userRole,
    fillViewport = false
}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('suvai-sidebar-collapsed');
        if (stored === 'true') setIsSidebarCollapsed(true);
    }, []);

    const toggleDesktopSidebar = () => {
        setIsSidebarCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('suvai-sidebar-collapsed', String(next));
            return next;
        });
    };

    const NavItem = ({
        view,
        icon: Icon,
        label,
        collapsed = false
    }: {
        view: ViewState;
        icon: React.ComponentType<{ size?: number; className?: string }>;
        label: string;
        collapsed?: boolean;
    }) => (
        <button
            onClick={() => {
                onChangeView(view);
                setIsMobileMenuOpen(false);
            }}
            title={collapsed ? label : undefined}
            aria-label={label}
            className={`flex items-center w-full rounded-2xl text-left bg-[var(--brand-dark)] text-[var(--brand-text-light)] transition-all duration-200 ease-in-out group hover:bg-[var(--brand-surface)] hover:text-[var(--brand-dark)] ${
                collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
            }`}
        >
            <Icon size={20} className="text-[var(--brand-text-light)] group-hover:text-[var(--brand-dark)] shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
        </button>
    );

    return (
        <div className="app-shell flex bg-[var(--brand-muted)]">
            {/* Laptop / Desktop Sidebar */}
            <aside
                className={`hidden md:flex flex-col h-full bg-[var(--brand-dark)] border-r border-[var(--brand-border)] shadow-sm z-30 transition-[width] duration-300 ease-in-out overflow-hidden ${
                    isSidebarCollapsed ? 'w-[4.5rem]' : 'w-64'
                }`}
            >
                <div className={`border-b border-[var(--brand-border)] ${isSidebarCollapsed ? 'p-3 flex justify-center' : 'p-6'}`}>
                    <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                        <img src={SuvaiLogo} alt="Suvai" className="w-10 h-10 object-contain rounded-md shrink-0" />
                        {!isSidebarCollapsed && (
                            <div className="min-w-0">
                                <h1 className="font-bold text-lg text-[var(--brand-text-light)] tracking-tight">Suvai</h1>
                                <p className="text-xs text-[var(--brand-accent)] font-medium truncate">
                                    {userRole === UserRole.ADMIN ? 'Admin Dashboard' : 'Employee Dashboard'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <nav className={`flex-1 space-y-2 overflow-y-auto overflow-x-hidden ${isSidebarCollapsed ? 'p-2' : 'p-4'}`}>
                    <NavItem collapsed={isSidebarCollapsed} view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
                    <NavItem collapsed={isSidebarCollapsed} view={ViewState.BILLING} icon={Receipt} label="Billing" />
                    <NavItem collapsed={isSidebarCollapsed} view={ViewState.BILLS} icon={History} label="Bills History" />
                    <NavItem collapsed={isSidebarCollapsed} view={ViewState.INVENTORY} icon={Package} label="Inventory" />
                    {userRole === UserRole.ADMIN && (
                        <NavItem collapsed={isSidebarCollapsed} view={ViewState.CATEGORIES} icon={Tag} label="Categories" />
                    )}
                    <NavItem collapsed={isSidebarCollapsed} view={ViewState.CUSTOMERS} icon={Users} label="Customers" />
                    {userRole === UserRole.ADMIN && (
                        <NavItem collapsed={isSidebarCollapsed} view={ViewState.USERS} icon={UserPlus} label="Users" />
                    )}
                </nav>

                <div className={`border-t border-[var(--brand-border)] ${isSidebarCollapsed ? 'p-2' : 'p-4'}`}>
                    <button
                        onClick={onLogout}
                        title={isSidebarCollapsed ? 'Sign Out' : undefined}
                        aria-label="Sign Out"
                        className={`flex items-center w-full rounded-xl text-[var(--brand-text-light)] hover:bg-[var(--brand-surface)] hover:text-[var(--brand-dark)] transition-colors ${
                            isSidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                        }`}
                    >
                        <LogOut size={20} className="shrink-0" />
                        {!isSidebarCollapsed && <span>Sign Out</span>}
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
                    <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
                    <NavItem view={ViewState.BILLING} icon={Receipt} label="Billing" />
                    <NavItem view={ViewState.BILLS} icon={History} label="Bills History" />
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

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
                {/* Header */}
                <header className="h-16 bg-[var(--brand-surface)]/90 backdrop-blur-md border-b border-[var(--brand-border)] flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            type="button"
                            className="md:hidden text-[var(--brand-dark)] p-1"
                            onClick={() => setIsMobileMenuOpen(true)}
                            aria-label="Open menu"
                        >
                            <Menu size={24} />
                        </button>
                        <button
                            type="button"
                            className="hidden md:inline-flex items-center justify-center text-[var(--brand-dark)] p-1.5 rounded-lg hover:bg-[var(--brand-muted)] transition-colors"
                            onClick={toggleDesktopSidebar}
                            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {isSidebarCollapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
                        </button>
                        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-[var(--brand-dark)] truncate">
                            {currentView === ViewState.DASHBOARD && 'Dashboard'}
                            {currentView === ViewState.BILLING && 'Billing'}
                            {currentView === ViewState.BILLS && 'Bills History'}
                            {currentView === ViewState.INVENTORY && 'Inventory'}
                            {currentView === ViewState.CATEGORIES && 'Categories'}
                            {currentView === ViewState.CUSTOMERS && 'Customers'}
                            {currentView === ViewState.USERS && 'Users'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-2 text-[var(--brand-border)] hover:text-[var(--brand-dark)] rounded-full hover:bg-[var(--brand-surface)] transition-colors relative"
                            >
                                <Bell size={20} />
                                {notifications.length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[var(--brand-accent)] rounded-full border-2 border-white"></span>
                                )}
                            </button>
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-xl shadow-lg z-50 overflow-hidden">
                                    <div className="p-3 border-b border-[var(--brand-border)] bg-[var(--brand-muted)]">
                                        <h3 className="font-semibold text-[var(--brand-dark)]">Notifications</h3>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-[var(--brand-border)]">
                                                No notifications
                                            </div>
                                        ) : (
                                            notifications.map(notif => (
                                                <div key={notif.id} className="p-3 border-b border-[var(--brand-border)] last:border-0 hover:bg-[var(--brand-muted)] transition-colors">
                                                    <p className="text-sm text-[var(--brand-dark)]">{notif.message}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="h-8 w-8 bg-[var(--brand-accent)] rounded-full flex items-center justify-center text-[var(--brand-dark)] font-bold text-sm border border-[var(--brand-border)]">
                            {userRole === UserRole.EMPLOYEE ? 'E' : 'A'}
                        </div>
                    </div>
                </header>

                {/* Scrollable Page Content */}
                <div className={`flex-1 flex flex-col min-h-0 ${fillViewport ? 'overflow-hidden p-2 sm:p-3 md:p-4 lg:p-6' : 'overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8'}`}>
                    <div className={`max-w-7xl mx-auto w-full flex-1 min-h-0 flex flex-col ${fillViewport ? 'h-full' : ''}`}>
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
