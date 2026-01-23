/**
 * Утилиты для работы с Web Push уведомлениями
 */

export interface PushSubscriptionData {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
}

/**
 * Запрашивает разрешение на отправку уведомлений и возвращает subscription
 */
export async function requestNotificationPermission(): Promise<PushSubscription | null> {
	if (!('Notification' in window)) {
		console.warn('This browser does not support notifications');
		return null;
	}

	if (!('serviceWorker' in navigator)) {
		console.warn('This browser does not support service workers');
		return null;
	}

	// Запрашиваем разрешение
	const permission = await Notification.requestPermission();
	if (permission !== 'granted') {
		console.warn('Notification permission denied');
		return null;
	}

	// Регистрируем service worker
	try {
		const registration = await navigator.serviceWorker.ready;
		
		// Получаем VAPID public key из переменных окружения или конфига
		const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
		
		if (!vapidPublicKey) {
			console.warn('VAPID public key not configured');
			return null;
		}

		// Подписываемся на push-уведомления
		const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: applicationServerKey as BufferSource,
		});

		return subscription;
	} catch (error) {
		console.error('Error subscribing to push notifications:', error);
		return null;
	}
}

/**
 * Конвертирует VAPID ключ из base64 URL в Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

/**
 * Конвертирует PushSubscription в JSON строку для отправки на сервер
 */
export function subscriptionToJson(subscription: PushSubscription): string {
	return JSON.stringify({
		endpoint: subscription.endpoint,
		keys: {
			p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
			auth: arrayBufferToBase64(subscription.getKey('auth')!),
		},
	});
}

/**
 * Конвертирует ArrayBuffer в base64 строку
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return window.btoa(binary);
}

/**
 * Регистрирует service worker для push-уведомлений
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!('serviceWorker' in navigator)) {
		console.warn('Service workers are not supported');
		return null;
	}

	try {
		// Регистрируем service worker
		const registration = await navigator.serviceWorker.register('/sw.js', {
			scope: '/',
		});

		console.log('Service Worker registered:', registration);
		return registration;
	} catch (error) {
		console.error('Service Worker registration failed:', error);
		return null;
	}
}
