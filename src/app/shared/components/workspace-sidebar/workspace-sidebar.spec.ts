import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WorkspaceSidebarComponent } from './workspace-sidebar';
import { SidebarService } from './sidebar.service';

describe('WorkspaceSidebarComponent', () => {
  let component: WorkspaceSidebarComponent;
  let fixture: ComponentFixture<WorkspaceSidebarComponent>;
  let sidebarService: SidebarService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceSidebarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceSidebarComponent);
    component = fixture.componentInstance;
    sidebarService = TestBed.inject(SidebarService);
    fixture.detectChanges();
  });

  it('should create the sidebar component', () => {
    expect(component).toBeTruthy();
  });

  it('should render navigation links based on area', () => {
    const el: HTMLElement = fixture.nativeElement;
    const links = el.querySelectorAll('.nav-item');
    expect(links.length).toBeGreaterThanOrEqual(4);
  });

  it('should respond to collapse toggle', () => {
    const initial = sidebarService.isCollapsed();
    sidebarService.toggleCollapse();
    fixture.detectChanges();
    expect(sidebarService.isCollapsed()).toBe(!initial);
  });

  it('should close mobile drawer when mobile close button is clicked', () => {
    sidebarService.toggleMobile();
    fixture.detectChanges();
    expect(sidebarService.isOpenMobile()).toBe(true);

    const closeBtn = fixture.nativeElement.querySelector('.btn-close-mobile') as HTMLButtonElement;
    closeBtn?.click();
    fixture.detectChanges();
    expect(sidebarService.isOpenMobile()).toBe(false);
  });
});
