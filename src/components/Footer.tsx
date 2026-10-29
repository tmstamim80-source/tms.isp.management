import React from 'react';
import { Wifi, PhoneCall, Mail, MapPin, ShieldCheck, User, Store } from 'lucide-react';
import { useCustomer } from '../context/CustomerContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { NavViewMode } from './Navbar';

export const Footer: React.FC<{ onNavigate?: (tab: NavViewMode) => void }> = ({ onNavigate }) => {
  const { ispProfile, isFirebaseActive } = useCustomer();
  const { isCustomerAuthenticated, isAuthenticated, isCeoTmAuthenticated, isSearchOperatorAuthenticated, isStaffAuthorized } = useAuth();
  const { isDark } = useTheme();

  const isCustomerMode = isCustomerAuthenticated && !isAuthenticated && !isCeoTmAuthenticated;

  const canSeeSearchPortal = Boolean(ispProfile.portalVisibility?.showSearchPortalToPublic) || 
    (!isCustomerMode && (isSearchOperatorAuthenticated || isAuthenticated || isCeoTmAuthenticated || isStaffAuthorized));

  const canSeeAdminLogin = Boolean(ispProfile.portalVisibility?.showAdminLoginToPublic) || 
    (!isCustomerMode && (isAuthenticated || isCeoTmAuthenticated || isStaffAuthorized));

  return (
    <footer className={`no-print w-full border-t text-xs mt-auto transition-colors duration-300 ${
      isDark
        ? 'border-slate-800 bg-[#070B14] text-slate-400'
        : 'border-purple-500/20 bg-[#0A0D1E] text-slate-400'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-cyan-500/20">
                <Wifi className="w-4 h-4" />
              </div>
              <span className="font-bold text-white text-base">{ispProfile.companyName}</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              {ispProfile.tagline}
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/80 text-[11px] text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isFirebaseActive ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`} />
              <span>{isFirebaseActive ? 'Firestore Cloud Sync' : 'Local Storage Mode'}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Quick Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button 
                  onClick={() => onNavigate?.('home')}
                  className="hover:text-cyan-300 transition-colors py-1 text-slate-300"
                >
                  Home Portal
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.(isCustomerAuthenticated ? 'customer-portal' : 'customer-login')}
                  className="hover:text-cyan-300 transition-colors py-1 text-slate-300 flex items-center gap-1"
                >
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  {isCustomerAuthenticated ? 'My Customer Portal' : 'User / Customer Login'}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.('login')}
                  className="hover:text-emerald-300 transition-colors py-1 text-slate-300 flex items-center gap-1"
                >
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  রিসেলার পোর্টাল (Reseller Login)
                </button>
              </li>
              {canSeeSearchPortal && (
                <li>
                  <button 
                    onClick={() => onNavigate?.('search')}
                    className="hover:text-cyan-300 transition-colors py-1 text-slate-300"
                  >
                    Package & Search
                  </button>
                </li>
              )}
              {canSeeAdminLogin && (
                <li>
                  <button 
                    onClick={() => onNavigate?.('admin-login')}
                    className="hover:text-cyan-300 transition-colors py-1 text-slate-300"
                  >
                    ISP Admin Control Panel
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Customer Support</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-slate-300">
                <PhoneCall className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="font-mono">{ispProfile.emergencyHotline} (24/7 Hotline)</span>
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{ispProfile.supportEmail}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>{ispProfile.address}</span>
              </li>
            </ul>
          </div>

          {/* Notice & Security */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Security & Billing</h4>
            <div className={`p-3.5 rounded-xl border text-[11px] leading-relaxed space-y-1.5 shadow-md ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 text-slate-300'
                : 'bg-purple-950/40 border-purple-500/30 text-slate-300'
            }`}>
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Protected ISP Ledger</span>
              </div>
              <p className="text-slate-400">
                {ispProfile.noticeMessage}
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <p>© {new Date().getFullYear()} {ispProfile.companyName}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Currency: <strong className="text-cyan-300">{ispProfile.currencySymbol} ({ispProfile.currencyCode})</strong></span>
          </div>
        </div>
      </div>
    </footer>
  );
};

