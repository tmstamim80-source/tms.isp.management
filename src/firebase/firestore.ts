import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './config';
import { 
  Customer, 
  PaymentRecord, 
  ISPPackage, 
  ISPProfile, 
  PaymentRequest, 
  SupportTicket, 
  SearchOperator, 
  SearchLoginLog, 
  AdminAccount, 
  AdminAuditLog, 
  OLTConfig, 
  WhatsAppLogEntry,
  Reseller,
  ResellerTransaction,
  ResellerBalanceRequest
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
    return false;
  }
}

// Collections
export const CUSTOMERS_COLLECTION = 'customers';
export const PAYMENTS_COLLECTION = 'payments';
export const PACKAGES_COLLECTION = 'packages';
export const SETTINGS_COLLECTION = 'settings';
export const PAYMENT_REQUESTS_COLLECTION = 'payment_requests';
export const SUPPORT_TICKETS_COLLECTION = 'support_tickets';
export const SEARCH_OPERATORS_COLLECTION = 'search_operators';
export const SEARCH_OPERATOR_LOGS_COLLECTION = 'search_operator_logs';
export const ADMIN_ACCOUNTS_COLLECTION = 'admin_accounts';
export const ADMIN_AUDIT_LOGS_COLLECTION = 'admin_audit_logs';
export const WHATSAPP_LOGS_COLLECTION = 'whatsapp_logs';
export const RESELLERS_COLLECTION = 'resellers';
export const RESSELLER_TRANSACTIONS_COLLECTION = 'reseller_transactions';
export const RESELLER_REQUESTS_COLLECTION = 'reseller_balance_requests';

// ==================== Customers API ====================
export async function fetchCustomersFromFirestore(): Promise<Customer[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snapshot = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CUSTOMERS_COLLECTION);
    return [];
  }
}

export async function saveCustomerToFirestore(customer: Customer): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, customer.id);
    await setDoc(docRef, {
      ...customer,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CUSTOMERS_COLLECTION}/${customer.id}`);
  }
}

export async function deleteCustomerFromFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, CUSTOMERS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${CUSTOMERS_COLLECTION}/${id}`);
  }
}

// ==================== Payments API ====================
export async function fetchPaymentsFromFirestore(): Promise<PaymentRecord[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const q = query(collection(db, PAYMENTS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRecord));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PAYMENTS_COLLECTION);
    return [];
  }
}

export async function savePaymentToFirestore(payment: PaymentRecord): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, PAYMENTS_COLLECTION, payment.id);
    await setDoc(docRef, payment, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PAYMENTS_COLLECTION}/${payment.id}`);
  }
}

export async function deletePaymentFromFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, PAYMENTS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PAYMENTS_COLLECTION}/${id}`);
  }
}

// ==================== Packages API ====================
export async function fetchPackagesFromFirestore(): Promise<ISPPackage[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const q = collection(db, PACKAGES_COLLECTION);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ISPPackage));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PACKAGES_COLLECTION);
    return [];
  }
}

export async function savePackageToFirestore(pkg: ISPPackage): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, PACKAGES_COLLECTION, pkg.id);
    await setDoc(docRef, pkg, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PACKAGES_COLLECTION}/${pkg.id}`);
  }
}

export async function deletePackageFromFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, PACKAGES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PACKAGES_COLLECTION}/${id}`);
  }
}

// ==================== Settings / Profile API ====================
export async function fetchSettingsFromFirestore(): Promise<ISPProfile | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'isp_profile');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as ISPProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${SETTINGS_COLLECTION}/isp_profile`);
    return null;
  }
}

export async function saveSettingsToFirestore(profile: ISPProfile): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'isp_profile');
    await setDoc(docRef, profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/isp_profile`);
  }
}

// ==================== Payment Requests API ====================
export async function fetchPaymentRequestsFromFirestore(): Promise<PaymentRequest[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const q = query(collection(db, PAYMENT_REQUESTS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRequest));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PAYMENT_REQUESTS_COLLECTION);
    return [];
  }
}

