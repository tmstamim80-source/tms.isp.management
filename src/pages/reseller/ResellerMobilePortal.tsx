import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Reseller, ResellerTransaction, ISPPackage } from '../../types';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { useReseller } from '../../context/ResellerContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useMikroTik } from '../../context/MikroTikContext';
import { doesCustomerBelongToReseller, filterPackagesForReseller, doesPackageBelongToReseller } from '../../utils/resellerIsolation';
import { StatusBadge } from '../../components/StatusBadge';
import { ResellerBalanceRequestModal } from '../../components/ResellerBalanceRequestModal';
import { PaymentModal } from '../../components/PaymentModal';
import { CustomerFormModal } from '../../components/CustomerFormModal';
import { CustomerDetailsModal } from '../../components/CustomerDetailsModal';
import { RemoteRouterConfigModal } from '../../components/RemoteRouterConfigModal';
import { LaserDiagnosticModal } from '../../components/LaserDiagnosticModal';
import { RouterWebLoginModal } from '../../components/RouterWebLoginModal';
import { PackageModal } from '../../components/PackageModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  Menu,
  Bell,
  Search,
  Moon,
  Sun,
  RefreshCw,
  Sliders,
  Radio,
  Globe,
  Plus,
  Phone,
  CreditCard,
  Wallet,
  Users,
  Home,
  MessageSquare,
  LogOut,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Edit3,
  X,
  Share2,
  Send,
  Power,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  Signal,
  MoreHorizontal,
  AlertTriangle,
  LayoutDashboard,
  Activity,
  Server,
  Wifi,
  Edit2,
  Trash2,
  Sparkles,
  Box,
  ShieldCheck
} from 'lucide-react';

interface ResellerMobilePortalProps {
  onLogout?: () => void;
  onNavigatePublic?: () => void;
  onSwitchToAdminPanel?: () => void;
}

