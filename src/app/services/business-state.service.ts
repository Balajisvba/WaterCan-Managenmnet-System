import { Injectable, computed, inject } from '@angular/core';
import { Customer, DashboardSummary, Delivery, Expense, MissingCan, Payment, ReportSummary } from '../models/app.models';
import { CustomerService } from './customer.service';
import { DeliveryService } from './delivery.service';
import { ExpenseService } from './expense.service';
import { MissingCanService } from './missing-can.service';
import { PaymentService } from './payment.service';

export interface CustomerLedgerStats {
  totalDelivered: number;
  totalReturned: number;
  outstandingCan: number;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
}

@Injectable({ providedIn: 'root' })
export class BusinessStateService {
  private readonly customerService = inject(CustomerService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly paymentService = inject(PaymentService);
  private readonly expenseService = inject(ExpenseService);
  private readonly missingCanService = inject(MissingCanService);

  readonly rawCustomers = this.customerService.customers;
  readonly deliveries = this.deliveryService.deliveries;
  readonly payments = this.paymentService.payments;
  readonly expenses = this.expenseService.expenses;
  readonly missingCans = this.missingCanService.missingCans;

  readonly customers = computed<Customer[]>(() => {
    const raw = this.rawCustomers();
    const deliveries = this.deliveries();
    const payments = this.payments();
    const missing = this.missingCans();

    return raw.map((cust) => {
      const custDeliveries = deliveries.filter((d) => d.customerId === cust.id);
      const custPayments = payments.filter((p) => p.customerId === cust.id);
      const custMissing = missing.filter((m) => m.customerId === cust.id);

      const totalDelivered = custDeliveries.reduce((sum, d) => sum + (Number(d.filledCans) || 0), 0);
      const totalReturned = custDeliveries.reduce((sum, d) => sum + (Number(d.emptyCans) || 0), 0);

      const missingLossCans = custMissing.reduce((sum, m) => sum + (Number(m.lostQuantity) || 0), 0);
      const outstandingCan = Math.max(0, (cust.outstandingCan || 0) + totalDelivered - totalReturned - missingLossCans);

      // Calculate total pending amount as sum of Balance Due in delivery module for this customer
      const balance = custDeliveries.reduce(
        (sum, d) => sum + (d.balance !== undefined && !isNaN(Number(d.balance)) ? Number(d.balance) : Math.max(0, (Number(d.totalAmount) || 0) - (Number(d.paidAmount) || 0))),
        0
      );

      return {
        ...cust,
        totalDelivered,
        totalReturned,
        outstandingCan,
        pendingAmount: balance,
        status: cust.status === 'Inactive' ? 'Inactive' : balance > 0 || outstandingCan > 0 ? 'Active' : 'Pending',
      };
    });
  });

  readonly dashboardSummary = computed<DashboardSummary>(() => {
    const customers = this.customers();
    const deliveries = this.deliveries();
    const expenses = this.expenses();
    const missing = this.missingCans();

    const todayStr = new Date().toISOString().split('T')[0];

    const todayDeliveriesList = deliveries.filter((d) => d.deliveryDate && d.deliveryDate.startsWith(todayStr));
    const todayRevenue = todayDeliveriesList.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

    const todayExpensesList = expenses.filter((e) => e.date && e.date.startsWith(todayStr));
    const todayExpenses = todayExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const todayProfit = todayRevenue - todayExpenses;

    const outstandingCans = customers.reduce((sum, c) => sum + (Number(c.outstandingCan) || 0), 0);
    const missingCansCount = missing.reduce((sum, m) => sum + (Number(m.missingQuantity) || 0), 0);
    const activeCustomers = customers.filter((c) => c.status === 'Active').length;

    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyRevenue = deliveries
      .filter((d) => d.deliveryDate && d.deliveryDate.startsWith(currentMonthPrefix))
      .reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

    const revenueTrend = this.buildMonthlyTrend(deliveries.map((d) => ({ date: d.deliveryDate, val: d.totalAmount })));
    const expenseTrend = this.buildMonthlyTrend(expenses.map((e) => ({ date: e.date, val: e.amount })));
    const profitTrend = this.buildMonthlyProfitTrend(deliveries, expenses);
    const missingTrend = this.buildMonthlyTrend(missing.map((m) => ({ date: m.createdAt, val: m.missingQuantity })));

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

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYearPrefix = `${now.getFullYear()}`;

    const dailyRevenue = deliveries
      .filter((d) => d.deliveryDate && d.deliveryDate.startsWith(todayStr))
      .reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

    const weeklyRevenue = deliveries
      .filter((d) => d.deliveryDate && new Date(d.deliveryDate) >= oneWeekAgo)
      .reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

    const monthlyRevenue = deliveries
      .filter((d) => d.deliveryDate && d.deliveryDate.startsWith(currentMonthPrefix))
      .reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

    const yearlyRevenue = deliveries
      .filter((d) => d.deliveryDate && d.deliveryDate.startsWith(currentYearPrefix))
      .reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

    const totalRevenue = deliveries.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const profit = totalRevenue - totalExpenses;

    const customerOutstanding = customers.reduce((sum, c) => {
      const custDeliveries = deliveries.filter((d) => d.customerId === c.id);
      const custPayments = payments.filter((p) => p.customerId === c.id);
      const custMissing = missing.filter((m) => m.customerId === c.id);

      const inv = custDeliveries.reduce((s, d) => s + (Number(d.totalAmount) || 0), 0);
      const delPay = custDeliveries.reduce((s, d) => s + (Number(d.paidAmount) || 0), 0);
      const dirPay = custPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const loss = custMissing.reduce((s, m) => s + (Number(m.lossAmount) || 0), 0);

      return sum + Math.max(0, inv + loss - (delPay + dirPay));
    }, 0);

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
      const d = new Date(item.date);
      if (isNaN(d.getTime())) return;
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
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
