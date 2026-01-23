import { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import type { Product } from '../../../types/common.types';
import type { CreateInventoryItemDto } from '../../../api/inventories.api';
import './InventoryConfirmModal.css';

interface InventoryConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (comment?: string) => void;
	selectedItems: CreateInventoryItemDto[];
	products: Product[];
	isLoading: boolean;
	barId: string;
}

export function InventoryConfirmModal({
	isOpen,
	onClose,
	onConfirm,
	selectedItems,
	products,
	isLoading,
}: InventoryConfirmModalProps) {
	const [comment, setComment] = useState('');

	useEffect(() => {
		if (isOpen) {
			setComment('');
		}
	}, [isOpen]);

	// Создаем мапу продуктов для быстрого доступа
	const productsMap = new Map(products.map((p) => [p.id, p]));

	// Подсчитываем общее количество товаров и сумму
	const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
	
	// Вычисляем сумму (нужно получить цены из продуктов)
	const totalAmount = selectedItems.reduce((sum, item) => {
		const product = productsMap.get(item.productId);
		if (!product) return sum;
		// Используем цену из barProduct или defaultPrice или costPrice
		const price = product.barProducts?.[0]?.price || product.defaultPrice || product.costPrice || 0;
		return sum + item.quantity * price;
	}, 0);

	const handleSubmit = () => {
		onConfirm(comment || undefined);
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Подтверждение инвентаризации"
			footer={
				<>
					<Button variant="ghost" onClick={onClose} disabled={isLoading}>
						Отмена
					</Button>
					<Button variant="primary" onClick={handleSubmit} disabled={isLoading || selectedItems.length === 0}>
						{isLoading ? 'Создание...' : 'Подтвердить'}
					</Button>
				</>
			}
		>
			<form className="inventory-confirm-form">
				{/* Список товаров */}
				<div className="inventory-confirm-items">
					<h3 className="inventory-confirm-items-title">
						Товары ({selectedItems.length} позиций, {totalQuantity} шт.)
					</h3>
					<div className="inventory-confirm-items-list">
						{selectedItems.map((item) => {
							const product = productsMap.get(item.productId);
							if (!product) return null;

							const price = product.barProducts?.[0]?.price || product.defaultPrice || product.costPrice || 0;
							const itemTotal = item.quantity * price;

							return (
								<div key={item.productId} className="inventory-confirm-item">
									<div className="inventory-confirm-item-info">
										<span className="inventory-confirm-item-name">{product.name}</span>
										<span className="inventory-confirm-item-category">
											{product.category?.name || 'Без категории'}
										</span>
									</div>
									<div className="inventory-confirm-item-details">
										<div className="inventory-confirm-item-quantity">×{item.quantity}</div>
										<div className="inventory-confirm-item-total">{itemTotal.toFixed(2)} руб.</div>
									</div>
								</div>
							);
						})}
					</div>
					<div className="inventory-confirm-total">
						<span className="inventory-confirm-total-label">Общая сумма:</span>
						<span className="inventory-confirm-total-value">{totalAmount.toFixed(2)} руб.</span>
					</div>
				</div>

				{/* Комментарий */}
				<div className="input-wrapper">
					<label className="input-label">Комментарий (необязательно)</label>
					<textarea
						className="input"
						value={comment}
						onChange={(e) => setComment(e.target.value)}
						placeholder="Добавьте комментарий..."
						rows={3}
					/>
				</div>
			</form>
		</Modal>
	);
}
