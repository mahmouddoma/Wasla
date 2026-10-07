import { TestBed } from '@angular/core/testing';
import { ReservationEditorComponent } from './reservation-editor.component';
import { metadataFixture, patientFixture } from '../../reservation-test-fixtures';
describe('ReservationEditorComponent', () => {
  afterEach(() => localStorage.removeItem('wasla_lang'));
  function create(mode: 'create' | 'cancel' | 'reschedule' | 'restore') {
    const f = TestBed.createComponent(ReservationEditorComponent);
    f.componentRef.setInput('mode', mode);
    f.detectChanges();
    return f;
  }
  beforeEach(() => TestBed.configureTestingModule({ imports: [ReservationEditorComponent] }));
  it('requires the comment designated by server metadata', () => {
    const f = create('cancel');
    f.componentRef.setInput('reasons', metadataFixture.patientCancellationReasons);
    f.componentInstance.model.update((m) => ({ ...m, reasonCode: 'Other' }));
    f.detectChanges();
    expect(f.componentInstance.valid()).toBe(false);
    f.componentInstance.model.update((m) => ({ ...m, comment: 'Changed plans' }));
    expect(f.componentInstance.valid()).toBe(true);
    const emit = vi.spyOn(f.componentInstance.save, 'emit');
    f.componentInstance.submit(new Event('submit'));
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ reasonCode: 'Other', comment: 'Changed plans' }),
    );
  });
  it('requires consent and reason for a provider reschedule', () => {
    const f = create('reschedule');
    for (const [key, value] of Object.entries({
      provider: true,
      date: '2026-09-20',
      time: '17:00',
    }))
      f.componentRef.setInput(key, value);
    expect(f.componentInstance.valid()).toBe(false);
    f.componentInstance.model.update((m) => ({
      ...m,
      patientConsentConfirmed: true,
      reason: 'Patient requested change',
    }));
    expect(f.componentInstance.valid()).toBe(true);
  });
  it('does not submit a selected patient without server booking options', () => {
    const f = create('create');
    f.componentRef.setInput('patients', [patientFixture]);
    f.componentInstance.model.update((m) => ({ ...m, patientId: 'p1' }));
    expect(f.componentInstance.valid()).toBe(false);
  });
  it('blocks confirmation while the request is pending', () => {
    const f = create('restore');
    f.componentRef.setInput('busy', true);
    f.detectChanges();
    expect(f.nativeElement.querySelector('fieldset').disabled).toBe(true);
    const emit = vi.spyOn(f.componentInstance.save, 'emit');
    f.componentInstance.submit(new Event('submit'));
    expect(emit).not.toHaveBeenCalled();
  });
  it('shows structured Reception search and hides manual patient ID and premature date fields', () => {
    const f = create('create');
    f.componentRef.setInput('reception', true);
    f.componentRef.setInput('canSearch', true);
    f.detectChanges();
    expect(f.nativeElement.querySelector('app-reservation-patient-search')).toBeTruthy();
    expect(f.nativeElement.querySelector('select')).toBeNull();
    expect(f.nativeElement.querySelector('input[placeholder]')).toBeNull();
    f.componentRef.setInput('patientId', 'internal-id');
    f.componentRef.setInput('selectedPatient', { nameAr: 'Synthetic', nameEn: 'Synthetic' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('.selected-patient').textContent).toContain('Synthetic');
    expect(f.nativeElement.textContent).not.toContain('internal-id');
    expect(f.nativeElement.querySelector('select')).toBeTruthy();
  });
  it('uses action-specific Reception labels and retains entered notes after a failed save', () => {
    const f = create('cancel');
    f.componentRef.setInput('reception', true);
    f.componentInstance.model.update((m) => ({ ...m, comment: 'Keep this comment' }));
    f.detectChanges();
    expect(f.componentInstance.actionLabel()).toBe('reception.appointments.cancel');
    f.componentRef.setInput('busy', true);
    f.detectChanges();
    f.componentRef.setInput('busy', false);
    f.detectChanges();
    expect(f.componentInstance.model().comment).toBe('Keep this comment');
  });
});
