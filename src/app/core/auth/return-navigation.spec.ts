import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authenticatedGuard } from './auth.guards';
import { AuthSession } from './auth-session';
import { resolveReturnUrl } from './return-navigation';

describe('Return navigation policy', () => {
  it.each([
    ['/doctors', 'Patient'], ['/doctors/doctor-1?cityId=2&search=Ahmed', 'Patient'],
    ['/patient/reservations?practiceId=clinic', 'Patient'], ['/patient/medical-record', 'Patient'],
    ['/doctor/queue?practiceId=clinic', 'Doctor'], ['/doctor/patients/p1', 'Doctor'],
    ['/reception/reservations?view=Archived', 'Reception'], ['/admin/reservations', 'SuperAdmin'],
  ] as const)('preserves safe %s for %s', (url, actor) => expect(resolveReturnUrl(url, actor)).toBe(url));

  it.each([
    null, '', 'https://example.invalid/doctors', '//example.invalid/doctors', 'javascript:alert(1)',
    '/\\example.invalid', '/%2fexample.invalid', '/%252fexample.invalid', '/doctors%2fdoctor-1',
    '/doctor/../doctors', '/doctors//doctor-1', '/doctors;outlet=login', '/doctors\n',
    '/login', '/logout', '/change-password', '/doctor/onboarding', '/missing', '/doctors#login',
  ])('rejects unsafe, unsupported or looping destination %j', url => expect(resolveReturnUrl(url)).toBeNull());

  it('restricts discovery to the patient actor and rejects another actor workspace', () => {
    expect(resolveReturnUrl('/doctors', 'Doctor')).toBeNull();
    expect(resolveReturnUrl('/doctor/queue', 'Patient')).toBeNull();
    expect(resolveReturnUrl('/admin/reservations', 'Reception')).toBeNull();
  });

  it('retains localized search while dropping unsupported and sensitive query parameters', () => {
    const result = resolveReturnUrl('/doctors?search=%D8%A3%D8%AD%D9%85%D8%AF&token=secret&patientId=p1&returnUrl=%2Flogin', 'Patient');
    const params = new URLSearchParams(result!.split('?')[1]);
    expect(params.get('search')).toBe('أحمد');
    expect([...params.keys()]).toEqual(['search']);
    expect(resolveReturnUrl('/doctors?search=a&search=b', 'Patient')).toBeNull();
  });

  it('preserves the safe original destination in the generic authentication guard', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthSession, useValue: { isAuthenticated: () => false, clear: vi.fn() } }] });
    const result = TestBed.runInInjectionContext(() => authenticatedGuard({} as ActivatedRouteSnapshot, { url: '/doctor/queue?practiceId=clinic' } as RouterStateSnapshot)) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Fdoctor%2Fqueue%3FpracticeId%3Dclinic');
  });
});
