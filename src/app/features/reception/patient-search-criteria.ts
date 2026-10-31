/** Assisted search requires enough information to avoid disclosing unrelated patients. */
export function hasReceptionPatientSearchCriteria(criteria: {
  readonly phoneNumber: string;
  readonly name: string;
  readonly dateOfBirth: string;
}): boolean {
  return (
    criteria.phoneNumber.replace(/\D/g, '').length >= 7 ||
    (criteria.name.trim().length >= 3 && !!criteria.dateOfBirth.trim())
  );
}
