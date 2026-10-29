import React, { useState, useEffect } from 'react';
import { PaymentRequest } from '../types';
import { useCustomer } from '../context/CustomerContext';
import { useToast } from '../context/ToastContext';
import { X, Check, Save, Edit3, DollarSign, CreditCard, Clock, User, Phone, FileText } from 'lucide-react';

interface EditPaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PaymentRequest | null;
}

export const EditPaymentRequestModal: React.FC<EditPaymentRequestModalProps> = ({
  isOpen,
  onClose,
  request,
}) => {
  const { updatePaymentRequest, approvePaymentRequest, ispProfile } = useCustomer();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'bKash' as 'bKash' | 'Nagad' | 'Rocket' | 'Bank Transfer' | 'Cash' | 'Other',
    transactionId: '',
    senderNumber: '',
    requestDate: '',
    notes: '',
    adminNotes: '',
    status: 'Pending' as 'Pending' | 'Approved' | 'Rejected',
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (request) {
      setFormData({
        amount: String(request.amount || ''),
        paymentMethod: (request.paymentMethod as any) || 'bKash',
        transactionId: request.transactionId || '',
        senderNumber: request.senderNumber || '',
        requestDate: request.requestDate || request.createdAt?.substring(0, 10) || new Date().toISOString().substring(0, 10),
        notes: request.notes || '',
        adminNotes: request.adminNotes || '',
        status: request.status || 'Pending',
      });
    }
  }, [request]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amtNum = parseFloat(formData.amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      addToast('error', 'ভুল পরিমাণ', 'সঠিক টাকার পরিমাণ লিখুন।');
      return;
    }

    if (!formData.transactionId.trim()) {
      addToast('error', 'TrxID প্রয়োজন', 'Transaction ID খালি রাখা যাবে না।');
      return;
    }

    setIsSaving(true);
    try {
      // If admin changed status to Approved and it wasn't approved before
      if (formData.status === 'Approved' && request.status !== 'Approved') {
        await updatePaymentRequest(request.id, {
          amount: amtNum,
          paymentMethod: formData.paymentMethod,
          transactionId: formData.transactionId.trim(),
          senderNumber: formData.senderNumber.trim(),
          requestDate: formData.requestDate,
          notes: formData.notes.trim(),
          adminNotes: formData.adminNotes.trim(),
        });
        await approvePaymentRequest(request.id, formData.adminNotes.trim());
      } else {
        await updatePaymentRequest(request.id, {
          amount: amtNum,
          paymentMethod: formData.paymentMethod,
          transactionId: formData.transactionId.trim(),
          senderNumber: formData.senderNumber.trim(),
          requestDate: formData.requestDate,
          notes: formData.notes.trim(),
          adminNotes: formData.adminNotes.trim(),
          status: formData.status,
        });
      }

      onClose();
    } catch (err: any) {
      addToast('error', 'আপডেট ব্যর্থ', err.message || 'রিকোয়েস্ট আপডেট করা সম্ভব হয়নি।');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#0A1020] border border-cyan-500/40 rounded-2xl p-6 max-w-lg w-full text-slate-100 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-bold text-base text-white">গ্রাহক পেমেন্ট রিকোয়েস্ট এডিট</h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {request.customerName} ({request.customerUid})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Customer Summary Info */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] block">গ্রাহকের নাম:</span>
              <strong className="text-white">{request.customerName}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">কাস্টমার UID:</span>
              <strong className="text-cyan-300 font-mono">{request.customerUid}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">রেজিস্টার্ড মোবাইল:</span>
              <strong className="text-slate-300 font-mono">{request.customerMobile}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">সাবমিট তারিখ:</span>
              <strong className="text-slate-300 font-mono">{request.createdAt?.substring(0, 10) || 'N/A'}</strong>
            </div>
          </div>

          {/* Amount & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">টাকার পরিমাণ (৳) *</label>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-bold focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">পেমেন্ট মেথড *</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold focus:border-cyan-400 focus:outline-none"
              >
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Rocket">Rocket</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* TrxID & Sender Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Transaction ID (TrxID) *</label>
              <input
                type="text"
                required
                value={formData.transactionId}
                onChange={(e) => setFormData({ ...formData, transactionId: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono uppercase font-bold focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">প্রেরক নম্বর / Sender Number</label>
              <input
                type="tel"
                value={formData.senderNumber}
                onChange={(e) => setFormData({ ...formData, senderNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Date & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">পেমেন্ট তারিখ *</label>
              <input
                type="date"
                required
                value={formData.requestDate}
                onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">রিকোয়েস্ট স্ট্যাটাস *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-bold focus:border-cyan-400 focus:outline-none text-white"
              >
                <option value="Pending" className="text-amber-400">অপেক্ষমাণ (Pending)</option>
                <option value="Approved" className="text-emerald-400">অনুমোদিত (Approved & Recorded)</option>
                <option value="Rejected" className="text-rose-400">বাতিল (Rejected)</option>
              </select>
            </div>
          </div>

          {/* Customer Note */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">গ্রাহকের নোট (Customer Notes)</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Admin Internal / Customer Note */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">এডমিন মন্তব্য / রিপ্লাই (Admin Notes / Reason)</label>
            <input
              type="text"
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              placeholder="e.g. bKash Statement Verified. Payment Succeeded."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'আপডেট ও সংরক্ষণ করুন'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
