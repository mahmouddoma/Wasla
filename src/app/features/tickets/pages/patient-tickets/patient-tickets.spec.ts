import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TicketsApi } from '../../../../domains/tickets';
import { PatientTickets } from './patient-tickets';
import { LanguageService } from '../../../../core/i18n/language.service';

describe('PatientTickets', () => {
  let fixture: ComponentFixture<PatientTickets>;
  afterEach(() => localStorage.removeItem('wasla_lang'));
  const api = {
    myActive: vi.fn(() =>
      of([
        {
          ticketId: 't1',
          ticketNumber: 'A-12',
          status: 'Waiting',
          practice: { nameAr: 'عيادة', nameEn: 'Clinic' },
          doctor: { nameAr: 'طبيب', nameEn: 'Doctor' },
          patientsAheadNow: 3,
          lastUpdatedOnUtc: '2026-09-20T10:00:00Z',
        },
      ]),
    ),
    myDetails: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientTickets],
      providers: [provideRouter([]), { provide: TicketsApi, useValue: api }],
    }).compileComponents();
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(PatientTickets);
    await fixture.whenStable();
  });

  it('creates and renders only the current patient active tickets', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(api.myActive).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('A-12');
    expect(fixture.nativeElement.textContent).toContain('3');
  });

  it('renders the privacy-safe dynamic queue notice', () => {
    expect(fixture.nativeElement.textContent).toContain('يتغير لحظيًا');
  });

  it('renders empty state when no active tickets exist', async () => {
    api.myActive.mockReturnValueOnce(of([]));
    const emptyFixture = TestBed.createComponent(PatientTickets);
    await emptyFixture.whenStable();
    emptyFixture.detectChanges();
    expect(emptyFixture.nativeElement.textContent).toContain('لا توجد تذاكر نشطة');
  });
});
