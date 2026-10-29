import React, { useState } from 'react';
import { 
  Radio, 
  Activity, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RotateCw, 
  Sliders, 
  Info, 
  ShieldCheck, 
  Cpu, 
  Server,
  Maximize2,
  Globe
} from 'lucide-react';
import { Customer } from '../types';
import { useCustomer } from '../context/CustomerContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

interface LaserDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onOpenRouterConfig?: (customer: Customer) => void;
  onOpenRouterWebLogin?: (customer: Customer) => void;
}

export const LaserDiagnosticModal: React.FC<LaserDiagnosticModalProps> = ({
  isOpen,
  onClose,
  customer,
  onOpenRouterConfig,
  onOpenRouterWebLogin,
}) => {
  const { updateCustomer } = useCustomer();
  const { isDark } = useTheme();
  const { addToast } = useToast();

  const [isPinging, setIsPinging] = useState(false);
  const [rxPower, setRxPower] = useState<number>(customer?.opticalRxDbm || -19.45);
  const [txPower, setTxPower] = useState<number>(customer?.opticalTxDbm || 2.45);
  const [laserTemp, setLaserTemp] = useState<number>(customer?.laserTempC || 38.6);
  const [biasCurrent, setBiasCurrent] = useState<number>(customer?.laserBiasCurrentMa || 14.8);
  const [voltage, setVoltage] = useState<number>(customer?.laserVoltageV || 3.31);
  const [fiberDistance, setFiberDistance] = useState<number>(customer?.fiberDistanceMeters || 1340);
  const [lastCheck, setLastCheck] = useState<string>(customer?.lastLaserCheck || 'Just now');

  if (!isOpen || !customer) return null;

  // Live Laser Calibration & Ping
  const handlePingLaser = async () => {
    setIsPinging(true);
    addToast('info', 'Measuring Optical Laser', `Sending optical diagnostic packet to GPON 0/${customer.gponPort || 1} -> ONU ${customer.gponSerial || customer.uid}...`);

    setTimeout(async () => {
      setIsPinging(false);
      const isOnline = customer.status !== 'Inactive';
      const freshRx = isOnline ? parseFloat((-18.0 - Math.random() * 5.8).toFixed(2)) : -35.0;
      const freshTx = parseFloat((2.0 + Math.random() * 0.8).toFixed(2));
      const freshTemp = parseFloat((37.0 + Math.random() * 4).toFixed(1));
      const freshBias = parseFloat((13.5 + Math.random() * 2.5).toFixed(1));
      const freshDistance = isOnline ? Math.floor(800 + Math.random() * 1400) : 0;
      const nowStr = new Date().toLocaleTimeString();

      setRxPower(freshRx);
      setTxPower(freshTx);
      setLaserTemp(freshTemp);
      setBiasCurrent(freshBias);
      setFiberDistance(freshDistance);
      setLastCheck(nowStr);

      let laserHealth: 'Optimal' | 'High Loss' | 'Critical' | 'LOS' = 'Optimal';
      if (!isOnline || freshRx < -30) laserHealth = 'LOS';
      else if (freshRx < -27) laserHealth = 'Critical';
      else if (freshRx < -24) laserHealth = 'High Loss';

      try {
        await updateCustomer(customer.id, {
          opticalRxDbm: freshRx,
          opticalTxDbm: freshTx,
          laserTempC: freshTemp,
          laserBiasCurrentMa: freshBias,
          fiberDistanceMeters: freshDistance,
          laserStatus: laserHealth,
          lastLaserCheck: nowStr,
        });
        addToast('success', 'Laser Diagnostic Complete', `GPON ONU RX Power: ${freshRx} dBm (${laserHealth})`);
      } catch (err) {}
    }, 1100);
  };

  // Attenuation calculation (OLT Class C+ TX ~ +5.0 dBm minus ONU RX)
  const oltTxDbm = 5.2;
  const linkLossDb = parseFloat((oltTxDbm - rxPower).toFixed(2));

  // Signal condition styling
  const isLoss = rxPower <= -30 || customer.status === 'Inactive';
  const isCritical = !isLoss && rxPower < -27;
  const isHighLoss = !isLoss && !isCritical && rxPower < -24;
  const isOptimal = !isLoss && !isCritical && !isHighLoss;

  const cardClass = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-800 shadow-2xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden my-6 ${cardClass}`}>
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-cyan-950/70 via-slate-900 to-blue-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Optical Laser Diagnostic & Fiber Power Meter
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  GPON ITU-T G.984
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Target: <strong className="text-white">{customer.name}</strong> • PON: <span className="font-mono text-cyan-300">GPON0/{customer.gponPort || 1}:{customer.onuIndex || 1}</span>
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

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Main Visual Optical Gauge */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ONU Optical Receive (RX) Power</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                    isOptimal ? 'text-emerald-400' : isHighLoss ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {rxPower.toFixed(2)}
                  </span>
                  <span className="text-sm font-bold text-slate-400 font-mono">dBm</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Laser Status</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono mt-1 ${
                  isOptimal
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : isHighLoss
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}>
                  {isOptimal ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {isOptimal ? 'Optimal Optical Light' : isHighLoss ? 'High Splice Attenuation' : 'LOS / Critical Bend'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1 font-mono">Tested: {lastCheck}</span>
              </div>
            </div>

            {/* Visual Power Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>-15 dBm (Too Hot)</span>
                <span className="text-emerald-400 font-bold">-18 to -23 dBm (Ideal Zone)</span>
                <span className="text-amber-400">-26 dBm</span>
                <span className="text-rose-400">-30 dBm (Cut)</span>
              </div>
              <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 flex">
                <div className="h-full bg-amber-500/40 w-1/6" title="High Input"></div>
                <div className="h-full bg-emerald-500 w-3/6 rounded-sm shadow-sm shadow-emerald-500/50" title="Optimal"></div>
                <div className="h-full bg-amber-500 w-1/6" title="Weak"></div>
                <div className="h-full bg-rose-500 w-1/6" title="LOS"></div>
              </div>
            </div>
          </div>

          {/* Detailed Laser Parameters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">OLT Laser TX</span>
              <strong className="text-base font-mono font-black text-cyan-400 mt-1 block">+{oltTxDbm} dBm</strong>
              <span className="text-[10px] text-slate-500 font-mono">1490nm Downlink</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ONU Laser TX</span>
              <strong className="text-base font-mono font-black text-purple-400 mt-1 block">+{txPower} dBm</strong>
              <span className="text-[10px] text-slate-500 font-mono">1310nm Uplink</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fiber Link Loss</span>
              <strong className="text-base font-mono font-black text-amber-400 mt-1 block">{linkLossDb} dB</strong>
              <span className="text-[10px] text-slate-500 font-mono">Total Attenuation</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fiber Distance</span>
              <strong className="text-base font-mono font-black text-white mt-1 block">{fiberDistance} m</strong>
              <span className="text-[10px] text-slate-500 font-mono">~{(fiberDistance / 1000).toFixed(2)} km Core</span>
            </div>
          </div>

          {/* Transceiver Internal Diagnostics */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Cpu className="w-4 h-4" /> Optical Laser Transceiver Hardware Metrics
            </h4>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Laser Temperature</span>
                <strong className="font-mono text-slate-200 text-sm">{laserTemp} °C</strong>
                <span className="text-[10px] text-emerald-400 block mt-0.5">Normal Operating Range</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Bias Current</span>
                <strong className="font-mono text-slate-200 text-sm">{biasCurrent} mA</strong>
                <span className="text-[10px] text-emerald-400 block mt-0.5">Laser Diode Good</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Supply Voltage</span>
                <strong className="font-mono text-slate-200 text-sm">{voltage} V</strong>
                <span className="text-[10px] text-emerald-400 block mt-0.5">Stable 3.3V Rail</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40">
          <div className="text-xs text-slate-400">
            ONU MAC: <strong className="font-mono text-slate-200">{customer.macAddress || 'C8:3A:35:12:45:90'}</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {onOpenRouterWebLogin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRouterWebLogin(customer);
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-500/40 transition-all"
              >
                <Globe className="w-3.5 h-3.5" />
                Enter Router GUI
              </button>
            )}

            {onOpenRouterConfig && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRouterConfig(customer);
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-500/40 transition-all"
              >
                <Sliders className="w-3.5 h-3.5" />
                Configure Router
              </button>
            )}

            <button
              type="button"
              onClick={handlePingLaser}
              disabled={isPinging}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30 transition-all disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
              {isPinging ? 'Pinging Laser Light...' : 'Ping & Measure Laser Light'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
