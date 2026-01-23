/**
 * Service Worker для обработки push-уведомлений
 */

self.addEventListener('push', function (event) {
	const data = event.data ? event.data.json() : {};
	const title = data.title || 'Уведомление';
	
	// Создаем опции уведомления, иконки опциональны
	const options = {
		body: data.body || '',
		data: data.data || {},
		requireInteraction: false,
		silent: false,
	};
	
	// Добавляем иконки только если они есть (опционально)
	// Можно добавить проверку существования файлов, но для простоты оставляем опциональными
	// Если иконки не найдены, браузер использует дефолтные

	event.waitUntil(
		self.registration.showNotification(title, options).catch((error) => {
			console.error('Failed to show notification:', error);
		})
	);
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