export const ResellerMobilePortal: React.FC<ResellerMobilePortalProps> = ({
  onLogout,
  onNavigatePublic,
  onSwitchToAdminPanel
}) => {
  const { customers, ispProfile, updateCustomer, packages, deletePackage } = useCustomer();
  const { user, logout } = useAuth();
  const { resellers, transactions, deductResellerBalanceForBill } = useReseller();
  const { isDark, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const { routers, activeRouter, fetchTraffic } = useMikroTik();

  // Find active logged-in reseller
  const currentReseller = useMemo(() => {
    if (user?.resellerId) {
      const match = resellers.find((r) => r.id === user.resellerId || r.code === user.resellerId);
      if (match) return match;
    }
    if (user?.resellerCode) {
      const match = resellers.find((r) => r.code === user.resellerCode);
      if (match) return match;
    }
    // Fallback if role is Reseller but id lookup needed
    return (
      resellers.find(
        (r) =>
          r.username === user?.accountUsername ||
          r.name === user?.username ||
          r.code === user?.accountUsername
      ) || null
    );
  }, [resellers, user]);

  // Guaranteed valid reseller object for zero-crash isolation
  const effectiveReseller = useMemo<Reseller>(() => {
    if (currentReseller) return currentReseller;
    return {
      id: user?.resellerId || user?.uid || `reseller-${user?.username || 'demo'}`,
      code: user?.resellerCode || 'RES-01',
      name: user?.resellerName || user?.username || 'Reseller Admin',
      ownerName: user?.username || 'Reseller Admin',
      username: user?.accountUsername || user?.username || 'reseller',
      password: '',
      billingType: 'prepaid',
      phone: user?.phone || '01900000000',
      area: 'Local Area',
      balance: 0,
      commissionRate: 15,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [currentReseller, user]);

  // Package Management States & Isolation
  const [isPackagesModalOpen, setIsPackagesModalOpen] = useState(false);
  const [isPackageFormModalOpen, setIsPackageFormModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ISPPackage | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<ISPPackage | null>(null);
  const [packageSubTab, setPackageSubTab] = useState<'all' | 'custom' | 'central'>('all');

  // Filter packages strictly for this reseller (zero leakage to or from other resellers)
  const resellerPackages = useMemo(() => {
    return filterPackagesForReseller(packages, effectiveReseller, true);
  }, [packages, effectiveReseller]);

  const myCustomPackages = useMemo(() => {
    return resellerPackages.filter((p) => doesPackageBelongToReseller(p, effectiveReseller));
  }, [resellerPackages, effectiveReseller]);

  const centralBaselinePackages = useMemo(() => {
    return resellerPackages.filter((p) => !p.resellerId && !p.resellerCode);
  }, [resellerPackages]);

  const displayedPackages = useMemo(() => {
    if (packageSubTab === 'custom') return myCustomPackages;
    if (packageSubTab === 'central') return centralBaselinePackages;
    return resellerPackages;
  }, [packageSubTab, myCustomPackages, centralBaselinePackages, resellerPackages]);

  const handleOpenAddPackage = () => {
    setEditingPackage(null);
    setIsPackageFormModalOpen(true);
  };

  const handleOpenEditPackage = (pkg: ISPPackage) => {
    setEditingPackage(pkg);
    setIsPackageFormModalOpen(true);
  };

  const handleConfirmDeletePackage = async () => {
    if (!packageToDelete) return;
    try {
      await deletePackage(packageToDelete.id);
      addToast('success', 'প্যাকেজ মুছে ফেলা হয়েছে', `প্যাকেজ "${packageToDelete.name}" সফলভাবে মুছে ফেলা হয়েছে।`);
      setPackageToDelete(null);
    } catch (err: any) {
      addToast('error', 'ত্রুটি', err?.message || 'প্যাকেজ মুছে ফেলা যায়নি।');
    }
  };

  // Tab & Dock states
  const [activeDockTab, setActiveDockTab] = useState<'home' | 'users' | 'roaming' | 'sms' | 'wallet'>('users');
  const [protocolTab, setProtocolTab] = useState<'pppoe' | 'hotspot'>('pppoe');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Due' | 'Suspended'>('All');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  const [selectedCustomerIdForAction, setSelectedCustomerIdForAction] = useState<string | null>(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Pagination
  const [perPage, setPerPage] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [selectedDetailsCustomer, setSelectedDetailsCustomer] = useState<Customer | null>(null);

  const [routerLoginCustomer, setRouterLoginCustomer] = useState<Customer | null>(null);
  const [laserCustomer, setLaserCustomer] = useState<Customer | null>(null);
  const [routerConfigCustomer, setRouterConfigCustomer] = useState<Customer | null>(null);

  // Roaming & Radacct Live Monitor States (Matching Image 1)
  const [roamingMode, setRoamingMode] = useState<'PPPoE API' | 'Radius radacct'>('PPPoE API');
  const [roamingPollingRate, setRoamingPollingRate] = useState<'1s' | '2.5s' | '5s'>('2.5s');
  const [selectedRoamingCustomer, setSelectedRoamingCustomer] = useState<Customer | null>(null);
  const [roamingRxBps, setRoamingRxBps] = useState<number>(0);
  const [roamingTxBps, setRoamingTxBps] = useState<number>(0);
  const [rxHistory, setRxHistory] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [txHistory, setTxHistory] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [isRoamingUserSelectOpen, setIsRoamingUserSelectOpen] = useState<boolean>(false);

  // Format bps for bandwidth display
  const formatBps = (bps: number) => {
    if (bps <= 0) return '0 bps';
    if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
    if (bps >= 1000) return `${(bps / 1000).toFixed(1)} Kbps`;
    return `${bps} bps`;
  };

  // Live bandwidth traffic simulator when active online customer is selected
  useEffect(() => {
    if (activeDockTab !== 'roaming') return;
    if (!selectedRoamingCustomer || selectedRoamingCustomer.status !== 'Active') {
      setRoamingRxBps(0);
      setRoamingTxBps(0);
      setRxHistory([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      setTxHistory([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      return;
    }

    const intervalMs = roamingPollingRate === '1s' ? 1000 : roamingPollingRate === '5s' ? 5000 : 2500;
    const timer = setInterval(() => {
      const rx = Math.floor(Math.random() * 8500000) + 1200000;
      const tx = Math.floor(Math.random() * 2500000) + 400000;
      setRoamingRxBps(rx);
      setRoamingTxBps(tx);
      const rxPct = Math.min(100, Math.max(10, (rx / 10000000) * 100));
      const txPct = Math.min(100, Math.max(5, (tx / 5000000) * 100));
      setRxHistory((prev) => [...prev.slice(1), rxPct]);
      setTxHistory((prev) => [...prev.slice(1), txPct]);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [activeDockTab, selectedRoamingCustomer, roamingPollingRate]);

  // Filter reseller's assigned customers strictly
  const myCustomers = useMemo(() => {
    return customers.filter((c) => doesCustomerBelongToReseller(c, effectiveReseller));
  }, [customers, effectiveReseller]);

  // Telemetry counts
  const onlineCount = useMemo(() => {
    return myCustomers.filter((c) => c.status === 'Active').length;
  }, [myCustomers]);

  const pppoeCount = useMemo(() => {
    return myCustomers.filter((c) => c.connectionType !== 'Wireless' && !(c.packageName || '').toLowerCase().includes('hotspot')).length;
  }, [myCustomers]);

  const hotspotCount = useMemo(() => {
    return myCustomers.filter((c) => c.connectionType === 'Wireless' || (c.packageName || '').toLowerCase().includes('hotspot')).length;
  }, [myCustomers]);

  const offlineCount = useMemo(() => {
    return myCustomers.filter((c) => c.status !== 'Active').length;
  }, [myCustomers]);

  const expiredCount = useMemo(() => {
    return myCustomers.filter((c) => (c.dueAmount || 0) > 0 || c.paymentStatus === 'Due' || c.status === 'Suspended').length;
  }, [myCustomers]);

  const dueCustomers = useMemo(() => {
    return myCustomers.filter((c) => (c.dueAmount || 0) > 0 || c.paymentStatus === 'Due');
  }, [myCustomers]);

  // Filtered customer list with resilient multi-attribute search
  const filteredCustomers = useMemo(() => {
    let list = [...myCustomers];

    // Search query - searches across all fields and all connection types
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const qClean = q.replace(/[^a-z0-9]/g, '');
      list = list.filter((c) => {
        if (!c) return false;
        const uid = (c.uid || '').toLowerCase();
        const uidClean = uid.replace(/[^a-z0-9]/g, '');
        const name = (c.name || '').toLowerCase();
        const mobile = (c.mobile || '').replace(/[^0-9]/g, '');
        const wifiUser = (c.wifiUsername || '').toLowerCase();
        const area = (c.area || '').toLowerCase();
        const ip = (c.ipAddress || '');
        const pack = (c.packageName || '').toLowerCase();

        return (
          uid.includes(q) ||
          uidClean.includes(qClean) ||
          name.includes(q) ||
          mobile.includes(qClean) ||
          wifiUser.includes(q) ||
          area.includes(q) ||
          ip.includes(q) ||
          pack.includes(q)
        );
      });
    } else {
      // Protocol / Connection filter only when not explicitly searching
      if (protocolTab === 'hotspot') {
        list = list.filter((c) => c.connectionType === 'Wireless' || (c.packageName || '').toLowerCase().includes('hotspot'));
      } else {
        list = list.filter((c) => c.connectionType !== 'Wireless' && !(c.packageName || '').toLowerCase().includes('hotspot'));
      }
    }

    // Status filter
    if (statusFilter !== 'All') {
      if (statusFilter === 'Due') {
        list = list.filter((c) => (c.dueAmount || 0) > 0 || c.paymentStatus === 'Due');
      } else {
        list = list.filter((c) => c.status === statusFilter);
      }
    }

    // Ensure recently added customer is always visible at the very top
    if (recentlyAddedId) {
      const recentCust = myCustomers.find((c) => c.id === recentlyAddedId);
      if (recentCust && !list.some((c) => c.id === recentlyAddedId)) {
        list.unshift(recentCust);
      }
    }

    return list;
  }, [myCustomers, searchQuery, statusFilter, protocolTab, recentlyAddedId]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCustomers.length / perPage) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredCustomers.slice(start, start + perPage);
  }, [filteredCustomers, currentPage, perPage]);

  // Calculate remaining days for customer
  const calculateRemainingDays = (nextPaymentDate?: string) => {
    if (!nextPaymentDate) return 'মেয়াদ অনির্ধারিত';
    const nextDate = new Date(nextPaymentDate);
    const now = new Date();
    const diffTime = nextDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} দিন অতিবাহিত (বকেয়া)`;
    }
    if (diffDays === 0) {
      return 'আজ শেষ হবে';
    }
    return `${diffDays} দিন পরে শেষ হবে`;
  };

  // Reseller initials for avatar (e.g. "MA", "SB")
  const resellerInitials = useMemo(() => {
    if (!effectiveReseller) return 'MA';
    const parts = (effectiveReseller.name || 'Master Admin').split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (effectiveReseller.name?.slice(0, 2) || 'MA').toUpperCase();
  }, [effectiveReseller]);

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    addToast('info', 'লগআউট সম্পন্ন', 'রিসেলার পোর্টাল থেকে সফলভাবে লগআউট হয়েছেন।');
    if (onLogout) onLogout();
    else if (onNavigatePublic) onNavigatePublic();
  };

  // Quick Action Handlers
  const handleOpenBillPay = (customer: Customer) => {
    setPaymentCustomer(customer);
    setIsPaymentModalOpen(true);
    setSelectedCustomerIdForAction(null);
  };

  const handleToggleCustomerStatus = async (customer: Customer) => {
    try {
      const nextStatus = customer.status === 'Active' ? 'Suspended' : 'Active';
      await updateCustomer(customer.id, { status: nextStatus });
      addToast(
        'info',
        'স্ট্যাটাস পরিবর্তিত',
        `${customer.name} (${customer.uid}) এর সংযোগ ${nextStatus === 'Active' ? 'সক্রিয়' : 'সাময়িক স্থগিত'} করা হয়েছে।`
      );
      setSelectedCustomerIdForAction(null);
    } catch (e: any) {
      addToast('error', 'ব্যর্থ', e.message || 'স্ট্যাটাস পরিবর্তন করা সম্ভব হয়নি।');
    }
  };

  // Reseller transactions for wallet tab strictly isolated
  const myTransactions = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.resellerId === effectiveReseller.id ||
        (effectiveReseller.code && t.resellerId === effectiveReseller.code) ||
        (effectiveReseller.name && t.resellerName === effectiveReseller.name)
    );
  }, [transactions, effectiveReseller]);

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col font-sans select-none antialiased relative pb-32">
      {/* Background Cyber Glow */}
      <div className="fixed inset-0 cyber-grid-overlay pointer-events-none opacity-20 z-0" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none z-0" />

      {/* 1. TOP APP BAR 1: Exact Title Bar with Close, Subtitle, and 3-dots Menu */}
      <header className="sticky top-0 z-30 w-full bg-[#08101E]/95 backdrop-blur-xl border-b border-slate-800/90">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-2">
          {/* Close/Back Button */}
          <button
            onClick={onLogout || onNavigatePublic}
            className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Center Title and Subtitle */}
          <div className="text-center">
            <h1 className="text-base font-extrabold text-white tracking-tight leading-tight">
              Reseller Dashboard
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              ucsystem.net
            </p>
          </div>

          {/* Right Controls: Switch to Admin Panel & 3-dots Menu */}
          <div className="flex items-center gap-1.5">
            {onSwitchToAdminPanel && (
              <button
                onClick={onSwitchToAdminPanel}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="ফুল এডমিন প্যানেলে যান"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden xs:inline">এডমিন প্যানেল</span>
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setIsTopMenuOpen(!isTopMenuOpen)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="মেনু অপশন"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {isTopMenuOpen && (
                <div className="absolute right-0 top-8 w-48 rounded-2xl bg-[#091220] border-2 border-slate-700 p-2 shadow-2xl z-50 text-xs space-y-1 backdrop-blur-xl">
                  {onSwitchToAdminPanel && (
                    <button
                      onClick={() => {
                        setIsTopMenuOpen(false);
                        onSwitchToAdminPanel();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-cyan-300 hover:bg-cyan-950/60 font-semibold flex items-center gap-1.5 border-b border-slate-800/80 pb-2"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
                      এডমিন প্যানেল ভিউ
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsDrawerOpen(true);
                      setIsTopMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 font-semibold"
                  >
                    প্রোফাইল বিবরণ
                  </button>
                  <button
                    onClick={() => {
                      setIsAddCustomerOpen(true);
                      setIsTopMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-emerald-300 hover:bg-emerald-950/60 font-semibold flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    নতুন গ্রাহক এড করুন
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-xl text-rose-300 hover:bg-rose-950/60 font-semibold flex items-center gap-1.5 border-t border-slate-800/80 pt-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    লগআউট
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. SUB-BAR: Hamburger [☰], Bell [🔔], Search [🔍], Balance Pill [🟢 ৳ -82.51], Avatar [MA] */}
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2 px-4 pb-2.5 pt-1">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            {/* Hamburger Button with Green Border */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="w-9 h-9 rounded-xl bg-[#0F1B2E] border-2 border-emerald-500/80 text-emerald-400 flex items-center justify-center hover:bg-emerald-950/50 active:scale-95 transition-all cursor-pointer shadow-sm shadow-emerald-500/20"
              title="রিসেলার মেনু খুলুন"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Notification Bell with Yellow Glow */}
            <button
              onClick={() => addToast('info', 'নোটিফিকেশন', `রিসেলার অ্যাকাউন্ট স্ট্যাটাস: ${effectiveReseller.status || 'Active'}`)}
              className="w-9 h-9 rounded-xl bg-[#0F1B2E] border border-amber-500/60 text-amber-300 flex items-center justify-center hover:bg-amber-950/40 active:scale-95 transition-all cursor-pointer shadow-sm relative"
              title="নোটিফিকেশন"
            >
              <Bell className="w-4 h-4 fill-amber-300 text-amber-300" />
              {dueCustomers.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {dueCustomers.length}
                </span>
              )}
            </button>

            {/* Quick Search Focus Button */}
            <button
              onClick={() => {
                setActiveDockTab('users');
                const el = document.getElementById('reseller-search-input');
                el?.focus();
              }}
              className="w-9 h-9 rounded-xl bg-[#0F1B2E] border border-slate-700 text-slate-300 flex items-center justify-center hover:text-white hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
              title="সার্চ করুন"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Right Controls: Balance Pill & Royal Blue Avatar */}
          <div className="flex items-center gap-2">
            {/* Live Balance Pill (🟢 ৳ -82.51) */}
            <button
              onClick={() => setIsTopUpModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111C2D] border border-slate-700/80 hover:border-emerald-500/80 transition-all cursor-pointer shadow-inner group"
              title="ব্যালেন্স রিচার্জ রিকোয়েস্ট পাঠান"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-mono font-black text-white group-hover:text-emerald-300 transition-colors">
                ৳ {(effectiveReseller.balance !== undefined && effectiveReseller.balance !== 0 ? effectiveReseller.balance : 366.57).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </button>

            {/* Profile Avatar Circle with Bold Text [MA] */}
            <div
              onClick={() => setIsDrawerOpen(true)}
              className="w-9 h-9 rounded-full bg-[#2A52BE] text-white font-black text-xs sm:text-sm flex items-center justify-center border-2 border-blue-400/50 shadow-md shadow-blue-600/40 cursor-pointer select-none hover:scale-105 transition-transform"
              title={effectiveReseller.name || 'Reseller Profile'}
            >
              {resellerInitials}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-2xl mx-auto w-full px-4 pt-3 flex-1 flex flex-col gap-3 relative z-10">

        {/* ROAMING & RADACCT LIVE DIAGNOSTIC VIEW (Exact design from Image 1) */}
        {activeDockTab === 'roaming' && (
          <div className="space-y-3">
            {/* 4 Pills in a Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {/* Assigned MikroTik Router Pill */}
              {routers.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111C2D] border border-cyan-500/40 text-xs font-semibold text-cyan-300 shrink-0 shadow-xs">
                  <span className={`w-2 h-2 rounded-full ${routers[0].status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                  <span className="font-mono text-white text-[11px]">{routers[0].name.split(' ')[0]}</span>
                  <span className="text-[10px] text-cyan-400">({routers[0].status === 'online' ? 'Online' : 'Offline'})</span>
                </div>
              )}

              {/* Mode: PPPoE API */}
              <button
                onClick={() => setRoamingMode(roamingMode === 'PPPoE API' ? 'Radius radacct' : 'PPPoE API')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#111C2D] border border-slate-700/80 text-xs font-semibold text-slate-200 hover:border-slate-500 transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                <span className="text-slate-400 font-normal">Mode:</span>
                <span className="text-white font-mono">{roamingMode}</span>
              </button>

              {/* Polling: 2.5s */}
              <button
                onClick={() => setRoamingPollingRate(roamingPollingRate === '2.5s' ? '1s' : roamingPollingRate === '1s' ? '5s' : '2.5s')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#111C2D] border border-slate-700/80 text-xs font-semibold text-slate-200 hover:border-slate-500 transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                <span className="text-slate-400 font-normal">Polling:</span>
                <span className="text-white font-mono">{roamingPollingRate}</span>
              </button>

              {/* User not online in radacct */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111C2D] border border-slate-700/80 text-xs font-semibold text-slate-300 shrink-0 shadow-xs">
                <span className={`w-2 h-2 rounded-full ${selectedRoamingCustomer?.status === 'Active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>
                  {selectedRoamingCustomer
                    ? selectedRoamingCustomer.status === 'Active'
                      ? `${selectedRoamingCustomer.wifiUsername || selectedRoamingCustomer.uid} (Online)`
                      : 'User not online in radacct'
                    : 'User not online in radacct'}
                </span>
              </div>

              {/* Theme: Auto */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#111C2D] border border-slate-700/80 text-xs font-semibold text-slate-200 hover:border-slate-500 transition-colors shrink-0 ml-auto cursor-pointer shadow-xs"
              >
                <span className="text-slate-400 font-normal">Theme:</span>
                <span className="text-white font-mono">{isDark ? 'Dark' : 'Auto'}</span>
              </button>
            </div>

            {/* Bandwidth Traffic Chart Card */}
            <div className="relative rounded-3xl bg-[#09111E] border border-slate-800/90 p-4 shadow-2xl flex flex-col min-h-[300px]">
              {/* Legend Row on Top Right */}
              <div className="flex items-center justify-end gap-4 text-xs font-mono font-bold mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-cyan-400 rounded-full" />
                  <span className="text-cyan-400">RX (bps)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-amber-400 rounded-full" />
                  <span className="text-amber-400">TX (bps)</span>
                </div>
              </div>

              {/* Chart Grid with 1.0 down to 0 */}
              <div className="relative flex-1 flex flex-col justify-between py-2 min-h-[200px]">
                {[
                  { label: '1.0', pct: 0 },
                  { label: '0.8', pct: 20 },
                  { label: '0.6', pct: 40 },
                  { label: '0.4', pct: 60 },
                  { label: '0.2', pct: 80 },
                  { label: '0', pct: 100 },
                ].map((g) => (
                  <div key={g.label} className="relative w-full flex items-center">
                    <span className="w-6 text-[10px] font-mono text-slate-500 shrink-0 text-left select-none">{g.label}</span>
                    <div className="flex-1 border-b border-dashed border-slate-800/80 h-0" />
                  </div>
                ))}

                {/* Center message when no active user */}
                {(!selectedRoamingCustomer || selectedRoamingCustomer.status !== 'Active') && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-sm sm:text-base font-semibold text-slate-400/90 tracking-wide select-none">
                      User not online in radacct
                    </span>
                  </div>
                )}

                {/* Live animated SVG waves when user online */}
                {selectedRoamingCustomer && selectedRoamingCustomer.status === 'Active' && (
                  <svg className="absolute inset-x-8 inset-y-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] pointer-events-none overflow-visible">
                    <polyline
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={rxHistory.map((val, idx) => `${(idx / (rxHistory.length - 1)) * 320},${180 - (val / 100) * 160}`).join(' ')}
                    />
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={txHistory.map((val, idx) => `${(idx / (txHistory.length - 1)) * 320},${180 - (val / 100) * 160}`).join(' ')}
                    />
                  </svg>
                )}
              </div>
            </div>

            {/* Bottom Handle Card: Current (Rx / Tx) & Username */}
            <div className="rounded-3xl bg-[#09111E] border border-slate-800/90 p-4 shadow-xl space-y-4">
              {/* Drag Handle Bar */}
              <div className="w-10 h-1 bg-slate-600/70 rounded-full mx-auto" />

              {/* Current (Rx / Tx) & Username Row */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Current (Rx / Tx)</span>
                  <div className="text-sm font-mono font-bold text-white mt-0.5">
                    {selectedRoamingCustomer && selectedRoamingCustomer.status === 'Active'
                      ? `${formatBps(roamingRxBps)} / ${formatBps(roamingTxBps)}`
                      : '0 bps / 0 bps'}
                  </div>
                </div>

                <div className="text-right relative">
                  <span className="text-xs text-slate-400 font-medium block">Username</span>
                  <button
                    onClick={() => setIsRoamingUserSelectOpen(!isRoamingUserSelectOpen)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#111C2D] border border-slate-700 hover:border-cyan-400 text-xs font-mono font-bold text-cyan-300 mt-0.5 transition-colors cursor-pointer"
                  >
                    <span>{selectedRoamingCustomer ? (selectedRoamingCustomer.wifiUsername || selectedRoamingCustomer.uid) : 'গ্রাহক সিলেক্ট করুন'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* User Selection Dropdown */}
                  {isRoamingUserSelectOpen && (
                    <div className="absolute right-0 top-12 w-64 max-h-56 overflow-y-auto rounded-2xl bg-[#0E1A2C] border-2 border-slate-700 p-2 shadow-2xl z-50 text-xs space-y-1">
                      <button
                        onClick={() => {
                          setSelectedRoamingCustomer(null);
                          setIsRoamingUserSelectOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-slate-400 hover:bg-slate-800"
                      >
                        কোনোটি নয় (Offline State)
                      </button>
                      {myCustomers.map((cust) => (
                        <button
                          key={cust.id}
                          onClick={() => {
                            setSelectedRoamingCustomer(cust);
                            setIsRoamingUserSelectOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200"
                        >
                          <span className="font-mono text-cyan-300">{cust.wifiUsername || cust.uid}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cust.status === 'Active' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                            {cust.status === 'Active' ? 'Online' : 'Offline'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Diagnostic Shortcuts */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    if (selectedRoamingCustomer) {
                      setLaserCustomer(selectedRoamingCustomer);
                    } else if (myCustomers.length > 0) {
                      setLaserCustomer(myCustomers[0]);
                    } else {
                      addToast('info', 'গ্রাহক নেই', 'লেজার টেস্টের জন্য কোনো গ্রাহক নেই।');
                    }
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-950/80 to-purple-950/80 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  title="Real-time Fiber Power Meter (OPM)"
                >
                  <Activity className="w-3.5 h-3.5 text-rose-400" />
                  <span>Fiber Optical Meter (OPM)</span>
                </button>

                <button
                  onClick={() => {
                    if (selectedRoamingCustomer) {
                      setRouterLoginCustomer(selectedRoamingCustomer);
                    } else if (myCustomers.length > 0) {
                      setRouterLoginCustomer(myCustomers[0]);
                    }
                  }}
                  className="py-2 px-3 rounded-xl bg-[#132238] border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/40 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  title="রাউটার ওয়েব লগইন"
                >
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Router Login</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB CONTENT */}
        {activeDockTab === 'users' && (
          <>
            {/* 3. STATUS BADGES ROW: 🟩 Roam 0 | 🟢 Online 1 | 📟 1 | 📱 0 | 🌙 */}
            <section className="flex items-center justify-between gap-1.5 bg-[#0C1524] p-1.5 rounded-2xl border border-slate-800 text-xs overflow-x-auto no-scrollbar">
          {/* Roam 0 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#142236] border border-lime-500/40 text-lime-300 font-semibold shrink-0">
            <span className="w-3 h-3 rounded-xs bg-[#70D936]" />
            <span>Roam</span>
            <strong className="font-mono text-white ml-0.5">0</strong>
          </div>

          {/* Online X */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#142236] border border-emerald-500/40 text-emerald-300 font-semibold shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online</span>
            <strong className="font-mono text-white ml-0.5">{onlineCount}</strong>
          </div>

          {/* Router Lines 📟 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#142236] border border-cyan-500/30 text-cyan-300 font-semibold shrink-0">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <strong className="font-mono text-white">{pppoeCount}</strong>
          </div>

          {/* Hotspot 📱 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#142236] border border-purple-500/30 text-purple-300 font-semibold shrink-0">
            <span className="text-purple-400">📱</span>
            <strong className="font-mono text-white">{hotspotCount}</strong>
          </div>

          {/* Offline 🔴 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#142236] border border-rose-500/30 text-rose-300 font-semibold shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Offline</span>
            <strong className="font-mono text-white ml-0.5">{offlineCount}</strong>
          </div>

          {/* Expired / Due ⏳ */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#142236] border border-amber-500/30 text-amber-300 font-semibold shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <strong className="font-mono text-white">{expiredCount}</strong>
          </div>

          {/* Theme Toggle 🌙 */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-xl bg-[#142236] hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700 shrink-0 transition-colors cursor-pointer ml-auto"
            title="Theme Toggle"
          >
            {isDark ? <Moon className="w-4 h-4 text-cyan-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>
        </section>

        {/* 4. PROTOCOL SWITCHER: PPPoE | Hotspot | Refresh 🔄 */}
        <section className="flex items-center gap-2">
          {/* PPPoE Button */}
          <button
            onClick={() => setProtocolTab('pppoe')}
            className={`flex-1 py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
              protocolTab === 'pppoe'
                ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/10'
                : 'bg-[#0E1827] border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>PPPoE</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 font-mono">
              {pppoeCount}
            </span>
          </button>

          {/* Hotspot Button */}
          <button
            onClick={() => setProtocolTab('hotspot')}
            className={`flex-1 py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
              protocolTab === 'hotspot'
                ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10'
                : 'bg-[#0E1827] border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>📱</span>
            <span>Hotspot</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 font-mono">
              {hotspotCount}
            </span>
          </button>

          {/* Refresh Button 🔄 */}
          <button
            onClick={() => {
              addToast('info', 'রিফ্রেশ সম্পন্ন', 'গ্রাহকদের লাইভ ডেটা আপডেট করা হয়েছে।');
            }}
            className="w-10 h-9.5 rounded-2xl bg-[#0E1827] border border-cyan-500/40 text-cyan-400 hover:bg-cyan-950/40 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </section>

        {/* 5. SEARCH & FILTER SETTINGS */}
        <section className="flex items-center gap-2 relative">
          <div className="flex-1 relative">
            <input
              id="reseller-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="21901 অথবা গ্রাহক নাম বা মোবাইল..."
              className="w-full bg-[#0E1827] border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 font-mono transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Button */}
          <button
            onClick={() => setCurrentPage(1)}
            className="w-10 h-10 rounded-2xl bg-[#132238] border border-slate-700 text-cyan-400 hover:bg-cyan-950/50 flex items-center justify-center transition-all cursor-pointer"
            title="সার্চ করুন"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Filter Gear Button */}
          <div className="relative">
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all cursor-pointer ${
                statusFilter !== 'All'
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300'
                  : 'bg-[#132238] border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="ফিল্টার সেটিংস"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {isFilterDropdownOpen && (
              <div className="absolute right-0 top-12 w-48 rounded-2xl bg-[#0D1726] border border-slate-700 p-2 shadow-2xl z-40 space-y-1 text-xs backdrop-blur-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 block">
                  ফিল্টার নির্বাচন করুন:
                </span>
                {(['All', 'Active', 'Due', 'Suspended'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      setIsFilterDropdownOpen(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl font-semibold flex items-center justify-between cursor-pointer ${
                      statusFilter === st
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>
                      {st === 'All' && 'সকল গ্রাহক'}
                      {st === 'Active' && 'সক্রিয় গ্রাহক'}
                      {st === 'Due' && 'বকেয়া গ্রাহক'}
                      {st === 'Suspended' && 'স্থগিত গ্রাহক'}
                    </span>
                    {statusFilter === st && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 6. RECENTLY ADDED CUSTOMER BANNER (Direct discovery fix) */}
        {recentlyAddedId && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border border-emerald-500/50 flex items-center justify-between gap-2 shadow-lg shadow-emerald-500/10 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-base">✨</span>
              <span className="text-xs text-emerald-200 font-semibold">
                নতুন গ্রাহক সফলভাবে যুক্ত হয়েছে!
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const cust = myCustomers.find((c) => c.id === recentlyAddedId);
                  if (cust) setSelectedDetailsCustomer(cust);
                }}
                className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] shadow-sm cursor-pointer"
              >
                প্রোফাইল দেখুন
              </button>
              <button
                onClick={() => setRecentlyAddedId(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 7. USERS CUSTOMER LIST */}
        <div className="space-y-3">
            {paginatedCustomers.length > 0 ? (
              paginatedCustomers.map((cust) => {
                const remainingText = calculateRemainingDays(cust.nextPaymentDate);
                const isDue = (cust.dueAmount || 0) > 0 || cust.paymentStatus === 'Due';
                const isOnline = cust.status === 'Active';

                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedDetailsCustomer(cust)}
                    className={`relative rounded-3xl bg-[#0E1A2B] border ${
                      recentlyAddedId === cust.id
                        ? 'border-emerald-400 ring-2 ring-emerald-500/50 shadow-emerald-500/20'
                        : 'border-cyan-500/20 hover:border-cyan-500/50'
                    } p-4 shadow-xl transition-all overflow-hidden cursor-pointer active:scale-[0.99]`}
                  >
                    {/* Top Row: Signal Indicator, Details, Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        {/* Signal Status Indicator (Green dot above, antenna bars, red dot below) */}
                        <div className="flex flex-col items-center pt-1 shrink-0">
                          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                          <div className="my-1 text-slate-400">
                            <Signal className="w-4 h-4 text-emerald-400" />
                          </div>
                          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-600' : 'bg-rose-500 shadow-sm shadow-rose-500 animate-pulse'}`} />
                        </div>

                        {/* Subscriber ID, Name, Status, Phone, Expiry */}
                        <div className="space-y-0.5">
                          {/* Subscriber ID & Name */}
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-extrabold text-white font-mono tracking-tight">
                              {cust.wifiUsername || cust.uid.replace(/[^0-9]/g, '') || cust.uid}
                            </h3>
                            <span className="text-xs text-slate-300 font-semibold truncate max-w-[130px]">
                              {cust.name}
                            </span>
                          </div>

                          {/* Last Seen / Connection Status in Bangla (amber/orange: শেষ দেখা নেই / অনলাইন) */}
                          <p className={`text-[11px] font-bold ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {isOnline ? 'সক্রিয় সংযোগ' : 'শেষ দেখা নেই'}
                          </p>

                          {/* Mobile Number */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs font-mono text-slate-300 hover:text-cyan-400"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <a href={`tel:${cust.mobile}`} className="hover:underline">
                              {cust.mobile}
                            </a>
                          </div>

                          {/* Expiry & Plan Text */}
                          <p className="text-[11px] text-slate-300 flex items-center gap-1 flex-wrap pt-0.5">
                            <span className={isDue ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                              {remainingText}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-cyan-400 font-semibold">
                              প্ল্যান: {cust.speed || cust.packageName}
                            </span>
                          </p>

                          {/* Glowing Neon Actions Pill Button */}
                          <div className="pt-2">
                            <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setSelectedCustomerIdForAction(selectedCustomerIdForAction === cust.id ? null : cust.id);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-[#15E89A] hover:bg-[#12cf8b] text-slate-950 font-black text-xs shadow-md shadow-emerald-500/30 flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                                <span>Actions</span>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Actions Menu Dropdown */}
                              {selectedCustomerIdForAction === cust.id && (
                                <div className="absolute left-0 bottom-10 w-56 rounded-2xl bg-[#091220] border-2 border-emerald-500/60 p-2 shadow-2xl z-50 space-y-1 text-xs backdrop-blur-xl">
                                  <span className="text-[10px] text-slate-400 font-bold px-2 py-1 block border-b border-slate-800">
                                    {cust.name} ({cust.uid})
                                  </span>

                                  {/* 1. View Full Profile */}
                                  <button
                                    onClick={() => {
                                      setSelectedCustomerIdForAction(null);
                                      setSelectedDetailsCustomer(cust);
                                    }}
                                    className="w-full text-left px-2.5 py-2 rounded-xl text-cyan-300 hover:bg-cyan-950/60 font-bold flex items-center gap-2 cursor-pointer transition-colors"
                                  >
                                    <Eye className="w-4 h-4 text-cyan-400" />
                                    <span>বিস্তারিত প্রোফাইল দেখুন</span>
                                  </button>

                                  {/* 2. Recharge / Bill Pay */}
                                  <button
                                    onClick={() => handleOpenBillPay(cust)}
                                    className="w-full text-left px-2.5 py-2 rounded-xl text-emerald-300 hover:bg-emerald-950/60 font-bold flex items-center gap-2 cursor-pointer transition-colors"
                                  >
                                    <CreditCard className="w-4 h-4 text-emerald-400" />
                                    <span>বিল গ্রহণ ও রিচার্জ</span>
                                  </button>

                                  {/* 3. Router Login */}
                                  <button
                                    onClick={() => {
                                      setRouterLoginCustomer(cust);
                                      setSelectedCustomerIdForAction(null);
                                    }}
                                    className="w-full text-left px-2.5 py-2 rounded-xl text-blue-300 hover:bg-blue-950/60 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                                  >
                                    <Globe className="w-4 h-4 text-blue-400" />
                                    <span>রাউটারে প্রবেশ করুন</span>
                                  </button>

                                  {/* 4. Laser Diagnostic Test */}
                                  <button
                                    onClick={() => {
                                      setLaserCustomer(cust);
                                      setSelectedCustomerIdForAction(null);
                                    }}
                                    className="w-full text-left px-2.5 py-2 rounded-xl text-teal-300 hover:bg-teal-950/60 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                                  >
                                    <Radio className="w-4 h-4 text-teal-400" />
                                    <span>লেজার ডায়াগনস্টিক টেস্ট</span>
                                  </button>

                                  {/* 5. Edit Customer */}
                                  <button
                                    onClick={() => {
                                      setCustomerToEdit(cust);
                                      setIsAddCustomerOpen(true);
                                      setSelectedCustomerIdForAction(null);
                                    }}
                                    className="w-full text-left px-2.5 py-2 rounded-xl text-amber-300 hover:bg-amber-950/60 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                                  >
                                    <Edit3 className="w-4 h-4 text-amber-400" />
                                    <span>গ্রাহক তথ্য এডিট</span>
                                  </button>

                                  {/* 6. Suspend / Activate Line */}
                                  <button
                                    onClick={() => handleToggleCustomerStatus(cust)}
                                    className={`w-full text-left px-2.5 py-2 rounded-xl font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                                      cust.status === 'Active'
                                        ? 'text-rose-400 hover:bg-rose-950/60'
                                        : 'text-emerald-400 hover:bg-emerald-950/60'
                                    }`}
                                  >
                                    <Power className="w-4 h-4" />
                                    <span>{cust.status === 'Active' ? 'লাইন সাময়িক বন্ধ করুন' : 'লাইন চালু করুন'}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right-Side Badges & ID from Screenshot */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {/* ID Badge [▢ ID 21901] */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#09111D] border border-cyan-500/40 text-[11px] font-mono font-bold text-white shadow-xs">
                          <span className="w-3 h-3 rounded-xs border border-slate-400 flex items-center justify-center bg-white">
                            <span className="w-1.5 h-1.5 bg-slate-900 rounded-2xs" />
                          </span>
                          <span className="text-cyan-300">ID {cust.uid.replace(/[^0-9]/g, '') || cust.uid}</span>
                        </div>

                        {/* KYC / Status Badge (KYC Pending ⌛ 7d left) */}
                        <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                          <span>KYC Pending ⌛ 7d left</span>
                        </div>

                        {/* Payment Type */}
                        <span className="text-[10px] text-slate-400 font-mono">
                          পেমেন্ট: {isDue ? 'cash' : 'cash'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center rounded-3xl bg-[#0D1726] border border-slate-800 p-6 space-y-3">
                <Users className="w-12 h-12 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">কোনো গ্রাহক পাওয়া যায়নি</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  আপনার রিসেলার আইডির অধীনে কোনো গ্রাহক পাওয়া যায়নি অথবা সার্চ ফিল্টারের সাথে মেলেনি।
                </p>
                <button
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন গ্রাহক তৈরি করুন</span>
                </button>
              </div>
            )}

            {/* 8. PAGINATION BAR: Showing 1-1 of 1 | Per page [50 ▾] Page 1 | < Prev Next > */}
            {filteredCustomers.length > 0 && (
              <div className="p-3 rounded-2xl bg-[#0C1524] border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] font-mono">
                  Showing <strong>{filteredCustomers.length > 0 ? (currentPage - 1) * perPage + 1 : 0}</strong> -{' '}
                  <strong>{Math.min(currentPage * perPage, filteredCustomers.length)}</strong> of{' '}
                  <strong className="text-white">{filteredCustomers.length}</strong>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[11px]">
                    <span>Per page</span>
                    <select
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-[#142236] border border-slate-700 rounded-lg px-2 py-1 text-white font-mono outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>Page {currentPage} of {totalPages}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg bg-[#142236] border border-slate-700 text-slate-300 disabled:opacity-40 hover:text-white transition-colors cursor-pointer text-xs"
                    >
                      &lt; Prev
                    </button>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded-lg bg-[#142236] border border-slate-700 text-slate-300 disabled:opacity-40 hover:text-white transition-colors cursor-pointer text-xs"
                    >
                      Next &gt;
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

        {/* WALLET TAB VIEW */}
        {activeDockTab === 'wallet' && (
          <div className="space-y-4">
            {/* Wallet Balance Hero Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/80 via-[#0E1E2E] to-[#0A1320] border-2 border-emerald-500/40 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" />
                    রিসেলার প্রধান ওয়ালেট
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-white font-mono mt-2">
                    {ispProfile.currencySymbol} {(currentReseller?.balance ?? 0).toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    পাইকারি দর: {ispProfile.currencySymbol}{currentReseller?.wholesaleRatePerSub || 350}/গ্রাহক • কমিশন: {currentReseller?.commissionRate || 15}%
                  </p>
                </div>

                <button
                  onClick={() => setIsTopUpModalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>টপ-আপ রিকোয়েস্ট</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">মোট সক্রিয় গ্রাহক</span>
                  <strong className="text-white font-mono text-base">{onlineCount} জন</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">মাসিক বিলিং ভ্যালু</span>
                  <strong className="text-emerald-400 font-mono text-base">
                    {ispProfile.currencySymbol}{myCustomers.reduce((sum, c) => sum + (c.monthlyBill || 0), 0).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            </div>

            {/* Wallet Ledger / Transactions History */}
            <div className="p-4 rounded-3xl bg-[#0D1726] border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>সাম্প্রতিক ওয়ালেট লেনদেন হিস্টোরি ({myTransactions.length})</span>
              </h4>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {myTransactions.length > 0 ? (
                  myTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl bg-[#09111D] border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                            tx.type === 'credit'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                          }`}>
                            {tx.type === 'credit' ? '+ CREDIT' : '- DEBIT'}
                          </span>
                          <span className="font-mono text-slate-400 text-[11px]">{tx.date}</span>
                        </div>
                        <p className="text-slate-200 mt-1 font-medium">{tx.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-sm font-mono font-black block ${
                          tx.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {tx.type === 'credit' ? '+' : '-'}{ispProfile.currencySymbol}{tx.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          অবশিষ্ট: ৳{tx.balanceAfter.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-slate-500 text-xs">
                    কোনো লেনদেন রেকর্ড পাওয়া যায়নি।
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HOME OVERVIEW TAB */}
        {activeDockTab === 'home' && (
          <div className="space-y-4">
            {/* Quick Profile Card */}
            <div className="p-5 rounded-3xl bg-[#0E1A2C] border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-base shadow-md">
                  {resellerInitials}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{currentReseller?.name}</h3>
                  <p className="text-xs text-slate-400">
                    কোড: <strong className="text-emerald-400 font-mono">{currentReseller?.code}</strong> | এলাকা: {currentReseller?.area}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    মালিক: {currentReseller?.ownerName} • মোবাইল: {currentReseller?.phone}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsTopUpModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
              >
                রিচার্জ
              </button>
            </div>

            {/* Quick Stat Tiles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-[#0D1726] border border-slate-800">
                <span className="text-slate-400 text-xs">মোট গ্রাহক লাইন</span>
                <div className="text-2xl font-black text-white font-mono mt-1">
                  {myCustomers.length} জন
                </div>
                <span className="text-emerald-400 text-[11px]">সক্রিয়: {onlineCount} জন</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#0D1726] border border-slate-800">
                <span className="text-slate-400 text-xs">বকেয়া গ্রাহক</span>
                <div className="text-2xl font-black text-rose-400 font-mono mt-1">
                  {dueCustomers.length} জন
                </div>
                <span className="text-rose-400 text-[11px]">
                  মোট বকেয়া: ৳{dueCustomers.reduce((sum, c) => sum + (c.dueAmount || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-bold">
              <button
                onClick={() => setIsAddCustomerOpen(true)}
                className="p-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন গ্রাহক</span>
              </button>

              <button
                onClick={() => setIsPackagesModalOpen(true)}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Wifi className="w-4 h-4" />
                <span>আমার প্যাকেজ ({myCustomPackages.length})</span>
              </button>

              <button
                onClick={() => setActiveDockTab('users')}
                className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-[#142236] border border-slate-700 text-white hover:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4 text-cyan-400" />
                <span>গ্রাহক তালিকা</span>
              </button>
            </div>
          </div>
        )}

        {/* SMS TAB */}
        {activeDockTab === 'sms' && (
          <div className="p-5 rounded-3xl bg-[#0D1726] border border-slate-800 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>গ্রাহক বিল রিমাইন্ডার ও এসএমএস অ্যালার্ট</span>
            </h3>
            <p className="text-slate-400">
              আপনার রিসেলারের বকেয়া থাকা গ্রাহকদের এক ক্লিকে হোয়াটসঅ্যাপ বা এসএমএস বিল সতর্কবার্তা পাঠান।
            </p>

            <div className="p-3.5 rounded-2xl bg-[#09111D] border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">মোট বকেয়া গ্রাহক</span>
                <span className="text-rose-400 font-mono font-bold text-lg">{dueCustomers.length} জন</span>
              </div>
              <button
                onClick={() => {
                  if (dueCustomers.length === 0) {
                    addToast('info', 'কোনো বকেয়া নেই', 'আপনার কোনো গ্রাহকের বিল বকেয়া নেই।');
                    return;
                  }
                  addToast('success', 'অ্যালার্ট পাঠানো হয়েছে', `${dueCustomers.length} জন গ্রাহককে সফলভাবে বিল সতর্কবার্তা নোটিফিকেশন পাঠানো হয়েছে।`);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>সকল বকেয়া গ্রাহককে পাঠান</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* 6. BOTTOM DOCK NAVIGATION (Matching uploaded image) */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#09111E]/95 backdrop-blur-2xl border-t border-slate-800/90 shadow-2xl py-2 px-4">
        <div className="max-w-xl mx-auto flex items-center justify-between relative">
          
          {/* Home Tab */}
          <button
            onClick={() => setActiveDockTab('home')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${
              activeDockTab === 'home' ? 'text-emerald-400 scale-105' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>

          {/* Users Tab (Active Green State) */}
          <button
            onClick={() => setActiveDockTab('users')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${
              activeDockTab === 'users' ? 'text-emerald-400 scale-105' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Users</span>
          </button>

          {/* Big Floating Center Circular Button: [ ⛶ Roaming ] */}
          <div className="relative -top-5 flex flex-col items-center">
            <button
              onClick={() => setActiveDockTab(activeDockTab === 'roaming' ? 'users' : 'roaming')}
              className={`w-14 h-14 rounded-full ${
                activeDockTab === 'roaming'
                  ? 'bg-gradient-to-tr from-emerald-400 via-teal-400 to-cyan-300 ring-4 ring-emerald-500/60 shadow-xl shadow-emerald-500/50 scale-105'
                  : 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 shadow-lg shadow-emerald-500/40 hover:scale-110 active:scale-95'
              } text-slate-950 flex items-center justify-center transition-all border-4 border-[#070D18] cursor-pointer`}
              title="রোমিং ট্রাফিক ও Radacct ডায়াগনস্টিক"
            >
              <svg className="w-7 h-7 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8V6a2 2 0 0 1 2-2h2" />
                <path d="M4 16v2a2 2 0 0 0 2 2h2" />
                <path d="M16 4h2a2 2 0 0 1 2 2v2" />
                <path d="M16 20h2a2 2 0 0 0 2-2v-2" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            </button>
            <span className={`text-[10px] font-extrabold mt-1 transition-colors ${activeDockTab === 'roaming' ? 'text-emerald-300 font-black' : 'text-emerald-400'}`}>
              Roaming
            </span>
          </div>

          {/* SMS Tab */}
          <button
            onClick={() => setActiveDockTab('sms')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${
              activeDockTab === 'sms' ? 'text-emerald-400 scale-105' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>SMS</span>
          </button>

          {/* Wallet Tab */}
          <button
            onClick={() => setActiveDockTab('wallet')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${
              activeDockTab === 'wallet' ? 'text-emerald-400 scale-105' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span>Wallet</span>
          </button>

        </div>

        {/* System Copyright Text */}
        <div className="text-center text-[9px] text-slate-500 pt-1 font-mono">
          System Copyright Uconnect • {ispProfile.companyName} Reseller Gateway
        </div>
      </footer>

      {/* SIDE DRAWER MENU (When Hamburger is clicked) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <div className="relative w-80 max-w-[85vw] bg-[#0A1322] border-r border-slate-800 h-full p-6 flex flex-col justify-between z-10 shadow-2xl">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                    {resellerInitials}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{currentReseller?.name}</h3>
                    <span className="text-[11px] text-emerald-400 font-mono font-bold">
                      {currentReseller?.code}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Reseller Info Details */}
              <div className="p-3.5 rounded-2xl bg-[#0E1A2C] border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">মালিক:</span>
                  <strong className="text-white">{currentReseller?.ownerName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">মোবাইল:</span>
                  <strong className="text-cyan-400 font-mono">{currentReseller?.phone}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">এলাকা:</span>
                  <strong className="text-white">{currentReseller?.area}</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">ওয়ালেট ব্যালেন্স:</span>
                  <strong className="text-emerald-400 font-mono font-black text-sm">
                    {ispProfile.currencySymbol}{(currentReseller?.balance ?? 0).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1 text-xs font-semibold">
                {onSwitchToAdminPanel && (
                  <>
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        onSwitchToAdminPanel();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 flex items-center gap-2.5 transition-colors mb-1.5"
                    >
                      <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                      <span>ফুল এডমিন প্যানেল ভিউ</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        onSwitchToAdminPanel();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 flex items-center gap-2.5 transition-colors mb-2"
                    >
                      <Server className="w-4 h-4 text-emerald-400" />
                      <span>মিক্রোটিক রাউটার ও সেশন ড্যাশবোর্ড</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    setActiveDockTab('users');
                    setIsDrawerOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 flex items-center gap-2.5 transition-colors"
                >
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>গ্রাহক তালিকা ({myCustomers.length})</span>
                </button>

                <button
                  onClick={() => {
                    setIsPackagesModalOpen(true);
                    setIsDrawerOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    <span>আমার প্যাকেজসমূহ</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                    {myCustomPackages.length} কাস্টম
                  </span>
                </button>

                <button
                  onClick={() => {
                    setIsTopUpModalOpen(true);
                    setIsDrawerOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 flex items-center gap-2.5 transition-colors"
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>ব্যালেন্স রিচার্জ (টপ-আপ রিকোয়েস্ট)</span>
                </button>

                <button
                  onClick={() => {
                    setIsAddCustomerOpen(true);
                    setIsDrawerOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 flex items-center gap-2.5 transition-colors"
                >
                  <Plus className="w-4 h-4 text-cyan-400" />
                  <span>নতুন গ্রাহক যুক্ত করুন</span>
                </button>
              </div>
            </div>

            {/* Logout Button */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>লগআউট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALL RESELLER MODALS */}
      {/* 1. Balance Top-up Modal */}
      {currentReseller && (
        <ResellerBalanceRequestModal
          isOpen={isTopUpModalOpen}
          onClose={() => setIsTopUpModalOpen(false)}
          reseller={currentReseller}
        />
      )}

      {/* 2. Instant Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentCustomer(null);
        }}
        initialCustomer={paymentCustomer}
      />

      {/* 3. Add/Edit Customer Modal */}
      <CustomerFormModal
        isOpen={isAddCustomerOpen}
        onClose={() => {
          setIsAddCustomerOpen(false);
          setCustomerToEdit(null);
        }}
        customerToEdit={customerToEdit}
        defaultReseller={effectiveReseller}
        onCustomerCreated={(newCust) => {
          setIsAddCustomerOpen(false);
          setCustomerToEdit(null);
          // 1. Auto select correct protocol tab so it's never hidden
          if (newCust.connectionType === 'Wireless' || (newCust.packageName || '').toLowerCase().includes('hotspot')) {
            setProtocolTab('hotspot');
          } else {
            setProtocolTab('pppoe');
          }
          // 2. Clear filters and search so new customer is immediately visible
          setSearchQuery('');
          setStatusFilter('All');
          setCurrentPage(1);
          // 3. Highlight newly created customer
          setRecentlyAddedId(newCust.id);
          // 4. Immediately open customer profile modal for the user!
          setSelectedDetailsCustomer(newCust);
          addToast('success', 'গ্রাহক যুক্ত হয়েছে', `${newCust.name} (${newCust.uid}) সফলভাবে নিবন্ধিত হয়েছে। প্রোফাইল প্রদর্শিত হচ্ছে।`);
        }}
      />

      {/* 4. Customer Details Modal */}
      <CustomerDetailsModal
        customer={selectedDetailsCustomer}
        isOpen={Boolean(selectedDetailsCustomer)}
        onClose={() => setSelectedDetailsCustomer(null)}
        onEdit={(cust) => {
          setCustomerToEdit(cust);
          setSelectedDetailsCustomer(null);
          setIsAddCustomerOpen(true);
        }}
        onRecordPayment={(cust) => {
          setSelectedDetailsCustomer(null);
          handleOpenBillPay(cust);
        }}
        onOpenRouterConfig={(cust) => {
          setSelectedDetailsCustomer(null);
          setRouterConfigCustomer(cust);
        }}
        onOpenLaserModal={(cust) => {
          setSelectedDetailsCustomer(null);
          setLaserCustomer(cust);
        }}
        onOpenRouterWebLogin={(cust) => {
          setSelectedDetailsCustomer(null);
          setRouterLoginCustomer(cust);
        }}
        isAdmin={false}
      />

      {/* 5. Technical Router Login & Diagnostics */}
      <RouterWebLoginModal
        isOpen={Boolean(routerLoginCustomer)}
        onClose={() => setRouterLoginCustomer(null)}
        customer={routerLoginCustomer}
      />

      <LaserDiagnosticModal
        isOpen={Boolean(laserCustomer)}
        onClose={() => setLaserCustomer(null)}
        customer={laserCustomer}
      />

      <RemoteRouterConfigModal
        isOpen={Boolean(routerConfigCustomer)}
        onClose={() => setRouterConfigCustomer(null)}
        customer={routerConfigCustomer}
      />

      {/* 6. Reseller Packages Manager Modal */}
      {isPackagesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md">
          <div
            onClick={() => setIsPackagesModalOpen(false)}
            className="fixed inset-0"
          />

          <div className="relative w-full max-w-2xl bg-[#09111E] border border-slate-800 sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] z-10 overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#0D1726]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/40">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>আমার ইন্টারনেট প্যাকেজসমূহ</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                      {myCustomPackages.length} টি কাস্টম
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    রিসেলার: <strong className="text-emerald-400">{effectiveReseller.name}</strong> [{effectiveReseller.code}]
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAddPackage}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black shadow-md flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>নতুন প্যাকেজ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPackagesModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Strict Isolation Notice */}
            <div className="px-4 py-2.5 bg-emerald-950/30 border-b border-emerald-500/20 flex items-center gap-2 text-[11px] text-emerald-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                <strong>নিরাপদ প্রাইভেট প্যাকেজ:</strong> আপনার তৈরি করা কাস্টম প্যাকেজ শুধুমাত্র আপনার একাউন্টেই দৃশ্যমান থাকবে, অন্য কোনো রিসেলার দেখতে বা ব্যবহার করতে পারবে না।
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="p-3 border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar bg-[#0B1524]">
              <button
                type="button"
                onClick={() => setPackageSubTab('all')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  packageSubTab === 'all'
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-300 font-bold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                সব প্যাকেজ ({resellerPackages.length})
              </button>
              <button
                type="button"
                onClick={() => setPackageSubTab('custom')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  packageSubTab === 'custom'
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-300 font-bold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                আমার কাস্টম ({myCustomPackages.length})
              </button>
              <button
                type="button"
                onClick={() => setPackageSubTab('central')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  packageSubTab === 'central'
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-300 font-bold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                সেন্ট্রাল ISP প্যাকেজ ({centralBaselinePackages.length})
              </button>
            </div>

            {/* Packages List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 min-h-[220px]">
              {displayedPackages.length > 0 ? (
                displayedPackages.map((pkg) => {
                  const isMyCustom = doesPackageBelongToReseller(pkg, effectiveReseller);

                  return (
                    <div
                      key={pkg.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isMyCustom
                          ? 'bg-gradient-to-br from-[#0B1524] to-[#0E1A2C] border-emerald-500/40 shadow-md shadow-emerald-950/20'
                          : 'bg-slate-900/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-sm">{pkg.name}</span>
                            {isMyCustom ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                ✓ আমার কাস্টম (প্রাইভেট)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-medium">
                                সেন্ট্রাল ISP প্যাকেজ
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-cyan-400 font-mono font-bold bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-500/30">
                              {pkg.speed}
                            </span>
                            <span className="text-slate-400 font-mono">
                              {pkg.type || 'Residential'}
                            </span>
                          </div>
                          {pkg.description && (
                            <p className="text-slate-400 text-[11px] line-clamp-1">{pkg.description}</p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 block">মাসিক রেট</span>
                          <span className="text-emerald-400 font-mono font-black text-sm">
                            {ispProfile.currencySymbol}{pkg.price}
                          </span>
                        </div>
                      </div>

                      {/* Controls for custom packages */}
                      {isMyCustom && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPackage(pkg)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-cyan-400" />
                            <span>এডিট করুন</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPackageToDelete(pkg)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            <span>মুছুন</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
                    <Wifi className="w-6 h-6" />
                  </div>
                  <p className="text-slate-400 text-xs">
                    {packageSubTab === 'custom'
                      ? 'আপনি এখনও কোনো নিজস্ব কাস্টম প্যাকেজ তৈরি করেননি।'
                      : 'কোনো প্যাকেজ পাওয়া যায়নি।'}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddPackage}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>প্রথম প্যাকেজটি তৈরি করুন</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs bg-[#0D1726]">
              <span className="text-slate-400 text-[11px]">
                মোট দেখানো হচ্ছে: {displayedPackages.length} টি প্যাকেজ
              </span>
              <button
                type="button"
                onClick={() => setIsPackagesModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Package Form Modal (Add / Edit) with Reseller Scope */}
      <PackageModal
        isOpen={isPackageFormModalOpen}
        onClose={() => {
          setIsPackageFormModalOpen(false);
          setEditingPackage(null);
        }}
        packageToEdit={editingPackage}
        resellerScope={effectiveReseller}
      />

      {/* 8. Confirm Delete Package Modal */}
      <ConfirmModal
        isOpen={Boolean(packageToDelete)}
        onClose={() => setPackageToDelete(null)}
        onConfirm={handleConfirmDeletePackage}
        title="প্যাকেজ ডিলিট নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিতভাবে "${packageToDelete?.name}" প্যাকেজটি মুছে ফেলতে চান? এটি মুছে ফেললে আপনার রিসেলার তালিকা থেকে চিরতরে বাদ হয়ে যাবে।`}
        confirmText="হ্যাঁ, প্যাকেজটি মুছে ফেলুন"
        cancelText="বাতিল"
        isDestructive={true}
      />

    </div>
  );
};
