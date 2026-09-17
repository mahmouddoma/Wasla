import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import { PasswordRecoverySession } from '../../../core/auth/password-recovery-session';
import { OtpHandoff } from './otp-handoff';

describe('OtpHandoff',()=>{
  const api={verifyPasswordResetOtp:vi.fn(()=>of({requestId:'challenge-1',resetToken:'reset-token',expiresOnUtc:new Date(Date.now()+3600000).toISOString()})),requestPasswordReset:vi.fn(()=>of({requestId:'challenge-2',message:null}))};
  beforeEach(()=>vi.clearAllMocks());
  async function setup(challenge=true){
    TestBed.configureTestingModule({imports:[OtpHandoff],providers:[provideRouter([]),{provide:AuthApi,useValue:api}]});
    const recovery=TestBed.inject(PasswordRecoverySession);
    if(challenge)recovery.begin('test@example.com',{requestId:'challenge-1',message:null});
    const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    const fixture=TestBed.createComponent(OtpHandoff);await fixture.whenStable();
    return {fixture,recovery,navigate};
  }
  it('redirects when opened without a challenge',async()=>{
    const {fixture,navigate}=await setup(false);
    expect(fixture.componentInstance).toBeTruthy();
    expect(navigate).toHaveBeenCalledWith(['/forgot-password'],{replaceUrl:true});
  });
  it('rejects malformed OTPs and respects the resend cooldown',async()=>{
    const {fixture}=await setup();
    fixture.componentInstance['model'].set({otp:'12'});
    await fixture.componentInstance['onSubmit'](new Event('submit'));
    await fixture.componentInstance['resend']();
    expect(api.verifyPasswordResetOtp).not.toHaveBeenCalled();
    expect(api.requestPasswordReset).not.toHaveBeenCalled();
    expect(fixture.componentInstance['resendCooldown']()).toBeGreaterThan(0);
  });
  it('accepts a valid matching grant and navigates to reset',async()=>{
    const {fixture,recovery,navigate}=await setup();
    fixture.componentInstance['model'].set({otp:'123456'});
    await fixture.componentInstance['onSubmit'](new Event('submit'));
    expect(api.verifyPasswordResetOtp).toHaveBeenCalledWith({requestId:'challenge-1',otp:'123456'});
    expect(recovery.validGrant()?.resetToken).toBe('reset-token');
    expect(navigate).toHaveBeenCalledWith(['/forgot-password/reset'],{replaceUrl:true});
  });
  it('rejects a grant for a different challenge',async()=>{
    const {fixture,recovery,navigate}=await setup();
    api.verifyPasswordResetOtp.mockReturnValueOnce(of({requestId:'other',resetToken:'reset-token',expiresOnUtc:new Date(Date.now()+3600000).toISOString()}));
    fixture.componentInstance['model'].set({otp:'123456'});
    await fixture.componentInstance['onSubmit'](new Event('submit'));
    expect(recovery.validGrant()).toBeNull();expect(navigate).not.toHaveBeenCalled();
    expect(fixture.componentInstance['challengeUnavailable']()).toBe(true);
  });
});
