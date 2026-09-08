import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  DoctorSpecializationSelection,
  MedicalSpecializationOption,
} from '../../core/doctor-profile/doctor-profile.models';

@Component({
  selector: 'app-specialization-selector',
  templateUrl: './specialization-selector.html',
  styleUrl: './specialization-selector.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecializationSelector {
  readonly options = input.required<readonly MedicalSpecializationOption[]>();
  readonly selected = input.required<readonly DoctorSpecializationSelection[]>();
  readonly disabled = input(false);
  readonly selectionChange = output<DoctorSpecializationSelection[]>();

  protected readonly selectedIds = computed(
    () => new Set(this.selected().map((item) => item.medicalSpecializationId)),
  );

  protected isPrimary(id: string): boolean {
    return this.selected().some((item) => item.medicalSpecializationId === id && item.isPrimary);
  }

  protected toggle(id: string, event: Event): void {
    if (this.disabled()) return;
    const checked = (event.currentTarget as HTMLInputElement).checked;
    const current = [...this.selected()];
    if (checked) {
      if (current.some((item) => item.medicalSpecializationId === id)) return;
      this.selectionChange.emit([
        ...current,
        { medicalSpecializationId: id, isPrimary: current.length === 0 },
      ]);
      return;
    }
    const remaining = current.filter((item) => item.medicalSpecializationId !== id);
    if (remaining.length && !remaining.some((item) => item.isPrimary)) {
      remaining[0] = { ...remaining[0], isPrimary: true };
    }
    this.selectionChange.emit(remaining);
  }

  protected makePrimary(id: string): void {
    if (this.disabled() || !this.selectedIds().has(id)) return;
    this.selectionChange.emit(
      this.selected().map((item) => ({
        ...item,
        isPrimary: item.medicalSpecializationId === id,
      })),
    );
  }
}
