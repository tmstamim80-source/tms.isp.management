import React, { useMemo } from 'react';
import { Reseller } from '../../types';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { useReseller } from '../../context/ResellerContext';
import { useTheme } from '../../context/ThemeContext';
import { exportCustomersToCSV } from '../../utils/exportUtils';
import { doesCustomerBelongToReseller } from '../../utils/resellerIsolation';
import { 
  BarChart3, 
  Download, 
  Printer, 
  MapPin, 
  Wifi, 
  AlertCircle, 
  CheckCircle2, 
  Store,
  Wallet,
  FileText
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { customers, stats, ispProfile } = useCustomer();
  const { isReseller, user } = useAuth();
  const { resellers, transactions } = useReseller();
  const { isDark } = useTheme();

  // Active reseller resolved safely
  const currentReseller = useMemo<Reseller | null>(() => {
    if (!isReseller && user?.role !== 'Reseller') return null;
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
      name: user?.resellerName || user?.username || 'Reseller Admin',
      ownerName: user?.username || 'Reseller Admin',
      phone: user?.phone || '',
      area: '',
      balance: 0,
      commissionRate: 15,
      billingType: 'prepaid',
      status: 'Active',
      username: user?.accountUsername || user?.username || 'reseller',
      password: '',
      createdAt: new Date().toISOString(),
    };
  }, [isReseller, user, resellers]);

  // Strict Reseller Multi-Tenant Isolation: Filter customers if logged in as Reseller
  const displayCustomers = useMemo(() => {
    if (isReseller || user?.role === 'Reseller') {
      return customers.filter((c) => doesCustomerBelongToReseller(c, currentReseller));
    }
    return customers;
  }, [customers, isReseller, user, currentReseller]);

  // Area statistics
  const areaStats = useMemo(() => {
    const map: Record<string, { count: number; active: number; totalBill: number; totalDue: number }> = {};
    displayCustomers.forEach((c) => {
      const area = c.area || 'Main Coverage Area';
      if (!map[area]) {
        map[area] = { count: 0, active: 0, totalBill: 0, totalDue: 0 };
      }
      map[area].count += 1;
      if (c.status === 'Active') map[area].active += 1;
      map[area].totalBill += c.monthlyBill || 0;
      map[area].totalDue += c.dueAmount || 0;
    });
    return Object.entries(map).map(([area, data]) => ({ area, ...data }));
  }, [displayCustomers]);

  // Package statistics
  const packageStats = useMemo(() => {
    const map: Record<string, { count: number; totalRevenue: number; speed: string }> = {};
    displayCustomers.forEach((c) => {
      if (!map[c.packageName]) {
        map[c.packageName] = { count: 0, totalRevenue: 0, speed: c.speed };
      }
      map[c.packageName].count += 1;
      map[c.packageName].totalRevenue += c.monthlyBill || 0;
    });
    return Object.entries(map).map(([packageName, data]) => ({ packageName, ...data }));
  }, [displayCustomers]);

  const dueCustomers = displayCustomers.filter((c) => c.dueAmount > 0);
  const totalBilled = displayCustomers.reduce((sum, c) => sum + (c.monthlyBill || 0), 0);
  const totalDueAmount = dueCustomers.reduce((sum, c) => sum + (c.dueAmount || 0), 0);
  const activeCount = displayCustomers.filter(c => c.status === 'Active').length;

  const cardClass = isDark
    ? 'glass-panel-dark border-slate-800 text-slate-100'
    : 'glass-panel-colorful border-purple-500/25 text-slate-100';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            Financial Reports & Operational Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Area distribution, subscriber density, package profitability, and due recovery metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => exportCustomersToCSV(displayCustomers, isReseller ? `${currentReseller?.code || 'reseller'}-audit.csv` : 'full-isp-customer-audit.csv')}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors min-h-[40px] border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            {isReseller ? 'রিসেলার অডিট CSV' : 'Full Audit CSV'}
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors min-h-[40px] border border-slate-700"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            Print Report
          </button>
        </div>
      </div>

      {/* Reseller Banner if Reseller Logged in */}
      {isReseller && currentReseller && (
        <div className={`p-4 rounded-2xl border shadow-xl ${cardClass} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{currentReseller.name}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                  {currentReseller.code}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                কমিশন হার: <strong className="text-emerald-400">{currentReseller.commissionRate || 15}%</strong> | 
                ওয়ালেট ব্যালেন্স: <strong className="text-emerald-400 font-mono">৳{currentReseller.balance.toLocaleString('en-IN')}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300 font-mono">
              মোট বরাদ্দকৃত গ্রাহক: <strong className="text-cyan-400 font-bold">{displayCustomers.length} জন</strong>
            </span>
          </div>
        </div>
      )}

      {/* High-level summary scorecard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className={`${cardClass} rounded-2xl p-4 sm:p-5 space-y-1 border shadow-xl`}>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Billed Capacity</span>
          <p className="text-xl sm:text-2xl font-black text-white font-mono">
            {ispProfile.currencySymbol}{totalBilled.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 block">Monthly subscriber value</span>
        </div>

        <div className={`${cardClass} rounded-2xl p-4 sm:p-5 space-y-1 border shadow-xl`}>
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Total Collections</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {ispProfile.currencySymbol}{(isReseller ? (totalBilled - totalDueAmount) : stats.totalCollected).toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 block">Collected in cycle</span>
        </div>

        <div className={`${cardClass} rounded-2xl p-4 sm:p-5 space-y-1 border shadow-xl`}>
          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">Outstanding Deficit</span>
          <p className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
            {ispProfile.currencySymbol}{totalDueAmount.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 block">{dueCustomers.length} unpaid users</span>
        </div>

        <div className={`${cardClass} rounded-2xl p-4 sm:p-5 space-y-1 border shadow-xl`}>
          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">Utilization</span>
          <p className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
            {Math.round((activeCount / (displayCustomers.length || 1)) * 100)}%
          </p>
          <span className="text-[11px] text-slate-500 block">{activeCount} of {displayCustomers.length} active</span>
        </div>
      </div>

      {/* Area-wise breakdown */}
      <div className={`${cardClass} rounded-2xl p-4 sm:p-6 space-y-4 border shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              Area & Coverage Zone Breakdown
            </h2>
            <p className="text-xs text-slate-400">Subscriber density and regional billing performance</p>
          </div>
          <span className="text-xs font-mono text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-500/40 font-semibold">
            {areaStats.length} Zones
          </span>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-800/60">
          {areaStats.map((item) => {
            const recoveryRate = item.totalBill > 0 ? Math.round(((item.totalBill - item.totalDue) / item.totalBill) * 100) : 100;
            return (
              <div key={item.area} className="py-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    {item.area}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
                    {item.active} Online / {item.count} Total
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Monthly Value: <strong className="text-white font-mono">{ispProfile.currencySymbol}{item.totalBill.toLocaleString()}</strong></span>
                  <span>Due: <strong className="text-rose-400 font-mono">{ispProfile.currencySymbol}{item.totalDue.toLocaleString()}</strong></span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full ${recoveryRate > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.max(5, recoveryRate)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-300">{recoveryRate}% recovered</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Area / Zone</th>
                <th className="py-3 px-4">Subscribers</th>
                <th className="py-3 px-4">Active Lines</th>
                <th className="py-3 px-4">Monthly Value</th>
                <th className="py-3 px-4">Total Due</th>
                <th className="py-3 px-4">Recovery Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {areaStats.map((item) => {
                const recoveryRate = item.totalBill > 0 ? Math.round(((item.totalBill - item.totalDue) / item.totalBill) * 100) : 100;
                return (
                  <tr key={item.area} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      {item.area}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-300">
                      {item.count} Users
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                      {item.active} Online
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {ispProfile.currencySymbol}{item.totalBill.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-400">
                      {item.totalDue > 0 ? `${ispProfile.currencySymbol}${item.totalDue.toLocaleString()}` : '৳0'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full ${recoveryRate > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.max(5, recoveryRate)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-300">{recoveryRate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Package Profitability & Due Recovery List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Package Table */}
        <div className={`${cardClass} rounded-2xl p-4 sm:p-6 space-y-4 border shadow-xl`}>
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Wifi className="w-4 h-4 text-blue-400" />
              Package Performance
            </h2>
            <span className="text-xs text-slate-400">Gross Value</span>
          </div>

          <div className="space-y-2.5">
            {packageStats.map((pkg) => (
              <div key={pkg.packageName} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">{pkg.packageName}</span>
                    <span className="text-cyan-400 font-mono font-semibold ml-2">({pkg.speed})</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">
                    {ispProfile.currencySymbol}{pkg.totalRevenue.toLocaleString()} / mo
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{pkg.count} Subscribers connected</span>
                  <span>{Math.round((pkg.count / (customers.length || 1)) * 100)}% market share</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Due Defaulters Alert Table */}
        <div className={`${cardClass} rounded-2xl p-4 sm:p-6 space-y-4 border shadow-xl`}>
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              Unpaid Due Recovery Queue
            </h2>
            <button
              onClick={() => exportCustomersToCSV(dueCustomers, 'wifi-due-customers.csv')}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 hover:underline"
            >
              Export Due List
            </button>
          </div>

          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {dueCustomers.length > 0 ? (
              dueCustomers.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{c.name}</span>
                      <span className="font-mono text-[11px] text-cyan-400 font-semibold">({c.uid})</span>
                    </div>
                    <span className="font-mono text-slate-400 text-[11px] block mt-0.5">{c.mobile}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-rose-400 font-mono font-bold text-sm block">
                      {ispProfile.currencySymbol}{c.dueAmount}
                    </span>
                    <span className="text-[10px] text-slate-400">Bill: {ispProfile.currencySymbol}{c.monthlyBill}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-emerald-400 text-xs flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8" />
                <span>All customers are fully paid! No outstanding dues.</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
