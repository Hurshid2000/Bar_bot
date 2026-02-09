import { useState, useRef } from 'react';
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
	const [pin, setPinValues] = useState<string[]>(['', '', '', '']);
	const [confirmPin, setConfirmPin] = useState<string[]>(['', '', '', '']);
	const [pinStep, setPinStep] = useState<'idle' | 'enter' | 'confirm'>('idle');
	const [pinLoading, setPinLoading] = useState(false);
	const [pinSuccess, setPinSuccess] = useState(false);
	const [pinError, setPinError] = useState('');
	const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
	const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

	// --- Имя ---
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

	// --- PIN ---
	const handlePinChange = (
		values: string[],
		setValues: (v: string[]) => void,
		refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
		index: number,
		value: string,
	) => {
		if (value && !/^\d$/.test(value)) return;
		const newValues = [...values];
		newValues[index] = value;
		setValues(newValues);
		if (value && index < 3) refs.current[index + 1]?.focus();
	};

	const handlePinKeyDown = (
		values: string[],
		refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
		index: number,
		e: React.KeyboardEvent,
	) => {
		if (e.key === 'Backspace' && !values[index] && index > 0) {
			refs.current[index - 1]?.focus();
		}
	};

	const handlePinPaste = (
		setValues: (v: string[]) => void,
		refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
		e: React.ClipboardEvent,
	) => {
		e.preventDefault();
		const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
		if (pasted.length === 4) {
			setValues(pasted.split(''));
			refs.current[3]?.focus();
		}
	};

	const handlePinNext = () => {
		if (pin.join('').length !== 4) {
			setPinError('Введите 4 цифры');
			return;
		}
		setPinError('');
		setPinStep('confirm');
		setTimeout(() => confirmRefs.current[0]?.focus(), 100);
	};

	const handlePinSave = async () => {
		const pinCode = pin.join('');
		const confirmCode = confirmPin.join('');
		if (pinCode !== confirmCode) {
			setPinError('PIN-коды не совпадают');
			setConfirmPin(['', '', '', '']);
			confirmRefs.current[0]?.focus();
			return;
		}
		try {
			setPinError('');
			setPinLoading(true);
			await setPin(pinCode);
			setPinSuccess(true);
			setPinStep('idle');
			setPinValues(['', '', '', '']);
			setConfirmPin(['', '', '', '']);
		} catch (err: any) {
			setPinError(err.message || 'Ошибка сохранения');
		} finally {
			setPinLoading(false);
		}
	};

	const resetPin = () => {
		setPinStep('idle');
		setPinValues(['', '', '', '']);
		setConfirmPin(['', '', '', '']);
		setPinError('');
		setPinSuccess(false);
	};

	const renderPinInputs = (
		values: string[],
		setValues: (v: string[]) => void,
		refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
	) => (
		<div
			className="pin-inputs"
			onPaste={(e) => handlePinPaste(setValues, refs, e)}
		>
			{values.map((digit, index) => (
				<input
					key={index}
					ref={(el) => { refs.current[index] = el; }}
					type="text"
					inputMode="numeric"
					maxLength={1}
					value={digit}
					onChange={(e) => handlePinChange(values, setValues, refs, index, e.target.value)}
					onKeyDown={(e) => handlePinKeyDown(values, refs, index, e)}
					className="pin-input"
					autoFocus={index === 0}
				/>
			))}
		</div>
	);

	return (
		<div className="settings-page">
			<h1 className="settings-title">Настройки</h1>

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
				<h2 className="settings-card-title">PIN-код для десктопа</h2>

				{pinStep === 'idle' && (
					<>
						{pinSuccess && (
							<div className="settings-success">PIN-код установлен</div>
						)}
						<p className="settings-description">
							PIN-код нужен для входа в десктоп-версию Bar CRM
						</p>
						<Button
							variant="primary"
							size="md"
							onClick={() => { setPinStep('enter'); setPinSuccess(false); setTimeout(() => pinRefs.current[0]?.focus(), 100); }}
						>
							{pinSuccess ? 'Изменить PIN' : 'Установить PIN'}
						</Button>
					</>
				)}

				{pinStep === 'enter' && (
					<>
						<p className="settings-description">Введите 4-значный PIN-код</p>
						{renderPinInputs(pin, setPinValues, pinRefs)}
						{pinError && <div className="settings-error">{pinError}</div>}
						<div className="settings-actions">
							<Button variant="outline" size="md" onClick={resetPin}>Отмена</Button>
							<Button variant="primary" size="md" onClick={handlePinNext}>Далее</Button>
						</div>
					</>
				)}

				{pinStep === 'confirm' && (
					<>
						<p className="settings-description">Подтвердите PIN-код</p>
						{renderPinInputs(confirmPin, setConfirmPin, confirmRefs)}
						{pinError && <div className="settings-error">{pinError}</div>}
						<div className="settings-actions">
							<Button variant="outline" size="md" onClick={() => { setPinStep('enter'); setConfirmPin(['', '', '', '']); setPinError(''); }}>Назад</Button>
							<Button variant="primary" size="md" onClick={handlePinSave} loading={pinLoading}>Сохранить</Button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
