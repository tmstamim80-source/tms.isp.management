import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Reseller, ResellerTransaction, ResellerBalanceRequest, Customer } from '../types';
import { DEFAULT_RESELLERS } from '../data/seedData';
import { 
  fetchResellersFromFirestore,
  saveResellerToFirestore,
  deleteResellerFromFirestore,
  fetchResellerTransactionsFromFirestore,
  saveResellerTransactionToFirestore,
  fetchResellerBalanceRequestsFromFirestore,
  saveResellerBalanceRequestToFirestore,
  deleteResellerBalanceRequestFromFirestore,
  RESELLERS_COLLECTION,
  RESSELLER_TRANSACTIONS_COLLECTION,
  RESELLER_REQUESTS_COLLECTION
} from '../firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { useToast } from './ToastContext';

interface ResellerContextType {
  resellers: Reseller[];
  transactions: ResellerTransaction[];
  balanceRequests: ResellerBalanceRequest[];
  isLoading: boolean;
  addReseller: (data: Omit<Reseller, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Reseller>;
  updateReseller: (id: string, data: Partial<Reseller>) => Promise<Reseller>;
  deleteReseller: (id: string) => Promise<boolean>;
  rechargeResellerBalance: (
    resellerId: string, 
    amount: number, 
    paymentMethod: string, 
    notes?: string, 
    performedBy?: string
  ) => Promise<ResellerTransaction>;
  deductResellerBalanceForBill: (
    resellerId: string, 
    amount: number, 
    customerUid: string, 
    customerName: string
  ) => Promise<{ success: boolean; error?: string }>;
  submitBalanceRequest: (
    requestData: Omit<ResellerBalanceRequest, 'id' | 'requestedAt' | 'status'>
  ) => Promise<ResellerBalanceRequest>;
  approveBalanceRequest: (requestId: string, adminNotes?: string) => Promise<boolean>;
  rejectBalanceRequest: (requestId: string, reason?: string) => Promise<boolean>;
  getResellerById: (id: string) => Reseller | undefined;
  getResellerByUsername: (username: string) => Reseller | undefined;
  generateNextResellerCode: () => string;
  getResellerStats: (resellerId: string, customersList: Customer[]) => {
    totalCustomers: number;
    activeCustomers: number;
    dueCustomers: number;
    monthlyRevenue: number;
    totalDueAmount: number;
  };
  clearAllResellerData: () => Promise<void>;
}

const RESELLERS_STORAGE_KEY = 'netpulse_resellers_list';
const RESELLER_TX_STORAGE_KEY = 'netpulse_reseller_transactions';
const RESELLER_REQ_STORAGE_KEY = 'netpulse_reseller_balance_requests';

const ResellerContext = createContext<ResellerContextType | undefined>(undefined);

export const ResellerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 1. Resellers State
  // 1. Resellers State - Defaults to completely clean/zero
  const [resellers, setResellers] = useState<Reseller[]>(() => {
    const saved = localStorage.getItem(RESELLERS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Purge demo records (reseller-001, reseller-002, reseller-003)
          const clean = parsed.filter(r => r && typeof r.id === 'string' && !r.id.match(/^reseller-00[1-9]$/));
          if (clean.length !== parsed.length) {
            localStorage.setItem(RESELLERS_STORAGE_KEY, JSON.stringify(clean));
          }
          return clean;
        }
      } catch (e) {}
    }
    return [];
  });

  // 2. Reseller Transactions State - Defaults to clean/zero
  const [transactions, setTransactions] = useState<ResellerTransaction[]>(() => {
    const saved = localStorage.getItem(RESELLER_TX_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(t => t && typeof t.id === 'string' && !t.id.match(/^rtx-00[1-9]$/));
          if (clean.length !== parsed.length) {
            localStorage.setItem(RESELLER_TX_STORAGE_KEY, JSON.stringify(clean));
          }
          return clean;
        }
      } catch (e) {}
    }
    return [];
  });

  // 3. Balance Requests State - Defaults to clean/zero
  const [balanceRequests, setBalanceRequests] = useState<ResellerBalanceRequest[]>(() => {
    const saved = localStorage.getItem(RESELLER_REQ_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(r => r && typeof r.id === 'string' && !r.id.match(/^rreq-00[1-9]$/));
          if (clean.length !== parsed.length) {
            localStorage.setItem(RESELLER_REQ_STORAGE_KEY, JSON.stringify(clean));
          }
          return clean;
        }
      } catch (e) {}
    }
    return [];
  });

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem(RESELLERS_STORAGE_KEY, JSON.stringify(resellers));
  }, [resellers]);

  useEffect(() => {
    localStorage.setItem(RESELLER_TX_STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(RESELLER_REQ_STORAGE_KEY, JSON.stringify(balanceRequests));
  }, [balanceRequests]);

  // Firestore Realtime Synchronization
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;

    // Resellers snapshot
    const unsubResellers = onSnapshot(collection(db, RESELLERS_COLLECTION), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Reseller));
      setResellers(items);
      localStorage.setItem(RESELLERS_STORAGE_KEY, JSON.stringify(items));
    }, (err) => console.warn('Resellers live listener notice:', err));

    // Transactions snapshot
    const unsubTx = onSnapshot(collection(db, RESSELLER_TRANSACTIONS_COLLECTION), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ResellerTransaction));
      setTransactions(items.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
      localStorage.setItem(RESELLER_TX_STORAGE_KEY, JSON.stringify(items));
    }, (err) => console.warn('Reseller TX live listener notice:', err));

    // Requests snapshot
    const unsubReq = onSnapshot(collection(db, RESELLER_REQUESTS_COLLECTION), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ResellerBalanceRequest));
      setBalanceRequests(items.sort((a, b) => (b.requestedAt || '').localeCompare(a.requestedAt || '')));
      localStorage.setItem(RESELLER_REQ_STORAGE_KEY, JSON.stringify(items));
    }, (err) => console.warn('Reseller Req live listener notice:', err));

    return () => {
      unsubResellers();
      unsubTx();
      unsubReq();
    };
  }, []);

  // Generate Next Code (e.g. RES-04)
  const generateNextResellerCode = (): string => {
    const maxNumber = resellers.reduce((max, r) => {
      const match = r.code?.match(/RES-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextNum = maxNumber + 1;
    return `RES-${nextNum.toString().padStart(2, '0')}`;
  };

  // Add Reseller
  const addReseller = async (data: Omit<Reseller, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reseller> => {
    const newId = `reseller-${Date.now()}`;
    const newReseller: Reseller = {
      ...data,
      id: newId,
      code: data.code || generateNextResellerCode(),
      balance: Number(data.balance) || 0,
      commissionRate: Number(data.commissionRate) || 15,
      status: data.status || 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setResellers(prev => [...prev, newReseller]);

    // If initial balance > 0, log transaction
    if (newReseller.balance > 0) {
      const initialTx: ResellerTransaction = {
        id: `rtx-${Date.now()}`,
        resellerId: newReseller.id,
        resellerName: newReseller.name,
        type: 'credit',
        amount: newReseller.balance,
        balanceBefore: 0,
        balanceAfter: newReseller.balance,
        description: 'নতুন রিসেলার একাউন্ট তৈরিকালে প্রাথমিক ওয়ালেট ব্যালেন্স যোগ',
        date: new Date().toISOString().substring(0, 10),
        performedBy: 'Super Admin',
      };
      setTransactions(prev => [initialTx, ...prev]);
      if (isFirebaseConfigured) {
        saveResellerTransactionToFirestore(initialTx).catch(() => {});
      }
    }

    if (isFirebaseConfigured) {
      try {
        await saveResellerToFirestore(newReseller);
      } catch (err) {
        console.warn('Saved reseller locally, Firestore note:', err);
      }
    }

    addToast('success', 'রিসেলার যুক্ত সম্পন্ন', `${newReseller.name} সফলভাবে রিসেলার হিসেবে সিস্টেমে অন্তর্ভুক্ত হয়েছে।`);
    return newReseller;
  };

  // Update Reseller
  const updateReseller = async (id: string, data: Partial<Reseller>): Promise<Reseller> => {
    const existing = resellers.find(r => r.id === id);
    if (!existing) throw new Error('Reseller not found');

    const updated: Reseller = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    setResellers(prev => prev.map(r => r.id === id ? updated : r));

    if (isFirebaseConfigured) {
      try {
        await saveResellerToFirestore(updated);
      } catch (err) {
        console.warn('Updated reseller locally, Firestore note:', err);
      }
    }

    addToast('success', 'রিসেলার আপডেট সম্পন্ন', `${updated.name} এর তথ্য সফলভাবে আপডেট হয়েছে।`);
    return updated;
  };

  // Delete Reseller
  const deleteReseller = async (id: string): Promise<boolean> => {
    const target = resellers.find(r => r.id === id);
    if (!target) return false;

    setResellers(prev => prev.filter(r => r.id !== id));

    if (isFirebaseConfigured) {
      try {
        await deleteResellerFromFirestore(id);
      } catch (err) {
        console.warn('Deleted reseller locally, Firestore note:', err);
      }
    }

    addToast('info', 'রিসেলার মুছে ফেলা হয়েছে', `${target.name} সিস্টেম থেকে অপসারিত হয়েছে।`);
    return true;
  };

  // Top-Up / Recharge Reseller Balance (by Admin / CEO)
  const rechargeResellerBalance = async (
    resellerId: string,
    amount: number,
    paymentMethod: string,
    notes?: string,
    performedBy: string = 'Super Admin'
  ): Promise<ResellerTransaction> => {
    const target = resellers.find(r => r.id === resellerId);
    if (!target) throw new Error('রিসেলার পাওয়া যায়নি।');

    const numAmount = Number(amount);
    if (numAmount <= 0) throw new Error('রিচার্জের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে।');

    const balanceBefore = target.balance;
    const balanceAfter = balanceBefore + numAmount;

    // 1. Update Reseller balance
    const updatedReseller: Reseller = {
      ...target,
      balance: balanceAfter,
      updatedAt: new Date().toISOString(),
    };
    setResellers(prev => prev.map(r => r.id === resellerId ? updatedReseller : r));

    // 2. Create Audit Transaction
    const tx: ResellerTransaction = {
      id: `rtx-${Date.now()}`,
      resellerId,
      resellerName: target.name,
      type: 'recharge',
      amount: numAmount,
      balanceBefore,
      balanceAfter,
      description: `ওয়ালেট রিচার্জ (মাধ্যম: ${paymentMethod}${notes ? ` - ${notes}` : ''})`,
      date: new Date().toISOString().substring(0, 10),
      performedBy,
    };
    setTransactions(prev => [tx, ...prev]);

    if (isFirebaseConfigured) {
      saveResellerToFirestore(updatedReseller).catch(() => {});
      saveResellerTransactionToFirestore(tx).catch(() => {});
    }

    addToast(
      'success',
      'ব্যালেন্স রিচার্জ সম্পন্ন',
      `${target.name} এর ওয়ালেটে ৳${numAmount.toLocaleString('en-IN')} যোগ করা হয়েছে। নতুন ব্যালেন্স: ৳${balanceAfter.toLocaleString('en-IN')}`
    );

    return tx;
  };

  // Deduct Reseller Balance when paying a Customer bill
  const deductResellerBalanceForBill = async (
    resellerId: string,
    amount: number,
    customerUid: string,
    customerName: string
  ): Promise<{ success: boolean; error?: string }> => {
    const target = resellers.find(r => r.id === resellerId);
    if (!target) {
      return { success: false, error: 'নির্দিষ্ট রিসেলার একাউন্ট পাওয়া যায়নি।' };
    }

    const numAmount = Number(amount);
    if (target.billingType === 'prepaid' && target.balance < numAmount) {
      return { 
        success: false, 
        error: `রিসেলারের ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই! বর্তমান ব্যালেন্স: ৳${target.balance} কিন্তু প্রয়োজন ৳${numAmount}। দয়া করে আগে ওয়ালেট রিচার্জ করুন।` 
      };
    }

    const balanceBefore = target.balance;
    const balanceAfter = balanceBefore - numAmount;

    // 1. Update Reseller balance
    const updatedReseller: Reseller = {
      ...target,
      balance: balanceAfter,
      updatedAt: new Date().toISOString(),
    };
    setResellers(prev => prev.map(r => r.id === resellerId ? updatedReseller : r));

    // 2. Create Transaction
    const tx: ResellerTransaction = {
      id: `rtx-${Date.now()}`,
      resellerId,
      resellerName: target.name,
      type: 'debit',
      amount: numAmount,
      balanceBefore,
      balanceAfter,
      description: `গ্রাহক ${customerName} (${customerUid}) এর বিল রিচার্জ বাবদ কর্তন`,
      date: new Date().toISOString().substring(0, 10),
      performedBy: target.ownerName || target.name,
      customerUid,
      customerName,
    };
    setTransactions(prev => [tx, ...prev]);

    if (isFirebaseConfigured) {
      saveResellerToFirestore(updatedReseller).catch(() => {});
      saveResellerTransactionToFirestore(tx).catch(() => {});
    }

    return { success: true };
  };

  // Submit Balance Request (by Reseller)
  const submitBalanceRequest = async (
    requestData: Omit<ResellerBalanceRequest, 'id' | 'requestedAt' | 'status'>
  ): Promise<ResellerBalanceRequest> => {
    const newReq: ResellerBalanceRequest = {
      ...requestData,
      id: `rreq-${Date.now()}`,
      requestedAt: new Date().toISOString(),
      status: 'Pending',
    };

    setBalanceRequests(prev => [newReq, ...prev]);

    if (isFirebaseConfigured) {
      saveResellerBalanceRequestToFirestore(newReq).catch(() => {});
    }

    addToast('success', 'রিকোয়েস্ট পাঠানো হয়েছে', 'আপনার ওয়ালেট রিচার্জ রিকোয়েস্ট সফলভাবে জমা হয়েছে। এডমিন দ্রুত অনুমোদন করবেন।');
    return newReq;
  };

  // Approve Balance Request (by Super Admin)
  const approveBalanceRequest = async (requestId: string, adminNotes?: string): Promise<boolean> => {
    const req = balanceRequests.find(r => r.id === requestId);
    if (!req) return false;

    // 1. Credit the reseller
    await rechargeResellerBalance(
      req.resellerId,
      req.amount,
      req.paymentMethod,
      `অনলাইন রিকোয়েস্ট অনুমোদন (TrxID: ${req.transactionId})${adminNotes ? ` | ${adminNotes}` : ''}`,
      'Super Admin'
    );

    // 2. Mark request approved
    const updatedReq: ResellerBalanceRequest = {
      ...req,
      status: 'Approved',
      processedAt: new Date().toISOString(),
      adminNotes,
    };
    setBalanceRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));

    if (isFirebaseConfigured) {
      saveResellerBalanceRequestToFirestore(updatedReq).catch(() => {});
    }

    addToast('success', 'রিকোয়েস্ট অনুমোদিত', `রিসেলার ${req.resellerName} এর ৳${req.amount} ব্যালেন্স সফলভাবে যোগ হয়েছে।`);
    return true;
  };

  // Reject Balance Request
  const rejectBalanceRequest = async (requestId: string, reason?: string): Promise<boolean> => {
    const req = balanceRequests.find(r => r.id === requestId);
    if (!req) return false;

    const updatedReq: ResellerBalanceRequest = {
      ...req,
      status: 'Rejected',
      processedAt: new Date().toISOString(),
      adminNotes: reason,
    };
    setBalanceRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));

    if (isFirebaseConfigured) {
      saveResellerBalanceRequestToFirestore(updatedReq).catch(() => {});
    }

    addToast('info', 'রিকোয়েস্ট বাতিল', `রিকোয়েস্টটি বাতিল করা হয়েছে।`);
    return true;
  };

  const getResellerById = (id: string): Reseller | undefined => {
    return resellers.find(r => r.id === id);
  };

  const getResellerByUsername = (username: string): Reseller | undefined => {
    if (!username) return undefined;
    const clean = String(username).trim().toLowerCase();
    return resellers.find(r => r && r.username && String(r.username).trim().toLowerCase() === clean);
  };

  // Calculate statistics for a single reseller based on current customers
  const getResellerStats = (resellerId: string, customersList: Customer[]) => {
    const resellerCustomers = customersList.filter(c => c.resellerId === resellerId);
    const active = resellerCustomers.filter(c => c.status === 'Active').length;
    const due = resellerCustomers.filter(c => c.dueAmount > 0 || c.paymentStatus === 'Due').length;
    const monthlyRev = resellerCustomers.reduce((sum, c) => sum + (c.monthlyBill || 0), 0);
    const totalDue = resellerCustomers.reduce((sum, c) => sum + (c.dueAmount || 0), 0);

    return {
      totalCustomers: resellerCustomers.length,
      activeCustomers: active,
      dueCustomers: due,
      monthlyRevenue: monthlyRev,
      totalDueAmount: totalDue,
    };
  };

  // Clear all reseller data (resets to zero)
  const clearAllResellerData = async (): Promise<void> => {
    const prevResellers = [...resellers];
    const prevReqs = [...balanceRequests];

    setResellers([]);
    setTransactions([]);
    setBalanceRequests([]);

    localStorage.removeItem(RESELLERS_STORAGE_KEY);
    localStorage.removeItem(RESELLER_TX_STORAGE_KEY);
    localStorage.removeItem(RESELLER_REQ_STORAGE_KEY);

    if (isFirebaseConfigured) {
      for (const r of prevResellers) {
        deleteResellerFromFirestore(r.id).catch(() => {});
      }
      for (const req of prevReqs) {
        deleteResellerBalanceRequestFromFirestore(req.id).catch(() => {});
      }
    }

    addToast('info', 'রিসেলার ডাটা শূন্য করা হয়েছে', 'সকল ডেমো রিসেলার ও ট্রানজেকশন সফলভাবে মুছে ফেলা হয়েছে।');
  };

  return (
    <ResellerContext.Provider
      value={{
        resellers,
        transactions,
        balanceRequests,
        isLoading,
        addReseller,
        updateReseller,
        deleteReseller,
        rechargeResellerBalance,
        deductResellerBalanceForBill,
        submitBalanceRequest,
        approveBalanceRequest,
        rejectBalanceRequest,
        getResellerById,
        getResellerByUsername,
        generateNextResellerCode,
        getResellerStats,
        clearAllResellerData,
      }}
    >
      {children}
    </ResellerContext.Provider>
  );
};

export const useReseller = (): ResellerContextType => {
  const ctx = useContext(ResellerContext);
  if (!ctx) {
    throw new Error('useReseller must be used within a ResellerProvider');
  }
  return ctx;
};
