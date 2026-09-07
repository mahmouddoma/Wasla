import { HttpErrorResponse } from '@angular/common/http';
import { ApiProblemDetails } from './auth.models';

export interface ParsedApiErrors {
  messages: string[];
  fields: Readonly<Record<string, string[]>>;
}

export function parseApiErrors(error: unknown): ParsedApiErrors {
  if (!(error instanceof HttpErrorResponse))
    return { messages: ['تعذر إكمال الطلب. حاول مرة أخرى.'], fields: {} };
  const problem = isProblemDetails(error.error) ? error.error : undefined;
  const fields: Record<string, string[]> = {};
  const messages: string[] = [];
  for (const item of problem?.errors ?? []) {
    if (!item.message) continue;
    if (item.source) {
      const source = item.source.split('.').at(-1)?.toLowerCase() ?? item.source.toLowerCase();
      fields[source] = [...(fields[source] ?? []), item.message];
    } else messages.push(item.message);
  }
  if (!messages.length && !Object.keys(fields).length) {
    messages.push(problem?.detail || problem?.title || connectionMessage(error.status));
  }
  return { messages, fields };
}

function isProblemDetails(value: unknown): value is ApiProblemDetails {
  return typeof value === 'object' && value !== null;
}
function connectionMessage(status: number): string {
  if (status === 0) return 'تعذر الاتصال بالخدمة. تحقق من الشبكة ثم حاول مرة أخرى.';
  if (status === 429) return 'تم إرسال محاولات كثيرة. انتظر قليلًا قبل المحاولة مرة أخرى.';
  return 'تعذر إكمال الطلب. حاول مرة أخرى.';
}
