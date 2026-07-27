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

export function isDateInRange(value: string | undefined, start: string, end: string): boolean {
  if (!value) {
    return false;
  }

  const dateValue = value.slice(0, 10);
  if (start && dateValue < start) {
    return false;
  }

  if (end && dateValue > end) {
    return false;
  }

  return true;
}
