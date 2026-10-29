import React, { useState, useMemo, useEffect } from 'react';
import { Customer, CustomerStatus, PaymentStatus, Reseller } from '../../types';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { StatusBadge } from '../../components/StatusBadge';
import { exportCustomersToCSV } from '../../utils/exportUtils';
import { doesCustomerBelongToReseller } from '../../utils/resellerIsolation';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Plus, 
  Eye, 
  Edit3, 
  Trash2, 
  CreditCard, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight,
  Phone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Radio,
  Sliders,
  Globe,
  Store
} from 'lucide-react';
import { useReseller } from '../../context/ResellerContext';

interface CustomersViewProps {
  onOpenAddCustomer: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  onRecordPayment: (customer: Customer) => void;
  onOpenRouterConfig?: (customer: Customer) => void;
  onOpenLaserModal?: (customer: Customer) => void;
  onOpenRouterWebLogin?: (customer: Customer) => void;
  initialFilterStatus?: CustomerStatus | 'Due' | 'All';
  initialResellerFilter?: string;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onOpenAddCustomer,
  onSelectCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onRecordPayment,
  onOpenRouterConfig,
  onOpenLaserModal,
  onOpenRouterWebLogin,
  initialFilterStatus = 'All',
  initialResellerFilter = 'All',
}) => {
  const { customers, packages, ispProfile } = useCustomer();
  const { resellers } = useReseller();
  const { hasPermission, isReseller, user } = useAuth();
  const { isDark } = useTheme();

  const canAddCustomer = hasPermission('add_customer');
  const canDeleteCustomer = hasPermission('delete_customer');
  const canRecordPayment = hasPermission('record_payment');
  const canRouterConfig = hasPermission('router_config');

  const isResellerScope = Boolean(isReseller || user?.role === 'Reseller' || user?.resellerId);

  // Active reseller resolved safely
  const currentReseller = useMemo<Reseller | null>(() => {
    if (!isResellerScope) return null;
    const found = resellers.find(
      (r) =>
        r.id === user?.resellerId ||
        r.code === user?.resellerId ||
        r.code === user?.resellerCode ||
        (r.username && user?.accountUsername && r.username.toLowerCase() === user.accountUsername.toLowerCase()) ||
        (r.name && user?.username && r.name.toLowerCase() === user.username.toLowerCase())
    );
    if (found) return found;
    return {
      id: user?.resellerId || user?.uid || 'reseller',
      code: user?.resellerCode || 'RES',
      name: user?.resellerName || user?.username || 'Reseller',
      ownerName: user?.username || 'Reseller',
      phone: user?.phone || '',
      area: '',
      balance: 0,
      commissionRate: 15,
      billingType: 'prepaid',
      status: 'Active',
      username: user?.accountUsername || user?.username || '',
      password: '',
      createdAt: new Date().toISOString(),
    };
  }, [isResellerScope, user, resellers]);

  // STRICT MULTI-TENANT ISOLATION:
  // When logged in as a Reseller, their customer universe is strictly their assigned customers.
  // Resellers are completely blocked from viewing or counting customers from any other reseller or main office.
  const scopedCustomers = useMemo(() => {
    if (isResellerScope) {
      return customers.filter((c) => doesCustomerBelongToReseller(c, currentReseller));
    }
    return customers;
  }, [customers, isResellerScope, currentReseller]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilterStatus);
  const [packageFilter, setPackageFilter] = useState<string>('All');
  const [resellerFilter, setResellerFilter] = useState<string>(
    isResellerScope && user?.resellerId ? user.resellerId : initialResellerFilter || 'All'
  );

  useEffect(() => {
    if (initialResellerFilter) {
      setResellerFilter(initialResellerFilter);
    }
  }, [initialResellerFilter]);
  const [sortBy, setSortBy] = useState<'uid' | 'name' | 'bill' | 'due' | 'date'>('uid');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Unique areas strictly scoped
  const areas = useMemo(() => {
    const list = Array.from(new Set(scopedCustomers.map((c) => c.area).filter(Boolean)));
    return list;
  }, [scopedCustomers]);

  // Filtering & Sorting Logic
  const filteredCustomers = useMemo(() => {
    let result = [...scopedCustomers];

    // Reseller Filter (For Super Admin / Manager only)
    if (!isResellerScope && resellerFilter !== 'All') {
      if (resellerFilter === 'main') {
        result = result.filter((c) => !c.resellerId || c.resellerId === 'main');
      } else {
        const targetRes = resellers.find((r) => r.id === resellerFilter || r.code === resellerFilter);
        result = result.filter((c) => doesCustomerBelongToReseller(c, targetRes || { id: resellerFilter }));
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          !c ? false :
          (c.name || '').toLowerCase().includes(q) ||
          (c.mobile || '').includes(q) ||
          (c.uid || '').toLowerCase().includes(q) ||
          (c.resellerName && c.resellerName.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.area && c.area.toLowerCase().includes(q)) ||
          (c.ipAddress && c.ipAddress.includes(q)) ||
          (c.wifiUsername && c.wifiUsername.toLowerCase().includes(q))
      );
    }

    // Status Filter
    if (statusFilter !== 'All') {
      if (statusFilter === 'Due') {
        result = result.filter((c) => (c.dueAmount || 0) > 0 || c.paymentStatus === 'Due');
      } else {
        result = result.filter((c) => c.status === statusFilter);
      }
    }

    // Package Filter
    if (packageFilter !== 'All') {
      result = result.filter((c) => c.packageName === packageFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'bill') {
        comparison = (Number(a.monthlyBill) || 0) - (Number(b.monthlyBill) || 0);
      } else if (sortBy === 'due') {
        comparison = (Number(a.dueAmount) || 0) - (Number(b.dueAmount) || 0);
      } else if (sortBy === 'date') {
        comparison = (a.connectionDate || '').localeCompare(b.connectionDate || '');
      } else {
        // UID
        comparison = (a.uid || '').localeCompare(b.uid || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [scopedCustomers, isResellerScope, resellerFilter, resellers, searchQuery, statusFilter, packageFilter, sortBy, sortOrder]);

  // Scoped count calculations for pills
  const totalCount = scopedCustomers.length;
  const activeCount = useMemo(() => scopedCustomers.filter((c) => c.status === 'Active').length, [scopedCustomers]);
  const dueCount = useMemo(() => scopedCustomers.filter((c) => (c.dueAmount || 0) > 0 || c.paymentStatus === 'Due').length, [scopedCustomers]);
  const suspendedCount = useMemo(() => scopedCustomers.filter((c) => c.status === 'Suspended').length, [scopedCustomers]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setPackageFilter('All');
    setSortBy('uid');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  const toggleSort = (field: 'uid' | 'name' | 'bill' | 'due' | 'date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const cardClass = isDark
    ? 'glass-panel-dark border-slate-800 text-slate-100'
    : 'glass-panel-colorful border-purple-500/25 text-slate-100';

  const inputClass = isDark
    ? 'bg-slate-900/80 border-slate-700/80 focus:bg-slate-900 focus:border-cyan-400 text-white placeholder-slate-500'
    : 'bg-slate-900/80 border-purple-500/30 focus:bg-slate-900 focus:border-cyan-400 text-white placeholder-slate-500';

  return (
    <div className="space-y-6">
      
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            Customer Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, manage, edit profiles, collect bills, and track WiFi subscribers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => exportCustomersToCSV(filteredCustomers)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors min-h-[40px] border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Export CSV ({filteredCustomers.length})
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors min-h-[40px] border border-slate-700"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xs:inline">Print</span>
          </button>

          {canAddCustomer && (
            <button
              onClick={onOpenAddCustomer}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`${cardClass} rounded-2xl p-4 sm:p-5 space-y-4 border shadow-xl`}>
        {/* Reseller Banner if Reseller Logged in */}
        {isResellerScope && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-emerald-300 font-semibold flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-400 shrink-0" />
              রিসেলার প্যানেল: আপনার অধীনে নিবন্ধিত মোট {totalCount} জন গ্রাহক
            </span>
            <div className="flex items-center gap-3 text-slate-300 font-mono text-[11px]">
              <span>সক্রিয়: <strong className="text-emerald-400">{activeCount}</strong></span>
              <span>বকেয়া: <strong className="text-rose-400">{dueCount}</strong></span>
              <span>স্থগিত: <strong className="text-amber-400">{suspendedCount}</strong></span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          
          {/* Search Field */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search Name, Mobile, UID, Area..."
              className={`w-full pl-10 pr-8 py-2.5 rounded-xl border text-sm sm:text-xs outline-none transition-colors ${inputClass}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Reseller Filter (For Super Admin / Manager only) */}
          {!isResellerScope ? (
            <div>
              <select
                value={resellerFilter}
                onChange={(e) => {
                  setResellerFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm sm:text-xs outline-none transition-colors font-medium ${inputClass}`}
              >
                <option value="All" className="bg-slate-900 text-white">সকল রিসেলার ও মেইন অফিস</option>
                <option value="main" className="bg-slate-900 text-cyan-400">মেইন অফিস (ডাইরেক্ট)</option>
                {resellers.map((r) => {
                  const count = customers.filter(c => c.resellerId === r.id).length;
                  return (
                    <option key={r.id} value={r.id} className="bg-slate-900 text-emerald-400">
                      {r.name} ({r.code}) — {count} জন
                    </option>
                  );
                })}
              </select>
            </div>
          ) : null}

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm sm:text-xs outline-none transition-colors font-medium ${inputClass}`}
            >
              <option value="All" className="bg-slate-900 text-white">All Statuses</option>
              <option value="Active" className="bg-slate-900 text-emerald-400">Active Subscribers</option>
              <option value="Inactive" className="bg-slate-900 text-slate-400">Inactive</option>
              <option value="Suspended" className="bg-slate-900 text-amber-400">Suspended</option>
              <option value="Due" className="bg-slate-900 text-rose-400">Outstanding Due Only</option>
            </select>
          </div>

          {/* Package Filter */}
          <div>
            <select
              value={packageFilter}
              onChange={(e) => {
                setPackageFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm sm:text-xs outline-none transition-colors font-medium ${inputClass}`}
            >
              <option value="All" className="bg-slate-900 text-white">All Packages</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.name} className="bg-slate-900 text-white">
                  {pkg.name} ({pkg.speed})
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm sm:text-xs outline-none transition-colors ${inputClass}`}
            >
              <option value="uid" className="bg-slate-900 text-white">Sort by UID</option>
              <option value="name" className="bg-slate-900 text-white">Sort by Name</option>
              <option value="bill" className="bg-slate-900 text-white">Sort by Monthly Bill</option>
              <option value="due" className="bg-slate-900 text-white">Sort by Due Amount</option>
              <option value="date" className="bg-slate-900 text-white">Sort by Connection Date</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Toggle sort order (Current: ${sortOrder.toUpperCase()})`}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>

            {(searchQuery || statusFilter !== 'All' || packageFilter !== 'All' || (!isResellerScope && resellerFilter !== 'All')) && (
              <button
                onClick={resetFilters}
                title="Reset all filters"
                className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 hover:border-rose-400 text-rose-300 shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Pill Bar */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="hidden sm:block">
            Showing <strong className="text-white">{filteredCustomers.length}</strong> of{' '}
            <strong className="text-white">{totalCount}</strong> customers
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto py-0.5">
            <button
              onClick={() => {
                setStatusFilter('All');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[32px] ${
                statusFilter === 'All' ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              All ({totalCount})
            </button>

            <button
              onClick={() => {
                setStatusFilter('Active');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[32px] ${
                statusFilter === 'Active' ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/60'
              }`}
            >
              Active ({activeCount})
            </button>

            <button
              onClick={() => {
                setStatusFilter('Due');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[32px] ${
                statusFilter === 'Due' ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30' : 'bg-rose-950/60 text-rose-300 border border-rose-500/40 hover:bg-rose-900/60'
              }`}
            >
              Due ({dueCount})
            </button>

            <button
              onClick={() => {
                setStatusFilter('Suspended');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[32px] ${
                statusFilter === 'Suspended' ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/30' : 'bg-amber-950/60 text-amber-300 border border-amber-500/40 hover:bg-amber-900/60'
              }`}
            >
              Suspended ({suspendedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Customers Table (Desktop) & Cards (Mobile) */}
      <div className={`${cardClass} rounded-2xl overflow-hidden border shadow-xl`}>
        
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th 
                  onClick={() => toggleSort('uid')}
                  className="py-3.5 px-4 cursor-pointer hover:text-cyan-400 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>UID</span>
                    {sortBy === 'uid' && <span className="text-cyan-400 font-mono text-[9px]">{sortOrder.toUpperCase()}</span>}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('name')}
                  className="py-3.5 px-4 cursor-pointer hover:text-cyan-400 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Customer Name</span>
                    {sortBy === 'name' && <span className="text-cyan-400 font-mono text-[9px]">{sortOrder.toUpperCase()}</span>}
                  </div>
                </th>
                <th className="py-3.5 px-4">Mobile</th>
                <th className="py-3.5 px-4">Package & Speed</th>
                <th 
                  onClick={() => toggleSort('bill')}
                  className="py-3.5 px-4 cursor-pointer hover:text-cyan-400 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Monthly Bill</span>
                    {sortBy === 'bill' && <span className="text-cyan-400 font-mono text-[9px]">{sortOrder.toUpperCase()}</span>}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('due')}
                  className="py-3.5 px-4 cursor-pointer hover:text-cyan-400 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Due Amount</span>
                    {sortBy === 'due' && <span className="text-cyan-400 font-mono text-[9px]">{sortOrder.toUpperCase()}</span>}
                  </div>
                </th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {paginatedCustomers.length > 0 ? (
                paginatedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => onSelectCustomer(customer)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400 group-hover:text-cyan-300">
                      {customer.uid}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white group-hover:text-cyan-400 flex items-center gap-1.5 flex-wrap">
                        <span>{customer.name}</span>
                        {customer.resellerName && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                            {customer.resellerName}
                          </span>
                        )}
                      </div>
                      {customer.area && (
                        <span className="text-[11px] text-slate-400 block truncate">
                          {customer.area}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {customer.mobile}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{customer.packageName}</div>
                      <span className="text-[11px] font-mono text-cyan-400">{customer.speed}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                      {ispProfile.currencySymbol}{customer.monthlyBill}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold">
                      {customer.dueAmount > 0 ? (
                        <span className="text-rose-400">{ispProfile.currencySymbol}{customer.dueAmount}</span>
                      ) : (
                        <span className="text-emerald-400">Paid (৳0)</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={customer.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div 
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canRouterConfig && onOpenRouterWebLogin && (
                          <button
                            onClick={() => onOpenRouterWebLogin(customer)}
                            title="Enter Customer Router (রাউটারে ঢুকুন)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-blue-950/80 transition-colors"
                          >
                            <Globe className="w-4 h-4 text-blue-400" />
                          </button>
                        )}

                        {canRouterConfig && onOpenLaserModal && (
                          <button
                            onClick={() => onOpenLaserModal(customer)}
                            title="Check GPON Fiber Laser"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/80 transition-colors"
                          >
                            <Radio className="w-4 h-4 text-cyan-400" />
                          </button>
                        )}

                        {canRouterConfig && onOpenRouterConfig && (
                          <button
                            onClick={() => onOpenRouterConfig(customer)}
                            title="Remote Router Config (Control Room)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-950/80 transition-colors"
                          >
                            <Sliders className="w-4 h-4 text-purple-400" />
                          </button>
                        )}

                        <button
                          onClick={() => onSelectCustomer(customer)}
                          title="View Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {canRecordPayment && (
                          <button
                            onClick={() => onRecordPayment(customer)}
                            title="Record Payment"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/60 transition-colors"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}

                        {canAddCustomer && (
                          <button
                            onClick={() => onEditCustomer(customer)}
                            title="Edit Customer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-950/60 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        {canDeleteCustomer && (
                          <button
                            onClick={() => onDeleteCustomer(customer)}
                            title="Delete Customer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-white">No customers match your filter</p>
                    <p className="text-xs text-slate-400 mt-1">Try changing or clearing your search criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Stacked Cards */}
        <div className="md:hidden divide-y divide-slate-800/60">
          {paginatedCustomers.length > 0 ? (
            paginatedCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => onSelectCustomer(customer)}
                className="p-4 space-y-3 hover:bg-slate-800/40 active:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">{customer.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs font-semibold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
                        {customer.uid}
                      </span>
                      <span className="font-mono text-xs text-slate-400">{customer.mobile}</span>
                    </div>
                  </div>
                  <StatusBadge status={customer.status} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Package</span>
                    <span className="text-slate-200 font-semibold truncate block">{customer.packageName} ({customer.speed})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Monthly Bill / Due</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {ispProfile.currencySymbol}{customer.monthlyBill}
                    </span>
                    {customer.dueAmount > 0 && (
                      <span className="text-rose-400 font-mono font-bold ml-1">
                        (Due: {ispProfile.currencySymbol}{customer.dueAmount})
                      </span>
                    )}
                  </div>
                </div>

                {customer.area && (
                  <div className="text-[11px] text-slate-400">
                    Area: <span className="text-slate-200 font-medium">{customer.area}</span>
                  </div>
                )}

                {/* Mobile Quick Action Buttons */}
                <div 
                  className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 gap-1.5 flex-wrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${customer.mobile}`}
                      className="px-2.5 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-bold flex items-center gap-1 border border-cyan-500/30 active:scale-95 transition-all min-h-[36px]"
                    >
                      <Phone className="w-3.5 h-3.5 text-cyan-400" /> Call
                    </a>

                    {canRouterConfig && onOpenRouterWebLogin && (
                      <button
                        onClick={() => onOpenRouterWebLogin(customer)}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-950/80 hover:bg-blue-900/80 text-blue-300 text-xs font-bold flex items-center gap-1 border border-blue-500/30 active:scale-95 transition-all min-h-[36px]"
                        title="Enter Router Admin GUI"
                      >
                        <Globe className="w-3.5 h-3.5 text-blue-400" /> Router
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {canRecordPayment && (
                      <button
                        onClick={() => onRecordPayment(customer)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold active:scale-95 transition-all min-h-[36px]"
                      >
                        Pay Bill
                      </button>
                    )}
                    {canAddCustomer && (
                      <button
                        onClick={() => onEditCustomer(customer)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold active:scale-95 transition-all min-h-[36px] border border-slate-700"
                      >
                        Edit
                      </button>
                    )}
                    {canDeleteCustomer && (
                      <button
                        onClick={() => onDeleteCustomer(customer)}
                        className="p-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-xs border border-rose-500/40 active:scale-95 transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No customers found matching the criteria.
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-400">
            Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors min-h-[38px]"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors min-h-[38px]"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
