import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { Customer, Delivery } from '../models/app.models';
import { formatMonthLabel, summarizeDeliveries } from '../utils/monthly-delivery-utils';
import { toDateKey } from '../utils/date-utils';

export interface MonthlyCustomerInvoiceInput {
  companyName: string;
  customer: Customer;
  deliveries: Delivery[];
  monthKey: string;
}

@Injectable({ providedIn: 'root' })
export class MonthlyCustomerInvoicePdfService {
  download(input: MonthlyCustomerInvoiceInput): void {
    const document = new jsPDF({ format: 'a4', unit: 'mm' });
    const summary = summarizeDeliveries(input.deliveries);
    const pageWidth = document.internal.pageSize.getWidth();
    const pageHeight = document.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;

    document.setProperties({
      title: `Monthly Delivery Invoice - ${input.customer.id} - ${input.monthKey}`,
      author: input.companyName,
      subject: `Monthly water-can delivery invoice for ${formatMonthLabel(input.monthKey)}`,
    });

    let y = this.drawHeader(document, input, margin, contentWidth);
    y = this.drawCustomerDetails(
      document,
      input.customer,
      summary.filledCans,
      summary.emptyCans,
      margin,
      contentWidth,
      y,
    );
    y = this.drawDeliveryTableHeader(document, margin, y + 8, contentWidth);

    if (input.deliveries.length === 0) {
      document.setFontSize(9);
      document.setTextColor(90, 90, 90);
      document.text(
        'No deliveries were recorded for this customer during this month.',
        margin + 4,
        y + 7,
      );
      y += 16;
    } else {
      for (const delivery of input.deliveries) {
        if (y + 9 > pageHeight - 34) {
          document.addPage();
          y = this.drawDeliveryTableHeader(document, margin, 18, contentWidth);
        }
        this.drawDeliveryRow(document, delivery, margin, y, contentWidth);
        y += 9;
      }
    }

    if (y + 40 > pageHeight - 18) {
      document.addPage();
      y = 18;
    }
    this.drawTotals(document, summary, margin, y + 5, contentWidth);
    this.drawFooters(document, input.companyName, pageWidth, pageHeight);

    document.save(`monthly-delivery-invoice-${input.customer.id}-${input.monthKey}.pdf`);
  }

  private drawHeader(
    document: jsPDF,
    input: MonthlyCustomerInvoiceInput,
    margin: number,
    width: number,
  ): number {
    document.setFillColor(21, 101, 192);
    document.roundedRect(margin, 14, width, 26, 3, 3, 'F');
    document.setTextColor(255, 255, 255);
    document.setFont('helvetica', 'bold');
    document.setFontSize(17);
    document.text(input.companyName, margin + 6, 25);
    document.setFont('helvetica', 'normal');
    document.setFontSize(8);
    document.text('Water Can Delivery Management', margin + 6, 32);
    document.setFont('helvetica', 'bold');
    document.setFontSize(13);
    document.text('MONTHLY DELIVERY INVOICE', margin + width - 6, 24, { align: 'right' });
    document.setFont('helvetica', 'normal');
    document.setFontSize(8);
    document.text(`Billing month: ${formatMonthLabel(input.monthKey)}`, margin + width - 6, 31, {
      align: 'right',
    });

    document.setTextColor(35, 35, 35);
    document.setFontSize(8);
    document.text(`Generated: ${this.formatDate(new Date().toISOString())}`, margin, 47);
    document.text(`Customer ID: ${input.customer.id}`, margin + width, 47, { align: 'right' });
    return 52;
  }

  private drawCustomerDetails(
    document: jsPDF,
    customer: Customer,
    filledCans: number,
    emptyCans: number,
    margin: number,
    width: number,
    y: number,
  ): number {
    document.setDrawColor(203, 213, 225);
    document.setFillColor(248, 250, 252);
    document.roundedRect(margin, y, width, 30, 2, 2, 'FD');
    document.setTextColor(71, 85, 105);
    document.setFont('helvetica', 'bold');
    document.setFontSize(8);
    document.text('BILLED TO', margin + 5, y + 7);
    document.text('MONTHLY CAN SUMMARY', margin + width - 5, y + 7, { align: 'right' });

    document.setTextColor(30, 41, 59);
    document.setFontSize(11);
    document.text(customer.name, margin + 5, y + 14);
    document.setFont('helvetica', 'normal');
    document.setFontSize(8);
    const addressLines = document
      .splitTextToSize(customer.address || 'Address not provided', 82)
      .slice(0, 2);
    document.text(addressLines, margin + 5, y + 20);
    document.text(`Mobile: ${customer.mobile || 'Not provided'}`, margin + 5, y + 28);

    document.setFont('helvetica', 'bold');
    document.setFontSize(9);
    document.text(`${filledCans} Filled Cans`, margin + width - 5, y + 16, { align: 'right' });
    document.setTextColor(51, 65, 85);
    document.text(`${emptyCans} Empty Cans Returned`, margin + width - 5, y + 24, {
      align: 'right',
    });
    document.setTextColor(35, 35, 35);
    return y + 30;
  }

