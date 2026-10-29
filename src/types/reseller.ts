export interface Reseller {
  id: string; // e.g. "res-001"
  code: string; // e.g. "RES-01"
  name: string; // Business name, e.g. "সবুজ বাংলা ইন্টারনেট"
  ownerName: string; // Owner name, e.g. "কামাল হোসেন"
  phone: string; // Contact phone, e.g. "01711-223344"
  email?: string;
  area: string; // Zone / Village, e.g. "উত্তর পাড়া ও বাজার এরিয়া"
  balance: number; // Current wallet balance in BDT, e.g. 7500
  commissionRate: number; // Commission % (e.g. 15%) or wholesale discount
  billingType: 'prepaid' | 'postpaid';
  wholesaleRate?: number; // Flat wholesale rate per customer in BDT (e.g. 350)
  wholesaleRatePerSub?: number; // Flat wholesale rate per customer in BDT (e.g. 350)
  status: 'Active' | 'Suspended' | 'Inactive';
  username: string; // Reseller portal login username
  password: string; // Reseller portal login password
  assignedCustomerCount?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ResellerTransaction {
  id: string;
  resellerId: string;
  resellerName: string;
  type: 'credit' | 'debit' | 'recharge' | 'commission';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  date: string; // YYYY-MM-DD or ISO
  performedBy: string;
  receiptNumber?: string;
  customerUid?: string;
  customerName?: string;
}

export interface ResellerBalanceRequest {
  id: string;
  resellerId: string;
  resellerName: string;
  resellerPhone: string;
  amount: number;
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket' | 'Bank' | 'Cash';
  transactionId: string;
  senderNumber: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  processedAt?: string;
  adminNotes?: string;
}