export async function savePaymentRequestToFirestore(req: PaymentRequest): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, PAYMENT_REQUESTS_COLLECTION, req.id);
    await setDoc(docRef, req, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PAYMENT_REQUESTS_COLLECTION}/${req.id}`);
  }
}

export async function deletePaymentRequestFromFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, PAYMENT_REQUESTS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PAYMENT_REQUESTS_COLLECTION}/${id}`);
  }
}

// ==================== Support Tickets API ====================
export async function fetchTicketsFromFirestore(): Promise<SupportTicket[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const q = query(collection(db, SUPPORT_TICKETS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SUPPORT_TICKETS_COLLECTION);
    return [];
  }
}

export async function saveTicketToFirestore(ticket: SupportTicket): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, SUPPORT_TICKETS_COLLECTION, ticket.id);
    await setDoc(docRef, ticket, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SUPPORT_TICKETS_COLLECTION}/${ticket.id}`);
  }
}

export async function deleteTicketFromFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, SUPPORT_TICKETS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SUPPORT_TICKETS_COLLECTION}/${id}`);
  }
}

// ==================== Search Operators API ====================
export async function fetchSearchOperatorsFromFirestore(): Promise<SearchOperator[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snapshot = await getDocs(collection(db, SEARCH_OPERATORS_COLLECTION));
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SearchOperator));
    return list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SEARCH_OPERATORS_COLLECTION);
    return [];
  }
}

export async function saveSearchOperatorToFirestore(operator: SearchOperator): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, SEARCH_OPERATORS_COLLECTION, operator.id);
    const dataToSave = {
      ...operator,
      createdAt: operator.createdAt || new Date().toISOString(),
      username: operator.username.trim(),
    };
    await setDoc(docRef, dataToSave, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SEARCH_OPERATORS_COLLECTION}/${operator.id}`);
  }
}

export async function deleteSearchOperatorFromFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, SEARCH_OPERATORS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SEARCH_OPERATORS_COLLECTION}/${id}`);
  }
}

// ==================== Search Operator Logs API ====================
export async function fetchSearchOperatorLogsFromFirestore(): Promise<SearchLoginLog[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snapshot = await getDocs(collection(db, SEARCH_OPERATOR_LOGS_COLLECTION));
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SearchLoginLog));
    return list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SEARCH_OPERATOR_LOGS_COLLECTION);
    return [];
  }
}

export async function saveSearchOperatorLogToFirestore(log: SearchLoginLog): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, SEARCH_OPERATOR_LOGS_COLLECTION, log.id);
    await setDoc(docRef, log, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SEARCH_OPERATOR_LOGS_COLLECTION}/${log.id}`);
  }
}

// ==================== Admin Accounts API ====================
export async function fetchAdminAccountsFromFirestore(): Promise<AdminAccount[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snapshot = await getDocs(collection(db, ADMIN_ACCOUNTS_COLLECTION));
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AdminAccount));
    return list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ADMIN_ACCOUNTS_COLLECTION);
    return [];
  }
}

export async function saveAdminAccountToFirestore(account: AdminAccount): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, ADMIN_ACCOUNTS_COLLECTION, account.id);
    const dataToSave = {
      ...account,
      createdAt: account.createdAt || new Date().toISOString(),
      username: account.username.trim(),
    };
    await setDoc(docRef, dataToSave, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ADMIN_ACCOUNTS_COLLECTION}/${account.id}`);
  }
}

export async function deleteAdminAccountFromFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, ADMIN_ACCOUNTS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ADMIN_ACCOUNTS_COLLECTION}/${id}`);
  }
}

// ==================== Admin Audit Logs API ====================
export async function saveAdminAuditLogToFirestore(log: AdminAuditLog): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, ADMIN_AUDIT_LOGS_COLLECTION, log.id);
    await setDoc(docRef, log, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ADMIN_AUDIT_LOGS_COLLECTION}/${log.id}`);
  }
}

export async function clearAllAdminAuditLogsFromFirestore(): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const snap = await getDocs(collection(db, ADMIN_AUDIT_LOGS_COLLECTION));
    if (snap.empty) return;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const chunk = docs.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, ADMIN_AUDIT_LOGS_COLLECTION);
  }
}

