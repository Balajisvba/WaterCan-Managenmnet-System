export function toLocalDateInputValue(date: Date | string | null | undefined): string {
  if (!date) {
    return '';
  }

  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    return '';
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Returns the date portion stored by the application without parsing a
 * YYYY-MM-DD value as UTC. This keeps business dates stable for every locale.
 */
export function toDateKey(value: string | Date | null | undefined): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  return toLocalDateInputValue(value);
}

export function isDateInRange(value: string | undefined, start: string, end: string): boolean {
  if (!value) {
    return false;
  }

  const dateValue = toDateKey(value);
  if (start && dateValue < start) {
    return false;
  }

  if (end && dateValue > end) {
    return false;
  }

  return true;
}
