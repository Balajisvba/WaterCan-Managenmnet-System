import { Component, input, output, ViewChild, AfterViewInit, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { LocalDatePipe } from '../../pipes/local-date.pipe';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'date' | 'status' | 'actions';
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    LocalDatePipe,
  ],
  template: `
    <div class="table-container mat-elevation-z1">
      <table mat-table
             [dataSource]="dataSource"
             matSort
             class="full-width-table">

        @for (col of columns(); track col.key) {
          <ng-container [matColumnDef]="col.key">

            <th mat-header-cell
                *matHeaderCellDef
                mat-sort-header>
              {{ col.label }}
            </th>

            <td mat-cell *matCellDef="let row">

              @switch (col.type) {

                @case ('currency') {
                  ₹{{ row[col.key] | number:'1.0-2' }}
                }

                @case ('date') {
                  {{ row[col.key] | localDate }}
                }

                @case ('status') {
                  <span class="status-chip"
                        [ngClass]="row[col.key]?.toLowerCase()">
                    {{ row[col.key] }}
                  </span>
                }

                @case ('actions') {
                  <div class="actions-cell">

                    @if (showView()) {
                      <button mat-icon-button color="primary"
                              [attr.aria-label]="'View ' + row['id']"
                              (click)="viewRow.emit(row)">
                        <mat-icon>visibility</mat-icon>
                      </button>
                    }

                    @if (showEdit()) {
                      <button mat-icon-button color="accent"
                              [attr.aria-label]="'Edit ' + row['id']"
                              (click)="editRow.emit(row)">
                        <mat-icon>edit</mat-icon>
                      </button>
                    }

                    @if (showPrint()) {
                      <button mat-icon-button color="primary"
                              [attr.aria-label]="'Print ' + row['id']"
                              (click)="printRow.emit(row)">
                        <mat-icon>print</mat-icon>
                      </button>
                    }

                    @if (showDelete()) {
                      <button mat-icon-button color="warn"
                              [attr.aria-label]="'Delete ' + row['id']"
                              (click)="deleteRow.emit(row)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    }

                  </div>
                }

                @default {
                  {{ row[col.key] }}
                }

              }

            </td>

          </ng-container>
        }

        <tr mat-header-row *matHeaderRowDef="columnKeys()"></tr>
        <tr mat-row *matRowDef="let row; columns: columnKeys()"></tr>

        <tr class="mat-row" *matNoDataRow>
          <td class="mat-cell empty-cell"
              [attr.colspan]="columnKeys().length">
            No records found.
          </td>
        </tr>

      </table>

      <mat-paginator
          [pageSizeOptions]="pageSizeOptions()"
          showFirstLastButtons>
      </mat-paginator>

    </div>
  `,
  styles: [`

    .table-container{
      width:100%;
      overflow-x:auto;
      overflow-y:hidden;
      border-radius:12px;
      background:var(--card-bg,#fff);
      -webkit-overflow-scrolling:touch;
    }

    .full-width-table{
      width:max-content;
      min-width:720px;
    }

    .mat-mdc-header-cell,
    .mat-mdc-cell{
      white-space:nowrap;
      padding-left:16px;
      padding-right:16px;
    }

    .actions-cell{
      display:flex;
      gap:4px;
      flex-wrap:nowrap;
    }

    .status-chip{
      padding:4px 10px;
      border-radius:12px;
      font-size:.75rem;
      font-weight:600;
      text-transform:capitalize;
      white-space:nowrap;
    }

    .status-chip.active{
      background:#e8f5e9;
      color:#2e7d32;
    }

    .status-chip.pending{
      background:#fff3e0;
      color:#ef6c00;
    }

    .status-chip.inactive{
      background:#ffebee;
      color:#c62828;
    }

    .status-chip.open{
      background:#e3f2fd;
      color:#1565c0;
    }

    .status-chip.recovered{
      background:#e8f5e9;
      color:#2e7d32;
    }

    .status-chip.closed{
      background:#eceff1;
      color:#455a64;
    }

    .empty-cell{
      text-align:center;
      padding:32px !important;
      color:#999;
    }

    /* Mobile */

    @media (max-width:768px){

      .full-width-table{
        min-width:1600px;
      }

      .mat-mdc-header-cell,
      .mat-mdc-cell{
        padding-left:12px;
        padding-right:12px;
      }

    }

    /* Scrollbar */

    .table-container::-webkit-scrollbar{
      height:10px;
    }

    .table-container::-webkit-scrollbar-thumb{
      background:#bdbdbd;
      border-radius:10px;
    }

    .table-container::-webkit-scrollbar-track{
      background:#f3f3f3;
    }

  `]
})
export class DataTableComponent<T> implements AfterViewInit {
  readonly data = input.required<T[]>();
  readonly columns = input.required<TableColumn[]>();
  readonly filter = input<string>('');

  readonly showView = input<boolean>(false);
  readonly showEdit = input<boolean>(true);
  readonly showDelete = input<boolean>(true);
  readonly showPrint = input<boolean>(false);
  readonly pageSizeOptions = input<number[]>([5, 10, 25, 50]);

  readonly editRow = output<T>();
  readonly deleteRow = output<T>();
  readonly viewRow = output<T>();
  readonly printRow = output<T>();

  readonly dataSource = new MatTableDataSource<T>([]);
  readonly columnKeys = computed(() => this.columns().map((c) => c.key));

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor() {
    effect(() => {
      this.dataSource.data = this.data();
      this.dataSource.paginator?.firstPage();
    });
    effect(() => {
      this.dataSource.filter = (this.filter() || '').trim().toLowerCase();
      this.dataSource.paginator?.firstPage();
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
}
