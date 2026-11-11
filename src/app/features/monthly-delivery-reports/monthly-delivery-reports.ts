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
import { toDateKey } from '../../utils/date-utils';
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

  readonly selectedMonthKey = signal(currentMonthKey());
  readonly monthLabel = computed(() => formatMonthLabel(this.selectedMonthKey()));
  // expose utility to template
  readonly formatMonthLabel = formatMonthLabel;
  // generate month options for the selector (last 12 months)
  readonly monthOptions = computed(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push(currentMonthKey(date));
    }
    return options.reverse();
  });
  readonly selectedCustomerId = signal('');
  readonly customers = computed(() =>
    [...this.stateService.customers()].sort((first, second) =>
      first.name.localeCompare(second.name),
    ),
  );
  readonly monthlyDeliveries = computed(() =>
    deliveriesForMonth(this.stateService.deliveries(), this.selectedMonthKey()),
  );
  readonly monthlySummary = computed(() => summarizeDeliveries(this.monthlyDeliveries()));
  readonly selectedCustomer = computed(() =>
    this.customers().find((customer) => customer.id === this.selectedCustomerId()),
  );
  readonly selectedCustomerDeliveries = computed(() => {
    const customerId = this.selectedCustomerId();
    const monthKey = this.selectedMonthKey();
    return customerId && monthKey
      ? this.stateService.deliveries()
          .filter((delivery) =>
            delivery.status === 'Delivered' &&
            delivery.customerId === customerId &&
            toDateKey(delivery.deliveryDate).startsWith(monthKey)
          )
      : [];
  });
  readonly selectedCustomerSummary = computed(() =>
    summarizeDeliveries(this.selectedCustomerDeliveries()),
  );

  async downloadExcel(): Promise<void> {
    try {
      await this.excelService.export({
        companyName: this.settingsService.settings().companyName,
        monthKey: this.selectedMonthKey(),
        deliveries: this.monthlyDeliveries(),
        customers: this.customers(),
      });
      this.notification.success(`${this.monthLabel()} delivery Excel report downloaded`);
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
      const customerId = customer.id;
      const monthKey = this.selectedMonthKey();
      const deliveries = this.stateService.deliveries();
      const payments = this.stateService.payments();
      const missingCans = this.stateService.missingCans();
      const customerDeliveries = deliveries.filter(
        (delivery) => delivery.status === 'Delivered' && delivery.customerId === customerId && toDateKey(delivery.deliveryDate).startsWith(monthKey),
      );
      const customerPayments = payments.filter(
        (payment) => payment.customerId === customerId && toDateKey(payment.paymentDate).startsWith(monthKey),
      );
      const customerMissing = missingCans.filter(
        (missingCan) => missingCan.customerId === customerId && toDateKey(missingCan.createdAt).startsWith(monthKey),
      );
      const previousDeliveries = deliveries.filter((delivery) => {
        const entryMonthKey = toDateKey(delivery.deliveryDate).slice(0, 7);
        return delivery.status === 'Delivered' && delivery.customerId === customerId && entryMonthKey < monthKey;
      });
      const previousPayments = payments.filter((payment) => {
        const entryMonthKey = toDateKey(payment.paymentDate).slice(0, 7);
        return payment.customerId === customerId && entryMonthKey < monthKey;
      });
      const previousMissing = missingCans.filter((missingCan) => {
        const entryMonthKey = toDateKey(missingCan.createdAt).slice(0, 7);
        return missingCan.customerId === customerId && entryMonthKey < monthKey;
      });

      this.invoicePdfService.download({
        companyName: this.settingsService.settings().companyName,
        customer,
        deliveries: customerDeliveries,
        payments: customerPayments,
        missingCans: customerMissing,
        previousDeliveries,
        previousPayments,
        previousMissingCans: previousMissing,
        monthKey,
      });
      this.notification.success(`${customer.name}'s monthly invoice PDF downloaded`);
    } catch (error) {
      console.error('[MonthlyDeliveryReports] PDF export failed:', error);
      this.notification.error('Could not create the monthly customer invoice PDF');
    }
  }
}
