import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChangePasswordRequest,
  CurrentUser,
  DoctorRegistrationRequest,
  DoctorRegistrationResponse,
  LoginRequest,
  LoginResponse,
  PasswordResetRequest,
  PasswordResetRequestResponse,
  PatientRegistrationRequest,
  PatientRegistrationResponse,
  RegistrationFields,
} from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${environment.apiBaseUrl}/api/v1/auth`;
  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authUrl}/login`, request);
  }
  currentUser(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.authUrl}/me`);
  }
  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/change-password`, request);
  }
  registerPatient(request: PatientRegistrationRequest): Observable<PatientRegistrationResponse> {
    const body = this.registrationFormData(request);
    this.appendOptionalFile(body, 'ProfileImage', request.profileImage);
    this.appendOptionalFile(body, 'PersonalIdFrontImage', request.personalIdFrontImage);
    this.appendOptionalFile(body, 'PersonalIdBackImage', request.personalIdBackImage);
    return this.http.post<PatientRegistrationResponse>(`${this.authUrl}/patients/register`, body);
  }
  registerDoctor(request: DoctorRegistrationRequest): Observable<DoctorRegistrationResponse> {
    const body = this.registrationFormData(request);
    this.appendOptionalFile(body, 'ProfileImage', request.profileImage);
    body.append('PersonalIdFrontImage', request.personalIdFrontImage);
    body.append('PersonalIdBackImage', request.personalIdBackImage);
    body.append('SyndicateCardFrontImage', request.syndicateCardFrontImage);
    this.appendOptionalFile(body, 'SyndicateCardBackImage', request.syndicateCardBackImage);
    return this.http.post<DoctorRegistrationResponse>(`${this.authUrl}/doctors/register`, body);
  }
  requestPasswordReset(request: PasswordResetRequest): Observable<PasswordResetRequestResponse> {
    return this.http.post<PasswordResetRequestResponse>(
      `${this.authUrl}/forgot-password/request-otp`,
      request,
    );
  }
  private registrationFormData(request: RegistrationFields): FormData {
    const body = new FormData();
    body.append('UserName', request.userName);
    body.append('Email', request.email);
    body.append('PhoneNumber', request.phoneNumber);
    body.append('Password', request.password);
    body.append('ConfirmPassword', request.confirmPassword);
    body.append('NameAr', request.nameAr);
    if (request.nameEn) body.append('NameEn', request.nameEn);
    body.append('DateOfBirth', request.dateOfBirth);
    body.append('Gender', request.gender);
    return body;
  }
  private appendOptionalFile(body: FormData, key: string, file?: File): void {
    if (file) body.append(key, file);
  }
}
