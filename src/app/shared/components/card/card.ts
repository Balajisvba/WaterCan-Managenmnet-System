import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <mat-card class="kpi-card" [ngClass]="colorClass()">
      <mat-card-content class="kpi-content">
        <div class="kpi-info">
          <div class="kpi-title">{{ title() }}</div>
          <div class="kpi-value">{{ value() }}</div>
          @if (subtitle()) {
            <div class="kpi-subtitle">{{ subtitle() }}</div>
          }
        </div>
        @if (icon()) {
          <div class="kpi-icon-container">
            <mat-icon>{{ icon() }}</mat-icon>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .kpi-card {
      border-radius: 12px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      background: var(--card-bg, #ffffff);
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
    }
    .kpi-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    }
    .kpi-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
    }
    .kpi-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: #6c757d;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .kpi-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #212529;
      line-height: 1.2;
    }
    .kpi-subtitle {
      font-size: 0.75rem;
      color: #95a5a6;
      margin-top: 4px;
    }
    .kpi-icon-container {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(30, 136, 229, 0.1);
      color: #1e88e5;
    }
    .kpi-icon-container mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    .primary .kpi-icon-container { background: rgba(30, 136, 229, 0.12); color: #1e88e5; }
    .success .kpi-icon-container { background: rgba(46, 125, 50, 0.12); color: #2e7d32; }
    .warning .kpi-icon-container { background: rgba(245, 124, 0, 0.12); color: #f57c00; }
    .danger .kpi-icon-container { background: rgba(211, 47, 47, 0.12); color: #d32f2f; }
    .purple .kpi-icon-container { background: rgba(123, 31, 162, 0.12); color: #7b1fa2; }
  `],
})
export class CardComponent {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input<string>('');
  readonly subtitle = input<string>('');
  readonly colorClass = input<string>('primary');
}
