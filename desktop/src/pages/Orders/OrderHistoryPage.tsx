import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ordersApi } from '../../api/orders.api';
import { Loading } from '../../components/ui/Loading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../utils/format';
import { OrderStatus } from '../../types/common.types';
import './OrderHistoryPage.css';

const statusLabels: Record<OrderStatus, string> = {
	NEW: 'Новый',
	IN_PROGRESS: 'В обработке',
	COMPLETED: 'Выполнен',
	CANCELLED: 'Отменен',
};

const statusColors: Record<OrderStatus, string> = {
	NEW: 'var(--color-primary-500)',
	IN_PROGRESS: 'var(--color-warning)',
	COMPLETED: 'var(--color-success)',
	CANCELLED: 'var(--color-error)',
};

export function OrderHistoryPage() {
	const navigate = useNavigate();

	const { data: ordersData, isLoading } = useQuery({
		queryKey: ['orders', 'history'],
		queryFn: () => ordersApi.getAll({ page: 1, limit: 50 }),
	});

	if (isLoading) {
		return <Loading />;
	}

	const orders = ordersData?.data || [];

	return (
		<div className="order-history-page">
			<div className="order-history-header">
				<Button variant="ghost" onClick={() => navigate('/orders')} className="order-history-back-btn">
					<ArrowLeft size={20} />
					Назад
				</Button>
				<h1>История заказов</h1>
			</div>

			{orders.length > 0 ? (
				<div className="order-history-list">
					{orders.map((order) => (
						<Card
							key={order.id}
							className="order-history-card"
							onClick={() => navigate(`/orders/${order.id}`)}
						>
							<div className="order-history-card-header">
								<div>
									<h3>Заказ #{order.id.slice(0, 8)}</h3>
									<p className="order-history-card-bar">{order.bar?.name || 'Неизвестный бар'}</p>
								</div>
								<span
									className="order-history-card-status"
									style={{ color: statusColors[order.status] }}
								>
									{statusLabels[order.status]}
								</span>
							</div>
							<div className="order-history-card-info">
								<p>
									Товаров: {order.items.length} ({order.items.reduce((sum, item) => sum + item.quantity, 0)} шт.)
								</p>
								<p className="order-history-card-date">{formatDate(order.createdAt)}</p>
							</div>
						</Card>
					))}
				</div>
			) : (
				<Card>
					<p>Заказы не найдены</p>
				</Card>
			)}
		</div>
	);
}
