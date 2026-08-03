import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { Customer, DashboardSummary, Delivery, Expense, MissingCan, Payment, ReportSummary } from '../models/app.models';
import { toDateKey } from '../utils/date-utils';
import { CustomerService } from './customer.service';
import { DeliveryService } from './delivery.service';
import { ExpenseService } from './expense.service';
import { MissingCanService } from './missing-can.service';
import { PaymentService } from './payment.service';
import { SettingsService } from './settings.service';
import { GoogleAuthService } from './google-auth.service';

export interface CustomerLedgerStats {
  totalDelivered: number;
  totalReturned: number;
  outstandingCan: number;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
  balanceDue: number;
  advanceAmount: number;
}

export function calculateCustomerLedger(deliveries: Delivery[], payments: Payment[], missingCans: MissingCan[]): CustomerLedgerStats {
  const totalDelivered = deliveries.reduce((sum, delivery) => sum + (Number(delivery.filledCans) || 0), 0);
  const totalReturned = deliveries.reduce((sum, delivery) => sum + (Number(delivery.emptyCans) || 0), 0);
  const totalInvoiced = deliveries.reduce((sum, delivery) => sum + (Number(delivery.totalAmount) || 0), 0);
  const totalPaid =
    deliveries.reduce((sum, delivery) => sum + (Number(delivery.paidAmount) || 0), 0) +
    payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const missingCanCharges = missingCans.reduce((sum, entry) => sum + (Number(entry.lossAmount) || 0), 0);

  const netBalance = totalInvoiced + missingCanCharges - totalPaid;
  const balanceDue = netBalance > 0 ? netBalance : 0;
  const advanceAmount = netBalance < 0 ? Math.abs(netBalance) : 0;

  return {
    totalDelivered,
    totalReturned,
    outstandingCan: 0,
    totalInvoiced,
    totalPaid,
    balance: balanceDue,
    balanceDue,
    advanceAmount,
  };
}

export function deriveCustomerStatus(status: string | undefined, balance: number, outstandingCan: number): Customer['status'] {
  const normalizedStatus = (status || 'Pending').toLowerCase();

  if (normalizedStatus === 'inactive') {
    return 'Inactive';
  }

  if (normalizedStatus === 'active') {
    return 'Active';
  }

  return balance > 0 || outstandingCan > 0 ? 'Active' : 'Pending';
}

@Injectable({ providedIn: 'root' })
export class BusinessStateService {
  private readonly customerService = inject(CustomerService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly paymentService = inject(PaymentService);
  private readonly expenseService = inject(ExpenseService);
  private readonly missingCanService = inject(MissingCanService);
  private readonly settingsService = inject(SettingsService);
  private readonly authService = inject(GoogleAuthService);
  private refreshInFlight: Promise<void> | null = null;

  readonly isSyncing = signal(false);
  readonly syncError = signal<string | null>(null);
  readonly lastSyncedAt = signal<Date | null>(null);

  readonly rawCustomers = this.customerService.customers;
  readonly deliveries = this.deliveryService.deliveries;
  readonly payments = this.paymentService.payments;
  readonly expenses = this.expenseService.expenses;
  readonly missingCans = this.missingCanService.missingCans;

  constructor() {
    effect((onCleanup) => {
      if (!this.authService.isSignedIn()) {
        return;
      }

      void this.refresh();
      const intervalId = window.setInterval(() => void this.refresh(), environment.autoRefreshInterval);
      onCleanup(() => window.clearInterval(intervalId));
    });
  }

  async refresh(): Promise<void> {
    if (!this.authService.isSignedIn()) {
      return;
    }

    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.isSyncing.set(true);
    this.syncError.set(null);
    this.refreshInFlight = Promise.all([
      this.customerService.load(),
      this.deliveryService.load(),
      this.paymentService.load(),
      this.expenseService.load(),
      this.missingCanService.load(),
      this.settingsService.load(),
    ])
      .then(() => {
        this.lastSyncedAt.set(new Date());
      })
      .catch((error: unknown) => {
        this.syncError.set(error instanceof Error ? error.message : 'Unable to synchronize shared data');
        throw error;
      })
      .finally(() => {
        this.isSyncing.set(false);
        this.refreshInFlight = null;
      });

    return this.refreshInFlight;
  }

  readonly customers = computed<Customer[]>(() => {
    const raw = this.rawCustomers();
    const deliveries = this.deliveries();
    const payments = this.payments();
    const missing = this.missingCans();

    return raw.map((cust) => {
      const custDeliveries = deliveries.filter((d) => d.customerId === cust.id);
      const custPayments = payments.filter((p) => p.customerId === cust.id);
      const custMissing = missing.filter((m) => m.customerId === cust.id);

      const ledger = calculateCustomerLedger(custDeliveries, custPayments, custMissing);
      const missingLossCans = custMissing.reduce((sum, entry) => sum + (Number(entry.lostQuantity) || 0), 0);
      const openingOutstandingCans = Number(cust.openingOutstandingCans ?? cust.outstandingCan) || 0;
      const outstandingCan = Math.max(0, openingOutstandingCans + ledger.totalDelivered - ledger.totalReturned - missingLossCans);
      const balance = ledger.balance;

      const derivedStatus = deriveCustomerStatus(cust.status, balance, outstandingCan);

      return {
        ...cust,
        openingOutstandingCans,
        totalDelivered: ledger.totalDelivered,
        totalReturned: ledger.totalReturned,
        outstandingCan,
        pendingAmount: balance,
        balanceDue: ledger.balanceDue,
        advanceAmount: ledger.advanceAmount,
        status: derivedStatus,
      };
    });
  });

  readonly dashboardSummary = computed<DashboardSummary>(() => {
    const customers = this.customers();
    const deliveries = this.deliveries();
    const expenses = this.expenses();
    const missing = this.missingCans();

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const todayDeliveriesList = deliveries.filter((d) => toDateKey(d.deliveryDate) === todayStr);
    const todayRevenue = todayDeliveriesList.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

    const todayExpensesList = expenses.filter((e) => toDateKey(e.date) === todayStr);
    const todayExpenses = todayExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const todayProfit = todayRevenue - todayExpenses;

    const outstandingCans = customers.reduce((sum, c) => sum + (Number(c.outstandingCan) || 0), 0);
    const missingCansCount = missing.reduce((sum, m) => sum + (Number(m.lostQuantity) || 0), 0);
    const activeCustomers = customers.filter((c) => c.status === 'Active').length;

    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyRevenue = deliveries
      .filter((d) => toDateKey(d.deliveryDate).startsWith(currentMonthPrefix))
      .reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

    const revenueTrend = this.buildMonthlyTrend(deliveries.map((d) => ({ date: d.deliveryDate, val: d.totalAmount })));
    const expenseTrend = this.buildMonthlyTrend(expenses.map((e) => ({ date: e.date, val: e.amount })));
    const profitTrend = this.buildMonthlyProfitTrend(deliveries, expenses);
    const missingTrend = this.buildMonthlyTrend(missing.map((m) => ({ date: m.createdAt, val: m.lostQuantity })));

    const recentDeliveries = [...deliveries].sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()).slice(0, 5);

    return {
      todayRevenue,
      todayDeliveries: todayDeliveriesList.length,
      todayExpenses,
      todayProfit,
      outstandingCans,
      missingCans: missingCansCount,
      activeCustomers,
      monthlyRevenue,
      revenueTrend,
      expenseTrend,
      profitTrend,
      missingTrend,
      recentDeliveries,
    };
  });

