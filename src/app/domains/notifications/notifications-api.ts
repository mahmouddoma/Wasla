import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminNotificationSettings,
  InboxItem,
  NotificationDeliveryItem,
  NotificationDeliveryQuery,
  NotificationPage,
  NotificationPreferencesResponse,
  RetryDeliveryRequest,
  UnreadCountResponse,
  UpdateAdminNotificationSettingsRequest,
  UpdateNotificationPreferencesRequest,
} from './notifications.models';

@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly notificationsUrl = `${this.baseUrl}/api/v1/notifications`;
  private readonly adminUrl = `${this.baseUrl}/api/v1/admin`;

  mine(
    pageNumber = 1,
    pageSize = 20,
    category?: string,
    isRead?: boolean,
  ): Observable<NotificationPage<InboxItem>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    if (category) params = params.set('category', category);
    if (isRead !== undefined) params = params.set('isRead', isRead.toString());

    return this.http.get<NotificationPage<InboxItem>>(`${this.notificationsUrl}/mine`, { params });
  }

  unreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.notificationsUrl}/mine/unread-count`);
  }

  markRead(notificationId: string): Observable<void> {
    return this.http.post<void>(`${this.notificationsUrl}/mine/${notificationId}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(`${this.notificationsUrl}/mine/read-all`, {});
  }

  preferences(): Observable<NotificationPreferencesResponse> {
    return this.http.get<NotificationPreferencesResponse>(`${this.notificationsUrl}/me/preferences`);
  }

  updatePreferences(
    request: UpdateNotificationPreferencesRequest,
  ): Observable<NotificationPreferencesResponse> {
    return this.http.put<NotificationPreferencesResponse>(
      `${this.notificationsUrl}/me/preferences`,
      request,
    );
  }

  adminSettings(): Observable<AdminNotificationSettings> {
    return this.http.get<AdminNotificationSettings>(`${this.adminUrl}/notification-settings`);
  }

  updateAdminSettings(
    request: UpdateAdminNotificationSettingsRequest,
  ): Observable<AdminNotificationSettings> {
    return this.http.put<AdminNotificationSettings>(
      `${this.adminUrl}/notification-settings`,
      request,
    );
  }

  adminDeliveries(
    query?: NotificationDeliveryQuery,
  ): Observable<NotificationPage<NotificationDeliveryItem>> {
    let params = new HttpParams();
    if (query?.status) params = params.set('status', query.status);
    if (query?.channel) params = params.set('channel', query.channel);
    if (query?.eventType) params = params.set('eventType', query.eventType);
    if (query?.fromUtc) params = params.set('fromUtc', query.fromUtc);
    if (query?.toUtc) params = params.set('toUtc', query.toUtc);
    if (query?.pageNumber) params = params.set('pageNumber', query.pageNumber.toString());
    if (query?.pageSize) params = params.set('pageSize', query.pageSize.toString());

    return this.http.get<NotificationPage<NotificationDeliveryItem>>(
      `${this.adminUrl}/notification-deliveries`,
      { params },
    );
  }

  adminDelivery(deliveryId: string): Observable<NotificationDeliveryItem> {
    return this.http.get<NotificationDeliveryItem>(
      `${this.adminUrl}/notification-deliveries/${deliveryId}`,
    );
  }

  retryDelivery(deliveryId: string, request: RetryDeliveryRequest): Observable<void> {
    return this.http.post<void>(
      `${this.adminUrl}/notification-deliveries/${deliveryId}/retry`,
      request,
    );
  }
}
