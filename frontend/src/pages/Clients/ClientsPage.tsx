import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, ArrowLeft } from 'lucide-react';
import { clientsApi } from '../../api/clients.api';
import { Loading } from '../../components/ui/Loading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { formatCurrency } from '../../utils/format';
import { CreateClientModal } from './components/CreateClientModal';
import { ClientTransactionModal } from './components/ClientTransactionModal';
import { EditClientModal } from './components/EditClientModal';
import './ClientsPage.css';

type SortByType = 'debt' | 'deposit' | 'all';

export function ClientsPage() {
	const { id: barId } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [searchQuery, setSearchQuery] = useState('');
	const [sortBy, setSortBy] = useState<SortByType>('all');
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [selectedClient, setSelectedClient] = useState<string | null>(null);
	const [transactionType, setTransactionType] = useState<'DEPOSIT' | 'DEBT' | 'PAYMENT' | null>(null);
	const [editClientId, setEditClientId] = useState<string | null>(null);

	// Загружаем клиентов
	const { data: clientsData, isLoading } = useQuery({
		queryKey: ['clients', barId, searchQuery, sortBy],
		queryFn: () =>
			clientsApi.getAll({
				barId: barId!,
				search: searchQuery || undefined,
				sortBy: sortBy === 'all' ? undefined : sortBy,
				isActive: true,
				page: 1,
				limit: 100,
			}),
		enabled: !!barId,
	});

	// Загружаем статистику
	const { data: statistics } = useQuery({
		queryKey: ['clients-statistics', barId],
		queryFn: () => clientsApi.getStatistics(barId!),
		enabled: !!barId,
	});

	const deleteClientMutation = useMutation({
		mutationFn: (id: string) => clientsApi.update(id, { isActive: false }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['clients'] });
			queryClient.invalidateQueries({ queryKey: ['clients-statistics'] });
		},
	});

	const handleCreateTransaction = (clientId: string, type: 'DEPOSIT' | 'DEBT' | 'PAYMENT') => {
		setSelectedClient(clientId);
		setTransactionType(type);
	};

	const handleEditClient = (clientId: string) => {
		setEditClientId(clientId);
	};

	const handleDeleteClient = (clientId: string) => {
		if (confirm('Вы уверены, что хотите деактивировать этого клиента?')) {
			deleteClientMutation.mutate(clientId);
		}
	};

	if (!barId) {
		return (
			<div className="clients-page">
				<p>Бар не найден</p>
			</div>
		);
	}

	return (
		<div className="clients-page">
			<div className="clients-header">
				<Button variant="ghost" onClick={() => navigate(`/bars/${barId}`)} className="clients-back-btn">
					<ArrowLeft size={20} />
					Назад
				</Button>
			</div>

			<div className="clients-title-section">
				<h1>Клиенты</h1>
				<Button variant="primary" onClick={() => setShowCreateModal(true)}>
					<Plus size={20} />
					Добавить клиента
				</Button>
			</div>

			{/* Статистика */}
			{statistics && (
				<div className="clients-statistics">
					<Card className="clients-stat-card">
						<div className="clients-stat-item">
							<span className="clients-stat-label">Должники:</span>
							<span className="clients-stat-value clients-stat-debt">
								{statistics.debtorsCount} ({formatCurrency(statistics.totalDebt)})
							</span>
						</div>
						<div className="clients-stat-item">
							<span className="clients-stat-label">Депозитники:</span>
							<span className="clients-stat-value clients-stat-deposit">
								{statistics.depositorsCount} ({formatCurrency(statistics.totalDeposit)})
							</span>
						</div>
					</Card>
				</div>
			)}

			{/* Поиск и фильтры */}
			<div className="clients-filters">
				<div className="clients-search">
					<Search className="clients-search-icon" size={20} />
					<input
						type="text"
						className="clients-search-input"
						placeholder="Поиск по имени или телефону"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<Select
					value={sortBy}
					onChange={(e) => setSortBy(e.target.value as SortByType)}
					options={[
						{ value: 'all', label: 'Все' },
						{ value: 'debt', label: 'Должники' },
						{ value: 'deposit', label: 'Депозитники' },
					]}
					className="clients-sort-select"
				/>
			</div>

			{/* Список клиентов */}
			{isLoading ? (
				<Loading />
			) : clientsData && clientsData.data.length > 0 ? (
				<div className="clients-list">
					{clientsData.data.map((client) => (
						<Card key={client.id} className="clients-card">
							<div className="clients-card-header">
								<div className="clients-card-info">
									<h3 className="clients-card-name">{client.name}</h3>
									{client.phone && (
										<p className="clients-card-phone">{client.phone}</p>
									)}
								</div>
								<div
									className={`clients-card-balance ${
										client.balance < 0 ? 'clients-balance-debt' : client.balance > 0 ? 'clients-balance-deposit' : ''
									}`}
								>
									{formatCurrency(client.balance)}
								</div>
							</div>
							<div className="clients-card-actions">
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleCreateTransaction(client.id, 'DEPOSIT')}
								>
									Депозит
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleCreateTransaction(client.id, 'DEBT')}
								>
									Долг
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleCreateTransaction(client.id, 'PAYMENT')}
								>
									Платеж
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => navigate(`/clients/${client.id}`)}
								>
									История
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleEditClient(client.id)}
								>
									Изменить
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleDeleteClient(client.id)}
								>
									Удалить
								</Button>
							</div>
						</Card>
					))}
				</div>
			) : (
				<Card className="clients-empty">
					<p>Клиенты не найдены</p>
				</Card>
			)}

			{/* Модальные окна */}
			<CreateClientModal
				isOpen={showCreateModal}
				onClose={() => setShowCreateModal(false)}
				barId={barId}
			/>

			{selectedClient && transactionType && (
				<ClientTransactionModal
					isOpen={!!selectedClient && !!transactionType}
					onClose={() => {
						setSelectedClient(null);
						setTransactionType(null);
					}}
					clientId={selectedClient}
					type={transactionType}
				/>
			)}

			{editClientId && (
				<EditClientModal
					isOpen={!!editClientId}
					onClose={() => setEditClientId(null)}
					clientId={editClientId}
				/>
			)}
		</div>
	);
}
