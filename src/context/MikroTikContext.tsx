import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  MikroTikRouterConfig,
  PPPoESecret,
  PPPoEActiveSession,
  HotspotUser,
  HotspotActiveSession,
  MikroTikProfile,
  InterfaceTraffic,
  MikroTikAuditLog,
} from '../types/mikrotik';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface MikroTikContextType {
  routers: MikroTikRouterConfig[];
  activeRouter: MikroTikRouterConfig | null;
  setActiveRouter: (router: MikroTikRouterConfig | null) => void;
  isLoading: boolean;
  isTesting: boolean;
  auditLogs: MikroTikAuditLog[];
  fetchRouters: () => Promise<void>;
  testRouterConnection: (routerId: string) => Promise<{
    success: boolean;
    latency?: number;
    systemInfo?: any;
    error?: string;
  }>;
  createRouter: (data: Partial<MikroTikRouterConfig>) => Promise<{
    success: boolean;
    router?: MikroTikRouterConfig;
    error?: string;
  }>;
  updateRouter: (
    routerId: string,
    data: Partial<MikroTikRouterConfig>
  ) => Promise<{
    success: boolean;
    router?: MikroTikRouterConfig;
    error?: string;
  }>;
  deleteRouter: (routerId: string) => Promise<{ success: boolean; error?: string }>;
  fetchPPPoESecrets: (routerId: string) => Promise<PPPoESecret[]>;
  addPPPoESecret: (
    routerId: string,
    data: { name: string; password?: string; profile?: string; localAddress?: string; remoteAddress?: string; comment?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  updatePPPoESecret: (
    routerId: string,
    secretId: string,
    data: { password?: string; profile?: string; disabled?: boolean; comment?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  deletePPPoESecret: (routerId: string, secretId: string) => Promise<{ success: boolean; error?: string }>;
  fetchPPPoEActive: (routerId: string) => Promise<PPPoEActiveSession[]>;
  disconnectPPPoEActive: (routerId: string, sessionId: string) => Promise<{ success: boolean; error?: string }>;
  fetchHotspotUsers: (routerId: string) => Promise<HotspotUser[]>;
  addHotspotUser: (
    routerId: string,
    data: { name: string; password?: string; profile?: string; comment?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteHotspotUser: (routerId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  fetchProfiles: (
    routerId: string
  ) => Promise<{ pppoeProfiles: MikroTikProfile[]; hotspotProfiles: MikroTikProfile[] }>;
  fetchTraffic: (routerId: string, interfaceName?: string) => Promise<InterfaceTraffic | null>;
  fetchAuditLogs: (routerId?: string) => Promise<void>;
}

const MikroTikContext = createContext<MikroTikContextType | undefined>(undefined);

export const MikroTikProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isReseller } = useAuth();
  const { addToast } = useToast();

  const [routers, setRouters] = useState<MikroTikRouterConfig[]>([]);
  const [activeRouter, setActiveRouter] = useState<MikroTikRouterConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<MikroTikAuditLog[]>([]);

  // Build authenticated headers
  const getAuthHeaders = useCallback(() => {
    const role = user?.role || (isReseller ? 'Reseller' : 'Admin');
    const userId = user?.uid || user?.resellerId || user?.accountUsername || 'user';
    const userName = user?.username || user?.resellerName || 'Operator';
    const resellerId = user?.resellerCode || user?.resellerId || '';

    return {
      'Content-Type': 'application/json',
      'x-user-role': role,
      'x-user-id': userId,
      'x-user-name': userName,
      'x-reseller-id': resellerId,
    };
  }, [user, isReseller]);

  // Fetch routers from server proxy
  const fetchRouters = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/mikrotik/routers', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.routers)) {
          setRouters(data.routers);
          if (data.routers.length > 0 && !activeRouter) {
            setActiveRouter(data.routers[0]);
          } else if (activeRouter) {
            const updated = data.routers.find((r: MikroTikRouterConfig) => r.id === activeRouter.id);
            if (updated) setActiveRouter(updated);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch routers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, activeRouter]);

  useEffect(() => {
    fetchRouters();
  }, [user, isReseller]);

  // Test live connection to RouterOS
  const testRouterConnection = async (routerId: string) => {
    setIsTesting(true);
    try {
      const res = await fetch(`/api/mikrotik/routers/${routerId}/test`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      // Refresh list to update status pill
      await fetchRouters();

      if (data.success) {
        addToast(
          'success',
          'সংযোগ সফল!',
          `রাউটার অনলাইনে পাওয়া গেছে (${data.latency}ms)। CPU: ${data.systemInfo?.cpuLoad || 0}%`
        );
        return { success: true, latency: data.latency, systemInfo: data.systemInfo };
      } else {
        addToast('error', 'সংযোগ ব্যর্থ', data.error || 'রাউটার অফলাইন বা পোর্ট বন্ধ।');
        return { success: false, error: data.error };
      }
    } catch (err: any) {
      addToast('error', 'নেটওয়ার্ক ত্রুটি', err.message);
      return { success: false, error: err.message };
    } finally {
      setIsTesting(false);
    }
  };

  // Create router
  const createRouter = async (data: Partial<MikroTikRouterConfig>) => {
    try {
      const res = await fetch('/api/mikrotik/routers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (resData.success) {
        addToast('success', 'রাউটার সফলভাবে যুক্ত হয়েছে', `রাউটার ${resData.router.name} যুক্ত হয়েছে।`);
        await fetchRouters();
        return { success: true, router: resData.router };
      } else {
        addToast('error', 'ব্যর্থ হয়েছে', resData.error || 'রাউটার যুক্ত করা যায়নি।');
        return { success: false, error: resData.error };
      }
    } catch (err: any) {
      addToast('error', 'সার্ভার ত্রুটি', err.message);
      return { success: false, error: err.message };
    }
  };

  // Update router
  const updateRouter = async (routerId: string, data: Partial<MikroTikRouterConfig>) => {
    try {
      const res = await fetch(`/api/mikrotik/routers/${routerId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (resData.success) {
        addToast('success', 'আপডেট সম্পন্ন', 'রাউটার সেটিংস সফলভাবে সেভ করা হয়েছে।');
        await fetchRouters();
        return { success: true, router: resData.router };
      } else {
        addToast('error', 'আপডেট ব্যর্থ', resData.error);
        return { success: false, error: resData.error };
      }
    } catch (err: any) {
      addToast('error', 'সার্ভার ত্রুটি', err.message);
      return { success: false, error: err.message };
    }
  };

  // Delete router
  const deleteRouter = async (routerId: string) => {
    try {
      const res = await fetch(`/api/mikrotik/routers/${routerId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const resData = await res.json();
      if (resData.success) {
        addToast('info', 'মুছে ফেলা হয়েছে', 'রাউটারটি তালিকা থেকে সফলভাবে মুছে ফেলা হয়েছে।');
        await fetchRouters();
        if (activeRouter?.id === routerId) {
          setActiveRouter(null);
        }
        return { success: true };
      } else {
        addToast('error', 'ব্যর্থ হয়েছে', resData.error);
        return { success: false, error: resData.error };
      }
    } catch (err: any) {
      addToast('error', 'সার্ভার ত্রুটি', err.message);
      return { success: false, error: err.message };
    }
  };

  // PPPoE Secrets
  const fetchPPPoESecrets = async (routerId: string): Promise<PPPoESecret[]> => {
    try {
      const res = await fetch(`/api/mikrotik/routers/${routerId}/pppoe/secrets`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.secrets)) {
        return data.secrets;
      }
      return [];
    } catch (err) {
      console.warn('Failed to fetch PPPoE secrets:', err);
      return [];
    }
  };

  const addPPPoESecret = async (
    routerId: string,
    data: { name: string; password?: string; profile?: string; localAddress?: string; remoteAddress?: string; comment?: string }
  ) => {
    try {
      const res = await fetch(`/api/mikrotik/routers/${routerId}/pppoe/secrets`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (resData.success) {
        addToast('success', 'PPPoE ইউজার তৈরি হয়েছে', `ইউজার "${data.name}" রাউটারে সফলভাবে তৈরি হয়েছে।`);
        return { success: true };
      } else {
        addToast('error', 'ব্যর্থ হয়েছে', resData.error);
        return { success: false, error: resData.error };
      }
    } catch (err: any) {
      addToast('error', 'সার্ভার ত্রুটি', err.message);
      return { success: false, error: err.message };
    }
  };

  const updatePPPoESecret = async (
    routerId: string,
    secretId: string,
    data: { password?: string; profile?: string; disabled?: boolean; comment?: string }
  ) => {
    try {
      const res = await fetch(`/api/mikrotik/routers/${routerId}/pppoe/secrets/${secretId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (resData.success) {
        addToast('success', 'আপডেট সম্পন্ন', 'PPPoE সিক্রেট আপডেট করা হয়েছে।');
        return { success: true };
      } else {
        addToast('error', 'ব্যর্থ হয়েছে', resData.error);
        return { success: false, error: resData.error };
      }
    } catch (err: any) {
      addToast('error', 'সার্ভার ত্রুটি', err.message);
      return { success: false, error: err.message };
    }
  };

  const deletePPPoESecret = async (routerId: string, secretId: string) => {
    try {
      const res = await fetch(`/api/mikrotik/routers/${routerId}/pppoe/secrets/${secretId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const resData = await res.json();
      if (resData.success) {
        addToast('info', 'ডিলিট সম্পন্ন', 'PPPoE ইউজার অ্যাকাউন্ট রাউটার থেকে মুছে ফেলা হয়েছে।');
        return { success: true };
      } else {
        addToast('error', 'ব্যর্থ হয়েছে', resData.error);
        return { success: false, error: resData.error };
      }
    } catch (err: any) {
      addToast('error', 'সার্ভার ত্রুটি', err.message);
      return { success: false, error: err.message };
    }
  };

  // PPPoE Active Sessions
  const fetchPPPoEActive = async (routerId: string): Promise<PPPoEActiveSession[]> => {
    try {
      const res = await fetch(`/api/mikrotik/routers/${routerId}/pppoe/active`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        return data.sessions;
      }
      return [];
    } catch (err) {
      return [];
    }
  };

  const disconnectPPPoEActive = async (routerId: string, sessionId: string) => {
    try {
      const res = await fetch(`/api/mikrotik/routers/${routerId}/pppoe/active/${sessionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const resData = await res.json();
      if (resData.success) {
        addToast('info', 'সেশন ডিসকানেক্টেড', 'সেশন সফলভাবে বিচ্ছিন্ন করা হয়েছে।');
        return { success: true };
      } else {
        addToast('error', 'ব্যর্থ হয়েছে', resData.error);
        return { success: false, error: resData.error };
      }
    } catch (err: any) {
      addToast('error', 'সার্ভার ত্রুটি', err.message);
      return { success: false, error: err.message };
    }
  };

  // Hotspot
  const fetchHotspotUsers = async (routerId: string): Promise<HotspotUser[]> => {
    try {
      const res = await fetch(`/api/mikrotik/routers/${routerId}/hotspot/users`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        return data.users;
      }
      return [];
    } catch (err) {
      return [];
    }
  };

  const addHotspotUser = async (
    routerId: string,
    data: { name: string; password?: string; profile?: string; comment?: string }
  ) => {
    try {
      const res = await fetch(`/api/mikrotik/routers/${routerId}/hotspot/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (resData.success) {
        addToast('success', 'হটস্পট ইউজার তৈরি হয়েছে', `ইউজার "${data.name}" তৈরি হয়েছে।`);
        return { success: true };
      } else {
        addToast('error', 'ব্যর্থ হয়েছে', resData.error);
        return { success: false, error: resData.error };
      }
    } catch (err: any) {
      addToast('error', 'সার্ভার ত্রুটি', err.message);
      return { success: false, error: err.message };
    }
  };

  const deleteHotspotUser = async (routerId: string, userId: string) => {
    try {
      const res = await fetch(`/api/mikrotik/routers/${routerId}/hotspot/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const resData = await res.json();
      if (resData.success) {
        addToast('info', 'মুছে ফেলা হয়েছে', 'হটস্পট ইউজার অ্যাকাউন্ট মুছে ফেলা হয়েছে।');
        return { success: true };
      } else {
        addToast('error', 'ব্যর্থ হয়েছে', resData.error);
        return { success: false, error: resData.error };
      }
    } catch (err: any) {
      addToast('error', 'সার্ভার ত্রুটি', err.message);
      return { success: false, error: err.message };
    }
  };

  // Profiles
  const fetchProfiles = async (
    routerId: string
  ): Promise<{ pppoeProfiles: MikroTikProfile[]; hotspotProfiles: MikroTikProfile[] }> => {
    try {
      const res = await fetch(`/api/mikrotik/routers/${routerId}/profiles`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return {
        pppoeProfiles: data.pppoeProfiles || [],
        hotspotProfiles: data.hotspotProfiles || [],
      };
    } catch (err) {
      return { pppoeProfiles: [], hotspotProfiles: [] };
    }
  };

  // Live traffic
  const fetchTraffic = async (routerId: string, interfaceName: string = 'ether1'): Promise<InterfaceTraffic | null> => {
    try {
      const res = await fetch(`/api/mikrotik/routers/${routerId}/traffic?interface=${encodeURIComponent(interfaceName)}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.traffic) {
        return data.traffic;
      }
      return null;
    } catch (err) {
      return null;
    }
  };

  // Audit logs
  const fetchAuditLogs = async (routerId?: string) => {
    try {
      const url = routerId ? `/api/mikrotik/audit-logs?routerId=${routerId}` : '/api/mikrotik/audit-logs';
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      // ignore
    }
  };

  return (
    <MikroTikContext.Provider
      value={{
        routers,
        activeRouter,
        setActiveRouter,
        isLoading,
        isTesting,
        auditLogs,
        fetchRouters,
        testRouterConnection,
        createRouter,
        updateRouter,
        deleteRouter,
        fetchPPPoESecrets,
        addPPPoESecret,
        updatePPPoESecret,
        deletePPPoESecret,
        fetchPPPoEActive,
        disconnectPPPoEActive,
        fetchHotspotUsers,
        addHotspotUser,
        deleteHotspotUser,
        fetchProfiles,
        fetchTraffic,
        fetchAuditLogs,
      }}
    >
      {children}
    </MikroTikContext.Provider>
  );
};

export const useMikroTik = (): MikroTikContextType => {
  const context = useContext(MikroTikContext);
  if (!context) {
    throw new Error('useMikroTik must be used within a MikroTikProvider');
  }
  return context;
};
