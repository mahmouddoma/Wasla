import { MedicationSubmission } from '../prescriptions';
import { DrugCatalogItem, DrugData } from '../drug-catalog';
export type MedicationRequestStatus = 'Pending' | 'NeedsMoreInfo' | 'Approved' | 'Rejected';
export interface MedicationRequest extends MedicationSubmission {
  readonly requestId: string;
  readonly status: MedicationRequestStatus;
  readonly rowVersion: string;
  readonly approvedDrug?: DrugCatalogItem | null;
  readonly duplicateDrug?: DrugCatalogItem | null;
  readonly history?: readonly {
    readonly action: string;
    readonly reason: string | null;
    readonly createdOnUtc: string;
  }[];
}
export interface MedicationRequestQuery {
  status?: MedicationRequestStatus;
  doctorId?: string;
  search?: string;
  pageNumber: number;
  pageSize: number;
}
export interface MedicationRequestPage {
  readonly items: readonly MedicationRequest[];
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}
export interface MedicationApproval {
  readonly approvedData: DrugData;
  readonly rowVersion: string;
  readonly reason: string;
}
