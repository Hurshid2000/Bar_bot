import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { clientsApi } from '../../../api/clients.api';
import { Loading } from '../../../components/ui/Loading';
import './ClientModals.css';

interface EditClientModalProps {
	isOpen: boolean;
	onClose: () => void;
	clientId: string;
}

export function EditClientModal({ isOpen, onClose, clientId }: EditClientModalProps) {
	const queryClient = useQueryClient();
	const [name, setName] = useState('');
	const [phone, setPhone] = useState('');

	const { data: client, isLoading } = useQuery({
		queryKey: ['clients', clientId],
		queryFn: () => clientsApi.getById(clientId),
		enabled: isOpen && !!clientId,
	});

	useEffect(() => {
		if (client) {
			setName(client.name);
			setPhone(client.phone || '');
		}
	}, [client]);

	const updateClientMutation = useMutation({
		mutationFn: (data: { name?: string; phone?: string }) =>
			clientsApi.update(clientId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['clients'] });
			onClose();
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		updateClientMutation.mutate({
			name: name.trim(),
			phone: phone.trim() || undefined,
		});
	};

	if (isLoading) {
		return (
			<Modal isOpen={isOpen} onClose={onClose} title="Редактировать клиента">
				<Loading />
			</Modal>
		);
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Редактировать клиента"
			footer={
				<>
					<Button variant="ghost" onClick={onClose} disabled={updateClientMutation.isPending}>
						Отмена
					</Button>
					<Button
						variant="primary"
						onClick={handleSubmit}
						disabled={updateClientMutation.isPending || !name.trim()}
					>
						{updateClientMutation.isPending ? 'Сохранение...' : 'Сохранить'}
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
