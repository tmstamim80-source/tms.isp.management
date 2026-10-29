import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Customer, PaymentRecord, DashboardStats, ISPProfile, ISPPackage, PaymentRequest, SupportTicket } from '../types';
import { INITIAL_CUSTOMERS, INITIAL_PAYMENTS, DEFAULT_ISP_PROFILE, DEFAULT_PACKAGES } from '../data/seedData';
import { 
  fetchCustomersFromFirestore, 
  saveCustomerToFirestore, 
  deleteCustomerFromFirestore,
  fetchPaymentsFromFirestore,
  savePaymentToFirestore,
  deletePaymentFromFirestore,
  fetchPackagesFromFirestore,
  savePackageToFirestore,
  deletePackageFromFirestore,
  saveSettingsToFirestore,
  savePaymentRequestToFirestore,
  deletePaymentRequestFromFirestore,
  saveTicketToFirestore,
  deleteTicketFromFirestore,
  CUSTOMERS_COLLECTION,
  PAYMENTS_COLLECTION,
  PACKAGES_COLLECTION,
  SETTINGS_COLLECTION,
  PAYMENT_REQUESTS_COLLECTION,
  SUPPORT_TICKETS_COLLECTION,
  syncAllDataToFirestore,
  MasterSyncResult,
  testFirestoreConnection,
} from '../firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { collection, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useToast } from './ToastContext';

interface CustomerContextType {
  customers: Customer[];
  payments: PaymentRecord[];
  packages: ISPPackage[];
  paymentRequests: PaymentRequest[];
  supportTickets: SupportTicket[];
  ispProfile: ISPProfile;
  stats: DashboardStats;
  isLoading: boolean;
  isFirebaseActive: boolean;
  addCustomer: (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  updateCustomer: (id: string, customerData: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<boolean>;
  recordPayment: (paymentData: Omit<PaymentRecord, 'id' | 'createdAt' | 'receiptNumber'>) => Promise<PaymentRecord>;
  updatePayment: (id: string, paymentData: Partial<PaymentRecord>) => Promise<PaymentRecord>;
  deletePayment: (id: string) => Promise<boolean>;
  clearAllPayments: () => Promise<void>;
  submitPaymentRequest: (requestData: Omit<PaymentRequest, 'id' | 'createdAt' | 'status'>) => Promise<PaymentRequest>;
  updatePaymentRequest: (id: string, requestData: Partial<PaymentRequest>) => Promise<PaymentRequest>;
  approvePaymentRequest: (id: string, adminNotes?: string) => Promise<PaymentRecord>;
  rejectPaymentRequest: (id: string, reason?: string) => Promise<boolean>;
  deletePaymentRequest: (id: string) => Promise<boolean>;
  addSupportTicket: (ticketData: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>) => Promise<SupportTicket>;
  updateSupportTicket: (id: string, ticketData: Partial<SupportTicket>) => Promise<SupportTicket>;
  deleteSupportTicket: (id: string) => Promise<boolean>;
  addPackage: (packageData: Omit<ISPPackage, 'id'>) => Promise<ISPPackage>;
  updatePackage: (id: string, packageData: Partial<ISPPackage>) => Promise<ISPPackage>;
  deletePackage: (id: string) => Promise<boolean>;
  generateNextUID: () => string;
  searchCustomers: (queryText: string) => Customer[];
  getCustomerById: (id: string) => Customer | undefined;
  getCustomerByUid: (uid: string) => Customer | undefined;
  seedDemoData: () => Promise<void>;
  resetToDemoData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  updateIspProfile: (profile: Partial<ISPProfile>) => void;
  updateISPProfile: (profile: Partial<ISPProfile>) => void;
  syncAllLocalDataToRealtimeDatabase: () => Promise<MasterSyncResult>;
}

const CUSTOMERS_LOCAL_KEY = 'netpulse_customers_data';
const PAYMENTS_LOCAL_KEY = 'netpulse_payments_data';
const PACKAGES_LOCAL_KEY = 'netpulse_packages_data';
const PROFILE_LOCAL_KEY = 'netpulse_isp_profile';
const REQUESTS_LOCAL_KEY = 'netpulse_payment_requests';
const TICKETS_LOCAL_KEY = 'netpulse_support_tickets';

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { addToast } = useToast();

  // 1. Customers State
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(CUSTOMERS_LOCAL_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Remove any previous demo records (cust-1 to cust-8)
          const cleanList = parsed.filter(
            (c) => c && typeof c.id === 'string' && !c.id.match(/^cust-[1-8]$/)
          );
          if (cleanList.length !== parsed.length) {
            localStorage.setItem(CUSTOMERS_LOCAL_KEY, JSON.stringify(cleanList));
          }
          return cleanList;
        }
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // 2. Payments State
  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem(PAYMENTS_LOCAL_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some(p => p.id === 'pay-1' || p.id === 'pay-2' || p.id === 'pay-3')) {
          localStorage.removeItem(PAYMENTS_LOCAL_KEY);
          return [];
        }
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // 3. Packages State
  const [packages, setPackages] = useState<ISPPackage[]>(() => {
    const saved = localStorage.getItem(PACKAGES_LOCAL_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        return DEFAULT_PACKAGES;
      }
    }
    return DEFAULT_PACKAGES;
  });

