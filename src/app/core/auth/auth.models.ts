export type UserType = 'SuperAdmin' | 'Doctor' | 'Reception' | 'Patient';
export type Gender = 'Male' | 'Female';

export interface LoginRequest {
  identifier: string;
  password: string;
}
export interface LoginResponse {
  accessToken: string | null;
  expiresOnUtc: string;
  passwordChangeRequired: boolean;
}
export interface CurrentUser {
  applicationUserId: string;
  userName: string;
  email: string;
  phoneNumber: string;
  userType: UserType;
  roles: string[];
  permissions: string[];
  isFirstLogin: boolean;
  doctorId: string | null;
  patientId: string | null;
}
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
export interface RegistrationFields {
  userName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  nameAr: string;
  nameEn: string;
  dateOfBirth: string;
  gender: Gender | '';
}
export interface PatientRegistrationRequest extends RegistrationFields {
  profileImage?: File;
  personalIdFrontImage?: File;
  personalIdBackImage?: File;
}
export interface PatientRegistrationResponse {
  patientId: string;
  applicationUserId: string;
}
export interface DoctorRegistrationRequest extends RegistrationFields {
  profileImage?: File;
  personalIdFrontImage: File;
  personalIdBackImage: File;
  syndicateCardFrontImage: File;
  syndicateCardBackImage?: File;
}
export interface DoctorRegistrationResponse {
  doctorId: string;
  applicationUserId: string;
  approvalStatus: 'Pending';
}
export interface PasswordRecoveryRequest {
  email: string;
}
export interface PasswordRecoveryRequestResponse {
  requestId: string;
  message: string | null;
}
export interface PasswordRecoveryOtpRequest {
  requestId: string;
  otp: string;
}
export interface PasswordRecoveryOtpResponse {
  requestId: string;
  resetToken: string;
  expiresOnUtc: string;
}
export interface ResetPasswordRequest {
  requestId: string;
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}
export interface ApiErrorItem {
  code?: string;
  message?: string;
  type?: string;
  details?: string;
  source?: string;
  retryAfter?: number;
}
export interface ApiProblemDetails {
  title?: string;
  status?: number;
  detail?: string;
  traceId?: string;
  correlationId?: string;
  errors?: ApiErrorItem[];
}
export interface AuthSessionState {
  accessToken: string;
  expiresOnUtc: string;
  passwordChangeRequired: boolean;
  user: CurrentUser | null;
}
