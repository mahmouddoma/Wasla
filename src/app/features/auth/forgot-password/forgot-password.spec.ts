import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import { PasswordRecoverySession } from '../../../core/auth/password-recovery-session';
import { ForgotPassword } from './forgot-password';

describe('ForgotPassword',()=>{
  const api={requestPasswordReset:vi.fn(()=>of({requestId:'challenge-1',message:'Check your email'}))};
  beforeEach(()=>{vi.clearAllMocks();api.requestPasswordReset.mockReturnValue(of({requestId:'challenge-1',message:'Check your email'}));});
  async function setup(){
    TestBed.configureTestingModule({imports:[ForgotPassword],providers:[provideRouter([]),{provide:AuthApi,useValue:api}]});
    const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    const fixture=TestBed.createComponent(ForgotPassword);await fixture.whenStable();
    return {fixture,navigate,recovery:TestBed.inject(PasswordRecoverySession)};
  }
  it('renders and rejects an invalid recovery email',async()=>{
    const {fixture}=await setup();
    expect(fixture.componentInstance).toBeTruthy();
    fixture.componentInstance['model'].set({email:'invalid'});
    await fixture.componentInstance['onSubmit'](new Event('submit'));
    await fixture.whenStable();
    expect(api.requestPasswordReset).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector('.field-error')).not.toBeNull();
  });
  it('starts a new challenge and preserves the OTP destination',async()=>{
    const {fixture,navigate,recovery}=await setup();
    fixture.componentInstance['model'].set({email:'test@example.com'});
    await fixture.componentInstance['onSubmit'](new Event('submit'));
    expect(api.requestPasswordReset).toHaveBeenCalledWith({email:'test@example.com'});
    expect(recovery.challenge()).toMatchObject({email:'test@example.com',requestId:'challenge-1'});
    expect(navigate).toHaveBeenCalledWith(['/forgot-password/otp']);
  });
  it('does not create a challenge or navigate on failure',async()=>{
    const {fixture,navigate,recovery}=await setup();
    api.requestPasswordReset.mockReturnValue(throwError(()=>new Error('offline')));
    fixture.componentInstance['model'].set({email:'test@example.com'});
    await fixture.componentInstance['onSubmit'](new Event('submit'));
    expect(recovery.challenge()).toBeNull();expect(navigate).not.toHaveBeenCalled();
    expect(fixture.componentInstance['isSubmitting']()).toBe(false);
  });
});
