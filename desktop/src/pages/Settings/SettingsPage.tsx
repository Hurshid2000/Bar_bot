import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../api/users.api';
import { setPin } from '../../api/auth.api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import './SettingsPage.css';

export function SettingsPage() {
	const { user, setUser } = useAuth();

	// Имя
	const [name, setName] = useState(user?.name || '');
	const [nameLoading, setNameLoading] = useState(false);
	const [nameSuccess, setNameSuccess] = useState(false);
	const [nameError, setNameError] = useState('');

	// PIN
	const [newPin, setNewPin] = useState('');
	const [confirmPin, setConfirmPin] = useState('');
	const [pinLoading, setPinLoading] = useState(false);
	const [pinSuccess, setPinSuccess] = useState(false);
	const [pinError, setPinError] = useState('');

	const handleSaveName = async () => {
		if (!name.trim()) {
			setNameError('Введите имя');
			return;
		}
		try {
			setNameError('');
			setNameLoading(true);
			const updated = await usersApi.updateMe({ name: name.trim() });
			setUser(updated);
			setNameSuccess(true);
			setTimeout(() => setNameSuccess(false), 3000);
		} catch (err: any) {
			setNameError(err.message || 'Ошибка сохранения');
		} finally {
			setNameLoading(false);
		}
	};

	const handleSavePin = async () => {
		if (!/^\d{4}$/.test(newPin)) {
			setPinError('PIN должен содержать ровно 4 цифры');
			return;
		}
		if (newPin !== confirmPin) {
			setPinError('PIN-коды не совпадают');
			return;
		}
		try {
			setPinError('');
			setPinLoading(true);
			await setPin(newPin);
			setPinSuccess(true);
			setNewPin('');
			setConfirmPin('');
			setTimeout(() => setPinSuccess(false), 3000);
		} catch (err: any) {
			setPinError(err.message || 'Ошибка сохранения');
		} finally {
			setPinLoading(false);
		}
	};

	return (
		<div className="settings-page">
			<h1 className="settings-title">Настройки</h1>

			<div className="settings-grid">
				{/* Профиль */}
				<div className="settings-card">
					<h2 className="settings-card-title">Профиль</h2>

					<div className="settings-info-row">
						<span className="settings-label">Telegram ID</span>
						<span className="settings-value">{user?.telegramId}</span>
					</div>

					<div className="settings-info-row">
						<span className="settings-label">Роль</span>
						<span className="settings-value">{user?.role}</span>
					</div>

					<div className="settings-name-edit">
						<Input
							label="Имя"
							value={name}
							onChange={(e) => { setName(e.target.value); setNameSuccess(false); }}
							placeholder="Ваше имя"
						/>
						<Button
							variant="primary"
							size="md"
							onClick={handleSaveName}
							loading={nameLoading}
							disabled={name === user?.name}
						>
							Сохранить
						</Button>
					</div>

					{nameError && <div className="settings-error">{nameError}</div>}
					{nameSuccess && <div className="settings-success">Имя обновлено</div>}
				</div>

				{/* PIN-код */}
				<div className="settings-card">
					<h2 className="settings-card-title">PIN-код</h2>
					<p className="settings-description">
						Установите или измените PIN-код для входа в десктоп-версию
					</p>

					<div className="settings-pin-form">
						<Input
							label="Новый PIN (4 цифры)"
							type="password"
							value={newPin}
							onChange={(e) => {
								const v = e.target.value.replace(/\D/g, '').slice(0, 4);
								setNewPin(v);
								setPinSuccess(false);
							}}
							placeholder="••••"
							maxLength={4}
						/>
						<Input
							label="Подтвердите PIN"
							type="password"
							value={confirmPin}
							onChange={(e) => {
								const v = e.target.value.replace(/\D/g, '').slice(0, 4);
								setConfirmPin(v);
							}}
							placeholder="••••"
							maxLength={4}
						/>
						<Button
							variant="primary"
							size="md"
							onClick={handleSavePin}
							loading={pinLoading}
							disabled={!newPin || !confirmPin}
						>
							Сохранить PIN
						</Button>
					</div>

					{pinError && <div className="settings-error">{pinError}</div>}
					{pinSuccess && <div className="settings-success">PIN-код обновлен</div>}
				</div>
			</div>
		</div>
	);
}
