import { Injectable, inject } from '@angular/core';
import { Customer, Delivery, Expense, MissingCan, Payment, ReportSummary } from '../models/app.models';
import { ExcelService } from './excel.service';
import { BusinessStateService } from './business-state.service';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly excelService = inject(ExcelService);
  private readonly stateService = inject(BusinessStateService);

  readonly summary = this.stateService.reportSummary;

  generateReport(customers: Customer[], deliveries: Delivery[], expenses: Expense[], missing: MissingCan[], payments: Payment[]): ReportSummary {
    return this.stateService.reportSummary();
  }

  async exportReportSummary(summary: ReportSummary): Promise<void> {
    await this.excelService.exportReportSummary(summary);
  }
}
