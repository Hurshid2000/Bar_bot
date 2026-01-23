/**
 * Service Worker для обработки push-уведомлений
 */

self.addEventListener('push', function (event) {
	const data = event.data ? event.data.json() : {};
	const title = data.title || 'Уведомление';
	const options = {
		body: data.body || '',
		icon: '/icon-192x192.png', // Замените на путь к вашей иконке
		badge: '/icon-96x96.png',
		data: data.data || {},
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
	event.notification.close();

	// Открываем приложение при клике на уведомление
	event.waitUntil(
		clients.matchAll({ type: 'window' }).then(function (clientList) {
			// Если приложение уже открыто, фокусируемся на нем
			for (let i = 0; i < clientList.length; i++) {
				const client = clientList[i];
				if (client.url === '/' && 'focus' in client) {
					return client.focus();
				}
			}
			// Иначе открываем новое окно
			if (clients.openWindow) {
				return clients.openWindow('/');
			}
		}),
	);
});