  readonly reportSummary = computed<ReportSummary>(() => {
    const customers = this.customers();
    const deliveries = this.deliveries();
    const expenses = this.expenses();
    const missing = this.missingCans();
    const payments = this.payments();

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const oneWeekAgoStr = toDateKey(oneWeekAgo);
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYearPrefix = `${now.getFullYear()}`;

    const dailyRevenue = deliveries
      .filter((d) => toDateKey(d.deliveryDate) === todayStr)
      .reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

    const weeklyRevenue = deliveries
      .filter((d) => {
        const date = toDateKey(d.deliveryDate);
        return date >= oneWeekAgoStr && date <= todayStr;
      })
      .reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

    const monthlyRevenue = deliveries
      .filter((d) => toDateKey(d.deliveryDate).startsWith(currentMonthPrefix))
      .reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

    const yearlyRevenue = deliveries
      .filter((d) => toDateKey(d.deliveryDate).startsWith(currentYearPrefix))
      .reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

    const totalRevenue = deliveries.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const profit = totalRevenue - totalExpenses;

    const customerOutstanding = customers.reduce((sum, customer) => sum + (Number(customer.pendingAmount) || 0), 0);

    const missingCanLoss = missing.reduce((sum, m) => sum + (Number(m.lossAmount) || 0), 0);

    return {
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      yearlyRevenue,
      profit,
      expenses: totalExpenses,
      customerOutstanding,
      missingCanLoss,
    };
  });

  private buildMonthlyTrend(items: Array<{ date: string; val: number }>): Array<{ label: string; value: number }> {
    const monthsMap = new Map<string, number>();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      monthsMap.set(key, 0);
    }

    items.forEach((item) => {
      if (!item.date) return;
      const dateKey = toDateKey(item.date);
      const [year, month] = dateKey.split('-').map(Number);
      if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return;
      const key = `${months[month - 1]} ${year.toString().slice(-2)}`;
      if (monthsMap.has(key)) {
        monthsMap.set(key, (monthsMap.get(key) || 0) + (Number(item.val) || 0));
      }
    });

    return Array.from(monthsMap.entries()).map(([label, value]) => ({ label, value }));
  }

  private buildMonthlyProfitTrend(deliveries: Delivery[], expenses: Expense[]): Array<{ label: string; value: number }> {
    const revTrend = this.buildMonthlyTrend(deliveries.map((d) => ({ date: d.deliveryDate, val: d.totalAmount })));
    const expTrend = this.buildMonthlyTrend(expenses.map((e) => ({ date: e.date, val: e.amount })));

    return revTrend.map((item, idx) => ({
      label: item.label,
      value: item.value - (expTrend[idx]?.value || 0),
    }));
  }
}
