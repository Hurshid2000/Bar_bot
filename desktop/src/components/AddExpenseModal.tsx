import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { expensesApi } from '../api/expenses.api';
import { format } from 'date-fns';
import './AddExpenseModal.css';

interface AddExpenseModalProps {
	isOpen: boolean;
	onClose: () => void;
	barId: string;
	selectedDate: Date;
	existingExpense?: { id: string; amount: number; description: string };
}

export function AddExpenseModal({
	isOpen,
	onClose,
	barId,
	selectedDate,
	existingExpense,
}: AddExpenseModalProps) {
	const [amount, setAmount] = useState(existingExpense?.amount.toString() || '');
	const [description, setDescription] = useState(existingExpense?.description || '');
	const [error, setError] = useState('');
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (data: { barId: string; amount: number; description: string }) =>
			expensesApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['expenses'] });
			onClose();
			setAmount('');
			setDescription('');
			setError('');
		},
		onError: (err: any) => {
			setError(err.message || 'Ошибка при сохранении');
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		const amountValue = parseFloat(amount);
		if (isNaN(amountValue) || amountValue < 0) {
			setError('Введите корректную сумму');
			return;
		}

		if (!description.trim()) {
			setError('Введите описание расхода');
			return;
		}

		mutation.mutate({
			barId,
			amount: amountValue,
			description: description.trim(),
		});
	};

	const handleClose = () => {
		setAmount(existingExpense?.amount.toString() || '');
		setDescription(existingExpense?.description || '');
		setError('');
		onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={handleClose} title="Расходы">
			<form onSubmit={handleSubmit} className="add-expense-form">
				<div className="add-expense-date">
					<strong>Дата:</strong> {format(selectedDate, 'dd.MM.yyyy')}
				</div>

				<Input
					label="Сумма расхода"
					type="number"
					step="0.01"
					min="0"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					error={error && !description.trim() ? '' : error}
					placeholder="0.00"
					required
				/>

				<Input
					label="Описание"
					type="text"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					error={error && !description.trim() ? error : ''}
					placeholder="Например: Закупка продуктов"
					required
				/>

				{error && <div className="add-expense-error">{error}</div>}

				<div className="add-expense-actions">
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
