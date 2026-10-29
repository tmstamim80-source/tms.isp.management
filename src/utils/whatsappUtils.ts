import { Customer, ISPProfile, WhatsAppSettings, WhatsAppLogEntry } from '../types';
import { saveWhatsAppLogToFirestore } from '../firebase/firestore';

export type { WhatsAppLogEntry };

export const DEFAULT_WHATSAPP_TEMPLATE = `আসসালামু আলাইকুম {name},
{company_name} এর পক্ষ থেকে বিনীতভাবে জানানো যাচ্ছে যে, আপনার ইন্টারনেট সংযোগের (প্যাকেজ: {package}) চলতি বিল {currency}{bill} পরিশোধের নির্ধারিত তারিখ: {expiry_date}।

সংযোগ নিরবচ্ছিন্ন ও সচল রাখতে অনুগ্রহ করে নির্ধারিত সময়ের মধ্যে বিল পরিশোধ করার জন্য অনুরোধ করা হচ্ছে।

💳 বিল পরিশোধের নম্বরসমূহ:
• বিকাশ (bKash): {bkash}
• নগদ (Nagad): {nagad}
• রকেট (Rocket): {rocket}
(পেমেন্ট রেফারেন্সে আপনার কাস্টমার আইডি লিখুন: {uid})

📞 যেকোনো প্রয়োজনে হেল্পলাইন: {helpline}
ধন্যবাদ,
{company_name}`;

/**
 * Formats a raw phone number to international format for WhatsApp (e.g. 8801712345678)
 */
export function formatWhatsAppPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  // Remove all non-digits
  let clean = rawPhone.replace(/\D/g, '');

  // If starts with 880, keep it
  if (clean.startsWith('880')) {
    return clean;
  }

  // If starts with 01 (standard Bangladesh mobile), convert to 8801...
  if (clean.startsWith('01')) {
    return '88' + clean;
  }

  // If starts with 1 and length is 10 (e.g. 1712345678)
  if (clean.startsWith('1') && clean.length === 10) {
    return '880' + clean;
  }

  return clean;
}

/**
 * Replaces variables in template with real customer and ISP data
 */
export function compileBillingMessage(
  customer: Customer,
  profile: ISPProfile,
  customTemplate?: string
): string {
  const template = customTemplate && customTemplate.trim().length > 0
    ? customTemplate
    : (profile.whatsappSettings?.customTemplate || DEFAULT_WHATSAPP_TEMPLATE);

  const billAmount = customer.dueAmount > 0 ? customer.dueAmount : customer.monthlyBill;
  const expiryDate = customer.nextPaymentDate || 'চলতি মাস';
  const bkash = profile.bkashMerchant || profile.supportPhone || 'অফিসিয়াল নম্বরে যোগাযোগ করুন';
  const nagad = profile.nagadMerchant || profile.supportPhone || 'অফিসিয়াল নম্বরে যোগাযোগ করুন';
  const rocket = profile.rocketMerchant || profile.supportPhone || 'অফিসিয়াল নম্বরে যোগাযোগ করুন';
  const helpline = profile.emergencyHotline || profile.supportPhone || 'অফিসিয়াল হটলাইন';

  return template
    .replace(/{name}/g, customer.name || 'সম্মানিত গ্রাহক')
    .replace(/{uid}/g, customer.uid || '')
    .replace(/{bill}/g, String(billAmount))
    .replace(/{due_amount}/g, String(customer.dueAmount || billAmount))
    .replace(/{currency}/g, profile.currencySymbol || '৳')
    .replace(/{package}/g, customer.packageName || 'ব্রডব্যান্ড ইন্টারনেট')
    .replace(/{speed}/g, customer.speed || '')
    .replace(/{expiry_date}/g, expiryDate)
    .replace(/{bkash}/g, bkash)
    .replace(/{nagad}/g, nagad)
    .replace(/{rocket}/g, rocket)
    .replace(/{helpline}/g, helpline)
    .replace(/{company_name}/g, profile.companyName || 'Tamim Broadband');
}

/**
 * Checks if a customer's bill is expired or due according to timing configuration
 */
