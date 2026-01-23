import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { clientsApi } from '../../../api/clients.api';
import './ClientModals.css';

interface CreateClientModalProps {
	isOpen: boolean;
	onClose: () => void;
	barId: string;
}

export function CreateClientModal({ isOpen, onClose, barId }: CreateClientModalProps) {
	const queryClient = useQueryClient();
	const [name, setName] = useState('');
	const [phone, setPhone] = useState('');

	useEffect(() => {
		if (isOpen) {
			setName('');
			setPhone('');
		}
	}, [isOpen]);

	const createClientMutation = useMutation({
		mutationFn: () =>
			clientsApi.create({
				barId,
				name,
				phone: phone || undefined,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['clients'] });
			queryClient.invalidateQueries({ queryKey: ['clients-statistics'] });
			onClose();
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		createClientMutation.mutate();
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Добавить клиента"
			footer={
				<>
					<Button variant="ghost" onClick={onClose} disabled={createClientMutation.isPending}>
						Отмена
					</Button>
					<Button
						variant="primary"
						onClick={handleSubmit}
						disabled={createClientMutation.isPending || !name.trim()}
					>
						{createClientMutation.isPending ? 'Создание...' : 'Создать'}
					</Button>
				</>
			}
		>
			<form className="client-modal-form" onSubmit={handleSubmit}>
				<Input
					label="Имя *"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Введите имя клиента"
					required
				/>
				<Input
					label="Телефон"
					value={phone}
					onChange={(e) => setPhone(e.target.value)}
					placeholder="+998901234567"
					type="tel"
				/>
			</form>
		</Modal>
	);
}
