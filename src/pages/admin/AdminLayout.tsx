import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  CreditCard, 
  BarChart3, 
  Settings as SettingsIcon, 
  LogOut, 
  Wifi, 
  Menu, 
  X, 
  ExternalLink, 
  Plus, 
  ShieldCheck, 
  ChevronRight,
  Database,
  Bell,
  Radio,
  Server,
  Inbox,
  Clock,
  Store,
  Wallet,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCustomer } from '../../context/CustomerContext';
import { useReseller } from '../../context/ResellerContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { ThemeToggle } from '../../components/ThemeToggle';
import { ResellerBalanceRequestModal } from '../../components/ResellerBalanceRequestModal';
import { doesCustomerBelongToReseller } from '../../utils/resellerIsolation';

export type AdminTab = 'dashboard' | 'customers' | 'requests' | 'payments' | 'reports' | 'routers' | 'settings';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onOpenAddCustomer: () => void;
  onOpenRecordPayment: () => void;
  onNavigatePublic: () => void;
  onLogout?: () => void;
  onSwitchToMobileView?: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddCustomer,
  onOpenRecordPayment,
  onNavigatePublic,
  onLogout,
  onSwitchToMobileView,
  children,
}) => {
  const { user, logout, hasPermission, isReseller } = useAuth();
  const { customers, ispProfile, isFirebaseActive, stats, paymentRequests, supportTickets } = useCustomer();
  const { resellers, balanceRequests } = useReseller();
  const { isDark } = useTheme();
  const { addToast } = useToast();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isResellerTopUpOpen, setIsResellerTopUpOpen] = useState(false);

  // Active Reseller details if logged in as Reseller
  const currentReseller = React.useMemo(() => {
    if (!isReseller && user?.role !== 'Reseller') return null;
    if (user?.resellerId) {
      const match = resellers.find(r => r.id === user.resellerId || r.code === user.resellerId);
      if (match) return match;
    }
    if (user?.resellerCode) {
      const match = resellers.find(r => r.code === user.resellerCode);
      if (match) return match;
    }
    return (
      resellers.find(r => 
        (r.username && user?.accountUsername && r.username.toLowerCase() === user.accountUsername.toLowerCase()) ||
        r.name === user?.username ||
        r.code === user?.accountUsername
      ) || {
        id: user?.resellerId || user?.uid || 'reseller-active',
        code: user?.resellerCode || 'RES-01',
        name: user?.resellerName || user?.username || 'Reseller Admin',
        ownerName: user?.username || 'Reseller Admin',
        username: user?.accountUsername || user?.username || 'reseller',
        password: '',
        billingType: 'prepaid' as const,
        phone: user?.phone || '01900000000',
        area: 'Local Area',
        balance: 0,
        commissionRate: 15,
        status: 'Active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }, [isReseller, user, resellers]);

  const handleAdminLogout = async () => {
    try {
      await logout();
      addToast('info', 'লগআউট সম্পন্ন', 'সফলভাবে লগআউট করা হয়েছে।');
      if (onLogout) {
        onLogout();
      } else {
        onNavigatePublic();
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Strict Reseller isolation for badge counts
  const isResellerScope = isReseller || user?.role === 'Reseller';
  const myCustomers = React.useMemo(() => {
    if (isResellerScope) {
      return customers.filter(c => doesCustomerBelongToReseller(c, currentReseller));
    }
    return customers;
  }, [customers, isResellerScope, currentReseller]);

  const myCustomerIds = React.useMemo(() => new Set(myCustomers.map(c => c.id)), [myCustomers]);
  const myCustomerUids = React.useMemo(() => new Set(myCustomers.map(c => (c.uid || '').toLowerCase())), [myCustomers]);

  const dueCustomersCount = React.useMemo(() => {
    return myCustomers.filter(c => (c.dueAmount || 0) > 0 || c.paymentStatus === 'Due').length;
  }, [myCustomers]);

  const pendingRequestsCount = React.useMemo(() => {
    if (isResellerScope) {
      return paymentRequests.filter(r => 
        r.status === 'Pending' && (
          (r.customerId && myCustomerIds.has(r.customerId)) ||
          (r.customerUid && myCustomerUids.has(r.customerUid.toLowerCase()))
        )
      ).length;
    }
    return paymentRequests.filter(r => r.status === 'Pending').length;
  }, [paymentRequests, isResellerScope, myCustomerIds, myCustomerUids]);

  const openTicketsCount = React.useMemo(() => {
    if (isResellerScope) {
      return supportTickets.filter(t => 
        t.status !== 'Resolved' && (
          (t.customerId && myCustomerIds.has(t.customerId)) ||
          (t.customerUid && myCustomerUids.has(t.customerUid.toLowerCase()))
        )
      ).length;
    }
    return supportTickets.filter(t => t.status !== 'Resolved').length;
  }, [supportTickets, isResellerScope, myCustomerIds, myCustomerUids]);

  const canAddCustomer = hasPermission('add_customer');
  const canRecordPayment = hasPermission('record_payment');

  const menuItems = (isResellerScope ? [
    { id: 'dashboard' as AdminTab, label: 'ড্যাশবোর্ড', icon: LayoutDashboard, perm: 'dashboard' },
    { id: 'customers' as AdminTab, label: 'গ্রাহক তালিকা', icon: Users, perm: 'customers', badge: dueCustomersCount > 0 ? `${dueCustomersCount} Due` : undefined },
    { 
      id: 'requests' as AdminTab, 
      label: 'পেমেন্ট রিকোয়েস্ট ও সাপোর্ট', 
      icon: Clock, 
      perm: 'requests',
      badge: pendingRequestsCount > 0 ? `${pendingRequestsCount} New` : openTicketsCount > 0 ? `${openTicketsCount} Tkt` : undefined 
    },
    { id: 'payments' as AdminTab, label: 'বিলিং ও পেমেন্টস', icon: CreditCard, perm: 'payments' },
    { id: 'routers' as AdminTab, label: 'মিক্রোটিক রাউটার', icon: Server, perm: 'routers' },
    { id: 'reports' as AdminTab, label: 'হিসাব ও লেজার', icon: BarChart3, perm: 'reports' },
    { id: 'settings' as AdminTab, label: 'সেটিংস ও প্রোফাইল', icon: SettingsIcon, perm: 'settings' },
  ] : [
    { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard' },
    { id: 'customers' as AdminTab, label: 'Customers', icon: Users, perm: 'customers', badge: stats.dueCustomers > 0 ? `${stats.dueCustomers} Due` : undefined },
    { 
      id: 'requests' as AdminTab, 
      label: 'পেমেন্ট রিকোয়েস্ট ও সাপোর্ট', 
      icon: Clock, 
      perm: 'requests',
      badge: pendingRequestsCount > 0 ? `${pendingRequestsCount} New` : openTicketsCount > 0 ? `${openTicketsCount} Tkt` : undefined 
    },
    { id: 'payments' as AdminTab, label: 'Payments', icon: CreditCard, perm: 'payments' },
    { id: 'routers' as AdminTab, label: 'MikroTik Routers', icon: Server, perm: 'routers' },
    { id: 'reports' as AdminTab, label: 'Reports', icon: BarChart3, perm: 'reports' },
    { id: 'settings' as AdminTab, label: 'Settings', icon: SettingsIcon, perm: 'settings' },
  ]).filter(item => hasPermission(item.perm));

  const handleTabClick = (tab: AdminTab) => {
    onSelectTab(tab);
    setIsMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`min-h-screen flex flex-col antialiased selection:bg-cyan-500 selection:text-white transition-colors duration-500 ${
      isDark ? 'bg-theme-black text-slate-100' : 'bg-theme-colorful text-slate-100'
    }`}>
      
      {/* Top Mobile Bar */}
      <header className={`lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 backdrop-blur-xl border-b transition-colors ${
        isDark
          ? 'bg-[#0A0F1D]/90 border-slate-800 text-white'
          : 'bg-[#0F172A]/90 border-purple-500/20 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2.5 rounded-xl bg-slate-800/80 text-slate-200 hover:text-white active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center border border-slate-700"
            aria-label="Open Navigation Menu"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold shadow-xs ${
              isReseller 
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-600' 
                : 'bg-gradient-to-tr from-cyan-500 to-blue-600'
            }`}>
              {isReseller ? <Store className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            </div>
            <div>
              <span className="font-extrabold text-sm text-white block leading-tight truncate max-w-[130px]">
                {currentReseller ? currentReseller.name : ispProfile.companyName.split(' ')[0]}
              </span>
              <span className={`text-[10px] font-mono font-semibold ${isReseller ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {isReseller ? 'রিসেলার প্যানেল' : 'Admin Panel'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Reseller Mobile Balance Pill */}
          {currentReseller && (
            <button
              onClick={() => setIsResellerTopUpOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{ispProfile.currencySymbol}{currentReseller.balance.toLocaleString('en-IN')}</span>
            </button>
          )}
          {/* Moon Theme Toggle for mobile */}
          <ThemeToggle />

          {/* Switch to Mobile Cards View */}
          {isReseller && onSwitchToMobileView && (
            <button
              onClick={onSwitchToMobileView}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[40px]"
              title="মোবাইল কার্ড ভিউতে যান"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">কার্ড ভিউ</span>
            </button>
          )}

          {canAddCustomer && (
            <button
              onClick={onOpenAddCustomer}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-bold text-xs shadow-xs min-h-[40px] transition-all"
              title="Add Customer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Add</span>
            </button>
          )}
          <button
            onClick={onNavigatePublic}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 active:scale-95 text-xs min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors border border-slate-700"
            title="Public Portal"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={handleAdminLogout}
            className="p-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-rose-100 active:scale-95 text-xs min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors border border-rose-500/40"
            title="লগআউট (Logout)"
            aria-label="Logout Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        
        {/* Desktop Sidebar & Mobile Slide-over Drawer */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 border-r ${
            isDark
              ? 'bg-[#080D1A] border-slate-800 text-slate-100'
              : 'bg-[#0D1326] border-purple-500/20 text-slate-100'
          } ${
            isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
        >
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
                isReseller 
                  ? 'bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-600 shadow-emerald-500/25' 
                  : 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 shadow-cyan-500/25'
              }`}>
                {isReseller ? <Store className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
              </div>
              <div className="overflow-hidden">
                <h1 className="font-extrabold text-white text-base tracking-tight leading-none truncate">
                  {currentReseller ? currentReseller.name : ispProfile.companyName.split(' ')[0]}
                </h1>
                <span className={`text-[10px] font-semibold font-mono ${isReseller ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  {isReseller ? 'Reseller Portal' : 'Control Center'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Buttons */}
          {(canAddCustomer || canRecordPayment) && (
            <div className="p-4 space-y-2 border-b border-slate-800/80">
              {canAddCustomer && (
                <button
                  onClick={() => {
                    onOpenAddCustomer();
                    setIsMobileSidebarOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all min-h-[44px]"
                >
                  <UserPlus className="w-4 h-4" />
                  Add New Customer
                </button>
              )}

              {canRecordPayment && (
                <button
                  onClick={() => {
                    onOpenRecordPayment();
                    setIsMobileSidebarOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 font-semibold text-xs border border-emerald-500/40 transition-colors min-h-[42px]"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Record Payment
                </button>
              )}
            </div>
          )}

          {/* Nav Menu */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-2">
              Main Navigation
            </span>

            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40">
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                </button>
              );
            })}

            <div className="pt-4 mt-4 border-t border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-2">
                Executive & Public
              </span>
              <button
                onClick={onNavigatePublic}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors min-h-[44px]"
              >
                <ExternalLink className="w-4 h-4 text-slate-400" />
                <span>Public Search Portal</span>
              </button>
            </div>
          </nav>

          {/* User Profile & Logout Box */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs">
                  {user?.username?.charAt(0) || 'A'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{user?.username || 'Admin'}</p>
                  <span className="text-[10px] text-cyan-400 font-mono block truncate">{user?.role || 'Super Admin'}</span>
                </div>
              </div>

              <button
                onClick={handleAdminLogout}
                title="Logout"
                className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

        </aside>

        {/* Backdrop for mobile drawer */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Main Content Pane */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          
          {/* Desktop Top Bar */}
          <div className={`hidden lg:flex items-center justify-between px-8 py-4 border-b backdrop-blur-xl transition-colors ${
            isDark
              ? 'bg-[#080D1A]/90 border-slate-800 text-white'
              : 'bg-[#0D1326]/90 border-purple-500/20 text-white'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                ISP Admin Panel
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-xs font-bold text-cyan-300 capitalize font-mono bg-cyan-950/80 px-2.5 py-0.5 rounded-md border border-cyan-500/40">
                {currentTab}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Moon Theme Toggle */}
              <ThemeToggle />

              {/* Reseller Mobile Cards Switcher */}
              {isReseller && onSwitchToMobileView && (
                <button
                  onClick={onSwitchToMobileView}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 font-bold text-xs shadow-xs transition-all cursor-pointer"
                  title="মোবাইল কার্ড ভিউতে যান"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>মোবাইল কার্ড ভিউ</span>
                </button>
              )}

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs">
                <span className={`w-2 h-2 rounded-full ${isFirebaseActive ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`} />
                <span className="text-slate-300 font-mono text-[11px]">
                  {isFirebaseActive ? 'Firestore Online' : 'Local Storage Mode'}
                </span>
              </div>

              {/* Reseller Live Wallet Balance Pill in Desktop Topbar */}
              {currentReseller && (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs shadow-xs">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-semibold text-slate-300">ওয়ালেট ব্যালেন্স:</span>
                  <span className="font-mono font-black text-white text-sm">
                    {ispProfile.currencySymbol}{currentReseller.balance.toLocaleString('en-IN')}
                  </span>
                  <button
                    onClick={() => setIsResellerTopUpOpen(true)}
                    className="ml-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs active:scale-95 transition-all cursor-pointer"
                    title="ওয়ালেট রিচার্জের জন্য এডমিনকে রিকোয়েস্ট পাঠান"
                  >
                    + ব্যালেন্স রিচার্জ
                  </button>
                </div>
              )}

              {canAddCustomer && (
                <button
                  onClick={onOpenAddCustomer}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Customer
                </button>
              )}

              {canRecordPayment && (
                <button
                  onClick={onOpenRecordPayment}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Record Payment
                </button>
              )}

              {/* Top Bar Admin Logout Button */}
              <div className="h-5 w-px bg-slate-800 mx-0.5" />

              <button
                onClick={handleAdminLogout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-rose-100 font-bold text-xs border border-rose-500/40 hover:border-rose-400/80 shadow-xs transition-all active:scale-95"
                title={`Logged in as ${user?.username || 'Admin'} - Click to Logout`}
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Logout ({user?.username || 'Admin'})</span>
              </button>
            </div>
          </div>

          {/* Children View Content */}
          <div className="p-3.5 sm:p-6 lg:p-8 flex-1 pb-8">
            {children}
          </div>

        </main>

      </div>

      {/* Reseller Balance Top-up Modal */}
      {currentReseller && (
        <ResellerBalanceRequestModal
          isOpen={isResellerTopUpOpen}
          onClose={() => setIsResellerTopUpOpen(false)}
          reseller={currentReseller}
        />
      )}

    </div>
  );
};

