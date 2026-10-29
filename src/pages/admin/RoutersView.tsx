import React, { useState, useEffect, useMemo } from 'react';
import { 
  Server, 
  Wifi, 
  Activity, 
  Users, 
  Radio, 
  ShieldCheck, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  Sliders, 
  Power, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  Layers, 
  Search, 
  Globe, 
  Lock, 
  Cpu, 
  HardDrive,
  Database,
  ExternalLink
} from 'lucide-react';
import { useMikroTik } from '../../context/MikroTikContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { MikroTikRouterConfig, PPPoESecret, PPPoEActiveSession, HotspotUser, MikroTikProfile, InterfaceTraffic } from '../../types/mikrotik';
import { MikroTikRouterModal } from '../../components/MikroTikRouterModal';
import { ConfirmModal } from '../../components/ConfirmModal';

export const RoutersView: React.FC = () => {
  const {
    routers,
    activeRouter,
    setActiveRouter,
    isLoading,
    isTesting,
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
    auditLogs,
    fetchAuditLogs,
    fetchRouters,
  } = useMikroTik();

  const { user, isReseller } = useAuth();
  const { addToast } = useToast();
  const { isDark } = useTheme();

  const isSuperAdmin = ['Super Admin', 'CEO', 'Admin', 'Master'].includes(user?.role || '');

  // Sub-tabs for the selected router
  type RouterSubTab = 'pppoe' | 'active' | 'traffic' | 'hotspot' | 'profiles' | 'logs';
  const [currentSubTab, setCurrentSubTab] = useState<RouterSubTab>('pppoe');

  // Modals state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [routerToEdit, setRouterToEdit] = useState<MikroTikRouterConfig | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [routerToDelete, setRouterToDelete] = useState<MikroTikRouterConfig | null>(null);

  // PPPoE data
  const [secrets, setSecrets] = useState<PPPoESecret[]>([]);
  const [activeSessions, setActiveSessions] = useState<PPPoEActiveSession[]>([]);
  const [profiles, setProfiles] = useState<MikroTikProfile[]>([]);
  const [isLoadingSubData, setIsLoadingSubData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add PPPoE Modal state
  const [isAddSecretOpen, setIsAddSecretOpen] = useState(false);
  const [newSecretName, setNewSecretName] = useState('');
  const [newSecretPass, setNewSecretPass] = useState('');
  const [newSecretProfile, setNewSecretProfile] = useState('');
  const [newSecretComment, setNewSecretComment] = useState('');

  // Live Traffic Monitor
  const [selectedInterface, setSelectedInterface] = useState('ether1');
  const [trafficData, setTrafficData] = useState<InterfaceTraffic | null>(null);
  const [rxHistory, setRxHistory] = useState<number[]>(new Array(24).fill(0));
  const [txHistory, setTxHistory] = useState<number[]>(new Array(24).fill(0));
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Load sub-data whenever activeRouter or sub-tab changes
  const loadSubData = async () => {
    if (!activeRouter) return;
    setIsLoadingSubData(true);
    try {
      if (currentSubTab === 'pppoe') {
        const list = await fetchPPPoESecrets(activeRouter.id);
        setSecrets(list);
        const profs = await fetchProfiles(activeRouter.id);
        setProfiles(profs.pppoeProfiles);
      } else if (currentSubTab === 'active') {
        const list = await fetchPPPoEActive(activeRouter.id);
        setActiveSessions(list);
      } else if (currentSubTab === 'profiles') {
        const profs = await fetchProfiles(activeRouter.id);
        setProfiles(profs.pppoeProfiles);
      } else if (currentSubTab === 'logs') {
        await fetchAuditLogs(activeRouter.id);
      }
    } finally {
      setIsLoadingSubData(false);
    }
  };

  useEffect(() => {
    loadSubData();
  }, [activeRouter?.id, currentSubTab]);

  // Traffic Polling Effect when on traffic tab
  useEffect(() => {
    if (currentSubTab !== 'traffic' || !activeRouter || activeRouter.status !== 'online') {
      setIsMonitoring(false);
      return;
    }

    setIsMonitoring(true);
    const interval = setInterval(async () => {
      const traffic = await fetchTraffic(activeRouter.id, selectedInterface);
      if (traffic) {
        setTrafficData(traffic);
        setRxHistory((prev) => [...prev.slice(1), traffic.rxBps / 1000000]);
        setTxHistory((prev) => [...prev.slice(1), traffic.txBps / 1000000]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentSubTab, activeRouter?.id, selectedInterface, activeRouter?.status]);

  // Filtered PPPoE Secrets
  const filteredSecrets = useMemo(() => {
    if (!searchQuery.trim()) return secrets;
    const q = searchQuery.toLowerCase();
    return secrets.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.remoteAddress && s.remoteAddress.includes(q)) ||
        (s.profile && s.profile.toLowerCase().includes(q)) ||
        (s.comment && s.comment.toLowerCase().includes(q))
    );
  }, [secrets, searchQuery]);

  // Handle Add PPPoE Secret
  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRouter || !newSecretName || !newSecretPass) {
      addToast('error', 'অসম্পূর্ণ ফরম', 'ইউজারনেম ও পাসওয়ার্ড পূরণ করুন।');
      return;
    }

    const res = await addPPPoESecret(activeRouter.id, {
      name: newSecretName.trim(),
      password: newSecretPass.trim(),
      profile: newSecretProfile || undefined,
      comment: newSecretComment.trim() || undefined,
    });

    if (res.success) {
      setIsAddSecretOpen(false);
      setNewSecretName('');
      setNewSecretPass('');
      setNewSecretProfile('');
      setNewSecretComment('');
      loadSubData();
    }
  };

  // Format bits per second to human readable
  const formatSpeed = (bps: number = 0) => {
    if (bps >= 1000000000) return `${(bps / 1000000000).toFixed(2)} Gbps`;
    if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
    if (bps >= 1000) return `${(bps / 1000).toFixed(1)} Kbps`;
    return `${bps} bps`;
  };

  const cardClass = isDark
    ? 'bg-slate-900/90 border-slate-800'
    : 'bg-[#0E1A2C] border-purple-500/20';

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Server className="w-6 h-6 text-cyan-400" />
            <span>মিক্রোটিক রাউটার ও সেশন কন্ট্রোল (MikroTik RouterOS)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Super Admin ও অনুমোদিত রিসেলারদের জন্য সেন্ট্রাল RouterOS API গেটওয়ে, PPPoE ও লাইভ ট্রাফিক মনিটরিং
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchRouters();
              loadSubData();
              addToast('info', 'রিফ্রেশ হচ্ছে', 'রাউটার ও সেশন ডেটা পুনরায় লোড করা হচ্ছে।');
            }}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-1.5 text-xs font-bold"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">রিফ্রেশ</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => {
                setRouterToEdit(null);
                setIsConfigModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন রাউটার যুক্ত করুন</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Router Switcher Tabs */}
      {routers.length > 0 ? (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {routers.map((r) => {
            const isSelected = activeRouter?.id === r.id;
            const isOnline = r.status === 'online';

            return (
              <button
                key={r.id}
                onClick={() => setActiveRouter(r)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-950/90 to-[#0F1E36] border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'bg-[#0A1322] border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isOnline ? 'bg-emerald-400 shadow-xs shadow-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className="font-mono">{r.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">({r.host})</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-[#0A1322] border border-slate-800 text-center space-y-3">
          <Server className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">কোনো মিক্রোটিক রাউটার কনফিগার করা নেই</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            আপনার নেটওয়ার্কের MikroTik RouterOS ডিভাইসের ম্যানেজমেন্ট আইপি ও API ক্রেডেনশিয়াল যুক্ত করুন।
          </p>
          {isSuperAdmin && (
            <button
              onClick={() => {
                setRouterToEdit(null);
                setIsConfigModalOpen(true);
              }}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>রাউটার যুক্ত করুন</span>
            </button>
          )}
        </div>
      )}

      {/* 3. Active Router Hero Card & System Diagnostics */}
      {activeRouter && (
        <div className="rounded-3xl bg-gradient-to-br from-[#09111D] via-[#0D182A] to-[#0A1322] border border-slate-800 shadow-2xl p-5 sm:p-6 space-y-6">
          
          {/* Top Info Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                <Radio className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-white">{activeRouter.name}</h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                      activeRouter.status === 'online'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        activeRouter.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                      }`}
                    />
                    <span>{activeRouter.status === 'online' ? 'Online' : 'Offline'}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Host: <strong className="text-cyan-300">{activeRouter.host}</strong> | Port: {activeRouter.port} (API) | User: {activeRouter.username}
                </p>
                {activeRouter.lastError && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{activeRouter.lastError}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Router Action Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                disabled={isTesting}
                onClick={() => testRouterConnection(activeRouter.id)}
                className="px-4 py-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Activity className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'টেস্টিং হচ্ছে...' : 'কানেকশন টেস্ট'}</span>
              </button>

              {isSuperAdmin && (
                <>
                  <button
                    onClick={() => {
                      setRouterToEdit(activeRouter);
                      setIsConfigModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="রাউটার এডিট করুন"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setRouterToDelete(activeRouter);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/30 transition-colors"
                    title="রাউটার ডিলিট করুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* System Telemetry & Resource Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* CPU Load */}
            <div className="p-3.5 rounded-2xl bg-[#09111D] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>CPU ব্যবহার</span>
                </span>
                <span className="font-mono font-bold text-white">
                  {activeRouter.systemInfo?.cpuLoad !== undefined ? `${activeRouter.systemInfo.cpuLoad}%` : 'N/A'}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-500 ${
                    (activeRouter.systemInfo?.cpuLoad || 0) > 80
                      ? 'bg-rose-500'
                      : (activeRouter.systemInfo?.cpuLoad || 0) > 50
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(activeRouter.systemInfo?.cpuLoad || 0, 100)}%` }}
                />
              </div>
            </div>

            {/* RAM / Free Memory */}
            <div className="p-3.5 rounded-2xl bg-[#09111D] border border-slate-800 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>ফ্রি মেমোরি / RAM</span>
              </span>
              <div className="font-mono font-bold text-white text-sm">
                {activeRouter.systemInfo?.freeMemory
                  ? `${Math.round(activeRouter.systemInfo.freeMemory / 1024 / 1024)} MB`
                  : 'N/A'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                মোট: {activeRouter.systemInfo?.totalMemory ? `${Math.round(activeRouter.systemInfo.totalMemory / 1024 / 1024)} MB` : 'N/A'}
              </span>
            </div>

            {/* Board & Uptime */}
            <div className="p-3.5 rounded-2xl bg-[#09111D] border border-slate-800 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>আপ-টাইম (Uptime)</span>
              </span>
              <div className="font-mono font-bold text-white text-sm truncate">
                {activeRouter.systemInfo?.uptime || 'N/A'}
              </div>
              <span className="text-[10px] text-cyan-400 font-mono truncate block">
                {activeRouter.systemInfo?.boardName || 'RouterBOARD'}
              </span>
            </div>

            {/* Version & Architecture */}
            <div className="p-3.5 rounded-2xl bg-[#09111D] border border-slate-800 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>RouterOS ভার্সন</span>
              </span>
              <div className="font-mono font-bold text-white text-sm truncate">
                {activeRouter.systemInfo?.version || 'v6.x / v7.x'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono truncate block">
                Arch: {activeRouter.systemInfo?.architecture || 'RouterOS'}
              </span>
            </div>
          </div>

          {/* Sub-Tabs Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-800/80 pt-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'pppoe' as RouterSubTab, label: 'PPPoE Secrets (গ্রাহক সিক্রেট)', icon: Users },
              { id: 'active' as RouterSubTab, label: 'Active Sessions (সক্রিয় সেশন)', icon: Activity },
              { id: 'traffic' as RouterSubTab, label: 'Live Traffic Monitor (ব্যান্ডউইথ)', icon: Radio },
              { id: 'profiles' as RouterSubTab, label: 'Bandwidth Profiles (প্ল্যান)', icon: Sliders },
              { id: 'logs' as RouterSubTab, label: 'Audit Logs (অডিট রেকর্ড)', icon: Clock },
            ].map((tab) => {
              const isActive = currentSubTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentSubTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 4. SUB-TAB VIEW 1: PPPoE Secrets */}
          {currentSubTab === 'pppoe' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ইউজারনেম, আইপি অথবা প্রোফাইল সার্চ করুন..."
                    className="w-full bg-[#0A1322] border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddSecretOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>নতুন PPPoE ইউজার তৈরি</span>
                  </button>
                </div>
              </div>

              {/* Secrets Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#070D18]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0C1524] text-slate-400 border-b border-slate-800 font-bold">
                    <tr>
                      <th className="p-3">Username</th>
                      <th className="p-3">Service</th>
                      <th className="p-3">Profile</th>
                      <th className="p-3">Remote IP</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Comment / Reseller</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredSecrets.length > 0 ? (
                      filteredSecrets.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-800/40 text-slate-200">
                          <td className="p-3 font-mono font-bold text-cyan-300">{s.name}</td>
                          <td className="p-3 font-mono text-slate-400">{s.service}</td>
                          <td className="p-3 font-mono text-emerald-400 font-semibold">{s.profile}</td>
                          <td className="p-3 font-mono text-slate-400">{s.remoteAddress || 'Auto (Pool)'}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.disabled
                                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {s.disabled ? 'Disabled' : 'Active'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 truncate max-w-[150px]">{s.comment || '-'}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={async () => {
                                  await updatePPPoESecret(activeRouter.id, s.id, {
                                    disabled: !s.disabled,
                                  });
                                  loadSubData();
                                }}
                                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                                  s.disabled
                                    ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900'
                                    : 'bg-rose-950/60 border-rose-500/30 text-rose-300 hover:bg-rose-900'
                                }`}
                                title={s.disabled ? 'চালু করুন' : 'সাময়িক বন্ধ করুন'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={async () => {
                                  if (confirm(`আপনি কি "${s.name}" অ্যাকাউন্টটি রাউটার থেকে ডিলিট করতে চান?`)) {
                                    await deletePPPoESecret(activeRouter.id, s.id);
                                    loadSubData();
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title="ডিলিট করুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          {isLoadingSubData ? 'তথ্য লোড হচ্ছে...' : 'কোনো PPPoE সিক্রেট পাওয়া যায়নি।'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. SUB-TAB VIEW 2: Active Sessions */}
          {currentSubTab === 'active' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">
                  মোট সক্রিয় PPPoE সেশন: <strong className="text-white font-mono">{activeSessions.length} জন</strong>
                </span>
                <button
                  onClick={loadSubData}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>সেশন রিফ্রেশ</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#070D18]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0C1524] text-slate-400 border-b border-slate-800 font-bold">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Service</th>
                      <th className="p-3">Assigned IP</th>
                      <th className="p-3">MAC / Caller ID</th>
                      <th className="p-3">Uptime</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {activeSessions.length > 0 ? (
                      activeSessions.map((session) => (
                        <tr key={session.id} className="hover:bg-slate-800/40 text-slate-200">
                          <td className="p-3 font-mono font-bold text-cyan-300">{session.name}</td>
                          <td className="p-3 font-mono text-slate-400">{session.service}</td>
                          <td className="p-3 font-mono text-emerald-400">{session.address}</td>
                          <td className="p-3 font-mono text-slate-400">{session.callerId || '-'}</td>
                          <td className="p-3 font-mono text-amber-300">{session.uptime}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={async () => {
                                if (confirm(`গ্রাহক "${session.name}" এর সেশন বিচ্ছিন্ন করতে চান?`)) {
                                  await disconnectPPPoEActive(activeRouter.id, session.id);
                                  loadSubData();
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 hover:bg-rose-900 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Kick / Disconnect
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          {isLoadingSubData ? 'সেশন লোড হচ্ছে...' : 'বর্তমানে কোনো সক্রিয় সেশন নেই।'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. SUB-TAB VIEW 3: Live Traffic Monitor */}
          {currentSubTab === 'traffic' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#070D18] border border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-300">ইন্টারফেস সিলেক্ট করুন:</span>
                  <select
                    value={selectedInterface}
                    onChange={(e) => setSelectedInterface(e.target.value)}
                    className="bg-[#121E31] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-400"
                  >
                    <option value="ether1">ether1 (WAN / Gateway)</option>
                    <option value="ether2">ether2 (LAN / OLT Uplink)</option>
                    <option value="ether3">ether3 (Local Office)</option>
                    <option value="sfp-plus1">sfp-plus1 (10G Core Fiber)</option>
                    <option value="sfp-plus2">sfp-plus2 (BDIX Fiber)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Live 2s Stream</span>
                  </span>
                </div>
              </div>

              {/* Live Bandwidth Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Download / Rx */}
                <div className="p-5 rounded-2xl bg-[#08111E] border border-cyan-500/40 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>Download Traffic (Rx)</span>
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {trafficData?.rxPps || 0} pps
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-cyan-300 mt-2">
                    {formatSpeed(trafficData?.rxBps)}
                  </div>
                </div>

                {/* Upload / Tx */}
                <div className="p-5 rounded-2xl bg-[#08111E] border border-amber-500/40 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Upload Traffic (Tx)</span>
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {trafficData?.txPps || 0} pps
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-amber-300 mt-2">
                    {formatSpeed(trafficData?.txBps)}
                  </div>
                </div>
              </div>

              {/* Visual Wave Graph */}
              <div className="p-4 rounded-2xl bg-[#060B14] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>রিয়েলটাইম ইন্টারফেস ব্যান্ডউইথ ওয়েভচার্ট (Traffic Graph)</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-cyan-400 font-mono">
                      <span className="w-2.5 h-2.5 bg-cyan-400 rounded-xs" /> Rx (Download)
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-mono">
                      <span className="w-2.5 h-2.5 bg-amber-400 rounded-xs" /> Tx (Upload)
                    </span>
                  </div>
                </div>

                <div className="h-44 w-full relative flex items-end pt-4">
                  <svg className="w-full h-full overflow-visible">
                    {/* Rx Polyline */}
                    <polyline
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={rxHistory
                        .map((val, idx) => `${(idx / (rxHistory.length - 1)) * 600},${140 - Math.min(val * 1.5, 120)}`)
                        .join(' ')}
                    />
                    {/* Tx Polyline */}
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={txHistory
                        .map((val, idx) => `${(idx / (txHistory.length - 1)) * 600},${140 - Math.min(val * 1.5, 120)}`)
                        .join(' ')}
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* 7. SUB-TAB VIEW 4: Profiles */}
          {currentSubTab === 'profiles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">
                  রাউটারে কনফিগারকৃত ব্যান্ডউইথ প্রোফাইলসমূহ ({profiles.length})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {profiles.map((p) => (
                  <div key={p.id} className="p-4 rounded-2xl bg-[#09111D] border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white text-sm">{p.name}</span>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 font-mono text-[10px] font-bold">
                        {p.rateLimit || 'Unlimited'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">Local Pool: {p.localAddress || 'Default'}</p>
                    <p className="text-slate-400 text-[11px]">Remote Pool: {p.remoteAddress || 'Default'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. SUB-TAB VIEW 5: Audit Logs */}
          {currentSubTab === 'logs' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 font-bold">
                রাউটারে সম্পাদিত এডমিন ও রিসেলার কার্যকলাপ অডিট লগ
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-[#08111D] border border-slate-800 text-xs flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{log.userName}</span>
                          <span className="px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                            {log.userRole}
                          </span>
                          <span className="font-mono text-cyan-400 font-semibold">{log.action}</span>
                        </div>
                        <p className="text-slate-300 mt-1">{log.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    কোনো অডিট লগ রেকর্ড পাওয়া যায়নি।
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global Add / Edit Router Modal */}
      <MikroTikRouterModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        routerToEdit={routerToEdit}
        onSave={async (data) => {
          if (routerToEdit) {
            return await updateRouter(routerToEdit.id, data);
          } else {
            return await createRouter(data);
          }
        }}
      />

      {/* Add PPPoE Secret Modal */}
      {isAddSecretOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsAddSecretOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-[#09111D] border border-emerald-500/40 p-5 shadow-2xl z-10 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>নতুন PPPoE গ্রাহক তৈরি করুন</span>
            </h3>

            <form onSubmit={handleCreateSecret} className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Username <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  value={newSecretName}
                  onChange={(e) => setNewSecretName(e.target.value)}
                  placeholder="গ্রাহক ইউজার আইডি (যেমন: user_21901)"
                  className="w-full bg-[#111C2E] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Password <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  value={newSecretPass}
                  onChange={(e) => setNewSecretPass(e.target.value)}
                  placeholder="পাসওয়ার্ড"
                  className="w-full bg-[#111C2E] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Bandwidth Profile</label>
                <select
                  value={newSecretProfile}
                  onChange={(e) => setNewSecretProfile(e.target.value)}
                  className="w-full bg-[#111C2E] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                >
                  <option value="">Default Profile</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} {p.rateLimit ? `(${p.rateLimit})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Comment / নোট</label>
                <input
                  type="text"
                  value={newSecretComment}
                  onChange={(e) => setNewSecretComment(e.target.value)}
                  placeholder="গ্রাহকের নাম বা নোট"
                  className="w-full bg-[#111C2E] border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSecretOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Router Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (routerToDelete) {
            await deleteRouter(routerToDelete.id);
            setIsDeleteModalOpen(false);
            setRouterToDelete(null);
          }
        }}
        title={`রাউটার মুছে ফেলুন: ${routerToDelete?.name}`}
        message="আপনি কি নিশ্চিত যে এই মিক্রোটিক রাউটার কনফিগারেশনটি স্থায়ীভাবে মুছে ফেলতে চান?"
        confirmText="হ্যাঁ, রাউটার মুছুন"
      />
    </div>
  );
};
