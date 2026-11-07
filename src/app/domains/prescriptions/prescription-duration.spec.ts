import { describe, expect, it } from 'vitest';
import { parsePrescriptionDuration } from './prescription-duration';

describe('Prescription duration serialization', () => {
  it('retains explicit course lengths in both supported languages', () => {
    expect(parsePrescriptionDuration('٧ أيام')).toEqual({
      durationType: 'Fixed',
      durationValue: 7,
      durationUnit: 'Days',
    });
    expect(parsePrescriptionDuration('2 weeks')).toEqual({
      durationType: 'Fixed',
      durationValue: 2,
      durationUnit: 'Weeks',
    });
    expect(parsePrescriptionDuration('3 months')).toEqual({
      durationType: 'Fixed',
      durationValue: 3,
      durationUnit: 'Months',
    });
  });
  it('preserves ongoing and unspecified durations without inventing a course length', () => {
    expect(parsePrescriptionDuration('مستمر')).toEqual({
      durationType: 'Ongoing',
      durationValue: null,
      durationUnit: null,
    });
    expect(parsePrescriptionDuration('')).toEqual({
      durationType: null,
      durationValue: null,
      durationUnit: null,
    });
  });
  it('rejects ambiguous, negative and zero courses', () => {
    for (const value of ['until review', 'after 5 days', '-2 days', '0', '2 hours'])
      expect(parsePrescriptionDuration(value)).toBeNull();
  });
});
