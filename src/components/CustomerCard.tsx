import React from 'react';
import { Customer } from '../types';
import { StatusBadge } from './StatusBadge';
import { Wifi, Phone, Copy, Check, ExternalLink, MapPin, Calendar, Activity } from 'lucide-react';
import { useCustomer } from '../context/CustomerContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

interface CustomerCardProps {
  customer: Customer;
  onViewDetails: (customer: Customer) => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onViewDetails }) => {
  const { ispProfile } = useCustomer();
  const { addToast } = useToast();
  const { isDark } = useTheme();
  const [copiedUid, setCopiedUid] = React.useState(false);
  const [copiedMobile, setCopiedMobile] = React.useState(false);

  const handleCopyUid = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(customer.uid);
    setCopiedUid(true);
    addToast('info', 'Copied', `Customer UID ${customer.uid} copied to clipboard.`);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleCopyMobile = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(customer.mobile);
    setCopiedMobile(true);
    addToast('info', 'Copied', `Mobile number ${customer.mobile} copied to clipboard.`);
    setTimeout(() => setCopiedMobile(false), 2000);
  };

  return (
    <div
      onClick={() => onViewDetails(customer)}
      className={`group relative rounded-2xl p-6 transition-all duration-300 shadow-lg cursor-pointer overflow-hidden border ${
        isDark
          ? 'glass-panel-dark text-slate-100 border-slate-800 hover:border-cyan-500/50 hover:shadow-cyan-950/30'
          : 'glass-panel-colorful text-slate-100 border-purple-500/20 hover:border-purple-400/60 hover:shadow-purple-950/40'
      }`}
    >
      {/* Decorative top accent glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 opacity-80 group-hover:opacity-100 transition-opacity" />

      {/* Header section with Name and Status */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-cyan-500/20 shrink-0 group-hover:scale-105 transition-transform">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
              {customer.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800/80 text-cyan-300 border border-slate-700">
                {customer.uid}
              </span>
              {customer.resellerName && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  {customer.resellerName}
                </span>
              )}
              <button
                onClick={handleCopyUid}
                title="Copy UID"
                className="text-slate-400 hover:text-cyan-300 transition-colors p-0.5"
              >
                {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <StatusBadge status={customer.status} size="sm" />
      </div>

      {/* Grid details */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 text-xs">
        <div className="space-y-1">
          <span className="text-slate-400 flex items-center gap-1 font-medium">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" /> Package & Speed
          </span>
          <p className="text-white font-semibold truncate">{customer.packageName}</p>
          <p className="text-cyan-300 font-mono font-semibold">{customer.speed}</p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 flex items-center gap-1 font-medium">
            <Activity className="w-3.5 h-3.5 text-blue-400" /> Monthly Bill
          </span>
          <p className="text-emerald-400 font-bold text-sm">
            {ispProfile.currencySymbol}{customer.monthlyBill}
            <span className="text-[10px] text-slate-400 font-normal"> / mo</span>
          </p>
          {customer.dueAmount > 0 ? (
            <p className="text-rose-400 font-semibold text-[11px]">
              Due: {ispProfile.currencySymbol}{customer.dueAmount}
            </p>
          ) : (
            <p className="text-emerald-400 font-medium text-[11px]">● Paid</p>
          )}
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <span className="text-slate-400 flex items-center gap-1 font-medium">
            <Phone className="w-3.5 h-3.5 text-indigo-400" /> Contact
          </span>
          <div className="flex items-center gap-1.5">
            <p className="text-slate-200 font-mono font-medium">{customer.mobile}</p>
            <button
              onClick={handleCopyMobile}
              title="Copy Mobile"
              className="text-slate-400 hover:text-indigo-300 p-0.5"
            >
              {copiedMobile ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          {customer.area && (
            <p className="text-slate-400 flex items-center gap-1 text-[11px] truncate">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {customer.area}
            </p>
          )}
        </div>
      </div>

      {/* Footer Action */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-slate-400" /> Joined {customer.connectionDate}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(customer);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 group-hover:text-white bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 px-3 py-1.5 rounded-xl transition-all"
        >
          View Details
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

