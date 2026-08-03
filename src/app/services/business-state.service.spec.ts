import { describe, it, expect } from 'vitest';
import { calculateCustomerLedger } from './business-state.service';
import { Delivery, Payment } from '../models/app.models';

describe('Customer Balance & Payment Formula Edge Cases', () => {
  const dummyDelivery = (id: string, totalAmount: number, paidAmount: number = 0): Delivery => ({
    id,
    customerId: 'C-001',
    customerName: 'Balaji',
    filledCans: 10,
    emptyCans: 10,
    ratePerCan: 10,
    totalAmount,
    paidAmount,
    balance: Math.max(0, totalAmount - paidAmount),
    driverName: 'Driver',
    remarks: '',
    deliveryDate: '2026-08-01',
  });

  const dummyPayment = (id: string, amount: number): Payment => ({
    id,
    customerId: 'C-001',
    customerName: 'Balaji',
    amount,
    paymentDate: '2026-08-02',
    remarks: '',
  });

  it('Scenario 1: Delivery = ₹100, Payment = ₹100 -> Balance Due = ₹0, Advance = ₹0', () => {
    const deliveries = [dummyDelivery('D1', 100, 0)];
    const payments = [dummyPayment('P1', 100)];
    const ledger = calculateCustomerLedger(deliveries, payments, []);

    expect(ledger.totalInvoiced).toBe(100);
    expect(ledger.totalPaid).toBe(100);
    expect(ledger.balanceDue).toBe(0);
    expect(ledger.advanceAmount).toBe(0);
  });

  it('Scenario 2: Delivery = ₹100, Payment = ₹50 -> Balance Due = ₹50, Advance = ₹0', () => {
    const deliveries = [dummyDelivery('D1', 100, 0)];
    const payments = [dummyPayment('P1', 50)];
    const ledger = calculateCustomerLedger(deliveries, payments, []);

    expect(ledger.totalInvoiced).toBe(100);
    expect(ledger.totalPaid).toBe(50);
    expect(ledger.balanceDue).toBe(50);
    expect(ledger.advanceAmount).toBe(0);
  });

  it('Scenario 3: Delivery = ₹100, Payment = ₹200 -> Balance Due = ₹0, Advance = ₹100', () => {
    const deliveries = [dummyDelivery('D1', 100, 0)];
    const payments = [dummyPayment('P1', 200)];
    const ledger = calculateCustomerLedger(deliveries, payments, []);

    expect(ledger.totalInvoiced).toBe(100);
    expect(ledger.totalPaid).toBe(200);
    expect(ledger.balanceDue).toBe(0);
    expect(ledger.advanceAmount).toBe(100);
  });

  it('Scenario 4: Delivery = ₹500, Payments = ₹200 + ₹150 + ₹300 -> Balance Due = ₹0, Advance = ₹150', () => {
    const deliveries = [dummyDelivery('D1', 500, 0)];
    const payments = [
      dummyPayment('P1', 200),
      dummyPayment('P2', 150),
      dummyPayment('P3', 300),
    ];
    const ledger = calculateCustomerLedger(deliveries, payments, []);

    expect(ledger.totalInvoiced).toBe(500);
    expect(ledger.totalPaid).toBe(650);
    expect(ledger.balanceDue).toBe(0);
    expect(ledger.advanceAmount).toBe(150);
  });

  it('Scenario 5: Delete one payment after creating it -> Customer balance automatically recalculates', () => {
    const deliveries = [dummyDelivery('D1', 500, 0)];
    let payments = [
      dummyPayment('P1', 200),
      dummyPayment('P2', 150),
      dummyPayment('P3', 300),
    ];

    let ledger = calculateCustomerLedger(deliveries, payments, []);
    expect(ledger.advanceAmount).toBe(150);

    // Delete payment P3
    payments = payments.filter((p) => p.id !== 'P3');
    ledger = calculateCustomerLedger(deliveries, payments, []);

    expect(ledger.totalPaid).toBe(350);
    expect(ledger.balanceDue).toBe(150);
    expect(ledger.advanceAmount).toBe(0);
  });

  it('Scenario 6: Edit payment amount -> Balance immediately updates across calculation', () => {
    const deliveries = [dummyDelivery('D1', 500, 0)];
    const payments = [dummyPayment('P1', 200)];

    let ledger = calculateCustomerLedger(deliveries, payments, []);
    expect(ledger.balanceDue).toBe(300);

    // Edit payment amount from 200 to 600
    payments[0].amount = 600;
    ledger = calculateCustomerLedger(deliveries, payments, []);

    expect(ledger.balanceDue).toBe(0);
    expect(ledger.advanceAmount).toBe(100);
  });

  it('should calculate outstanding cans count correctly', () => {
    const initialOutstanding = 2;
    const filledDelivered = 10;
    const emptyReturned = 8;
    const lostCans = 1;

    const outstandingCans = Math.max(0, initialOutstanding + filledDelivered - emptyReturned - lostCans);
    expect(outstandingCans).toEqual(3);
  });
});
