import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authenticateWithTelegram, saveToken } from '../../api/auth.api';
import { useTelegram } from '../../hooks/useTelegram';
import { Button } from '../../components/ui/Button';
import './LoginPage.css';

export function LoginPage() {
	const [error, setError] = useState<string>('');
	const [loading, setLoading] = useState(false);
	const { setUser, setToken, isAuthenticated } = useAuth();
	const { isAvailable, initData } = useTelegram();
	const navigate = useNavigate();

	useEffect(() => {
		if (isAuthenticated) {
			navigate('/');
		}
	}, [isAuthenticated, navigate]);

	const handleLogin = async () => {
		try {
			setError('');
			setLoading(true);

			// Используем initData из Telegram или fallback для разработки
			const telegramInitData =
				initData ||
				'user=%7B%22id%22%3A123456789%7D&auth_date=1234567890&hash=test';

			const response = await authenticateWithTelegram(telegramInitData);
			// Сохраняем токен в localStorage
			saveToken(response.accessToken);
			setToken(response.accessToken);
			setUser(response.user);
			navigate('/');
		} catch (err: any) {
			setError(err.message || 'Ошибка авторизации');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="login-page">
			<div className="login-container">
				<h1>Bar CRM</h1>
				<p>Система управления сетью баров</p>

				{!isAvailable && (
					<div className="login-warning">
						<p>⚠️ Telegram WebApp не доступен</p>
						<p className="login-warning-note">
							Для тестирования используется fallback режим
						</p>
					</div>
				)}

				{error && <div className="login-error">{error}</div>}

				<Button
					variant="primary"
					size="lg"
					onClick={handleLogin}
					loading={loading}
					className="login-button"
				>
					Войти через Telegram
				</Button>

				<p className="login-note">
					В реальном приложении авторизация происходит автоматически через
					Telegram Mini App
				</p>
			</div>
		</div>
	);
}
