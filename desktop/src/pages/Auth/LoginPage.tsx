import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authenticateWithPin, saveToken } from '../../api/auth.api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import './LoginPage.css';

export function LoginPage() {
	const [error, setError] = useState<string>('');
	const [loading, setLoading] = useState(false);
	const [telegramId, setTelegramId] = useState<string>('');
	const [pin, setPin] = useState<string[]>(['', '', '', '']);
	const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
	const { setUser, setToken, isAuthenticated } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (isAuthenticated) {
			navigate('/');
		}
	}, [isAuthenticated, navigate]);

	const handlePinChange = (index: number, value: string) => {
		// Только цифры
		if (value && !/^\d$/.test(value)) return;

		const newPin = [...pin];
		newPin[index] = value;
		setPin(newPin);

		// Автоматический переход к следующему полю
		if (value && index < 3) {
			pinRefs.current[index + 1]?.focus();
		}
	};

	const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
		if (e.key === 'Backspace' && !pin[index] && index > 0) {
			pinRefs.current[index - 1]?.focus();
		}
		if (e.key === 'Enter' && pin.every(d => d !== '')) {
			handleLogin();
		}
	};

	const handlePinPaste = (e: React.ClipboardEvent) => {
		e.preventDefault();
		const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
		if (pasted.length === 4) {
			setPin(pasted.split(''));
			pinRefs.current[3]?.focus();
		}
	};

	const handleLogin = async () => {
		const pinCode = pin.join('');

		if (!telegramId.trim()) {
			setError('Введите Telegram ID');
			return;
		}

		if (pinCode.length !== 4) {
			setError('Введите 4-значный PIN-код');
			return;
		}

		try {
			setError('');
			setLoading(true);

			const response = await authenticateWithPin(telegramId.trim(), pinCode);
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
				<div className="login-logo">
					<h1>Bar CRM</h1>
					<span className="login-badge">Desktop</span>
				</div>
				<p>Система управления сетью баров</p>

				<div className="login-form">
					<Input
						label="Telegram ID"
						type="text"
						value={telegramId}
						onChange={(e) => setTelegramId(e.target.value)}
						placeholder="Введите ваш Telegram ID"
					/>

					<div className="pin-section">
						<label className="pin-label">PIN-код</label>
						<div className="pin-inputs" onPaste={handlePinPaste}>
							{pin.map((digit, index) => (
								<input
									key={index}
									ref={(el) => { pinRefs.current[index] = el; }}
									type="text"
									inputMode="numeric"
									maxLength={1}
									value={digit}
									onChange={(e) => handlePinChange(index, e.target.value)}
									onKeyDown={(e) => handlePinKeyDown(index, e)}
									className="pin-input"
									autoFocus={index === 0 && !!telegramId}
								/>
							))}
						</div>
					</div>
				</div>

				{error && <div className="login-error">{error}</div>}

				<Button
					variant="primary"
					size="lg"
					onClick={handleLogin}
					loading={loading}
					className="login-button"
				>
					Войти
				</Button>

				<p className="login-note">
					PIN-код можно установить через Telegram Mini App
				</p>
			</div>
		</div>
	);
}
