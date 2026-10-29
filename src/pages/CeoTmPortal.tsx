import React, { useState } from 'react';
import { 
  Crown, 
  ShieldAlert, 
  Shield,
  Key, 
  UserPlus, 
  Users, 
  LogOut, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Eye, 
  EyeOff, 
  Trash2, 
  Edit3, 
  Activity, 
  Search, 
  Download, 
  ArrowLeft,
  X,
  Server,
  FileSpreadsheet,
  Building,
  Headphones,
  PhoneCall,
  CreditCard,
  Smartphone,
  Save,
  Sparkles,
  MessageSquare,
  Send,
  ExternalLink,
  QrCode,
  Radio,
  Clock,
  Sliders,
  Play,
  HelpCircle,
  UserCheck,
  AlertCircle,
  KeyRound,
  Store,
  Wallet,
  Percent,
  MapPin,
  Building2,
  Phone,
  Copy,
  Check,
  ShieldOff
} from 'lucide-react';
import { ResetPasswordModal } from '../components/ResetPasswordModal';
import { useAuth } from '../context/AuthContext';
import { useCustomer } from '../context/CustomerContext';
import { useReseller } from '../context/ResellerContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { AdminAccount, Customer, SearchOperator, SearchLoginLog, Reseller } from '../types';
import {
  DEFAULT_WHATSAPP_TEMPLATE,
  compileBillingMessage,
  dispatchWhatsAppAlert,
  formatWhatsAppPhone,
  isCustomerBillDue,
  getWhatsAppLogs,
  WhatsAppLogEntry,
} from '../utils/whatsappUtils';

interface CeoTmPortalProps {
  onBackToHome: () => void;
  onNavigateToAdmin?: () => void;
}