export async function clearAllSearchOperatorLogsFromFirestore(): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const snap = await getDocs(collection(db, SEARCH_OPERATOR_LOGS_COLLECTION));
    if (snap.empty) return;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const chunk = docs.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, SEARCH_OPERATOR_LOGS_COLLECTION);
  }
}

// ==================== OLT Configuration API ====================
export async function fetchOltConfigFromFirestore(): Promise<OLTConfig | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'olt_config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as OLTConfig;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${SETTINGS_COLLECTION}/olt_config`);
    return null;
  }
}

export async function saveOltConfigToFirestore(config: OLTConfig): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'olt_config');
    await setDoc(docRef, { ...config, lastUpdated: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/olt_config`);
  }
}

// ==================== WhatsApp Logs API ====================
export async function fetchWhatsAppLogsFromFirestore(): Promise<WhatsAppLogEntry[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const q = query(collection(db, WHATSAPP_LOGS_COLLECTION), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhatsAppLogEntry));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, WHATSAPP_LOGS_COLLECTION);
    return [];
  }
}

export async function saveWhatsAppLogToFirestore(log: WhatsAppLogEntry): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, WHATSAPP_LOGS_COLLECTION, log.id);
    await setDoc(docRef, log, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${WHATSAPP_LOGS_COLLECTION}/${log.id}`);
  }
}

// ==================== Master Sync All Data to Firestore ====================
export interface MasterSyncResult {
  customers: number;
  payments: number;
  packages: number;
  profile: boolean;
  oltConfig: boolean;
  paymentRequests: number;
  supportTickets: number;
  searchOperators: number;
  adminAccounts: number;
  whatsappLogs: number;
  totalItems: number;
  success: boolean;
  syncedAt: string;
}

export async function syncAllDataToFirestore(allData: {
  customers?: Customer[];
  payments?: PaymentRecord[];
  packages?: ISPPackage[];
  ispProfile?: ISPProfile;
  oltConfig?: OLTConfig;
  paymentRequests?: PaymentRequest[];
  supportTickets?: SupportTicket[];
  searchOperators?: SearchOperator[];
  adminAccounts?: AdminAccount[];
  whatsappLogs?: WhatsAppLogEntry[];
}): Promise<MasterSyncResult> {
  const result: MasterSyncResult = {
    customers: 0,
    payments: 0,
    packages: 0,
    profile: false,
    oltConfig: false,
    paymentRequests: 0,
    supportTickets: 0,
    searchOperators: 0,
    adminAccounts: 0,
    whatsappLogs: 0,
    totalItems: 0,
    success: false,
    syncedAt: new Date().toISOString(),
  };

  if (!isFirebaseConfigured || !db) {
    return result;
  }

  try {
    // 1. Customers Sync
    if (allData.customers && allData.customers.length > 0) {
      await Promise.all(
        allData.customers.map(c => saveCustomerToFirestore(c))
      );
      result.customers = allData.customers.length;
    }

    // 2. Payments Sync
    if (allData.payments && allData.payments.length > 0) {
      await Promise.all(
        allData.payments.map(p => savePaymentToFirestore(p))
      );
      result.payments = allData.payments.length;
    }

    // 3. Packages Sync
    if (allData.packages && allData.packages.length > 0) {
      await Promise.all(
        allData.packages.map(pkg => savePackageToFirestore(pkg))
      );
      result.packages = allData.packages.length;
    }

    // 4. ISP Profile Settings Sync
    if (allData.ispProfile) {
      await saveSettingsToFirestore(allData.ispProfile);
      result.profile = true;
    }

    // 5. OLT Config Sync
    if (allData.oltConfig) {
      await saveOltConfigToFirestore(allData.oltConfig);
      result.oltConfig = true;
    }

    // 6. Payment Requests Sync
    if (allData.paymentRequests && allData.paymentRequests.length > 0) {
      await Promise.all(
        allData.paymentRequests.map(req => savePaymentRequestToFirestore(req))
      );
      result.paymentRequests = allData.paymentRequests.length;
    }

    // 7. Support Tickets Sync
    if (allData.supportTickets && allData.supportTickets.length > 0) {
      await Promise.all(
        allData.supportTickets.map(ticket => saveTicketToFirestore(ticket))
      );
      result.supportTickets = allData.supportTickets.length;
    }

    // 8. Search Operators Sync
    if (allData.searchOperators && allData.searchOperators.length > 0) {
      await Promise.all(
        allData.searchOperators.map(op => saveSearchOperatorToFirestore(op))
      );
      result.searchOperators = allData.searchOperators.length;
    }

    // 9. Admin Accounts Sync
    if (allData.adminAccounts && allData.adminAccounts.length > 0) {
      await Promise.all(
        allData.adminAccounts.map(adm => saveAdminAccountToFirestore(adm))
      );
      result.adminAccounts = allData.adminAccounts.length;
    }

    // 10. WhatsApp Logs Sync
    if (allData.whatsappLogs && allData.whatsappLogs.length > 0) {
      await Promise.all(
        allData.whatsappLogs.map(log => saveWhatsAppLogToFirestore(log))
      );
      result.whatsappLogs = allData.whatsappLogs.length;
    }

    result.totalItems = 
      result.customers + 
      result.payments + 
      result.packages + 
      (result.profile ? 1 : 0) + 
      (result.oltConfig ? 1 : 0) + 
      result.paymentRequests + 
      result.supportTickets + 
      result.searchOperators + 
      result.adminAccounts + 
      result.whatsappLogs;

    result.success = true;
  } catch (err) {
    console.error('Error during master sync to Firestore:', err);
  }

  return result;
}

