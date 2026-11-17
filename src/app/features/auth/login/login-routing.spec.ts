import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { AuthSession } from '../../../core/auth/auth-session';
import { SubscriptionsApi, SubscriptionState } from '../../../domains/subscriptions';
import { filter, firstValueFrom, throwError } from 'rxjs';
import { subscriptionStateStub } from '../../../../testing/subscriptions';
import { AUTH_ROUTES } from '../auth.routes';
import { Login } from './login';

@Component({ template: '' })
class Workspace {}

describe('authentication mode routing', () => {
  let authenticated = false;
  const session = {
    user: () => authenticated ? { userType: 'Patient' } : null,
    isAuthenticated: () => authenticated,
    requiresPasswordChange: () => false,
    destinationFor: () => '/workspace',
  };
  beforeEach(() => {
    authenticated = false;
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(),
      provideRouter([...AUTH_ROUTES[0].children!, { path: 'workspace', component: Workspace }]),
      provideLocationMocks(),
      { provide: AuthSession, useValue: session },
      { provide: SubscriptionState, useValue: subscriptionStateStub() },
      { provide: SubscriptionsApi, useValue: { catalog: () => throwError(() => new Error('Offline')) } },
    ] });
  });

  it('keeps URL, route data, rendered mode and history aligned through every mode', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    router.setUpLocationChangeListener();
    const location = TestBed.inject(Location);
    let page = await harness.navigateByUrl('/login?returnUrl=%2Fdoctors&identifier=test', Login);
    page.setMode('patient');
    await harness.fixture.whenStable();
    page = harness.routeDebugElement!.componentInstance as Login;
    expect(router.url).toBe('/register/patient?returnUrl=%2Fdoctors&identifier=test');
    expect(page.activeMode()).toBe('patient');
    expect(router.routerState.snapshot.root.firstChild?.data['initialMode']).toBe('patient');
    expect(harness.routeNativeElement?.querySelector('app-patient-registration')).not.toBeNull();
    page.setMode('doctor');
    await harness.fixture.whenStable();
    expect((harness.routeDebugElement!.componentInstance as Login).activeMode()).toBe('doctor');
    const back = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
    location.back();
    await back;
    await harness.fixture.whenStable();
    expect(router.url).toContain('/register/patient');
    const forward = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
    location.forward();
    await forward;
    await harness.fixture.whenStable();
    expect(router.url).toContain('/register/doctor');
    page = harness.routeDebugElement!.componentInstance as Login;
    page.setMode('login');
    await harness.fixture.whenStable();
    expect(router.url).toBe('/login?returnUrl=%2Fdoctors&identifier=test');
    expect((harness.routeDebugElement!.componentInstance as Login).activeMode()).toBe('login');
  });

  it.each(['/login', '/register/patient', '/register/doctor'])(
    'runs the anonymous guard for direct access to %s', async (url) => {
      authenticated = true;
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(url, Workspace);
      expect(TestBed.inject(Router).url).toBe('/workspace');
    },
  );

  it('rechecks the guard on a tab switch and does not optimistically display registration', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/login', Login);
    authenticated = true;
    page.setMode('patient');
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/workspace');
    expect(page.activeMode()).toBe('login');
  });
});
