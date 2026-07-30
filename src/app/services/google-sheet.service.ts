import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, firstValueFrom, retry, throwError, timer } from 'rxjs';
import { environment } from '../../environments/environment';
import { GoogleAuthService } from './google-auth.service';

export interface SheetRecord {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleSheetService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(GoogleAuthService);
  readonly isOnline = signal(false);

  private get baseUrl(): string {
    return `https://sheets.googleapis.com/v4/spreadsheets/${environment.spreadsheetId}`;
  }

  private async request<T>(url: string, method: 'GET' | 'POST' | 'PUT', body?: unknown): Promise<T> {
    const token = this.authService.getAccessToken();
    if (!token) {
      throw new Error('User is not authenticated');
    }

    try {
      const response = await firstValueFrom(
        this.http.request<T>(method, url, {
          body,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).pipe(
          retry({
            count: 2,
            delay: (error) => (this.isTransientError(error) ? timer(500) : throwError(() => error)),
          }),
          catchError((error) => this.handleError(error))
        )
      );
      this.isOnline.set(true);
      return response;
    } catch (error) {
      this.isOnline.set(false);
      throw error;
    }
  }

  private isTransientError(error: unknown): boolean {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    return status === 0 || status === 408 || status === 429 || status >= 500;
  }

  private handleError(error: HttpErrorResponse | unknown) {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    if (status === 401 || status === 403) {
      this.authService.logout();
    }
    if (this.isTransientError(error)) {
      this.isOnline.set(false);
    }
    const message = error instanceof HttpErrorResponse ? `${error.status} ${error.statusText}` : 'Unknown error';
    return throwError(() => new Error(message));
  }

  async ping(): Promise<boolean> {
    try {
      const response = await this.request<{ spreadsheetId: string }>(`${this.baseUrl}?fields=spreadsheetId`, 'GET');
      return !!response?.spreadsheetId;
    } catch {
      this.isOnline.set(false);
      return false;
    }
  }

  private toA1ColumnLabel(index: number): string {
    let label = '';
    while (index > 0) {
      const remainder = (index - 1) % 26;
      label = String.fromCharCode(65 + remainder) + label;
      index = Math.floor((index - 1) / 26);
    }
    return label;
  }

  private isBlankRow(row: unknown[]): boolean {
    return row.every((value) => value === undefined || value === null || String(value).trim() === '');
  }

  private async getSheetHeaders(sheet: string): Promise<string[]> {
    const url = `${this.baseUrl}/values/${encodeURIComponent(sheet)}!1:1`;
    const response = await this.request<{ values?: unknown[][] }>(url, 'GET');
    return (response.values?.[0] ?? []).map((header) => String(header).trim()).filter(Boolean);
  }

  private getRecordHeaders(record: Record<string, unknown>): string[] {
    const headers = Object.keys(record).filter((key) => key !== 'id');
    return ['id', ...headers];
  }

  private async ensureSheetAndHeaders(sheet: string, record: Record<string, unknown>): Promise<string[]> {
    const requestedHeaders = this.getRecordHeaders(record);
    try {
      const headers = await this.getSheetHeaders(sheet);
      if (headers.length > 0) {
        const missingHeaders = requestedHeaders.filter((header) => !headers.includes(header));
        if (missingHeaders.length === 0) {
          return headers;
        }

        const expandedHeaders = [...headers, ...missingHeaders];
        const lastColumn = this.toA1ColumnLabel(expandedHeaders.length);
        const range = `${sheet}!A1:${lastColumn}1`;
        await this.request(`${this.baseUrl}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, 'PUT', {
          values: [expandedHeaders],
        });
        return expandedHeaders;
      }
    } catch {
      // The sheet may not exist yet. The metadata check below distinguishes
      // that case from a missing header row.
    }

    const headers = requestedHeaders;
    const sheetExists = await this.sheetExists(sheet);
    if (!sheetExists) {
      await this.request(`${this.baseUrl}:batchUpdate`, 'POST', {
        requests: [{ addSheet: { properties: { title: sheet } } }],
      });
    }

    const lastColumn = this.toA1ColumnLabel(headers.length);
    const range = `${sheet}!A1:${lastColumn}1`;
    await this.request(`${this.baseUrl}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, 'PUT', {
      values: [headers],
    });
    return headers;
  }

  private async sheetExists(sheet: string): Promise<boolean> {
    try {
      const response = await this.request<{ sheets?: Array<{ properties?: { title?: string } }> }>(`${this.baseUrl}?fields=sheets.properties.title`, 'GET');
      return response.sheets?.some((item) => item.properties?.title === sheet) ?? false;
    } catch {
      return false;
    }
  }

  async readSheet<T extends SheetRecord>(sheet: string): Promise<T[]> {
    const url = `${this.baseUrl}/values/${encodeURIComponent(sheet)}?valueRenderOption=UNFORMATTED_VALUE`;
    const response = await this.request<{ values?: unknown[][] }>(url, 'GET');
    const values = response.values || [];
    if (values.length <= 1) return [];

    const headers = values[0].map(String);
    const rows = values
      .slice(1)
      .filter((row) => !this.isBlankRow(row))
      .map((row) => {
        const record: Record<string, unknown> = {};
        headers.forEach((header, idx) => {
          record[header] = row[idx] ?? null;
        });
        return record as T;
      });
    return rows;
  }

  async appendRow<T extends SheetRecord>(sheet: string, record: T): Promise<T> {
    const headers = await this.ensureSheetAndHeaders(sheet, record as Record<string, unknown>);
    const recordMap = record as Record<string, unknown>;
    const values = [headers.map((header) => recordMap[header] ?? '')];
    const url = `${this.baseUrl}/values/${encodeURIComponent(sheet)}:append?valueInputOption=RAW`;
    await this.request(url, 'POST', { values });
    return record;
  }

  async updateRow<T extends SheetRecord>(sheet: string, record: T): Promise<T> {
    const all = await this.readSheet<T>(sheet);
    const rowIndex = all.findIndex((row) => row.id === record.id);
    if (rowIndex === -1) {
      throw new Error('Record not found');
    }

    const headers = await this.ensureSheetAndHeaders(sheet, record as Record<string, unknown>);
    const recordMap = record as Record<string, unknown>;
    const values = [headers.map((header) => recordMap[header] ?? '')];
    const lastColumn = this.toA1ColumnLabel(headers.length);
    const range = `${sheet}!A${rowIndex + 2}:${lastColumn}${rowIndex + 2}`;
    await this.request(`${this.baseUrl}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, 'PUT', { values });
    return record;
  }

  async deleteRow(sheet: string, id: string): Promise<void> {
    const all = await this.readSheet<SheetRecord>(sheet);
    const rowIndex = all.findIndex((row) => row.id === id);
    if (rowIndex === -1) {
      return;
    }

    const headers = await this.getSheetHeaders(sheet);
    const lastColumn = this.toA1ColumnLabel(headers.length);
    const sheetId = await this.getSheetId(sheet);

    try {
      await this.request(`${this.baseUrl}:batchUpdate`, 'POST', {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex + 1,
                endIndex: rowIndex + 2,
              },
            },
          },
        ],
      });
    } catch {
      const dataRange = `${sheet}!A${rowIndex + 2}:${lastColumn}${rowIndex + 2}`;
      await this.request(`${this.baseUrl}/values/${encodeURIComponent(dataRange)}:clear`, 'POST', {});
    }
  }

  private async getSheetId(sheetName: string): Promise<number> {
    const response = await this.request<{ sheets: Array<{ properties: { sheetId: number; title: string } }> }>(this.baseUrl, 'GET');
    const sheet = response.sheets?.find((s) => s.properties.title === sheetName);
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }
    return sheet.properties.sheetId;
  }

  async read<T extends SheetRecord>(sheet: string): Promise<T[]> {
    return this.readSheet<T>(sheet);
  }

  async create<T extends SheetRecord>(sheet: string, record: T): Promise<T> {
    await this.appendRow(sheet, record);
    return record;
  }

  async update<T extends SheetRecord>(sheet: string, record: T): Promise<T> {
    await this.updateRow(sheet, record);
    return record;
  }

  async delete(sheet: string, id: string): Promise<void> {
    return this.deleteRow(sheet, id);
  }

  /** Replaces one complete sheet after an explicit user-authorised restore. */
  async replaceSheet<T extends SheetRecord>(sheet: string, records: T[]): Promise<void> {
    const fallbackRecord: Record<string, unknown> = { id: '' };
    const headers = await this.ensureSheetAndHeaders(sheet, (records[0] as Record<string, unknown> | undefined) ?? fallbackRecord);
    const additionalHeaders = records.flatMap((record) => this.getRecordHeaders(record as Record<string, unknown>));
    const completeHeaders = [...headers, ...additionalHeaders.filter((header, index) => !headers.includes(header) && additionalHeaders.indexOf(header) === index)];

    if (completeHeaders.length !== headers.length) {
      const headerRange = `${sheet}!A1:${this.toA1ColumnLabel(completeHeaders.length)}1`;
      await this.request(`${this.baseUrl}/values/${encodeURIComponent(headerRange)}?valueInputOption=RAW`, 'PUT', {
        values: [completeHeaders],
      });
    }

    await this.request(`${this.baseUrl}/values/${encodeURIComponent(sheet)}:clear`, 'POST', {});
    const targetHeaders = completeHeaders;
    const targetRange = `${sheet}!A1:${this.toA1ColumnLabel(targetHeaders.length)}${Math.max(1, records.length + 1)}`;
    const values = [targetHeaders, ...records.map((record) => targetHeaders.map((header) => (record as Record<string, unknown>)[header] ?? ''))];
    await this.request(`${this.baseUrl}/values/${encodeURIComponent(targetRange)}?valueInputOption=RAW`, 'PUT', { values });
  }
}
