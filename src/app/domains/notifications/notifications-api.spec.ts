import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationsApi } from './notifications-api';
import { environment } from '../../../environments/environment';

describe('NotificationsApi', () => {
  let api: NotificationsApi;
  let http: HttpTestingController;
  const baseUrl = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationsApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(NotificationsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('WAS-552: mine queries paginated notifications', () => {
    api.mine(1, 20, 'AppointmentReminder', false).subscribe((res) => {
      expect(res.items.length).toBe(1);
    });
    const req = http.expectOne(
      (r) =>
        r.url === `${baseUrl}/api/v1/notifications/mine` &&
        r.params.get('pageNumber') === '1' &&
        r.params.get('pageSize') === '20' &&
        r.params.get('category') === 'AppointmentReminder' &&
        r.params.get('isRead') === 'false',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [{ id: 'n1', title: 'Test' }], pageNumber: 1, pageSize: 20, totalCount: 1 });
  });

  it('WAS-553: unreadCount returns unread count', () => {
    api.unreadCount().subscribe((res) => {
      expect(res.unreadCount).toBe(5);
    });
    const req = http.expectOne(`${baseUrl}/api/v1/notifications/mine/unread-count`);
    expect(req.request.method).toBe('GET');
    req.flush({ unreadCount: 5 });
  });

  it('WAS-554: markRead marks single notification as read', () => {
    api.markRead('n1').subscribe();
    const req = http.expectOne(`${baseUrl}/api/v1/notifications/mine/n1/read`);
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('WAS-555: markAllRead marks all notifications as read', () => {
    api.markAllRead().subscribe();
    const req = http.expectOne(`${baseUrl}/api/v1/notifications/mine/read-all`);
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('WAS-556: preferences returns notification preferences', () => {
    api.preferences().subscribe((res) => {
      expect(res.preferredLanguage).toBe('ar');
    });
    const req = http.expectOne(`${baseUrl}/api/v1/notifications/me/preferences`);
    expect(req.request.method).toBe('GET');
    req.flush({ preferredLanguage: 'ar', preferences: [], rowVersion: 'v1' });
  });

  it('WAS-557: updatePreferences updates preferences', () => {
    const payload = { preferredLanguage: 'en' as const, preferences: [], rowVersion: 'v1' };
    api.updatePreferences(payload).subscribe((res) => {
      expect(res.rowVersion).toBe('v2');
    });
    const req = http.expectOne(`${baseUrl}/api/v1/notifications/me/preferences`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ preferredLanguage: 'en', preferences: [], rowVersion: 'v2' });
  });

  it('WAS-558: adminSettings returns admin notification settings', () => {
    api.adminSettings().subscribe((res) => {
      expect(res.appointmentReminderEnabled).toBe(true);
    });
    const req = http.expectOne(`${baseUrl}/api/v1/admin/notification-settings`);
    expect(req.request.method).toBe('GET');
    req.flush({ appointmentReminderEnabled: true, reminderLeadMinutes: 60, version: 1, rowVersion: 'v1' });
  });

  it('WAS-559: updateAdminSettings updates settings with reason', () => {
    const payload = { appointmentReminderEnabled: false, reminderLeadMinutes: 30, reason: 'Maintenance', rowVersion: 'v1' };
    api.updateAdminSettings(payload).subscribe((res) => {
      expect(res.appointmentReminderEnabled).toBe(false);
    });
    const req = http.expectOne(`${baseUrl}/api/v1/admin/notification-settings`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ appointmentReminderEnabled: false, reminderLeadMinutes: 30, version: 2, rowVersion: 'v2' });
  });

  it('WAS-560: adminDeliveries returns delivery audit page', () => {
    api.adminDeliveries({ status: 'Failed', pageNumber: 1, pageSize: 10 }).subscribe((res) => {
      expect(res.items.length).toBe(1);
    });
    const req = http.expectOne(
      (r) =>
        r.url === `${baseUrl}/api/v1/admin/notification-deliveries` &&
        r.params.get('status') === 'Failed' &&
        r.params.get('pageNumber') === '1' &&
        r.params.get('pageSize') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [{ id: 'd1', status: 'Failed', retryEligible: true, rowVersion: 'v1' }], pageNumber: 1, pageSize: 10, totalCount: 1 });
  });

  it('WAS-561: adminDelivery returns single delivery detail', () => {
    api.adminDelivery('d1').subscribe((res) => {
      expect(res.id).toBe('d1');
    });
    const req = http.expectOne(`${baseUrl}/api/v1/admin/notification-deliveries/d1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'd1', status: 'Failed', retryEligible: true, rowVersion: 'v1' });
  });

  it('WAS-562: retryDelivery posts retry with reason and rowVersion', () => {
    const payload = { reason: 'Network recovered', rowVersion: 'v1' };
    api.retryDelivery('d1', payload).subscribe();
    const req = http.expectOne(`${baseUrl}/api/v1/admin/notification-deliveries/d1/retry`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
