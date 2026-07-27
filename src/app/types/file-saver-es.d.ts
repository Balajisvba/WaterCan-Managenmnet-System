declare module 'file-saver-es' {
  export function saveAs(data: Blob | File | string, filename?: string, options?: unknown): void;
}
