import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SideDrawer } from './side-drawer';

describe('SideDrawer', () => {
  let component: SideDrawer;
  let fixture: ComponentFixture<SideDrawer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideDrawer],
    }).compileComponents();

    fixture = TestBed.createComponent(SideDrawer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
