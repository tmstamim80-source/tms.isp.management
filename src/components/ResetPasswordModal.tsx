import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { KeyRound, ShieldAlert, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose }) => {
  const { resetPasswordWithRecovery } = useAuth();
  const { addToast } = useToast();
  const { isDark } = useTheme();

  const [recoveryPin, setRecoveryPin] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!recoveryPin.trim()) {
      setErrorMessage('Please enter the Admin Security / Recovery PIN.');
      return;
    }

    if (newPassword.length < 4) {
      setErrorMessage('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPasswordWithRecovery(recoveryPin, newPassword);
      if (res.success) {
        addToast('success', 'Password Reset Successful', 'Your admin password has been updated. Please sign in with your new password.');
        onClose();
      } else {
        setErrorMessage(res.error || 'Invalid recovery PIN.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContainerClass = isDark
    ? 'bg-slate-900/95 border-slate-800 text-slate-100'
    : 'glass-panel-colorful border-purple-500/30 text-slate-100';

  const inputClass = isDark
    ? 'bg-slate-900/90 border-slate-700/80 focus:bg-slate-900 focus:border-amber-400 text-white placeholder-slate-500'
    : 'bg-slate-900/90 border-purple-500/30 focus:bg-slate-900 focus:border-amber-400 text-white placeholder-slate-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`relative w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden my-auto ${modalContainerClass}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Admin Password Reset</h2>
              <p className="text-xs text-slate-400">Reset forgotten ISP administrator password</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="p-4 bg-amber-950/40 border-b border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-200">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <p className="leading-relaxed">
            Enter your <strong>Admin Security Recovery PIN</strong> to verify authorization and set a new secure password.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Admin Security / Recovery PIN <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              required
              value={recoveryPin}
              onChange={(e) => setRecoveryPin(e.target.value)}
              placeholder="Enter your secret recovery PIN"
              className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-sm outline-none transition-colors ${inputClass}`}
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Confidential Master Admin Recovery Key</span>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              New Password <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-sm outline-none transition-colors ${inputClass}`}
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Confirm New Password <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-sm outline-none transition-colors ${inputClass}`}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors min-h-[40px] border border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 min-h-[40px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
