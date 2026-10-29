import React, { useState, useMemo } from 'react';
import { PaymentRequest, SupportTicket } from '../../types';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { useReseller } from '../../context/ResellerContext';
import { useToast } from '../../context/ToastContext';
import { doesCustomerBelongToReseller } from '../../utils/resellerIsolation';
import { EditPaymentRequestModal } from '../../components/EditPaymentRequestModal';
import { 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Copy, 
  MessageSquare, 
  Headphones, 
  AlertTriangle,
  ArrowUpRight,
  Send,
  RefreshCw,
  DollarSign,
  Store
} from 'lucide-react';

export const PaymentRequestsView: React.FC = () => {
  const { 
    customers,
    paymentRequests, 
    supportTickets, 
    ispProfile, 
    approvePaymentRequest, 
    rejectPaymentRequest, 
    deletePaymentRequest,
    updateSupportTicket,
    deleteSupportTicket
  } = useCustomer();
  const { isReseller, user } = useAuth();
  const { resellers } = useReseller();
  const { addToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'tickets'>('requests');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Active reseller lookup
  const currentReseller = useMemo(() => {
    if (!isReseller && user?.role !== 'Reseller') return null;
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
      }
    );
  }, [isReseller, user, resellers]);

  // Strict Reseller Multi-Tenant Isolation: Only allow customers of current reseller
  const { baseRequests, baseTickets } = useMemo(() => {
    if (isReseller || user?.role === 'Reseller') {
      const myCustomers = customers.filter((c) => doesCustomerBelongToReseller(c, currentReseller));
      const myCustIds = new Set(myCustomers.map((c) => c.id));
      const myCustUids = new Set(myCustomers.map((c) => (c.uid || '').toLowerCase()));

      const scopedRequests = paymentRequests.filter(
        (r) =>
          (r.customerId && myCustIds.has(r.customerId)) ||
          (r.customerUid && myCustUids.has(r.customerUid.toLowerCase()))
      );

      const scopedTickets = supportTickets.filter(
        (t) =>
          (t.customerId && myCustIds.has(t.customerId)) ||
          (t.customerUid && myCustUids.has(t.customerUid.toLowerCase()))
      );

      return { baseRequests: scopedRequests, baseTickets: scopedTickets };
    }
    return { baseRequests: paymentRequests, baseTickets: supportTickets };
  }, [customers, paymentRequests, supportTickets, isReseller, user, currentReseller]);

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);

  // Reject Modal / Prompt
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Ticket Reply state
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [ticketReply, setTicketReply] = useState('');
  const [ticketStatus, setTicketStatus] = useState<'Open' | 'In Progress' | 'Resolved'>('Open');

  // Copied fields state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Statistics strictly based on isolated baseRequests & baseTickets
  const pendingCount = useMemo(() => baseRequests.filter((r) => r.status === 'Pending').length, [baseRequests]);
  const approvedCount = useMemo(() => baseRequests.filter((r) => r.status === 'Approved').length, [baseRequests]);
  const rejectedCount = useMemo(() => baseRequests.filter((r) => r.status === 'Rejected').length, [baseRequests]);
  const totalApprovedAmount = useMemo(() => {
    return baseRequests
      .filter((r) => r.status === 'Approved')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [baseRequests]);

  const openTicketsCount = useMemo(() => baseTickets.filter((t) => t.status !== 'Resolved').length, [baseTickets]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return baseRequests.filter((req) => {
      const matchStatus = filterStatus === 'All' ? true : req.status === filterStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q
        ? true
        : (req.customerName || '').toLowerCase().includes(q) ||
          (req.customerUid || '').toLowerCase().includes(q) ||
          (req.customerMobile || '').includes(q) ||
          (req.transactionId || '').toLowerCase().includes(q) ||
          (req.senderNumber && req.senderNumber.includes(q)) ||
          String(req.amount).includes(q);

      return matchStatus && matchSearch;
    });
  }, [baseRequests, filterStatus, searchQuery]);

  const handleCopy = (text: string, keyName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    addToast('info', 'কপি করা হয়েছে', `${text} ক্লিপবোর্ডে কপি হয়েছে।`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApprove = async (id: string) => {
    try {
      await approvePaymentRequest(id);
    } catch (err: any) {
      addToast('error', 'অনুমোদন ব্যর্থ', err.message || 'পেমেন্ট অনুমোদন করা যায়নি।');
    }
  };

  const handleOpenReject = (id: string) => {
    setRejectingId(id);
    setRejectReason('ভুল বা অপরীক্ষিত ট্রানজেকশন আইডি (Invalid TrxID)');
  };

  const handleConfirmReject = async () => {
    if (!rejectingId) return;
    try {
      await rejectPaymentRequest(rejectingId, rejectReason);
      setRejectingId(null);
      setRejectReason('');
    } catch (err: any) {
      addToast('error', 'বাতিল ব্যর্থ', err.message || 'রিকোয়েস্ট বাতিল করা সম্ভব হয়নি।');
    }
  };

  const handleDelete = async (id: string) => {
    await deletePaymentRequest(id);
  };

  const handleSaveTicket = async (ticket: SupportTicket) => {
    try {
      await updateSupportTicket(ticket.id, {
        status: ticketStatus,
        adminReply: ticketReply.trim(),
      });
      setEditingTicketId(null);
      setTicketReply('');
    } catch (err: any) {
      addToast('error', 'আপডেট ব্যর্থ', err.message || 'টিকিট আপডেট করা সম্ভব হয়নি।');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Sub Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-cyan-400" />
            <span>গ্রাহক পেমেন্ট রিকোয়েস্ট ও সাপোর্ট</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            গ্রাহকদের পাঠানো বিকাশ / নগদ / রকেট পেমেন্ট ভেরিফাই, এডিট ও অনুমোদন করুন
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'requests'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>পেমেন্ট রিকোয়েস্ট ({paymentRequests.length})</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('tickets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'tickets'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>গ্রাহক অভিযোগ ও টিকিট ({baseTickets.length})</span>
            {openTicketsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {openTicketsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Reseller Scope Notice Banner */}
      {isReseller && currentReseller && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400" />
            <span>
              রিসেলার ফিল্টার সক্রিয়: শুধুমাত্র আপনার অধীনে বরাদ্দকৃত গ্রাহকদের পেমেন্ট রিকোয়েস্ট ({baseRequests.length} টি) ও টিকিট ({baseTickets.length} টি) প্রদর্শিত হচ্ছে।
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-900/60 font-mono font-bold text-[11px] border border-emerald-500/40">
            {currentReseller.code}
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: PAYMENT REQUESTS MANAGEMENT                                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'requests' && (
        <div className="space-y-6">
          
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className={`p-4 rounded-2xl border transition-all ${
              pendingCount > 0
                ? 'bg-amber-950/40 border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900/90 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-300 font-semibold">পেন্ডিং ভেরিফিকেশন</span>
                <Clock className={`w-4 h-4 ${pendingCount > 0 ? 'text-amber-400 animate-spin' : 'text-slate-500'}`} />
              </div>
              <div className="text-2xl font-black font-mono text-amber-300 mt-2">
                {pendingCount} টি রিকোয়েস্ট
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">অনুমোদনের অপেক্ষায় রয়েছে</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-300 font-semibold">অনুমোদিত পেমেন্ট</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-300 mt-2">
                {approvedCount} টি
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">ইনভয়েস ও রসিদ তৈরি হয়েছে</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-cyan-300 font-semibold">মোট অনুমোদিত কালেকশন</span>
                <DollarSign className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black font-mono text-cyan-300 mt-2">
                {ispProfile.currencySymbol}{totalApprovedAmount}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">অনলাইন মাধ্যমে সংগৃহীত</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-rose-300 font-semibold">বাতিলকৃত রিকোয়েস্ট</span>
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black font-mono text-rose-300 mt-2">
                {rejectedCount} টি
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">অকার্যকর TrxID</span>
            </div>

          </div>

          {/* Filter Bar & Search */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Status Filter Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none">
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap transition-all ${
                    filterStatus === st
                      ? 'bg-cyan-600 border-cyan-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'All' && `সকল রিকোয়েস্ট (${paymentRequests.length})`}
                  {st === 'Pending' && `পেন্ডিং (${pendingCount})`}
                  {st === 'Approved' && `অনুমোদিত (${approvedCount})`}
                  {st === 'Rejected' && `বাতিল (${rejectedCount})`}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="TrxID, UID, নাম বা মোবাইল দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-cyan-400 focus:outline-none placeholder-slate-500 font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>

          {/* Payment Requests Table */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">গ্রাহক পেমেন্ট তালিকা ({filteredRequests.length} টি)</h3>
              <span className="text-xs text-slate-400 font-mono">
                {filterStatus} Filter Active
              </span>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="p-12 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-slate-300">কোনো পেমেন্ট রিকোয়েস্ট পাওয়া যায়নি</p>
                <p className="text-xs text-slate-500 mt-1">ফিল্টার বা সার্চ কোয়েরি পরিবর্তন করে দেখুন।</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="pb-3 px-2">গ্রাহক ও UID</th>
                      <th className="pb-3 px-2">মেথড ও TrxID</th>
                      <th className="pb-3 px-2">প্রেরক মোবাইল</th>
                      <th className="pb-3 px-2 text-right">টাকা (৳)</th>
                      <th className="pb-3 px-2">তারিখ</th>
                      <th className="pb-3 px-2">স্ট্যাটাস</th>
                      <th className="pb-3 px-2">নোট / মন্তব্য</th>
                      <th className="pb-3 px-2 text-center">অ্যাকশন (এডমিন পারমিশন)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                        
                        {/* Customer Info */}
                        <td className="py-3 px-2">
                          <strong className="text-white font-sans font-bold text-xs block">{req.customerName}</strong>
                          <span className="text-cyan-400 font-bold text-[11px] block">{req.customerUid}</span>
                          <span className="text-slate-400 text-[10px] font-sans">{req.customerMobile}</span>
                        </td>

                        {/* Method & TrxID */}
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans ${
                            req.paymentMethod === 'bKash' ? 'bg-pink-950 text-pink-300 border border-pink-500/30' :
                            req.paymentMethod === 'Nagad' ? 'bg-orange-950 text-orange-300 border border-orange-500/30' :
                            req.paymentMethod === 'Rocket' ? 'bg-purple-950 text-purple-300 border border-purple-500/30' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {req.paymentMethod}
                          </span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-cyan-300 font-bold text-xs">{req.transactionId}</span>
                            <button
                              onClick={() => handleCopy(req.transactionId, req.id)}
                              className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                              title="Copy TrxID"
                            >
                              {copiedKey === req.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>

                        {/* Sender Number */}
                        <td className="py-3 px-2 text-slate-300">
                          {req.senderNumber || 'গ্রাহকের মোবাইল'}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-2 text-right font-black text-sm text-emerald-400">
                          {ispProfile.currencySymbol}{req.amount}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-2 text-slate-300 text-[11px]">
                          {req.requestDate || req.createdAt?.substring(0, 10)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-2">
                          {req.status === 'Approved' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </span>
                          ) : req.status === 'Rejected' ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30 inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Notes */}
                        <td className="py-3 px-2 max-w-[160px] truncate font-sans text-[11px] text-slate-400">
                          {req.notes && <span className="block truncate">নোট: {req.notes}</span>}
                          {req.adminNotes && <span className="block truncate text-cyan-300">এডমিন: {req.adminNotes}</span>}
                          {!req.notes && !req.adminNotes && <span className="text-slate-600">-</span>}
                        </td>

                        {/* Admin Action Buttons */}
                        <td className="py-3 px-2 font-sans">
                          <div className="flex items-center justify-center gap-1.5">
                            
                            {/* 1. Quick Approve Button (if pending) */}
                            {req.status === 'Pending' && (
                              <button
                                onClick={() => handleApprove(req.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all"
                                title="অনুমোদন করুন ও লেজারে যোগ করুন"
                              >
                                <Check className="w-3 h-3" />
                                <span>অ্যাপ্রুভ</span>
                              </button>
                            )}

                            {/* 2. Edit Modal Button */}
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600/30 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors"
                              title="পেমেন্ট তথ্য এডিট করুন"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* 3. Quick Reject Button (if pending) */}
                            {req.status === 'Pending' && (
                              <button
                                onClick={() => handleOpenReject(req.id)}
                                className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
                                title="বাতিল করুন"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* 4. Delete Button */}
                            <button
                              onClick={() => handleDelete(req.id)}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-900/40 text-slate-500 hover:text-rose-400 border border-slate-800 transition-colors"
                              title="ডিলিট"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>
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

      {/* ========================================================================= */}
      {/* SECTION 2: CUSTOMER SUPPORT TICKETS MANAGEMENT                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'tickets' && (
        <div className="space-y-6">
          
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">গ্রাহকদের অভিযোগ ও সাপোর্ট টিকিট তালিকা</h3>
                <p className="text-xs text-slate-400 mt-0.5">গ্রাহকদের সমস্যার সমাধান করুন ও রিপ্লাই দিন</p>
              </div>
              <span className="text-xs font-mono text-cyan-300 bg-cyan-950 px-3 py-1 rounded-lg border border-cyan-800/40">
                ওপেন টিকিট: {openTicketsCount} টি
              </span>
            </div>

            {baseTickets.length === 0 ? (
              <div className="p-12 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                <Headphones className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-slate-300">কোনো সাপোর্ট টিকিট নেই</p>
              </div>
            ) : (
              <div className="space-y-3">
                {baseTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-bold border border-cyan-800/40">
                            {ticket.issueType}
                          </span>
                          <strong className="text-white text-sm font-bold">{ticket.subject}</strong>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-1 font-mono">
                          গ্রাহক: <span className="text-white font-bold">{ticket.customerName}</span> ({ticket.customerUid}) • {ticket.customerMobile}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {ticket.status === 'Resolved' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                            সমাধানকৃত (Resolved)
                          </span>
                        ) : ticket.status === 'In Progress' ? (
                          <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                            কাজ চলছে (In Progress)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                            ওপেন (Open)
                          </span>
                        )}

                        <button
                          onClick={() => {
                            if (editingTicketId === ticket.id) {
                              setEditingTicketId(null);
                            } else {
                              setEditingTicketId(ticket.id);
                              setTicketReply(ticket.adminReply || '');
                              setTicketStatus(ticket.status);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition-all"
                        >
                          {editingTicketId === ticket.id ? 'বাতিল' : 'রিপ্লাই ও স্ট্যাটাস'}
                        </button>

                        <button
                          onClick={() => deleteSupportTicket(ticket.id)}
                          className="p-1 rounded-lg hover:bg-rose-900/40 text-slate-500 hover:text-rose-400"
                          title="ডিলিট"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-200 leading-relaxed">
                      <span className="text-slate-400 text-[10px] block mb-1 font-semibold uppercase">গ্রাহকের অভিযোগ:</span>
                      {ticket.description}
                    </div>

                    {ticket.adminReply && editingTicketId !== ticket.id && (
                      <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-700/30 space-y-1">
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                          🛠️ প্রেরিত এডমিন রিপ্লাই:
                        </span>
                        <p className="text-cyan-200">{ticket.adminReply}</p>
                      </div>
                    )}

                    {/* Inline Reply & Status Edit Form */}
                    {editingTicketId === ticket.id && (
                      <div className="p-3.5 rounded-xl bg-[#0B1428] border border-cyan-500/30 space-y-3 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-1">
                            <label className="block text-slate-300 font-semibold mb-1">স্ট্যাটাস পরিবর্তন</label>
                            <select
                              value={ticketStatus}
                              onChange={(e) => setTicketStatus(e.target.value as any)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold focus:border-cyan-400 focus:outline-none"
                            >
                              <option value="Open">ওপেন (Open)</option>
                              <option value="In Progress">কাজ চলছে (In Progress)</option>
                              <option value="Resolved">সমাধানকৃত (Resolved)</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-slate-300 font-semibold mb-1">গ্রাহকের জন্য রিপ্লাই বার্তা</label>
                            <input
                              type="text"
                              value={ticketReply}
                              onChange={(e) => setTicketReply(e.target.value)}
                              placeholder="e.g. আপনার সংযোগ পরীক্ষা করা হয়েছে, লাইন এখন সচল।"
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingTicketId(null)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
                          >
                            বাতিল
                          </button>
                          <button
                            onClick={() => handleSaveTicket(ticket)}
                            className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>আপডেট পাঠান</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>টিকিট আইডি: #{ticket.id.slice(-6)}</span>
                      <span>তৈরির তারিখ: {ticket.createdAt?.substring(0, 10)}</span>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      )}

      {/* Edit Payment Request Modal */}
      <EditPaymentRequestModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
      />

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0A1020] border border-rose-500/40 rounded-2xl p-6 max-w-md w-full text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 pb-2 border-b border-slate-800">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">পেমেন্ট রিকোয়েস্ট বাতিল করুন</h3>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                আপনি কি নিশ্চিত যে এই পেমেন্ট রিকোয়েস্টটি বাতিল করতে চান? গ্রাহক তার পোর্টালে বাতিলের কারণ দেখতে পাবেন।
              </p>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">বাতিলের কারণ</label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. TrxID পাওয়া যায়নি বা ভুল হয়েছে"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-rose-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                ফিরে যান
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>বাতিল নিশ্চিত করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
