/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision?: string }> };

// Кеширование статики при сборке
precacheAndRoute(self.__WB_MANIFEST);

// Push-уведомления (сохранённая логика из public/sw.js)
self.addEventListener('push', function (event: PushEvent) {
	const data = event.data ? event.data.json() : {};
	const title = (data as { title?: string }).title || 'Уведомление';

	const options: NotificationOptions = {
		body: (data as { body?: string }).body || '',
		data: (data as { data?: unknown }).data || {},
		requireInteraction: false,
		silent: false,
	};

	event.waitUntil(
		self.registration.showNotification(title, options).catch((error) => {
			console.error('Failed to show notification:', error);
		}),
	);
});

self.addEventListener('notificationclick', function (event: NotificationEvent) {
	event.notification.close();

	event.waitUntil(
		self.clients.matchAll({ type: 'window' }).then(function (clientList: readonly WindowClient[]) {
			for (let i = 0; i < clientList.length; i++) {
				const client = clientList[i];
				if (client.url.includes(self.location.origin) && 'focus' in client) {
					return client.focus();
				}
			}
			if (self.clients.openWindow) {
				return self.clients.openWindow('/');
			}
		}),
	);
});
