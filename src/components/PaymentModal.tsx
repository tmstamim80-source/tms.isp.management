import React, { useState, useEffect, useMemo } from 'react';
import { Customer } from '../types';
import { useCustomer } from '../context/CustomerContext';
import { useReseller } from '../context/ResellerContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { doesCustomerBelongToReseller } from '../utils/resellerIsolation';
import { X, CreditCard, CheckCircle2, Wallet, Store, AlertTriangle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomer?: Customer | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  initialCustomer,
}) => {
  const { customers, recordPayment, ispProfile } = useCustomer();
  const { resellers, deductResellerBalanceForBill } = useReseller();
  const { user, isReseller } = useAuth();
  const { addToast } = useToast();
  const { isDark } = useTheme();

  const isResellerScope = isReseller || user?.role === 'Reseller';

  // Active reseller resolved safely
  const currentReseller = useMemo(() => {
    if (!isResellerScope) return null;
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
        phone: user?.phone || '01900000000',
        area: 'Local Area',
        balance: 0,
        commissionRate: 15,
        status: 'Active' as const,
        billingType: 'prepaid' as const,
        password: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }, [isResellerScope, user, resellers]);

  // Strictly isolated available customers
  const availableCustomers = useMemo(() => {
    if (isResellerScope) {
      return customers.filter((c) => doesCustomerBelongToReseller(c, currentReseller));
    }
    return customers;
  }, [customers, isResellerScope, currentReseller]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Bank Transfer' | 'Other' | 'Reseller Balance'>('bKash');
  const [transactionId, setTransactionId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    if (initialCustomer && (!isResellerScope || doesCustomerBelongToReseller(initialCustomer, currentReseller))) {
      setSelectedCustomerId(initialCustomer.id);
      setAmount(initialCustomer.dueAmount > 0 ? initialCustomer.dueAmount : initialCustomer.monthlyBill);
    } else if (availableCustomers.length > 0) {
      setSelectedCustomerId(availableCustomers[0].id);
      setAmount(availableCustomers[0].dueAmount > 0 ? availableCustomers[0].dueAmount : availableCustomers[0].monthlyBill);
    } else {
      setSelectedCustomerId('');
      setAmount(0);
    }

    setPaymentDate(new Date().toISOString().substring(0, 10));
    setTransactionId('');
    setNotes('');

    if (isResellerScope) {
      setPaymentMethod('Reseller Balance');
    }
  }, [initialCustomer, isOpen, availableCustomers, isResellerScope, currentReseller]);

  const selectedCustomer = availableCustomers.find((c) => c.id === selectedCustomerId);

  // Associated Reseller for this customer
  const customerResellerId = selectedCustomer?.resellerId || (isResellerScope && (currentReseller?.id || user?.resellerId) ? (currentReseller?.id || user?.resellerId) : undefined);
  const customerReseller = customerResellerId ? resellers.find(r => r.id === customerResellerId || r.code === customerResellerId) || currentReseller : currentReseller;

  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    const cust = availableCustomers.find((c) => c.id === custId);
    if (cust) {
      setAmount(cust.dueAmount > 0 ? cust.dueAmount : cust.monthlyBill);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      addToast('error', 'ত্রুটি', 'দয়া করে একজন গ্রাহক নির্বাচন করুন।');
      return;
    }

    if (isResellerScope && !doesCustomerBelongToReseller(selectedCustomer, currentReseller)) {
      addToast('error', 'অননুমোদিত', 'অন্য রিসেলারের গ্রাহকের বিল গ্রহণ করা যাবে না।');
      return;
    }

    if (amount <= 0) {
      addToast('error', 'অকার্যকর পরিমাণ', 'বিল পরিশোধের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে।');
      return;
    }

    setIsSubmitting(true);
    try {
      // If payment is via Reseller Balance, deduct from reseller wallet
      if (paymentMethod === 'Reseller Balance') {
        const targetResellerObj = customerReseller || currentReseller;
        if (!targetResellerObj || !targetResellerObj.id) {
          addToast('error', 'রিসেলার ত্রুটি', 'এই গ্রাহকের কোনো নির্ধারিত রিসেলার পাওয়া যায়নি।');
          setIsSubmitting(false);
          return;
        }

        const deductRes = await deductResellerBalanceForBill(
          targetResellerObj.id,
          Number(amount),
          selectedCustomer.uid,
          selectedCustomer.name
        );

        if (!deductRes.success) {
          addToast('error', 'ব্যালেন্স অপ্রতুল', deductRes.error || 'রিসেলার ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই।');
          setIsSubmitting(false);
          return;
        }
      }

      await recordPayment({
        customerId: selectedCustomer.id,
        customerUid: selectedCustomer.uid,
        customerName: selectedCustomer.name,
        customerMobile: selectedCustomer.mobile,
        amount: Number(amount),
        paymentMethod,
        transactionId: transactionId.trim() || undefined,
        paymentDate,
        notes: notes.trim() || (paymentMethod === 'Reseller Balance' ? `রিসেলার ওয়ালেট (${customerReseller?.name || currentReseller?.name}) থেকে পরিশোধিত` : undefined),
        resellerId: customerReseller?.id || currentReseller?.id,
        resellerName: customerReseller?.name || currentReseller?.name,
        isResellerRecharge: paymentMethod === 'Reseller Balance',
      });

      addToast(
        'success', 
        'বিল গ্রহণ সম্পন্ন', 
        `${selectedCustomer.name} (${selectedCustomer.uid}) এর বিল ৳${amount} সফলভাবে গ্রহণ করা হয়েছে।`
      );
      onClose();
    } catch (err: any) {
      addToast('error', 'Payment Failed', err.message || 'Could not record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalContainerClass = isDark
    ? 'bg-slate-900/95 border-slate-800 text-slate-100'
    : 'glass-panel-colorful border-purple-500/30 text-slate-100';

  const inputClass = isDark
    ? 'bg-slate-900/90 border-slate-700/80 focus:bg-slate-900 focus:border-emerald-400 text-white placeholder-slate-500'
    : 'bg-slate-900/90 border-purple-500/30 focus:bg-slate-900 focus:border-emerald-400 text-white placeholder-slate-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`relative w-full max-w-lg border rounded-2xl shadow-2xl overflow-hidden my-auto ${modalContainerClass}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Record Bill Payment</h2>
              <p className="text-xs text-slate-400">Accept MFS, cash, or bank subscription payment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Customer Selection */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>Select Customer <span className="text-rose-400">*</span></span>
              {isResellerScope && (
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <Store className="w-3 h-3" /> আপনার গ্রাহক ({availableCustomers.length})
                </span>
              )}
            </label>
            {availableCustomers.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>আপনার অধীনে কোনো গ্রাহক পাওয়া যায়নি। প্রথমে নতুন গ্রাহক যুক্ত করুন।</span>
              </div>
            ) : (
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
              >
                {availableCustomers.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.name} ({c.uid}) - Due: {ispProfile.currencySymbol}{c.dueAmount}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected Customer Quick Info Card */}
          {selectedCustomer && (
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Package & Monthly Bill</span>
                <span className="text-white font-medium">
                  {selectedCustomer.packageName} ({ispProfile.currencySymbol}{selectedCustomer.monthlyBill})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Current Outstanding Due</span>
                <span className={`font-bold font-mono ${selectedCustomer.dueAmount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {ispProfile.currencySymbol}{selectedCustomer.dueAmount || 0}
                </span>
              </div>
            </div>
          )}

          {/* Amount and Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Payment Amount ({ispProfile.currencySymbol}) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-emerald-400 text-sm outline-none transition-colors ${inputClass}`}
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Payment Method <span className="text-rose-400">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
              >
                {customerReseller && (
                  <option value="Reseller Balance" className="bg-emerald-950 text-emerald-300 font-bold">
                    💰 রিসেলার ওয়ালেট ব্যালেন্স (৳{customerReseller.balance.toLocaleString('en-IN')})
                  </option>
                )}
                <option value="bKash" className="bg-slate-900 text-white">bKash (বিকাশ)</option>
                <option value="Nagad" className="bg-slate-900 text-white">Nagad (নগদ)</option>
                <option value="Rocket" className="bg-slate-900 text-white">Rocket (রকেট)</option>
                <option value="Cash" className="bg-slate-900 text-white">Cash (ক্যাশ গ্রহণ)</option>
                <option value="Bank Transfer" className="bg-slate-900 text-white">Bank Transfer / Card</option>
                <option value="Other" className="bg-slate-900 text-white">Other</option>
              </select>
            </div>
          </div>

          {/* Reseller Wallet Info Box */}
          {customerReseller && paymentMethod === 'Reseller Balance' && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">রিসেলার ওয়ালেট: {customerReseller.name}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">বর্তমান ব্যালেন্স:</span>
                <span className="font-mono font-bold text-white text-sm">
                  {ispProfile.currencySymbol}{customerReseller.balance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Trx ID & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Transaction ID / Reference
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. BK9X882190"
                className={`w-full px-3 py-2 rounded-xl border font-mono text-xs outline-none transition-colors ${inputClass}`}
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Payment Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Receipt Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared bill for the month of August"
              className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-900/20 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
