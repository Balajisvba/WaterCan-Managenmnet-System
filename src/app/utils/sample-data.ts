import { Customer, Delivery, Expense, MissingCan, Payment, Settings } from '../models/app.models';

export function generateId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.().replace(/-/g, '') ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomId}`;
}

export function buildSeedCustomers(): Customer[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'C-1001',
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
      id: 'C-1002',
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
      id: 'C-1003',
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
      id: 'D-2001',
      customerId: 'C-1001',
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
    },
    {
      id: 'D-2002',
      customerId: 'C-1002',
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
    },
  ];
}

export function buildSeedExpenses(): Expense[] {
  return [
    {
      id: 'E-3001',
      date: new Date().toISOString(),
      category: 'Fuel',
      amount: 1200,
      remarks: 'Daily fuel',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'E-3002',
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
      id: 'P-4001',
      customerId: 'C-1001',
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
      id: 'M-5001',
      customerId: 'C-1003',
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
  };
}
