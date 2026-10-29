import React from 'react';
import { CustomerStatus, PaymentStatus } from '../types';

interface StatusBadgeProps {
  status: CustomerStatus | PaymentStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showDot = true }) => {
  const getStyles = () => {
    switch (status) {
      case 'Active':
      case 'Paid':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          dot: 'bg-emerald-500',
          label: status,
        };
      case 'Due':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
          dot: 'bg-rose-500 animate-pulse',
          label: status,
        };
      case 'Suspended':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
          dot: 'bg-amber-500',
          label: status,
        };
      case 'Inactive':
        return {
          bg: 'bg-slate-100 border-slate-200 text-slate-600',
          dot: 'bg-slate-400',
          label: status,
        };
      case 'Partial':
        return {
          bg: 'bg-cyan-50 border-cyan-200 text-cyan-700',
          dot: 'bg-cyan-500',
          label: status,
        };
      default:
        return {
          bg: 'bg-slate-100 border-slate-200 text-slate-700',
          dot: 'bg-slate-400',
          label: status,
        };
    }
  };

  const { bg, dot, label } = getStyles();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-medium',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide uppercase ${bg} ${sizeClasses}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
};
