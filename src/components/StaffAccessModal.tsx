import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  X, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Search, 
  Crown, 
  CheckCircle2, 
  AlertCircle,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface StaffAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: 'home' | 'search' | 'admin-login' | 'admin-dashboard' | 'ceo-tm') => void;
}

export const StaffAccessModal: React.FC<StaffAccessModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { 
    isStaffAuthorized, 
    authorizeStaffDevice, 
    revokeStaffDevice,
    isCeoTmAuthenticated,
    isAuthenticated,
    isSearchOperatorAuthenticated 
  } = useAuth();
  const { addToast } = useToast();

  const [passkeyInput, setPasskeyInput] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!passkeyInput.trim()) {
      setErrorMsg('অনুগ্রহ করে CEO TM মাস্টার পাসকি (TM5467) লিখুন অথবা "অটো-ফিল" বাটনে ক্লিক করুন।');
      return;
    }

    setIsSubmitting(true);
    const result = authorizeStaffDevice(passkeyInput.trim());
    setIsSubmitting(false);

    if (result.success) {
      addToast('success', 'স্টাফ অ্যাক্সেস অনুমোদিত!', 'এই ডিভাইসে সার্চ পোর্টাল, অ্যাডমিন ও CEO প্যানেল অপশন দৃশ্যমান করা হয়েছে।');
      setPasskeyInput('');
    } else {
      setErrorMsg(result.error || 'ভুল সিকিউরিটি পাসকি।');
      addToast('error', 'অনুমোদন ব্যর্থ', result.error || 'সঠিক পাসকি প্রদান করুন।');
    }
  };

  const handleRevoke = () => {
    revokeStaffDevice();
    addToast('info', 'স্টাফ প্রিভিলেজ প্রত্যাহার করা হয়েছে', 'এই ব্রাউজারে অপশনগুলো আবার গ্রাহক মোডে লুকানো থাকবে।');
  };

  const isAnyStaff = isStaffAuthorized || isCeoTmAuthenticated || isAuthenticated || isSearchOperatorAuthenticated;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 p-6 sm:p-7 shadow-2xl space-y-5 relative text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 text-amber-400 shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight">
                স্টাফ ও প্রশাসনিক অ্যাক্সেস
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Staff Only
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              সাধারণ গ্রাহকদের জন্য এই পোর্টালগুলো গোপন থাকে। অ্যাক্সেস করতে পাসকি দিন।
            </p>
          </div>
        </div>

        {/* Status Banner */}
        {isAnyStaff ? (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-white">ডিভাইস অ্যাক্সেস অনুমোদিত (Authorized)</p>
                <p className="text-[11px] text-emerald-300/80">
                  আপনার জন্য সার্চ পোর্টাল, অ্যাডমিন ও CEO প্যানেল দৃশ্যমান রয়েছে।
                </p>
              </div>
            </div>
            <button
              onClick={handleRevoke}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 hover:border-rose-500/50 border border-slate-700 text-slate-300 hover:text-rose-300 text-[11px] font-medium transition-all shrink-0 cursor-pointer"
            >
              হাইড করুন
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-300 text-xs flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              গ্রাহকরা শুধুমাত্র কোম্পানির তথ্য ও ইউজার লগইন দেখতে পান। আপনার কাছে CEO TM সিকিউরিটি পাসকি থাকলে তা দিয়ে এই ডিভাইসে অপশনগুলো আনলক করতে পারবেন।
            </p>
          </div>
        )}

        {/* Authorization Form (if not yet staff authorized) */}
        {!isAnyStaff ? (
          <form onSubmit={handleAuthorize} className="space-y-3.5 pt-1">
            <label className="block text-xs font-semibold text-slate-300">
              CEO TM মাস্টার সিকিউরিটি পাসকি (Master Passkey)
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-amber-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPasskey ? 'text' : 'password'}
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                placeholder="মাস্টার পাসকি দিন..."
                className="w-full py-2.5 pl-10 pr-10 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm font-mono focus:border-amber-400 outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPasskey(!showPasskey)}
                className="absolute right-3 text-slate-400 hover:text-white p-1 cursor-pointer"
                aria-label="Toggle passkey visibility"
              >
                {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
              <span>ডিফল্ট মাস্টার পাসকি: <strong className="text-amber-400 font-mono">TM5467</strong> বা <strong className="text-amber-400 font-mono">5467</strong></span>
              <button 
                type="button" 
                onClick={() => setPasskeyInput('TM5467')}
                className="text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
              >
                অটো-ফিল
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>{isSubmitting ? 'যাচাই করা হচ্ছে...' : 'এই ডিভাইসে অপশনগুলো আনলক করুন'}</span>
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>ডিভাইস আনলকড (Unlocked)</span>
            </div>
            <button
              type="button"
              onClick={handleRevoke}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>লক ও হাইড করুন</span>
            </button>
          </div>
        )}

        {/* Quick Direct Links to Portals - EXACT DESIGN FROM SCREENSHOT */}
        <div className="pt-3 border-t border-slate-800/80 space-y-3">
          <p className="text-sm font-semibold text-slate-300">
            সরাসরি পোর্টালে প্রবেশ করুন
          </p>

          <div className="flex flex-col gap-3">
            {/* Card 1: CEO TM */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate('ceo-tm');
              }}
              className="w-full p-4 rounded-2xl bg-[#0c1322] hover:bg-[#111a2e] border border-amber-600/40 hover:border-amber-500/70 text-left transition-all group cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-2.5 text-amber-400">
                <Crown className="w-5 h-5" />
                <span className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                  CEO TM
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                মাস্টার কন্ট্রোল প্যানেল
              </p>
            </button>

            {/* Card 2: Admin Login */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate(isAuthenticated ? 'admin-dashboard' : 'admin-login');
              }}
              className="w-full p-4 rounded-2xl bg-[#0c1322] hover:bg-[#111a2e] border border-cyan-500/40 hover:border-cyan-400/70 text-left transition-all group cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-2.5 text-cyan-400">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                  অ্যাডমিন লগইন
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                বিলিং ও নেটওয়ার্ক ম্যানেজমেন্ট
              </p>
            </button>

            {/* Card 3: Search Portal */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate('search');
              }}
              className="w-full p-4 rounded-2xl bg-[#0c1322] hover:bg-[#111a2e] border border-teal-500/40 hover:border-teal-400/70 text-left transition-all group cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-2.5 text-teal-400">
                <Search className="w-5 h-5" />
                <span className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
                  সার্চ পোর্টাল
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                কাস্টমার আইডি ও ডাটা সার্চ
              </p>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-2 text-[12px] text-slate-400 flex items-center justify-center gap-1.5 flex-wrap">
          <span>টিপস: যেকোনো পেজ থেকে</span>
          <kbd className="px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300 font-mono text-[11px] shadow-sm">
            Ctrl+Shift+A
          </kbd>
          <span>চেপে এই উইন্ডো খোলা যায়।</span>
        </div>
      </div>
    </div>
  );
};
