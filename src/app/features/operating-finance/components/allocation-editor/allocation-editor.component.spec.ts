import { TestBed } from '@angular/core/testing';
import { AllocationEditorComponent } from './allocation-editor.component';
describe('Operating allocation editor', () => {
  it('renders allocations, computes the total and emits independent row changes', async () => {
    const fixture = TestBed.createComponent(AllocationEditorComponent);
    fixture.componentRef.setInput('practices', [
      { id: 'p1', nameEn: 'Clinic A' },
      { id: 'p2', nameEn: 'Clinic B' },
    ]);
    fixture.componentRef.setInput('value', [
      { practiceId: 'p1', percentage: 60 },
      { practiceId: 'p2', percentage: 40 },
    ]);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.total()).toBe(100);
    expect(fixture.nativeElement.querySelectorAll('select')).toHaveLength(2);
    const emitted = vi.fn();
    component.valueChange.subscribe(emitted);
    component.update(0, 'percentage', 55);
    expect(emitted).toHaveBeenLastCalledWith([
      { practiceId: 'p1', percentage: 55 },
      { practiceId: 'p2', percentage: 40 },
    ]);
    expect(component.value()[0].percentage).toBe(60);
    component.remove(1);
    expect(emitted).toHaveBeenLastCalledWith([{ practiceId: 'p1', percentage: 60 }]);
    component.add();
    expect(emitted).toHaveBeenLastCalledWith(
      expect.arrayContaining([{ practiceId: '', percentage: 0 }]),
    );
  });
  it('blocks add/edit/remove while disabled', async () => {
    const fixture = TestBed.createComponent(AllocationEditorComponent);
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    const emitted = vi.fn();
    fixture.componentInstance.valueChange.subscribe(emitted);
    fixture.componentInstance.add();
    fixture.componentInstance.remove(0);
    fixture.componentInstance.update(0, 'practiceId', 'p1');
    expect(emitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
  });
});
