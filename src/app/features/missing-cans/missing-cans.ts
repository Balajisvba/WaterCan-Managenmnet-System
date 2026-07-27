import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BusinessStateService } from '../../services/business-state.service';
import { MissingCanService } from '../../services/missing-can.service';
import { ExcelService } from '../../services/excel.service';
import { NotificationService } from '../../services/notification.service';
import { SearchBoxComponent } from '../../shared/components/search-box/search-box';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table';
import { MissingCanDialogComponent } from '../../shared/components/dialogs/missing-can-dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';
import { CardComponent } from '../../shared/components/card/card';
import { MissingCan } from '../../models/app.models';

@Component({
  selector: 'app-missing-cans',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    SearchBoxComponent,
    DataTableComponent,
    CardComponent,
  ],
  templateUrl: './missing-cans.html',
  styleUrl: './missing-cans.css',
})
export class MissingCansComponent {
  private readonly stateService = inject(BusinessStateService);
  private readonly missingCanService = inject(MissingCanService);
  private readonly excelService = inject(ExcelService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly searchTerm = signal<string>('');
  readonly missingCans = this.missingCanService.missingCans;

  readonly filteredMissingCans = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.missingCans();
    return this.missingCans().filter(
      (m) =>
        m.customerName.toLowerCase().includes(term) ||
        m.status.toLowerCase().includes(term) ||
        m.id.toLowerCase().includes(term)
    );
  });

  readonly totalLossAmount = computed(() =>
    this.missingCans().reduce((sum, m) => sum + (Number(m.lossAmount) || 0), 0)
  );

  readonly totalLostCansCount = computed(() =>
    this.missingCans().reduce((sum, m) => sum + (Number(m.lostQuantity) || 0), 0)
  );

  readonly columns: TableColumn[] = [
    { key: 'id', label: 'Record ID' },
    { key: 'customerName', label: 'Customer' },
    { key: 'missingQuantity', label: 'Missing Qty', type: 'number' },
    { key: 'recoveredQuantity', label: 'Recovered Qty', type: 'number' },
    { key: 'lostQuantity', label: 'Lost Cans', type: 'number' },
    { key: 'costPerCan', label: 'Cost / Can', type: 'currency' },
    { key: 'lossAmount', label: 'Loss Amount', type: 'currency' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'actions', label: 'Actions', type: 'actions' },
  ];

  openAddDialog(): void {
    const dialogRef = this.dialog.open(MissingCanDialogComponent, {
      width: '600px',
      data: { customers: this.stateService.customers() },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.missingCanService.add(result);
        this.notification.success('Missing can record created');
      }
    });
  }

  openEditDialog(entry: MissingCan): void {
    const dialogRef = this.dialog.open(MissingCanDialogComponent, {
      width: '600px',
      data: {
        entry,
        customers: this.stateService.customers(),
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.missingCanService.update(result);
        this.notification.success('Missing can record updated');
      }
    });
  }

  confirmDelete(entry: MissingCan): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Missing Can Record',
        message: `Are you sure you want to delete record ${entry.id} for ${entry.customerName}?`,
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.missingCanService.remove(entry.id);
        this.notification.success('Record deleted successfully');
      }
    });
  }

  exportExcel(): void {
    this.excelService.exportToCsv(this.missingCans(), 'aqua-missing-cans');
    this.notification.success('Missing cans log exported');
  }
}
