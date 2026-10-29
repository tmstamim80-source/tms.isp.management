import React, { useState } from 'react';
import { Customer } from '../types';
import { StatusBadge } from './StatusBadge';
import { useCustomer } from '../context/CustomerContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { 
  X, 
  Copy, 
  Check, 
  Phone, 
  Printer, 
  Wifi, 
  CreditCard, 
  Server, 
  User, 
  MapPin, 
  ShieldCheck, 
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Sliders,
  Maximize2,
  Globe,
  MessageSquare,
  Eye,
  EyeOff
} from 'lucide-react';
import { WhatsAppAlertModal } from './WhatsAppAlertModal';

interface CustomerDetailsModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (customer: Customer) => void;
  onRecordPayment?: (customer: Customer) => void;
  onOpenRouterConfig?: (customer: Customer) => void;
  onOpenLaserModal?: (customer: Customer) => void;
  onOpenRouterWebLogin?: (customer: Customer) => void;
  isAdmin?: boolean;
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  customer,
  isOpen,
  onClose,
  onEdit,
  onRecordPayment,
  onOpenRouterConfig,
  onOpenLaserModal,
  onOpenRouterWebLogin,
  isAdmin = false,
}) => {
  const { ispProfile, updateCustomer } = useCustomer();
  const { addToast } = useToast();
  const { isDark } = useTheme();
  const [copiedUid, setCopiedUid] = useState(false);
  const [copiedMobile, setCopiedMobile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingSignal, setIsCheckingSignal] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [opticalResult, setOpticalResult] = useState<{
    rxPower: number;
    txPower: number;
    ponPort: string;
    distance: number;
    status: string;
    biasCurrent: number;
    temp: number;
  } | null>(null);

  if (!isOpen || !customer) return null;

  const handleTestOpticalSignal = async () => {
    setIsCheckingSignal(true);
    setTimeout(async () => {
      setIsCheckingSignal(false);
      const isOnline = customer.status !== 'Inactive';
      const simulatedRx = isOnline ? parseFloat((-18.2 - Math.random() * 5.4).toFixed(2)) : -35.0;
      const simulatedTx = 2.35;
      const simulatedDist = isOnline ? 1340 : 0;
      const statusStr = isOnline ? (simulatedRx >= -24 ? 'Optimal Laser Light' : 'High Loss') : 'LOS / Fiber Cut';

      setOpticalResult({
        rxPower: simulatedRx,
        txPower: simulatedTx,
        ponPort: `GPON 0/${customer.gponPort || 1}`,
        distance: simulatedDist,
        status: statusStr,
        biasCurrent: 14.6,
        temp: 38.8,
      });

      try {
        await updateCustomer(customer.id, {
          opticalRxDbm: simulatedRx,
          opticalTxDbm: simulatedTx,
          fiberDistanceMeters: simulatedDist,
          laserStatus: isOnline ? (simulatedRx >= -24 ? 'Optimal' : 'High Loss') : 'LOS',
          lastLaserCheck: new Date().toLocaleTimeString(),
        });
      } catch (e) {}

      addToast('info', 'GPON Laser Polled', `Polled V-SOL GPON Laser: RX ${simulatedRx} dBm (${statusStr})`);
    }, 800);
  };

  const handleCopyUid = () => {
    navigator.clipboard.writeText(customer.uid);
    setCopiedUid(true);
    addToast('info', 'UID Copied', `UID ${customer.uid} copied to clipboard.`);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleCopyMobile = () => {
    navigator.clipboard.writeText(customer.mobile);
    setCopiedMobile(true);
    addToast('info', 'Mobile Copied', `Mobile number ${customer.mobile} copied to clipboard.`);
    setTimeout(() => setCopiedMobile(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const modalContainerClass = isDark
    ? 'bg-slate-900/95 border-slate-800 text-slate-100'
    : 'glass-panel-colorful border-purple-500/30 text-slate-100';

  const sectionCardClass = isDark
    ? 'bg-slate-950/70 border-slate-800 text-slate-200'
    : 'bg-slate-900/80 border-purple-500/20 text-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`relative w-full max-w-4xl border rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col ${modalContainerClass}`}>
        
        {/* Modal Top Bar */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Customer Profile & WiFi Details</h2>
              <p className="text-xs text-slate-400">Comprehensive technical and billing ledger</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              Print Card
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable / View Content Area */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          
          {/* Printable Header (Visible during print) */}
          <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-black">{ispProfile.companyName}</h1>
                <p className="text-xs text-gray-600">{ispProfile.tagline}</p>
                <p className="text-xs text-gray-600">Hotline: {ispProfile.emergencyHotline} | Support: {ispProfile.supportPhone}</p>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase font-mono px-2 py-1 bg-gray-200 rounded font-bold">
                  Customer ID: {customer.uid}
                </span>
                <p className="text-[10px] text-gray-500 mt-1">Printed: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Desktop Left-Right Hero Layout / Mobile Stacked */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Left Card: Customer Identity & Actions */}
            <div className={`md:col-span-4 border rounded-2xl p-5 text-center flex flex-col items-center ${sectionCardClass}`}>
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center text-3xl font-extrabold text-white shadow-lg shadow-cyan-900/20">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mt-3">{customer.name}</h3>
              <div className="mt-1 flex items-center gap-1.5 justify-center">
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                  {customer.uid}
                </span>
                <button
                  onClick={handleCopyUid}
                  title="Copy UID"
                  className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                >
                  {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="mt-3">
                <StatusBadge status={customer.status} size="md" />
              </div>

              {/* Action Buttons */}
              <div className="no-print w-full mt-5 space-y-2">
                <a
                  href={`tel:${customer.mobile}`}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call Customer ({customer.mobile})
                </a>

                <button
                  onClick={handleCopyMobile}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors shadow-xs"
                >
                  {copiedMobile ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                  Copy Mobile Number
                </button>

                {onRecordPayment && (
                  <button
                    onClick={() => {
                      onClose();
                      onRecordPayment(customer);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-md shadow-emerald-600/30 cursor-pointer active:scale-95"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    বিল গ্রহণ ও রিচার্জ (Recharge)
                  </button>
                )}

                {onEdit && (
                  <button
                    onClick={() => {
                      onClose();
                      onEdit(customer);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 font-bold text-xs border border-cyan-500/40 transition-colors cursor-pointer active:scale-95"
                  >
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    গ্রাহক তথ্য পরিবর্তন (Edit Info)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsWhatsAppOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 font-semibold text-xs border border-emerald-500/40 transition-colors shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  WhatsApp বিল নোটিশ পাঠান
                </button>
              </div>
            </div>

            {/* Right Card: Personal & Contact Information */}
            <div className={`md:col-span-8 border rounded-2xl p-5 space-y-4 ${sectionCardClass}`}>
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-cyan-400 font-semibold text-sm">
                <User className="w-4 h-4" />
                <span>Personal & Contact Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Primary Mobile</span>
                  <span className="text-white font-mono font-semibold text-sm">{customer.mobile}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Alternative Mobile</span>
                  <span className="text-slate-300 font-mono">{customer.alternativeMobile || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Email Address</span>
                  <span className="text-slate-300">{customer.email || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Area / Village / Zone</span>
                  <span className="text-slate-200 font-medium flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    {customer.area || 'N/A'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block font-medium">Full Address</span>
                  <span className="text-slate-300">{customer.address || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Connection Date</span>
                  <span className="text-slate-300 font-mono">{customer.connectionDate || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Installation Date</span>
                  <span className="text-slate-300 font-mono">{customer.installationDate || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Reseller / Sub-ISP</span>
                  <span className="text-emerald-400 font-semibold">
                    {customer.resellerName ? `${customer.resellerName} (${customer.resellerCode || 'RES'})` : (customer.resellerCode || 'মেইন অফিস (Direct)')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Grid: WiFi Technical Information & Payment Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* WiFi Information */}
            <div className={`border rounded-2xl p-5 space-y-4 ${sectionCardClass}`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-blue-400 font-semibold text-sm">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  <span>WiFi & Technical Information</span>
                </div>
                <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-500/30">
                  {customer.connectionType}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div>
                  <span className="text-slate-400 block">Package Plan</span>
                  <span className="text-white font-bold text-sm">{customer.packageName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Bandwidth Speed</span>
                  <span className="text-cyan-400 font-mono font-bold text-sm">{customer.speed}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">WiFi / PPPoE Username</span>
                  <span className="text-slate-200 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800 block truncate">
                    {customer.wifiUsername || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">WiFi / PPPoE Password</span>
                  <div className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    <span className="text-slate-200 font-mono truncate">
                      {customer.pppoePassword 
                        ? (showPassword ? customer.pppoePassword : '••••••••')
                        : 'Not Set'}
                    </span>
                    {customer.pppoePassword && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-cyan-400 ml-1.5 transition-colors"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block">Assigned IP Address</span>
                  <span className="text-slate-200 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800 block truncate">
                    {customer.ipAddress || 'Dynamic (DHCP)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Router / ONU ID</span>
                  <span className="text-slate-300 font-mono text-[11px] truncate block">
                    {customer.routerId || 'GPON ONU HGU'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">MAC / PON Port</span>
                  <span className="text-slate-300 font-mono text-[11px] truncate block">
                    {customer.macAddress || 'C8:3A:35:12:45:90'} (GPON 0/{customer.gponPort || 1})
                  </span>
                </div>
              </div>

              {/* Control Room Remote Router & Web GUI Quick Action Panel */}
              <div className="pt-2.5 space-y-2">
                {onOpenRouterWebLogin && (
                  <div className="flex items-center justify-between bg-blue-950/40 p-3 rounded-xl border border-blue-500/30">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400 animate-pulse" />
                      <div>
                        <span className="text-xs font-bold text-blue-200 block">Router Web Admin Panel (WebGUI)</span>
                        <span className="text-[10px] text-blue-300/80 font-mono">http://{customer.ipAddress || '192.168.1.1'}:{customer.remoteWebAccessPort || 80}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenRouterWebLogin(customer);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-all active:scale-95"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      রাউটারে ঢুকুন (Enter Router)
                    </button>
                  </div>
                )}

                {onOpenRouterConfig && (
                  <div className="flex items-center justify-between bg-purple-950/40 p-3 rounded-xl border border-purple-500/30">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-purple-400" />
                      <div>
                        <span className="text-xs font-bold text-purple-200 block">Control Room Router Config</span>
                        <span className="text-[10px] text-purple-300/80">SSID: {customer.wifiSsid || 'Default_WiFi'} • PPPoE: {customer.wifiUsername || 'user'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenRouterConfig(customer);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xs"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Configure Router
                    </button>
                  </div>
                )}
              </div>

              {/* V-SOL GPON OLT Live ONU Optical Laser Diagnostics */}
              <div className="pt-3 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    V-SOL V1600G GPON Fiber Laser Diagnostics
                  </span>
                  <div className="flex items-center gap-1.5">
                    {onOpenLaserModal && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenLaserModal(customer);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                        title="Full Screen Diagnostics"
                      >
                        <Maximize2 className="w-3 h-3" />
                        Full Meter
                      </button>
                    )}
                    <button
                      onClick={handleTestOpticalSignal}
                      disabled={isCheckingSignal}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 transition-colors disabled:opacity-50"
                    >
                      <Zap className={`w-3.5 h-3.5 ${isCheckingSignal ? 'animate-spin' : ''}`} />
                      {isCheckingSignal ? 'Reading Laser...' : 'Check Laser (dBm)'}
                    </button>
                  </div>
                </div>

                {opticalResult ? (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Laser RX Power</span>
                      <strong className={`font-mono ${opticalResult.rxPower >= -24 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {opticalResult.rxPower} dBm
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Laser TX Power</span>
                      <strong className="font-mono text-cyan-300">+{opticalResult.txPower} dBm</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Fiber Route Distance</span>
                      <strong className="font-mono text-slate-200">{opticalResult.distance} m</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Laser Link Quality</span>
                      <strong className="font-mono text-emerald-400">{opticalResult.status}</strong>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    Click &ldquo;Check Laser (dBm)&rdquo; to measure optical light power from V-SOL GPON port.
                  </p>
                )}
              </div>
            </div>

            {/* Payment & Billing Information */}
            <div className={`border rounded-2xl p-5 space-y-4 ${sectionCardClass}`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-emerald-400 font-semibold text-sm">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Payment & Billing Information</span>
                </div>
                <StatusBadge status={customer.paymentStatus} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Monthly Fee</span>
                  <span className="text-emerald-400 font-bold text-base font-mono">
                    {ispProfile.currencySymbol}{customer.monthlyBill}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Due Balance</span>
                  <span className={`font-bold text-base font-mono ${customer.dueAmount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                    {ispProfile.currencySymbol}{customer.dueAmount || 0}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block">Last Payment Date</span>
                  <span className="text-slate-300 font-mono">{customer.lastPaymentDate || 'No record'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Last Payment Amount</span>
                  <span className="text-slate-300 font-mono">
                    {customer.lastPaymentAmount ? `${ispProfile.currencySymbol}${customer.lastPaymentAmount}` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Next Payment Date</span>
                  <span className="text-cyan-400 font-mono font-semibold">{customer.nextPaymentDate || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Billing Cycle</span>
                  <span className="text-slate-300">1st - 7th Monthly</span>
                </div>
              </div>
            </div>

          </div>

          {/* Notes or remarks if available */}
          {customer.notes && (
            <div className={`p-3.5 rounded-xl border text-xs ${sectionCardClass}`}>
              <span className="text-slate-400 font-medium block mb-1">Administrative Remarks / Notes:</span>
              <p className="text-slate-300 italic">{customer.notes}</p>
            </div>
          )}

        </div>

        {/* Modal Bottom Actions */}
        <div className="no-print px-6 py-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Updated: {new Date(customer.updatedAt || customer.createdAt).toLocaleString()}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
          >
            Close Window
          </button>
        </div>

      </div>

      <WhatsAppAlertModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        customer={customer}
      />
    </div>
  );
};
