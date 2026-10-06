import { PERMISSIONS } from '../auth/permissions';
import { permissionGroupLabel, permissionLabel, permissionMatches } from './permission-labels';
import { TRANSLATIONS } from './translations';

describe('Permission presentation', () => {
  it('describes every application permission in Arabic and English', () => {
    for (const code of Object.values(PERMISSIONS)) {
      const entry = TRANSLATIONS[`permissions.label.${code}`];
      expect(entry, code).toBeDefined();
      expect(entry?.ar, code).toMatch(/[\u0600-\u06ff]/);
      expect(entry?.en, code).toMatch(/[a-z]/i);
      expect(permissionLabel(code, 'ar')).not.toContain(code);
      expect(permissionLabel(code, 'en')).not.toContain(code);
    }
  });

  it('uses specific clinical actions and preserves the scope of doctor permissions', () => {
    expect(permissionLabel('PracticeTickets.CheckIn', 'ar')).toBe('تسجيل حضور المريض');
    expect(permissionLabel('PracticePayments.Refund', 'en')).toBe('Refund a patient payment');
    expect(permissionLabel('DoctorPracticeTickets.StartOwn', 'ar')).toContain('بعياداتي');
    expect(permissionLabel('DoctorPracticePayments.CorrectOwn', 'en')).toContain('at my clinics');
    expect(permissionGroupLabel('Diagnoses', 'ar')).toBe('تشخيصات المرضى');
  });

  it('searches Arabic and English labels, groups and technical codes', () => {
    expect(permissionMatches('PracticeTickets.CheckIn', 'حضور')).toBe(true);
    expect(permissionMatches('PracticeTickets.CheckIn', 'CHECK IN')).toBe(true);
    expect(permissionMatches('PracticeTickets.CheckIn', 'CheckIn')).toBe(true);
    expect(permissionMatches('PracticeTickets.CheckIn', 'دور المرضى')).toBe(true);
    expect(permissionMatches('PracticeTickets.CheckIn', 'refund')).toBe(false);
  });

  it('keeps unknown permissions explicit without inventing their meaning', () => {
    expect(permissionLabel('Unknown.Code', 'en')).toBe(
      'Additional permission without a description',
    );
    expect(permissionLabel('Unknown.Code', 'ar', 'وصف من الخادم')).toBe('وصف من الخادم');
    expect(permissionMatches('Unknown.Code', 'unknown')).toBe(true);
  });
});
