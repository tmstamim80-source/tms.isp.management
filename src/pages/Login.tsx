import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Shield, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowLeft, 
  Wifi, 
  Store,
  KeyRound,
  Coins,
  CheckCircle2,
  Building2
} from 'lucide-react';

interface LoginProps {
  initialTab?: 'customer' | 'reseller' | 'admin';
  onSuccess: () => void;
  onCustomerSuccess?: () => void;
  onBackToHome: () => void;
}

export const Login: React.FC<LoginProps> = ({ 
  initialTab = 'customer',
  onSuccess, 
  onCustomerSuccess,
  onBackToHome 
}) => {
  const { login, resellerLogin, customerLogin } = useAuth();
  const { addToast } = useToast();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'customer' | 'reseller' | 'admin'>(initialTab);

  // Admin login states
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);

  // Reseller login states
  const [resellerUsername, setResellerUsername] = useState<string>('');
  const [resellerPassword, setResellerPassword] = useState<string>('');
  const [showResellerPassword, setShowResellerPassword] = useState<boolean>(false);

  // Customer login states
  const [customerId, setCustomerId] = useState<string>('');
  const [customerPassword, setCustomerPassword] = useState<string>('');
  const [showCustomerPassword, setShowCustomerPassword] = useState<boolean>(false);

  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    setActiveTab(initialTab);
    setErrorMessage('');
  }, [initialTab]);

  // Handle Reseller Login Submit
  const handleResellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!resellerUsername.trim() || !resellerPassword.trim()) {
      setErrorMessage('দয়া করে রিসেলার ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন।');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resellerLogin(resellerUsername, resellerPassword, rememberMe);
      if (res.success && res.reseller) {
        addToast(
          'success', 
          'রিসেলার লগইন সফল!', 
          `স্বাগতম, ${res.reseller.name}! বর্তমান ওয়ালেট ব্যালেন্স: ৳${res.reseller.balance.toLocaleString('en-IN')}`
        );
        onSuccess();
      } else {
        setErrorMessage(res.error || 'রিসেলার তথ্য মেলেনি।');
        addToast('error', 'লগইন ব্যর্থ', res.error || 'ভুল ইউজারনেম বা পাসওয়ার্ড');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'রিসেলার লগইনকালে ত্রুটি ঘটেছে।');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Admin Login Submit
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!adminUsername.trim() || !adminPassword.trim()) {
      setErrorMessage('Please enter both admin username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(adminUsername, adminPassword, rememberMe);
      if (res.success) {
        addToast('success', 'Admin Authentication Successful', 'Welcome back to ISP Management Dashboard.');
        onSuccess();
      } else {
        setErrorMessage(res.error || 'Invalid admin credentials provided.');
        addToast('error', 'Login Failed', res.error || 'Invalid credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during admin login.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Customer Login Submit
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerId.trim()) {
      setErrorMessage('দয়া করে আপনার গ্রাহক আইডি (Customer ID) অথবা মোবাইল নম্বর দিন।');
      return;
    }

    setIsLoading(true);
    try {
      const res = await customerLogin(customerId, customerPassword, rememberMe);
      if (res.success && res.customer) {
        addToast('success', 'লগইন সফল হয়েছে!', `স্বাগতম, ${res.customer.name}! আপনার WiFi পোর্টাল প্রস্তুত।`);
        if (onCustomerSuccess) {
          onCustomerSuccess();
        } else {
          onSuccess();
        }
      } else {
        setErrorMessage(res.error || 'গ্রাহক একাউন্ট পাওয়া যায়নি।');
        addToast('error', 'Login Failed', res.error || 'গ্রাহক তথ্য মেলেনি।');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during customer login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 py-8 sm:py-12 transition-colors duration-500">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 border transition-all ${
        isDark
          ? 'glass-panel-dark border-slate-800 text-slate-100'
          : 'glass-panel-colorful border-purple-500/30 text-slate-100'
      }`}>
        
        {/* Back link */}
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-4 min-h-[36px] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          হোমে ফিরে যান
        </button>

        {/* Staff/Admin Tab Switcher: Admin vs Reseller (Strictly hidden from customer view) */}
        {activeTab !== 'customer' && (
          <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => { setActiveTab('admin'); setErrorMessage(''); }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              অ্যাডমিন পোর্টাল
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('reseller'); setErrorMessage(''); }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'reseller'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              রিসেলার পোর্টাল
            </button>
          </div>
        )}

        {/* 1. CUSTOMER LOGIN VIEW */}
        {activeTab === 'customer' && (
          <div>
            {/* Customer Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-teal-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-cyan-500/25">
                <Wifi className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-4 tracking-tight">
                গ্রাহক পোর্টাল
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                আইডি বা মোবাইল নম্বর দিয়ে লগইন করুন
              </p>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {/* Customer Form */}
            <form onSubmit={handleCustomerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  গ্রাহক আইডি বা মোবাইল নম্বর
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-cyan-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    placeholder="আইডি বা মোবাইল নম্বর লিখুন"
                    className="w-full py-2.5 sm:py-3 pl-10 pr-3 rounded-xl bg-slate-900/80 border border-slate-700/80 focus:bg-slate-900 focus:border-cyan-400 text-white placeholder-slate-500 outline-none transition-colors text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-300 font-semibold">
                    পাসওয়ার্ড বা পিন
                  </label>
                  <span className="text-[11px] text-cyan-400/80">
                    ডিফল্ট: 1234
                  </span>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showCustomerPassword ? 'text' : 'password'}
                    value={customerPassword}
                    onChange={(e) => setCustomerPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড বা পিন দিন"
                    className="w-full py-2.5 sm:py-3 pl-10 pr-10 rounded-xl bg-slate-900/80 border border-slate-700/80 focus:bg-slate-900 focus:border-cyan-400 text-white placeholder-slate-500 outline-none transition-colors font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomerPassword(!showCustomerPassword)}
                    className="absolute right-3 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showCustomerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember session */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-400"
                  />
                  <span>লগইন মনে রাখুন</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 mt-2 min-h-[44px] flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <Wifi className="w-4 h-4" />
                {isLoading ? 'যাচাই করা হচ্ছে...' : 'লগইন করুন'}
              </button>
            </form>

            {/* Discreet staff link */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>সুরক্ষিত ISP ক্লাউড গেটওয়ে</span>
              <button
                type="button"
                onClick={() => { setActiveTab('admin'); setErrorMessage(''); }}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors p-1 cursor-pointer"
                title="অফিসিয়াল অ্যাডমিন লগইন"
              >
                <Lock className="w-3 h-3" />
                <span>অ্যাডমিন</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. RESELLER LOGIN VIEW */}
        {activeTab === 'reseller' && (
          <div>
            {/* Reseller Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-500/25">
                <Store className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-4 tracking-tight">
                রিসেলার ও সাব-আইএসপি পোর্টাল
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                রিসেলার আইডি / ইউজারনেম ও পাসওয়ার্ড দিয়ে প্রবেশ করুন
              </p>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {/* Reseller Form */}
            <form onSubmit={handleResellerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  রিসেলার ইউজারনেম বা কোড (Code)
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-emerald-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={resellerUsername}
                    onChange={(e) => setResellerUsername(e.target.value)}
                    placeholder="যেমন: reseller1 বা RES-01"
                    className="w-full py-2.5 sm:py-3 pl-10 pr-3 rounded-xl bg-slate-900/80 border border-slate-700/80 focus:bg-slate-900 focus:border-emerald-400 text-white placeholder-slate-500 outline-none transition-colors text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-300 font-semibold">
                    রিসেলার পাসওয়ার্ড
                  </label>
                  <span className="text-[11px] text-emerald-400/80">
                    ডিফল্ট: 1234
                  </span>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showResellerPassword ? 'text' : 'password'}
                    required
                    value={resellerPassword}
                    onChange={(e) => setResellerPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড দিন"
                    className="w-full py-2.5 sm:py-3 pl-10 pr-10 rounded-xl bg-slate-900/80 border border-slate-700/80 focus:bg-slate-900 focus:border-emerald-400 text-white placeholder-slate-500 outline-none transition-colors font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResellerPassword(!showResellerPassword)}
                    className="absolute right-3 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showResellerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Helper Notice for CEO Created Accounts */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1 text-slate-400 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                  <Store className="w-3.5 h-3.5" />
                  <span>CEO প্যানেল অথেন্টিকেশন</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  CEO panel থেকে অনুমোদিত রিসেলার ইউজারনেম, কোড (যেমন: <span className="font-mono text-cyan-300">RES-01</span>) অথবা নিবন্ধিত মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে সরাসরি লগইন করুন।
                </p>
              </div>

              {/* Remember session */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>লগইন মনে রাখুন</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 mt-2 min-h-[44px] flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <Store className="w-4 h-4" />
                {isLoading ? 'যাচাই করা হচ্ছে...' : 'রিসেলার পোর্টালে প্রবেশ করুন'}
              </button>
            </form>

            {/* Back links */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <button
                type="button"
                onClick={() => { setActiveTab('customer'); setErrorMessage(''); }}
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors p-1 cursor-pointer font-medium"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>গ্রাহক পোর্টাল</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('admin'); setErrorMessage(''); }}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                title="অফিসিয়াল অ্যাডমিন লগইন"
              >
                <Lock className="w-3 h-3" />
                <span>অ্যাডমিন পোর্টাল</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. ADMIN LOGIN VIEW (Accessible when explicitly selected) */}
        {activeTab === 'admin' && (
          <div>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/25">
                <Shield className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-4 tracking-tight">ISP Admin Portal</h2>
              <p className="text-xs text-slate-400 mt-1">
                Authorized network administrators & billing agents only
              </p>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAdminSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Admin Username / Email
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="Enter Admin Username"
                    className="w-full py-2.5 sm:py-3 pl-10 pr-3 rounded-xl bg-slate-900/80 border border-slate-700/80 focus:bg-slate-900 focus:border-cyan-400 text-white placeholder-slate-500 outline-none transition-colors text-sm sm:text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Admin Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter Password"
                    className="w-full py-2.5 sm:py-3 pl-10 pr-10 rounded-xl bg-slate-900/80 border border-slate-700/80 focus:bg-slate-900 focus:border-cyan-400 text-white placeholder-slate-500 outline-none transition-colors font-mono text-sm sm:text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-400"
                  />
                  <span>Remember this session</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 mt-2 min-h-[44px] cursor-pointer"
              >
                {isLoading ? 'Authenticating Admin...' : 'Sign In to Dashboard'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <button
                type="button"
                onClick={() => { setActiveTab('customer'); setErrorMessage(''); }}
                className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <ArrowLeft className="w-3 h-3" />
                গ্রাহক পোর্টাল
              </button>
              <span>Protected Gateway</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
