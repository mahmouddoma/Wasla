export type DoctorApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Suspended';

export interface DoctorOnboardingStatus {
  doctorId: string;
  approvalStatus: DoctorApprovalStatus;
  rejectionReason: string | null;
  suspensionReason: string | null;
  approvedOnUtc: string | null;
  hasProfileImage: boolean;
  rowVersion: string;
}
