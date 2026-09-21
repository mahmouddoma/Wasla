import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private readonly STORAGE_KEY = 'wasla_workspace_sidebar_collapsed';

  readonly isCollapsed = signal<boolean>(this.loadInitialState());
  readonly isOpenMobile = signal<boolean>(false);

  private loadInitialState(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      return localStorage.getItem(this.STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  toggleCollapse(): void {
    const next = !this.isCollapsed();
    this.isCollapsed.set(next);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, String(next));
      } catch {}
    }
  }

  setCollapsed(collapsed: boolean): void {
    this.isCollapsed.set(collapsed);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, String(collapsed));
      } catch {}
    }
  }

  toggleMobile(): void {
    this.isOpenMobile.update((open) => !open);
  }

  closeMobile(): void {
    this.isOpenMobile.set(false);
  }
}
