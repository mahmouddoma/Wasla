import { SupportedLang, TRANSLATIONS } from './translations';

/** Presentation labels only; authorization always uses the original permission code. */
export function permissionLabel(code: string, language: SupportedLang, fallback?: string): string {
  return (
    TRANSLATIONS[`permissions.label.${code}`]?.[language] ||
    fallback ||
    TRANSLATIONS['permissions.unlisted'][language]
  );
}

export function permissionGroupLabel(group: string, language: SupportedLang): string {
  return (
    TRANSLATIONS[`permissions.group.${group}`]?.[language] ||
    TRANSLATIONS['permissions.otherGroup'][language]
  );
}

export function permissionMatches(code: string, query: string): boolean {
  const group = code.split('.')[0];
  return [
    code,
    permissionLabel(code, 'ar'),
    permissionLabel(code, 'en'),
    permissionGroupLabel(group, 'ar'),
    permissionGroupLabel(group, 'en'),
  ].some((label) => label.toLowerCase().includes(query.trim().toLowerCase()));
}
