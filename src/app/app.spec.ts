import { describe, it, expect } from 'vitest';
import { buildSeedCustomers, buildSeedDeliveries, buildSeedExpenses, generateId } from './utils/sample-data';

describe('AquaTrack Business Logic & Data Models', () => {
  it('should generate unique entity IDs with correct prefixes', () => {
    const customerId = generateId('C');
    const deliveryId = generateId('D');

    expect(customerId).toContain('C-');
    expect(deliveryId).toContain('D-');
    expect(customerId).not.toEqual(deliveryId);
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
});
