import { describe, it, expect } from 'vitest';
import { deriveCustomerStatus } from './services/business-state.service';
import { isDateInRange, toLocalDateInputValue } from './utils/date-utils';
import { buildSeedCustomers, buildSeedDeliveries, buildSeedExpenses, generateId } from './utils/sample-data';
import { deliveriesForMonth, summarizeDeliveries } from './utils/monthly-delivery-utils';

describe('Dhanam Agencies Business Logic & Data Models', () => {
  it('should generate sequential entity IDs with correct prefixes', () => {
    const customerId = generateId('C', ['C-001', 'C-009']);
    const deliveryId = generateId('D', ['D-001']);

    expect(customerId).toBe('C-010');
    expect(deliveryId).toBe('D-002');
  });

  it('should build seed customer data with valid defaults', () => {
    const customers = buildSeedCustomers();
    expect(customers.length).toBeGreaterThan(0);
    expect(customers[0].name).toBe('Rahul Kumar');
    expect(customers[0].status).toBe('Active');
  });

  it('should build seed delivery data with accurate balances', () => {
    const deliveries = buildSeedDeliveries();
    expect(deliveries.length).toBeGreaterThan(0);
    const d = deliveries[0];
    expect(d.totalAmount - d.paidAmount).toEqual(d.balance);
  });

  it('should build seed expenses', () => {
    const expenses = buildSeedExpenses();
    expect(expenses.length).toBeGreaterThan(0);
    expect(expenses[0].category).toBe('Fuel');
  });

  it('should preserve an explicitly selected Active status instead of overriding it to Pending', () => {
    const status = deriveCustomerStatus('Active', 0, 0);
    expect(status).toBe('Active');
  });

  it('should filter delivery dates using the selected range correctly', () => {
    expect(isDateInRange('2026-07-15T10:00:00.000Z', '2026-07-01', '2026-07-31')).toBe(true);
    expect(isDateInRange('2026-07-15T10:00:00.000Z', '2026-08-01', '2026-08-31')).toBe(false);
  });

  it('should calculate this-month delivery cans from only that month\'s records', () => {
    const deliveries = [
      {
        id: 'D-001',
        customerId: 'C-001',
        customerName: 'Rahul Kumar',
        filledCans: 4,
        emptyCans: 2,
        ratePerCan: 40,
        totalAmount: 160,
        paidAmount: 120,
        balance: 40,
        driverName: 'Aman',
        remarks: '',
        deliveryDate: '2026-07-14T08:00:00.000Z',
      },
      {
        id: 'D-002',
        customerId: 'C-001',
        customerName: 'Rahul Kumar',
        filledCans: 3,
        emptyCans: 1,
        ratePerCan: 40,
        totalAmount: 120,
        paidAmount: 120,
        balance: 0,
        driverName: 'Aman',
        remarks: '',
        deliveryDate: '2026-06-30T08:00:00.000Z',
      },
    ];

    const monthlyDeliveries = deliveriesForMonth(deliveries, '2026-07');
    const summary = summarizeDeliveries(monthlyDeliveries);

    expect(summary).toMatchObject({ deliveryCount: 1, filledCans: 4, emptyCans: 2, totalInvoiced: 160 });
  });
});
