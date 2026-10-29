import { Customer, PaymentRecord } from '../types';

export function exportCustomersToCSV(customers: Customer[], filename = 'wifi-customers-report.csv') {
  const headers = [
    'UID',
    'Customer Name',
    'Mobile',
    'Alternative Mobile',
    'Email',
    'Address',
    'Area',
    'Package Name',
    'Speed',
    'Monthly Bill',
    'Connection Type',
    'Router ONU ID',
    'MAC Address',
    'IP Address',
    'WiFi Username',
    'Connection Date',
    'Status',
    'Due Amount',
    'Last Payment Date',
    'Payment Status',
  ];

  const rows = customers.map((c) => [
    `"${c.uid}"`,
    `"${c.name.replace(/"/g, '""')}"`,
    `"${c.mobile}"`,
    `"${c.alternativeMobile || ''}"`,
    `"${c.email || ''}"`,
    `"${(c.address || '').replace(/"/g, '""')}"`,
    `"${(c.area || '').replace(/"/g, '""')}"`,
    `"${c.packageName}"`,
    `"${c.speed}"`,
    c.monthlyBill,
    `"${c.connectionType}"`,
    `"${c.routerId || ''}"`,
    `"${c.macAddress || ''}"`,
    `"${c.ipAddress || ''}"`,
    `"${c.wifiUsername || ''}"`,
    `"${c.connectionDate}"`,
    `"${c.status}"`,
    c.dueAmount || 0,
    `"${c.lastPaymentDate || ''}"`,
    `"${c.paymentStatus}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportPaymentsToCSV(payments: PaymentRecord[], filename = 'wifi-payments-report.csv') {
  const headers = [
    'Receipt No',
    'Customer UID',
    'Customer Name',
    'Mobile',
    'Amount',
    'Payment Method',
    'Transaction ID',
    'Payment Date',
    'Notes',
  ];

  const rows = payments.map((p) => [
    `"${p.receiptNumber}"`,
    `"${p.customerUid}"`,
    `"${p.customerName.replace(/"/g, '""')}"`,
    `"${p.customerMobile}"`,
    p.amount,
    `"${p.paymentMethod}"`,
    `"${p.transactionId || ''}"`,
    `"${p.paymentDate}"`,
    `"${(p.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function triggerPrint() {
  window.print();
}
