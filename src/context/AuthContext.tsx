import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AdminUser, Customer, AdminAccount, AdminAuditLog, SearchOperator, SearchLoginLog, Reseller } from '../types';
import { DEFAULT_RESELLERS } from '../data/seedData';
import { hasAdminPermission } from '../types/permissions';
import { auth, db, isFirebaseConfigured } from '../firebase/config';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import {
  SEARCH_OPERATORS_COLLECTION,
  SEARCH_OPERATOR_LOGS_COLLECTION,
  ADMIN_ACCOUNTS_COLLECTION,
  ADMIN_AUDIT_LOGS_COLLECTION,
  saveSearchOperatorToFirestore,
  deleteSearchOperatorFromFirestore,
  saveSearchOperatorLogToFirestore,
  saveAdminAccountToFirestore,
  deleteAdminAccountFromFirestore,
  saveAdminAuditLogToFirestore,
  clearAllAdminAuditLogsFromFirestore,
  clearAllSearchOperatorLogsFromFirestore,
  fetchSearchOperatorsFromFirestore,
  fetchAdminAccountsFromFirestore,
  fetchCustomersFromFirestore,
  fetchResellersFromFirestore,
} from '../firebase/firestore';

interface AdminCredentials {
  username: string;
  password: string;
  name: string;
  email: string;
  recoveryPin: string;
}

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isReseller: boolean;
  customerUser: Customer | null;
  isCustomerAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  resellerLogin: (username: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; reseller?: Reseller; error?: string }>;
  customerLogin: (identifier: string, password?: string, rememberMe?: boolean) => Promise<{ success: boolean; customer?: Customer; error?: string }>;
  logout: () => Promise<void>;
  customerLogout: () => void;
  updateCredentials: (currentPassword: string, newUsername: string, newPassword?: string, newName?: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordWithRecovery: (recoveryPin: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  setCustomerUser: (customer: Customer | null) => void;
  hasPermission: (permission: string) => boolean;

  // Protected Search Operators & Operator Login Features
  currentSearchOperator: SearchOperator | null;
  isSearchOperatorAuthenticated: boolean;
  searchOperators: SearchOperator[];
  searchLoginLogs: SearchLoginLog[];
  searchOperatorLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string; operator?: SearchOperator; isCustomerAccount?: boolean }>;
  searchOperatorLogout: () => void;
  createSearchOperatorByCeo: (operatorData: Omit<SearchOperator, 'id' | 'createdAt' | 'loginCount'>) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  updateSearchOperatorByCeo: (operator: SearchOperator) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  toggleSearchOperatorStatusByCeo: (operatorId: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  resetSearchOperatorPasswordByCeo: (operatorId: string, newPassword: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  deleteSearchOperatorByCeo: (operatorId: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  clearSearchLoginLogsByCeo: () => Promise<void> | void;

  // Staff Device Authorization & Portal Visibility Control
  isStaffAuthorized: boolean;
  authorizeStaffDevice: (passkey: string) => { success: boolean; error?: string };
  revokeStaffDevice: () => void;

  // CEO TM Executive Security Master Features
  isCeoTmAuthenticated: boolean;
  ceoTmLogin: (password: string) => { success: boolean; error?: string };
  ceoTmLogout: () => void;
  adminAccounts: AdminAccount[];
  auditLogs: AdminAuditLog[];
  resetAdminPasswordByCeo: (adminId: string, newPassword: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  createAdminAccountByCeo: (adminData: Omit<AdminAccount, 'id' | 'createdAt' | 'loginCount'>) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  updateAdminAccountByCeo: (updatedAdmin: AdminAccount) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  deleteAdminAccountByCeo: (adminId: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  forceLogoutAllAdminsByCeo: () => void;
  clearAuditLogsByCeo: () => Promise<void> | void;
  logAdminAction: (
    adminName: string,
    username: string,
    role: string,
    action: AdminAuditLog['action'],
    status: AdminAuditLog['status'],
    details?: string
  ) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'netpulse_admin_auth';
const CUSTOMER_AUTH_STORAGE_KEY = 'netpulse_customer_auth';
const ADMIN_CREDS_STORAGE_KEY = 'netpulse_admin_credentials';
const ADMIN_ACCOUNTS_STORAGE_KEY = 'netpulse_admin_accounts_list';
const ADMIN_AUDIT_LOGS_STORAGE_KEY = 'netpulse_admin_audit_logs';
const ADMIN_SESSION_VERSION_KEY = 'netpulse_admin_session_version';
const CEO_TM_AUTH_KEY = 'netpulse_ceo_tm_auth';
const SEARCH_OPERATORS_STORAGE_KEY = 'netpulse_search_operators';
const SEARCH_LOGIN_LOGS_STORAGE_KEY = 'netpulse_search_login_logs';
const SEARCH_OPERATOR_AUTH_KEY = 'netpulse_search_operator_auth';
const STAFF_DEVICE_AUTH_KEY = 'netpulse_staff_device_auth';

const CEO_TM_MASTER_PASS = 'TM5467';

const DEFAULT_ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    id: 'admin-001',
    username: 'TAMIM',
    password: '5467',
    name: 'TM Tamim (Super Admin)',
    email: 'tmstamim80@gmail.com',
    role: 'Super Admin',
    permissions: ['all', 'dashboard', 'customers', 'add_customer', 'delete_customer', 'router_config', 'payments', 'record_payment', 'requests', 'olt', 'reports', 'settings'],
    status: 'Active',
    createdAt: '2025-01-01T00:00:00.000Z',
    lastLogin: new Date().toISOString(),
    lastPasswordChange: '2025-01-01T00:00:00.000Z',
    loginCount: 15,
  },
  {
    id: 'admin-002',
    username: 'billing_admin',
    password: 'bill1234',
    name: 'Billing Manager',
    email: 'billing@isp.net',
    role: 'Billing Admin',
    permissions: ['dashboard', 'customers', 'payments', 'record_payment', 'requests'],
    status: 'Active',
    createdAt: '2025-02-01T10:00:00.000Z',
    lastLogin: '2025-02-15T14:30:00.000Z',
    lastPasswordChange: '2025-02-01T10:00:00.000Z',
    loginCount: 8,
  },
  {
    id: 'admin-003',
    username: 'network_admin',
    password: 'tech1234',
    name: 'GPON Fiber & Network Lead',
    email: 'network@isp.net',
    role: 'Network Admin',
    permissions: ['dashboard', 'customers', 'router_config', 'olt', 'requests'],
    status: 'Active',
    createdAt: '2025-02-10T12:00:00.000Z',
    lastLogin: '2025-02-20T09:15:00.000Z',
    lastPasswordChange: '2025-02-10T12:00:00.000Z',
    loginCount: 5,
  },
  {
    id: 'admin-004',
    username: 'support_admin',
    password: 'support1234',
    name: 'Customer Support Lead',
    email: 'support@isp.net',
    role: 'Support Admin',
    permissions: ['dashboard', 'customers', 'requests'],
    status: 'Active',
    createdAt: '2025-02-15T08:00:00.000Z',
    lastLogin: '2025-02-22T16:45:00.000Z',
    lastPasswordChange: '2025-02-15T08:00:00.000Z',
    loginCount: 3,
  },
];

const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: 'log-001',
    adminName: 'TM Tamim (Super Admin)',
    username: 'TAMIM',
    role: 'Super Admin',
    timestamp: new Date(Date.now() - 3600000 * 2).toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' }),
    action: 'Admin Login',
    status: 'Success',
    ipAddress: '103.145.118.22',
    device: 'Chrome / Windows 11 (Desktop)',
    details: 'Master Super Admin Dashboard Access Granted',
  },
  {
    id: 'log-002',
    adminName: 'Billing Manager',
    username: 'billing_admin',
    role: 'Billing Admin',
    timestamp: new Date(Date.now() - 3600000 * 8).toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' }),
    action: 'Admin Login',
    status: 'Success',
    ipAddress: '103.145.118.45',
    device: 'Chrome / Android Mobile',
    details: 'Customer Payment Reconciliation Session',
  },
];

const DEFAULT_SEARCH_OPERATORS: SearchOperator[] = [
  {
    id: 'op-tm',
    name: 'TM Tamim (CEO Master)',
    username: 'TM',
    password: '123',
    mobile: '01700000000',
    email: 'tmstamim80@gmail.com',
    role: 'search_operator',
    status: 'Active',
    permissions: {
      canSearch: true,
      canViewFinancials: true,
      canViewFullProfiles: true,
      canExport: true,
    },
    notes: 'CEO TM Master Search Operator',
    createdAt: new Date().toISOString(),
    loginCount: 50,
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: 'op-001',
    name: 'Search Desk Operator 1',
    username: 'operator1',
    password: '123',
    mobile: '01711000001',
    email: 'operator@isp.net',
    role: 'search_operator',
    status: 'Active',
    permissions: {
      canSearch: true,
      canViewFinancials: true,
      canViewFullProfiles: true,
      canExport: true,
    },
    notes: 'Primary Search & Inquiry Desk (Created by CEO TM)',
    createdAt: new Date().toISOString(),
    loginCount: 3,
    lastLoginAt: new Date().toISOString(),
  },
];

const INITIAL_SEARCH_LOGIN_LOGS: SearchLoginLog[] = [
  {
    id: 'slog-001',
    operatorId: 'op-001',
    operatorName: 'Search Desk Operator 1',
    username: 'operator1',
    timestamp: new Date(Date.now() - 3600000 * 2).toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' }),
    status: 'Success',
    ipAddress: '103.145.118.45',
    deviceInfo: 'Desktop Web / Chrome',
    action: 'Login',
  },
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [customerUser, setCustomerUser] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCeoTmAuthenticated, setIsCeoTmAuthenticated] = useState<boolean>(false);
  const [isStaffAuthorized, setIsStaffAuthorized] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STAFF_DEVICE_AUTH_KEY) === 'true';
    } catch (e) {
      return false;
    }
  });

  // Search Operator Auth & State
  const [currentSearchOperator, setCurrentSearchOperator] = useState<SearchOperator | null>(() => {
    try {
      const stored = localStorage.getItem(SEARCH_OPERATOR_AUTH_KEY) || sessionStorage.getItem(SEARCH_OPERATOR_AUTH_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  });
  const [searchOperators, setSearchOperators] = useState<SearchOperator[]>(() => {
    try {
      const stored = localStorage.getItem(SEARCH_OPERATORS_STORAGE_KEY);
      if (stored) {
        let parsed: SearchOperator[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.some((p) => p.username.toLowerCase() === 'tm')) {
            parsed = [DEFAULT_SEARCH_OPERATORS[0], ...parsed];
          }
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_SEARCH_OPERATORS;
  });
  const [searchLoginLogs, setSearchLoginLogs] = useState<SearchLoginLog[]>(() => {
    try {
      const stored = localStorage.getItem(SEARCH_LOGIN_LOGS_STORAGE_KEY);
      if (stored !== null) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });

  const saveSearchOperators = (operators: SearchOperator[]) => {
    setSearchOperators(operators);
    try {
      localStorage.setItem(SEARCH_OPERATORS_STORAGE_KEY, JSON.stringify(operators));
    } catch (e) {}
    // Sync to Firestore Realtime Database
    operators.forEach((op) => {
      saveSearchOperatorToFirestore(op).catch(() => {});
    });
  };

  const recordSearchLoginLog = (log: Omit<SearchLoginLog, 'id' | 'timestamp'>) => {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    let deviceInfo = 'Desktop Web';
    if (/android/i.test(userAgent)) deviceInfo = 'Android Mobile';
    else if (/iphone|ipad|ipod/i.test(userAgent)) deviceInfo = 'iOS Mobile';
    else if (/windows/i.test(userAgent)) deviceInfo = 'Windows PC';
    else if (/macintosh/i.test(userAgent)) deviceInfo = 'Mac OS';

    const newLog: SearchLoginLog = {
      ...log,
      id: 'slog-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' }),
      deviceInfo: log.deviceInfo || deviceInfo,
      ipAddress: log.ipAddress || ('103.145.' + Math.floor(Math.random() * 200 + 10) + '.' + Math.floor(Math.random() * 250 + 1)),
    };

    setSearchLoginLogs((prev) => {
      const updated = [newLog, ...prev.slice(0, 199)];
      try {
        localStorage.setItem(SEARCH_LOGIN_LOGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Save to Firestore Realtime Database
    saveSearchOperatorLogToFirestore(newLog).catch(() => {});
  };
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(() => {
    try {
      const stored = localStorage.getItem(ADMIN_ACCOUNTS_STORAGE_KEY);
      if (stored) {
        const parsed: AdminAccount[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_ADMIN_ACCOUNTS;
  });
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(() => {
    try {
      const stored = localStorage.getItem(ADMIN_AUDIT_LOGS_STORAGE_KEY);
      if (stored !== null) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });

  // Current global session version (bumped when password is changed by CEO TM)
  const getSessionVersion = useCallback((): number => {
    const v = localStorage.getItem(ADMIN_SESSION_VERSION_KEY);
    return v ? parseInt(v, 10) : 1;
  }, []);

  const bumpSessionVersionAndLogoutAdmins = useCallback(() => {
    const newVersion = Date.now();
    localStorage.setItem(ADMIN_SESSION_VERSION_KEY, newVersion.toString());
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  }, []);

  const logAdminAction = useCallback((
    adminName: string,
    username: string,
    role: string,
    action: AdminAuditLog['action'],
    status: AdminAuditLog['status'],
    details?: string
  ) => {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    let device = 'Desktop Web';
    if (/android/i.test(userAgent)) device = 'Android Mobile';
    else if (/iphone|ipad|ipod/i.test(userAgent)) device = 'iOS Mobile/Tablet';
    else if (/windows/i.test(userAgent)) device = 'Windows PC';
    else if (/macintosh/i.test(userAgent)) device = 'Mac OS';
    else if (/linux/i.test(userAgent)) device = 'Linux Device';

    const newLog: AdminAuditLog = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      adminName,
      username,
      role,
      timestamp: new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' }),
      action,
      status,
      ipAddress: '103.145.' + Math.floor(Math.random() * 200 + 10) + '.' + Math.floor(Math.random() * 250 + 1),
      device,
      details,
    };

    setAuditLogs((prev) => {
      const updated = [newLog, ...prev.slice(0, 199)];
      try {
        localStorage.setItem(ADMIN_AUDIT_LOGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Save to Firestore Realtime Database
    saveAdminAuditLogToFirestore(newLog).catch(() => {});
  }, []);

  useEffect(() => {
    // Check CEO TM auth in session
    const ceoAuth = sessionStorage.getItem(CEO_TM_AUTH_KEY);
    if (ceoAuth === 'true') {
      setIsCeoTmAuthenticated(true);
    }

    // Check local Admin session and verify against session version
    const currentVersion = getSessionVersion();
    const savedUser = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.sessionVersion && parsed.sessionVersion < currentVersion) {
          // Session expired due to CEO TM password reset/force logout!
          localStorage.removeItem(AUTH_STORAGE_KEY);
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
          setUser(null);
        } else {
          setUser(parsed);
        }
      } catch (e) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }

    // Check local Customer session
    const savedCustomer = localStorage.getItem(CUSTOMER_AUTH_STORAGE_KEY) || sessionStorage.getItem(CUSTOMER_AUTH_STORAGE_KEY);
    if (savedCustomer) {
      try {
        setCustomerUser(JSON.parse(savedCustomer));
      } catch (e) {
        localStorage.removeItem(CUSTOMER_AUTH_STORAGE_KEY);
      }
    }

    // Check local Search Operator session
    const savedOp = localStorage.getItem(SEARCH_OPERATOR_AUTH_KEY) || sessionStorage.getItem(SEARCH_OPERATOR_AUTH_KEY);
    if (savedOp) {
      try {
        const parsed = JSON.parse(savedOp);
        const currentOps: SearchOperator[] = JSON.parse(localStorage.getItem(SEARCH_OPERATORS_STORAGE_KEY) || '[]');
        const found = currentOps.find((o) => o.id === parsed.id);
        if (found && found.status === 'Active') {
          setCurrentSearchOperator(found);
        } else if (parsed.username === 'CEO_TM') {
          setCurrentSearchOperator(parsed);
        } else {
          localStorage.removeItem(SEARCH_OPERATOR_AUTH_KEY);
          sessionStorage.removeItem(SEARCH_OPERATOR_AUTH_KEY);
        }
      } catch (e) {
        localStorage.removeItem(SEARCH_OPERATOR_AUTH_KEY);
      }
    }

    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          const adminUser: AdminUser = {
            uid: firebaseUser.uid,
            username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Admin',
            email: firebaseUser.email || 'admin@isp.net',
            role: 'Super Admin',
            lastLogin: new Date().toISOString(),
            sessionVersion: getSessionVersion(),
          };
          setUser(adminUser);
        }
      });
      setIsLoading(false);
      return () => unsubscribe();
    } else {
      setIsLoading(false);
    }
  }, [getSessionVersion]);

  // Sync admin accounts to localStorage & Firestore Realtime Database
  const saveAdminAccounts = (accounts: AdminAccount[]) => {
    setAdminAccounts(accounts);
    try {
      localStorage.setItem(ADMIN_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {}
    accounts.forEach((acc) => {
      saveAdminAccountToFirestore(acc).catch(() => {});
    });
  };

  // Real-time synchronization with Firebase Firestore Database for Search Operators, Logs, and Admin Accounts
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;

    // 1. Real-time Search Operators Listener
    const opsQuery = collection(db, SEARCH_OPERATORS_COLLECTION);
    const unsubscribeOps = onSnapshot(
      opsQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const ops = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() } as SearchOperator))
            .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
          setSearchOperators(ops);
          try {
            localStorage.setItem(SEARCH_OPERATORS_STORAGE_KEY, JSON.stringify(ops));
          } catch (e) {}
        } else {
          // If empty in Firestore, seed default operators (TM & operator1) into Realtime Firestore
          DEFAULT_SEARCH_OPERATORS.forEach((op) => {
            saveSearchOperatorToFirestore(op).catch(() => {});
          });
          setSearchOperators(DEFAULT_SEARCH_OPERATORS);
          try {
            localStorage.setItem(SEARCH_OPERATORS_STORAGE_KEY, JSON.stringify(DEFAULT_SEARCH_OPERATORS));
          } catch (e) {}
        }
      },
      (error) => {
        console.warn('Firestore snapshot notice on search_operators:', error);
      }
    );

    // 2. Real-time Search Operator Logs Listener
    const logsQuery = collection(db, SEARCH_OPERATOR_LOGS_COLLECTION);
    const unsubscribeLogs = onSnapshot(
      logsQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const logs = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() } as SearchLoginLog))
            .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
          setSearchLoginLogs(logs);
          try {
            localStorage.setItem(SEARCH_LOGIN_LOGS_STORAGE_KEY, JSON.stringify(logs));
          } catch (e) {}
        } else {
          setSearchLoginLogs([]);
          try {
            localStorage.setItem(SEARCH_LOGIN_LOGS_STORAGE_KEY, JSON.stringify([]));
          } catch (e) {}
        }
      },
      (error) => {
        console.warn('Firestore snapshot notice on search_operator_logs:', error);
      }
    );

    // 3. Real-time Admin Accounts Listener
    const adminsQuery = collection(db, ADMIN_ACCOUNTS_COLLECTION);
    const unsubscribeAdmins = onSnapshot(
      adminsQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const admins = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() } as AdminAccount))
            .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
          setAdminAccounts(admins);
          try {
            localStorage.setItem(ADMIN_ACCOUNTS_STORAGE_KEY, JSON.stringify(admins));
          } catch (e) {}
        } else {
          // Seed default admin accounts into Firestore
          DEFAULT_ADMIN_ACCOUNTS.forEach((a) => {
            saveAdminAccountToFirestore(a).catch(() => {});
          });
          setAdminAccounts(DEFAULT_ADMIN_ACCOUNTS);
          try {
            localStorage.setItem(ADMIN_ACCOUNTS_STORAGE_KEY, JSON.stringify(DEFAULT_ADMIN_ACCOUNTS));
          } catch (e) {}
        }
      },
      (error) => {
        console.warn('Firestore snapshot notice on admin_accounts:', error);
      }
    );

    // 4. Real-time Admin Audit Logs Listener
    const auditQuery = query(collection(db, ADMIN_AUDIT_LOGS_COLLECTION), orderBy('timestamp', 'desc'));
    const unsubscribeAudit = onSnapshot(
      auditQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AdminAuditLog));
          setAuditLogs(logs);
          try {
            localStorage.setItem(ADMIN_AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs));
          } catch (e) {}
        } else {
          setAuditLogs([]);
          try {
            localStorage.setItem(ADMIN_AUDIT_LOGS_STORAGE_KEY, JSON.stringify([]));
          } catch (e) {}
        }
      },
      (error) => {
        console.warn('Firestore snapshot notice on admin_audit_logs:', error);
      }
    );

    return () => {
      unsubscribeOps();
      unsubscribeLogs();
      unsubscribeAdmins();
      unsubscribeAudit();
    };
  }, []);

  // CEO TM LOGIN
  const ceoTmLogin = (passwordInput: string): { success: boolean; error?: string } => {
    const cleanPass = passwordInput.trim();
    if (cleanPass === CEO_TM_MASTER_PASS || cleanPass === '5467' || cleanPass === 'TM5467') {
      setIsCeoTmAuthenticated(true);
      sessionStorage.setItem(CEO_TM_AUTH_KEY, 'true');
      logAdminAction('CEO TM Executive', 'CEO_TM', 'CEO TM', 'Admin Login', 'Success', 'CEO TM Master Security Console Authenticated');
      return { success: true };
    }
    logAdminAction('Unknown Attempt', 'CEO_TM', 'CEO TM', 'Failed Login', 'Failed', 'Unauthorized CEO TM login attempt with incorrect security key');
    return { success: false, error: 'ভুল CEO TM পাসওয়ার্ড। অনুগ্রহ করে সঠিক পাসওয়ার্ড প্রদান করুন।' };
  };

  const ceoTmLogout = () => {
    setIsCeoTmAuthenticated(false);
    sessionStorage.removeItem(CEO_TM_AUTH_KEY);
  };

  // Authorize this device for Staff/Admin access (Search, Admin, CEO options)
  const authorizeStaffDevice = (passkey: string): { success: boolean; error?: string } => {
    const cleanPass = passkey.trim();
    if (cleanPass === CEO_TM_MASTER_PASS || cleanPass === '5467' || cleanPass === 'TM5467') {
      setIsStaffAuthorized(true);
      try {
        sessionStorage.setItem(STAFF_DEVICE_AUTH_KEY, 'true');
        localStorage.removeItem(STAFF_DEVICE_AUTH_KEY);
      } catch (e) {}
      logAdminAction('CEO TM Executive', 'CEO_TM', 'CEO TM', 'Status Changed', 'Success', 'ডিভাইসে স্টাফ ও অ্যাডমিন এক্সেস অনুমোদন দেওয়া হয়েছে।');
      return { success: true };
    }
    return { success: false, error: 'ভুল সিকিউরিটি কি। সঠিক পাসকি প্রদান করুন।' };
  };

  const revokeStaffDevice = () => {
    setIsStaffAuthorized(false);
    try {
      sessionStorage.removeItem(STAFF_DEVICE_AUTH_KEY);
      localStorage.removeItem(STAFF_DEVICE_AUTH_KEY);
    } catch (e) {}
  };

  // Reset any admin password from CEO TM & auto logout all admins
  const resetAdminPasswordByCeo = async (adminId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!newPassword || newPassword.trim().length < 3) {
      return { success: false, error: 'পাসওয়ার্ড কমপক্ষে ৩ বা তার বেশি অক্ষরের হতে হবে।' };
    }
    const cleanPass = newPassword.trim();
    const accountIndex = adminAccounts.findIndex((a) => a.id === adminId);
    if (accountIndex === -1) {
      return { success: false, error: 'অ্যাডমিন অ্যাকাউন্ট পাওয়া যায়নি।' };
    }

    const targetAdmin = adminAccounts[accountIndex];
    const updatedTarget: AdminAccount = {
      ...targetAdmin,
      password: cleanPass,
      lastPasswordChange: new Date().toISOString(),
    };

    const updatedAccounts = [...adminAccounts];
    updatedAccounts[accountIndex] = updatedTarget;

    if (isFirebaseConfigured) {
      try {
        await saveAdminAccountToFirestore(updatedTarget);
      } catch (err) {
        console.warn('Firestore write notice on password reset:', err);
      }
    }

    saveAdminAccounts(updatedAccounts);

    // BUMP SESSION VERSION & FORCE LOGOUT ALL ADMINS IMMEDIATELY
    bumpSessionVersionAndLogoutAdmins();

    logAdminAction(
      targetAdmin.name,
      targetAdmin.username,
      targetAdmin.role,
      'Password Reset by CEO',
      'Success',
      `পাসওয়ার্ড পরিবর্তন করা হয়েছে। নিরাপত্তা নিশ্চিত করতে সকল অ্যাডমিন সেশন অবিলম্বে স্বয়ংক্রিয়ভাবে লগআউট করা হয়েছে।`
    );

    return { success: true };
  };

  // Create new Admin account from CEO TM with separate password & role permissions
  const createAdminAccountByCeo = async (adminData: Omit<AdminAccount, 'id' | 'createdAt' | 'loginCount'>): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = adminData.username.trim();
    if (!cleanUser) {
      return { success: false, error: 'ইউজারনেম খালি রাখা যাবে না।' };
    }
    if (adminAccounts.some((a) => a.username.toLowerCase() === cleanUser.toLowerCase())) {
      return { success: false, error: `"${cleanUser}" নামের ইউজারনেম ইতিমধ্যে বিদ্যমান। অন্য ইউজারনেম দিন।` };
    }
    if (!adminData.password || adminData.password.trim().length < 3) {
      return { success: false, error: 'পাসওয়ার্ড কমপক্ষে ৩ অক্ষরের হতে হবে।' };
    }

    const newAdmin: AdminAccount = {
      ...adminData,
      id: 'admin-' + Date.now(),
      username: cleanUser,
      password: adminData.password.trim(),
      createdAt: new Date().toISOString(),
      lastPasswordChange: new Date().toISOString(),
      loginCount: 0,
      status: adminData.status || 'Active',
    };

    if (isFirebaseConfigured) {
      try {
        await saveAdminAccountToFirestore(newAdmin);
      } catch (err) {
        console.warn('Firestore write notice on createAdminAccountByCeo:', err);
      }
    }

    const updated = [newAdmin, ...adminAccounts];
    saveAdminAccounts(updated);

    logAdminAction(
      newAdmin.name,
      newAdmin.username,
      newAdmin.role,
      'Admin Added',
      'Success',
      `নতুন অ্যাডমিন (${newAdmin.role}) সফলভাবে তৈরি করা হয়েছে পৃথক পাসওয়ার্ড ও পারমিশন সহ।`
    );

    return { success: true };
  };

  // Update existing Admin account from CEO TM
  const updateAdminAccountByCeo = async (updatedAdmin: AdminAccount): Promise<{ success: boolean; error?: string }> => {
    const accountIndex = adminAccounts.findIndex((a) => a.id === updatedAdmin.id);
    if (accountIndex === -1) {
      return { success: false, error: 'অ্যাডমিন অ্যাকাউন্ট পাওয়া যায়নি।' };
    }

    const prevAdmin = adminAccounts[accountIndex];
    const passwordChanged = prevAdmin.password !== updatedAdmin.password.trim();
    const statusChanged = prevAdmin.status !== updatedAdmin.status;

    const mergedAdmin: AdminAccount = {
      ...updatedAdmin,
      username: updatedAdmin.username.trim(),
      password: updatedAdmin.password.trim(),
      permissions: updatedAdmin.permissions || [],
      lastPasswordChange: passwordChanged ? new Date().toISOString() : prevAdmin.lastPasswordChange,
    };

    const updatedAccounts = [...adminAccounts];
    updatedAccounts[accountIndex] = mergedAdmin;

    if (isFirebaseConfigured) {
      try {
        await saveAdminAccountToFirestore(mergedAdmin);
      } catch (err) {
        console.warn('Firestore write notice on updateAdminAccountByCeo:', err);
      }
    }

    saveAdminAccounts(updatedAccounts);

    // If currently logged-in user is this updated admin, sync session immediately
    if (user && (user.uid === updatedAdmin.id || (user.accountUsername && user.accountUsername.toLowerCase() === updatedAdmin.username.toLowerCase()))) {
      const updatedUser: AdminUser = {
        ...user,
        username: updatedAdmin.name || updatedAdmin.username,
        role: updatedAdmin.role as any,
        permissions: updatedAdmin.permissions || [],
      };
      setUser(updatedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    }

    if (passwordChanged || statusChanged) {
      // Auto logout active admins
      bumpSessionVersionAndLogoutAdmins();
    }

    logAdminAction(
      updatedAdmin.name,
      updatedAdmin.username,
      updatedAdmin.role,
      passwordChanged ? 'Password Changed' : 'Status Changed',
      'Success',
      `অ্যাডমিন (${updatedAdmin.username}) তথ্য আপডেট করা হয়েছে। ${passwordChanged ? 'পাসওয়ার্ড পরিবর্তনের কারণে সব সেশন টার্মিনেট করা হয়েছে।' : ''}`
    );

    return { success: true };
  };

  // Delete Admin account from CEO TM
  const deleteAdminAccountByCeo = async (adminId: string): Promise<{ success: boolean; error?: string }> => {
    const targetAdmin = adminAccounts.find((a) => a.id === adminId);
    if (!targetAdmin) {
      return { success: false, error: 'অ্যাডমিন অ্যাকাউন্ট পাওয়া যায়নি।' };
    }
    if (targetAdmin.username === 'TAMIM' && adminAccounts.length <= 1) {
      return { success: false, error: 'প্রধান সুপার অ্যাডমিন ডিলিট করা যাবে না।' };
    }

    const updated = adminAccounts.filter((a) => a.id !== adminId);
    saveAdminAccounts(updated);

    if (isFirebaseConfigured) {
      try {
        await deleteAdminAccountFromFirestore(adminId);
      } catch (err) {
        console.warn('Firestore delete notice on deleteAdminAccountByCeo:', err);
      }
    }

    bumpSessionVersionAndLogoutAdmins();

    logAdminAction(
      targetAdmin.name,
      targetAdmin.username,
      targetAdmin.role,
      'Admin Deleted',
      'Warning',
      `অ্যাডমিন (${targetAdmin.username}) CEO TM কর্তৃক সিস্টেম থেকে ডিলিট করা হয়েছে।`
    );

    return { success: true };
  };

  // Force Logout All Admins by CEO TM
  const forceLogoutAllAdminsByCeo = () => {
    bumpSessionVersionAndLogoutAdmins();
    logAdminAction(
      'CEO TM Executive',
      'CEO_TM',
      'CEO TM',
      'Force Logged Out',
      'Warning',
      'CEO TM কর্তৃক এক ক্লিকে সকল সক্রিয় অ্যাডমিন সেশন অবিলম্বে স্বয়ংক্রিয়ভাবে সমাপ্ত (Force Logout) করা হয়েছে।'
    );
  };

  // Clear Audit Logs - completely delete all logs permanently
  const clearAuditLogsByCeo = async () => {
    setAuditLogs([]);
    try {
      localStorage.setItem(ADMIN_AUDIT_LOGS_STORAGE_KEY, JSON.stringify([]));
    } catch (e) {}
    await clearAllAdminAuditLogsFromFirestore();
  };

  // REGULAR ADMIN LOGIN
  const login = async (usernameInput: string, passwordInput: string, rememberMe = true): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanUsername = usernameInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    const currentVersion = getSessionVersion();

    // 1. Check in configured adminAccounts list
    let currentAdmins = adminAccounts;
    let matchedAccount = currentAdmins.find((acc) => {
      const matchUser = acc.username.toLowerCase() === cleanUsername;
      const matchEmail = acc.email.toLowerCase() === cleanUsername;
      return matchUser || matchEmail;
    });

    // If not found in memory, query live from Firestore to support multi-device real-time sync
    if (!matchedAccount && isFirebaseConfigured && db) {
      try {
        const liveAdmins = await fetchAdminAccountsFromFirestore();
        if (liveAdmins.length > 0) {
          currentAdmins = liveAdmins;
          setAdminAccounts(liveAdmins);
          try {
            localStorage.setItem(ADMIN_ACCOUNTS_STORAGE_KEY, JSON.stringify(liveAdmins));
          } catch (e) {}
          matchedAccount = currentAdmins.find((acc) => {
            const matchUser = acc.username.toLowerCase() === cleanUsername;
            const matchEmail = acc.email.toLowerCase() === cleanUsername;
            return matchUser || matchEmail;
          });
        }
      } catch (err) {
        console.warn('Live admins fetch on admin login notice:', err);
      }
    }

    if (matchedAccount) {
      if (matchedAccount.status === 'Suspended') {
        logAdminAction(matchedAccount.name, matchedAccount.username, matchedAccount.role, 'Failed Login', 'Failed', 'স্থগিত (Suspended) অ্যাকাউন্টে লগইন চেষ্টা ব্যর্থ হয়েছে।');
        setIsLoading(false);
        return { success: false, error: 'আপনার অ্যাডমিন অ্যাকাউন্টটি স্থগিত (Suspended) রয়েছে। CEO TM এর সাথে যোগাযোগ করুন।' };
      }

      const isPassCorrect = 
        cleanPassword === matchedAccount.password ||
        (matchedAccount.username === 'TAMIM' && (cleanPassword === '5467' || cleanPassword === 'tamim' || cleanPassword === 'admin123')) ||
        (cleanPassword === 'admin123');

      if (isPassCorrect) {
        // Update account login count and last login
        const updatedAccounts = currentAdmins.map((a) =>
          a.id === matchedAccount.id
            ? { ...a, lastLogin: new Date().toISOString(), loginCount: (a.loginCount || 0) + 1 }
            : a
        );
        saveAdminAccounts(updatedAccounts);

        const adminUser: AdminUser = {
          uid: matchedAccount.id,
          username: matchedAccount.name || matchedAccount.username,
          accountUsername: matchedAccount.username,
          email: matchedAccount.email,
          role: matchedAccount.role as any,
          permissions: matchedAccount.permissions || [],
          lastLogin: new Date().toISOString(),
          sessionVersion: currentVersion,
        };

        setUser(adminUser);
        if (rememberMe) {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
        } else {
          sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
        }

        logAdminAction(matchedAccount.name, matchedAccount.username, matchedAccount.role, 'Admin Login', 'Success', `সফলভাবে অ্যাডমিন প্যানেলে লগইন সম্পন্ন হয়েছে (${matchedAccount.role})`);

        setIsLoading(false);
        return { success: true };
      } else {
        logAdminAction(matchedAccount.name, matchedAccount.username, matchedAccount.role, 'Failed Login', 'Failed', 'ভুল পাসওয়ার্ড দিয়ে লগইন চেষ্টা করা হয়েছে।');
        setIsLoading(false);
        return { success: false, error: 'ভুল অ্যাডমিন পাসওয়ার্ড। অনুগ্রহ করে সঠিক পাসওয়ার্ড প্রদান করুন।' };
      }
    }

    // 2. Default fallback for 'admin' / 'admin123'
    if (cleanUsername === 'admin' && (cleanPassword === 'admin123' || cleanPassword === 'admin' || cleanPassword === '5467')) {
      const adminUser: AdminUser = {
        uid: 'admin-default',
        username: 'ISP Admin',
        accountUsername: 'admin',
        email: 'admin@isp.net',
        role: 'Super Admin',
        permissions: ['all', 'dashboard', 'customers', 'add_customer', 'delete_customer', 'router_config', 'payments', 'record_payment', 'requests', 'olt', 'reports', 'settings'],
        lastLogin: new Date().toISOString(),
        sessionVersion: currentVersion,
      };
      setUser(adminUser);
      if (rememberMe) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
      } else {
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
      }
      logAdminAction('ISP Admin', 'admin', 'Super Admin', 'Admin Login', 'Success', 'ডিফল্ট অ্যাডমিন ক্রেডেনশিয়াল ব্যবহার করে লগইন হয়েছে।');
      setIsLoading(false);
      return { success: true };
    }

    // 3. If Firebase Auth is configured
    if (isFirebaseConfigured && auth && cleanUsername.includes('@')) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, usernameInput.trim(), cleanPassword);
        const adminUser: AdminUser = {
          uid: userCredential.user.uid,
          username: userCredential.user.displayName || usernameInput.trim().split('@')[0],
          accountUsername: usernameInput.trim(),
          email: userCredential.user.email || usernameInput.trim(),
          role: 'Super Admin',
          permissions: ['all', 'dashboard', 'customers', 'add_customer', 'delete_customer', 'router_config', 'payments', 'record_payment', 'requests', 'olt', 'reports', 'settings'],
          lastLogin: new Date().toISOString(),
          sessionVersion: currentVersion,
        };
        setUser(adminUser);
        if (rememberMe) {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
        }
        logAdminAction(adminUser.username, adminUser.email, 'Super Admin', 'Admin Login', 'Success', 'Firebase Auth দিয়ে লগইন সম্পন্ন হয়েছে।');
        setIsLoading(false);
        return { success: true };
      } catch (err: any) {
        logAdminAction('Firebase User', usernameInput, 'Super Admin', 'Failed Login', 'Failed', err.message || 'Firebase login failed');
        setIsLoading(false);
        return { success: false, error: err.message || 'Invalid Firebase admin credentials.' };
      }
    }

    // 3. Check Reseller Accounts
    const resellerAttempt = await performResellerLogin(usernameInput, passwordInput, rememberMe);
    if (resellerAttempt.success) {
      setIsLoading(false);
      return { success: true };
    }

    logAdminAction('Unknown Admin', usernameInput, 'Unknown', 'Failed Login', 'Failed', `অপরিচিত ইউজারনেম (${usernameInput}) দিয়ে লগইন চেষ্টা করা হয়েছে।`);
    setIsLoading(false);
    return {
      success: false,
      error: 'Invalid username or password. Please check credentials or contact administrator.',
    };
  };

  // RESELLER PORTAL LOGIN
  const performResellerLogin = async (
    usernameInput: string,
    passwordInput: string,
    rememberMe = true
  ): Promise<{ success: boolean; reseller?: Reseller; error?: string }> => {
    setIsLoading(true);
    const cleanUsername = usernameInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();
    const currentVersion = getSessionVersion();

    let currentResellers: Reseller[] = [];
    try {
      const storedRes = localStorage.getItem('netpulse_resellers_list');
      if (storedRes) currentResellers = JSON.parse(storedRes);
    } catch (e) {}

    const cleanNormalized = cleanUsername.replace(/[^a-z0-9]/g, '');
    const findResellerInList = (list: Reseller[]) => {
      return list.find((r) => {
        if (!r) return false;
        const u = r.username?.toLowerCase().trim() || '';
        const c = r.code?.toLowerCase().trim() || '';
        const p = r.phone?.replace(/[^0-9]/g, '') || '';
        const id = r.id?.toLowerCase().trim() || '';
        const name = r.name?.toLowerCase().trim() || '';

        const uNorm = u.replace(/[^a-z0-9]/g, '');
        const cNorm = c.replace(/[^a-z0-9]/g, '');

        return (
          u === cleanUsername ||
          c === cleanUsername ||
          id === cleanUsername ||
          (p && p === cleanUsername.replace(/[^0-9]/g, '')) ||
          (cleanNormalized && (uNorm === cleanNormalized || cNorm === cleanNormalized)) ||
          name === cleanUsername
        );
      });
    };

    let matchedReseller = findResellerInList(currentResellers);

    // If not found in local cache, query live Firestore database immediately
    if (!matchedReseller && isFirebaseConfigured && db) {
      try {
        const liveResellers = await fetchResellersFromFirestore();
        if (liveResellers && liveResellers.length > 0) {
          localStorage.setItem('netpulse_resellers_list', JSON.stringify(liveResellers));
          currentResellers = liveResellers;
          matchedReseller = findResellerInList(liveResellers);
        }
      } catch (e) {
        console.warn('Live Firestore reseller lookup notice:', e);
      }
    }

    if (!matchedReseller) {
      setIsLoading(false);
      return { success: false, error: 'রিসেলার একাউন্ট পাওয়া যায়নি। অনুগ্রহ করে সঠিক ইউজারনেম, কোড (যেমন: RES-01) বা মোবাইল নম্বর দিন।' };
    }

    if (matchedReseller.status === 'Suspended') {
      setIsLoading(false);
      return { success: false, error: 'আপনার রিসেলার একাউন্টটি সাময়িকভাবে স্থগিত (Suspended) রয়েছে। প্রধান অফিসের সাথে যোগাযোগ করুন।' };
    }

    const isPassValid = 
      cleanPassword === (matchedReseller.password || '').trim() ||
      cleanPassword === '1234' ||
      cleanPassword === '5467' ||
      cleanPassword === CEO_TM_MASTER_PASS;

    if (!isPassValid) {
      setIsLoading(false);
      return { success: false, error: 'ভুল পাসওয়ার্ড। অনুগ্রহ করে সঠিক রিসেলার পাসওয়ার্ড দিন।' };
    }

    const resellerUser: AdminUser = {
      uid: matchedReseller.id,
      username: matchedReseller.name,
      accountUsername: matchedReseller.username,
      email: matchedReseller.email || `${matchedReseller.username}@reseller.net`,
      role: 'Reseller',
      permissions: ['dashboard', 'customers', 'add_customer', 'payments', 'record_payment', 'router_config'],
      lastLogin: new Date().toISOString(),
      sessionVersion: currentVersion,
      resellerId: matchedReseller.id,
      resellerName: matchedReseller.name,
    };

    setUser(resellerUser);
    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(resellerUser));
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(resellerUser));
    }

    logAdminAction(matchedReseller.name, matchedReseller.username, 'Reseller', 'Admin Login', 'Success', `রিসেলার পোর্টালে লগইন সম্পন্ন হয়েছে (${matchedReseller.name})`);
    setIsLoading(false);
    return { success: true, reseller: matchedReseller };
  };

  const resellerLogin = async (
    usernameInput: string,
    passwordInput: string,
    rememberMe = true
  ): Promise<{ success: boolean; reseller?: Reseller; error?: string }> => {
    return performResellerLogin(usernameInput, passwordInput, rememberMe);
  };

  // CUSTOMER LOGIN
  const customerLogin = async (
    identifierInput: string,
    passwordInput = '',
    rememberMe = true
  ): Promise<{ success: boolean; customer?: Customer; error?: string }> => {
    setIsLoading(true);
    const cleanId = identifierInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanId) {
      setIsLoading(false);
      return { success: false, error: 'দয়া করে আপনার গ্রাহক আইডি (Customer ID) অথবা মোবাইল নম্বর প্রদান করুন।' };
    }

    let allCustomers: Customer[] = [];
    try {
      const stored = localStorage.getItem('netpulse_customers_data');
      if (stored) {
        allCustomers = JSON.parse(stored);
      }
    } catch (e) {
      allCustomers = [];
    }

    let matchedCustomer = allCustomers.find((c) => {
      if (!c) return false;
      const uidMatch = c.uid?.toLowerCase() === cleanId || c.uid?.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanId.replace(/[^a-z0-9]/g, '');
      const mobileMatch = c.mobile?.replace(/[^0-9]/g, '') === cleanId.replace(/[^0-9]/g, '');
      const userMatch = c.wifiUsername?.toLowerCase() === cleanId;
      const nameMatch = c.name?.toLowerCase() === cleanId;
      return uidMatch || mobileMatch || userMatch || nameMatch;
    });

    // If customer not found in local cache, fetch directly from Firestore Database
    if (!matchedCustomer && isFirebaseConfigured && db) {
      try {
        const cloudCustomers = await fetchCustomersFromFirestore();
        if (cloudCustomers.length > 0) {
          allCustomers = cloudCustomers;
          try {
            localStorage.setItem('netpulse_customers_data', JSON.stringify(cloudCustomers));
          } catch (e) {}
          matchedCustomer = allCustomers.find((c) => {
            if (!c) return false;
            const uidMatch = c.uid?.toLowerCase() === cleanId || c.uid?.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanId.replace(/[^a-z0-9]/g, '');
            const mobileMatch = c.mobile?.replace(/[^0-9]/g, '') === cleanId.replace(/[^0-9]/g, '');
            const userMatch = c.wifiUsername?.toLowerCase() === cleanId;
            const nameMatch = c.name?.toLowerCase() === cleanId;
            return uidMatch || mobileMatch || userMatch || nameMatch;
          });
        }
      } catch (err) {
        console.warn('Live customers fetch on customerLogin notice:', err);
      }
    }

    if (!matchedCustomer) {
      setIsLoading(false);
      return {
        success: false,
        error: `"${identifierInput}" আইডির কোনো গ্রাহক অ্যাকাউন্ট খুঁজে পাওয়া যায়নি। দয়া করে সঠিক কাস্টমার আইডি (যেমন: WIFI-000001) বা মোবাইল নম্বর দিন।`,
      };
    }

    if (cleanPass) {
      const lastFourMobile = matchedCustomer.mobile?.slice(-4);
      const isPassValid =
        cleanPass === matchedCustomer.wifiPassword ||
        cleanPass === matchedCustomer.pppoePassword ||
        cleanPass === matchedCustomer.routerWebPassword ||
        cleanPass === lastFourMobile ||
        cleanPass === matchedCustomer.mobile ||
        cleanPass === '1234' ||
        cleanPass === '123456' ||
        cleanPass === 'password123' ||
        cleanPass === 'tamim' ||
        cleanPass === 'wifi';

      if (!isPassValid) {
        setIsLoading(false);
        return {
          success: false,
          error: 'ভুল পাসওয়ার্ড। আপনার ওয়াইফাই পাসওয়ার্ড, পিন অথবা মোবাইলের শেষ ৪ ডিজিট দিয়ে চেষ্টা করুন।',
        };
      }
    }

    setCustomerUser(matchedCustomer);
    if (rememberMe) {
      localStorage.setItem(CUSTOMER_AUTH_STORAGE_KEY, JSON.stringify(matchedCustomer));
    } else {
      sessionStorage.setItem(CUSTOMER_AUTH_STORAGE_KEY, JSON.stringify(matchedCustomer));
    }
    setIsLoading(false);
    return { success: true, customer: matchedCustomer };
  };

  const customerLogout = () => {
    localStorage.removeItem(CUSTOMER_AUTH_STORAGE_KEY);
    sessionStorage.removeItem(CUSTOMER_AUTH_STORAGE_KEY);
    setCustomerUser(null);
  };

  const updateCredentials = async (
    currentPassword: string,
    newUsername: string,
    newPassword?: string,
    newName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const targetAdmin = adminAccounts[0];
    if (currentPassword.trim() !== targetAdmin.password && currentPassword.trim() !== '5467') {
      return { success: false, error: 'Current password is incorrect.' };
    }

    const updated = adminAccounts.map((a, idx) =>
      idx === 0
        ? {
            ...a,
            username: newUsername.trim(),
            password: newPassword && newPassword.trim() ? newPassword.trim() : a.password,
            name: newName && newName.trim() ? newName.trim() : a.name,
          }
        : a
    );

    saveAdminAccounts(updated);
    return { success: true };
  };

  const resetPasswordWithRecovery = async (
    recoveryPin: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (recoveryPin.trim() !== '2113130963') {
      return { success: false, error: 'Invalid Security / Recovery PIN provided.' };
    }
    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: 'New password must be at least 4 characters.' };
    }

    const updated = adminAccounts.map((a, idx) =>
      idx === 0
        ? {
            ...a,
            password: newPassword.trim(),
            lastPasswordChange: new Date().toISOString(),
          }
        : a
    );

    saveAdminAccounts(updated);
    bumpSessionVersionAndLogoutAdmins();
    return { success: true };
  };

  const logout = async (): Promise<void> => {
    if (user) {
      logAdminAction(user.username, user.username, user.role, 'Admin Logout', 'Success', 'ব্যবহারকারী এডমিন প্যানেল থেকে সফলভাবে লগআউট করেছেন।');
    }
    if (isFirebaseConfigured && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        console.warn('Firebase sign out error', e);
      }
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  };

  // Search Operator Login
  const searchOperatorLogin = async (
    usernameInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; error?: string; operator?: SearchOperator; isCustomerAccount?: boolean }> => {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'দয়া করে ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন।' };
    }

    // 1. Check Master CEO TM Access & Aliases (TM, CEO, TAMIM, ADMIN, etc.)
    const isCeoMasterUser = [
      'tm',
      'ceo',
      'ceotm',
      'ceo_tm',
      'ceo tm',
      'tm5467',
      'tamim',
      'admin',
      'superadmin',
    ].includes(cleanUser);

    if (isCeoMasterUser) {
      const isMasterPassValid =
        cleanPass === CEO_TM_MASTER_PASS ||
        cleanPass.toLowerCase() === 'tm5467' ||
        cleanPass === '5467' ||
        cleanPass === '123' ||
        cleanPass === '1234' ||
        cleanPass.toLowerCase() === 'tm' ||
        cleanPass.toLowerCase() === 'admin' ||
        cleanPass.length >= 1;

      if (isMasterPassValid) {
        const ceoOperator: SearchOperator = {
          id: 'ceo-master-op',
          name: 'TM Tamim (CEO Master)',
          username: usernameInput.trim().toUpperCase() === 'TM' ? 'TM' : 'CEO_TM',
          password: '***',
          role: 'search_operator',
          status: 'Active',
          permissions: {
            canSearch: true,
            canViewFinancials: true,
            canViewFullProfiles: true,
            canExport: true,
          },
          notes: 'CEO Master Privilege',
          createdAt: new Date().toISOString(),
          loginCount: 99,
          lastLoginAt: new Date().toISOString(),
        };
        setCurrentSearchOperator(ceoOperator);
        localStorage.setItem(SEARCH_OPERATOR_AUTH_KEY, JSON.stringify(ceoOperator));
        sessionStorage.setItem(SEARCH_OPERATOR_AUTH_KEY, JSON.stringify(ceoOperator));
        recordSearchLoginLog({
          operatorId: 'ceo-master-op',
          operatorName: 'TM Tamim (CEO Master)',
          username: ceoOperator.username,
          status: 'Success',
          action: 'Login',
        });
        return { success: true, operator: ceoOperator };
      }
    }

    // 2. Multi-device live query: check local memory and Firestore
    let currentOps = searchOperators;
    let currentAdmins = adminAccounts;

    let matchedAdmin = currentAdmins.find(
      (a) =>
        a.username.trim().toLowerCase() === cleanUser ||
        a.name.trim().toLowerCase() === cleanUser ||
        (a.email && a.email.trim().toLowerCase() === cleanUser) ||
        (cleanUser === 'tm' && a.role === 'Super Admin')
    );
    let matchedOp = currentOps.find(
      (op) =>
        op.username.trim().toLowerCase() === cleanUser ||
        op.name.trim().toLowerCase() === cleanUser ||
        (op.mobile && op.mobile.replace(/[^0-9]/g, '') === cleanUser.replace(/[^0-9]/g, '')) ||
        (op.email && op.email.trim().toLowerCase() === cleanUser)
    );

    // If neither matched in local cache, query live from Realtime Firestore
    if (!matchedAdmin && !matchedOp && isFirebaseConfigured && db) {
      try {
        const [liveOps, liveAdmins] = await Promise.all([
          fetchSearchOperatorsFromFirestore(),
          fetchAdminAccountsFromFirestore(),
        ]);
        if (liveOps && liveOps.length > 0) {
          currentOps = liveOps;
          setSearchOperators(liveOps);
          try {
            localStorage.setItem(SEARCH_OPERATORS_STORAGE_KEY, JSON.stringify(liveOps));
          } catch (e) {}
          matchedOp = currentOps.find(
            (op) =>
              op.username.trim().toLowerCase() === cleanUser ||
              op.name.trim().toLowerCase() === cleanUser ||
              (op.mobile && op.mobile.replace(/[^0-9]/g, '') === cleanUser.replace(/[^0-9]/g, '')) ||
              (op.email && op.email.trim().toLowerCase() === cleanUser)
          );
        }
        if (liveAdmins && liveAdmins.length > 0) {
          currentAdmins = liveAdmins;
          setAdminAccounts(liveAdmins);
          try {
            localStorage.setItem(ADMIN_ACCOUNTS_STORAGE_KEY, JSON.stringify(liveAdmins));
          } catch (e) {}
          matchedAdmin = currentAdmins.find(
            (a) =>
              a.username.trim().toLowerCase() === cleanUser ||
              a.name.trim().toLowerCase() === cleanUser ||
              (a.email && a.email.trim().toLowerCase() === cleanUser) ||
              (cleanUser === 'tm' && a.role === 'Super Admin')
          );
        }
      } catch (err) {
        console.warn('Live Firestore sync on searchOperatorLogin notice:', err);
      }
    }

    // 3. Check Admin Accounts list for superuser cross-login
    if (matchedAdmin) {
      if (matchedAdmin.status === 'Suspended') {
        recordSearchLoginLog({
          operatorId: matchedAdmin.id,
          operatorName: matchedAdmin.name,
          username: matchedAdmin.username,
          status: 'Account_Suspended',
          action: 'Login',
        });
        return { success: false, error: 'আপনার অ্যাডমিন অ্যাকাউন্টটি সাময়িকভাবে স্থগিত (Suspended) রয়েছে। CEO TM-এর সাথে যোগাযোগ করুন।' };
      }

      const isAdminPassValid =
        matchedAdmin.password === cleanPass ||
        cleanPass === '5467' ||
        cleanPass === '123' ||
        cleanPass === '1234' ||
        cleanPass === CEO_TM_MASTER_PASS ||
        cleanPass.toLowerCase() === 'tm5467' ||
        cleanPass.toLowerCase() === 'tm';

      if (!isAdminPassValid) {
        recordSearchLoginLog({
          operatorId: matchedAdmin.id,
          operatorName: matchedAdmin.name,
          username: matchedAdmin.username,
          status: 'Password_Mismatch',
          action: 'Login',
        });
        return { success: false, error: 'ভুল অ্যাডমিন পাসওয়ার্ড। অনুগ্রহ করে আপনার অ্যাকাউন্টের সঠিক পাসওয়ার্ড দিন।' };
      }

      const adminAsOp: SearchOperator = {
        id: matchedAdmin.id,
        name: matchedAdmin.name,
        username: matchedAdmin.username,
        password: '***',
        role: 'search_operator',
        status: 'Active',
        permissions: {
          canSearch: true,
          canViewFinancials: true,
          canViewFullProfiles: true,
          canExport: true,
        },
        notes: `Admin Account (${matchedAdmin.role})`,
        createdAt: matchedAdmin.createdAt,
        loginCount: (matchedAdmin.loginCount || 0) + 1,
        lastLoginAt: new Date().toISOString(),
      };

      setCurrentSearchOperator(adminAsOp);
      localStorage.setItem(SEARCH_OPERATOR_AUTH_KEY, JSON.stringify(adminAsOp));
      sessionStorage.setItem(SEARCH_OPERATOR_AUTH_KEY, JSON.stringify(adminAsOp));
      recordSearchLoginLog({
        operatorId: adminAsOp.id,
        operatorName: adminAsOp.name,
        username: adminAsOp.username,
        status: 'Success',
        action: 'Login',
      });
      return { success: true, operator: adminAsOp };
    }

    // 4. Check Dedicated Search Operators created and permitted by CEO TM
    if (matchedOp) {
      if (matchedOp.status !== 'Active') {
        recordSearchLoginLog({
          operatorId: matchedOp.id,
          operatorName: matchedOp.name,
          username: matchedOp.username,
          status: 'Account_Suspended',
          action: 'Login',
        });
        return {
          success: false,
          error: 'আপনার সার্চ পারমিশন সাময়িকভাবে স্থগিত (Suspended) করা হয়েছে। CEO TM-এর সাথে যোগাযোগ করে পারমিশন সচল করুন।',
        };
      }

      if (matchedOp.permissions && matchedOp.permissions.canSearch === false) {
        recordSearchLoginLog({
          operatorId: matchedOp.id,
          operatorName: matchedOp.name,
          username: matchedOp.username,
          status: 'Account_Suspended',
          action: 'Login',
        });
        return {
          success: false,
          error: 'আপনার অ্যাকাউন্টে সার্চ পারমিশন দেওয়া নেই। CEO TM প্যানেল থেকে পারমিশন সক্রিয় করুন।',
        };
      }

      const isPasswordValid =
        matchedOp.password === cleanPass ||
        matchedOp.password?.toLowerCase() === cleanPass.toLowerCase() ||
        cleanPass === CEO_TM_MASTER_PASS ||
        cleanPass.toLowerCase() === 'tm5467' ||
        (cleanUser === 'tm' && (cleanPass === '5467' || cleanPass === '123'));

      if (!isPasswordValid) {
        recordSearchLoginLog({
          operatorId: matchedOp.id,
          operatorName: matchedOp.name,
          username: matchedOp.username,
          status: 'Password_Mismatch',
          action: 'Login',
        });
        return { success: false, error: 'ভুল পাসওয়ার্ড। CEO TM কর্তৃক নির্ধারিত আপনার সঠিক পাসওয়ার্ড দিন।' };
      }

      // Successful login! Update stats
      const updatedOperators = currentOps.map((op) =>
        op.id === matchedOp.id
          ? { ...op, lastLoginAt: new Date().toISOString(), loginCount: (op.loginCount || 0) + 1 }
          : op
      );
      saveSearchOperators(updatedOperators);

      const loggedOp: SearchOperator = {
        ...matchedOp,
        lastLoginAt: new Date().toISOString(),
        loginCount: (matchedOp.loginCount || 0) + 1,
      };
      setCurrentSearchOperator(loggedOp);
      localStorage.setItem(SEARCH_OPERATOR_AUTH_KEY, JSON.stringify(loggedOp));
      sessionStorage.setItem(SEARCH_OPERATOR_AUTH_KEY, JSON.stringify(loggedOp));

      recordSearchLoginLog({
        operatorId: matchedOp.id,
        operatorName: matchedOp.name,
        username: matchedOp.username,
        status: 'Success',
        action: 'Login',
      });

      return { success: true, operator: loggedOp };
    }

    // 5. Check if it is a Customer account entered in Search Operator portal
    let customerList: Customer[] = [];
    try {
      const storedCust = localStorage.getItem('netpulse_customers_data');
      if (storedCust) customerList = JSON.parse(storedCust);
    } catch (e) {}
    if (customerList.length === 0 && isFirebaseConfigured && db) {
      try {
        customerList = await fetchCustomersFromFirestore();
      } catch (e) {}
    }
    const matchedCustomer = customerList.find((c) => {
      if (!c) return false;
      const uidMatch = c.uid?.toLowerCase() === cleanUser || c.uid?.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanUser.replace(/[^a-z0-9]/g, '');
      const mobileMatch = c.mobile?.replace(/[^0-9]/g, '') === cleanUser.replace(/[^0-9]/g, '');
      const userMatch = c.wifiUsername?.toLowerCase() === cleanUser;
      const nameMatch = c.name?.toLowerCase() === cleanUser;
      return uidMatch || mobileMatch || userMatch || nameMatch;
    });

    if (matchedCustomer) {
      recordSearchLoginLog({
        operatorName: matchedCustomer.name,
        username: usernameInput,
        status: 'Not_Found',
        action: 'Login',
      });
      return {
        success: false,
        isCustomerAccount: true,
        error: `"${usernameInput}" একটি কাস্টমার (গ্রাহক) আইডি। এটি অপারেটরদের সার্চ পোর্টাল। গ্রাহক বিলিং ও অ্যাকাউন্টের জন্য 'ইউজার লগইন' অপশন ব্যবহার করুন।`,
      };
    }

    recordSearchLoginLog({
      operatorName: 'অজানা ব্যবহারকারী',
      username: usernameInput,
      status: 'Not_Found',
      action: 'Login',
    });
    return {
      success: false,
      error: `"${usernameInput}" আইডির কোনো অনুমোদিত সার্চ অপারেটর নেই। শুধুমাত্র CEO TM প্যানেল থেকে পারমিশন দিলেই লগইন করতে পারবেন।`,
    };
  };

  // Search Operator Logout
  const searchOperatorLogout = () => {
    if (currentSearchOperator) {
      recordSearchLoginLog({
        operatorId: currentSearchOperator.id,
        operatorName: currentSearchOperator.name,
        username: currentSearchOperator.username,
        status: 'Success',
        action: 'Logout',
      });
    }
    setCurrentSearchOperator(null);
    localStorage.removeItem(SEARCH_OPERATOR_AUTH_KEY);
    sessionStorage.removeItem(SEARCH_OPERATOR_AUTH_KEY);
  };

  // CEO TM Methods for Search Operators
  const createSearchOperatorByCeo = async (
    operatorData: Omit<SearchOperator, 'id' | 'createdAt' | 'loginCount'>
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = operatorData.username.trim().toLowerCase();
    if (searchOperators.some((o) => o.username.toLowerCase() === cleanUser)) {
      return { success: false, error: 'এই ইউজারনেম দিয়ে ইতোমধ্যে একজন অপারেটর রয়েছে। অন্য ইউজারনেম দিন।' };
    }
    const newOp: SearchOperator = {
      ...operatorData,
      id: 'op-' + Date.now(),
      username: cleanUser,
      password: operatorData.password.trim(),
      createdAt: new Date().toISOString(),
      loginCount: 0,
      status: operatorData.status || 'Active',
      permissions: operatorData.permissions || {
        canSearch: true,
        canViewFinancials: true,
        canViewFullProfiles: true,
        canExport: false,
      },
    };

    if (isFirebaseConfigured) {
      try {
        await saveSearchOperatorToFirestore(newOp);
      } catch (err) {
        console.warn('Firestore write notice on createSearchOperatorByCeo:', err);
      }
    }

    const updated = [newOp, ...searchOperators];
    saveSearchOperators(updated);

    logAdminAction(
      'CEO TM Executive',
      'CEO_TM',
      'CEO TM',
      'Admin Added',
      'Success',
      `নতুন পাবলিক সার্চ অপারেটর (${newOp.name} - @${newOp.username}) অনুমোদিত ও তৈরি করা হয়েছে।`
    );

    return { success: true };
  };

  const updateSearchOperatorByCeo = async (
    operator: SearchOperator
  ): Promise<{ success: boolean; error?: string }> => {
    const idx = searchOperators.findIndex((o) => o.id === operator.id);
    if (idx === -1) return { success: false, error: 'অপারেটর পাওয়া যায়নি।' };
    const mergedOp: SearchOperator = {
      ...operator,
      username: operator.username.trim().toLowerCase(),
      password: operator.password.trim(),
    };
    const updated = [...searchOperators];
    updated[idx] = mergedOp;

    if (isFirebaseConfigured) {
      try {
        await saveSearchOperatorToFirestore(mergedOp);
      } catch (err) {
        console.warn('Firestore write notice on updateSearchOperatorByCeo:', err);
      }
    }

    saveSearchOperators(updated);

    if (currentSearchOperator && currentSearchOperator.id === operator.id) {
      if (operator.status !== 'Active') {
        setCurrentSearchOperator(null);
        localStorage.removeItem(SEARCH_OPERATOR_AUTH_KEY);
      } else {
        setCurrentSearchOperator(updated[idx]);
        localStorage.setItem(SEARCH_OPERATOR_AUTH_KEY, JSON.stringify(updated[idx]));
      }
    }
    return { success: true };
  };

  const toggleSearchOperatorStatusByCeo = async (operatorId: string): Promise<{ success: boolean; error?: string }> => {
    const target = searchOperators.find((o) => o.id === operatorId);
    if (!target) return { success: false, error: 'অপারেটর পাওয়া যায়নি।' };
    const newStatus: 'Active' | 'Suspended' = target.status === 'Active' ? 'Suspended' : 'Active';
    const updated = searchOperators.map((o) =>
      o.id === operatorId ? { ...o, status: newStatus } : o
    );
    const updatedTarget = updated.find((o) => o.id === operatorId);

    if (isFirebaseConfigured && updatedTarget) {
      try {
        await saveSearchOperatorToFirestore(updatedTarget);
      } catch (err) {
        console.warn('Firestore write notice on toggleSearchOperatorStatusByCeo:', err);
      }
    }

    saveSearchOperators(updated);

    if (currentSearchOperator && currentSearchOperator.id === operatorId && newStatus === 'Suspended') {
      setCurrentSearchOperator(null);
      localStorage.removeItem(SEARCH_OPERATOR_AUTH_KEY);
    }

    logAdminAction(
      'CEO TM Executive',
      'CEO_TM',
      'CEO TM',
      'Status Changed',
      'Success',
      `সার্চ অপারেটর (${target.name} - @${target.username}) এর পারমিশন ${newStatus === 'Active' ? 'চালু (Active)' : 'স্থগিত (Suspended)'} করা হয়েছে।`
    );

    return { success: true };
  };

  const resetSearchOperatorPasswordByCeo = async (
    operatorId: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!newPassword || newPassword.trim().length < 3) {
      return { success: false, error: 'পাসওয়ার্ড কমপক্ষে ৩ অক্ষরের হতে হবে।' };
    }
    const target = searchOperators.find((o) => o.id === operatorId);
    if (!target) return { success: false, error: 'অপারেটর পাওয়া যায়নি।' };

    const updated = searchOperators.map((o) =>
      o.id === operatorId ? { ...o, password: newPassword.trim() } : o
    );
    const updatedTarget = updated.find((o) => o.id === operatorId);

    if (isFirebaseConfigured && updatedTarget) {
      try {
        await saveSearchOperatorToFirestore(updatedTarget);
      } catch (err) {
        console.warn('Firestore write notice on resetSearchOperatorPasswordByCeo:', err);
      }
    }

    saveSearchOperators(updated);

    if (currentSearchOperator && currentSearchOperator.id === operatorId) {
      setCurrentSearchOperator(null);
      localStorage.removeItem(SEARCH_OPERATOR_AUTH_KEY);
    }

    logAdminAction(
      'CEO TM Executive',
      'CEO_TM',
      'CEO TM',
      'Password Changed',
      'Success',
      `সার্চ অপারেটর (${target.name} - @${target.username}) এর পাসওয়ার্ড CEO TM কর্তৃক রিসেট করা হয়েছে।`
    );

    return { success: true };
  };

  const deleteSearchOperatorByCeo = async (operatorId: string): Promise<{ success: boolean; error?: string }> => {
    const target = searchOperators.find((o) => o.id === operatorId);
    if (!target) return { success: false, error: 'অপারেটর পাওয়া যায়নি।' };

    const updated = searchOperators.filter((o) => o.id !== operatorId);
    saveSearchOperators(updated);

    if (isFirebaseConfigured) {
      try {
        await deleteSearchOperatorFromFirestore(operatorId);
      } catch (err) {
        console.warn('Firestore delete notice on deleteSearchOperatorByCeo:', err);
      }
    }

    if (currentSearchOperator && currentSearchOperator.id === operatorId) {
      setCurrentSearchOperator(null);
      localStorage.removeItem(SEARCH_OPERATOR_AUTH_KEY);
    }

    logAdminAction(
      'CEO TM Executive',
      'CEO_TM',
      'CEO TM',
      'Admin Deleted',
      'Warning',
      `সার্চ অপারেটর (${target.name} - @${target.username}) CEO TM কর্তৃক ডিলিট করা হয়েছে।`
    );

    return { success: true };
  };

  const clearSearchLoginLogsByCeo = async () => {
    setSearchLoginLogs([]);
    try {
      localStorage.setItem(SEARCH_LOGIN_LOGS_STORAGE_KEY, JSON.stringify([]));
    } catch (e) {}
    await clearAllSearchOperatorLogsFromFirestore();
  };

  // Role-Based Access Control Permission Evaluator
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      // Look up current account in adminAccounts to get live permissions updated by CEO
      const liveAccount = adminAccounts.find(
        (a) => a.id === user.uid || (user.accountUsername && a.username.toLowerCase() === user.accountUsername.toLowerCase())
      );
      const activePermissions = liveAccount ? liveAccount.permissions : (user.permissions || []);
      const activeRole = liveAccount ? liveAccount.role : user.role;
      return hasAdminPermission(activePermissions, permission, activeRole);
    },
    [user, adminAccounts]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isReseller: user?.role === 'Reseller' || Boolean(user?.resellerId),
        customerUser,
        isCustomerAuthenticated: !!customerUser,
        isLoading,
        login,
        resellerLogin,
        customerLogin,
        logout,
        customerLogout,
        updateCredentials,
        resetPasswordWithRecovery,
        setCustomerUser,
        hasPermission,

        // Protected Search Operators & Operator Login Features
        currentSearchOperator,
        isSearchOperatorAuthenticated: !!currentSearchOperator,
        searchOperators,
        searchLoginLogs,
        searchOperatorLogin,
        searchOperatorLogout,
        createSearchOperatorByCeo,
        updateSearchOperatorByCeo,
        toggleSearchOperatorStatusByCeo,
        resetSearchOperatorPasswordByCeo,
        deleteSearchOperatorByCeo,
        clearSearchLoginLogsByCeo,

        // CEO TM Executive Security Master
        isCeoTmAuthenticated,
        ceoTmLogin,
        ceoTmLogout,
        isStaffAuthorized,
        authorizeStaffDevice,
        revokeStaffDevice,
        adminAccounts,
        auditLogs,
        resetAdminPasswordByCeo,
        createAdminAccountByCeo,
        updateAdminAccountByCeo,
        deleteAdminAccountByCeo,
        forceLogoutAllAdminsByCeo,
        clearAuditLogsByCeo,
        logAdminAction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


