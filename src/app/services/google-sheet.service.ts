import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal, effect } from '@angular/core';
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
  readonly isOnline = signal(true);

  constructor() {
    effect(() => {
      if (!environment.autoRefreshInterval) return;
      timer(environment.autoRefreshInterval, environment.autoRefreshInterval).subscribe(() => {
        this.ping().catch(() => null);
      });
    });
  }

  private get baseUrl(): string {
    return `https://sheets.googleapis.com/v4/spreadsheets/${environment.spreadsheetId}`;
  }

  private log(message: string, payload?: unknown): void {
    console.log(`[GoogleSheetService] ${message}`, payload ?? '');
  }

  private logError(message: string, error: unknown): void {
    console.error(`[GoogleSheetService] ${message}`, error);
  }

  private async request<T>(url: string, method: 'GET' | 'POST' | 'PUT', body?: unknown): Promise<T> {
    const token = this.authService.getAccessToken();
    if (!token) {
      this.logError('Auth token missing before request', { url, method });
      throw new Error('User is not authenticated');
    }

    this.log('Request', { url, method, body, accessToken: token.slice(0, 20) + '...', spreadsheetId: environment.spreadsheetId });

    try {
      const response = await firstValueFrom(
        this.http.request<T>(method, url, {
          body,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': environment.googleApiKey,
          },
        }).pipe(
          retry({ count: 2, delay: () => timer(500) }),
          catchError((error) => this.handleError(error))
        )
      );
      this.isOnline.set(true);
      this.log('Response', { url, method, response });
      return response;
    } catch (error) {
      this.isOnline.set(false);
      this.logError('Request failed', { url, method, error });
      throw error;
    }
  }

  private handleError(error: HttpErrorResponse | unknown) {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    if (status === 401 || status === 403) {
      this.authService.logout();
    }
    if ([429, 500].includes(status)) {
      this.isOnline.set(false);
    }
    const message = error instanceof HttpErrorResponse ? `${error.status} ${error.statusText}` : 'Unknown error';
    this.logError('HTTP error', { status, message, error });
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
    this.log('Reading header row', { sheet, range: '1:1' });
    const response = await this.request<{ values?: unknown[][] }>(url, 'GET');
    const headers = (response.values?.[0] ?? []).map((header) => String(header));
    this.log('Header row result', { sheet, headers });
    return headers;
  }

  private getRecordHeaders(record: Record<string, unknown>): string[] {
    const headers = Object.keys(record).filter((key) => key !== 'id');
    return ['id', ...headers];
  }

  private async ensureSheetAndHeaders(sheet: string, record: Record<string, unknown>): Promise<string[]> {
    try {
      const headers = await this.getSheetHeaders(sheet);
      if (headers.length > 0) {
        return headers;
      }
    } catch {
      // fall through to create the sheet
    }

    const headers = this.getRecordHeaders(record);
    const sheetExists = await this.sheetExists(sheet);
    if (!sheetExists) {
      this.log('Creating sheet', { sheet });
      await this.request(`${this.baseUrl}:batchUpdate`, 'POST', {
        requests: [{ addSheet: { properties: { title: sheet } } }],
      });
    }

    const lastColumn = this.toA1ColumnLabel(headers.length);
    const range = `${sheet}!A1:${lastColumn}1`;
    this.log('Writing header row', { sheet, range, headers });
    await this.request(`${this.baseUrl}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, 'PUT', {
      values: [headers],
    });
    return headers;
  }

  private async sheetExists(sheet: string): Promise<boolean> {
    try {
      const response = await this.request<{ sheets?: Array<{ properties?: { title?: string } }> }>(this.baseUrl, 'GET');
      return response.sheets?.some((item) => item.properties?.title === sheet) ?? false;
    } catch {
      return false;
    }
  }

  async readSheet<T extends SheetRecord>(sheet: string): Promise<T[]> {
    const url = `${this.baseUrl}/values/${encodeURIComponent(sheet)}?valueRenderOption=UNFORMATTED_VALUE`;
    this.log('Reading sheet values', { sheet, url });
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
    this.log('Sheet rows loaded', { sheet, rowCount: rows.length });
    return rows;
  }

  async appendRow<T extends SheetRecord>(sheet: string, record: T): Promise<T> {
    const headers = await this.ensureSheetAndHeaders(sheet, record as Record<string, unknown>);
    const recordMap = record as Record<string, unknown>;
    const values = [headers.map((header) => recordMap[header] ?? '')];
    const url = `${this.baseUrl}/values/${encodeURIComponent(sheet)}:append?valueInputOption=USER_ENTERED`;
    this.log('Appending row', { sheet, headers, values, range: `${sheet}:append` });
    await this.request(url, 'POST', { values });
    return record;
  }

  async updateRow<T extends SheetRecord>(sheet: string, record: T): Promise<T> {
    const all = await this.readSheet<T>(sheet);
    const rowIndex = all.findIndex((row) => row.id === record.id);
    if (rowIndex === -1) {
      throw new Error('Record not found');
    }

    const headers = await this.getSheetHeaders(sheet);
    const recordMap = record as Record<string, unknown>;
    const values = [headers.map((header) => recordMap[header] ?? '')];
    const lastColumn = this.toA1ColumnLabel(headers.length);
    const range = `${sheet}!A${rowIndex + 2}:${lastColumn}${rowIndex + 2}`;
    this.log('Updating row', { sheet, range, headers, values, recordId: record.id });
    await this.request(`${this.baseUrl}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, 'PUT', { values });
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
    const dataRange = `${sheet}!A${rowIndex + 2}:${lastColumn}${rowIndex + 2}`;
    const sheetId = await this.getSheetId(sheet);
    this.log('Deleting row', { sheet, sheetId, rowIndex, id, dataRange });

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
    } catch (error) {
      this.log('Batch delete failed, clearing row instead', { sheet, dataRange, error });
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
}
