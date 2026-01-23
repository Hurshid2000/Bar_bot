import { Plus, Minus } from 'lucide-react';
import type { Product } from '../../../types/common.types';

const categoryIcons: Record<string, string> = {
	'Напитки': '🥤',
	'Снеки': '🍫',
	'Алкоголь': '🍺',
	'default': '📦',
};

function getCategoryIcon(categoryName?: string): string {
	if (!categoryName) return categoryIcons.default;
	return categoryIcons[categoryName] || categoryIcons.default;
}

interface OrderProductCardProps {
	product: Product;
	quantity: number;
	onQuantityChange: (productId: string, quantity: number) => void;
}

export function OrderProductCard({ product, quantity, onQuantityChange }: OrderProductCardProps) {
	const handleIncrement = (e: React.MouseEvent) => {
		e.stopPropagation();
		onQuantityChange(product.id, quantity + 1);
	};

	const handleDecrement = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (quantity > 0) {
			onQuantityChange(product.id, quantity - 1);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseInt(e.target.value) || 0;
		if (value >= 0) {
			onQuantityChange(product.id, value);
		}
	};

	return (
		<div className={`order-product-card ${quantity > 0 ? 'order-product-card-selected' : ''}`}>
			<div className="order-product-card-icon">
				{getCategoryIcon(product.category?.name)}
			</div>

			<div className="order-product-card-content">
				<div className="order-product-card-info">
					<h3 className="order-product-card-name">{product.name}</h3>
					<p className="order-product-card-meta">
						{product.category?.name || 'Без категории'}
					</p>
				</div>

				<div className="order-product-card-quantity">
				<button
					className="order-quantity-btn order-quantity-btn-minus"
					onClick={handleDecrement}
					disabled={quantity === 0}
				>
					<Minus size={18} />
				</button>
				<input
					type="number"
					className="order-quantity-input"
					value={quantity}
					onChange={handleInputChange}
					min="0"
				/>
				<button
					className="order-quantity-btn order-quantity-btn-plus"
					onClick={handleIncrement}
				>
					<Plus size={18} />
				</button>
				</div>
			</div>
		</div>
	);
}
