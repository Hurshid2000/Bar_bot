import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { arrivalsApi } from '../../api/arrivals.api';
import { ordersApi } from '../../api/orders.api';
import { formatDate } from '../../utils/format';
import { ArrivalType, OrderStatus } from '../../types/common.types';
import './OrdersPage.css';

type OrderMode = 'order' | 'arrival';

const arrivalTypeLabels: Record<ArrivalType, string> = {
	ARRIVAL: 'Приход',
	WRITE_OFF: 'Списание',
};

const orderStatusLabels: Record<OrderStatus, string> = {
	NEW: 'Новый',
	IN_PROGRESS: 'В обработке',
	COMPLETED: 'Выполнен',
	CANCELLED: 'Отменен',
};

const orderStatusColors: Record<OrderStatus, string> = {
	NEW: 'var(--color-primary-500)',
	IN_PROGRESS: 'var(--color-warning)',
	COMPLETED: 'var(--color-success)',
	CANCELLED: 'var(--color-error)',
};

export function OrdersPage() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const [mode, setMode] = useState<OrderMode>('order');

	// Проверяем query параметр для автоматического переключения режима
	useEffect(() => {
		const modeParam = searchParams.get('mode');
		if (modeParam === 'arrival' || modeParam === 'order') {
			setMode(modeParam);
			// Удаляем параметр из URL после использования
			searchParams.delete('mode');
			setSearchParams(searchParams, { replace: true });
		}
	}, [searchParams, setSearchParams]);

	const { data: arrivalsData, isLoading: arrivalsLoading } = useQuery({
		queryKey: ['arrivals', 'history'],
		queryFn: () => arrivalsApi.getAll({ page: 1, limit: 20 }),
		enabled: mode === 'arrival',
	});


	const { data: ordersData, isLoading: ordersLoading } = useQuery({
		queryKey: ['orders', 'history'],
		queryFn: () => ordersApi.getAll({ page: 1, limit: 20 }),
		enabled: mode === 'order',
	});

	const handleOrderClick = () => {
		navigate('/orders/create');
	};

	return (
		<div className="orders-page">
			<div className="orders-mode-selector">
				<Button
					variant={mode === 'order' ? 'primary' : 'outline'}
					size="lg"
					className="orders-mode-btn"
					onClick={() => setMode('order')}
				>
					Заказ
				</Button>
				<Button
					variant={mode === 'arrival' ? 'primary' : 'outline'}
					size="lg"
					className="orders-mode-btn"
					onClick={() => setMode('arrival')}
				>
					Приход
				</Button>
			</div>

			{mode === 'order' && (
				<>
					<div className="orders-actions">
						<Card className="orders-action-card">
							<h2>Заказ</h2>
							<p>Создайте новый заказ товаров</p>
							<div className="orders-action-buttons">
								<Button variant="primary" size="lg" onClick={handleOrderClick}>
									Заказать
								</Button>
							</div>
						</Card>
					</div>

					{/* История заказов */}
					<div className="orders-history-section">
						<h3 className="orders-history-title">История</h3>
						{ordersLoading ? (
							<Loading />
						) : ordersData && ordersData.data.length > 0 ? (
							<div className="orders-history-list">
								{ordersData.data.map((order) => (
									<Card
										key={order.id}
										className="orders-history-card"
										onClick={() => navigate(`/orders/${order.id}`)}
									>
										<div className="orders-history-card-header">
											<div>
												<h4>Заказ #{order.id.slice(0, 8)}</h4>
												<p className="orders-history-card-bar">
													{order.bar?.name || 'Неизвестный бар'}
												</p>
											</div>
											<span
												className="orders-history-card-status"
												style={{ color: orderStatusColors[order.status] }}
											>
												{orderStatusLabels[order.status]}
											</span>
										</div>
										<div className="orders-history-card-info">
											<p>
												Товаров: {order.items.length} ({order.items.reduce((sum, item) => sum + item.quantity, 0)} шт.)
											</p>
											<p className="orders-history-card-date">{formatDate(order.createdAt)}</p>
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
				</>
			)}

			{mode === 'arrival' && (
				<>
					<div className="orders-actions">
						<Card className="orders-action-card">
							<h2>Приход</h2>
							<p>Зафиксируйте приход или списание товаров</p>
							<div className="orders-action-buttons">
								<Button variant="primary" size="lg" onClick={() => navigate('/arrivals/create')}>
									Создать приход
								</Button>
							</div>
						</Card>
					</div>

					{/* История приходов и списаний */}
					<div className="orders-history-section">
						<h3 className="orders-history-title">История</h3>
						{arrivalsLoading ? (
							<Loading />
						) : arrivalsData && arrivalsData.data.length > 0 ? (
							<div className="orders-history-list">
								{arrivalsData.data.map((arrival) => {
									const visibleItems = arrival.items.slice(0, 4);
									const hiddenCount = arrival.items.length - visibleItems.length;
									return (
										<Card
											key={arrival.id}
											className="orders-history-card"
											onClick={() => navigate(`/arrivals/${arrival.id}`)}
										>
											<div className="orders-history-card-header">
												<div>
													<h4>
														{arrivalTypeLabels[arrival.type]} #{arrival.id.slice(0, 8)}
													</h4>
													<p className="orders-history-card-bar">
														{arrival.bar?.name || 'Неизвестный бар'}
													</p>
												</div>
												<div className="orders-history-card-right">
													<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
														<span
															className="orders-history-card-type"
															data-type={arrival.type}
														>
															{arrivalTypeLabels[arrival.type]}
														</span>
														{arrival.isSportPit && (
															<span className="orders-history-card-sportpit-badge">
																Спортпит
															</span>
														)}
													</div>
													<p className="orders-history-card-date">{formatDate(arrival.createdAt)}</p>
												</div>
											</div>
											<div className="arrival-items-list">
												{visibleItems.map((item) => (
													<div key={item.id} className="arrival-item-row">
														<span className="arrival-item-name">{item.product?.name ?? 'Товар'}</span>
														<span className="arrival-item-qty">{item.quantity} шт.</span>
													</div>
												))}
												{hiddenCount > 0 && (
													<p className="arrival-items-more">+{hiddenCount} ещё</p>
												)}
											</div>
										</Card>
									);
								})}
							</div>
						) : (
							<Card>
								<p>Приходы и списания не найдены</p>
							</Card>
						)}
					</div>
				</>
			)}
		</div>
	);
}
