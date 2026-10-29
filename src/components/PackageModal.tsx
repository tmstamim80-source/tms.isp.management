import React, { useState, useEffect } from 'react';
import { ISPPackage } from '../types';
import { useCustomer } from '../context/CustomerContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { X, Wifi, Save, Sparkles, Tag, Zap, DollarSign, Layers, CheckCircle2 } from 'lucide-react';

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageToEdit?: ISPPackage | null;
  resellerScope?: { id?: string; code?: string; name?: string } | null;
}

export const PackageModal: React.FC<PackageModalProps> = ({
  isOpen,
  onClose,
  packageToEdit,
  resellerScope,
}) => {
  const { addPackage, updatePackage, ispProfile } = useCustomer();
  const { addToast } = useToast();
  const { isDark } = useTheme();

  const isEditMode = Boolean(packageToEdit);

  const [formData, setFormData] = useState({
    name: '',
    speed: '',
    price: 500,
    type: 'Residential' as 'Residential' | 'Commercial' | 'Gaming' | 'Dedicated',
    description: '',
    popular: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (packageToEdit) {
      setFormData({
        name: packageToEdit.name || '',
        speed: packageToEdit.speed || '',
        price: packageToEdit.price || 0,
        type: packageToEdit.type || 'Residential',
        description: packageToEdit.description || '',
        popular: Boolean(packageToEdit.popular),
      });
    } else {
      setFormData({
        name: '',
        speed: '20 Mbps',
        price: 500,
        type: 'Residential',
        description: 'High-speed broadband with buffer-free streaming & BDIX bandwidth',
        popular: false,
      });
    }
    setErrors({});
  }, [packageToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Package name is required';
    if (!formData.speed.trim()) newErrors.speed = 'Speed / Bandwidth is required';
    if (formData.price <= 0) newErrors.price = 'Price must be greater than 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast('error', 'Validation Error', 'Please check the package details.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        ...formData,
      };

      if (resellerScope) {
        payload.resellerId = resellerScope.id || resellerScope.code;
        payload.resellerCode = resellerScope.code;
        payload.resellerName = resellerScope.name;
      }

      if (isEditMode && packageToEdit) {
        await updatePackage(packageToEdit.id, payload);
      } else {
        await addPackage(payload);
      }
      onClose();
    } catch (err: any) {
      addToast('error', 'Error Saving Package', err.message || 'Failed to save package plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContainerClass = isDark
    ? 'bg-slate-900/95 border-slate-800 text-slate-100'
    : 'glass-panel-colorful border-purple-500/30 text-slate-100';

  const inputClass = isDark
    ? 'bg-slate-900/90 border-slate-700/80 focus:bg-slate-900 focus:border-cyan-400 text-white placeholder-slate-500'
    : 'bg-slate-900/90 border-purple-500/30 focus:bg-slate-900 focus:border-cyan-400 text-white placeholder-slate-500';

  const quickSpeeds = ['10 Mbps', '20 Mbps', '30 Mbps', '50 Mbps', '75 Mbps', '100 Mbps'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`relative w-full max-w-lg border rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col ${modalContainerClass}`}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${
              resellerScope
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                : 'bg-cyan-950/60 border-cyan-500/30 text-cyan-400'
            }`}>
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isEditMode ? `প্যাকেজ এডিট: ${packageToEdit?.name}` : (resellerScope ? 'রিসেলার কাস্টম প্যাকেজ তৈরি' : 'নতুন ইন্টারনেট প্যাকেজ যুক্ত')}</span>
                {resellerScope && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                    {resellerScope.code}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {resellerScope
                  ? `রিসেলার ${resellerScope.name} এর গ্রাহকদের জন্য নিজস্ব স্পিড ও মাসিক রেট`
                  : (isEditMode ? 'প্যাকেজের মূল্য, গতি বা বিস্তারিত আপডেট করুন' : 'গ্রাহকদের জন্য নতুন ব্যান্ডউইথ প্ল্যান তৈরি করুন')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reseller Privacy Notice Banner */}
        {resellerScope && (
          <div className="px-5 sm:px-6 py-2.5 bg-emerald-950/40 border-b border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>🔒 <strong>প্রাইভেট প্যাকেজ:</strong> এই প্যাকেজটি শুধুমাত্র আপনার প্যানেলে দৃশ্যমান থাকবে, অন্য কোনো রিসেলার দেখতে পারবে না।</span>
          </div>
        )}

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          
          {/* Package Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Package Plan Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 text-slate-400">
                <Tag className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Standard Turbo, Gamer Gold, Super 50M"
                className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors ${inputClass} ${
                  errors.name ? 'border-rose-500' : ''
                }`}
              />
            </div>
            {errors.name && <p className="text-[11px] text-rose-400 mt-1">{errors.name}</p>}
          </div>

          {/* Speed & Quick Select */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Bandwidth / Speed <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-cyan-400 font-mono">e.g. 20 Mbps</span>
            </div>
            <div className="relative flex items-center">
              <div className="absolute left-3 text-slate-400">
                <Zap className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={formData.speed}
                onChange={(e) => setFormData({ ...formData, speed: e.target.value })}
                placeholder="e.g. 20 Mbps"
                className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none transition-colors ${inputClass} ${
                  errors.speed ? 'border-rose-500' : ''
                }`}
              />
            </div>
            {errors.speed && <p className="text-[11px] text-rose-400 mt-1">{errors.speed}</p>}

            {/* Quick Speed Pills */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickSpeeds.map((spd) => (
                <button
                  type="button"
                  key={spd}
                  onClick={() => setFormData({ ...formData, speed: spd })}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all border ${
                    formData.speed === spd
                      ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700'
                  }`}
                >
                  {spd}
                </button>
              ))}
            </div>
          </div>

          {/* Price & Package Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Monthly Price ({ispProfile.currencySymbol}) <span className="text-rose-400">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-slate-400 font-mono font-bold text-xs">
                  {ispProfile.currencySymbol}
                </div>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  placeholder="500"
                  className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold outline-none transition-colors ${inputClass} ${
                    errors.price ? 'border-rose-500' : ''
                  }`}
                />
              </div>
              {errors.price && <p className="text-[11px] text-rose-400 mt-1">{errors.price}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Package Category
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-slate-400">
                  <Layers className="w-4 h-4" />
                </div>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className={`w-full pl-9 pr-8 py-2.5 rounded-xl border text-xs outline-none transition-colors appearance-none cursor-pointer ${inputClass}`}
                >
                  <option value="Residential">Residential Home</option>
                  <option value="Commercial">Commercial / Office</option>
                  <option value="Gaming">Gaming / Low Latency</option>
                  <option value="Dedicated">Dedicated Symmetric</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Package Description / Features
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Unlimited download, 100 Mbps BDIX, 24/7 dedicated line"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors ${inputClass}`}
            />
          </div>

          {/* Popular Badge Toggle */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-xs font-bold text-white block">Mark as "Most Popular"</span>
                <span className="text-[10px] text-slate-400">Highlights this plan on the public portal</span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.popular}
                onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors min-h-[40px]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50 min-h-[40px]"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update Package' : 'Save Package'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
