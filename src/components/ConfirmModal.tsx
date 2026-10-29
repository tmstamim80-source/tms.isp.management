import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Customer Confirmation',
  message = 'Are you sure you want to delete this customer? This action cannot be undone and will permanently remove this customer record.',
  confirmText = 'Delete Customer',
  cancelText = 'Cancel',
  isDestructive = true,
  isLoading = false,
}) => {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const modalContainerClass = isDark
    ? 'bg-slate-900/95 border-slate-800 text-slate-100'
    : 'glass-panel-colorful border-purple-500/30 text-slate-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`relative w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden my-auto ${modalContainerClass}`}>
        
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl ${isDestructive ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30' : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'} shrink-0`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
            >
              {cancelText}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all ${
                isDestructive
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-900/20'
                  : 'bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-900/20'
              } disabled:opacity-50`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isLoading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
