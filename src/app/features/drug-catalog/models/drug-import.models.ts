export type ImportStatus = 'Staged' | 'Applied' | 'Failed' | 'Discarded';
export type ImportChangeType =
  | 'New'
  | 'Unchanged'
  | 'PriceChange'
  | 'NeedsReview'
  | 'MissingFromSource'
  | 'PossibleDuplicate'
  | 'ExactDuplicate';
export interface DrugImportBatch {
  readonly batchId: string;
  readonly source?: string | null;
  readonly sourceVersion?: string | null;
  readonly sourceCommitSha?: string | null;
  readonly fileSha256: string;
  readonly status: ImportStatus;
  readonly counts: Readonly<Record<string, number>>;
  readonly createdOnUtc: string;
  readonly appliedOnUtc?: string | null;
  readonly rowVersion: string;
}
export interface ImportPage {
  readonly items: readonly DrugImportBatch[];
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}
export interface ImportChange {
  readonly recordId: string;
  readonly changeType: ImportChangeType;
  readonly sourceRow: unknown;
  readonly drugCatalogId?: string | null;
}
export interface ImportChangePage {
  readonly items: readonly ImportChange[];
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}
