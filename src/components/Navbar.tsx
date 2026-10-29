import React, { useState, useEffect } from 'react';
import { Wifi, Search, Shield, Menu, X, PhoneCall, LogOut, LayoutDashboard, User, Crown, Home as HomeIcon, UserCheck, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCustomer } from '../context/CustomerContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { ThemeToggle } from './ThemeToggle';
import { StaffAccessModal } from './StaffAccessModal';

export type NavViewMode = 'home' | 'search' | 'login' | 'customer-login' | 'admin-login' | 'customer-portal' | 'admin-dashboard' | 'ceo-tm';

interface NavbarProps {
  activeTab: NavViewMode;
  onNavigate: (tab: NavViewMode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onNavigate }) => {
  const { 
    isAuthenticated, 
    isCustomerAuthenticated, 
    customerUser, 
    user, 
    logout, 
    customerLogout, 
    isCeoTmAuthenticated, 
    ceoTmLogout,
    isSearchOperatorAuthenticated, 
    currentSearchOperator,
    isStaffAuthorized
  } = useAuth();
  const { ispProfile } = useCustomer();
  const { isDark } = useTheme();
  const { addToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  // Shortcut Ctrl+Shift+A or Cmd+Shift+A to open staff access modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setStaffModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavClick = (tab: NavViewMode) => {
    onNavigate(tab);
    setMobileMenuOpen(false);
  };

  const handleLogoClick = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setStaffModalOpen(true);
        return 0;
      }
      return next;
    });

    setTimeout(() => {
      setLogoClicks(0);
    }, 1500);

    handleNavClick(isCustomerAuthenticated ? 'customer-portal' : 'home');
  };

  // Visibility logic strictly adhering to user intent:
  // Customers and public visitors MUST ONLY see:
  // 1. Company Info (Home)
  // 2. User Login (Customer Login / My Customer Portal)
  // "Search Portal", "Admin Login", and "CEO TM Panel" MUST BE COMPLETELY HIDDEN
  // unless CEO grants permission from CEO TM Panel (ispProfile.portalVisibility toggles)
  // OR the user logs in with authorized credentials created by the CEO (Operator / Admin / CEO)
  // OR device is specifically authorized by staff key in this session (and not logged in as a customer).
  const isCustomerMode = isCustomerAuthenticated && !isAuthenticated && !isCeoTmAuthenticated;

  const canSeeSearchPortal = Boolean(ispProfile.portalVisibility?.showSearchPortalToPublic) || 
    (!isCustomerMode && (isSearchOperatorAuthenticated || isAuthenticated || isCeoTmAuthenticated || isStaffAuthorized));

  const canSeeAdminLogin = Boolean(ispProfile.portalVisibility?.showAdminLoginToPublic) || 
    (!isCustomerMode && (isAuthenticated || isCeoTmAuthenticated || isStaffAuthorized));

  const canSeeCeoPanel = Boolean(ispProfile.portalVisibility?.showCeoPanelToPublic) || 
    (!isCustomerMode && (isCeoTmAuthenticated || isStaffAuthorized));

  const handleAdminLogout = async () => {
    try {
      await logout();
      addToast('info', 'লগআউট সম্পন্ন', 'এডমিন সফলভাবে লগআউট করেছেন।');
      handleNavClick('home');
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const handleCustomerLogout = () => {
    customerLogout();
    addToast('info', 'লগআউট সম্পন্ন', 'গ্রাহক সেশন সফলভাবে সমাপ্ত হয়েছে।');
    handleNavClick('home');
  };

  const handleCeoLogout = () => {
    ceoTmLogout();
    addToast('info', 'CEO সেশন সমাপ্ত', 'CEO TM মাস্টার সেশন সফলভাবে সমাপ্ত হয়েছে।');
    handleNavClick('home');
  };

  return (
    <header className={`sticky top-0 z-40 w-full transition-colors duration-300 ${
      isDark
        ? 'border-b border-slate-800/80 bg-[#0A0F1D]/90 backdrop-blur-xl text-slate-100 shadow-md shadow-black/40'
        : 'border-b border-purple-500/20 bg-[#0F172A]/85 backdrop-blur-xl text-slate-100 shadow-lg shadow-purple-950/20'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Logo & Brand Name */}
          <div 
            onClick={handleLogoClick}
            title="NetPulse ISP (স্টাফ এক্সেসের জন্য ৩ বার ক্লিক করুন)"
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 group-hover:shadow-cyan-500/40 transition-all">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-white tracking-tight group-hover:text-cyan-400 transition-colors">
                  {ispProfile.companyName.split(' ')[0]}
                </span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-mono hidden xs:inline-block font-semibold">
                  ISP Portal
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
                WiFi Broadband Network
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {/* Home - Company Info (Always visible to all customers) */}
            <button
              onClick={() => handleNavClick('home')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'home'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <HomeIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>কোম্পানি তথ্য</span>
            </button>

            {/* Protected Search Portal - Hidden from customers unless permitted */}
            {canSeeSearchPortal && (
              <button
                onClick={() => handleNavClick('search')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'search'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>সার্চ পোর্টাল</span>
                {isSearchOperatorAuthenticated && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            )}

            {/* User / Customer Login or Customer Portal */}
            {isCustomerAuthenticated && customerUser ? (
              <button
                onClick={() => handleNavClick('customer-portal')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'customer-portal'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-xs'
                    : 'text-cyan-400 hover:text-white hover:bg-cyan-950/40 border border-cyan-500/20'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>মাই পোর্টাল ({customerUser.name.split(' ')[0]})</span>
              </button>
            ) : (
              <button
                onClick={() => handleNavClick('customer-login')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'customer-login'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>ইউজার লগইন</span>
              </button>
            )}

            {/* Admin Panel / Login - Hidden from customers unless permitted */}
            {isAuthenticated ? (
              <button
                onClick={() => handleNavClick('admin-dashboard')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'admin-dashboard'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />
                <span>এডমিন প্যানেল</span>
              </button>
            ) : canSeeAdminLogin ? (
              <button
                onClick={() => handleNavClick('admin-login')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'admin-login'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>এডমিন লগইন</span>
              </button>
            ) : null}

            {/* CEO TM Master Executive Button - Hidden from customers unless permitted */}
            {canSeeCeoPanel && (
              <button
                onClick={() => handleNavClick('ceo-tm')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'ceo-tm'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black shadow-md shadow-amber-500/30 ring-2 ring-amber-400/40'
                    : isCeoTmAuthenticated
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                    : 'bg-amber-950/30 text-amber-300/90 hover:text-amber-200 hover:bg-amber-950/60 border border-amber-500/30'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>CEO TM</span>
                {isCeoTmAuthenticated && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            )}
          </nav>

          {/* Desktop Right Side / Theme Toggle & Auth Buttons */}
          <div className="hidden md:flex items-center gap-2.5">
            
            {/* Theme Toggle Button */}
            <ThemeToggle />

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs">
              <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono text-slate-200 font-medium">{ispProfile.emergencyHotline}</span>
            </div>

            {/* Customer is logged in */}
            {isCustomerAuthenticated && customerUser && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavClick('customer-portal')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  {customerUser.name.split(' ')[0]} ({customerUser.uid})
                </button>
                <button
                  onClick={handleCustomerLogout}
                  title="Logout Customer"
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700/70 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Admin is logged in */}
            {isAuthenticated && user && !isCustomerAuthenticated && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavClick('admin-dashboard')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Admin Panel
                </button>
                <button
                  onClick={handleAdminLogout}
                  title="Logout Admin"
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700/70 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* CEO TM is logged in (and not already shown in customer/admin flow) */}
            {isCeoTmAuthenticated && !isAuthenticated && !isCustomerAuthenticated && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleNavClick('ceo-tm')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5" />
                  CEO TM Active
                </button>
                <button
                  onClick={handleCeoLogout}
                  title="Logout CEO TM"
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700/70 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Neither is logged in */}
            {!isAuthenticated && !isCustomerAuthenticated && !isCeoTmAuthenticated && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavClick('customer-login')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  ইউজার লগইন
                </button>
                {canSeeAdminLogin && (
                  <button
                    onClick={() => handleNavClick('admin-login')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white text-xs font-bold transition-all border border-slate-700 shadow-xs"
                  >
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    অ্যাডমিন
                  </button>
                )}
              </div>
            )}

          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />

            {/* Mobile CEO Button - Only if permitted */}
            {canSeeCeoPanel && (
              <button
                onClick={() => handleNavClick('ceo-tm')}
                className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                  activeTab === 'ceo-tm'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                }`}
                title="CEO TM Panel"
              >
                <Crown className="w-4 h-4" />
              </button>
            )}

            {isCustomerAuthenticated ? (
              <button
                onClick={() => handleNavClick('customer-portal')}
                className="px-2.5 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-bold shadow-xs"
              >
                মাই পোর্টাল
              </button>
            ) : isAuthenticated ? (
              <button
                onClick={() => handleNavClick('admin-dashboard')}
                className="px-2.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs"
              >
                Admin
              </button>
            ) : null}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className={`md:hidden border-b px-4 py-4 space-y-2.5 shadow-2xl backdrop-blur-xl ${
          isDark
            ? 'border-slate-800 bg-[#0A0F1D]/95 text-slate-100'
            : 'border-purple-500/20 bg-[#0F172A]/95 text-slate-100'
        }`}>
          {/* Company Info & Home - Always visible to customers */}
          <button
            onClick={() => handleNavClick('home')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
              activeTab === 'home' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <HomeIcon className="w-4 h-4 text-cyan-400" />
            <span>কোম্পানি তথ্য ও প্যাকেজ (Home)</span>
          </button>

          {/* Search Portal in Mobile Drawer - Only if permitted */}
          {canSeeSearchPortal && (
            <button
              onClick={() => handleNavClick('search')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                activeTab === 'search' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>সুরক্ষিত কাস্টমার সার্চ পোর্টাল</span>
              {isSearchOperatorAuthenticated && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                  লগইন করা
                </span>
              )}
            </button>
          )}

          {/* CEO TM in Mobile Drawer - Only if permitted */}
          {canSeeCeoPanel && (
            <button
              onClick={() => handleNavClick('ceo-tm')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-extrabold shadow-md min-h-[44px] transition-colors ${
                activeTab === 'ceo-tm'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950'
                  : 'bg-amber-950/40 text-amber-300 border border-amber-500/40'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span>CEO TM মাস্টার সিকিউরিটি</span>
            </button>
          )}

          {isCustomerAuthenticated && customerUser ? (
            <>
              <button
                onClick={() => handleNavClick('customer-portal')}
                className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-bold shadow-md min-h-[44px]"
              >
                <User className="w-4 h-4" />
                <span>মাই গ্রাহক পোর্টাল ({customerUser.name})</span>
              </button>
              <button
                onClick={handleCustomerLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-950/40 text-rose-300 text-sm font-semibold border border-rose-800/40 min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>গ্রাহক লগআউট (Logout)</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => handleNavClick('customer-login')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold shadow-md min-h-[44px] transition-colors ${
                activeTab === 'customer-login'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                  : 'bg-slate-800/80 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              <User className="w-4 h-4 text-cyan-400" />
              <span>ইউজার / গ্রাহক লগইন (User Login)</span>
            </button>
          )}

          {/* CEO TM Active mobile option */}
          {isCeoTmAuthenticated && (
            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleNavClick('ceo-tm')}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 text-sm font-black shadow-md min-h-[44px]"
              >
                <Crown className="w-4 h-4" />
                <span>CEO TM মাস্টার প্যানেল</span>
              </button>
              <button
                onClick={handleCeoLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-950/40 text-amber-300 text-sm font-semibold border border-amber-800/40 min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>CEO TM লগআউট (Logout)</span>
              </button>
            </div>
          )}

          {isAuthenticated ? (
            <>
              <button
                onClick={() => handleNavClick('admin-dashboard')}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-md min-h-[44px]"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>এডমিন ড্যাশবোর্ড (Admin Dashboard)</span>
              </button>
              <button
                onClick={handleAdminLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-950/40 text-rose-300 text-sm font-semibold border border-rose-800/40 min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>এডমিন লগআউট ({user?.username})</span>
              </button>
            </>
          ) : canSeeAdminLogin ? (
            <button
              onClick={() => handleNavClick('admin-login')}
              className={`w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold border min-h-[44px] transition-colors ${
                activeTab === 'admin-login'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Shield className="w-4 h-4 text-blue-400" />
              <span>এডমিন লগইন (Admin Login)</span>
            </button>
          ) : null}

          {/* Discreet Staff Access Trigger in Mobile Drawer */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 px-2">
            <span>24/7 Helpline: <strong className="font-mono text-cyan-300">{ispProfile.emergencyHotline}</strong></span>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setStaffModalOpen(true);
              }}
              className="text-[11px] text-slate-500 hover:text-cyan-400 inline-flex items-center gap-1 p-1 rounded cursor-pointer"
              title="স্টাফ ও প্রশাসনিক অ্যাক্সেস"
            >
              <Lock className="w-3 h-3" />
              <span>স্টাফ</span>
            </button>
          </div>
        </div>
      )}

      {/* Staff & Admin Access Modal */}
      <StaffAccessModal
        isOpen={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        onNavigate={handleNavClick}
      />
    </header>
  );
};

