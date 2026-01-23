import { usePushNotifications } from '../hooks/usePushNotifications';

/**
 * Компонент для инициализации push-уведомлений
 * Должен быть размещен внутри AuthProvider
 */
export function PushNotificationsInit() {
	usePushNotifications();
	return null; // Компонент не рендерит ничего
}
