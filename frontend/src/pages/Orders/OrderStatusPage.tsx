import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersApi, type UpdateOrderDto } from '../../api/orders.api';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/ui/Loading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { formatDate } from '../../utils/format';
import { OrderStatus, RoleType } from '../../types/common.types';
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
	const queryClient = useQueryClient();
	const { hasRole } = useAuth();
	const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);

	const isAdminOrManager = hasRole([RoleType.ADMIN, RoleType.MANAGER]);

	const { data: order, isLoading } = useQuery({
		queryKey: ['orders', id],
		queryFn: () => ordersApi.getById(id!),
		enabled: !!id,
	});

	// Устанавливаем выбранный статус при загрузке заказа
	useEffect(() => {
		if (order && selectedStatus === null) {
			setSelectedStatus(order.status);
		}
	}, [order, selectedStatus]);

	const updateOrderMutation = useMutation({
		mutationFn: (data: UpdateOrderDto) => ordersApi.update(id!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['orders', id] });
			queryClient.invalidateQueries({ queryKey: ['orders', 'history'] });
		},
	});

	const handleStatusChange = (newStatus: OrderStatus) => {
		if (newStatus === order?.status) return;
		
		setSelectedStatus(newStatus);
		updateOrderMutation.mutate({ status: newStatus });
	};

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
				<Button variant="ghost" onClick={() => navigate('/orders')}>
					← Назад
				</Button>
				<h1>Заказ #{order.id.slice(0, 8)}</h1>
			</div>

			<Card className="order-status-card">
				<div className="order-status-info">
					<div className="order-status-row">
						<span className="order-status-label">Статус:</span>
						{isAdminOrManager ? (
							<Select
								value={selectedStatus || order.status}
								onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
								options={[
									{ value: OrderStatus.NEW, label: statusLabels[OrderStatus.NEW] },
									{ value: OrderStatus.IN_PROGRESS, label: statusLabels[OrderStatus.IN_PROGRESS] },
									{ value: OrderStatus.COMPLETED, label: statusLabels[OrderStatus.COMPLETED] },
									{ value: OrderStatus.CANCELLED, label: statusLabels[OrderStatus.CANCELLED] },
								]}
								className="order-status-select"
								disabled={updateOrderMutation.isPending}
							/>
						) : (
							<span
								className="order-status-value"
								style={{ color: statusColors[order.status] }}
							>
								{statusLabels[order.status]}
							</span>
						)}
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
