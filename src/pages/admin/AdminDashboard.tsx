import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Reseller } from '../../types';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { useReseller } from '../../context/ResellerContext';
import { useToast } from '../../context/ToastContext';
import { AdminLayout, AdminTab } from './AdminLayout';
import { DashboardView } from './DashboardView';
import { CustomersView } from './CustomersView';
import { PaymentsView } from './PaymentsView';
import { ReportsView } from './ReportsView';
import { SettingsView } from './SettingsView';
import { RoutersView } from './RoutersView';
import { PaymentRequestsView } from './PaymentRequestsView';
import { CustomerDetailsModal } from '../../components/CustomerDetailsModal';
import { CustomerFormModal } from '../../components/CustomerFormModal';
import { PaymentModal } from '../../components/PaymentModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { RemoteRouterConfigModal } from '../../components/RemoteRouterConfigModal';
import { LaserDiagnosticModal } from '../../components/LaserDiagnosticModal';
import { RouterWebLoginModal } from '../../components/RouterWebLoginModal';
import { ResellerMobilePortal } from '../reseller/ResellerMobilePortal';
import { doesCustomerBelongToReseller } from '../../utils/resellerIsolation';
import { ShieldAlert } from 'lucide-react';

interface AdminDashboardProps {
  onNavigatePublic: () => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigatePublic, onLogout }) => {
  const { deleteCustomer } = useCustomer();
  const { hasPermission, isReseller, user } = useAuth();
  const { resellers } = useReseller();
  const { addToast } = useToast();

  const [resellerViewMode, setResellerViewMode] = useState<'admin' | 'mobile'>('admin');

  // Active reseller resolved safely
  const currentReseller = useMemo<Reseller | null>(() => {
    if (!isReseller && user?.role !== 'Reseller') return null;
    const found = resellers.find(
      (r) =>
        r.id === user?.resellerId ||
        r.code === user?.resellerId ||
        r.code === user?.resellerCode ||
        (r.username && user?.accountUsername && r.username.toLowerCase() === user.accountUsername.toLowerCase()) ||
        (r.name && user?.username && r.name.toLowerCase() === user.username.toLowerCase())
    );
    if (found) return found;
    return {
      id: user?.resellerId || user?.uid || 'reseller',
      code: user?.resellerCode || 'RES',
      name: user?.resellerName || user?.username || 'Reseller Admin',
      ownerName: user?.username || 'Reseller Admin',
      phone: user?.phone || '',
      area: '',
      balance: 0,
      commissionRate: 15,
      billingType: 'prepaid',
      status: 'Active',
      username: user?.accountUsername || user?.username || 'reseller',
      password: '',
      createdAt: new Date().toISOString(),
    };
  }, [isReseller, user, resellers]);

  const permittedTabs = useMemo<AdminTab[]>(() => {
    const tabs: { id: AdminTab; perm: string }[] = [
      { id: 'dashboard', perm: 'dashboard' },
      { id: 'customers', perm: 'customers' },
      { id: 'requests', perm: 'requests' },
      { id: 'payments', perm: 'payments' },
      { id: 'routers', perm: 'routers' },
      { id: 'reports', perm: 'reports' },
      { id: 'settings', perm: 'settings' },
    ];
    return tabs.filter((t) => hasPermission(t.perm)).map((t) => t.id);
  }, [hasPermission]);

  const [currentTab, setCurrentTab] = useState<AdminTab>(() => {
    return permittedTabs[0] || 'customers';
  });
  const [selectedResellerFilter, setSelectedResellerFilter] = useState<string>('All');

  // Automatically ensure current tab is valid whenever permittedTabs change
  useEffect(() => {
    if (permittedTabs.length > 0 && !permittedTabs.includes(currentTab)) {
      setCurrentTab(permittedTabs[0]);
    }
  }, [permittedTabs, currentTab]);

  // Modals state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Router Config & Laser Diagnostic Modals
  const [isRouterConfigOpen, setIsRouterConfigOpen] = useState(false);
  const [routerConfigCustomer, setRouterConfigCustomer] = useState<Customer | null>(null);

  const [isLaserModalOpen, setIsLaserModalOpen] = useState(false);
  const [laserCustomer, setLaserCustomer] = useState<Customer | null>(null);

  const [isRouterWebLoginOpen, setIsRouterWebLoginOpen] = useState(false);
  const [routerWebCustomer, setRouterWebCustomer] = useState<Customer | null>(null);

  const [customerFilterStatus, setCustomerFilterStatus] = useState<any>('All');

  // Actions with strict permission validation
  const handleOpenAddCustomer = () => {
    if (!hasPermission('add_customer')) {
      addToast('error', 'পারমিশন নেই', 'CEO TM প্যানেল থেকে আপনাকে নতুন গ্রাহক যুক্ত করার পারমিশন দেওয়া হয়নি।');
      return;
    }
    setCustomerToEdit(null);
    setIsFormOpen(true);
  };

  const isResellerScope = isReseller || user?.role === 'Reseller';

  const handleOpenEditCustomer = (customer: Customer) => {
    if (!hasPermission('add_customer')) {
      addToast('error', 'পারমিশন নেই', 'CEO TM প্যানেল থেকে আপনাকে গ্রাহক এডিট করার পারমিশন দেওয়া হয়নি।');
      return;
    }
    if (isResellerScope && !doesCustomerBelongToReseller(customer, currentReseller)) {
      addToast('error', 'অননুমোদিত', 'অন্য রিসেলার এর গ্রাহক এডিট করার অনুমতি নেই।');
      return;
    }
    setCustomerToEdit(customer);
    setIsFormOpen(true);
  };

  const handleSelectCustomer = (customer: Customer) => {
    if (isResellerScope && !doesCustomerBelongToReseller(customer, currentReseller)) {
      addToast('error', 'অননুমোদিত', 'অন্য রিসেলার এর গ্রাহকের তথ্য দেখার অনুমতি নেই।');
      return;
    }
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
  };

  const handleOpenRecordPayment = (customer?: Customer) => {
    if (!hasPermission('record_payment')) {
      addToast('error', 'পারমিশন নেই', 'CEO TM প্যানেল থেকে আপনাকে বিল গ্রহণ করার পারমিশন দেওয়া হয়নি।');
      return;
    }
    if (customer && isResellerScope && !doesCustomerBelongToReseller(customer, currentReseller)) {
      addToast('error', 'অননুমোদিত', 'অন্য রিসেলার এর গ্রাহকের বিল গ্রহণ করার অনুমতি নেই।');
      return;
    }
    setPaymentCustomer(customer || null);
    setIsPaymentOpen(true);
  };

  const handleOpenRouterConfig = (customer: Customer) => {
    if (!hasPermission('router_config')) {
      addToast('error', 'পারমিশন নেই', 'CEO TM প্যানেল থেকে আপনাকে রাউটার কনফিগ করার পারমিশন দেওয়া হয়নি।');
      return;
    }
    if (isResellerScope && !doesCustomerBelongToReseller(customer, currentReseller)) {
      addToast('error', 'অননুমোদিত', 'অন্য রিসেলার এর গ্রাহকের রাউটার কনফিগ করার অনুমতি নেই।');
      return;
    }
    setRouterConfigCustomer(customer);
    setIsRouterConfigOpen(true);
  };

  const handleOpenLaserModal = (customer: Customer) => {
    if (!hasPermission('router_config')) {
      addToast('error', 'পারমিশন নেই', 'CEO TM প্যানেল থেকে আপনাকে লেজার টেস্ট করার পারমিশন দেওয়া হয়নি।');
      return;
    }
    if (isResellerScope && !doesCustomerBelongToReseller(customer, currentReseller)) {
      addToast('error', 'অননুমোদিত', 'অন্য রিসেলার এর গ্রাহকের লেজার টেস্ট করার অনুমতি নেই।');
      return;
    }
    setLaserCustomer(customer);
    setIsLaserModalOpen(true);
  };

  const handleOpenRouterWebLogin = (customer: Customer) => {
    if (!hasPermission('router_config')) {
      addToast('error', 'পারমিশন নেই', 'CEO TM প্যানেল থেকে আপনাকে রাউটার লগইন করার পারমিশন দেওয়া হয়নি।');
      return;
    }
    if (isResellerScope && !doesCustomerBelongToReseller(customer, currentReseller)) {
      addToast('error', 'অননুমোদিত', 'অন্য রিসেলার এর গ্রাহকের রাউটারে লগইন করার অনুমতি নেই।');
      return;
    }
    setRouterWebCustomer(customer);
    setIsRouterWebLoginOpen(true);
  };

  const handleOpenDelete = (customer: Customer) => {
    if (!hasPermission('delete_customer')) {
      addToast('error', 'পারমিশন নেই', 'CEO TM প্যানেল থেকে আপনাকে গ্রাহক ডিলিট করার পারমিশন দেওয়া হয়নি।');
      return;
    }
    if (isResellerScope && !doesCustomerBelongToReseller(customer, currentReseller)) {
      addToast('error', 'অননুমোদিত', 'অন্য রিসেলার এর গ্রাহক ডিলিট করার অনুমতি নেই।');
      return;
    }
    setCustomerToDelete(customer);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    if (!hasPermission('delete_customer')) {
      addToast('error', 'পারমিশন নেই', 'গ্রাহক ডিলিট করার অনুমতি নেই।');
      return;
    }
    if (isResellerScope && !doesCustomerBelongToReseller(customerToDelete, currentReseller)) {
      addToast('error', 'অননুমোদিত', 'অন্য রিসেলার এর গ্রাহক ডিলিট করার অনুমতি নেই।');
      return;
    }
    setIsDeleting(true);
    try {
      await deleteCustomer(customerToDelete.id);
      addToast('success', 'Deleted Successfully', `Customer ${customerToDelete.name} has been removed.`);
      setIsDeleteOpen(false);
      setCustomerToDelete(null);
      if (selectedCustomer?.id === customerToDelete.id) {
        setIsDetailsOpen(false);
      }
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message || 'Could not delete customer.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFilterDue = () => {
    if (hasPermission('customers')) {
      setCustomerFilterStatus('Due');
      setCurrentTab('customers');
    }
  };

  if ((isReseller || user?.role === 'Reseller') && resellerViewMode === 'mobile') {
    return (
      <ResellerMobilePortal
        onLogout={onLogout}
        onNavigatePublic={onNavigatePublic}
        onSwitchToAdminPanel={() => setResellerViewMode('admin')}
      />
    );
  }

  if (permittedTabs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-rose-500/40 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">কোনো অপশন দেখার অনুমতি নেই</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            CEO TM প্যানেল থেকে আপনার অ্যাকাউন্টে কোনো অপশনের পারমিশন সক্রিয় করা হয়নি। দয়া করে CEO TM (Tamim) এর সাথে যোগাযোগ করুন।
          </p>
          <button
            onClick={onNavigatePublic}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
          >
            পাবলিক পোর্টালে যান
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout
      currentTab={currentTab}
      onSelectTab={(tab) => {
        setCurrentTab(tab);
        if (tab === 'customers') {
          setCustomerFilterStatus('All');
        }
      }}
      onOpenAddCustomer={handleOpenAddCustomer}
      onOpenRecordPayment={() => handleOpenRecordPayment()}
      onNavigatePublic={onNavigatePublic}
      onLogout={onLogout}
      onSwitchToMobileView={() => setResellerViewMode('mobile')}
    >
      {currentTab === 'dashboard' && (
        <DashboardView
          onNavigateTab={(tab) => {
            setCurrentTab(tab);
            if (tab === 'customers') setCustomerFilterStatus('All');
          }}
          onOpenAddCustomer={handleOpenAddCustomer}
          onOpenRecordPayment={() => handleOpenRecordPayment()}
          onSelectCustomer={handleSelectCustomer}
          onFilterDue={handleFilterDue}
        />
      )}

      {currentTab === 'customers' && (
        <CustomersView
          onOpenAddCustomer={handleOpenAddCustomer}
          onSelectCustomer={handleSelectCustomer}
          onEditCustomer={handleOpenEditCustomer}
          onDeleteCustomer={handleOpenDelete}
          onRecordPayment={handleOpenRecordPayment}
          onOpenRouterConfig={handleOpenRouterConfig}
          onOpenLaserModal={handleOpenLaserModal}
          onOpenRouterWebLogin={handleOpenRouterWebLogin}
          initialFilterStatus={customerFilterStatus}
          initialResellerFilter={selectedResellerFilter}
        />
      )}

      {currentTab === 'payments' && (
        <PaymentsView
          onOpenRecordPayment={() => handleOpenRecordPayment()}
        />
      )}

      {currentTab === 'requests' && <PaymentRequestsView />}

      {currentTab === 'routers' && <RoutersView />}

      {currentTab === 'reports' && <ReportsView />}

      {currentTab === 'settings' && <SettingsView />}

      {/* Global Modals */}
      <CustomerDetailsModal
        customer={selectedCustomer}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={handleOpenEditCustomer}
        onRecordPayment={handleOpenRecordPayment}
        onOpenRouterConfig={handleOpenRouterConfig}
        onOpenLaserModal={handleOpenLaserModal}
        onOpenRouterWebLogin={handleOpenRouterWebLogin}
        isAdmin={true}
      />

      <RouterWebLoginModal
        isOpen={isRouterWebLoginOpen}
        onClose={() => {
          setIsRouterWebLoginOpen(false);
          setRouterWebCustomer(null);
        }}
        customer={routerWebCustomer}
      />

      <RemoteRouterConfigModal
        isOpen={isRouterConfigOpen}
        onClose={() => {
          setIsRouterConfigOpen(false);
          setRouterConfigCustomer(null);
        }}
        customer={routerConfigCustomer}
        onOpenRouterWebLogin={handleOpenRouterWebLogin}
      />

      <LaserDiagnosticModal
        isOpen={isLaserModalOpen}
        onClose={() => {
          setIsLaserModalOpen(false);
          setLaserCustomer(null);
        }}
        customer={laserCustomer}
        onOpenRouterConfig={handleOpenRouterConfig}
        onOpenRouterWebLogin={handleOpenRouterWebLogin}
      />

      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setCustomerToEdit(null);
        }}
        customerToEdit={customerToEdit}
        defaultReseller={currentReseller}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setPaymentCustomer(null);
        }}
        initialCustomer={paymentCustomer}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setCustomerToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title={`Delete Customer: ${customerToDelete?.name || ''}`}
        message={`Are you sure you want to permanently delete ${customerToDelete?.name} (${customerToDelete?.uid})? All associated subscriber credentials and records will be deleted.`}
        confirmText="Yes, Delete Customer"
        isLoading={isDeleting}
      />
    </AdminLayout>
  );
};
