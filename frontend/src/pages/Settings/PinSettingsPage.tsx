import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { setPin } from '../../api/auth.api';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import './PinSettingsPage.css';

export function PinSettingsPage() {
	const [pin, setPinValues] = useState<string[]>(['', '', '', '']);
	const [confirmPin, setConfirmPin] = useState<string[]>(['', '', '', '']);
	const [step, setStep] = useState<'enter' | 'confirm'>('enter');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);
	const [loading, setLoading] = useState(false);
	const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
	const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);
	const { user } = useAuth();
	const navigate = useNavigate();

	const handleChange = (
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

		if (value && index < 3) {
			refs.current[index + 1]?.focus();
		}
	};

	const handleKeyDown = (
		values: string[],
		refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
		index: number,
		e: React.KeyboardEvent,
	) => {
		if (e.key === 'Backspace' && !values[index] && index > 0) {
			refs.current[index - 1]?.focus();
		}
	};

	const handlePaste = (
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

	const handleNext = () => {
		const pinCode = pin.join('');
		if (pinCode.length !== 4) {
			setError('Введите 4 цифры');
			return;
		}
		setError('');
		setStep('confirm');
		setTimeout(() => confirmRefs.current[0]?.focus(), 100);
	};

	const handleSave = async () => {
		const pinCode = pin.join('');
		const confirmCode = confirmPin.join('');

		if (pinCode !== confirmCode) {
			setError('PIN-коды не совпадают');
			setConfirmPin(['', '', '', '']);
			confirmRefs.current[0]?.focus();
			return;
		}

		try {
			setError('');
			setLoading(true);
			await setPin(pinCode);
			setSuccess(true);
		} catch (err: any) {
			setError(err.message || 'Ошибка сохранения');
		} finally {
			setLoading(false);
		}
	};

	if (success) {
		return (
			<div className="pin-settings-page">
				<div className="pin-settings-card">
					<div className="pin-success-icon">✓</div>
					<h2>PIN-код установлен</h2>
					<p>Теперь вы можете входить в десктоп-версию используя:</p>
					<div className="pin-info-block">
						<span className="pin-info-label">Telegram ID</span>
						<span className="pin-info-value">{user?.telegramId}</span>
					</div>
					<Button variant="primary" size="lg" onClick={() => navigate(-1)}>
						Готово
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="pin-settings-page">
			<div className="pin-settings-card">
				<h2>{step === 'enter' ? 'Установите PIN-код' : 'Подтвердите PIN-код'}</h2>
				<p className="pin-settings-subtitle">
					{step === 'enter'
						? 'PIN-код нужен для входа в десктоп-версию'
						: 'Повторите PIN-код для подтверждения'}
				</p>

				<div
					className="pin-inputs"
					onPaste={(e) =>
						handlePaste(
							step === 'enter' ? setPinValues : setConfirmPin,
							step === 'enter' ? pinRefs : confirmRefs,
							e,
						)
					}
				>
					{(step === 'enter' ? pin : confirmPin).map((digit, index) => (
						<input
							key={`${step}-${index}`}
							ref={(el) => {
								(step === 'enter' ? pinRefs : confirmRefs).current[index] = el;
							}}
							type="text"
							inputMode="numeric"
							maxLength={1}
							value={digit}
							onChange={(e) =>
								handleChange(
									step === 'enter' ? pin : confirmPin,
									step === 'enter' ? setPinValues : setConfirmPin,
									step === 'enter' ? pinRefs : confirmRefs,
									index,
									e.target.value,
								)
							}
							onKeyDown={(e) =>
								handleKeyDown(
									step === 'enter' ? pin : confirmPin,
									step === 'enter' ? pinRefs : confirmRefs,
									index,
									e,
								)
							}
							className="pin-input"
							autoFocus={index === 0}
						/>
					))}
				</div>

				{error && <div className="pin-error">{error}</div>}

				<div className="pin-actions">
					{step === 'enter' ? (
						<Button variant="primary" size="lg" onClick={handleNext}>
							Далее
						</Button>
					) : (
						<>
							<Button
								variant="outline"
								size="lg"
								onClick={() => {
									setStep('enter');
									setConfirmPin(['', '', '', '']);
									setError('');
								}}
							>
								Назад
							</Button>
							<Button variant="primary" size="lg" onClick={handleSave} loading={loading}>
								Сохранить
							</Button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
