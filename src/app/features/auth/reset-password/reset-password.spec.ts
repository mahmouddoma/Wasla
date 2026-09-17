import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthApi } from '../../../core/auth/auth-api';
import { PasswordRecoverySession } from '../../../core/auth/password-recovery-session';
import { ResetPassword } from './reset-password';

describe('ResetPassword',()=>{
  const api={resetPassword:vi.fn(()=>of(undefined))};
  beforeEach(()=>{vi.clearAllMocks();api.resetPassword.mockReturnValue(of(undefined));});
  async function setup(grant=true){
    TestBed.configureTestingModule({imports:[ResetPassword],providers:[provideRouter([]),{provide:AuthApi,useValue:api}]});
    const recovery=TestBed.inject(PasswordRecoverySession);
    if(grant){recovery.begin('test@example.com',{requestId:'challenge-1',message:null});recovery.acceptGrant({requestId:'challenge-1',resetToken:'token',expiresOnUtc:new Date(Date.now()+3600000).toISOString()});}
    const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    const fixture=TestBed.createComponent(ResetPassword);await fixture.whenStable();
    return {fixture,recovery,navigate};
  }
  it('redirects when no valid reset grant exists',async()=>{
    const {fixture,navigate}=await setup(false);expect(fixture.componentInstance).toBeTruthy();expect(navigate).toHaveBeenCalled();
    expect(api.resetPassword).not.toHaveBeenCalled();
  });
  it('preserves the grant payload and clears it only after reset succeeds',async()=>{
    const {fixture,recovery,navigate}=await setup();
    fixture.componentInstance['model'].set({newPassword:'NewPassword1!',confirmPassword:'NewPassword1!'});
    await fixture.componentInstance['onSubmit'](new Event('submit'));
    expect(api.resetPassword).toHaveBeenCalledWith({requestId:'challenge-1',resetToken:'token',newPassword:'NewPassword1!',confirmPassword:'NewPassword1!'});
    expect(recovery.validGrant()).toBeNull();expect(navigate).toHaveBeenCalledWith(['/login'],{queryParams:{status:'password-reset'},replaceUrl:true});
  });
  it('rejects mismatch without consuming the grant',async()=>{
    const {fixture,recovery}=await setup();
    fixture.componentInstance['model'].set({newPassword:'NewPassword1!',confirmPassword:'Mismatch1!'});
    await fixture.componentInstance['onSubmit'](new Event('submit'));
    expect(api.resetPassword).not.toHaveBeenCalled();expect(recovery.validGrant()).not.toBeNull();
  });
  it('keeps the grant on a recoverable failure and releases busy state',async()=>{
    const {fixture,recovery}=await setup();api.resetPassword.mockReturnValue(throwError(()=>new Error('offline')));
    fixture.componentInstance['model'].set({newPassword:'NewPassword1!',confirmPassword:'NewPassword1!'});
    await fixture.componentInstance['onSubmit'](new Event('submit'));
    expect(recovery.validGrant()).not.toBeNull();expect(fixture.componentInstance['isSubmitting']()).toBe(false);
  });
});
