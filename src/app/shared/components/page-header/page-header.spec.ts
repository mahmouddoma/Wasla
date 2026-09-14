import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
  let component: PageHeader;
  let fixture: ComponentFixture<PageHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageHeader],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeader);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('heading', 'عنوان تجريبي');
    fixture.componentRef.setInput('description', 'وصف تجريبي');
    fixture.componentRef.setInput('icon', 'admins');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit actionClicked when action button is pressed', () => {
    let clicked = false;
    component.actionClicked.subscribe(() => (clicked = true));

    fixture.componentRef.setInput('actionLabel', 'إضافة مشرف');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '.page-header__action-btn',
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    expect(clicked).toBe(true);
  });
});
