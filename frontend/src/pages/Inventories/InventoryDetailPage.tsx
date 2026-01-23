import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { inventoriesApi } from '../../api/inventories.api';
import { Loading } from '../../components/ui/Loading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../utils/format';
import { formatCurrency } from '../../utils/format';
import './InventoryDetailPage.css';

export function InventoryDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const { data: inventory, isLoading } = useQuery({
		queryKey: ['inventories', id],
		queryFn: () => inventoriesApi.getById(id!),
		enabled: !!id,
	});

	const { data: comparison, isLoading: comparisonLoading } = useQuery({
		queryKey: ['inventories', id, 'compare'],
		queryFn: () => inventoriesApi.compareWithPrevious(id!),
		enabled: !!id && !!inventory,
	});

	if (isLoading) {
		return <Loading />;
	}

	if (!inventory) {
		return (
			<div className="inventory-detail-page">
				<Card>
					<p>Инвентаризация не найдена</p>
				</Card>
			</div>
		);
	}

	return (
		<div className="inventory-detail-page">
			<div className="inventory-detail-header">
				<Button variant="ghost" onClick={() => navigate(-1)} className="inventory-detail-back-btn">
					<ArrowLeft size={20} />
					Назад
				</Button>
				<h1>Инвентаризация #{inventory.id.slice(0, 8)}</h1>
			</div>

			<Card className="inventory-detail-card">
				<div className="inventory-detail-info">
					<div className="inventory-detail-row">
						<span className="inventory-detail-label">Бар:</span>
						<span className="inventory-detail-value">{inventory.bar?.name || 'Неизвестный бар'}</span>
					</div>
					<div className="inventory-detail-row">
						<span className="inventory-detail-label">Дата создания:</span>
						<span className="inventory-detail-value">{formatDate(inventory.createdAt)}</span>
					</div>
					<div className="inventory-detail-row">
						<span className="inventory-detail-label">Общая сумма:</span>
						<span className="inventory-detail-value inventory-detail-total">
							{formatCurrency(inventory.totalAmount)}
						</span>
					</div>
					{inventory.comment && (
						<div className="inventory-detail-comment">
							<span className="inventory-detail-label">Комментарий:</span>
							<p>{inventory.comment}</p>
						</div>
					)}
				</div>
			</Card>

			{comparisonLoading ? (
				<Loading />
			) : comparison && comparison.previous ? (
				<Card className="inventory-detail-comparison">
					<h2>Сравнение с предыдущей инвентаризацией</h2>
					<div className="inventory-detail-comparison-summary">
						<div className="inventory-detail-comparison-item">
							<span>Предыдущая сумма:</span>
							<span>{formatCurrency(comparison.previous.totalAmount)}</span>
						</div>
						<div className="inventory-detail-comparison-item">
							<span>Текущая сумма:</span>
							<span>{formatCurrency(comparison.current.totalAmount)}</span>
						</div>
						<div className={`inventory-detail-comparison-item ${comparison.totalDifference >= 0 ? 'positive' : 'negative'}`}>
							<span>Разница:</span>
							<span>{formatCurrency(comparison.totalDifference)}</span>
						</div>
					</div>
					<div className="inventory-detail-comparison-items">
						<h3>Изменения по товарам:</h3>
						{comparison.comparison.map((item) => (
							<div key={item.productId} className="inventory-detail-comparison-product">
								<div className="inventory-detail-comparison-product-name">
									{item.product.name}
								</div>
								<div className="inventory-detail-comparison-product-details">
									<div className="inventory-detail-comparison-detail">
										<span>Было:</span>
										<span>{item.previousQuantity ?? '—'}</span>
									</div>
									<div className="inventory-detail-comparison-detail">
										<span>Стало:</span>
										<span>{item.currentQuantity ?? '—'}</span>
									</div>
									<div className={`inventory-detail-comparison-detail ${item.difference >= 0 ? 'positive' : 'negative'}`}>
										<span>Разница:</span>
										<span>{item.difference > 0 ? '+' : ''}{item.difference}</span>
									</div>
								</div>
							</div>
						))}
					</div>
				</Card>
			) : (
				<Card className="inventory-detail-no-comparison">
					<p>Предыдущая инвентаризация не найдена</p>
				</Card>
			)}

			<Card className="inventory-detail-items">
				<h2>Товары ({inventory.items.length})</h2>
				<div className="inventory-detail-items-list">
					{inventory.items.map((item) => (
						<div key={item.id} className="inventory-detail-item">
							<div className="inventory-detail-item-info">
								<span className="inventory-detail-item-name">
									{item.product?.name || 'Неизвестный товар'}
								</span>
								<span className="inventory-detail-item-category">
									{item.product?.category?.name || 'Без категории'}
								</span>
							</div>
							<div className="inventory-detail-item-details">
								<div className="inventory-detail-item-quantity">×{item.quantity}</div>
								<div className="inventory-detail-item-price">{formatCurrency(item.price)}</div>
								<div className="inventory-detail-item-total">{formatCurrency(item.totalAmount)}</div>
							</div>
						</div>
					))}
				</div>
			</Card>
		</div>
	);
}
