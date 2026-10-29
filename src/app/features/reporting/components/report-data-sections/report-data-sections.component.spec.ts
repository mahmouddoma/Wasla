import { TestBed } from '@angular/core/testing';
import { ReportDataSectionsComponent } from './report-data-sections.component';

describe('Report business data sections', () => {
  it('renders all returned series and breakdown metrics only when expanded and preserves missing values', async () => {
    const fixture = TestBed.createComponent(ReportDataSectionsComponent);
    fixture.componentRef.setInput('report', {
      metrics: [{ metricCode: 'Sample', nameEn: 'Sample', numerator: 0, denominator: null }],
      series: [{ key: 'day', metrics: [{ nameEn: 'Daily value', value: 12 }] }],
      breakdowns: [{ key: 'clinic', metrics: [{ nameEn: 'Clinic value', value: 8 }] }],
      records: [{ reference: 'REF-1', metricValue: 0 }],
    });
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    fixture.componentInstance.language.setLanguage('en');
    const details: HTMLDetailsElement = fixture.nativeElement.querySelector('details');
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Daily value');
    expect(fixture.nativeElement.textContent).toContain('Clinic value');
    expect(fixture.nativeElement.textContent).toContain('REF-1');
    expect(fixture.componentInstance.format(0)).toBe('0');
    expect(fixture.componentInstance.format(null)).toBe(fixture.componentInstance.language.t('doctorRemediation.unavailable'));
    fixture.componentInstance.language.setLanguage('ar');
    await fixture.whenStable();
    expect(fixture.nativeElement.dir).toBe('rtl');
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));
});
