import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error';

export interface ToastMessage {
  readonly id: number;
  readonly message: string;
  readonly kind: ToastKind;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly state = signal<ToastMessage[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 0;

  readonly messages = this.state.asReadonly();

  error(message: string, duration = 6000): void {
    this.show('error', message, duration);
  }

  success(message: string, duration = 4000): void {
    this.show('success', message, duration);
  }

  private show(kind: ToastKind, message: string, duration: number): void {
    const normalizedMessage = message.trim();
    if (!normalizedMessage) return;

    const duplicate = this.state().find(
      (toast) => toast.kind === kind && toast.message === normalizedMessage,
    );
    if (duplicate) this.dismiss(duplicate.id);

    const toast: ToastMessage = { id: ++this.nextId, message: normalizedMessage, kind };
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
