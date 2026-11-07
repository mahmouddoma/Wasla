import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

interface MapTile {
  key: string;
  url: string;
  leftPx: number;
  topPx: number;
}

const DEFAULT_CAIRO_LAT = 30.0444;
const DEFAULT_CAIRO_LNG = 31.2357;
const TILE_SIZE = 256;
const MIN_ZOOM = 6;
const MAX_ZOOM = 18;
const DEFAULT_OVERVIEW_ZOOM = 12;
const DEFAULT_PIN_ZOOM = 15;
const MIN_LAT = -85.0511;
const MAX_LAT = 85.0511;

@Component({
  selector: 'app-location-map-picker',
  imports: [TranslatePipe],
  templateUrl: './location-map-picker.html',
  styleUrl: './location-map-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationMapPicker {
  readonly latitude = input<number>(0);
  readonly longitude = input<number>(0);
  readonly readonly = input<boolean>(false);
  readonly disabled = input<boolean>(false);

  readonly coordinatesChange = output<MapCoordinates>();

  private readonly viewportRef = viewChild<ElementRef<HTMLElement>>('mapViewport');

  protected readonly zoom = signal<number>(DEFAULT_OVERVIEW_ZOOM);
  protected readonly viewLat = signal<number>(DEFAULT_CAIRO_LAT);
  protected readonly viewLng = signal<number>(DEFAULT_CAIRO_LNG);
  protected readonly isDragging = signal<boolean>(false);

  private pointerActive = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartWorldX = 0;
  private dragStartWorldY = 0;
  private movedDistance = 0;
  private lastSyncedLat = 0;
  private lastSyncedLng = 0;

  protected readonly hasValidCoordinates = computed(() => {
    const lat = this.latitude();
    const lng = this.longitude();
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      !(lat === 0 && lng === 0) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  });

  protected readonly googleMapsUrl = computed(() => {
    const lat = this.hasValidCoordinates() ? this.latitude() : this.viewLat();
    const lng = this.hasValidCoordinates() ? this.longitude() : this.viewLng();
    return `https://www.google.com/maps?q=${lat},${lng}`;
  });

  protected readonly tiles = computed<MapTile[]>(() => {
    const z = this.zoom();
    const maxTileIndex = Math.pow(2, z);
    const centerWx = this.lngToWorldX(this.viewLng(), z);
    const centerWy = this.latToWorldY(this.viewLat(), z);

    const centerTileX = Math.floor(centerWx / TILE_SIZE);
    const centerTileY = Math.floor(centerWy / TILE_SIZE);
    const offsetX = Math.round(centerWx - centerTileX * TILE_SIZE);
    const offsetY = Math.round(centerWy - centerTileY * TILE_SIZE);

    const result: MapTile[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      const tileY = centerTileY + dy;
      if (tileY < 0 || tileY >= maxTileIndex) {
        continue;
      }
      for (let dx = -2; dx <= 2; dx++) {
        const rawTileX = centerTileX + dx;
        const wrappedTileX = ((rawTileX % maxTileIndex) + maxTileIndex) % maxTileIndex;
        result.push({
          key: `${z}-${wrappedTileX}-${tileY}-${dx}-${dy}`,
          url: `https://tile.openstreetmap.org/${z}/${wrappedTileX}/${tileY}.png`,
          leftPx: dx * TILE_SIZE - offsetX,
          topPx: dy * TILE_SIZE - offsetY,
        });
      }
    }
    return result;
  });

  protected readonly pinPixelOffset = computed<{ x: number; y: number } | null>(() => {
    if (!this.hasValidCoordinates()) {
      return null;
    }
    const z = this.zoom();
    const centerWx = this.lngToWorldX(this.viewLng(), z);
    const centerWy = this.latToWorldY(this.viewLat(), z);
    const pinWx = this.lngToWorldX(this.longitude(), z);
    const pinWy = this.latToWorldY(this.latitude(), z);

    return {
      x: Math.round(pinWx - centerWx),
      y: Math.round(pinWy - centerWy),
    };
  });

  constructor() {
    effect(() => {
      const lat = this.latitude();
      const lng = this.longitude();
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        !(lat === 0 && lng === 0) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        if (lat !== this.lastSyncedLat || lng !== this.lastSyncedLng) {
          this.lastSyncedLat = lat;
          this.lastSyncedLng = lng;
          this.viewLat.set(this.clampLat(lat));
          this.viewLng.set(this.clampLng(lng));
          if (this.zoom() < DEFAULT_PIN_ZOOM) {
            this.zoom.set(DEFAULT_PIN_ZOOM);
          }
        }
      }
    });
  }

  protected zoomIn(): void {
    this.zoom.update((z) => Math.min(MAX_ZOOM, z + 1));
  }

  protected zoomOut(): void {
    this.zoom.update((z) => Math.max(MIN_ZOOM, z - 1));
  }

  protected recenterOnPin(): void {
    if (!this.hasValidCoordinates()) {
      return;
    }
    this.viewLat.set(this.clampLat(this.latitude()));
    this.viewLng.set(this.clampLng(this.longitude()));
  }

  protected pinAtMapCenter(): void {
    if (this.readonly() || this.disabled()) {
      return;
    }
    this.emitPickedCoordinates(this.viewLat(), this.viewLng());
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.disabled() || event.button !== 0) {
      return;
    }
    const z = this.zoom();
    this.pointerActive = true;
    this.isDragging.set(false);
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartWorldX = this.lngToWorldX(this.viewLng(), z);
    this.dragStartWorldY = this.latToWorldY(this.viewLat(), z);
    this.movedDistance = 0;

    const target = event.currentTarget as HTMLElement | null;
    if (target && typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // Ignore pointer capture errors in synthetic test events
      }
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.pointerActive) {
      return;
    }
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    this.movedDistance = Math.hypot(dx, dy);

    if (this.movedDistance >= 5) {
      this.isDragging.set(true);
      const z = this.zoom();
      const nextWx = this.dragStartWorldX - dx;
      const nextWy = this.dragStartWorldY - dy;
      this.viewLng.set(this.clampLng(this.worldXToLng(nextWx, z)));
      this.viewLat.set(this.clampLat(this.worldYToLat(nextWy, z)));
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.pointerActive) {
      return;
    }
    this.pointerActive = false;
    const wasDragging = this.movedDistance >= 6;
    this.isDragging.set(false);

    if (!wasDragging && !this.readonly() && !this.disabled()) {
      this.pickAtClientPoint(event.clientX, event.clientY);
    }
  }

  protected onPointerCancel(): void {
    this.pointerActive = false;
    this.isDragging.set(false);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }
    const step = 0.0015 * Math.pow(2, DEFAULT_PIN_ZOOM - this.zoom());
    const baseLat = this.hasValidCoordinates() ? this.latitude() : this.viewLat();
    const baseLng = this.hasValidCoordinates() ? this.longitude() : this.viewLng();

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.nudgeLocation(baseLat + step, baseLng);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.nudgeLocation(baseLat - step, baseLng);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.nudgeLocation(baseLat, baseLng + step);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.nudgeLocation(baseLat, baseLng - step);
        break;
      case '+':
      case '=':
        event.preventDefault();
        this.zoomIn();
        break;
      case '-':
        event.preventDefault();
        this.zoomOut();
        break;
      case 'Enter':
      case ' ':
        if (!this.readonly()) {
          event.preventDefault();
          this.pinAtMapCenter();
        }
        break;
    }
  }

  private nudgeLocation(lat: number, lng: number): void {
    const nextLat = this.clampLat(lat);
    const nextLng = this.clampLng(lng);
    this.viewLat.set(nextLat);
    this.viewLng.set(nextLng);
    if (!this.readonly()) {
      this.emitPickedCoordinates(nextLat, nextLng);
    }
  }

  private pickAtClientPoint(clientX: number, clientY: number): void {
    const viewport = this.viewportRef()?.nativeElement;
    if (!viewport) {
      return;
    }
    const rect = viewport.getBoundingClientRect();
    const width = rect.width || 400;
    const height = rect.height || 260;
    const offsetX = clientX - (rect.left + width / 2);
    const offsetY = clientY - (rect.top + height / 2);

    const z = this.zoom();
    const centerWx = this.lngToWorldX(this.viewLng(), z);
    const centerWy = this.latToWorldY(this.viewLat(), z);

    const pickedLat = this.clampLat(this.worldYToLat(centerWy + offsetY, z));
    const pickedLng = this.clampLng(this.worldXToLng(centerWx + offsetX, z));

    this.viewLat.set(pickedLat);
    this.viewLng.set(pickedLng);
    this.emitPickedCoordinates(pickedLat, pickedLng);
  }

  private emitPickedCoordinates(lat: number, lng: number): void {
    const roundedLat = Number(lat.toFixed(6));
    const roundedLng = Number(lng.toFixed(6));
    this.lastSyncedLat = roundedLat;
    this.lastSyncedLng = roundedLng;
    this.coordinatesChange.emit({
      latitude: roundedLat,
      longitude: roundedLng,
    });
  }

  private lngToWorldX(lng: number, zoom: number): number {
    const worldSize = TILE_SIZE * Math.pow(2, zoom);
    return ((lng + 180) / 360) * worldSize;
  }

  private latToWorldY(lat: number, zoom: number): number {
    const clamped = this.clampLat(lat);
    const rad = (clamped * Math.PI) / 180;
    const worldSize = TILE_SIZE * Math.pow(2, zoom);
    const mercator = Math.log(Math.tan(rad) + 1 / Math.cos(rad));
    return ((1 - mercator / Math.PI) / 2) * worldSize;
  }

  private worldXToLng(wx: number, zoom: number): number {
    const worldSize = TILE_SIZE * Math.pow(2, zoom);
    return (wx / worldSize) * 360 - 180;
  }

  private worldYToLat(wy: number, zoom: number): number {
    const worldSize = TILE_SIZE * Math.pow(2, zoom);
    const n = Math.PI - (2 * Math.PI * wy) / worldSize;
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }

  private clampLat(lat: number): number {
    return Math.max(MIN_LAT, Math.min(MAX_LAT, lat));
  }

  private clampLng(lng: number): number {
    if (lng < -180) {
      return -180;
    }
    if (lng > 180) {
      return 180;
    }
    return lng;
  }
}

