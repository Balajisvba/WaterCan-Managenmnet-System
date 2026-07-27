import { Injectable, inject } from '@angular/core';
import { Customer, DashboardSummary, Delivery, Expense, MissingCan, Payment, ReportSummary } from '../models/app.models';
import { BusinessStateService } from './business-state.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly stateService = inject(BusinessStateService);

  readonly summary = this.stateService.dashboardSummary;

  getDashboardSummary(customers: Customer[], deliveries: Delivery[], expenses: Expense[], missing: MissingCan[], payments: Payment[]): DashboardSummary {
    return this.stateService.dashboardSummary();
  }

  getReportSummary(customers: Customer[], deliveries: Delivery[], expenses: Expense[], missing: MissingCan[], payments: Payment[]): ReportSummary {
    return this.stateService.reportSummary();
  }
}
