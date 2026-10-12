import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../core/auth/api-errors';
import { ReceptionPractice } from './reception-practice.models';
import { ReceptionPracticesApi } from './reception-practices-api';

const PRACTICE_STORAGE_KEY = 'wasla_reception_practice_id';

function getStoredPracticeId(): string {
  try {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem(PRACTICE_STORAGE_KEY) || ''
      : '';
  } catch {
    return '';
  }
}

function setStoredPracticeId(id: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      if (id) {
        localStorage.setItem(PRACTICE_STORAGE_KEY, id);
      } else {
        localStorage.removeItem(PRACTICE_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage restrictions
  }
}

/** Reception-only UI context; selecting a practice never changes authentication. */
@Injectable({ providedIn: 'root' })
export class ReceptionPracticeContext {
  private readonly api = inject(ReceptionPracticesApi);
  private readonly items = signal<ReceptionPractice[]>([]);
  private readonly selectedId = signal('');
  private generation = 0;
  private loaded = false;
  private pending: Promise<void> | null = null;
  readonly practices = this.items.asReadonly();
  readonly currentPracticeId = this.selectedId.asReadonly();
  readonly isLoading = signal(false);
  readonly messages = signal<string[]>([]);
  readonly currentPractice = computed(
    () => this.items().find((p) => p.id === this.selectedId()) ?? null,
  );

  allows(code: string): boolean {
    return this.allowsInPractice(this.selectedId(), code);
  }

  allowsInPractice(practiceId: string, permission: string): boolean {
    return this.items().some(
      (p) => p.id === practiceId && p.isActive && p.permissionCodes.includes(permission),
    );
  }

  practicesWithPermission(permission: string): ReceptionPractice[] {
    return this.items().filter((p) => this.allowsInPractice(p.id, permission));
  }

  hasAnyPracticeWithPermission(permission: string): boolean {
    return this.practicesWithPermission(permission).length > 0;
  }

  hasAnyPracticeWithAnyPermission(permissions: readonly string[]): boolean {
    return permissions.some((permission) => this.hasAnyPracticeWithPermission(permission));
  }

  ensureLoaded(): Promise<void> {
    return this.loaded ? Promise.resolve() : this.refresh();
  }

  select(id: string): void {
    const valid = this.items().some((p) => p.id === id);
    const chosen = valid ? id : '';
    this.selectedId.set(chosen);
    setStoredPracticeId(chosen);
  }

  clear(): void {
    this.generation++;
    this.loaded = false;
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
        this.loaded = true;
        const current = this.selectedId();
        const stored = getStoredPracticeId();
        if (current && active.some((p) => p.id === current)) {
          // Keep current active selection
          setStoredPracticeId(current);
        } else if (stored && active.some((p) => p.id === stored)) {
          this.selectedId.set(stored);
        } else if (active.length === 1) {
          this.selectedId.set(active[0].id);
          setStoredPracticeId(active[0].id);
        } else {
          this.selectedId.set('');
          setStoredPracticeId('');
        }
      })
      .catch((error: unknown) => {
        if (generation !== this.generation) return;
        this.items.set([]);
        this.selectedId.set('');
        setStoredPracticeId('');
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
