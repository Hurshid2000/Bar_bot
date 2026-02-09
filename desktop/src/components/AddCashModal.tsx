import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { revenueApi } from '../api/revenue.api';
import { format } from 'date-fns';
import './AddCashModal.css';

interface AddCashModalProps {
	isOpen: boolean;
	onClose: () => void;
	barId: string;
	selectedDate: Date;
	existingCash?: number;
}

export function AddCashModal({
	isOpen,
	onClose,
	barId,
	selectedDate,
	existingCash,
}: AddCashModalProps) {
	const [cash, setCash] = useState(existingCash?.toString() || '');
	const [error, setError] = useState('');
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (data: { barId: string; date: string; cash: number }) =>
			revenueApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['revenue'] });
			onClose();
			setCash('');
			setError('');
		},
		onError: (err: any) => {
			setError(err.message || 'Ошибка при сохранении');
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		const cashValue = parseFloat(cash);
		if (isNaN(cashValue) || cashValue < 0) {
			setError('Введите корректную сумму');
			return;
		}

		const dateStr = format(selectedDate, 'yyyy-MM-dd');

		// Отправляем ТОЛЬКО cash - card не трогаем
		mutation.mutate({
			barId,
			date: dateStr,
			cash: cashValue,
		});
	};

	const handleClose = () => {
		setCash(existingCash?.toString() || '');
		setError('');
		onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={handleClose} title="Наличные">
			<form onSubmit={handleSubmit} className="add-cash-form">
				<div className="add-cash-date">
					<strong>Дата:</strong> {format(selectedDate, 'dd.MM.yyyy')}
				</div>

				<Input
					label="Сумма наличных"
					type="number"
					step="0.01"
					min="0"
					value={cash}
					onChange={(e) => setCash(e.target.value)}
					error={error}
					placeholder="0.00"
					required
				/>

				{error && <div className="add-cash-error">{error}</div>}

				<div className="add-cash-actions">
					<Button type="button" variant="outline" onClick={handleClose}>
						Отмена
					</Button>
					<Button type="submit" variant="primary" loading={mutation.isPending}>
						Сохранить
					</Button>
				</div>
			</form>
		</Modal>
	);
}
