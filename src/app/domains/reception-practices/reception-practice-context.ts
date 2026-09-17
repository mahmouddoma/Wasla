import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../core/auth/api-errors';
import { ReceptionPractice } from './reception-practice.models';
import { ReceptionPracticesApi } from './reception-practices-api';

/** Reception-only UI context; selecting a practice never changes authentication. */
@Injectable({ providedIn: 'root' })
export class ReceptionPracticeContext {
  private readonly api = inject(ReceptionPracticesApi);
  private readonly items = signal<ReceptionPractice[]>([]);
  private readonly selectedId = signal('');
  private generation = 0;
  private pending: Promise<void> | null = null;
  readonly practices = this.items.asReadonly();
  readonly currentPracticeId = this.selectedId.asReadonly();
  readonly isLoading = signal(false);
  readonly messages = signal<string[]>([]);
  readonly currentPractice = computed(
    () => this.items().find((p) => p.id === this.selectedId()) ?? null,
  );

  allows(code: string): boolean {
    return this.currentPractice()?.permissionCodes.includes(code) ?? false;
  }

  select(id: string): void {
    this.selectedId.set(this.items().some((p) => p.id === id) ? id : '');
  }

  clear(): void {
    this.generation++;
    this.pending = null;
    this.items.set([]);
    this.selectedId.set('');
    this.messages.set([]);
    this.isLoading.set(false);
  }

  refresh(): Promise<void> {
    if (this.pending) return this.pending;
    const generation = this.generation;
    this.isLoading.set(true);
    this.messages.set([]);
    this.pending = firstValueFrom(this.api.list())
      .then((items) => {
        if (generation !== this.generation) return;
        const active = items.filter((p) => p.isActive);
        this.items.set(active);
        if (!active.some((p) => p.id === this.selectedId())) {
          this.selectedId.set(active.length === 1 ? active[0].id : '');
        }
      })
      .catch((error: unknown) => {
        if (generation !== this.generation) return;
        this.items.set([]);
        this.selectedId.set('');
        const parsed = parseApiErrors(error);
        this.messages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
      })
      .finally(() => {
        if (generation !== this.generation) return;
        this.isLoading.set(false);
        this.pending = null;
      });
    return this.pending;
  }
}
