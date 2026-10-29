import React, { useState, useMemo } from 'react';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { useReseller } from '../../context/ResellerContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { ResetPasswordModal } from '../../components/ResetPasswordModal';
import { PackageModal } from '../../components/PackageModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ResellerBalanceRequestModal } from '../../components/ResellerBalanceRequestModal';
import { doesCustomerBelongToReseller, filterPackagesForReseller, doesPackageBelongToReseller } from '../../utils/resellerIsolation';
import { ISPPackage } from '../../types';
import { 
  Settings, 
  Database, 
  Wifi, 
  RefreshCw, 
  CheckCircle2, 
  Download, 
  HelpCircle,
  KeyRound,
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Layers,
  Radio,
  Store,
  Wallet,
  Phone,
  MapPin
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    ispProfile, 
    packages, 
    deletePackage,
    isFirebaseActive, 
    resetToDemoData, 
    customers, 
    payments,
    paymentRequests,
    supportTickets,
    syncAllLocalDataToRealtimeDatabase,
  } = useCustomer();
  const { user, isReseller, updateCredentials } = useAuth();
  const { resellers, updateReseller } = useReseller();
  const { addToast } = useToast();
  const { isDark } = useTheme();

  const isResellerScope = isReseller || user?.role === 'Reseller';

  // Resolved active reseller
  const currentReseller = useMemo(() => {
    if (!isResellerScope) return null;
    return (
      resellers.find(
        (r) =>
          r.id === user?.resellerId ||
          r.code === user?.resellerId ||
          r.code === user?.resellerCode ||
          (r.username && user?.accountUsername && r.username.toLowerCase() === user.accountUsername.toLowerCase())
      ) || {
        id: user?.resellerId || '',
        code: user?.resellerCode || '',
        name: user?.resellerName || '',
        ownerName: user?.username || 'Reseller',
        username: user?.accountUsername || user?.username || 'reseller',
        phone: user?.phone || '01900000000',
        area: 'Local Area',
        balance: 0,
        commissionRate: 15,
        status: 'Active' as const,
        billingType: 'prepaid' as const,
        password: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }, [isResellerScope, user, resellers]);

  // Reseller state
  const [resellerPhone, setResellerPhone] = useState(currentReseller?.phone || '');
  const [resellerArea, setResellerArea] = useState(currentReseller?.area || '');
  const [resellerNewPass, setResellerNewPass] = useState('');
  const [resellerConfirmPass, setResellerConfirmPass] = useState('');
  const [showResellerNewPass, setShowResellerNewPass] = useState(false);
  const [isUpdatingReseller, setIsUpdatingReseller] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  // Package Modal State
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [selectedPackageToEdit, setSelectedPackageToEdit] = useState<ISPPackage | null>(null);

  // Package Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<ISPPackage | null>(null);
  const [isDeletingPackage, setIsDeletingPackage] = useState(false);

  // Reseller package tabs & filtering (Strict Tenant Isolation)
  const [resellerPackageTab, setResellerPackageTab] = useState<'all' | 'custom' | 'central'>('all');

  const resellerFilteredPackages = useMemo(() => {
    if (!isResellerScope || !currentReseller) return packages;
    return filterPackagesForReseller(packages, currentReseller, true);
  }, [packages, isResellerScope, currentReseller]);

  const myCustomPackages = useMemo(() => {
    if (!currentReseller) return [];
    return resellerFilteredPackages.filter((p) => doesPackageBelongToReseller(p, currentReseller));
  }, [resellerFilteredPackages, currentReseller]);

  const centralBaselinePackages = useMemo(() => {
    return resellerFilteredPackages.filter((p) => !p.resellerId && !p.resellerCode);
  }, [resellerFilteredPackages]);

  const displayedResellerPackages = useMemo(() => {
    if (resellerPackageTab === 'custom') return myCustomPackages;
    if (resellerPackageTab === 'central') return centralBaselinePackages;
    return resellerFilteredPackages;
  }, [resellerPackageTab, myCustomPackages, centralBaselinePackages, resellerFilteredPackages]);

  // Super Admin Package Filter States
  const [adminPackageFilter, setAdminPackageFilter] = useState<'all' | 'central' | 'reseller'>('all');
  const [selectedAdminResellerId, setSelectedAdminResellerId] = useState<string>('all');

  const displayedAdminPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (adminPackageFilter === 'central') {
        return !pkg.resellerId && !pkg.resellerCode;
      }
      if (adminPackageFilter === 'reseller') {
        if (!pkg.resellerId && !pkg.resellerCode) return false;
        if (selectedAdminResellerId !== 'all') {
          return pkg.resellerId === selectedAdminResellerId || pkg.resellerCode === selectedAdminResellerId;
        }
        return true;
      }
      if (selectedAdminResellerId !== 'all') {
        return pkg.resellerId === selectedAdminResellerId || pkg.resellerCode === selectedAdminResellerId;
      }
      return true;
    });
  }, [packages, adminPackageFilter, selectedAdminResellerId]);

  // Admin Account & Password State
  const [adminUsername, setAdminUsername] = useState(user?.username?.replace(/\s*\(Super Admin\)|\s*\(Admin\)/gi, '') || 'TAMIM');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);
  const [credsError, setCredsError] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSyncingAllData, setIsSyncingAllData] = useState(false);
  const [syncSummary, setSyncSummary] = useState<any>(null);

  const handleSyncAllToRealtime = async () => {
    setIsSyncingAllData(true);
    setSyncSummary(null);
    try {
      const res = await syncAllLocalDataToRealtimeDatabase();
      setSyncSummary(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsSyncingAllData(false);
    }
  };

  const handleOpenAddPackage = () => {
    setSelectedPackageToEdit(null);
    setIsPackageModalOpen(true);
  };

  const handleOpenEditPackage = (pkg: ISPPackage) => {
    setSelectedPackageToEdit(pkg);
    setIsPackageModalOpen(true);
  };

  const handleOpenDeletePackage = (pkg: ISPPackage) => {
    setPackageToDelete(pkg);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeletePackage = async () => {
    if (!packageToDelete) return;
    setIsDeletingPackage(true);
    try {
      await deletePackage(packageToDelete.id);
      setIsDeleteModalOpen(false);
      setPackageToDelete(null);
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message || 'Failed to delete package.');
    } finally {
      setIsDeletingPackage(false);
    }
  };

  const handleUpdateAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredsError('');

    if (!currentPassword) {
      setCredsError('Please enter your current password to authorize this change.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setCredsError('New password and confirmation password do not match.');
      return;
    }

    if (newPassword && newPassword.length < 4) {
      setCredsError('New password must be at least 4 characters long.');
      return;
    }

    setIsUpdatingCreds(true);
    try {
      const res = await updateCredentials(currentPassword, adminUsername, newPassword || undefined);
      if (res.success) {
        addToast('success', 'Security Credentials Updated', 'Admin credentials have been updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setCredsError(res.error || 'Failed to update credentials.');
      }
    } catch (err: any) {
      setCredsError(err.message || 'Error updating credentials.');
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  const handleUpdateResellerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReseller?.id) return;
    if (resellerNewPass && resellerNewPass !== resellerConfirmPass) {
      addToast('error', 'পাসওয়ার্ড মেলেনি', 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড একই হতে হবে।');
      return;
    }
    if (resellerNewPass && resellerNewPass.length < 4) {
      addToast('error', 'পাসওয়ার্ড দুর্বল', 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।');
      return;
    }
    setIsUpdatingReseller(true);
    try {
      await updateReseller(currentReseller.id, {
        phone: resellerPhone || currentReseller.phone,
        area: resellerArea || currentReseller.area,
        ...(resellerNewPass ? { password: resellerNewPass } : {}),
      });
      addToast('success', 'প্রোফাইল আপডেট হয়েছে', 'আপনার রিসেলার প্রোফাইল ও পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে।');
      setResellerNewPass('');
      setResellerConfirmPass('');
    } catch (err: any) {
      addToast('error', 'আপডেট ব্যর্থ', err.message || 'রিসেলার প্রোফাইল আপডেট করা যায়নি।');
    } finally {
      setIsUpdatingReseller(false);
    }
  };

  const handleResellerExportBackup = () => {
    const myCusts = customers.filter(c => doesCustomerBelongToReseller(c, currentReseller));
    const myCustIds = new Set(myCusts.map(c => c.id));
    const myPayments = payments.filter(p => 
      p.resellerId === currentReseller?.id || 
      (p.customerId && myCustIds.has(p.customerId))
    );

    const backupData = {
      reseller: currentReseller,
      exportDate: new Date().toISOString(),
      customers: myCusts,
      payments: myPayments,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${currentReseller?.code || 'reseller'}-records-backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('success', 'ব্যাকআপ ডাউনলোড হয়েছে', 'আপনার গ্রাহক ও পেমেন্ট হিস্ট্রি ডাউনলোড সম্পন্ন হয়েছে।');
  };

  const handleExportJSONBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      ispProfile,
      packages,
      customers,
      payments,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `wifi-isp-backup-${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('success', 'Backup Exported', 'Complete JSON backup downloaded successfully.');
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset customer data back to demo seed records?')) {
      resetToDemoData();
      addToast('info', 'Database Reset', 'Reset customer database to default demo records.');
    }
  };

  const cardClass = isDark
    ? 'glass-panel-dark border-slate-800 text-slate-100'
    : 'glass-panel-colorful border-purple-500/20 text-slate-100';

  const inputClass = isDark
    ? 'bg-slate-900/80 border-slate-700/80 focus:bg-slate-900 focus:border-cyan-400 text-white placeholder-slate-500'
    : 'bg-slate-900/80 border-purple-500/30 focus:bg-slate-900 focus:border-cyan-400 text-white placeholder-slate-500';

  // ========================================================
  // 1. RESELLER DEDICATED SETTINGS VIEW
  // ========================================================
  if (isResellerScope && currentReseller) {
    const mySubscribers = customers.filter(c => doesCustomerBelongToReseller(c, currentReseller));
    const myTotalPayments = payments.filter(p => 
      p.resellerId === currentReseller.id || 
      mySubscribers.some(c => c.id === p.customerId)
    );

    return (
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Store className="w-6 h-6 text-emerald-400" />
              রিসেলার প্রোফাইল ও সেটিংস
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              আপনার রিসেলার অ্যাকাউন্টের তথ্য, ওয়ালেট ব্যালেন্স, নিরাপত্তা পাসওয়ার্ড এবং প্যাকেজ রেট দেখুন।
            </p>
          </div>

          <button
            onClick={() => setIsTopUpOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/25 transition-all self-start sm:self-auto"
          >
            <Wallet className="w-4 h-4" />
            ওয়ালেট রিচার্জ রিকোয়েস্ট
          </button>
        </div>

        {/* Reseller Profile Overview Card */}
        <div className={`${cardClass} rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl border`}>
          <div className="flex items-center gap-4 pb-4 border-b border-slate-800/80">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 font-black text-xl shrink-0">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  {currentReseller.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40">
                  {currentReseller.code}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 text-[10px] font-semibold border border-cyan-500/30">
                  সক্রিয় রিসেলার
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                <span>প্রোপাইটার: <strong className="text-slate-200">{currentReseller.ownerName || currentReseller.name}</strong></span>
                <span>এলাকা: <strong className="text-slate-200">{currentReseller.area || 'লোকাল জোন'}</strong></span>
                <span>মোবাইল: <strong className="text-slate-200 font-mono">{currentReseller.phone || 'N/A'}</strong></span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-medium block">বর্তমান ওয়ালেট ব্যালেন্স</span>
              <p className="text-lg sm:text-xl font-black text-emerald-400 font-mono mt-0.5">
                ৳{currentReseller.balance.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-medium block">কমিশন রেট</span>
              <p className="text-lg sm:text-xl font-black text-cyan-400 font-mono mt-0.5">
                {currentReseller.commissionRate || 15}%
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-medium block">মোট গ্রাহক সংখ্যা</span>
              <p className="text-lg sm:text-xl font-black text-white font-mono mt-0.5">
                {mySubscribers.length} জন
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-medium block">মোট পেমেন্ট ট্রানজেকশন</span>
              <p className="text-lg sm:text-xl font-black text-purple-400 font-mono mt-0.5">
                {myTotalPayments.length} টি
              </p>
            </div>
          </div>
        </div>

        {/* Reseller Account Update & Password Form */}
        <form onSubmit={handleUpdateResellerProfile} className={`${cardClass} rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl border`}>
          <div className="border-b border-slate-800/80 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              রিসেলার অ্যাকাউন্ট ও নিরাপত্তা সেটিংস
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              লগইন পাসওয়ার্ড এবং যোগাযোগের মোবাইল নাম্বার আপডেট করুন
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">লগইন ইউজারনেম</label>
              <div className="relative flex items-center">
                <User className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
                <input
                  type="text"
                  disabled
                  value={currentReseller.username || user?.username || 'reseller'}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-mono bg-slate-950/60 border-slate-800 text-slate-400 cursor-not-allowed`}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">মোবাইল নাম্বার</label>
              <div className="relative flex items-center">
                <Phone className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
                <input
                  type="tel"
                  value={resellerPhone}
                  onChange={(e) => setResellerPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">কভারেজ এলাকা</label>
              <div className="relative flex items-center">
                <MapPin className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
                <input
                  type="text"
                  value={resellerArea}
                  onChange={(e) => setResellerArea(e.target.value)}
                  placeholder="কভারেজ জোন"
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">নতুন পাসওয়ার্ড (ঐচ্ছিক)</label>
              <div className="relative flex items-center">
                <Lock className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
                <input
                  type={showResellerNewPass ? 'text' : 'password'}
                  value={resellerNewPass}
                  onChange={(e) => setResellerNewPass(e.target.value)}
                  placeholder="পাসওয়ার্ড পরিবর্তন না করলে খালি রাখুন"
                  className={`w-full pl-9 pr-9 py-2.5 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={() => setShowResellerNewPass(!showResellerNewPass)}
                  className="absolute right-3 text-slate-400 hover:text-white"
                >
                  {showResellerNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">পাসওয়ার্ড নিশ্চিত করুন</label>
              <div className="relative flex items-center">
                <Lock className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
                <input
                  type="password"
                  value={resellerConfirmPass}
                  onChange={(e) => setResellerConfirmPass(e.target.value)}
                  placeholder="নতুন পাসওয়ার্ড পুনরায় লিখুন"
                  disabled={!resellerNewPass}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none transition-colors disabled:opacity-40 ${inputClass}`}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800/80">
            <button
              type="submit"
              disabled={isUpdatingReseller}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {isUpdatingReseller ? 'আপডেট হচ্ছে...' : 'প্রোফাইল তথ্য সংরক্ষণ করুন'}
            </button>
          </div>
        </form>

        {/* Reseller Custom Packages Management (Strict Tenant Isolation) */}
        <div className={`${cardClass} rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl border`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/40">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>আমার ইন্টারনেট প্যাকেজসমূহ</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                    কাস্টম: {myCustomPackages.length} টি
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  আপনার রিসেলার গ্রাহকদের জন্য নিজস্ব ব্যান্ডউইথ প্যাকেজ ও মাসিক রেট তৈরি করুন (অন্য কোনো রিসেলার দেখতে পারবে না)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAddPackage}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/25 transition-all cursor-pointer min-h-[38px] shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন প্যাকেজ তৈরি করুন</span>
            </button>
          </div>

          {/* Sub-Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setResellerPackageTab('all')}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                resellerPackageTab === 'all'
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 font-bold'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              সব প্যাকেজ ({resellerFilteredPackages.length})
            </button>
            <button
              type="button"
              onClick={() => setResellerPackageTab('custom')}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                resellerPackageTab === 'custom'
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 font-bold'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              আমার কাস্টম প্যাকেজ ({myCustomPackages.length})
            </button>
            <button
              type="button"
              onClick={() => setResellerPackageTab('central')}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                resellerPackageTab === 'central'
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 font-bold'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              সেন্ট্রাল ISP প্যাকেজ ({centralBaselinePackages.length})
            </button>
          </div>

          {/* Packages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {displayedResellerPackages.length > 0 ? (
              displayedResellerPackages.map((pkg) => {
                const isMyCustom = doesPackageBelongToReseller(pkg, currentReseller);

                return (
                  <div
                    key={pkg.id}
                    className={`p-4 rounded-xl border space-y-3 text-xs transition-all flex flex-col justify-between ${
                      isMyCustom
                        ? 'bg-gradient-to-br from-[#0B1524] to-[#0E1A2C] border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-sm">{pkg.name}</span>
                            {isMyCustom ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                ✓ আমার কাস্টম
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-medium">
                                সেন্ট্রাল ISP
                              </span>
                            )}
                          </div>
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-medium text-slate-300 border border-slate-700 mt-1">
                            {pkg.type || 'Residential'}
                          </span>
                        </div>

                        <span className="text-cyan-400 font-mono font-black text-sm bg-cyan-950/80 px-2 py-1 rounded-lg border border-cyan-500/30 shrink-0">
                          {pkg.speed}
                        </span>
                      </div>

                      <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">
                        {pkg.description || 'আনলিমিটেড হাই-স্পিড ব্রডব্যান্ড সংযোগ।'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between font-mono">
                      <div>
                        <span className="text-slate-400 text-[10px] block font-sans">গ্রাহক বিলিং রেট</span>
                        <span className="text-emerald-400 font-bold text-sm">
                          {ispProfile.currencySymbol}{pkg.price} <span className="text-[10px] text-slate-400 font-normal">/ মাস</span>
                        </span>
                      </div>

                      {/* Action buttons (Only for packages owned by this reseller) */}
                      {isMyCustom ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPackage(pkg)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-cyan-950 text-slate-300 hover:text-cyan-400 border border-slate-700 hover:border-cyan-500/50 transition-colors cursor-pointer"
                            title="প্যাকেজ এডিট করুন"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeletePackage(pkg)}
                            className="p-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 transition-colors cursor-pointer"
                            title="প্যাকেজ ডিলিট করুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-sans italic">মূল বেসলাইন</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 p-6 space-y-2">
                <Wifi className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">কোনো কাস্টম প্যাকেজ নেই</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  আপনি এখনো আপনার রিসেলারের নিজস্ব কোনো প্যাকেজ তৈরি করেননি। নিচের বাটনে ক্লিক করে প্যাকেজ তৈরি করুন।
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddPackage}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 mt-2 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>প্রথম প্যাকেজ তৈরি করুন</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Safe Reseller Backup Download */}
        <div className={`${cardClass} rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl border`}>
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-500/40">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white">আমার গ্রাহক ও পেমেন্ট ব্যাকআপ</h2>
                <p className="text-xs text-slate-400">আপনার অ্যাকাউন্টের সমস্ত গ্রাহক তথ্য ও পেমেন্ট হিস্ট্রি অফলাইনে ডাউনলোড করুন</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={handleResellerExportBackup}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all"
            >
              <Download className="w-4 h-4" />
              আমার রিসেলার ডাটা ব্যাকআপ ডাউনলোড (JSON)
            </button>
          </div>
        </div>

        {/* Reseller Top Up Modal */}
        <ResellerBalanceRequestModal
          isOpen={isTopUpOpen}
          onClose={() => setIsTopUpOpen(false)}
          reseller={currentReseller}
        />

        {/* Reseller Add / Edit Package Modal */}
        <PackageModal
          isOpen={isPackageModalOpen}
          onClose={() => {
            setIsPackageModalOpen(false);
            setSelectedPackageToEdit(null);
          }}
          packageToEdit={selectedPackageToEdit}
          resellerScope={currentReseller}
        />

        {/* Reseller Delete Package Confirmation Modal */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setPackageToDelete(null);
          }}
          onConfirm={handleConfirmDeletePackage}
          title={`প্যাকেজ ডিলিট: ${packageToDelete?.name || ''}`}
          message={`আপনি কি নিশ্চিত যে আপনার "${packageToDelete?.name}" (${packageToDelete?.speed}) প্যাকেজটি মুছে ফেলতে চান?`}
          confirmText="প্যাকেজ মুছুন"
          cancelText="বাতিল"
          isDestructive={true}
          isLoading={isDeletingPackage}
        />
      </div>
    );
  }

  // ========================================================
  // 2. SUPER ADMIN SETTINGS VIEW
  // ========================================================

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyan-400" />
          System Settings & ISP Profile
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure ISP branding, available internet packages, security credentials, Firebase real-time database, and data backups.
        </p>
      </div>

      {/* Package Plans Management Section (Add / Edit / Delete) */}
      <div className={`${cardClass} rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl border`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-500/40">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Available Internet Packages ({packages.length})
              </h2>
              <p className="text-xs text-slate-400">Add, edit, or delete broadband packages available for subscribers & resellers</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddPackage}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/25 transition-all min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            Add New Package
          </button>
        </div>

        {/* Filter Tabs for Super Admin */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAdminPackageFilter('all');
                setSelectedAdminResellerId('all');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                adminPackageFilter === 'all' && selectedAdminResellerId === 'all'
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              সব প্যাকেজ ({packages.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminPackageFilter('central');
                setSelectedAdminResellerId('all');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                adminPackageFilter === 'central'
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              সেন্ট্রাল ISP ({packages.filter((p) => !p.resellerId && !p.resellerCode).length})
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminPackageFilter('reseller');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                adminPackageFilter === 'reseller'
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 font-bold'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              রিসেলার কাস্টম ({packages.filter((p) => !!p.resellerId || !!p.resellerCode).length})
            </button>
          </div>

          {resellers.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 text-[11px]">রিসেলার ফিল্টার:</span>
              <select
                value={selectedAdminResellerId}
                onChange={(e) => {
                  setSelectedAdminResellerId(e.target.value);
                  if (e.target.value !== 'all') {
                    setAdminPackageFilter('reseller');
                  }
                }}
                className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none"
              >
                <option value="all">সকল রিসেলার</option>
                {resellers.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.code}] {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-1">
          {displayedAdminPackages.map((pkg) => {
            const isResellerCustom = Boolean(pkg.resellerId || pkg.resellerCode);

            return (
              <div 
                key={pkg.id} 
                className={`p-4 rounded-xl bg-slate-900/80 border space-y-3 text-xs transition-all relative flex flex-col justify-between ${
                  pkg.popular 
                    ? 'border-cyan-500/50 shadow-lg shadow-cyan-950/40' 
                    : isResellerCustom
                    ? 'border-emerald-500/30 hover:border-emerald-500/50'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 shadow-sm flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Popular
                  </span>
                )}

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-sm">{pkg.name}</span>
                        {isResellerCustom ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            রিসেলার: {pkg.resellerCode ? `[${pkg.resellerCode}] ` : ''}{pkg.resellerName || 'Custom'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-medium">
                            সেন্ট্রাল ISP
                          </span>
                        )}
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-medium text-slate-300 border border-slate-700 mt-1">
                        {pkg.type}
                      </span>
                    </div>
                    <span className="text-cyan-400 font-mono font-black text-sm bg-cyan-950/80 px-2 py-1 rounded-lg border border-cyan-500/30">
                      {pkg.speed}
                    </span>
                  </div>

                  <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">
                    {pkg.description || 'High-speed bufferless Internet connectivity.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Monthly Rate</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {ispProfile.currencySymbol}{pkg.price} <span className="text-[10px] text-slate-400 font-normal">/ mo</span>
                    </span>
                  </div>

                  {/* Edit & Delete Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPackage(pkg)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-cyan-950 text-slate-300 hover:text-cyan-400 border border-slate-700 hover:border-cyan-500/50 transition-colors"
                      title="Edit Package"
                      aria-label={`Edit ${pkg.name}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDeletePackage(pkg)}
                      disabled={packages.length <= 1}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title={packages.length <= 1 ? "Cannot delete the last remaining package" : "Delete Package"}
                      aria-label={`Delete ${pkg.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Credentials & Password Change Form */}
      <form onSubmit={handleUpdateAdminPassword} className={`${cardClass} rounded-2xl p-4 sm:p-6 space-y-5 shadow-xl`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Admin Account & Security Credentials</h2>
              <p className="text-xs text-slate-400">Change admin login username, password, or trigger recovery reset</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Reset with Recovery PIN
          </button>
        </div>

        {credsError && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <p className="leading-relaxed">{credsError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Admin Username</label>
            <div className="relative flex items-center">
              <div className="absolute left-3 text-slate-400">
                <User className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Current Password <span className="text-rose-400">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 text-slate-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                type={showCurrentPass ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className={`w-full pl-9 pr-9 py-2.5 rounded-xl border font-mono text-xs outline-none transition-colors ${inputClass}`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-2.5 text-slate-400 hover:text-white p-1"
              >
                {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              New Password (Optional)
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 text-slate-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                type={showNewPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className={`w-full pl-9 pr-9 py-2.5 rounded-xl border font-mono text-xs outline-none transition-colors ${inputClass}`}
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-2.5 text-slate-400 hover:text-white p-1"
              >
                {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {newPassword && (
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-slate-300 font-semibold mb-1">
                Confirm New Password <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                required={!!newPassword}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className={`w-full sm:w-1/2 px-3.5 py-2.5 rounded-xl border font-mono text-xs outline-none transition-colors ${inputClass}`}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800/80">
          <button
            type="submit"
            disabled={isUpdatingCreds}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 min-h-[40px]"
          >
            <ShieldCheck className="w-4 h-4" />
            {isUpdatingCreds ? 'Updating Credentials...' : 'Save Admin Credentials'}
          </button>
        </div>
      </form>

      {/* Firebase Database Status Card */}
      <div className={`${cardClass} rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isFirebaseActive ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40' : 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/40'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Real-Time Firestore Database
                {isFirebaseActive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                    <Radio className="w-3 h-3 animate-pulse" /> Live Realtime Sync
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Database synchronization & cloud storage backend</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold font-mono border ${
              isFirebaseActive
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
            }`}>
              {isFirebaseActive ? '● Realtime Database Connected' : '● Local Storage Fallback Mode'}
            </span>

            <button
              type="button"
              onClick={handleSyncAllToRealtime}
              disabled={isSyncingAllData}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md transition-all disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAllData ? 'animate-spin' : ''}`} />
              {isSyncingAllData ? 'রিয়েলটাইম ডাটাবেসে সিঙ্ক হচ্ছে...' : 'রিয়েলটাইম ডাটাবেসে সকল ডাটা যুক্ত করুন'}
            </button>
          </div>
        </div>

        {/* Realtime Records Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 font-medium">কাস্টমার (Customers)</p>
            <p className="text-lg font-black text-cyan-400 font-mono mt-0.5">{customers.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 font-medium">পেমেন্ট হিস্ট্রি (Payments)</p>
            <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">{payments.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 font-medium">ইন্টারনেট প্যাকেজ (Packages)</p>
            <p className="text-lg font-black text-purple-400 font-mono mt-0.5">{packages.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 font-medium">রিকোয়েস্ট ও টিকেট (Tickets)</p>
            <p className="text-lg font-black text-amber-400 font-mono mt-0.5">{paymentRequests.length + supportTickets.length}</p>
          </div>
        </div>

        {syncSummary && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                <strong>সকল ডাটা রিয়েলটাইম ডাটাবেসে সফলভাবে সংরক্ষিত:</strong> {syncSummary.totalItems} টি আইটেম সিঙ্ক হয়েছে (কাস্টমার: {syncSummary.customers}, পেমেন্ট: {syncSummary.payments}, প্যাকেজ: {syncSummary.packages})।
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {new Date(syncSummary.syncedAt).toLocaleTimeString()}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              Realtime Persistence
            </h3>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {isFirebaseActive
                ? 'The application is actively connected to Google Cloud Firebase / Firestore. All customer registrations, payments, packages, settings, GPON OLT, and WhatsApp logs are synchronizing in real-time.'
                : 'The application is running in high-speed Browser Local Storage mode. All records are persisted in local browser storage.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              Realtime Collections
            </h3>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Synchronized collections: <code className="text-cyan-300 font-mono font-semibold">customers, payments, packages, settings, payment_requests, support_tickets, search_operators, admin_accounts, whatsapp_logs</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Data Backup & Seed Reset Section */}
      <div className={`${cardClass} rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-500/40">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Database Backup & Data Maintenance</h2>
              <p className="text-xs text-slate-400">Export database snapshots or reset sample data</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs">
          <button
            type="button"
            onClick={handleExportJSONBackup}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors min-h-[44px] border border-slate-700"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            Export Full JSON Database Backup
          </button>

          <button
            type="button"
            onClick={handleResetData}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 font-semibold border border-rose-500/40 transition-colors min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
            Reset to Initial Demo Data
          </button>
        </div>
      </div>

      {/* Password Reset Modal for Recovery PIN */}
      <ResetPasswordModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
      />

      {/* Add / Edit Package Modal */}
      <PackageModal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        packageToEdit={selectedPackageToEdit}
      />

      {/* Delete Package Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPackageToDelete(null);
        }}
        onConfirm={handleConfirmDeletePackage}
        title={`Delete Package: ${packageToDelete?.name}`}
        message={`Are you sure you want to delete the package "${packageToDelete?.name}" (${packageToDelete?.speed})? Existing customers will keep their current package name, but it will no longer be available for new registrations.`}
        confirmText="Delete Package"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeletingPackage}
      />

    </div>
  );
};
