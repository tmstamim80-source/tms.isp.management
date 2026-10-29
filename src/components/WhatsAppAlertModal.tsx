import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { useCustomer } from '../context/CustomerContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import {
  formatWhatsAppPhone,
  compileBillingMessage,
  dispatchWhatsAppAlert,
  DEFAULT_WHATSAPP_TEMPLATE,
} from '../utils/whatsappUtils';
import {
  X,
  MessageSquare,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  User,
  Phone,
  Sparkles,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface WhatsAppAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  bulkCustomers?: Customer[];
  isBulk?: boolean;
}

export const WhatsAppAlertModal: React.FC<WhatsAppAlertModalProps> = ({
  isOpen,
  onClose,
  customer,
  bulkCustomers = [],
  isBulk = false,
}) => {
  const { ispProfile } = useCustomer();
  const { addToast } = useToast();
  const { isDark } = useTheme();

  const [customMessage, setCustomMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Bulk progress state
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    successCount: number;
    failCount: number;
    currentName: string;
    isFinished: boolean;
  }>({
    current: 0,
    total: 0,
    successCount: 0,
    failCount: 0,
    currentName: '',
    isFinished: false,
  });

  const provider = ispProfile.whatsappSettings?.provider || 'direct';

  // Initialize message whenever customer changes
  useEffect(() => {
    if (customer) {
      setCustomMessage(compileBillingMessage(customer, ispProfile));
    } else if (isBulk && bulkCustomers.length > 0) {
      setCustomMessage(compileBillingMessage(bulkCustomers[0], ispProfile));
    }
  }, [customer, bulkCustomers, isBulk, ispProfile]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    addToast('info', 'কপি হয়েছে', 'মেসেজ ক্লিপবোর্ডে কপি করা হয়েছে।');
  };

  const handleSendSingle = async () => {
    if (!customer) return;
    setIsSending(true);

    try {
      const res = await dispatchWhatsAppAlert(customer, ispProfile, customMessage);
      if (res.success) {
        addToast('success', 'WhatsApp এ সফল', res.message);
        onClose();
      } else {
        addToast('error', 'মেসেজ ব্যর্থ হয়েছে', res.message);
      }
    } catch (err: any) {
      addToast('error', 'এরর', err.message || 'মেসেজ পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendBulk = async () => {
    if (bulkCustomers.length === 0) return;
    setIsSending(true);
    setBulkProgress({
      current: 0,
      total: bulkCustomers.length,
      successCount: 0,
      failCount: 0,
      currentName: '',
      isFinished: false,
    });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < bulkCustomers.length; i++) {
      const cust = bulkCustomers[i];
      setBulkProgress(prev => ({
        ...prev,
        current: i + 1,
        currentName: cust.name,
      }));

      // Generate personalized message for each customer
      const msg = compileBillingMessage(cust, ispProfile);
      const res = await dispatchWhatsAppAlert(cust, ispProfile, msg);

      if (res.success) {
        success++;
      } else {
        failed++;
      }

      setBulkProgress(prev => ({
        ...prev,
        successCount: success,
        failCount: failed,
      }));

      // If API provider, add small delay to avoid rate limiting
      if (provider !== 'direct') {
        await new Promise(r => setTimeout(r, 1200));
      } else {
        // If direct browser popup, wait slightly so user doesn't get flooded
        await new Promise(r => setTimeout(r, 800));
      }
    }

    setBulkProgress(prev => ({ ...prev, isFinished: true }));
    setIsSending(false);
    addToast(
      'success',
      'বাল্ক মেসেজ সম্পন্ন',
      `মোট ${success} জন গ্রাহকের কাছে সফলভাবে WhatsApp নোটিফিকেশন পাঠানো হয়েছে।`
    );
  };

  const targetPhone = customer ? formatWhatsAppPhone(customer.mobile) : '';
  const dueAmount = customer ? (customer.dueAmount > 0 ? customer.dueAmount : customer.monthlyBill) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-6 space-y-5 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-md">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isBulk ? 'বাল্ক WhatsApp বিল নোটিফিকেশন' : 'WhatsApp বিল অ্যালার্ট পাঠান'}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                  {provider.toUpperCase()}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isBulk
                  ? `মোট ${bulkCustomers.length} জন বকেয়া / মেয়াদোত্তীর্ণ গ্রাহককে একসাথে মেসেজ পাঠান`
                  : `${customer?.name || 'গ্রাহক'} (${customer?.uid}) এর WhatsApp এ সরাসরি বিল নোটিশ পাঠান`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSending}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Mini Summary (if single) */}
        {!isBulk && customer && (
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white">{customer.name}</div>
                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  {customer.mobile} ({targetPhone})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">বকেয়া বিল</div>
                <div className="text-sm font-black text-rose-400 font-mono">
                  {ispProfile.currencySymbol}{dueAmount}
                </div>
              </div>
              <div className="text-right pl-3 border-l border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">মেয়াদ / শেষ তারিখ</div>
                <div className="text-xs font-bold text-amber-300 font-mono">
                  {customer.nextPaymentDate || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Summary Card */}
        {isBulk && (
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> নির্বাচিত প্রাপক সংখ্যা:
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                {bulkCustomers.length} জন গ্রাহক
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              সিস্টেম স্বয়ংক্রিয়ভাবে প্রত্যেক গ্রাহকের নিজস্ব নাম, প্যাকেজ, বকেয়া টাকার পরিমাণ ও শেষ তারিখ পরিবর্তন করে ব্যক্তিগতকৃত WhatsApp মেসেজ পাঠাবে।
            </p>

            {isSending && (
              <div className="pt-2 space-y-2">
                <div className="flex justify-between text-xs text-slate-300 font-mono">
                  <span>অগ্রগতি: {bulkProgress.current} / {bulkProgress.total}</span>
                  <span className="text-emerald-400 font-bold">{bulkProgress.currentName}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(bulkProgress.current / (bulkProgress.total || 1)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1">
                  <span className="text-emerald-400">সফল: {bulkProgress.successCount}</span>
                  <span className="text-rose-400">ব্যর্থ: {bulkProgress.failCount}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Editor / Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-slate-300 flex items-center gap-1.5">
              <span>মেসেজ প্রিভিউ ও এডিটর</span>
              <span className="text-[10px] text-slate-500 font-normal">(প্রয়োজনে পরিবর্তন করতে পারেন)</span>
            </label>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'কপি হয়েছে' : 'কপি করুন'}</span>
            </button>
          </div>

          <textarea
            rows={8}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            disabled={isSending}
            className="w-full p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs font-sans leading-relaxed outline-none focus:border-emerald-500/60 transition-colors resize-none shadow-inner"
          />
        </div>

        {/* Gateway Info Notice */}
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center gap-2.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            {provider === 'ultramsg' ? (
              <span>আপনার লিঙ্ক করা <b>UltraMsg WhatsApp Gateway</b> দিয়ে সরাসরি ব্যাকগ্রাউন্ডে মেসেজ পাঠানো হবে।</span>
            ) : provider === 'green_api' ? (
              <span>আপনার লিঙ্ক করা <b>Green API Gateway</b> দিয়ে স্বয়ংক্রিয়ভাবে মেসেজ চলে যাবে।</span>
            ) : (
              <span><b>Direct WhatsApp</b> মোড সক্রিয়: বাটনে চাপ দিলে আপনার WhatsApp অ্যাপ বা ওয়েবে এই মেসেজটি স্বয়ংক্রিয়ভাবে খুলে যাবে।</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-colors"
          >
            বাতিল
          </button>

          {!isBulk ? (
            <button
              type="button"
              onClick={handleSendSingle}
              disabled={isSending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 min-h-[42px]"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>পাঠানো হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>WhatsApp এ পাঠান (Send Alert)</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSendBulk}
              disabled={isSending || bulkCustomers.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 min-h-[42px]"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>পাঠানো হচ্ছে ({bulkProgress.current}/{bulkProgress.total})...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>সকলকে একসাথে পাঠান ({bulkCustomers.length} জন)</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
