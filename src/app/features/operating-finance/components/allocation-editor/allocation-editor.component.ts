import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import type { components } from '../../../../domains/phase18';

export interface AllocationDraft {
  readonly practiceId: string;
  readonly percentage: number;
}

@Component({
  selector: 'app-operating-allocation-editor',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './allocation-editor.component.html',
  styleUrl: './allocation-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllocationEditorComponent {
  readonly language = inject(LanguageService);
  readonly practices = input<readonly components['schemas']['ReportOption'][]>([]);
  readonly value = input<readonly AllocationDraft[]>([]);
  readonly disabled = input(false);
  readonly valueChange = output<AllocationDraft[]>();
  readonly total = computed(
    () => this.value().reduce((sum, item) => sum + Math.round(item.percentage * 100), 0) / 100,
  );
  add(): void {
    if (!this.disabled())
      this.valueChange.emit([...this.value(), { practiceId: '', percentage: 0 }]);
  }
  remove(index: number): void {
    if (!this.disabled()) this.valueChange.emit(this.value().filter((_, i) => i !== index));
  }
  update(index: number, field: 'practiceId' | 'percentage', value: string | number): void {
    if (this.disabled()) return;
    this.valueChange.emit(
      this.value().map((row, i) =>
        i !== index
          ? row
          : field === 'practiceId'
            ? { ...row, practiceId: String(value) }
            : { ...row, percentage: Number(value) },
      ),
    );
  }
}
