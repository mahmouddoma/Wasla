import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ReceptionPractice,
  ReceptionPracticeResponse,
  ReceptionPracticesResponse,
} from './reception-practice.models';

@Injectable({ providedIn: 'root' })
export class ReceptionPracticesApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/v1/reception/practices`;

  list(): Observable<ReceptionPractice[]> {
    return this.http.get<ReceptionPracticesResponse>(this.url).pipe(
      map((response) => {
        const items = Array.isArray(response) ? response : response.items;
        return items
          .map(normalizePractice)
          .filter((practice): practice is ReceptionPractice => practice !== null);
      }),
    );
  }
}

function normalizePractice(item: ReceptionPracticeResponse): ReceptionPractice | null {
  const id = item.doctorPracticeId ?? item.practiceId ?? item.id;
  if (!id) return null;

  return {
    id,
    nameAr: item.practiceNameAr ?? item.nameAr ?? 'عيادة بدون اسم',
    nameEn: item.practiceNameEn ?? item.nameEn ?? null,
    doctorNameAr: item.doctorNameAr ?? null,
    doctorNameEn: item.doctorNameEn ?? null,
    isActive: item.isActive ?? true,
    permissionCodes: item.permissionCodes ?? [],
  };
}