export function isCustomerBillDue(
  customer: Customer,
  timing: 'on_due_date' | '1_day_before' | '3_days_before' | 'always_if_due' = 'always_if_due'
): boolean {
  if (customer.status === 'Inactive') return false;

  // If customer is explicitly marked Due or has dueAmount > 0
  if (customer.dueAmount > 0 || customer.paymentStatus === 'Due' || customer.status === 'Due') {
    return true;
  }

  if (!customer.nextPaymentDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(customer.nextPaymentDate);
  dueDate.setHours(0, 0, 0, 0);

  if (isNaN(dueDate.getTime())) return false;

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  switch (timing) {
    case 'on_due_date':
      // Today is on or after due date
      return diffDays <= 0;
    case '1_day_before':
      return diffDays <= 1;
    case '3_days_before':
      return diffDays <= 3;
    case 'always_if_due':
    default:
      return diffDays <= 0 || customer.dueAmount > 0;
  }
}

export interface WhatsAppSendResult {
  success: boolean;
  message: string;
  mode: 'api' | 'direct';
  directUrl?: string;
}

/**
 * Sends or opens WhatsApp message for a customer using configured settings
 */
export async function dispatchWhatsAppAlert(
  customer: Customer,
  profile: ISPProfile,
  customMessage?: string
): Promise<WhatsAppSendResult> {
  const phone = formatWhatsAppPhone(customer.mobile);
  if (!phone || phone.length < 10) {
    return {
      success: false,
      message: `গ্রাহক ${customer.name} এর সঠিক ফোন নম্বর পাওয়া যায়নি (${customer.mobile})।`,
      mode: 'direct',
    };
  }

  const text = customMessage || compileBillingMessage(customer, profile);
  const settings: WhatsAppSettings = profile.whatsappSettings || {
    enabled: true,
    provider: 'direct',
  };

  // 1. UltraMsg API Provider (Personal WhatsApp linked via QR code)
  if (settings.provider === 'ultramsg' && settings.instanceId && settings.apiToken) {
    try {
      const response = await fetch(`https://api.ultramsg.com/${settings.instanceId}/messages/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: settings.apiToken,
          to: phone,
          body: text,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && (data.sent === 'true' || data.id || data.status === 'success')) {
        recordWhatsAppLog(customer, 'sent', 'UltraMsg API', text);
        return {
          success: true,
          message: `${customer.name} কে WhatsApp এ স্বয়ংক্রিয়ভাবে মেসেজ পাঠানো হয়েছে!`,
          mode: 'api',
        };
      } else {
        const errMsg = data.message || data.error || 'UltraMsg API রেসপন্স ব্যর্থ হয়েছে।';
        recordWhatsAppLog(customer, 'failed', `UltraMsg: ${errMsg}`, text);
        return {
          success: false,
          message: `UltraMsg এরর: ${errMsg}`,
          mode: 'api',
        };
      }
    } catch (err: any) {
      recordWhatsAppLog(customer, 'failed', `Network error: ${err.message}`, text);
      return {
        success: false,
        message: `সার্ভার সংযোগ সমস্যা: ${err.message}`,
        mode: 'api',
      };
    }
  }

  // 2. Green API Provider
  if (settings.provider === 'green_api' && settings.instanceId && settings.apiToken) {
    try {
      const response = await fetch(
        `https://api.green-api.com/waInstance${settings.instanceId}/sendMessage/${settings.apiToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: `${phone}@c.us`,
            message: text,
          }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.idMessage) {
        recordWhatsAppLog(customer, 'sent', 'Green API', text);
        return {
          success: true,
          message: `${customer.name} কে WhatsApp এ স্বয়ংক্রিয়ভাবে মেসেজ পাঠানো হয়েছে!`,
          mode: 'api',
        };
      } else {
        const errMsg = data.message || 'Green API রেসপন্স ব্যর্থ হয়েছে।';
        recordWhatsAppLog(customer, 'failed', `Green API: ${errMsg}`, text);
        return {
          success: false,
          message: `Green API এরর: ${errMsg}`,
          mode: 'api',
        };
      }
    } catch (err: any) {
      recordWhatsAppLog(customer, 'failed', `Network error: ${err.message}`, text);
      return {
        success: false,
        message: `Green API সংযোগ সমস্যা: ${err.message}`,
        mode: 'api',
      };
    }
  }

  // 3. Custom Webhook Provider (Self-hosted Node.js / Baileys / WPPConnect)
  if (settings.provider === 'custom_webhook' && settings.webhookUrl) {
    try {
      const response = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          message: text,
          customer: {
            id: customer.id,
            uid: customer.uid,
            name: customer.name,
            monthlyBill: customer.monthlyBill,
            dueAmount: customer.dueAmount,
            nextPaymentDate: customer.nextPaymentDate,
          },
        }),
      });
      if (response.ok) {
        recordWhatsAppLog(customer, 'sent', 'Custom Webhook', text);
        return {
          success: true,
          message: `${customer.name} কে Webhook এর মাধ্যমে মেসেজ পাঠানো হয়েছে!`,
          mode: 'api',
        };
      } else {
        const textErr = await response.text();
        recordWhatsAppLog(customer, 'failed', `Webhook status ${response.status}`, text);
        return {
          success: false,
          message: `Webhook রেসপন্স কোড: ${response.status} (${textErr.slice(0, 100)})`,
          mode: 'api',
        };
      }
    } catch (err: any) {
      recordWhatsAppLog(customer, 'failed', `Webhook error: ${err.message}`, text);
      return {
        success: false,
        message: `Webhook সংযোগ সমস্যা: ${err.message}`,
        mode: 'api',
      };
    }
  }

  // 4. Default: Direct WhatsApp Web / App One-Click Link
  const encodedText = encodeURIComponent(text);
  const directUrl = `https://wa.me/${phone}?text=${encodedText}`;

  // Open in new window/tab directly
  if (typeof window !== 'undefined') {
    window.open(directUrl, '_blank', 'noopener,noreferrer');
  }

  recordWhatsAppLog(customer, 'sent', 'Direct WhatsApp (wa.me)', text);

  return {
    success: true,
    message: `${customer.name} এর জন্য WhatsApp মেসেজ ওপেন করা হয়েছে!`,
    mode: 'direct',
    directUrl,
  };
}

// Log management for WhatsApp alerts
const LOGS_STORAGE_KEY = 'netpulse_whatsapp_alert_logs';

export function getWhatsAppLogs(): WhatsAppLogEntry[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(LOGS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

export function recordWhatsAppLog(
  customer: Customer,
  status: 'sent' | 'failed',
  gateway: string,
  message: string
) {
  if (typeof localStorage === 'undefined') return;
  const currentLogs = getWhatsAppLogs();
  const newEntry: WhatsAppLogEntry = {
    id: 'walog-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    customerId: customer.id,
    customerUid: customer.uid,
    customerName: customer.name,
    phone: customer.mobile,
    status,
    gateway,
    messageSnippet: message.slice(0, 120) + (message.length > 120 ? '...' : ''),
    timestamp: new Date().toLocaleString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  const updated = [newEntry, ...currentLogs].slice(0, 100); // keep latest 100
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}

  // Sync to Firestore Realtime Database
  saveWhatsAppLogToFirestore(newEntry).catch((err) => {
    console.warn('Firestore WhatsApp log sync note:', err);
  });
}
