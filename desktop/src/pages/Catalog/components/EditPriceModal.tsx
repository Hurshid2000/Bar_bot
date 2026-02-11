import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { barProductsApi } from '../../../api/barProducts.api';
import { useBar } from '../../../context/BarContext';
import type { Product } from '../../../types/common.types';
import { formatCurrency } from '../../../utils/format';
import './EditPriceModal.css';

interface EditPriceModalProps {
	isOpen: boolean;
	onClose: () => void;
	product: Product | null;
}

export function EditPriceModal({ isOpen, onClose, product }: EditPriceModalProps) {
	const queryClient = useQueryClient();
	const { selectedBar } = useBar();
	const [price, setPrice] = useState<number>(0);
	const [error, setError] = useState<string>('');

	// Заполняем цену при открытии
	useEffect(() => {
		if (product && isOpen) {
			setPrice(product.price ?? product.defaultPrice ?? 0);
		}
	}, [product, isOpen]);

	const updateMutation = useMutation({
		mutationFn: () => {
			if (!selectedBar || !product) throw new Error('No bar selected');
			return barProductsApi.updateByBarAndProduct(selectedBar.id, product.id, { price });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['products'] });
			handleClose();
		},
		onError: (error: any) => {
			setError(error.message || 'Ошибка при обновлении цены');
		},
	});

	const handleClose = () => {
		setPrice(0);
		setError('');
		onClose();
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (price < 0) {
			setError('Цена не может быть отрицательной');
			return;
		}
		updateMutation.mutate();
	};

	if (!product || !selectedBar) return null;

	const cost = product.costPrice ?? 0;
	const margin = cost > 0 ? ((price - cost) / cost * 100).toFixed(0) : 0;

	return (
		<Modal isOpen={isOpen} onClose={handleClose} title="Изменить цену">
			<form onSubmit={handleSubmit} className="edit-price-form">
				<div className="edit-price-product-info">
					<h4>{product.name}</h4>
					<p className="edit-price-bar">Бар: {selectedBar.name}</p>
					<p className="edit-price-cost">Себестоимость: {formatCurrency(product.costPrice ?? 0)}</p>
					{product.defaultPrice && (
						<p className="edit-price-default">Цена по умолчанию: {formatCurrency(product.defaultPrice)}</p>
					)}
				</div>

				<Input
					label="Цена продажи"
					type="number"
					value={price}
					onChange={(e) => {
						setPrice(parseFloat(e.target.value) || 0);
						setError('');
					}}
					min={0}
				/>

				<div className="edit-price-margin">
					Наценка: <span className={Number(margin) >= 0 ? 'positive' : 'negative'}>{margin}%</span>
				</div>

				{error && <p className="form-error">{error}</p>}

				<div className="form-actions">
					<Button type="button" variant="outline" onClick={handleClose}>
						Отмена
					</Button>
					<Button type="submit" loading={updateMutation.isPending}>
						Сохранить
					</Button>
				</div>
			</form>
		</Modal>
	);
}
