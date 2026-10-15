import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ArchiveOperationsComponent } from './archive-operations.component';
import { Phase18Part2Api } from '../../../domains/phase18';
import { ToastService } from '../../../core/notifications/toast.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { AuthSession } from '../../../core/auth/auth-session';

describe('ArchiveOperationsComponent', () => {
  let component: ArchiveOperationsComponent;
  let fixture: ComponentFixture<ArchiveOperationsComponent>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArchiveOperationsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        Phase18Part2Api,
        ToastService,
        LanguageService,
        AuthSession,
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ArchiveOperationsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpTesting.verify();
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  it('should create and load initial operations data', async () => {
    expect(component).toBeTruthy();
    expect(component.activeTab()).toBe('operations');

    // Trigger ngOnInit
    fixture.detectChanges();

    // Respond to initial parallel calls
    const reqHealth = httpTesting.expectOne((req) =>
      req.url.includes('/api/v1/admin/archives/operations/health'),
    );
    expect(reqHealth.request.method).toBe('GET');
    reqHealth.flush({
      control: {
        state: 'Active',
        rowVersion: 'ver123',
        canPause: true,
        canResume: false,
      },
      lastRun: null,
      currentRun: null,
    });

    const reqRuns = httpTesting.expectOne((req) =>
      req.url.includes('/api/v1/admin/archives/operations/runs'),
    );
    expect(reqRuns.request.method).toBe('GET');
    reqRuns.flush({
      items: [
        {
          runId: '11111111-1111-1111-1111-111111111111',
          startedAtUtc: '2026-10-15T08:00:00Z',
          endedAtUtc: '2026-10-15T08:05:00Z',
          outcome: 'Completed',
          archivedTickets: 10,
          archivedReservations: 5,
          scanned: 20,
          excluded: 5,
          correlationId: 'corr-123',
        },
      ],
      nextCursor: null,
      pageSize: 20,
      asOfUtc: '2026-10-15T08:05:00Z',
      hasMore: false,
    });

    const reqExceptions = httpTesting.expectOne((req) =>
      req.url.includes('/api/v1/admin/archives/operations/exceptions'),
    );
    expect(reqExceptions.request.method).toBe('GET');
    reqExceptions.flush({
      items: [],
      nextCursor: null,
      pageSize: 20,
      asOfUtc: '2026-10-15T08:05:00Z',
      hasMore: false,
    });

    const reqOptions = httpTesting.expectOne((req) =>
      req.url.includes('/api/v1/admin/archives/operations/filter-options'),
    );
    expect(reqOptions.request.method).toBe('GET');
    reqOptions.flush({
      statuses: [{ code: 'Active', nameAr: 'نشط', nameEn: 'Active' }],
      entityTypes: [{ code: 'Ticket', nameAr: 'تذكرة', nameEn: 'Ticket' }],
    });

    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.isWorkerActive()).toBe(true);
    expect(component.runs().length).toBe(1);
    expect(component.runs()[0].archivedTickets + component.runs()[0].archivedReservations).toBe(15);
  });

  it('should switch tabs and load archives data', async () => {
    fixture.detectChanges();

    // Flush initial ngOnInit calls
    httpTesting
      .expectOne((req) => req.url.includes('/api/v1/admin/archives/operations/health'))
      .flush({
        control: { state: 'Active', rowVersion: 'v1', canPause: true, canResume: false },
      });
    httpTesting
      .expectOne((req) => req.url.includes('/api/v1/admin/archives/operations/runs'))
      .flush({ items: [], hasMore: false });
    httpTesting
      .expectOne((req) => req.url.includes('/api/v1/admin/archives/operations/exceptions'))
      .flush({ items: [], hasMore: false });
    httpTesting
      .expectOne((req) => req.url.includes('/api/v1/admin/archives/operations/filter-options'))
      .flush({});

    await Promise.resolve();
    await fixture.whenStable();

    // Switch to archives tab
    void component.setTab('archives');
    await Promise.resolve();

    // Flush practice options
    const reqPractices = httpTesting.expectOne((req) =>
      req.url.includes('/api/v1/admin/archives/practices/options'),
    );
    reqPractices.flush({ items: [] });
    await Promise.resolve();

    // Flush platform tickets
    const reqTickets = httpTesting.expectOne((req) =>
      req.url.includes('/api/v1/admin/archives/tickets'),
    );
    reqTickets.flush({
      items: [
        {
          ticketId: '22222222-2222-2222-2222-222222222222',
          doctorPracticeId: '33333333-3333-3333-3333-333333333333',
          ticketNumber: 42,
          businessDate: '2026-10-10',
          status: 'Completed',
          archivedAtUtc: '2026-10-11T00:00:00Z',
          detailsRoute: '/api/v1/admin/archives/tickets/22222222-2222-2222-2222-222222222222',
          isArchived: true,
        },
      ],
      nextCursor: null,
      pageSize: 20,
      asOfUtc: '2026-10-15T08:00:00Z',
      hasMore: false,
    });

    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.activeTab()).toBe('archives');
    expect(component.archivedTickets().length).toBe(1);
    expect(component.archivedTickets()[0].ticketNumber).toBe(42);
  });
});
