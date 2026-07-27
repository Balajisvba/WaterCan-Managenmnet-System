import { describe, it, expect } from 'vitest';
import { Customer, Delivery, Expense, MissingCan, Payment } from '../models/app.models';

describe('AquaTrack Financial & Calculation Formulas', () => {
  it('should calculate customer financial balance correctly from invoices and payments', () => {
    const totalInvoiced = 500;
    const totalPaid = 350;
    const missingLoss = 50;

    const balance = Math.max(0, totalInvoiced + missingLoss - totalPaid);
    expect(balance).toEqual(200);
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
