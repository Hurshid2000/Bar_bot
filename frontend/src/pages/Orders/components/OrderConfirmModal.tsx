import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { barsApi } from '../../../api/bars.api';
import { useAuth } from '../../../context/AuthContext';
import { RoleType, type Product } from '../../../types/common.types';
import type { CreateOrderItemDto } from '../../../api/orders.api';
import './OrderConfirmModal.css';

interface OrderConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (barId: string, comment?: string) => void;
	selectedItems: CreateOrderItemDto[];
	products: Product[];
	isLoading: boolean;
	defaultBarId?: string;
	userRole?: RoleType;
}

export function OrderConfirmModal({
	isOpen,
	onClose,
	onConfirm,
	selectedItems,
	products,
	isLoading,
	defaultBarId,
	userRole,
}: OrderConfirmModalProps) {
	const { user } = useAuth();
	const [selectedBarId, setSelectedBarId] = useState<string>(defaultBarId || '');
	const [comment, setComment] = useState('');

	const isAdmin = userRole === RoleType.ADMIN;
	const isManager = userRole === RoleType.MANAGER;

	// Получаем доступные бары для админа и менеджера
	const { data: allBars } = useQuery({
		queryKey: ['bars'],
		queryFn: () => barsApi.getAll(),
		enabled: isAdmin,
	});

	// Определяем какие бары показывать
	// Для менеджера используем бары из user.bars
	const managerBars = isManager && user?.bars
		? user.bars.map((ub) => ub.bar).filter((bar): bar is NonNullable<typeof bar> => bar !== null && bar !== undefined)
		: [];

	const availableBars = isAdmin ? allBars || [] : isManager ? managerBars : [];

	useEffect(() => {
		if (isOpen) {
			if (defaultBarId) {
				setSelectedBarId(defaultBarId);
			} else if (availableBars.length > 0) {
				setSelectedBarId(availableBars[0].id);
			}
			setComment('');
		}
	}, [isOpen, defaultBarId, availableBars]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedBarId) return;
		onConfirm(selectedBarId, comment || undefined);
	};

	// Создаем мапу продуктов для быстрого доступа
	const productsMap = new Map(products.map((p) => [p.id, p]));

	// Подсчитываем общее количество товаров
	const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

	const barOptions = [
		{ value: '', label: 'Выберите бар' },
		...availableBars.map((bar) => ({ value: bar.id, label: bar.name })),
	];

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Подтверждение заказа"
			footer={
				<>
					<Button variant="ghost" onClick={onClose} disabled={isLoading}>
						Отмена
					</Button>
					<Button
						variant="primary"
						onClick={handleSubmit}
						disabled={isLoading || !selectedBarId || selectedItems.length === 0}
					>
						{isLoading ? 'Создание...' : 'Подтвердить'}
					</Button>
				</>
			}
		>
			<form onSubmit={handleSubmit} className="order-confirm-form">
				{/* Выбор бара (только для админов и менеджеров) */}
				{(isAdmin || isManager) && (
					<Select
						label="Выберите бар"
						value={selectedBarId}
						onChange={(e) => setSelectedBarId(e.target.value)}
						options={barOptions}
						required
					/>
				)}

				{/* Список товаров */}
				<div className="order-confirm-items">
					<h3 className="order-confirm-items-title">
						Товары ({selectedItems.length} позиций, {totalQuantity} шт.)
					</h3>
					<div className="order-confirm-items-list">
						{selectedItems.map((item) => {
							const product = productsMap.get(item.productId);
							if (!product) return null;

							return (
								<div key={item.productId} className="order-confirm-item">
									<div className="order-confirm-item-info">
										<span className="order-confirm-item-name">{product.name}</span>
										<span className="order-confirm-item-category">
											{product.category?.name || 'Без категории'}
										</span>
									</div>
									<div className="order-confirm-item-quantity">×{item.quantity}</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Комментарий */}
				<div className="input-wrapper">
					<label className="input-label">Комментарий (необязательно)</label>
					<textarea
						className="input"
						value={comment}
						onChange={(e) => setComment(e.target.value)}
						placeholder="Добавьте комментарий к заказу..."
						rows={3}
					/>
				</div>
			</form>
		</Modal>
	);
}
