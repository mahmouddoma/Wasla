import { Pipe, PipeTransform } from '@angular/core';
import { SupportedLang } from '../../core/i18n/translations';
@Pipe({ name: 'localizedDate' })
export class LocalizedDatePipe implements PipeTransform {
  transform(value: string | null | undefined, language: SupportedLang): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '—'
      : new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(date);
  }
}
