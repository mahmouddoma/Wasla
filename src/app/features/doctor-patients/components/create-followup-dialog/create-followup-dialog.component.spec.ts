import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateFollowupDialogComponent } from './create-followup-dialog.component';
import { EncountersApi } from '../../../../domains/encounters';
import { ToastService } from '../../../../core/notifications/toast.service';
import { of, throwError } from 'rxjs';

describe('CreateFollowupDialogComponent', () => {
  let component: CreateFollowupDialogComponent;
  let fixture: ComponentFixture<CreateFollowupDialogComponent>;
  let encountersApi: { createFollowUp: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    encountersApi = {
      createFollowUp: vi.fn().mockReturnValue(of({ eligibilityId: 'el-1', validUntil: '2026-11-15', status: 'Available' })),
    };
    toast = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CreateFollowupDialogComponent],
      providers: [
        { provide: EncountersApi, useValue: encountersApi },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateFollowupDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates component', () => {
    expect(component).toBeTruthy();
  });

  it('submits valid follow-up and notifies toast', () => {
    fixture.componentRef.setInput('opened', true);
    fixture.componentRef.setInput('practiceId', 'prac-1');
    fixture.componentRef.setInput('encounterId', 'enc-1');
    component.validUntil.set('2026-11-15');

    const createdSpy = vi.fn();
    const closedSpy = vi.fn();
    component.created.subscribe(createdSpy);
    component.closed.subscribe(closedSpy);

    component.submit();

    expect(encountersApi.createFollowUp).toHaveBeenCalledWith('prac-1', 'enc-1', '2026-11-15');
    expect(toast.success).toHaveBeenCalledWith('تم إنشاء أهلية المتابعة الطبية بنجاح');
    expect(createdSpy).toHaveBeenCalledWith('el-1');
    expect(closedSpy).toHaveBeenCalled();
  });

  it('prevents creation on historical practice', () => {
    fixture.componentRef.setInput('opened', true);
    fixture.componentRef.setInput('practiceId', 'prac-1');
    fixture.componentRef.setInput('encounterId', 'enc-1');
    fixture.componentRef.setInput('isHistoricalPractice', true);

    component.submit();

    expect(encountersApi.createFollowUp).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('لا يمكن إنشاء أهلية متابعة لعيادة مغلقة');
  });

  it('handles API error gracefully', () => {
    encountersApi.createFollowUp.mockReturnValue(throwError(() => new Error('Server error')));
    fixture.componentRef.setInput('opened', true);
    fixture.componentRef.setInput('practiceId', 'prac-1');
    fixture.componentRef.setInput('encounterId', 'enc-1');

    component.submit();

    expect(toast.error).toHaveBeenCalledWith('تعذر إنشاء أهلية المتابعة. يرجى المحاولة لاحقاً');
    expect(component.submitting()).toBe(false);
  });
});

