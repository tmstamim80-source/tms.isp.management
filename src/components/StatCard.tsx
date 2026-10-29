import React, { ReactNode } from 'react';
import { useTheme } from '../context/ThemeContext';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorTheme?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'blue' | 'purple';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  colorTheme = 'cyan',
  onClick,
}) => {
  const { isDark } = useTheme();

  const getTheme = () => {
    switch (colorTheme) {
      case 'emerald':
        return {
          iconBg: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/20',
          accent: 'from-emerald-400 via-teal-500 to-emerald-600',
          borderHover: 'hover:border-emerald-400 hover:shadow-emerald-500/20',
        };
      case 'amber':
        return {
          iconBg: 'bg-amber-950/70 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/20',
          accent: 'from-amber-400 via-orange-500 to-amber-600',
          borderHover: 'hover:border-amber-400 hover:shadow-amber-500/20',
        };
      case 'rose':
        return {
          iconBg: 'bg-rose-950/70 border-rose-500/40 text-rose-400 shadow-sm shadow-rose-500/20',
          accent: 'from-rose-400 via-pink-500 to-rose-600',
          borderHover: 'hover:border-rose-400 hover:shadow-rose-500/20',
        };
      case 'blue':
        return {
          iconBg: 'bg-blue-950/70 border-blue-500/40 text-blue-400 shadow-sm shadow-blue-500/20',
          accent: 'from-blue-400 via-indigo-500 to-cyan-500',
          borderHover: 'hover:border-blue-400 hover:shadow-blue-500/20',
        };
      case 'purple':
        return {
          iconBg: 'bg-purple-950/70 border-purple-500/40 text-purple-400 shadow-sm shadow-purple-500/20',
          accent: 'from-purple-400 via-fuchsia-500 to-indigo-500',
          borderHover: 'hover:border-purple-400 hover:shadow-purple-500/20',
        };
      default:
        return {
          iconBg: 'bg-cyan-950/70 border-cyan-500/40 text-cyan-400 shadow-sm shadow-cyan-500/20',
          accent: 'from-cyan-400 via-blue-500 to-indigo-600',
          borderHover: 'hover:border-cyan-400 hover:shadow-cyan-500/20',
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 border transition-all duration-300 ${
        isDark
          ? 'glass-panel-dark border-slate-800/90 text-white'
          : 'glass-panel-colorful border-purple-500/25 text-white'
      } ${
        onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-0.5 ' + theme.borderHover : 'shadow-lg'
      }`}
    >
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.accent}`} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mt-1 font-mono tracking-tight">{value}</h3>
        </div>
        <div className={`p-2.5 sm:p-3 rounded-2xl border ${theme.iconBg} shrink-0`}>
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
          {subtitle && <span className="text-slate-400 truncate font-medium">{subtitle}</span>}
          {trend && (
            <span
              className={`font-semibold ml-auto font-mono ${
                trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
