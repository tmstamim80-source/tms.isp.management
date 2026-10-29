import React from 'react';
import { Moon, Sparkles, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Switch to Colorful Theme (রঙিন মোড)' : 'Switch to Black Mode (কালো মোড)'}
      aria-label="Toggle Black or Colorful Theme"
      className={`group relative flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-xl transition-all duration-300 min-h-[40px] select-none ${
        isDark
          ? 'bg-slate-900/90 text-amber-300 border border-slate-700/80 hover:border-amber-400/60 hover:bg-slate-800/90 shadow-sm shadow-amber-500/10'
          : 'bg-gradient-to-r from-purple-900/60 to-indigo-900/60 text-cyan-300 border border-purple-500/40 hover:border-cyan-400 hover:bg-purple-800/60 shadow-sm shadow-cyan-500/20'
      } ${className}`}
    >
      {/* Icon with spin/bounce effect */}
      <div className="relative flex items-center justify-center">
        {isDark ? (
          <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.6)] group-hover:rotate-12 transition-transform duration-300" />
        ) : (
          <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse group-hover:scale-110 transition-transform" />
        )}
      </div>

      {showLabel ? (
        <span className="text-xs font-bold font-mono tracking-tight whitespace-nowrap">
          {isDark ? 'Black Mode 🌙' : 'Colorful 🌈'}
        </span>
      ) : (
        <span className="text-[11px] font-semibold font-mono hidden md:inline-block">
          {isDark ? 'Black' : 'Colorful'}
        </span>
      )}

      {/* Tiny glowing dot */}
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isDark ? 'bg-amber-400' : 'bg-cyan-400 animate-ping'
        }`}
      />
    </button>
  );
};
