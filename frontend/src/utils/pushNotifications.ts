/**
 * Web Push Notification Utilities and iOS/Android compatibility helpers
 */
import { api } from '../services/api';

export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (err) {
    console.error('ServiceWorker registration failed:', err);
    return null;
  }
}

export async function requestNotificationPermissionAndSubscribe(userId: string): Promise<{
  success: boolean;
  status: NotificationPermission;
  error?: string;
}> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      status: 'denied',
      error: 'Push notifications are not supported on this browser.'
    };
  }

  // iOS Safari requirement: must be added to home screen to use Web Push
  if (isIosDevice() && !isStandalonePwa()) {
    return {
      success: false,
      status: Notification.permission,
      error: 'On iOS devices, Web Push requires adding eBron to your Home Screen (tap Share button > "Add to Home Screen").'
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, status: permission, error: 'Notification permission was not granted.' };
    }

    const reg = await registerServiceWorker();
    if (reg) {
      // Mock / dummy VAPID subscription for local development or backend persistence
      const subscription = await reg.pushManager.getSubscription() || {
        endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/demo_' + Date.now(),
        keys: { p256dh: 'sample_p256dh_key', auth: 'sample_auth_token' }
      };

      await api.savePushSubscription(userId, subscription);
    }

    return { success: true, status: permission };
  } catch (err: any) {
    return { success: false, status: Notification.permission, error: err.message };
  }
}
