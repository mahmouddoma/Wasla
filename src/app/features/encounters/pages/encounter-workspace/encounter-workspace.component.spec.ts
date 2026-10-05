import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageService } from '../../../../core/i18n/language.service';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import { EncountersApi } from '../../../../domains/encounters';
import { encounterFixture } from '../../encounter-test-fixtures';
import { EncounterWorkspaceComponent } from './encounter-workspace.component';

describe('Encounter workspace UI', () => {
  afterEach(() => localStorage.removeItem('wasla_lang'));
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EncounterWorkspaceComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { actor: 'Doctor' }, queryParamMap: { get: () => null } } },
        },
        { provide: AuthSession, useValue: { hasPermission: () => true } },
        { provide: DoctorPracticesApi, useValue: { list: () => of([]) } },
        { provide: EncountersApi, useValue: { list: () => of({ items: [], totalCount: 0 }) } },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('en');
  });
  it('creates with a bilingual empty-state illustration and retry action', async () => {
    const fixture = TestBed.createComponent(EncounterWorkspaceComponent);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('img.state-empty-illustration')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('No visits found');
  });
  it('renders notes and diagnosis controls in the shared drawer, completed visits are read-only', async () => {
    const fixture = TestBed.createComponent(EncounterWorkspaceComponent);
    await fixture.whenStable();
    fixture.componentInstance.store.detail.set({ ...encounterFixture, status: 'Completed' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-side-drawer')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('textarea').readOnly).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Complete visit');
  });
  it('submits edits through the workflow and switches layout with language', async () => {
    const fixture = TestBed.createComponent(EncounterWorkspaceComponent);
    await fixture.whenStable();
    fixture.componentInstance.store.detail.set(encounterFixture);
    fixture.detectChanges();
    await fixture.whenStable();
    const save = vi
      .spyOn(fixture.componentInstance.store, 'saveDiagnosis')
      .mockReturnValue(undefined);
    fixture.componentInstance.model.update((m) => ({
      ...m,
      displayText: 'Diagnosis',
      notes: 'Notes',
    }));
    fixture.componentInstance.saveDiagnosis(new Event('submit'));
    expect(save).toHaveBeenCalledWith(
      { type: 'Primary', displayText: 'Diagnosis', notes: 'Notes' },
      '',
    );
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
  });

  it('WAS-202 supports multi-change clinical record amendments on completed encounters without edit/delete controls', async () => {
    const fixture = TestBed.createComponent(EncounterWorkspaceComponent);
    await fixture.whenStable();
    fixture.componentInstance.store.detail.set({
      ...encounterFixture,
      status: 'Completed',
      diagnoses: [
        {
          id: 'diag-1',
          type: 'Primary',
          displayText: 'Old Diagnosis',
          notes: 'Old Notes',
          recordedAtUtc: '2026-10-01T10:00:00Z',
          recordedByName: 'Dr. Ahmed',
        },
      ],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const createAmendmentSpy = vi
      .spyOn(fixture.componentInstance.store, 'createAmendment')
      .mockResolvedValue(true);

    // Initial state: drawer open, Completed encounter, canAmend is true
    expect(fixture.nativeElement.querySelector('[data-test="btn-start-amendment"]')).toBeTruthy();

    // Start amendment
    fixture.componentInstance.startAmendment();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.showAmendmentForm()).toBe(true);

    // Mandatory reason
    fixture.componentInstance.amendmentReason.set('Clinical update and correction');

    // Stage note change
    fixture.componentInstance.amendNotes.set(true);
    fixture.componentInstance.amendedNotes.set('Amended clinical observation notes');

    // Stage diagnosis addition
    fixture.componentInstance.newDiagnosisType.set('Secondary');
    fixture.componentInstance.newDiagnosisText.set('Staged New Diagnosis');
    fixture.componentInstance.stageAddDiagnosis();

    // Stage diagnosis void/removal
    fixture.componentInstance.toggleVoidDiagnosis('diag-1');

    fixture.detectChanges();

    // Verify staged changes assembled correctly
    expect(fixture.componentInstance.stagedChanges().length).toBe(3);
    expect(fixture.componentInstance.canSubmitAmendment()).toBe(true);

    // Submit amendment
    await fixture.componentInstance.submitAmendment();

    expect(createAmendmentSpy).toHaveBeenCalledWith(
      'Clinical update and correction',
      expect.arrayContaining([
        { changeType: 'ClinicalNotes', notes: 'Amended clinical observation notes' },
        {
          changeType: 'Diagnosis',
          action: 'Add',
          diagnosis: { type: 'Secondary', displayText: 'Staged New Diagnosis', notes: '' },
        },
        { changeType: 'Diagnosis', action: 'Remove', diagnosisId: 'diag-1' },
      ]),
    );

    // Verify amendment history contains no edit or delete controls (Acceptance Criteria: no edit/delete amendment UI)
    const historyList = fixture.nativeElement.querySelector('.amendments-history-list');
    if (historyList) {
      expect(historyList.querySelector('button.edit')).toBeNull();
      expect(historyList.querySelector('button.delete')).toBeNull();
    }
  });
});
