export type CustomerStatus = 'Active' | 'Inactive' | 'Suspended' | 'Due';
export type PaymentStatus = 'Paid' | 'Due' | 'Partial';
export type ConnectionType = 'Fiber (FTTH)' | 'Wireless' | 'Cat6 / LAN' | 'PPPoE' | 'Static IP';

export interface Customer {
  id: string; // Firestore document ID
  uid: string; // e.g. WIFI-000001
  name: string;
  mobile: string;
  alternativeMobile?: string;
  email?: string;
  address: string;
  area: string; // Village / Ward / Zone
  
  // WiFi & Router Information
  packageName: string; // e.g. "Standard Turbo"
  speed: string; // e.g. "20 Mbps"
  monthlyBill: number; // e.g. 500
  connectionType: ConnectionType;
  routerId?: string; // Router serial or ONU ID
  macAddress?: string; // MAC address
  ipAddress?: string; // Assigned IP / WAN IP
  wifiUsername?: string; // PPPoE username
  pppoePassword?: string; // PPPoE password
  
  // GPON & Fiber Optical Laser Diagnostics
  gponPort?: number; // 1-4
  onuIndex?: number; // 1-128
  gponSerial?: string; // e.g. VSOL12345678 or ZTEG87654321
  opticalRxDbm?: number; // e.g. -19.45 dBm
  opticalTxDbm?: number; // e.g. +2.15 dBm
  laserTempC?: number; // e.g. 39.2 °C
  laserBiasCurrentMa?: number; // e.g. 14.2 mA
  laserVoltageV?: number; // e.g. 3.31 V
  fiberDistanceMeters?: number; // e.g. 1250 meters
  laserStatus?: 'Optimal' | 'High Loss' | 'Critical' | 'LOS' | 'Normal';
  lastLaserCheck?: string;

  // Remote Router & WiFi Configuration
  routerModel?: string; // e.g. "TP-Link Archer C6", "Tenda AC10", "VSOL V2801SG", "Huawei HG8546M"
  wifiSsid?: string; // 2.4G WiFi SSID
  wifiPassword?: string; // 2.4G WiFi Password
  wifi5gSsid?: string; // 5G WiFi SSID
  wifi5gPassword?: string; // 5G WiFi Password
  wifiSecurity?: 'WPA2-PSK' | 'WPA3-SAE' | 'WPA/WPA2-PSK' | 'Open';
  wifiChannel?: string; // e.g. "Auto", "6", "11", "36"
  wifiBandwidth?: string; // e.g. "20/40 MHz", "80 MHz"
  wifiEnabled?: boolean;
  wanType?: 'PPPoE' | 'DHCP' | 'Static' | 'Bridge';
  remoteWebAccessPort?: number; // e.g. 80, 8080, 8443
  remoteWebAccessUrl?: string;
  routerWebUsername?: string; // e.g. "admin"
  routerWebPassword?: string; // e.g. "admin" / custom router password
  routerBrand?: 'TP-Link' | 'Tenda' | 'Huawei' | 'VSOL' | 'ZTE' | 'Netis' | 'D-Link' | 'Mercusys' | 'Totolink' | 'MikroTik' | 'Other';
  tr069Enabled?: boolean;
  vlanId?: number;
  
  // Dates
  connectionDate: string; // YYYY-MM-DD
  installationDate: string; // YYYY-MM-DD
  
  // Payment Information
  monthlyFee: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  dueAmount: number;
  nextPaymentDate: string;
  paymentStatus: PaymentStatus;

  // Reseller Association (Optional - empty means Main ISP direct)
  resellerId?: string;
  resellerCode?: string;
  resellerName?: string;
  
  // Overall Status
  status: CustomerStatus;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  customerId: string;
  customerUid: string;
  customerName: string;
  customerMobile: string;
  amount: number;
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Bank Transfer' | 'Other' | 'Reseller Balance';
  transactionId?: string;
  paymentDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
  receiptNumber: string;
  resellerId?: string;
  resellerName?: string;
  isResellerRecharge?: boolean;
}

export interface ISPPackage {
  id: string;
  name: string;
  speed: string;
  price: number;
  type: 'Residential' | 'Commercial' | 'Gaming' | 'Dedicated';
  description?: string;
  popular?: boolean;
  resellerId?: string; // Empty/undefined for global ISP package; otherwise the reseller ID/code
  resellerCode?: string; // e.g. RES-01
  resellerName?: string; // e.g. Tamim Reseller
  createdAt?: string;
  updatedAt?: string;
}

export interface WhatsAppSettings {
  enabled: boolean;
  provider: 'direct' | 'ultramsg' | 'green_api' | 'custom_webhook';
  instanceId?: string;
  apiToken?: string;
  webhookUrl?: string;
  senderPhone?: string;
  autoSendEnabled?: boolean;
  triggerTiming?: 'on_due_date' | '1_day_before' | '3_days_before' | 'always_if_due';
  customTemplate?: string;
  lastAutoRunDate?: string;
}

export interface PortalVisibilitySettings {
  showSearchPortalToPublic?: boolean;
  showAdminLoginToPublic?: boolean;
  showCeoPanelToPublic?: boolean;
}

