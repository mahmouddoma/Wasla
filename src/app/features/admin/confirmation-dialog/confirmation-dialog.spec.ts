import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationDialog } from './confirmation-dialog';
import { LanguageService } from '../../../core/i18n/language.service';

describe('ConfirmationDialog', () => {
  let fixture: ComponentFixture<ConfirmationDialog>;
  let component: ConfirmationDialog;

  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationDialog],
      providers: [LanguageService],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialog);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('dialogId', 'test-dialog');
    fixture.componentRef.setInput('title', 'تأكيد الحذف');
    fixture.componentRef.setInput('description', 'هل أنت متأكد من الحذف؟');
    fixture.componentRef.setInput('confirmLabel', 'نعم، احذف');
    fixture.detectChanges();
  });

  it('should create confirmation dialog and render title and description', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('تأكيد الحذف');
    expect(compiled.textContent).toContain('هل أنت متأكد من الحذف؟');
  });

  it('should emit dismissed when close is called and not busy', () => {
    let dismissedCalled = false;
    component.dismissed.subscribe(() => (dismissedCalled = true));

    (component as unknown as { close: () => void }).close();

    expect(dismissedCalled).toBe(true);
  });

  it('should not emit dismissed when close is called while busy', () => {
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();

    let dismissedCalled = false;
    component.dismissed.subscribe(() => (dismissedCalled = true));

    (component as unknown as { close: () => void }).close();

    expect(dismissedCalled).toBe(false);
  });
});
