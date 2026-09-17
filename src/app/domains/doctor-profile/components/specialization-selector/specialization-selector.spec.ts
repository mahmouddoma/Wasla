import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpecializationSelector } from './specialization-selector';

describe('SpecializationSelector', () => {
  let fixture: ComponentFixture<SpecializationSelector>;
  const options=[{id:'a',nameAr:'باطنة',nameEn:'Internal medicine'},{id:'b',nameAr:'أطفال',nameEn:'Pediatrics'}];
  const changed=vi.fn();
  beforeEach(async () => {
    changed.mockClear();
    TestBed.configureTestingModule({imports:[SpecializationSelector]});
    fixture=TestBed.createComponent(SpecializationSelector);
    fixture.componentRef.setInput('options',options);
    fixture.componentRef.setInput('selected',[]);
    fixture.componentInstance.selectionChange.subscribe(changed);
    await fixture.whenStable();
  });
  it('renders options and makes the first selected item primary', () => {
    expect(fixture.componentInstance).toBeTruthy();
    const element: HTMLElement=fixture.nativeElement;
    expect(element.querySelectorAll('.specialty-card')).toHaveLength(2);
    element.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    expect(changed).toHaveBeenCalledWith([{medicalSpecializationId:'a',isPrimary:true}]);
  });
  it('filters by English name through the search control', async () => {
    const element: HTMLElement=fixture.nativeElement;
    const input=element.querySelector<HTMLInputElement>('input[type="text"]')!;
    input.value='pediatrics';input.dispatchEvent(new Event('input',{bubbles:true}));
    await fixture.whenStable();
    expect(element.querySelectorAll('.specialty-card')).toHaveLength(1);
    expect(element.querySelector('.name-ar')?.textContent).toContain('أطفال');
    element.querySelector<HTMLButtonElement>('.btn-clear')!.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('.specialty-card')).toHaveLength(2);
  });
  it('promotes a remaining selection after the primary item is removed', async () => {
    fixture.componentRef.setInput('selected',[{medicalSpecializationId:'a',isPrimary:true},{medicalSpecializationId:'b',isPrimary:false}]);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    expect(changed).toHaveBeenCalledWith([{medicalSpecializationId:'b',isPrimary:true}]);
  });
  it('emits exactly one primary when the user changes it', async () => {
    fixture.componentRef.setInput('selected',[{medicalSpecializationId:'a',isPrimary:true},{medicalSpecializationId:'b',isPrimary:false}]);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.btn-make-primary')!.click();
    expect(changed).toHaveBeenCalledWith([{medicalSpecializationId:'a',isPrimary:false},{medicalSpecializationId:'b',isPrimary:true}]);
  });
  it('prevents disabled interactions from changing selections', async () => {
    fixture.componentRef.setInput('disabled',true);
    await fixture.whenStable();
    const input=(fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(input.disabled).toBe(true);
    input.click();
    fixture.componentInstance['makePrimary']('a');
    expect(changed).not.toHaveBeenCalled();
  });
});
