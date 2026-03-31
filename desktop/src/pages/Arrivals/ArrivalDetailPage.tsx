import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { arrivalsApi } from '../../api/arrivals.api';
import { Loading } from '../../components/ui/Loading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../utils/format';
import { ArrivalType } from '../../types/common.types';
import './ArrivalDetailPage.css';

const typeLabels: Record<ArrivalType, string> = {
	ARRIVAL: 'Приход',
	WRITE_OFF: 'Списание',
};

const typeColors: Record<ArrivalType, string> = {
	ARRIVAL: 'var(--color-success)',
	WRITE_OFF: 'var(--color-error)',
};

export function ArrivalDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const { data: arrival, isLoading } = useQuery({
		queryKey: ['arrivals', id],
		queryFn: () => arrivalsApi.getById(id!),
		enabled: !!id,
	});

	if (isLoading) {
		return <Loading />;
	}

	if (!arrival) {
		return (
			<div className="arrival-detail-page">
				<Card>
					<p>Приход не найден</p>
				</Card>
			</div>
		);
	}

	const totalQuantity = arrival.items.reduce((sum, item) => sum + item.quantity, 0);
	const totalSum = arrival.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

	return (
		<div className="arrival-detail-page">
			<div className="arrival-detail-header">
				<Button variant="ghost" onClick={() => navigate('/orders?mode=arrival')}>
					← Назад
				</Button>
				<h1>{typeLabels[arrival.type]} #{arrival.id.slice(0, 8)}</h1>
			</div>

			<Card className="arrival-detail-card">
				<div className="arrival-detail-info">
					<div className="arrival-detail-row">
						<span className="arrival-detail-label">Тип:</span>
						<span
							className="arrival-detail-value"
							style={{ color: typeColors[arrival.type] }}
						>
							{typeLabels[arrival.type]}
						</span>
					</div>
					<div className="arrival-detail-row">
						<span className="arrival-detail-label">Бар:</span>
						<span className="arrival-detail-value">{arrival.bar?.name || 'Неизвестный бар'}</span>
					</div>
					<div className="arrival-detail-row">
						<span className="arrival-detail-label">Дата:</span>
						<span className="arrival-detail-value">{formatDate(arrival.createdAt)}</span>
					</div>
					<div className="arrival-detail-row">
						<span className="arrival-detail-label">Всего товаров:</span>
						<span className="arrival-detail-value">{arrival.items.length} ({totalQuantity} шт.)</span>
					</div>
					<div className="arrival-detail-row">
						<span className="arrival-detail-label">Общая сумма:</span>
						<span className="arrival-detail-value arrival-detail-total">
							{totalSum.toLocaleString('ru-RU')} сум
						</span>
					</div>
					{arrival.user && (
						<div className="arrival-detail-row">
							<span className="arrival-detail-label">Создал:</span>
							<span className="arrival-detail-value">{arrival.user.name || 'Неизвестный'}</span>
						</div>
					)}
					{arrival.comment && (
						<div className="arrival-detail-comment">
							<span className="arrival-detail-label">Комментарий:</span>
							<p>{arrival.comment}</p>
						</div>
					)}
				</div>
			</Card>

			<Card className="arrival-detail-items">
				<h2>Товары ({arrival.items.length})</h2>
				<div className="arrival-detail-items-list">
					{arrival.items.map((item) => (
						<div key={item.id} className="arrival-detail-item">
							<div className="arrival-detail-item-info">
								<span className="arrival-detail-item-name">
									{item.product?.name || 'Неизвестный товар'}
								</span>
								<span className="arrival-detail-item-category">
									{item.product?.category?.name || 'Без категории'}
								</span>
							</div>
							<div className="arrival-detail-item-right">
								<span className="arrival-detail-item-quantity">×{item.quantity}</span>
								<span className="arrival-detail-item-price">
									{(item.price * item.quantity).toLocaleString('ru-RU')} сум
								</span>
							</div>
						</div>
					))}
				</div>
			</Card>
		</div>
	);
}
