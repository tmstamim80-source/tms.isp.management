import React, { useState, useEffect } from 'react';
import { Customer, CustomerStatus, PaymentStatus, ConnectionType, Reseller } from '../types';
import { useCustomer } from '../context/CustomerContext';
import { useReseller } from '../context/ResellerContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { X, Sparkles, User, Wifi, CreditCard, Save, RotateCcw, Eye, EyeOff, Store } from 'lucide-react';
import { filterPackagesForReseller } from '../utils/resellerIsolation';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
  onCustomerCreated?: (customer: Customer) => void;
  defaultReseller?: Reseller | null;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
  onCustomerCreated,
  defaultReseller,
}) => {
  const { addCustomer, updateCustomer, generateNextUID, packages, ispProfile } = useCustomer();
  const { resellers } = useReseller();
  const { user, isReseller } = useAuth();
  const { addToast } = useToast();
  const { isDark } = useTheme();

  // Find active reseller with fallback
  const currentActiveReseller = React.useMemo(() => {
    if (defaultReseller) return defaultReseller;
    if (!isReseller && user?.role !== 'Reseller') return null;
    if (user?.resellerId) {
      return resellers.find((r) => r.id === user.resellerId || r.code === user.resellerId) || null;
    }
    return (
      resellers.find(
        (r) =>
          (r.username && user?.accountUsername && r.username.toLowerCase() === user.accountUsername.toLowerCase()) ||
          r.id === user?.uid ||
          (r.name && user?.username && r.name.toLowerCase() === user.username.toLowerCase())
      ) || null
    );
  }, [defaultReseller, isReseller, user, resellers]);

  const isResellerScope = isReseller || user?.role === 'Reseller' || Boolean(defaultReseller);

  // Strict multi-tenant package isolation: Reseller only sees own packages + baseline packages
  const availablePackages = React.useMemo(() => {
    if (isResellerScope && currentActiveReseller) {
      return filterPackagesForReseller(packages, currentActiveReseller, true);
    }
    return packages;
  }, [packages, isResellerScope, currentActiveReseller]);

  const isEditMode = Boolean(customerToEdit);

  // Form State
  const [formData, setFormData] = useState({
    uid: '',
    name: '',
    mobile: '',
    alternativeMobile: '',
    email: '',
    address: '',
    area: '',
    resellerId: '',
    resellerCode: '',
    resellerName: '',
    packageName: 'Standard Turbo',
    speed: '20 Mbps',
    monthlyBill: 500,
    monthlyFee: 500,
    connectionType: 'Fiber (FTTH)' as ConnectionType,
    routerId: '',
    macAddress: '',
    ipAddress: '',
    wifiUsername: '',
    pppoePassword: '',
    connectionDate: new Date().toISOString().substring(0, 10),
    installationDate: new Date().toISOString().substring(0, 10),
    lastPaymentDate: '',
    lastPaymentAmount: 0,
    dueAmount: 0,
    nextPaymentDate: '',
    paymentStatus: 'Paid' as PaymentStatus,
    status: 'Active' as CustomerStatus,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPppoePassword, setShowPppoePassword] = useState(false);

  // Set next payment date default (+1 month)
  const calculateDefaultNextPayment = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(7); // standard 7th of month
    return d.toISOString().substring(0, 10);
  };

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        uid: customerToEdit.uid || '',
        name: customerToEdit.name || '',
        mobile: customerToEdit.mobile || '',
        alternativeMobile: customerToEdit.alternativeMobile || '',
        email: customerToEdit.email || '',
        address: customerToEdit.address || '',
        area: customerToEdit.area || '',
        resellerId: customerToEdit.resellerId || '',
        resellerCode: customerToEdit.resellerCode || '',
        resellerName: customerToEdit.resellerName || '',
        packageName: customerToEdit.packageName || 'Standard Turbo',
        speed: customerToEdit.speed || '20 Mbps',
        monthlyBill: customerToEdit.monthlyBill || 500,
        monthlyFee: customerToEdit.monthlyFee || customerToEdit.monthlyBill || 500,
        connectionType: customerToEdit.connectionType || 'Fiber (FTTH)',
        routerId: customerToEdit.routerId || '',
        macAddress: customerToEdit.macAddress || '',
        ipAddress: customerToEdit.ipAddress || '',
        wifiUsername: customerToEdit.wifiUsername || '',
        pppoePassword: customerToEdit.pppoePassword || '',
        connectionDate: customerToEdit.connectionDate || new Date().toISOString().substring(0, 10),
        installationDate: customerToEdit.installationDate || new Date().toISOString().substring(0, 10),
        lastPaymentDate: customerToEdit.lastPaymentDate || '',
        lastPaymentAmount: customerToEdit.lastPaymentAmount || 0,
        dueAmount: customerToEdit.dueAmount || 0,
        nextPaymentDate: customerToEdit.nextPaymentDate || calculateDefaultNextPayment(),
        paymentStatus: customerToEdit.paymentStatus || 'Paid',
        status: customerToEdit.status || 'Active',
        notes: customerToEdit.notes || '',
      });
    } else {
      resetForm();
    }
    setErrors({});
  }, [customerToEdit, isOpen, currentActiveReseller]);

  const resetForm = () => {
    setFormData({
      uid: generateNextUID(),
      name: '',
      mobile: '',
      alternativeMobile: '',
      email: '',
      address: '',
      area: '',
      resellerId: isResellerScope ? (currentActiveReseller?.id || user?.resellerId || '') : '',
      resellerCode: isResellerScope ? (currentActiveReseller?.code || '') : '',
      resellerName: isResellerScope ? (currentActiveReseller?.name || user?.resellerName || '') : '',
      packageName: packages[1]?.name || 'Standard Turbo',
      speed: packages[1]?.speed || '20 Mbps',
      monthlyBill: packages[1]?.price || 500,
      monthlyFee: packages[1]?.price || 500,
      connectionType: 'Fiber (FTTH)',
      routerId: '',
      macAddress: '',
      ipAddress: '',
      wifiUsername: '',
      pppoePassword: '',
      connectionDate: new Date().toISOString().substring(0, 10),
      installationDate: new Date().toISOString().substring(0, 10),
      lastPaymentDate: new Date().toISOString().substring(0, 10),
      lastPaymentAmount: packages[1]?.price || 500,
      dueAmount: 0,
      nextPaymentDate: calculateDefaultNextPayment(),
      paymentStatus: 'Paid',
      status: 'Active',
      notes: '',
    });
    setErrors({});
  };

  const handleGenerateUID = () => {
    const nextUid = generateNextUID();
    setFormData((prev) => ({ ...prev, uid: nextUid }));
    addToast('info', 'UID Generated', `Assigned new unique UID: ${nextUid}`);
  };

  const handlePackageChange = (pkgName: string) => {
    const selected = packages.find((p) => p.name === pkgName);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        packageName: selected.name,
        speed: selected.speed,
        monthlyBill: selected.price,
        monthlyFee: selected.price,
      }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Customer name is required';
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (formData.mobile.length < 9) {
      newErrors.mobile = 'Valid phone number is required (min 9 digits)';
    }

    if (!formData.uid.trim()) newErrors.uid = 'Customer UID is required';
    if (!formData.packageName.trim()) newErrors.packageName = 'Package name is required';
    if (formData.monthlyBill <= 0) newErrors.monthlyBill = 'Monthly bill must be greater than 0';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast('error', 'Validation Error', 'Please check required fields marked in red.');
      return;
    }

    setIsSubmitting(true);
    try {
      const boundResellerId = isResellerScope ? (currentActiveReseller?.id || user?.resellerId || '') : (formData.resellerId || '');
      const boundResellerCode = isResellerScope ? (currentActiveReseller?.code || user?.resellerCode || '') : (resellers.find(r => r.id === formData.resellerId)?.code || formData.resellerCode || '');
      const boundResellerName = isResellerScope ? (currentActiveReseller?.name || user?.resellerName || '') : (formData.resellerName || '');

      const payload = {
        ...formData,
        uid: String(formData.uid || generateNextUID()).trim(),
        name: String(formData.name || '').trim(),
        mobile: String(formData.mobile || '').trim(),
        resellerId: boundResellerId,
        resellerCode: boundResellerCode,
        resellerName: boundResellerName,
      };

      let savedCust: Customer;
      if (isEditMode && customerToEdit) {
        savedCust = await updateCustomer(customerToEdit.id, payload);
      } else {
        savedCust = await addCustomer(payload);
      }

      onClose();
      if (onCustomerCreated && savedCust) {
        try {
          onCustomerCreated(savedCust);
        } catch (cbErr) {
          console.warn('onCustomerCreated callback warning:', cbErr);
        }
      }
    } catch (err: any) {
      addToast('error', 'Error Saving', err.message || 'Failed to save customer record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalContainerClass = isDark
    ? 'bg-slate-900/95 border-slate-800 text-slate-100'
    : 'glass-panel-colorful border-purple-500/30 text-slate-100';

  const sectionCardClass = isDark
    ? 'bg-slate-950/70 border-slate-800 text-slate-200'
    : 'bg-slate-900/80 border-purple-500/20 text-slate-200';

  const inputClass = isDark
    ? 'bg-slate-900/90 border-slate-700/80 focus:bg-slate-900 focus:border-cyan-400 text-white placeholder-slate-500'
    : 'bg-slate-900/90 border-purple-500/30 focus:bg-slate-900 focus:border-cyan-400 text-white placeholder-slate-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`relative w-full max-w-4xl border rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col ${modalContainerClass}`}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditMode ? `Edit Customer: ${customerToEdit?.name}` : 'Register New WiFi Customer'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditMode ? 'Update technical, personal or billing attributes' : 'Fill in the form to register a new subscriber'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          
          {/* Section 1: Personal & Contact Information */}
          <div className={`border rounded-2xl p-5 space-y-4 ${sectionCardClass}`}>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-cyan-400 font-semibold text-sm">
              <User className="w-4 h-4" />
              <span>1. Personal & Contact Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Customer Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. TM Tamim"
                  className={`w-full px-3 py-2 rounded-xl border ${
                    errors.name ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  } text-xs outline-none transition-colors ${inputClass}`}
                />
                {errors.name && <p className="text-rose-400 text-[11px] mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Primary Mobile Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="e.g. 01712345678"
                  className={`w-full px-3 py-2 rounded-xl border font-mono ${
                    errors.mobile ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  } text-xs outline-none transition-colors ${inputClass}`}
                />
                {errors.mobile && <p className="text-rose-400 text-[11px] mt-1">{errors.mobile}</p>}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Alternative Mobile</label>
                <input
                  type="tel"
                  value={formData.alternativeMobile}
                  onChange={(e) => setFormData({ ...formData, alternativeMobile: e.target.value })}
                  placeholder="e.g. 01812345678"
                  className={`w-full px-3 py-2 rounded-xl border font-mono text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. customer@example.com"
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Village / Ward / Area</label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="e.g. Dhanmondi, Dhaka"
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Street Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. House 14, Road 5"
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  রিসেলার / সাব-আইএসপি নির্ধারণ
                </label>
                {isResellerScope ? (
                  <div className="w-full px-3 py-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-xs font-semibold flex items-center justify-between">
                    <span>{currentActiveReseller?.name || user?.resellerName || 'আপনার রিসেলার অ্যাকাউন্ট'} ({currentActiveReseller?.code || 'লক'})</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">লক করা</span>
                  </div>
                ) : (
                  <select
                    value={formData.resellerId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const resObj = resellers.find((r) => r.id === selId);
                      setFormData({
                        ...formData,
                        resellerId: selId,
                        resellerName: resObj ? resObj.name : '',
                      });
                    }}
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
                  >
                    <option value="" className="bg-slate-900 text-white">মেইন অফিস (ডাইরেক্ট গ্রাহক / কোনো রিসেলার নেই)</option>
                    {resellers.map((r) => (
                      <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                        {r.name} ({r.code}) — {r.area}
                      </option>
                    ))}
                  </select>
                )}
                {isResellerScope && (
                  <p className="text-[10px] text-emerald-400 mt-1">
                    * আপনার রিসেলার একাউন্টে গ্রাহক স্বয়ংক্রিয়ভাবে সংরক্ষিত থাকবে।
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: WiFi & Technical Connection Information */}
          <div className={`border rounded-2xl p-5 space-y-4 ${sectionCardClass}`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-blue-400 font-semibold text-sm">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                <span>2. WiFi & Network Information</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              {/* UID with Auto Generator */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Customer UID <span className="text-rose-400">*</span>
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={formData.uid}
                    onChange={(e) => setFormData({ ...formData, uid: e.target.value })}
                    placeholder="WIFI-000001"
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold ${
                      errors.uid ? 'border-rose-500' : ''
                    } text-cyan-400 text-xs outline-none transition-colors ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateUID}
                    title="Auto-generate next unique UID"
                    className="shrink-0 px-2.5 py-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 hover:bg-cyan-900 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto
                  </button>
                </div>
                {errors.uid && <p className="text-rose-400 text-[11px] mt-1">{errors.uid}</p>}
              </div>

              {/* Package Select */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Internet Package <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formData.packageName}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
                >
                  {availablePackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.name} className="bg-slate-900 text-white">
                      {pkg.name} ({pkg.speed} - {ispProfile.currencySymbol}{pkg.price}) {pkg.resellerId ? '★ কাস্টম' : ''}
                    </option>
                  ))}
                  <option value="Custom Plan" className="bg-slate-900 text-white">Custom Plan</option>
                </select>
              </div>

              {/* Bandwidth Speed */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Speed</label>
                <input
                  type="text"
                  value={formData.speed}
                  onChange={(e) => setFormData({ ...formData, speed: e.target.value })}
                  placeholder="e.g. 20 Mbps"
                  className={`w-full px-3 py-2 rounded-xl border font-mono text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>

              {/* Connection Type */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Connection Type</label>
                <select
                  value={formData.connectionType}
                  onChange={(e) => setFormData({ ...formData, connectionType: e.target.value as ConnectionType })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
                >
                  <option value="Fiber (FTTH)" className="bg-slate-900 text-white">Fiber (FTTH)</option>
                  <option value="Cat6 / LAN" className="bg-slate-900 text-white">Cat6 / LAN</option>
                  <option value="Wireless" className="bg-slate-900 text-white">Wireless</option>
                  <option value="PPPoE" className="bg-slate-900 text-white">PPPoE</option>
                  <option value="Static IP" className="bg-slate-900 text-white">Static IP</option>
                </select>
              </div>

              {/* Router / ONU ID */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Router / ONU ID</label>
                <input
                  type="text"
                  value={formData.routerId}
                  onChange={(e) => setFormData({ ...formData, routerId: e.target.value })}
                  placeholder="e.g. ONU-ZTE-F660-8812"
                  className={`w-full px-3 py-2 rounded-xl border font-mono text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>

              {/* MAC Address */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">MAC Address</label>
                <input
                  type="text"
                  value={formData.macAddress}
                  onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                  placeholder="e.g. C8:3A:35:12:45:90"
                  className={`w-full px-3 py-2 rounded-xl border font-mono text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>

              {/* IP Address */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Assigned IP Address</label>
                <input
                  type="text"
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  placeholder="e.g. 192.168.10.45"
                  className={`w-full px-3 py-2 rounded-xl border font-mono text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>

              {/* WiFi / PPPoE Username */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">WiFi / PPPoE Username</label>
                <input
                  type="text"
                  value={formData.wifiUsername}
                  onChange={(e) => setFormData({ ...formData, wifiUsername: e.target.value })}
                  placeholder="e.g. tamim_wifi_20m"
                  className={`w-full px-3 py-2 rounded-xl border font-mono text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>

              {/* WiFi / PPPoE Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium">WiFi / PPPoE Password</label>
                  <span className="text-[10px] text-cyan-400 font-mono">Secured</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showPppoePassword ? 'text' : 'password'}
                    value={formData.pppoePassword}
                    onChange={(e) => setFormData({ ...formData, pppoePassword: e.target.value })}
                    placeholder="Enter PPPoE Password (e.g. 123456)"
                    className={`w-full px-3 py-2 pr-9 rounded-xl border font-mono text-xs outline-none transition-colors ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPppoePassword(!showPppoePassword)}
                    className="absolute right-2.5 text-slate-400 hover:text-cyan-400 transition-colors p-1"
                    title={showPppoePassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  >
                    {showPppoePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Customer Status */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Customer Operational Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none transition-colors ${inputClass}`}
                >
                  <option value="Active" className="bg-slate-900 text-white">Active</option>
                  <option value="Inactive" className="bg-slate-900 text-white">Inactive</option>
                  <option value="Suspended" className="bg-slate-900 text-white">Suspended</option>
                  <option value="Due" className="bg-slate-900 text-white">Due</option>
                </select>
              </div>

            </div>
          </div>

          {/* Section 3: Billing & Payment Information */}
          <div className={`border rounded-2xl p-5 space-y-4 ${sectionCardClass}`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-emerald-400 font-semibold text-sm">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>3. Billing & Payment Configuration</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Monthly Bill Amount ({ispProfile.currencySymbol}) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.monthlyBill}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    monthlyBill: Number(e.target.value),
                    monthlyFee: Number(e.target.value),
                  })}
                  className={`w-full px-3 py-2 rounded-xl border font-mono text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Current Due Amount ({ispProfile.currencySymbol})</label>
                <input
                  type="number"
                  min="0"
                  value={formData.dueAmount}
                  onChange={(e) => setFormData({ ...formData, dueAmount: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-xl border font-mono text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Payment Status</label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as PaymentStatus })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
                >
                  <option value="Paid" className="bg-slate-900 text-white">Paid</option>
                  <option value="Due" className="bg-slate-900 text-white">Due</option>
                  <option value="Partial" className="bg-slate-900 text-white">Partial</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Next Payment Due Date</label>
                <input
                  type="date"
                  value={formData.nextPaymentDate}
                  onChange={(e) => setFormData({ ...formData, nextPaymentDate: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Connection Date</label>
                <input
                  type="date"
                  value={formData.connectionDate}
                  onChange={(e) => setFormData({ ...formData, connectionDate: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Installation Date</label>
                <input
                  type="date"
                  value={formData.installationDate}
                  onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>

              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-slate-300 font-medium mb-1">Remarks / Internal Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Customer requested extra fiber patch cable, VIP billing on 10th..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>

            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Form
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-900/20 transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSubmitting ? 'Saving Customer...' : isEditMode ? 'Update Customer' : 'Save Customer'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
