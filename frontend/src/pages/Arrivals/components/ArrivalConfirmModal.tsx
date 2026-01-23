import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { barsApi } from '../../../api/bars.api';
import { useAuth } from '../../../context/AuthContext';
import { RoleType, type Product } from '../../../types/common.types';
import type { CreateArrivalItemDto } from '../../../api/arrivals.api';
import './ArrivalConfirmModal.css';

interface ArrivalConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (barId: string, type: 'ARRIVAL' | 'WRITE_OFF', comment?: string) => void;
	selectedItems: CreateArrivalItemDto[];
	products: Product[];
	isLoading: boolean;
	defaultBarId?: string;
	userRole?: RoleType;
}

export function ArrivalConfirmModal({
	isOpen,
	onClose,
	onConfirm,
	selectedItems,
	products,
	isLoading,
	defaultBarId,
	userRole,
}: ArrivalConfirmModalProps) {
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

	const handleSubmit = (type: 'ARRIVAL' | 'WRITE_OFF') => {
		if (!selectedBarId) return;
		onConfirm(selectedBarId, type, comment || undefined);
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
			title="Подтверждение операции"
			footer={
				<>
					<Button variant="ghost" onClick={onClose} disabled={isLoading}>
						Отмена
					</Button>
				</>
			}
		>
			<form className="arrival-confirm-form">
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
				<div className="arrival-confirm-items">
					<h3 className="arrival-confirm-items-title">
						Товары ({selectedItems.length} позиций, {totalQuantity} шт.)
					</h3>
					<div className="arrival-confirm-items-list">
						{selectedItems.map((item) => {
							const product = productsMap.get(item.productId);
							if (!product) return null;

							return (
								<div key={item.productId} className="arrival-confirm-item">
									<div className="arrival-confirm-item-info">
										<span className="arrival-confirm-item-name">{product.name}</span>
										<span className="arrival-confirm-item-category">
											{product.category?.name || 'Без категории'}
										</span>
									</div>
									<div className="arrival-confirm-item-quantity">×{item.quantity}</div>
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
						placeholder="Добавьте комментарий..."
						rows={3}
					/>
				</div>

				{/* Кнопки Приход и Списание */}
				<div className="arrival-confirm-actions">
					<Button
						variant="primary"
						size="lg"
						onClick={() => handleSubmit('ARRIVAL')}
						disabled={isLoading || !selectedBarId || selectedItems.length === 0}
						className="arrival-confirm-btn arrival-confirm-btn-arrival"
					>
						{isLoading ? 'Создание...' : 'Приход'}
					</Button>
					<Button
						variant="danger"
						size="lg"
						onClick={() => handleSubmit('WRITE_OFF')}
						disabled={isLoading || !selectedBarId || selectedItems.length === 0}
						className="arrival-confirm-btn arrival-confirm-btn-writeoff"
					>
						{isLoading ? 'Создание...' : 'Списание'}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
