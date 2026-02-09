import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { clientsApi } from '../../api/clients.api';
import { Loading } from '../../components/ui/Loading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../utils/format';
import { formatCurrency } from '../../utils/format';
import './ClientDetailPage.css';

const transactionTypeLabels = {
	DEPOSIT: 'Депозит',
	DEBT: 'Долг',
	PAYMENT: 'Платеж',
};

const transactionTypeColors = {
	DEPOSIT: 'var(--color-success)',
	DEBT: 'var(--color-error)',
	PAYMENT: 'var(--color-primary-500)',
};

export function ClientDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const { data: client, isLoading: clientLoading } = useQuery({
		queryKey: ['clients', id],
		queryFn: () => clientsApi.getById(id!),
		enabled: !!id,
	});

	const { data: transactions, isLoading: transactionsLoading } = useQuery({
		queryKey: ['clients', id, 'transactions'],
		queryFn: () => clientsApi.getTransactions(id!),
		enabled: !!id,
	});

	const { data: editLogs, isLoading: editLogsLoading } = useQuery({
		queryKey: ['clients', id, 'edit-logs'],
		queryFn: () => clientsApi.getEditLogs(id!),
		enabled: !!id,
	});

	if (clientLoading) {
		return <Loading />;
	}

	if (!client) {
		return (
			<div className="client-detail-page">
				<Card>
					<p>Клиент не найден</p>
				</Card>
			</div>
		);
	}

	return (
		<div className="client-detail-page">
			<div className="client-detail-header">
				<Button variant="ghost" onClick={() => navigate(-1)} className="client-detail-back-btn">
					<ArrowLeft size={20} />
					Назад
				</Button>
				<h1>{client.name}</h1>
			</div>

			<Card className="client-detail-card">
				<div className="client-detail-info">
					<div className="client-detail-row">
						<span className="client-detail-label">Телефон:</span>
						<span className="client-detail-value">{client.phone || 'Не указан'}</span>
					</div>
					<div className="client-detail-row">
						<span className="client-detail-label">Баланс:</span>
						<span
							className={`client-detail-value client-detail-balance ${
								client.balance < 0 ? 'client-balance-debt' : client.balance > 0 ? 'client-balance-deposit' : ''
							}`}
						>
							{formatCurrency(client.balance)}
						</span>
					</div>
					<div className="client-detail-row">
						<span className="client-detail-label">Дата создания:</span>
						<span className="client-detail-value">{formatDate(client.createdAt)}</span>
					</div>
				</div>
			</Card>

			<Card className="client-detail-transactions">
				<h2>История операций</h2>
				{transactionsLoading ? (
					<Loading />
				) : transactions && transactions.length > 0 ? (
					<div className="client-detail-transactions-list">
						{transactions.map((transaction) => (
							<div key={transaction.id} className="client-detail-transaction">
								<div className="client-detail-transaction-info">
									<div className="client-detail-transaction-header">
										<span
											className="client-detail-transaction-type"
											style={{ color: transactionTypeColors[transaction.type] }}
										>
											{transactionTypeLabels[transaction.type]}
										</span>
										<span className="client-detail-transaction-amount">
											{transaction.type === 'DEBT' ? '-' : '+'}
											{formatCurrency(transaction.amount)}
										</span>
									</div>
									{transaction.comment && (
										<p className="client-detail-transaction-comment">{transaction.comment}</p>
									)}
									<p className="client-detail-transaction-date">
										{formatDate(transaction.createdAt)} • {transaction.user?.name || 'Неизвестно'}
									</p>
								</div>
							</div>
						))}
					</div>
				) : (
					<p>Операций не найдено</p>
				)}
			</Card>

			{editLogs && editLogs.length > 0 && (
				<Card className="client-detail-edit-logs">
					<h2>История изменений</h2>
					{editLogsLoading ? (
						<Loading />
					) : (
						<div className="client-detail-edit-logs-list">
							{editLogs.map((log) => (
								<div key={log.id} className="client-detail-edit-log">
									<div className="client-detail-edit-log-header">
										<span className="client-detail-edit-log-field">{log.fieldName}</span>
										<span className="client-detail-edit-log-date">{formatDate(log.createdAt)}</span>
									</div>
									<div className="client-detail-edit-log-changes">
										<span className="client-detail-edit-log-old">
											Было: {log.oldValue || '—'}
										</span>
										<span className="client-detail-edit-log-new">
											Стало: {log.newValue || '—'}
										</span>
									</div>
									<p className="client-detail-edit-log-user">
										Изменено: {log.user?.name || 'Неизвестно'}
									</p>
								</div>
							))}
						</div>
					)}
				</Card>
			)}
		</div>
	);
}
