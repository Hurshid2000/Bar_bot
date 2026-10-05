import { UtensilsCrossed } from 'lucide-react';
import type { Product } from '../../../types/common.types';
import { formatCurrency } from '../../../utils/format';

const foodIcons: Record<string, string> = {
	'Завтраки': '🍳',
	'Обеды': '🍽️',
	'Десерты': '🍰',
	'default': '🍴',
};

function getFoodIcon(categoryName?: string): string {
	if (!categoryName) return foodIcons.default;
	return foodIcons[categoryName] || foodIcons.default;
}

interface OrderFoodCardProps {
	product: Product;
	quantity: number;
	onQuantityChange: (productId: string, quantity: number) => void;
	showPrice?: boolean;
}

export function OrderFoodCard({ product, quantity, onQuantityChange, showPrice }: OrderFoodCardProps) {
	const unitPrice = product.barProducts?.[0]?.price ?? product.defaultPrice ?? product.costPrice ?? 0;
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
		const raw = e.target.value;
		const value = raw === '' ? 0 : parseInt(raw, 10);
		if (!Number.isNaN(value) && value >= 0) {
			onQuantityChange(product.id, value);
		}
	};

	return (
		<div className={`order-food-card ${quantity > 0 ? 'order-food-card-selected' : ''}`}>
			<div className="order-food-card-image">
				{product.imageUrl ? (
					<img src={product.imageUrl} alt={product.name} />
				) : (
					<span className="order-food-card-icon">{getFoodIcon(product.category?.name)}</span>
				)}
			</div>

			<div className="order-food-card-content">
				<div className="order-food-card-header">
					<h3 className="order-food-card-name">{product.name}</h3>
				</div>

				<div className="order-food-card-meta">
					<span className="order-food-card-category">
						<UtensilsCrossed size={12} />
						{product.category?.name || 'Без категории'}
					</span>
					{showPrice && (
						<span className="order-food-card-category">
							{formatCurrency(unitPrice)}
							{quantity > 0 && (
								<span style={{ color: 'var(--color-primary-400)', fontWeight: 600 }}>
									{' · '}
									{formatCurrency(unitPrice * quantity)}
								</span>
							)}
						</span>
					)}
				</div>

				<div className="order-food-card-quantity">
					<button
						className="order-quantity-btn order-quantity-btn-minus"
						onClick={handleDecrement}
						disabled={quantity === 0}
					>
						−
					</button>
					<input
						type="number"
						className="order-quantity-input"
						value={quantity === 0 ? '' : quantity}
						onChange={handleInputChange}
						onFocus={(e) => e.target.select()}
						placeholder="0"
						min="0"
					/>
					<button
						className="order-quantity-btn order-quantity-btn-plus"
						onClick={handleIncrement}
					>
						+
					</button>
				</div>
			</div>
		</div>
	);
}
