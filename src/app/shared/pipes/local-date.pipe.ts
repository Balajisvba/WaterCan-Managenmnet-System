import { Pipe, PipeTransform } from '@angular/core';
import { toDateKey } from '../../utils/date-utils';

@Pipe({ name: 'localDate', standalone: true })
export class LocalDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    const key = toDateKey(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      return '—';
    }

    const [year, month, day] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(year, month - 1, day));
  }
}
