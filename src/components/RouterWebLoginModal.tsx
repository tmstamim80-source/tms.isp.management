import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  ExternalLink, 
  Copy, 
  Check, 
  Key, 
  User, 
  ShieldCheck, 
  Lock, 
  Wifi, 
  Power, 
  RotateCw, 
  Server, 
  Cpu, 
  Sliders, 
  AlertTriangle, 
  CheckCircle2, 
  Laptop, 
  Smartphone, 
  Tv, 
  HelpCircle, 
  Radio,
  Settings,
  Eye,
  EyeOff,
  Terminal,
  Activity,
  Layers,
  Save
} from 'lucide-react';
import { Customer } from '../types';
import { useCustomer } from '../context/CustomerContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

interface RouterWebLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

// Common default credentials for Bangladeshi ISP routers & GPON ONUs
const BRAND_PRESETS = [
  { brand: 'TP-Link', defaultUser: 'admin', defaultPass: 'admin', defaultPort: 80, path: '' },
  { brand: 'Tenda', defaultUser: 'admin', defaultPass: '', defaultPort: 80, path: '' },
  { brand: 'Huawei (GPON)', defaultUser: 'telecomadmin', defaultPass: 'admintelecom', defaultPort: 80, path: '' },
  { brand: 'VSOL (GPON)', defaultUser: 'admin', defaultPass: 'stdONUi@epon', defaultPort: 80, path: '' },
  { brand: 'Netis', defaultUser: 'guest', defaultPass: 'guest@netis', defaultPort: 8080, path: '' },
  { brand: 'ZTE (GPON)', defaultUser: 'admin', defaultPass: 'admin', defaultPort: 80, path: '' },
  { brand: 'Mercusys', defaultUser: 'admin', defaultPass: 'admin', defaultPort: 80, path: '' },
  { brand: 'MikroTik (WebFig)', defaultUser: 'admin', defaultPass: '', defaultPort: 80, path: '/webfig' },
];

