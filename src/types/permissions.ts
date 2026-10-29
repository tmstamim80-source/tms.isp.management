export type PermissionId =
  | 'all'
  | 'dashboard'
  | 'customers'
  | 'add_customer'
  | 'delete_customer'
  | 'router_config'
  | 'payments'
  | 'record_payment'
  | 'requests'
  | 'reports'
  | 'routers'
  | 'mikrotik'
  | 'settings';

export interface PermissionItem {
  id: PermissionId;
  labelBn: string;
  labelEn: string;
  category: 'core' | 'customers' | 'billing' | 'technical' | 'system';
  categoryLabelBn: string;
  descriptionBn: string;
}

export const PERMISSION_ITEMS: PermissionItem[] = [
  // ১. ড্যাশবোর্ড ও ওভারভিউ
  {
    id: 'dashboard',
    labelBn: 'ড্যাশবোর্ড ও সার্বিক পরিসংখ্যান',
    labelEn: 'Dashboard Overview',
    category: 'core',
    categoryLabelBn: 'মূল পেজ',
    descriptionBn: 'প্রধান ড্যাশবোর্ড, মোট সক্রিয়/নিষ্ক্রিয় গ্রাহক, বকেয়া ও কালেকশন অগ্রগতি চার্ট দেখতে পারবে।',
  },
  // ২. গ্রাহক ব্যবস্থাপনা
  {
    id: 'customers',
    labelBn: 'গ্রাহক তালিকা ও সার্চ',
    labelEn: 'Customers Directory',
    category: 'customers',
    categoryLabelBn: 'গ্রাহক ব্যবস্থাপনা',
    descriptionBn: 'সকল গ্রাহকের তালিকা দেখতে, এরিয়া ও স্ট্যাটাস ফিল্টার, প্রোফাইল বিস্তারিত ও এক্সপোর্ট করতে পারবে।',
  },
  {
    id: 'add_customer',
    labelBn: 'নতুন গ্রাহক যুক্ত ও এডিট',
    labelEn: 'Add & Edit Customer',
    category: 'customers',
    categoryLabelBn: 'গ্রাহক ব্যবস্থাপনা',
    descriptionBn: 'নতুন গ্রাহকের ফরম পূরণ, প্যাকেজ নির্বাচন ও বিদ্যমান গ্রাহকের তথ্য এডিট/আপডেট করার সুযোগ।',
  },
  {
    id: 'delete_customer',
    labelBn: 'গ্রাহক ডিলিট করার অনুমতি',
    labelEn: 'Delete Customer',
    category: 'customers',
    categoryLabelBn: 'গ্রাহক ব্যবস্থাপনা',
    descriptionBn: 'ডাটাবেজ থেকে গ্রাহক স্থায়ীভাবে মুছে ফেলার সর্বোচ্চ ক্ষমতা।',
  },
  // ৩. টেকনিক্যাল ও নেটওয়ার্ক
  {
    id: 'router_config',
    labelBn: 'রাউটার কনফিগ ও লেজার টেস্ট',
    labelEn: 'Router Remote & Laser Test',
    category: 'technical',
    categoryLabelBn: 'টেকনিক্যাল টুলস',
    descriptionBn: 'রাউটার ওয়েব লগইন, রিমোট কনফিগারেশন রুম ও ফাইবার অপটিক্যাল সিগন্যাল/লেজার টেস্ট করতে পারবে।',
  },
  {
    id: 'routers',
    labelBn: 'মিক্রোটিক রাউটার ও সেশন কন্ট্রোল',
    labelEn: 'MikroTik Routers & Sessions',
    category: 'technical',
    categoryLabelBn: 'টেকনিক্যাল টুলস',
    descriptionBn: 'মিক্রোটিক রাউটার কনফিগ, PPPoE সিক্রেট, একটিভ সেশন, হটস্পট ও লাইভ ট্রাফিক মনিটরিং অ্যাক্সেস।',
  },
  // ৪. বিলিং ও পেমেন্ট
  {
    id: 'payments',
    labelBn: 'পেমেন্ট হিস্টোরি ও লেজার',
    labelEn: 'Payments & Ledger',
    category: 'billing',
    categoryLabelBn: 'বিলিং ও পেমেন্ট',
    descriptionBn: 'পরিশোধিত সকল বিলের তালিকা, ট্রানজেকশন হিস্টোরি ও মানি রিসিট দেখতে পারবে।',
  },
  {
    id: 'record_payment',
    labelBn: 'পেমেন্ট গ্রহণ / রিচার্জ',
    labelEn: 'Record Customer Payment',
    category: 'billing',
    categoryLabelBn: 'বিলিং ও পেমেন্ট',
    descriptionBn: 'গ্রাহকের কাছ থেকে বকেয়া বিল রিসিভ করতে এবং ক্যাশ/বিকাশ রিসিট প্রদান করতে পারবে।',
  },
  {
    id: 'requests',
    labelBn: 'পেমেন্ট রিকোয়েস্ট ও সাপোর্ট টিকেট',
    labelEn: 'Payment Requests & Support',
    category: 'billing',
    categoryLabelBn: 'বিলিং ও পেমেন্ট',
    descriptionBn: 'গ্রাহকদের পাঠানো অনলাইন পেমেন্ট ট্রানজেকশন অনুমোদন/বাতিল ও গ্রাহক কমপ্লেইন দেখতে পারবে।',
  },
  // ৫. রিপোর্ট ও সিস্টেম সেটিংস
  {
    id: 'reports',
    labelBn: 'আয়-ব্যয় ও হিসাব রিপোর্ট',
    labelEn: 'Financial & Audit Reports',
    category: 'system',
    categoryLabelBn: 'রিপোর্ট ও সেটিংস',
    descriptionBn: 'মাসিক আয়, বকেয়া তালিকা ও এলাকাভিত্তিক হিসাবের বিস্তারিত রিপোর্ট দেখতে ও ডাউনলোড করতে পারবে।',
  },
  {
    id: 'settings',
    labelBn: 'সিস্টেম সেটিংস ও প্যাকেজ',
    labelEn: 'System Settings & Packages',
    category: 'system',
    categoryLabelBn: 'রিপোর্ট ও সেটিংস',
    descriptionBn: 'কোম্পানি তথ্য, ইন্টারনেট প্যাকেজ তৈরি/এডিট ও মার্চেন্ট মোবাইল নাম্বার পরিবর্তন করতে পারবে।',
  },
];

