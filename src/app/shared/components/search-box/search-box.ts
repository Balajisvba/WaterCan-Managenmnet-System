import { Component, output, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
  template: `
    <mat-form-field appearance="outline" class="search-box">
      <mat-label>{{ placeholder() }}</mat-label>
      <mat-icon matPrefix>search</mat-icon>
      <input
        matInput
        [ngModel]="searchTerm()"
        (ngModelChange)="onSearchChange($event)"
        [placeholder]="placeholder()"
      />
      @if (searchTerm()) {
        <button matSuffix mat-icon-button aria-label="Clear" (click)="clearSearch()">
          <mat-icon>close</mat-icon>
        </button>
      }
    </mat-form-field>
  `,
  styles: [`
    .search-box {
      width: 100%;
      max-width: 380px;
    }
    ::ng-deep .search-box .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }
  `],
})
export class SearchBoxComponent {
  readonly placeholder = input<string>('Search records...');
  readonly searchChange = output<string>();

  readonly searchTerm = signal<string>('');

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.searchChange.emit(value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.searchChange.emit('');
  }
}
