import { routes } from './app.routes';
import { AUTH_ROUTES } from './features/auth/auth.routes';
import { FEATURE_ROUTES as practices } from './features/doctor-practices/doctor-practices.routes';
import { FEATURE_ROUTES as receptions } from './features/doctor-receptions/doctor-receptions.routes';
import { FEATURE_ROUTES as profile } from './features/doctor-profile/doctor-profile.routes';
import { FEATURE_ROUTES as onboarding } from './features/doctor-onboarding/doctor-onboarding.routes';
import { FEATURE_ROUTES as patient } from './features/patient/patient.routes';
import { FEATURE_ROUTES as reception } from './features/reception/reception.routes';
import { authenticatedGuard, permissionGuard, doctorProfileGuard, doctorOnboardingGuard, anonymousGuard, passwordChangeGuard } from './core/auth/auth.guards';
import { PERMISSIONS } from './core/auth/permissions';

describe('Feature route ownership', () => {
  it('keeps major feature boundaries lazy and preserves public URLs', () => {
    for (const prefix of ['doctor/practices','doctor/receptions','doctor/profile','doctor/onboarding','patient','reception']) {
      expect(routes.find(route=>route.path===prefix)?.loadChildren).toBeTypeOf('function');
    }
    expect(practices.map(route=>route.path)).toEqual(['','new',':practiceId']);
    expect(receptions.map(route=>route.path)).toEqual(['','new',':receptionId']);
    expect(patient.map(route=>route.path)).toEqual(['profile','family']);
    expect(reception.map(route=>route.path)).toEqual(['patients','family-requests']);
    expect(routes.at(-1)).toMatchObject({path:'**',redirectTo:'login'});
  });

  it('preserves authentication and operation-specific authorization', () => {
    for(const route of [...practices,...receptions,...patient,...reception]) {
      expect(route.canActivate).toEqual([authenticatedGuard,permissionGuard]);
      expect(route.data?.['permission']).toBeTruthy();
    }
    expect(practices.find(route=>route.path==='new')?.data?.['permission']).toBe(PERMISSIONS.doctorPracticesManageOwn);
    expect(receptions.find(route=>route.path==='new')?.data?.['permission']).toBe(PERMISSIONS.receptionUsersManageOwn);
    expect(profile[0].canActivate).toEqual([authenticatedGuard,doctorProfileGuard]);
    expect(onboarding[0].canActivate).toEqual([authenticatedGuard,doctorOnboardingGuard]);
  });

  it('keeps password-change protection and recovery route precedence', () => {
    const children=AUTH_ROUTES[0].children!;
    expect(children.find(route=>route.path==='change-password')?.canActivate).toEqual([passwordChangeGuard]);
    expect(children.find(route=>route.path==='login')?.canActivate).toEqual([anonymousGuard]);
    const paths=children.map(route=>route.path);
    expect(paths.indexOf('forgot-password/otp')).toBeLessThan(paths.indexOf('forgot-password'));
    expect(paths.indexOf('forgot-password/reset')).toBeLessThan(paths.indexOf('forgot-password'));
    expect(children.at(-1)).toMatchObject({path:'',pathMatch:'full',redirectTo:'login'});
  });
});
