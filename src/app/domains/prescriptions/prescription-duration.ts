import { PrescriptionClinicalData } from './prescription.models';

type Duration = Pick<PrescriptionClinicalData, 'durationType' | 'durationValue' | 'durationUnit'>;

/** Reject ambiguous text instead of silently changing a prescribed course to one day. */
export function parsePrescriptionDuration(value: string): Duration | null {
  const text = value.trim().replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
  if (!text) return { durationType: null, durationValue: null, durationUnit: null };
  if (/^(ongoing|مستمر|مستمرة)$/i.test(text))
    return { durationType: 'Ongoing', durationValue: null, durationUnit: null };
  const match = text.match(
    /^(\d+)\s*(days?|weeks?|months?|يوم|يوما|يومًا|أيام|ايام|أسبوع|اسبوع|أسابيع|اسابيع|شهر|أشهر|اشهر|شهور)?$/i,
  );
  if (!match || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) < 1) return null;
  const unit = match[2] ?? '';
  return {
    durationType: 'Fixed',
    durationValue: Number(match[1]),
    durationUnit: /week|أسبوع|اسبوع|أسابيع|اسابيع/i.test(unit)
      ? 'Weeks'
      : /month|شهر|أشهر|اشهر|شهور/i.test(unit)
        ? 'Months'
        : 'Days',
  };
}