  // 4. ISP Profile State
  const [ispProfile, setIspProfile] = useState<ISPProfile>(() => {
    const saved = localStorage.getItem(PROFILE_LOCAL_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_ISP_PROFILE;
      }
    }
    return DEFAULT_ISP_PROFILE;
  });

  // 5. Payment Requests State
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>(() => {
    const saved = localStorage.getItem(REQUESTS_LOCAL_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // 6. Support Tickets State
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
    const saved = localStorage.getItem(TICKETS_LOCAL_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFirebaseActive, setIsFirebaseActive] = useState<boolean>(isFirebaseConfigured);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(CUSTOMERS_LOCAL_KEY, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(PAYMENTS_LOCAL_KEY, JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem(PACKAGES_LOCAL_KEY, JSON.stringify(packages));
  }, [packages]);

  useEffect(() => {
    localStorage.setItem(PROFILE_LOCAL_KEY, JSON.stringify(ispProfile));
  }, [ispProfile]);

  useEffect(() => {
    localStorage.setItem(REQUESTS_LOCAL_KEY, JSON.stringify(paymentRequests));
  }, [paymentRequests]);

  useEffect(() => {
    localStorage.setItem(TICKETS_LOCAL_KEY, JSON.stringify(supportTickets));
  }, [supportTickets]);

  // Firestore Real-time listener when Firebase is active
  useEffect(() => {
    if (isFirebaseConfigured && db) {
      setIsLoading(true);
      // Test initial database connection as per Firebase skill
      testFirestoreConnection().catch(() => {});
      try {
        // 1. Real-time Customers Listener
        const custColl = collection(db, CUSTOMERS_COLLECTION);
        const unsubscribeCust = onSnapshot(custColl, (snapshot) => {
          if (!snapshot.empty) {
            const rawDocs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Customer));
            // Filter out old demo user entries and sort by createdAt descending
            const realCustomers = rawDocs
              .filter((c) => {
                if (c.id && c.id.match(/^cust-[1-8]$/)) {
                  deleteCustomerFromFirestore(c.id).catch(() => {});
                  return false;
                }
                return true;
              })
              .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            setCustomers(realCustomers);
          } else {
            // If firestore is empty, check if we have any local customers to sync to realtime database
            const saved = localStorage.getItem(CUSTOMERS_LOCAL_KEY);
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  const nonDemo = parsed.filter((c: any) => c && !c.id?.match(/^cust-[1-8]$/));
                  if (nonDemo.length > 0) {
                    nonDemo.forEach((c: any) => saveCustomerToFirestore(c).catch(() => {}));
                    setCustomers(nonDemo);
                  } else {
                    setCustomers([]);
                  }
                } else {
                  setCustomers([]);
                }
              } catch (e) {
                setCustomers([]);
              }
            } else {
              setCustomers([]);
            }
          }
          setIsLoading(false);
          setIsFirebaseActive(true);
        }, (error) => {
          console.warn('Firestore snapshot error on customers:', error);
          setIsLoading(false);
        });

        // 2. Real-time Payments Listener
        const payQuery = query(collection(db, PAYMENTS_COLLECTION), orderBy('createdAt', 'desc'));
        const unsubscribePay = onSnapshot(payQuery, (snapshot) => {
          if (!snapshot.empty) {
            const firestorePayments = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));
            setPayments(firestorePayments);
          } else {
            const saved = localStorage.getItem(PAYMENTS_LOCAL_KEY);
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  const nonDemo = parsed.filter((p: any) => p && !p.id?.match(/^pay-[1-3]$/));
                  if (nonDemo.length > 0) {
                    nonDemo.forEach((p: any) => savePaymentToFirestore(p).catch(() => {}));
                    setPayments(nonDemo);
                  }
                }
              } catch (e) {}
            }
          }
        }, (error) => {
          console.warn('Firestore snapshot error on payments:', error);
        });

        // 3. Real-time Packages Listener
        const pkgQuery = collection(db, PACKAGES_COLLECTION);
        const unsubscribePkg = onSnapshot(pkgQuery, (snapshot) => {
          if (!snapshot.empty) {
            const firestorePackages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ISPPackage));
            setPackages(firestorePackages);
          } else {
            // Seed initial packages into firestore if completely empty
            DEFAULT_PACKAGES.forEach((p) => savePackageToFirestore(p));
          }
        }, (error) => {
          console.warn('Firestore snapshot error on packages:', error);
        });

        // 4. Real-time Settings Listener
        const settingsRef = doc(db, SETTINGS_COLLECTION, 'isp_profile');
        const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
          if (snapshot.exists()) {
            setIspProfile(snapshot.data() as ISPProfile);
          }
        }, (error) => {
          console.warn('Firestore snapshot error on settings:', error);
        });

        // 5. Real-time Payment Requests Listener
        const reqQuery = query(collection(db, PAYMENT_REQUESTS_COLLECTION), orderBy('createdAt', 'desc'));
        const unsubscribeReq = onSnapshot(reqQuery, (snapshot) => {
          if (!snapshot.empty) {
            const reqs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRequest));
            setPaymentRequests(reqs);
          }
        }, (error) => {
          console.warn('Firestore snapshot error on payment requests:', error);
        });

        // 6. Real-time Support Tickets Listener
        const ticketQuery = query(collection(db, SUPPORT_TICKETS_COLLECTION), orderBy('createdAt', 'desc'));
        const unsubscribeTickets = onSnapshot(ticketQuery, (snapshot) => {
          if (!snapshot.empty) {
            const t = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SupportTicket));
            setSupportTickets(t);
          }
        }, (error) => {
          console.warn('Firestore snapshot error on support tickets:', error);
        });

        return () => {
          unsubscribeCust();
          unsubscribePay();
          unsubscribePkg();
          unsubscribeSettings();
          unsubscribeReq();
          unsubscribeTickets();
        };
      } catch (err) {
        console.error('Firebase snapshot setup error:', err);
        setIsLoading(false);
      }
    }
  }, []);

  // Calculate Dashboard Statistics
  const stats: DashboardStats = React.useMemo(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter((c) => c.status === 'Active').length;
    const inactiveCustomers = customers.filter((c) => c.status === 'Inactive').length;
    const dueCustomers = customers.filter((c) => c.status === 'Due' || (c.dueAmount || 0) > 0).length;
    const suspendedCustomers = customers.filter((c) => c.status === 'Suspended').length;

    const monthlyRevenue = customers
      .filter((c) => c.status !== 'Inactive')
      .reduce((sum, c) => sum + (c.monthlyBill || 0), 0);

    const totalDueAmount = customers.reduce((sum, c) => sum + (c.dueAmount || 0), 0);
    const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const newCustomersThisMonth = customers.filter((c) => {
      const connDate = c.connectionDate || c.createdAt?.substring(0, 10);
      return connDate && connDate.startsWith(currentMonthPrefix);
    }).length;

    const totalExpected = monthlyRevenue + totalDueAmount;
    const collectionRate = totalExpected > 0 ? Math.round(((totalExpected - totalDueAmount) / totalExpected) * 100) : 100;

    return {
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      dueCustomers,
      suspendedCustomers,
      monthlyRevenue,
      totalDueAmount,
      totalDue: totalDueAmount,
      totalCollected,
      newCustomersThisMonth,
      newThisMonth: newCustomersThisMonth,
      collectionRate,
    };
  }, [customers, payments]);

  // Generate Automatic Unique UID (e.g. WIFI-000001, WIFI-000002)
  const generateNextUID = useCallback((): string => {
    const existingNums = customers
      .map((c) => {
        if (!c || !c.uid || typeof c.uid !== 'string') return 0;
        const match = c.uid.match(/WIFI-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((num) => !isNaN(num) && num > 0);

    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    const nextNum = maxNum + 1;
    return `WIFI-${String(nextNum).padStart(6, '0')}`;
  }, [customers]);

  // Enhanced Search function
  const searchCustomers = useCallback((queryText: string): Customer[] => {
    const q = queryText.trim().toLowerCase();
    if (!q) return [];
    const qClean = q.replace(/[^a-z0-9]/g, '');

    return customers.filter((customer) => {
      if (!customer) return false;
      const uid = (customer.uid || '').toLowerCase();
      const uidClean = uid.replace(/[^a-z0-9]/g, '');
      const name = (customer.name || '').toLowerCase();
      const mobile = (customer.mobile || '').replace(/[^0-9]/g, '');
      const altMobile = (customer.alternativeMobile || '').replace(/[^0-9]/g, '');
      const email = (customer.email || '').toLowerCase();
      const wifiUser = (customer.wifiUsername || '').toLowerCase();
      const area = (customer.area || '').toLowerCase();
      const ip = (customer.ipAddress || '').toLowerCase();
      const mac = (customer.macAddress || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const reseller = (customer.resellerName || '').toLowerCase();

      return (
        name.includes(q) ||
        uid.includes(q) ||
        (qClean && uidClean.includes(qClean)) ||
        (qClean && mobile.includes(qClean)) ||
        (qClean && altMobile.includes(qClean)) ||
        email.includes(q) ||
        wifiUser.includes(q) ||
        area.includes(q) ||
        ip.includes(q) ||
        (qClean && mac.includes(qClean)) ||
        reseller.includes(q)
      );
    });
  }, [customers]);

  const getCustomerById = useCallback((id: string) => {
    if (!id) return undefined;
    return customers.find((c) => c && c.id === id);
  }, [customers]);

  const getCustomerByUid = useCallback((uid: string) => {
    if (!uid) return undefined;
    const cleanUid = String(uid).trim().toLowerCase();
    return customers.find((c) => c && c.uid && String(c.uid).trim().toLowerCase() === cleanUid);
  }, [customers]);

  // ==================== Customer CRUD ====================
  const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
    const newId = `cust-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    let finalUid = String(customerData.uid || '').trim();
    if (!finalUid || customers.some(c => c && c.uid && String(c.uid).trim().toLowerCase() === finalUid.toLowerCase())) {
      finalUid = generateNextUID();
    }

    const newCustomer: Customer = {
      ...customerData,
      id: newId,
      uid: finalUid,
      monthlyFee: customerData.monthlyFee || customerData.monthlyBill,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setCustomers((prev) => [newCustomer, ...prev]);

    if (isFirebaseConfigured) {
      try {
        await saveCustomerToFirestore(newCustomer);
      } catch (err) {
        console.warn('Saved locally, Firestore sync note:', err);
      }
    }

    addToast('success', 'Customer Added', `Customer ${newCustomer.name} (${newCustomer.uid}) registered successfully.`);
    return newCustomer;
  };

  const updateCustomer = async (id: string, customerData: Partial<Customer>): Promise<Customer> => {
    const timestamp = new Date().toISOString();
    
    // Find from current state or fallback
    const existing = customers.find((c) => c.id === id || c.uid === id);
    const updatedCustomer: Customer = existing
      ? {
          ...existing,
          ...customerData,
          updatedAt: timestamp,
        }
      : ({
          id,
          updatedAt: timestamp,
          ...customerData,
        } as Customer);

    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === id || (existing && c.id === existing.id));
      if (!exists && existing) {
        return [updatedCustomer, ...prev];
      }
      return prev.map((cust) => (cust.id === id || (existing && cust.id === existing.id) ? updatedCustomer : cust));
    });

    if (isFirebaseConfigured) {
      try {
        await saveCustomerToFirestore(updatedCustomer);
      } catch (err) {
        console.warn('Updated locally, Firestore sync note:', err);
      }
    }

    addToast('success', 'Customer Updated', `Customer ${updatedCustomer.name || id} details updated.`);
    return updatedCustomer;
  };

  const deleteCustomer = async (id: string): Promise<boolean> => {
    const custToDelete = customers.find((c) => c.id === id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));

    // Also remove all associated payments, payment requests, and support tickets
    const associatedPayments = payments.filter((p) => p.customerId === id);
    setPayments((prev) => prev.filter((p) => p.customerId !== id));

    const associatedRequests = paymentRequests.filter(
      (r) => r.customerId === id || (custToDelete && (r.customerMobile === custToDelete.mobile || r.customerUid === custToDelete.uid))
    );
    setPaymentRequests((prev) =>
      prev.filter(
        (r) => r.customerId !== id && (!custToDelete || (r.customerMobile !== custToDelete.mobile && r.customerUid !== custToDelete.uid))
      )
    );

    const associatedTickets = supportTickets.filter(
      (t) => t.customerId === id || (custToDelete && (t.customerMobile === custToDelete.mobile || t.customerUid === custToDelete.uid))
    );
    setSupportTickets((prev) =>
      prev.filter(
        (t) => t.customerId !== id && (!custToDelete || (t.customerMobile !== custToDelete.mobile && t.customerUid !== custToDelete.uid))
      )
    );

    if (isFirebaseConfigured) {
      try {
        await deleteCustomerFromFirestore(id);
        for (const p of associatedPayments) {
          deletePaymentFromFirestore(p.id).catch(() => {});
        }
        for (const r of associatedRequests) {
          deletePaymentRequestFromFirestore(r.id).catch(() => {});
        }
        for (const t of associatedTickets) {
          deleteTicketFromFirestore(t.id).catch(() => {});
        }
      } catch (err) {
        console.warn('Deleted locally, Firestore sync note:', err);
      }
    }

    addToast('success', 'গ্রাহক ডিলিট সম্পন্ন', `গ্রাহক ${custToDelete?.name || id} এবং সম্পর্কিত সকল ডাটা সফলভাবে মুছে ফেলা হয়েছে।`);
    return true;
  };

  // ==================== Payment CRUD ====================
  const recordPayment = async (paymentData: Omit<PaymentRecord, 'id' | 'createdAt' | 'receiptNumber'>): Promise<PaymentRecord> => {
    const newId = `pay-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    const existingRecNums = payments
      .map((p) => {
        const match = p.receiptNumber?.match(/REC-\d+-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((num) => !isNaN(num) && num > 0);
    const nextRecNum = (existingRecNums.length > 0 ? Math.max(...existingRecNums) : 0) + 1;
    const receiptNumber = `REC-${new Date().getFullYear()}-${String(nextRecNum).padStart(4, '0')}`;

    const newPayment: PaymentRecord = {
      ...paymentData,
      id: newId,
      receiptNumber,
      createdAt: timestamp,
    };

    setPayments((prev) => [newPayment, ...prev]);

    // Automatically update customer balance
    const customer = customers.find((c) => c.id === paymentData.customerId || c.uid === paymentData.customerUid);
    if (customer) {
      const newDue = Math.max(0, (customer.dueAmount || 0) - paymentData.amount);
      const newPaymentStatus = newDue === 0 ? 'Paid' : newDue < (customer.monthlyBill || 0) ? 'Partial' : 'Due';
      const newStatus = customer.status === 'Due' && newDue === 0 ? 'Active' : customer.status;

      const payDateObj = new Date(paymentData.paymentDate || new Date());
      payDateObj.setMonth(payDateObj.getMonth() + 1);
      const nextPayDate = payDateObj.toISOString().substring(0, 10);

      try {
        await updateCustomer(customer.id, {
          lastPaymentDate: paymentData.paymentDate,
          lastPaymentAmount: paymentData.amount,
          dueAmount: newDue,
          nextPaymentDate: nextPayDate,
          paymentStatus: newPaymentStatus,
          status: newStatus,
        });
      } catch (err) {
        console.warn('Balance auto-update sync note:', err);
      }
    }

    if (isFirebaseConfigured) {
      try {
        await savePaymentToFirestore(newPayment);
      } catch (err) {
        console.warn('Payment recorded locally, Firestore note:', err);
      }
    }

    addToast('success', 'Payment Received', `Payment of ${ispProfile.currencySymbol}${paymentData.amount} received for ${paymentData.customerName}.`);
    return newPayment;
  };

  const updatePayment = async (id: string, paymentData: Partial<PaymentRecord>): Promise<PaymentRecord> => {
    const existing = payments.find((p) => p.id === id);
    const updatedPayment: PaymentRecord = existing
      ? { ...existing, ...paymentData }
      : ({ id, ...paymentData } as PaymentRecord);

    setPayments((prev) =>
      prev.map((pay) => (pay.id === id ? updatedPayment : pay))
    );

    if (isFirebaseConfigured) {
      try {
        await savePaymentToFirestore(updatedPayment);
      } catch (err) {
        console.warn('Payment updated locally, Firestore note:', err);
      }
    }

    addToast('success', 'Payment Updated', `Receipt ${updatedPayment.receiptNumber || id} updated successfully.`);
    return updatedPayment;
  };

  const deletePayment = async (id: string): Promise<boolean> => {
    const payToDelete = payments.find((p) => p.id === id);
    setPayments((prev) => prev.filter((p) => p.id !== id));

    if (isFirebaseConfigured) {
      try {
        await deletePaymentFromFirestore(id);
      } catch (err) {
        console.warn('Payment deleted locally, Firestore note:', err);
      }
    }

    addToast('success', 'Payment Deleted', `Receipt ${payToDelete?.receiptNumber || id} deleted.`);
    return true;
  };

  const clearAllPayments = async () => {
    setPayments([]);
    localStorage.removeItem(PAYMENTS_LOCAL_KEY);
    addToast('info', 'Payments Cleared', 'All payment records have been reset to 0.');
  };

  // ==================== Package CRUD ====================
  const addPackage = async (packageData: Omit<ISPPackage, 'id'>): Promise<ISPPackage> => {
    const newId = `pkg-${Date.now()}`;
    const newPkg: ISPPackage = {
      ...packageData,
      id: newId,
    };

    setPackages((prev) => [...prev, newPkg]);

    if (isFirebaseConfigured) {
      try {
        await savePackageToFirestore(newPkg);
      } catch (err) {
        console.warn('Saved package locally, Firestore note:', err);
      }
    }

    addToast('success', 'Package Added', `Internet package "${newPkg.name}" (${newPkg.speed}) added successfully.`);
    return newPkg;
  };

  const updatePackage = async (id: string, packageData: Partial<ISPPackage>): Promise<ISPPackage> => {
    const existing = packages.find((p) => p.id === id);
    const updatedPkg: ISPPackage = existing
      ? { ...existing, ...packageData }
      : ({ id, ...packageData } as ISPPackage);

    setPackages((prev) =>
      prev.map((pkg) => (pkg.id === id ? updatedPkg : pkg))
    );

    if (isFirebaseConfigured) {
      try {
        await savePackageToFirestore(updatedPkg);
      } catch (err) {
        console.warn('Updated package locally, Firestore note:', err);
      }
    }

    addToast('success', 'Package Updated', `Internet package "${updatedPkg.name || id}" updated successfully.`);
    return updatedPkg;
  };

  const deletePackage = async (id: string): Promise<boolean> => {
    const pkgToDelete = packages.find((p) => p.id === id);
    if (packages.length <= 1) {
      addToast('error', 'Action Denied', 'At least one internet package must remain in the system.');
      return false;
    }

    setPackages((prev) => prev.filter((p) => p.id !== id));

    if (isFirebaseConfigured) {
      try {
        await deletePackageFromFirestore(id);
      } catch (err) {
        console.warn('Deleted package locally, Firestore note:', err);
      }
    }

    addToast('success', 'Package Deleted', `Package "${pkgToDelete?.name || id}" has been removed.`);
    return true;
  };

  // ==================== Payment Requests CRUD ====================
  const submitPaymentRequest = async (requestData: Omit<PaymentRequest, 'id' | 'createdAt' | 'status'>): Promise<PaymentRequest> => {
    const newId = `req-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newReq: PaymentRequest = {
      ...requestData,
      id: newId,
      status: 'Pending',
      createdAt: timestamp,
    };

    setPaymentRequests((prev) => [newReq, ...prev]);

    if (isFirebaseConfigured) {
      try {
        await savePaymentRequestToFirestore(newReq);
      } catch (err) {
        console.warn('Saved payment request locally, Firestore note:', err);
      }
    }

    addToast('success', 'পেমেন্ট রিকোয়েস্ট জমা হয়েছে', `TrxID: ${newReq.transactionId} (${ispProfile.currencySymbol}${newReq.amount}) এডমিন ভেরিফিকেশনের জন্য সফলভাবে পাঠানো হয়েছে।`);
    return newReq;
  };

  const updatePaymentRequest = async (id: string, requestData: Partial<PaymentRequest>): Promise<PaymentRequest> => {
    const existing = paymentRequests.find((r) => r.id === id);
    const updatedReq: PaymentRequest = existing
      ? { ...existing, ...requestData }
      : ({ id, ...requestData } as PaymentRequest);

    setPaymentRequests((prev) =>
      prev.map((r) => (r.id === id ? updatedReq : r))
    );

    if (isFirebaseConfigured) {
      try {
        await savePaymentRequestToFirestore(updatedReq);
      } catch (err) {
        console.warn('Updated payment request locally, Firestore note:', err);
      }
    }

    addToast('success', 'রিকোয়েস্ট আপডেট সফল', `পেমেন্ট রিকোয়েস্ট #${updatedReq.transactionId || id} তথ্য আপডেট করা হয়েছে।`);
    return updatedReq;
  };

  const approvePaymentRequest = async (id: string, adminNotes?: string): Promise<PaymentRecord> => {
    const req = paymentRequests.find((r) => r.id === id);
    if (!req) {
      throw new Error('Payment request not found');
    }

    const timestamp = new Date().toISOString();
    const today = timestamp.substring(0, 10);

    // 1. Record official payment in system (this automatically decreases customer due amount)
    const newPayment = await recordPayment({
      customerId: req.customerId,
      customerUid: req.customerUid,
      customerName: req.customerName,
      customerMobile: req.customerMobile,
      amount: req.amount,
      paymentMethod: (req.paymentMethod as any) || 'bKash',
      transactionId: req.transactionId,
      paymentDate: req.requestDate || today,
      notes: req.notes ? `Verified Request: ${req.notes}` : 'Customer Online Payment Verified',
    });

    // 2. Mark request as Approved
    const updatedReq: PaymentRequest = {
      ...req,
      status: 'Approved',
      adminNotes: adminNotes || req.adminNotes || 'Approved by Admin',
      processedAt: timestamp,
      processedBy: 'Admin',
      receiptNumber: newPayment.receiptNumber,
    };

    setPaymentRequests((prev) =>
      prev.map((r) => (r.id === id ? updatedReq : r))
    );

    if (isFirebaseConfigured) {
      try {
        await savePaymentRequestToFirestore(updatedReq);
      } catch (err) {
        console.warn('Saved approved request to Firestore note:', err);
      }
    }

    addToast('success', 'পেমেন্ট অনুমোদিত ও লেজার সমন্বয়', `গ্রাহক ${req.customerName}-এর ৳${req.amount} পেমেন্ট গ্রহণ করা হয়েছে ও ইনভয়েস তৈরি হয়েছে।`);
    return newPayment;
  };

  const rejectPaymentRequest = async (id: string, reason?: string): Promise<boolean> => {
    const req = paymentRequests.find((r) => r.id === id);
    if (!req) return false;

    const timestamp = new Date().toISOString();
    const updatedReq: PaymentRequest = {
      ...req,
      status: 'Rejected',
      adminNotes: reason || 'Invalid or unverifiable transaction ID',
      processedAt: timestamp,
      processedBy: 'Admin',
    };

    setPaymentRequests((prev) =>
      prev.map((r) => (r.id === id ? updatedReq : r))
    );

    if (isFirebaseConfigured) {
      try {
        await savePaymentRequestToFirestore(updatedReq);
      } catch (err) {
        console.warn('Saved rejected request to Firestore note:', err);
      }
    }

    addToast('info', 'পেমেন্ট বাতিল করা হয়েছে', `TrxID: ${req.transactionId} রিকোয়েস্টটি বাতিল করা হয়েছে।`);
    return true;
  };

  const deletePaymentRequest = async (id: string): Promise<boolean> => {
    setPaymentRequests((prev) => prev.filter((r) => r.id !== id));

    if (isFirebaseConfigured) {
      try {
        await deletePaymentRequestFromFirestore(id);
      } catch (err) {
        console.warn('Deleted payment request locally, Firestore note:', err);
      }
    }

    addToast('success', 'ডিলিট সফল', 'পেমেন্ট রিকোয়েস্ট মুছে ফেলা হয়েছে।');
    return true;
  };

  // ==================== Support Tickets CRUD ====================
  const addSupportTicket = async (ticketData: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>): Promise<SupportTicket> => {
    const newId = `ticket-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newTicket: SupportTicket = {
      ...ticketData,
      id: newId,
      status: 'Open',
      createdAt: timestamp,
    };

    setSupportTickets((prev) => [newTicket, ...prev]);

    if (isFirebaseConfigured) {
      try {
        await saveTicketToFirestore(newTicket);
      } catch (err) {
        console.warn('Saved ticket locally, Firestore note:', err);
      }
    }

    addToast('success', 'অভিযোগ জমা হয়েছে', `আপনার টিকিট #${newTicket.id.slice(-6)} তৈরি হয়েছে। দ্রুত ব্যবস্থা নেওয়া হবে।`);
    return newTicket;
  };

  const updateSupportTicket = async (id: string, ticketData: Partial<SupportTicket>): Promise<SupportTicket> => {
    const existing = supportTickets.find((t) => t.id === id);
    const updated: SupportTicket = existing
      ? { ...existing, ...ticketData, updatedAt: new Date().toISOString() }
      : ({ id, ...ticketData } as SupportTicket);

    setSupportTickets((prev) =>
      prev.map((t) => (t.id === id ? updated : t))
    );

    if (isFirebaseConfigured) {
      try {
        await saveTicketToFirestore(updated);
      } catch (err) {
        console.warn('Saved ticket update locally, Firestore note:', err);
      }
    }

    addToast('success', 'টিকিট আপডেট হয়েছে', `সাপোর্ট টিকিট #${id.slice(-6)} স্ট্যাটাস পরিবর্তন হয়েছে।`);
    return updated;
  };

  const deleteSupportTicket = async (id: string): Promise<boolean> => {
    setSupportTickets((prev) => prev.filter((t) => t.id !== id));

    if (isFirebaseConfigured) {
      try {
        await deleteTicketFromFirestore(id);
      } catch (err) {
        console.warn('Deleted ticket note:', err);
      }
    }

    addToast('info', 'টিকিট মুছে ফেলা হয়েছে', 'সাপোর্ট টিকিট ডিলিট করা হয়েছে।');
    return true;
  };

  // ==================== Demo / Reset Data ====================
  const seedDemoData = async () => {
    setCustomers(INITIAL_CUSTOMERS);
    setPayments(INITIAL_PAYMENTS);
    setPackages(DEFAULT_PACKAGES);
    if (isFirebaseConfigured && db) {
      for (const cust of INITIAL_CUSTOMERS) {
        await saveCustomerToFirestore(cust);
      }
      for (const pay of INITIAL_PAYMENTS) {
        await savePaymentToFirestore(pay);
      }
      for (const pkg of DEFAULT_PACKAGES) {
        await savePackageToFirestore(pkg);
      }
    }
    addToast('info', 'Demo Data Loaded', 'Sample ISP customer & package records loaded.');
  };

  const resetToDemoData = async () => {
    await seedDemoData();
  };

  const clearAllData = async () => {
    const existingCustomers = [...customers];
    const existingPayments = [...payments];
    const existingRequests = [...paymentRequests];
    const existingTickets = [...supportTickets];

    setCustomers([]);
    setPayments([]);
    setPaymentRequests([]);
    setSupportTickets([]);
    localStorage.removeItem(CUSTOMERS_LOCAL_KEY);
    localStorage.removeItem(PAYMENTS_LOCAL_KEY);
    localStorage.removeItem('netpulse_payment_requests_data');
    localStorage.removeItem('netpulse_support_tickets_data');

    if (isFirebaseConfigured) {
      for (const c of existingCustomers) {
        deleteCustomerFromFirestore(c.id).catch(() => {});
      }
      for (const p of existingPayments) {
        deletePaymentFromFirestore(p.id).catch(() => {});
      }
      for (const r of existingRequests) {
        deletePaymentRequestFromFirestore(r.id).catch(() => {});
      }
      for (const t of existingTickets) {
        deleteTicketFromFirestore(t.id).catch(() => {});
      }
    }
    addToast('info', 'Database Cleared', 'সকল গ্রাহক ও ট্রানজেকশন রেকর্ড ডাটাবেস থেকে স্থায়ীভাবে মুছে ফেলা হয়েছে।');
  };

  // ==================== ISP Profile ====================
  const updateIspProfile = (profileUpdate: Partial<ISPProfile>) => {
    const updated = { ...ispProfile, ...profileUpdate };
    setIspProfile(updated);
    if (isFirebaseConfigured) {
      saveSettingsToFirestore(updated).catch((err) => {
        console.warn('Saved profile locally, Firestore note:', err);
      });
    }
    addToast('success', 'Settings Saved', 'ISP profile configuration updated.');
  };

  const updateISPProfile = (profileUpdate: Partial<ISPProfile>) => {
    updateIspProfile(profileUpdate);
  };

  // ==================== Master Sync All Data to Realtime Database ====================
  const syncAllLocalDataToRealtimeDatabase = async (): Promise<MasterSyncResult> => {
    setIsLoading(true);
    try {
      let currentOltConfig = undefined;
      try {
        const rawOlt = localStorage.getItem('vsol_gpon_olt_config');
        if (rawOlt) currentOltConfig = JSON.parse(rawOlt);
      } catch (e) {}

      let currentOps = undefined;
      try {
        const rawOps = localStorage.getItem('netpulse_search_operators_data');
        if (rawOps) currentOps = JSON.parse(rawOps);
      } catch (e) {}

      let currentAdmins = undefined;
      try {
        const rawAdmins = localStorage.getItem('netpulse_admin_accounts_data');
        if (rawAdmins) currentAdmins = JSON.parse(rawAdmins);
      } catch (e) {}

      let currentWaLogs = undefined;
      try {
        const rawWa = localStorage.getItem('netpulse_whatsapp_alert_logs');
        if (rawWa) currentWaLogs = JSON.parse(rawWa);
      } catch (e) {}

      const result = await syncAllDataToFirestore({
        customers,
        payments,
        packages,
        ispProfile,
        oltConfig: currentOltConfig,
        paymentRequests,
        supportTickets,
        searchOperators: currentOps,
        adminAccounts: currentAdmins,
        whatsappLogs: currentWaLogs,
      });

      if (result.success) {
        setIsFirebaseActive(true);
        addToast(
          'success',
          'রিয়েলটাইম ডাটাবেসে সকল ডাটা সিঙ্ক সম্পন্ন',
          `মোট ${result.totalItems} টি রেকর্ড (গ্রাহক: ${result.customers}, পেমেন্ট: ${result.payments}, প্যাকেজ: ${result.packages}, অপারেটর: ${result.searchOperators}, এডমিন: ${result.adminAccounts}) সফলভাবে ক্লাউড রিয়েলটাইম ডাটাবেসে যুক্ত হয়েছে।`
        );
      } else {
        addToast('error', 'সিঙ্ক ব্যর্থ হয়েছে', 'রিয়েলটাইম ডাটাবেসে ডাটা যুক্ত করতে সমস্যা হয়েছে।');
      }
      setIsLoading(false);
      return result;
    } catch (err) {
      console.error('Master sync error:', err);
      setIsLoading(false);
      addToast('error', 'Sync Failed', 'Failed to push all data to Realtime Database.');
      throw err;
    }
  };

  return (
    <CustomerContext.Provider
      value={{
        customers,
        payments,
        packages,
        paymentRequests,
        supportTickets,
        ispProfile,
        stats,
        isLoading,
        isFirebaseActive,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        recordPayment,
        updatePayment,
        deletePayment,
        clearAllPayments,
        submitPaymentRequest,
        updatePaymentRequest,
        approvePaymentRequest,
        rejectPaymentRequest,
        deletePaymentRequest,
        addSupportTicket,
        updateSupportTicket,
        deleteSupportTicket,
        addPackage,
        updatePackage,
        deletePackage,
        generateNextUID,
        searchCustomers,
        getCustomerById,
        getCustomerByUid,
        seedDemoData,
        resetToDemoData,
        clearAllData,
        updateIspProfile,
        updateISPProfile,
        syncAllLocalDataToRealtimeDatabase,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = (): CustomerContextType => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
};
