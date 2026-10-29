import React, { useState } from 'react';
import { useCustomer } from '../context/CustomerContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { 
  Wifi, 
  Zap, 
  ShieldCheck, 
  Clock, 
  Headphones, 
  Sparkles, 
  ArrowRight,
  User,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  CreditCard,
  PhoneCall,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Smartphone,
  ExternalLink,
  Shield,
  Server,
  Activity,
  Globe,
  UserCheck
} from 'lucide-react';

interface HomeProps {
  onNavigateToAdmin?: () => void;
  onNavigateToCustomerPortal?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToSearchPortal?: () => void;
}

export const Home: React.FC<HomeProps> = ({ 
  onNavigateToAdmin, 
  onNavigateToCustomerPortal,
  onNavigateToLogin,
  onNavigateToSearchPortal,
}) => {
  const { packages, ispProfile } = useCustomer();
  const { isCustomerAuthenticated, customerUser, customerLogout } = useAuth();
  const { isDark } = useTheme();
  const { addToast } = useToast();

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col transition-colors duration-500">
      
      {/* Hero Section: Company Profile & Core Identity */}
      <section className={`relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-20 border-b transition-colors ${
        isDark
          ? 'border-slate-800/80 bg-gradient-to-b from-slate-900/80 via-[#0a0f1d] to-transparent'
          : 'border-purple-500/20 bg-gradient-to-b from-indigo-950/70 via-purple-950/40 to-transparent'
      }`}>
        
        {/* Ambient neon backdrop glows */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[450px] h-[260px] bg-indigo-500/15 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          {/* Status Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4 sm:mb-6 shadow-md transition-all ${
            isDark
              ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 shadow-cyan-950/40'
              : 'bg-gradient-to-r from-purple-900/80 to-indigo-900/80 border border-purple-400/40 text-cyan-300 shadow-purple-950/40'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>অফিসিয়াল অপটিক্যাল ফাইবার ব্রডব্যান্ড নেটওয়ার্ক</span>
          </div>

          {/* Company Name & Tagline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
            {ispProfile.companyName}{' '}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 mt-1">
              উচ্চগতির ইন্টারনেট সেবা
            </span>
          </h1>
          
          <p className="mt-4 sm:mt-5 text-sm sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            {ispProfile.tagline || 'সর্বাধুনিক FTTH অপটিক্যাল ফাইবার প্রযুক্তিতে ২৪/৭ নিরবচ্ছিন্ন ও বাফারিং-মুক্ত ব্রডব্যান্ড নেটওয়ার্ক।'}
          </p>

          {/* CEO Emergency Notice Banner (if configured) */}
          {ispProfile.noticeMessage && (
            <div className="mt-6 max-w-3xl mx-auto p-3.5 rounded-2xl bg-amber-950/70 border border-amber-500/40 text-amber-200 text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span><strong>জরুরি নোটিশ:</strong> {ispProfile.noticeMessage}</span>
            </div>
          )}

          {/* Quick Stats Strip */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">99.9%</div>
              <div className="text-[11px] text-slate-400 mt-0.5">নেটওয়ার্ক আপটাইম</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">BDIX</div>
              <div className="text-[11px] text-slate-400 mt-0.5">আল্ট্রা-ফাস্ট ক্যাশিং</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <div className="text-xl sm:text-2xl font-black text-indigo-400 font-mono">GPON</div>
              <div className="text-[11px] text-slate-400 mt-0.5">পিওর অপটিক্যাল ফাইবার</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">24/7</div>
              <div className="text-[11px] text-slate-400 mt-0.5">টেকনিক্যাল হেল্পলাইন</div>
            </div>
          </div>

          {/* Active Customer Session Quick Bar (Only when customer is logged in) */}
          {isCustomerAuthenticated && customerUser && (
            <div className="mt-10 max-w-xl mx-auto">
              <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/90 via-slate-900 to-slate-900 border border-cyan-500/40 shadow-2xl text-left space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                      {customerUser.name ? customerUser.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-white">{customerUser.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                          লগইন করা
                        </span>
                      </div>
                      <p className="text-xs text-cyan-300 font-mono">
                        ID: {customerUser.uid} • {customerUser.mobile}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      customerLogout();
                      addToast('info', 'লগআউট সম্পন্ন', 'গ্রাহক সেশন সফলভাবে সমাপ্ত হয়েছে।');
                    }}
                    className="p-2 rounded-xl bg-rose-950/50 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/30 transition-all text-xs cursor-pointer active:scale-95"
                    title="গ্রাহক অ্যাকাউন্ট থেকে লগআউট করুন"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between text-slate-300">
                  <span>প্যাকেজ: <strong className="text-white">{customerUser.packageName || 'Active Plan'} ({customerUser.speed || 'High Speed'})</strong></span>
                  <span>বকেয়া: <strong className={customerUser.dueAmount > 0 ? 'text-rose-400' : 'text-emerald-400'}>৳{customerUser.dueAmount || 0}</strong></span>
                </div>

                <button
                  onClick={onNavigateToCustomerPortal}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" />
                  আমার গ্রাহক পোর্টালে যান
                </button>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 1. COMPANY INTERNET PACKAGES SECTION */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 sm:mb-10 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4" />
              <span>অফিসিয়াল ব্রডব্যান্ড প্যাকেজসমূহ</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-white">
              আমাদের নিয়মিত ও জনপ্রিয় ইন্টারনেট প্ল্যান
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              আনলিমিটেড ডাউনলোড, আল্ট্রা-লো ল্যাটেন্সি ও উচ্চগতির BDIX ব্যান্ডউইথ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>বাফারিং মুক্ত স্ট্রিমিং</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`rounded-2xl p-6 border flex flex-col justify-between transition-all shadow-xl hover:translate-y-[-2px] ${
                pkg.popular
                  ? 'border-cyan-500 bg-gradient-to-b from-cyan-950/70 via-slate-900/95 to-slate-900 text-white shadow-cyan-500/15'
                  : isDark
                    ? 'glass-panel-dark border-slate-800 text-slate-100 hover:border-slate-700'
                    : 'glass-panel-colorful border-purple-500/20 text-slate-100 hover:border-purple-500/40'
              }`}
            >
              {pkg.popular && (
                <div className="mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500 text-slate-950">
                    জনপ্রিয় প্যাকেজ
                  </span>
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-lg text-white">{pkg.name}</h3>
                <div className="flex items-baseline gap-1 mt-2 mb-2">
                  <span className="text-3xl font-black text-cyan-400 font-mono">{pkg.speed}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {pkg.description || 'নিরবচ্ছিন্ন হাই স্পিড অপটিক্যাল ফাইবার কানেকশন'}
                </p>

                <ul className="mt-4 space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>আনলিমিটেড ডাউনলোড ও ব্রাউজিং</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>BDIX & YouTube বাফারিং মুক্ত</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>২৪/৭ ডেডিকেটেড টেকনিক্যাল সাপোর্ট</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">মাসিক ফি</span>
                  <span className="text-lg font-black text-white font-mono">
                    {ispProfile.currencySymbol || '৳'}{pkg.price}
                  </span>
                </div>
                <a
                  href={`tel:${ispProfile.emergencyHotline || ispProfile.supportPhone}`}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 hover:text-white font-bold text-xs border border-cyan-500/40 transition-colors flex items-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>সংযোগ নিন</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. OFFICIAL BILL PAYMENT METHODS & INSTRUCTIONS */}
      {/* ========================================================================= */}
      <section className={`py-12 sm:py-16 border-t ${
        isDark ? 'border-slate-800/80 bg-slate-950/60' : 'border-purple-500/20 bg-slate-900/60'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
              <CreditCard className="w-4 h-4" />
              <span>মোবাইল ব্যাংকিং ও বিল পেমেন্ট</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-white">
              বিল পরিশোধের অফিসিয়াল মাধ্যমসমূহ
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              ঘরে বসেই নিচের অফিসিয়াল নম্বরে বিকাশ, নগদ বা রকেটের মাধ্যমে আপনার মাসিক ইন্টারনেট বিল পরিশোধ করুন
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* bKash Card */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-pink-500/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="px-3 py-1 rounded-xl bg-pink-950/80 border border-pink-500/40 text-pink-300 font-bold text-xs">
                  bKash (বিকাশ)
                </div>
                <Smartphone className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">অফিসিয়াল নম্বর:</p>
                <div className="text-lg font-mono font-black text-white mt-0.5">
                  {ispProfile.bkashMerchant || '01711000000'}
                </div>
                <span className="text-[10px] text-pink-300 font-semibold">(Personal / Send Money)</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <p>১. বিকাশ অ্যাপে Send Money অপশনে যান</p>
                <p>২. রেফারেন্সে আপনার <strong>গ্রাহক আইডি (UID)</strong> লিখুন</p>
                <p>৩. বিল দেওয়ার পর ট্রানজেকশন আইডি সংরক্ষণ করুন</p>
              </div>
            </div>

            {/* Nagad Card */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold text-xs">
                  Nagad (নগদ)
                </div>
                <Smartphone className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">অফিসিয়াল নম্বর:</p>
                <div className="text-lg font-mono font-black text-white mt-0.5">
                  {ispProfile.nagadMerchant || '01711000000'}
                </div>
                <span className="text-[10px] text-amber-300 font-semibold">(Personal / Send Money)</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <p>১. নগদ অ্যাপে Send Money করুন</p>
                <p>২. রেফারেন্সে গ্রাহক আইডি অথবা মোবাইল নম্বর দিন</p>
                <p>৩. এসএমএস নোটিফিকেশন চেক করুন</p>
              </div>
            </div>

            {/* Rocket Card */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-purple-500/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="px-3 py-1 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold text-xs">
                  Rocket (রকেট)
                </div>
                <Smartphone className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">অফিসিয়াল নম্বর:</p>
                <div className="text-lg font-mono font-black text-white mt-0.5">
                  {ispProfile.rocketMerchant || '01711000000'}
                </div>
                <span className="text-[10px] text-purple-300 font-semibold">(Personal Transfer)</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <p>১. রকেটে সেন্ড মানি করুন</p>
                <p>২. রেফারেন্সে আপনার গ্রাহক আইডি দিন</p>
                <p>৩. হেল্পলাইনে জানিয়ে বিল ক্লিয়ার নিশ্চিত করুন</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. TECHNICAL INFRASTRUCTURE & NETWORK HIGHLIGHTS */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-xl sm:text-3xl font-black text-white">
            শক্তিশালী ব্রডব্যান্ড প্রযুক্তি ও অবকাঠামো
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            সর্বাধুনিক অপটিক্যাল লেজার প্রযুক্তি ও অপ্টিমাইজড রাউটিংয়ের মাধ্যমে সেরা অভিজ্ঞতা
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">গিগাবিট ফাইবার FTTH</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              সরাসরি আপনার বাসা বা অফিসে অপটিক্যাল ফাইবার তারের মাধ্যমে পিওর সিগন্যাল সংযোগ।
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">৯৯.৯% আপটাইম গ্যারান্টি</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              রিডান্ড্যান্ট আপস্ট্রিম ব্যাকবোন অপটিক্যাল রিং নেটওয়ার্ক যাতে কখনোই সংযোগ বিচ্ছিন্ন না হয়।
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">BDIX ও গেমিং ক্যাশিং</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              বাংলাদেশি সব সার্ভার ও অনলাইন গেমিংয়ে মাত্র ১–৫ মিলিসেকেন্ড আল্ট্রা-লো ল্যাটেন্সি।
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">২৪/৭ জরুরি হেল্পলাইন</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              অন-কল দক্ষ ফাইবার টেকনিশিয়ান এবং নিবেদিত কাস্টমার সাপোর্ট টিম সব সময় প্রস্তুত।
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. COMPANY CONTACT & HELPLINE SECTION */}
      {/* ========================================================================= */}
      <section className={`py-12 sm:py-16 border-t ${
        isDark ? 'border-slate-800/80 bg-slate-950/80' : 'border-purple-500/20 bg-slate-900/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-xl sm:text-3xl font-black text-white">
              যোগাযোগ ও কাস্টমার কেয়ার
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              নতুন সংযোগের জন্য অথবা যে কোনো কারিগরি প্রয়োজনে আমাদের সাথে যোগাযোগ করুন
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {/* Phone */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400">হেল্পলাইন কল</h4>
                <a href={`tel:${ispProfile.emergencyHotline || ispProfile.supportPhone}`} className="text-sm font-bold text-white font-mono hover:text-cyan-400">
                  {ispProfile.emergencyHotline || ispProfile.supportPhone}
                </a>
                <span className="text-[10px] text-emerald-400 block mt-0.5 font-semibold">২৪/৭ উন্মুক্ত</span>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400">হোয়াটসঅ্যাপ সাপোর্ট</h4>
                <a 
                  href={`https://wa.me/88${(ispProfile.whatsappSettings?.senderPhone || ispProfile.supportPhone).replace(/[^0-9]/g, '')}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-sm font-bold text-white font-mono hover:text-emerald-400"
                >
                  {ispProfile.whatsappSettings?.senderPhone || ispProfile.supportPhone}
                </a>
                <span className="text-[10px] text-slate-400 block mt-0.5">দ্রুত চ্যাট সহায়তা</span>
              </div>
            </div>

            {/* Email */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400">অফিসিয়াল ইমেইল</h4>
                <a href={`mailto:${ispProfile.supportEmail}`} className="text-xs font-bold text-white hover:text-indigo-400 break-all">
                  {ispProfile.supportEmail || 'support@isp.net'}
                </a>
                <span className="text-[10px] text-slate-400 block mt-0.5">কর্পোরেট ইনকোয়ারি</span>
              </div>
            </div>

            {/* Address */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400">অফিস ঠিকানা</h4>
                <p className="text-xs text-white leading-relaxed mt-0.5">
                  {ispProfile.address || 'ঢাকা, বাংলাদেশ'}
                </p>
                <span className="text-[10px] text-slate-400 block mt-0.5">প্রধান কার্যালয়</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
