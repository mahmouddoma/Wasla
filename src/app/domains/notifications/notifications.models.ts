export interface NotificationTarget {
  readonly route?: string;
  readonly screen?: string;
  readonly entityType?: string;
}

export interface InboxItem {
  readonly id: string;
  readonly eventType: string;
  readonly category: string;
  readonly title: string;
  readonly message: string;
  readonly createdAtUtc: string;
  readonly readAtUtc: string | null;
  readonly isRead: boolean;
  readonly target?: NotificationTarget | null;
}

export interface NotificationPage<T> {
  readonly items: readonly T[];
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

export interface UnreadCountResponse {
  readonly unreadCount: number;
}

export interface NotificationPreferenceItem {
  readonly category: string;
  readonly channel: 'Email' | 'InApp';
  readonly enabled: boolean;
}

export interface NotificationPreferencesResponse {
  readonly preferredLanguage: 'ar' | 'en';
  readonly preferences: readonly NotificationPreferenceItem[];
  readonly rowVersion: string;
}

export interface UpdateNotificationPreferencesRequest {
  readonly preferredLanguage: 'ar' | 'en';
  readonly preferences: readonly NotificationPreferenceItem[];
  readonly rowVersion: string;
}

export interface AdminNotificationSettings {
  readonly appointmentReminderEnabled: boolean;
  readonly reminderLeadMinutes: number;
  readonly version: number;
  readonly rowVersion: string;
}

export interface UpdateAdminNotificationSettingsRequest {
  readonly appointmentReminderEnabled: boolean;
  readonly reminderLeadMinutes: number;
  readonly reason: string;
  readonly rowVersion: string;
}

export interface NotificationDeliveryItem {
  readonly id: string;
  readonly eventType: string;
  readonly category: string;
  readonly channel: string;
  readonly status: string;
  readonly attemptCount: number;
  readonly createdAtUtc: string;
  readonly dispatchedAtUtc: string | null;
  readonly lastAttemptAtUtc: string | null;
  readonly failureCode: string | null;
  readonly retryEligible: boolean;
  readonly rowVersion: string;
}

export interface NotificationDeliveryQuery {
  readonly status?: string;
  readonly channel?: string;
  readonly eventType?: string;
  readonly fromUtc?: string;
  readonly toUtc?: string;
  readonly pageNumber?: number;
  readonly pageSize?: number;
}

export interface RetryDeliveryRequest {
  readonly reason: string;
  readonly rowVersion: string;
}
