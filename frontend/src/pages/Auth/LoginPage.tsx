import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authenticateWithTelegram, saveToken } from '../../api/auth.api';
import { useTelegram } from '../../hooks/useTelegram';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import './LoginPage.css';

export function LoginPage() {
	const [error, setError] = useState<string>('');
	const [loading, setLoading] = useState(false);
	const [telegramId, setTelegramId] = useState<string>('');
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
			// Генерируем актуальный auth_date для fallback режима
			let telegramInitData = initData;
			if (!telegramInitData) {
				// В fallback режиме используем telegramId из input или дефолтный
				const userId = telegramId.trim() || '123456789';
				const currentAuthDate = Math.floor(Date.now() / 1000);
				// URL-encoded JSON с пользовательским telegramId
				const userData = JSON.stringify({
					id: parseInt(userId, 10),
					first_name: 'Test',
					last_name: 'User'
				});
				telegramInitData = `user=${encodeURIComponent(userData)}&auth_date=${currentAuthDate}&hash=test`;
			}

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

				{/* Показываем поле ввода если нет initData от Telegram */}
				{!initData && (
					<div style={{ marginTop: '16px', width: '100%' }}>
						<Input
							label="Telegram ID (для входа в свой аккаунт)"
							type="text"
							value={telegramId}
							onChange={(e) => setTelegramId(e.target.value)}
							placeholder="Введите ваш Telegram ID"
						/>
						<p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
							Оставьте пустым для использования тестового аккаунта (123456789)
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
