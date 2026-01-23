import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api/orders.api';
import { Loading } from '../../components/ui/Loading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../utils/format';
import { OrderStatus } from '../../types/common.types';
import './OrderStatusPage.css';

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

export function OrderStatusPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const { data: order, isLoading } = useQuery({
		queryKey: ['orders', id],
		queryFn: () => ordersApi.getById(id!),
		enabled: !!id,
	});

	if (isLoading) {
		return <Loading />;
	}

	if (!order) {
		return (
			<div className="order-status-page">
				<Card>
					<p>Заказ не найден</p>
				</Card>
			</div>
		);
	}

	return (
		<div className="order-status-page">
			<div className="order-status-header">
				<Button variant="ghost" onClick={() => navigate('/orders/history')}>
					← Назад
				</Button>
				<h1>Заказ #{order.id.slice(0, 8)}</h1>
			</div>

			<Card className="order-status-card">
				<div className="order-status-info">
					<div className="order-status-row">
						<span className="order-status-label">Статус:</span>
						<span
							className="order-status-value"
							style={{ color: statusColors[order.status] }}
						>
							{statusLabels[order.status]}
						</span>
					</div>
					<div className="order-status-row">
						<span className="order-status-label">Бар:</span>
						<span className="order-status-value">{order.bar?.name || 'Неизвестный бар'}</span>
					</div>
					<div className="order-status-row">
						<span className="order-status-label">Дата создания:</span>
						<span className="order-status-value">{formatDate(order.createdAt)}</span>
					</div>
					{order.comment && (
						<div className="order-status-comment">
							<span className="order-status-label">Комментарий:</span>
							<p>{order.comment}</p>
						</div>
					)}
				</div>
			</Card>

			<Card className="order-status-items">
				<h2>Товары ({order.items.length})</h2>
				<div className="order-status-items-list">
					{order.items.map((item) => (
						<div key={item.id} className="order-status-item">
							<div className="order-status-item-info">
								<span className="order-status-item-name">{item.product?.name || 'Неизвестный товар'}</span>
								<span className="order-status-item-category">
									{item.product?.category?.name || 'Без категории'}
								</span>
							</div>
							<div className="order-status-item-quantity">×{item.quantity}</div>
						</div>
					))}
				</div>
			</Card>
		</div>
	);
}
