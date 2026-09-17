import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import {
  DoctorPracticeSchedule,
  WriteSchedulePeriodRequest,
} from '../../../../domains/doctor-practices';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { PracticeSchedule } from './practice-schedule';

describe('PracticeSchedule', () => {
  it('translates day labels immediately while keeping the server day codes', () => {
    const language = TestBed.inject(LanguageService);
    language.setLanguage('ar');
    const component = fixture.componentInstance;
    expect(component['days'][0]).toEqual({ value: 'Saturday', label: 'السبت', short: 'سبت' });
    language.setLanguage('en');
    expect(component['days'][0]).toEqual({ value: 'Saturday', label: 'Saturday', short: 'Sat' });
  });
  let fixture: ComponentFixture<PracticeSchedule>;
  let records: DoctorPracticeSchedule;
  const toast = { success: vi.fn(), error: vi.fn() };
  const api = {
    schedule: vi.fn(() => of(records)),
    effectiveSchedule: vi.fn(() => of([])),
    addPeriod: vi.fn((practiceId: string, request: WriteSchedulePeriodRequest) => {
      const period = { ...request, id: 'period-1', rowVersion: 'AQID' };
      records = { ...records, periods: [...records.periods, period] };
      return of(period);
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    records = { periods: [], exceptions: [] };
    TestBed.configureTestingModule({
      imports: [PracticeSchedule],
      providers: [
        { provide: DoctorPracticesApi, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(PracticeSchedule);
    fixture.componentRef.setInput('practiceId', 'practice-1');
    fixture.componentRef.setInput('canManage', true);
    await fixture.whenStable();
    await Promise.resolve();
    await fixture.whenStable();
  });

  async function save(start: string, end: string): Promise<void> {
    fixture.componentInstance['openAddPeriodModal']();
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const pickers = element.querySelectorAll<HTMLElement>('.time-select-inputs');
    for (const [index, value] of [start, end].entries()) {
      if (!value) continue;
      const [hour, minute] = value.split(':');
      const numericHour = Number(hour);
      const selects = pickers[index].querySelectorAll<HTMLSelectElement>('select');
      for (const [part, selection] of [String(numericHour % 12 || 12), minute].entries()) {
        selects[part].value = selection;
        selects[part].dispatchEvent(new Event('change', { bubbles: true }));
      }
      pickers[index].querySelectorAll<HTMLButtonElement>('.toggle-pill')[numericHour >= 12 ? 0 : 1].click();
    }
    if (!end) {
      const duration = element.querySelector<HTMLInputElement>('input[type="number"]')!;
      duration.value = '0';
      duration.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await fixture.whenStable();
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }

  it('shows validation feedback and a toast for an invalid duration', async () => {
    await save('17:00', '');
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(api.addPeriod).not.toHaveBeenCalled();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('form [role="alert"]')?.textContent,
    ).toContain('AM/PM');
  });

  it('rejects an end time before the start time with visible feedback', async () => {
    await save('17:00', '10:00');
    expect(api.addPeriod).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('وقت النهاية يجب أن يكون بعد وقت البداية.');
  });

  it('sends a complete period, refreshes the list and confirms success', async () => {
    await save('17:00', '21:00');
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('تمت إضافة فترة العمل.'));
    await fixture.whenStable();
    expect(api.addPeriod).toHaveBeenCalledWith('practice-1', {
      dayOfWeek: 'Sunday',
      startTime: '17:00',
      endTime: '21:00',
      slotDurationMinutes: 30,
    });
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.schedule-record')?.textContent,
    ).toContain('17:00');
  });

  it('shows an error toast when the save request fails', async () => {
    api.addPeriod.mockImplementationOnce(() => throwError(() => new Error('Network failure')));
    await save('17:00', '21:00');
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('keeps the dialog open while choosing a preset and changing hours and minutes', async () => {
    fixture.componentInstance['openAddPeriodModal']('Thursday');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const overlay = element.querySelector<HTMLElement>('.schedule-overlay.is-open')!;
    const dialog = overlay.querySelector<HTMLElement>('.schedule-dialog')!;
    const preset = dialog.querySelector<HTMLButtonElement>('.preset-chip')!;
    preset.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    preset.click();
    const selects = dialog.querySelectorAll<HTMLSelectElement>('.time-select-inputs select');
    for (const [index, value] of ['6', '15', '9', '30'].entries()) {
      selects[index].dispatchEvent(new Event('pointerdown', { bubbles: true }));
      selects[index].value = value;
      selects[index].dispatchEvent(new Event('change', { bubbles: true }));
    }
    await fixture.whenStable();
    expect(overlay.classList.contains('is-open')).toBe(true);
    expect(dialog.classList.contains('modal-dialog')).toBe(false);
    expect(
      Array.from(dialog.querySelectorAll('.time-preview-badge'), (node) =>
        node.textContent?.trim(),
      ),
    ).toEqual(['06:15 م', '09:30 م']);
    expect(api.addPeriod).not.toHaveBeenCalled();
    dialog.querySelector<HTMLButtonElement>('.btn-modal-save')!.click();
    await vi.waitFor(() =>
      expect(api.addPeriod).toHaveBeenCalledWith('practice-1', {
        dayOfWeek: 'Thursday',
        startTime: '18:15',
        endTime: '21:30',
        slotDurationMinutes: 30,
      }),
    );
  });

  it('closes either dialog only when pressing directly on its backdrop', async () => {
    for (const open of ['openAddPeriodModal', 'openAddExceptionModal'] as const) {
      fixture.componentInstance[open]();
      await fixture.whenStable();
      const element: HTMLElement = fixture.nativeElement;
      const overlay = element.querySelector<HTMLElement>('.schedule-overlay.is-open')!;
      overlay
        .querySelector('.schedule-dialog')!
        .dispatchEvent(new Event('pointerdown', { bubbles: true }));
      await fixture.whenStable();
      expect(overlay.classList.contains('is-open')).toBe(true);
      overlay.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      await fixture.whenStable();
      expect(overlay.isConnected).toBe(false);
    }
  });

  it('does not render closed dialogs or controls created only for tests', async () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="dialog"]')).toBeNull();
    fixture.componentInstance['openAddPeriodModal']();
    await fixture.whenStable();
    expect(element.querySelectorAll('[role="dialog"]').length).toBe(1);
    expect(element.querySelector('input[type="time"]')).toBeNull();
    element.querySelector('.schedule-dialog')!.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true,
    }));
    await fixture.whenStable();
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('shows the actual initial hours and accepts hour one on the first change', async () => {
    fixture.componentInstance['openAddPeriodModal']();
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const selects = element.querySelectorAll<HTMLSelectElement>('.time-select-inputs select');
    expect(Array.from(selects, (select) => select.value)).toEqual(['5', '00', '10', '00']);
    selects[0].value = '1';
    selects[0].dispatchEvent(new Event('change', { bubbles: true }));
    selects[2].value = '1';
    selects[2].dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(
      Array.from(element.querySelectorAll('.time-preview-badge'), (node) =>
        node.textContent?.trim(),
      ),
    ).toEqual(['01:00 م', '01:00 م']);
  });

  it('synchronizes the selected options when opening an existing period and applying presets', async () => {
    fixture.componentInstance['editPeriod']({
      id: 'period-1',
      dayOfWeek: 'Saturday',
      startTime: '13:15',
      endTime: '20:45',
      slotDurationMinutes: 20,
      rowVersion: 'AQID',
    });
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const values = () =>
      Array.from(
        element.querySelectorAll<HTMLSelectElement>('.time-select-inputs select'),
        (select) => select.value,
      );
    expect(values()).toEqual(['1', '15', '8', '45']);
    element.querySelectorAll<HTMLButtonElement>('.preset-chip')[2].click();
    await fixture.whenStable();
    expect(values()).toEqual(['9', '00', '2', '00']);
  });
});