export interface ISPProfile {
  companyName: string;
  tagline: string;
  supportPhone: string;
  supportEmail: string;
  emergencyHotline: string;
  address: string;
  currencySymbol: string;
  currencyCode: string;
  noticeMessage?: string;
  bkashMerchant?: string;
  nagadMerchant?: string;
  rocketMerchant?: string;
  whatsappSettings?: WhatsAppSettings;
  portalVisibility?: PortalVisibilitySettings;
}

export * from './permissions';
export * from './reseller';

export interface AdminUser {
  uid: string;
  username: string;
  accountUsername?: string;
  email: string;
  role: 'Super Admin' | 'Network Admin' | 'Billing Agent' | 'Billing Admin' | 'Support Admin' | 'Manager' | 'CEO TM' | 'Custom Admin' | 'Reseller';
  permissions?: string[];
  lastLogin?: string;
  sessionVersion?: number;
  resellerId?: string;
  resellerCode?: string;
  resellerName?: string;
  phone?: string;
}

export interface AdminAccount {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'Super Admin' | 'Billing Admin' | 'Network Admin' | 'Support Admin' | 'Manager' | 'Custom Admin';
  email: string;
  permissions: string[];
  status: 'Active' | 'Suspended';
  createdAt: string;
  lastLogin?: string;
  lastPasswordChange?: string;
  loginCount?: number;
}

export interface AdminAuditLog {
  id: string;
  adminName: string;
  username: string;
  role: string;
  timestamp: string;
  action: 'Admin Login' | 'Admin Logout' | 'Failed Login' | 'Password Reset by CEO' | 'Password Changed' | 'Force Logged Out' | 'Admin Added' | 'Admin Deleted' | 'Status Changed';
  status: 'Success' | 'Warning' | 'Failed';
  ipAddress: string;
  device: string;
  details?: string;
}

export interface SupportTicket {
  id: string;
  customerId?: string;
  customerUid: string;
  customerName: string;
  customerMobile: string;
  subject: string;
  issueType: 'Speed Issue' | 'No Internet / Red LOS' | 'Router Issue' | 'Billing Query' | 'Package Upgrade' | 'Other';
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  adminReply?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentRequest {
  id: string;
  customerId: string;
  customerUid: string;
  customerName: string;
  customerMobile: string;
  amount: number;
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket' | 'Bank Transfer' | 'Cash' | 'Other';
  transactionId: string;
  senderNumber?: string;
  requestDate: string; // YYYY-MM-DD
  notes?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminNotes?: string;
  processedAt?: string;
  processedBy?: string;
  createdAt: string;
  receiptNumber?: string;
}

export interface DashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  dueCustomers: number;
  suspendedCustomers: number;
  monthlyRevenue: number;
  totalDueAmount: number;
  totalDue: number;
  totalCollected: number;
  newCustomersThisMonth: number;
  newThisMonth: number;
  collectionRate: number; // percentage
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

export interface OLTConfig {
  model: string;
  host: string;
  snmpPort: number;
  snmpCommunity: string;
  telnetPort: number;
  telnetUsername?: string;
  telnetPassword?: string;
  gatewayUrl: string;
  isConnected: boolean;
  lastSync?: string;
}

export interface PonPortInfo {
  portIndex: number;
  portName: string;
  adminStatus: 'Up' | 'Down';
  linkStatus: 'Up' | 'Down';
  txPowerDbm: number;
  temperatureC: number;
  voltageV: number;
  registeredOnus: number;
  onlineOnus: number;
  maxCapacity: number;
}

export interface OnuDeviceInfo {
  id: string;
  ponPort: number;
  onuIndex: number;
  macAddress: string;
  customName: string;
  customerUid?: string;
  customerName?: string;
  status: 'Online' | 'Offline' | 'LOS' | 'DyingGasp';
  rxOpticalPowerDbm: number;
  txOpticalPowerDbm: number;
  distanceMeters: number;
  lastOnline: string;
  firmwareVersion?: string;
  vlanId?: number;
}

export interface SearchOperatorPermissions {
  canSearch: boolean;
  canViewFinancials: boolean;
  canViewFullProfiles: boolean;
  canExport?: boolean;
  allowedCompanies?: string[]; // Array of allowed company IDs / codes: e.g. ['central', 'RES-01'] or ['ALL']
}

export interface SearchOperator {
  id: string;
  name: string;
  username: string; // login identifier
  password: string; // operator password
  mobile?: string;
  email?: string;
  role: 'search_operator' | 'support_staff';
  status: 'Active' | 'Suspended';
  permissions: SearchOperatorPermissions;
  notes?: string;
  createdAt: string;
  lastLoginAt?: string;
  loginCount: number;
}

export interface SearchLoginLog {
  id: string;
  operatorId?: string;
  operatorName: string;
  username: string;
  timestamp: string;
  status: 'Success' | 'Password_Mismatch' | 'Account_Suspended' | 'Not_Found';
  ipAddress?: string;
  deviceInfo?: string;
  action: 'Login' | 'Logout';
}

export interface WhatsAppLogEntry {
  id: string;
  customerId: string;
  customerUid: string;
  customerName: string;
  phone: string;
  status: 'sent' | 'failed';
  gateway: string;
  messageSnippet: string;
  timestamp: string;
}


