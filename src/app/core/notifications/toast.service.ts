import { Injectable, inject, signal } from '@angular/core';
import { LanguageService } from '../i18n/language.service';

export type ToastKind = 'success' | 'error';

export interface ToastMessage {
  readonly id: number;
  readonly message: string;
  readonly kind: ToastKind;
  readonly title?: string;
  readonly duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly language = inject(LanguageService);
  private readonly state = signal<ToastMessage[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 0;

  readonly messages = this.state.asReadonly();

  error(message: string, duration = 6500, title?: string): void {
    this.show('error', message, duration, title);
  }

  success(message: string, duration = 4500, title?: string): void {
    this.show('success', message, duration, title);
  }

  private show(kind: ToastKind, message: string, duration: number, title?: string): void {
    const rawMessage = (message ?? '').trim();
    if (!rawMessage) return;

    const normalizedMessage = this.language.t(rawMessage).trim() || rawMessage;
    const normalizedTitle = title ? this.language.t(title).trim() : undefined;

    const duplicate = this.state().find(
      (toast) => toast.kind === kind && toast.message === normalizedMessage,
    );
    if (duplicate) this.dismiss(duplicate.id);

    const toast: ToastMessage = {
      id: ++this.nextId,
      message: normalizedMessage,
      kind,
      title: normalizedTitle,
      duration,
    };
    this.state.update((messages) => [...messages, toast]);
    this.timers.set(
      toast.id,
      setTimeout(() => this.dismiss(toast.id), duration),
    );
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.state.update((messages) => messages.filter((message) => message.id !== id));
  }
}
