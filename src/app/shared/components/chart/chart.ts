import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card class="chart-card">
      <mat-card-header>
        <mat-card-title>{{ title() }}</mat-card-title>
        @if (subtitle()) {
          <mat-card-subtitle>{{ subtitle() }}</mat-card-subtitle>
        }
      </mat-card-header>
      <mat-card-content class="chart-content">
        <div class="bars-container">
          @for (item of data(); track item.label) {
            <div class="bar-column">
              <div class="bar-value">{{ item.value | number }}</div>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  [ngClass]="colorScheme()"
                  [style.height.%]="getPercentage(item.value)"
                  [title]="item.label + ': ' + item.value"
                ></div>
              </div>
              <div class="bar-label">{{ item.label }}</div>
            </div>
          } @empty {
            <div class="no-data">No trend data available</div>
          }
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .chart-card {
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
      height: 100%;
    }
    mat-card-header {
      margin-bottom: 16px;
    }
    mat-card-title {
      font-size: 1.1rem;
      font-weight: 600;
    }
    .chart-content {
      height: 220px;
      display: flex;
      align-items: flex-end;
    }
    .bars-container {
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      width: 100%;
      height: 100%;
      gap: 12px;
    }
    .bar-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      height: 100%;
    }
    .bar-value {
      font-size: 0.75rem;
      font-weight: 600;
      color: #666;
      margin-bottom: 4px;
    }
    .bar-track {
      flex: 1;
      width: 28px;
      background: #f0f4f8;
      border-radius: 6px;
      display: flex;
      align-items: flex-end;
      overflow: hidden;
    }
    .bar-fill {
      width: 100%;
      border-radius: 6px 6px 0 0;
      transition: height 0.4s ease-out;
      background: linear-gradient(180deg, #1e88e5, #1565c0);
    }
    .bar-fill.success {
      background: linear-gradient(180deg, #43a047, #2e7d32);
    }
    .bar-fill.warning {
      background: linear-gradient(180deg, #fb8c00, #ef6c00);
    }
    .bar-fill.danger {
      background: linear-gradient(180deg, #e53935, #c62828);
    }
    .bar-fill.purple {
      background: linear-gradient(180deg, #8e24aa, #6a1b9a);
    }
    .bar-label {
      font-size: 0.75rem;
      color: #777;
      margin-top: 8px;
      text-align: center;
    }
    .no-data {
      width: 100%;
      text-align: center;
      color: #999;
      margin: auto;
    }
  `],
})
export class ChartComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly data = input.required<Array<{ label: string; value: number }>>();
  readonly colorScheme = input<string>('primary');

  getPercentage(val: number): number {
    const items = this.data();
    if (!items || items.length === 0) return 0;
    const max = Math.max(...items.map((i) => i.value), 1);
    return Math.min(100, Math.max(8, (val / max) * 100));
  }
}
