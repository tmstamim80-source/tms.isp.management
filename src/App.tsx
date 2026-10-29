/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomerProvider, useCustomer } from './context/CustomerContext';
import { ResellerProvider } from './context/ResellerContext';
import { MikroTikProvider } from './context/MikroTikContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Navbar, NavViewMode } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { CustomerPortal } from './pages/CustomerPortal';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CeoTmPortal } from './pages/CeoTmPortal';
import { ProtectedSearchPortal } from './pages/ProtectedSearchPortal';

function MainApp() {
  const { 
    isAuthenticated, 
    isCustomerAuthenticated, 
    isCeoTmAuthenticated,
    isSearchOperatorAuthenticated,
    isStaffAuthorized,
    customerLogout, 
    logout 
  } = useAuth();
  const { ispProfile } = useCustomer();
  const { isDark } = useTheme();
  const [currentView, setCurrentView] = useState<NavViewMode>('home');

  const isCustomerMode = isCustomerAuthenticated && !isAuthenticated && !isCeoTmAuthenticated;

  const canSeeCeoPanel = Boolean(ispProfile.portalVisibility?.showCeoPanelToPublic) || 
    (!isCustomerMode && (isCeoTmAuthenticated || isStaffAuthorized));
  const canSeeAdminLogin = Boolean(ispProfile.portalVisibility?.showAdminLoginToPublic) || 
    (!isCustomerMode && (isAuthenticated || isCeoTmAuthenticated || isStaffAuthorized));
  const canSeeSearchPortal = Boolean(ispProfile.portalVisibility?.showSearchPortalToPublic) || 
    (!isCustomerMode && (isSearchOperatorAuthenticated || isAuthenticated || isCeoTmAuthenticated || isStaffAuthorized));

  // Automatically ensure views sync if auth state changes (e.g. logout)
  React.useEffect(() => {
    if (currentView === 'admin-dashboard' && !isAuthenticated) {
      setCurrentView('admin-login');
      return;
    }
    if (currentView === 'customer-portal' && !isCustomerAuthenticated) {
      setCurrentView('customer-login');
      return;
    }
  }, [currentView, isAuthenticated, isCustomerAuthenticated]);

  const handleNavigate = (view: NavViewMode) => {
    if (view === 'admin-dashboard' && !isAuthenticated) {
      setCurrentView('admin-login');
      return;
    }
    if (view === 'customer-portal' && !isCustomerAuthenticated) {
      setCurrentView('customer-login');
      return;
    }
    // If logged-in customer attempts to access administrative pages
    if (isCustomerMode && (view === 'ceo-tm' || view === 'admin-dashboard')) {
      setCurrentView('customer-portal');
      return;
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If in Admin Dashboard and authenticated
  if (currentView === 'admin-dashboard' && isAuthenticated) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-theme-black text-slate-100' : 'bg-theme-colorful text-slate-100'} antialiased selection:bg-cyan-500 selection:text-white transition-colors duration-500`}>
        <AdminDashboard 
          onNavigatePublic={() => handleNavigate('home')} 
          onLogout={() => handleNavigate('admin-login')}
        />
      </div>
    );
  }

  // If in Customer Portal and customer is authenticated
  if (currentView === 'customer-portal' && isCustomerAuthenticated) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-theme-black text-slate-100' : 'bg-theme-colorful text-slate-100'} flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-white transition-colors duration-500 relative`}>
        <div className="fixed inset-0 cyber-grid-overlay pointer-events-none opacity-40 z-0" />
        <div className="relative z-10 flex flex-col flex-1">
          <Navbar
            activeTab="customer-portal"
            onNavigate={handleNavigate}
          />
          <main className="flex-1">
            <CustomerPortal 
              onLogout={() => {
                customerLogout();
                handleNavigate('home');
              }} 
            />
          </main>
          <Footer onNavigate={handleNavigate} />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-theme-black text-slate-100' : 'bg-theme-colorful text-slate-100'} flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-white transition-colors duration-500 relative`}>
      {/* Ambient background glow effects */}
      <div className="fixed inset-0 cyber-grid-overlay pointer-events-none opacity-40 z-0" />
      
      <div className="relative z-10 flex flex-col flex-1">
        <Navbar
          activeTab={currentView}
          onNavigate={handleNavigate}
        />

        <main className="flex-1">
          {currentView === 'ceo-tm' ? (
            <CeoTmPortal 
              onBackToHome={() => handleNavigate('home')}
              onNavigateToAdmin={() => handleNavigate(isAuthenticated ? 'admin-dashboard' : 'admin-login')}
            />
          ) : currentView === 'search' ? (
            <ProtectedSearchPortal
              onBackToHome={() => handleNavigate('home')}
              onNavigateToCustomerPortal={() => handleNavigate('customer-portal')}
            />
          ) : currentView === 'admin-login' || currentView === 'customer-login' || currentView === 'login' ? (
            <Login
              initialTab={currentView === 'admin-login' ? 'admin' : 'customer'}
              onSuccess={() => handleNavigate('admin-dashboard')}
              onCustomerSuccess={() => handleNavigate('customer-portal')}
              onBackToHome={() => handleNavigate('home')}
            />
          ) : (
            <Home 
              onNavigateToAdmin={() => handleNavigate(isAuthenticated ? 'admin-dashboard' : 'admin-login')}
              onNavigateToCustomerPortal={() => handleNavigate('customer-portal')}
              onNavigateToLogin={() => handleNavigate('customer-login')}
            />
          )}
        </main>

        <Footer onNavigate={handleNavigate} />
      </div>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Caught by Boundary:', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070D18] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#0D182A] border border-cyan-500/30 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30 text-2xl font-bold">
              ⚡
            </div>
            <h2 className="text-lg font-bold text-white">অ্যাপ্লিকেশনটি নিরাপদে রিস্টোর করা হচ্ছে</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              সাময়িক ডাটা লোডিং সমস্যায় ব্ল্যাক স্ক্রিন এড়াতে এই সেফ মোড সক্রিয় হয়েছে। নিচের বাটনে ক্লিক করে পুনরায় চালু করুন।
            </p>
            {this.state.error?.message && (
              <p className="text-[11px] font-mono text-rose-300 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/40 break-words">
                {this.state.error.message}
              </p>
            )}
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                রিলোড করুন (Reload)
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <CustomerProvider>
              <ResellerProvider>
                <MikroTikProvider>
                  <MainApp />
                </MikroTikProvider>
              </ResellerProvider>
            </CustomerProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
