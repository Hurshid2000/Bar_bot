import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api/notifications.api';
import {
	requestNotificationPermission,
	registerServiceWorker,
	subscriptionToJson,
} from '../utils/pushNotifications';

/**
 * Хук для инициализации и регистрации push-уведомлений
 */
export function usePushNotifications() {
	const { user, isAuthenticated } = useAuth();
	const [isRegistered, setIsRegistered] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!isAuthenticated || !user) {
			return;
		}

		// Инициализируем push-уведомления только для авторизованных пользователей
		const initPushNotifications = async () => {
			try {
				// Регистрируем service worker
				const registration = await registerServiceWorker();
				if (!registration) {
					setError('Service Worker не поддерживается');
					return;
				}

				// Проверяем, есть ли уже подписка
				const existingSubscription = await registration.pushManager.getSubscription();
				if (existingSubscription) {
					// Если подписка уже есть, регистрируем её на сервере
					const token = subscriptionToJson(existingSubscription);
					await notificationsApi.registerToken({
						token,
						deviceInfo: navigator.userAgent,
					});
					setIsRegistered(true);
					return;
				}

				// Запрашиваем разрешение и создаем новую подписку
				const subscription = await requestNotificationPermission();
				if (!subscription) {
					setError('Разрешение на уведомления не получено');
					return;
				}

				// Регистрируем токен на сервере
				const token = subscriptionToJson(subscription);
				await notificationsApi.registerToken({
					token,
					deviceInfo: navigator.userAgent,
				});

				setIsRegistered(true);
			} catch (err) {
				console.error('Error initializing push notifications:', err);
				setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
			}
		};

		initPushNotifications();
	}, [isAuthenticated, user]);

	return { isRegistered, error };
}
