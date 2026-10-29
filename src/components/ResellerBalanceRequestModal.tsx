import React, { useState } from 'react';
import { Wallet, X, Send, CreditCard, Building, Smartphone, CheckCircle2 } from 'lucide-react';
import { useReseller } from '../context/ResellerContext';
import { useCustomer } from '../context/CustomerContext';
import { useToast } from '../context/ToastContext';
import { Reseller } from '../types';

interface ResellerBalanceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  reseller: Reseller;
}

export const ResellerBalanceRequestModal: React.FC<ResellerBalanceRequestModalProps> = ({
  isOpen,
  onClose,
  reseller,
}) => {
  const { submitBalanceRequest } = useReseller();
  const { ispProfile } = useCustomer();
  const { addToast } = useToast();

  const [amount, setAmount] = useState<number>(5000);
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Bank' | 'Cash'>('bKash');
  const [transactionId, setTransactionId] = useState('');
  const [senderNumber, setSenderNumber] = useState(reseller.phone || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      addToast('error', 'অকার্যকর পরিমাণ', 'রিচার্জের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে।');
      return;
    }
    if (!transactionId.trim()) {
      addToast('error', 'TrxID আবশ্যক', 'বিকাশ/নগদ বা ব্যাংকের ট্রানজেকশন আইডি (TrxID) দিন।');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitBalanceRequest({
        resellerId: reseller.id,
        resellerName: reseller.name,
        resellerPhone: reseller.phone,
        amount: Number(amount),
        paymentMethod,
        transactionId: transactionId.trim().toUpperCase(),
        senderNumber: senderNumber.trim(),
        adminNotes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      addToast('error', 'ব্যর্থ হয়েছে', err.message || 'রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMerchantNumber = () => {
    if (paymentMethod === 'bKash') return ispProfile.bkashMerchant || '01700-000000';
    if (paymentMethod === 'Nagad') return ispProfile.nagadMerchant || '01700-000000';
    if (paymentMethod === 'Rocket') return ispProfile.rocketMerchant || '01700-000000';
    return ispProfile.supportPhone;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg border border-slate-800 bg-slate-900 rounded-2xl shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ওয়ালেট ব্যালেন্স রিচার্জ রিকোয়েস্ট</h3>
              <p className="text-xs text-slate-400">{reseller.name} (বর্তমান ব্যালেন্স: ৳{reseller.balance.toLocaleString('en-IN')})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Main ISP Merchant Info */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold block">
              প্রধান অফিসের পেমেন্ট গ্রহণ নম্বর:
            </span>
            <div className="flex items-center justify-between font-mono font-bold text-cyan-300">
              <span>{paymentMethod}: {getMerchantNumber()}</span>
              <span className="text-[10px] text-slate-400 font-sans font-normal">(Send Money / Merchant)</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              রিচার্জের পরিমাণ (৳) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              required
              min={100}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="5000"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-base font-bold outline-none focus:border-emerald-400"
            />
            <div className="flex gap-1.5 mt-2">
              {[2000, 5000, 10000, 15000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono cursor-pointer"
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                পেমেন্ট মাধ্যম <span className="text-rose-400">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-400 text-xs"
              >
                <option value="bKash">bKash (বিকাশ)</option>
                <option value="Nagad">Nagad (নগদ)</option>
                <option value="Rocket">Rocket (রকেট)</option>
                <option value="Bank">Bank Deposit (ব্যাংক জমা)</option>
                <option value="Cash">Cash (ক্যাশ / সরাসরি)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                প্রেরক নম্বর / একাউন্ট
              </label>
              <input
                type="text"
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                placeholder="যেমন: 01711xxxxxx"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-400 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              ট্রানজেকশন আইডি (TrxID) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="যেমন: BK9X7781A বা ডিপোজিট রেফারেন্স"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-400 text-xs font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              অতিরিক্ত মন্তব্য (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="যেকোনো অতিরিক্ত নোট..."
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-400 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'পাঠানো হচ্ছে...' : 'রিকোয়েস্ট পাঠান'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
