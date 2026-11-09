import { TestBed } from '@angular/core/testing';
import { ArchivedTicket, ArchivedTicketListComponent } from './archived-ticket-list.component';

describe('ArchivedTicketListComponent', () => {
  const ticket: ArchivedTicket = { ticketId: 't1', doctorPracticeId: 'p1', ticketNumber: 12, businessDate: '2026-10-01', archivedAtUtc: '2026-10-02T10:00:00Z', status: 'Completed', isArchived: true, detailsRoute: null };

  it('renders actual archive fields and emits the selected item', async () => {
    const fixture = TestBed.createComponent(ArchivedTicketListComponent);
    fixture.componentRef.setInput('items', [ticket]);
    const inspected = vi.fn();
    fixture.componentInstance.inspected.subscribe(inspected);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('2026-10-01');
    fixture.nativeElement.querySelector('tbody button').click();
    expect(inspected).toHaveBeenCalledWith(ticket);
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('shows an illustrated empty state and allows refresh', async () => {
    const fixture = TestBed.createComponent(ArchivedTicketListComponent);
    const retried = vi.fn();
    fixture.componentInstance.retried.subscribe(retried);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('img')).toBeTruthy();
    fixture.nativeElement.querySelector('button').click();
    expect(retried).toHaveBeenCalled();
  });

  it('disables paging during a request and offers retry after failure', async () => {
    const fixture = TestBed.createComponent(ArchivedTicketListComponent);
    fixture.componentRef.setInput('items', [ticket]);
    fixture.componentRef.setInput('hasMore', true);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('section > button').disabled).toBe(true);
    fixture.componentRef.setInput('loading', false);
    const more = vi.fn();
    fixture.componentInstance.more.subscribe(more);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('section > button').click();
    expect(more).toHaveBeenCalled();
    fixture.componentRef.setInput('failed', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });
});
