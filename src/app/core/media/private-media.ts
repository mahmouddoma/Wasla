import { HttpResponse } from '@angular/common/http';

export function openPrivateMedia(response: HttpResponse<Blob>): void {
  if (!response.body) return;
  const url = URL.createObjectURL(response.body);
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  if (!popup) downloadPrivateMedia(response, url);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function downloadPrivateMedia(response: HttpResponse<Blob>, url: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName(response.headers.get('content-disposition'));
  anchor.click();
}

function fileName(disposition: string | null): string {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? 'document';
}
