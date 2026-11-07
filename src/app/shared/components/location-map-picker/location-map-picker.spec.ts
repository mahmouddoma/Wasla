import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocationMapPicker, MapCoordinates } from './location-map-picker';

describe('LocationMapPicker', () => {
  let component: LocationMapPicker;
  let fixture: ComponentFixture<LocationMapPicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationMapPicker],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationMapPicker);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and render map tiles', () => {
    expect(component).toBeTruthy();
    const tiles = fixture.nativeElement.querySelectorAll('.map-tile');
    expect(tiles.length).toBeGreaterThan(0);
  });

  it('should display pin marker when valid coordinates are provided', () => {
    fixture.componentRef.setInput('latitude', 30.560456);
    fixture.componentRef.setInput('longitude', 31.01026);
    fixture.detectChanges();

    const pin = fixture.nativeElement.querySelector('.map-pin-marker');
    expect(pin).toBeTruthy();
  });

  it('should emit coordinatesChange when clicking pinAtMapCenter button', () => {
    fixture.componentRef.setInput('latitude', 30.0444);
    fixture.componentRef.setInput('longitude', 31.2357);
    fixture.detectChanges();

    let emitted: MapCoordinates | undefined;
    component.coordinatesChange.subscribe((coords) => {
      emitted = coords;
    });

    const pinBtn = fixture.nativeElement.querySelector(
      '.map-pin-center-btn',
    ) as HTMLButtonElement | null;
    expect(pinBtn).toBeTruthy();
    pinBtn?.click();

    expect(emitted).toEqual({
      latitude: 30.0444,
      longitude: 31.2357,
    });
  });

  it('should emit coordinatesChange when tapping on the map viewport', () => {
    let emitted: MapCoordinates | undefined;
    component.coordinatesChange.subscribe((coords) => {
      emitted = coords;
    });

    const viewport = fixture.nativeElement.querySelector('.map-viewport') as HTMLElement;
    viewport.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 120, clientY: 100, button: 0 }),
    );
    viewport.dispatchEvent(
      new PointerEvent('pointerup', { clientX: 120, clientY: 100, button: 0 }),
    );

    expect(emitted).toBeDefined();
    expect(Number.isFinite(emitted?.latitude)).toBe(true);
    expect(Number.isFinite(emitted?.longitude)).toBe(true);
  });

  it('should not emit coordinatesChange when readonly is true', () => {
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();

    let emitted = false;
    component.coordinatesChange.subscribe(() => {
      emitted = true;
    });

    const viewport = fixture.nativeElement.querySelector('.map-viewport') as HTMLElement;
    viewport.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 120, clientY: 100, button: 0 }),
    );
    viewport.dispatchEvent(
      new PointerEvent('pointerup', { clientX: 120, clientY: 100, button: 0 }),
    );

    expect(emitted).toBe(false);
    expect(fixture.nativeElement.querySelector('.map-picker-header')).toBeNull();
  });
});

