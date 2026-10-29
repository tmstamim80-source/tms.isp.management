import React, { useState, useEffect } from 'react';
import { MikroTikRouterConfig } from '../types/mikrotik';
import { useReseller } from '../context/ResellerContext';
import { useToast } from '../context/ToastContext';
import { 
  X, 
  Server, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Wifi, 
  Activity, 
  CheckCircle2, 
  Copy, 
  AlertCircle,
  Users,
  Radio,
  Sliders
} from 'lucide-react';

interface MikroTikRouterModalProps {
  isOpen: boolean;
  onClose: () => void;
  routerToEdit?: MikroTikRouterConfig | null;
  onSave: (data: Partial<MikroTikRouterConfig>) => Promise<{ success: boolean }>;
}

export const MikroTikRouterModal: React.FC<MikroTikRouterModalProps> = ({
  isOpen,
  onClose,
  routerToEdit,
  onSave,
}) => {
  const { resellers } = useReseller();
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('8728');
  const [useSsl, setUseSsl] = useState(false);
  const [username, setUsername] = useState('tamim_admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [assignedResellerIds, setAssignedResellerIds] = useState<string[]>(['all']);
  const [allowedFeatures, setAllowedFeatures] = useState<string[]>([
    'pppoe',
    'hotspot',
    'traffic',
    'profiles',
    'active_sessions',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);

  useEffect(() => {
    if (routerToEdit) {
      setName(routerToEdit.name || '');
      setHost(routerToEdit.host || '');
      setPort(String(routerToEdit.port || 8728));
      setUseSsl(Boolean(routerToEdit.useSsl));
      setUsername(routerToEdit.username || '');
      setPassword(''); // Keep blank unless updating
      setAssignedResellerIds(routerToEdit.assignedResellerIds || ['all']);
      setAllowedFeatures(routerToEdit.allowedFeatures || ['pppoe', 'hotspot', 'traffic', 'profiles', 'active_sessions']);
    } else {
      setName('');
      setHost('');
      setPort('8728');
      setUseSsl(false);
      setUsername('tamim_admin');
      setPassword('');
      setAssignedResellerIds(['all']);
      setAllowedFeatures(['pppoe', 'hotspot', 'traffic', 'profiles', 'active_sessions']);
    }
  }, [routerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleToggleReseller = (codeOrId: string) => {
    if (codeOrId === 'all') {
      if (assignedResellerIds.includes('all')) {
        setAssignedResellerIds([]);
      } else {
        setAssignedResellerIds(['all']);
      }
      return;
    }

    const withoutAll = assignedResellerIds.filter((id) => id !== 'all');
    if (withoutAll.includes(codeOrId)) {
      setAssignedResellerIds(withoutAll.filter((id) => id !== codeOrId));
    } else {
      setAssignedResellerIds([...withoutAll, codeOrId]);
    }
  };

  const handleToggleFeature = (feat: string) => {
    if (allowedFeatures.includes(feat)) {
      setAllowedFeatures(allowedFeatures.filter((f) => f !== feat));
    } else {
      setAllowedFeatures([...allowedFeatures, feat]);
    }
  };

  const cliSetupCommand = `# MikroTik RouterOS Terminal Commands
/ip service set api port=${port || 8728} disabled=no
/user group add name=tamim-api policy=api,read,write,test
/user add name=${username || 'tamim_admin'} group=tamim-api password="${password || 'YourPassword123'}"
/ip firewall filter add chain=input protocol=tcp dst-port=${port || 8728} action=accept comment="Allow TAMIM NET API"`;

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliSetupCommand);
    setCopiedCli(true);
    addToast('info', 'কপি সম্পন্ন', 'RouterOS CLI কনফিগারেশন কমান্ড ক্লিপবোর্ডে কপি হয়েছে।');
    setTimeout(() => setCopiedCli(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !host.trim() || !username.trim()) {
      addToast('error', 'অসম্পূর্ণ ফরম', 'রাউটার নাম, হোস্ট/আইপি এবং এপিআই ইউজারনেম আবশ্যক।');
      return;
    }

    if (!routerToEdit && !password.trim()) {
      addToast('error', 'পাসওয়ার্ড আবশ্যক', 'নতুন রাউটার যুক্ত করার সময় API পাসওয়ার্ড প্রদান করতে হবে।');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<MikroTikRouterConfig> = {
        name: name.trim(),
        host: host.trim(),
        port: parseInt(port, 10) || 8728,
        useSsl,
        username: username.trim(),
        assignedResellerIds: assignedResellerIds.length === 0 ? ['all'] : assignedResellerIds,
        allowedFeatures: allowedFeatures as any,
      };

      if (password) {
        payload.password = password;
      }

      const res = await onSave(payload);
      if (res.success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-[#09111D] border border-cyan-500/40 shadow-2xl z-10 overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0C1524] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                {routerToEdit ? 'মিক্রোটিক রাউটার সেটিংস এডিট' : 'নতুন মিক্রোটিক রাউটার যুক্ত করুন'}
              </h3>
              <p className="text-xs text-slate-400">
                MikroTik RouterOS API ইন্টিগ্রেশন ও মাল্টি-টেন্যান্ট পারমিশন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          
          {/* General Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="font-bold text-slate-300">
                রাউটারের নাম (Router Name / Location) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: Tamim Core CCR2004 - Central Hub"
                className="w-full bg-[#111C2E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-400 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">
                ম্যানেজমেন্ট IP অথবা Hostname <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="103.xxx.xxx.xxx অথবা ddns.router.net"
                className="w-full bg-[#111C2E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">
                RouterOS API Port <span className="text-rose-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  required
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="8728"
                  className="flex-1 bg-[#111C2E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-400 font-mono"
                />
                <label className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#111C2E] border border-slate-700 text-slate-300 cursor-pointer text-[11px] font-semibold">
                  <input
                    type="checkbox"
                    checked={useSsl}
                    onChange={(e) => {
                      setUseSsl(e.target.checked);
                      if (e.target.checked && port === '8728') setPort('8729');
                      if (!e.target.checked && port === '8729') setPort('8728');
                    }}
                    className="accent-cyan-400 rounded-sm"
                  />
                  <span>SSL (8729)</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">
                API Username <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tamim_admin"
                className="w-full bg-[#111C2E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 flex items-center justify-between">
                <span>API Password {routerToEdit && '(পরিবর্তন করতে চাইলে লিখুন)'}</span>
                {routerToEdit?.hasPassword && (
                  <span className="text-[10px] text-emerald-400 font-mono font-normal">
                    ✓ এনক্রিপ্টেড পাসওয়ার্ড সেভ রয়েছে
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={routerToEdit?.hasPassword ? '••••••••' : 'রাউটার এপিআই পাসওয়ার্ড'}
                  className="w-full bg-[#111C2E] border border-slate-700 rounded-xl px-3.5 py-2.5 pr-10 text-white placeholder-slate-500 outline-none focus:border-cyan-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Reseller Assignment (Tenant Isolation) */}
          <div className="p-4 rounded-2xl bg-[#0D1726] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>রিসেলার অ্যাক্সেস পারমিশন (Tenant Assignment)</span>
              </label>
              <span className="text-[10px] text-slate-400">
                যাদের অনুমতি দেবেন তারাই কেবল এই রাউটার দেখতে পারবে
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleToggleReseller('all')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  assignedResellerIds.includes('all')
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-[#121E31] border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                ✓ সকল রিসেলার (Shared All)
              </button>

              {resellers.map((reseller) => {
                const isSelected =
                  assignedResellerIds.includes('all') ||
                  assignedResellerIds.includes(reseller.id) ||
                  assignedResellerIds.includes(reseller.code);

                return (
                  <button
                    key={reseller.id}
                    type="button"
                    onClick={() => handleToggleReseller(reseller.code || reseller.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-[#121E31] border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {reseller.name} ({reseller.code})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Allowed Features Checkboxes */}
          <div className="p-4 rounded-2xl bg-[#0D1726] border border-slate-800 space-y-3">
            <label className="font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>অনুমোদিত ফিচারসমূহ (Allowed Sub-Systems)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { id: 'pppoe', label: 'PPPoE Secret Management (ব্রডব্যান্ড গ্রাহক তৈরি/ডিলিট)' },
                { id: 'active_sessions', label: 'Active Sessions & Kick (একটিভ সংযোগ মনিটর)' },
                { id: 'traffic', label: 'Live Traffic Monitor (রিয়েলটাইম ইন্টারফেস ব্যান্ডউইথ)' },
                { id: 'hotspot', label: 'Hotspot User Management (ওয়াইফাই হটস্পট ইউজার)' },
                { id: 'profiles', label: 'Bandwidth Profiles (প্যাকেজ স্পিড লিমিট)' },
              ].map((feat) => (
                <label
                  key={feat.id}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#121E31] border border-slate-800 hover:border-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={allowedFeatures.includes(feat.id)}
                    onChange={() => handleToggleFeature(feat.id)}
                    className="accent-cyan-400 rounded-sm"
                  />
                  <span className="text-slate-200">{feat.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Quick CLI Helper Box */}
          <div className="p-4 rounded-2xl bg-[#080E18] border border-cyan-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>MikroTik RouterOS কমান্ড (Winbox / SSH Terminal-এ পেস্ট করুন):</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCli}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900 text-[10px] font-bold cursor-pointer"
              >
                {copiedCli ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCli ? 'কপি হয়েছে' : 'কপি করুন'}</span>
              </button>
            </div>
            <pre className="p-2.5 rounded-xl bg-black/60 border border-slate-800 text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
              {cliSetupCommand}
            </pre>
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
            >
              বাতিল
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs shadow-lg shadow-cyan-500/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>সংরক্ষণ হচ্ছে...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{routerToEdit ? 'পরিবর্তন সেভ করুন' : 'রাউটার সংরক্ষণ করুন'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
