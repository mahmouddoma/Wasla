import { DrugImportBatch, ImportChange } from './drug-import.models';

export interface DrugImportBatchResponse extends Omit<
  DrugImportBatch,
  'counts' | 'createdOnUtc' | 'appliedOnUtc'
> {
  readonly createdAtUtc: string;
  readonly appliedAtUtc: string | null;
  readonly totalRecords: number;
  readonly newRecords: number;
  readonly unchangedRecords: number;
  readonly priceChanges: number;
  readonly needsReviewRecords: number;
  readonly missingRecords: number;
  readonly possibleDuplicateRecords: number;
  readonly exactDuplicateRecords: number;
}

export function mapDrugImport(batch: DrugImportBatchResponse | DrugImportBatch): DrugImportBatch {
  if ('counts' in batch) return batch;
  return {
    ...batch,
    createdOnUtc: batch.createdAtUtc,
    appliedOnUtc: batch.appliedAtUtc,
    counts: {
      Total: batch.totalRecords,
      New: batch.newRecords,
      Unchanged: batch.unchangedRecords,
      PriceChange: batch.priceChanges,
      NeedsReview: batch.needsReviewRecords,
      MissingFromSource: batch.missingRecords,
      PossibleDuplicate: batch.possibleDuplicateRecords,
      ExactDuplicate: batch.exactDuplicateRecords,
    },
  };
}

export interface DrugImportChangeResponse {
  readonly id: string;
  readonly sourceRowNumber: number;
  readonly data: unknown;
  readonly changeType: ImportChange['changeType'];
  readonly matchedDrugCatalogId: string | null;
}

export function mapDrugImportChange(item: DrugImportChangeResponse | ImportChange): ImportChange {
  if ('recordId' in item) return item;
  return {
    recordId: item.id,
    changeType: item.changeType,
    sourceRow: item.data,
    drugCatalogId: item.matchedDrugCatalogId,
  };
}
