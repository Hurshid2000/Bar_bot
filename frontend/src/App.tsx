import { useState, useEffect } from 'react';
import {
	authenticateWithTelegram,
	checkHealth,
	getToken,
	saveToken,
	removeToken,
} from './api';
import './App.css';

function App() {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [healthStatus, setHealthStatus] = useState<string>('Проверка...');
	const [user, setUser] = useState<any>(null);
	const [error, setError] = useState<string>('');
	const [telegramInfo, setTelegramInfo] = useState<{
		available: boolean;
		hasInitData: boolean;
		initDataPreview: string;
	} | null>(null);

	// Проверка здоровья API при загрузке
	useEffect(() => {
		checkHealth()
			.then((data) => {
				setHealthStatus(
					`API: ${data.status}, База данных: ${data.database}`,
				);
			})
			.catch(() => {
				setHealthStatus('Ошибка подключения к API');
			});

		// Проверяем, есть ли сохраненный токен
		const token = getToken();
		if (token) {
			setIsAuthenticated(true);
		}

		// Проверка Telegram WebApp при загрузке
		const hasTelegramWebApp = !!window.Telegram?.WebApp;
		const initData = window.Telegram?.WebApp?.initData;
		setTelegramInfo({
			available: hasTelegramWebApp,
			hasInitData: !!initData,
			initDataPreview: initData
				? `${initData.substring(0, 50)}...`
				: 'не доступен',
		});

		console.log('🔍 [FRONTEND] Проверка Telegram WebApp при загрузке:');
		console.log('  Telegram WebApp доступен:', hasTelegramWebApp);
		console.log('  initData доступен:', !!initData);
		if (initData) {
			console.log('  initData (первые 100 символов):', initData.substring(0, 100));
		}
	}, []);

	// Обработка авторизации через Telegram
	const handleTelegramAuth = async () => {
		try {
			setError('');

			// Проверка наличия Telegram WebApp
			const hasTelegramWebApp = !!window.Telegram?.WebApp;
			const telegramInitData = window.Telegram?.WebApp?.initData;
			const fallbackInitData =
				'user=%7B%22id%22%3A123456789%7D&auth_date=1234567890&hash=test';

			// Логирование для отладки
			console.log('🔍 [FRONTEND] Проверка initData:');
			console.log('  Telegram WebApp доступен:', hasTelegramWebApp);
			console.log('  initData от Telegram:', telegramInitData || 'не доступен');
			console.log('  Используется fallback:', !telegramInitData);

			// Парсинг initData для проверки
			if (telegramInitData) {
				try {
					const params = new URLSearchParams(telegramInitData);
					const userParam = params.get('user');
					const authDate = params.get('auth_date');
					const hash = params.get('hash');

					console.log('  📋 Структура initData:');
					console.log('    - user:', userParam ? 'присутствует' : 'отсутствует');
					console.log('    - auth_date:', authDate || 'отсутствует');
					console.log('    - hash:', hash ? `${hash.substring(0, 20)}...` : 'отсутствует');

					if (userParam) {
						const userData = JSON.parse(decodeURIComponent(userParam));
						console.log('    - Данные пользователя:', {
							id: userData.id,
							first_name: userData.first_name,
							username: userData.username,
						});
					}
				} catch (parseError) {
					console.error('  ❌ Ошибка парсинга initData:', parseError);
				}
			}

			// В реальном приложении initData будет приходить от Telegram WebApp
			// Для тестирования можно использовать тестовые данные
			// В продакшене это будет: window.Telegram.WebApp.initData
			const initData = telegramInitData || fallbackInitData;

			console.log('  📤 Отправка initData на сервер (первые 100 символов):', initData.substring(0, 100));

			const response = await authenticateWithTelegram(initData);
			console.log('  ✅ Авторизация успешна:', response.user);
			saveToken(response.accessToken);
			setUser(response.user);
			setIsAuthenticated(true);
		} catch (err: any) {
			console.error('  ❌ Ошибка авторизации:', err);
			setError(err.message || 'Ошибка авторизации');
			removeToken();
			setIsAuthenticated(false);
		}
	};

	const handleLogout = () => {
		removeToken();
		setIsAuthenticated(false);
		setUser(null);
	};

	return (
		<div className="app">
			<header>
				<h1>Bar CRM</h1>
				<p className="status">{healthStatus}</p>
			</header>

			<main>
				{error && <div className="error">{error}</div>}

				{!isAuthenticated ? (
					<div className="auth-section">
						<h2>Авторизация</h2>
						<p>
							Для работы с приложением необходимо авторизоваться через
							Telegram
						</p>
						{telegramInfo && (
							<div
								style={{
									background: '#f5f5f5',
									padding: '15px',
									borderRadius: '8px',
									marginBottom: '15px',
									fontSize: '14px',
								}}
							>
								<h3 style={{ marginTop: 0, fontSize: '16px' }}>
									Информация о Telegram WebApp:
								</h3>
								<p>
									<strong>Telegram WebApp доступен:</strong>{' '}
									{telegramInfo.available ? '✅ Да' : '❌ Нет'}
								</p>
								<p>
									<strong>initData доступен:</strong>{' '}
									{telegramInfo.hasInitData ? '✅ Да' : '❌ Нет'}
								</p>
								{telegramInfo.hasInitData && (
									<p>
										<strong>initData (превью):</strong>{' '}
										<code
											style={{
												background: '#e0e0e0',
												padding: '2px 6px',
												borderRadius: '4px',
												fontSize: '12px',
											}}
										>
											{telegramInfo.initDataPreview}
										</code>
									</p>
								)}
								<p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
									💡 Откройте консоль браузера (F12) для детальной информации
								</p>
							</div>
						)}
						<button onClick={handleTelegramAuth}>
							Войти через Telegram
						</button>
						<p className="note">
							Примечание: В реальном приложении авторизация происходит
							автоматически через Telegram Mini App
						</p>
					</div>
				) : (
					<div className="dashboard">
						<h2>Добро пожаловать!</h2>
						{user && (
							<div className="user-info">
								<p>
									<strong>Имя:</strong> {user.name}
								</p>
								<p>
									<strong>Роль:</strong> {user.role}
								</p>
								<p>
									<strong>ID:</strong> {user.id}
								</p>
							</div>
						)}
						<button onClick={handleLogout}>Выйти</button>
					</div>
				)}
			</main>

			<footer>
				<p>
					API URL: {import.meta.env.VITE_API || 'Не настроен'}
				</p>
			</footer>
		</div>
	);
}

export default App;
