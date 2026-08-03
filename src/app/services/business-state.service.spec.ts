import { describe, it, expect } from 'vitest';
import { Customer, Delivery, Expense, MissingCan, Payment } from '../models/app.models';
import { Delivery, MissingCan, Payment } from '../models/app.models';
import { calculateCustomerLedger } from './business-state.service';
import { calculateCustomerLedger } from './business-state.service';
import { Delivery, Payment } from '../models/app.models';

describe('Dhanam Agencies Financial & Calculation Formulas', () => {
  it('should calculate customer financial balance correctly from invoices and payments', () => {
    const totalInvoiced = 500;
    const totalPaid = 350;
    const missingLoss = 50;

    const balance = Math.max(0, totalInvoiced + missingLoss - totalPaid);
    expect(balance).toEqual(200);
describe('Dhanam Agencies Financial & Calculation Formulas', () => {
  const createDelivery = (amount: number): Delivery => ({
    id: `D-${amount}`,
    customerId: 'C1',
    customerName: 'Test Customer',
    filledCans: 1,
    emptyCans: 0,
    ratePerCan: amount,
    totalAmount: amount,
    paidAmount: 0,
    balance: amount,
    driverName: 'Driver',
    remarks: '',
    deliveryDate: '2026-08-01',
  });

  const createPayment = (amount: number): Payment => ({
    id: `P-${amount}`,
    customerId: 'C1',
    customerName: 'Test Customer',
    amount,
    paymentDate: '2026-08-02',
    remarks: '',
  });

  const createMissingCan = (amount: number): MissingCan => ({
    id: `M-${amount}`,
    customerId: 'C1',
    customerName: 'Test Customer',
    missingQuantity: 0,
    recoveredQuantity: 0,
    lostQuantity: 0,
    costPerCan: 0,
    lossAmount: amount,
    status: 'Open',
    createdAt: '2026-08-01',
  });

  it('should calculate balance due and advance correctly for a full payment', () => {
    const ledger = calculateCustomerLedger([createDelivery(100)], [createPayment(100)], []);

    expect(ledger.balanceDue).toEqual(0);
    expect(ledger.advanceAmount).toEqual(0);
  });

  it('should calculate balance due when payment is less than delivery amount', () => {
    const ledger = calculateCustomerLedger([createDelivery(100)], [createPayment(50)], []);

    expect(ledger.balanceDue).toEqual(50);
    expect(ledger.advanceAmount).toEqual(0);
  });

  it('should calculate advance balance when payment exceeds delivery amount', () => {
    const ledger = calculateCustomerLedger([createDelivery(100)], [createPayment(200)], []);

    expect(ledger.balanceDue).toEqual(0);
    expect(ledger.advanceAmount).toEqual(100);
  });

  it('should calculate advance balance when multiple payments exceed invoices', () => {
    const ledger = calculateCustomerLedger([createDelivery(500)], [createPayment(200), createPayment(150), createPayment(300)], []);

    expect(ledger.balanceDue).toEqual(0);
    expect(ledger.advanceAmount).toEqual(150);
  });

  it('should recalculate balances when a payment is removed', () => {
    const ledgerWithPayment = calculateCustomerLedger([createDelivery(100)], [createPayment(100)], []);
    const ledgerWithoutPayment = calculateCustomerLedger([createDelivery(100)], [], []);

    expect(ledgerWithPayment.balanceDue).toEqual(0);
    expect(ledgerWithoutPayment.balanceDue).toEqual(100);
    expect(ledgerWithoutPayment.advanceAmount).toEqual(0);
  });

  it('should recalculate balances when a payment amount is edited', () => {
    const ledgerBeforeEdit = calculateCustomerLedger([createDelivery(100)], [createPayment(50)], []);
    const ledgerAfterEdit = calculateCustomerLedger([createDelivery(100)], [createPayment(200)], []);

    expect(ledgerBeforeEdit.balanceDue).toEqual(50);
    expect(ledgerAfterEdit.balanceDue).toEqual(0);
    expect(ledgerAfterEdit.advanceAmount).toEqual(100);
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