// ==================== Resellers & Sub-ISPs API ====================

export async function fetchResellersFromFirestore(): Promise<Reseller[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snapshot = await getDocs(collection(db, RESELLERS_COLLECTION));
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reseller));
    return list.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, RESELLERS_COLLECTION);
    return [];
  }
}

export async function saveResellerToFirestore(reseller: Reseller): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, RESELLERS_COLLECTION, reseller.id);
    await setDoc(docRef, {
      ...reseller,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${RESELLERS_COLLECTION}/${reseller.id}`);
  }
}

export async function deleteResellerFromFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, RESELLERS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${RESELLERS_COLLECTION}/${id}`);
  }
}

export async function fetchResellerTransactionsFromFirestore(resellerId?: string): Promise<ResellerTransaction[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    let q = query(collection(db, RESSELLER_TRANSACTIONS_COLLECTION));
    if (resellerId) {
      q = query(collection(db, RESSELLER_TRANSACTIONS_COLLECTION), where('resellerId', '==', resellerId));
    }
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResellerTransaction));
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, RESSELLER_TRANSACTIONS_COLLECTION);
    return [];
  }
}

export async function saveResellerTransactionToFirestore(tx: ResellerTransaction): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, RESSELLER_TRANSACTIONS_COLLECTION, tx.id);
    await setDoc(docRef, tx, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${RESSELLER_TRANSACTIONS_COLLECTION}/${tx.id}`);
  }
}

export async function fetchResellerBalanceRequestsFromFirestore(): Promise<ResellerBalanceRequest[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snapshot = await getDocs(collection(db, RESELLER_REQUESTS_COLLECTION));
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResellerBalanceRequest));
    return list.sort((a, b) => (b.requestedAt || '').localeCompare(a.requestedAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, RESELLER_REQUESTS_COLLECTION);
    return [];
  }
}

export async function saveResellerBalanceRequestToFirestore(req: ResellerBalanceRequest): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, RESELLER_REQUESTS_COLLECTION, req.id);
    await setDoc(docRef, req, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${RESELLER_REQUESTS_COLLECTION}/${req.id}`);
  }
}

export async function deleteResellerBalanceRequestFromFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, RESELLER_REQUESTS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${RESELLER_REQUESTS_COLLECTION}/${id}`);
  }
}