  private drawDeliveryTableHeader(
    document: jsPDF,
    margin: number,
    y: number,
    width: number,
  ): number {
    const columns = [25, 28, 18, 18, 22, 29, 28];
    const labels = ['Date', 'Delivery ID', 'Filled', 'Empty', 'Rate / Can', 'Invoiced', 'Balance'];
    document.setFillColor(30, 136, 229);
    document.rect(margin, y, width, 8, 'F');
    document.setTextColor(255, 255, 255);
    document.setFont('helvetica', 'bold');
    document.setFontSize(7.5);
    let x = margin;
    labels.forEach((label, index) => {
      const alignedRight = index >= 4;
      document.text(label, alignedRight ? x + columns[index] - 2 : x + 2, y + 5.2, {
        align: alignedRight ? 'right' : 'left',
      });
      x += columns[index];
    });
    document.setTextColor(35, 35, 35);
    return y + 8;
  }

  private drawDeliveryRow(
    document: jsPDF,
    delivery: Delivery,
    margin: number,
    y: number,
    width: number,
  ): void {
    const columns = [25, 28, 18, 18, 22, 29, 28];
    const values = [
      this.formatDate(delivery.deliveryDate),
      delivery.id,
      String(delivery.filledCans),
      String(delivery.emptyCans),
      this.currency(delivery.ratePerCan),
      this.currency(delivery.totalAmount),
      this.currency(delivery.balance),
    ];

    document.setDrawColor(226, 232, 240);
    document.rect(margin, y, width, 9);
    document.setFont('helvetica', 'normal');
    document.setFontSize(7.5);
    let x = margin;
    values.forEach((value, index) => {
      const alignedRight = index >= 4;
      document.text(value, alignedRight ? x + columns[index] - 2 : x + 2, y + 5.8, {
        align: alignedRight ? 'right' : 'left',
      });
      x += columns[index];
    });
  }

  private drawTotals(
    document: jsPDF,
    summary: ReturnType<typeof summarizeDeliveries>,
    margin: number,
    y: number,
    width: number,
  ): void {
    const boxWidth = 82;
    const x = margin + width - boxWidth;
    document.setFillColor(248, 250, 252);
    document.setDrawColor(148, 163, 184);
    document.roundedRect(x, y, boxWidth, 32, 2, 2, 'FD');
    const rows = [
      ['Monthly invoiced', this.currency(summary.totalInvoiced)],
      ['Amount paid', this.currency(summary.totalPaid)],
      ['Balance due', this.currency(summary.totalBalance)],
    ];

    document.setFontSize(8.5);
    rows.forEach(([label, value], index) => {
      const rowY = y + 8 + index * 8;
      document.setFont('helvetica', index === 2 ? 'bold' : 'normal');
      document.setTextColor(index === 2 ? 185 : 51, index === 2 ? 28 : 65, index === 2 ? 28 : 85);
      document.text(label, x + 4, rowY);
      document.text(value, x + boxWidth - 4, rowY, { align: 'right' });
    });
    document.setTextColor(35, 35, 35);
  }

  private drawFooters(
    document: jsPDF,
    companyName: string,
    pageWidth: number,
    pageHeight: number,
  ): void {
    const pages = document.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      document.setPage(page);
      document.setDrawColor(203, 213, 225);
      document.line(16, pageHeight - 14, pageWidth - 16, pageHeight - 14);
      document.setTextColor(100, 116, 139);
      document.setFont('helvetica', 'normal');
      document.setFontSize(7);
      document.text(
        `${companyName} - Computer-generated monthly delivery invoice`,
        16,
        pageHeight - 9,
      );
      document.text(`Page ${page} of ${pages}`, pageWidth - 16, pageHeight - 9, { align: 'right' });
    }
    document.setTextColor(35, 35, 35);
  }

  private formatDate(value: string): string {
    const dateKey = toDateKey(value);
    const [year, month, day] = dateKey.split('-');
    return year && month && day ? `${day}-${month}-${year}` : dateKey;
  }

  private currency(value: number): string {
    return `Rs. ${(Number(value) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}
