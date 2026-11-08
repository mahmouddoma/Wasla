import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { UpsertPatientContactRequest } from '../patients';
import { DiagnosticSubmissionSummaryClinicalPage } from '../diagnostics/contracts';
import * as M from './family-workspace.models';

@Injectable({ providedIn: 'root' })
export class FamilyWorkspaceApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1`;
  private readonly own = `${this.base}/families/mine`;
  private readonly onboarding = `${this.own}/child-onboarding-requests`;
  private readonly adminOnboarding = `${this.base}/admin/child-onboarding-requests`;
  private readonly governance = `${this.own}/governance-cases`;
  private readonly adminGovernance = `${this.base}/admin/family-governance-cases`;

  workspace() {
    return this.http.get<M.FamilyWorkspace>(`${this.own}/workspace`);
  }
  search(criteria: M.FamilyCandidateSearch) {
    const { nameAr, dateOfBirth, gender, phoneNumber } = criteria;
    return this.http.post<M.FamilyCandidateSearchResponse>(
      `${this.base}/families/patient-candidates/search`,
      { nameAr, dateOfBirth, gender, phoneNumber },
    );
  }
  submitCandidate(
    candidateReference: string,
    relationshipType: M.ParentRole,
    evidence: M.FamilyEvidence,
    key: string,
  ) {
    return this.http.post<M.FamilySubmissionReceipt>(
      `${this.base}/family-relationship-requests/from-candidate`,
      evidenceForm(evidence, { candidateReference, relationshipType }),
      intent(key),
    );
  }
  onboard(intake: M.ChildIntake, evidence: M.FamilyEvidence, key: string) {
    return this.http.post<M.ChildOnboardingReceipt>(
      `${this.own}/child-onboarding`,
      evidenceForm(evidence, { ...intake }),
      intent(key),
    );
  }
  onboardingRequests(pageNumber = 1, pageSize = 20) {
    return this.http.get<M.ChildOnboardingReview[]>(this.onboarding, {
      params: { pageNumber, pageSize },
    });
  }
  onboardingDetails(id: string) {
    return this.http.get<M.ChildOnboardingReview[]>(`${this.onboarding}/${segment(id)}`);
  }
  resubmitOnboarding(
    id: string,
    rowVersion: string,
    evidence: M.FamilyEvidence,
    key: string,
    intake?: M.ChildIntake,
  ) {
    return this.http.post<M.ChildOnboardingReceipt>(
      `${this.onboarding}/${segment(id)}/resubmit`,
      evidenceForm(evidence, { ...intake, rowVersion }),
      intent(key),
    );
  }
  adminOnboardingRequests(pageNumber = 1, pageSize = 20) {
    return this.http.get<M.ChildOnboardingReview[]>(this.adminOnboarding, {
      params: { pageNumber, pageSize },
    });
  }
  adminOnboardingDetails(id: string, matchPageNumber = 1) {
    return this.http.get<M.ChildOnboardingReview[]>(`${this.adminOnboarding}/${segment(id)}`, {
      params: { matchPageNumber, matchPageSize: 20 },
    });
  }
  onboardingEvidence(id: string, documentId: string) {
    return this.media(
      `${this.adminOnboarding}/${segment(id)}/evidence/${segment(documentId)}/content`,
    );
  }
  decideOnboarding(
    id: string,
    action: 'approve' | 'reject' | 'request-modification',
    body: { rowVersion: string; reason: string | null; confirmedExistingPatientId: string | null },
    key: string,
  ) {
    return this.http.post<M.ChildOnboardingReceipt>(
      `${this.adminOnboarding}/${segment(id)}/${action}`,
      body,
      intent(key),
    );
  }
  authorities(relationshipRequestId: string) {
    return this.http.get<M.OperationalAuthority[]>(
      `${this.base}/admin/family-operational-authorities`,
      { params: { relationshipRequestId } },
    );
  }
  revokeAuthority(id: string, rowVersion: string, reason: string, key: string) {
    return this.http.post<void>(
      `${this.base}/admin/family-operational-authorities/${segment(id)}/revoke`,
      { rowVersion, reason },
      intent(key),
    );
  }
  profile(childId: string) {
    return this.http.get<M.DependentProfile>(`${this.child(childId)}/profile`);
  }
  contacts(childId: string) {
    return this.http.get<Pick<M.DependentProfile, 'contacts' | 'rowVersion'>>(
      `${this.child(childId)}/contacts`,
    );
  }
  profileImage(childId: string) {
    return this.media(`${this.child(childId)}/profile-image`);
  }
  addContact(
    childId: string,
    rowVersion: string,
    contact: UpsertPatientContactRequest,
    key: string,
  ) {
    return this.http.post<M.DependentProfileChange>(
      `${this.child(childId)}/contacts`,
      { rowVersion, contact },
      intent(key),
    );
  }
  updateContact(
    childId: string,
    contactId: string,
    rowVersion: string,
    contact: UpsertPatientContactRequest,
    key: string,
  ) {
    return this.http.put<M.DependentProfileChange>(
      `${this.child(childId)}/contacts/${segment(contactId)}`,
      { rowVersion, contact },
      intent(key),
    );
  }
  deleteContact(childId: string, contactId: string, rowVersion: string, key: string) {
    return this.http.delete<M.DependentProfileChange>(
      `${this.child(childId)}/contacts/${segment(contactId)}`,
      { ...intent(key), body: { rowVersion } },
    );
  }
  updatePhone(childId: string, rowVersion: string, phoneNumber: string | null, key: string) {
    return this.http.patch<M.DependentProfileChange>(
      `${this.child(childId)}/phone`,
      { rowVersion, phoneNumber },
      intent(key),
    );
  }
  updatePhoto(childId: string, rowVersion: string, photo: File, key: string) {
    const body = new FormData();
    body.append('Photo', photo);
    body.append('RowVersion', rowVersion);
    return this.http.patch<M.DependentProfileChange>(
      `${this.child(childId)}/profile`,
      body,
      intent(key),
    );
  }
  activeTickets(childId: string) {
    return this.http.get<M.DependentActiveTicket[]>(
      `${this.base}/tickets/dependents/${segment(childId)}/active`,
    );
  }
  ticket(childId: string, ticketId: string) {
    return this.http.get<M.DependentTicket>(
      `${this.base}/tickets/dependents/${segment(childId)}/${segment(ticketId)}`,
    );
  }
  requestIdentityCorrection(
    childId: string,
    identity: Pick<M.ChildIntake, 'nameAr' | 'nameEn' | 'dateOfBirth' | 'gender'>,
    reason: string,
    evidence: M.FamilyEvidence,
    key: string,
    revision?: { caseId: string; rowVersion: string },
  ) {
    const { nameAr, nameEn, dateOfBirth, gender } = identity;
    return this.http.post<M.FamilyGovernanceReceipt>(
      `${this.child(childId)}/identity-corrections`,
      evidenceForm(evidence, { nameAr, nameEn, dateOfBirth, gender, reason, ...revision }),
      intent(key),
    );
  }
  governanceCases(pageNumber = 1, kind?: string) {
    return this.governancePage(this.governance, pageNumber, kind);
  }
  governanceDetails(id: string) {
    return this.http.get<M.FamilyGovernancePage>(`${this.governance}/${segment(id)}`);
  }
  resubmitConflict(id: string, rowVersion: string, evidence: M.FamilyEvidence, key: string) {
    return this.http.post<M.FamilyGovernanceReceipt>(
      `${this.governance}/${segment(id)}/resubmit-conflict`,
      evidenceForm(evidence, { rowVersion }),
      intent(key),
    );
  }
  adminGovernanceCases(pageNumber = 1, kind?: string) {
    return this.governancePage(this.adminGovernance, pageNumber, kind);
  }
  adminGovernanceDetails(id: string) {
    return this.http.get<M.FamilyGovernancePage>(`${this.adminGovernance}/${segment(id)}`);
  }
  governanceEvidence(id: string, documentId: string) {
    return this.media(
      `${this.adminGovernance}/${segment(id)}/evidence/${segment(documentId)}/content`,
    );
  }
  decideGovernance(
    id: string,
    action: 'approve' | 'reject' | 'request-modification' | 'refer-governance',
    rowVersion: string,
    reason: string,
    key: string,
  ) {
    return this.http.post<M.FamilyGovernanceReceipt>(
      `${this.adminGovernance}/${segment(id)}/${action}`,
      { rowVersion, reason },
      intent(key),
    );
  }
  invite(childPatientId: string, intendedParentRole: M.ParentRole, key: string) {
    return this.http.post<M.FamilyInvitation>(
      `${this.own}/join-invitations`,
      { childPatientId, intendedParentRole },
      intent(key),
    );
  }
  revokeInvitation(invitationReference: string, key: string) {
    return this.http.post<void>(
      `${this.own}/join-invitations/revoke`,
      { invitationReference },
      intent(key),
    );
  }
  redeemInvitation(
    invitationReference: string,
    intendedParentRole: M.ParentRole,
    evidence: M.FamilyEvidence,
    key: string,
  ) {
    return this.http.post<M.FamilySubmissionReceipt>(
      `${this.own}/join-requests`,
      evidenceForm(evidence, { invitationReference, intendedParentRole }),
      intent(key),
    );
  }
  diagnosticSubmissions(
    childId: string,
    kind: 'lab' | 'radiology',
    requestId: string,
    pageNumber = 1,
  ) {
    return this.http.get<DiagnosticSubmissionSummaryClinicalPage>(
      `${this.child(childId)}/${kind}-requests/${segment(requestId)}/submissions`,
      { params: { pageNumber, pageSize: 20 } },
    );
  }
  submitDiagnostic(
    childId: string,
    kind: 'lab' | 'radiology',
    requestId: string,
    attachments: readonly File[],
    metadata: { externalProviderName?: string; externalReportDate?: string; patientNote?: string },
    key: string,
  ) {
    const body = new FormData();
    attachments.forEach((file) => body.append('Attachments', file));
    appendFields(body, metadata);
    return this.http.post<M.DependentDiagnosticReceipt>(
      `${this.child(childId)}/${kind}-requests/${segment(requestId)}/submissions`,
      body,
      intent(key),
    );
  }
  withdrawDiagnostic(
    childId: string,
    kind: 'lab' | 'radiology',
    requestId: string,
    submissionId: string,
    rowVersion: string,
    key: string,
  ) {
    return this.http.post<M.DependentDiagnosticReceipt>(
      `${this.child(childId)}/${kind}-requests/${segment(requestId)}/submissions/${segment(submissionId)}/withdraw`,
      { rowVersion },
      intent(key),
    );
  }
  private child(id: string) {
    return `${this.own}/dependents/${segment(id)}`;
  }
  private media(url: string) {
    return this.http.get(url, { responseType: 'blob', observe: 'response' });
  }
  private governancePage(url: string, pageNumber: number, kind?: string) {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', 20);
    if (kind) params = params.set('kind', kind);
    return this.http.get<M.FamilyGovernancePage>(url, { params });
  }
}

function segment(value: string): string {
  if (!value.trim()) throw new Error('Resource identifier required');
  return encodeURIComponent(value);
}
function intent(key: string) {
  return { headers: { 'Idempotency-Key': key } };
}
function appendFields(
  body: FormData,
  fields: Readonly<Record<string, string | boolean | null | undefined>>,
) {
  for (const [key, value] of Object.entries(fields))
    if (value !== undefined && value !== null) body.append(key, String(value));
}
function evidenceForm(
  evidence: M.FamilyEvidence,
  fields: Readonly<Record<string, string | boolean | null | undefined>>,
): FormData {
  if (evidence.evidenceFiles.length !== evidence.documentTypes.length)
    throw new Error('Evidence types must match files');
  const body = new FormData();
  appendFields(body, fields);
  evidence.evidenceFiles.forEach((file) => body.append('EvidenceFiles', file));
  evidence.documentTypes.forEach((type) => body.append('DocumentTypes', type));
  return body;
}
