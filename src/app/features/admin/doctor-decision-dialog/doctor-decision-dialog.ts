import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormField, form, submit, validate } from '@angular/forms/signals';

export type DoctorDecisionAction = 'approve' | 'reject' | 'suspend';

@Component({
  selector: 'app-doctor-decision-dialog',
  imports: [FormField],
  templateUrl: './doctor-decision-dialog.html',
  styleUrl: './doctor-decision-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorDecisionDialog {
  action = input<DoctorDecisionAction>('approve');
  opened = input(false);
  busy = input(false);
  messages = input<readonly string[]>([]);
  fieldError = input('');
  confirmed = output<string>();
  dismissed = output<void>();

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  protected readonly model = signal({ value: '' });
  protected readonly decisionForm = form(this.model, (field) => {
    validate(field.value, ({ value }) => {
      const normalized = value().trim();
      if (!normalized) {
        return {
          kind: 'required',
          message:
            this.action() === 'approve'
              ? 'أدخل الرقم القومي للطبيب.'
              : this.action() === 'reject'
                ? 'أدخل سبب الرفض.'
                : 'أدخل سبب تعليق الحساب.',
        };
      }
      const maximum = this.action() === 'approve' ? 100 : 1000;
      return value().length <= maximum
        ? undefined
        : { kind: 'maxLength', message: `الحد الأقصى ${maximum} حرف.` };
    });
  });
  protected readonly headingId = computed(() => `${this.action()}-doctor-dialog-title`);
  protected readonly title = computed(
    () =>
      ({
        approve: 'اعتماد حساب الطبيب',
        reject: 'رفض طلب الطبيب',
        suspend: 'تعليق حساب الطبيب',
      })[this.action()],
  );
  protected readonly description = computed(
    () =>
      ({
        approve: 'أدخل الرقم القومي بعد التأكد من المستندات. سيصبح الحساب معتمدًا فور نجاح الطلب.',
        reject: 'اكتب سببًا واضحًا؛ سيظهر هذا السبب للطبيب في شاشة متابعة طلبه.',
        suspend: 'اكتب سبب التعليق بوضوح. لن يُعامل الطبيب كحساب تشغيلي معتمد بعد نجاح الطلب.',
      })[this.action()],
  );
  protected readonly fieldLabel = computed(
    () => ({ approve: 'الرقم القومي', reject: 'سبب الرفض', suspend: 'سبب التعليق' })[this.action()],
  );
  protected readonly confirmLabel = computed(
    () =>
      ({ approve: 'تأكيد الاعتماد', reject: 'تأكيد الرفض', suspend: 'تأكيد التعليق' })[
        this.action()
      ],
  );
  protected readonly maximumLength = computed(() => (this.action() === 'approve' ? 100 : 1000));

  constructor() {
    effect(() => {
      const opened = this.opened();
      const dialog = this.dialogElement();
      if (!dialog) return;
      if (opened && !dialog.open) {
        this.model.set({ value: '' });
        this.decisionForm().reset();
        dialog.showModal();
        queueMicrotask(() =>
          this.host.nativeElement
            .querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
            ?.focus(),
        );
      } else if (!opened && dialog.open) {
        dialog.close();
      }
    });
  }

  protected close(): void {
    if (this.busy()) return;
    this.dialogElement()?.close();
    this.dismissed.emit();
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.decisionForm, async () => {
      if (!this.busy()) this.confirmed.emit(this.model().value.trim());
    });
  }

  protected onCancel(event: Event): void {
    if (this.busy()) {
      event.preventDefault();
      return;
    }
    this.dismissed.emit();
  }

  private dialogElement(): HTMLDialogElement | null {
    return this.host.nativeElement.querySelector('dialog');
  }
}
