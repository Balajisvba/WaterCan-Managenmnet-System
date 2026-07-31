import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { BusinessStateService } from '../../services/business-state.service';
import { MonthlyCustomerInvoicePdfService } from '../../services/monthly-customer-invoice-pdf.service';
import { MonthlyDeliveryExcelService } from '../../services/monthly-delivery-excel.service';
import { NotificationService } from '../../services/notification.service';
import { SettingsService } from '../../services/settings.service';
import {
  currentMonthKey,
  deliveriesForMonth,
  formatMonthLabel,
  summarizeDeliveries,
} from '../../utils/monthly-delivery-utils';

@Component({
  selector: 'app-monthly-delivery-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
  ],
  templateUrl: './monthly-delivery-reports.html',
  styleUrl: './monthly-delivery-reports.css',
})
export class MonthlyDeliveryReportsComponent {
  private readonly stateService = inject(BusinessStateService);
  private readonly settingsService = inject(SettingsService);
  private readonly excelService = inject(MonthlyDeliveryExcelService);
  private readonly invoicePdfService = inject(MonthlyCustomerInvoicePdfService);
  private readonly notification = inject(NotificationService);

  readonly monthKey = currentMonthKey();
  readonly monthLabel = formatMonthLabel(this.monthKey);
  readonly selectedCustomerId = signal('');
  readonly customers = computed(() =>
    [...this.stateService.customers()].sort((first, second) =>
      first.name.localeCompare(second.name),
    ),
  );
  readonly monthlyDeliveries = computed(() =>
    deliveriesForMonth(this.stateService.deliveries(), this.monthKey),
  );
  readonly monthlySummary = computed(() => summarizeDeliveries(this.monthlyDeliveries()));
  readonly selectedCustomer = computed(() =>
    this.customers().find((customer) => customer.id === this.selectedCustomerId()),
  );
  readonly selectedCustomerDeliveries = computed(() => {
    const customerId = this.selectedCustomerId();
    return customerId
      ? this.monthlyDeliveries().filter((delivery) => delivery.customerId === customerId)
      : [];
  });
  readonly selectedCustomerSummary = computed(() =>
    summarizeDeliveries(this.selectedCustomerDeliveries()),
  );

  async downloadExcel(): Promise<void> {
    try {
      await this.excelService.export({
        companyName: this.settingsService.settings().companyName,
        monthKey: this.monthKey,
        deliveries: this.monthlyDeliveries(),
        customers: this.customers(),
      });
      this.notification.success(`${this.monthLabel} delivery Excel report downloaded`);
    } catch (error) {
      console.error('[MonthlyDeliveryReports] Excel export failed:', error);
      this.notification.error('Could not create the monthly delivery Excel report');
    }
  }

  downloadCustomerInvoice(): void {
    const customer = this.selectedCustomer();
    if (!customer) {
      this.notification.error('Select a customer before downloading the invoice');
      return;
    }

    try {
      this.invoicePdfService.download({
        companyName: this.settingsService.settings().companyName,
        customer,
        deliveries: this.selectedCustomerDeliveries(),
        monthKey: this.monthKey,
      });
      this.notification.success(`${customer.name}'s monthly invoice PDF downloaded`);
    } catch (error) {
      console.error('[MonthlyDeliveryReports] PDF export failed:', error);
      this.notification.error('Could not create the monthly customer invoice PDF');
    }
  }
}
