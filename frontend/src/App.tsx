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
	}, []);

	// Обработка авторизации через Telegram
	const handleTelegramAuth = async () => {
		try {
			setError('');

			// В реальном приложении initData будет приходить от Telegram WebApp
			// Для тестирования можно использовать тестовые данные
			// В продакшене это будет: window.Telegram.WebApp.initData
			const initData =
				window.Telegram?.WebApp?.initData ||
				'user=%7B%22id%22%3A123456789%7D&auth_date=1234567890&hash=test';

			const response = await authenticateWithTelegram(initData);
			saveToken(response.accessToken);
			setUser(response.user);
			setIsAuthenticated(true);
		} catch (err: any) {
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
