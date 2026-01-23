import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { clientsApi } from '../../../api/clients.api';
import './ClientModals.css';

interface ClientTransactionModalProps {
	isOpen: boolean;
	onClose: () => void;
	clientId: string;
	type: 'DEPOSIT' | 'DEBT' | 'PAYMENT';
}

const typeLabels = {
	DEPOSIT: 'Депозит',
	DEBT: 'Долг',
	PAYMENT: 'Платеж',
};

export function ClientTransactionModal({
	isOpen,
	onClose,
	clientId,
	type,
}: ClientTransactionModalProps) {
	const queryClient = useQueryClient();
	const [amount, setAmount] = useState('');
	const [comment, setComment] = useState('');

	useEffect(() => {
		if (isOpen) {
			setAmount('');
			setComment('');
		}
	}, [isOpen]);

	const createTransactionMutation = useMutation({
		mutationFn: () =>
			clientsApi.createTransaction(clientId, {
				type,
				amount: parseFloat(amount),
				comment: comment || undefined,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['clients'] });
			queryClient.invalidateQueries({ queryKey: ['clients-statistics'] });
			onClose();
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const amountNum = parseFloat(amount);
		if (!amountNum || amountNum <= 0) return;
		createTransactionMutation.mutate();
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={typeLabels[type]}
			footer={
				<>
					<Button variant="ghost" onClick={onClose} disabled={createTransactionMutation.isPending}>
						Отмена
					</Button>
					<Button
						variant="primary"
						onClick={handleSubmit}
						disabled={createTransactionMutation.isPending || !amount || parseFloat(amount) <= 0}
					>
						{createTransactionMutation.isPending ? 'Сохранение...' : 'Сохранить'}
					</Button>
				</>
			}
		>
			<form className="client-modal-form" onSubmit={handleSubmit}>
				<Input
					label="Сумма *"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					placeholder="0.00"
					type="number"
					step="0.01"
					min="0.01"
					required
				/>
				<div className="input-wrapper">
					<label className="input-label">Комментарий (необязательно)</label>
					<textarea
						className="input"
						value={comment}
						onChange={(e) => setComment(e.target.value)}
						placeholder="Добавьте комментарий..."
						rows={3}
					/>
				</div>
			</form>
		</Modal>
	);
}
