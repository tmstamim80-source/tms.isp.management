import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Settings2, 
  Lock, 
  Key, 
  ShieldCheck, 
  Globe, 
  RotateCw, 
  Power, 
  Check, 
  Copy, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Radio, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  Cpu, 
  Server,
  Zap,
  HardDrive
} from 'lucide-react';
import { Customer } from '../types';
import { useCustomer } from '../context/CustomerContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

interface RemoteRouterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onOpenRouterWebLogin?: (customer: Customer) => void;
}

export const RemoteRouterConfigModal: React.FC<RemoteRouterConfigModalProps> = ({
  isOpen,
  onClose,
  customer,
  onOpenRouterWebLogin,
}) => {
  const { updateCustomer } = useCustomer();
  const { isDark } = useTheme();
  const { addToast } = useToast();

  // Form states for Remote Router Config
  const [routerModel, setRouterModel] = useState<string>('TP-Link Archer C6 Dual-Band AC1200');
  const [wanType, setWanType] = useState<'PPPoE' | 'DHCP' | 'Static' | 'Bridge'>('PPPoE');
  const [pppoeUser, setPppoeUser] = useState<string>('');
  const [pppoePass, setPppoePass] = useState<string>('');
  
  // 2.4GHz WiFi
  const [wifiEnabled, setWifiEnabled] = useState<boolean>(true);
  const [ssid24, setSsid24] = useState<string>('');
  const [pass24, setPass24] = useState<string>('');
  const [channel24, setChannel24] = useState<string>('Auto (Ch 6)');
  const [security24, setSecurity24] = useState<'WPA2-PSK' | 'WPA3-SAE' | 'WPA/WPA2-PSK' | 'Open'>('WPA2-PSK');

  // 5GHz WiFi
  const [enable5g, setEnable5g] = useState<boolean>(true);
  const [ssid5g, setSsid5g] = useState<string>('');
  const [pass5g, setPass5g] = useState<string>('');

  // Remote Web Access Port
  const [remotePort, setRemotePort] = useState<number>(8080);
  const [vlanId, setVlanId] = useState<number>(100);

  // UI state
  const [showPppoePass, setShowPppoePass] = useState<boolean>(false);
  const [showWifiPass, setShowWifiPass] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [isRebooting, setIsRebooting] = useState<boolean>(false);
  const [copiedWifi, setCopiedWifi] = useState<boolean>(false);

  useEffect(() => {
    if (customer) {
      setRouterModel(customer.routerModel || 'TP-Link Archer C6 / GPON ONU HGU');
      setWanType(customer.wanType || 'PPPoE');
      const safeName = (customer.name || 'user').toLowerCase().replace(/\s+/g, '');
      const safeUid = (customer.uid || '0000').toLowerCase().slice(-4);
      setPppoeUser(customer.wifiUsername || `${safeName}_${safeUid}`);
      setPppoePass(customer.pppoePassword || '123456');
      
      const cleanName = (customer.name || 'WiFi').replace(/[^a-zA-Z0-9]/g, '');
      setSsid24(customer.wifiSsid || `${cleanName}_WiFi_2.4G`);
      setPass24(customer.wifiPassword || '88888888');
      
      setSsid5g(customer.wifi5gSsid || `${cleanName}_WiFi_5G`);
      setPass5g(customer.wifi5gPassword || customer.wifiPassword || '88888888');
      
      setWifiEnabled(customer.wifiEnabled !== false);
      setRemotePort(customer.remoteWebAccessPort || 8080);
      setVlanId(customer.vlanId || 100);
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  // Auto Generate Strong WiFi Password
  const handleGeneratePassword = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    let newPass = '';
    for (let i = 0; i < 8; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPass24(newPass);
    setPass5g(newPass);
    addToast('info', 'Generated Password', `Generated new WiFi password: ${newPass}`);
  };

  // Push Config to Router & Save
  const handlePushConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPushing(true);

    try {
      await updateCustomer(customer.id, {
        routerModel,
        wanType,
        wifiUsername: pppoeUser,
        pppoePassword: pppoePass,
        wifiSsid: ssid24,
        wifiPassword: pass24,
        wifi5gSsid: enable5g ? ssid5g : undefined,
        wifi5gPassword: enable5g ? pass5g : undefined,
        wifiEnabled,
        wifiSecurity: security24,
        remoteWebAccessPort: remotePort,
        vlanId: vlanId,
      });

      setTimeout(() => {
        setIsPushing(false);
        addToast('success', 'Router Config Pushed!', `Control Room successfully pushed WiFi & PPPoE config to ${customer.name}'s router via TR-069/OMCI.`);
        onClose();
      }, 900);
    } catch (err) {
      setIsPushing(false);
      addToast('error', 'Push Failed', 'Failed to update remote router configuration.');
    }
  };

  // Remote Reboot Router
  const handleRemoteReboot = () => {
    setIsRebooting(true);
    addToast('warning', 'Sending Reboot Signal', `Sending remote reboot packet to ${customer.name}'s router (IP: ${customer.ipAddress || '192.168.1.1'})...`);
    setTimeout(() => {
      setIsRebooting(false);
      addToast('success', 'Router Rebooted', `${customer.name}'s router rebooted successfully.`);
    }, 2000);
  };

  const routerIp = customer.ipAddress || '192.168.1.1';
  const remoteWebUrl = `http://${routerIp}:${remotePort}`;

  const cardClass = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-800 shadow-2xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden my-6 ${cardClass}`}>
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-purple-950/70 via-slate-900 to-cyan-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-500/20">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Control Room Remote Router Configuration
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  OMCI / TR-069
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Target: <strong className="text-white">{customer.name}</strong> ({customer.uid}) • IP: <span className="font-mono text-cyan-300">{routerIp}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Quick Diagnostic Banner */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Router Link Active
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">
              GPON Line: <strong className="font-mono text-cyan-300">GPON0/{customer.gponPort || 1}:{customer.onuIndex || 1}</strong>
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">
              VLAN: <strong className="font-mono text-purple-300">{vlanId}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRemoteReboot}
              disabled={isRebooting}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-all disabled:opacity-50"
            >
              <Power className={`w-3.5 h-3.5 ${isRebooting ? 'animate-spin text-rose-400' : 'text-amber-400'}`} />
              {isRebooting ? 'Rebooting...' : 'Remote Reboot'}
            </button>

            {onOpenRouterWebLogin ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRouterWebLogin(customer);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-all"
              >
                <Globe className="w-3.5 h-3.5" />
                Enter Router Web GUI
              </button>
            ) : (
              <a
                href={remoteWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Router Web GUI
              </a>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePushConfig} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Hardware & WAN Mode */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Router Hardware & WAN Mode
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">TR-069 ACS Enabled</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Router / ONU Model</label>
                <input
                  type="text"
                  value={routerModel}
                  onChange={(e) => setRouterModel(e.target.value)}
                  placeholder="TP-Link / Tenda / VSOL"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">WAN Connection Type</label>
                <select
                  value={wanType}
                  onChange={(e) => setWanType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-cyan-500 focus:outline-none"
                >
                  <option value="PPPoE">PPPoE (Recommended)</option>
                  <option value="DHCP">Dynamic IP (DHCP)</option>
                  <option value="Static">Static IP</option>
                  <option value="Bridge">Bridge Mode</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Remote Web Port</label>
                <input
                  type="number"
                  value={remotePort}
                  onChange={(e) => setRemotePort(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* PPPoE Credentials */}
            {wanType === 'PPPoE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" /> PPPoE Username
                  </label>
                  <input
                    type="text"
                    value={pppoeUser}
                    onChange={(e) => setPppoeUser(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-mono font-bold focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-cyan-400" /> PPPoE Password
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPppoePass(!showPppoePass)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300"
                    >
                      {showPppoePass ? 'Hide' : 'Show'}
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showPppoePass ? 'text' : 'password'}
                      value={pppoePass}
                      onChange={(e) => setPppoePass(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2.4 GHz WiFi Configuration */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">2.4 GHz Wireless Network (SSID & Password)</h3>
                  <p className="text-[10px] text-slate-400">Standard range WiFi for all smartphones, smart TVs, and laptops</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/40"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Auto Random Password
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">WiFi Name (2.4G SSID)</label>
                <input
                  type="text"
                  value={ssid24}
                  onChange={(e) => setSsid24(e.target.value)}
                  placeholder="e.g. MyHome_WiFi"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>2.4G WiFi Password</span>
                  <button
                    type="button"
                    onClick={() => setShowWifiPass(!showWifiPass)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300"
                  >
                    {showWifiPass ? 'Hide' : 'Show'}
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={showWifiPass ? 'text' : 'password'}
                    value={pass24}
                    onChange={(e) => setPass24(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 text-xs font-mono font-bold focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Security Mode</label>
                <select
                  value={security24}
                  onChange={(e) => setSecurity24(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                >
                  <option value="WPA2-PSK">WPA2-PSK (AES) - Most Compatible</option>
                  <option value="WPA3-SAE">WPA3-SAE - Ultra Secure</option>
                  <option value="WPA/WPA2-PSK">WPA / WPA2 Mixed</option>
                  <option value="Open">Open (No Password)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">WiFi Channel</label>
                <select
                  value={channel24}
                  onChange={(e) => setChannel24(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Auto (Ch 6)">Auto (Recommended - Ch 6)</option>
                  <option value="1">Channel 1 (2.412 GHz)</option>
                  <option value="6">Channel 6 (2.437 GHz)</option>
                  <option value="11">Channel 11 (2.462 GHz)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 5 GHz Dual-Band WiFi Configuration */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-950 border border-purple-500/40 text-purple-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">5 GHz High-Speed Wireless (Optional 5G Band)</h3>
                  <p className="text-[10px] text-slate-400">Ultra-low ping & gigabit gaming speed band</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enable5g}
                  onChange={(e) => setEnable5g(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 bg-slate-900 border-slate-700"
                />
                <span className="text-xs font-semibold text-purple-300">Enable 5G Band</span>
              </label>
            </div>

            {enable5g && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">5G WiFi Name (SSID)</label>
                  <input
                    type="text"
                    value={ssid5g}
                    onChange={(e) => setSsid5g(e.target.value)}
                    placeholder="e.g. MyHome_5G"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">5G WiFi Password</label>
                  <input
                    type={showWifiPass ? 'text' : 'password'}
                    value={pass5g}
                    onChange={(e) => setPass5g(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-purple-300 text-xs font-mono font-bold focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer & Push Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Direct OLT OMCI Flash Protocol Ready
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPushing}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 ${isPushing ? 'animate-spin' : ''}`} />
                {isPushing ? 'Pushing Config to Router...' : 'Push Config from Control Room'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
