import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { InventoryService } from '../../services/inventory.service';
import { SettingsService } from '../../services/settings.service';
import { NotificationService } from '../../services/notification.service';
import { StockDialogComponent } from '../../shared/components/dialogs/stock-dialog';
import { toDateKey } from '../../utils/date-utils';

@Component({ selector: 'app-inventory', standalone: true, imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatFormFieldModule, MatInputModule], templateUrl: './inventory.html', styleUrl: './inventory.css' })
export class InventoryComponent {
  private readonly inventoryService = inject(InventoryService);
  private readonly settingsService = inject(SettingsService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  readonly transactions = this.inventoryService.transactions;
  readonly currentStock = this.inventoryService.currentStock;
  readonly threshold = signal(this.settingsService.settings().lowStockThreshold ?? 15);
  readonly isLowStock = computed(() => this.currentStock() <= this.threshold());
  readonly monthStats = computed(() => {
    const prefix = toDateKey(new Date()).slice(0, 7);
    const rows = this.transactions().filter((item) => item.transactionDate.startsWith(prefix));
    return { received: rows.reduce((sum, item) => sum + item.stockIn, 0), delivered: rows.filter((item) => item.type === 'Delivery').reduce((sum, item) => sum + item.stockOut, 0), returned: rows.filter((item) => item.type === 'Delivery' || item.type === 'Return').reduce((sum, item) => sum + item.stockIn, 0) };
  });

  constructor() { this.threshold.set(this.settingsService.settings().lowStockThreshold ?? 15); }

  openAddStock(): void {
    const ref = this.dialog.open(StockDialogComponent, { width: '600px', data: { defaultDate: toDateKey(new Date()) } });
    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try { await this.inventoryService.addStock(Number(result.quantity), result.date, result.description || 'New load arrival', result.referenceId); this.notification.success('Stock added successfully'); }
      catch (error) { this.notification.error(error instanceof Error ? error.message : 'Unable to add stock'); }
    });
  }

  async saveThreshold(): Promise<void> {
    const value = Math.max(0, Math.floor(this.threshold()));
    const current = this.settingsService.settings();
    try { await this.settingsService.save({ ...current, lowStockThreshold: value }); this.notification.success('Low-stock threshold saved'); }
    catch { this.notification.error('Unable to save low-stock threshold'); }
  }
}
