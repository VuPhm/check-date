import type { ActivityEvent } from '../domain/types';

export type PermissionResult = 'granted' | 'denied' | 'default' | 'unsupported' | 'insecure';

export async function requestDeviceNotificationPermission(): Promise<PermissionResult> {
  if (!('Notification' in window)) return 'unsupported';
  if (!window.isSecureContext && location.hostname !== 'localhost') return 'insecure';
  return Notification.requestPermission();
}

export async function notifyDeviceAboutActivity(events: Array<Pick<ActivityEvent, 'type' | 'summary'>>): Promise<void> {
  if (!events.length || !('Notification' in window) || Notification.permission !== 'granted') return;
  const title = events.length > 1 ? 'Co.op Date · Cập nhật cửa hàng' : activityTitle(events[0].type);
  const body = events.length > 1 ? `${events.length} thay đổi mới cần bạn xem.` : events[0].summary;
  const options = {
    body,
    icon: `${import.meta.env.BASE_URL}coopfood-logo.png`,
    badge: `${import.meta.env.BASE_URL}favicon_io/favicon-32x32.png`,
    tag: 'coop-activity-update',
    data: { url: '/' },
  };
  const registration = await navigator.serviceWorker?.ready;
  if (registration) await registration.showNotification(title, options);
  else new Notification(title, options);
}

function activityTitle(type: ActivityEvent['type']): string {
  if (type === 'kph.approved') return 'Co.op Date · Phiếu đã duyệt';
  if (type === 'kph.rejected') return 'Co.op Date · Phiếu không duyệt';
  if (type === 'kph.deleted') return 'Co.op Date · Phiếu đã xóa';
  return 'Co.op Date · Phiếu mới';
}
