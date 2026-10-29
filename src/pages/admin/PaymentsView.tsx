import React, { useState, useMemo } from 'react';
import { PaymentRecord } from '../../types';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { useReseller } from '../../context/ResellerContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { exportPaymentsToCSV } from '../../utils/exportUtils';
import { doesCustomerBelongToReseller } from '../../utils/resellerIsolation';
import { EditPaymentModal } from '../../components/EditPaymentModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { 
  CreditCard, 
  Search, 
  Download, 
  Printer, 
  Plus, 
  Smartphone,
  Banknote,
  Building2,
  X,
  Edit2,
  Trash2,
  RotateCcw,
  Receipt,
  Store,
  Wallet
} from 'lucide-react';

interface PaymentsViewProps {
  onOpenRecordPayment: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onOpenRecordPayment }) => {
  const { payments, customers, ispProfile, deletePayment, clearAllPayments } = useCustomer();
  const { isReseller, user } = useAuth();
  const { resellers } = useReseller();
  const { isDark } = useTheme();
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('All');
  const [resellerFilter, setResellerFilter] = useState<string>('All');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);

  // Edit and Delete states
  const [paymentToEdit, setPaymentToEdit] = useState<PaymentRecord | null>(null);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);

  const [paymentToDelete, setPaymentToDelete] = useState<PaymentRecord | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [isClearAllOpen, setIsClearAllOpen] = useState<boolean>(false);
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);

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
      }
    );
  }, [isReseller, user, resellers]);

  // Strict Reseller Multi-Tenant Isolation: Only allow payments from reseller's customers
  const basePayments = useMemo(() => {
    if (isReseller || user?.role === 'Reseller') {
      const myCustomers = customers.filter((c) => doesCustomerBelongToReseller(c, currentReseller));
      const myCustIds = new Set(myCustomers.map((c) => c.id));
      const myCustUids = new Set(myCustomers.map((c) => (c.uid || '').toLowerCase()));

      return payments.filter(
        (p) =>
          (p.resellerId && currentReseller?.id && p.resellerId === currentReseller.id) ||
          (p.resellerId && currentReseller?.code && p.resellerId === currentReseller.code) ||
          (p.resellerName && currentReseller?.name && p.resellerName === currentReseller.name) ||
          (p.customerId && myCustIds.has(p.customerId)) ||
          (p.customerUid && myCustUids.has((p.customerUid || '').toLowerCase()))
      );
    }
    return payments;
  }, [payments, customers, isReseller, user, currentReseller]);

  // Method breakdown totals strictly scoped
  const methodTotals = useMemo(() => {
    return basePayments.reduce((acc, p) => {
      acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + (p.amount || 0);
      return acc;
    }, {} as Record<string, number>);
  }, [basePayments]);

  const totalCollected = basePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    let result = [...basePayments];

    // Reseller filtering for Admin only
    if (!isReseller && user?.role !== 'Reseller' && resellerFilter !== 'All') {
      if (resellerFilter === 'main') {
        result = result.filter((p) => !p.resellerId);
      } else {
        result = result.filter((p) => p.resellerId === resellerFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          (p.receiptNumber || '').toLowerCase().includes(q) ||
          (p.customerName || '').toLowerCase().includes(q) ||
          (p.customerUid || '').toLowerCase().includes(q) ||
          (p.customerMobile || '').includes(q) ||
          (p.resellerName && p.resellerName.toLowerCase().includes(q)) ||
          (p.transactionId && p.transactionId.toLowerCase().includes(q))
      );
    }

    if (methodFilter !== 'All') {
      result = result.filter((p) => p.paymentMethod === methodFilter);
    }

    return result;
  }, [basePayments, isReseller, user, resellerFilter, searchQuery, methodFilter]);

  const handlePrintReceipt = (payment: PaymentRecord) => {
    setSelectedReceipt(payment);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleOpenEdit = (payment: PaymentRecord) => {
    if (isReseller || user?.role === 'Reseller') {
      const isOwned = basePayments.some((p) => p.id === payment.id);
      if (!isOwned) {
        addToast('error', 'অননুমোদিত', 'অন্য রিসেলার এর পেমেন্ট এডিট করার অনুমতি নেই।');
        return;
      }
    }
    setPaymentToEdit(payment);
    setIsEditOpen(true);
  };

  const handleOpenDelete = (payment: PaymentRecord) => {
    if (isReseller || user?.role === 'Reseller') {
      const isOwned = basePayments.some((p) => p.id === payment.id);
      if (!isOwned) {
        addToast('error', 'অননুমোদিত', 'অন্য রিসেলার এর পেমেন্ট ডিলিট করার অনুমতি নেই।');
        return;
      }
    }
    setPaymentToDelete(payment);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!paymentToDelete) return;
    if (isReseller || user?.role === 'Reseller') {
      const isOwned = basePayments.some((p) => p.id === paymentToDelete.id);
      if (!isOwned) {
        addToast('error', 'অননুমোদিত', 'অন্য রিসেলার এর পেমেন্ট ডিলিট করার অনুমতি নেই।');
        return;
      }
    }
    setIsDeleting(true);
    try {
      await deletePayment(paymentToDelete.id);
      addToast('success', 'পেমেন্ট মুছে ফেলা হয়েছে', 'পেমেন্ট রেকর্ডটি সফলভাবে ডিলিট করা হয়েছে।');
      setIsDeleteOpen(false);
      setPaymentToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmClearAll = async () => {
    setIsClearingAll(true);
    try {
      await clearAllPayments();
      setIsClearAllOpen(false);
    } finally {
      setIsClearingAll(false);
    }
  };

  const cardClass = isDark
    ? 'glass-panel-dark border-slate-800 text-slate-100'
    : 'glass-panel-colorful border-purple-500/25 text-slate-100';

  const inputClass = isDark
    ? 'bg-slate-900/80 border-slate-700/80 focus:bg-slate-900 focus:border-emerald-400 text-white placeholder-slate-500'
    : 'bg-slate-900/80 border-purple-500/30 focus:bg-slate-900 focus:border-emerald-400 text-white placeholder-slate-500';

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            Payment Records & Billing Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track subscription collections, manage payment slips, edit records, and print official vouchers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {!isReseller && user?.role !== 'Reseller' && payments.length > 0 && (
            <button
              onClick={() => setIsClearAllOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold transition-colors min-h-[40px] border border-rose-500/40"
              title="Clear all payment records to 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Reset to 0</span>
            </button>
          )}

          <button
            onClick={() => exportPaymentsToCSV(filteredPayments)}
            disabled={filteredPayments.length === 0}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors min-h-[40px] disabled:opacity-40 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Export CSV
          </button>

          <button
            onClick={() => window.print()}
            disabled={payments.length === 0}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors min-h-[40px] disabled:opacity-40 border border-slate-700"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xs:inline">Print</span>
          </button>

          <button
            onClick={onOpenRecordPayment}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
        </div>
      </div>

      {/* Payment Method Cards Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className={`${cardClass} rounded-2xl p-4 space-y-1 border shadow-xl`}>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Collections</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {ispProfile.currencySymbol}{totalCollected.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 block">{payments.length} Transaction Slips</span>
        </div>

        <div className={`${cardClass} rounded-2xl p-4 space-y-1 border shadow-xl`}>
          <span className="text-[11px] font-bold text-pink-400 uppercase tracking-wider block flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5" /> bKash & Nagad
          </span>
          <p className="text-xl sm:text-2xl font-black text-pink-400 font-mono">
            {ispProfile.currencySymbol}{((methodTotals['bKash'] || 0) + (methodTotals['Nagad'] || 0)).toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 block">Mobile MFS Gateways</span>
        </div>

        <div className={`${cardClass} rounded-2xl p-4 space-y-1 border shadow-xl`}>
          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block flex items-center gap-1">
            <Banknote className="w-3.5 h-3.5" /> Cash Handover
          </span>
          <p className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
            {ispProfile.currencySymbol}{(methodTotals['Cash'] || 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 block">Direct cash collections</span>
        </div>

        <div className={`${cardClass} rounded-2xl p-4 space-y-1 border shadow-xl`}>
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Bank & Card
          </span>
          <p className="text-xl sm:text-2xl font-black text-blue-400 font-mono">
            {ispProfile.currencySymbol}{(methodTotals['Bank Transfer'] || 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 block">Direct account deposits</span>
        </div>
      </div>

      {/* Reseller Banner if Reseller Logged in */}
      {isReseller && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-emerald-300 font-semibold flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400 shrink-0" />
            রিসেলার ফিল্টার সক্রিয়: আপনার গ্রাহকদের মোট {filteredPayments.length} টি পেমেন্ট রেকর্ড
          </span>
          <span className="text-slate-300 font-mono text-[11px]">
            মোট আদায়: <strong className="text-emerald-400">৳{filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('en-IN')}</strong>
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className={`${cardClass} rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-center justify-between gap-4 border shadow-xl`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full lg:w-auto text-xs">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Receipt, Customer, Mobile, Trx ID..."
              className={`w-full pl-10 pr-8 py-2.5 rounded-xl border text-sm sm:text-xs outline-none transition-colors ${inputClass}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {!isReseller && (
            <div>
              <select
                value={resellerFilter}
                onChange={(e) => setResellerFilter(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm sm:text-xs outline-none transition-colors font-medium ${inputClass}`}
              >
                <option value="All" className="bg-slate-900 text-white">সকল রিসেলার ও অফিস</option>
                <option value="main" className="bg-slate-900 text-cyan-400">মেইন অফিস (ডাইরেক্ট)</option>
                {resellers.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-emerald-400">
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm sm:text-xs outline-none transition-colors font-medium ${inputClass}`}
            >
              <option value="All" className="bg-slate-900 text-white">All Payment Methods</option>
              <option value="Reseller Balance" className="bg-slate-900 text-emerald-400">Reseller Balance (ওয়ালেট)</option>
              <option value="bKash" className="bg-slate-900 text-pink-400">bKash</option>
              <option value="Nagad" className="bg-slate-900 text-orange-400">Nagad</option>
              <option value="Rocket" className="bg-slate-900 text-purple-400">Rocket</option>
              <option value="Cash" className="bg-slate-900 text-cyan-400">Cash</option>
              <option value="Bank Transfer" className="bg-slate-900 text-blue-400">Bank Transfer</option>
              <option value="Other" className="bg-slate-900 text-slate-300">Other</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing <strong className="text-white">{filteredPayments.length}</strong> of{' '}
          <strong className="text-white">{basePayments.length}</strong> receipts
        </div>
      </div>

      {/* Payments Table & Mobile Cards */}
      <div className={`${cardClass} rounded-2xl overflow-hidden border shadow-xl`}>
        
        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-800/60">
          {filteredPayments.length > 0 ? (
            filteredPayments.map((pay) => (
              <div key={pay.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                      {pay.receiptNumber}
                    </span>
                    <h3 className="font-bold text-white text-sm mt-1">{pay.customerName}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="font-mono text-cyan-400 font-semibold">{pay.customerUid}</span>
                      <span>•</span>
                      <span className="font-mono">{pay.customerMobile}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-extrabold text-base text-emerald-400 block">
                      {ispProfile.currencySymbol}{pay.amount}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-medium text-slate-300 text-[10px] inline-block mt-0.5">
                      {pay.paymentMethod}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <strong className="text-slate-200 font-mono">{pay.paymentDate}</strong>
                  </div>
                  {pay.transactionId && (
                    <div className="flex justify-between">
                      <span>Trx ID:</span>
                      <strong className="text-cyan-300 font-mono">{pay.transactionId}</strong>
                    </div>
                  )}
                  {pay.notes && (
                    <div className="flex justify-between">
                      <span>Notes:</span>
                      <span className="text-slate-300 truncate max-w-[200px]">{pay.notes}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <button
                    onClick={() => handlePrintReceipt(pay)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors min-h-[38px] border border-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5 text-cyan-400" />
                    Slip
                  </button>

                  <button
                    onClick={() => handleOpenEdit(pay)}
                    className="px-3 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors min-h-[38px] border border-cyan-500/40"
                    title="Edit Payment"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>

                  <button
                    onClick={() => handleOpenDelete(pay)}
                    className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors min-h-[38px] border border-rose-500/40"
                    title="Delete Payment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">No Payment Records Found</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  {searchQuery || methodFilter !== 'All' 
                    ? 'No records match your active search filter.'
                    : 'The payment ledger is currently at 0. Click below to record a customer payment.'}
                </p>
              </div>
              <button
                onClick={onOpenRecordPayment}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Record Payment
              </button>
            </div>
          )}
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Receipt #</th>
                <th className="py-3.5 px-4">Customer Name & UID</th>
                <th className="py-3.5 px-4">Mobile</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Trx ID / Ref</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Notes</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {pay.receiptNumber}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{pay.customerName}</div>
                      <span className="font-mono text-cyan-400 text-[11px]">{pay.customerUid}</span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      {pay.customerMobile}
                    </td>

                    <td className="py-3 px-4 font-mono font-extrabold text-emerald-400 text-sm">
                      {ispProfile.currencySymbol}{pay.amount}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-medium text-slate-300 text-[11px]">
                        {pay.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      {pay.transactionId || <span className="text-slate-500">N/A</span>}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      {pay.paymentDate}
                    </td>

                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                      {pay.notes || '-'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handlePrintReceipt(pay)}
                          title="Print Official Receipt Slip"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
                        >
                          <Printer className="w-3.5 h-3.5 text-cyan-400" />
                          Slip
                        </button>

                        <button
                          onClick={() => handleOpenEdit(pay)}
                          title="Edit Payment Record"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-semibold transition-colors border border-cyan-500/40"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>

                        <button
                          onClick={() => handleOpenDelete(pay)}
                          title="Delete Payment Record"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold transition-colors border border-rose-500/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">No Payment Records in Ledger</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          {searchQuery || methodFilter !== 'All' 
                            ? 'No payment receipts found matching your search filter.'
                            : 'All initial payment records have been set to 0. Click below to add your first payment receipt.'}
                        </p>
                      </div>
                      <button
                        onClick={onOpenRecordPayment}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Record First Payment
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Payment Modal */}
      <EditPaymentModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setPaymentToEdit(null);
        }}
        payment={paymentToEdit}
      />

      {/* Delete Payment Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setPaymentToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title={`Delete Payment Receipt: ${paymentToDelete?.receiptNumber || ''}`}
        message={`Are you sure you want to delete this payment record of ${ispProfile.currencySymbol}${paymentToDelete?.amount} for ${paymentToDelete?.customerName} (${paymentToDelete?.customerUid})?`}
        confirmText="Yes, Delete Payment"
        isLoading={isDeleting}
      />

      {/* Clear All Payments Confirmation */}
      <ConfirmModal
        isOpen={isClearAllOpen}
        onClose={() => setIsClearAllOpen(false)}
        onConfirm={handleConfirmClearAll}
        title="Reset All Payment Records to 0"
        message="Are you sure you want to clear all payment records and reset the billing ledger to 0? This will remove all existing transaction slips from the ledger."
        confirmText="Yes, Clear All to 0"
        isLoading={isClearingAll}
      />

      {/* Printable Voucher Overlay Modal (Print Slip) */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-2xl border border-slate-800 text-xs space-y-4">
            
            {/* Close */}
            <button
              onClick={() => setSelectedReceipt(null)}
              className="no-print absolute top-4 right-4 p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Receipt Header */}
            <div className="text-center border-b pb-3 border-slate-800">
              <h2 className="text-lg font-black uppercase tracking-tight text-white">{ispProfile.companyName}</h2>
              <p className="text-[11px] text-slate-400">{ispProfile.tagline}</p>
              <p className="text-[10px] text-slate-500">Helpline: {ispProfile.emergencyHotline} | Support: {ispProfile.supportPhone}</p>
              <div className="mt-2 inline-block px-3 py-0.5 bg-emerald-950/80 rounded-md text-xs font-mono font-bold text-emerald-300 border border-emerald-500/40">
                PAYMENT MONEY RECEIPT
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Receipt No:</span>
                <strong className="font-mono text-emerald-400">{selectedReceipt.receiptNumber}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Date:</span>
                <strong className="font-mono text-slate-200">{selectedReceipt.paymentDate}</strong>
              </div>
            </div>

            {/* Customer info */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer Name:</span>
                <strong className="text-white">{selectedReceipt.customerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer UID:</span>
                <strong className="font-mono text-cyan-400">{selectedReceipt.customerUid}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mobile Number:</span>
                <strong className="font-mono text-slate-200">{selectedReceipt.customerMobile}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method:</span>
                <strong className="text-slate-200">{selectedReceipt.paymentMethod}</strong>
              </div>
              {selectedReceipt.transactionId && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Trx ID:</span>
                  <strong className="font-mono text-cyan-300">{selectedReceipt.transactionId}</strong>
                </div>
              )}
            </div>

            {/* Amount Box */}
            <div className="p-3 bg-emerald-950/60 rounded-xl border border-emerald-500/40 text-center">
              <span className="text-xs text-emerald-300 block uppercase font-bold">Total Amount Paid</span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {ispProfile.currencySymbol}{selectedReceipt.amount.toLocaleString()}
              </span>
            </div>

            {selectedReceipt.notes && (
              <p className="text-[10px] text-slate-400 italic">
                Remarks: {selectedReceipt.notes}
              </p>
            )}

            {/* Signatures */}
            <div className="pt-6 flex justify-between text-[10px] text-slate-400 border-t border-slate-800">
              <div>
                <div className="border-t border-slate-600 w-24 mb-1" />
                <span>Customer Sign</span>
              </div>
              <div className="text-right">
                <div className="border-t border-slate-600 w-24 mb-1 ml-auto" />
                <span>Authorized Officer</span>
              </div>
            </div>

            {/* Actions for Modal */}
            <div className="no-print pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors border border-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-cyan-500/20"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Voucher
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
