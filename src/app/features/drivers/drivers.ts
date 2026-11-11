import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DriverService } from '../../services/driver.service';
import { NotificationService } from '../../services/notification.service';
import { DriverDialogComponent } from '../../shared/components/dialogs/driver-dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';
import { Driver } from '../../models/app.models';

@Component({ selector: 'app-drivers', standalone: true, imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule], templateUrl: './drivers.html', styleUrl: './drivers.css' })
export class DriversComponent {
  private readonly driverService = inject(DriverService); private readonly dialog = inject(MatDialog); private readonly notification = inject(NotificationService);
  readonly search = signal(''); readonly drivers = computed(() => { const term = this.search().toLowerCase().trim(); return this.driverService.driversWithCash().filter((driver) => !term || driver.name.toLowerCase().includes(term) || driver.mobile.includes(term)); });
  add(): void { this.openDialog(); }
  edit(driver: Driver): void { this.openDialog(driver); }
  private openDialog(driver?: Driver): void { const ref = this.dialog.open(DriverDialogComponent, { width: '600px', data: driver || null }); ref.afterClosed().subscribe(async (result) => { if (!result) return; try { if (driver) await this.driverService.update(result); else await this.driverService.add(result); this.notification.success(driver ? 'Driver updated' : 'Driver registered'); } catch { this.notification.error('Unable to save driver'); } }); }
  settleCash(driver: Driver): void {
    const amount = driver.cashCollected || 0;
    if (amount <= 0) {
      this.notification.success(`${driver.name} has no pending cash to hand over`);
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: { title: 'Logout Driver Cash', message: `Confirm that ${driver.name} handed over ₹${amount.toFixed(2)} to the shop owner?`, confirmText: 'Logout', color: 'primary' },
    });
    ref.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) return;
      try {
        await this.driverService.settleCash(driver.id);
        this.notification.success(`${driver.name} cash settled and balance reduced`);
      } catch {
        this.notification.error('Unable to settle driver cash');
      }
    });
  }

  remove(driver: Driver): void { const ref = this.dialog.open(ConfirmDialogComponent, { width: '400px', data: { title: 'Delete Driver', message: `Delete ${driver.name}? Existing delivery records will remain saved.` } }); ref.afterClosed().subscribe(async (confirmed) => { if (!confirmed) return; try { await this.driverService.remove(driver.id); this.notification.success('Driver deleted'); } catch { this.notification.error('Unable to delete driver'); } }); }
}
