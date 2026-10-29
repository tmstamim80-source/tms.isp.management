import React, { useState, useEffect } from 'react';
import { PaymentRecord } from '../types';
import { useCustomer } from '../context/CustomerContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { X, Edit3, CheckCircle2 } from 'lucide-react';

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRecord | null;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  isOpen,
  onClose,
  payment,
}) => {
  const { updatePayment, ispProfile } = useCustomer();
  const { addToast } = useToast();
  const { isDark } = useTheme();

  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerUid, setCustomerUid] = useState<string>('');
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Bank Transfer' | 'Other' | 'Reseller Balance'>('bKash');
  const [transactionId, setTransactionId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (payment) {
      setReceiptNumber(payment.receiptNumber || '');
      setCustomerName(payment.customerName || '');
      setCustomerUid(payment.customerUid || '');
      setCustomerMobile(payment.customerMobile || '');
      setAmount(payment.amount || 0);
      setPaymentMethod(payment.paymentMethod || 'bKash');
      setTransactionId(payment.transactionId || '');
      setPaymentDate(payment.paymentDate || new Date().toISOString().substring(0, 10));
      setNotes(payment.notes || '');
    }
  }, [payment, isOpen]);

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      addToast('error', 'Invalid Amount', 'Payment amount must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePayment(payment.id, {
        receiptNumber: receiptNumber.trim() || payment.receiptNumber,
        customerName: customerName.trim() || payment.customerName,
        customerUid: customerUid.trim() || payment.customerUid,
        customerMobile: customerMobile.trim() || payment.customerMobile,
        amount: Number(amount),
        paymentMethod,
        transactionId: transactionId.trim() || undefined,
        paymentDate,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message || 'Could not update payment record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContainerClass = isDark
    ? 'bg-slate-900/95 border-slate-800 text-slate-100'
    : 'glass-panel-colorful border-purple-500/30 text-slate-100';

  const inputClass = isDark
    ? 'bg-slate-900/90 border-slate-700/80 focus:bg-slate-900 focus:border-cyan-400 text-white placeholder-slate-500'
    : 'bg-slate-900/90 border-purple-500/30 focus:bg-slate-900 focus:border-cyan-400 text-white placeholder-slate-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`relative w-full max-w-lg border rounded-2xl shadow-2xl overflow-hidden my-auto ${modalContainerClass}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Payment Record</h2>
              <p className="text-xs text-slate-400">Modify receipt slip and transaction details</p>
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
          
          {/* Customer & Receipt Badge Info */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Customer UID & Name</span>
              <span className="text-white font-bold">
                {customerName} ({customerUid})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Receipt Number</span>
              <input
                type="text"
                required
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className={`w-full mt-0.5 px-2 py-1 rounded-lg border font-mono font-bold text-emerald-400 text-xs outline-none ${inputClass}`}
              />
            </div>
          </div>

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
                <option value="bKash" className="bg-slate-900 text-white">bKash (Merchant/Personal)</option>
                <option value="Nagad" className="bg-slate-900 text-white">Nagad</option>
                <option value="Rocket" className="bg-slate-900 text-white">Rocket</option>
                <option value="Cash" className="bg-slate-900 text-white">Cash Handover</option>
                <option value="Bank Transfer" className="bg-slate-900 text-white">Bank Transfer / Card</option>
                <option value="Other" className="bg-slate-900 text-white">Other</option>
              </select>
            </div>
          </div>

          {/* Trx ID & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Transaction ID / Ref
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

          {/* Customer Mobile (if needs correction) */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Customer Mobile Number</label>
            <input
              type="text"
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
              placeholder="e.g. 01712345678"
              className={`w-full px-3 py-2 rounded-xl border font-mono text-xs outline-none transition-colors ${inputClass}`}
            />
          </div>

          {/* Notes / Remarks */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Receipt Remarks / Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Monthly bill cleared"
              className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors min-h-[40px] border border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 min-h-[40px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
