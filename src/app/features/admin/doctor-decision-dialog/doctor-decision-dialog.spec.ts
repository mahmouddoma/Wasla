import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DoctorDecisionDialog } from './doctor-decision-dialog';
import { LanguageService } from '../../../core/i18n/language.service';

describe('DoctorDecisionDialog', () => {
  let fixture: ComponentFixture<DoctorDecisionDialog>;
  let component: DoctorDecisionDialog;

  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorDecisionDialog],
      providers: [LanguageService],
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorDecisionDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component with default approve action', () => {
    expect(component).toBeTruthy();
    expect(component.action()).toBe('approve');
  });

  it('should update computed labels when action changes to reject', () => {
    fixture.componentRef.setInput('action', 'reject');
    fixture.detectChanges();

    const title = (component as unknown as { title: () => string }).title();
    expect(title).toBeTruthy();
  });

  it('should update computed labels when action changes to suspend', () => {
    fixture.componentRef.setInput('action', 'suspend');
    fixture.detectChanges();

    const title = (component as unknown as { title: () => string }).title();
    expect(title).toBeTruthy();
  });

  it('should emit confirmed when valid form is submitted', async () => {
    let emittedValue = '';
    component.confirmed.subscribe((val) => (emittedValue = val));

    (component as unknown as { model: { set: (v: { value: string }) => void } }).model.set({
      value: '12345678901234',
    });
    fixture.detectChanges();

    const event = new Event('submit', { cancelable: true });
    await (component as unknown as { onSubmit: (e: Event) => Promise<void> }).onSubmit(event);

    expect(emittedValue).toBe('12345678901234');
  });

  it('should emit dismissed when close is called and not busy', () => {
    let dismissedCalled = false;
    component.dismissed.subscribe(() => (dismissedCalled = true));

    (component as unknown as { close: () => void }).close();

    expect(dismissedCalled).toBe(true);
  });
});