export const ROLE_PRESET_PERMISSIONS: Record<string, PermissionId[]> = {
  'Super Admin': ['all', 'dashboard', 'customers', 'add_customer', 'delete_customer', 'router_config', 'payments', 'record_payment', 'requests', 'reports', 'settings'],
  'Billing Admin': ['dashboard', 'customers', 'payments', 'record_payment', 'requests'],
  'Network Admin': ['dashboard', 'customers', 'router_config', 'requests'],
  'Support Admin': ['dashboard', 'customers', 'requests'],
  'Manager': ['dashboard', 'customers', 'add_customer', 'payments', 'record_payment', 'requests', 'reports'],
  'Reseller': ['dashboard', 'customers', 'add_customer', 'delete_customer', 'payments', 'record_payment', 'router_config', 'requests', 'reports', 'settings'],
  'Custom Admin': ['dashboard', 'customers'],
};

export const hasAdminPermission = (
  permissions: string[] | undefined,
  requiredPerm: string,
  role?: string
): boolean => {
  if (!permissions || permissions.length === 0) {
    if (role === 'Super Admin') return true;
    return false;
  }

  // Super Admin or 'all' permission has complete unrestricted access
  if (role === 'Super Admin' || permissions.includes('all')) {
    return true;
  }

  // Exact permission match
  if (permissions.includes(requiredPerm)) {
    return true;
  }

  // Backward compatibility with legacy permission keys:
  if (requiredPerm === 'payments' && permissions.includes('billing')) return true;
  if (requiredPerm === 'record_payment' && (permissions.includes('billing') || permissions.includes('payments'))) return true;
  if (requiredPerm === 'requests' && permissions.includes('tickets')) return true;
  if (requiredPerm === 'settings' && permissions.includes('packages')) return true;
  if (requiredPerm === 'customers' && (permissions.includes('add_customer') || permissions.includes('delete_customer'))) return true;
  if ((requiredPerm === 'routers' || requiredPerm === 'mikrotik') && (permissions.includes('routers') || permissions.includes('mikrotik') || permissions.includes('router_config'))) return true;

  return false;
};
