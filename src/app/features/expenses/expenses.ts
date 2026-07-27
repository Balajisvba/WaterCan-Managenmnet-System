import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ExpenseService } from '../../services/expense.service';
import { ExcelService } from '../../services/excel.service';
import { NotificationService } from '../../services/notification.service';
import { SearchBoxComponent } from '../../shared/components/search-box/search-box';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table';
import { ExpenseDialogComponent } from '../../shared/components/dialogs/expense-dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';
import { CardComponent } from '../../shared/components/card/card';
import { Expense } from '../../models/app.models';

@Component({
  selector: 'app-expenses',
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
  templateUrl: './expenses.html',
  styleUrl: './expenses.css',
})
export class ExpensesComponent {
  private readonly expenseService = inject(ExpenseService);
  private readonly excelService = inject(ExcelService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly searchTerm = signal<string>('');
  readonly expenses = this.expenseService.expenses;

  readonly filteredExpenses = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.expenses();
    return this.expenses().filter(
      (e) =>
        e.category.toLowerCase().includes(term) ||
        (e.remarks && e.remarks.toLowerCase().includes(term)) ||
        e.id.toLowerCase().includes(term)
    );
  });

  readonly todayTotal = computed(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.expenses()
      .filter((e) => e.date && e.date.startsWith(todayStr))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  });

  readonly monthlyTotal = computed(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.expenses()
      .filter((e) => e.date && e.date.startsWith(prefix))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  });

  readonly columns: TableColumn[] = [
    { key: 'id', label: 'Expense ID' },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', type: 'currency' },
    { key: 'remarks', label: 'Remarks / Description' },
    { key: 'actions', label: 'Actions', type: 'actions' },
  ];

  openAddDialog(): void {
    const dialogRef = this.dialog.open(ExpenseDialogComponent, { width: '550px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.expenseService.add(result);
        this.notification.success('Expense recorded');
      }
    });
  }

  openEditDialog(expense: Expense): void {
    const dialogRef = this.dialog.open(ExpenseDialogComponent, {
      width: '550px',
      data: expense,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.expenseService.update(result);
        this.notification.success('Expense updated');
      }
    });
  }

  confirmDelete(expense: Expense): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Expense',
        message: `Are you sure you want to delete Expense ${expense.id} (${expense.category}: ₹${expense.amount})?`,
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.expenseService.remove(expense.id);
        this.notification.success('Expense record removed');
      }
    });
  }

  exportExcel(): void {
    this.excelService.exportToCsv(this.expenses(), 'aqua-expenses');
    this.notification.success('Expenses list exported');
  }
}
