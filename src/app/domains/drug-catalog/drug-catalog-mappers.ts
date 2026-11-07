import { DrugCatalogItem, DrugCatalogDetails } from './drug-catalog.models';

export interface DrugCatalogResponse extends Omit<DrugCatalogItem, 'strengthText' | 'priceEgp'> {
  readonly strength: string | null;
  readonly referencePriceEgp: number | null;
  readonly mergedIntoDrugCatalogId?: string | null;
}
export interface DrugCatalogDetailsResponse {
  readonly drug: DrugCatalogResponse;
  readonly history: readonly {
    readonly id: string;
    readonly action: string;
    readonly reason: string | null;
    readonly occurredAtUtc: string;
  }[];
}
export function mapDrug(drug: DrugCatalogResponse | DrugCatalogItem): DrugCatalogItem {
  if ('strengthText' in drug) return drug;
  return {
    ...drug,
    strengthText: drug.strength,
    priceEgp: drug.referencePriceEgp,
    targetDrugCatalogId: drug.mergedIntoDrugCatalogId,
  };
}
export function mapDrugDetails(
  response: DrugCatalogDetailsResponse | DrugCatalogDetails,
): DrugCatalogDetails {
  if (!('drug' in response)) return response;
  return {
    ...mapDrug(response.drug),
    history: response.history.map((item) => ({ ...item, createdOnUtc: item.occurredAtUtc })),
  };
}
