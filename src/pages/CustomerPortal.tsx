import React, { useState, useMemo } from 'react';
import { Customer, PaymentRecord, SupportTicket, PaymentRequest } from '../types';
import { useCustomer } from '../context/CustomerContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { 
  Wifi, 
  CreditCard, 
  FileText, 
  Headphones, 
  Copy, 
  Check, 
  LogOut, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Send, 
  PhoneCall, 
  HelpCircle, 
  CheckCircle2, 
  User, 
  Shield, 
  Printer, 
  XCircle, 
  MessageSquare,
  DollarSign,
  ArrowRight,
  Info
} from 'lucide-react';

interface CustomerPortalProps {
  onLogout: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ onLogout }) => {
  const { customerUser, customerLogout } = useAuth();
  const { 
    customers, 
    payments, 
    paymentRequests, 
    supportTickets, 
    ispProfile, 
    submitPaymentRequest,
    addSupportTicket 
  } = useCustomer();
  const { isDark } = useTheme();
  const { addToast } = useToast();

  // Active tab in Customer Portal - ONLY 3 ALLOWED TABS: billing, support, profile
  const [activeTab, setActiveTab] = useState<'billing' | 'support' | 'profile'>('billing');

  // Copied fields state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // TrxID Payment Submission form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'bKash' as 'bKash' | 'Nagad' | 'Rocket' | 'Bank Transfer' | 'Cash',
    senderNumber: '',
    transactionId: '',
    notes: '',
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Support Complaint form
  const [complaintForm, setComplaintForm] = useState({
    issueType: 'Speed Issue' as 'Speed Issue' | 'No Internet / Red LOS' | 'Router Issue' | 'Billing Query' | 'Package Upgrade' | 'Other',
    subject: '',
    description: '',
  });
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Printable receipt state
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);

  // Get current fresh customer data from context
  const currentCustomer: Customer = useMemo(() => {
    if (!customerUser) {
      return {
        id: 'cust-demo',
        uid: 'WIFI-000001',
        name: 'গ্রাহক ইউজার',
        mobile: '01700000000',
        address: 'ঢাকা, বাংলাদেশ',
        area: 'এরিয়া ১',
        packageName: 'Standard Turbo',
        speed: '25 Mbps',
        monthlyBill: 500,
        monthlyFee: 500,
        dueAmount: 0,
        connectionType: 'Fiber (FTTH)',
        status: 'Active',
        paymentStatus: 'Paid',
        connectionDate: '2026-01-01',
        installationDate: '2026-01-01',
        nextPaymentDate: '2026-09-10',
        createdAt: '',
        updatedAt: '',
      };
    }
    const found = customers.find((c) => c.id === customerUser.id || c.uid === customerUser.uid);
    return found || customerUser;
  }, [customerUser, customers]);

  // STRICT PRIVACY: Filter payments belonging ONLY to this specific customer
  const customerPayments = useMemo(() => {
    if (!currentCustomer) return [];
    return payments.filter(
      (p) => p.customerId === currentCustomer.id || p.customerUid === currentCustomer.uid
    );
  }, [payments, currentCustomer]);

  // Filter payment requests for this customer
  const customerRequests = useMemo(() => {
    if (!currentCustomer) return [];
    return paymentRequests.filter(
      (r) => r.customerId === currentCustomer.id || r.customerUid === currentCustomer.uid
    );
  }, [paymentRequests, currentCustomer]);

  // Filter support tickets for this customer
  const customerTickets = useMemo(() => {
    if (!currentCustomer) return [];
    return supportTickets.filter(
      (t) => t.customerId === currentCustomer.id || t.customerUid === currentCustomer.uid
    );
  }, [supportTickets, currentCustomer]);

  const handleCopy = (text: string, keyName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    addToast('info', 'কপি করা হয়েছে', `${text} ক্লিপবোর্ডে কপি হয়েছে।`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amtNum = parseFloat(paymentForm.amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      addToast('error', 'ভুল টাকার পরিমাণ', 'অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন।');
      return;
    }
    if (!paymentForm.transactionId.trim()) {
      addToast('error', 'TrxID প্রয়োজন', 'অনুগ্রহ করে পেমেন্টের Transaction ID (TrxID) লিখুন।');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await submitPaymentRequest({
        customerId: currentCustomer.id,
        customerUid: currentCustomer.uid,
        customerName: currentCustomer.name,
        customerMobile: currentCustomer.mobile,
        amount: amtNum,
        paymentMethod: paymentForm.method,
        senderNumber: paymentForm.senderNumber.trim(),
        transactionId: paymentForm.transactionId.trim(),
        requestDate: new Date().toISOString().substring(0, 10),
        notes: paymentForm.notes.trim(),
      });

      setPaymentForm({
        amount: '',
        method: 'bKash',
        senderNumber: '',
        transactionId: '',
        notes: '',
      });
    } catch (err: any) {
      addToast('error', 'জমা দেওয়া ব্যর্থ', err.message || 'পেমেন্ট রিকোয়েস্ট পাঠানো সম্ভব হয়নি।');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintForm.subject.trim() || !complaintForm.description.trim()) {
      addToast('error', 'তথ্য পূরণ করুন', 'অনুগ্রহ করে বিষয় ও সমস্যার বিবরণ লিখুন।');
      return;
    }

    setIsSubmittingTicket(true);
    try {
      await addSupportTicket({
        customerId: currentCustomer.id,
        customerUid: currentCustomer.uid,
        customerName: currentCustomer.name,
        customerMobile: currentCustomer.mobile,
        subject: complaintForm.subject.trim(),
        issueType: complaintForm.issueType,
        description: complaintForm.description.trim(),
      });

      setComplaintForm({
        issueType: 'Speed Issue',
        subject: '',
        description: '',
      });
    } catch (err: any) {
      addToast('error', 'ব্যর্থ হয়েছে', err.message || 'অভিযোগ জমা দেওয়া যায়নি।');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className={`min-h-screen antialiased transition-colors duration-500 pb-16 ${
      isDark ? 'bg-[#060A13] text-slate-100' : 'bg-slate-900 text-slate-100'
    }`}>
      
      {/* Top Customer Header Bar */}
      <header className="sticky top-0 z-30 bg-[#0A1020]/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-white text-base tracking-tight leading-tight">
                  {ispProfile.companyName}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                  গ্রাহক পোর্টাল
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                স্বাগতম, <span className="text-slate-200 font-bold">{currentCustomer.name}</span> ({currentCustomer.uid})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                customerLogout();
                addToast('info', 'লগআউট সম্পন্ন', 'গ্রাহক পোর্টাল থেকে সফলভাবে লগআউট করা হয়েছে।');
                onLogout();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition-all min-h-[38px] cursor-pointer active:scale-95"
              title="লগআউট করুন"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">লগআউট</span>
            </button>
          </div>
        </div>

        {/* 3 Strict Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 flex items-center justify-between sm:justify-start border-t border-slate-800/80 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-6 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex-1 sm:flex-initial shrink-0 ${
              activeTab === 'billing'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>বিল পেমেন্ট<span className="hidden sm:inline"> ও ইনভয়েস</span></span>
            {currentCustomer.dueAmount > 0 && (
              <>
                <span className="hidden sm:inline ml-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                  ৳{currentCustomer.dueAmount} বকেয়া
                </span>
                <span className="sm:hidden w-2 h-2 rounded-full bg-amber-400 shrink-0 ml-0.5" title={`৳${currentCustomer.dueAmount} বকেয়া`} />
              </>
            )}
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-6 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex-1 sm:flex-initial shrink-0 ${
              activeTab === 'support'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Headphones className="w-4 h-4 shrink-0" />
            <span>সাপোর্ট<span className="hidden sm:inline"> ও অভিযোগ</span></span>
            {customerTickets.filter(t => t.status !== 'Resolved').length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                {customerTickets.filter(t => t.status !== 'Resolved').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-6 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex-1 sm:flex-initial shrink-0 ${
              activeTab === 'profile'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span>আমার প্রোফাইল</span>
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">

        {/* ========================================================================= */}
        {/* TAB 1: বিল পেমেন্ট ও ইনভয়েস (BILL PAYMENT & INVOICES)                       */}
        {/* ========================================================================= */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            
            {/* Quick Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-slate-400 text-xs block">বর্তমান বকেয়া বিল</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-2xl font-black font-mono ${currentCustomer.dueAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {ispProfile.currencySymbol}{currentCustomer.dueAmount || 0}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {currentCustomer.dueAmount > 0 ? 'বকেয়া পরিশোধের অনুরোধ করা হচ্ছে' : 'সকল বিল পরিশোধিত'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-slate-400 text-xs block">মাসিক প্যাকেজ ফি</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-cyan-300 font-mono">
                    {ispProfile.currencySymbol}{currentCustomer.monthlyBill || currentCustomer.monthlyFee || 0}
                  </span>
                  <span className="text-xs text-slate-400">/ মাস</span>
                </div>
                <span className="text-[11px] text-cyan-400 mt-1 block">
                  প্যাকেজ: {currentCustomer.packageName} ({currentCustomer.speed})
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-slate-400 text-xs block">পেমেন্ট স্ট্যাটাস</span>
                <div className="mt-2">
                  <StatusBadge status={currentCustomer.paymentStatus || (currentCustomer.dueAmount > 0 ? 'Due' : 'Paid')} />
                </div>
                <span className="text-[11px] text-slate-400 mt-2 block">
                  সর্বশেষ পেমেন্ট: {currentCustomer.lastPaymentDate || 'রেকর্ড নেই'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-slate-400 text-xs block">পরবর্তী বিলিংয়ের তারিখ</span>
                <div className="flex items-center gap-1.5 mt-1 text-white font-mono font-bold text-lg">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span>{currentCustomer.nextPaymentDate || '২০২৬-০৯-১০'}</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  নিয়মিত বিল পরিশোধ করে সংযোগ সচল রাখুন
                </span>
              </div>

            </div>

            {/* 2-Column: Left Online Payment Form & Accounts / Right: Requests & Invoices */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column (5 cols): Payment Options & Form */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Official Merchant Accounts Card */}
                <div className="p-5 rounded-2xl bg-[#0C1326] border border-cyan-500/30 space-y-4">
                  <div className="flex items-center gap-2 text-cyan-300">
                    <CreditCard className="w-5 h-5" />
                    <h3 className="font-bold text-sm text-white">বিল পরিশোধের নম্বরসমূহ</h3>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    নিচের যেকোনো একাউন্টে বিকাশ / নগদ / রকেট অ্যাপ থেকে <strong className="text-cyan-300">Send Money</strong> অথবা <strong className="text-cyan-300">Payment</strong> করুন এবং প্রাপ্ত TrxID দিয়ে নিচে সাবমিট করুন।
                  </p>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-pink-950/40 border border-pink-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-pink-600 text-white font-bold text-[10px]">bKash</span>
                        <span className="text-pink-200 font-bold">{ispProfile.bkashMerchant || ispProfile.supportPhone}</span>
                        <span className="text-[10px] text-pink-300 font-sans">(Personal/Merchant)</span>
                      </div>
                      <button
                        onClick={() => handleCopy(ispProfile.bkashMerchant || ispProfile.supportPhone, 'bkash')}
                        className="p-1 rounded-md bg-pink-900/60 hover:bg-pink-800 text-pink-200"
                        title="Copy"
                      >
                        {copiedKey === 'bkash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-orange-950/40 border border-orange-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-orange-600 text-white font-bold text-[10px]">Nagad</span>
                        <span className="text-orange-200 font-bold">{ispProfile.nagadMerchant || ispProfile.supportPhone}</span>
                        <span className="text-[10px] text-orange-300 font-sans">(Personal/Merchant)</span>
                      </div>
                      <button
                        onClick={() => handleCopy(ispProfile.nagadMerchant || ispProfile.supportPhone, 'nagad')}
                        className="p-1 rounded-md bg-orange-900/60 hover:bg-orange-800 text-orange-200"
                        title="Copy"
                      >
                        {copiedKey === 'nagad' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-bold text-[10px]">Rocket</span>
                        <span className="text-purple-200 font-bold">{ispProfile.rocketMerchant || ispProfile.supportPhone}</span>
                        <span className="text-[10px] text-purple-300 font-sans">(Personal/Merchant)</span>
                      </div>
                      <button
                        onClick={() => handleCopy(ispProfile.rocketMerchant || ispProfile.supportPhone, 'rocket')}
                        className="p-1 rounded-md bg-purple-900/60 hover:bg-purple-800 text-purple-200"
                        title="Copy"
                      >
                        {copiedKey === 'rocket' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit Payment Request Form */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h3 className="font-bold text-sm text-white">পেমেন্ট রিকোয়েস্ট পাঠান</h3>
                      <p className="text-[11px] text-slate-400">টাকা পাঠানোর পর TrxID সাবমিট করুন</p>
                    </div>
                  </div>

                  <form onSubmit={handlePaymentSubmit} className="space-y-3.5 text-xs">
                    
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">পেমেন্ট মাধ্যম (Payment Method) *</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Cash'] as const).map((m) => (
                          <button
                            type="button"
                            key={m}
                            onClick={() => setPaymentForm({ ...paymentForm, method: m })}
                            className={`py-2 px-2 rounded-xl text-center font-bold border transition-all ${
                              paymentForm.method === m
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">টাকার পরিমাণ (৳) *</label>
                        <input
                          type="number"
                          required
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                          placeholder={String(currentCustomer.dueAmount || currentCustomer.monthlyBill || 500)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">প্রেরক মোবাইল নম্বর</label>
                        <input
                          type="tel"
                          value={paymentForm.senderNumber}
                          onChange={(e) => setPaymentForm({ ...paymentForm, senderNumber: e.target.value })}
                          placeholder={currentCustomer.mobile}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Transaction ID (TrxID) *</label>
                      <input
                        type="text"
                        required
                        value={paymentForm.transactionId}
                        onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value.toUpperCase() })}
                        placeholder="e.g. BKB4938X91"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono uppercase font-bold focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">মন্তব্য (ঐচ্ছিক)</label>
                      <input
                        type="text"
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                        placeholder="e.g. সেপ্টেম্বর মাসের বিল"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingPayment}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                    >
                      {isSubmittingPayment ? (
                        <span>সাবমিট হচ্ছে...</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>পেমেন্ট রিকোয়েস্ট সাবমিট করুন</span>
                        </>
                      )}
                    </button>

                  </form>
                </div>

              </div>

              {/* Right Column (7 cols): Submitted Requests & Verified Invoices */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. Submitted Payment Requests (Pending/Approved/Rejected) */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <h3 className="font-bold text-sm text-white">আমার পাঠানো পেমেন্ট রিকোয়েস্ট</h3>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      মোট: {customerRequests.length}
                    </span>
                  </div>

                  {customerRequests.length === 0 ? (
                    <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                      <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                      <p className="text-xs text-slate-400">আপনার কোনো পেন্ডিং বা পূর্বের পেমেন্ট রিকোয়েস্ট নেই।</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {customerRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white font-mono">{ispProfile.currencySymbol}{req.amount}</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">{req.paymentMethod}</span>
                              <span className="text-cyan-400 font-mono font-bold">TrxID: {req.transactionId}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400">
                              <span>তারিখ: {req.requestDate || req.createdAt?.substring(0, 10)}</span>
                              {req.senderNumber && <span>প্রেরক: {req.senderNumber}</span>}
                            </div>
                            {req.adminNotes && (
                              <p className="text-[11px] text-cyan-300 bg-cyan-950/30 p-1.5 rounded border border-cyan-800/40">
                                💬 এডমিন নোট: {req.adminNotes}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0">
                            {req.status === 'Approved' ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                অনুমোদিত
                              </span>
                            ) : req.status === 'Rejected' ? (
                              <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-bold border border-rose-500/30 inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                বাতিল
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 animate-spin" />
                                অপেক্ষমাণ (Pending)
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Official Payment History & Invoices */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <h3 className="font-bold text-sm text-white">পরিশোধিত ইনভয়েস ও রসিদ (Payment Receipts)</h3>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      মোট রসিদ: {customerPayments.length} টি
                    </span>
                  </div>

                  {customerPayments.length === 0 ? (
                    <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                      <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                      <p className="text-xs text-slate-400">আপনার কোনো অনুমোদিত পেমেন্ট রেকর্ড নেই।</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                            <th className="pb-2.5">রসিদ নং</th>
                            <th className="pb-2.5">তারিখ</th>
                            <th className="pb-2.5">পদ্ধতি ও TrxID</th>
                            <th className="pb-2.5 text-right">পরিমাণ</th>
                            <th className="pb-2.5 text-center">অ্যাকশন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {customerPayments.map((pay) => (
                            <tr key={pay.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-2.5 text-cyan-300 font-bold">
                                {pay.receiptNumber}
                              </td>
                              <td className="py-2.5 text-slate-300">
                                {pay.paymentDate}
                              </td>
                              <td className="py-2.5">
                                <span className="text-white font-sans font-semibold block">{pay.paymentMethod}</span>
                                {pay.transactionId && (
                                  <span className="text-[10px] text-slate-400 font-mono">{pay.transactionId}</span>
                                )}
                              </td>
                              <td className="py-2.5 text-right font-bold text-emerald-400">
                                {ispProfile.currencySymbol}{pay.amount}
                              </td>
                              <td className="py-2.5 text-center font-sans">
                                <button
                                  onClick={() => setSelectedReceipt(pay)}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 hover:text-white border border-cyan-500/30 text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>রসিদ দেখুন</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>

              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: সাপোর্ট ও অভিযোগ (SUPPORT & COMPLAINTS)                            */}
        {/* ========================================================================= */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            
            {/* Quick Contact Helpline Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0E1E38] to-[#122B4E] border border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                  <Headphones className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">২৪/৭ কাস্টমার কেয়ার ও সাপোর্ট ডেস্ক</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    ইন্টারনেট গতি বা সংযোগে কোনো সমস্যা হলে হটলাইনে সরাসরি যোগাযোগ করুন অথবা নিচে টিকিট খুলুন।
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`tel:${ispProfile.supportPhone}`}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>হেল্পডেস্ক: {ispProfile.supportPhone}</span>
                </a>
                {ispProfile.emergencyHotline && (
                  <a
                    href={`tel:${ispProfile.emergencyHotline}`}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
                  >
                    <PhoneCall className="w-4 h-4 text-rose-400" />
                    <span>জরুরি হটলাইন: {ispProfile.emergencyHotline}</span>
                  </a>
                )}
              </div>
            </div>

            {/* 2-Column: Left Submit Ticket / Right: Submitted Tickets History */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column (5 cols): New Ticket Form */}
              <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="font-bold text-sm text-white">নতুন অভিযোগ বা অভিযোগ টিকিট</h3>
                    <p className="text-[11px] text-slate-400">আমাদের টেকনিক্যাল টিম দ্রুত সমাধান করবে</p>
                  </div>
                </div>

                <form onSubmit={handleTicketSubmit} className="space-y-3.5 text-xs">
                  
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">সমস্যার ধরন (Issue Category) *</label>
                    <select
                      value={complaintForm.issueType}
                      onChange={(e) => setComplaintForm({ ...complaintForm, issueType: e.target.value as any })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="Speed Issue">গতি কম (Slow Speed)</option>
                      <option value="No Internet / Red LOS">ইন্টারনেট বন্ধ / লাল বাতি (No Internet / LOS)</option>
                      <option value="Router Issue">রাউটার কনফিগারেশন সমস্যা (Router Issue)</option>
                      <option value="Billing Query">বিল সংক্রান্ত অনুসন্ধান (Billing Query)</option>
                      <option value="Package Upgrade">প্যাকেজ পরিবর্তন / স্পিড বৃদ্ধি (Package Upgrade)</option>
                      <option value="Other">অন্যান্য (Other)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">সংক্ষিপ্ত বিষয় (Subject) *</label>
                    <input
                      type="text"
                      required
                      value={complaintForm.subject}
                      onChange={(e) => setComplaintForm({ ...complaintForm, subject: e.target.value })}
                      placeholder="e.g. গত ২ ঘণ্টা ধরে ইন্টারনেট কানেকশন পাওয়া যাচ্ছে না"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">বিস্তারিত বিবরণ (Description) *</label>
                    <textarea
                      required
                      rows={4}
                      value={complaintForm.description}
                      onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                      placeholder="সমস্যার বিস্তারিত লিখুন..."
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingTicket}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                  >
                    {isSubmittingTicket ? (
                      <span>জমা হচ্ছে...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>অভিযোগ সাবমিট করুন</span>
                      </>
                    )}
                  </button>

                </form>
              </div>

              {/* Right Column (7 cols): Ticket List */}
              <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-sm text-white">আমার অভিযোগের ইতিহাস ও অবস্থা</h3>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    মোট: {customerTickets.length}
                  </span>
                </div>

                {customerTickets.length === 0 ? (
                  <div className="p-8 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
                    <p className="text-xs text-slate-300 font-semibold">আপনার কোনো সক্রিয় অভিযোগ বা টিকিট নেই।</p>
                    <p className="text-[11px] text-slate-500 mt-1">সবকিছু স্বাভাবিকভাবে চলছে।</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-semibold border border-cyan-800/40">
                              {ticket.issueType}
                            </span>
                            <h4 className="font-bold text-white text-sm mt-1">{ticket.subject}</h4>
                          </div>
                          <div>
                            {ticket.status === 'Resolved' ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                                সমাধানকৃত (Resolved)
                              </span>
                            ) : ticket.status === 'In Progress' ? (
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                                কাজ চলছে (In Progress)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                ওপেন (Open)
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                          {ticket.description}
                        </p>

                        {ticket.adminReply && (
                          <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-600/30 space-y-1">
                            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                              🛠️ এডমিন / টেকনিক্যাল রেসপন্স:
                            </span>
                            <p className="text-cyan-200 text-xs">{ticket.adminReply}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span>টিকিট আইডি: #{ticket.id.slice(-6)}</span>
                          <span>তারিখ: {ticket.createdAt?.substring(0, 10)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: আমার প্রোফাইল (MY PROFILE)                                        */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            
            {/* Customer Identity Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-tr from-[#0D152A] via-[#0A1D36] to-[#0F2942] border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-cyan-500/25">
                  {currentCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white">{currentCustomer.name}</h2>
                    <StatusBadge status={currentCustomer.status} />
                  </div>
                  <p className="text-xs text-cyan-300 font-mono font-bold mt-1">
                    গ্রাহক আইডি (UID): {currentCustomer.uid}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    মোবাইল: {currentCustomer.mobile}
                  </p>
                </div>
              </div>

              <div className="text-right flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                <span className="text-xs text-slate-400">মাসিক ইন্টারনেট ফি</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {ispProfile.currencySymbol}{currentCustomer.monthlyBill || currentCustomer.monthlyFee}
                </span>
                <span className="text-[11px] text-cyan-400 font-semibold">{currentCustomer.packageName}</span>
              </div>
            </div>

            {/* Profile Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Account & Personal Information */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-cyan-300">
                  <User className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-white">ব্যক্তিগত ও একাউন্ট তথ্য</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-[11px] block">পুরো নাম</span>
                      <strong className="text-white font-bold text-sm">{currentCustomer.name}</strong>
                    </div>
                    <button
                      onClick={() => handleCopy(currentCustomer.name, 'name')}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
                      title="Copy"
                    >
                      {copiedKey === 'name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-[11px] block">কাস্টমার UID (লগইন আইডি)</span>
                      <strong className="text-cyan-300 font-mono font-bold text-sm">{currentCustomer.uid}</strong>
                    </div>
                    <button
                      onClick={() => handleCopy(currentCustomer.uid, 'uid')}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
                      title="Copy"
                    >
                      {copiedKey === 'uid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-[11px] block">রেজিস্টার্ড মোবাইল নম্বর</span>
                      <strong className="text-white font-mono font-bold text-sm">{currentCustomer.mobile}</strong>
                    </div>
                    <button
                      onClick={() => handleCopy(currentCustomer.mobile, 'mobile')}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
                      title="Copy"
                    >
                      {copiedKey === 'mobile' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {currentCustomer.alternativeMobile && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">বিকল্প মোবাইল নম্বর</span>
                      <strong className="text-slate-200 font-mono text-sm">{currentCustomer.alternativeMobile}</strong>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">এলাকা / জোন</span>
                    <strong className="text-slate-200 text-sm">{currentCustomer.area || 'এরিয়া নির্দিষ্ট করা নেই'}</strong>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">সংযোগের সম্পূর্ণ ঠিকানা</span>
                    <strong className="text-slate-200 text-sm">{currentCustomer.address}</strong>
                  </div>
                </div>
              </div>

              {/* Subscription & Internet Service Details */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-cyan-300">
                  <Wifi className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-white">ইন্টারনেট প্যাকেজ ও সংযোগের বিবরণ</h3>
                </div>

                <div className="space-y-3 text-xs">
                  
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">ইন্টারনেট প্যাকেজ ও স্পিড</span>
                    <strong className="text-cyan-300 font-mono font-bold text-sm block mt-0.5">
                      {currentCustomer.speed} — {currentCustomer.packageName}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-[11px] block">মাসিক বিল</span>
                      <strong className="text-emerald-400 font-mono font-bold text-sm">
                        {ispProfile.currencySymbol}{currentCustomer.monthlyBill || currentCustomer.monthlyFee} / Month
                      </strong>
                    </div>
                    <StatusBadge status={currentCustomer.paymentStatus || 'Paid'} />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">কানেকশন টাইপ</span>
                    <strong className="text-slate-200 text-sm">{currentCustomer.connectionType || 'Fiber (FTTH)'}</strong>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">সংযোগ শুরুর তারিখ (Connection Date)</span>
                    <strong className="text-slate-200 font-mono text-sm">
                      {currentCustomer.connectionDate || currentCustomer.installationDate || '2026-01-01'}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">পরবর্তী বিল পরিশোধের তারিখ</span>
                    <strong className="text-cyan-300 font-mono text-sm">
                      {currentCustomer.nextPaymentDate || '২০২৬-০৯-১০'}
                    </strong>
                  </div>

                  {/* Security Policy Notice */}
                  <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      প্যাকেজ পরিবর্তন বা স্থানান্তরের জন্য <strong className="text-cyan-300">সাপোর্ট ও অভিযোগ</strong> ট্যাব থেকে টিকিট খুলুন অথবা হটলাইনে যোগাযোগ করুন।
                    </p>
                  </div>

                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Printable Money Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 max-w-lg w-full text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Money Receipt (অর্থ পরিশোধের অফিসিয়াল রসিদ)</h3>
              </div>
              <span className="text-xs font-mono text-cyan-300">{selectedReceipt.receiptNumber}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
              <div className="text-center pb-2 border-b border-slate-800 text-slate-300">
                <strong className="text-sm text-white block">{ispProfile.companyName}</strong>
                <span>{ispProfile.tagline} • Phone: {ispProfile.supportPhone}</span>
              </div>

              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Customer Name:</span>
                <span className="text-white font-bold">{selectedReceipt.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer UID:</span>
                <span className="text-cyan-300 font-bold">{selectedReceipt.customerUid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Paid Amount:</span>
                <span className="text-emerald-400 font-bold text-sm">{ispProfile.currencySymbol}{selectedReceipt.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method:</span>
                <span className="text-slate-200">{selectedReceipt.paymentMethod}</span>
              </div>
              {selectedReceipt.transactionId && (
                <div className="flex justify-between">
                  <span className="text-slate-400">TrxID:</span>
                  <span className="text-cyan-400 font-bold">{selectedReceipt.transactionId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Date:</span>
                <span className="text-slate-200">{selectedReceipt.paymentDate}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Payment Status:</span>
                <span className="text-emerald-400 font-bold">PAID & VERIFIED (পরিশোধিত)</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                রসিদ প্রিন্ট করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
