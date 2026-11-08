import { TestBed } from '@angular/core/testing';
import { PlanSelectorComponent } from './plan-selector.component';
import { catalogFixture } from '../../../../../testing/subscriptions';
import { LanguageService } from '../../../../core/i18n/language.service';

describe('PlanSelectorComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PlanSelectorComponent] }));
  it('renders live catalog prices and emits codes without prices or limits', () => {
    const fixture = TestBed.createComponent(PlanSelectorComponent);
    fixture.componentRef.setInput('catalog', structuredClone(catalogFixture));
    fixture.detectChanges();
    const emitted = vi.fn();
    fixture.componentInstance.selectionChange.subscribe(emitted);
    const radio: HTMLInputElement = fixture.nativeElement.querySelector('input[type=radio]');
    radio.click();
    expect(emitted).toHaveBeenCalledWith({
      productCode: 'FULL_PLATFORM',
      planCode: 'STARTER',
      billingCycle: 'Monthly',
    });
    expect(fixture.nativeElement.textContent).toContain('123');
  });
  it('omits the billing cycle for a registration trial, respects disabled state and switches language', () => {
    const fixture = TestBed.createComponent(PlanSelectorComponent);
    fixture.componentRef.setInput('catalog', structuredClone(catalogFixture));
    fixture.componentRef.setInput('allowTrial', true);
    fixture.detectChanges();
    const emitted = vi.fn();
    fixture.componentInstance.selectionChange.subscribe(emitted);
    fixture.componentInstance.chooseTrial();
    expect(emitted).toHaveBeenCalledWith({
      productCode: 'FULL_PLATFORM',
      planCode: 'STARTER',
      offerCode: 'TEST_TRIAL',
    });
    TestBed.inject(LanguageService).setLanguage('en');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('20 days');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    emitted.mockClear();
    fixture.componentInstance.chooseTrial();
    expect(emitted).not.toHaveBeenCalled();
  });
  it('hides disabled products and features without release approval', () => {
    const catalog = structuredClone(catalogFixture);
    catalog.products[0].enabled = false;
    const fixture = TestBed.createComponent(PlanSelectorComponent);
    fixture.componentRef.setInput('catalog', catalog);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type=radio]')).toBeNull();
    expect(
      fixture.componentInstance.getPlanFeatures({
        ...catalogFixture.products[0].plans[0],
        features: [
          { code: 'HIDDEN', nameEn: 'Not ready', isReleaseReady: false, accessLevel: 'Full' },
        ],
      }),
    ).toEqual([]);
  });
  it('renders only catalog-approved features instead of inferring benefits from plan codes', () => {
    const fixture = TestBed.createComponent(PlanSelectorComponent);
    fixture.componentRef.setInput('catalog', catalogFixture);
    TestBed.inject(LanguageService).setLanguage('en');
    const features = fixture.componentInstance.getPlanFeatures({
      ...catalogFixture.products[0].plans[0],
      code: 'PREMIUM',
      features: [
        {
          code: 'MEDICAL_ENCOUNTER',
          nameEn: 'Server-approved visit',
          isReleaseReady: true,
          accessLevel: 'Full',
        },
        { code: 'UNREADY', nameEn: 'Not launched', isReleaseReady: false, accessLevel: 'Full' },
      ],
    });
    expect(features).toEqual(['Server-approved visit']);
    expect(features.join(' ')).not.toContain('Enterprise');
  });
});
