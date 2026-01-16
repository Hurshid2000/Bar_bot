import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { revenueApi } from '../api/revenue.api';
import { format } from 'date-fns';
import './AddCardIncomeModal.css';

interface AddCardIncomeModalProps {
	isOpen: boolean;
	onClose: () => void;
	barId: string;
	selectedDate: Date;
	existingCard?: number;
}

export function AddCardIncomeModal({
	isOpen,
	onClose,
	barId,
	selectedDate,
	existingCard,
}: AddCardIncomeModalProps) {
	const [card, setCard] = useState(existingCard?.toString() || '');
	const [error, setError] = useState('');
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (data: { barId: string; date: string; cash: number; card: number }) =>
			revenueApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['revenue'] });
			onClose();
			setCard('');
			setError('');
		},
		onError: (err: any) => {
			setError(err.message || 'Ошибка при сохранении');
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		const cardValue = parseFloat(card);
		if (isNaN(cardValue) || cardValue < 0) {
			setError('Введите корректную сумму');
			return;
		}

		const dateStr = format(selectedDate, 'yyyy-MM-dd');

		// Если есть существующие данные, нужно обновить (пока создаем новую запись)
		// TODO: Добавить API для обновления revenue
		mutation.mutate({
			barId,
			date: dateStr,
			cash: existingCard !== undefined ? 0 : 0, // Если редактируем, сохраняем cash как 0
			card: cardValue,
		});
	};

	const handleClose = () => {
		setCard(existingCard?.toString() || '');
		setError('');
		onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={handleClose} title="Переводы">
			<form onSubmit={handleSubmit} className="add-card-income-form">
				<div className="add-card-income-date">
					<strong>Дата:</strong> {format(selectedDate, 'dd.MM.yyyy')}
				</div>

				<Input
					label="Сумма переводов"
					type="number"
					step="0.01"
					min="0"
					value={card}
					onChange={(e) => setCard(e.target.value)}
					error={error}
					placeholder="0.00"
					required
				/>

				{error && <div className="add-card-income-error">{error}</div>}

				<div className="add-card-income-actions">
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
