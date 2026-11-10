import { UserType } from './auth.models';

const segment = '[A-Za-z0-9-]+';
const routes: readonly { actor: UserType; path: RegExp; query: readonly string[] }[] = [
  { actor: 'Patient', path: new RegExp(`^/doctors(?:/${segment})?$`), query: ['search', 'specializationId', 'governorateId', 'cityId', 'areaId', 'practiceId', 'date', 'time', 'pageNumber', 'pageSize'] },
  { actor: 'Patient', path: /^\/patient\/(reservations|tickets|family|medical-record|medical-access|profile|dependent-records)$/, query: ['practiceId', 'view', 'pageNumber', 'pageSize'] },
  { actor: 'Doctor', path: new RegExp(`^/doctor/(queue|reservations|practices|medical-sharing|patients(?:/${segment})?|encounters|profile|finance)$`), query: ['practiceId', 'ticketId', 'encounterId', 'view', 'fromDate', 'toDate', 'status', 'pageNumber', 'pageSize'] },
  { actor: 'Reception', path: /^\/reception\/(queue|reservations|patients|family-requests|finance)$/, query: ['practiceId', 'view', 'fromDate', 'toDate', 'status', 'pageNumber', 'pageSize'] },
  { actor: 'SuperAdmin', path: new RegExp(`^/admin/(reservations|archive-operations|archives|audit|subscriptions|family-review|family-relationship-requests(?:/${segment})?|family-medical-access-requests|family-medical-eligibilities|patient-duplicates|doctors(?:/${segment})?|roles(?:/${segment})?|medical-specializations(?:/${segment})?)$`), query: ['status', 'pageNumber', 'pageSize'] },
];

/** A return target is a destination only; route guards remain authoritative for access. */
export function resolveReturnUrl(value: string | null | undefined, actor?: UserType): string | null {
  if (!value || value.length > 4096 || !value.startsWith('/') || value.startsWith('//')) return null;
  if (/[\\\u0000-\u001f\u007f#]/.test(value)) return null;
  const queryStart = value.indexOf('?');
  const path = queryStart < 0 ? value : value.slice(0, queryStart);
  // Route paths use literal local segments; reject encoded separators and normalization bypasses.
  if (/[\s%;:]/.test(path) || path.includes('//') || path.split('/').some(part => part === '.' || part === '..')) return null;
  const route = routes.find(route => (!actor || route.actor === actor) && route.path.test(path));
  if (!route) return null;
  const query = new URLSearchParams(queryStart < 0 ? '' : value.slice(queryStart + 1));
  const safe = new URLSearchParams();
  for (const [key, item] of query) {
    if (!route.query.includes(key) || /[\\\u0000-\u001f\u007f]/.test(item)) continue;
    if (safe.has(key)) return null;
    safe.set(key, item);
  }
  const suffix = safe.toString();
  return path + (suffix ? `?${suffix}` : '');
}
