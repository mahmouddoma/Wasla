import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { components } from './phase18-openapi.types';

export type Phase18QueryValue = string | number | boolean | null | undefined;
export type Phase18Query = Readonly<Record<string, Phase18QueryValue>>;

export interface Phase18Call {
  readonly path?: Readonly<Record<string, string>>;
  readonly query?: Phase18Query;
  readonly body?: unknown;
  readonly idempotencyKey?: string;
}

export const PHASE18_OPERATIONS = {
  'P18-001': {
    method: 'GET',
    route: '/api/v1/admin/attention',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-002': {
    method: 'GET',
    route: '/api/v1/admin/dashboard/filter-options',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-003': {
    method: 'GET',
    route: '/api/v1/admin/dashboard/overview',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-004': {
    method: 'GET',
    route: '/api/v1/admin/data-quality/summary',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-005': {
    method: 'GET',
    route: '/api/v1/admin/investigation-cases',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-006': {
    method: 'POST',
    route: '/api/v1/admin/investigation-cases',
    pathParameters: [] as const,
    requiresIdempotencyKey: true,
  },
  'P18-007': {
    method: 'GET',
    route: '/api/v1/admin/investigation-cases/{caseId}',
    pathParameters: ['caseId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-008': {
    method: 'POST',
    route: '/api/v1/admin/investigation-cases/{caseId}/assign',
    pathParameters: ['caseId'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-009': {
    method: 'POST',
    route: '/api/v1/admin/investigation-cases/{caseId}/close',
    pathParameters: ['caseId'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-010': {
    method: 'GET',
    route: '/api/v1/admin/investigation-cases/{caseId}/history',
    pathParameters: ['caseId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-011': {
    method: 'POST',
    route: '/api/v1/admin/investigation-cases/{caseId}/reopen',
    pathParameters: ['caseId'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-012': {
    method: 'POST',
    route: '/api/v1/admin/investigation-cases/{caseId}/resolve',
    pathParameters: ['caseId'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-013': {
    method: 'POST',
    route: '/api/v1/admin/investigation-cases/{caseId}/start-review',
    pathParameters: ['caseId'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-014': {
    method: 'GET',
    route: '/api/v1/admin/investigation-cases/filter-options',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-015': {
    method: 'GET',
    route: '/api/v1/admin/operations/exports/health',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-016': {
    method: 'GET',
    route: '/api/v1/admin/operations/jobs/health',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-017': {
    method: 'GET',
    route: '/api/v1/admin/reports/{reportCode}/drilldown',
    pathParameters: ['reportCode'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-018': {
    method: 'GET',
    route: '/api/v1/admin/reports/{reportCode}/export',
    pathParameters: ['reportCode'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-019': {
    method: 'GET',
    route: '/api/v1/admin/reports/adoption',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-020': {
    method: 'GET',
    route: '/api/v1/admin/reports/catalog',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-021': {
    method: 'GET',
    route: '/api/v1/admin/reports/doctor-lifecycle',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-022': {
    method: 'GET',
    route: '/api/v1/admin/reports/geography',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-023': {
    method: 'GET',
    route: '/api/v1/admin/reports/operations',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-024': {
    method: 'GET',
    route: '/api/v1/admin/reports/security-metadata',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-025': {
    method: 'GET',
    route: '/api/v1/doctors/me/dashboard/filter-options',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-026': {
    method: 'GET',
    route: '/api/v1/doctors/me/dashboard/overview',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-027': {
    method: 'GET',
    route: '/api/v1/doctors/me/expense-settlements/{id}',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-028': {
    method: 'GET',
    route: '/api/v1/doctors/me/expense-settlements/{id}/history',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-029': {
    method: 'GET',
    route: '/api/v1/doctors/me/expense-settlements/{id}/receipt',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-030': {
    method: 'POST',
    route: '/api/v1/doctors/me/expense-settlements/{id}/reverse',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-031': {
    method: 'GET',
    route: '/api/v1/doctors/me/expenses',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-032': {
    method: 'POST',
    route: '/api/v1/doctors/me/expenses',
    pathParameters: [] as const,
    requiresIdempotencyKey: true,
  },
  'P18-033': {
    method: 'GET',
    route: '/api/v1/doctors/me/expenses/{id}',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-034': {
    method: 'GET',
    route: '/api/v1/doctors/me/expenses/{id}/history',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-035': {
    method: 'GET',
    route: '/api/v1/doctors/me/expenses/categories',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-036': {
    method: 'GET',
    route: '/api/v1/doctors/me/expenses/dashboard',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-037': {
    method: 'GET',
    route: '/api/v1/doctors/me/expenses/obligations',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-038': {
    method: 'GET',
    route: '/api/v1/doctors/me/expenses/obligations/{id}',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-039': {
    method: 'PATCH',
    route: '/api/v1/doctors/me/expenses/obligations/{id}',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-040': {
    method: 'POST',
    route: '/api/v1/doctors/me/expenses/obligations/{id}/cancel',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-041': {
    method: 'POST',
    route: '/api/v1/doctors/me/expenses/obligations/{id}/confirm-actual',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-042': {
    method: 'GET',
    route: '/api/v1/doctors/me/expenses/obligations/{id}/history',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-043': {
    method: 'POST',
    route: '/api/v1/doctors/me/expenses/obligations/{id}/settle',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-044': {
    method: 'GET',
    route: '/api/v1/doctors/me/expenses/transactions',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-045': {
    method: 'GET',
    route: '/api/v1/doctors/me/finance/filter-options',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-046': {
    method: 'GET',
    route: '/api/v1/doctors/me/handovers',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-047': {
    method: 'GET',
    route: '/api/v1/doctors/me/insights',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-048': {
    method: 'GET',
    route: '/api/v1/doctors/me/insights/{insightId}',
    pathParameters: ['insightId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-049': {
    method: 'POST',
    route: '/api/v1/doctors/me/insights/{insightId}/acknowledge',
    pathParameters: ['insightId'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-050': {
    method: 'POST',
    route: '/api/v1/doctors/me/insights/{insightId}/dismiss',
    pathParameters: ['insightId'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-051': {
    method: 'GET',
    route: '/api/v1/doctors/me/insights/{insightId}/history',
    pathParameters: ['insightId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-052': {
    method: 'POST',
    route: '/api/v1/doctors/me/insights/{insightId}/resolve',
    pathParameters: ['insightId'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-053': {
    method: 'POST',
    route: '/api/v1/doctors/me/practices/{practiceId}/handovers',
    pathParameters: ['practiceId'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-054': {
    method: 'GET',
    route: '/api/v1/doctors/me/practices/{practiceId}/handovers/{handoverId}',
    pathParameters: ['practiceId', 'handoverId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-055': {
    method: 'POST',
    route: '/api/v1/doctors/me/practices/{practiceId}/handovers/{handoverId}/acknowledge',
    pathParameters: ['practiceId', 'handoverId'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-056': {
    method: 'POST',
    route: '/api/v1/doctors/me/practices/{practiceId}/handovers/{handoverId}/close',
    pathParameters: ['practiceId', 'handoverId'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-057': {
    method: 'GET',
    route: '/api/v1/doctors/me/practices/{practiceId}/handovers/{handoverId}/history',
    pathParameters: ['practiceId', 'handoverId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-058': {
    method: 'GET',
    route: '/api/v1/doctors/me/reception-salary-plans',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-059': {
    method: 'POST',
    route: '/api/v1/doctors/me/reception-salary-plans',
    pathParameters: [] as const,
    requiresIdempotencyKey: true,
  },
  'P18-060': {
    method: 'GET',
    route: '/api/v1/doctors/me/reception-salary-plans/{id}',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-061': {
    method: 'PUT',
    route: '/api/v1/doctors/me/reception-salary-plans/{id}',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-062': {
    method: 'POST',
    route: '/api/v1/doctors/me/reception-salary-plans/{id}/end',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-063': {
    method: 'GET',
    route: '/api/v1/doctors/me/reception-salary-plans/{id}/history',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-064': {
    method: 'GET',
    route: '/api/v1/doctors/me/recurring-expense-plans',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-065': {
    method: 'POST',
    route: '/api/v1/doctors/me/recurring-expense-plans',
    pathParameters: [] as const,
    requiresIdempotencyKey: true,
  },
  'P18-066': {
    method: 'GET',
    route: '/api/v1/doctors/me/recurring-expense-plans/{id}',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-067': {
    method: 'PUT',
    route: '/api/v1/doctors/me/recurring-expense-plans/{id}',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-068': {
    method: 'POST',
    route: '/api/v1/doctors/me/recurring-expense-plans/{id}/end',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-069': {
    method: 'GET',
    route: '/api/v1/doctors/me/recurring-expense-plans/{id}/history',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-070': {
    method: 'GET',
    route: '/api/v1/doctors/me/recurring-expense-plans/{id}/obligations',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-071': {
    method: 'POST',
    route: '/api/v1/doctors/me/recurring-expense-plans/{id}/pause',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-072': {
    method: 'POST',
    route: '/api/v1/doctors/me/recurring-expense-plans/{id}/resume',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-073': {
    method: 'GET',
    route: '/api/v1/doctors/me/reports/{reportCode}',
    pathParameters: ['reportCode'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-074': {
    method: 'GET',
    route: '/api/v1/doctors/me/reports/{reportCode}/drilldown',
    pathParameters: ['reportCode'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-075': {
    method: 'GET',
    route: '/api/v1/doctors/me/reports/{reportCode}/export',
    pathParameters: ['reportCode'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-076': {
    method: 'GET',
    route: '/api/v1/doctors/me/reports/catalog',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-077': {
    method: 'GET',
    route: '/api/v1/doctors/me/reports/patients',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-078': {
    method: 'GET',
    route: '/api/v1/doctors/me/reports/practice-comparison',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-079': {
    method: 'GET',
    route: '/api/v1/doctors/me/reports/queue',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-080': {
    method: 'GET',
    route: '/api/v1/doctors/me/reports/reservations',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-081': {
    method: 'GET',
    route: '/api/v1/doctors/me/salary-obligations',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-082': {
    method: 'GET',
    route: '/api/v1/doctors/me/salary-obligations/{id}',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-083': {
    method: 'PATCH',
    route: '/api/v1/doctors/me/salary-obligations/{id}',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-084': {
    method: 'POST',
    route: '/api/v1/doctors/me/salary-obligations/{id}/cancel',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-085': {
    method: 'GET',
    route: '/api/v1/doctors/me/salary-obligations/{id}/history',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-086': {
    method: 'POST',
    route: '/api/v1/doctors/me/salary-obligations/{id}/settle',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-087': {
    method: 'GET',
    route: '/api/v1/doctors/me/salary-settlements/{id}',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-088': {
    method: 'GET',
    route: '/api/v1/doctors/me/salary-settlements/{id}/history',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-089': {
    method: 'GET',
    route: '/api/v1/doctors/me/salary-settlements/{id}/receipt',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-090': {
    method: 'POST',
    route: '/api/v1/doctors/me/salary-settlements/{id}/reverse',
    pathParameters: ['id'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-091': {
    method: 'GET',
    route: '/api/v1/patients/me/dashboard/capabilities',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-092': {
    method: 'GET',
    route: '/api/v1/patients/me/dashboard/overview',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-093': {
    method: 'GET',
    route: '/api/v1/reception/attention',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-094': {
    method: 'GET',
    route: '/api/v1/reception/dashboard/filter-options',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-095': {
    method: 'GET',
    route: '/api/v1/reception/dashboard/overview',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-096': {
    method: 'GET',
    route: '/api/v1/reception/practices/{practiceId}/handovers',
    pathParameters: ['practiceId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-097': {
    method: 'POST',
    route: '/api/v1/reception/practices/{practiceId}/handovers',
    pathParameters: ['practiceId'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-098': {
    method: 'GET',
    route: '/api/v1/reception/practices/{practiceId}/handovers/{handoverId}',
    pathParameters: ['practiceId', 'handoverId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-099': {
    method: 'POST',
    route: '/api/v1/reception/practices/{practiceId}/handovers/{handoverId}/acknowledge',
    pathParameters: ['practiceId', 'handoverId'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-100': {
    method: 'POST',
    route: '/api/v1/reception/practices/{practiceId}/handovers/{handoverId}/annotations',
    pathParameters: ['practiceId', 'handoverId'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-101': {
    method: 'POST',
    route: '/api/v1/reception/practices/{practiceId}/handovers/{handoverId}/close',
    pathParameters: ['practiceId', 'handoverId'] as const,
    requiresIdempotencyKey: true,
  },
  'P18-102': {
    method: 'GET',
    route: '/api/v1/reception/practices/{practiceId}/handovers/{handoverId}/history',
    pathParameters: ['practiceId', 'handoverId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-103': {
    method: 'GET',
    route: '/api/v1/reception/practices/{practiceId}/worklist',
    pathParameters: ['practiceId'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-104': {
    method: 'GET',
    route: '/api/v1/reception/reports/{reportCode}/drilldown',
    pathParameters: ['reportCode'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-105': {
    method: 'GET',
    route: '/api/v1/reception/reports/{reportCode}/export',
    pathParameters: ['reportCode'] as const,
    requiresIdempotencyKey: false,
  },
  'P18-106': {
    method: 'GET',
    route: '/api/v1/reception/reports/activity',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-107': {
    method: 'GET',
    route: '/api/v1/reception/reports/catalog',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-108': {
    method: 'GET',
    route: '/api/v1/reception/reports/queue',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
  'P18-109': {
    method: 'GET',
    route: '/api/v1/reception/reports/reservations',
    pathParameters: [] as const,
    requiresIdempotencyKey: false,
  },
} as const;

export type Phase18Endpoint = keyof typeof PHASE18_OPERATIONS;

export type Phase18Responses = {
  'P18-001': components['schemas']['PlatformAttentionResponse'];
  'P18-002': components['schemas']['ReportFilterOptions'];
  'P18-003': components['schemas']['ReportModel'];
  'P18-004': components['schemas']['PlatformDataQualityResponse'];
  'P18-005': components['schemas']['InvestigationResponseReportPage'];
  'P18-006': components['schemas']['InvestigationResponse'];
  'P18-007': components['schemas']['InvestigationResponse'];
  'P18-008': components['schemas']['InvestigationResponse'];
  'P18-009': components['schemas']['InvestigationResponse'];
  'P18-010': components['schemas']['InvestigationHistoryResponseReportPage'];
  'P18-011': components['schemas']['InvestigationResponse'];
  'P18-012': components['schemas']['InvestigationResponse'];
  'P18-013': components['schemas']['InvestigationResponse'];
  'P18-014': components['schemas']['InvestigationFilterOptions'];
  'P18-015': components['schemas']['ExportRuntimeHealth'];
  'P18-016': components['schemas']['PlatformJobHealthResponse'];
  'P18-017': components['schemas']['ReportRecordReportPage'];
  'P18-018': Blob;
  'P18-019': components['schemas']['ReportModel'];
  'P18-020': components['schemas']['ReportCatalogEntry'][];
  'P18-021': components['schemas']['ReportModel'];
  'P18-022': components['schemas']['ReportModel'];
  'P18-023': components['schemas']['ReportModel'];
  'P18-024': components['schemas']['ReportModel'];
  'P18-025': components['schemas']['ReportFilterOptions'];
  'P18-026': components['schemas']['ReportModel'];
  'P18-027': components['schemas']['OperatingSettlementResponse'];
  'P18-028': components['schemas']['OperatingHistoryResponseReportPage'];
  'P18-029': components['schemas']['OperatingSettlementResponse'];
  'P18-030': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-031': components['schemas']['OperatingObligationResponseReportPage'];
  'P18-032': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-033': components['schemas']['OperatingObligationResponse'];
  'P18-034': components['schemas']['OperatingHistoryResponseReportPage'];
  'P18-035': components['schemas']['ReportOption'][];
  'P18-036': components['schemas']['ReportModel'];
  'P18-037': components['schemas']['OperatingObligationResponseReportPage'];
  'P18-038': components['schemas']['OperatingObligationResponse'];
  'P18-039': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-040': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-041': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-042': components['schemas']['OperatingHistoryResponseReportPage'];
  'P18-043': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-044': components['schemas']['OperatingMovementResponseReportPage'];
  'P18-045': components['schemas']['OperatingFinanceOptions'];
  'P18-046': components['schemas']['HandoverResponseReportPage'];
  'P18-047': components['schemas']['DoctorInsightResponseReportPage'];
  'P18-048': components['schemas']['DoctorInsightResponse'];
  'P18-049': components['schemas']['DoctorInsightResponse'];
  'P18-050': components['schemas']['DoctorInsightResponse'];
  'P18-051': components['schemas']['DoctorInsightHistoryResponseReportPage'];
  'P18-052': components['schemas']['DoctorInsightResponse'];
  'P18-053': components['schemas']['HandoverResponse'];
  'P18-054': components['schemas']['HandoverResponse'];
  'P18-055': components['schemas']['HandoverResponse'];
  'P18-056': components['schemas']['HandoverResponse'];
  'P18-057': components['schemas']['HandoverHistoryResponseReportPage'];
  'P18-058': components['schemas']['OperatingPlanResponseReportPage'];
  'P18-059': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-060': components['schemas']['OperatingPlanResponse'];
  'P18-061': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-062': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-063': components['schemas']['OperatingHistoryResponseReportPage'];
  'P18-064': components['schemas']['OperatingPlanResponseReportPage'];
  'P18-065': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-066': components['schemas']['OperatingPlanResponse'];
  'P18-067': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-068': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-069': components['schemas']['OperatingHistoryResponseReportPage'];
  'P18-070': components['schemas']['OperatingObligationResponseReportPage'];
  'P18-071': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-072': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-073': components['schemas']['ReportModel'];
  'P18-074': components['schemas']['ReportRecordReportPage'];
  'P18-075': Blob;
  'P18-076': components['schemas']['ReportCatalogEntry'][];
  'P18-077': components['schemas']['ReportModel'];
  'P18-078': components['schemas']['ReportModel'];
  'P18-079': components['schemas']['ReportModel'];
  'P18-080': components['schemas']['ReportModel'];
  'P18-081': components['schemas']['OperatingObligationResponseReportPage'];
  'P18-082': components['schemas']['OperatingObligationResponse'];
  'P18-083': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-084': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-085': components['schemas']['OperatingHistoryResponseReportPage'];
  'P18-086': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-087': components['schemas']['OperatingSettlementResponse'];
  'P18-088': components['schemas']['OperatingHistoryResponseReportPage'];
  'P18-089': components['schemas']['OperatingSettlementResponse'];
  'P18-090': components['schemas']['OperatingFinanceWriteResponse'];
  'P18-091': components['schemas']['PatientDashboardCapabilities'];
  'P18-092': components['schemas']['PatientDashboardOverview'];
  'P18-093': components['schemas']['ReceptionAttentionResponse'];
  'P18-094': components['schemas']['ReportFilterOptions'];
  'P18-095': components['schemas']['ReportModel'];
  'P18-096': components['schemas']['HandoverResponseReportPage'];
  'P18-097': components['schemas']['HandoverResponse'];
  'P18-098': components['schemas']['HandoverResponse'];
  'P18-099': components['schemas']['HandoverResponse'];
  'P18-100': components['schemas']['HandoverResponse'];
  'P18-101': components['schemas']['HandoverResponse'];
  'P18-102': components['schemas']['HandoverHistoryResponseReportPage'];
  'P18-103': components['schemas']['WorklistItemReportPage'];
  'P18-104': components['schemas']['ReportRecordReportPage'];
  'P18-105': Blob;
  'P18-106': components['schemas']['ReportModel'];
  'P18-107': components['schemas']['ReportCatalogEntry'][];
  'P18-108': components['schemas']['ReportModel'];
  'P18-109': components['schemas']['ReportModel'];
};

export type Phase18Bodies = {
  'P18-001': never;
  'P18-002': never;
  'P18-003': never;
  'P18-004': never;
  'P18-005': never;
  'P18-006': components['schemas']['InvestigationCreateRequest'];
  'P18-007': never;
  'P18-008': components['schemas']['InvestigationActionRequest'];
  'P18-009': components['schemas']['InvestigationActionRequest'];
  'P18-010': never;
  'P18-011': components['schemas']['InvestigationActionRequest'];
  'P18-012': components['schemas']['InvestigationActionRequest'];
  'P18-013': components['schemas']['InvestigationActionRequest'];
  'P18-014': never;
  'P18-015': never;
  'P18-016': never;
  'P18-017': never;
  'P18-018': never;
  'P18-019': never;
  'P18-020': never;
  'P18-021': never;
  'P18-022': never;
  'P18-023': never;
  'P18-024': never;
  'P18-025': never;
  'P18-026': never;
  'P18-027': never;
  'P18-028': never;
  'P18-029': never;
  'P18-030': components['schemas']['OperatingReversalRequest'];
  'P18-031': never;
  'P18-032': components['schemas']['OperatingExpenseRequest'];
  'P18-033': never;
  'P18-034': never;
  'P18-035': never;
  'P18-036': never;
  'P18-037': never;
  'P18-038': never;
  'P18-039': components['schemas']['OperatingCorrectionRequest'];
  'P18-040': components['schemas']['OperatingTransitionRequest'];
  'P18-041': components['schemas']['OperatingActualAmountRequest'];
  'P18-042': never;
  'P18-043': components['schemas']['OperatingSettlementRequest'];
  'P18-044': never;
  'P18-045': never;
  'P18-046': never;
  'P18-047': never;
  'P18-048': never;
  'P18-049': components['schemas']['InsightTransitionRequest'];
  'P18-050': components['schemas']['InsightTransitionRequest'];
  'P18-051': never;
  'P18-052': components['schemas']['InsightTransitionRequest'];
  'P18-053': components['schemas']['HandoverCreateRequest'];
  'P18-054': never;
  'P18-055': components['schemas']['HandoverActionRequest'];
  'P18-056': components['schemas']['HandoverActionRequest'];
  'P18-057': never;
  'P18-058': never;
  'P18-059': components['schemas']['OperatingPlanRequest'];
  'P18-060': never;
  'P18-061': components['schemas']['OperatingPlanRequest'];
  'P18-062': components['schemas']['OperatingTransitionRequest'];
  'P18-063': never;
  'P18-064': never;
  'P18-065': components['schemas']['OperatingPlanRequest'];
  'P18-066': never;
  'P18-067': components['schemas']['OperatingPlanRequest'];
  'P18-068': components['schemas']['OperatingTransitionRequest'];
  'P18-069': never;
  'P18-070': never;
  'P18-071': components['schemas']['OperatingTransitionRequest'];
  'P18-072': components['schemas']['OperatingTransitionRequest'];
  'P18-073': never;
  'P18-074': never;
  'P18-075': never;
  'P18-076': never;
  'P18-077': never;
  'P18-078': never;
  'P18-079': never;
  'P18-080': never;
  'P18-081': never;
  'P18-082': never;
  'P18-083': components['schemas']['OperatingCorrectionRequest'];
  'P18-084': components['schemas']['OperatingTransitionRequest'];
  'P18-085': never;
  'P18-086': components['schemas']['OperatingSettlementRequest'];
  'P18-087': never;
  'P18-088': never;
  'P18-089': never;
  'P18-090': components['schemas']['OperatingReversalRequest'];
  'P18-091': never;
  'P18-092': never;
  'P18-093': never;
  'P18-094': never;
  'P18-095': never;
  'P18-096': never;
  'P18-097': components['schemas']['HandoverCreateRequest'];
  'P18-098': never;
  'P18-099': components['schemas']['HandoverActionRequest'];
  'P18-100': components['schemas']['HandoverActionRequest'];
  'P18-101': components['schemas']['HandoverActionRequest'];
  'P18-102': never;
  'P18-103': never;
  'P18-104': never;
  'P18-105': never;
  'P18-106': never;
  'P18-107': never;
  'P18-108': never;
  'P18-109': never;
};

export type Phase18Request<T extends Phase18Endpoint> = Omit<Phase18Call, 'body'> &
  (Phase18Bodies[T] extends never ? { readonly body?: never } : { readonly body: Phase18Bodies[T] });

@Injectable({ providedIn: 'root' })
export class Phase18Api {
  private readonly http = inject(HttpClient);
  private readonly root = environment.apiBaseUrl;

  call<T extends Phase18Endpoint>(
    endpoint: T,
    request: Phase18Request<T>,
  ): Observable<Phase18Responses[T]> {
    const operation = PHASE18_OPERATIONS[endpoint];
    const url = this.url(operation.route, operation.pathParameters as readonly string[], request.path);
    const headers = operation.requiresIdempotencyKey
      ? this.idempotencyHeaders(request.idempotencyKey)
      : undefined;
    if (operation.route.endsWith('/export')) {
      return this.http.get(url, {
        params: this.params(request.query),
        headers,
        responseType: 'blob',
      }) as unknown as Observable<Phase18Responses[T]>;
    }

    const httpOptions = { params: this.params(request.query), headers };

    switch (operation.method) {
      case 'GET':
        return this.http.get<Phase18Responses[T]>(url, httpOptions);
      case 'POST':
        return this.http.post<Phase18Responses[T]>(url, (request as any).body, httpOptions);
      case 'PUT':
        return this.http.put<Phase18Responses[T]>(url, (request as any).body, httpOptions);
      case 'PATCH':
        return this.http.patch<Phase18Responses[T]>(url, (request as any).body, httpOptions);
    }
  }

  private url(
    route: string,
    parameters: readonly string[],
    values: Readonly<Record<string, string>> | undefined,
  ): string {
    const resolved = parameters.reduce((value, parameter) => {
      const identifier = values?.[parameter];
      if (!identifier?.trim()) throw new Error('Missing path parameter: ' + parameter);
      return value.replace('{' + parameter + '}', encodeURIComponent(identifier));
    }, route);
    return this.root + resolved;
  }

  private params(query: Phase18Query | undefined): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return params;
  }

  private idempotencyHeaders(key: string | undefined): HttpHeaders {
    if (!key?.trim()) throw new Error('Idempotency key required');
    return new HttpHeaders({ 'Idempotency-Key': key });
  }
}
