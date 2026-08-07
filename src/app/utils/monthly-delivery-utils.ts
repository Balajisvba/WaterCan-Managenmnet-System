import { Delivery } from '../models/app.models';
import { toDateKey } from './date-utils';

export interface MonthlyDeliverySummary {
  deliveryCount: number;
  filledCans: number;
  emptyCans: number;
  totalInvoiced: number;
  totalPaid: number;
  totalBalance: number;
}

export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return monthKey;
  }

  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

export function deliveriesForMonth(deliveries: Delivery[], monthKey: string): Delivery[] {
  return deliveries
    .filter((delivery) => toDateKey(delivery.deliveryDate).startsWith(monthKey))
    .sort((first, second) =>
      toDateKey(first.deliveryDate).localeCompare(toDateKey(second.deliveryDate)),
    );
}

export function summarizeDeliveries(deliveries: Delivery[]): MonthlyDeliverySummary {
  return deliveries.reduce<MonthlyDeliverySummary>(
    (summary, delivery) => ({
      deliveryCount: summary.deliveryCount + 1,
      filledCans: summary.filledCans + (Number(delivery.filledCans) || 0),
      emptyCans: summary.emptyCans + (Number(delivery.emptyCans) || 0),
      totalInvoiced: summary.totalInvoiced + (Number(delivery.totalAmount) || 0),
      totalPaid: summary.totalPaid + (Number(delivery.paidAmount) || 0),
      totalBalance: summary.totalBalance + (Number(delivery.balance) || 0),
    }),
    {
      deliveryCount: 0,
      filledCans: 0,
      emptyCans: 0,
      totalInvoiced: 0,
      totalPaid: 0,
      totalBalance: 0,
    },
  );
}