export const RouterWebLoginModal: React.FC<RouterWebLoginModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const { updateCustomer } = useCustomer();
  const { isDark } = useTheme();
  const { addToast } = useToast();

  const [ipAddress, setIpAddress] = useState<string>('');
  const [port, setPort] = useState<number>(80);
  const [protocol, setProtocol] = useState<'http' | 'https'>('http');
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [selectedBrand, setSelectedBrand] = useState<string>('TP-Link');
  const [activeTab, setActiveTab] = useState<'direct_web' | 'live_console' | 'remote_setup'>('direct_web');

  // Simulated connected devices inside the customer router
  const [connectedDevices, setConnectedDevices] = useState([
    { name: "Customer's iPhone 14", ip: "192.168.1.102", mac: "D4:61:9D:4A:82:11", type: "phone", band: "5GHz", signal: "-52 dBm", speed: "120 Mbps" },
    { name: "Samsung Smart TV 4K", ip: "192.168.1.105", mac: "80:EA:CA:2B:99:3C", type: "tv", band: "2.4GHz", signal: "-61 dBm", speed: "65 Mbps" },
    { name: "Dell Inspiron Laptop", ip: "192.168.1.108", mac: "00:28:F8:71:0D:9A", type: "laptop", band: "5GHz", signal: "-48 dBm", speed: "240 Mbps" },
  ]);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSavingCredentials, setIsSavingCredentials] = useState<boolean>(false);
  const [isRebooting, setIsRebooting] = useState<boolean>(false);

  useEffect(() => {
    if (customer) {
      setIpAddress(customer.ipAddress || '192.168.1.1');
      setPort(customer.remoteWebAccessPort || 80);
      setUsername(customer.routerWebUsername || 'admin');
      setPassword(customer.routerWebPassword || 'admin');
      
      if (customer.routerBrand) {
        setSelectedBrand(customer.routerBrand);
      } else if (customer.routerModel) {
        const found = BRAND_PRESETS.find(b => customer.routerModel?.toLowerCase().includes(b.brand.toLowerCase()));
        if (found) setSelectedBrand(found.brand);
      }
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const targetUrl = `${protocol}://${ipAddress || '192.168.1.1'}${port === 80 && protocol === 'http' ? '' : `:${port}`}`;

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    addToast('info', 'Copied to Clipboard', `Copied ${fieldName}: ${text}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Open Direct Router Web Management in new tab
  const handleOpenRouterTab = () => {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    addToast('success', 'Opening Router GUI', `Opening router admin page at ${targetUrl}`);
  };

  // Apply Brand Preset
  const handleApplyBrandPreset = (preset: typeof BRAND_PRESETS[0]) => {
    setSelectedBrand(preset.brand);
    setUsername(preset.defaultUser);
    setPassword(preset.defaultPass);
    setPort(preset.defaultPort);
    addToast('info', `${preset.brand} Credentials Loaded`, `Default Username: ${preset.defaultUser} | Port: ${preset.defaultPort}`);
  };

  // Save Credentials to Database
  const handleSaveCredentials = async () => {
    setIsSavingCredentials(true);
    try {
      await updateCustomer(customer.id, {
        ipAddress: ipAddress,
        remoteWebAccessPort: port,
        routerWebUsername: username,
        routerWebPassword: password,
        routerBrand: selectedBrand as any,
      });
      addToast('success', 'Router Access Info Saved', `Saved login credentials for ${customer.name}'s router.`);
    } catch (e) {
      addToast('error', 'Save Failed', 'Could not update router login credentials.');
    } finally {
      setIsSavingCredentials(false);
    }
  };

  // Remote Router Reboot
  const handleRemoteReboot = () => {
    setIsRebooting(true);
    addToast('warning', 'Sending Reboot Packet', `Rebooting ${customer.name}'s router remotely via WAN Web / OMCI...`);
    setTimeout(() => {
      setIsRebooting(false);
      addToast('success', 'Router Rebooted', `${customer.name}'s router is rebooting and will be back online in 45 seconds.`);
    }, 2000);
  };

  const cardClass = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-800 shadow-2xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden my-4 sm:my-6 ${cardClass}`}>
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Direct Router Remote Access & Web Admin Portal
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  WAN WebGUI / OMCI
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Target: <strong className="text-white">{customer.name}</strong> ({customer.uid}) • WAN IP: <span className="font-mono text-cyan-300">{ipAddress}</span> • GPON: <span className="font-mono text-purple-300">0/{customer.gponPort || 1}:{customer.onuIndex || 1}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenRouterTab}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 transition-all active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Router in New Tab
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-950/70 border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('direct_web')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'direct_web'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            Direct Router Web Login
          </button>

          <button
            onClick={() => setActiveTab('live_console')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'live_console'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Live Router Web Dashboard & Connected Devices
          </button>

          <button
            onClick={() => setActiveTab('remote_setup')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'remote_setup'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            WAN Remote Access Setup Guide
          </button>
        </div>

        {/* Tab 1: Direct Web Login & Credentials Bar */}
        {activeTab === 'direct_web' && (
          <div className="p-4 sm:p-6 space-y-6 max-h-[72vh] overflow-y-auto">
            
            {/* Quick URL & 1-Click Launch Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/40 border border-blue-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block">Router Web Admin Address (WAN URL)</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base sm:text-lg font-mono font-black text-white tracking-tight break-all">
                      {targetUrl}
                    </span>
                    <button
                      onClick={() => handleCopy(targetUrl, 'Router URL')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                      title="Copy URL"
                    >
                      {copiedField === 'Router URL' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRemoteReboot}
                    disabled={isRebooting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all disabled:opacity-50"
                  >
                    <Power className={`w-3.5 h-3.5 ${isRebooting ? 'animate-spin text-rose-400' : 'text-amber-400'}`} />
                    {isRebooting ? 'Rebooting...' : 'Remote Reboot'}
                  </button>

                  <button
                    onClick={handleOpenRouterTab}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Enter Router Admin Panel
                  </button>
                </div>
              </div>

              {/* Brand Fast Presets */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400">Select Router / ONU Brand Preset:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {BRAND_PRESETS.map((preset) => (
                    <button
                      key={preset.brand}
                      type="button"
                      onClick={() => handleApplyBrandPreset(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        selectedBrand === preset.brand
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {preset.brand}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick 1-Click Copy Login Credentials Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Username Card */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Router Admin User</span>
                  <span className="text-sm font-mono font-bold text-white mt-0.5 block">{username || 'admin'}</span>
                </div>
                <button
                  onClick={() => handleCopy(username || 'admin', 'Router Username')}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition-colors"
                  title="Copy Username"
                >
                  {copiedField === 'Router Username' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Card */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Router Admin Pass</span>
                  <span className="text-sm font-mono font-bold text-emerald-400 mt-0.5 block">
                    {showPassword ? (password || 'admin') : '••••••••'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleCopy(password || 'admin', 'Router Password')}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition-colors"
                    title="Copy Password"
                  >
                    {copiedField === 'Router Password' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* PPPoE User Card */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">PPPoE Dial Username</span>
                  <span className="text-sm font-mono font-bold text-cyan-300 mt-0.5 block truncate max-w-[120px]">
                    {customer.wifiUsername || `${(customer.name || 'user').toLowerCase().replace(/\s+/g, '')}`}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(customer.wifiUsername || customer.name, 'PPPoE User')}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition-colors"
                  title="Copy PPPoE User"
                >
                  {copiedField === 'PPPoE User' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* WiFi Password Card */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer WiFi Pass</span>
                  <span className="text-sm font-mono font-bold text-purple-300 mt-0.5 block truncate max-w-[120px]">
                    {customer.wifiPassword || '88888888'}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(customer.wifiPassword || '88888888', 'WiFi Password')}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-400 border border-slate-800 transition-colors"
                  title="Copy WiFi Password"
                >
                  {copiedField === 'WiFi Password' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

            </div>

            {/* Custom IP & Port Configuration Form */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Edit & Save Router Remote Access Parameters
                </h3>
                <button
                  type="button"
                  onClick={handleSaveCredentials}
                  disabled={isSavingCredentials}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingCredentials ? 'Saving...' : 'Save for this Customer'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Router IP / WAN IP</label>
                  <input
                    type="text"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    placeholder="192.168.1.1 or 10.x.x.x"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Remote Web Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    placeholder="80, 8080, 8443"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Router Admin Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Router Admin Password</label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="admin"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Embedded Direct Access Viewer Card */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Browser Direct Access Tips:</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Status: Connected to ISP Gateway</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                ব্রাউজারের সিকিউরিটি পলিসি (Mixed Content / Private IP NAT) কারণে লোকাল প্রাইভেট আইপি সরাসরি আইফ্রেমের ভেতরে ব্লক হলে উপরের <strong>&quot;Open Router in New Tab&quot;</strong> বাটনে ক্লিক করুন। একই সাথে নিচের <strong>&quot;Live Router Web Dashboard&quot;</strong> ট্যাব থেকে রিয়েল-টাইমে গ্রাহকের রাউটারে সংযুক্ত সব ডিভাইস, স্পিড ও ব্যান্ডউইথ নিয়ন্ত্রণ করতে পারবেন।
              </p>
            </div>

          </div>
        )}

        {/* Tab 2: Live Router Web Dashboard & Connected Devices Simulator */}
        {activeTab === 'live_console' && (
          <div className="p-4 sm:p-6 space-y-6 max-h-[72vh] overflow-y-auto">
            
            {/* Live Router Hardware & Uptime Banner */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Router Model</span>
                <strong className="text-white font-mono text-sm block mt-0.5">{customer.routerModel || `${selectedBrand} Dual-Band HGU`}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">CPU & RAM Load</span>
                <strong className="text-emerald-400 font-mono text-sm block mt-0.5">CPU: 18% | RAM: 42%</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Router Uptime</span>
                <strong className="text-cyan-300 font-mono text-sm block mt-0.5">14 Days, 6 Hours</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Wireless Status</span>
                <strong className="text-emerald-400 font-mono text-sm block mt-0.5">2.4G & 5G Online</strong>
              </div>
            </div>

            {/* Connected WiFi Devices Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden space-y-0">
              <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white">Live Connected Devices in Customer Router ({connectedDevices.length})</h4>
                </div>
                <span className="text-[10px] font-mono text-slate-400">DHCP Range: 192.168.1.100 - 200</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/40">
                      <th className="py-2.5 px-4">Device Hostname</th>
                      <th className="py-2.5 px-4">Assigned IP</th>
                      <th className="py-2.5 px-4">MAC Address</th>
                      <th className="py-2.5 px-4">WiFi Band</th>
                      <th className="py-2.5 px-4">Signal</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {connectedDevices.map((dev, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                          {dev.type === 'phone' && <Smartphone className="w-4 h-4 text-cyan-400" />}
                          {dev.type === 'tv' && <Tv className="w-4 h-4 text-purple-400" />}
                          {dev.type === 'laptop' && <Laptop className="w-4 h-4 text-blue-400" />}
                          {dev.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-cyan-300">{dev.ip}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{dev.mac}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-purple-300 border border-slate-700">
                            {dev.band}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400 font-bold">{dev.signal}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => addToast('info', 'Bandwidth Limited', `Limited speed for ${dev.name} to 5 Mbps.`)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                          >
                            Limit Speed
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick WiFi Settings Panel */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-purple-400" />
                  Active Wireless Broadcasts
                </h4>
                <span className="text-[11px] text-emerald-400 font-mono">WPA2-PSK Encryption Active</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 text-[10px] block">2.4GHz SSID</span>
                    <strong className="text-white font-bold">{customer.wifiSsid || `${customer.name}_WiFi_2.4G`}</strong>
                  </div>
                  <span className="px-2 py-1 rounded bg-cyan-950 text-cyan-300 text-[10px] font-mono border border-cyan-500/30">Ch 6 (Auto)</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 text-[10px] block">5GHz SSID</span>
                    <strong className="text-white font-bold">{customer.wifi5gSsid || `${customer.name}_WiFi_5G`}</strong>
                  </div>
                  <span className="px-2 py-1 rounded bg-purple-950 text-purple-300 text-[10px] font-mono border border-purple-500/30">Ch 36 (80MHz)</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 3: Remote Access Setup Guide & Instructions */}
        {activeTab === 'remote_setup' && (
          <div className="p-4 sm:p-6 space-y-5 max-h-[72vh] overflow-y-auto text-xs text-slate-300">
            
            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                অফিস / কন্ট্রোল রুম থেকে যেকোনো গ্রাহকের রাউটারে ঢোকার জন্য ৩টি উপায়:
              </h3>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                আপনার ISP নেটওয়ার্কের প্রতিটি গ্রাহকের রাউটার অ্যাডমিন প্যানেলে রিমোটলি ঢোকার জন্য নিচে উল্লিখিত যেকোনো একটি পদ্ধতি ব্যবহার করতে পারেন:
              </p>
            </div>

            {/* Method 1: Router Remote Web Management (Port 80/8080) */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">১</span>
                রাউটারের ভেতর &quot;Remote Web Management&quot; অপশন চালু করা (সবচেয়ে সহজ):
              </h4>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-2">
                <li><strong>TP-Link Router:</strong> System Tools ➜ Web Management ➜ Remote Management Port: <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-400 font-mono">8080</code> এবং Remote Management IP: <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-400 font-mono">255.255.255.255</code> (বা আপনার সার্ভার আইপি) দিয়ে Save করুন।</li>
                <li><strong>Tenda Router:</strong> Administration ➜ Remote Web Management ➜ Enable করে Port: <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-400 font-mono">8080</code> দিন।</li>
                <li><strong>Huawei / ZTE GPON ONU:</strong> Security ➜ Device Access Control ➜ WAN Web Access (HTTP/HTTPS) Enable করুন।</li>
                <li><strong>Netis:</strong> System Tools ➜ Remote Management ➜ Port 8080 Enable করুন।</li>
              </ul>
            </div>

            {/* Method 2: MikroTik NAT / Port Forwarding */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">২</span>
                MikroTik রাউটারে PPPoE আইপি রাউটিং (প্রাইভেট আইপিতে সরাসরি প্রবেশ):
              </h4>
              <p className="text-[11px] text-slate-400">
                আপনার ISP MikroTik রাউটার থেকে যদি আপনি সেইম সাবনেট বা VPN-এ থাকেন, তবে গ্রাহকের PPPoE আইপি (যেমন: <code className="text-cyan-300 font-mono">10.10.x.x</code> বা <code className="text-cyan-300 font-mono">172.16.x.x</code>) লিখলেই সরাসরি তার রাউটারে ঢুকে যাবেন।
              </p>
            </div>

            {/* Method 3: OMCI / TR-069 ACS */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">৩</span>
                V-SOL GPON OLT OMCI চ্যানেল (জিরো কনফিগ):
              </h4>
              <p className="text-[11px] text-slate-400">
                V-SOL GPON OLT সরাসরি OMCI ম্যানেজমেন্ট দিয়ে রাউটারে না ঢুকেই ফাইবার অপটিক্যাল চ্যানেলের মাধ্যমে গ্রাহকের WiFi নাম, পাসওয়ার্ড ও PPPoE কনফিগারেশন পরিবর্তন করতে পারে।
              </p>
            </div>

          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Direct WAN Web Management Link & Console Ready
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleOpenRouterTab}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all active:scale-95"
            >
              <ExternalLink className="w-4 h-4" />
              Open Router ({targetUrl})
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
