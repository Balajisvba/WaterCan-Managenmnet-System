import { Customer, Delivery, Expense, MissingCan, Payment, Settings } from '../models/app.models';

export function generateId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.().replace(/-/g, '') ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${prefix.toUpperCase()}-${randomId}`;
}

export function generateSequentialId(prefix: string, existingIds: string[], digits = 3): string {
  const normalizedPrefix = prefix.toUpperCase();
  const regex = new RegExp(`^${normalizedPrefix}-(\\d{${digits}})$`, 'i');
  const maxSuffix = existingIds.reduce((currentMax, id) => {
    const match = regex.exec(id);
    if (!match) return currentMax;
    return Math.max(currentMax, Number(match[1]));
  }, 0);

  return `${normalizedPrefix}-${String(maxSuffix + 1).padStart(digits, '0')}`;
}

export function buildSeedCustomers(): Customer[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'C-001',
      name: 'Rahul Kumar',
      mobile: '9876543210',
      alternateMobile: '9123456780',
      address: 'Sector 15, Noida',
      area: 'Noida',
      depositAmount: 500,
      openingOutstandingCans: 3,
      outstandingCan: 3,
      totalDelivered: 40,
      totalReturned: 8,
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'C-002',
      name: 'Anita Sharma',
      mobile: '9812345678',
      alternateMobile: '9876123450',
      address: 'Rosewood Lane',
      area: 'Gurgaon',
      depositAmount: 400,
      openingOutstandingCans: 1,
      outstandingCan: 1,
      totalDelivered: 22,
      totalReturned: 4,
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'C-003',
      name: 'Vikram Singh',
      mobile: '9998887776',
      alternateMobile: '9887766554',
      address: 'Park Avenue',
      area: 'Delhi',
      depositAmount: 300,
      openingOutstandingCans: 6,
      outstandingCan: 6,
      totalDelivered: 55,
      totalReturned: 12,
      status: 'Pending',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function buildSeedDeliveries(): Delivery[] {
  return [
    {
      id: 'D-001',
      customerId: 'C-001',
      customerName: 'Rahul Kumar',
      filledCans: 2,
      emptyCans: 1,
      ratePerCan: 40,
      totalAmount: 80,
      paidAmount: 60,
      balance: 20,
      driverName: 'Aman',
      remarks: 'Priority delivery',
      deliveryDate: new Date().toISOString(),
      status: 'Pending',
    },
    {
      id: 'D-002',
      customerId: 'C-002',
      customerName: 'Anita Sharma',
      filledCans: 3,
      emptyCans: 0,
      ratePerCan: 40,
      totalAmount: 120,
      paidAmount: 120,
      balance: 0,
      driverName: 'Ravi',
      remarks: 'Completed',
      deliveryDate: new Date().toISOString(),
      status: 'Delivered',
    },
  ];
}

export function buildSeedExpenses(): Expense[] {
  return [
    {
      id: 'E-001',
      date: new Date().toISOString(),
      category: 'Fuel',
      amount: 1200,
      remarks: 'Daily fuel',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'E-002',
      date: new Date().toISOString(),
      category: 'Salary',
      amount: 15000,
      remarks: 'Driver salary',
      createdAt: new Date().toISOString(),
    },
  ];
}

export function buildSeedPayments(): Payment[] {
  return [
    {
      id: 'P-001',
      customerId: 'C-001',
      customerName: 'Rahul Kumar',
      amount: 500,
      paymentDate: new Date().toISOString(),
      remarks: 'Advance payment',
    },
  ];
}

export function buildSeedMissingCans(): MissingCan[] {
  return [
    {
      id: 'M-001',
      customerId: 'C-003',
      customerName: 'Vikram Singh',
      missingQuantity: 4,
      recoveredQuantity: 2,
      lostQuantity: 2,
      costPerCan: 40,
      lossAmount: 80,
      status: 'Open',
      createdAt: new Date().toISOString(),
    },
  ];
}

export function buildSeedSettings(): Settings {
  return {
    id: 'S-1',
    companyName: 'Dhanam Agencies',
    companyLogo: '',
    canPrice: 40,
    depositAmount: 500,
    theme: 'light',
    darkMode: false,
    backupDate: new Date().toISOString(),
    lowStockThreshold: 15,
  };
}
