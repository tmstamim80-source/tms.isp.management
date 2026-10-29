import { Customer, PaymentRecord, ISPPackage, ISPProfile, Reseller, ResellerTransaction } from '../types';

export const DEFAULT_ISP_PROFILE: ISPProfile = {
  companyName: 'NetPulse High-Speed WiFi & Fiber',
  tagline: 'Reliable High-Speed Fiber Internet & WiFi Solutions',
  supportPhone: '+880 1700-000000',
  supportEmail: 'support@netpulse-wifi.com',
  emergencyHotline: '09612-000000',
  address: 'Commercial Tower, Level 4, Main Road, Dhaka, Bangladesh',
  currencySymbol: '৳',
  currencyCode: 'BDT',
  noticeMessage: 'Notice: Monthly bill payment due date is the 7th of every calendar month.',
  bkashMerchant: '01700-000000',
  nagadMerchant: '01700-000000',
  rocketMerchant: '01700-000000',
  whatsappSettings: {
    enabled: true,
    provider: 'direct',
    senderPhone: '',
    autoSendEnabled: false,
    triggerTiming: 'always_if_due',
  },
  portalVisibility: {
    showSearchPortalToPublic: false,
    showAdminLoginToPublic: false,
    showCeoPanelToPublic: false,
  },
};

export const DEFAULT_PACKAGES: ISPPackage[] = [
  { id: 'pkg-1', name: 'Starter Fiber', speed: '10 Mbps', price: 350, type: 'Residential', description: 'Budget friendly for single users and browsing' },
  { id: 'pkg-2', name: 'Standard Turbo', speed: '20 Mbps', price: 500, type: 'Residential', description: 'Popular family package for 1080p streaming' },
  { id: 'pkg-3', name: 'Ultra Gamer', speed: '35 Mbps', price: 800, type: 'Gaming', description: 'Low latency buffer-free package with BDIX 100M' },
  { id: 'pkg-4', name: 'Super Pro', speed: '50 Mbps', price: 1200, type: 'Residential', description: 'High bandwidth for 4K video, smart TV & work from home' },
  { id: 'pkg-5', name: 'Enterprise Dedicated', speed: '100 Mbps', price: 2500, type: 'Commercial', description: 'SLA backed dedicated symmetric connection' },
];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_PAYMENTS: PaymentRecord[] = [];

export const DEFAULT_RESELLERS: Reseller[] = [];

