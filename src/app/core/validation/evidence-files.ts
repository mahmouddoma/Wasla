const EVIDENCE_FILE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'] as const;
const ALLOWED_EVIDENCE_FILE_EXTENSIONS = new Set<string>(EVIDENCE_FILE_EXTENSIONS);

export const EVIDENCE_FILE_ACCEPT = EVIDENCE_FILE_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(',');

export function getEvidenceFileValidationError(
  files: readonly File[],
  lang: SupportedLang = 'ar',
): string | null {
  const unsupportedFile = files.find((file) => {
    const extension = file.name.trim().split('.').pop()?.toLowerCase();
    return !extension || !ALLOWED_EVIDENCE_FILE_EXTENSIONS.has(extension);
  });

  return unsupportedFile
    ? TRANSLATIONS['validation.unsupportedEvidence'][lang].replace(
        '{name}',
        () => unsupportedFile.name,
      )
    : null;
}
import { SupportedLang, TRANSLATIONS } from '../i18n/translations';
