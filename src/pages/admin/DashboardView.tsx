import React, { useState, useMemo } from 'react';
import { Customer, PaymentRecord } from '../../types';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { useReseller } from '../../context/ResellerContext';
import { useTheme } from '../../context/ThemeContext';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { exportCustomersToCSV, exportPaymentsToCSV } from '../../utils/exportUtils';
import { doesCustomerBelongToReseller } from '../../utils/resellerIsolation';
import { ResellerBalanceRequestModal } from '../../components/ResellerBalanceRequestModal';
import { AdminTab } from './AdminLayout';
import { 
  Users, 
  UserCheck, 
  UserX, 
  AlertCircle, 
  CreditCard, 
  TrendingUp, 
  UserPlus, 
  Search, 
  Download, 
  Printer, 
  ArrowUpRight,
  ArrowRight,
  Wifi,
  DollarSign,
  Activity,
  Calendar,
  Clock,
  Headphones,
  CheckCircle2,
  Store,
  Wallet,
  Coins,
  Layers,
  Eye,
  Phone,
  MapPin,
  ChevronRight
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateTab: (tab: AdminTab) => void;
  onOpenAddCustomer: () => void;
  onOpenRecordPayment: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onFilterDue: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenAddCustomer,
  onOpenRecordPayment,
  onSelectCustomer,
  onFilterDue,
}) => {
  const { customers, payments, paymentRequests, supportTickets, stats, ispProfile } = useCustomer();
  const { hasPermission, isReseller, user } = useAuth();
  const { resellers, transactions, balanceRequests } = useReseller();
  const { isDark } = useTheme();

  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [resellerCustomerSearch, setResellerCustomerSearch] = useState('');

  // Active reseller resolved safely
  const currentReseller = useMemo(() => {
    if (!isReseller && user?.role !== 'Reseller') return null;
    return (
      resellers.find(
        (r) =>
          r.id === user?.resellerId ||
          r.code === user?.resellerId ||
          r.code === user?.resellerCode ||
          (r.username && user?.accountUsername && r.username.toLowerCase() === user.accountUsername.toLowerCase())
      ) || {
        id: user?.resellerId || '',
        code: user?.resellerCode || '',
        name: user?.resellerName || '',
        ownerName: user?.username || 'Reseller',
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

  const canAddCustomer = hasPermission('add_customer');
  const canRecordPayment = hasPermission('record_payment');
  const canViewCustomers = hasPermission('customers');
  const canViewPayments = hasPermission('payments');
  const canViewRequests = hasPermission('requests');
  const canViewTickets = hasPermission('tickets');

  const cardClass = isDark
    ? 'glass-panel-dark border-slate-800 text-slate-100'
    : 'glass-panel-colorful border-purple-500/25 text-slate-100';

  // ========================================================
  // 1. DEDICATED RESELLER DASHBOARD (When logged in as Reseller)
  // ========================================================
  if (currentReseller) {
    const myCustomers = customers.filter(c => doesCustomerBelongToReseller(c, currentReseller));
    const myFilteredCustomers = myCustomers.filter(c => {
      if (!resellerCustomerSearch.trim()) return true;
      const q = resellerCustomerSearch.toLowerCase();
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.uid || '').toLowerCase().includes(q) ||
        (c.mobile || '').includes(q) ||
        (c.area && c.area.toLowerCase().includes(q))
      );
    });

    const myActiveCount = myCustomers.filter(c => c.status === 'Active').length;
    const myDueCustomers = myCustomers.filter(c => (c.dueAmount || 0) > 0);
    const myDueCount = myDueCustomers.length;
    const myTotalDue = myDueCustomers.reduce((sum, c) => sum + (c.dueAmount || 0), 0);
    const myMonthlyBilled = myCustomers.reduce((sum, c) => sum + (c.monthlyBill || 0), 0);
    const myTransactions = transactions.filter(
      t =>
        t.resellerId === currentReseller.id ||
        (currentReseller.code && t.resellerId === currentReseller.code) ||
        (currentReseller.name && t.resellerName === currentReseller.name)
    );

    return (
      <div className="space-y-6 sm:space-y-8">
        
        {/* Reseller Header Card */}
        <div className={`p-5 sm:p-6 rounded-2xl border shadow-xl ${cardClass} flex flex-col md:flex-row md:items-center justify-between gap-5`}>
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 shrink-0">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {currentReseller.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
                  {currentReseller.code}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  সক্রিয় রিসেলার
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                <span>মালিক: <strong className="text-slate-200">{currentReseller.ownerName}</strong></span>
                <span>মোবাইল: <strong className="text-slate-200 font-mono">{currentReseller.phone}</strong></span>
                <span>এলাকা: <strong className="text-slate-200">{currentReseller.area}</strong></span>
              </p>
            </div>
          </div>

          {/* Wallet Balance & Top-Up CTA */}
          <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                ওয়ালেট ব্যালেন্স
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono block">
                {ispProfile.currencySymbol}{currentReseller.balance.toLocaleString('en-IN')}
              </span>
            </div>
            <button
              onClick={() => setIsTopUpModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Wallet className="w-4 h-4" />
              <span>টপ-আপ রিকোয়েস্ট</span>
            </button>
          </div>
        </div>

        {/* 4 Reseller Metric Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="ওয়ালেট ব্যালেন্স"
            value={`${ispProfile.currencySymbol}${currentReseller.balance.toLocaleString('en-IN')}`}
            subtitle={currentReseller.billingType === 'prepaid' ? 'প্রিপেইড ওয়ালেট' : 'পোস্টপেইড লিমিট'}
            icon={<Wallet className="w-5 h-5" />}
            colorTheme="emerald"
            onClick={() => setIsTopUpModalOpen(true)}
          />

          <StatCard
            title="মোট গ্রাহক"
            value={myCustomers.length}
            subtitle={`সক্রিয় লাইন: ${myActiveCount} জন`}
            icon={<Users className="w-5 h-5" />}
            colorTheme="cyan"
            onClick={() => onNavigateTab('customers')}
          />

          <StatCard
            title="বকেয়া গ্রাহক"
            value={myDueCount}
            subtitle={`মোট বকেয়া: ${ispProfile.currencySymbol}${myTotalDue.toLocaleString('en-IN')}`}
            icon={<AlertCircle className="w-5 h-5" />}
            colorTheme="rose"
            onClick={() => onNavigateTab('customers')}
          />

          <StatCard
            title="চলতি মাসের বিলিং"
            value={`${ispProfile.currencySymbol}${myMonthlyBilled.toLocaleString('en-IN')}`}
            subtitle={`কমিশন হার: ${currentReseller.commissionRate || 15}%`}
            icon={<CreditCard className="w-5 h-5" />}
            colorTheme="blue"
            onClick={() => onNavigateTab('payments')}
          />
        </div>

        {/* Reseller Action Bar */}
        <div className={`p-4 rounded-2xl border shadow-xl ${cardClass} flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              রিসেলার কুইক অ্যাকশন:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {canAddCustomer && (
              <button
                onClick={onOpenAddCustomer}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all cursor-pointer min-h-[38px]"
              >
                <UserPlus className="w-3.5 h-3.5" />
                নতুন গ্রাহক যুক্ত করুন
              </button>
            )}

            {canRecordPayment && (
              <button
                onClick={onOpenRecordPayment}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer min-h-[38px]"
              >
                <CreditCard className="w-3.5 h-3.5" />
                গ্রাহক বিল পরিশোধ / রিচার্জ
              </button>
            )}

            <button
              onClick={() => setIsTopUpModalOpen(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors cursor-pointer min-h-[38px]"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              ব্যালেন্স টপ-আপ আবেদন
            </button>

            <button
              onClick={() => onNavigateTab('customers')}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors cursor-pointer min-h-[38px]"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              সকল গ্রাহক ({myCustomers.length})
            </button>
          </div>
        </div>

        {/* My Assigned Customers Table with Instant Bill Collection */}
        <div className={`rounded-2xl border shadow-xl overflow-hidden ${cardClass}`}>
          <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                আমার অধীনস্থ গ্রাহক তালিকা ও দ্রুত রিচার্জ
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                গ্রাহকের বিল পরিশোধ করতে সরাসরি "বিল নিন" বাটনে ক্লিক করুন (ওয়ালেট থেকে স্বয়ংক্রিয়ভাবে কাটবে)
              </p>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={resellerCustomerSearch}
                onChange={(e) => setResellerCustomerSearch(e.target.value)}
                placeholder="নাম, মোবাইল বা UID খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">UID</th>
                  <th className="py-3 px-4">গ্রাহক নাম ও এলাকা</th>
                  <th className="py-3 px-4">মোবাইল</th>
                  <th className="py-3 px-4">প্যাকেজ</th>
                  <th className="py-3 px-4">মাসিক বিল</th>
                  <th className="py-3 px-4">বকেয়া</th>
                  <th className="py-3 px-4">স্ট্যাটাস</th>
                  <th className="py-3 px-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {myFilteredCustomers.length > 0 ? (
                  myFilteredCustomers.slice(0, 10).map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                        {cust.uid}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{cust.name}</span>
                        <span className="text-[11px] text-slate-400 block">{cust.area || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {cust.mobile}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-200 block">{cust.packageName}</span>
                        <span className="text-[11px] font-mono text-cyan-400">{cust.speed}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-100">
                        {ispProfile.currencySymbol}{cust.monthlyBill}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {cust.dueAmount > 0 ? (
                          <span className="text-rose-400">{ispProfile.currencySymbol}{cust.dueAmount}</span>
                        ) : (
                          <span className="text-emerald-400">পরিশোধিত (৳0)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={cust.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectCustomer(cust)}
                            title="বিস্তারিত দেখুন"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canRecordPayment && (
                            <button
                              onClick={() => onOpenRecordPayment()}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>বিল নিন</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      কোনো গ্রাহক পাওয়া যায়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reseller Wallet Ledger & Recent Transactions */}
        <div className={`rounded-2xl border shadow-xl overflow-hidden ${cardClass}`}>
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                রিসেলার ওয়ালেট লেজার ও লেনদেন ইতিহাস
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ব্যালেন্স রিচার্জ ও গ্রাহক বিল কাটার সাম্প্রতিক স্টেটমেন্ট
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40">
              মোট লেনদেন: {myTransactions.length} টি
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">তারিখ</th>
                  <th className="py-3 px-4">ধরন</th>
                  <th className="py-3 px-4">পরিমাণ</th>
                  <th className="py-3 px-4">পূর্বের ব্যালেন্স</th>
                  <th className="py-3 px-4">বর্তমান ব্যালেন্স</th>
                  <th className="py-3 px-4">বিবরণ / নোট</th>
                  <th className="py-3 px-4">সম্পাদনকারী</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {myTransactions.length > 0 ? (
                  myTransactions.slice(0, 10).map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {tx.date}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.type === 'credit'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                        }`}>
                          {tx.type === 'credit' ? '+ ডিপোজিট/ক্রেডিট' : '- বিল চার্জ/ডেবিট'}
                        </span>
                      </td>
                      <td className={`py-3 px-4 font-mono font-bold text-sm ${
                        tx.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {tx.type === 'credit' ? '+' : '-'}{ispProfile.currencySymbol}{tx.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {ispProfile.currencySymbol}{tx.balanceBefore.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {ispProfile.currencySymbol}{tx.balanceAfter.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        {tx.description}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {tx.performedBy || 'System'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      কোনো লেনদেন রেকর্ড এখনও নেই।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Balance Top-up Modal */}
        {currentReseller && (
          <ResellerBalanceRequestModal
            isOpen={isTopUpModalOpen}
            onClose={() => setIsTopUpModalOpen(false)}
            reseller={currentReseller}
          />
        )}
      </div>
    );
  }

  // ========================================================
  // 2. STANDARD SUPER ADMIN DASHBOARD
  // ========================================================
  const pendingRequests = paymentRequests.filter(r => r.status === 'Pending');
  const openTickets = supportTickets.filter(t => t.status !== 'Resolved');
  const showBanner = (pendingRequests.length > 0 && canViewRequests) || (openTickets.length > 0 && canViewTickets);

  // Calculate monthly stats
  const totalBilled = customers.reduce((sum, c) => sum + (c.monthlyBill || 0), 0);
  const totalCollected = stats.totalCollected;
  const collectionRate = totalBilled > 0 ? Math.min(100, Math.round((totalCollected / totalBilled) * 100)) : 0;

  // Package distribution count
  const packageDistribution = customers.reduce((acc, c) => {
    acc[c.packageName] = (acc[c.packageName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Reseller pool metrics for Super Admin
  const totalResellerPoolBalance = resellers.reduce((sum, r) => sum + (r.balance || 0), 0);
  const totalResellerCustomers = customers.filter(c => Boolean(c.resellerId)).length;
  const pendingResellerRequests = balanceRequests.filter(r => r.status === 'Pending').length;

  return (
    <div className="space-y-6 sm:space-y-8">
      
      {/* Pending Payment Requests / Support Tickets Alert Banner */}
      {showBanner && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-cyan-950/80 border border-amber-500/40 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>গ্রাহক নোটিফিকেশন অ্যালার্ট</span>
                {pendingRequests.length > 0 && canViewRequests && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                    {pendingRequests.length} টি পেমেন্ট রিকোয়েস্ট পেন্ডিং
                  </span>
                )}
                {openTickets.length > 0 && canViewTickets && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                    {openTickets.length} টি অভিযোগ ওপেন
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                গ্রাহকের পাঠানো TrxID ভেরিফাই, এডিট বা অনুমোদন করতে ক্লিক করুন।
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('requests')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0"
          >
            <span>ম্যানেজ করুন</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Welcome & Quick Actions Bar */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl border shadow-xl ${cardClass}`}>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Network Operations Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, subscriber bandwidth provisioning & billing collection metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canAddCustomer && (
            <button
              onClick={onOpenAddCustomer}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all min-h-[40px]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Customer
            </button>
          )}

          {canRecordPayment && (
            <button
              onClick={onOpenRecordPayment}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all min-h-[40px]"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Record Payment
            </button>
          )}

          <button
            onClick={() => exportCustomersToCSV(customers)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors min-h-[40px] border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xs:inline">CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors min-h-[40px] border border-slate-700"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xs:inline">Print</span>
          </button>
        </div>
      </div>

      {/* 6 Grid Metrics / Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          subtitle="Registered subscribers"
          icon={<Users className="w-5 h-5" />}
          colorTheme="cyan"
          onClick={canViewCustomers ? () => onNavigateTab('customers') : undefined}
        />

        <StatCard
          title="Active Lines"
          value={stats.activeCustomers}
          subtitle={`${Math.round((stats.activeCustomers / (stats.totalCustomers || 1)) * 100)}% Online`}
          icon={<UserCheck className="w-5 h-5" />}
          colorTheme="emerald"
          onClick={canViewCustomers ? () => onNavigateTab('customers') : undefined}
        />

        <StatCard
          title="Inactive Lines"
          value={stats.inactiveCustomers}
          subtitle="Suspended / off"
          icon={<UserX className="w-5 h-5" />}
          colorTheme="amber"
          onClick={canViewCustomers ? () => onNavigateTab('customers') : undefined}
        />

        <StatCard
          title="Due Customers"
          value={stats.dueCustomers}
          subtitle={`Due: ${ispProfile.currencySymbol}${stats.totalDue.toLocaleString()}`}
          icon={<AlertCircle className="w-5 h-5" />}
          colorTheme="rose"
          onClick={canViewCustomers ? onFilterDue : undefined}
        />

        <StatCard
          title="Monthly Revenue"
          value={`${ispProfile.currencySymbol}${stats.totalCollected.toLocaleString()}`}
          subtitle={`Target: ${ispProfile.currencySymbol}${totalBilled.toLocaleString()}`}
          icon={<CreditCard className="w-5 h-5" />}
          colorTheme="blue"
          onClick={canViewPayments ? () => onNavigateTab('payments') : undefined}
        />

        <StatCard
          title="New Added"
          value={stats.newThisMonth}
          subtitle="This billing cycle"
          icon={<TrendingUp className="w-5 h-5" />}
          colorTheme="purple"
          onClick={canViewCustomers ? () => onNavigateTab('customers') : undefined}
        />
      </div>

      {/* Visual Analytics & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* Revenue & Billing Collection Progress (7 Cols) */}
        <div className={`lg:col-span-7 rounded-2xl p-5 sm:p-6 space-y-5 border shadow-xl ${cardClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Monthly Billing Progress
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Overview of current month subscription collection</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40">
              {collectionRate}% Collected
            </span>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>Collected: <strong className="text-emerald-400">{ispProfile.currencySymbol}{totalCollected.toLocaleString()}</strong></span>
              <span>Due: <strong className="text-rose-400">{ispProfile.currencySymbol}{stats.totalDue.toLocaleString()}</strong></span>
              <span>Target: <strong className="text-slate-200">{ispProfile.currencySymbol}{totalBilled.toLocaleString()}</strong></span>
            </div>
            <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700/80 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/50"
                style={{ width: `${Math.min(100, Math.max(5, collectionRate))}%` }}
              />
            </div>
          </div>

          {/* 4 Metrics summary box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">Total Monthly Bill</span>
              <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                {ispProfile.currencySymbol}{totalBilled.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">Paid Subscribers</span>
              <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5 block">
                {stats.activeCustomers - stats.dueCustomers} Users
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">Due Subscribers</span>
              <span className="text-sm font-bold text-rose-400 font-mono mt-0.5 block">
                {stats.dueCustomers} Users
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">Avg. Plan ARPU</span>
              <span className="text-sm font-bold text-cyan-400 font-mono mt-0.5 block">
                {ispProfile.currencySymbol}{customers.length > 0 ? Math.round(totalBilled / customers.length) : 0}
              </span>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-cyan-200">
            <span>Standard billing cycle cutoff date is 7th of every month.</span>
            <button
              onClick={onFilterDue}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 shrink-0"
            >
              View Due List <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Package Distribution (5 Cols) */}
        <div className={`lg:col-span-5 rounded-2xl p-5 sm:p-6 space-y-4 border shadow-xl ${cardClass}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Wifi className="w-4 h-4 text-cyan-400" />
              Package Distribution
            </h2>
            <span className="text-xs text-slate-400 font-mono">By Subscribers</span>
          </div>

          <div className="space-y-3 pt-2">
            {Object.entries(packageDistribution).map(([pkgName, count]) => {
              const percentage = Math.round((count / (customers.length || 1)) * 100);
              return (
                <div key={pkgName} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-medium">{pkgName}</span>
                    <span className="text-cyan-400 font-mono font-bold">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full shadow-xs"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Configure bandwidth plans</span>
            <button
              onClick={() => onNavigateTab('settings')}
              className="text-cyan-400 font-bold hover:underline"
            >
              Package Settings
            </button>
          </div>
        </div>

      </div>

      {/* Recent Customer Connections Section */}
      <div className={`rounded-2xl overflow-hidden border shadow-xl ${cardClass}`}>
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Recent Customer Connections
            </h2>
            <p className="text-xs text-slate-400 hidden sm:block">Recently onboarded and active WiFi subscriber lines</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddCustomer}
              className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 px-3 py-1.5 rounded-lg transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Customer
            </button>
            <button
              onClick={() => onNavigateTab('customers')}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              View All ({customers.length}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-800/60">
          {customers.length > 0 ? (
            customers.slice(0, 5).map((customer) => (
              <div
                key={customer.id}
                onClick={() => onSelectCustomer(customer)}
                className="p-3.5 space-y-2.5 hover:bg-slate-800/40 active:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">{customer.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[11px] font-semibold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
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
                    {customer.dueAmount > 0 ? (
                      <span className="text-rose-400 font-mono font-bold ml-1">
                        (Due: {ispProfile.currencySymbol}{customer.dueAmount})
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-300">No customer connections yet</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Click &ldquo;Add Customer&rdquo; to register your first WiFi subscriber.</p>
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">UID</th>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">Mobile</th>
                <th className="py-3.5 px-4">Package</th>
                <th className="py-3.5 px-4">Monthly Bill</th>
                <th className="py-3.5 px-4">Due</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {customers.length > 0 ? (
                customers.slice(0, 5).map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => onSelectCustomer(customer)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                      {customer.uid}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {customer.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {customer.mobile}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-200">{customer.packageName}</span>
                      <span className="text-slate-400 font-mono ml-1 text-[11px]">({customer.speed})</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-200">
                      {ispProfile.currencySymbol}{customer.monthlyBill}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">
                      {customer.dueAmount > 0 ? (
                        <span className="text-rose-400">{ispProfile.currencySymbol}{customer.dueAmount}</span>
                      ) : (
                        <span className="text-emerald-400">৳0</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={customer.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCustomer(customer);
                        }}
                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-300">No customer connections yet</p>
                    <p className="text-xs text-slate-500 mt-1">Register new subscribers using the &ldquo;Add Customer&rdquo; button above.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Payments Section */}
      <div className={`rounded-2xl overflow-hidden border shadow-xl ${cardClass}`}>
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              Latest Payment Receipts
            </h2>
            <p className="text-xs text-slate-400 hidden sm:block">Live transaction ledger stream</p>
          </div>

          {canViewPayments && (
            <button
              onClick={() => onNavigateTab('payments')}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 hover:text-emerald-200 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/40 px-3 py-1.5 rounded-lg transition-colors"
            >
              View All ({payments.length}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-800/60">
          {payments.slice(0, 5).map((pay) => (
            <div key={pay.id} className="p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                  {pay.receiptNumber}
                </span>
                <span className="font-mono font-extrabold text-sm text-emerald-400">
                  {ispProfile.currencySymbol}{pay.amount}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-semibold text-white">{pay.customerName} ({pay.customerUid})</span>
                <span className="text-slate-400 font-mono text-[11px]">{pay.paymentDate}</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Method: <strong className="text-slate-200">{pay.paymentMethod}</strong></span>
                {pay.transactionId && <span>Trx: <strong className="font-mono text-slate-200">{pay.transactionId}</strong></span>}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Receipt #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Trx ID</th>
                <th className="py-3.5 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payments.slice(0, 5).map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    {pay.receiptNumber}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-white">{pay.customerName}</span>
                    <span className="text-slate-400 font-mono ml-1 text-[11px]">({pay.customerUid})</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-extrabold text-emerald-400">
                    {ispProfile.currencySymbol}{pay.amount}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-medium text-slate-300">
                      {pay.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {pay.transactionId || 'N/A'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {pay.paymentDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