export const CeoTmPortal: React.FC<CeoTmPortalProps> = ({ onBackToHome, onNavigateToAdmin }) => {
  const { 
    isCeoTmAuthenticated, 
    ceoTmLogin, 
    ceoTmLogout, 
    adminAccounts, 
    auditLogs, 
    resetAdminPasswordByCeo, 
    createAdminAccountByCeo, 
    updateAdminAccountByCeo, 
    deleteAdminAccountByCeo, 
    forceLogoutAllAdminsByCeo, 
    clearAuditLogsByCeo,
    searchOperators,
    searchLoginLogs,
    createSearchOperatorByCeo,
    updateSearchOperatorByCeo,
    toggleSearchOperatorStatusByCeo,
    resetSearchOperatorPasswordByCeo,
    deleteSearchOperatorByCeo,
    clearSearchLoginLogsByCeo
  } = useAuth();

  const { addToast } = useToast();
  const { isDark } = useTheme();
  const { ispProfile, updateISPProfile, customers, clearAllData: clearAllCustomerData } = useCustomer();
  const { 
    resellers, 
    transactions: resellerTransactions, 
    addReseller, 
    updateReseller, 
    deleteReseller, 
    rechargeResellerBalance, 
    generateNextResellerCode,
    clearAllResellerData 
  } = useReseller();

  // CEO Auth state
  const [ceoPasswordInput, setCeoPasswordInput] = useState('');
  const [showCeoPassword, setShowCeoPassword] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Active View Tab inside CEO TM Panel
  const [activeTab, setActiveTab] = useState<'admins' | 'search_operators' | 'resellers' | 'isp_profile' | 'whatsapp' | 'logs'>('admins');

  // Reseller Management States in CEO TM
  const [isAddResellerModalOpen, setIsAddResellerModalOpen] = useState(false);
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  const [resellerFormName, setResellerFormName] = useState('');
  const [resellerFormOwner, setResellerFormOwner] = useState('');
  const [resellerFormUsername, setResellerFormUsername] = useState('');
  const [resellerFormPassword, setResellerFormPassword] = useState('1234');
  const [resellerFormPhone, setResellerFormPhone] = useState('');
  const [resellerFormEmail, setResellerFormEmail] = useState('');
  const [resellerFormArea, setResellerFormArea] = useState('');
  const [resellerFormBalance, setResellerFormBalance] = useState<number>(0);
  const [resellerFormCommissionRate, setResellerFormCommissionRate] = useState<number>(15);
  const [resellerFormWholesaleRate, setResellerFormWholesaleRate] = useState<number>(350);
  const [resellerFormBillingType, setResellerFormBillingType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [resellerFormStatus, setResellerFormStatus] = useState<'Active' | 'Suspended'>('Active');
  const [isSubmittingReseller, setIsSubmittingReseller] = useState(false);

  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [rechargeTarget, setRechargeTarget] = useState<Reseller | null>(null);
  const [rechargeAmountInput, setRechargeAmountInput] = useState<number>(5000);
  const [rechargeMethodInput, setRechargeMethodInput] = useState<string>('bKash');
  const [rechargeNotesInput, setRechargeNotesInput] = useState<string>('CEO TM Direct Top-Up');

  const [isResetResellerPassOpen, setIsResetResellerPassOpen] = useState(false);
  const [resetResellerTarget, setResetResellerTarget] = useState<Reseller | null>(null);
  const [newResellerPassInput, setNewResellerPassInput] = useState('');

  const [deleteConfirmReseller, setDeleteConfirmReseller] = useState<Reseller | null>(null);

  const [resellerSearch, setResellerSearch] = useState('');
  const [resellerStatusFilter, setResellerStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  const [copiedResellerId, setCopiedResellerId] = useState<string | null>(null);
  const [visiblePassResellerId, setVisiblePassResellerId] = useState<string | null>(null);

  // Zero All Data Modal State
  const [isZeroDataModalOpen, setIsZeroDataModalOpen] = useState(false);
  const [isZeroingData, setIsZeroingData] = useState(false);

  // Search Operator Modal States
  const [isAddOperatorOpen, setIsAddOperatorOpen] = useState(false);
  const [opFormName, setOpFormName] = useState('');
  const [opFormUsername, setOpFormUsername] = useState('');
  const [opFormPassword, setOpFormPassword] = useState('');
  const [opFormMobile, setOpFormMobile] = useState('');
  const [opFormEmail, setOpFormEmail] = useState('');
  const [opFormNotes, setOpFormNotes] = useState('');
  const [opFormCanFinancials, setOpFormCanFinancials] = useState(true);
  const [opFormCanExport, setOpFormCanExport] = useState(false);
  const [opFormAllowedCompanies, setOpFormAllowedCompanies] = useState<string[]>(['central']);

  const [editModalOperator, setEditModalOperator] = useState<SearchOperator | null>(null);
  const [editOpAllowedCompanies, setEditOpAllowedCompanies] = useState<string[]>([]);

  const [resetPassOperator, setResetPassOperator] = useState<SearchOperator | null>(null);
  const [newOpPasswordInput, setNewOpPasswordInput] = useState('');
  const [deleteConfirmOperator, setDeleteConfirmOperator] = useState<SearchOperator | null>(null);
  const [isClearSearchLogsOpen, setIsClearSearchLogsOpen] = useState(false);

  // ISP Profile, Hotline & Bill Payment Numbers State
  const [companyName, setCompanyName] = useState(ispProfile.companyName);
  const [tagline, setTagline] = useState(ispProfile.tagline);
  const [supportPhone, setSupportPhone] = useState(ispProfile.supportPhone);
  const [emergencyHotline, setEmergencyHotline] = useState(ispProfile.emergencyHotline);
  const [supportEmail, setSupportEmail] = useState(ispProfile.supportEmail);
  const [bkashMerchant, setBkashMerchant] = useState(ispProfile.bkashMerchant || '');
  const [nagadMerchant, setNagadMerchant] = useState(ispProfile.nagadMerchant || '');
  const [rocketMerchant, setRocketMerchant] = useState(ispProfile.rocketMerchant || '');
  const [address, setAddress] = useState(ispProfile.address);
  const [currencySymbol, setCurrencySymbol] = useState(ispProfile.currencySymbol);
  const [currencyCode, setCurrencyCode] = useState(ispProfile.currencyCode || 'BDT');
  const [noticeMessage, setNoticeMessage] = useState(ispProfile.noticeMessage || '');
  const [showSearchPortalToPublic, setShowSearchPortalToPublic] = useState(
    Boolean(ispProfile.portalVisibility?.showSearchPortalToPublic)
  );
  const [showAdminLoginToPublic, setShowAdminLoginToPublic] = useState(
    Boolean(ispProfile.portalVisibility?.showAdminLoginToPublic)
  );
  const [showCeoPanelToPublic, setShowCeoPanelToPublic] = useState(
    Boolean(ispProfile.portalVisibility?.showCeoPanelToPublic)
  );
  const [isSavingIspProfile, setIsSavingIspProfile] = useState(false);

  // WhatsApp Automation & Gateway State
  const [waEnabled, setWaEnabled] = useState(ispProfile.whatsappSettings?.enabled ?? true);
  const [waProvider, setWaProvider] = useState<'direct' | 'ultramsg' | 'green_api' | 'custom_webhook'>(
    ispProfile.whatsappSettings?.provider || 'direct'
  );
  const [waInstanceId, setWaInstanceId] = useState(ispProfile.whatsappSettings?.instanceId || '');
  const [waApiToken, setWaApiToken] = useState(ispProfile.whatsappSettings?.apiToken || '');
  const [waWebhookUrl, setWaWebhookUrl] = useState(ispProfile.whatsappSettings?.webhookUrl || '');
  const [waSenderPhone, setWaSenderPhone] = useState(ispProfile.whatsappSettings?.senderPhone || '');
  const [waAutoSend, setWaAutoSend] = useState(ispProfile.whatsappSettings?.autoSendEnabled ?? false);
  const [waTiming, setWaTiming] = useState<'on_due_date' | '1_day_before' | '3_days_before' | 'always_if_due'>(
    ispProfile.whatsappSettings?.triggerTiming || 'always_if_due'
  );
  const [waTemplate, setWaTemplate] = useState(
    ispProfile.whatsappSettings?.customTemplate || DEFAULT_WHATSAPP_TEMPLATE
  );
  const [isSavingWaSettings, setIsSavingWaSettings] = useState(false);

  // Test Message State
  const [testPhone, setTestPhone] = useState(ispProfile.supportPhone || '');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Bulk Send State
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    success: number;
    fail: number;
    currentCustomer: string;
  }>({
    current: 0,
    total: 0,
    success: 0,
    fail: 0,
    currentCustomer: '',
  });

  // WhatsApp Alert Delivery Logs
  const [waLogs, setWaLogs] = useState<WhatsAppLogEntry[]>(() => getWhatsAppLogs());
  const refreshWaLogs = () => {
    setWaLogs(getWhatsAppLogs());
  };

  // Sync state with ispProfile if changed in background
  React.useEffect(() => {
    setCompanyName(ispProfile.companyName);
    setTagline(ispProfile.tagline);
    setSupportPhone(ispProfile.supportPhone);
    setEmergencyHotline(ispProfile.emergencyHotline);
    setSupportEmail(ispProfile.supportEmail);
    setBkashMerchant(ispProfile.bkashMerchant || '');
    setNagadMerchant(ispProfile.nagadMerchant || '');
    setRocketMerchant(ispProfile.rocketMerchant || '');
    setAddress(ispProfile.address);
    setCurrencySymbol(ispProfile.currencySymbol);
    setCurrencyCode(ispProfile.currencyCode || 'BDT');
    setNoticeMessage(ispProfile.noticeMessage || '');
    setShowSearchPortalToPublic(Boolean(ispProfile.portalVisibility?.showSearchPortalToPublic));
    setShowAdminLoginToPublic(Boolean(ispProfile.portalVisibility?.showAdminLoginToPublic));
    setShowCeoPanelToPublic(Boolean(ispProfile.portalVisibility?.showCeoPanelToPublic));

    if (ispProfile.whatsappSettings) {
      setWaEnabled(ispProfile.whatsappSettings.enabled ?? true);
      setWaProvider(ispProfile.whatsappSettings.provider || 'direct');
      setWaInstanceId(ispProfile.whatsappSettings.instanceId || '');
      setWaApiToken(ispProfile.whatsappSettings.apiToken || '');
      setWaWebhookUrl(ispProfile.whatsappSettings.webhookUrl || '');
      setWaSenderPhone(ispProfile.whatsappSettings.senderPhone || '');
      setWaAutoSend(ispProfile.whatsappSettings.autoSendEnabled ?? false);
      setWaTiming(ispProfile.whatsappSettings.triggerTiming || 'always_if_due');
      setWaTemplate(ispProfile.whatsappSettings.customTemplate || DEFAULT_WHATSAPP_TEMPLATE);
    }
  }, [ispProfile]);

  const handleSaveIspProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingIspProfile(true);
    updateISPProfile({
      companyName: companyName.trim(),
      tagline: tagline.trim(),
      supportPhone: supportPhone.trim(),
      emergencyHotline: emergencyHotline.trim(),
      supportEmail: supportEmail.trim(),
      bkashMerchant: bkashMerchant.trim(),
      nagadMerchant: nagadMerchant.trim(),
      rocketMerchant: rocketMerchant.trim(),
      address: address.trim(),
      currencySymbol: currencySymbol.trim(),
      currencyCode: currencyCode.trim(),
      noticeMessage: noticeMessage.trim(),
      portalVisibility: {
        showSearchPortalToPublic,
        showAdminLoginToPublic,
        showCeoPanelToPublic,
      },
    });
    setTimeout(() => {
      setIsSavingIspProfile(false);
      addToast('success', 'ISP সেটিংস সংরক্ষিত হয়েছে', 'ISP প্রোফাইল, সাপোর্ট নম্বর ও বিল পেমেন্ট নম্বর সফলভাবে আপডেট করা হয়েছে।');
    }, 250);
  };

  const handleSaveWhatsAppSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWaSettings(true);
    updateISPProfile({
      whatsappSettings: {
        enabled: waEnabled,
        provider: waProvider,
        instanceId: waInstanceId.trim(),
        apiToken: waApiToken.trim(),
        webhookUrl: waWebhookUrl.trim(),
        senderPhone: waSenderPhone.trim(),
        autoSendEnabled: waAutoSend,
        triggerTiming: waTiming,
        customTemplate: waTemplate.trim(),
      },
    });
    setTimeout(() => {
      setIsSavingWaSettings(false);
      addToast(
        'success',
        'WhatsApp সেটিংস সংরক্ষিত হয়েছে',
        'WhatsApp গেটওয়ে ও বিল অ্যালার্ট সেটিংস সফলভাবে আপডেট করা হয়েছে।'
      );
    }, 250);
  };

  // Due customers list
  const dueCustomers = React.useMemo(() => {
    return customers.filter((c) => isCustomerBillDue(c, waTiming));
  }, [customers, waTiming]);

  const handleSendTestMessage = async () => {
    if (!testPhone.trim()) {
      addToast('error', 'নম্বর প্রদান করুন', 'অনুগ্রহ করে টেস্ট করার জন্য একটি মোবাইল নম্বর লিখুন।');
      return;
    }
    setIsSendingTest(true);
    const dummyCustomer: Customer = {
      id: 'test-cust',
      uid: 'WIFI-TEST01',
      name: 'টেস্ট গ্রাহক',
      mobile: testPhone.trim(),
      address: address || 'টেস্ট এরিয়া',
      area: 'Zone 1',
      packageName: 'Standard Turbo (20 Mbps)',
      speed: '20 Mbps',
      monthlyBill: 500,
      connectionType: 'Fiber (FTTH)',
      monthlyFee: 500,
      dueAmount: 500,
      nextPaymentDate: new Date().toISOString().split('T')[0],
      paymentStatus: 'Due',
      status: 'Due',
      connectionDate: '2026-01-01',
      installationDate: '2026-01-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const tempProfile = {
      ...ispProfile,
      whatsappSettings: {
        enabled: waEnabled,
        provider: waProvider,
        instanceId: waInstanceId.trim(),
        apiToken: waApiToken.trim(),
        webhookUrl: waWebhookUrl.trim(),
        senderPhone: waSenderPhone.trim(),
        autoSendEnabled: waAutoSend,
        triggerTiming: waTiming,
        customTemplate: waTemplate.trim(),
      },
    };

    try {
      const res = await dispatchWhatsAppAlert(dummyCustomer, tempProfile);
      refreshWaLogs();
      if (res.success) {
        addToast('success', 'টেস্ট মেসেজ সফল', res.message);
      } else {
        addToast('error', 'টেস্ট ব্যর্থ হয়েছে', res.message);
      }
    } catch (err: any) {
      addToast('error', 'এরর', err.message || 'টেস্ট মেসেজ পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleBulkSendAlerts = async () => {
    if (dueCustomers.length === 0) {
      addToast('info', 'কোনো বকেয়া গ্রাহক নেই', 'বর্তমানে কোনো মেয়াদোত্তীর্ণ বা বিল বকেয়া গ্রাহক নেই।');
      return;
    }

    if (!window.confirm(`আপনি কি মোট ${dueCustomers.length} জন বকেয়া গ্রাহকের কাছে WhatsApp বিল মেসেজ পাঠাতে চান?`)) {
      return;
    }

    setIsSendingBulk(true);
    setBulkProgress({
      current: 0,
      total: dueCustomers.length,
      success: 0,
      fail: 0,
      currentCustomer: '',
    });

    let succ = 0;
    let fail = 0;

    const currentProfile = {
      ...ispProfile,
      whatsappSettings: {
        enabled: waEnabled,
        provider: waProvider,
        instanceId: waInstanceId.trim(),
        apiToken: waApiToken.trim(),
        webhookUrl: waWebhookUrl.trim(),
        senderPhone: waSenderPhone.trim(),
        autoSendEnabled: waAutoSend,
        triggerTiming: waTiming,
        customTemplate: waTemplate.trim(),
      },
    };

    for (let i = 0; i < dueCustomers.length; i++) {
      const cust = dueCustomers[i];
      setBulkProgress({
        current: i + 1,
        total: dueCustomers.length,
        success: succ,
        fail,
        currentCustomer: cust.name,
      });

      const res = await dispatchWhatsAppAlert(cust, currentProfile);
      if (res.success) {
        succ++;
      } else {
        fail++;
      }

      setBulkProgress(prev => ({
        ...prev,
        success: succ,
        fail,
      }));

      // Delay between sends
      if (waProvider !== 'direct') {
        await new Promise(r => setTimeout(r, 1200));
      } else {
        await new Promise(r => setTimeout(r, 800));
      }
    }

    refreshWaLogs();
    setIsSendingBulk(false);
    addToast(
      'success',
      'বাল্ক WhatsApp সম্পন্ন',
      `মোট ${succ} জন গ্রাহকের কাছে বিল অ্যালার্ট পাঠানো হয়েছে।`
    );
  };

  // State for toggling individual admin password visibility
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const [resetModalAdmin, setResetModalAdmin] = useState<AdminAccount | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [editModalAdmin, setEditModalAdmin] = useState<AdminAccount | null>(null);
  const [deleteConfirmAdmin, setDeleteConfirmAdmin] = useState<AdminAccount | null>(null);
  const [isForceLogoutModalOpen, setIsForceLogoutModalOpen] = useState(false);
  const [isClearLogsModalOpen, setIsClearLogsModalOpen] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);

  // New Admin Form State
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'Super Admin' | 'Billing Admin' | 'Network Admin' | 'Support Admin' | 'Manager' | 'Custom Admin'>('Billing Admin');
  const [formPermissions, setFormPermissions] = useState<string[]>(['customers', 'billing']);
  const [formStatus, setFormStatus] = useState<'Active' | 'Suspended'>('Active');

  // Logs Search & Filter
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<'ALL' | 'Success' | 'Failed' | 'Warning'>('ALL');

  // Handle CEO TM Login
  const handleCeoLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ceoPasswordInput) {
      addToast('error', 'Authentication Failed', 'দয়া করে CEO TM পাসওয়ার্ড প্রদান করুন।');
      return;
    }

    const res = ceoTmLogin(ceoPasswordInput);
    if (res.success) {
      addToast('success', 'CEO TM Access Verified', 'CEO TM সিকিউরিটি কন্ট্রোল প্যানেলে স্বাগতম।');
      setCeoPasswordInput('');
    } else {
      addToast('error', 'Authentication Failed', res.error || 'ভুল পাসওয়ার্ড।');
    }
  };

  // Quick Password Reset Execution
  const executeResetPassword = async () => {
    if (!resetModalAdmin) return;
    if (!newAdminPassword || newAdminPassword.trim().length < 3) {
      addToast('error', 'Invalid Password', 'পাসওয়ার্ড কমপক্ষে ৩ অক্ষরের হতে হবে।');
      return;
    }

    const res = await resetAdminPasswordByCeo(resetModalAdmin.id, newAdminPassword);
    if (res.success) {
      addToast(
        'success', 
        'Password Reset & Admins Logged Out', 
        `"${resetModalAdmin.name}" এর নতুন পাসওয়ার্ড সেট করা হয়েছে এবং সব অ্যাডমিনকে স্বয়ংক্রিয়ভাবে লগআউট করা হয়েছে।`
      );
      setResetModalAdmin(null);
      setNewAdminPassword('');
    } else {
      addToast('error', 'Reset Failed', res.error || 'রিসেট করতে ব্যর্থ হয়েছে।');
    }
  };

  // Generate Random Strong Password
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewAdminPassword(pass);
    setFormPassword(pass);
  };

  // Handle Create Admin
  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formUsername || !formPassword) {
      addToast('error', 'Missing Fields', 'নাম, ইউজারনেম এবং পাসওয়ার্ড পূরণ করুন।');
      return;
    }

    const res = await createAdminAccountByCeo({
      name: formName.trim(),
      username: formUsername.trim(),
      email: formEmail.trim() || `${formUsername.trim().toLowerCase()}@isp.net`,
      password: formPassword.trim(),
      role: formRole,
      permissions: formPermissions,
      status: formStatus,
    });

    if (res.success) {
      addToast('success', 'Admin Created', `নতুন অ্যাডমিন "${formName}" সফলভাবে তৈরি করা হয়েছে।`);
      setIsAddAdminOpen(false);
      resetForm();
    } else {
      addToast('error', 'Creation Failed', res.error || 'তৈরি করা সম্ভব হয়নি।');
    }
  };

  // Handle Edit Admin Submit
  const handleEditAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalAdmin) return;

    const res = await updateAdminAccountByCeo(editModalAdmin);
    if (res.success) {
      addToast('success', 'Admin Updated', `"${editModalAdmin.name}" এর তথ্য আপডেট করা হয়েছে।`);
      setEditModalAdmin(null);
    } else {
      addToast('error', 'Update Failed', res.error || 'আপডেট করা যায়নি।');
    }
  };

  // Handle Delete Admin Trigger
  const handleDeleteAdmin = (admin: AdminAccount) => {
    setDeleteConfirmAdmin(admin);
  };

  // Confirm Delete Admin
  const executeDeleteAdmin = async () => {
    if (!deleteConfirmAdmin) return;
    const res = await deleteAdminAccountByCeo(deleteConfirmAdmin.id);
    if (res.success) {
      addToast('warning', 'Admin Deleted', `অ্যাডমিন "${deleteConfirmAdmin.name}" সফলভাবে ডিলিট করা হয়েছে।`);
      setDeleteConfirmAdmin(null);
    } else {
      addToast('error', 'Cannot Delete', res.error || 'ডিলিট করা যায়নি।');
    }
  };

  // Handle Global Force Logout
  const executeGlobalForceLogout = () => {
    forceLogoutAllAdminsByCeo();
    addToast('warning', 'All Admins Logged Out', 'সকল অ্যাডমিন সেশন অবিলম্বে সমাপ্ত করা হয়েছে।');
    setIsForceLogoutModalOpen(false);
  };

  // Handle Clear Audit Logs
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const executeClearAuditLogs = async () => {
    setIsClearingLogs(true);
    try {
      await clearAuditLogsByCeo();
      addToast('info', 'Logs Deleted', 'সকল অডিট লগ স্থায়ীভাবে মুছে ফেলা হয়েছে।');
      setIsClearLogsModalOpen(false);
    } catch (err) {
      addToast('error', 'ব্যর্থ', 'লগ ডিলিট করার সময় সমস্যা হয়েছে।');
    } finally {
      setIsClearingLogs(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormUsername('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('Billing Admin');
    setFormPermissions(['customers', 'billing']);
    setFormStatus('Active');
  };

  const resetOpForm = () => {
    setOpFormName('');
    setOpFormUsername('');
    setOpFormPassword('');
    setOpFormMobile('');
    setOpFormEmail('');
    setOpFormNotes('');
    setOpFormCanFinancials(true);
    setOpFormCanExport(false);
    setOpFormAllowedCompanies(['central']);
  };

  const handleCreateSearchOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opFormName.trim() || !opFormUsername.trim() || !opFormPassword.trim()) {
      addToast('error', 'তথ্য অসম্পূর্ণ', 'নাম, ইউজারনেম ও পাসওয়ার্ড পূরণ করা আবশ্যক।');
      return;
    }

    if (opFormAllowedCompanies.length === 0) {
      addToast('warning', 'কোম্পানি পারমিশন নির্বাচন করুন', 'কমপক্ষে একটি অনুমোদিত কোম্পানি নির্বাচন করতে হবে।');
      return;
    }

    const res = await createSearchOperatorByCeo({
      name: opFormName.trim(),
      username: opFormUsername.trim(),
      password: opFormPassword.trim(),
      mobile: opFormMobile.trim(),
      email: opFormEmail.trim(),
      role: 'search_operator',
      status: 'Active',
      permissions: {
        canSearch: true,
        canViewFinancials: opFormCanFinancials,
        canViewFullProfiles: true,
        canExport: opFormCanExport,
        allowedCompanies: opFormAllowedCompanies,
      },
      notes: opFormNotes.trim(),
    });

    if (res.success) {
      addToast('success', 'অপারেটর তৈরি হয়েছে', `সার্চ অপারেটর "${opFormName}" সফলভাবে তৈরি করা হয়েছে।`);
      setIsAddOperatorOpen(false);
      resetOpForm();
    } else {
      addToast('error', 'অপারেটর তৈরি ব্যর্থ', res.error || 'তৈরি করা সম্ভব হয়নি।');
    }
  };

  const handleOpenEditOperator = (operator: SearchOperator) => {
    setEditModalOperator({ ...operator });
    setEditOpAllowedCompanies(operator.permissions?.allowedCompanies || ['central']);
  };

  const handleUpdateSearchOperatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalOperator) return;

    if (editOpAllowedCompanies.length === 0) {
      addToast('warning', 'কোম্পানি পারমিশন নির্বাচন করুন', 'কমপক্ষে একটি অনুমোদিত কোম্পানি নির্বাচন করতে হবে।');
      return;
    }

    const updatedOperator: SearchOperator = {
      ...editModalOperator,
      permissions: {
        ...editModalOperator.permissions,
        allowedCompanies: editOpAllowedCompanies,
      },
    };

    const res = await updateSearchOperatorByCeo(updatedOperator);
    if (res.success) {
      addToast('success', 'পারমিশন আপডেট সফল', `অপারেটর "${editModalOperator.name}" এর কোম্পানি পারমিশন সফলভাবে আপডেট করা হয়েছে।`);
      setEditModalOperator(null);
    } else {
      addToast('error', 'আপডেট ব্যর্থ', res.error || 'পারমিশন আপডেট করা যায়নি।');
    }
  };

  const handleToggleSearchOperator = async (operatorId: string, currentStatus: 'Active' | 'Suspended', opName: string) => {
    const res = await toggleSearchOperatorStatusByCeo(operatorId);
    if (res.success) {
      const nextStatus = currentStatus === 'Active' ? 'স্থগিত (Suspended)' : 'সক্রিয় (Active)';
      addToast('info', 'পারমিশন আপডেট', `অপারেটর "${opName}" এর স্ট্যাটাস এখন ${nextStatus}।`);
    }
  };

  const handleExecuteResetOperatorPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassOperator) return;
    if (!newOpPasswordInput.trim() || newOpPasswordInput.trim().length < 4) {
      addToast('error', 'Invalid Password', 'কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড দিন।');
      return;
    }

    const res = await resetSearchOperatorPasswordByCeo(resetPassOperator.id, newOpPasswordInput.trim());
    if (res.success) {
      addToast('success', 'পাসওয়ার্ড রিসেট সফল', `অপারেটর "${resetPassOperator.name}" এর পাসওয়ার্ড সফলভাবে আপডেট হয়েছে।`);
      setResetPassOperator(null);
      setNewOpPasswordInput('');
    } else {
      addToast('error', 'ব্যর্থ', res.error || 'পাসওয়ার্ড রিসেট সম্ভব হয়নি।');
    }
  };

  const handleExecuteDeleteOperator = async () => {
    if (!deleteConfirmOperator) return;
    const res = await deleteSearchOperatorByCeo(deleteConfirmOperator.id);
    if (res.success) {
      addToast('warning', 'অপারেটর ডিলিট সম্পন্ন', `সার্চ অপারেটর "${deleteConfirmOperator.name}" স্থায়ীভাবে মুছে ফেলা হয়েছে।`);
      setDeleteConfirmOperator(null);
    } else {
      addToast('error', 'ব্যর্থ', res.error || 'ডিলিট সম্ভব হয়নি।');
    }
  };

  const handleExecuteClearSearchLogs = async () => {
    try {
      await clearSearchLoginLogsByCeo();
      addToast('info', 'সার্চ লগ মুছে ফেলা হয়েছে', 'সার্চ অপারেটরদের সমস্ত পূর্ববর্তী লগ হিস্টোরি সম্পূর্ণ মুছে ফেলা হয়েছে।');
      setIsClearSearchLogsOpen(false);
    } catch (err) {
      addToast('error', 'ব্যর্থ', 'সার্চ লগ ডিলিট করতে সমস্যা হয়েছে।');
    }
  };

  // Filtered Logs
  const filteredLogs = auditLogs.filter((log) => {
    const matchSearch = 
      log.adminName.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.username.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.role.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.ipAddress.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(logSearchQuery.toLowerCase()));

    const matchStatus = logStatusFilter === 'ALL' || log.status === logStatusFilter;

    return matchSearch && matchStatus;
  });

  // Export Logs CSV
  const exportLogsAsCSV = () => {
    if (auditLogs.length === 0) {
      addToast('info', 'No Logs', 'ডাউনলোড করার মত কোনো অডিট লগ নেই।');
      return;
    }
    const headers = ['ID', 'Admin Name', 'Username', 'Role', 'Timestamp', 'Action', 'Status', 'IP Address', 'Device', 'Details'];
    const rows = auditLogs.map((l) => [
      l.id,
      `"${l.adminName}"`,
      `"${l.username}"`,
      `"${l.role}"`,
      `"${l.timestamp}"`,
      `"${l.action}"`,
      `"${l.status}"`,
      `"${l.ipAddress}"`,
      `"${l.device}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CEO_TM_Admin_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'Logs Exported', 'অডিট লগ CSV ফাইল সফলভাবে ডাউনলোড হয়েছে।');
  };

  // ==================== CEO TM Reseller Management Handlers ====================
  const handleSaveReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resellerFormName.trim() || !resellerFormUsername.trim() || !resellerFormPassword.trim()) {
      addToast('error', 'অসম্পূর্ণ তথ্য', 'রিসেলারের নাম, ইউজারনেম ও পাসওয়ার্ড পূরণ করুন।');
      return;
    }

    const cleanUser = resellerFormUsername.trim().toLowerCase();
    setIsSubmittingReseller(true);
    try {
      if (editingReseller) {
        // Check username uniqueness if changed
        const currentEditingUsername = String(editingReseller.username || '').toLowerCase();
        if (cleanUser !== currentEditingUsername) {
          const exists = resellers.some(r => r && r.id !== editingReseller.id && String(r.username || '').toLowerCase() === cleanUser);
          if (exists) {
            addToast('error', 'ইউজারনেম বিদ্যমান', `"${cleanUser}" ইউজারনেমটি অন্য রিসেলারের জন্য ইতিমধ্যে নিবন্ধিত।`);
            setIsSubmittingReseller(false);
            return;
          }
        }
        await updateReseller(editingReseller.id, {
          name: resellerFormName.trim(),
          ownerName: resellerFormOwner.trim() || resellerFormName.trim(),
          username: cleanUser,
          password: resellerFormPassword.trim(),
          phone: resellerFormPhone.trim(),
          email: resellerFormEmail.trim(),
          area: resellerFormArea.trim(),
          balance: Number(resellerFormBalance) || 0,
          commissionRate: Number(resellerFormCommissionRate) || 15,
          wholesaleRate: Number(resellerFormWholesaleRate) || 350,
          billingType: resellerFormBillingType,
          status: resellerFormStatus,
        });
        addToast('success', 'রিসেলার আপডেট সম্পন্ন', `${resellerFormName} এর তথ্য সফলভাবে আপডেট হয়েছে।`);
      } else {
        // Adding new reseller
        const exists = resellers.some(r => r && String(r.username || '').toLowerCase() === cleanUser);
        if (exists) {
          addToast('error', 'ইউজারনেম বিদ্যমান', `"${cleanUser}" ইউজারনেমটি ইতিমধ্যে বিদ্যমান। অন্য ইউজারনেম দিন।`);
          setIsSubmittingReseller(false);
          return;
        }

        const newReseller = await addReseller({
          name: resellerFormName.trim(),
          ownerName: resellerFormOwner.trim() || resellerFormName.trim(),
          username: cleanUser,
          password: resellerFormPassword.trim(),
          phone: resellerFormPhone.trim(),
          email: resellerFormEmail.trim(),
          area: resellerFormArea.trim(),
          balance: Number(resellerFormBalance) || 0,
          commissionRate: Number(resellerFormCommissionRate) || 15,
          wholesaleRate: Number(resellerFormWholesaleRate) || 350,
          billingType: resellerFormBillingType,
          status: resellerFormStatus,
          code: generateNextResellerCode(),
        });

        addToast(
          'success', 
          'রিসেলার আইডি তৈরি সম্পন্ন!', 
          `আইডি: ${newReseller.code} | ইউজারনেম: ${newReseller.username} | পাসওয়ার্ড: ${newReseller.password} দিয়ে রিসেলার পোর্টালে সরাসরি লগইন করতে পারবে।`
        );
      }

      setIsAddResellerModalOpen(false);
      setEditingReseller(null);
    } catch (err: any) {
      addToast('error', 'ত্রুটি', err.message || 'রিসেলার সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmittingReseller(false);
    }
  };

  const handleExecuteRechargeReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargeTarget) return;
    if (rechargeAmountInput <= 0) {
      addToast('error', 'ভুল পরিমাণ', 'রিচার্জের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে।');
      return;
    }
    try {
      await rechargeResellerBalance(
        rechargeTarget.id,
        rechargeAmountInput,
        rechargeMethodInput,
        rechargeNotesInput,
        'CEO TM Executive'
      );
      setIsRechargeModalOpen(false);
      setRechargeTarget(null);
    } catch (err: any) {
      addToast('error', 'রিচার্জ ব্যর্থ', err.message || 'ব্যালেন্স রিচার্জ করা সম্ভব হয়নি।');
    }
  };

  const handleExecuteResetResellerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetResellerTarget) return;
    if (!newResellerPassInput || newResellerPassInput.trim().length < 3) {
      addToast('error', 'দুর্বল পাসওয়ার্ড', 'পাসওয়ার্ড কমপক্ষে ৩ অক্ষরের হতে হবে।');
      return;
    }
    try {
      await updateReseller(resetResellerTarget.id, {
        password: newResellerPassInput.trim(),
      });
      addToast(
        'success',
        'রিসেলার পাসওয়ার্ড পরিবর্তিত',
        `${resetResellerTarget.name} এর নতুন পাসওয়ার্ড সেট করা হয়েছে: "${newResellerPassInput.trim()}"`
      );
      setIsResetResellerPassOpen(false);
      setResetResellerTarget(null);
      setNewResellerPassInput('');
    } catch (err: any) {
      addToast('error', 'পাসওয়ার্ড পরিবর্তন ব্যর্থ', err.message || 'পাসওয়ার্ড পরিবর্তন করা সম্ভব হয়নি।');
    }
  };

  const handleToggleResellerStatus = async (reseller: Reseller) => {
    try {
      const nextStatus = reseller.status === 'Active' ? 'Suspended' : 'Active';
      await updateReseller(reseller.id, { status: nextStatus });
      addToast(
        'info',
        'স্ট্যাটাস পরিবর্তিত',
        `${reseller.name} এর অ্যাকাউন্ট ${nextStatus === 'Active' ? 'সক্রিয়' : 'স্থগিত (Suspended)'} করা হয়েছে।`
      );
    } catch (err: any) {
      addToast('error', 'স্ট্যাটাস পরিবর্তন ব্যর্থ', err.message || 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।');
    }
  };

  const handleDeleteResellerConfirm = async () => {
    if (!deleteConfirmReseller) return;
    try {
      await deleteReseller(deleteConfirmReseller.id);
      setDeleteConfirmReseller(null);
    } catch (err: any) {
      addToast('error', 'ডিলিট ব্যর্থ', err.message || 'রিসেলার ডিলিট করতে সমস্যা হয়েছে।');
    }
  };

  const handleCopyResellerCreds = (r: Reseller) => {
    const credText = `রিসেলার নাম: ${r.name}\nকোড: ${r.code}\nইউজারনেম: ${r.username}\nপাসওয়ার্ড: ${r.password}\nমোবাইল: ${r.phone}\nএলাকা: ${r.area}`;
    navigator.clipboard.writeText(credText).then(() => {
      setCopiedResellerId(r.id);
      addToast('success', 'ক্রেডেনশিয়াল কপি করা হয়েছে', `${r.name} এর লগইন ইউজারনেম ও পাসওয়ার্ড ক্লিপবোর্ডে কপি হয়েছে।`);
      setTimeout(() => setCopiedResellerId(null), 3000);
    }).catch(() => {});
  };

  const handleExecuteZeroAllData = async () => {
    setIsZeroingData(true);
    try {
      await clearAllCustomerData();
      await clearAllResellerData();
      addToast('success', 'সকল ডেটা শূন্য করা হয়েছে', 'গ্রাহক, পেমেন্ট ও রিসেলারদের সকল পরীক্ষামূলক ডেটা সফলভাবে শূন্য করা হয়েছে।');
      setIsZeroDataModalOpen(false);
    } catch (err: any) {
      addToast('error', 'ডেটা শূন্য করতে ব্যর্থ', err.message || 'ডেটা শূন্য করতে সমস্যা হয়েছে।');
    } finally {
      setIsZeroingData(false);
    }
  };

  // If NOT Authenticated as CEO TM, display Exclusive Executive Password Gate
  if (!isCeoTmAuthenticated) {
    return (
      <div className={`min-h-[85vh] flex items-center justify-center p-4 ${isDark ? 'text-slate-100' : 'text-slate-100'}`}>
        <div className="w-full max-w-md">
          
          <button
            onClick={onBackToHome}
            className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> হোম পেজে ফিরে যান
          </button>

          <div className="relative rounded-3xl p-6 sm:p-8 backdrop-blur-2xl border-2 border-amber-500/40 bg-gradient-to-b from-slate-900/95 via-[#131127]/95 to-slate-950/95 shadow-2xl shadow-amber-950/40 overflow-hidden">
            
            {/* Top Amber Ambient Aura */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/30 ring-4 ring-amber-400/20 animate-pulse">
                <Crown className="w-9 h-9" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold tracking-wider mb-2">
                EXECUTIVE MASTER ACCESS
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                CEO TM <span className="text-amber-400">প্যানেল</span>
              </h1>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                সকল অ্যাডমিন অ্যাকাউন্ট ম্যানেজমেন্ট, পাসওয়ার্ড রিসেট ও লাইভ লগইন হিস্টোরি অডিট সিকিউরিটি সেন্টার।
              </p>

              <form onSubmit={handleCeoLogin} className="mt-6 space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-amber-200 mb-1.5 flex items-center justify-between">
                    <span>CEO TM মাস্টার পাসওয়ার্ড (Password)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#00b4fc]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showCeoPassword ? 'text' : 'password'}
                      value={ceoPasswordInput}
                      onChange={(e) => setCeoPasswordInput(e.target.value)}
                      placeholder="পাসওয়ার্ড লিখুন..."
                      autoFocus
                      style={{ borderColor: '#00b4fc' }}
                      className="w-full py-3.5 pl-10 pr-11 bg-slate-950/80 border border-[#00b4fc] rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#00b4fc] focus:ring-2 focus:ring-[#00b4fc]/25 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCeoPassword(!showCeoPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-cyan-400 transition-colors"
                      title={showCeoPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                    >
                      {showCeoPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Key className="w-4 h-4 text-slate-950" />
                  CEO TM প্যানেলে প্রবেশ করুন
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>পাসওয়ার্ড রিসেট</span>
                </button>
                <button
                  type="button"
                  onClick={onNavigateToAdmin}
                  className="text-cyan-400 hover:underline cursor-pointer"
                >
                  সাধারণ এডমিন লগইন
                </button>
              </div>

            </div>
          </div>

          {/* Admin Password Reset Modal */}
          <ResetPasswordModal
            isOpen={isResetModalOpen}
            onClose={() => setIsResetModalOpen(false)}
          />
        </div>
      </div>
    );
  }

  // If Authenticated as CEO TM, Render the Executive Master Control Interface
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Top CEO TM Master Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-[#191538] to-slate-950 border-2 border-amber-500/40 shadow-2xl shadow-amber-950/30 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/30 ring-4 ring-amber-400/30 shrink-0">
              <Crown className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  CEO TM <span className="text-amber-400">Master Security Control</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[10px] sm:text-xs font-bold">
                  SUPERVISORY LEVEL
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                এখানে আপনি সব অ্যাডমিন লগইন এর পাসওয়ার্ড রিসেট করতে পারবেন, প্রত্যেকের জন্য আলাদা পাসওয়ার্ড ও পারমিশন তৈরি করতে পারবেন, এবং কারা অ্যাডমিন প্যানেলে লগইন করেছে তা লাইভ মনিটর করতে পারবেন।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              onClick={() => setIsForceLogoutModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="সকল অ্যাডমিনকে অবিলম্বে ফোর্স লগআউট করুন"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>জরুরী ফোর্স লগআউট (Force Logout All)</span>
            </button>

            <button
              onClick={() => {
                ceoTmLogout();
                addToast('info', 'CEO প্যানেল সমাপ্ত', 'CEO TM এক্সিকিউটিভ সেশন সফলভাবে সমাপ্ত হয়েছে।');
                if (onBackToHome) onBackToHome();
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              title="CEO প্যানেল থেকে লগআউট করুন এবং হোম পেজে ফিরে যান"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span>CEO প্যানেল ত্যাগ করুন (Logout)</span>
            </button>
          </div>

        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>মোট অ্যাডমিন অ্যাকাউন্ট</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1 font-mono">
              {adminAccounts.length}
            </div>
            <div className="text-[11px] text-cyan-400 mt-0.5">সব স্তরের অ্যাডমিন</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>সক্রিয় অ্যাডমিন</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 font-mono">
              {adminAccounts.filter(a => a.status === 'Active').length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Active Admin Access</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>মোট লগইন ইভেন্টস</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1 font-mono">
              {auditLogs.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">অডিট লগ এন্ট্রি</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>অটো লগআউট এনফোর্সমেন্ট</span>
              <Lock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-sm font-bold text-purple-300 mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              সক্রিয় (Active Enforced)
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">পাসওয়ার্ড পাল্টালেই সব লগআউট</div>
          </div>

        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'admins'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>অ্যাডমিন অ্যাকাউন্টস ({adminAccounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('search_operators')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'search_operators'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>সার্চ অপারেটর ও পারমিশন ({searchOperators.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('resellers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'resellers'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>রিসেলার ম্যানেজমেন্ট ({resellers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('isp_profile')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'isp_profile'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>ISP প্রোফাইল ও বিল পেমেন্ট নম্বর</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp বিল অটোমেশন</span>
            {dueCustomers.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
                {dueCustomers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'logs'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>কে কে লগইন করেছে (Audit Logs) ({auditLogs.length})</span>
          </button>
        </div>

        {activeTab === 'admins' && (
          <button
            onClick={() => {
              resetForm();
              setIsAddAdminOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            নতুন অ্যাডমিন তৈরি করুন (Add New Admin)
          </button>
        )}

        {activeTab === 'search_operators' && (
          <button
            onClick={() => {
              resetOpForm();
              setIsAddOperatorOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            নতুন সার্চ অপারেটর যুক্ত করুন (Add Operator)
          </button>
        )}

        {activeTab === 'resellers' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setEditingReseller(null);
                setResellerFormName('');
                setResellerFormOwner('');
                setResellerFormUsername('');
                setResellerFormPassword('1234');
                setResellerFormPhone('');
                setResellerFormEmail('');
                setResellerFormArea('');
                setResellerFormBalance(0);
                setResellerFormCommissionRate(15);
                setResellerFormWholesaleRate(350);
                setResellerFormBillingType('prepaid');
                setResellerFormStatus('Active');
                setIsAddResellerModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              নতুন রিসেলার তৈরি করুন (Add Reseller)
            </button>

            <button
              onClick={() => setIsZeroDataModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 text-xs font-bold border border-rose-800/50 transition-all flex items-center gap-1.5 cursor-pointer"
              title="সকল ডেমো ও পরীক্ষামূলক ডেটা শূন্য করুন"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>সকল ডেটা শূন্য করুন</span>
            </button>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportLogsAsCSV}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>CSV ডাউনলোড</span>
            </button>
            <button
              onClick={() => setIsClearLogsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 text-xs font-bold border border-rose-800/50 transition-all flex items-center gap-1.5 cursor-pointer"
              title="সকল সংরক্ষিত অডিট লগ ডাটাবেস থেকে সম্পূর্ণ ডিলিট করুন"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>লগ ডিলিট করুন</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: ALL ADMIN ACCOUNTS & PASSWORD MANAGEMENT */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">CEO TM অটোমেটিক গ্লোবাল লগআউট সিকিউরিটি রুল:</p>
              <p className="mt-0.5 text-amber-300/90 leading-relaxed">
                আপনি যখনই কোনো অ্যাডমিনের পাসওয়ার্ড রিসেট বা পরিবর্তন করবেন, সিস্টেম তাত্ক্ষণিকভাবে পূর্ববর্তী সব অ্যাডমিন সেশন টার্মিনেট করবে। যেসকল অ্যাডমিন বর্তমানে প্যানেলে লগইন করা আছেন তারা সাথে সাথে স্বয়ংক্রিয়ভাবে লগআউট হয়ে যাবেন এবং নতুন পাসওয়ার্ড ছাড়া আর প্রবেশ করতে পারবেন না।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminAccounts.map((admin) => (
              <div 
                key={admin.id}
                className={`p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                  admin.role === 'Super Admin'
                    ? 'bg-gradient-to-b from-slate-900 to-[#121829] border-cyan-500/40 shadow-lg shadow-cyan-950/20'
                    : admin.status === 'Suspended'
                    ? 'bg-slate-900/60 border-rose-500/30 opacity-75'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
                        admin.role === 'Super Admin'
                          ? 'bg-gradient-to-tr from-amber-500 to-yellow-600 text-slate-950'
                          : admin.role === 'Billing Admin'
                          ? 'bg-gradient-to-tr from-emerald-500 to-teal-600'
                          : admin.role === 'Network Admin'
                          ? 'bg-gradient-to-tr from-blue-500 to-indigo-600'
                          : 'bg-gradient-to-tr from-purple-500 to-pink-600'
                      }`}>
                        {admin.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                          {admin.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono text-cyan-400">
                            @{admin.username}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                            admin.status === 'Active'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          }`}>
                            {admin.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-semibold shrink-0">
                      {admin.role}
                    </span>
                  </div>

                  <div className="space-y-2 py-3 border-y border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">বর্তমান পাসওয়ার্ড:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-amber-300 font-bold px-2 py-0.5 rounded bg-slate-950 border border-amber-500/20 text-xs">
                          {revealedPasswords[admin.id] ? admin.password : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(admin.id)}
                          className="p-1 text-slate-400 hover:text-cyan-400 transition-colors rounded hover:bg-slate-800"
                          title={revealedPasswords[admin.id] ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                        >
                          {revealedPasswords[admin.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">ইমেইল:</span>
                      <span className="font-mono text-slate-300 text-[11px] truncate max-w-[170px]">
                        {admin.email}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">সর্বশেষ লগইন:</span>
                      <span className="text-slate-300 text-[11px]">
                        {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'লগইন হয়নি'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">লগইন সংখ্যা:</span>
                      <span className="font-mono text-cyan-400 font-bold">
                        {admin.loginCount || 0} বার
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">অনুমোদিত পারমিশন:</span>
                      <div className="flex flex-wrap gap-1">
                        {admin.permissions.map((p) => (
                          <span key={p} className="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 mt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setResetModalAdmin(admin);
                      setNewAdminPassword('');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>পাসওয়ার্ড রিসেট</span>
                  </button>

                  <button
                    onClick={() => setEditModalAdmin({ ...admin })}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                    title="এডিট অ্যাডমিন"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteAdmin(admin)}
                    className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-800/40 transition-all cursor-pointer shadow-sm"
                    title="অ্যাডমিন ডিলিট করুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB: SEARCH OPERATORS & PERMISSIONS (CEO EXCLUSIVE) */}
      {activeTab === 'search_operators' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Security & Overview Banner */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-indigo-950/70 border border-cyan-500/40 shadow-xl space-y-3">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-md">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex flex-wrap items-center gap-2">
                    <span>কাস্টমার সার্চ অপারেটর পারমিশন ও একাউন্ট কন্ট্রোল</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-mono font-bold border border-cyan-500/40">
                      CEO EXCLUSIVE
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      রিয়েলটাইম ডাটাবেস লাইভ
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    পাবলিক সার্চ পেজে সাধারণ গ্রাহক বা বাইরের কেউ সরাসরি সার্চ করতে পারবে না। শুধুমাত্র এই প্যানেল থেকে যাদের পারমিশন দেওয়া হবে, তারাই লগইন করে গ্রাহক তথ্য ও বিল সার্চ করতে পারবে।
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  resetOpForm();
                  setIsAddOperatorOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>নতুন সার্চ অপারেটর যুক্ত করুন</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">মোট অপারেটর</span>
                <span className="text-lg font-black text-white font-mono">{searchOperators.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">সক্রিয় পারমিশন</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {searchOperators.filter(o => o.status === 'Active').length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">স্থগিত পারমিশন</span>
                <span className="text-lg font-black text-rose-400 font-mono">
                  {searchOperators.filter(o => o.status === 'Suspended').length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">মোট সার্চ লগইন</span>
                <span className="text-lg font-black text-cyan-400 font-mono">{searchLoginLogs.length}</span>
              </div>
            </div>
          </div>

          {/* Section 1: Operators Management List */}
          <div className="rounded-3xl p-5 sm:p-6 bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>অনুমোদিত সার্চ অপারেটরদের তালিকা ({searchOperators.length})</span>
                </h4>
                <p className="text-xs text-slate-400">১-ক্লিকে পারমিশন চালু/বন্ধ করুন, পাসওয়ার্ড রিসেট করুন অথবা মুছে ফেলুন</p>
              </div>
            </div>

            {searchOperators.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                কোনো সার্চ অপারেটর তৈরি করা হয়নি। "নতুন সার্চ অপারেটর যুক্ত করুন" বাটনে ক্লিক করুন।
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchOperators.map((operator) => (
                  <div
                    key={operator.id}
                    className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                      operator.status === 'Active'
                        ? 'bg-slate-950/70 border-slate-800 hover:border-cyan-500/40'
                        : 'bg-rose-950/20 border-rose-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-md ${
                          operator.status === 'Active'
                            ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {operator.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h5 className="font-extrabold text-sm text-white flex items-center gap-2">
                            <span>{operator.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                              operator.status === 'Active'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                            }`}>
                              {operator.status === 'Active' ? 'পারমিশন সক্রিয়' : 'পারমিশন স্থগিত'}
                            </span>
                          </h5>
                          <p className="text-xs text-cyan-400 font-mono">@{operator.username}</p>
                        </div>
                      </div>

                      {/* Status Toggle switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleSearchOperator(operator.id, operator.status, operator.name)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          operator.status === 'Active'
                            ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40'
                        }`}
                        title="পারমিশন টগল করুন"
                      >
                        <span className={`w-2 h-2 rounded-full ${operator.status === 'Active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span>{operator.status === 'Active' ? 'সক্রিয় (চালু)' : 'স্থগিত (বন্ধ)'}</span>
                      </button>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <div>
                        <span className="text-[10px] text-slate-500 block">মোবাইল নম্বর</span>
                        <span className="font-mono text-white">{operator.mobile || 'উল্লেখ নেই'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">পাসওয়ার্ড (CEO Only)</span>
                        <span className="font-mono text-amber-300 font-bold">{operator.password}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">সর্বশেষ লগইন</span>
                        <span className="font-mono text-slate-300">
                          {operator.lastLoginAt ? new Date(operator.lastLoginAt).toLocaleString('bn-BD', { dateStyle: 'short', timeStyle: 'short' }) : 'কখনো নয়'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">মোট লগইন সংখ্যা</span>
                        <span className="font-mono text-cyan-300 font-bold">{operator.loginCount || 0} বার</span>
                      </div>
                    </div>

                    {/* Authorized Company Permissions Display */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>অনুমোদিত কোম্পানি ডেটা অ্যাক্সেস:</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {(operator.permissions?.allowedCompanies || []).includes('ALL') 
                            ? 'সব কোম্পানি' 
                            : `${(operator.permissions?.allowedCompanies || []).length} টি`}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {(() => {
                          const allowed = operator.permissions?.allowedCompanies || [];
                          if (allowed.length === 0) {
                            return (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-950/70 border border-rose-500/30 text-rose-300 font-medium">
                                🚫 কোনো কোম্পানির পারমিশন নেই (ডেটা দেখতে পারবে না)
                              </span>
                            );
                          }
                          if (allowed.includes('ALL')) {
                            return (
                              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-950/70 border border-purple-500/40 text-purple-300 font-bold flex items-center gap-1">
                                <span>🌐 সকল কোম্পানি (সেন্ট্রাল + সব রিসেলার)</span>
                              </span>
                            );
                          }
                          return allowed.map((item) => {
                            if (item === 'central') {
                              return (
                                <span key="central" className="text-[10px] px-2 py-0.5 rounded-md bg-blue-950/70 border border-blue-500/30 text-blue-300 font-semibold flex items-center gap-1">
                                  <span>🏢</span>
                                  <span>{ispProfile.companyName} (সেন্ট্রাল)</span>
                                </span>
                              );
                            }
                            const resObj = resellers.find((r) => r.id === item || r.code === item);
                            return (
                              <span key={item} className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1">
                                <span>🏪</span>
                                <span>{resObj ? `[${resObj.code}] ${resObj.name}` : `রিসেলার: ${item}`}</span>
                              </span>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditOperator(operator)}
                        className="px-3 py-1.5 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
                        title="কোম্পানি পারমিশন পরিবর্তন করুন"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>পারমিশন এডিট</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setResetPassOperator(operator);
                          setNewOpPasswordInput('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        <span>পাসওয়ার্ড রিসেট</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmOperator(operator)}
                        className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 transition-all text-xs"
                        title="অপারেটর মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: কে কে লগইন করতেছে (Search Login Audit Logs) */}
          <div className="rounded-3xl p-5 sm:p-6 bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>কে কে সার্চ পোর্টালে লগইন করতেছে (Live Operator Login Audit)</span>
                </h4>
                <p className="text-xs text-slate-400">প্রতিটি লগইন চেষ্টা, তারিখ, সময় ও আইপি অডিট রেকর্ড</p>
              </div>

              {searchLoginLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsClearSearchLogsOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>সার্চ লগ ক্লিয়ার করুন</span>
                </button>
              )}
            </div>

            {searchLoginLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                এখনো পর্যন্ত কোনো সার্চ লগইন হিস্টোরি রেকর্ড নেই।
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="py-3 px-4">অপারেটর নাম</th>
                      <th className="py-3 px-4">ইউজারনেম</th>
                      <th className="py-3 px-4">লগইন সময়</th>
                      <th className="py-3 px-4">স্ট্যাটাস</th>
                      <th className="py-3 px-4">ডিভাইস / IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    {searchLoginLogs.slice(0, 50).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{log.operatorName}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-cyan-300">
                          @{log.username}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {new Date(log.timestamp).toLocaleString('bn-BD', {
                            dateStyle: 'medium',
                            timeStyle: 'medium'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                            log.status === 'Success'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                          }`}>
                            {log.status === 'Success' ? 'সফল লগইন' : log.status === 'Account_Suspended' ? 'স্থগিত অ্যাকাউন্ট' : log.status === 'Password_Mismatch' ? 'ভুল পাসওয়ার্ড' : 'ব্যর্থ চেষ্টা'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-xs font-mono">
                          {log.ipAddress || '127.0.0.1'} ({log.deviceInfo ? log.deviceInfo.split(' ')[0] : 'Web Client'})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB: RESELLERS & SUB-ISP MANAGEMENT (CEO MASTER CONTROL) */}
      {activeTab === 'resellers' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Security & Overview Banner */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/40 shadow-xl space-y-3">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-md">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex flex-wrap items-center gap-2">
                    <span>রিসেলার ও সাব-আইএসপি নেটওয়ার্ক মাস্টার কন্ট্রোল</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold border border-emerald-500/40">
                      CEO PANEL EXCLUSIVE
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Realtime Firestore Live
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    এখান থেকে তৈরি করা যেকোনো রিসেলার অ্যাকাউন্ট তাৎক্ষণিকভাবে ক্লাউড ডাটাবেসে সংরক্ষিত হয়। রিসেলার তাদের নির্ধারিত ইউজারনেম/কোড ও পাসওয়ার্ড দিয়ে সরাসরি লগইন করে নিজস্ব গ্রাহকদের বিল আদায় ও ব্যালেন্স ম্যানেজ করতে পারবেন।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setEditingReseller(null);
                    setResellerFormName('');
                    setResellerFormOwner('');
                    setResellerFormUsername('');
                    setResellerFormPassword('1234');
                    setResellerFormPhone('');
                    setResellerFormEmail('');
                    setResellerFormArea('');
                    setResellerFormBalance(0);
                    setResellerFormCommissionRate(15);
                    setResellerFormWholesaleRate(350);
                    setResellerFormBillingType('prepaid');
                    setResellerFormStatus('Active');
                    setIsAddResellerModalOpen(true);
                  }}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-slate-950" />
                  <span>+ নতুন রিসেলার তৈরি করুন</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsZeroDataModalOpen(true)}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 active:scale-95 text-rose-300 font-bold text-xs border border-rose-800/60 transition-all cursor-pointer"
                  title="সকল ডেটা শূন্য করুন"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>সকল ডেটা শূন্য করুন</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-emerald-900/50">
              <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-medium">মোট রিসেলার</span>
                <span className="text-xl font-black text-white font-mono mt-0.5 block">{resellers.length}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-medium">সক্রিয় রিসেলার</span>
                <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
                  {resellers.filter(r => r.status === 'Active').length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-medium">মোট ওয়ালেট ব্যালেন্স পুল</span>
                <span className="text-xl font-black text-cyan-300 font-mono mt-0.5 block">
                  {ispProfile.currencySymbol} {resellers.reduce((sum, r) => sum + (r.balance || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-medium">সংযুক্ত রিসেলার গ্রাহক</span>
                <span className="text-xl font-black text-purple-400 font-mono mt-0.5 block">
                  {customers.filter(c => Boolean(c.resellerId)).length} জন
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={resellerSearch}
                onChange={(e) => setResellerSearch(e.target.value)}
                placeholder="রিসেলার নাম, কোড, ইউজারনেম, মোবাইল..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400 font-medium">ফিল্টার:</span>
              {(['All', 'Active', 'Suspended'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setResellerStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    resellerStatusFilter === st
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {st === 'All' ? 'সকল' : st === 'Active' ? 'সক্রিয়' : 'স্থগিত'}
                </button>
              ))}
            </div>
          </div>

          {/* Resellers Grid / Zero State */}
          {resellers.length === 0 ? (
            <div className="p-10 rounded-3xl bg-slate-900/60 border-2 border-dashed border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Store className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">বর্তমানে কোনো রিসেলার নেই (ডাটাবেস সম্পূর্ণ শূন্য)</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  CEO panel থেকে প্রথম রিসেলার আইডি তৈরি করলেই তারা অবিলম্বে তাদের ইউজারনেম ও পাসওয়ার্ড দিয়ে লগইন করতে পারবে।
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingReseller(null);
                  setResellerFormName('');
                  setResellerFormOwner('');
                  setResellerFormUsername('');
                  setResellerFormPassword('1234');
                  setResellerFormPhone('');
                  setResellerFormEmail('');
                  setResellerFormArea('');
                  setResellerFormBalance(0);
                  setResellerFormCommissionRate(15);
                  setResellerFormWholesaleRate(350);
                  setResellerFormBillingType('prepaid');
                  setResellerFormStatus('Active');
                  setIsAddResellerModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-slate-950" />
                <span>প্রথম রিসেলার আইডি তৈরি করুন</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resellers
                .filter((r) => {
                  const q = resellerSearch.toLowerCase().trim();
                  const matchesSearch =
                    !q ||
                    (r.name || '').toLowerCase().includes(q) ||
                    (r.username || '').toLowerCase().includes(q) ||
                    (r.code || '').toLowerCase().includes(q) ||
                    (r.phone || '').includes(q) ||
                    (r.area || '').toLowerCase().includes(q);
                  const matchesStatus =
                    resellerStatusFilter === 'All' || r.status === resellerStatusFilter;
                  return matchesSearch && matchesStatus;
                })
                .map((r) => {
                  const assignedCustomersCount = customers.filter((c) => c.resellerId === r.id).length;
                  const isPassVisible = visiblePassResellerId === r.id;
                  const isCopied = copiedResellerId === r.id;

                  return (
                    <div
                      key={r.id}
                      className={`p-5 rounded-3xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                        r.status === 'Suspended'
                          ? 'bg-slate-900/60 border-rose-500/30 opacity-80'
                          : 'bg-gradient-to-b from-slate-900/90 to-[#0F172A]/90 border-slate-800 hover:border-emerald-500/40 shadow-xl'
                      }`}
                    >
                      <div className="space-y-3.5">
                        {/* Header: Name, Code & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-emerald-500/20">
                              {r.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-sm font-extrabold text-white leading-tight">
                                {r.name}
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                প্রোপাইটর: <span className="text-slate-300 font-semibold">{r.ownerName || r.name}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-mono text-[11px] font-black">
                              {r.code}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono ${
                              r.status === 'Active'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            }`}>
                              ● {r.status}
                            </span>
                          </div>
                        </div>

                        {/* Credentials Card (Username & Password with Copy button) */}
                        <div className="p-3 rounded-2xl bg-[#09101D] border border-slate-800/90 space-y-2">
                          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                            <span className="flex items-center gap-1 text-emerald-400">
                              <Lock className="w-3 h-3" />
                              লগইন ক্রেডেনশিয়াল
                            </span>
                            <button
                              onClick={() => handleCopyResellerCreds(r)}
                              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
                              title="কপি করুন"
                            >
                              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{isCopied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                              <span className="text-[10px] text-slate-500 block">ইউজারনেম</span>
                              <span className="text-cyan-300 font-bold font-mono truncate block">
                                @{r.username}
                              </span>
                            </div>

                            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
                              <div className="min-w-0">
                                <span className="text-[10px] text-slate-500 block">পাসওয়ার্ড</span>
                                <span className="text-amber-300 font-bold font-mono truncate block">
                                  {isPassVisible ? r.password : '••••••••'}
                                </span>
                              </div>
                              <button
                                onClick={() => setVisiblePassResellerId(isPassVisible ? null : r.id)}
                                className="text-slate-400 hover:text-white p-1"
                                title={isPassVisible ? "লুকান" : "দেখুন"}
                              >
                                {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Financials & Subscribers Grid */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-medium">ওয়ালেট ব্যালেন্স</span>
                            <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 block">
                              {ispProfile.currencySymbol}{r.balance.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-medium">কমিশন হার</span>
                            <span className="text-sm font-black text-cyan-300 font-mono mt-0.5 block">
                              {r.commissionRate || 15}%
                            </span>
                          </div>

                          <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-medium">গ্রাহক সংখ্যা</span>
                            <span className="text-sm font-black text-purple-300 font-mono mt-0.5 block">
                              {assignedCustomersCount} জন
                            </span>
                          </div>
                        </div>

                        {/* Contact details */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 px-1">
                          <span className="flex items-center gap-1 truncate">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            {r.phone || 'মোবাইল নেই'}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-cyan-400" />
                            {r.area || 'এলাকা অনির্ধারিত'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-1.5 flex-wrap">
                        {/* Top-up Button */}
                        <button
                          onClick={() => {
                            setRechargeTarget(r);
                            setRechargeAmountInput(5000);
                            setRechargeMethodInput('bKash');
                            setRechargeNotesInput('CEO TM Direct Top-Up');
                            setIsRechargeModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold text-[11px] border border-emerald-500/40 transition-all flex items-center gap-1 cursor-pointer"
                          title="ব্যালেন্স রিচার্জ"
                        >
                          <Wallet className="w-3 h-3" />
                          <span>রিচার্জ</span>
                        </button>

                        {/* Reset Password Button */}
                        <button
                          onClick={() => {
                            setResetResellerTarget(r);
                            setNewResellerPassInput('');
                            setIsResetResellerPassOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[11px] border border-amber-500/40 transition-all flex items-center gap-1 cursor-pointer"
                          title="পাসওয়ার্ড পরিবর্তন করুন"
                        >
                          <Key className="w-3 h-3" />
                          <span>পাসওয়ার্ড</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => {
                            setEditingReseller(r);
                            setResellerFormName(r.name);
                            setResellerFormOwner(r.ownerName || r.name);
                            setResellerFormUsername(r.username);
                            setResellerFormPassword(r.password);
                            setResellerFormPhone(r.phone);
                            setResellerFormEmail(r.email || '');
                            setResellerFormArea(r.area || '');
                            setResellerFormBalance(r.balance || 0);
                            setResellerFormCommissionRate(r.commissionRate || 15);
                            setResellerFormWholesaleRate(r.wholesaleRate || 350);
                            setResellerFormBillingType(r.billingType || 'prepaid');
                            setResellerFormStatus((r.status === 'Inactive' ? 'Suspended' : r.status) || 'Active');
                            setIsAddResellerModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                          title="তথ্য এডিট"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Status Toggle Button */}
                        <button
                          onClick={() => handleToggleResellerStatus(r)}
                          className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                            r.status === 'Active'
                              ? 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-800/40'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/40'
                          }`}
                          title={r.status === 'Active' ? 'স্থগিত করুন' : 'সক্রিয় করুন'}
                        >
                          {r.status === 'Active' ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeleteConfirmReseller(r)}
                          className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-rose-800/40 transition-colors cursor-pointer"
                          title="ডিলিট করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
            </div>
          )}

        </div>
      )}

      {/* TAB: ISP PROFILE, SUPPORT & BILL PAYMENT NUMBERS */}
      {activeTab === 'isp_profile' && (
        <div className="space-y-6">
          
          {/* Security Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-cyan-950/50 border border-amber-500/40 text-xs flex items-start gap-3.5 shadow-xl">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <span>CEO TM এক্সক্লুসিভ সেটিংস কন্ট্রোল</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                  CEO ONLY
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                এখানে কনফিগার করা ২৪/৭ কাস্টমার কেয়ার ও সাপোর্ট নম্বর, বিকাশ, নগদ ও রকেট মার্চেন্ট অ্যাকাউন্ট নম্বর এবং অফিসিয়াল ঠিকানা গ্রাহক পোর্টাল, মানি রসিদ ও বিল ইনভয়েসে স্বয়ংক্রিয়ভাবে প্রতিফলিত হবে। সাধারণ কোনো অ্যাডমিন এই নম্বর পরিবর্তন বা সম্পাদনা করতে পারবে না।
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveIspProfile} className="rounded-3xl p-5 sm:p-7 bg-slate-900/90 border border-slate-800 space-y-6 shadow-2xl backdrop-blur-sm">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 text-amber-400 border border-amber-500/30 shadow-md">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    ISP প্রোফাইল, সাপোর্ট ও বিল পেমেন্ট নম্বর সেটিংস
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    গ্রাহক পোর্টাল, ইনভয়েস, মানি রসিদ ও সাপোর্ট ডেস্কে প্রদর্শিত নম্বর ও তথ্যাবলী
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingIspProfile}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                {isSavingIspProfile ? 'সংরক্ষণ করা হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন (Save)'}
              </button>
            </div>

            {/* SECTION 1: ২৪/৭ কাস্টমার কেয়ার ও সাপোর্ট ডেস্ক নম্বরসমূহ */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-cyan-500/30 space-y-3.5">
              <div className="flex items-center gap-2 text-cyan-300">
                <Headphones className="w-4 h-4" />
                <h3 className="text-xs sm:text-sm font-bold text-white">২৪/৭ কাস্টমার কেয়ার ও সাপোর্ট ডেস্ক নম্বরসমূহ</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                গ্রাহক পোর্টালে সাপোর্ট ও অভিযোগ ট্যাবে এই নম্বরগুলো প্রদর্শিত হবে এবং গ্রাহক সরাসরি এক ক্লিকে কল করতে পারবে।
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-1 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
                    ২৪/৭ কাস্টমার কেয়ার / হেল্পডেস্ক নম্বর <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    placeholder="e.g. +880 1700-000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono text-sm sm:text-xs outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                    জরুরি হটলাইন নম্বর (Emergency Hotline)
                  </label>
                  <input
                    type="text"
                    value={emergencyHotline}
                    onChange={(e) => setEmergencyHotline(e.target.value)}
                    placeholder="e.g. 09612-000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono text-sm sm:text-xs outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    সাপোর্ট ইমেইল (Support Email)
                  </label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="support@isp.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm sm:text-xs outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: অফিসিয়াল বিল পরিশোধের নম্বরসমূহ (Payment Numbers) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-emerald-500/30 space-y-3.5">
              <div className="flex items-center gap-2 text-emerald-300">
                <CreditCard className="w-4 h-4" />
                <h3 className="text-xs sm:text-sm font-bold text-white">বিল পরিশোধের নম্বরসমূহ (Official Bill Payment Numbers)</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                গ্রাহক পোর্টালে বিল পরিশোধ ট্যাবে গ্রাহক এই বিকাশ, নগদ ও রকেট নম্বরে সেন্ড মানি বা পেমেন্ট করবে।
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-1 text-xs">
                <div>
                  <label className="block text-pink-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                    বিকাশ নম্বর (bKash Account / Merchant)
                  </label>
                  <input
                    type="text"
                    value={bkashMerchant}
                    onChange={(e) => setBkashMerchant(e.target.value)}
                    placeholder="e.g. 01700-000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-pink-500/40 bg-slate-900 text-white font-mono text-sm sm:text-xs outline-none focus:border-pink-400 transition-colors"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">খালি রাখলে মূল হেল্পডেস্ক ফোন নম্বর ব্যবহৃত হবে</span>
                </div>

                <div>
                  <label className="block text-orange-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                    নগদ নম্বর (Nagad Account / Merchant)
                  </label>
                  <input
                    type="text"
                    value={nagadMerchant}
                    onChange={(e) => setNagadMerchant(e.target.value)}
                    placeholder="e.g. 01700-000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-orange-500/40 bg-slate-900 text-white font-mono text-sm sm:text-xs outline-none focus:border-orange-400 transition-colors"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">খালি রাখলে মূল হেল্পডেস্ক ফোন নম্বর ব্যবহৃত হবে</span>
                </div>

                <div>
                  <label className="block text-purple-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                    রকেট নম্বর (Rocket Account / Merchant)
                  </label>
                  <input
                    type="text"
                    value={rocketMerchant}
                    onChange={(e) => setRocketMerchant(e.target.value)}
                    placeholder="e.g. 01700-000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-purple-500/40 bg-slate-900 text-white font-mono text-sm sm:text-xs outline-none focus:border-purple-400 transition-colors"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">খালি রাখলে মূল হেল্পডেস্ক ফোন নম্বর ব্যবহৃত হবে</span>
                </div>
              </div>
            </div>

            {/* SECTION 3: কোম্পানি পরিচিতি, কারেন্সি ও বিলিং নোটিশ */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3.5">
              <div className="flex items-center gap-2 text-slate-300">
                <Building className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">কোম্পানি পরিচিতি, কারেন্সি ও বিলিং নোটিশ</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-1 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Company / Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm sm:text-xs outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Brand Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm sm:text-xs outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Currency Symbol</label>
                    <input
                      type="text"
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono text-sm sm:text-xs outline-none focus:border-cyan-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Currency Code</label>
                    <input
                      type="text"
                      value={currencyCode}
                      onChange={(e) => setCurrencyCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono text-sm sm:text-xs outline-none focus:border-cyan-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-slate-300 font-semibold mb-1">Office Address (অফিস ঠিকানা)</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm sm:text-xs outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-slate-300 font-semibold mb-1">Customer Portal Notice / Billing Message (গ্রাহক পোর্টালে প্রদর্শিত নোটিশ)</label>
                  <textarea
                    rows={2}
                    value={noticeMessage}
                    onChange={(e) => setNoticeMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm sm:text-xs outline-none focus:border-cyan-400 transition-colors"
                    placeholder="প্রতি মাসের ১০ তারিখের মধ্যে আপনার বিল পরিশোধ করে নিরবচ্ছিন্ন সেবা উপভোগ করুন।"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: গ্রাহক দৃশ্যমানতা ও অ্যাক্সেস কন্ট্রোল (Portal Visibility & Restrictions) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-amber-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300">
                  <ShieldAlert className="w-4 h-4" />
                  <h3 className="text-xs sm:text-sm font-bold text-white">গ্রাহক এক্সেস ও পোর্টাল দৃশ্যমানতা কন্ট্রোল (Portal Visibility Control)</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                  গ্রাহকের কাছ থেকে গোপনীয়
                </span>
              </div>
              
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <p className="font-semibold text-amber-300 mb-1">গ্রাহক ভিউ নীতিমালা:</p>
                <p className="text-slate-400">
                  সাধারণ গ্রাহক এবং সাধারণ ভিজিটররা ডিফল্টভাবে কেবল <strong>কোম্পানির তথ্য ও প্যাকেজ</strong> এবং <strong>ইউজার লগইন</strong> দেখতে পারবে। নিচে থাকা অপশনগুলো বন্ধ রাখলে গ্রাহকের কাছ থেকে এগুলো সম্পূর্ণ গোপন (Hide) থাকবে। শুধুমাত্র CEO TM প্যানেল অথবা মাস্টার পাসকি দ্বারা অনুমোদিত স্টাফরাই এগুলো দেখতে ও ব্যবহার করতে পারবে।
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {/* Search Portal Toggle */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  showSearchPortalToPublic 
                    ? 'bg-cyan-950/30 border-cyan-500/50 text-white' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                      সার্চ পোর্টাল
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showSearchPortalToPublic}
                        onChange={(e) => setShowSearchPortalToPublic(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {showSearchPortalToPublic 
                      ? 'সার্চ পোর্টাল সাধারণ গ্রাহকের কাছে দৃশ্যমান।' 
                      : 'সার্চ পোর্টাল সাধারণ গ্রাহকের কাছে লুকানো (Hidden)। শুধুমাত্র অনুমোদিত স্টাফ দেখতে পাবে।'}
                  </p>
                </div>

                {/* Admin Login Toggle */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  showAdminLoginToPublic 
                    ? 'bg-blue-950/30 border-blue-500/50 text-white' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      এডমিন লগইন অপশন
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAdminLoginToPublic}
                        onChange={(e) => setShowAdminLoginToPublic(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {showAdminLoginToPublic 
                      ? 'এডমিন লগইন বাটন সাধারণ গ্রাহকের কাছে দৃশ্যমান।' 
                      : 'এডমিন লগইন বাটন সাধারণ গ্রাহকের কাছে লুকানো (Hidden)। শুধুমাত্র স্টাফ ডিভাইসে দৃশ্যমান।'}
                  </p>
                </div>

                {/* CEO Panel Toggle */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  showCeoPanelToPublic 
                    ? 'bg-amber-950/30 border-amber-500/50 text-white' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      CEO TM প্যানেল বাটন
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showCeoPanelToPublic}
                        onChange={(e) => setShowCeoPanelToPublic(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {showCeoPanelToPublic 
                      ? 'CEO TM বাটন সাধারণ গ্রাহকের কাছে দৃশ্যমান।' 
                      : 'CEO TM বাটন গ্রাহকের কাছে লুকানো (Hidden)। লোগোতে ৩ বার ক্লিক বা Ctrl+Shift+A দিয়ে খোলা যাবে।'}
                  </p>
                </div>
              </div>

              {/* Master Staff Key notice */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-slate-300">
                    স্টাফ ডিভাইস আনলক পাসকি: <strong className="font-mono text-amber-400 px-2 py-0.5 bg-slate-950 rounded border border-slate-700">TM5467</strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  লোগোতে ৩ বার ক্লিক করে এই পাসকি দিলে ঐ ডিভাইসে সকল লুকানো অপশন আনলক হবে।
                </span>
              </div>
            </div>

            {/* LIVE PREVIEW CARD */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> লাইভ প্রিভিউ (গ্রাহক পোর্টালে যেভাবে প্রদর্শিত হবে):
                </span>
                <span className="text-slate-500 font-mono text-[10px]">Realtime Customer Portal Sync</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-white text-sm">{companyName || 'Tamim Broadband'}</div>
                  <div className="text-[11px] text-slate-400">{tagline || 'Ultra Fast Fiber Internet'} • {address}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-pink-950/70 text-pink-300 border border-pink-500/40 text-[11px] font-mono font-bold">
                    bKash: {bkashMerchant || supportPhone || 'Not Set'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-orange-950/70 text-orange-300 border border-orange-500/40 text-[11px] font-mono font-bold">
                    Nagad: {nagadMerchant || supportPhone || 'Not Set'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-purple-950/70 text-purple-300 border border-purple-500/40 text-[11px] font-mono font-bold">
                    Rocket: {rocketMerchant || supportPhone || 'Not Set'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold">
                    Help: {supportPhone || 'Not Set'}
                  </span>
                </div>
              </div>
              {noticeMessage && (
                <div className="text-[11px] text-amber-300/90 bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/20">
                  📢 নোটিশ: {noticeMessage}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="submit"
                disabled={isSavingIspProfile}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                {isSavingIspProfile ? 'সংরক্ষণ করা হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন (Save All Settings)'}
              </button>
            </div>

          </form>

        </div>
      )}

      {/* TAB 3: WHATSAPP BILLING AUTOMATION & GATEWAY (CEO EXCLUSIVE) */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header Banner */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-md">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>WhatsApp বিল নোটিফিকেশন ও অটোমেশন কন্ট্রোল</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold border border-emerald-500/40">
                      CEO ONLY
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    গ্রাহকদের বিল শেষ হলে বা বকেয়া থাকলে আপনার নিজস্ব WhatsApp আইডি থেকে স্বয়ংক্রিয় নোটিফিকেশন মেসেজ চলে যাবে।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    (waProvider === 'ultramsg' && waInstanceId && waApiToken) ||
                    (waProvider === 'green_api' && waInstanceId && waApiToken) ||
                    waProvider === 'direct'
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-amber-400'
                  }`} />
                  <span className="text-slate-300">
                    গেটওয়ে: <b className="text-emerald-400 uppercase">{waProvider}</b>
                  </span>
                </div>
              </div>
            </div>

            {/* Step-by-Step Guidance Box */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/20 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-emerald-400 flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                <span>কীভাবে আপনার নিজস্ব WhatsApp নম্বর লিঙ্ক করবেন? (Easy 3 Steps)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px] text-slate-300">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="text-amber-400 font-bold font-mono">ধাপ ১: গেটওয়ে নির্বাচন</div>
                  <p className="text-slate-400 leading-relaxed">
                    UltraMsg.com এ একটি ফ্রি ট্রায়াল অ্যাকাউন্ট খুলুন বা আপনার নিজস্ব ক্লাউড গেটওয়ে নির্বাচন করুন।
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="text-emerald-400 font-bold font-mono">ধাপ ২: QR কোড স্ক্যান</div>
                  <p className="text-slate-400 leading-relaxed">
                    আপনার মোবাইলের WhatsApp অ্যাপের <b>Linked Devices &gt; Link a Device</b> দিয়ে গেটওয়ের QR কোড স্ক্যান করুন।
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="text-cyan-400 font-bold font-mono">ধাপ ৩: Instance ID ও Token সেভ</div>
                  <p className="text-slate-400 leading-relaxed">
                    ড্যাশবোর্ড থেকে প্রাপ্ত Instance ID এবং Token নিচে বসিয়ে সেভ করুন। আর কোনো কনফিগ ছাড়াই কাজ শুরু হবে!
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 italic pt-1">
                * টিপস: আপনি যদি কোনো গেটওয়ে ব্যবহার না করতে চান, তবে <b>Direct WhatsApp</b> সিলেক্ট করুন। এতে সম্পূর্ণ ফ্রিতে সরাসরি ব্রাউজার বা অ্যাপের মাধ্যমে ১-ক্লিকে নোটিশ পাঠানো যাবে।
              </div>
            </div>
          </div>

          {/* Quick Stats on Due Customers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">মেয়াদ শেষ / বকেয়া গ্রাহক</div>
                <div className="text-2xl font-black text-rose-400 font-mono mt-1">
                  {dueCustomers.length} জন
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">অ্যালার্ট পাওয়ার উপযুক্ত</div>
              </div>
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">মোট বকেয়া বিলের পরিমাণ</div>
                <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                  {ispProfile.currencySymbol}
                  {dueCustomers.reduce((sum, c) => sum + (c.dueAmount > 0 ? c.dueAmount : c.monthlyBill), 0)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">আদায়যোগ্য মাসিক বিল</div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">অটোমেটিক নোটিফিকেশন</div>
                <div className="text-lg font-bold text-white mt-1 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${waAutoSend ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                  {waAutoSend ? (
                    <span className="text-emerald-400">সক্রিয় (Active)</span>
                  ) : (
                    <span className="text-slate-400">ম্যানুয়াল মোড</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {waAutoSend ? 'বিল শেষ হলে অটো অ্যালার্ট যাবে' : 'প্রয়োজনে বাল্ক মেসেজ পাঠান'}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Radio className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Form: Settings & Credentials */}
          <form onSubmit={handleSaveWhatsAppSettings} className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp গেটওয়ে ও ক্রেডেনশিয়াল কনফিগারেশন</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  এখানে আপনার WhatsApp API এর তথ্য বা লিঙ্ক করা নম্বর সেট করুন
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={waEnabled}
                  onChange={(e) => setWaEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className="ml-2 text-xs font-bold text-slate-300">
                  {waEnabled ? 'সিস্টেম সক্রিয়' : 'নিষ্ক্রিয়'}
                </span>
              </label>
            </div>

            {/* Provider Cards */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">গেটওয়ে প্রোভাইডার নির্বাচন করুন</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* UltraMsg */}
                <button
                  type="button"
                  onClick={() => setWaProvider('ultramsg')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    waProvider === 'ultramsg'
                      ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-400">UltraMsg (জনপ্রিয়)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">QR লিঙ্ক</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    আপনার পার্সোনাল WhatsApp QR স্ক্যান করে স্বয়ংক্রিয় মেসেজ পাঠান।
                  </p>
                </button>

                {/* Direct WhatsApp */}
                <button
                  type="button"
                  onClick={() => setWaProvider('direct')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    waProvider === 'direct'
                      ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-teal-300">Direct WhatsApp</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">ফ্রি</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    কোনো API বা টোকেন ছাড়া সরাসরি ব্রাউজার বা অ্যাপ দিয়ে ওয়ান-ক্লিক।
                  </p>
                </button>

                {/* Green API */}
                <button
                  type="button"
                  onClick={() => setWaProvider('green_api')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    waProvider === 'green_api'
                      ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-cyan-400">Green API</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">API</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Green-API ক্লাউড গেটওয়ে দিয়ে নির্ভরযোগ্য মেসেজ ডেলিভারি।
                  </p>
                </button>

                {/* Custom Webhook */}
                <button
                  type="button"
                  onClick={() => setWaProvider('custom_webhook')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    waProvider === 'custom_webhook'
                      ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-400">Custom Webhook</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">Node/Baileys</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    আপনার নিজস্ব কাস্টম Node.js বা Python বটের HTTP Webhook লিঙ্ক।
                  </p>
                </button>

              </div>
            </div>

            {/* Provider Input Fields */}
            {(waProvider === 'ultramsg' || waProvider === 'green_api') && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Instance ID</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Required</span>
                  </label>
                  <input
                    type="text"
                    value={waInstanceId}
                    onChange={(e) => setWaInstanceId(e.target.value)}
                    placeholder={waProvider === 'ultramsg' ? 'e.g. instance12345' : 'e.g. 1101823456'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>API Token / Secret Key</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Required</span>
                  </label>
                  <input
                    type="password"
                    value={waApiToken}
                    onChange={(e) => setWaApiToken(e.target.value)}
                    placeholder="আপনার গোপন API টোকেন পেস্ট করুন"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>প্রেরক WhatsApp নম্বর (Sender Phone)</span>
                    <span className="text-[10px] text-slate-500 font-mono">ঐচ্ছিক</span>
                  </label>
                  <input
                    type="text"
                    value={waSenderPhone}
                    onChange={(e) => setWaSenderPhone(e.target.value)}
                    placeholder="e.g. 01700-000000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {waProvider === 'custom_webhook' && (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Custom Webhook POST URL</span>
                  <span className="text-[10px] text-purple-400 font-mono">HTTP POST JSON</span>
                </label>
                <input
                  type="url"
                  value={waWebhookUrl}
                  onChange={(e) => setWaWebhookUrl(e.target.value)}
                  placeholder="https://your-bot-server.com/api/send-wa"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            )}

            {waProvider === 'direct' && (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-3 text-xs text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <b>Direct WhatsApp মোড সক্রিয়:</b> কোনো API কী বা খরচের প্রয়োজন নেই। ব্রাউজার বা আপনার মোবাইলের WhatsApp অ্যাপের মাধ্যমে ওয়ান-ক্লিকে প্রতিটি গ্রাহকের কাছে কাস্টমাইজড বিল নোটিশ চলে যাবে।
                </div>
              </div>
            )}

            {/* Automation Timing Controls */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>বিল শেষ হলে স্বয়ংক্রিয় নোটিফিকেশন টাইমিং</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    গ্রাহকের কোন সময়ে মেসেজটি যাবে তা নির্বাচন করুন
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waAutoSend}
                      onChange={(e) => setWaAutoSend(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    <span className="ml-2 text-xs font-bold text-slate-300">
                      অটো-নোটিফিকেশন সক্রিয়
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                {[
                  { id: 'always_if_due', label: 'সকল বকেয়া বা মেয়াদোত্তীর্ণ', desc: 'যে গ্রাহকের বিল বাকি আছে' },
                  { id: 'on_due_date', label: 'বিলের শেষ তারিখের দিনে', desc: 'মেয়াদ শেষ হওয়ার ঠিক সেই দিনে' },
                  { id: '1_day_before', label: 'মেয়াদ শেষ হওয়ার ১ দিন পূর্বে', desc: 'আগাম সতর্কবার্তা (১ দিন আগে)' },
                  { id: '3_days_before', label: 'মেয়াদ শেষ হওয়ার ৩ দিন পূর্বে', desc: '৩ দিন পূর্বে রিমাইন্ডার' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setWaTiming(item.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      waTiming === item.id
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Template Editor & Live Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Template Textarea & Variables */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span>বাংলা মেসেজ টেমপ্লেট</span>
                    <span className="text-[10px] text-emerald-400 font-mono">(Customizable)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setWaTemplate(DEFAULT_WHATSAPP_TEMPLATE)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    ডিফল্ট টেমপ্লেট রিসেট
                  </button>
                </div>

                {/* Variable Chips to Insert */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: '{name}', label: 'গ্রাহকের নাম' },
                    { tag: '{bill}', label: 'বিল টাকা' },
                    { tag: '{package}', label: 'প্যাকেজ' },
                    { tag: '{expiry_date}', label: 'মেয়াদ তারিখ' },
                    { tag: '{bkash}', label: 'বিকাশ নম্বর' },
                    { tag: '{nagad}', label: 'নগদ নম্বর' },
                    { tag: '{rocket}', label: 'রকেট নম্বর' },
                    { tag: '{helpline}', label: 'হটলাইন' },
                    { tag: '{uid}', label: 'কাস্টমার আইডি' },
                  ].map((chip) => (
                    <button
                      key={chip.tag}
                      type="button"
                      onClick={() => setWaTemplate((prev) => prev + ' ' + chip.tag)}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-mono border border-slate-700 transition-colors"
                      title={chip.label}
                    >
                      + {chip.tag}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={9}
                  value={waTemplate}
                  onChange={(e) => setWaTemplate(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs font-sans leading-relaxed outline-none focus:border-emerald-500 transition-colors resize-none shadow-inner"
                  placeholder="মেসেজ টেমপ্লেট লিখুন..."
                />
              </div>

              {/* WhatsApp Live Preview Simulation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span>WhatsApp মেসেজ লাইভ প্রিভিউ</span>
                    <span className="text-[10px] text-slate-500 font-mono">(Sample Customer)</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    গ্রাহক যেমন দেখবে
                  </span>
                </div>

                {/* Simulated Phone Screen */}
                <div className="p-4 rounded-2xl bg-[#0b141a] border border-slate-800 shadow-xl min-h-[220px] relative overflow-hidden flex flex-col justify-between">
                  {/* WhatsApp chat bubble */}
                  <div className="max-w-[92%] self-start rounded-2xl rounded-tl-none p-3.5 bg-[#005c4b] text-white text-xs leading-relaxed shadow-md space-y-1">
                    <div className="whitespace-pre-wrap font-sans text-slate-100 text-[11.5px]">
                      {compileBillingMessage(
                        {
                          id: 'preview',
                          uid: 'CUST-1002',
                          name: 'মোঃ তানভীর হাসান',
                          mobile: '01711-223344',
                          address: 'বাড়ি #১২, রোড #৪',
                          area: 'Zone A',
                          packageName: 'Standard Turbo (20 Mbps)',
                          speed: '20 Mbps',
                          monthlyBill: 500,
                          connectionType: 'Fiber (FTTH)',
                          monthlyFee: 500,
                          dueAmount: 500,
                          nextPaymentDate: '2026-03-10',
                          paymentStatus: 'Due',
                          status: 'Due',
                          connectionDate: '2026-01-01',
                          installationDate: '2026-01-01',
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        },
                        ispProfile,
                        waTemplate
                      )}
                    </div>
                    <div className="text-[9px] text-emerald-200/70 text-right font-mono pt-1">
                      10:45 AM • Delivered ✓✓
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 pt-2 text-center border-t border-slate-800/80">
                    💡 বাস্তব মেসেজে স্বয়ংক্রিয়ভাবে সংশ্লিষ্ট গ্রাহকের নাম, বকেয়া টাকা ও শেষ তারিখ বসে যাবে
                  </div>
                </div>
              </div>

            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="submit"
                disabled={isSavingWaSettings}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                {isSavingWaSettings ? 'সংরক্ষণ করা হচ্ছে...' : 'WhatsApp সেটিংস সংরক্ষণ করুন (Save WhatsApp Settings)'}
              </button>
            </div>

          </form>

          {/* Test WhatsApp Message Sender */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-cyan-400" />
                  <span>টেস্ট WhatsApp মেসেজ পাঠান (Send Test Alert)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  সেটিংস ঠিকঠাক কাজ করছে কিনা যাচাই করতে আপনার নিজের WhatsApp নম্বরে একটি টেস্ট মেসেজ পাঠান
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Smartphone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="আপনার নিজস্ব WhatsApp মোবাইল নম্বর (e.g. 01700-000000)"
                  className="w-full py-2.5 pl-10 pr-4 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={isSendingTest || !testPhone.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all disabled:opacity-50 min-h-[42px] cursor-pointer"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>পাঠানো হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>টেস্ট মেসেজ পাঠান</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Due Customers Live List & Bulk Send */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-400" />
                  <span>মেয়াদ শেষ হওয়া / বকেয়া গ্রাহকদের তালিকা ({dueCustomers.length} জন)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  নিচের গ্রাহকদের বিল পরিশোধের তারিখ পার হয়ে গেছে বা বকেয়া রয়েছে। এখান থেকে এক ক্লিকে সবাইকে মেসেজ পাঠাতে পারবেন।
                </p>
              </div>

              <button
                type="button"
                onClick={handleBulkSendAlerts}
                disabled={isSendingBulk || dueCustomers.length === 0}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer min-h-[42px]"
              >
                {isSendingBulk ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>পাঠানো হচ্ছে ({bulkProgress.current}/{bulkProgress.total})...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>এক ক্লিকে সবাইকে WhatsApp মেসেজ পাঠান ({dueCustomers.length})</span>
                  </>
                )}
              </button>
            </div>

            {/* Bulk Progress Bar if Active */}
            {isSendingBulk && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2">
                <div className="flex justify-between text-xs text-slate-300 font-mono">
                  <span>অগ্রগতি: {bulkProgress.current} / {bulkProgress.total}</span>
                  <span className="text-emerald-400 font-bold">{bulkProgress.currentCustomer}</span>
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
                  <span className="text-emerald-400">সফল: {bulkProgress.success}</span>
                  <span className="text-rose-400">ব্যর্থ: {bulkProgress.fail}</span>
                </div>
              </div>
            )}

            {/* Due Customers Table */}
            {dueCustomers.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950/50 border border-slate-800 text-slate-400 text-xs space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <div className="font-bold text-slate-200">কোনো বকেয়া বা মেয়াদোত্তীর্ণ গ্রাহক নেই!</div>
                <div>সকল গ্রাহকের বিল পরিশোধিত রয়েছে।</div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">গ্রাহকের নাম ও আইডি</th>
                      <th className="px-4 py-3">মোবাইল নম্বর</th>
                      <th className="px-4 py-3">প্যাকেজ</th>
                      <th className="px-4 py-3">বিল / বকেয়া</th>
                      <th className="px-4 py-3">মেয়াদ শেষ তারিখ</th>
                      <th className="px-4 py-3 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-sans">
                    {dueCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{cust.name}</div>
                          <div className="text-[10px] text-cyan-400 font-mono">{cust.uid}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-emerald-400 font-medium">
                          {cust.mobile}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {cust.packageName}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-rose-400">
                          {ispProfile.currencySymbol}
                          {cust.dueAmount > 0 ? cust.dueAmount : cust.monthlyBill}
                        </td>
                        <td className="px-4 py-3 font-mono text-amber-300 font-bold text-xs">
                          {cust.nextPaymentDate || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await dispatchWhatsAppAlert(cust, ispProfile, waTemplate);
                              refreshWaLogs();
                              if (res.success) {
                                addToast('success', 'মেসেজ পাঠানো হয়েছে', res.message);
                              } else {
                                addToast('error', 'ব্যর্থ হয়েছে', res.message);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>মেসেজ পাঠান</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* WhatsApp Alert Delivery Logs Table */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp মেসেজ ডেলিভারি হিস্ট্রি ({waLogs.length})</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  সম্প্রতি পাঠানো মেসেজসমূহের সম্পূর্ণ ইতিহাস ও স্ট্যাটাস
                </p>
              </div>

              <button
                type="button"
                onClick={refreshWaLogs}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>রিফ্রেশ</span>
              </button>
            </div>

            {waLogs.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-950/50 border border-slate-800 text-slate-500 text-xs">
                এখনো কোনো WhatsApp নোটিফিকেশন পাঠানো হয়নি।
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 max-h-[280px] overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">সময়</th>
                      <th className="px-4 py-3">গ্রাহক</th>
                      <th className="px-4 py-3">মোবাইল</th>
                      <th className="px-4 py-3">গেটওয়ে</th>
                      <th className="px-4 py-3">স্ট্যাটাস</th>
                      <th className="px-4 py-3">মেসেজ সারসংক্ষেপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-sans">
                    {waLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-white">{log.customerName}</div>
                          <div className="text-[10px] text-cyan-400 font-mono">{log.customerUid}</div>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-emerald-400">
                          {log.phone}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300 font-mono text-[11px]">
                          {log.gateway}
                        </td>
                        <td className="px-4 py-2.5">
                          {log.status === 'sent' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 font-mono text-[10px] font-bold border border-rose-500/30">
                              <AlertCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 text-[11px] max-w-xs truncate">
                          {log.messageSnippet}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: AUDIT LOGS - WHO LOGGED IN */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="অ্যাডমিনের নাম, ইউজারনেম, রোল অথবা IP দিয়ে ফিল্টার করুন..."
                className="w-full py-2 pl-9 pr-4 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">স্ট্যাটাস:</span>
                <select
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value as any)}
                  className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ALL">সকল স্ট্যাটাস (All)</option>
                  <option value="Success">Success (সফল)</option>
                  <option value="Failed">Failed (ব্যর্থ)</option>
                  <option value="Warning">Warning (সতর্কতা)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={exportLogsAsCSV}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="CSV ফরম্যাটে অডিট লগ ডাউনলোড করুন"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>CSV এক্সপোর্ট</span>
              </button>

              {auditLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsClearLogsModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="সকল অডিট লগ ডাটাবেস ও স্টোরেজ থেকে সম্পূর্ণ মুছুন"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>সকল লগ মুছুন</span>
                </button>
              )}
            </div>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">তারিখ ও সময়</th>
                    <th className="py-3.5 px-4">অ্যাডমিন নাম ও ইউজার</th>
                    <th className="py-3.5 px-4">রোল / পদবী</th>
                    <th className="py-3.5 px-4">অ্যাকশন (Action)</th>
                    <th className="py-3.5 px-4">স্ট্যাটাস</th>
                    <th className="py-3.5 px-4">ডিভাইস / প্ল্যাটফর্ম</th>
                    <th className="py-3.5 px-4">IP অ্যাড্রেস</th>
                    <th className="py-3.5 px-4">বিস্তারিত তথ্য</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        কোনো অডিট লগ রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-300 text-[11px] whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{log.adminName}</div>
                          <div className="text-[10px] font-mono text-cyan-400">@{log.username}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                            {log.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-200">
                          {log.action}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            log.status === 'Success'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : log.status === 'Failed'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                          {log.device}
                        </td>
                        <td className="py-3 px-4 font-mono text-cyan-300 text-[11px] whitespace-nowrap">
                          {log.ipAddress}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-[11px] max-w-xs">
                          {log.details || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MODAL 1: RESET PASSWORD FOR ADMIN */}
      {resetModalAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-amber-500/40 p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Key className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">পাসওয়ার্ড রিসেট করুন</h3>
              </div>
              <button
                onClick={() => setResetModalAdmin(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">টার্গেট অ্যাডমিন:</div>
              <div className="font-bold text-white text-sm">{resetModalAdmin.name} (@{resetModalAdmin.username})</div>
              <div className="text-[11px] text-cyan-400">বর্তমান পাসওয়ার্ড: {resetModalAdmin.password}</div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-200">
                নতুন পাসওয়ার্ড লিখুন (New Password)
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="নতুন পাসওয়ার্ড দিন..."
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl bg-slate-950 border border-amber-500/40 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={generateStrongPassword}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" /> স্ট্রং র‍্যান্ডম পাসওয়ার্ড তৈরি করুন
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] leading-relaxed">
              ⚠️ <strong>সতর্কতা:</strong> পাসওয়ার্ড সেভ করার সাথে সাথে এই অ্যাডমিন সহ <strong>সকল সক্রিয় অ্যাডমিন সেশন অবিলম্বে স্বয়ংক্রিয়ভাবে লগআউট</strong> হয়ে যাবে।
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setResetModalAdmin(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
              >
                বাতিল
              </button>
              <button
                onClick={executeResetPassword}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20"
              >
                পাসওয়ার্ড নিশ্চিত ও সব লগআউট
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW ADMIN */}
      {isAddAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-cyan-500/40 p-6 shadow-2xl space-y-4 my-8">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">নতুন অ্যাডমিন তৈরি করুন (Add Admin)</h3>
              </div>
              <button
                onClick={() => setIsAddAdminOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdminSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-200 mb-1">অ্যাডমিনের পূর্ণ নাম *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="যেমন: মোঃ তামিম ইসলাম"
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-200 mb-1">লগইন ইউজারনেম *</label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="যেমন: billing_tamim"
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-200 mb-1">পৃথক পাসওয়ার্ড (Password) *</label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="যেমন: pass@1234"
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-200 mb-1">অ্যাডমিন পদবী / রোল</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Super Admin">Super Admin (পূর্ণ অ্যাক্সেস)</option>
                    <option value="Billing Admin">Billing Admin (বিলিং ও পেমেন্ট)</option>
                    <option value="Network Admin">Network Admin (নেটওয়ার্ক ও কনফিগারেশন)</option>
                    <option value="Support Admin">Support Admin (গ্রাহক সাপোর্ট)</option>
                    <option value="Manager">Branch Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-200 mb-1">ইমেইল অ্যাড্রেস</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="admin@isp.net"
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-200 mb-1.5">পারমিশন সিলেক্ট করুন:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  {['all', 'customers', 'billing', 'payments', 'packages', 'tickets', 'settings', 'logs'].map((perm) => (
                    <label key={perm} className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={formPermissions.includes(perm)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormPermissions([...formPermissions, perm]);
                          } else {
                            setFormPermissions(formPermissions.filter(p => p !== perm));
                          }
                        }}
                        className="rounded text-cyan-500"
                      />
                      <span className="capitalize font-mono text-[11px]">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddAdminOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-md shadow-cyan-500/20"
                >
                  অ্যাডমিন সংরক্ষণ করুন
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 3: EDIT ADMIN */}
      {editModalAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-purple-500/40 p-6 shadow-2xl space-y-4 my-8">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Edit3 className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">অ্যাডমিন তথ্য এডিট করুন</h3>
              </div>
              <button
                onClick={() => setEditModalAdmin(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditAdminSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-200 mb-1">অ্যাডমিনের পূর্ণ নাম</label>
                <input
                  type="text"
                  required
                  value={editModalAdmin.name}
                  onChange={(e) => setEditModalAdmin({ ...editModalAdmin, name: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-200 mb-1">লগইন ইউজারনেম</label>
                  <input
                    type="text"
                    required
                    value={editModalAdmin.username}
                    onChange={(e) => setEditModalAdmin({ ...editModalAdmin, username: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-200 mb-1">পাসওয়ার্ড (Password)</label>
                  <input
                    type="text"
                    required
                    value={editModalAdmin.password}
                    onChange={(e) => setEditModalAdmin({ ...editModalAdmin, password: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-200 mb-1">অ্যাডমিন পদবী / রোল</label>
                  <select
                    value={editModalAdmin.role}
                    onChange={(e) => setEditModalAdmin({ ...editModalAdmin, role: e.target.value as any })}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Billing Admin">Billing Admin</option>
                    <option value="Network Admin">Network Admin</option>
                    <option value="Support Admin">Support Admin</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-200 mb-1">স্ট্যাটাস (Status)</label>
                  <select
                    value={editModalAdmin.status}
                    onChange={(e) => setEditModalAdmin({ ...editModalAdmin, status: e.target.value as any })}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Active">Active (সক্রিয়)</option>
                    <option value="Suspended">Suspended (স্থগিত)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalAdmin(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md shadow-purple-500/20"
                >
                  পরিবর্তন সংরক্ষণ করুন
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 4: DELETE ADMIN CONFIRMATION */}
      {deleteConfirmAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-rose-500/50 p-6 shadow-2xl shadow-rose-950/50 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">অ্যাডমিন ডিলিট নিশ্চিতকরণ</h3>
              </div>
              <button
                onClick={() => setDeleteConfirmAdmin(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                আপনি কি নিশ্চিত যে নিচের অ্যাডমিন অ্যাকাউন্টটি সিস্টেম থেকে সম্পূর্ণভাবে মুছে ফেলতে চান?
              </p>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <div className="text-slate-400">টার্গেট অ্যাডমিন:</div>
                <div className="text-white font-bold text-sm">{deleteConfirmAdmin.name}</div>
                <div className="flex items-center justify-between font-mono text-[11px] pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">ইউজারনেম: <strong className="text-cyan-400">@{deleteConfirmAdmin.username}</strong></span>
                  <span className="text-slate-400">পদবী: <strong className="text-amber-300">{deleteConfirmAdmin.role}</strong></span>
                </div>
              </div>

              {deleteConfirmAdmin.username === 'TAMIM' && adminAccounts.length <= 1 ? (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>সতর্কতা: সিস্টেমে আর কোনো অ্যাডমিন নেই। প্রধান সুপার অ্যাডমিন ডিলিট করা যাবে না।</span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] leading-relaxed">
                  ⚠️ <strong>ফলাফল:</strong> এই অ্যাকাউন্টটি স্থায়ীভাবে ডিলিট হয়ে যাবে এবং এই অ্যাডমিনের সকল অ্যাক্টিভ লগইন সেশন অবিলম্বে বন্ধ হয়ে যাবে।
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmAdmin(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={deleteConfirmAdmin.username === 'TAMIM' && adminAccounts.length <= 1}
                onClick={executeDeleteAdmin}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  deleteConfirmAdmin.username === 'TAMIM' && adminAccounts.length <= 1
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 cursor-pointer'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>হ্যাঁ, ডিলিট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: FORCE LOGOUT ALL ADMINS CONFIRMATION */}
      {isForceLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-rose-500/50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">জরুরী ফোর্স লগআউট</h3>
              </div>
              <button
                onClick={() => setIsForceLogoutModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                আপনি কি নিশ্চিত যে এই মুহূর্তে সিস্টেমের সকল সক্রিয় অ্যাডমিনকে অবিলম্বে লগআউট (Force Logout) করতে চান?
              </p>
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] leading-relaxed">
                🚨 এটি কার্যকর করার সাথে সাথে সব কম্পিউটার ও মোবাইল থেকে যেসকল অ্যাডমিন কাজ করছিলেন তাদের সেশন সাথে সাথে বাতিল হয়ে যাবে।
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsForceLogoutModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={executeGlobalForceLogout}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>সব অ্যাডমিন লগআউট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: CLEAR AUDIT LOGS CONFIRMATION */}
      {isClearLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">সকল অডিট লগ ডিলিট করুন</h3>
              </div>
              <button
                onClick={() => setIsClearLogsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              আপনি কি নিশ্চিত যে সকল সংরক্ষিত অ্যাডমিন লগইন ও সিকিউরিটি অডিট রেকর্ড স্থায়ীভাবে মুছে ফেলতে চান? <span className="text-rose-400 font-semibold">ডিলিট বাটনে ক্লিক করলে ডাটাবেস ও স্টোরেজ থেকে সব রেকর্ড সম্পূর্ণ মুছে যাবে।</span>
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isClearingLogs}
                onClick={() => setIsClearLogsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isClearingLogs}
                onClick={executeClearAuditLogs}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-900/30 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isClearingLogs ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, সব ডিলিট করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: ADD NEW SEARCH OPERATOR (CEO EXCLUSIVE) */}
      {isAddOperatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-cyan-500/40 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-cyan-400">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">নতুন সার্চ অপারেটর তৈরি করুন</h3>
              </div>
              <button
                onClick={() => setIsAddOperatorOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSearchOperator} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  অপারেটরের পুরো নাম <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={opFormName}
                  onChange={(e) => setOpFormName(e.target.value)}
                  placeholder="যেমন: মোঃ সাব্বির আহমেদ"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ইউজারনেম (লগইন আইডি) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={opFormUsername}
                    onChange={(e) => setOpFormUsername(e.target.value)}
                    placeholder="e.g. search_op1"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    লগইন পাসওয়ার্ড <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={opFormPassword}
                    onChange={(e) => setOpFormPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড দিন..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    মোবাইল নম্বর
                  </label>
                  <input
                    type="text"
                    value={opFormMobile}
                    onChange={(e) => setOpFormMobile(e.target.value)}
                    placeholder="017..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ইমেইল (ঐচ্ছিক)
                  </label>
                  <input
                    type="email"
                    value={opFormEmail}
                    onChange={(e) => setOpFormEmail(e.target.value)}
                    placeholder="op@isp.net"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Authorized Company Permission Selection */}
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-cyan-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    <span>কোন কোন কোম্পানির গ্রাহক ডেটা দেখতে পারবে? *</span>
                  </div>
                  <span className="text-[10px] text-amber-300 font-semibold font-mono">
                    {opFormAllowedCompanies.includes('ALL') ? 'সকল কোম্পানি অ্যাক্সেস' : `${opFormAllowedCompanies.length} টি নির্বাচিত`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  নির্ধারিত কোম্পানি ছাড়া অপারেটর সার্চ পোর্টালে অন্য কোনো কোম্পানির গ্রাহক তথ্য দেখতে পারবে না।
                </p>

                {/* Option 1: ALL Companies */}
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs text-purple-200 cursor-pointer font-bold hover:bg-purple-950/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={opFormAllowedCompanies.includes('ALL')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setOpFormAllowedCompanies(['ALL']);
                      } else {
                        setOpFormAllowedCompanies(['central']);
                      }
                    }}
                    className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-purple-400"
                  />
                  <span>🌐 সকল কোম্পানি অ্যাক্সেস (সেন্ট্রাল + সব রিসেলার)</span>
                </label>

                {!opFormAllowedCompanies.includes('ALL') && (
                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    {/* Central ISP Company Checkbox */}
                    <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs text-white cursor-pointer hover:bg-slate-850 transition-colors">
                      <input
                        type="checkbox"
                        checked={opFormAllowedCompanies.includes('central')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setOpFormAllowedCompanies([...opFormAllowedCompanies, 'central']);
                          } else {
                            setOpFormAllowedCompanies(opFormAllowedCompanies.filter((c) => c !== 'central'));
                          }
                        }}
                        className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
                      />
                      <span className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-blue-900/60 text-[10px] text-blue-300 font-mono">সেন্ট্রাল ISP</span>
                        <span className="font-semibold">{ispProfile.companyName}</span>
                      </span>
                    </label>

                    {/* Reseller Checkboxes */}
                    {resellers.length > 0 && (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        <span className="text-[10px] text-slate-400 font-bold block pt-1">রিসেলার কোম্পানি নির্বাচন:</span>
                        {resellers.map((r) => {
                          const isChecked = opFormAllowedCompanies.includes(r.id) || opFormAllowedCompanies.includes(r.code);
                          return (
                            <label
                              key={r.id}
                              className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setOpFormAllowedCompanies([...opFormAllowedCompanies, r.id]);
                                  } else {
                                    setOpFormAllowedCompanies(opFormAllowedCompanies.filter((c) => c !== r.id && c !== r.code));
                                  }
                                }}
                                className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700"
                              />
                              <span className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-[10px] text-emerald-300 font-mono font-bold">[{r.code}]</span>
                                <span className="font-medium text-white">{r.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">({r.phone || r.username})</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-cyan-300 block">অন্যান্য পারমিশন লেভেল:</span>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={opFormCanFinancials}
                    onChange={(e) => setOpFormCanFinancials(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
                  />
                  <span>গ্রাহকদের বিল ও বকেয়ার পরিমাণ দেখতে পারবে</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={opFormCanExport}
                    onChange={(e) => setOpFormCanExport(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
                  />
                  <span>সার্চ রেজাল্ট ডাউনলোড/এক্সপোর্ট করতে পারবে</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  নোট / বিবরণ (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={opFormNotes}
                  onChange={(e) => setOpFormNotes(e.target.value)}
                  placeholder="যেমন: ধানমন্ডি ব্রাঞ্চ ফ্রন্টডেস্ক"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOperatorOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all"
                >
                  অপারেটর সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: RESET OPERATOR PASSWORD (CEO EXCLUSIVE) */}
      {resetPassOperator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-amber-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Key className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">পাসওয়ার্ড রিসেট করুন</h3>
              </div>
              <button
                onClick={() => setResetPassOperator(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              অপারেটর: <strong className="text-white font-bold">{resetPassOperator.name}</strong> (@{resetPassOperator.username})
            </p>

            <form onSubmit={handleExecuteResetOperatorPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-amber-200 mb-1">
                  নতুন পাসওয়ার্ড লিখুন
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newOpPasswordInput}
                  onChange={(e) => setNewOpPasswordInput(e.target.value)}
                  placeholder="কমপক্ষে ৪ অক্ষর..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetPassOperator(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5 text-slate-950" />
                  <span>পাসওয়ার্ড পরিবর্তন করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: DELETE OPERATOR CONFIRMATION */}
      {deleteConfirmOperator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-rose-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">সার্চ অপারেটর ডিলিট নিশ্চিতকরণ</h3>
              </div>
              <button
                onClick={() => setDeleteConfirmOperator(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              আপনি কি নিশ্চিত যে অপারেটর <strong className="text-rose-300 font-bold">{deleteConfirmOperator.name}</strong> (@{deleteConfirmOperator.username}) এর একাউন্ট ও সার্চ পারমিশন স্থায়ীভাবে ডিলিট করতে চান?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmOperator(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteOperator}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>স্থায়ীভাবে ডিলিট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 10: CLEAR SEARCH LOGIN LOGS */}
      {isClearSearchLogsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">সার্চ অডিট লগ ক্লিয়ার করুন</h3>
              </div>
              <button
                onClick={() => setIsClearSearchLogsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              আপনি কি নিশ্চিত যে সকল অপারেটরের পূর্ববর্তী সার্চ লগইন হিস্টোরি ডিলিট করতে চান?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsClearSearchLogsOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleExecuteClearSearchLogs}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>সব লগ মুছুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 10.5: EDIT SEARCH OPERATOR & COMPANY PERMISSIONS */}
      {editModalOperator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-cyan-500/40 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-cyan-400">
                <Edit3 className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">সার্চ অপারেটর ও কোম্পানি পারমিশন এডিট</h3>
              </div>
              <button
                onClick={() => setEditModalOperator(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSearchOperatorSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  অপারেটরের পূর্ণ নাম
                </label>
                <input
                  type="text"
                  required
                  value={editModalOperator.name}
                  onChange={(e) => setEditModalOperator({ ...editModalOperator, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ইউজারনেম (লগইন আইডি)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editModalOperator.username}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 font-mono text-xs cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    অ্যাকাউন্ট স্ট্যাটাস
                  </label>
                  <select
                    value={editModalOperator.status}
                    onChange={(e) => setEditModalOperator({ ...editModalOperator, status: e.target.value as 'Active' | 'Suspended' })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-400"
                  >
                    <option value="Active">সক্রিয় (Active)</option>
                    <option value="Suspended">স্থগিত (Suspended)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    মোবাইল নম্বর
                  </label>
                  <input
                    type="text"
                    value={editModalOperator.mobile || ''}
                    onChange={(e) => setEditModalOperator({ ...editModalOperator, mobile: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ইমেইল (ঐচ্ছিক)
                  </label>
                  <input
                    type="email"
                    value={editModalOperator.email || ''}
                    onChange={(e) => setEditModalOperator({ ...editModalOperator, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Authorized Company Permission Selection */}
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-cyan-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    <span>কোন কোন কোম্পানির গ্রাহক ডেটা দেখতে পারবে? *</span>
                  </div>
                  <span className="text-[10px] text-amber-300 font-semibold font-mono">
                    {editOpAllowedCompanies.includes('ALL') ? 'সকল কোম্পানি' : `${editOpAllowedCompanies.length} টি নির্বাচিত`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  সিলেক্ট করা কোম্পানি বাদে এই অপারেটর সার্চ করলেও অন্য কোনো কোম্পানির গ্রাহক ফলাফল পাবে না।
                </p>

                {/* Option 1: ALL Companies */}
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs text-purple-200 cursor-pointer font-bold hover:bg-purple-950/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={editOpAllowedCompanies.includes('ALL')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditOpAllowedCompanies(['ALL']);
                      } else {
                        setEditOpAllowedCompanies(['central']);
                      }
                    }}
                    className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-purple-400"
                  />
                  <span>🌐 সকল কোম্পানি অ্যাক্সেস (সেন্ট্রাল + সব রিসেলার)</span>
                </label>

                {!editOpAllowedCompanies.includes('ALL') && (
                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    {/* Central ISP Company */}
                    <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs text-white cursor-pointer hover:bg-slate-850 transition-colors">
                      <input
                        type="checkbox"
                        checked={editOpAllowedCompanies.includes('central')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditOpAllowedCompanies([...editOpAllowedCompanies, 'central']);
                          } else {
                            setEditOpAllowedCompanies(editOpAllowedCompanies.filter((c) => c !== 'central'));
                          }
                        }}
                        className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
                      />
                      <span className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-blue-900/60 text-[10px] text-blue-300 font-mono">সেন্ট্রাল ISP</span>
                        <span className="font-semibold">{ispProfile.companyName}</span>
                      </span>
                    </label>

                    {/* Resellers */}
                    {resellers.length > 0 && (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        <span className="text-[10px] text-slate-400 font-bold block pt-1">রিসেলার কোম্পানি নির্বাচন:</span>
                        {resellers.map((r) => {
                          const isChecked = editOpAllowedCompanies.includes(r.id) || editOpAllowedCompanies.includes(r.code);
                          return (
                            <label
                              key={r.id}
                              className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditOpAllowedCompanies([...editOpAllowedCompanies, r.id]);
                                  } else {
                                    setEditOpAllowedCompanies(editOpAllowedCompanies.filter((c) => c !== r.id && c !== r.code));
                                  }
                                }}
                                className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700"
                              />
                              <span className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-[10px] text-emerald-300 font-mono font-bold">[{r.code}]</span>
                                <span className="font-medium text-white">{r.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">({r.phone || r.username})</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-cyan-300 block">অন্যান্য পারমিশন লেভেল:</span>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editModalOperator.permissions?.canViewFinancials ?? true}
                    onChange={(e) => setEditModalOperator({
                      ...editModalOperator,
                      permissions: {
                        ...editModalOperator.permissions,
                        canViewFinancials: e.target.checked,
                      }
                    })}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
                  />
                  <span>গ্রাহকদের বিল ও বকেয়ার পরিমাণ দেখতে পারবে</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editModalOperator.permissions?.canExport ?? false}
                    onChange={(e) => setEditModalOperator({
                      ...editModalOperator,
                      permissions: {
                        ...editModalOperator.permissions,
                        canExport: e.target.checked,
                      }
                    })}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
                  />
                  <span>সার্চ রেজাল্ট ডাউনলোড/এক্সপোর্ট করতে পারবে</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalOperator(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>পারমিশন সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 11: ADD / EDIT RESELLER ACCOUNT */}
      {isAddResellerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border-2 border-emerald-500/40 p-6 sm:p-7 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <Store className="w-6 h-6" />
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    {editingReseller ? 'রিসেলার অ্যাকাউন্ট এডিট' : 'নতুন রিসেলার আইডি তৈরি করুন (Create Reseller ID)'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    তৈরি করার সাথে সাথে রিসেলার এই তথ্য দিয়ে অবিলম্বে লগইন করতে পারবেন
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddResellerModalOpen(false);
                  setEditingReseller(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReseller} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    প্রতিষ্ঠানের নাম / রিসেলারের নাম <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={resellerFormName}
                    onChange={(e) => setResellerFormName(e.target.value)}
                    placeholder="যেমন: সবুজ বাংলা অনলাইন"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    মালিক / প্রোপাইটরের নাম
                  </label>
                  <input
                    type="text"
                    value={resellerFormOwner}
                    onChange={(e) => setResellerFormOwner(e.target.value)}
                    placeholder="যেমন: মোঃ জাহিদ হাসান"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Login Credentials Box */}
              <div className="p-3.5 rounded-2xl bg-[#080E1A] border border-emerald-500/30 space-y-3">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  লগইন ক্রেডেনশিয়াল (Login Authentication Credentials)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      লগইন ইউজারনেম <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={resellerFormUsername}
                      onChange={(e) => setResellerFormUsername(e.target.value)}
                      placeholder="যেমন: shobuj_net বা res01"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs outline-none focus:border-emerald-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      রিসেলার কোড দিয়েও লগইন করতে পারবেন
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-300">
                        লগইন পাসওয়ার্ড <span className="text-rose-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const chars = '1234567890abcdefghjkmnpqrstuvwxyz';
                          let p = '';
                          for (let i = 0; i < 6; i++) p += chars[Math.floor(Math.random() * chars.length)];
                          setResellerFormPassword(p);
                        }}
                        className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                      >
                        পাসওয়ার্ড জেনারেট
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={resellerFormPassword}
                      onChange={(e) => setResellerFormPassword(e.target.value)}
                      placeholder="পাসওয়ার্ড দিন..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono text-xs outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    মোবাইল নম্বর <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={resellerFormPhone}
                    onChange={(e) => setResellerFormPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    এলাকা / কাভারেজ জোন
                  </label>
                  <input
                    type="text"
                    value={resellerFormArea}
                    onChange={(e) => setResellerFormArea(e.target.value)}
                    placeholder="যেমন: মিরপুর-১০"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ইমেইল (ঐচ্ছিক)
                  </label>
                  <input
                    type="email"
                    value={resellerFormEmail}
                    onChange={(e) => setResellerFormEmail(e.target.value)}
                    placeholder="reseller@isp.net"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Financial & Rates Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    প্রারম্ভিক ওয়ালেট ব্যালেন্স (৳)
                  </label>
                  <input
                    type="number"
                    value={resellerFormBalance}
                    onChange={(e) => setResellerFormBalance(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono text-xs outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    কমিশন হার (%)
                  </label>
                  <input
                    type="number"
                    value={resellerFormCommissionRate}
                    onChange={(e) => setResellerFormCommissionRate(Number(e.target.value))}
                    placeholder="15"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    পাইকারি রেট (৳ / গ্রাহক)
                  </label>
                  <input
                    type="number"
                    value={resellerFormWholesaleRate}
                    onChange={(e) => setResellerFormWholesaleRate(Number(e.target.value))}
                    placeholder="350"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    বিলিং মেথড
                  </label>
                  <select
                    value={resellerFormBillingType}
                    onChange={(e) => setResellerFormBillingType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-emerald-400"
                  >
                    <option value="prepaid">Prepaid (ওয়ালেট থেকে অগ্রিম বিল কর্তন)</option>
                    <option value="postpaid">Postpaid (মাসের শেষে মোট হিসাব)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    অ্যাকাউন্ট স্ট্যাটাস
                  </label>
                  <select
                    value={resellerFormStatus}
                    onChange={(e) => setResellerFormStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-emerald-400"
                  >
                    <option value="Active">Active (সক্রিয়)</option>
                    <option value="Suspended">Suspended (স্থগিত)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddResellerModalOpen(false);
                    setEditingReseller(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReseller}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Store className="w-4 h-4 text-slate-950" />
                  <span>{editingReseller ? 'তথ্য সংরক্ষণ করুন' : 'রিসেলার তৈরি করুন (Create)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 12: RECHARGE RESELLER BALANCE */}
      {isRechargeModalOpen && rechargeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-emerald-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Wallet className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">রিসেলার ওয়ালেট ব্যালেন্স রিচার্জ</h3>
              </div>
              <button
                onClick={() => {
                  setIsRechargeModalOpen(false);
                  setRechargeTarget(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#09101D] border border-slate-800 text-xs space-y-1">
              <p className="text-white font-bold">{rechargeTarget.name} ({rechargeTarget.code})</p>
              <p className="text-slate-400">
                বর্তমান ব্যালেন্স: <strong className="text-emerald-400 font-mono">{ispProfile.currencySymbol}{rechargeTarget.balance.toLocaleString('en-IN')}</strong>
              </p>
            </div>

            <form onSubmit={handleExecuteRechargeReseller} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  রিচার্জের পরিমাণ (টাকা) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={rechargeAmountInput}
                  onChange={(e) => setRechargeAmountInput(Number(e.target.value))}
                  placeholder="5000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono text-sm font-black outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  পেমেন্ট মাধ্যম
                </label>
                <select
                  value={rechargeMethodInput}
                  onChange={(e) => setRechargeMethodInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-emerald-400"
                >
                  <option value="bKash">bKash (বিকাশ)</option>
                  <option value="Nagad">Nagad (নগদ)</option>
                  <option value="Rocket">Rocket (রকেট)</option>
                  <option value="Bank">Bank Transfer (ব্যাংক ট্রান্সফার)</option>
                  <option value="Cash">Cash (নগদ গ্রহণ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  নোট / ট্রানজেকশন আইডি
                </label>
                <input
                  type="text"
                  value={rechargeNotesInput}
                  onChange={(e) => setRechargeNotesInput(e.target.value)}
                  placeholder="রেফারেন্স বা মন্তব্য..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsRechargeModalOpen(false);
                    setRechargeTarget(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5 text-slate-950" />
                  <span>ব্যালেন্স রিচার্জ নিশ্চিত করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 13: RESET RESELLER PASSWORD */}
      {isResetResellerPassOpen && resetResellerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-amber-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Key className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">রিসেলার পাসওয়ার্ড পরিবর্তন</h3>
              </div>
              <button
                onClick={() => {
                  setIsResetResellerPassOpen(false);
                  setResetResellerTarget(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              রিসেলার: <strong className="text-white font-bold">{resetResellerTarget.name}</strong> (@{resetResellerTarget.username})
            </p>

            <form onSubmit={handleExecuteResetResellerPassword} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-amber-200">
                    নতুন পাসওয়ার্ড লিখুন <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = '1234567890abcdefghjkmnpqrstuvwxyz';
                      let p = '';
                      for (let i = 0; i < 6; i++) p += chars[Math.floor(Math.random() * chars.length)];
                      setNewResellerPassInput(p);
                    }}
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    পাসওয়ার্ড জেনারেট
                  </button>
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newResellerPassInput}
                  onChange={(e) => setNewResellerPassInput(e.target.value)}
                  placeholder="নতুন পাসওয়ার্ড দিন (কমপক্ষে ৩ অক্ষর)..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetResellerPassOpen(false);
                    setResetResellerTarget(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-slate-950" />
                  <span>পাসওয়ার্ড সেট করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 14: DELETE RESELLER CONFIRMATION */}
      {deleteConfirmReseller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-rose-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-base">রিসেলার ডিলিট নিশ্চিতকরণ</h3>
              </div>
              <button
                onClick={() => setDeleteConfirmReseller(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              আপনি কি নিশ্চিত যে রিসেলার <strong className="text-rose-300 font-bold">{deleteConfirmReseller.name}</strong> ({deleteConfirmReseller.code}) এর অ্যাকাউন্ট ও অ্যাক্সেস ডাটাবেস থেকে স্থায়ীভাবে ডিলিট করতে চান?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmReseller(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleDeleteResellerConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>স্থায়ীভাবে ডিলিট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 15: ZERO ALL DATA (PRISTINE RESET) */}
      {isZeroDataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-rose-500/60 p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-extrabold text-white text-base">সকল ডেটা শূন্য করুন (Pristine Zero State)</h3>
              </div>
              <button
                onClick={() => setIsZeroDataModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs space-y-1.5 leading-relaxed">
              <p className="font-bold text-white flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                আপনি কি নিশ্চিত? এটি সম্পূর্ণ ডেটাবেস শূন্য করে দেবে।
              </p>
              <p className="text-slate-300">
                এই অপশনটি ব্রাউজার লোকাল স্টোরেজ এবং গুগল ক্লাউড ফায়ারস্টোর থেকে সকল গ্রাহক, পেমেন্ট রেকর্ড, টিকেট এবং টেস্ট রিসেলার অ্যাকাউন্ট মুছে দিয়ে সম্পূর্ণ শূন্য ফ্রেশ স্টার্টে নিয়ে যাবে।
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsZeroDataModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isZeroingData}
                onClick={handleExecuteZeroAllData}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isZeroingData ? 'শূন্য করা হচ্ছে...' : 'হ্যাঁ, সকল ডেটা শূন্য করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
