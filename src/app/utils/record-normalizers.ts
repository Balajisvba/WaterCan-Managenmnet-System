import { Customer, Delivery, Expense, MissingCan, Payment, Settings } from '../models/app.models';
import { toDateKey } from './date-utils';

type RecordValue = Record<string, unknown>;

export function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function asNonNegativeNumber(value: unknown, fallback = 0): number {
  return Math.max(0, asNumber(value, fallback));
}

export function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

export function asDateText(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toDateKey(value);
  }

  return asText(value);
}

export function normalizeCustomer(value: Partial<Customer> | RecordValue): Customer {
  const record = value as RecordValue;
  const openingOutstandingCans = asNonNegativeNumber(record['openingOutstandingCans'] ?? record['outstandingCan']);

  return {
    id: asText(record['id']),
    name: asText(record['name']),
    mobile: asText(record['mobile']),
    alternateMobile: asText(record['alternateMobile']),
    address: asText(record['address']),
    area: asText(record['area']),
    depositAmount: asNonNegativeNumber(record['depositAmount']),
    openingOutstandingCans,
    // This is recalculated by BusinessStateService; retain the opening value
    // for raw service state only.
    outstandingCan: openingOutstandingCans,
    totalDelivered: 0,
    totalReturned: 0,
    status: normalizeCustomerStatus(record['status']),
    createdAt: asDateText(record['createdAt']),
    updatedAt: asDateText(record['updatedAt']),
  };
}

export function normalizeDelivery(value: Partial<Delivery> | RecordValue): Delivery {
  const record = value as RecordValue;
  const filledCans = asNonNegativeNumber(record['filledCans']);
  const ratePerCan = asNonNegativeNumber(record['ratePerCan']);
  const totalAmount = filledCans * ratePerCan;
  const paidAmount = asNonNegativeNumber(record['paidAmount']);

  return {
    id: asText(record['id']),
    customerId: asText(record['customerId']),
    customerName: asText(record['customerName']),
    filledCans,
    emptyCans: asNonNegativeNumber(record['emptyCans']),
    ratePerCan,
    totalAmount,
    paidAmount,
    balance: Math.max(0, totalAmount - paidAmount),
    driverName: asText(record['driverName']),
    remarks: asText(record['remarks']),
    deliveryDate: asDateText(record['deliveryDate']),
  };
}

export function normalizeExpense(value: Partial<Expense> | RecordValue): Expense {
  const record = value as RecordValue;
  return {
    id: asText(record['id']),
    date: asDateText(record['date']),
    category: asText(record['category']),
    amount: asNonNegativeNumber(record['amount']),
    remarks: asText(record['remarks']),
    createdAt: asDateText(record['createdAt']),
  };
}

export function normalizePayment(value: Partial<Payment> | RecordValue): Payment {
  const record = value as RecordValue;
  return {
    id: asText(record['id']),
    customerId: asText(record['customerId']),
    customerName: asText(record['customerName']),
    amount: asNonNegativeNumber(record['amount']),
    paymentDate: asDateText(record['paymentDate']),
    remarks: asText(record['remarks']),
  };
}

export function normalizeMissingCan(value: Partial<MissingCan> | RecordValue): MissingCan {
  const record = value as RecordValue;
  const missingQuantity = asNonNegativeNumber(record['missingQuantity']);
  const recoveredQuantity = Math.min(missingQuantity, asNonNegativeNumber(record['recoveredQuantity']));
  const lostQuantity = missingQuantity - recoveredQuantity;
  const costPerCan = asNonNegativeNumber(record['costPerCan']);

  return {
    id: asText(record['id']),
    customerId: asText(record['customerId']),
    customerName: asText(record['customerName']),
    missingQuantity,
    recoveredQuantity,
    lostQuantity,
    costPerCan,
    lossAmount: lostQuantity * costPerCan,
    status: normalizeMissingCanStatus(record['status'], lostQuantity),
    createdAt: asDateText(record['createdAt']),
  };
}

export function normalizeSettings(value: Partial<Settings> | RecordValue): Settings {
  const record = value as RecordValue;
  const darkMode = record['darkMode'] === true || record['darkMode'] === 'true' || record['theme'] === 'dark';
  return {
    id: asText(record['id']) || 'S-1',
    companyName: asText(record['companyName']) || 'Dhanam Agencies',
    companyLogo: asText(record['companyLogo']),
    canPrice: asNonNegativeNumber(record['canPrice'], 40),
    depositAmount: asNonNegativeNumber(record['depositAmount'], 500),
    theme: darkMode ? 'dark' : 'light',
    darkMode,
    backupDate: asDateText(record['backupDate']),
  };
}

export function requireText(value: unknown, field: string): string {
  const text = asText(value);
  if (!text) {
    throw new Error(`${field} is required`);
  }
  return text;
}

export function requireNonNegativeNumber(value: unknown, field: string, integer = false): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) {
    throw new Error(`${field} must be a${integer ? ' whole' : ''} non-negative number`);
  }
  return parsed;
}

export function requirePositiveNumber(value: unknown, field: string, integer = false): number {
  const parsed = requireNonNegativeNumber(value, field, integer);
  if (parsed === 0) {
    throw new Error(`${field} must be greater than zero`);
  }
  return parsed;
}

function normalizeCustomerStatus(value: unknown): Customer['status'] {
  const status = asText(value).toLowerCase();
  if (status === 'inactive') return 'Inactive';
  if (status === 'pending') return 'Pending';
  return 'Active';
}

function normalizeMissingCanStatus(value: unknown, lostQuantity: number): MissingCan['status'] {
  if (lostQuantity === 0) return 'Recovered';
  const status = asText(value).toLowerCase();
  if (status === 'closed') return 'Closed';
  if (status === 'recovered') return 'Recovered';
  return 'Open';
}
